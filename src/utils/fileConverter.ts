/**
 * File Converter Utilities
 * Unterstützt Konvertierungen zwischen JSON, Markdown, HTML, TXT, PDF und Editor.js
 */

import { marked } from 'marked';
import TurndownService from 'turndown';
import DOMPurify from 'dompurify';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { codeToReadme } from '../services/aiService';
import { markdownToEditorJS, editorJSToMarkdown, isValidEditorJSData } from './editorjsConverter';

// Konfiguriere marked für sichere HTML-Generierung
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Konfiguriere Turndown für HTML → Markdown Konvertierung
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

/**
 * Typ-Definitionen
 */
export type SupportedFormat =
  | 'json'
  | 'md'
  | 'gfm'
  | 'html'
  | 'txt'
  | 'pdf'
  | 'code'
  | 'editorjs'
  | 'docx'
  | 'doc'
  | 'pages'
  | 'png'
  | 'jpg'
  | 'jpeg'
  | 'webp'
  | 'svg';

export interface ConversionResult {
  success: boolean;
  data?: string;
  error?: string;
  byteSize?: number; // gesetzt bei Blob-URL-Outputs (Rasterbilder)
}

export interface ConversionOptions {
  imageQuality?: number;         // 0..1
  imageRasterSize?: number;      // max edge for tracing (SVG)
  imageSmoothEdges?: boolean;
  imageMaxOutputSize?: number;   // max edge px for raster output (null = original)
}

export interface JSONContent {
  title?: string;
  content: string;
  metadata?: Record<string, any>;
}

const RASTER_IMAGE_FORMATS: SupportedFormat[] = ['png', 'jpg', 'jpeg', 'webp'];
const IMAGE_FORMATS: SupportedFormat[] = [...RASTER_IMAGE_FORMATS, 'svg'];
type RasterImageFormat = 'png' | 'jpg' | 'jpeg' | 'webp';
type ImageFormat = RasterImageFormat | 'svg';

function isRasterImageFormat(format: SupportedFormat): format is RasterImageFormat {
  return RASTER_IMAGE_FORMATS.includes(format);
}

export function isImageFormat(format: SupportedFormat): format is ImageFormat {
  return IMAGE_FORMATS.includes(format);
}

function getImageMimeType(format: ImageFormat): string {
  const mimeMap = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    svg: 'image/svg+xml',
  } as const;

  return mimeMap[format];
}

function arrayBufferToDataUrl(buffer: ArrayBuffer, mimeType: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: mimeType });
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Datei konnte nicht als Data URL gelesen werden'));
    reader.readAsDataURL(blob);
  });
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
    image.src = dataUrl;
  });
}

async function rasterToRasterBlobUrl(
  sourceBuffer: ArrayBuffer,
  sourceFormat: RasterImageFormat,
  targetFormat: RasterImageFormat,
  quality = 0.92,
  maxOutputSize?: number,
): Promise<{ blobUrl: string; byteSize: number }> {
  const sourceDataUrl = await arrayBufferToDataUrl(sourceBuffer, getImageMimeType(sourceFormat));
  const image = await loadImageFromDataUrl(sourceDataUrl);
  const srcW = image.naturalWidth || image.width;
  const srcH = image.naturalHeight || image.height;

  let outW = srcW;
  let outH = srcH;
  if (maxOutputSize && maxOutputSize > 0 && Math.max(srcW, srcH) > maxOutputSize) {
    const scale = maxOutputSize / Math.max(srcW, srcH);
    outW = Math.round(srcW * scale);
    outH = Math.round(srcH * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas-Kontext konnte nicht erstellt werden');

  ctx.drawImage(image, 0, 0, outW, outH);
  const mimeType = getImageMimeType(targetFormat);
  const normalizedQuality = Math.max(0.1, Math.min(1, quality));

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error('canvas.toBlob fehlgeschlagen')); return; }
        resolve({ blobUrl: URL.createObjectURL(blob), byteSize: blob.size });
      },
      mimeType,
      targetFormat === 'png' ? undefined : normalizedQuality,
    );
  });
}

