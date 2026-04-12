import { useState, useMemo, useRef } from 'react';
import {
  loadSocialConfig, isPlatformConfigured,
  postToDevTo, postToMedium, postToLinkedIn,
  type SocialPlatform, type SocialMediaConfig,
} from '../../../../services/socialMediaService';
import { preparePostContent } from '../../../../config/platformPostRules';
import { readFile, writeFile, writeTextFile, readTextFile, readDir, exists, mkdir } from '@tauri-apps/plugin-fs';
import { save } from '@tauri-apps/plugin-dialog';
import { isTauri } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';
import { loadZenStudioSettings, type BlogConfig } from '../../../../services/zenStudioSettingsService';
import { gitCommitAndPush } from '../../../../services/gitService';
import { ftpUpload } from '../../../../services/ftpService';
import { phpBlogImageUpload, phpBlogUpload } from '../../../../services/phpBlogService';
import ZenEngine from '../../../../services/zenEngineService';
import { marked } from 'marked';
import { Document as DocxDocument, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import JSZip from 'jszip';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCode,
  faFilePdf,
  faFileLines,
  faFileAlt,
  faBookOpen,
  faCheck,
  faSpinner,
  faGlobe,
  faCopy,
  faExternalLinkAlt,
  faImage,
  faBoxArchive,
} from '@fortawesome/free-solid-svg-icons';
import { transformContent, type ContentTone, type ContentPlatform } from '../../../../services/aiService';

interface ToneOption {
  value: ContentTone;
  label: string;
  description: string;
}
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  faLinkedin,
  faMedium,
  faWordpress,
  faDev,
  faHashnode,
  faGithub,
} from '@fortawesome/free-brands-svg-icons';
import { ZenModal } from '../components/ZenModal';
import { useOpenExternal } from '../../../../hooks/useOpenExternal';
import { loadOpfsImageAsBlobUrl, isOpfsImagePath } from '../../../../utils/editorImageCompression';
import { uploadCloudDocument } from '../../../../services/cloudStorageService';

interface ZenExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  platform?: string;
  documentName?: string;
  tags?: string[];
  subtitle?: string;
  imageUrl?: string;
  onNavigateToTransform?: () => void;
  onBlogPublished?: (info: { blogId: string; blogPath: string; blogName: string }) => void;
}

