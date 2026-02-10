/**
 * EditorJS Converter Utilities
 * Konvertiert zwischen Markdown und Editor.js JSON-Format
 */

export interface EditorJSBlock {
  id?: string;
  type: string;
  data: any;
}

export interface EditorJSData {
  time?: number;
  blocks: EditorJSBlock[];
  version?: string;
}

/**
 * Generiert eine eindeutige ID für Editor.js Blöcke
 */
function generateBlockId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Markdown → Editor.js JSON
 * Konvertiert Markdown-Text in das Editor.js Block-Format
 */
export function markdownToEditorJS(markdown: string): EditorJSData {
  const blocks: EditorJSBlock[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Leerzeilen überspringen
    if (!trimmedLine) {
      i++;
      continue;
    }

    // Code-Blöcke (fenced code blocks mit ```)
    if (trimmedLine.startsWith('```')) {
      const language = trimmedLine.substring(3).trim() || 'plaintext';
      const codeLines: string[] = [];
      i++;

      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }

      blocks.push({
        id: generateBlockId(),
        type: 'code',
        data: {
          code: codeLines.join('\n'),
          language: language,
        },
      });

      i++; // Überspringe schließendes ```
      continue;
    }

    // Überschriften (# bis ######)
    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];

      blocks.push({
        id: generateBlockId(),
        type: 'header',
        data: {
          text: text,
          level: level,
        },
      });

      i++;
      continue;
    }

    // Listen (unordered)
    if (trimmedLine.match(/^[-*+]\s+/)) {
      const items: string[] = [];

      while (i < lines.length) {
        const listLine = lines[i].trim();
        const match = listLine.match(/^[-*+]\s+(.+)$/);

        if (match) {
          items.push(match[1]);
          i++;
        } else if (!listLine) {
          // Leerzeile beendet die Liste
          break;
        } else {
          // Kein Listen-Item mehr
          break;
        }
      }

      blocks.push({
        id: generateBlockId(),
        type: 'list',
        data: {
          style: 'unordered',
          items: items,
        },
      });

      continue;
    }

    // Listen (ordered)
    if (trimmedLine.match(/^\d+\.\s+/)) {
      const items: string[] = [];

      while (i < lines.length) {
        const listLine = lines[i].trim();
        const match = listLine.match(/^\d+\.\s+(.+)$/);

        if (match) {
          items.push(match[1]);
          i++;
        } else if (!listLine) {
          // Leerzeile beendet die Liste
          break;
        } else {
          // Kein Listen-Item mehr
          break;
        }
      }

      blocks.push({
        id: generateBlockId(),
        type: 'list',
        data: {
          style: 'ordered',
          items: items,
        },
      });

      continue;
    }

    // Blockquotes
    if (trimmedLine.startsWith('>')) {
      const quoteLines: string[] = [];

      while (i < lines.length) {
        const quoteLine = lines[i].trim();
        if (quoteLine.startsWith('>')) {
          quoteLines.push(quoteLine.substring(1).trim());
          i++;
        } else if (!quoteLine) {
          break;
        } else {
          break;
        }
      }

      blocks.push({
        id: generateBlockId(),
        type: 'quote',
        data: {
          text: quoteLines.join(' '),
          caption: '',
          alignment: 'left',
        },
      });

      continue;
    }

    // Horizontale Linie
    if (trimmedLine.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      blocks.push({
        id: generateBlockId(),
        type: 'delimiter',
        data: {},
      });

      i++;
      continue;
    }

    // Normaler Paragraph - sammle mehrere Zeilen bis zur nächsten Leerzeile
    const paragraphLines: string[] = [line];
    i++;

    while (i < lines.length) {
      const nextLine = lines[i];
      const nextTrimmed = nextLine.trim();

      // Stoppe bei Leerzeile oder speziellen Markdown-Elementen
      if (
        !nextTrimmed ||
        nextTrimmed.startsWith('#') ||
        nextTrimmed.startsWith('```') ||
        nextTrimmed.match(/^[-*+]\s+/) ||
        nextTrimmed.match(/^\d+\.\s+/) ||
        nextTrimmed.startsWith('>') ||
        nextTrimmed.match(/^(-{3,}|\*{3,}|_{3,})$/)
      ) {
        break;
      }

      paragraphLines.push(nextLine);
      i++;
    }

    const paragraphText = paragraphLines.join('\n').trim();

    if (paragraphText) {
      blocks.push({
        id: generateBlockId(),
        type: 'paragraph',
        data: {
          text: paragraphText,
        },
      });
    }
  }

  return {
    time: Date.now(),
    blocks: blocks,
    version: '2.28.0',
  };
}

/**
 * Editor.js JSON → Markdown
 * Konvertiert Editor.js Blöcke zurück zu Markdown
 */