function rasterPixelsToSvg(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  sourceWidth: number,
  sourceHeight: number,
  quality = 0.8,
  smoothEdges = true
): string {
  const normalizedQuality = Math.max(0.1, Math.min(1, quality));
  const baseStep = smoothEdges ? 20 : 48;
  const range = smoothEdges ? 14 : 36;
  const quantStep = Math.max(6, Math.round(baseStep - normalizedQuality * range));
  const scaleX = sourceWidth / width;
  const scaleY = sourceHeight / height;
  const rects: string[] = [];

  for (let y = 0; y < height; y += 1) {
    let runColor = '';
    let runStart = 0;

    const flushRun = (runEnd: number) => {
      if (!runColor) return;
      const x = runStart * scaleX;
      const yPos = y * scaleY;
      const w = (runEnd - runStart) * scaleX;
      const h = scaleY;
      rects.push(`<rect x="${x.toFixed(2)}" y="${yPos.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="${runColor}" />`);
    };

    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];

      if (a < 16) {
        flushRun(x);
        runColor = '';
        runStart = x + 1;
        continue;
      }

      const quant = (value: number) => Math.round(value / quantStep) * quantStep;
      const color = `rgb(${quant(r)},${quant(g)},${quant(b)})`;

      if (!runColor) {
        runColor = color;
        runStart = x;
      } else if (runColor !== color) {
        flushRun(x);
        runColor = color;
        runStart = x;
      }
    }

    flushRun(width);
  }

  const shapeRendering = smoothEdges ? 'geometricPrecision' : 'crispEdges';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sourceWidth} ${sourceHeight}" width="${sourceWidth}" height="${sourceHeight}" shape-rendering="${shapeRendering}">
${rects.join('\n')}
</svg>`;
}

async function rasterToSvg(
  sourceBuffer: ArrayBuffer,
  sourceFormat: RasterImageFormat,
  options: ConversionOptions = {}
): Promise<string> {
  const quality = Math.max(0.1, Math.min(1, options.imageQuality ?? 0.8));
  const smoothEdges = options.imageSmoothEdges ?? true;
  const sourceDataUrl = await arrayBufferToDataUrl(sourceBuffer, getImageMimeType(sourceFormat));
  const image = await loadImageFromDataUrl(sourceDataUrl);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const requestedEdge = Math.max(32, Math.min(4096, Math.round(options.imageRasterSize ?? 140)));
  const maxEdge = smoothEdges ? Math.max(requestedEdge, 320) : requestedEdge;
  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const traceWidth = Math.max(8, Math.round(sourceWidth * scale));
  const traceHeight = Math.max(8, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = traceWidth;
  canvas.height = traceHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas-Kontext konnte nicht erstellt werden');
  }

  ctx.drawImage(image, 0, 0, traceWidth, traceHeight);
  const imageData = ctx.getImageData(0, 0, traceWidth, traceHeight);
  return rasterPixelsToSvg(imageData.data, traceWidth, traceHeight, sourceWidth, sourceHeight, quality, smoothEdges);
}

async function svgToRasterDataUrl(
  svgContent: string,
  targetFormat: RasterImageFormat,
  quality = 0.92
): Promise<string> {
  const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const svgDataUrl = await arrayBufferToDataUrl(await svgBlob.arrayBuffer(), 'image/svg+xml');
  const image = await loadImageFromDataUrl(svgDataUrl);

  const width = image.naturalWidth || image.width || 1024;
  const height = image.naturalHeight || image.height || 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas-Kontext konnte nicht erstellt werden');
  }

  if (targetFormat === 'jpg' || targetFormat === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(image, 0, 0, width, height);
  const mimeType = getImageMimeType(targetFormat);
  const normalizedQuality = Math.max(0.1, Math.min(1, quality));
  return canvas.toDataURL(mimeType, targetFormat === 'png' ? undefined : normalizedQuality);
}

/**
 * JSON → Markdown
 */
export function jsonToMarkdown(jsonData: string | JSONContent): ConversionResult {
  try {
    let parsedData: JSONContent;

    if (typeof jsonData === 'string') {
      parsedData = JSON.parse(jsonData);
    } else {
      parsedData = jsonData;
    }

    let markdown = '';

    // Titel hinzufügen falls vorhanden
    if (parsedData.title) {
      markdown += `# ${parsedData.title}\n\n`;
    }

    // Metadata als YAML Frontmatter
    if (parsedData.metadata) {
      markdown += '---\n';
      Object.entries(parsedData.metadata).forEach(([key, value]) => {
        markdown += `${key}: ${value}\n`;
      });
      markdown += '---\n\n';
    }

    // Hauptinhalt
    markdown += parsedData.content;

    return {
      success: true,
      data: markdown,
    };
  } catch (error) {
    return {
      success: false,
      error: `JSON-Parsing-Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
    };
  }
}

/**
 * Markdown → HTML
 */
export async function markdownToHTML(markdown: string): Promise<ConversionResult> {
  try {
    const rawHtml = await marked.parse(markdown);

    // Sanitize HTML für Sicherheit
    const sanitizedHtml = DOMPurify.sanitize(rawHtml);

    // Vollständiges HTML-Dokument mit Styling
    const fullHtml = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Konvertiertes Dokument</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
    }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    pre {
      background: #f4f4f4;
      padding: 1rem;
      border-radius: 5px;
      overflow-x: auto;
    }
    pre code {
      background: none;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #ddd;
      padding-left: 1rem;
      margin-left: 0;
      color: #666;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1rem 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: #f4f4f4;
    }
  </style>
</head>
<body>
  ${sanitizedHtml}
</body>
</html>`;

    return {
      success: true,
      data: fullHtml,
    };
  } catch (error) {
    return {
      success: false,
      error: `Markdown→HTML Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
    };
  }
}

/**
 * Markdown → GitHub Flavored Markdown
 * Konvertiert Standard MD zu GFM mit erweiterten Features
 */
export function markdownToGithub(markdown: string): ConversionResult {
  try {
    let gfmContent = markdown;

    // Stelle sicher, dass Task Lists korrekt formatiert sind
    gfmContent = gfmContent.replace(/^(\s*)-\s*\[\s*\]/gm, '$1- [ ]');
    gfmContent = gfmContent.replace(/^(\s*)-\s*\[x\]/gim, '$1- [x]');

    // Autolinks für URLs
    gfmContent = gfmContent.replace(
      /(?<!")https?:\/\/[^\s<]+(?!")/g,
      (url) => `[${url}](${url})`
    );

    // Stelle sicher, dass Code Blocks Sprach-Identifier haben
    gfmContent = gfmContent.replace(/^```\s*$/gm, '```text');

    return {
      success: true,
      data: gfmContent,
    };
  } catch (error) {
    return {
      success: false,
      error: `Markdown→GFM Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
    };
  }
}

/**
 * JSON → GitHub Flavored Markdown
 */
export function jsonToGithubMarkdown(jsonData: string | JSONContent): ConversionResult {
  try {
    // Erst JSON → Standard Markdown
    const mdResult = jsonToMarkdown(jsonData);
    if (!mdResult.success || !mdResult.data) {
      return mdResult;
    }

    // Dann Standard MD → GitHub MD
    return markdownToGithub(mdResult.data);
  } catch (error) {
    return {
      success: false,
      error: `JSON→GFM Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
    };
  }
}

