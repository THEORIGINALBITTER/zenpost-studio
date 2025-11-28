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
export type SupportedFormat = 'json' | 'md' | 'gfm' | 'html' | 'txt' | 'pdf' | 'code' | 'editorjs' | 'docx' | 'doc' | 'pages';

export interface ConversionResult {
  success: boolean;
  data?: string;
  error?: string;
}

export interface JSONContent {
  title?: string;
  content: string;
  metadata?: Record<string, any>;
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
 * Hauptkonvertierungsfunktion
 */
export async function convertFile(
  content: string | ArrayBuffer,
  fromFormat: SupportedFormat,
  toFormat: SupportedFormat,
  fileName?: string
): Promise<ConversionResult> {
  // Wenn gleiche Formate, gib Original zurück
  if (fromFormat === toFormat) {
    return {
      success: true,
      data: typeof content === 'string' ? content : '',
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
      return await convertFile(docxResult.data, 'md', toFormat, fileName);
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
      return await convertFile(pagesResult.data, 'md', toFormat, fileName);
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
        return await convertFile(mdResult.readme, 'md', toFormat);
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
      return await convertFile(content, 'md', toFormat);
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
        return await convertFile(markdown, 'md', toFormat);
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
      const mdResult = await convertFile(content, fromFormat, 'md');
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
      }
    }

    if (fromFormat === 'html' && toFormat === 'md') {
      return htmlToMarkdown(content);
    }

    // Mehrstufige Konvertierungen
    if (fromFormat === 'json' && toFormat !== 'md') {
      const mdResult = jsonToMarkdown(content);
      if (mdResult.success && mdResult.data) {
        return await convertFile(mdResult.data, 'md', toFormat);
      }
      return mdResult;
    }

    if (fromFormat === 'html' && toFormat !== 'md') {
      const mdResult = htmlToMarkdown(content);
      if (mdResult.success && mdResult.data) {
        return await convertFile(mdResult.data, 'md', toFormat);
      }
      return mdResult;
    }

    if (fromFormat === 'txt') {
      // Text kann als Markdown behandelt werden
      return await convertFile(content, 'md', toFormat);
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
