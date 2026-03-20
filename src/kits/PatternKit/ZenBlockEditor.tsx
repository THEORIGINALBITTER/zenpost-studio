import React, { useCallback, useEffect, useRef, useState } from 'react';
import ZenEngine, { type RuleAnalysisResult, adaptV2ToV1 } from '../../services/zenEngineService';
import { getUserRules, addUserRule, deleteUserRule } from '../../services/userRulesService';
import { getFeedback, recordAccepted, recordIgnored, isSuppressed } from '../../services/userFeedbackService';
import { getEngineProfile, isRuleGroupActive } from '../../services/zenEngineProfileService';
import { recordAnalysisRun } from '../../services/zenEngineStatsService';
import { ZenEngineAboutModal } from './ZenModalSystem/modals/ZenEngineAboutModal';
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
  faRotateLeft,
} from '@fortawesome/free-solid-svg-icons';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Quote from '@editorjs/quote';
import Delimiter from '@editorjs/delimiter';
import Paragraph from '@editorjs/paragraph';
import DragDrop from 'editorjs-drag-drop';
import { ZenDropdown } from './ZenModalSystem/components/ZenDropdown';
import './ZenBlockEditor.css';

// ─── Image Auto-Optimization ──────────────────────────────────────────────────
// Wird beim Einlesen von data:image/ URLs im Editor aufgerufen (Paste, URL-Input).
// Graceful degradation: bei Fehler (Web-Build ohne Tauri) bleibt das Original.
async function autoOptimizeDataUrl(url: string): Promise<string> {
  if (!url.startsWith('data:image/')) return url;
  try {
    const base64 = url.split(',')[1];
    if (!base64) return url;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    // Kleine Bilder (<50 KB) nicht anfassen — kein Optimierungsgewinn
    if (bytes.length < 50_000) return url;

    // Bildinfo lesen — GIFs überspringen (Animation würde zerstört)
    try {
      const info = await ZenEngine.imageInfo(bytes);
      if (info.format.toUpperCase() === 'GIF') return url;
    } catch {
      // imageInfo fehlgeschlagen → trotzdem optimieren
    }

    const result = await ZenEngine.imageOptimize(bytes, {
      max_width: 1920,
      max_height: 1920,
      output_format: 'jpeg',
      quality: 85,
    });
    return result.data_url;
  } catch {
    return url;
  }
}

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

/** Globaler Blob-URL Cache: data:image URL → blob: URL (einmal dekodiert, im RAM gecacht) */
const _imageBlobCache = new Map<string, string>();