/**
 * DOCX → Markdown
 * Konvertiert Microsoft Word-Dokumente zu Markdown (via HTML)
 */
export async function docxToMarkdown(arrayBuffer: ArrayBuffer): Promise<ConversionResult> {
  try {
    // Mammoth konvertiert DOCX → HTML
    const result = await mammoth.convertToHtml({ arrayBuffer });

    if (!result.value) {
      return {
        success: false,
        error: 'DOCX-Konvertierung lieferte keinen Inhalt',
      };
    }

    // Dann HTML → Markdown mit Turndown
    const markdown = turndownService.turndown(result.value);

    return {
      success: true,
      data: markdown,
    };
  } catch (error) {
    return {
      success: false,
      error: `DOCX→Markdown Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
    };
  }
}

/**
 * Pages → Markdown
 * Konvertiert Apple Pages-Dokumente zu Markdown
 * Pages-Dateien sind ZIP-Archive mit index.html darin
 */
export async function pagesToMarkdown(arrayBuffer: ArrayBuffer): Promise<ConversionResult> {
  try {
    // Lade das ZIP-Archiv
    const zip = await JSZip.loadAsync(arrayBuffer);

    console.log('Pages ZIP loaded. Files in archive:', Object.keys(zip.files));

    // Suche nach index.html im Archiv (neuere Pages-Versionen)
    let indexHtml = zip.file('index.html');

    // Fallback: Suche nach Data/index.html (ältere Pages-Versionen)
    if (!indexHtml) {
      indexHtml = zip.file('Data/index.html');
    }

    // Fallback: Suche im QuickLook-Ordner
    if (!indexHtml) {
      indexHtml = zip.file('QuickLook/index.html');
    }

    if (!indexHtml) {
      // Debug: Liste alle Dateien im Archiv
      const fileList = Object.keys(zip.files).join(', ');
      console.error('Available files in Pages archive:', fileList);

      // Prüfe ob es .iwa Dateien gibt (neueres Pages-Format)
      const hasIwaFiles = Object.keys(zip.files).some(name => name.endsWith('.iwa'));

      if (hasIwaFiles) {
        return {
          success: false,
          error: 'Dieses Pages-Dokument verwendet ein neueres Format (.iwa), das nicht direkt konvertiert werden kann. Bitte exportiere das Dokument aus Pages als DOCX (Datei → Exportieren → Word) und lade die DOCX-Datei hoch.',
        };
      }

      return {
        success: false,
        error: `Keine konvertierbare HTML-Datei in Pages-Dokument gefunden. Bitte exportiere das Dokument als DOCX aus Pages.`,
      };
    }

    // Extrahiere HTML-Inhalt
    const htmlContent = await indexHtml.async('string');
    console.log('HTML content extracted, length:', htmlContent.length);

    if (!htmlContent || htmlContent.trim().length === 0) {
      return {
        success: false,
        error: 'Pages HTML-Inhalt ist leer',
      };
    }

    // Konvertiere HTML → Markdown
    const markdown = turndownService.turndown(htmlContent);
    console.log('Markdown converted, length:', markdown.length);

    if (!markdown || markdown.trim().length === 0) {
      return {
        success: false,
        error: 'Markdown-Konvertierung ergab keinen Inhalt. Pages-Dokument könnte ein nicht unterstütztes Format verwenden.',
      };
    }

    return {
      success: true,
      data: markdown,
    };
  } catch (error) {
    console.error('Pages conversion error:', error);
    return {
      success: false,
      error: `Pages→Markdown Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
    };
  }
}