const sanitizeBaseName = (value: string): string =>
  value
    .trim()
    .replace(/^web:/i, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const deriveExportBaseName = (documentName: string | undefined, content: string): string => {
  const explicit = sanitizeBaseName(documentName ?? '');
  if (explicit) return explicit;

  const headingMatch = content.match(/^#\s+(.+)$/m);
  const fromHeading = sanitizeBaseName(headingMatch?.[1] ?? '');
  if (fromHeading) return fromHeading;

  return 'Export';
};

const markdownToPlainText = (markdown: string): string => {
  return markdown
    .replace(/\r\n/g, '\n')
    // fenced code blocks -> keep inner text
    .replace(/```[\w-]*\n([\s\S]*?)```/g, '$1')
    // inline code
    .replace(/`([^`]+)`/g, '$1')
    // images ![alt](url) -> alt (url)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1 ($2)')
    // links [text](url) -> text (url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    // headings
    .replace(/^#{1,6}\s+/gm, '')
    // blockquotes
    .replace(/^\s*>\s?/gm, '')
    // unordered/ordered lists
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // emphasis/bold/strike
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    // horizontal rules
    .replace(/^\s*([-*_]){3,}\s*$/gm, '')
    // collapse excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * Generates a smart filename with timestamp
 */
function generateExportFilename(documentName: string | undefined, content: string, extension: string): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // 2026-02-02
  const time = now.toTimeString().slice(0, 5).replace(':', ''); // 2127

  const baseName = deriveExportBaseName(documentName, content);

  return `${baseName}_${date}_${time}.${extension}`;
}

interface ExportOption {
  id: string;
  label: string;
  icon: any;
  format: 'html' | 'pdf' | 'markdown' | 'text' | 'docx' | 'rtf' | 'odt' | 'epub';
}

interface PublishOption {
  id: string;
  label: string;
  icon: any;
  url: string;
  color: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  { id: 'html', label: 'HTML', icon: faCode, format: 'html' },
  { id: 'pdf', label: 'PDF', icon: faFilePdf, format: 'pdf' },
  { id: 'markdown', label: 'Markdown', icon: faFileLines, format: 'markdown' },
  { id: 'text', label: 'Text', icon: faFileAlt, format: 'text' },
];

const DOCX_EXPORT_OPTION: ExportOption = { id: 'docx', label: 'DOCX', icon: faFileLines, format: 'docx' };
const RTF_EXPORT_OPTION: ExportOption = { id: 'rtf', label: 'RTF', icon: faFileAlt, format: 'rtf' };
const ODT_EXPORT_OPTION: ExportOption = { id: 'odt', label: 'ODT', icon: faFileLines, format: 'odt' };
const EPUB_EXPORT_OPTION: ExportOption = { id: 'epub', label: 'EPUB', icon: faBookOpen, format: 'epub' };

const ADDITIONAL_FILE_FORMATS: Array<{
  id: string;
  label: string;
  note: string;
  enabled: boolean;
  option?: ExportOption;
}> = [
  { id: 'docx', label: 'DOCX', note: 'Neu', enabled: true, option: DOCX_EXPORT_OPTION },
  { id: 'rtf', label: 'RTF', note: 'Neu', enabled: true, option: RTF_EXPORT_OPTION },
  { id: 'odt', label: 'ODT', note: 'Neu', enabled: true, option: ODT_EXPORT_OPTION },
  { id: 'epub', label: 'EPUB', note: 'Neu', enabled: true, option: EPUB_EXPORT_OPTION },
];

const TONE_OPTIONS: ToneOption[] = [
  { value: 'professional', label: 'Professional', description: 'Seriös, business-orientiert' },
  { value: 'casual', label: 'Casual', description: 'Locker, freundlich, nahbar' },
  { value: 'technical', label: 'Technical', description: 'Fachlich, präzise, detailliert' },
  { value: 'enthusiastic', label: 'Enthusiastic', description: 'Begeistert, motivierend, energisch' },
];

// Map PublishOption IDs to SocialPlatform (for API publishing)
const SOCIAL_PLATFORM_IDS: Record<string, SocialPlatform> = {
  'medium':      'medium',
  'devto':       'devto',
  'linkedin':    'linkedin',
  'github-gist': 'github',
};

// Map PublishOption IDs to ContentPlatform
const PLATFORM_MAP: Record<string, ContentPlatform> = {
  'medium': 'medium',
  'wordpress': 'blog-post',
  'devto': 'devto',
  'hashnode': 'blog-post',
  'linkedin': 'linkedin',
  'github-gist': 'github-blog',
};

const PUBLISH_OPTIONS: PublishOption[] = [
  {
    id: 'medium',
    label: 'Medium',
    icon: faMedium,
    url: 'https://medium.com/new-story',
    color: '#000000',
  },
  {
    id: 'wordpress',
    label: 'WordPress',
    icon: faWordpress,
    url: 'https://wordpress.com/post',
    color: '#21759B',
  },
  {
    id: 'devto',
    label: 'DEV.to',
    icon: faDev,
    url: 'https://dev.to/new',
    color: '#0A0A0A',
  },
  {
    id: 'hashnode',
    label: 'Hashnode',
    icon: faHashnode,
    url: 'https://hashnode.com/draft/new',
    color: '#2962FF',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: faLinkedin,
    url: 'https://www.linkedin.com/feed/?shareActive=true',
    color: '#0077B5',
  },
  {
    id: 'github-gist',
    label: 'GitHub Gist',
    icon: faGithub,
    url: 'https://gist.github.com/',
    color: '#AC8E66',
  },
];

// Ersetzt alle opfs://-Bildpfade im Markdown durch Cloud-URLs (documents_upload.php).
// Bilder ohne Cloud-Konfiguration oder mit fehlgeschlagenem Upload bleiben unverändert.
const resolveOpfsImagesInContent = async (markdown: string): Promise<string> => {
  const imageRegex = /!\[([^\]]*)\]\((opfs:\/\/[^)]+)\)/g;
  const matches = [...markdown.matchAll(imageRegex)];
  if (matches.length === 0) return markdown;

  let resolved = markdown;
  for (const match of matches) {
    const [fullMatch, alt, opfsPath] = match;
    if (!isOpfsImagePath(opfsPath)) continue;
    try {
      const blobUrl = await loadOpfsImageAsBlobUrl(opfsPath);
      const res = await fetch(blobUrl);
      const blob = await res.blob();
      URL.revokeObjectURL(blobUrl);
      const fileName = opfsPath.split('/').pop() ?? 'image';
      const file = new File([blob], fileName, { type: blob.type });
      const result = await uploadCloudDocument(file);
      if (result) {
        resolved = resolved.replace(fullMatch, `![${alt}](${result.url})`);
      }
    } catch {
      // opfs:// Pfad bleibt unverändert wenn Upload fehlschlägt
    }
  }
  return resolved;
};

export function ZenExportModal({ isOpen, onClose, content, platform: _platform, documentName, tags = [], subtitle, imageUrl, onNavigateToTransform: _onNavigateToTransform, onBlogPublished }: ZenExportModalProps) {
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportedId, setExportedId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [_copied, setCopied] = useState(false);
  const [_optimizingPlatform, setOptimizingPlatform] = useState<string | null>(null);
  const [_optimizedPlatform, setOptimizedPlatform] = useState<string | null>(null);
  const [showToneSelector, setShowToneSelector] = useState(false);
  const [pendingPlatform, setPendingPlatform] = useState<PublishOption | null>(null);
  const [activeAccordion, setActiveAccordion] = useState<'quick' | 'additional' | 'publish' | 'package'>('quick');
  const [zipExportingId, setZipExportingId] = useState<string | null>(null);
  const [zipExportDone, setZipExportDone] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<{ id: string; message: string } | null>(null);
  // Platforms where API failed → show persistent "Copy & Open" fallback button
  const [copyFallbackIds, setCopyFallbackIds] = useState<Set<string>>(new Set());
  // Platform selection for bulk-post (user explicitly selects before posting)
  const [selectedPlatformIds, setSelectedPlatformIds] = useState<Set<string>>(new Set());
  // LinkedIn cover image
  const [linkedInImage, setLinkedInImage] = useState<File | null>(null);
  const [linkedInImagePreview, setLinkedInImagePreview] = useState<string | null>(null);
  const linkedInFileInputRef = useRef<HTMLInputElement>(null);
  const socialConfig = useMemo<SocialMediaConfig>(() => loadSocialConfig(), [isOpen]);
  const blogs = useMemo<BlogConfig[]>(() => loadZenStudioSettings().blogs ?? [], [isOpen]);
  const { openExternal } = useOpenExternal();

  const handleExportBlogZip = async (blog: BlogConfig) => {
    if (!isTauri()) return;
    setZipExportingId(blog.id);
    setZipExportDone(null);
    try {
      const zip = new JSZip();
      const isDocsSite = blog.siteType === 'docs';

      if (isDocsSite) {
        // Docs-Paket: alle Dateien aus dem konfigurierten Ordner (flach + 1 Ebene tief)
        const entries = await readDir(blog.path);
        for (const entry of entries) {
          if (!entry.isFile) continue;
          const filePath = await join(blog.path, entry.name);
          try {
            const content = await readTextFile(filePath);
            zip.file(entry.name, content);
          } catch { /* binäre Dateien überspringen */ }
        }
      } else {
        // Blog-Archiv: posts/*.md + manifest.json
        const manifestPath = await join(blog.path, 'manifest.json');
        if (await exists(manifestPath)) {
          zip.file('manifest.json', await readTextFile(manifestPath));
        }
        const postsDir = await join(blog.path, 'posts');
        if (await exists(postsDir)) {
          const postEntries = await readDir(postsDir);
          for (const entry of postEntries) {
            if (!entry.isFile || !entry.name.endsWith('.md')) continue;
            const filePath = await join(postsDir, entry.name);
            zip.folder('posts')!.file(entry.name, await readTextFile(filePath));
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipName = `${blog.name.toLowerCase().replace(/\s+/g, '-')}-${isDocsSite ? 'docs' : 'blog'}-archiv.zip`;
      const arrayBuffer = await zipBlob.arrayBuffer();
      const savePath = await save({ defaultPath: zipName, filters: [{ name: 'ZIP', extensions: ['zip'] }] });
      if (savePath) {
        await writeFile(savePath, new Uint8Array(arrayBuffer));
        setZipExportDone(blog.id);
        setTimeout(() => setZipExportDone(null), 3000);
      }
    } catch (e) {
      console.error('ZIP Export Fehler:', e);
    } finally {
      setZipExportingId(null);
    }
  };

  const createPdfBytes = async (text: string) => {
    const toWinAnsiSafe = (input: string) =>
      input
        .replace(/→/g, '->')
        .replace(/←/g, '<-')
        .replace(/↔/g, '<->')
        .replace(/⇒/g, '=>')
        .replace(/⇐/g, '<=')
        .replace(/•/g, '*')
        .replace(/…/g, '...')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/[–—]/g, '-')
        .replace(/\u00A0/g, ' ');

    const normalizedText = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    const pdfDoc = await PDFDocument.create();
    if (tags.length > 0) pdfDoc.setKeywords(tags);
    const pdfTitle = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? documentName ?? '';
    if (pdfTitle) pdfDoc.setTitle(pdfTitle);
    pdfDoc.setCreator('ZenPost Studio');
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const fontBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);
    const margin = 40;
    const baseFontSize = 10;

    let page = pdfDoc.addPage();
    let { width, height } = page.getSize();
    let y = height - margin;

    const ensureSpace = (neededHeight: number) => {
      if (y < margin + neededHeight) {
        page = pdfDoc.addPage();
        ({ width, height } = page.getSize());
        y = height - margin;
      }
    };

    type InlineSegment = {
      text: string;
      font: any;
      size: number;
      color: { r: number; g: number; b: number };
      link?: string;
    };

    const defaultColor = { r: 0, g: 0, b: 0 };
    const linkColor = { r: 0.1, g: 0.35, b: 0.8 };

    const tokenizeInline = (line: string, size: number): InlineSegment[] => {
      const segments: InlineSegment[] = [];
      let i = 0;
      let bold = false;
      let italic = false;
      let code = false;

      const pushText = (value: string) => {
        if (!value) return;
        const activeFont = code
          ? fontMono
          : bold && italic
            ? fontBoldItalic
            : bold
              ? fontBold
              : italic
                ? fontItalic
                : font;
        segments.push({
          text: value,
          font: activeFont,
          size,
          color: defaultColor,
        });
      };

      while (i < line.length) {
        // Links: [text](url)
        if (line[i] === '[') {
          const closeText = line.indexOf(']', i + 1);
          const openUrl = closeText >= 0 ? line.indexOf('(', closeText) : -1;
          const closeUrl = openUrl >= 0 ? line.indexOf(')', openUrl) : -1;
          if (closeText >= 0 && openUrl === closeText + 1 && closeUrl > openUrl) {
            const label = line.slice(i + 1, closeText);
            const url = line.slice(openUrl + 1, closeUrl);
            if (label) {
              segments.push({
                text: label,
                font: font,
                size,
                color: linkColor,
                link: url,
              });
            }
            if (url) {
              segments.push({
                text: ` (${url})`,
                font: font,
                size: size - 1,
                color: linkColor,
              });
            }
            i = closeUrl + 1;
            continue;
          }
        }

        // Code span
        if (line[i] === '`') {
          code = !code;
          i += 1;
          continue;
        }

        // Bold/Italic toggles
        if (line.startsWith('**', i) || line.startsWith('__', i)) {
          bold = !bold;
          i += 2;
          continue;
        }
        if (line[i] === '*' || line[i] === '_') {
          italic = !italic;
          i += 1;
          continue;
        }

        // Regular text
        let j = i + 1;
        while (j < line.length) {
          if (line[j] === '`') break;
          if (line.startsWith('**', j) || line.startsWith('__', j)) break;
          if (line[j] === '*' || line[j] === '_') break;
          if (line[j] === '[') break;
          j += 1;
        }
        pushText(line.slice(i, j));
        i = j;
      }

      return segments;
    };

    const splitSegmentsToWords = (segments: InlineSegment[]) => {
      const words: InlineSegment[] = [];
      segments.forEach((seg) => {
        const parts = seg.text.split(/(\s+)/);
        parts.forEach((part) => {
          if (part === '') return;
          words.push({ ...seg, text: part });
        });
      });
      return words;
    };

    const wrapSegments = (segments: InlineSegment[], maxWidth: number) => {
      const lines: InlineSegment[][] = [];
      let current: InlineSegment[] = [];
      let currentWidth = 0;
      const words = splitSegmentsToWords(segments);

      words.forEach((word) => {
        const wordWidth = word.font.widthOfTextAtSize(word.text, word.size);
        if (currentWidth + wordWidth <= maxWidth || current.length === 0) {
          current.push(word);
          currentWidth += wordWidth;
          return;
        }
        lines.push(current);
        current = [word];
        currentWidth = wordWidth;
      });

      if (current.length > 0) lines.push(current);
      return lines;
    };

    const drawWrappedSegments = (
      segments: InlineSegment[],
      size: number,
      indent = 0
    ) => {
      const lineHeight = size + 3;
      const maxWidth = width - margin * 2 - indent;
      const lines = wrapSegments(segments, maxWidth);
      const startY = y;
      lines.forEach((lineSegments) => {
        ensureSpace(lineHeight);
        let x = margin + indent;
        lineSegments.forEach((seg) => {
          page.drawText(seg.text, {
            x,
            y,
            size: seg.size,
            font: seg.font,
            color: rgb(seg.color.r, seg.color.g, seg.color.b),
          });
          x += seg.font.widthOfTextAtSize(seg.text, seg.size);
        });
        y -= lineHeight;
      });
      return {
        height: lines.length * lineHeight,
        topY: startY,
        bottomY: y,
      };
    };

    const stripInline = (line: string) =>
      line
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/_([^_]+)_/g, '$1');

    const pdfSafeText = toWinAnsiSafe(normalizedText)
      // Markdown data URL images can be extremely large and freeze PDF layout; reduce to short markers.
      .replace(/!\[([^\]]*)\]\(data:image\/[^)]+\)/gi, (_m, alt) => `[Bild: ${String(alt ?? '').trim() || 'eingebettet'}]`)
      // HTML inline data URL images.
      .replace(/<img\b[^>]*\bsrc=["']data:image\/[^"']+["'][^>]*\/?>/gi, '[Bild: eingebettet]');

    const rawLines = pdfSafeText.replace(/\r\n/g, '\n').split('\n');
    let inCodeBlock = false;
    const parseMarkdownImage = (input: string): { alt: string; url: string } | null => {
      const trimmed = input.trim();
      if (!trimmed.startsWith('![')) return null;
      const altEnd = trimmed.indexOf('](');
      if (altEnd < 2 || !trimmed.endsWith(')')) return null;
      const alt = trimmed.slice(2, altEnd).trim();
      const url = trimmed.slice(altEnd + 2, -1).trim();
      if (!url) return null;
      return { alt, url };
    };
    const parseHtmlImage = (input: string): { alt: string; url: string } | null => {
      const trimmed = input.trim();
      const srcQuoted = trimmed.match(/^<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*\/?>$/i);
      const srcUnquoted = trimmed.match(/^<img\b[^>]*\bsrc=([^\s>]+)[^>]*\/?>$/i);
      const src = (srcQuoted?.[1] ?? srcUnquoted?.[1] ?? '').trim();
      if (!src) return null;
      const altMatch = trimmed.match(/\balt=["']([^"']*)["']/i);
      return { alt: (altMatch?.[1] ?? '').trim(), url: src };
    };

    const isTableSeparator = (line: string) =>
      /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line);

    const splitTableRow = (line: string) => {
      const trimmed = line.trim();
      const noEdge = trimmed.replace(/^\|/, '').replace(/\|$/, '');
      return noEdge.split('|').map((cell) => cell.trim());
    };

    const drawTable = (rows: string[][]) => {
      if (rows.length === 0) return;
      const header = rows[0];
      const body = rows.slice(1);
      const colCount = Math.max(...rows.map((r) => r.length));
      const colWidths = new Array(colCount).fill(0).map(() => 0);
      const tableWidth = width - margin * 2;
      const columnWidth = tableWidth / colCount;
      colWidths.fill(columnWidth);
      const cellPadding = 6;
      const headerFontSize = 10;
      const cellFontSize = 9;

      const measureRowHeight = (cells: string[], size: number) => {
        const rowSegments = cells.map((cell) => tokenizeInline(cell, size));
        const wrappedCells = rowSegments.map((segments, idx) =>
          wrapSegments(segments, colWidths[idx] - cellPadding * 2)
        );
        const maxLines = Math.max(...wrappedCells.map((lines) => lines.length || 1));
        return maxLines * (size + 4) + cellPadding * 2;
      };

      const drawRow = (cells: string[], isHeader = false) => {
        const size = isHeader ? headerFontSize : cellFontSize;
        const rowSegments = cells.map((cell) => tokenizeInline(cell, size));
        const wrappedCells = rowSegments.map((segments, idx) =>
          wrapSegments(segments, colWidths[idx] - cellPadding * 2)
        );
        const maxLines = Math.max(...wrappedCells.map((lines) => lines.length || 1));
        const rowHeight = maxLines * (size + 4) + cellPadding * 2;
        const rowTop = y;
        let x = margin;

        for (let c = 0; c < colCount; c += 1) {
          const cellLines = wrappedCells[c] || [[]];
          let textY = y - cellPadding - (size + 4);
          cellLines.forEach((lineSegments) => {
            let textX = x + cellPadding;
            lineSegments.forEach((seg) => {
              page.drawText(seg.text, {
                x: textX,
                y: textY,
                size: seg.size,
                font: isHeader ? fontBold : seg.font,
                color: rgb(seg.color.r, seg.color.g, seg.color.b),
              });
              textX += seg.font.widthOfTextAtSize(seg.text, seg.size);
            });
            textY -= size + 4;
          });

          page.drawLine({
            start: { x, y: rowTop },
            end: { x, y: rowTop - rowHeight },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8),
          });
          x += colWidths[c];
        }
        page.drawLine({
          start: { x: margin + tableWidth, y: rowTop },
          end: { x: margin + tableWidth, y: rowTop - rowHeight },
          thickness: 0.5,
          color: rgb(0.8, 0.8, 0.8),
        });
        page.drawLine({
          start: { x: margin, y: rowTop },
          end: { x: margin + tableWidth, y: rowTop },
          thickness: 0.5,
          color: rgb(0.8, 0.8, 0.8),
        });
        page.drawLine({
          start: { x: margin, y: rowTop - rowHeight },
          end: { x: margin + tableWidth, y: rowTop - rowHeight },
          thickness: 0.5,
          color: rgb(0.8, 0.8, 0.8),
        });

        y -= rowHeight + 2;
      };

      drawRow(header, true);
      body.forEach((row) => {
        const headerHeight = measureRowHeight(header, headerFontSize);
        const rowHeight = measureRowHeight(row, cellFontSize);
        if (y < margin + rowHeight + 2) {
          page = pdfDoc.addPage();
          ({ width, height } = page.getSize());
          y = height - margin;
          if (y < margin + headerHeight + 2) {
            // Ensure space for header on very small pages
            y = height - margin;
          }
          drawRow(header, true);
        }
        drawRow(row, false);
      });
      y -= baseFontSize / 2;
    };

    for (let idx = 0; idx < rawLines.length; idx += 1) {
      const rawLine = rawLines[idx];
      let line = rawLine ?? '';
      if (line.length > 1800) {
        line = `${line.slice(0, 1800)} … [gekürzt für PDF]`;
      }
      const trimmed = line.trim();

      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        y -= baseFontSize / 2;
        continue;
      }

      if (!trimmed) {
        y -= baseFontSize;
        continue;
      }

      const markdownImage = parseMarkdownImage(line);
      const htmlImage = markdownImage ? null : parseHtmlImage(line);
      const imageRef = markdownImage ?? htmlImage;
      if (imageRef) {
        const isDataUrl = imageRef.url.startsWith('data:image/');
        const label = imageRef.alt || 'Bild';
        const previewUrl = isDataUrl
          ? 'eingebettetes Bild (Data URL)'
          : imageRef.url.length > 100
            ? `${imageRef.url.slice(0, 97)}...`
            : imageRef.url;
        const segments = tokenizeInline(`[Bild] ${label} — ${previewUrl}`, baseFontSize).map((seg) => ({
          ...seg,
          color: { r: 0.22, g: 0.22, b: 0.22 },
        }));
        drawWrappedSegments(segments, baseFontSize, 0);
        continue;
      }

      if (inCodeBlock) {
        const segments = tokenizeInline(line, 10).map((seg) => ({
          ...seg,
          font: fontMono,
          color: defaultColor,
        }));
        drawWrappedSegments(segments, 10, 12);
        continue;
      }

      if (idx + 1 < rawLines.length && isTableSeparator(rawLines[idx + 1])) {
        const rows: string[][] = [];
        rows.push(splitTableRow(line));
        idx += 2;
        while (idx < rawLines.length && rawLines[idx].includes('|')) {
          rows.push(splitTableRow(rawLines[idx]));
          idx += 1;
        }
        idx -= 1;
        drawTable(rows);
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = stripInline(headingMatch[2]);
        const size = Math.max(12, 20 - level * 2);
        const headingSizeByLevel: Record<number, number> = {
          1: 18,
          2: 16,
          3: 14,
          4: 13,
          5: 12,
          6: 12,
        };
        const appliedSize = headingSizeByLevel[level] ?? size;
        const segments = tokenizeInline(headingText, size).map((seg) => ({
          ...seg,
          font: fontBold,
          size: appliedSize,
        }));
        drawWrappedSegments(segments, appliedSize, 0);
        y -= appliedSize / 4;
        continue;
      }

      const blockquoteMatch = line.match(/^>\s?(.*)$/);
      if (blockquoteMatch) {
        const quoteText = blockquoteMatch[1];
        const segments = tokenizeInline(`“${quoteText}”`, 10);
        const { topY, bottomY } = drawWrappedSegments(segments, 10, 16);
        page.drawLine({
          start: { x: margin + 8, y: topY - 2 },
          end: { x: margin + 8, y: bottomY + 2 },
          thickness: 1,
          color: rgb(0.7, 0.7, 0.7),
        });
        continue;
      }

      const listMatch = line.match(/^(\s*[-*+]|\s*\d+\.)\s+(.*)$/);
      if (listMatch) {
        const bullet = listMatch[1].trim().endsWith('.') ? listMatch[1].trim() : '•';
        const listText = listMatch[2];
        const segments = tokenizeInline(`${bullet} ${listText}`, baseFontSize);
        drawWrappedSegments(segments, baseFontSize, 12);
        continue;
      }

      const segments = tokenizeInline(line, baseFontSize);
      drawWrappedSegments(segments, baseFontSize, 0);
    }

    return pdfDoc.save();
  };

  const createDocxBytes = async (markdown: string) => {
    const cleanInline = (line: string) =>
      line
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1 ($2)')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        .replace(/~~([^~]+)~~/g, '$1');

    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const paragraphs: Paragraph[] = [];
    let inCodeBlock = false;

    for (const rawLine of lines) {
      const line = rawLine ?? '';
      const trimmed = line.trim();

      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }

      if (!trimmed) {
        paragraphs.push(new Paragraph({}));
        continue;
      }

      if (inCodeBlock) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: line, font: 'Courier New' })],
          })
        );
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = Math.min(headingMatch[1].length, 6);
        const text = cleanInline(headingMatch[2]);
        const headingByLevel: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
          1: HeadingLevel.HEADING_1,
          2: HeadingLevel.HEADING_2,
          3: HeadingLevel.HEADING_3,
          4: HeadingLevel.HEADING_4,
          5: HeadingLevel.HEADING_5,
          6: HeadingLevel.HEADING_6,
        };
        paragraphs.push(new Paragraph({ heading: headingByLevel[level], text }));
        continue;
      }

      const unorderedListMatch = line.match(/^\s*[-*+]\s+(.*)$/);
      const orderedListMatch = line.match(/^\s*\d+\.\s+(.*)$/);
      if (unorderedListMatch || orderedListMatch) {
        const text = cleanInline((unorderedListMatch || orderedListMatch)?.[1] ?? '');
        paragraphs.push(
          new Paragraph({
            text,
            bullet: { level: 0 },
          })
        );
        continue;
      }

      const quoteMatch = line.match(/^\s*>\s?(.*)$/);
      if (quoteMatch) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: cleanInline(quoteMatch[1]), italics: true })],
          })
        );
        continue;
      }

      paragraphs.push(new Paragraph({ text: cleanInline(line) }));
    }

    const docxTitle = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? documentName ?? '';
    const doc = new DocxDocument({
      ...(docxTitle && { title: docxTitle }),
      ...(tags.length > 0 && { keywords: tags.join(', ') }),
      creator: 'ZenPost Studio',
      sections: [{ properties: {}, children: paragraphs }],
    });
    const blob = await Packer.toBlob(doc);
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  };

  const createRtfContent = (markdown: string) => {
    const cleanInline = (line: string) =>
      line
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1 ($2)')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        .replace(/~~([^~]+)~~/g, '$1');

    const escapeRtf = (value: string) => {
      let escaped = '';
      for (const char of value) {
        const code = char.charCodeAt(0);
        if (char === '\\' || char === '{' || char === '}') {
          escaped += `\\${char}`;
        } else if (code > 127) {
          escaped += `\\u${code}?`;
        } else {
          escaped += char;
        }
      }
      return escaped;
    };

    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const rtfKeywords = tags.length > 0 ? `{\\info{\\keywords ${escapeRtf(tags.join(', '))}}}` : '';
    const parts: string[] = [
      '{\\rtf1\\ansi\\deff0',
      '{\\fonttbl{\\f0 Arial;}{\\f1 Courier New;}}',
      ...(rtfKeywords ? [rtfKeywords] : []),
      '\\viewkind4\\uc1\\pard',
    ];
    let inCodeBlock = false;

    for (const rawLine of lines) {
      const line = rawLine ?? '';
      const trimmed = line.trim();

      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        parts.push('\\par');
        continue;
      }

      if (!trimmed) {
        parts.push('\\par');
        continue;
      }

      if (inCodeBlock) {
        parts.push(`\\pard\\li360\\f1\\fs20 ${escapeRtf(line)}\\par\\pard\\f0`);
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = Math.min(headingMatch[1].length, 6);
        const sizeByLevel = [40, 34, 30, 26, 24, 22];
        const rtfSize = sizeByLevel[level - 1] ?? 22;
        parts.push(`\\pard\\b\\fs${rtfSize} ${escapeRtf(cleanInline(headingMatch[2]))}\\b0\\fs22\\par`);
        continue;
      }

      const unorderedListMatch = line.match(/^\s*[-*+]\s+(.*)$/);
      const orderedListMatch = line.match(/^\s*\d+\.\s+(.*)$/);
      if (unorderedListMatch || orderedListMatch) {
        const listText = cleanInline((unorderedListMatch || orderedListMatch)?.[1] ?? '');
        parts.push(`\\pard\\li360\\tx360\\fs22 \\bullet\\tab ${escapeRtf(listText)}\\par`);
        continue;
      }

      const quoteMatch = line.match(/^\s*>\s?(.*)$/);
      if (quoteMatch) {
        parts.push(`\\pard\\li540\\i ${escapeRtf(cleanInline(quoteMatch[1]))}\\i0\\par`);
        continue;
      }

      parts.push(`\\pard\\fs22 ${escapeRtf(cleanInline(line))}\\par`);
    }

    parts.push('}');
    return parts.join('\n');
  };

  const createOdtBytes = async (markdown: string) => {
    const escapeXml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const cleanInline = (line: string) =>
      line
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1 ($2)')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        .replace(/~~([^~]+)~~/g, '$1');

    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const bodyParts: string[] = [];
    let inCodeBlock = false;
    let inList = false;

    const closeList = () => {
      if (!inList) return;
      bodyParts.push('</text:list>');
      inList = false;
    };

    for (const rawLine of lines) {
      const line = rawLine ?? '';
      const trimmed = line.trim();

      if (trimmed.startsWith('```')) {
        closeList();
        inCodeBlock = !inCodeBlock;
        continue;
      }

      if (!trimmed) {
        closeList();
        bodyParts.push('<text:p/>');
        continue;
      }

      if (inCodeBlock) {
        closeList();
        bodyParts.push(`<text:p text:style-name="Preformatted_20_Text">${escapeXml(line)}</text:p>`);
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        closeList();
        const level = Math.min(headingMatch[1].length, 6);
        bodyParts.push(
          `<text:h text:outline-level="${level}">${escapeXml(cleanInline(headingMatch[2]))}</text:h>`
        );
        continue;
      }

      const unorderedListMatch = line.match(/^\s*[-*+]\s+(.*)$/);
      const orderedListMatch = line.match(/^\s*\d+\.\s+(.*)$/);
      if (unorderedListMatch || orderedListMatch) {
        const listText = cleanInline((unorderedListMatch || orderedListMatch)?.[1] ?? '');
        if (!inList) {
          bodyParts.push('<text:list>');
          inList = true;
        }
        bodyParts.push(`<text:list-item><text:p>${escapeXml(listText)}</text:p></text:list-item>`);
        continue;
      }

      closeList();
      const quoteMatch = line.match(/^\s*>\s?(.*)$/);
      if (quoteMatch) {
        bodyParts.push(`<text:p text:style-name="Quotations">${escapeXml(cleanInline(quoteMatch[1]))}</text:p>`);
        continue;
      }

      bodyParts.push(`<text:p>${escapeXml(cleanInline(line))}</text:p>`);
    }

    closeList();

    const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  office:version="1.2">
  <office:automatic-styles/>
  <office:body>
    <office:text>
      ${bodyParts.join('\n      ')}
    </office:text>
  </office:body>
</office:document-content>`;

    const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:media-type="application/vnd.oasis.opendocument.text" manifest:full-path="/"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="styles.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="meta.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="settings.xml"/>
</manifest:manifest>`;

    const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" office:version="1.2">
  <office:styles/>
</office:document-styles>`;

    const odtKeyword = tags.length > 0
      ? `<meta:keyword>${escapeXml(tags.join('; '))}</meta:keyword>`
      : '';
    const metaXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"
  office:version="1.2">
  <office:meta>${odtKeyword ? `\n    ${odtKeyword}\n  ` : ''}</office:meta>
</office:document-meta>`;

    const settingsXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-settings xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" office:version="1.2">
  <office:settings/>
</office:document-settings>`;

    const zip = new JSZip();
    zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });
    zip.file('content.xml', contentXml);
    zip.file('styles.xml', stylesXml);
    zip.file('meta.xml', metaXml);
    zip.file('settings.xml', settingsXml);
    zip.folder('META-INF')?.file('manifest.xml', manifestXml);

    const buffer = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      mimeType: 'application/vnd.oasis.opendocument.text',
    });
    return new Uint8Array(buffer);
  };

  const createEpubBytes = async (markdown: string, baseName: string) => {
    const escapeXml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
    const title = heading || baseName || 'ZenPost Export';
    const renderedHtml = await marked.parse(markdown, { gfm: true, breaks: true });
    const xhtmlBody = renderedHtml
      .replace(/<br>/g, '<br />')
      .replace(/<hr>/g, '<hr />')
      .replace(/<img([^>]*?)(?<!\/)>/g, '<img$1 />');

    const contentXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="de" lang="de">
  <head>
    <title>${escapeXml(title)}</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
  </head>
  <body>
    ${xhtmlBody}
  </body>
</html>`;

    const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="de" lang="de">
  <head>
    <title>Inhalt</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
  </head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>Inhalt</h1>
      <ol>
        <li><a href="content.xhtml">${escapeXml(title)}</a></li>
      </ol>
    </nav>
  </body>
</html>`;

    const packageOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:${Date.now()}-${Math.floor(Math.random() * 1000000)}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>de</dc:language>
    <dc:creator>ZenPost Studio</dc:creator>
    ${tags.map(t => `<dc:subject>${escapeXml(t)}</dc:subject>`).join('\n    ')}
  </metadata>
  <manifest>
    <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="styles.css" media-type="text/css"/>
  </manifest>
  <spine>
    <itemref idref="content"/>
  </spine>
</package>`;

    const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

    const stylesCss = `body{font-family:serif;line-height:1.6;margin:0;padding:0 1em;}h1,h2,h3,h4,h5,h6{line-height:1.25;}pre{white-space:pre-wrap;word-break:break-word;background:#f4f4f4;padding:.75em;border-radius:4px;}code{font-family:monospace;}blockquote{border-left:3px solid #ccc;padding-left:.8em;color:#555;}img{max-width:100%;height:auto;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ccc;padding:.35em;}`;

    const zip = new JSZip();
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
    zip.folder('META-INF')?.file('container.xml', containerXml);
    const oebps = zip.folder('OEBPS');
    oebps?.file('content.xhtml', contentXhtml);
    oebps?.file('nav.xhtml', navXhtml);
    oebps?.file('package.opf', packageOpf);
    oebps?.file('styles.css', stylesCss);

    const buffer = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      mimeType: 'application/epub+zip',
    });
    return new Uint8Array(buffer);
  };

  const normalizeHtmlEntities = (text: string) =>
    text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

  const handleExport = async (option: ExportOption) => {
    setExportingId(option.id);
    setExportError(null);
    try {
      const normalizedContent = await resolveOpfsImagesInContent(normalizeHtmlEntities(content));
      let fileContent = normalizedContent;
      let binaryContent: Uint8Array | null = null;
      let extension = 'md';

      switch (option.format) {
        case 'html':
          // Render markdown to proper HTML output.
          const renderedHtml = await marked.parse(normalizedContent, {
            gfm: true,
            breaks: true,
          });
          const htmlTitle = normalizedContent.match(/^#\s+(.+)$/m)?.[1]?.trim()
            ?? deriveExportBaseName(documentName, normalizedContent);
          fileContent = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${htmlTitle.replace(/"/g, '&quot;')}</title>${tags.length > 0 ? `\n  <meta name="keywords" content="${tags.join(', ').replace(/"/g, '&quot;')}">` : ''}
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 860px; margin: 0 auto; padding: 2rem; line-height: 1.65; color: #171717; }
    h1, h2, h3, h4, h5, h6 { line-height: 1.25; margin-top: 1.35em; margin-bottom: 0.55em; }
    h1 { font-size: 2rem; border-bottom: 1px solid #e6e6e6; padding-bottom: 0.25em; }
    h2 { font-size: 1.55rem; border-bottom: 1px solid #efefef; padding-bottom: 0.2em; }
    h3 { font-size: 1.25rem; }
    p, ul, ol, blockquote, table, pre { margin: 0.8em 0; }
    ul, ol { padding-left: 1.45rem; }
    blockquote { margin-left: 0; padding: 0.2rem 0.9rem; border-left: 4px solid #d0d0d0; color: #4b4b4b; background: #fafafa; }
    pre { background: #f4f4f4; padding: 1rem; border-radius: 6px; overflow-x: auto; }
    code { background: #f4f4f4; padding: 0.15rem 0.35rem; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; }
    pre code { background: transparent; padding: 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #e5e5e5; padding: 0.45rem 0.55rem; text-align: left; vertical-align: top; }
    th { background: #f9f9f9; }
    img { max-width: 100%; height: auto; border-radius: 4px; }
    hr { border: none; border-top: 1px solid #e5e5e5; margin: 1.5rem 0; }
  </style>
</head>
<body>
${renderedHtml}
</body>
</html>`;
          extension = 'html';
          break;
        case 'pdf':
          extension = 'pdf';
          break;
        case 'text': {
          try {
            fileContent = isTauri() ? await ZenEngine.markdownToPlain(normalizedContent) : markdownToPlainText(normalizedContent);
          } catch {
            fileContent = markdownToPlainText(normalizedContent);
          }
          if (tags.length > 0) {
            fileContent = `Tags: ${tags.join(', ')}\n${'─'.repeat(40)}\n\n${fileContent}`;
          }
          extension = 'txt';
          break;
        }
        case 'docx':
          binaryContent = await createDocxBytes(normalizedContent);
          extension = 'docx';
          break;
        case 'rtf':
          fileContent = createRtfContent(normalizedContent);
          extension = 'rtf';
          break;
        case 'odt':
          binaryContent = await createOdtBytes(normalizedContent);
          extension = 'odt';
          break;
        case 'epub':
          binaryContent = await createEpubBytes(normalizedContent, deriveExportBaseName(documentName, normalizedContent));
          extension = 'epub';
          break;
        case 'markdown':
        default: {
          if (tags.length > 0 && !normalizedContent.trimStart().startsWith('---')) {
            const mdTitle = normalizedContent.match(/^#\s+(.+)$/m)?.[1]?.trim()
              ?? deriveExportBaseName(documentName, normalizedContent);
            const dateStr = new Date().toISOString().slice(0, 10);
            const tagList = tags.map(t => `  - ${t}`).join('\n');
            fileContent = `---\ntitle: "${mdTitle}"\ndate: ${dateStr}\ntags:\n${tagList}\n---\n\n${normalizedContent}`;
          }
          extension = 'md';
          break;
        }
      }

      const inTauri = isTauri();
      const suggestedFilename = generateExportFilename(documentName, normalizedContent, extension);
      const filePath = inTauri
        ? await save({
            defaultPath: suggestedFilename,
            filters: [{ name: option.label, extensions: [extension] }],
          })
        : null;

      if (option.format === 'pdf') {
        const pdfBytes = await createPdfBytes(normalizedContent);
        if (filePath) {
          const ensureExt = (path: string, ext: string) =>
            path.toLowerCase().endsWith(`.${ext}`) ? path : `${path}.${ext}`;
          const normalizedPath = ensureExt(filePath, extension);
          await writeFile(normalizedPath, pdfBytes);
        } else if (typeof window !== 'undefined') {
          const pdfArray = new Uint8Array(pdfBytes);
          const blob = new Blob([pdfArray.buffer], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = suggestedFilename;
          a.click();
          URL.revokeObjectURL(url);
        }
        setExportedId(option.id);
        setTimeout(() => setExportedId(null), 2000);
        return;
      }

      if ((option.format === 'docx' || option.format === 'odt' || option.format === 'epub') && binaryContent) {
        if (filePath) {
          const ensureExt = (path: string, ext: string) =>
            path.toLowerCase().endsWith(`.${ext}`) ? path : `${path}.${ext}`;
          const normalizedPath = ensureExt(filePath, extension);
          await writeFile(normalizedPath, binaryContent);
        } else if (typeof window !== 'undefined') {
          const mimeType =
            option.format === 'epub'
              ? 'application/epub+zip'
              : option.format === 'odt'
              ? 'application/vnd.oasis.opendocument.text'
              : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          const blob = new Blob([binaryContent.buffer as ArrayBuffer], { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = suggestedFilename;
          a.click();
          URL.revokeObjectURL(url);
        }
        setExportedId(option.id);
        setTimeout(() => setExportedId(null), 2000);
        return;
      }

      if (filePath) {
        const ensureExt = (path: string, ext: string) =>
          path.toLowerCase().endsWith(`.${ext}`) ? path : `${path}.${ext}`;
        const normalizedPath = ensureExt(filePath, extension);

        await writeTextFile(normalizedPath, fileContent);

        setExportedId(option.id);
        setTimeout(() => setExportedId(null), 2000);
      } else if (!inTauri && typeof window !== 'undefined') {
        const mimeType =
          option.format === 'html'
            ? 'text/html;charset=utf-8'
            : option.format === 'rtf'
              ? 'application/rtf;charset=utf-8'
            : option.format === 'markdown'
              ? 'text/markdown;charset=utf-8'
              : 'text/plain;charset=utf-8';
        const blob = new Blob([fileContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedFilename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
      const message = error instanceof Error ? error.message : 'Unbekannter Export-Fehler';
      setExportError(`Export fehlgeschlagen: ${message}`);
    } finally {
      setExportingId(null);
    }
  };

  const handlePublish = async (option: PublishOption) => {
    // Local blog: write to configured folder
    if (option.id.startsWith('blog:')) {
      const blogId = option.id.slice(5);
      const blog = blogs.find((b) => b.id === blogId);
      if (!blog) return;
      setPublishingId(option.id);
      setPublishError(null);
      try {
        const date = new Date().toISOString().split('T')[0];
        const firstHeading = content.match(/^#+\s+(.+)/m)?.[1] ?? (documentName || 'Blog Post');
        const titleText = firstHeading.trim().slice(0, 80);
        const slug = `${date}-${titleText.toLowerCase()
          .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c] ?? c))
          .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
        const tag = tags[0] ?? 'devlog';
        const wordCount = content.trim().split(/\s+/).length;
        const readingTime = Math.max(1, Math.round(wordCount / 220));
        const allTags = tags.length > 0 ? tags.join(', ') : tag;

        // Lokalen Bildpfad in relativen _assets/-Pfad umwandeln
        const isLocalPath = (url: string) => /^(file:\/\/|\/|[a-zA-Z]:[\\/])/i.test(url);
        let coverImageValue = imageUrl ?? '';
        let localCoverImagePath: string | null = null;
        if (coverImageValue && isTauri() && isLocalPath(coverImageValue)) {
          localCoverImagePath = coverImageValue.replace(/^file:\/\//i, '');
          const fileName = localCoverImagePath.split(/[\\/]/).pop() || `${slug}-cover.jpg`;
          coverImageValue = `_assets/${fileName}`;
        } else if (coverImageValue && isTauri() && coverImageValue.startsWith('_assets/')) {
          // Relativer _assets/-Pfad → absoluten Pfad auflösen
          localCoverImagePath = await join(blog.path, coverImageValue);
        }

        const frontmatterLines = [
          '---',
          `title: "${titleText.replace(/"/g, '\\"')}"`,
          subtitle ? `subtitle: "${subtitle.replace(/"/g, '\\"')}"` : null,
          `date: "${date}"`,
          `tags: [${allTags}]`,
          `readingTime: ${readingTime}`,
          coverImageValue ? `coverImage: "${coverImageValue}"` : null,
          '---',
          '',
          '',
        ].filter((l): l is string => l !== null).join('\n');
        const frontmatter = frontmatterLines;
        const postsDir = await join(blog.path, 'posts');
        if (!(await exists(postsDir))) await mkdir(postsDir, { recursive: true });
        await writeTextFile(await join(postsDir, `${slug}.md`), frontmatter + content);
        const manifestPath = await join(blog.path, 'manifest.json');
        let manifest: { site: Record<string, string>; posts: Array<Record<string, unknown>> } = {
          site: { title: blog.name, tagline: blog.tagline ?? '', author: blog.author ?? '', url: blog.siteUrl ?? '' },
          posts: [],
        };
        try { manifest = JSON.parse(await readTextFile(manifestPath)); } catch { /* new manifest */ }
        // Always keep site in sync with blog config
        manifest.site = {
          ...manifest.site,
          title: blog.name,
          ...(blog.tagline ? { tagline: blog.tagline } : {}),
          ...(blog.author ? { author: blog.author } : {}),
          ...(blog.siteUrl ? { url: blog.siteUrl } : {}),
        };
        const newEntry: Record<string, unknown> = { slug, title: titleText, date, tags: tags.length > 0 ? tags : [tag], readingTime };
        if (subtitle) newEntry.subtitle = subtitle;
        if (coverImageValue) newEntry.coverImage = coverImageValue;
        const existingIdx = manifest.posts.findIndex((p) => p.slug === slug);
        if (existingIdx >= 0) manifest.posts[existingIdx] = newEntry;
        else manifest.posts.unshift(newEntry);

        const deployType = blog.deployType ?? (blog.gitAutoPush ? 'git' : 'none');
        const phpCfg = deployType === 'php-api' && blog.phpApiUrl && blog.phpApiKey
          ? { apiUrl: blog.phpApiUrl, apiKey: blog.phpApiKey }
          : null;

        // Hilfsfunktion: Bytes → base64 (chunk-safe, kein Stack Overflow bei großen Dateien)
        const bytesToBase64 = (bytes: Uint8Array): string => {
          let binary = '';
          const CHUNK = 8192;
          for (let i = 0; i < bytes.length; i += CHUNK) {
            binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
          }
          return btoa(binary);
        };
        const extToMime = (ext: string) =>
          ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/png';

        // PHP-API: Bild hochladen, coverImage mit Server-URL aktualisieren
        if (phpCfg && localCoverImagePath) {
          try {
            const imageFileName = coverImageValue.replace(/^_assets\//, '') || `cover-${slug}.jpg`;
            const bytes = await readFile(localCoverImagePath);
            const ext = localCoverImagePath.split('.').pop()?.toLowerCase() ?? 'jpg';
            const dataUrl = `data:${extToMime(ext)};base64,${bytesToBase64(bytes)}`;
            const uploadedUrl = await phpBlogImageUpload(dataUrl, imageFileName, phpCfg);
            if (uploadedUrl) {
              coverImageValue = uploadedUrl;
              newEntry.coverImage = uploadedUrl;
              const idx2 = manifest.posts.findIndex((p) => p.slug === slug);
              if (idx2 >= 0) manifest.posts[idx2] = newEntry;
            }
          } catch { /* Bild-Upload non-fatal */ }
        }

        await writeTextFile(manifestPath, JSON.stringify(manifest, null, 2));

        if (deployType === 'git') {
          const gitErr = await gitCommitAndPush(blog.path, `post: ${titleText}`);
          if (gitErr) {
            setPublishError({ id: option.id, message: `Lokal gespeichert, aber Git Push fehlgeschlagen: ${gitErr}` });
            setTimeout(() => setPublishError(null), 6000);
          }
        } else if (deployType === 'ftp' && blog.ftpHost && blog.ftpUser && blog.ftpPassword && blog.ftpRemotePath) {
          const ftpBase = { host: blog.ftpHost, user: blog.ftpUser, password: blog.ftpPassword, protocol: blog.ftpProtocol };
          const blogRoot = blog.ftpRemotePath.replace(/\/posts\/?$/, '');
          // Lokales Bild per FTP hochladen
          if (localCoverImagePath) {
            const imageFileName = coverImageValue.replace(/^_assets\//, '') || `cover-${slug}.jpg`;
            await ftpUpload(localCoverImagePath, imageFileName, { ...ftpBase, remotePath: `${blogRoot}/_assets/` }).catch(() => {});
          }
          // Convert markdown to HTML and upload
          const htmlBody = await marked(content);
          const fullHtml = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>${titleText}</title></head><body>${htmlBody}</body></html>`;
          const htmlFilePath = await join(blog.path, 'posts', `${slug}.html`);
          await writeTextFile(htmlFilePath, fullHtml);
          const ftpErr = await ftpUpload(htmlFilePath, `${slug}.html`, {
            ...ftpBase,
            remotePath: blog.ftpRemotePath,
          });
          // Also upload manifest.json
          if (!ftpErr) {
            const manifestRemotePath = blog.ftpRemotePath.replace(/\/posts\/?$/, '/');
            await ftpUpload(manifestPath, 'manifest.json', {
              ...ftpBase,
              remotePath: manifestRemotePath,
            });
          }
          if (ftpErr) {
            setPublishError({ id: option.id, message: `Lokal gespeichert, aber FTP Upload fehlgeschlagen: ${ftpErr}` });
            setTimeout(() => setPublishError(null), 6000);
          }
        } else if (phpCfg) {
          // PHP-API: Post + Manifest auf den Server laden
          // Zuerst: lokale Bildpfade im Editor-Content hochladen und URLs ersetzen
          let uploadedContent = content;
          if (isTauri()) {
            const imgPattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
            const localImgs: Array<{ fullMatch: string; alt: string; url: string }> = [];
            let m: RegExpExecArray | null;
            while ((m = imgPattern.exec(content)) !== null) {
              const url = m[2].trim();
              if (isLocalPath(url) || url.startsWith('asset://')) {
                localImgs.push({ fullMatch: m[0], alt: m[1], url });
              }
            }
            for (const { fullMatch, alt, url } of localImgs) {
              try {
                const localPath = url.startsWith('asset://')
                  ? decodeURIComponent(url.replace(/^asset:\/\/localhost\//, '/'))
                  : url.replace(/^file:\/\//i, '');
                const imgBytes = await readFile(localPath);
                const imgExt = localPath.split('.').pop()?.toLowerCase() ?? 'jpg';
                const imgFileName = localPath.split(/[\\/]/).pop() || `img-${Date.now()}.${imgExt}`;
                const dataUrl = `data:${extToMime(imgExt)};base64,${bytesToBase64(imgBytes)}`;
                const uploadedUrl = await phpBlogImageUpload(dataUrl, imgFileName, phpCfg);
                if (uploadedUrl) {
                  uploadedContent = uploadedContent.replace(fullMatch, `![${alt}](${uploadedUrl})`);
                }
              } catch { /* non-fatal: Bild wird übersprungen */ }
            }
          }
          // Frontmatter mit ggf. aktualisierter coverImageValue (volle Server-URL nach Bild-Upload)
          const serverFrontmatter = [
            '---',
            `title: "${titleText.replace(/"/g, '\\"')}"`,
            subtitle ? `subtitle: "${subtitle.replace(/"/g, '\\"')}"` : null,
            `date: "${date}"`,
            `tags: [${allTags}]`,
            `readingTime: ${readingTime}`,
            coverImageValue ? `coverImage: "${coverImageValue}"` : null,
            '---',
            '',
            '',
          ].filter((l): l is string => l !== null).join('\n');
          const phpErr = await phpBlogUpload(
            { filename: `${slug}.md`, content: serverFrontmatter + uploadedContent, manifest },
            phpCfg,
          );
          if (phpErr) {
            setPublishError({ id: option.id, message: `Lokal gespeichert, aber Server Upload fehlgeschlagen: ${phpErr}` });
            setTimeout(() => setPublishError(null), 6000);
          }
        }

        setPublishedId(option.id);
        onBlogPublished?.({ blogId: blog.id, blogPath: blog.path, blogName: blog.name });
        setTimeout(() => setPublishedId(null), 3000);
      } catch (err) {
        setPublishError({ id: option.id, message: err instanceof Error ? err.message : 'Fehler beim Blog-Publish' });
        setTimeout(() => setPublishError(null), 4000);
      } finally {
        setPublishingId(null);
      }
      return;
    }

    const socialPlatformId = SOCIAL_PLATFORM_IDS[option.id];

    if (socialPlatformId && isPlatformConfigured(socialPlatformId, socialConfig)) {
      setPublishingId(option.id);
      setPublishError(null);
      try {
        const title = documentName || 'Untitled';
        let result: { success: boolean; url?: string; error?: string };

        const meta = { title, subtitle: subtitle ?? undefined, imageUrl: imageUrl ?? undefined, tags };

        if (option.id === 'devto') {
          const prepared = preparePostContent('devto', content, meta);
          result = await postToDevTo(
            {
              title: prepared.title ?? title,
              body_markdown: prepared.text,
              published: false,
              tags: prepared.tags ?? [],
              ...(prepared.coverImageUrl ? { cover_image: prepared.coverImageUrl } : {}),
            },
            socialConfig.devto!,
          );
        } else if (option.id === 'medium') {
          const prepared = preparePostContent('medium', content, meta);
          result = await postToMedium(
            {
              title: prepared.title ?? title,
              content: prepared.text,
              contentFormat: 'markdown',
              publishStatus: 'draft',
              tags: prepared.tags ?? [],
            },
            socialConfig.medium!,
          );
        } else if (option.id === 'linkedin') {
          const prepared = preparePostContent('linkedin', content, {
            ...meta,
            imageUrl: linkedInImage ? URL.createObjectURL(linkedInImage) : imageUrl ?? undefined,
          });
          result = await postToLinkedIn(
            {
              text: prepared.text,
              coverImageFile: linkedInImage ?? undefined,
              coverImageUrl: !linkedInImage ? prepared.coverImageSourceUrl : undefined,
            },
            socialConfig.linkedin!,
          );
        } else if (option.id === 'github-gist') {
          const prepared = preparePostContent('github', content, meta);
          const gistTitle = prepared.title ?? title;
          const description = prepared.tags?.length
            ? `${gistTitle} [${prepared.tags.join(', ')}]`
            : gistTitle;
          const filename = `${gistTitle.replace(/[^a-z0-9]/gi, '_')}.md`;
          const resp = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${socialConfig.github!.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ description, public: false, files: { [filename]: { content: prepared.text } } }),
          });
          if (!resp.ok) throw new Error('Gist konnte nicht erstellt werden');
          const gistData = await resp.json();
          result = { success: true, url: gistData.html_url };
        } else {
          result = { success: false, error: 'Nicht implementiert' };
        }

        if (result.success) {
          setPublishedId(option.id);
          // Remove copy-fallback state on successful post
          setCopyFallbackIds(prev => { const s = new Set(prev); s.delete(option.id); return s; });
          if (result.url) {
            try { await openExternal(result.url); } catch { window.open(result.url, '_blank', 'noopener,noreferrer'); }
          }
          setTimeout(() => setPublishedId(null), 3000);
        } else {
          // Activate persistent "Copy & Open" fallback for API errors
          setCopyFallbackIds(prev => new Set(prev).add(option.id));
          setPublishError({ id: option.id, message: result.error ?? 'Unbekannter Fehler' });
          setTimeout(() => setPublishError(null), 5000);
        }
      } catch (err) {
        setCopyFallbackIds(prev => new Set(prev).add(option.id));
        setPublishError({ id: option.id, message: err instanceof Error ? err.message : 'Fehler beim Posten' });
        setTimeout(() => setPublishError(null), 5000);
      } finally {
        setPublishingId(null);
      }
      return;
    }

    // Fallback: copy + open
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    try {
      await openExternal(option.url);
    } catch (err) {
      window.open(option.url, '_blank', 'noopener,noreferrer');
    }
  };

  // Post all selected platforms sequentially
  const handlePostSelected = async () => {
    const allOptions = [
      ...PUBLISH_OPTIONS,
      ...blogs.map((b): PublishOption => ({ id: `blog:${b.id}`, label: b.name, icon: faGlobe, url: '', color: '#AC8E66' })),
    ];
    for (const option of allOptions) {
      if (!selectedPlatformIds.has(option.id)) continue;
      await handlePublish(option);
    }
    setSelectedPlatformIds(new Set());
  };

  // Handle tone selection and start optimization
  const handleToneSelected = async (tone: ContentTone) => {
    if (!pendingPlatform) return;

    setShowToneSelector(false);
    const option = pendingPlatform;
    setPendingPlatform(null);
    setOptimizingPlatform(option.id);

    try {
      // Get platform mapping
      const platform = PLATFORM_MAP[option.id] || 'blog-post';

      // Transform content with AI using selected tone
      const result = await transformContent(content, {
        platform,
        tone,
        length: 'medium',
        audience: 'intermediate',
      });

      if (result.success && result.data) {
        // Copy optimized content to clipboard
        await navigator.clipboard.writeText(result.data);
        setOptimizedPlatform(option.id);
        setTimeout(() => setOptimizedPlatform(null), 2000);

        // Open the platform's posting page
        try {
          await openExternal(option.url);
        } catch (err) {
          window.open(option.url, '_blank', 'noopener,noreferrer');
        }
      } else {
        console.error('AI optimization failed:', result.error);
        // Fallback: copy original content and open platform
        await navigator.clipboard.writeText(content);
        try {
          await openExternal(option.url);
        } catch (err) {
          window.open(option.url, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (err) {
      console.error('Optimization failed:', err);
    } finally {
      setOptimizingPlatform(null);
    }
  };

  // Cancel tone selection
  const handleCancelToneSelector = () => {
    setShowToneSelector(false);
    setPendingPlatform(null);
  };

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Export & Veröffentlichen"
      subtitle="Exportiere deinen Content oder teile ihn direkt auf Plattformen"
      size="large"
      showCloseButton={true}
    >
      <div style={{ padding: '24px', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
        {exportError && (
          <div
            style={{
              marginBottom: '12px',
              padding: '10px 12px',
              border: '0.5px solid #8e4f4f',
              borderRadius: '10px',
              backgroundColor: '#8e4f4f22',
              color: '#7a1f1f',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
            }}
          >
            {exportError}
          </div>
        )}
        {/* Schnell-Export - Accordion */}
        <div style={{ marginBottom: '14px', border: '0.5px solid #3A3A3A', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setActiveAccordion('quick')}
            style={{
              width: '100%',
              padding: '12px 14px',
              backgroundColor: 'transparent',
            borderRadius: '12px 12px 0 0',
              borderBottom: activeAccordion === 'quick' ? '0.5px solid #3A3A3A' : 'none',
              cursor: 'pointer',
              boxShadow: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#555',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
            }}
          >
            <span>Schnell-Export</span>
            <span style={{ color: '#777' }}>{activeAccordion === 'quick' ? '−' : '+'}</span>
          </button>

          {activeAccordion === 'quick' && (
            <div style={{ padding: '12px 14px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
              }}>
                {EXPORT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleExport(option)}
                    disabled={exportingId !== null}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      padding: '24px 16px',
                      backgroundColor: 'transparent',
                      border: '0.5px solid #3A3A3A',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#555';
                      e.currentTarget.style.backgroundColor = '#55555520';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#3A3A3A';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <FontAwesomeIcon
                      icon={exportingId === option.id ? faSpinner : (exportedId === option.id ? faCheck : option.icon)}
                      style={{
                        fontSize: '32px',
                        color: exportedId === option.id ? '#4CAF50' : '#555',
                      }}
                      spin={exportingId === option.id}
                    />
                    <span style={{
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '11px',
                      color: '#555',
                      fontWeight: 'normal'
                    }}>
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Datei-Export (Weitere Formate) - Accordion */}
        <div style={{ marginBottom: '14px', border: '0.5px solid #3A3A3A',borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setActiveAccordion('additional')}
            style={{
              width: '100%',
              padding: '12px 14px',
              backgroundColor: 'transparent',
              borderRadius: '12px 12px 0 0',
              borderBottom: activeAccordion === 'additional' ? '0.5px solid #3A3A3A' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#555',
              boxShadow: 'none',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
            }}
          >
            <span>Datei-Export (Weitere Formate)</span>
            <span style={{ color: '#777' }}>{activeAccordion === 'additional' ? '−' : '+'}</span>
          </button>

          {activeAccordion === 'additional' && (
            <div style={{ padding: '12px 14px' }}>
              <p style={{
                margin: '0 0 10px 0',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
                color: '#777',
              }}>
                Zusätzliche Formate für Office/Publishing.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px',
              }}>
                {ADDITIONAL_FILE_FORMATS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => item.option && handleExport(item.option)}
                    disabled={!item.enabled || exportingId !== null}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '14px 10px',
                      backgroundColor: 'transparent',
                      border: '0.5px dashed #3A3A3A',
                      borderRadius: '10px',
                      color: '#777',
                      fontFamily: 'IBM Plex Mono, monospace',
                      opacity: item.enabled ? 1 : 0.75,
                      cursor: item.enabled ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!item.enabled) return;
                      e.currentTarget.style.borderColor = '#555';
                      e.currentTarget.style.backgroundColor = '#55555520';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      if (!item.enabled) return;
                      e.currentTarget.style.borderColor = '#3A3A3A';
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span style={{ fontSize: '12px', color: '#555', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {item.option && <FontAwesomeIcon icon={item.option.icon} />}
                      {item.label}
                    </span>
                    <span style={{ fontSize: '9px', color: item.enabled ? '#AC8E66' : '#777' }}>{item.note}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Direkt veröffentlichen - Accordion */}
        <div style={{ border: '0.5px solid #3A3A3A', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setActiveAccordion('publish')}
            style={{
              width: '100%',
              padding: '12px 14px',
              backgroundColor: 'transparent',
              borderRadius: '12px 12px 0 0',
              borderBottom: activeAccordion === 'publish' ? '0.5px solid #3A3A3A' : 'none',
              cursor: 'pointer',
              display: 'flex',
              boxShadow: 'none',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#555',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
            }}
          >
            <span>Direkt veröffentlichen</span>
            <span style={{ color: '#777' }}>{activeAccordion === 'publish' ? '−' : '+'}</span>
          </button>

          {activeAccordion === 'publish' && (
            <div style={{ padding: '12px 14px' }}>
        
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '12px',
            color: '#777',
            marginBottom: '16px',
          }}>
            Plattformen mit API-Key (goldener Punkt) werden direkt gepostet. Andere: Content kopieren & Seite öffnen.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }}>
            {[
              ...PUBLISH_OPTIONS,
              ...blogs.map((b): PublishOption => ({ id: `blog:${b.id}`, label: b.name, icon: faGlobe, url: '', color: '#AC8E66' })),
            ].map((option) => {
              const socialPid = SOCIAL_PLATFORM_IDS[option.id];
              const isConfigured = option.id.startsWith('blog:')
                ? true
                : !!(socialPid && isPlatformConfigured(socialPid, socialConfig));
              const isPublishing = publishingId === option.id;
              const isPublished = publishedId === option.id;
              const hasError = publishError?.id === option.id;
              const hasCopyFallback = copyFallbackIds.has(option.id);
              const isSelected = selectedPlatformIds.has(option.id);
              const borderColor = isPublished ? '#4caf50' : isSelected ? '#AC8E66' : hasCopyFallback ? 'rgba(172,142,102,0.6)' : hasError ? '#e05c5c' : isConfigured ? 'rgba(172,142,102,0.3)' : '#3A3A3A';
              const iconColor = isPublished ? '#4caf50' : isSelected ? '#AC8E66' : hasCopyFallback ? '#AC8E66' : (isConfigured || isPublishing) ? '#AC8E66' : '#555';

              // Copy-fallback handler: copy content + open platform URL
              const handleCopyAndOpen = async (e: React.MouseEvent) => {
                e.stopPropagation();
                try { await navigator.clipboard.writeText(content.substring(0, 3000)); } catch {}
                const url = option.url || 'https://www.linkedin.com/feed/';
                try { await openExternal(url); } catch { window.open(url, '_blank', 'noopener,noreferrer'); }
              };

              // ── LinkedIn: special card with image preview ──────────────────
              if (option.id === 'linkedin' && isConfigured && !hasCopyFallback) {
                return (
                  <div
                    key={option.id}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      border: `0.5px solid ${borderColor}`,
                      borderRadius: '12px',
                      overflow: 'hidden',
                      backgroundColor: isPublished ? 'rgba(76,175,80,0.07)' : 'transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* Cover image area */}
                    <div
                      onClick={() => !isPublishing && !isPublished && linkedInFileInputRef.current?.click()}
                      style={{
                        width: '100%',
                        height: 68,
                        backgroundColor: '#141414',
                        cursor: isPublishing || isPublished ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        position: 'relative',
                        borderBottom: `0.5px solid ${borderColor}`,
                      }}
                    >
                      {linkedInImagePreview || imageUrl ? (
                        <>
                          <img
                            src={linkedInImagePreview ?? imageUrl ?? undefined}
                            alt="Cover"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          {!isPublishing && !isPublished && linkedInImagePreview && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setLinkedInImage(null);
                                setLinkedInImagePreview(null);
                              }}
                              style={{
                                position: 'absolute', top: 4, right: 4,
                                width: 18, height: 18, borderRadius: '50%',
                                backgroundColor: 'rgba(0,0,0,0.65)',
                                border: '0.5px solid rgba(255,255,255,0.2)',
                                color: '#fff', fontSize: '9px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', padding: 0,
                              }}
                            >×</button>
                          )}
                          {imageUrl && !linkedInImagePreview && (
                            <div style={{
                              position: 'absolute', bottom: 0, left: 0, right: 0,
                              backgroundColor: 'rgba(0,0,0,0.55)',
                              fontFamily: 'IBM Plex Mono, monospace',
                              fontSize: '7px', color: '#AC8E66',
                              padding: '2px 5px', textAlign: 'center',
                            }}>
                              aus PostMetadaten
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <FontAwesomeIcon icon={faImage} style={{ fontSize: '16px', color: '#333' }} />
                          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', color: '#444' }}>
                            + Titelbild
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Post button */}
                    <button
                      onClick={() => !isPublishing && handlePublish(option)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '14px 12px',
                        background: 'transparent',
                        border: 'none',
                        cursor: isPublishing ? 'default' : 'pointer',
                        opacity: isPublishing ? 0.75 : 1,
                        width: '100%',
                      }}
                      onMouseEnter={(e) => {
                        if (isPublishing) return;
                        (e.currentTarget.parentElement as HTMLDivElement).style.borderColor = isPublished ? '#4caf50' : '#AC8E66';
                        (e.currentTarget.parentElement as HTMLDivElement).style.backgroundColor = isPublished ? 'rgba(76,175,80,0.12)' : 'rgba(172,142,102,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget.parentElement as HTMLDivElement).style.borderColor = borderColor;
                        (e.currentTarget.parentElement as HTMLDivElement).style.backgroundColor = isPublished ? 'rgba(76,175,80,0.07)' : 'transparent';
                      }}
                    >
                      <FontAwesomeIcon
                        icon={isPublishing ? faSpinner : isPublished ? faCheck : option.icon}
                        spin={isPublishing}
                        style={{ fontSize: '22px', color: iconColor }}
                      />
                      <span style={{
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '11px',
                        color: isPublished ? '#4caf50' : iconColor,
                        fontWeight: 500,
                      }}>
                        {isPublishing ? 'Wird gepostet …' : isPublished ? 'Gepostet!' : option.label}
                      </span>
                      {isPublishing && linkedInImage && (
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', color: '#AC8E66' }}>
                          Bild wird hochgeladen …
                        </span>
                      )}
                    </button>

                    {/* Configured dot */}
                    {!isPublishing && !isPublished && (
                      <span style={{
                        position: 'absolute', top: 8, right: 8,
                        width: 6, height: 6, borderRadius: '50%',
                        backgroundColor: '#AC8E66',
                      }} />
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={option.id}
                  onClick={() => {
                    if (isPublishing || isPublished) return;
                    if (hasCopyFallback) { void handlePublish(option); return; }
                    if (!isConfigured) { void handlePublish(option); return; }
                    // Toggle selection for configured platforms
                    setSelectedPlatformIds(prev => {
                      const next = new Set(prev);
                      next.has(option.id) ? next.delete(option.id) : next.add(option.id);
                      return next;
                    });
                  }}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '20px 12px',
                    backgroundColor: isPublished ? 'rgba(76,175,80,0.07)' : isSelected ? 'rgba(172,142,102,0.1)' : hasCopyFallback ? 'rgba(172,142,102,0.06)' : hasError ? 'rgba(224,92,92,0.07)' : 'transparent',
                    border: `0.5px solid ${borderColor}`,
                    borderRadius: '12px',
                    cursor: isPublishing ? 'default' : hasCopyFallback ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: isPublishing ? 0.75 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (isPublishing || hasCopyFallback) return;
                    e.currentTarget.style.borderColor = isPublished ? '#4caf50' : isConfigured ? '#AC8E66' : '#555555';
                    e.currentTarget.style.backgroundColor = isPublished ? 'rgba(76,175,80,0.12)' : isConfigured ? 'rgba(172,142,102,0.1)' : '#55555520';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = borderColor;
                    e.currentTarget.style.backgroundColor = isPublished ? 'rgba(76,175,80,0.07)' : hasCopyFallback ? 'rgba(172,142,102,0.06)' : hasError ? 'rgba(224,92,92,0.07)' : 'transparent';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Selection checkmark */}
                  {isSelected && (
                    <span style={{
                      position: 'absolute', top: 6, left: 6,
                      width: 16, height: 16, borderRadius: '50%',
                      backgroundColor: '#AC8E66',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <FontAwesomeIcon icon={faCheck} style={{ fontSize: '8px', color: '#1a1a1a' }} />
                    </span>
                  )}
                  {/* Configured indicator dot */}
                  {isConfigured && !isPublishing && !isPublished && !hasCopyFallback && !isSelected && (
                    <span style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 6, height: 6, borderRadius: '50%',
                      backgroundColor: '#AC8E66',
                    }} />
                  )}
                  {/* Reset button for copy-fallback mode */}
                  {hasCopyFallback && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCopyFallbackIds(prev => { const s = new Set(prev); s.delete(option.id); return s; });
                      }}
                      title="Zurücksetzen — API erneut versuchen"
                      style={{
                        position: 'absolute', top: 6, right: 6,
                        width: 16, height: 16, borderRadius: '50%',
                        backgroundColor: 'rgba(172,142,102,0.2)',
                        border: '0.5px solid rgba(172,142,102,0.4)',
                        color: '#AC8E66', fontSize: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', padding: 0,
                      }}
                    >×</button>
                  )}

                  <FontAwesomeIcon
                    icon={isPublishing ? faSpinner : isPublished ? faCheck : hasCopyFallback ? option.icon : option.icon}
                    spin={isPublishing}
                    style={{ fontSize: '28px', color: iconColor, opacity: hasCopyFallback ? 0.5 : 1 }}
                  />
                  <span style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '11px',
                    color: isPublished ? '#4caf50' : hasCopyFallback ? '#AC8E66' : hasError ? '#e05c5c' : iconColor,
                    fontWeight: isConfigured ? 500 : 'normal',
                  }}>
                    {isPublishing ? 'Wird gepostet …' : isPublished ? 'Gepostet!' : hasError ? 'Fehler' : option.label}
                  </span>
                  {hasError && !hasCopyFallback && (
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', color: '#e05c5c', textAlign: 'center', lineHeight: 1.4 }}>
                      {publishError!.message.substring(0, 45)}
                    </span>
                  )}
                  {/* Copy & Open fallback button */}
                  {hasCopyFallback && (
                    <button
                      onClick={handleCopyAndOpen}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '5px 10px',
                        backgroundColor: 'rgba(172,142,102,0.15)',
                        border: '0.5px solid rgba(172,142,102,0.5)',
                        borderRadius: '6px',
                        color: '#AC8E66',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '9px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(172,142,102,0.25)'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(172,142,102,0.15)'; }}
                    >
                      <FontAwesomeIcon icon={faCopy} style={{ fontSize: '9px' }} />
                      Kopieren &amp; Öffnen
                      <FontAwesomeIcon icon={faExternalLinkAlt} style={{ fontSize: '8px' }} />
                    </button>
                  )}
                </button>
              );
            })}
          </div>
            </div>
          )}
        </div>

        {/* Als Paket exportieren - Accordion */}
        {blogs.length > 0 && isTauri() && (
          <div style={{ border: '0.5px solid #3A3A3A', borderRadius: '12px', overflow: 'hidden', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveAccordion('package')}
              style={{
                width: '100%', padding: '12px 14px', backgroundColor: 'transparent', border: 'none',
                borderBottom: activeAccordion === 'package' ? '0.5px solid #3A3A3A' : 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                color: '#555', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px',
              }}
            >
              <span>Als Paket exportieren</span>
              <span style={{ color: '#777' }}>{activeAccordion === 'package' ? '−' : '+'}</span>
            </button>
            {activeAccordion === 'package' && (
              <div style={{ padding: '12px 14px' }}>
                <p style={{ margin: '0 0 10px 0', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#666', lineHeight: 1.6 }}>
                  Exportiert den gesamten Blog oder die Docs-Site als ZIP-Archiv — für Backup, Migration oder manuelle Weiterverarbeitung.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {blogs.map((blog) => {
                    const isExporting = zipExportingId === blog.id;
                    const isDone = zipExportDone === blog.id;
                    const isDocsSite = blog.siteType === 'docs';
                    return (
                      <div key={blog.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', border: '0.5px solid #333', borderRadius: '8px' }}>
                        <div>
                          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#ccc' }}>{blog.name}</div>
                          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#666', marginTop: '2px' }}>
                            {isDocsSite ? 'Docs-Paket — alle Dateien aus dem Ordner' : 'Blog-Archiv — posts/*.md + manifest.json'}
                          </div>
                        </div>
                        <button
                          onClick={() => handleExportBlogZip(blog)}
                          disabled={isExporting}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                            border: `0.5px solid ${isDone ? '#4caf50' : 'rgba(172,142,102,0.5)'}`,
                            borderRadius: '6px', background: isDone ? 'rgba(76,175,80,0.1)' : 'transparent',
                            cursor: isExporting ? 'default' : 'pointer', opacity: isExporting ? 0.6 : 1,
                            fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px',
                            color: isDone ? '#4caf50' : '#AC8E66', whiteSpace: 'nowrap',
                          }}
                        >
                          <FontAwesomeIcon icon={isDone ? faCheck : isExporting ? faSpinner : faBoxArchive} spin={isExporting} style={{ fontSize: '12px' }} />
                          {isDone ? 'Gespeichert!' : isExporting ? 'Erstelle ZIP…' : '.zip herunterladen'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Post selected platforms bar */}
        {selectedPlatformIds.size > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            margin: '8px 0 0',
            backgroundColor: 'rgba(172,142,102,0.08)',
            border: '0.5px solid rgba(172,142,102,0.4)',
            borderRadius: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#AC8E66' }}>
                {selectedPlatformIds.size} Plattform{selectedPlatformIds.size > 1 ? 'en' : ''} ausgewählt
              </span>
              <button
                onClick={() => setSelectedPlatformIds(new Set())}
                style={{
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px',
                  color: '#555', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                Alle abwählen
              </button>
            </div>
            <button
              onClick={handlePostSelected}
              disabled={publishingId !== null}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px',
                backgroundColor: publishingId ? 'rgba(172,142,102,0.1)' : '#AC8E66',
                border: 'none',
                borderRadius: '8px',
                color: publishingId ? '#AC8E66' : '#1a1a1a',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '10px',
                fontWeight: 600,
                cursor: publishingId ? 'default' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {publishingId ? (
                <><FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '9px' }} /> Wird gepostet …</>
              ) : (
                <><FontAwesomeIcon icon={faCheck} style={{ fontSize: '9px' }} /> Ausgewählte posten</>
              )}
            </button>
          </div>
        )}

        {/* Hidden file input for LinkedIn cover image */}
        <input
          ref={linkedInFileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setLinkedInImage(file);
            const url = URL.createObjectURL(file);
            setLinkedInImagePreview(url);
            e.target.value = '';
          }}
        />

        {/* Tone Selector Overlay */}
        {showToneSelector && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(26, 26, 26, 0.95)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              borderRadius: '12px',
            }}
          >
            <h3 style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '20px',
              color: '#AC8E66',
              marginBottom: '8px',
              textDecoration: 'underline',
              textUnderlineOffset: '4px',
            }}>
              Schreibstil wählen
            </h3>
            <p style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
              color: '#777',
              marginBottom: '24px',
            }}>
              {pendingPlatform?.label} • Wie soll der Content optimiert werden?
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              maxWidth: '400px',
              width: '100%',
              padding: '0 24px',
            }}>
              {TONE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleToneSelected(option.value)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '16px 12px',
                    backgroundColor: '#1A1A1A',
                    border: '2px solid #AC8E66',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#AC8E6630';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#1A1A1A';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#555',
                  }}>
                    {option.label}
                  </span>
                  <span style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '10px',
                    color: '#777',
                    textAlign: 'center',
                  }}>
                    {option.description}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={handleCancelToneSelector}
              style={{
                marginTop: '24px',
                padding: '10px 24px',
                backgroundColor: 'transparent',
                border: '1px solid #555',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '12px',
                color: '#777',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#AC8E66';
                e.currentTarget.style.color = '#555';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#555';
                e.currentTarget.style.color = '#777';
              }}
            >
              Abbrechen
            </button>
          </div>
        )}
      </div>
    </ZenModal>
  );
}
