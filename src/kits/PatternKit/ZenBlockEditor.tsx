import React, { useEffect, useRef, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { createPortal } from 'react-dom';
import EditorJS, { OutputData } from '@editorjs/editorjs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAlignLeft,
  faAlignCenter,
  faAlignRight,
  faIndent,
  faOutdent,
  faTable,
  faArrowUp,
  faArrowDown,
  faClone,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Quote from '@editorjs/quote';
import Delimiter from '@editorjs/delimiter';
import Paragraph from '@editorjs/paragraph';
import DragDrop from 'editorjs-drag-drop';
import { ZenDropdown } from './ZenModalSystem/components/ZenDropdown';
import './ZenBlockEditor.css';


export type EditorTheme = 'dark' | 'light';

class ZenLinkBlockTool {
  private data: { text: string; url: string };

  static get toolbox() {
    return {
      title: 'Link',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M10.6 13.4a1 1 0 0 1 0-1.4l3.4-3.4a3 3 0 1 1 4.2 4.2l-2 2a3 3 0 0 1-4.2 0a1 1 0 1 1 1.4-1.4a1 1 0 0 0 1.4 0l2-2a1 1 0 1 0-1.4-1.4L12 13.4a1 1 0 0 1-1.4 0Zm2.8-2.8a1 1 0 0 1 0 1.4L10 15.4a3 3 0 1 1-4.2-4.2l2-2a3 3 0 0 1 4.2 0a1 1 0 1 1-1.4 1.4a1 1 0 0 0-1.4 0l-2 2a1 1 0 0 0 1.4 1.4l3.4-3.4a1 1 0 0 1 1.4 0Z"/></svg>',
    };
  }

  constructor({ data }: { data: { text?: string; url?: string } }) {
    this.data = { text: data?.text ?? '', url: data?.url ?? '' };
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.className = 'zen-link-block-tool';

    const textInput = document.createElement('input');
    textInput.className = 'cdx-input zen-link-block-tool__input';
    textInput.placeholder = 'Link text';
    textInput.value = this.data.text;
    textInput.type = 'text';

    const urlInput = document.createElement('input');
    urlInput.className = 'cdx-input zen-link-block-tool__input';
    urlInput.placeholder = 'https://example.com';
    urlInput.value = this.data.url;
    urlInput.type = 'url';

    wrapper.appendChild(textInput);
    wrapper.appendChild(urlInput);
    return wrapper;
  }

  save(block: HTMLDivElement) {
    const inputs = block.querySelectorAll<HTMLInputElement>('input');
    return {
      text: inputs[0]?.value?.trim() ?? '',
      url: inputs[1]?.value?.trim() ?? '',
    };
  }
}

class ZenImageBlockTool {
  private data: { url: string; alt: string };

  static get toolbox() {
    return {
      title: 'Image',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M5 4a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H5Zm0 2h14a1 1 0 0 1 1 1v7.5l-3.2-3.2a1 1 0 0 0-1.4 0L10 16.7l-2.3-2.3a1 1 0 0 0-1.4 0L4 16.7V7a1 1 0 0 1 1-1Zm0 12l2-2l2.3 2.3a1 1 0 0 0 1.4 0L16 13l4 4H5Zm3-8a2 2 0 1 0 0-4a2 2 0 0 0 0 4Z"/></svg>',
    };
  }

  constructor({ data }: { data: { url?: string; alt?: string } }) {
    this.data = { url: data?.url ?? '', alt: data?.alt ?? '' };
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.className = 'zen-image-block-tool';

    const urlInput = document.createElement('input');
    urlInput.className = 'cdx-input zen-image-block-tool__input';
    urlInput.placeholder = 'Image URL (https://...)';
    urlInput.value = this.data.url;
    urlInput.type = 'url';

    const altInput = document.createElement('input');
    altInput.className = 'cdx-input zen-image-block-tool__input';
    altInput.placeholder = 'Alt text';
    altInput.value = this.data.alt;
    altInput.type = 'text';

    wrapper.appendChild(urlInput);
    wrapper.appendChild(altInput);
    return wrapper;
  }

  save(block: HTMLDivElement) {
    const inputs = block.querySelectorAll<HTMLInputElement>('input');
    return {
      url: inputs[0]?.value?.trim() ?? '',
      alt: inputs[1]?.value?.trim() ?? '',
    };
  }
}

class ZenCtaBlockTool {
  private data: { text: string; url: string };

  static get toolbox() {
    return {
      title: 'CTA',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M3 12a1 1 0 0 1 1-1h10.6l-2.3-2.3a1 1 0 1 1 1.4-1.4l4 4a1 1 0 0 1 0 1.4l-4 4a1 1 0 1 1-1.4-1.4l2.3-2.3H4a1 1 0 0 1-1-1Z"/></svg>',
    };
  }

  constructor({ data }: { data: { text?: string; url?: string } }) {
    this.data = { text: data?.text ?? '', url: data?.url ?? '' };
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.className = 'zen-cta-block-tool';

    const textInput = document.createElement('input');
    textInput.className = 'cdx-input zen-cta-block-tool__input';
    textInput.placeholder = 'CTA Text (z. B. Jetzt starten)';
    textInput.value = this.data.text;
    textInput.type = 'text';

    const urlInput = document.createElement('input');
    urlInput.className = 'cdx-input zen-cta-block-tool__input';
    urlInput.placeholder = 'https://example.com';
    urlInput.value = this.data.url;
    urlInput.type = 'url';

    wrapper.appendChild(textInput);
    wrapper.appendChild(urlInput);
    return wrapper;
  }

  save(block: HTMLDivElement) {
    const inputs = block.querySelectorAll<HTMLInputElement>('input');
    return {
      text: inputs[0]?.value?.trim() ?? '',
      url: inputs[1]?.value?.trim() ?? '',
    };
  }
}

class ZenTableBlockTool {
  private data: { table: string };
  private static readonly DEFAULT_COLS = 2;
  private static readonly DEFAULT_ROWS = 2;

  static get toolbox() {
    return {
      title: 'Table',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M4 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H4Zm0 2h5v4H4V5Zm7 0h9v4h-9V5ZM4 11h5v4H4v-4Zm7 0h9v4h-9v-4ZM4 17h5v2H4v-2Zm7 0h9v2h-9v-2Z"/></svg>',
    };
  }

  constructor({ data }: { data: { table?: string } }) {
    this.data = { table: data?.table ?? '' };
  }

  private parseRow(line: string): string[] {
    const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
    return trimmed.split('|').map((cell) => cell.trim());
  }

  private isSeparatorRow(line: string): boolean {
    const normalized = line.trim().replace(/\s/g, '');
    return /^\|?:?-+:?(\|:?-+:?)+\|?$/.test(normalized);
  }

  private parseTableToGrid(raw: string): string[][] {
    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('|'));

    if (lines.length === 0) {
      return [
        ['Spalte A', 'Spalte B'],
        ['', ''],
      ];
    }

    const withoutSeparator = lines.filter((line, index) => index !== 1 || !this.isSeparatorRow(line));
    const rows = withoutSeparator.map((line) => this.parseRow(line));
    const maxCols = Math.max(
      ZenTableBlockTool.DEFAULT_COLS,
      ...rows.map((row) => row.length)
    );

    return rows.map((row) => {
      const next = [...row];
      while (next.length < maxCols) next.push('');
      return next;
    });
  }

  private gridToMarkdown(grid: string[][]): string {
    if (grid.length === 0) return '';
    const cols = Math.max(ZenTableBlockTool.DEFAULT_COLS, ...grid.map((row) => row.length));
    const normalizeRow = (row: string[]) => {
      const next = [...row];
      while (next.length < cols) next.push('');
      return next.map((cell) => (cell ?? '').trim());
    };

    const normalizedRows = grid.map(normalizeRow);
    const header = normalizedRows[0] ?? Array.from({ length: cols }, (_, idx) => `Spalte ${idx + 1}`);
    const bodyRows = normalizedRows.slice(1);

    const formatRow = (row: string[]) => `| ${row.map((cell) => cell || ' ').join(' | ')} |`;
    const separator = `| ${Array.from({ length: cols }, () => '---').join(' | ')} |`;

    return [formatRow(header), separator, ...bodyRows.map(formatRow)].join('\n');
  }

  private createCellInput(value: string, rowIndex: number, colIndex: number) {
    const input = document.createElement('input');
    input.className = 'zen-table-block-tool__cell';
    input.type = 'text';
    input.value = value;
    input.dataset.row = String(rowIndex);
    input.dataset.col = String(colIndex);
    return input;
  }

  private buildTableRows(tbody: HTMLTableSectionElement, grid: string[][]) {
    tbody.innerHTML = '';
    grid.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      row.forEach((cell, colIndex) => {
        const td = document.createElement('td');
        td.appendChild(this.createCellInput(cell, rowIndex, colIndex));
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.className = 'zen-table-block-tool';

    const controls = document.createElement('div');
    controls.className = 'zen-table-block-tool__controls';

    const addRow = document.createElement('button');
    addRow.type = 'button';
    addRow.className = 'zen-table-block-tool__btn';
    addRow.textContent = '+ Zeile';

    const addCol = document.createElement('button');
    addCol.type = 'button';
    addCol.className = 'zen-table-block-tool__btn';
    addCol.textContent = '+ Spalte';

    const removeRow = document.createElement('button');
    removeRow.type = 'button';
    removeRow.className = 'zen-table-block-tool__btn';
    removeRow.textContent = '− Zeile';

    const removeCol = document.createElement('button');
    removeCol.type = 'button';
    removeCol.className = 'zen-table-block-tool__btn';
    removeCol.textContent = '− Spalte';

    controls.appendChild(addRow);
    controls.appendChild(removeRow);
    controls.appendChild(addCol);
    controls.appendChild(removeCol);

    const table = document.createElement('table');
    table.className = 'zen-table-block-tool__grid';
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    const grid = this.parseTableToGrid(this.data.table);
    this.buildTableRows(tbody, grid);

    addRow.addEventListener('click', () => {
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const colCount = rows[0]?.querySelectorAll('td').length || ZenTableBlockTool.DEFAULT_COLS;
      const nextRowIndex = rows.length;
      const tr = document.createElement('tr');

      for (let col = 0; col < colCount; col += 1) {
        const td = document.createElement('td');
        td.appendChild(this.createCellInput('', nextRowIndex, col));
        tr.appendChild(td);
      }

      tbody.appendChild(tr);
      this.reindexGrid(tbody);
      this.updateControlState(tbody, removeRow, removeCol);
    });

    addCol.addEventListener('click', () => {
      const rows = Array.from(tbody.querySelectorAll('tr'));
      if (rows.length === 0) {
        this.buildTableRows(tbody, this.parseTableToGrid(''));
        this.reindexGrid(tbody);
        this.updateControlState(tbody, removeRow, removeCol);
        return;
      }
      rows.forEach((tr, rowIndex) => {
        const td = document.createElement('td');
        const colIndex = tr.querySelectorAll('td').length;
        td.appendChild(this.createCellInput('', rowIndex, colIndex));
        tr.appendChild(td);
      });

      this.reindexGrid(tbody);
      this.updateControlState(tbody, removeRow, removeCol);
    });

    removeRow.addEventListener('click', () => {
      const rows = Array.from(tbody.querySelectorAll('tr'));
      if (rows.length <= ZenTableBlockTool.DEFAULT_ROWS) return;

      rows[rows.length - 1]?.remove();
      this.reindexGrid(tbody);
      this.updateControlState(tbody, removeRow, removeCol);
    });

    removeCol.addEventListener('click', () => {
      const rows = Array.from(tbody.querySelectorAll('tr'));
      if (rows.length === 0) return;

      const colCount = rows[0]?.querySelectorAll('td').length ?? 0;
      if (colCount <= ZenTableBlockTool.DEFAULT_COLS) return;

      rows.forEach((tr) => tr.lastElementChild?.remove());
      this.reindexGrid(tbody);
      this.updateControlState(tbody, removeRow, removeCol);
    });

    this.updateControlState(tbody, removeRow, removeCol);

    wrapper.appendChild(controls);
    wrapper.appendChild(table);
    return wrapper;
  }

  save(block: HTMLDivElement) {
    const rows = Array.from(block.querySelectorAll<HTMLTableRowElement>('.zen-table-block-tool__grid tr'));
    const grid = rows.map((row) =>
      Array.from(row.querySelectorAll<HTMLInputElement>('input')).map((cell) => cell.value)
    );

    const hasAnyValue = grid.some((row) => row.some((cell) => cell.trim().length > 0));
    if (!hasAnyValue) return { table: '' };
    return { table: this.gridToMarkdown(grid) };
  }

  private reindexGrid(tbody: HTMLTableSectionElement) {
    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.forEach((tr, r) => {
      const inputs = Array.from(tr.querySelectorAll<HTMLInputElement>('input'));
      inputs.forEach((input, c) => {
        input.dataset.row = String(r);
        input.dataset.col = String(c);
      });
    });
  }

  private updateControlState(
    tbody: HTMLTableSectionElement,
    removeRowBtn: HTMLButtonElement,
    removeColBtn: HTMLButtonElement
  ) {
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const rowCount = rows.length;
    const colCount = rows[0]?.querySelectorAll('td').length ?? ZenTableBlockTool.DEFAULT_COLS;

    removeRowBtn.disabled = rowCount <= ZenTableBlockTool.DEFAULT_ROWS;
    removeColBtn.disabled = colCount <= ZenTableBlockTool.DEFAULT_COLS;
    removeRowBtn.classList.toggle('is-disabled', removeRowBtn.disabled);
    removeColBtn.classList.toggle('is-disabled', removeColBtn.disabled);
  }
}

class ZenCodeBlockTool {
  private data: { code: string; language: string };
  private dropdownRoot: Root | null = null;
  private static readonly LANGUAGE_OPTIONS = [
    { value: 'text', label: 'Plain Text' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'bash', label: 'Bash' },
    { value: 'json', label: 'JSON' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'sql', label: 'SQL' },
    { value: 'yaml', label: 'YAML' },
    { value: 'markdown', label: 'Markdown' },
  ];

  static get toolbox() {
    return {
      title: 'Code',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M8.7 17.3a1 1 0 0 1-1.4 0l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 1 1 1.4 1.4L4.4 12l4.3 4.3a1 1 0 0 1 0 1.4Zm6.6 0a1 1 0 0 1 0-1.4l4.3-4.3l-4.3-4.3a1 1 0 1 1 1.4-1.4l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4 0Z"/></svg>',
    };
  }

  constructor({ data }: { data: { code?: string; language?: string } }) {
    this.data = {
      code: data?.code ?? '',
      language: data?.language ?? 'text',
    };
  }

  private handleTabIndent(event: KeyboardEvent, textarea: HTMLTextAreaElement) {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    event.stopPropagation();

    const value = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const lineEndIdx = value.indexOf('\n', end);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const selectedText = value.slice(lineStart, lineEnd);
    const lines = selectedText.split('\n');

    if (start !== end || selectedText.includes('\n')) {
      if (event.shiftKey) {
        const outdented = lines.map((line) => {
          if (line.startsWith('\t')) return line.slice(1);
          if (line.startsWith('  ')) return line.slice(2);
          return line;
        });
        const replaced = outdented.join('\n');
        textarea.value = value.slice(0, lineStart) + replaced + value.slice(lineEnd);
        textarea.setSelectionRange(lineStart, lineStart + replaced.length);
      } else {
        const indented = lines.map((line) => `\t${line}`).join('\n');
        textarea.value = value.slice(0, lineStart) + indented + value.slice(lineEnd);
        textarea.setSelectionRange(lineStart, lineStart + indented.length);
      }
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    if (event.shiftKey) {
      const before = value.slice(0, start);
      if (before.endsWith('\t')) {
        textarea.value = value.slice(0, start - 1) + value.slice(end);
        textarea.setSelectionRange(start - 1, start - 1);
      } else if (before.endsWith('  ')) {
        textarea.value = value.slice(0, start - 2) + value.slice(end);
        textarea.setSelectionRange(start - 2, start - 2);
      }
    } else {
      const tab = '\t';
      textarea.value = value.slice(0, start) + tab + value.slice(end);
      const cursor = start + tab.length;
      textarea.setSelectionRange(cursor, cursor);
    }
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  private handleCodeTextareaKeydown(event: KeyboardEvent, textarea: HTMLTextAreaElement) {
    if (event.key === 'Enter') {
      // Keep Enter inside code textarea and prevent EditorJS from splitting blocks.
      event.stopPropagation();
      return;
    }
    if (event.key === 'Tab') {
      this.handleTabIndent(event, textarea);
    }
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.className = 'zen-code-block-tool';

    const header = document.createElement('div');
    header.className = 'zen-code-block-tool__header';
    const dropdownHost = document.createElement('div');
    dropdownHost.className = 'zen-code-block-tool__dropdown-host';
    header.appendChild(dropdownHost);

    const textarea = document.createElement('textarea');
    textarea.className = 'zen-code-block-tool__textarea';
    textarea.placeholder = 'Code eingeben...';
    textarea.value = this.data.code;
    textarea.addEventListener('keydown', (event) => this.handleCodeTextareaKeydown(event, textarea));

    wrapper.appendChild(header);
    wrapper.appendChild(textarea);

    this.dropdownRoot = createRoot(dropdownHost);
    this.dropdownRoot.render(
      React.createElement(ZenDropdown, {
        value: this.data.language,
        onChange: (value: string) => {
          this.data.language = value;
        },
        options: ZenCodeBlockTool.LANGUAGE_OPTIONS,
        variant: 'compact',
        fullWidth: false,
        theme: 'dark',
      })
    );

    return wrapper;
  }

  save(block: HTMLDivElement) {
    const code = block.querySelector<HTMLTextAreaElement>('.zen-code-block-tool__textarea')?.value || '';
    return { language: this.data.language || 'text', code };
  }

  destroy() {
    this.dropdownRoot?.unmount();
    this.dropdownRoot = null;
  }
}

interface ZenBlockEditorProps {
  value: string; // Markdown input
  onChange: (value: string) => void; // Markdown output
  onRegisterContentSnapshotGetter?: (getter: (() => Promise<string>) | null) => void;
  placeholder?: string;
  height?: string;
  fontSize?: number;
  wrapLines?: boolean;
  showLineNumbers?: boolean;
  theme?: EditorTheme;
  focusHeadingRequest?: { headingIndex: number; token: number } | null;
  onActiveHeadingChange?: (headingIndex: number) => void;
}

/**
 * ZenBlockEditor - Block-based editor powered by EditorJS
 * Allows users to either type freely or use block-based editing with formatting
 */
export const ZenBlockEditor = ({
  value,
  onChange,
  onRegisterContentSnapshotGetter,
  placeholder = 'Schreibe  was du denkst...',
  height = '400px',
  fontSize,
  wrapLines = true,
  showLineNumbers = true,
  theme = 'light',
  focusHeadingRequest = null,
  onActiveHeadingChange,
}: ZenBlockEditorProps) => {
  const LINE_GUTTER_WIDTH = 56;
  const DOT_LEFT_OFFSET = 5;
  const MENU_LEFT_OFFSET = -140;
  const editorRef = useRef<EditorJS | null>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: MENU_LEFT_OFFSET, y: 96 });
  const [dotPosition, setDotPosition] = useState({ x: DOT_LEFT_OFFSET, y: 0 });
  const lastActiveHeadingRef = useRef<number | null>(null);
  const lastActiveBlockIndexRef = useRef<number | null>(null);
  const lastHandledFocusRequestTokenRef = useRef<number | null>(null);
  const blockTypeObserverRef = useRef<MutationObserver | null>(null);
  const lastLocalMarkdownRef = useRef<string>(value);
  // Use ref to always have latest onChange callback (fixes closure bug)
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const getCurrentMarkdownSnapshot = async (): Promise<string> => {
    const editor = editorRef.current as any;
    if (!editor?.save) {
      return lastLocalMarkdownRef.current ?? value;
    }
    try {
      const outputData = await editor.save();
      const markdown = editorJSToMarkdown(outputData);
      lastLocalMarkdownRef.current = markdown;
      return markdown;
    } catch {
      return lastLocalMarkdownRef.current ?? value;
    }
  };

  useEffect(() => {
    if (!onRegisterContentSnapshotGetter) return;
    onRegisterContentSnapshotGetter(getCurrentMarkdownSnapshot);
    return () => onRegisterContentSnapshotGetter(null);
  }, [onRegisterContentSnapshotGetter, isReady, value]);

  // Convert Markdown to EditorJS format
  const markdownToEditorJS = (markdown: string): OutputData => {
    if (!markdown.trim()) {
      return {
        time: Date.now(),
        blocks: [],
        version: '2.28.0',
      };
    }

    const blocks: any[] = [];
    const markdownInlineToHtml = (input: string) =>
      input
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Bold (**text** / __text__)
        .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
        .replace(/__([^_]+)__/g, '<b>$1</b>')
        // Italic (*text* / _text_)
        .replace(/\*([^*]+)\*/g, '<i>$1</i>')
        .replace(/_([^_]+)_/g, '<i>$1</i>')
        // Strike-through
        .replace(/~~([^~]+)~~/g, '<s>$1</s>');
    const lines = markdown.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Empty line - skip
      if (!line.trim()) {
        i++;
        continue;
      }

      // Headers (# ## ###)
      if (line.match(/^#{1,6}\s/)) {
        const level = line.match(/^#+/)?.[0].length || 1;
        const text = line.replace(/^#+\s/, '');
        blocks.push({
          type: 'header',
          data: {
            text: markdownInlineToHtml(text),
            level: Math.min(level, 6),
          },
        });
        i++;
        continue;
      }

      // Code blocks (```)
      if (line.startsWith('```')) {
        const language = line.slice(3).trim() || '';
        const codeLines: string[] = [];
        i++; // Skip opening ```

        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }

        blocks.push({
          type: 'code',
          data: {
            code: codeLines.join('\n'),
            language,
          },
        });
        i++; // Skip closing ```
        continue;
      }

      // Quotes (>)
      if (line.startsWith('>')) {
        const quoteLines: string[] = [markdownInlineToHtml(line.replace(/^>\s?/, ''))];
        i++;

        while (i < lines.length && lines[i].startsWith('>')) {
          quoteLines.push(markdownInlineToHtml(lines[i].replace(/^>\s?/, '')));
          i++;
        }

        blocks.push({
          type: 'quote',
          data: {
            text: quoteLines.join('\n'),
            caption: '',
            alignment: 'left',
          },
        });
        continue;
      }

      // Markdown image ![alt](url)
      const imageMatch = line.match(/^!\[(.*?)\]\((.+?)\)\s*$/);
      if (imageMatch) {
        blocks.push({
          type: 'imageBlock',
          data: {
            alt: imageMatch[1] ?? '',
            url: imageMatch[2] ?? '',
          },
        });
        i++;
        continue;
      }

      // Markdown link [text](url)
      const linkMatch = line.match(/^\[(.+?)\]\((.+?)\)\s*$/);
      if (linkMatch) {
        blocks.push({
          type: 'linkBlock',
          data: {
            text: linkMatch[1] ?? '',
            url: linkMatch[2] ?? '',
          },
        });
        i++;
        continue;
      }

      // CTA [CTA: Text](url)
      const ctaMatch = line.match(/^\[CTA:\s*(.+?)\]\((.+?)\)\s*$/i);
      if (ctaMatch) {
        blocks.push({
          type: 'ctaBlock',
          data: {
            text: ctaMatch[1] ?? '',
            url: ctaMatch[2] ?? '',
          },
        });
        i++;
        continue;
      }

      // Markdown table block
      if (line.trim().startsWith('|')) {
        const tableLines: string[] = [line];
        i++;
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i]);
          i++;
        }

        blocks.push({
          type: 'tableBlock',
          data: {
            table: tableLines.join('\n'),
          },
        });
        continue;
      }

      // Lists (- or 1.)
      if (line.match(/^[\-\*]\s/) || line.match(/^\d+\.\s/)) {
        const isOrdered = line.match(/^\d+\.\s/) !== null;
        const items: string[] = [];
        const itemRegex = isOrdered ? /^\d+\.\s/ : /^[\-\*]\s/;

        while (i < lines.length && lines[i].match(itemRegex)) {
          items.push(markdownInlineToHtml(lines[i].replace(itemRegex, '')));
          i++;
        }

        blocks.push({
          type: 'list',
          data: {
            style: isOrdered ? 'ordered' : 'unordered',
            items,
          },
        });
        continue;
      }

      // Delimiter (---)
      if (line.match(/^---+$/)) {
        blocks.push({
          type: 'delimiter',
          data: {},
        });
        i++;
        continue;
      }

      // Regular paragraph
      const paragraphLines: string[] = [line];
      i++;

      // Collect consecutive non-special lines
      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].match(/^#{1,6}\s/) &&
        !lines[i].startsWith('```') &&
        !lines[i].startsWith('>') &&
        !lines[i].match(/^[\-\*]\s/) &&
        !lines[i].match(/^\d+\.\s/) &&
        !lines[i].match(/^---+$/)
      ) {
        paragraphLines.push(lines[i]);
        i++;
      }

      blocks.push({
        type: 'paragraph',
        data: {
          // Keep single newlines as visual soft-breaks when markdown is reloaded
          // back into EditorJS (e.g. Step4 Preview -> Step1 BlockEditor).
          text: paragraphLines.map((line) => markdownInlineToHtml(line)).join('<br>'),
        },
      });
    }

    return {
      time: Date.now(),
      blocks,
      version: '2.28.0',
    };
  };

  // Convert EditorJS format to Markdown
  const editorJSToMarkdown = (data: OutputData): string => {
    if (!data.blocks || data.blocks.length === 0) {
      return '';
    }

    const normalizeInlineText = (text: unknown) => {
      const safeText = typeof text === 'string' ? text : String(text ?? '');
      const convertInlineHtml = (input: string) =>
        input
          // Browser underline variants
          .replace(/<span[^>]*text-decoration\s*:\s*underline[^>]*>([\s\S]*?)<\/span>/gi, (_m, inner) => `<u>${String(inner ?? '')}</u>`)
          .replace(/<ins(\s+[^>]*)?>([\s\S]*?)<\/ins>/gi, (_m, _attrs, inner) => `<u>${String(inner ?? '')}</u>`)
          // Links
          .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_match, href, label) => {
            const cleanedLabel = String(label ?? '').replace(/<[^>]+>/g, '').trim() || href;
            return `[${cleanedLabel}](${href})`;
          })
          // Bold
          .replace(/<(strong|b)(\s+[^>]*)?>([\s\S]*?)<\/(strong|b)>/gi, (_m, _tag, _attrs, inner) => `**${inner}**`)
          // Italic
          .replace(/<(em|i)(\s+[^>]*)?>([\s\S]*?)<\/(em|i)>/gi, (_m, _tag, _attrs, inner) => `*${inner}*`)
          // Strike-through
          .replace(/<(s|strike|del)(\s+[^>]*)?>([\s\S]*?)<\/(s|strike|del)>/gi, (_m, _tag, _attrs, inner) => `~~${inner}~~`)
          // Inline code
          .replace(/<code(\s+[^>]*)?>([\s\S]*?)<\/code>/gi, (_m, _attrs, inner) => `\`${inner}\``)
          // Underline has no native markdown syntax; keep as inline HTML
          .replace(/<u(\s+[^>]*)?>([\s\S]*?)<\/u>/gi, (_m, _attrs, inner) => `<u>${String(inner ?? '')}</u>`);
      const convertOrderedLists = (input: string) =>
        input.replace(/<ol(\s+[^>]*)?>([\s\S]*?)<\/ol>/gi, (_match, _attrs, inner) => {
          const items: string[] = [];
          const liRegex = /<li(\s+[^>]*)?>([\s\S]*?)<\/li>/gi;
          let m: RegExpExecArray | null;
          let idx = 1;
          while ((m = liRegex.exec(inner)) !== null) {
            const raw = m[2] ?? '';
            const cleaned = raw
              .replace(/&lt;/gi, '<')
              .replace(/&gt;/gi, '>')
              .replace(/&amp;/gi, '&')
              .replace(/<br[^>]*data-empty=["']?true["']?[^>]*>/gi, '')
              .replace(/<br(\s+[^>]*)?\s*\/?>\s*<br(\s+[^>]*)?\s*\/?>/gi, '\n\n')
              .replace(/<br(\s+[^>]*)?\s*\/?>/gi, '\n')
              .replace(/<[^>]+>/g, '')
              .trim();
            items.push(`${idx}. ${cleaned}`);
            idx += 1;
          }
          return items.join('\n');
        });

      return convertOrderedLists(convertInlineHtml(safeText))
        .replace(/&nbsp;/gi, ' ')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&')
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
        .replace(/<\/?strong(\s+[^>]*)?>/gi, '')
        .replace(/<\/?em(\s+[^>]*)?>/gi, '')
        .replace(/<\/?i(\s+[^>]*)?>/gi, '')
        .replace(/<\/?b(\s+[^>]*)?>/gi, '')
        .replace(/<br[^>]*data-empty=["']?true["']?[^>]*>/gi, '')
        .replace(/<br(\s+[^>]*)?\s*\/?>\s*<br(\s+[^>]*)?\s*\/?>/gi, '\n\n')
        .replace(/<br(\s+[^>]*)?\s*\/?>/gi, '\n');
    };

    const flattenListItems = (items: unknown): string[] => {
      if (!Array.isArray(items)) return [];
      const lines: string[] = [];

      const walk = (entry: unknown) => {
        if (typeof entry === 'string') {
          lines.push(normalizeInlineText(entry));
          return;
        }
        if (entry && typeof entry === 'object') {
          const node = entry as { content?: unknown; text?: unknown; items?: unknown };
          const content = node.content ?? node.text;
          if (content !== undefined) {
            lines.push(normalizeInlineText(content));
          }
          if (Array.isArray(node.items)) {
            node.items.forEach(walk);
          }
        }
      };

      items.forEach(walk);
      return lines.filter((line) => line.trim().length > 0);
    };

    return data.blocks
      .map((block) => {
        switch (block.type) {
          case 'header':
            const level = '#'.repeat(block.data.level || 1);
            return `${level} ${normalizeInlineText(block.data.text || '')}`;

          case 'paragraph':
            return normalizeInlineText(block.data.text || '');

          case 'list':
            const listStyle = block.data.style === 'ordered' ? 'ordered' : 'unordered';
            const listItems = flattenListItems(block.data.items);
            return listItems
              .map((item: string, index: number) =>
                listStyle === 'ordered' ? `${index + 1}. ${item}` : `- ${item}`
              )
              .join('\n');

          case 'code':
            const lang = block.data.language || '';
            return `\`\`\`${lang}\n${block.data.code}\n\`\`\``;

          case 'linkBlock':
            if (!block.data?.url) return '';
            return `[${normalizeInlineText(block.data.text || block.data.url)}](${normalizeInlineText(block.data.url)})`;

          case 'imageBlock':
            if (!block.data?.url) return '';
            return `![${normalizeInlineText(block.data.alt || '')}](${normalizeInlineText(block.data.url)})`;

          case 'ctaBlock':
            if (!block.data?.url) return '';
            return `[CTA: ${normalizeInlineText(block.data.text || 'Mehr erfahren')}](${normalizeInlineText(block.data.url)})`;

          case 'tableBlock':
            return normalizeInlineText(block.data.table || '');

          case 'quote':
            return normalizeInlineText(block.data.text || '')
              .split('\n')
              .map((line: string) => `> ${line}`)
              .join('\n');

          case 'delimiter':
            return '---';

          default:
            return '';
        }
      })
      .join('\n\n');
  };

  // Initialize EditorJS
  useEffect(() => {
    if (!holderRef.current || editorRef.current) return;

    const editor = new EditorJS({
      holder: holderRef.current,
      placeholder,
      tools: {
        paragraph: {
          class: Paragraph as any,
          inlineToolbar: true,
        },
        header: {
          class: Header as any,
          inlineToolbar: true,
          config: {
            levels: [1, 2, 3, 4, 5, 6],
            defaultLevel: 2,
          },
        },
        list: {
          class: List as any,
          inlineToolbar: true,
        },
        code: {
          class: ZenCodeBlockTool as any,
        },
        quote: {
          class: Quote as any,
          inlineToolbar: true,
        },
        ctaBlock: {
          class: ZenCtaBlockTool as any,
        },
        tableBlock: {
          class: ZenTableBlockTool as any,
        },
        linkBlock: {
          class: ZenLinkBlockTool as any,
        },
        imageBlock: {
          class: ZenImageBlockTool as any,
        },
        delimiter: Delimiter as any,
      },
      data: markdownToEditorJS(value),
      onChange: async () => {
        if (!editorRef.current) return;

        try {
          const outputData = await editorRef.current.save();
          const markdown = editorJSToMarkdown(outputData);
          lastLocalMarkdownRef.current = markdown;
          // Use ref to always call the latest onChange callback
          onChangeRef.current(markdown);
        } catch (error) {
          console.error('Error saving EditorJS data:', error);
        }
      },
      onReady: () => {
        setIsReady(true);

        // Enable drag-and-drop
        if (editorRef.current) {
          new DragDrop(editorRef.current);
        }
      },
    });

    editorRef.current = editor;

    return () => {
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isReady || !holderRef.current) return;

    const holder = holderRef.current;

    const syncBlockTypeClasses = () => {
      const blocks = holder.querySelectorAll<HTMLElement>('.ce-block');
      blocks.forEach((block) => {
        const hasHeading = !!block.querySelector('.ce-header, .cdx-header');
        const contentNode = block.querySelector<HTMLElement>(
          '.ce-paragraph, .ce-header, .cdx-header, .cdx-quote__text, .cdx-quote__caption, .zen-code-block-tool__textarea, .zen-table-block-tool__cell, .zen-link-block-tool__input, .zen-image-block-tool__input, .zen-cta-block-tool__input, input, textarea, [contenteditable="true"]'
        );
        const rawValue =
          contentNode instanceof HTMLTextAreaElement || contentNode instanceof HTMLInputElement
            ? contentNode.value
            : (contentNode?.textContent ?? '');
        const hasContent = rawValue.trim().length > 0;
        block.classList.toggle('zen-block-has-heading', hasHeading);
        block.classList.toggle('zen-block-has-content', hasContent);
      });
    };

    syncBlockTypeClasses();

    const observer = new MutationObserver(() => {
      syncBlockTypeClasses();
    });
    observer.observe(holder, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const onInput = () => syncBlockTypeClasses();
    const onKeyUp = () => syncBlockTypeClasses();
    holder.addEventListener('input', onInput, true);
    holder.addEventListener('keyup', onKeyUp, true);

    blockTypeObserverRef.current = observer;

    return () => {
      observer.disconnect();
      holder.removeEventListener('input', onInput, true);
      holder.removeEventListener('keyup', onKeyUp, true);
      blockTypeObserverRef.current = null;
    };
  }, [isReady]);

  useEffect(() => {
    if (!isReady || !holderRef.current || !containerRef.current) return;

    const holder = holderRef.current;
    const container = containerRef.current;

    const getActiveBlock = () => {
      const selection = window.getSelection();
      const anchorNode = selection?.anchorNode ?? null;
      const anchorElement =
        anchorNode?.nodeType === Node.TEXT_NODE
          ? (anchorNode.parentElement as HTMLElement | null)
          : (anchorNode as HTMLElement | null);

      if (anchorElement && holder.contains(anchorElement)) {
        const block = anchorElement.closest('.ce-block') as HTMLElement | null;
        if (block) return block;
      }

      const focusedElement = document.activeElement as HTMLElement | null;
      if (focusedElement && holder.contains(focusedElement)) {
        const block = focusedElement.closest('.ce-block') as HTMLElement | null;
        if (block) return block;
      }

      return holder.querySelector<HTMLElement>('.ce-block--focused, .ce-block--selected, .ce-block');
    };

    const toContainerY = (rectTop: number) => {
      const containerRect = container.getBoundingClientRect();
      return container.scrollTop + (rectTop - containerRect.top);
    };

    const syncOverlayContext = () => {
      const activeBlock = getActiveBlock();
      if (activeBlock) {
        const blockNodes = holder.querySelectorAll<HTMLElement>('.ce-block');
        const activeIndex = Array.from(blockNodes).indexOf(activeBlock);
        if (activeIndex >= 0) {
          lastActiveBlockIndexRef.current = activeIndex;
        }
        const blockRect = activeBlock.getBoundingClientRect();
        setDotPosition({
          x: DOT_LEFT_OFFSET,
          y: Math.max(10, toContainerY(blockRect.top) + 8),
        });
      }

      const selection = window.getSelection();
      const hasSelectionInEditor =
        !!selection &&
        selection.rangeCount > 0 &&
        !selection.isCollapsed &&
        holder.contains(selection.anchorNode) &&
        holder.contains(selection.focusNode);

      if (hasSelectionInEditor && selection) {
        const rangeRect = selection.getRangeAt(0).getBoundingClientRect();
        setMenuPosition({
          x: MENU_LEFT_OFFSET,
          y: Math.max(14, toContainerY(rangeRect.top) + 20),
        });
        setMenuOpen(true);
      }
    };

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.zen-overlay-block-menu, .zen-block-menu-dot')) return;
      if (!holder.contains(target as Node)) {
        setMenuOpen(false);
      }
    };

    const closeMenuOnTyping = () => {
      const selection = window.getSelection();
      const isCollapsedInEditor =
        !!selection &&
        selection.rangeCount > 0 &&
        selection.isCollapsed &&
        holder.contains(selection.anchorNode);

      if (isCollapsedInEditor) {
        setMenuOpen(false);
      }
    };

    const onScroll = () => syncOverlayContext();

    document.addEventListener('mousedown', closeOnOutsideClick, true);
    document.addEventListener('selectionchange', syncOverlayContext);
    holder.addEventListener('mouseup', syncOverlayContext, true);
    holder.addEventListener('keyup', syncOverlayContext, true);
    holder.addEventListener('focusin', syncOverlayContext, true);
    holder.addEventListener('input', closeMenuOnTyping, true);
    container.addEventListener('scroll', onScroll, { passive: true });

    syncOverlayContext();

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick, true);
      document.removeEventListener('selectionchange', syncOverlayContext);
      holder.removeEventListener('mouseup', syncOverlayContext, true);
      holder.removeEventListener('keyup', syncOverlayContext, true);
      holder.removeEventListener('focusin', syncOverlayContext, true);
      holder.removeEventListener('input', closeMenuOnTyping, true);
      container.removeEventListener('scroll', onScroll);
    };
  }, [isReady]);

  useEffect(() => {
    if (!isReady || !holderRef.current) return;

    const holder = holderRef.current;

    const insertSoftBreakAtSelection = () => {
      // Use native line-break command for contenteditable; this keeps caret behavior stable.
      if (document.execCommand('insertLineBreak')) {
        return true;
      }
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return false;
      const range = selection.getRangeAt(0);
      const br = document.createElement('br');
      range.deleteContents();
      range.insertNode(br);
      const nextRange = document.createRange();
      nextRange.setStartAfter(br);
      nextRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      return true;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || !event.shiftKey) return;

      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (!holder.contains(target)) return;
      if (target.closest('textarea, input, .zen-code-block-tool__textarea')) return;

      const editable = target.closest(
        '.ce-paragraph, .ce-header, .cdx-header, .cdx-quote__text, .cdx-quote__caption, [contenteditable="true"]'
      ) as HTMLElement | null;
      if (!editable) return;

      event.preventDefault();
      event.stopPropagation();

      if (insertSoftBreakAtSelection()) {
        editable.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    holder.addEventListener('keydown', onKeyDown, true);
    return () => {
      holder.removeEventListener('keydown', onKeyDown, true);
    };
  }, [isReady]);

  useEffect(() => {
    if (!isReady || !holderRef.current) return;

    const holder = holderRef.current;

    /**
     * Unified left-gutter menu:
     * clicking the settings button opens the add/toolbox menu so users
     * only interact with one visible trigger.
     */
    const onSettingsMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const settingsButton = target?.closest('.ce-toolbar__settings-btn') as HTMLElement | null;
      if (!settingsButton) return;

      const toolbar = settingsButton.closest('.ce-toolbar') as HTMLElement | null;
      const plusButton =
        toolbar?.querySelector<HTMLElement>('.ce-toolbar__plus') ??
        holder.querySelector<HTMLElement>('.ce-toolbar__plus');

      if (!plusButton) return;

      event.preventDefault();
      event.stopPropagation();

      window.requestAnimationFrame(() => {
        plusButton.click();
      });
    };

    holder.addEventListener('mousedown', onSettingsMouseDown, true);

    return () => {
      holder.removeEventListener('mousedown', onSettingsMouseDown, true);
    };
  }, [isReady]);

  useEffect(() => {
    if (!isReady || !holderRef.current || !containerRef.current) return;

    const holder = holderRef.current;
    const container = containerRef.current;

    const isNodeInsideHolder = (node: Node | null) => {
      if (!node) return false;
      if (node instanceof HTMLElement) return holder.contains(node);
      return holder.contains(node.parentNode);
    };

    const hasVisibleInlineToolbar = () => {
      const inlineToolbars = holder.querySelectorAll<HTMLElement>('.ce-inline-toolbar');
      for (const toolbar of inlineToolbars) {
        const isShownByClass =
          toolbar.classList.contains('ce-inline-toolbar--showed') ||
          toolbar.classList.contains('ce-inline-toolbar--shown') ||
          toolbar.classList.contains('ce-inline-toolbar--opened');
        const rect = toolbar.getBoundingClientRect();
        const hasSize = rect.width > 0 && rect.height > 0;
        const hasFocusInside = toolbar.contains(document.activeElement);

        if ((isShownByClass && hasSize) || hasFocusInside) {
          return true;
        }
      }
      return false;
    };

    const syncInlineToolbarState = () => {
      const selection = window.getSelection();
      const hasExpandedSelection =
        !!selection &&
        selection.rangeCount > 0 &&
        !selection.isCollapsed &&
        isNodeInsideHolder(selection.anchorNode) &&
        isNodeInsideHolder(selection.focusNode);
 
      const getBlockState = (block: HTMLElement | null) => {
        if (!block) {
          return {
            text: '',
            hasCustomTool: false,
            isEditingCustomTool: false,
          };
        }

        const contentNode = block.querySelector<HTMLElement>(
          '.ce-paragraph, .ce-header, .cdx-header, .cdx-quote__text, .cdx-quote__caption, .zen-code-block-tool__textarea, .zen-table-block-tool__cell, .zen-link-block-tool__input, .zen-image-block-tool__input, .zen-cta-block-tool__input, [contenteditable="true"]'
        );
        const text =
          contentNode instanceof HTMLTextAreaElement || contentNode instanceof HTMLInputElement
            ? contentNode.value.trim()
            : (contentNode?.textContent ?? '').trim();

        const hasCustomTool = !!block.querySelector(
          '.zen-image-block-tool, .zen-link-block-tool, .zen-code-block-tool, .zen-cta-block-tool, .zen-table-block-tool'
        );

        const activeElement = document.activeElement as HTMLElement | null;
        const isEditingCustomTool =
          !!activeElement &&
          block.contains(activeElement) &&
          hasCustomTool &&
          (activeElement instanceof HTMLInputElement ||
            activeElement instanceof HTMLTextAreaElement ||
            activeElement.getAttribute('contenteditable') === 'true');

        return { text, hasCustomTool, isEditingCustomTool };
      };

      let activeBlock: HTMLElement | null = null;
      const anchorNode = selection?.anchorNode ?? null;
      const anchorElement =
        anchorNode?.nodeType === Node.TEXT_NODE
          ? (anchorNode.parentElement as HTMLElement | null)
          : (anchorNode as HTMLElement | null);
      if (anchorElement && holder.contains(anchorElement)) {
        activeBlock = anchorElement.closest('.ce-block') as HTMLElement | null;
      }

      if (!activeBlock) {
        const focusedElement = document.activeElement as HTMLElement | null;
        if (focusedElement && holder.contains(focusedElement)) {
          activeBlock = focusedElement.closest('.ce-block') as HTMLElement | null;
        }
      }

      if (!activeBlock) {
        activeBlock = holder.querySelector<HTMLElement>('.ce-block--focused, .ce-block--selected');
      }

      const blockState = getBlockState(activeBlock);
      const isFocusedBlockEmpty = blockState.text.length === 0;

      const shouldHideForInlineToolbar = hasExpandedSelection || hasVisibleInlineToolbar();
      const shouldHidePlusForFilledBlock = !isFocusedBlockEmpty || blockState.isEditingCustomTool;

      container.classList.toggle('zen-inline-toolbar-active', shouldHideForInlineToolbar);
      container.classList.toggle('zen-hide-plus-for-filled-block', shouldHidePlusForFilledBlock);
    };

    const onSelectionChange = () => syncInlineToolbarState();
    const onMouseUp = () => window.requestAnimationFrame(syncInlineToolbarState);
    const onKeyUp = () => window.requestAnimationFrame(syncInlineToolbarState);
    const onMouseDown = () => window.requestAnimationFrame(syncInlineToolbarState);
    const onFocusOut = () => window.requestAnimationFrame(syncInlineToolbarState);
    const onDocFocusIn = () => window.requestAnimationFrame(syncInlineToolbarState);

    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('focusin', onDocFocusIn, true);
    holder.addEventListener('mouseup', onMouseUp, true);
    holder.addEventListener('keyup', onKeyUp, true);
    holder.addEventListener('mousedown', onMouseDown, true);
    holder.addEventListener('focusout', onFocusOut, true);

    syncInlineToolbarState();

    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('focusin', onDocFocusIn, true);
      holder.removeEventListener('mouseup', onMouseUp, true);
      holder.removeEventListener('keyup', onKeyUp, true);
      holder.removeEventListener('mousedown', onMouseDown, true);
      holder.removeEventListener('focusout', onFocusOut, true);
      container.classList.remove('zen-inline-toolbar-active');
      container.classList.remove('zen-hide-plus-for-filled-block');
    };
  }, [isReady]);

  useEffect(() => {
    if (!isReady || !holderRef.current) return;

    const holder = holderRef.current;

    const removeToolbarTooltips = () => {
      const toolbarButtons = holder.querySelectorAll<HTMLElement>(
        '.ce-toolbar__settings-btn, .ce-toolbar__plus'
      );

      toolbarButtons.forEach((button) => {
        button.removeAttribute('title');
        button.removeAttribute('data-tooltip');
        button.removeAttribute('data-tooltip-position');
      });
    };

    removeToolbarTooltips();

    const observer = new MutationObserver(() => {
      removeToolbarTooltips();
    });

    observer.observe(holder, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['title', 'data-tooltip', 'data-tooltip-position'],
    });

    return () => {
      observer.disconnect();
    };
  }, [isReady]);

  // Update editor when value changes externally
  useEffect(() => {
    if (!isReady || !editorRef.current) return;

    // Skip re-render when this value came from local typing in this editor instance.
    if (value === lastLocalMarkdownRef.current) return;

    const updateEditor = async () => {
      try {
        const currentData = await editorRef.current!.save();
        const currentMarkdown = editorJSToMarkdown(currentData);

        // Only update if the markdown has actually changed
        if (currentMarkdown !== value) {
          await editorRef.current!.render(markdownToEditorJS(value));
        }
      } catch (error) {
        console.error('Error updating editor:', error);
      }
    };

    updateEditor();
  }, [value, isReady]);

  useEffect(() => {
    if (!focusHeadingRequest) return;
    if (!isReady || !holderRef.current) return;
    if (lastHandledFocusRequestTokenRef.current === focusHeadingRequest.token) return;

    lastHandledFocusRequestTokenRef.current = focusHeadingRequest.token;

    const headingNodes = holderRef.current.querySelectorAll<HTMLElement>('.ce-header, .cdx-header');
    if (headingNodes.length === 0) return;

    const targetIndex = Math.max(0, Math.min(focusHeadingRequest.headingIndex, headingNodes.length - 1));
    const targetNode = headingNodes[targetIndex];
    if (!targetNode) return;

    targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    targetNode.focus();
    if (lastActiveHeadingRef.current !== targetIndex) {
      lastActiveHeadingRef.current = targetIndex;
      onActiveHeadingChange?.(targetIndex);
    }

    const originalOutline = targetNode.style.outline;
    const originalOutlineOffset = targetNode.style.outlineOffset;
    targetNode.style.outline = '1px solid #AC8E66';
    targetNode.style.outlineOffset = '2px';
    window.setTimeout(() => {
      targetNode.style.outline = originalOutline;
      targetNode.style.outlineOffset = originalOutlineOffset;
    }, 700);
  }, [focusHeadingRequest, isReady, onActiveHeadingChange]);

  useEffect(() => {
    if (!isReady || !holderRef.current || !onActiveHeadingChange) return;

    const holder = holderRef.current;

    const emitActiveHeadingForTarget = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return;

      const startElement =
        target.nodeType === Node.TEXT_NODE
          ? (target.parentElement as HTMLElement | null)
          : (target as HTMLElement);
      if (!startElement) return;

      const headingNodes = holder.querySelectorAll<HTMLElement>('.ce-header, .cdx-header');
      if (headingNodes.length === 0) return;

      const directHeading = startElement.closest('.ce-header, .cdx-header') as HTMLElement | null;
      if (directHeading) {
        const directIndex = Array.from(headingNodes).indexOf(directHeading);
        if (directIndex >= 0 && lastActiveHeadingRef.current !== directIndex) {
          lastActiveHeadingRef.current = directIndex;
          onActiveHeadingChange(directIndex);
        }
        return;
      }

      // When caret is in normal paragraph/list/code block, map to nearest previous heading.
      const currentBlock = startElement.closest('.ce-block') as HTMLElement | null;
      if (!currentBlock) return;
      const blocks = Array.from(holder.querySelectorAll<HTMLElement>('.ce-block'));
      const blockIndex = blocks.indexOf(currentBlock);
      if (blockIndex < 0) return;

      for (let i = blockIndex; i >= 0; i -= 1) {
        const candidate = blocks[i].querySelector<HTMLElement>('.ce-header, .cdx-header');
        if (!candidate) continue;
        const candidateIndex = Array.from(headingNodes).indexOf(candidate);
        if (candidateIndex >= 0 && lastActiveHeadingRef.current !== candidateIndex) {
          lastActiveHeadingRef.current = candidateIndex;
          onActiveHeadingChange(candidateIndex);
        }
        return;
      }
    };

    const interactionHandler = (event: Event) => emitActiveHeadingForTarget(event.target);

    holder.addEventListener('click', interactionHandler, true);
    holder.addEventListener('keyup', interactionHandler, true);
    holder.addEventListener('mouseup', interactionHandler, true);
    holder.addEventListener('focusin', interactionHandler, true);

    return () => {
      holder.removeEventListener('click', interactionHandler, true);
      holder.removeEventListener('keyup', interactionHandler, true);
      holder.removeEventListener('mouseup', interactionHandler, true);
      holder.removeEventListener('focusin', interactionHandler, true);
    };
  }, [isReady, onActiveHeadingChange]);

  useEffect(() => {
    if (!isReady || !holderRef.current || !containerRef.current || !onActiveHeadingChange) return;

    const holder = holderRef.current;
    const container = containerRef.current;
    let rafId: number | null = null;

    const emitFromScrollPosition = () => {
      // Do not override active heading while user is actively editing/focused
      // inside the editor; caret/focus handlers provide the accurate heading then.
      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement && holder.contains(activeElement)) {
        return;
      }

      const headingNodes = holder.querySelectorAll<HTMLElement>('.ce-header, .cdx-header');
      if (headingNodes.length === 0) return;

      const containerRect = container.getBoundingClientRect();
      const probeY = containerRect.top + 48;

      let bestIndex = 0;
      let bestTop = -Infinity;
      headingNodes.forEach((node, index) => {
        const nodeTop = node.getBoundingClientRect().top;
        if (nodeTop <= probeY && nodeTop > bestTop) {
          bestTop = nodeTop;
          bestIndex = index;
        }
      });

      if (bestTop === -Infinity) {
        bestIndex = 0;
      }

      if (lastActiveHeadingRef.current !== bestIndex) {
        lastActiveHeadingRef.current = bestIndex;
        onActiveHeadingChange(bestIndex);
      }
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        emitFromScrollPosition();
      });
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    emitFromScrollPosition();

    return () => {
      container.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [isReady, onActiveHeadingChange]);

  // Theme-based colors
  const themeStyles = {
    dark: {
      background: '#151515',
      text: '#dbd9d5',
      placeholder: '#dbd9d5',
      border: '#AC8E66',
      BorderStyle: 'dotted',
    },
    light: {
      background: '#D9D4C5',
      text: '#1a1a1a',
      placeholder: '#6b6b6b',
      border: '#AC8E66',
    },
  };

  const colors = themeStyles[theme];

  const className = [
    'zen-block-editor',
    wrapLines ? '' : 'zen-editor-nowrap',
    showLineNumbers ? 'zen-editor-line-numbers' : '',
    `zen-editor-theme-${theme}`,
  ]
    .filter(Boolean)
    .join(' ');

  // Capture-phase listener: fires BEFORE EditorJS handles the click
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !showLineNumbers) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          '.ce-toolbar, .ce-toolbar__plus, .ce-toolbar__settings-btn, .ce-popover, .ce-inline-toolbar, .ct, .zen-overlay-block-menu'
        )
      ) {
        return;
      }

      const rect = el.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      if (clickX > LINE_GUTTER_WIDTH) return;

      e.preventDefault();
      e.stopPropagation();

      const blocks = el.querySelectorAll<HTMLElement>('.ce-block');
      for (const block of blocks) {
        const blockRect = block.getBoundingClientRect();
        if (e.clientY >= blockRect.top && e.clientY <= blockRect.bottom) {
          const editable = block.querySelector<HTMLElement>(
            '.ce-header, .cdx-header, .ce-paragraph, [contenteditable="true"], textarea, input'
          );
          const target = editable ?? block.querySelector<HTMLElement>('.ce-block__content');
          if (!target) break;

          target.focus();

          const selection = window.getSelection();
          if (selection) {
            const range = document.createRange();
            range.selectNodeContents(target);
            selection.removeAllRanges();
            selection.addRange(range);
          }

          block.classList.add('zen-line-jump-target');
          window.setTimeout(() => {
            block.classList.remove('zen-line-jump-target');
          }, 650);
          break;
        }
      }
    };

    el.addEventListener('mousedown', handler, true); // capture phase
    return () => el.removeEventListener('mousedown', handler, true);
  }, [showLineNumbers]);

  const focusBlockByIndex = (index: number, caretPosition: 'start' | 'end' = 'end') => {
    const editor = editorRef.current as any;
    const holder = holderRef.current;
    if (!editor?.blocks || !holder) return;

    const applyFocus = () => {
      const blockCount = editor.blocks.getBlocksCount?.() ?? holder.querySelectorAll('.ce-block').length;
      const clampedIndex = Math.max(0, Math.min(index, Math.max(0, blockCount - 1)));
      lastActiveBlockIndexRef.current = clampedIndex;

      try {
        if (editor.caret?.setToBlock) {
          editor.caret.setToBlock(clampedIndex, caretPosition);
        } else if (editor.blocks?.selectBlock) {
          editor.blocks.selectBlock(clampedIndex);
        }
      } catch {
        // Fallback for custom tools / older APIs
      }

      const blockEl = holder.querySelectorAll<HTMLElement>('.ce-block')[clampedIndex];
      const editable = blockEl?.querySelector<HTMLElement>(
        '.ce-paragraph, .ce-header, .cdx-header, .cdx-quote__text, .cdx-quote__caption, .zen-link-block-tool__input, .zen-image-block-tool__input, .zen-cta-block-tool__input, .zen-code-block-tool__textarea, .zen-table-block-tool__cell, textarea, input, [contenteditable=\"true\"]'
      );
      editable?.focus();
    };

    applyFocus();
    window.requestAnimationFrame(applyFocus);
  };

  const insertBlock = (
    type: string,
    data: Record<string, unknown> = {},
    options?: { replaceCurrentIfEmpty?: boolean }
  ) => {
    const editor = editorRef.current as any;
    if (!editor?.blocks) return;

    const currentInfo = getCurrentBlockInfo();
    let insertIndex: number | undefined;
    const shouldReplaceCurrent =
      !!options?.replaceCurrentIfEmpty && !!currentInfo && !currentInfo.hasContent;

    if (shouldReplaceCurrent && currentInfo) {
      insertIndex = currentInfo.index;
      try {
        editor.blocks.delete(currentInfo.index);
      } catch {
        // fallback to regular insert below
      }
    } else {
      const currentIndex = editor.blocks.getCurrentBlockIndex?.();
      insertIndex = typeof currentIndex === 'number' ? currentIndex + 1 : undefined;
    }

    editor.blocks.insert(type, data, undefined, insertIndex, true);
    const targetIndex =
      typeof insertIndex === 'number'
        ? insertIndex
        : Math.max(0, (editor.blocks.getBlocksCount?.() ?? 1) - 1);
    focusBlockByIndex(targetIndex, type === 'header' ? 'start' : 'end');
    setMenuOpen(false);
  };

  const keepSelection = (event: React.MouseEvent) => {
    event.preventDefault();
  };

  const applyInlineFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    setMenuOpen(false);
  };

  const getViewportPosition = (position: { x: number; y: number }) => {
    const container = containerRef.current;
    if (!container) return position;
    const rect = container.getBoundingClientRect();
    return {
      x: rect.left + position.x,
      y: rect.top + position.y - container.scrollTop,
    };
  };

  const withActiveEditable = (fn: (editable: HTMLElement) => void) => {
    const holder = holderRef.current;
    if (!holder) return;

    const active = document.activeElement as HTMLElement | null;
    const activeBlock =
      active?.closest('.ce-block') ||
      holder.querySelector<HTMLElement>('.ce-block--focused, .ce-block--selected, .ce-block');

    if (!activeBlock) return;

    const editable =
      activeBlock.querySelector<HTMLElement>(
        '.ce-paragraph, .ce-header, .cdx-header, .cdx-quote__text, .cdx-quote__caption, [contenteditable="true"]'
      ) ?? null;

    if (!editable) return;
    fn(editable);
  };

  const setAlign = (align: 'left' | 'center' | 'right') => {
    withActiveEditable((editable) => {
      editable.style.textAlign = align;
    });
    setMenuOpen(false);
  };

  const adjustIndent = (direction: 'in' | 'out') => {
    withActiveEditable((editable) => {
      const current = parseInt(editable.style.paddingLeft || '0', 10) || 0;
      const next = direction === 'in' ? current + 24 : Math.max(0, current - 24);
      editable.style.paddingLeft = `${next}px`;
    });
    setMenuOpen(false);
  };

  const extractBlockText = (block: any): string => {
    if (!block) return '';
    const data = block.data ?? {};
    switch (block.type) {
      case 'header':
      case 'paragraph':
        return String(data.text ?? '').trim();
      case 'quote':
        return String(data.text ?? '').trim();
      case 'list':
        return Array.isArray(data.items) ? data.items.map((i: string) => String(i).trim()).join('\n').trim() : '';
      case 'code':
        return String(data.code ?? '').trim();
      case 'linkBlock':
        return String(data.text ?? data.url ?? '').trim();
      case 'ctaBlock':
        return String(data.text ?? '').trim();
      case 'tableBlock':
        return String(data.table ?? '').trim();
      case 'imageBlock':
        return String(data.alt ?? data.url ?? '').trim();
      default:
        return '';
    }
  };

  const convertCurrentBlock = async (
    target: 'paragraph' | 'header' | 'list' | 'quote',
    options?: { level?: number; listStyle?: 'unordered' | 'ordered' }
  ) => {
    const editor = editorRef.current as any;
    const info = getCurrentBlockInfo();
    if (!editor?.blocks || !editor?.save || !info) return;

    try {
      const output = await editor.save();
      const source = output?.blocks?.[info.index];
      if (!source) return;

      const plainText = extractBlockText(source);
      const lines = plainText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      let type: string = target;
      let data: Record<string, unknown> = {};

      if (target === 'paragraph') {
        type = 'paragraph';
        data = { text: plainText };
      } else if (target === 'header') {
        type = 'header';
        data = { level: options?.level ?? 2, text: plainText };
      } else if (target === 'list') {
        type = 'list';
        data = {
          style: options?.listStyle ?? 'unordered',
          items: lines.length > 0 ? lines : [''],
        };
      } else if (target === 'quote') {
        type = 'quote';
        data = { text: plainText, caption: '', alignment: 'left' };
      }

      editor.blocks.delete(info.index);
      editor.blocks.insert(type, data, undefined, info.index, true);
      focusBlockByIndex(info.index, target === 'header' ? 'start' : 'end');
    } catch {
      // no-op
    }
  };

  const getCurrentBlockInfo = () => {
    const holder = holderRef.current;
    const editor = editorRef.current as any;
    if (!holder || !editor?.blocks) return null;

    const blocks = holder.querySelectorAll<HTMLElement>('.ce-block');
    let index = editor.blocks.getCurrentBlockIndex?.();

    if (typeof index !== 'number' || index < 0) {
      const active = document.activeElement as HTMLElement | null;
      const activeBlock =
        (active?.closest('.ce-block') as HTMLElement | null) ??
        holder.querySelector<HTMLElement>('.ce-block--focused, .ce-block--selected, .ce-block');
      if (activeBlock) {
        const fallbackIndex = Array.from(blocks).indexOf(activeBlock);
        if (fallbackIndex >= 0) {
          index = fallbackIndex;
        }
      }
    }

    if (typeof index !== 'number' || index < 0) {
      const rememberedIndex = lastActiveBlockIndexRef.current;
      if (
        typeof rememberedIndex === 'number' &&
        rememberedIndex >= 0 &&
        rememberedIndex < blocks.length
      ) {
        index = rememberedIndex;
      } else {
        return null;
      }
    }

    lastActiveBlockIndexRef.current = index;
    const blockEl = blocks[index] ?? null;

    let hasContent = false;
    if (blockEl) {
      const textNode = blockEl.querySelector<HTMLElement>(
        '.ce-paragraph, .ce-header, .cdx-header, .cdx-quote__text, .cdx-quote__caption, .zen-link-block-tool__input, .zen-image-block-tool__input, .zen-cta-block-tool__input, .zen-code-block-tool__textarea, .zen-table-block-tool__cell, textarea, input, [contenteditable=\"true\"]'
      );

      const value =
        textNode instanceof HTMLInputElement || textNode instanceof HTMLTextAreaElement
          ? textNode.value
          : (textNode?.textContent ?? '');
      hasContent = value.trim().length > 0 || !!blockEl.querySelector('.zen-image-block-tool, .zen-code-block-tool, .zen-table-block-tool');
    }

    const count = editor.blocks.getBlocksCount?.() ?? blocks.length;
    return { index, count, hasContent };
  };

  const moveCurrentBlock = (direction: 'up' | 'down') => {
    const info = getCurrentBlockInfo();
    const editor = editorRef.current as any;
    if (!info || !editor?.blocks) return;

    const targetIndex = direction === 'up' ? info.index - 1 : info.index + 1;
    if (targetIndex < 0 || targetIndex >= info.count) return;

    try {
      // EditorJS move signature differs by version; this form works in most builds.
      editor.blocks.move(targetIndex, info.index);
      focusBlockByIndex(targetIndex);
    } catch {
      // no-op fallback
    }
  };

  const deleteCurrentBlock = () => {
    const info = getCurrentBlockInfo();
    const editor = editorRef.current as any;
    if (!info || !editor?.blocks) return;
    if (info.count <= 1) return;

    try {
      editor.blocks.delete(info.index);
      focusBlockByIndex(Math.max(0, info.index - 1));
    } catch {
      // no-op fallback
    }
  };

  const duplicateCurrentBlock = async () => {
    const info = getCurrentBlockInfo();
    const editor = editorRef.current as any;
    if (!info || !editor?.save || !editor?.blocks) return;

    try {
      const output = await editor.save();
      const sourceBlock = output?.blocks?.[info.index];
      if (!sourceBlock?.type) return;

      const dataCopy = JSON.parse(JSON.stringify(sourceBlock.data ?? {}));
      editor.blocks.insert(sourceBlock.type, dataCopy, undefined, info.index + 1, true);
      focusBlockByIndex(info.index + 1);
    } catch {
      // no-op fallback
    }
  };

  const currentBlockInfo = getCurrentBlockInfo();
  const hasCurrentBlockContent = !!currentBlockInfo?.hasContent;
  const showInsertSection = !hasCurrentBlockContent;
  const showArrangeSection = !!currentBlockInfo?.hasContent;
  const showConvertSection = hasCurrentBlockContent;
  const canMoveUp = !!currentBlockInfo && currentBlockInfo.index > 0;
  const canMoveDown = !!currentBlockInfo && currentBlockInfo.index < currentBlockInfo.count - 1;
  const canDelete = !!currentBlockInfo && currentBlockInfo.count > 1;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        backgroundColor: colors.background,
        overflow: 'auto',
        height,
        fontFamily: '"IBM Plex Mono", "Courier Prime", ui-monospace, SFMono-Regular, monospace',
        ...(fontSize ? { ['--zen-editor-font-size' as any]: `${fontSize}px` } : {}),
        ['--zen-editor-placeholder' as any]: colors.placeholder,
        ['--color-placeholder' as any]: colors.placeholder,
        ['--color-text-secondary' as any]: colors.placeholder,
        position: 'relative',
        ['--zen-line-gutter' as any]: `${LINE_GUTTER_WIDTH}px`,
      }}
    >
      <div
        ref={holderRef}
        style={{
          padding: 16,
          color: colors.text,
        }}
      />

      <button
        type="button"
       
        className="zen-block-menu-dot"
        data-open={menuOpen ? 'true' : 'false'}
        style={{ left: dotPosition.x, top: dotPosition.y }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setMenuPosition({ x: MENU_LEFT_OFFSET, y: dotPosition.y + 20 });
          setMenuOpen((prev) => !prev);
        }}
        
        aria-expanded={menuOpen}
        aria-label="Open block menu"
      />

      {menuOpen && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="zen-overlay-block-menu"
            style={{
              position: 'fixed',
              left: getViewportPosition(menuPosition).x,
              top: getViewportPosition(menuPosition).y,
            }}
            role="toolbar"
            aria-label="Block tools"
            onMouseDown={keepSelection}
          >
            {showInsertSection && (
              <>
                <div className="zen-overlay-block-menu__section">Absatz</div>
                <div className="zen-overlay-block-menu__grid">
                  <button type="button" onClick={() => insertBlock('paragraph', { text: '' }, { replaceCurrentIfEmpty: true })}>Text</button>
                  <button type="button" onClick={() => insertBlock('header', { level: 1, text: '' }, { replaceCurrentIfEmpty: true })}>H1</button>
                  <button type="button" onClick={() => insertBlock('header', { level: 2, text: '' }, { replaceCurrentIfEmpty: true })}>H2</button>
                  <button type="button" onClick={() => insertBlock('header', { level: 3, text: '' }, { replaceCurrentIfEmpty: true })}>H3</button>
                  <button type="button" onClick={() => insertBlock('quote', { text: '', caption: '', alignment: 'left' }, { replaceCurrentIfEmpty: true })}>Quote</button>
                  <button type="button" onClick={() => insertBlock('delimiter', {}, { replaceCurrentIfEmpty: true })}>---</button>
                  <button type="button" onClick={() => insertBlock('list', { style: 'unordered', items: [''] }, { replaceCurrentIfEmpty: true })}>UL</button>
                  <button type="button" onClick={() => insertBlock('list', { style: 'ordered', items: [''] }, { replaceCurrentIfEmpty: true })}>OL</button>
                </div>
              </>
            )}
             <div className="zen-overlay-block-menu__section">Ausrichten</div>
            <div className="zen-overlay-block-menu__grid 
            zen-overlay-block-menu__grid--icons">
              <button type="button" aria-label="Align left" onClick={() => setAlign('left')}>
                <FontAwesomeIcon icon={faAlignLeft} />
              </button>
              <button type="button" aria-label="Align center" onClick={() => setAlign('center')}>
                <FontAwesomeIcon icon={faAlignCenter} />
              </button>
              <button type="button" aria-label="Align right" onClick={() => setAlign('right')}>
                <FontAwesomeIcon icon={faAlignRight} />
              </button>
              <button type="button" aria-label="Indent" onClick={() => adjustIndent('in')}>
                <FontAwesomeIcon icon={faIndent} />
              </button>
              <button type="button" aria-label="Outdent" onClick={() => adjustIndent('out')}>
                <FontAwesomeIcon icon={faOutdent} />
              </button>
            </div>

            <div className="zen-overlay-block-menu__section">Zeichen</div>
            <div className="zen-overlay-block-menu__grid">
              <button type="button" onClick={() => applyInlineFormat('bold')}>B</button>
              <button type="button" onClick={() => applyInlineFormat('italic')}>I</button>
              <button type="button" onClick={() => applyInlineFormat('underline')}>U</button>
              <button type="button" onClick={() => applyInlineFormat('strikeThrough')}>S</button>
            </div>

            <div className="zen-overlay-block-menu__section">Einfügen</div>
            <div className="zen-overlay-block-menu__grid">
              <button type="button" onClick={() => insertBlock('linkBlock', { text: '', url: '' })}>Link</button>
              <button type="button" onClick={() => insertBlock('imageBlock', { url: '', alt: '' })}>Image</button>
              <button type="button" onClick={() => insertBlock('ctaBlock', { text: '', url: '' })}>CTA</button>
              <button type="button" aria-label="Tabelle" onClick={() => insertBlock('tableBlock', { table: '| Spalte A | Spalte B |\\n|---|---|\\n| Wert 1 | Wert 2 |' })}>
                <FontAwesomeIcon icon={faTable} />
                </button>
              <button type="button" onClick={() => insertBlock('code', { language: 'text', code: '' })}>Code</button>
            </div>

            {showConvertSection && (
              <>
                <div className="zen-overlay-block-menu__section">Konvertieren</div>
                <div className="zen-overlay-block-menu__grid">
                  <button type="button" onClick={() => void convertCurrentBlock('paragraph')}>Text</button>
                  <button type="button" onClick={() => void convertCurrentBlock('header', { level: 1 })}>H1</button>
                  <button type="button" onClick={() => void convertCurrentBlock('header', { level: 2 })}>H2</button>
                  <button type="button" onClick={() => void convertCurrentBlock('header', { level: 3 })}>H3</button>
                  <button type="button" onClick={() => void convertCurrentBlock('list', { listStyle: 'unordered' })}>UL</button>
                  <button type="button" onClick={() => void convertCurrentBlock('list', { listStyle: 'ordered' })}>OL</button>
                  <button type="button" onClick={() => void convertCurrentBlock('quote')}>Quote</button>
                </div>
              </>
            )}

            {showArrangeSection && (
              <>
                <div className="zen-overlay-block-menu__section">Inhalte anordnen</div>
                <div className="zen-overlay-block-menu__grid zen-overlay-block-menu__grid--icons zen-overlay-block-menu__grid--arrange">
                  <button type="button" aria-label="Nach oben" title="Nach oben" disabled={!canMoveUp} onClick={() => moveCurrentBlock('up')}>
                    <FontAwesomeIcon icon={faArrowUp} />
                  </button>
                  <button type="button" aria-label="Nach unten" title="Nach unten" disabled={!canMoveDown} onClick={() => moveCurrentBlock('down')}>
                    <FontAwesomeIcon icon={faArrowDown} />
                  </button>
                  <button type="button" aria-label="Duplizieren" title="Duplizieren" onClick={() => void duplicateCurrentBlock()}>
                    <FontAwesomeIcon icon={faClone} />
                  </button>
                  <button type="button" className="is-danger" aria-label="Löschen" title="Löschen" disabled={!canDelete} onClick={deleteCurrentBlock}>
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