/**
 * PDF -> Markdown (Text-Extraktion)
 */
export async function pdfToMarkdown(arrayBuffer: ArrayBuffer): Promise<ConversionResult> {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    // Required in browser builds so pdf.js can spawn its worker.
    (pdfjs as any).GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/legacy/build/pdf.worker.mjs',
      import.meta.url
    ).toString();
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(arrayBuffer),
    });
    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const items = textContent.items
        .map((item: any) => ({
          str: 'str' in item ? String(item.str) : '',
          x: item.transform?.[4] ?? 0,
          y: item.transform?.[5] ?? 0,
          height: item.height ?? 0,
        }))
        .filter((item: any) => item.str && item.str.trim().length > 0);

      items.sort((a: any, b: any) => {
        const dy = b.y - a.y;
        if (Math.abs(dy) > 0.1) return dy;
        return a.x - b.x;
      });

      const avgHeight =
        items.length > 0
          ? items.reduce((sum: number, it: any) => sum + (it.height || 0), 0) / items.length
          : 10;
      const lineThreshold = Math.max(2, avgHeight * 0.35);
      const paragraphThreshold = Math.max(10, avgHeight * 1.2);

      const lines: string[] = [];
      let currentY: number | null = null;
      let lastLineY: number | null = null;

      for (const item of items) {
        if (currentY === null || Math.abs(item.y - currentY) > lineThreshold) {
          if (lastLineY !== null && Math.abs(lastLineY - item.y) > paragraphThreshold) {
            lines.push('');
          }
          lines.push(item.str);
          currentY = item.y;
          lastLineY = item.y;
        } else {
          const last = lines[lines.length - 1] ?? '';
          const needsSpace = last && !last.endsWith('-') && !item.str.startsWith(' ');
          lines[lines.length - 1] = needsSpace ? `${last} ${item.str}` : `${last}${item.str}`;
        }
      }

      const pageText = lines
        .join('\n')
        .replace(/-\n(?=\p{Ll})/gu, '')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (pageText) {
        pageTexts.push(`## Seite ${pageNumber}\n\n${pageText}`);
      }
    }

    const merged = pageTexts.join('\n\n');
    if (!merged) {
      return {
        success: false,
        error: 'PDF enthält keinen auslesbaren Text.',
      };
    }

    return {
      success: true,
      data: merged,
    };
  } catch (error) {
    return {
      success: false,
      error: `PDF→Markdown Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
    };
  }
}

/**
 * Markdown → Plain Text
 * Entfernt alle Markdown-Syntax
 */
export function markdownToText(markdown: string): ConversionResult {
  try {
    let text = markdown;

    // Entferne Frontmatter
    text = text.replace(/^---[\s\S]*?---\n/m, '');

    // Entferne Code-Blöcke
    text = text.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/`([^`]+)`/g, '$1');

    // Entferne Links aber behalte Text
    text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

    // Entferne Bilder
    text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '');

    // Entferne Überschriften-Marker
    text = text.replace(/^#{1,6}\s+/gm, '');

    // Entferne Bold/Italic
    text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
    text = text.replace(/(\*|_)(.*?)\1/g, '$2');

    // Entferne Blockquotes
    text = text.replace(/^>\s+/gm, '');

    // Entferne Listen-Marker
    text = text.replace(/^[-*+]\s+/gm, '');
    text = text.replace(/^\d+\.\s+/gm, '');

    // Entferne horizontale Linien
    text = text.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '');

    // Entferne HTML-Tags
    text = text.replace(/<[^>]+>/g, '');

    // Bereinige Leerzeichen
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.trim();

    return {
      success: true,
      data: text,
    };
  } catch (error) {
    return {
      success: false,
      error: `Markdown→Text Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
    };
  }
}

/**
 * Markdown → JSON
 */
export function markdownToJSON(markdown: string): ConversionResult {
  try {
    let title = '';
    let content = markdown;
    const metadata: Record<string, any> = {};

    // Extrahiere Frontmatter
    const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      content = markdown.replace(frontmatterMatch[0], '');

      // Parse Frontmatter
      frontmatter.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          metadata[key.trim()] = valueParts.join(':').trim();
        }
      });
    }

    // Extrahiere ersten H1 als Titel
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1];
      content = content.replace(titleMatch[0], '').trim();
    }

    const jsonData: JSONContent = {
      title: title || metadata.title || 'Untitled',
      content: content.trim(),
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };

    return {
      success: true,
      data: JSON.stringify(jsonData, null, 2),
    };
  } catch (error) {
    return {
      success: false,
      error: `Markdown→JSON Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
    };
  }
}

