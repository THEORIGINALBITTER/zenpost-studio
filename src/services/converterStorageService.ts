/**
 * Converter Storage Service
 * Verwaltet Zielordner für den Converter Studio:
 * - Browser: File System Access API — Handles in IndexedDB
 * - Tauri: Pfade direkt aus Settings
 */

import { isTauri } from '@tauri-apps/api/core';
import { writeFile, writeTextFile, mkdir } from '@tauri-apps/plugin-fs';
import { loadZenStudioSettings, patchZenStudioSettings } from './zenStudioSettingsService';

// ─── IndexedDB ────────────────────────────────────────────────────────────────

const IDB_DB = 'zenpost_converter_v1';
const IDB_STORE = 'dir_handles';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export type ConverterFolderType = 'images' | 'archive';

export async function storeConverterHandle(
  type: ConverterFolderType,
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, type);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getConverterHandle(
  type: ConverterFolderType,
): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(type);
      req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function clearConverterHandle(type: ConverterFolderType): Promise<void> {
  try {
    const db = await openIDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(type);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

// ─── Ordner wählen (Browser) ──────────────────────────────────────────────────

export function canUseDirectoryPicker(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function';
}

export function canUseOpfs(): boolean {
  const storage = typeof navigator !== 'undefined'
    ? (navigator.storage as unknown as { getDirectory?: () => Promise<FileSystemDirectoryHandle> })
    : undefined;
  return !!storage && typeof storage.getDirectory === 'function';
}

/**
 * Öffnet den Browser-Ordner-Picker und speichert Handle + Namen in Settings.
 * Gibt den Ordnernamen zurück oder null bei Abbruch.
 */
export async function pickConverterFolder(
  type: ConverterFolderType,
): Promise<string | null> {
  if (!canUseDirectoryPicker()) return null;
  try {
    // mode: 'read' für maximale Browser-Kompatibilität (inkl. Safari)
    // Schreibzugriff wird beim ersten Speichern separat angefragt
    // @ts-expect-error — File System Access API
    const handle = await window.showDirectoryPicker({ mode: 'read' }) as FileSystemDirectoryHandle;
    await storeConverterHandle(type, handle);
    const name = handle.name;
    const patch = type === 'images'
      ? { converter: { ...loadZenStudioSettings().converter, imagesFolderName: name } }
      : { converter: { ...loadZenStudioSettings().converter, archiveFolderName: name } };
    patchZenStudioSettings(patch);
    return name;
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === 'AbortError') return null;
    throw err;
  }
}

// ─── Tauri: Ordner wählen ────────────────────────────────────────────────────

export async function pickConverterFolderTauri(
  type: ConverterFolderType,
): Promise<string | null> {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({ directory: true, multiple: false });
  if (!selected || typeof selected !== 'string') return null;
  const name = selected.split('/').pop() ?? selected;
  const current = loadZenStudioSettings().converter;
  const patch = type === 'images'
    ? { converter: { ...current, imagesFolderPath: selected, imagesFolderName: name } }
    : { converter: { ...current, archiveFolderPath: selected, archiveFolderName: name } };
  patchZenStudioSettings(patch);
  return name;
}

// ─── Datei speichern ─────────────────────────────────────────────────────────

/**
 * Speichert eine Datei in den konfigurierten Converter-Ordner.
 * content: string (Text) oder Uint8Array (Binary).
 * Gibt true zurück wenn erfolgreich.
 */
export async function saveToConverterFolder(
  type: ConverterFolderType,
  filename: string,
  content: string | Uint8Array,
): Promise<boolean> {
  if (isTauri()) {
    const settings = loadZenStudioSettings().converter;
    const folderPath = type === 'images' ? settings.imagesFolderPath : settings.archiveFolderPath;
    if (!folderPath) return false;
    try {
      await mkdir(folderPath, { recursive: true });
      const filePath = `${folderPath}/${filename}`;
      if (content instanceof Uint8Array) {
        await writeFile(filePath, content);
      } else {
        await writeTextFile(filePath, content);
      }
      return true;
    } catch {
      return false;
    }
  }

  // Browser: OPFS (falls aktiviert)
  const settings = loadZenStudioSettings().converter;
  if (settings.useOpfsInWeb && canUseOpfs()) {
    try {
      const storage = navigator.storage as unknown as { getDirectory: () => Promise<FileSystemDirectoryHandle> };
      const root = await storage.getDirectory();
      const converterDir = await root.getDirectoryHandle('converter', { create: true });
      const targetDir = await converterDir.getDirectoryHandle(type, { create: true });
      const fileHandle = await targetDir.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content instanceof Uint8Array ? content : content);
      await writable.close();
      return true;
    } catch {
      return false;
    }
  }

  // Browser: File System Access API (Ordner-Picker)
  const handle = await getConverterHandle(type);
  if (!handle) return false;
  try {
    // Permission prüfen / anfordern (File System Access API extension)
    const h = handle as FileSystemDirectoryHandle & {
      queryPermission?: (desc: object) => Promise<string>;
      requestPermission?: (desc: object) => Promise<string>;
    };
    if (h.queryPermission) {
      const perm = await h.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted' && h.requestPermission) {
        const req = await h.requestPermission({ mode: 'readwrite' });
        if (req !== 'granted') return false;
      }
    }
    const fileHandle = await handle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content instanceof Uint8Array ? content.buffer : content);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

// ─── Hilfsfunktion: base64 data URL → Uint8Array ─────────────────────────────

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
