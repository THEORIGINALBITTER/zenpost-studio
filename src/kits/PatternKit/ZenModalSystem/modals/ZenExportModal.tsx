import { useState } from 'react';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { save } from '@tauri-apps/plugin-dialog';
import { isTauri } from '@tauri-apps/api/core';
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

interface ZenExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  platform?: string;
  documentName?: string; // Name of the document being exported (e.g., "README", "API Docs")
  onNavigateToTransform?: () => void; // Navigate to Content AI Studio for multi-platform transform
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

export function ZenExportModal({ isOpen, onClose, content, platform: _platform, documentName, onNavigateToTransform: _onNavigateToTransform }: ZenExportModalProps) {
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportedId, setExportedId] = useState<string | null>(null);
  const [_copied, setCopied] = useState(false);
  const [_optimizingPlatform, setOptimizingPlatform] = useState<string | null>(null);
  const [_optimizedPlatform, setOptimizedPlatform] = useState<string | null>(null);
  const [showToneSelector, setShowToneSelector] = useState(false);
  const [pendingPlatform, setPendingPlatform] = useState<PublishOption | null>(null);
  const [activeAccordion, setActiveAccordion] = useState<'quick' | 'additional' | 'publish'>('quick');
  const { openExternal } = useOpenExternal();

  const createPdfBytes = async (text: string) => {
    const normalizedText = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const fontBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);
    const margin = 40;
    const baseFontSize = 11;

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
      const lineHeight = size + 4;
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

    const rawLines = normalizedText.replace(/\r\n/g, '\n').split('\n');
    let inCodeBlock = false;

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
      const headerFontSize = 11;
      const cellFontSize = 10;

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
      const line = rawLine ?? '';
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
        const segments = tokenizeInline(headingText, size).map((seg) => ({
          ...seg,
          font: fontBold,
        }));
        drawWrappedSegments(segments, size, 0);
        y -= size / 3;
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

    const doc = new DocxDocument({
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
    const parts: string[] = [
      '{\\rtf1\\ansi\\deff0',
      '{\\fonttbl{\\f0 Arial;}{\\f1 Courier New;}}',
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

    const metaXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" office:version="1.2">
  <office:meta/>
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
    try {
      const normalizedContent = normalizeHtmlEntities(content);
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
          fileContent = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Export</title>
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
        case 'text':
          fileContent = markdownToPlainText(normalizedContent);
          extension = 'txt';
          break;
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
        default:
          extension = 'md';
          break;
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
          const blob = new Blob([binaryContent], { type: mimeType });
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
    } finally {
      setExportingId(null);
    }
  };

  const handlePublish = async (option: PublishOption) => {
    // Copy content to clipboard first
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }

    // Open the platform's posting page
    try {
      console.log('[ZenExportModal] Opening URL:', option.url);
      await openExternal(option.url);
      console.log('[ZenExportModal] URL opened successfully');
    } catch (err) {
      console.error('[ZenExportModal] Failed to open URL:', err);
      // Fallback: try window.open directly
      window.open(option.url, '_blank', 'noopener,noreferrer');
    }
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
        {/* Schnell-Export - Accordion */}
        <div style={{ marginBottom: '14px', border: '0.5px solid #3A3A3A', borderRadius: '12px', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setActiveAccordion('quick')}
            style={{
              width: '100%',
              padding: '12px 14px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeAccordion === 'quick' ? '0.5px solid #3A3A3A' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#555',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '13px',
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
        <div style={{ marginBottom: '14px', border: '0.5px solid #3A3A3A', borderRadius: '12px', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setActiveAccordion('additional')}
            style={{
              width: '100%',
              padding: '12px 14px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeAccordion === 'additional' ? '0.5px solid #3A3A3A' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#555',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '13px',
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
        <div style={{ border: '0.5px solid #3A3A3A', borderRadius: '12px', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setActiveAccordion('publish')}
            style={{
              width: '100%',
              padding: '12px 14px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeAccordion === 'publish' ? '0.5px solid #3A3A3A' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#555',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '13px',
            }}
          >
            <span>Direkt veröffentlichen</span>
            <span style={{ color: '#777' }}>{activeAccordion === 'publish' ? '−' : '+'}</span>
          </button>

          {activeAccordion === 'publish' && (
            <div style={{ padding: '12px 14px' }}>
              <h3 style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '14px',
            color: '#555',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 'normal'
          }}>
            <FontAwesomeIcon icon={faMedium} style={{ color: '#AC8E66' }} />
            Direkt Veröffentlichen
          </h3>
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '12px',
            color: '#777',
            marginBottom: '16px',
          }}>
            Klicke auf eine Plattform, um den Content zu kopieren und die Posting-Seite zu öffnen
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }}>
            {PUBLISH_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => handlePublish(option)}
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
                  e.currentTarget.style.borderColor = '#555555';
                  e.currentTarget.style.backgroundColor = '#555555' + '20';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#3A3A3A';
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <FontAwesomeIcon
                  icon={option.icon}
                  style={{
                    fontSize: '32px',
                    color: '#555',
                  }}
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