/**
 * HTML → Markdown
 */
export function htmlToMarkdown(html: string): ConversionResult {
  try {
    // Sanitize HTML zuerst
    const sanitizedHtml = DOMPurify.sanitize(html);

    // Konvertiere zu Markdown
    const markdown = turndownService.turndown(sanitizedHtml);

    return {
      success: true,
      data: markdown,
    };
  } catch (error) {
    return {
      success: false,
      error: `HTML→Markdown Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
    };
  }
}

/**
 * Markdown → PDF
 * Hinweis: In einer Browser/Tauri-Umgebung nutzen wir die Print-API
 * Der Benutzer kann dann "Als PDF speichern" wählen
 */
export async function markdownToPDF(markdown: string): Promise<ConversionResult> {
  try {
    // Konvertiere zuerst zu HTML
    const htmlResult = await markdownToHTML(markdown);

    if (!htmlResult.success || !htmlResult.data) {
      return {
        success: false,
        error: 'HTML-Konvertierung fehlgeschlagen',
      };
    }

    // Für Browser/Tauri: Öffne Print-Dialog
    // Der Benutzer kann dann "Als PDF speichern" wählen
    return {
      success: true,
      data: htmlResult.data,
    };
  } catch (error) {
    return {
      success: false,
      error: `Markdown→PDF Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
    };
  }
}

/**
 * Markdown → DOCX (Word)
 */
