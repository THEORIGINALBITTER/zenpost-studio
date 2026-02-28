import { isTauri } from '@tauri-apps/api/core';

const LS_KEY = 'zenpost_converter_recent_v1';
const HISTORY_FILE = 'converter-history.json';

export interface ConverterHistoryItem {
  id: string;
  fileName: string;
  fromFormat: string;
  targetFormats: string[];
  createdAt: number;
}

export async function loadConverterHistory(): Promise<ConverterHistoryItem[]> {
  if (isTauri()) {
    try {
      const { readTextFile, exists, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      const ok = await exists(HISTORY_FILE, { baseDir: BaseDirectory.AppData });
      if (!ok) return [];
      const text = await readTextFile(HISTORY_FILE, { baseDir: BaseDirectory.AppData });
      const data: unknown = JSON.parse(text);
      return Array.isArray(data) ? (data as ConverterHistoryItem[]).slice(0, 12) : [];
    } catch {
      return [];
    }
  }

  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? (data as ConverterHistoryItem[]).slice(0, 12) : [];
  } catch {
    return [];
  }
}

export async function saveConverterHistory(items: ConverterHistoryItem[]): Promise<void> {
  const data = items.slice(0, 12);

  if (isTauri()) {
    try {
      const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      await writeTextFile(HISTORY_FILE, JSON.stringify(data, null, 2), {
        baseDir: BaseDirectory.AppData,
      });
      return;
    } catch {
      // fall through to localStorage
    }
  }

  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}