export function editorJSToMarkdown(data: EditorJSData | string): string {
  let editorData: EditorJSData;

  // Parse JSON string falls nötig
  if (typeof data === 'string') {
    try {
      editorData = JSON.parse(data);
    } catch (error) {
      throw new Error('Ungültiges Editor.js JSON-Format');
    }
  } else {
    editorData = data;
  }

  if (!editorData.blocks || !Array.isArray(editorData.blocks)) {
    throw new Error('Editor.js Daten müssen ein "blocks" Array enthalten');
  }

  const markdownLines: string[] = [];
  const normalizeInlineText = (text: string) => {
    const convertOrderedLists = (input: string) =>
      input.replace(/<ol(\s+[^>]*)?>([\s\S]*?)<\/ol>/gi, (_match, _attrs, inner) => {
        const items: string[] = [];
        const liRegex = /<li(\s+[^>]*)?>([\s\S]*?)<\/li>/gi;
        let m: RegExpExecArray | null;
        let idx = 1;
        while ((m = liRegex.exec(inner)) !== null) {
          const raw = m[2] ?? '';
          const cleaned = raw
            .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n')
            .replace(/<br\s*\/?>/gi, '  \n')
            .replace(/<[^>]+>/g, '')
            .trim();
          items.push(`${idx}. ${cleaned}`);
          idx += 1;
        }
        return items.join('\n');
      });

    return convertOrderedLists(text)
      .replace(/&nbsp;/gi, ' ')
      .replace(/<\/li>\s*<li(\s+[^>]*)?>/gi, '\n- ')
      .replace(/<li(\s+[^>]*)?>/gi, '- ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<ol(\s+[^>]*)?>/gi, '')
      .replace(/<ul(\s+[^>]*)?>/gi, '')
      .replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote|pre|code)>/gi, '\n')
      .replace(/<(p|div|h[1-6]|li|ul|ol|blockquote|pre|code)(\s+[^>]*)?>/gi, '')
      .replace(/<\/?span(\s+[^>]*)?>/gi, '')
      .replace(/<\/?a(\s+[^>]*)?>/gi, '')
      .replace(/<\/?strong(\s+[^>]*)?>/gi, '')
      .replace(/<\/?em(\s+[^>]*)?>/gi, '')
      .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '  \n');
  };

  for (const block of editorData.blocks) {
    switch (block.type) {
      case 'paragraph':
        markdownLines.push(normalizeInlineText(block.data.text || ''));
        markdownLines.push(''); // Leerzeile nach Paragraph
        break;

      case 'header':
        const level = block.data.level || 1;
        const hashes = '#'.repeat(Math.min(level, 6));
        markdownLines.push(`${hashes} ${normalizeInlineText(block.data.text || '')}`);
        markdownLines.push(''); // Leerzeile nach Header
        break;

      case 'list':
        const style = block.data.style || 'unordered';
        const items = block.data.items || [];

        items.forEach((item: string, index: number) => {
          if (style === 'ordered') {
            markdownLines.push(`${index + 1}. ${normalizeInlineText(item)}`);
          } else {
            markdownLines.push(`* ${normalizeInlineText(item)}`);
          }
        });

        markdownLines.push(''); // Leerzeile nach Liste
        break;

      case 'code':
        const language = block.data.language || '';
        const code = block.data.code || '';
        markdownLines.push(`\`\`\`${language}`);
        markdownLines.push(code);
        markdownLines.push('```');
        markdownLines.push(''); // Leerzeile nach Code-Block
        break;

      case 'quote':
        const quoteText = normalizeInlineText(block.data.text || '');
        const quoteLines = quoteText.split('\n');
        quoteLines.forEach((line: string) => {
          markdownLines.push(`> ${line}`);
        });
        markdownLines.push(''); // Leerzeile nach Quote
        break;

      case 'delimiter':
        markdownLines.push('---');
        markdownLines.push(''); // Leerzeile nach Delimiter
        break;

      case 'table':
        // Einfache Tabellen-Unterstützung
        const tableData = block.data.content || [];
        if (tableData.length > 0) {
          // Header
          const headerRow = (tableData[0] || []).map((cell: string) => normalizeInlineText(cell));
          markdownLines.push('| ' + headerRow.join(' | ') + ' |');
          markdownLines.push('| ' + headerRow.map(() => '---').join(' | ') + ' |');

          // Rows
          for (let i = 1; i < tableData.length; i++) {
            const row = (tableData[i] || []).map((cell: string) => normalizeInlineText(cell));
            markdownLines.push('| ' + row.join(' | ') + ' |');
          }

          markdownLines.push(''); // Leerzeile nach Tabelle
        }
        break;

      case 'image':
        const imageUrl = block.data.file?.url || block.data.url || '';
        const imageCaption = block.data.caption || '';
        if (imageUrl) {
          markdownLines.push(`![${imageCaption}](${imageUrl})`);
          markdownLines.push(''); // Leerzeile nach Bild
        }
        break;

      case 'warning':
      case 'alert':
        const warningText = block.data.message || block.data.text || '';
        const warningTitle = block.data.title || 'Warning';
        markdownLines.push(`> **${warningTitle}**`);
        markdownLines.push(`> ${warningText}`);
        markdownLines.push(''); // Leerzeile
        break;

      default:
        // Unbekannte Block-Typen als Paragraph behandeln
        if (block.data.text) {
          markdownLines.push(block.data.text);
          markdownLines.push(''); // Leerzeile
        }
        break;
    }
  }

  // Entferne überschüssige Leerzeilen am Ende
  while (markdownLines.length > 0 && markdownLines[markdownLines.length - 1] === '') {
    markdownLines.pop();
  }

  return markdownLines.join('\n');
}

/**
 * Validiert Editor.js JSON-Format
 */
export function isValidEditorJSData(data: any): boolean {
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return false;
    }
  }

  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.blocks) &&
    data.blocks.every(
      (block: any) =>
        block && typeof block === 'object' && typeof block.type === 'string' && block.data
    )
  );
}