async function markdownToDocx(markdown: string): Promise<ConversionResult> {
  try {
    const { Document, Paragraph, TextRun, HeadingLevel, Packer } = await import('docx');

    const parseInline = (line: string): InstanceType<typeof TextRun>[] => {
      const runs: InstanceType<typeof TextRun>[] = [];
      const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|(.+?))/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(line)) !== null) {
        if (match[2]) {
          runs.push(new TextRun({ text: match[2], bold: true }));
        } else if (match[3]) {
          runs.push(new TextRun({ text: match[3], italics: true }));
        } else if (match[4]) {
          runs.push(new TextRun({ text: match[4], font: 'Courier New' }));
        } else if (match[5]) {
          runs.push(new TextRun({ text: match[5] }));
        }
      }
      return runs.length > 0 ? runs : [new TextRun({ text: line })];
    };

    const children: InstanceType<typeof Paragraph>[] = [];

    for (const line of markdown.split('\n')) {
      if (line.startsWith('# ')) {
        children.push(new Paragraph({ text: line.slice(2).trim(), heading: HeadingLevel.HEADING_1 }));
      } else if (line.startsWith('## ')) {
        children.push(new Paragraph({ text: line.slice(3).trim(), heading: HeadingLevel.HEADING_2 }));
      } else if (line.startsWith('### ')) {
        children.push(new Paragraph({ text: line.slice(4).trim(), heading: HeadingLevel.HEADING_3 }));
      } else if (line.startsWith('#### ')) {
        children.push(new Paragraph({ text: line.slice(5).trim(), heading: HeadingLevel.HEADING_4 }));
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        children.push(new Paragraph({ children: parseInline(line.slice(2).trim()), bullet: { level: 0 } }));
      } else if (!line.trim()) {
        children.push(new Paragraph({ text: '' }));
      } else {
        const stripped = line.replace(/\[(.+?)\]\(.+?\)/g, '$1');
        children.push(new Paragraph({ children: parseInline(stripped) }));
      }
    }

    const doc = new Document({ sections: [{ children }] });
    const base64 = await Packer.toBase64String(doc);
    return {
      success: true,
      data: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`,
    };
  } catch (error) {
    return {
      success: false,
      error: `DOCX-Konvertierung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
    };
  }
}

/**
 * Hauptkonvertierungsfunktion
 */