function toBlobUrl(dataUrl: string): string {
  if (!dataUrl.startsWith('data:image/')) return dataUrl;
  const cached = _imageBlobCache.get(dataUrl);
  if (cached) return cached;

  // base64 → Uint8Array → Blob → blob: URL
  const [header, b64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const blobUrl = URL.createObjectURL(blob);
  _imageBlobCache.set(dataUrl, blobUrl);
  return blobUrl;
}

class ZenImageBlockTool {
  private data: { url: string; alt: string; width: number };
  private _wrapper: HTMLDivElement | null = null;
  private _outer: HTMLDivElement | null = null;
  private api: any;

  static get toolbox() {
    return {
      title: 'Image',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M5 4a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H5Zm0 2h14a1 1 0 0 1 1 1v7.5l-3.2-3.2a1 1 0 0 0-1.4 0L10 16.7l-2.3-2.3a1 1 0 0 0-1.4 0L4 16.7V7a1 1 0 0 1 1-1Zm0 12l2-2l2.3 2.3a1 1 0 0 0 1.4 0L16 13l4 4H5Zm3-8a2 2 0 1 0 0-4a2 2 0 0 0 0 4Z"/></svg>',
    };
  }

  constructor({ data, api }: { data: { url?: string; alt?: string; width?: number }; api: any }) {
    this.data = { url: data?.url ?? '', alt: data?.alt ?? '', width: data?.width ?? 100 };
    this.api = api;
  }

  render() {
    const outer = document.createElement('div');
    outer.className = 'zen-image-block-tool';
    this._outer = outer;

    if (!this.data.url) {
      // Leeres Block — URL-Input anzeigen
      outer.appendChild(this._buildUrlInput(outer));
      return outer;
    }

    outer.appendChild(this._buildPreview(outer));
    return outer;
  }

  private _buildUrlInput(outer: HTMLDivElement): HTMLInputElement {
    const urlInput = document.createElement('input');
    urlInput.className = 'cdx-input zen-image-block-tool__input';
    urlInput.placeholder = 'Image URL (https://...)';
    urlInput.value = '';
    urlInput.type = 'url';
    urlInput.addEventListener('change', async () => {
      const raw = urlInput.value.trim();
      this.data.url = raw.startsWith('data:image/') ? await autoOptimizeDataUrl(raw) : raw;
      if (this.data.url) {
        outer.innerHTML = '';
        outer.appendChild(this._buildPreview(outer));
      }
    });
    return urlInput;
  }

  private _buildPreview(_outer: HTMLDivElement): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'zen-image-block-preview-container';

    // Bild-Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'zen-image-block-preview';
    wrapper.style.width = `${this.data.width}%`;
    wrapper.dataset.width = String(this.data.width);
    wrapper.dataset.sourceType = this.data.url.startsWith('data:image/') ? 'data-url' : 'external-url';
    wrapper.dataset.sourceUrlLength = String(this.data.url.length);
    this._wrapper = wrapper;

    // URL-Editor (per Button ein-/ausblenden)
    const urlOverlay = document.createElement('div');
    urlOverlay.className = 'zen-image-block-url';
    const urlInput = document.createElement('input');
    urlInput.className = 'zen-image-block-url-input';
    urlInput.type = 'url';
    urlInput.value = this.data.url;
    urlInput.placeholder = 'Image URL (https://...)';
    urlInput.addEventListener('change', async () => {
      const raw = urlInput.value.trim();
      this.data.url = raw.startsWith('data:image/') ? await autoOptimizeDataUrl(raw) : raw;
      if (this._outer) {
        this._outer.innerHTML = '';
        this._outer.appendChild(this._buildPreview(this._outer));
      }
    });
    urlOverlay.appendChild(urlInput);

    // Actions row (Link / Delete)
    const actions = document.createElement('div');
    actions.className = 'zen-image-block-actions';

    const urlToggleBtn = document.createElement('button');
    urlToggleBtn.type = 'button';
    urlToggleBtn.className = 'zen-image-block-action-btn zen-image-block-url-toggle';
    urlToggleBtn.setAttribute('aria-label', 'Bild-URL bearbeiten');
    urlToggleBtn.textContent = 'Link ändern';
    urlToggleBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      container.classList.toggle('zen-image-block-show-url');
      if (container.classList.contains('zen-image-block-show-url')) {
        urlInput.focus({ preventScroll: true });
        urlInput.select();
      }
    });

    // Delete-Button (X)
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'zen-image-block-action-btn zen-image-block-delete';
    deleteBtn.setAttribute('aria-label', 'Bild entfernen');
    deleteBtn.textContent = 'Bild löschen';
    deleteBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const blockEl = this._outer?.closest('.ce-block') as HTMLElement | null;
      const parent = blockEl?.parentElement ?? null;

      if (this.api?.blocks?.delete) {
        let index = -1;
        if (parent && blockEl) {
          const blocks = parent.querySelectorAll<HTMLElement>('.ce-block');
          index = Array.from(blocks).indexOf(blockEl);
        }
        if (index >= 0) {
          this.api.blocks.delete(index);
          return;
        }
        const currentIndex = this.api.blocks.getCurrentBlockIndex?.();
        if (typeof currentIndex === 'number' && currentIndex >= 0) {
          this.api.blocks.delete(currentIndex);
          return;
        }
      }

      if (parent && blockEl) {
        parent.removeChild(blockEl);
      }
    });

    const isOpfs = this.data.url.startsWith('opfs://');
    const isLocalFile = this.data.url.startsWith('/') || this.data.url.startsWith('asset://');

    if (isOpfs) {
      // Web: OPFS → Blob URL
      const img = document.createElement('img');
      img.className = 'zen-image-block-img';
      img.draggable = false;
      img.style.width = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.setAttribute('aria-label', this.data.alt);
      void (async () => {
        try {
          const { loadOpfsImageAsBlobUrl } = await import('../../utils/editorImageCompression');
          img.src = await loadOpfsImageAsBlobUrl(this.data.url);
        } catch {
          img.alt = `Bild nicht gefunden: ${this.data.url}`;
        }
      })();
      wrapper.appendChild(img);
    } else if (isLocalFile) {
      // Tauri: absoluter Pfad oder asset:// → readFile → Blob URL
      const img = document.createElement('img');
      img.className = 'zen-image-block-img';
      img.draggable = false;
      img.style.width = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.setAttribute('aria-label', this.data.alt);
      const filePath = this.data.url.startsWith('asset://')
        ? decodeURIComponent(this.data.url.replace(/^asset:\/\/localhost\//, ''))
        : this.data.url;
      void (async () => {
        try {
          const { readFile } = await import('@tauri-apps/plugin-fs');
          const bytes = await readFile(filePath);
          const ext = filePath.split('.').pop()?.toLowerCase() ?? 'png';
          const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
            : ext === 'webp' ? 'image/webp'
            : ext === 'gif' ? 'image/gif'
            : 'image/png';
          img.src = URL.createObjectURL(new Blob([bytes], { type: mime }));
        } catch {
          img.alt = `Bild nicht gefunden: ${filePath}`;
        }
      })();
      wrapper.appendChild(img);
    } else {
      // Canvas statt <img> für data: und https: URLs — Bitmap wird einmal gezeichnet,
      // Resize = reiner CSS/GPU-Scale → kein WebKit-Pixel-Repaint → kein Cursor-Reset
      const canvas = document.createElement('canvas');
      canvas.className = 'zen-image-block-img';
      canvas.draggable = false;
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      canvas.style.display = 'block';
      canvas.setAttribute('aria-label', this.data.alt);

      // WKWebView Bug: setting canvas.width while in a MutationObserver-watched DOM
      // fires the callback with a single MutationRecord instead of MutationRecord[]
      // which crashes EditorJS's detectToolRootChange(e) → e.forEach is not a function.
      // Fix: detach canvas before changing dimensions (not in DOM → no observer fires), re-attach.
      const tempImg = new Image();
      tempImg.onload = () => {
        const parent = canvas.parentNode;
        const sibling = canvas.nextSibling;
        parent?.removeChild(canvas);

        // Cap at 800px — reduces memory (Mobile images 1800px+ → 9.7MB RAM → 800px → 1.9MB)
        const MAX = 800;
        const scale = Math.min(1, MAX / Math.max(tempImg.naturalWidth, 1));
        canvas.width = Math.round(tempImg.naturalWidth * scale);
        canvas.height = Math.round(tempImg.naturalHeight * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);

        canvas.style.aspectRatio = `${canvas.width} / ${canvas.height}`;

        if (parent) {
          if (sibling) parent.insertBefore(canvas, sibling);
          else parent.appendChild(canvas);
        }
      };
      tempImg.src = toBlobUrl(this.data.url);
      wrapper.appendChild(canvas);
    }
    wrapper.appendChild(urlOverlay);

    // Größen-Badge auf dem Bild (nur Anzeige, kein Klick)
    const badge = document.createElement('span');
    badge.className = 'zen-image-block-size-badge';
    badge.textContent = `${this.data.width}%`;
    wrapper.appendChild(badge);

    container.appendChild(wrapper);
    actions.appendChild(urlToggleBtn);
    actions.appendChild(deleteBtn);
    container.appendChild(actions);
    container.appendChild(urlOverlay);

    // Alt-Text (kein Cursor-Konflikt — nur Text-Input)
    const altInput = document.createElement('input');
    altInput.className = 'zen-image-block-alt';
    altInput.placeholder = 'Bildbeschreibung (optional)';
    altInput.value = this.data.alt;
    altInput.addEventListener('input', () => { this.data.alt = altInput.value; });

    // EditorJS sucht intern via querySelectorAll('input') das erste Input im Block
    // und ruft .focus() darauf auf → Browser scrollt zum altInput am Block-Ende → Sprung.
    // Fix: focus()-Methode auf dieser Instanz überschreiben und Scroll-Position
    // via requestAnimationFrame wiederherstellen (preventScroll wird in WKWebView ignoriert).
    altInput.focus = (options?: FocusOptions) => {
      // Den Editor-Scroll-Container gezielt per data-Attribut finden —
      // kein blindes getComputedStyle-Traversal das den falschen Container trifft.
      const scrollEl = altInput.closest<HTMLElement>('[data-zen-scroll="editor"]');
      const savedTop = scrollEl?.scrollTop ?? 0;
      HTMLElement.prototype.focus.call(altInput, options ?? {});
      if (scrollEl) {
        const el = scrollEl;
        requestAnimationFrame(() => { el.scrollTop = savedTop; });
      }
    };

    container.appendChild(altInput);

    return container;
  }

  /** EditorJS Settings-Toolbar — erscheint im ⚙️ Menü, außerhalb des Block-Contents */
  renderSettings() {
    const wrapper = document.createElement('div');
    wrapper.className = 'zen-image-block-settings';

    const labelRow = document.createElement('div');
    labelRow.className = 'zen-image-block-slider-row';

    const label = document.createElement('span');
    label.className = 'zen-image-block-settings-label';
    label.textContent = 'Bildgröße';

    const valueLabel = document.createElement('span');
    valueLabel.className = 'zen-image-block-settings-label';
    valueLabel.textContent = `${this.data.width}%`;

    labelRow.appendChild(label);
    labelRow.appendChild(valueLabel);
    wrapper.appendChild(labelRow);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '10';
    slider.max = '100';
    slider.step = '5';
    slider.value = String(this.data.width);
    slider.className = 'zen-image-block-slider';

    const applyWidth = (pct: number) => {
      this.data.width = pct;
      valueLabel.textContent = `${pct}%`;
      if (this._wrapper) {
        this._wrapper.style.width = `${pct}%`;
        this._wrapper.dataset.width = String(pct);
        const badge = this._wrapper.querySelector<HTMLSpanElement>('.zen-image-block-size-badge');
        if (badge) badge.textContent = `${pct}%`;
      }
    };

    slider.addEventListener('input', () => applyWidth(Number(slider.value)));

    wrapper.appendChild(slider);
    return wrapper;
  }

  save(block: HTMLDivElement) {
    const preview = block.querySelector<HTMLElement>('.zen-image-block-preview');
    const altEl = block.querySelector<HTMLInputElement>('.zen-image-block-alt');
    return {
      url: this.data.url,
      alt: altEl?.value ?? this.data.alt,
      width: preview?.dataset.width ? Number(preview.dataset.width) : this.data.width,
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

    const renderDropdown = (currentLanguage: string) => {
      this.dropdownRoot!.render(
        React.createElement(ZenDropdown, {
          value: currentLanguage,
          onChange: (value: string) => {
            this.data.language = value;
            renderDropdown(value);
          },
          options: ZenCodeBlockTool.LANGUAGE_OPTIONS,
          variant: 'compact',
          fullWidth: false,
          theme: 'dark',
        })
      );
    };

    renderDropdown(this.data.language);

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

class ZenMarkerInlineTool {
  private api: any;
  private button: HTMLButtonElement | null = null;
  private actionsRoot: HTMLDivElement | null = null;
  private selectedColor = 'yellow';

  private static readonly MARK_CLASS = 'zen-inline-marker';
  private static readonly COLORS: Array<{ key: string; label: string; value: string }> = [
    { key: 'yellow', label: 'Gelb', value: '#fff2a8' },
    { key: 'green', label: 'Grun', value: '#bff6c3' },
    { key: 'blue', label: 'Blau', value: '#c8e7ff' },
    { key: 'rose', label: 'Rose', value: '#ffd4de' },
  ];

  static get isInline() {
    return true;
  }

  static get title() {
    return 'Marker';
  }

  static get sanitize() {
    return {
      mark: {
        class: true,
        style: true,
        'data-zen-marker': true,
      },
    };
  }

  constructor({ api }: { api: any }) {
    this.api = api;
  }

  private getCurrentSelectionRange(): Range | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    return selection.getRangeAt(0);
  }

  private findMarkerTag() {
    return this.api.selection.findParentTag('MARK', ZenMarkerInlineTool.MARK_CLASS) as HTMLElement | null;
  }

  private unwrap(mark: HTMLElement) {
    const parent = mark.parentNode;
    if (!parent) return;

    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
  }

  private applyMark(range: Range, colorKey: string) {
    const color = ZenMarkerInlineTool.COLORS.find((entry) => entry.key === colorKey)?.value
      ?? ZenMarkerInlineTool.COLORS[0].value;
    const mark = document.createElement('mark');
    mark.classList.add(ZenMarkerInlineTool.MARK_CLASS);
    mark.dataset.zenMarker = colorKey;
    mark.style.backgroundColor = color;
    mark.style.color = 'inherit';
    mark.style.padding = '0 0.12em';
    mark.style.borderRadius = '0.22em';

    try {
      range.surroundContents(mark);
    } catch {
      const fragment = range.extractContents();
      mark.appendChild(fragment);
      range.insertNode(mark);
    }

    this.api.selection.expandToTag(mark);
  }

  private applyColorFromSelection() {
    const range = this.getCurrentSelectionRange();
    if (!range || range.collapsed) return;

    const marker = this.findMarkerTag();
    if (marker) {
      marker.dataset.zenMarker = this.selectedColor;
      marker.style.backgroundColor =
        ZenMarkerInlineTool.COLORS.find((entry) => entry.key === this.selectedColor)?.value
        ?? ZenMarkerInlineTool.COLORS[0].value;
      marker.style.color = 'inherit';
      marker.style.padding = '0 0.12em';
      marker.style.borderRadius = '0.22em';
      return;
    }

    this.applyMark(range, this.selectedColor);
  }

  render() {
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add(this.api.styles.inlineToolButton);
    button.classList.add('zen-marker-inline-tool');
    button.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="m4 17.25V21h3.75L19.06 9.69l-3.75-3.75L4 17.25Zm2.92 2.33H6v-.92l9.31-9.31.92.92-9.31 9.31ZM20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.3a1 1 0 0 0-1.42 0l-1.13 1.13l3.75 3.75l1.14-1.14Z"/></svg>';
    this.button = button;
    return button;
  }

  renderActions() {
    const root = document.createElement('div');
    root.className = 'zen-marker-palette';

    ZenMarkerInlineTool.COLORS.forEach((entry) => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'zen-marker-palette__swatch';
      swatch.dataset.color = entry.key;
      swatch.setAttribute('aria-label', `${entry.label} Marker`);
      swatch.style.backgroundColor = entry.value;
      if (entry.key === this.selectedColor) {
        swatch.classList.add('zen-marker-palette__swatch--active');
      }
      swatch.addEventListener('mousedown', (event) => event.preventDefault());
      swatch.addEventListener('click', (event) => {
        event.preventDefault();
        this.selectedColor = entry.key;
        this.actionsRoot
          ?.querySelectorAll('.zen-marker-palette__swatch')
          .forEach((el) => el.classList.remove('zen-marker-palette__swatch--active'));
        swatch.classList.add('zen-marker-palette__swatch--active');
        this.applyColorFromSelection();
      });
      root.appendChild(swatch);
    });

    this.actionsRoot = root;
    return root;
  }

  surround(range: Range) {
    if (!range || range.collapsed) return;

    const marker = this.findMarkerTag();
    if (marker) {
      this.unwrap(marker);
      return;
    }

    this.applyMark(range, this.selectedColor);
  }

  checkState() {
    const marker = this.findMarkerTag();
    if (!this.button) return;
    this.button.classList.toggle(this.api.styles.inlineToolButtonActive, !!marker);
    if (!marker) return;

    const markerColor = marker.dataset.zenMarker;
    if (markerColor && ZenMarkerInlineTool.COLORS.some((entry) => entry.key === markerColor)) {
      this.selectedColor = markerColor;
      this.actionsRoot
        ?.querySelectorAll('.zen-marker-palette__swatch')
        .forEach((el) => el.classList.remove('zen-marker-palette__swatch--active'));
      const active = this.actionsRoot?.querySelector<HTMLElement>(`.zen-marker-palette__swatch[data-color="${markerColor}"]`);
      active?.classList.add('zen-marker-palette__swatch--active');
    }
  }
}

interface ZenBlockEditorProps {
  value: string; // Markdown input
  onChange: (value: string) => void; // Markdown output
  onRegisterContentSnapshotGetter?: (getter: (() => Promise<string>) | null) => void;
  onRegisterImageInserter?: (inserter: ((images: Array<{ url: string; alt?: string }>) => void) | null) => void;
  headingRequest?: { level: number; token: number } | null;
  placeholder?: string;
  height?: string;
  fontSize?: number;
  wrapLines?: boolean;
  showLineNumbers?: boolean;
  theme?: EditorTheme;
  focusHeadingRequest?: { headingIndex: number; token: number } | null;
  onActiveHeadingChange?: (headingIndex: number) => void;
  onKeywordsChange?: (keywords: string[]) => void;
}

// ─── ZenLearnForm ─────────────────────────────────────────────────────────────

interface ZenLearnFormProps {
  theme: 'dark' | 'light';
  colors: { border: string; placeholder: string; text: string; background: string };
  onSave: (pattern: string, suggestion: string, replacements: string[]) => void;
  /** Wird gesetzt wenn ein Hinweis-"+" angeklickt wird — öffnet und vorbefüllt das Formular. */
  prefill?: { pattern: string; suggestion: string; _key: number } | null;
}

function ZenLearnForm({ theme, colors, onSave, prefill }: ZenLearnFormProps) {
  const [open, setOpen] = useState(false);
  const [pattern, setPattern] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [repsRaw, setRepsRaw] = useState('');

  // Öffnet das Formular und füllt es vor, wenn prefill gesetzt wird
  useEffect(() => {
    if (!prefill) return;
    setPattern(prefill.pattern);
    setSuggestion(prefill.suggestion);
    setRepsRaw('');
    setOpen(true);
  }, [prefill?._key]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    const p = pattern.trim();
    const s = suggestion.trim() || 'Benutzerdefinierte Regel';
    if (!p) return;
    const reps = repsRaw.split(',').map(r => r.trim()).filter(Boolean);
    onSave(p, s, reps);
    setPattern(''); setSuggestion(''); setRepsRaw(''); setOpen(false);
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: 10,
    background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    color: colors.text,
    padding: '3px 8px',
    outline: 'none',
    width: '100%',
  };

  return (
    <div style={{ borderTop: `1px solid ${colors.border}`, padding: '6px 14px' }}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 9,
            background: 'transparent',
            border: '1px dashed rgba(172,142,102,0.4)',
            borderRadius: 4,
            color: 'rgba(172,142,102,0.7)',
            cursor: 'pointer',
            padding: '2px 10px',
            letterSpacing: '0.03em',
            width: '100%',
            textAlign: 'left',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#AC8E66';
            (e.currentTarget as HTMLButtonElement).style.color = '#AC8E66';
            (e.currentTarget as HTMLButtonElement).style.background =
              theme === 'dark' ? 'rgba(172,142,102,0.08)' : 'rgba(172,142,102,0.06)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(172,142,102,0.4)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(172,142,102,0.7)';
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          + Wort / Phrase lernen
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              autoFocus
              value={pattern}
              onChange={e => setPattern(e.target.value)}
              placeholder="Wort oder Phrase"
              style={{ ...inputStyle, flex: 1 }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <input
              value={suggestion}
              onChange={e => setSuggestion(e.target.value)}
              placeholder="Hinweis (optional)"
              style={{ ...inputStyle, flex: 2 }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              value={repsRaw}
              onChange={e => setRepsRaw(e.target.value)}
              placeholder="Ersatz-Chips, komma-getrennt (optional)"
              style={{ ...inputStyle, flex: 1 }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <button
              type="button" onClick={handleSave}
              style={{
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, padding: '3px 10px',
                borderRadius: 4, border: '1px solid #AC8E66',
                background: '#AC8E66', color: '#fff', cursor: 'pointer', flexShrink: 0,
              }}
            >
              Speichern
            </button>
            <button
              type="button" onClick={() => setOpen(false)}
              style={{
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, padding: '3px 8px',
                borderRadius: 4, border: `1px solid ${colors.border}`,
                background: 'transparent', color: colors.placeholder, cursor: 'pointer', flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ZenBlockEditor ───────────────────────────────────────────────────────────

/**
 * ZenBlockEditor - Block-based editor powered by EditorJS
 * Allows users to either type freely or use block-based editing with formatting
 */
export const ZenBlockEditor = ({
  value,
  onChange,
  onRegisterContentSnapshotGetter,
  onRegisterImageInserter,
  headingRequest = null,
  placeholder = 'Schreibe  was du denkst...',
  height = '400px',
  fontSize,
  wrapLines = true,
  showLineNumbers = true,
  theme = 'light',
  focusHeadingRequest = null,
  onActiveHeadingChange,
  onKeywordsChange,
}: ZenBlockEditorProps) => {
  const LARGE_INLINE_IMAGE_SAFE_MODE_LENGTH = 900_000;
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
  const [overlayMenuHeight, setOverlayMenuHeight] = useState(420);
  const overlayMenuRef = useRef<HTMLDivElement | null>(null);
  const lastActiveHeadingRef = useRef<number | null>(null);
  const lastActiveBlockIndexRef = useRef<number | null>(null);
  const toolbarActionBlockIndexRef = useRef<number | null>(null);
  const lastHandledFocusRequestTokenRef = useRef<number | null>(null);
  const lastHandledHeadingRequestTokenRef = useRef<number | null>(null);
  type ImageResizeCommitHandle = number | ReturnType<typeof globalThis.setTimeout>;
  const imageResizeCommitHandleRef = useRef<ImageResizeCommitHandle | null>(null);
  const imageResizeCommitIsIdleRef = useRef(false);
  const blockTypeObserverRef = useRef<MutationObserver | null>(null);
  const lastLocalMarkdownRef = useRef<string>(value);

  // Stats sind jetzt Teil von contentIntel — kein separater IPC-Call mehr nötig

  // ZenEngine Analyse (Füllwörter, Passive Voice, etc.) — debounced, separater Timer
  const [analyzeResult, setAnalyzeResult] = useState<RuleAnalysisResult | null>(null);
  const [showHintsPanel, setShowHintsPanel] = useState(false);
  const [learnPrefill, setLearnPrefill] = useState<{ pattern: string; suggestion: string; ruleId: string; _key: number } | null>(null);
  const learnPrefillKeyRef = useRef(0);
  const analyzeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalHintCount = analyzeResult?.suggestions.length ?? 0;

  // Undo-Stack — generell für alle Editor-Änderungen (Tippen, Löschen, Einfügen, …)
  const undoStackRef = useRef<string[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const typingStartSnapshotRef = useRef<string | null>(null); // Zustand VOR der aktuellen Tipp-Session
  const undoCommitDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Find & Replace (Cmd+F / Ctrl+F) ───────────────────────────────────────
  const [showSearch, setShowSearch] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [searchMatchCount, setSearchMatchCount] = useState(0);
  const [searchIndex, setSearchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const searchMatchRangesRef = useRef<Range[]>([]);

  const clearSearchHighlight = useCallback(() => {
    if (typeof CSS !== 'undefined' && CSS.highlights) {
      CSS.highlights.delete('zen-search');
      CSS.highlights.delete('zen-search-active');
    }
  }, []);

  const buildSearchRanges = useCallback((query: string): Range[] => {
    if (!holderRef.current || !query) return [];
    const ranges: Range[] = [];
    const needle = query.toLowerCase();
    const walker = document.createTreeWalker(holderRef.current, NodeFilter.SHOW_TEXT);
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null) !== null) {
      const text = node.textContent ?? '';
      const lower = text.toLowerCase();
      let pos = 0;
      while (true) {
        const idx = lower.indexOf(needle, pos);
        if (idx === -1) break;
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + needle.length);
        ranges.push(range);
        pos = idx + needle.length;
      }
    }
    return ranges;
  }, []);

  const applySearchHighlight = useCallback((ranges: Range[], activeIndex: number) => {
    if (typeof CSS === 'undefined' || !CSS.highlights) return;
    if (ranges.length === 0) {
      CSS.highlights.delete('zen-search');
      CSS.highlights.delete('zen-search-active');
      return;
    }
    CSS.highlights.set('zen-search', new Highlight(...ranges));
    if (ranges[activeIndex]) {
      CSS.highlights.set('zen-search-active', new Highlight(ranges[activeIndex]));
      ranges[activeIndex].startContainer.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const runSearch = useCallback((query: string, newIndex?: number) => {
    const ranges = buildSearchRanges(query);
    searchMatchRangesRef.current = ranges;
    const idx = newIndex !== undefined ? newIndex : 0;
    setSearchMatchCount(ranges.length);
    setSearchIndex(idx);
    applySearchHighlight(ranges, idx);
  }, [buildSearchRanges, applySearchHighlight]);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setShowReplace(false);
    setSearchQuery('');
    setReplaceQuery('');
    setSearchMatchCount(0);
    setSearchIndex(0);
    clearSearchHighlight();
    searchMatchRangesRef.current = [];
  }, [clearSearchHighlight]);

  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const replaceCurrentMatch = useCallback(() => {
    const ranges = searchMatchRangesRef.current;
    if (ranges.length === 0) return;
    const target = ranges[searchIndex];
    if (!target) return;
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(target.cloneRange());
    document.execCommand('insertText', false, replaceQuery);
    setTimeout(() => {
      runSearch(searchQuery, Math.min(searchIndex, Math.max(0, searchMatchRangesRef.current.length - 1)));
    }, 80);
  }, [searchIndex, replaceQuery, searchQuery, runSearch]);

  const replaceAllMatches = useCallback(async () => {
    if (searchMatchCount === 0 || !searchQuery || !editorRef.current) return;
    const currentMarkdown = lastLocalMarkdownRef.current ?? '';
    const regex = new RegExp(escapeRegex(searchQuery), 'gi');
    const newMarkdown = currentMarkdown.replace(regex, replaceQuery);
    if (newMarkdown === currentMarkdown) return;
    const stack = undoStackRef.current;
    if (stack.length === 0 || stack[stack.length - 1] !== currentMarkdown) {
      stack.push(currentMarkdown);
      if (stack.length > 50) stack.shift();
      setUndoCount(stack.length);
    }
    try {
      await editorRef.current.render(markdownToEditorJS(newMarkdown));
      lastLocalMarkdownRef.current = newMarkdown;
      onChangeRef.current(newMarkdown);
      setTimeout(() => runSearch(searchQuery, 0), 80);
    } catch { /* no-op */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchMatchCount, searchQuery, replaceQuery, runSearch]);

  const searchNext = useCallback(() => {
    const count = searchMatchRangesRef.current.length;
    if (count === 0) return;
    const next = (searchIndex + 1) % count;
    setSearchIndex(next);
    applySearchHighlight(searchMatchRangesRef.current, next);
  }, [searchIndex, applySearchHighlight]);

  const searchPrev = useCallback(() => {
    const count = searchMatchRangesRef.current.length;
    if (count === 0) return;
    const prev = (searchIndex - 1 + count) % count;
    setSearchIndex(prev);
    applySearchHighlight(searchMatchRangesRef.current, prev);
  }, [searchIndex, applySearchHighlight]);

  // Cmd+F / Ctrl+F → open search; Escape → close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = /mac/i.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key === 'f') {
        e.preventDefault();
        e.stopPropagation();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
        return;
      }
      if (e.key === 'Escape' && showSearch) {
        e.preventDefault();
        e.stopPropagation();
        closeSearch();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [showSearch, closeSearch]);

  // Cache user rules JSON — only re-serialize when rules actually change
  const userRulesJsonRef = useRef<string>('');
  const getOrUpdateUserRulesJson = useCallback(() => {
    const rules = getUserRules();
    const json = rules.length > 0 ? JSON.stringify(rules) : '';
    userRulesJsonRef.current = json;
    return json;
  }, []);

  const runAnalysis = useCallback(async (text: string) => {
    try {
      const cleanText = text.replace(/<\/?mark\b[^>]*>/gi, '');
      const userRules = getUserRules();
      const rulesJson = userRules.length > 0 ? JSON.stringify(userRules) : '';
      const raw = adaptV2ToV1(await ZenEngine.analyzeTextV2(cleanText, rulesJson));

      // Enrich user_rule matches with full replacement data from localStorage
      // (V2 only stores the first replacement; localStorage has the full array)
      const userRuleMap = new Map(userRules.map(r => [r.pattern.trim().toLowerCase(), r]));
      const result = {
        ...raw,
        suggestions: raw.suggestions.map(s => {
          if (!s.is_user_rule) return s;
          const ur = userRuleMap.get(s.matched_text.trim().toLowerCase());
          return ur ? { ...s, replacements: ur.replacements, suggestion: ur.suggestion || s.suggestion } : s;
        }),
      };

      // Profil + Feedback Filter: deaktivierte Regelgruppen und supprimierte Regeln ausblenden
      const profile = getEngineProfile();
      const feedback = getFeedback();
      const filtered = {
        ...result,
        suggestions: result.suggestions.filter(s =>
          isRuleGroupActive(s.rule, profile) &&
          (s.is_user_rule || !isSuppressed(s.rule, s.matched_text, feedback))
        ),
      };
      setAnalyzeResult(filtered);
      if (filtered.suggestions.length === 0) setShowHintsPanel(false);
      // Regel-Statistik aufzeichnen (alle Treffer vor dem Filter, damit auch stille Regeln gezählt werden)
      const hitMap: Record<string, number> = {};
      for (const s of result.suggestions) {
        hitMap[s.rule] = (hitMap[s.rule] ?? 0) + 1;
      }
      recordAnalysisRun(hitMap);
    } catch {
      setAnalyzeResult(null);
      setShowHintsPanel(false);
    }
  }, []);

  const updateAnalysis = useCallback((text: string) => {
    if (analyzeDebounceRef.current) clearTimeout(analyzeDebounceRef.current);
    analyzeDebounceRef.current = setTimeout(() => runAnalysis(text), 1200);
  }, [runAnalysis]);

  const handleAutofix = useCallback(async () => {
    const cleanText = value.replace(/<mark[^>]*zen-inline-marker[^>]*>([\s\S]*?)<\/mark>/g, '$1');
    try {
      const result = await ZenEngine.autofixTextV2(cleanText, getOrUpdateUserRulesJson());
      if (result.fix_count > 0) {
        onChange(result.text);
        runAnalysis(result.text);
      }
    } catch { /* ignore */ }
  }, [value, onChange, getOrUpdateUserRulesJson, runAnalysis]);
  useEffect(() => {
    updateAnalysis(value);
    return () => { if (analyzeDebounceRef.current) clearTimeout(analyzeDebounceRef.current); };
  }, [value, updateAnalysis]);

  // ── Content Intelligence ───────────────────────────────────────────────────
  interface ContentIntel {
    readingTime: number;       // minutes
    lix: number;               // LIX readability score
    lixLabel: string;          // human label
    avgSentenceLen: number;    // words per sentence
    keywords: Array<{ word: string; freq: number }>;
    imageCount: number;
    missingAltCount: number;   // images without alt text
    headlineCount: number;
    multipleH1: boolean;
    wordCount: number;
    charCount: number;
  }
  const [contentIntel, setContentIntel] = useState<ContentIntel | null>(null);
  const [showIntelPanel, setShowIntelPanel] = useState(false);
  const [showEngineAbout, setShowEngineAbout] = useState(false);
  const intelDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stop words as module-level constant — not recreated on every render
  const STOP_WORDS = useRef(new Set(['der', 'die', 'das', 'und', 'in', 'ist', 'ein', 'eine', 'auf', 'mit', 'für', 'von', 'zu', 'an', 'im', 'den', 'dem', 'des', 'als', 'auch', 'es', 'sich', 'er', 'sie', 'wir', 'ich', 'du', 'man', 'hat', 'haben', 'sein', 'wird', 'werden', 'sind', 'war', 'nicht', 'noch', 'aber', 'oder', 'wenn', 'dann', 'so', 'wie', 'dass', 'bei', 'nach', 'aus', 'vor', 'über', 'mehr', 'the', 'and', 'or', 'is', 'are', 'was', 'be', 'to', 'of', 'in', 'for', 'on', 'with', 'a', 'an', 'this', 'that', 'it', 'by', 'at', 'we', 'can', 'have', 'has', 'from', 'your', 'you', 'will', 'all', 'one', 'which', 'their', 'there', 'been', 'they', 'than', 'its', 'were', 'each', 'use', 'how', 'about', 'would', 'make', 'our', 'into', 'than', 'then', 'these', 'those', 'some', 'such']));

  useEffect(() => {
    if (intelDebounceRef.current) clearTimeout(intelDebounceRef.current);
    if (!value) { setContentIntel(null); return; }

    intelDebounceRef.current = setTimeout(() => {
      // Strip base64 images for char count (otherwise inflated by MB of data)
      const valueForCount = value.replace(/!\[([^\]]*)\]\(data:[^;]+;base64,[A-Za-z0-9+/=\n]+\)/g, '![$1]()');
      const charCount = valueForCount.replace(/^---\n[\s\S]*?\n---\n?/, '').length;

      // Strip HTML + markdown syntax for text analysis
      const plain = valueForCount
        .replace(/<[^>]+>/g, ' ')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .replace(/[*_`~]/g, '')
        .replace(/^\s*[-*+]\s/gm, '')
        .replace(/^\s*\d+\.\s/gm, '');

      const words = plain.split(/\s+/).filter(Boolean);
      const sentences = plain.split(/[.!?]+/).filter(s => s.trim().length > 2);
      const wc = words.length;
      const sc = Math.max(sentences.length, 1);
      const avgSentenceLen = Math.round(wc / sc);
      const longWords = words.filter(w => w.replace(/[^a-zA-ZäöüÄÖÜß]/g, '').length > 6).length;
      const lix = Math.round(avgSentenceLen + (longWords * 100 / Math.max(wc, 1)));
      const lixLabel = lix < 30 ? 'Sehr leicht' : lix < 40 ? 'Leicht' : lix < 50 ? 'Mittel' : lix < 60 ? 'Schwer' : 'Sehr schwer';
      const readingTime = Math.max(1, Math.ceil(wc / 200));

      const freq = new Map<string, number>();
      for (const w of words) {
        const clean = w.toLowerCase().replace(/[^a-zA-ZäöüÄÖÜß]/g, '');
        if (clean.length > 3 && !STOP_WORDS.current.has(clean)) freq.set(clean, (freq.get(clean) ?? 0) + 1);
      }
      const keywords = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([word, f]) => ({ word, freq: f }));

      const imageMatches = [...value.matchAll(/!\[([^\]]*)\]\([^)]*\)/g)];
      const imageCount = imageMatches.length;
      const missingAltCount = imageMatches.filter(m => !m[1].trim()).length;

      const headlineMatches = value.match(/^#{1,6}\s.+/gm) ?? [];
      const headlineCount = headlineMatches.length;
      const multipleH1 = headlineMatches.filter(h => h.startsWith('# ')).length > 1;

      setContentIntel({ readingTime, lix, lixLabel, avgSentenceLen, keywords, imageCount, missingAltCount, headlineCount, multipleH1, wordCount: wc, charCount });
      onKeywordsChange?.(keywords.map(k => k.word));
    }, 400);

    return () => { if (intelDebounceRef.current) clearTimeout(intelDebounceRef.current); };
  }, [value, onKeywordsChange]);

  // Clear highlights when content changes or panel closes
  useEffect(() => {
    if (!showHintsPanel && typeof CSS !== 'undefined' && CSS.highlights) {
      CSS.highlights.delete('zen-hint');
    }
  }, [showHintsPanel]);

  /** Collect all DOM Range objects for matchedText within the editor */
  const findRangesInEditor = useCallback((matchedText: string): Range[] => {
    if (!holderRef.current) return [];
    const walker = document.createTreeWalker(holderRef.current, NodeFilter.SHOW_TEXT);
    const ranges: Range[] = [];
    const needle = matchedText.toLowerCase();
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const text = (node.textContent ?? '').toLowerCase();
      let idx = text.indexOf(needle);
      while (idx !== -1) {
        const range = new Range();
        range.setStart(node, idx);
        range.setEnd(node, idx + matchedText.length);
        ranges.push(range);
        idx = text.indexOf(needle, idx + 1);
      }
    }
    return ranges;
  }, []);

  const highlightMatch = useCallback((matchedText: string) => {
    if (typeof CSS === 'undefined' || !CSS.highlights) return;
    CSS.highlights.delete('zen-hint');
    const ranges = findRangesInEditor(matchedText);
    if (ranges.length > 0) {
      CSS.highlights.set('zen-hint', new Highlight(...ranges));
      (ranges[0].startContainer.parentElement ?? holderRef.current!)
        .scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [findRangesInEditor]);

  /** Replace the nth occurrence of matchedText in the editor with replacement */
  const replaceInEditor = useCallback((matchedText: string, replacement: string, occurrenceIndex: number) => {
    const ranges = findRangesInEditor(matchedText);
    const target = ranges[occurrenceIndex] ?? ranges[0];
    if (!target) return;
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(target);
    document.execCommand('insertText', false, replacement);
    // Clear highlight for this word after replacement
    if (typeof CSS !== 'undefined' && CSS.highlights) CSS.highlights.delete('zen-hint');
  }, [findRangesInEditor]);

  /** Wird bei jedem EditorJS onChange aufgerufen — gruppiert Tipp-Sessions zu Undo-Punkten */
  const trackUndoOnChange = useCallback((newMarkdown: string) => {
    // Ersten Snapshot der Session festhalten (Zustand VOR dem Tippen)
    if (typingStartSnapshotRef.current === null) {
      typingStartSnapshotRef.current = lastLocalMarkdownRef.current;
    }
    if (undoCommitDebounceRef.current) clearTimeout(undoCommitDebounceRef.current);
    undoCommitDebounceRef.current = setTimeout(() => {
      const snapshot = typingStartSnapshotRef.current;
      typingStartSnapshotRef.current = null;
      if (snapshot === null || snapshot === newMarkdown) return;
      // Duplikat vermeiden
      const stack = undoStackRef.current;
      if (stack.length > 0 && stack[stack.length - 1] === snapshot) return;
      stack.push(snapshot);
      if (stack.length > 50) stack.shift();
      setUndoCount(stack.length);
    }, 1500);
  }, []);

  /** Letzten Undo-Punkt wiederherstellen */
  const handleUndo = useCallback(async () => {
    const snapshot = undoStackRef.current.pop();
    if (snapshot === undefined || !editorRef.current) return;
    setUndoCount(undoStackRef.current.length);
    // Laufende Tipp-Session verwerfen — kein neuer Undo-Punkt für das Restore
    typingStartSnapshotRef.current = null;
    if (undoCommitDebounceRef.current) clearTimeout(undoCommitDebounceRef.current);
    try {
      await editorRef.current.render(markdownToEditorJS(snapshot));
      lastLocalMarkdownRef.current = snapshot;
      onChangeRef.current(snapshot);
    } catch {
      // no-op
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Parse quoted replacement words out of suggestion text, e.g. "Aktiv formulieren: 'durchführen'" */
  const parseReplacements = (suggestion: string): string[] => {
    const found = suggestion.match(/'([^']+)'/g) ?? [];
    return found.map(s => s.slice(1, -1));
  };

  /**
   * TS-side fallback chips for known rule patterns where the C++ engine returns
   * only a generic description without specific word suggestions.
   * For passive voice, we map the auxiliary verb → common active alternatives.
   */
  const WORD_CHIPS: Record<string, string[]> = {
    // Passive auxiliaries (DE)
    'wird':    ['hat', 'kann', 'lässt sich'],
    'werden':  ['haben', 'lassen sich', 'können'],
    'wurde':   ['hat', 'machte', 'erledigte'],
    'wurden':  ['haben', 'machten', 'erledigten'],
    'worden':  ['gemacht', 'erledigt'],
    // Filler / weak words (DE)
    'eigentlich':     ['tatsächlich', 'konkret'],
    'wirklich':       ['tatsächlich', 'nachweislich'],
    'irgendwie':      ['konkret', 'auf welche Weise'],
    'gewissermaßen':  ['konkret', 'faktisch'],
    'sozusagen':      [],
    'quasi':          ['faktisch', 'im Grunde'],
    // Filler / weak words (EN)
    'really':    ['actually', 'genuinely'],
    'basically': ['fundamentally', 'in essence'],
    'somehow':   ['specifically', 'concretely'],
    'just':      [],
    'very':      [],
    // Anglizismen (DE-Ersetzungen)
    'deadline':      ['Frist', 'Termin', 'Abgabedatum'],
    'meeting':       ['Besprechung', 'Treffen', 'Zusammenkunft'],
    'feedback':      ['Rückmeldung', 'Rückkopplung', 'Bewertung'],
    'workflow':      ['Arbeitsablauf', 'Prozess', 'Ablauf'],
    'brainstorming': ['Ideensammlung', 'Gedankensturm'],
    'roadmap':       ['Fahrplan', 'Zeitplan', 'Planung'],
    'rollout':       ['Einführung', 'Auslieferung', 'Lancierung'],
  };

  const getChips = (matchedText: string, suggestion: string): string[] => {
    const fromEngine = parseReplacements(suggestion);
    if (fromEngine.length > 0) return fromEngine;
    return WORD_CHIPS[matchedText.toLowerCase()] ?? [];
  };

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

  useEffect(() => {
    if (!isReady || !holderRef.current) return;

    const holder = holderRef.current;
    const editableSelector =
      '.ce-paragraph, .ce-header, .cdx-header, .cdx-quote__text, .cdx-quote__caption, .zen-code-block-tool__textarea, .zen-table-block-tool__cell, .zen-link-block-tool__input, .zen-image-block-tool__input, .zen-cta-block-tool__input, textarea, input, [contenteditable="true"]';

    const setTextAssistOn = (element: HTMLElement) => {
      element.setAttribute('lang', 'de-DE');
      element.setAttribute('spellcheck', 'true');
      element.setAttribute('autocorrect', 'on');
      element.setAttribute('autocapitalize', 'sentences');
      if ('spellcheck' in element) {
        (element as HTMLElement & { spellcheck: boolean }).spellcheck = true;
      }
    };

    const setTextAssistOff = (element: HTMLElement) => {
      element.setAttribute('lang', 'de-DE');
      element.setAttribute('spellcheck', 'false');
      element.setAttribute('autocorrect', 'off');
      element.setAttribute('autocapitalize', 'off');
      if ('spellcheck' in element) {
        (element as HTMLElement & { spellcheck: boolean }).spellcheck = false;
      }
    };

    const applyToElement = (element: HTMLElement) => {
      const isCodeInput =
        element.classList.contains('zen-code-block-tool__textarea') ||
        !!element.closest('.zen-code-block-tool');

      if (isCodeInput) {
        setTextAssistOff(element);
        return;
      }

      if (element instanceof HTMLInputElement && element.type === 'url') {
        setTextAssistOff(element);
        return;
      }

      setTextAssistOn(element);
    };

    const applyTextAssistAttributes = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.matches(editableSelector)) {
        applyToElement(root);
      }

      const editables = root.querySelectorAll<HTMLElement>(editableSelector);
      editables.forEach(applyToElement);
    };

    holder.setAttribute('lang', 'de-DE');
    applyTextAssistAttributes(holder);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            applyTextAssistAttributes(node);
          }
        });
      });
    });

    observer.observe(holder, {
      childList: true,
      subtree: true,
    });

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        applyTextAssistAttributes(target);
      }
    };

    const onInput = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        applyTextAssistAttributes(target);
      }
    };

    holder.addEventListener('focusin', onFocusIn, true);
    holder.addEventListener('input', onInput, true);

    return () => {
      observer.disconnect();
      holder.removeEventListener('focusin', onFocusIn, true);
      holder.removeEventListener('input', onInput, true);
    };
  }, [isReady]);

  // Convert Markdown to EditorJS format
  const markdownToEditorJS = (rawMarkdown: string): OutputData => {
    // Strip YAML frontmatter (---...---) before rendering so it doesn't appear as text blocks
    const markdown = rawMarkdown.replace(/^---\n[\s\S]*?\n---\n?/, '');
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
    const parseMarkdownImageLine = (input: string): { alt: string; url: string } | null => {
      const trimmed = input.trim();
      if (!trimmed.startsWith('![')) return null;
      const altCloseIdx = trimmed.indexOf('](');
      if (altCloseIdx < 2 || !trimmed.endsWith(')')) return null;

      const alt = trimmed.slice(2, altCloseIdx);
      let urlPart = trimmed.slice(altCloseIdx + 2, -1).trim();
      if (!urlPart) return null;

      // Optional markdown image title: ![alt](url "title")
      urlPart = urlPart.replace(/\s+(?:"[^"]*"|'[^']*')\s*$/, '').trim();
      if (urlPart.startsWith('<') && urlPart.endsWith('>')) {
        urlPart = urlPart.slice(1, -1).trim();
      }
      if (!urlPart) return null;

      return { alt, url: urlPart };
    };
    const parseHtmlImageLine = (input: string): { alt: string; url: string; width?: number } | null => {
      const trimmed = input.trim();
      const srcQuoted = trimmed.match(/^<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*\/?>$/i);
      const srcUnquoted = trimmed.match(/^<img\b[^>]*\bsrc=([^\s>]+)[^>]*\/?>$/i);
      const src = (srcQuoted?.[1] ?? srcUnquoted?.[1] ?? '').trim();
      if (!src) return null;
      const altMatch = trimmed.match(/\balt=["']([^"']*)["']/i);
      const widthMatch = trimmed.match(/\bstyle=["'][^"']*width:\s*(\d+)%[^"']*["']/i);
      const width = widthMatch ? Number(widthMatch[1]) : undefined;
      return { alt: altMatch?.[1] ?? '', url: src, width };
    };
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
      const markdownImage = parseMarkdownImageLine(line);
      if (markdownImage) {
        blocks.push({
          type: 'imageBlock',
          data: {
            alt: markdownImage.alt,
            url: markdownImage.url,
          },
        });
        i++;
        continue;
      }

      // HTML image <img src="...">
      const htmlImage = parseHtmlImageLine(line);
      if (htmlImage) {
        blocks.push({
          type: 'imageBlock',
          data: {
            alt: htmlImage.alt,
            url: htmlImage.url,
            ...(htmlImage.width !== undefined ? { width: htmlImage.width } : {}),
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
        !lines[i].match(/^(-{3,}|\*{3,}|_{3,})$/) &&
        !parseMarkdownImageLine(lines[i]) &&
        !parseHtmlImageLine(lines[i]) &&
        !lines[i].match(/^\[(.+?)\]\((.+?)\)\s*$/) &&
        !lines[i].match(/^\[CTA:\s*(.+?)\]\((.+?)\)\s*$/i) &&
        !lines[i].trim().startsWith('|')
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
      // Performance guard for very large embedded mobile images (data URLs).
      if (safeText.startsWith('data:image/')) {
        return safeText;
      }
      const convertInlineHtml = (input: string) =>
        input
          // Inline HTML images -> Markdown images
          .replace(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*\/?>/gi, (tag, src) => {
            const alt = String(tag).match(/\balt=["']([^"']*)["']/i)?.[1] ?? '';
            return `![${alt}](${String(src).trim()})`;
          })
          .replace(/<img\b[^>]*\bsrc=([^\s>]+)[^>]*\/?>/gi, (tag, src) => {
            const alt = String(tag).match(/\balt=["']([^"']*)["']/i)?.[1] ?? '';
            return `![${alt}](${String(src).trim()})`;
          })
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
          // Browser foreColor often produces <font color="...">...</font>
          .replace(/<font[^>]*color=["']([^"']+)["'][^>]*>([\s\S]*?)<\/font>/gi, (_m, color, inner) => `<span style="color:${String(color).trim()}">${String(inner ?? '')}</span>`)
          // Preserve highlight color from styled spans
          .replace(
            /<span[^>]*style=["'][^"']*background-color\s*:\s*([^;"']+)[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
            (_m, bg, inner) => `<mark style="background-color:${String(bg).trim()};color:inherit">${String(inner ?? '')}</mark>`
          )
          // Preserve plain text color from styled spans
          .replace(
            /<span[^>]*style=["'][^"']*color\s*:\s*([^;"']+)[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
            (_m, color, inner) => `<span style="color:${String(color).trim()}">${String(inner ?? '')}</span>`
          )
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
        .replace(/<\/?strong(\s+[^>]*)?>/gi, '')
        .replace(/<\/?em(\s+[^>]*)?>/gi, '')
        .replace(/<\/?i(\s+[^>]*)?>/gi, '')
        .replace(/<\/?b(\s+[^>]*)?>/gi, '')
        .replace(/<\/?font(\s+[^>]*)?>/gi, '')
        .replace(/<br[^>]*data-empty=["']?true["']?[^>]*>/gi, '')
        .replace(/<br(\s+[^>]*)?\s*\/?>\s*<br(\s+[^>]*)?\s*\/?>/gi, '\n\n')
        .replace(/<br(\s+[^>]*)?\s*\/?>/gi, '\n');
    };
    const normalizeUrlValue = (url: unknown) => String(url ?? '').trim();

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
            const codeBody = typeof block.data?.code === 'string'
              ? block.data.code
              : (typeof block.data?.text === 'string' ? block.data.text : '');
            return `\`\`\`${lang}\n${codeBody}\n\`\`\``;

          case 'linkBlock':
            if (!block.data?.url) return '';
            return `[${normalizeInlineText(block.data.text || block.data.url)}](${normalizeInlineText(block.data.url)})`;

          case 'imageBlock':
            if (!block.data?.url) return '';
            const imageUrl = normalizeUrlValue(block.data.url);
            if (!imageUrl) return '';
            const imageAlt = normalizeInlineText(block.data.alt || '');
            if (block.data.width && block.data.width < 100) {
              return `<img src="${imageUrl}" alt="${imageAlt}" style="width:${block.data.width}%">`;
            }
            return `![${imageAlt}](${imageUrl})`;
          case 'image':
            if (!block.data?.url && !block.data?.file?.url) return '';
            const legacyImageUrl = normalizeUrlValue(block.data?.file?.url || block.data?.url || '');
            if (!legacyImageUrl) return '';
            return `![${normalizeInlineText(block.data?.caption || '')}](${legacyImageUrl})`;

          case 'ctaBlock':
            if (!block.data?.url) return '';
            return `[CTA: ${normalizeInlineText(block.data.text || 'Mehr erfahren')}](${normalizeInlineText(block.data.url)})`;

          case 'cta':
            if (!block.data?.url) return '';
            return `[CTA: ${normalizeInlineText(block.data.text || block.data.label || 'Mehr erfahren')}](${normalizeInlineText(block.data.url)})`;

          case 'table':
            if (!Array.isArray(block.data?.content) || block.data.content.length === 0) return '';
            {
              const rows = block.data.content as unknown[][];
              const normalizeCell = (cell: unknown) => normalizeInlineText(cell ?? '');
              const header = (rows[0] ?? []).map(normalizeCell);
              const body = rows.slice(1).map((row) => (row ?? []).map(normalizeCell));
              const lines: string[] = [];
              lines.push(`| ${header.join(' | ')} |`);
              lines.push(`| ${header.map(() => '---').join(' | ')} |`);
              body.forEach((row) => {
                lines.push(`| ${row.join(' | ')} |`);
              });
              return lines.join('\n');
            }

          case 'tableBlock':
            return normalizeInlineText(block.data.table || '');

          case 'youtube':
          case 'embed':
          case 'video': {
            const embedUrl = normalizeUrlValue(
              block.data?.url || block.data?.embed || block.data?.src || block.data?.file?.url || ''
            );
            if (!embedUrl) return '';
            return `[YouTube: ${embedUrl}](${embedUrl})`;
          }

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
        marker: {
          class: ZenMarkerInlineTool as any,
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
          trackUndoOnChange(markdown);
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
        // Reposition only when menu is already open.
        if (menuOpen) {
          setMenuPosition({
            x: MENU_LEFT_OFFSET,
            y: Math.max(14, toContainerY(rangeRect.top) + 20),
          });
        }
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
  }, [isReady, menuOpen]);

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
  const gold = '#AC8E66';

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
      editable?.focus({ preventScroll: true });
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

    const currentInfo = getCurrentBlockInfo(toolbarActionBlockIndexRef.current);
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
    } else if (currentInfo) {
      insertIndex = currentInfo.index + 1;
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
    toolbarActionBlockIndexRef.current = targetIndex;
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!onRegisterImageInserter) return;
    if (!isReady) {
      onRegisterImageInserter(null);
      return;
    }

    const insertImagesAtCursor = (images: Array<{ url: string; alt?: string }>) => {
      if (!images.length) return;
      void (async () => {
        const editor = editorRef.current as any;
        if (!editor?.blocks) return;

        const optimizedImages = await Promise.all(
          images.map(async (image) => ({
            ...image,
            url: image.url.startsWith('data:image/')
              ? await autoOptimizeDataUrl(image.url)
              : image.url,
          }))
        );

        const info = getCurrentBlockInfo(toolbarActionBlockIndexRef.current);
        let insertIndex: number | undefined;
        const shouldReplaceCurrent = !!info && !info.hasContent;

        if (shouldReplaceCurrent && info) {
          insertIndex = info.index;
          try {
            editor.blocks.delete(info.index);
          } catch {
            // fallback to regular insert below
          }
        } else if (info) {
          insertIndex = info.index + 1;
        } else {
          const currentIndex = editor.blocks.getCurrentBlockIndex?.();
          insertIndex = typeof currentIndex === 'number' ? currentIndex + 1 : undefined;
        }

        optimizedImages.forEach((image, offset) => {
          editor.blocks.insert(
            'imageBlock',
            { url: image.url, alt: image.alt ?? '' },
            undefined,
            typeof insertIndex === 'number' ? insertIndex + offset : undefined,
            true
          );
        });

        const targetIndex =
          typeof insertIndex === 'number'
            ? insertIndex + optimizedImages.length - 1
            : Math.max(0, (editor.blocks.getBlocksCount?.() ?? 1) - 1);
        toolbarActionBlockIndexRef.current = targetIndex;
        focusBlockByIndex(targetIndex, 'end');
      })();
    };

    onRegisterImageInserter(insertImagesAtCursor);
    return () => onRegisterImageInserter(null);
  }, [onRegisterImageInserter, isReady]);

  const keepSelection = (event: React.MouseEvent) => {
    event.preventDefault();
  };

  const rememberToolbarBlock = () => {
    const info = getCurrentBlockInfo();
    if (!info) return;
    toolbarActionBlockIndexRef.current = info.index;
    lastActiveBlockIndexRef.current = info.index;
  };

  const keepSelectionAndRememberBlock = (event: React.MouseEvent) => {
    keepSelection(event);
    rememberToolbarBlock();
  };

  const applyInlineFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    setMenuOpen(false);
  };

  const applyColorFormat = (mode: 'highlight' | 'text', color: string) => {
    const holder = holderRef.current;
    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    if (!holder || !selection || !range || !holder.contains(range.commonAncestorContainer)) {
      setMenuOpen(false);
      return;
    }

    const tokenByColor: Record<string, string> =
      mode === 'highlight'
        ? {
            '#fff2a8': 'hl-yellow',
            '#bff6c3': 'hl-green',
            '#c8e7ff': 'hl-blue',
          }
        : {
            '#c95c5c': 'text-red',
            '#5b7fcb': 'text-blue',
          };

    const markerToken = tokenByColor[color.toLowerCase()] ?? (mode === 'highlight' ? 'hl-yellow' : 'text-red');
    const findMarkerFromNode = (node: Node | null): HTMLElement | null => {
      if (!node) return null;
      if (node instanceof HTMLElement) return node.closest('mark.zen-inline-marker');
      return node.parentElement?.closest('mark.zen-inline-marker') ?? null;
    };
    const unwrapMarker = (marker: HTMLElement) => {
      const parent = marker.parentNode;
      if (!parent) return;
      while (marker.firstChild) {
        parent.insertBefore(marker.firstChild, marker);
      }
      parent.removeChild(marker);
    };
    const dispatchInputFromNode = (node: Node | null) => {
      const editable = (node instanceof HTMLElement ? node : node?.parentElement)?.closest<HTMLElement>(
        '.ce-paragraph, .ce-header, .cdx-header, .cdx-quote__text, .cdx-quote__caption, [contenteditable="true"]'
      );
      editable?.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const moveCaretToEnd = (target: HTMLElement) => {
      selection.removeAllRanges();
      const caretRange = document.createRange();
      caretRange.selectNodeContents(target);
      caretRange.collapse(false);
      selection.addRange(caretRange);
    };

    const startMarker = findMarkerFromNode(range.startContainer);
    const endMarker = findMarkerFromNode(range.endContainer);
    const sameMarker = startMarker && endMarker && startMarker === endMarker ? startMarker : null;

    if (sameMarker) {
      if (sameMarker.dataset.zenMarker === markerToken) {
        const parentForInput = sameMarker.parentNode;
        unwrapMarker(sameMarker);
        dispatchInputFromNode(parentForInput);
        setMenuOpen(false);
        return;
      }

      sameMarker.dataset.zenMarker = markerToken;
      moveCaretToEnd(sameMarker);
      dispatchInputFromNode(sameMarker);
      setMenuOpen(false);
      return;
    }

    if (range.collapsed) {
      setMenuOpen(false);
      return;
    }

    const intersectingMarkers = Array.from(
      holder.querySelectorAll<HTMLElement>('mark.zen-inline-marker')
    ).filter((marker) => {
      try {
        return range.intersectsNode(marker);
      } catch {
        return false;
      }
    });

    if (
      intersectingMarkers.length > 0 &&
      intersectingMarkers.every((marker) => marker.dataset.zenMarker === markerToken)
    ) {
      const firstParent = intersectingMarkers[0].parentNode;
      intersectingMarkers.forEach((marker) => unwrapMarker(marker));
      dispatchInputFromNode(firstParent);
      setMenuOpen(false);
      return;
    }

    const mark = document.createElement('mark');
    mark.className = 'zen-inline-marker';
    mark.dataset.zenMarker = markerToken;

    try {
      range.surroundContents(mark);
    } catch {
      const fragment = range.extractContents();
      mark.appendChild(fragment);
      range.insertNode(mark);
    }

    moveCaretToEnd(mark);
    dispatchInputFromNode(mark);

    setMenuOpen(false);
  };

  const clearColorFormat = () => {
    const holder = holderRef.current;
    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    if (!holder || !selection || !range || !holder.contains(range.commonAncestorContainer)) {
      setMenuOpen(false);
      return;
    }

    const findMarkerFromNode = (node: Node | null): HTMLElement | null => {
      if (!node) return null;
      if (node instanceof HTMLElement) return node.closest('mark.zen-inline-marker');
      return node.parentElement?.closest('mark.zen-inline-marker') ?? null;
    };
    const unwrapMarker = (marker: HTMLElement) => {
      const parent = marker.parentNode;
      if (!parent) return;
      while (marker.firstChild) {
        parent.insertBefore(marker.firstChild, marker);
      }
      parent.removeChild(marker);
    };
    const dispatchInputFromNode = (node: Node | null) => {
      const editable = (node instanceof HTMLElement ? node : node?.parentElement)?.closest<HTMLElement>(
        '.ce-paragraph, .ce-header, .cdx-header, .cdx-quote__text, .cdx-quote__caption, [contenteditable="true"]'
      );
      editable?.dispatchEvent(new Event('input', { bubbles: true }));
    };

    if (range.collapsed) {
      const marker = findMarkerFromNode(range.startContainer);
      if (marker) {
        const parentForInput = marker.parentNode;
        unwrapMarker(marker);
        dispatchInputFromNode(parentForInput);
      }
      setMenuOpen(false);
      return;
    }

    const intersectingMarkers = Array.from(
      holder.querySelectorAll<HTMLElement>('mark.zen-inline-marker')
    ).filter((marker) => {
      try {
        return range.intersectsNode(marker);
      } catch {
        return false;
      }
    });

    if (intersectingMarkers.length > 0) {
      const firstParent = intersectingMarkers[0].parentNode;
      intersectingMarkers.forEach((marker) => unwrapMarker(marker));
      dispatchInputFromNode(firstParent);
    }

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

  const getClampedMenuViewportPosition = (position: { x: number; y: number }) => {
    const viewportPos = getViewportPosition(position);
    if (typeof window === 'undefined') return viewportPos;

    const margin = 12;
    const maxHeight = Math.max(220, window.innerHeight - margin * 2);
    const effectiveHeight = Math.min(overlayMenuHeight || 420, maxHeight);
    const maxTop = Math.max(margin, window.innerHeight - effectiveHeight - margin);

    return {
      x: viewportPos.x,
      y: Math.min(Math.max(margin, viewportPos.y), maxTop),
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

  const applyCurrentImageSizePreset = (pct: number) => {
    const holder = holderRef.current;
    if (!holder) return;

    const blocks = holder.querySelectorAll<HTMLElement>('.ce-block');
    const activeIndex = currentBlockInfo?.index ?? lastActiveBlockIndexRef.current;
    if (typeof activeIndex !== 'number' || activeIndex < 0 || activeIndex >= blocks.length) {
      setMenuOpen(false);
      return;
    }

    const blockEl = blocks[activeIndex];
    const preview = blockEl?.querySelector<HTMLElement>('.zen-image-block-preview');
    if (!preview) {
      setMenuOpen(false);
      return;
    }

    const badge = preview.querySelector<HTMLElement>('.zen-image-block-size-badge');
    preview.style.width = `${pct}%`;
    preview.dataset.width = String(pct);
    if (badge) badge.textContent = `${pct}%`;

    const altInput = blockEl.querySelector<HTMLInputElement>('.zen-image-block-alt');
    const sourceType = preview.dataset.sourceType ?? '';
    const sourceLen = Number(preview.dataset.sourceUrlLength ?? '0');
    const isLargeInlineImage =
      sourceType === 'data-url' &&
      Number.isFinite(sourceLen) &&
      sourceLen >= LARGE_INLINE_IMAGE_SAFE_MODE_LENGTH;

    const dispatchCommit = () => {
      altInput?.dispatchEvent(new InputEvent('input', { bubbles: true }));
    };

    if (isLargeInlineImage && typeof window !== 'undefined') {
      if (imageResizeCommitHandleRef.current !== null) {
        if (
          imageResizeCommitIsIdleRef.current &&
          'cancelIdleCallback' in window &&
          typeof imageResizeCommitHandleRef.current === 'number'
        ) {
          (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(imageResizeCommitHandleRef.current);
        } else {
          globalThis.clearTimeout(imageResizeCommitHandleRef.current as ReturnType<typeof globalThis.setTimeout>);
        }
      }

      if ('requestIdleCallback' in window) {
        imageResizeCommitIsIdleRef.current = true;
        imageResizeCommitHandleRef.current = (
          window as Window & { requestIdleCallback: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number }
        ).requestIdleCallback(() => {
          imageResizeCommitHandleRef.current = null;
          imageResizeCommitIsIdleRef.current = false;
          dispatchCommit();
        }, { timeout: 1400 });
      } else {
        imageResizeCommitIsIdleRef.current = false;
        imageResizeCommitHandleRef.current = globalThis.setTimeout(() => {
          imageResizeCommitHandleRef.current = null;
          dispatchCommit();
        }, 360);
      }
    } else {
      dispatchCommit();
    }

    const focusNextEditableBlock = () => {
      const editableSelector =
        '.ce-paragraph, .ce-header, .cdx-header, .cdx-quote__text, .cdx-quote__caption, [contenteditable="true"], textarea, input';
      // Prefer the next editable block after the image.
      for (let i = activeIndex + 1; i < blocks.length; i += 1) {
        const editable = blocks[i].querySelector<HTMLElement>(editableSelector);
        if (editable) {
          editable.focus();
          try {
            if (editable.getAttribute('contenteditable') === 'true') {
              const selection = window.getSelection();
              const range = document.createRange();
              range.selectNodeContents(editable);
              range.collapse(false);
              selection?.removeAllRanges();
              selection?.addRange(range);
            }
          } catch {
            // no-op
          }
          return;
        }
      }
      // Fallback: keep focus on current block handling.
      focusBlockByIndex(activeIndex, 'end');
    };

    setMenuOpen(false);
    window.requestAnimationFrame(() => {
      focusNextEditableBlock();
    });
  };

  useEffect(() => {
    return () => {
      if (imageResizeCommitHandleRef.current === null || typeof window === 'undefined') return;
      if (
        imageResizeCommitIsIdleRef.current &&
        'cancelIdleCallback' in window &&
        typeof imageResizeCommitHandleRef.current === 'number'
      ) {
        (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(imageResizeCommitHandleRef.current);
      } else {
        globalThis.clearTimeout(imageResizeCommitHandleRef.current as ReturnType<typeof globalThis.setTimeout>);
      }
      imageResizeCommitHandleRef.current = null;
    };
  }, []);

  const getActiveBlockForToolbar = (): HTMLElement | null => {
    const holder = holderRef.current;
    if (!holder) return null;

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

  const ensureToolbarScrollRoom = () => {
    const container = containerRef.current;
    const activeBlock = getActiveBlockForToolbar();
    if (!container || !activeBlock) return;

    const containerRect = container.getBoundingClientRect();
    const blockRect = activeBlock.getBoundingClientRect();
    const blockTopInContainer = container.scrollTop + (blockRect.top - containerRect.top);
    const blockBottomInContainer = container.scrollTop + (blockRect.bottom - containerRect.top);
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);

    // Keep active block close under the navbar while menu is open.
    const targetTopOffset = 104;
    const targetBottomOffset = Math.floor(container.clientHeight * 0.62);

    const desiredTop = Math.max(0, blockTopInContainer - targetTopOffset);
    const desiredBottom = Math.max(0, blockBottomInContainer - targetBottomOffset);

    const shouldMoveDown = blockRect.bottom > containerRect.top + targetBottomOffset;
    const shouldMoveUp = blockRect.top < containerRect.top + targetTopOffset;
    if (!shouldMoveDown && !shouldMoveUp) return;

    const nextTop = shouldMoveDown ? desiredBottom : desiredTop;
    const clampedTop = Math.min(maxScrollTop, Math.max(0, nextTop));
    container.scrollTo({ top: clampedTop, behavior: 'smooth' });
  };

  const forwardOverlayWheelToEditor = (event: React.WheelEvent) => {
    const container = containerRef.current;
    if (!container) return;
    if (event.deltaY === 0) return;
    event.preventDefault();
    event.stopPropagation();
    container.scrollBy({ top: event.deltaY, left: 0, behavior: 'auto' });
  };

  const adjustIndent = (direction: 'in' | 'out') => {
    withActiveEditable((editable) => {
      const current = parseInt(editable.style.paddingLeft || '0', 10) || 0;
      const next = direction === 'in' ? current + 24 : Math.max(0, current - 24);
      editable.style.paddingLeft = `${next}px`;
    });
    setMenuOpen(false);
  };

  const toPlainText = (value: unknown): string => {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value).trim();
    }
    if (Array.isArray(value)) {
      return value.map((entry) => toPlainText(entry)).filter(Boolean).join('\n').trim();
    }
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const preferredKeys = ['text', 'content', 'label', 'url', 'title', 'caption', 'value', 'html'];
      for (const key of preferredKeys) {
        const candidate = toPlainText(obj[key]);
        if (candidate) return candidate;
      }
      return Object.values(obj).map((entry) => toPlainText(entry)).filter(Boolean).join(' ').trim();
    }
    return '';
  };

  const extractBlockText = (block: any): string => {
    if (!block) return '';
    const data = block.data ?? {};
    switch (block.type) {
      case 'header':
      case 'paragraph':
        return toPlainText(data.text);
      case 'quote':
        return toPlainText(data.text);
      case 'list':
        return Array.isArray(data.items)
          ? data.items.map((item: unknown) => toPlainText(item)).filter(Boolean).join('\n').trim()
          : '';
      case 'code':
        return toPlainText(data.code);
      case 'linkBlock':
        return toPlainText(data.text ?? data.label ?? data.url);
      case 'ctaBlock':
        return toPlainText(data.text ?? data.label ?? data.url);
      case 'tableBlock':
        return toPlainText(data.table);
      case 'imageBlock':
        return toPlainText(data.alt ?? data.url);
      default:
        return '';
    }
  };

  const convertCurrentBlock = async (
    target: 'paragraph' | 'header' | 'list' | 'quote',
    options?: { level?: number; listStyle?: 'unordered' | 'ordered'; sourceIndex?: number }
  ) => {
    const editor = editorRef.current as any;
    const info = getCurrentBlockInfo(options?.sourceIndex ?? toolbarActionBlockIndexRef.current);
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
      toolbarActionBlockIndexRef.current = info.index;
      focusBlockByIndex(info.index, target === 'header' ? 'start' : 'end');
    } catch {
      // no-op
    }
  };

  const getCurrentBlockInfo = (preferredIndex?: number | null) => {
    const holder = holderRef.current;
    const editor = editorRef.current as any;
    if (!holder || !editor?.blocks) return null;

    const blocks = holder.querySelectorAll<HTMLElement>('.ce-block');
    let index: number | undefined =
      typeof preferredIndex === 'number' &&
      preferredIndex >= 0 &&
      preferredIndex < blocks.length
        ? preferredIndex
        : editor.blocks.getCurrentBlockIndex?.();

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

    const isImageBlock = !!blockEl?.querySelector('.zen-image-block-preview-container');
    const count = editor.blocks.getBlocksCount?.() ?? blocks.length;
    return { index, count, hasContent, isImageBlock };
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
  const isCurrentBlockImage = !!currentBlockInfo?.isImageBlock;
  const showInsertSection = !hasCurrentBlockContent;
  const showArrangeSection = !!currentBlockInfo?.hasContent;
  const showConvertSection = hasCurrentBlockContent && !isCurrentBlockImage;
  const showImageSection = isCurrentBlockImage;
  const canMoveUp = !!currentBlockInfo && currentBlockInfo.index > 0;
  const canMoveDown = !!currentBlockInfo && currentBlockInfo.index < currentBlockInfo.count - 1;
  const canDelete = !!currentBlockInfo && currentBlockInfo.count > 1;

  useEffect(() => {
    if (!menuOpen) return;
    const raf = window.requestAnimationFrame(() => {
      ensureToolbarScrollRoom();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [menuOpen]);

  useEffect(() => {
    if (!headingRequest) return;
    if (!isReady) return;
    if (lastHandledHeadingRequestTokenRef.current === headingRequest.token) return;

    lastHandledHeadingRequestTokenRef.current = headingRequest.token;

    const level = Math.max(1, Math.min(6, headingRequest.level));
    const info = getCurrentBlockInfo();
    if (!info) return;

    if (info.hasContent) {
      void convertCurrentBlock('header', { level });
      return;
    }

    insertBlock(
      'header',
      { level, text: '' },
      { replaceCurrentIfEmpty: true }
    );
  }, [headingRequest, isReady]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setMenuOpen(false);
      const info = getCurrentBlockInfo();
      if (info) {
        window.requestAnimationFrame(() => focusBlockByIndex(info.index, 'end'));
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [menuOpen]);

  // Cmd+Z / Ctrl+Z → ZenEngine Undo (wenn Stack nicht leer)
  useEffect(() => {
    if (undoCount === 0) return;

    const onUndoKey = (event: KeyboardEvent) => {
      const isMac = /mac/i.test(navigator.platform);
      const trigger = isMac ? event.metaKey && !event.shiftKey : event.ctrlKey && !event.shiftKey;
      if (!trigger || event.key !== 'z') return;
      event.preventDefault();
      event.stopPropagation();
      handleUndo();
    };

    document.addEventListener('keydown', onUndoKey, true);
    return () => document.removeEventListener('keydown', onUndoKey, true);
  }, [undoCount, handleUndo]);

  useEffect(() => {
    if (!menuOpen) return;
    const node = overlayMenuRef.current;
    if (!node) return;

    const updateHeight = () => {
      setOverlayMenuHeight(node.offsetHeight || 420);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    window.addEventListener('resize', updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [menuOpen, showInsertSection, showConvertSection, showArrangeSection]);

  return (
    <div
      ref={containerRef}
      className={className}
      data-zen-scroll="editor"
      data-panel-open={showHintsPanel || showIntelPanel ? 'true' : 'false'}
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        backgroundColor: colors.background,
        display: 'flex',
        flexDirection: 'column',
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
      {/* Find & Replace Bar (Cmd+F / Ctrl+F) */}
      {showSearch && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 140,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            padding: '5px 10px',
            background: theme === 'dark' ? 'rgba(18,18,18,0.97)' : 'rgba(237,230,216,0.97)',
            borderBottom: `1px solid ${colors.border}`,
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Row 1: search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => {
                setShowReplace(r => !r);
                setTimeout(() => replaceInputRef.current?.focus(), 0);
              }}
              title={showReplace ? 'Ersetzen ausblenden' : 'Ersetzen einblenden'}
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 10,
                background: showReplace ? (theme === 'dark' ? 'rgba(172,142,102,0.25)' : 'rgba(172,142,102,0.18)') : 'transparent',
                border: `1px solid ${showReplace ? gold : colors.border}`,
                borderRadius: 4,
                color: showReplace ? gold : colors.placeholder,
                cursor: 'pointer',
                padding: '2px 6px',
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ⇄
            </button>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              placeholder="Suchen …"
              onChange={e => {
                const q = e.target.value;
                setSearchQuery(q);
                runSearch(q, 0);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.shiftKey) searchPrev(); else searchNext();
                } else if (e.key === 'Tab' && showReplace) {
                  e.preventDefault();
                  replaceInputRef.current?.focus();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  closeSearch();
                }
              }}
              style={{
                flex: 1,
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 11,
                background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                border: `1px solid ${colors.border}`,
                borderRadius: 4,
                color: colors.text,
                padding: '3px 8px',
                outline: 'none',
                minWidth: 0,
              }}
            />
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: colors.placeholder, whiteSpace: 'nowrap', minWidth: 48 }}>
              {searchQuery ? (searchMatchCount === 0 ? 'Kein Treffer' : `${searchIndex + 1} / ${searchMatchCount}`) : ''}
            </span>
            <button
              type="button"
              onClick={searchPrev}
              disabled={searchMatchCount === 0}
              title="Vorheriger Treffer (Shift+Enter)"
              style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, color: colors.placeholder, cursor: 'pointer', padding: '2px 7px', lineHeight: 1 }}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={searchNext}
              disabled={searchMatchCount === 0}
              title="Nächster Treffer (Enter)"
              style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, color: colors.placeholder, cursor: 'pointer', padding: '2px 7px', lineHeight: 1 }}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={closeSearch}
              title="Schließen (Escape)"
              style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, background: 'transparent', border: 'none', color: colors.placeholder, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
            >
              ×
            </button>
          </div>

          {/* Row 2: replace (collapsible) */}
          {showReplace && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 28 }}>
              <input
                ref={replaceInputRef}
                type="text"
                value={replaceQuery}
                placeholder="Ersetzen durch …"
                onChange={e => setReplaceQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    replaceCurrentMatch();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    closeSearch();
                  }
                }}
                style={{
                  flex: 1,
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 11,
                  background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  border: `1px solid ${colors.border}`,
                  borderRadius: 4,
                  color: colors.text,
                  padding: '3px 8px',
                  outline: 'none',
                  minWidth: 0,
                }}
              />
              <button
                type="button"
                onClick={replaceCurrentMatch}
                disabled={searchMatchCount === 0}
                title="Aktuellen Treffer ersetzen (Enter)"
                style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 10,
                  background: 'transparent',
                  border: `1px solid ${colors.border}`,
                  borderRadius: 4,
                  color: colors.placeholder,
                  cursor: searchMatchCount === 0 ? 'not-allowed' : 'pointer',
                  padding: '2px 8px',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.4,
                  opacity: searchMatchCount === 0 ? 0.4 : 1,
                }}
              >
                Ersetzen
              </button>
              <button
                type="button"
                onClick={replaceAllMatches}
                disabled={searchMatchCount === 0}
                title="Alle Treffer ersetzen"
                style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 10,
                  background: searchMatchCount > 0 ? (theme === 'dark' ? 'rgba(172,142,102,0.18)' : 'rgba(172,142,102,0.14)') : 'transparent',
                  border: `1px solid ${searchMatchCount > 0 ? gold : colors.border}`,
                  borderRadius: 4,
                  color: searchMatchCount > 0 ? gold : colors.placeholder,
                  cursor: searchMatchCount === 0 ? 'not-allowed' : 'pointer',
                  padding: '2px 8px',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.4,
                  opacity: searchMatchCount === 0 ? 0.4 : 1,
                }}
              >
                Alle ersetzen
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      <div
        ref={holderRef}
        style={{
          padding: 16,
          color: colors.text,
        }}
      />
      </div>

      {/* ZenEngine Hints Panel */}
      {showHintsPanel && analyzeResult && analyzeResult.suggestions.length > 0 && (
        <div style={{
          flexShrink: 0,
          margin: '0 8px 4px',
          borderRadius: 8,
          background: theme === 'dark' ? 'rgba(21,21,21,0.97)' : 'rgba(237,230,216,0.97)',
          border: `1px solid ${colors.border}`,
          backdropFilter: 'blur(8px)',
          zIndex: 130,
          maxHeight: 240,
          overflowY: 'auto',
          padding: '6px 0',
        }}>
          {/* Panel header: hint count + Auto-Fix */}
          {(() => {
            const hasReplacements = analyzeResult.suggestions.some(s => s.replacements && s.replacements.length > 0);
            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 14px 5px', borderBottom: `1px solid ${colors.border}`, marginBottom: 2 }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: colors.placeholder }}>
                  {totalHintCount} Hinweis{totalHintCount !== 1 ? 'e' : ''}
                </span>
                {hasReplacements && (
                  <button
                    type="button"
                    onClick={handleAutofix}
                    title="Alle sicheren Korrekturen automatisch anwenden"
                    style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(172,142,102,0.5)', background: 'transparent', color: '#AC8E66', cursor: 'pointer' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#AC8E66'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#AC8E66'; }}
                  >
                    Auto-Fix
                  </button>
                )}
              </div>
            );
          })()}
          {(() => {
            // User-Regeln haben Vorrang: Builtin-Matches für denselben Text ausblenden
            const userTexts = new Set(
              analyzeResult.suggestions
                .filter(s => s.is_user_rule)
                .map(s => s.matched_text.trim().toLowerCase())
            );
            return analyzeResult.suggestions.filter(s =>
              s.is_user_rule || !userTexts.has(s.matched_text.trim().toLowerCase())
            );
          })().map((s, i) => {
            const isUser = !!s.is_user_rule;
            const rawText = s.matched_text.trim();
            const displayText = rawText.length > 55 ? rawText.slice(0, 52) + '…' : rawText;
            const chips = isUser ? s.replacements : getChips(s.matched_text, s.suggestion);
            const occurrenceIndex = analyzeResult.suggestions.slice(0, i).filter(x => x.matched_text === s.matched_text).length;
            const chipColor = isUser ? '#AC8E66' : '#C0633A';
            const chipBg = isUser
              ? (theme === 'dark' ? 'rgba(172,142,102,0.18)' : 'rgba(172,142,102,0.12)')
              : (theme === 'dark' ? 'rgba(192,99,58,0.18)' : 'rgba(192,99,58,0.12)');
            const chipBorder = isUser ? '1px solid rgba(172,142,102,0.4)' : '1px solid rgba(192,99,58,0.4)';
            return (
              <div key={i} style={{
                padding: '5px 14px',
                borderBottom: i < analyzeResult.suggestions.length - 1 ? `1px solid ${colors.border}` : 'none',
              }}>
                <div
                  role="button" tabIndex={0}
                  onClick={() => highlightMatch(s.matched_text)}
                  onKeyDown={e => e.key === 'Enter' && highlightMatch(s.matched_text)}
                  style={{ display: 'flex', alignItems: 'baseline', gap: 10, cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  <span style={{
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
                    background: chipBg, color: chipColor,
                    borderRadius: 4, padding: '1px 6px', border: chipBorder,
                    flexShrink: 0, whiteSpace: 'nowrap',
                  }}>
                    {displayText}
                  </span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: colors.placeholder, lineHeight: 1.4, flex: 1 }}>
                    {s.suggestion || s.rule.replace(/_/g, ' ')}
                  </span>
                  {!isUser && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        learnPrefillKeyRef.current += 1;
                        setLearnPrefill({ pattern: s.matched_text.trim(), suggestion: s.suggestion || '', ruleId: s.rule, _key: learnPrefillKeyRef.current });
                      }}
                      title="Als eigene Regel speichern"
                      style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, background: 'transparent', border: 'none', color: 'rgba(172,142,102,0.6)', cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#AC8E66'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(172,142,102,0.6)'; }}
                    >
                      +
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      if (isUser) {
                        deleteUserRule(s.matched_text);
                      } else {
                        recordIgnored(s.rule, s.matched_text);
                      }
                      runAnalysis(value);
                    }}
                    title={isUser ? 'Regel löschen' : 'Hinweis ausblenden'}
                    style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, background: 'transparent', border: 'none', color: colors.placeholder, cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}
                  >
                    ×
                  </button>
                </div>
                {chips.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    {chips.map((rep, ri) => (
                      <button
                        key={ri} type="button"
                        onClick={() => { replaceInEditor(s.matched_text, rep, occurrenceIndex); recordAccepted(s.rule, s.matched_text); }}
                        style={{
                          fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, padding: '1px 8px',
                          borderRadius: 4, border: `1px solid ${colors.border}`,
                          background: theme === 'dark' ? 'rgba(172,142,102,0.12)' : 'rgba(172,142,102,0.1)',
                          color: '#AC8E66', cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#AC8E66'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = theme === 'dark' ? 'rgba(172,142,102,0.12)' : 'rgba(172,142,102,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#AC8E66'; }}
                      >
                        {rep}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* "Wort lernen" inline form */}

          <ZenLearnForm
            theme={theme}
            colors={colors}
            prefill={learnPrefill}
            onSave={(pattern, suggestion, replacements) => {
              addUserRule({ pattern, suggestion, replacements, confidence: 0.85 });
              // Builtin-Hinweis für dieses Pattern sofort supprimieren
              if (learnPrefill?.ruleId) recordIgnored(learnPrefill.ruleId, pattern);
              setLearnPrefill(null);
              runAnalysis(value);
            }}
          />
        </div>
      )}

      {/* Content Intelligence Panel */}
      {showIntelPanel && contentIntel && (
        <div style={{
          flexShrink: 0,
          margin: '0 8px 4px',
          borderRadius: 8,
          background: theme === 'dark' ? 'rgba(21,21,21,0.97)' : 'rgba(237,230,216,0.97)',
          border: `1px solid ${colors.border}`,
          backdropFilter: 'blur(8px)',
          zIndex: 130,
          padding: '10px 14px',
        }}>
          {/* Row 1: Readability + Reading time */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 8, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: colors.placeholder, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Lesbarkeit (LIX)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 600,
                  color: contentIntel.lix < 40 ? '#6aaa64' : contentIntel.lix < 55 ? '#AC8E66' : '#C0633A',
                }}>
                  {contentIntel.lix}
                </span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: colors.placeholder }}>
                  {contentIntel.lixLabel}
                </span>
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: colors.placeholder, marginTop: 2 }}>
                Ø {contentIntel.avgSentenceLen} Wörter/Satz
              </div>
              {analyzeResult && (() => {
                const longCount = analyzeResult.suggestions.filter(s => s.rule === 'sentence_too_long').length;
                if (longCount === 0) return null;
                return (
                  <div
                    role="button" tabIndex={0}
                    onClick={() => setShowHintsPanel(true)}
                    onKeyDown={e => e.key === 'Enter' && setShowHintsPanel(true)}
                    style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#C0633A', marginTop: 3, cursor: 'pointer', textDecoration: 'underline dotted' }}
                  >
                    {longCount} zu lang{longCount !== 1 ? 'e' : 'er'} Satz
                  </div>
                );
              })()}
            </div>
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: colors.placeholder, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Lesedauer</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 600, color: colors.text }}>
                ~{contentIntel.readingTime} Min.
              </div>
            </div>
            {contentIntel.imageCount > 0 && (
              <div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: colors.placeholder, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Bilder</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 600, color: colors.text }}>{contentIntel.imageCount}</span>
                  {contentIntel.missingAltCount > 0 && (
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#C0633A' }}>
                      {contentIntel.missingAltCount}× kein Alt-Text
                    </span>
                  )}
                </div>
              </div>
            )}
            {contentIntel.headlineCount > 0 && (
              <div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: colors.placeholder, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Headlines</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 600, color: colors.text }}>{contentIntel.headlineCount}</span>
                  {contentIntel.multipleH1 && (
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#C0633A' }}>Mehrere H1</span>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Row 2: Top Keywords */}
          {contentIntel.keywords.length > 0 && (
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: colors.placeholder, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>Top Keywords</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {contentIntel.keywords.map((kw, i) => (
                  <span key={i} style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 9,
                    padding: '1px 7px',
                    borderRadius: 4,
                    border: `1px solid ${colors.border}`,
                    background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                    color: colors.text,
                  }}>
                    {kw.word} <span style={{ color: colors.placeholder }}>×{kw.freq}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ZenEngine Status-Bar */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '3px 16px',
          background: theme === 'dark' ? 'rgba(18,18,18,0.92)' : 'rgba(232,225,210,0.92)',
          borderTop: `1px solid ${colors.border}`,
          backdropFilter: 'blur(6px)',
          zIndex: 130,
        }}
      >
        <button
          type="button"
          onClick={() => { setShowIntelPanel(p => !p); setShowHintsPanel(false); }}
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 9,
            background: showIntelPanel
              ? (theme === 'dark' ? 'rgba(172,142,102,0.18)' : 'rgba(172,142,102,0.15)')
              : 'transparent',
            border: `1px solid ${showIntelPanel ? 'rgba(172,142,102,0.5)' : 'transparent'}`,
            borderRadius: 4,
            color: showIntelPanel ? '#AC8E66' : colors.placeholder,
            cursor: 'pointer',
            padding: '1px 6px',
            lineHeight: 1.4,
          }}
          onMouseEnter={e => {
            if (!showIntelPanel) {
              (e.currentTarget as HTMLButtonElement).style.color = '#AC8E66';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(172,142,102,0.35)';
            }
          }}
          onMouseLeave={e => {
            if (!showIntelPanel) {
              (e.currentTarget as HTMLButtonElement).style.color = colors.placeholder;
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
            }
          }}
        >
          {(contentIntel?.wordCount ?? 0).toLocaleString('de-DE')} Wörter
        </button>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: colors.border, pointerEvents: 'none' }}>·</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: colors.placeholder, pointerEvents: 'none' }}>
          {(contentIntel?.charCount ?? 0).toLocaleString('de-DE')} Zeichen
        </span>
        {contentIntel && (
          <>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: colors.border, pointerEvents: 'none' }}>·</span>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: colors.placeholder, pointerEvents: 'none' }}>
              ~{contentIntel.readingTime} Min.
            </span>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: colors.border, pointerEvents: 'none' }}>·</span>
            <span style={{
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, pointerEvents: 'none',
              color: contentIntel.lix < 40 ? '#6aaa64' : contentIntel.lix < 55 ? '#AC8E66' : '#C0633A',
            }}>
              LIX {contentIntel.lix}
            </span>
          </>
        )}
        {totalHintCount > 0 && (
          <>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: colors.border, pointerEvents: 'none' }}>·</span>
            <button
              type="button"
              onClick={() => { setShowHintsPanel(p => !p); setShowIntelPanel(false); }}
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 9,
                color: showHintsPanel ? '#fff' : (totalHintCount >= 5 ? '#C0633A' : '#AC8E66'),
                background: showHintsPanel
                  ? (totalHintCount >= 5 ? '#C0633A' : '#AC8E66')
                  : 'transparent',
                border: `1px solid ${totalHintCount >= 5 ? '#C0633A' : '#AC8E66'}`,
                borderRadius: 4,
                padding: '1px 6px',
                cursor: 'pointer',
                lineHeight: 1.4,
              }}
            >
              {totalHintCount} {totalHintCount === 1 ? 'Hinweis' : 'Hinweise'}
            </button>
          </>
        )}
        {undoCount > 0 && (
          <>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: colors.border, pointerEvents: 'none' }}>·</span>
            <button
              type="button"
              onClick={handleUndo}
              title={`ZenEngine Undo (${undoCount} ${undoCount === 1 ? 'Schritt' : 'Schritte'})`}
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 9,
                color: colors.placeholder,
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                borderRadius: 4,
                padding: '1px 6px',
                cursor: 'pointer',
                lineHeight: 1.4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = '#AC8E66';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(172,142,102,0.5)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = colors.placeholder;
                (e.currentTarget as HTMLButtonElement).style.borderColor = colors.border;
              }}
            >
              <FontAwesomeIcon icon={faRotateLeft} style={{ fontSize: 8 }} />
              Undo {undoCount > 1 ? `(${undoCount})` : ''}
            </button>
          </>
        )}
        <span
          role="button"
          tabIndex={0}
          onClick={() => setShowEngineAbout(true)}
          onKeyDown={e => e.key === 'Enter' && setShowEngineAbout(true)}
          onMouseEnter={e => (e.currentTarget.style.color = gold)}
          onMouseLeave={e => (e.currentTarget.style.color = colors.border)}
          style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: colors.border, marginLeft: 'auto', cursor: 'pointer', userSelect: 'none' }}
        >
          ZenEngine
        </span>
      </div>

      <ZenEngineAboutModal isOpen={showEngineAbout} onClose={() => setShowEngineAbout(false)} />

      <button
        type="button"
       
        className="zen-block-menu-dot"
        data-testid="zen-block-menu-dot"
        data-open={menuOpen ? 'true' : 'false'}
        style={{ left: dotPosition.x, top: dotPosition.y }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          rememberToolbarBlock();
          setMenuPosition({ x: MENU_LEFT_OFFSET, y: dotPosition.y + 20 });
          setMenuOpen((prev) => {
            const next = !prev;
            if (next) {
              window.requestAnimationFrame(() => {
                ensureToolbarScrollRoom();
              });
            }
            return next;
          });
        }}
        
        aria-expanded={menuOpen}
        aria-label="Open block menu"
      />

      {menuOpen && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={overlayMenuRef}
            className="zen-overlay-block-menu"
            style={{
              position: 'fixed',
              left: getClampedMenuViewportPosition(menuPosition).x,
              top: getClampedMenuViewportPosition(menuPosition).y,
            }}
            role="toolbar"
            aria-label="Block tools"
            onWheel={forwardOverlayWheelToEditor}
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
              <button type="button" onMouseDown={keepSelection} onClick={() => applyInlineFormat('bold')}>B</button>
              <button type="button" onMouseDown={keepSelection} onClick={() => applyInlineFormat('italic')}>I</button>
              <button type="button" onMouseDown={keepSelection} onClick={() => applyInlineFormat('underline')}>U</button>
              <button type="button" onMouseDown={keepSelection} onClick={() => applyInlineFormat('strikeThrough')}>S</button>
              <button type="button" onMouseDown={keepSelection} title="Marker Gelb" aria-label="Marker Gelb" onClick={() => applyColorFormat('highlight', '#fff2a8')}>M1</button>
              <button type="button" onMouseDown={keepSelection} title="Marker Grün" aria-label="Marker Grün" onClick={() => applyColorFormat('highlight', '#bff6c3')}>M2</button>
              <button type="button" onMouseDown={keepSelection} title="Marker Blau" aria-label="Marker Blau" onClick={() => applyColorFormat('highlight', '#c8e7ff')}>M3</button>
              <button type="button" onMouseDown={keepSelection} title="Text Rot" aria-label="Text Rot" onClick={() => applyColorFormat('text', '#c95c5c')}>T1</button>
              <button type="button" onMouseDown={keepSelection} title="Text Blau" aria-label="Text Blau" onClick={() => applyColorFormat('text', '#5b7fcb')}>T2</button>
              <button type="button" onMouseDown={keepSelection} title="Demarkieren" aria-label="Demarkieren" onClick={clearColorFormat}>DM</button>
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
                  <button type="button" data-testid="zen-convert-text" onMouseDown={keepSelectionAndRememberBlock} onClick={() => void convertCurrentBlock('paragraph')}>Text</button>
                  <button type="button" data-testid="zen-convert-h1" onMouseDown={keepSelectionAndRememberBlock} onClick={() => void convertCurrentBlock('header', { level: 1 })}>H1</button>
                  <button type="button" data-testid="zen-convert-h2" onMouseDown={keepSelectionAndRememberBlock} onClick={() => void convertCurrentBlock('header', { level: 2 })}>H2</button>
                  <button type="button" data-testid="zen-convert-h3" onMouseDown={keepSelectionAndRememberBlock} onClick={() => void convertCurrentBlock('header', { level: 3 })}>H3</button>
                  <button type="button" data-testid="zen-convert-ul" onMouseDown={keepSelectionAndRememberBlock} onClick={() => void convertCurrentBlock('list', { listStyle: 'unordered' })}>UL</button>
                  <button type="button" data-testid="zen-convert-ol" onMouseDown={keepSelectionAndRememberBlock} onClick={() => void convertCurrentBlock('list', { listStyle: 'ordered' })}>OL</button>
                  <button type="button" data-testid="zen-convert-quote" onMouseDown={keepSelectionAndRememberBlock} onClick={() => void convertCurrentBlock('quote')}>Quote</button>
                </div>
              </>
            )}

            {showImageSection && (
              <>
                <div className="zen-overlay-block-menu__section">Bildgröße</div>
                <div className="zen-overlay-block-menu__grid">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => applyCurrentImageSizePreset(pct)}
                    >
                      {pct}%
                    </button>
                  ))}
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