export async function convertFile(
  content: string | ArrayBuffer,
  fromFormat: SupportedFormat,
  toFormat: SupportedFormat,
  fileName?: string,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  // Wenn gleiche Formate, gib Original zurück
  if (fromFormat === toFormat) {
    if (typeof content === 'string') {
      return {
        success: true,
        data: content,
      };
    }

    if (isRasterImageFormat(fromFormat)) {
      return {
        success: true,
        data: await arrayBufferToDataUrl(content, getImageMimeType(fromFormat)),
      };
    }

    return {
      success: true,
      data: '',
    };
  }

  try {
    // DOCX/DOC → Markdown (dann zu anderen Formaten)
    if ((fromFormat === 'docx' || fromFormat === 'doc') && content instanceof ArrayBuffer) {
      const docxResult = await docxToMarkdown(content);

      if (!docxResult.success || !docxResult.data) {
        return docxResult;
      }

      // Wenn Zielformat Markdown ist, direkt zurückgeben
      if (toFormat === 'md' || toFormat === 'gfm') {
        return docxResult;
      }

      // Sonst weiter zu anderem Format konvertieren
      return await convertFile(docxResult.data, 'md', toFormat, fileName, options);
    }

    // Pages → Markdown (dann zu anderen Formaten)
    if (fromFormat === 'pages' && content instanceof ArrayBuffer) {
      const pagesResult = await pagesToMarkdown(content);

      if (!pagesResult.success || !pagesResult.data) {
        return pagesResult;
      }

      // Wenn Zielformat Markdown ist, direkt zurückgeben
      if (toFormat === 'md' || toFormat === 'gfm') {
        return pagesResult;
      }

      // Sonst weiter zu anderem Format konvertieren
      return await convertFile(pagesResult.data, 'md', toFormat, fileName, options);
    }

    // PDF → Markdown (dann zu anderen Formaten)
    if (fromFormat === 'pdf' && content instanceof ArrayBuffer) {
      const pdfResult = await pdfToMarkdown(content);

      if (!pdfResult.success || !pdfResult.data) {
        return pdfResult;
      }

      if (toFormat === 'md' || toFormat === 'gfm') {
        return pdfResult;
      }

      return await convertFile(pdfResult.data, 'md', toFormat, fileName, options);
    }

    // Bild-Konvertierungen
    if (isImageFormat(fromFormat) && isImageFormat(toFormat)) {
      if (isRasterImageFormat(fromFormat) && content instanceof ArrayBuffer) {
        if (isRasterImageFormat(toFormat)) {
          const { blobUrl, byteSize } = await rasterToRasterBlobUrl(
            content,
            fromFormat,
            toFormat,
            options.imageQuality ?? 0.92,
            options.imageMaxOutputSize,
          );
          return { success: true, data: blobUrl, byteSize };
        }

        if (toFormat === 'svg') {
          const svg = await rasterToSvg(content, fromFormat, options);
          return { success: true, data: svg };
        }
      }

      if (fromFormat === 'svg') {
        const svgSource =
          typeof content === 'string'
            ? content
            : new TextDecoder('utf-8').decode(new Uint8Array(content));

        if (toFormat === 'svg') {
          return { success: true, data: svgSource };
        }

        if (isRasterImageFormat(toFormat)) {
          const rasterDataUrl = await svgToRasterDataUrl(
            svgSource,
            toFormat,
            options.imageQuality ?? 0.92
          );
          return { success: true, data: rasterDataUrl };
        }
      }

      return {
        success: false,
        error: `Konvertierung von ${fromFormat} nach ${toFormat} wird nicht unterstützt`,
      };
    }

    // Stelle sicher, dass content ein String ist für alle anderen Konvertierungen
    if (typeof content !== 'string') {
      return {
        success: false,
        error: 'Ungültiger Inhaltstyp für diese Konvertierung',
      };
    }

    // Code → README (AI-gestützt)
    if (fromFormat === 'code' && toFormat === 'md') {
      const result = await codeToReadme(content, fileName);
      return {
        success: result.success,
        data: result.readme,
        error: result.error,
      };
    }

    // Code → GitHub Markdown (AI-gestützt)
    if (fromFormat === 'code' && toFormat === 'gfm') {
      const mdResult = await codeToReadme(content, fileName);
      if (mdResult.success && mdResult.readme) {
        return markdownToGithub(mdResult.readme);
      }
      return {
        success: false,
        error: mdResult.error || 'Code-Analyse fehlgeschlagen',
      };
    }

    // Code → andere Formate (via Markdown)
    if (fromFormat === 'code' && toFormat !== 'md' && toFormat !== 'gfm') {
      const mdResult = await codeToReadme(content, fileName);
      if (mdResult.success && mdResult.readme) {
        return await convertFile(mdResult.readme, 'md', toFormat, fileName, options);
      }
      return {
        success: false,
        error: mdResult.error || 'Code-Analyse fehlgeschlagen',
      };
    }

    // GitHub Markdown Konvertierungen
    if (toFormat === 'gfm') {
      switch (fromFormat) {
        case 'json':
          return jsonToGithubMarkdown(content);
        case 'md':
          return markdownToGithub(content);
        case 'html':
          const htmlToMdResult = htmlToMarkdown(content);
          if (htmlToMdResult.success && htmlToMdResult.data) {
            return markdownToGithub(htmlToMdResult.data);
          }
          return htmlToMdResult;
        case 'txt':
          return markdownToGithub(content);
        default:
          return {
            success: false,
            error: `Konvertierung von ${fromFormat} nach GFM wird nicht unterstützt`,
          };
      }
    }

    // Von GitHub Markdown zu anderen Formaten
    if (fromFormat === 'gfm') {
      // GFM wird wie Standard MD behandelt
      return await convertFile(content, 'md', toFormat, fileName, options);
    }

    // ====================================
    // Editor.js Konvertierungen
    // ====================================

    // Markdown → Editor.js
    if (fromFormat === 'md' && toFormat === 'editorjs') {
      try {
        const editorData = markdownToEditorJS(content);
        return {
          success: true,
          data: JSON.stringify(editorData, null, 2),
        };
      } catch (error) {
        return {
          success: false,
          error: `Markdown→Editor.js Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        };
      }
    }

    // Editor.js → Markdown
    if (fromFormat === 'editorjs' && toFormat === 'md') {
      try {
        const markdown = editorJSToMarkdown(content);
        return {
          success: true,
          data: markdown,
        };
      } catch (error) {
        return {
          success: false,
          error: `Editor.js→Markdown Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        };
      }
    }

    // Editor.js → andere Formate (via Markdown)
    if (fromFormat === 'editorjs' && toFormat !== 'md') {
      try {
        const markdown = editorJSToMarkdown(content);
        return await convertFile(markdown, 'md', toFormat, fileName, options);
      } catch (error) {
        return {
          success: false,
          error: `Editor.js Konvertierung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        };
      }
    }

    // Andere Formate → Editor.js (via Markdown)
    if (toFormat === 'editorjs') {
      // Erst zu Markdown konvertieren, dann zu Editor.js
      const mdResult = await convertFile(content, fromFormat, 'md', fileName, options);
      if (mdResult.success && mdResult.data) {
        try {
          const editorData = markdownToEditorJS(mdResult.data);
          return {
            success: true,
            data: JSON.stringify(editorData, null, 2),
          };
        } catch (error) {
          return {
            success: false,
            error: `Editor.js Konvertierung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
          };
        }
      }
      return mdResult;
    }

    // ====================================
    // Standard Konvertierungen
    // ====================================

    // Konvertierungs-Matrix
    if (fromFormat === 'json' && toFormat === 'md') {
      return jsonToMarkdown(content);
    }

    if (fromFormat === 'md') {
      switch (toFormat) {
        case 'html':
          return await markdownToHTML(content);
        case 'txt':
          return markdownToText(content);
        case 'json':
          return markdownToJSON(content);
        case 'pdf':
          return await markdownToPDF(content);
        case 'docx':
          return await markdownToDocx(content);
      }
    }

    if (fromFormat === 'html' && toFormat === 'md') {
      return htmlToMarkdown(content);
    }

    // Mehrstufige Konvertierungen
    if (fromFormat === 'json' && toFormat !== 'md') {
      const mdResult = jsonToMarkdown(content);
      if (mdResult.success && mdResult.data) {
        return await convertFile(mdResult.data, 'md', toFormat, fileName, options);
      }
      return mdResult;
    }

    if (fromFormat === 'html' && toFormat !== 'md') {
      const mdResult = htmlToMarkdown(content);
      if (mdResult.success && mdResult.data) {
        return await convertFile(mdResult.data, 'md', toFormat, fileName, options);
      }
      return mdResult;
    }

    if (fromFormat === 'txt') {
      // Text kann als Markdown behandelt werden
      return await convertFile(content, 'md', toFormat, fileName, options);
    }

    return {
      success: false,
      error: `Konvertierung von ${fromFormat} nach ${toFormat} wird nicht unterstützt`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Konvertierung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
    };
  }
}

/**
 * Helper: Dateiendung ermitteln
 */
export function getFileExtension(format: SupportedFormat): string {
  const extensions: Record<SupportedFormat, string> = {
    json: '.json',
    md: '.md',
    gfm: '.md',
    html: '.html',
    txt: '.txt',
    pdf: '.pdf',
    code: '.md',
    editorjs: '.json',
    docx: '.docx',
    doc: '.doc',
    pages: '.pages',
    png: '.png',
    jpg: '.jpg',
    jpeg: '.jpeg',
    webp: '.webp',
    svg: '.svg',
  };
  return extensions[format];
}

/**
 * Helper: Format aus Dateinamen ermitteln
 */
export function detectFormatFromFilename(filename: string): SupportedFormat | null {
  const ext = filename.toLowerCase().split('.').pop();

  switch (ext) {
    case 'json':
      // Versuche zu erkennen ob es Editor.js JSON ist
      // Dies wird in der convertFile-Funktion genauer geprüft
      return 'json';
    case 'md':
    case 'markdown':
      return 'md';
    case 'html':
    case 'htm':
      return 'html';
    case 'txt':
    case 'text':
      return 'txt';
    case 'pdf':
      return 'pdf';
    case 'docx':
      return 'docx';
    case 'doc':
      return 'doc';
    case 'pages':
      return 'pages';
    case 'png':
      return 'png';
    case 'jpg':
      return 'jpg';
    case 'jpeg':
      return 'jpeg';
    case 'webp':
      return 'webp';
    case 'svg':
      return 'svg';
    // Code-Dateien
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'py':
    case 'rs':
    case 'go':
    case 'java':
    case 'c':
    case 'cpp':
    case 'h':
    case 'hpp':
    case 'cs':
    case 'php':
    case 'rb':
    case 'swift':
    case 'kt':
    case 'scala':
      return 'code';
    default:
      return null;
  }
}

/**
 * Helper: Erkenne ob JSON-String Editor.js Format ist
 */
export function detectEditorJSFormat(content: string): boolean {
  try {
    return isValidEditorJSData(content);
  } catch {
    return false;
  }
}
