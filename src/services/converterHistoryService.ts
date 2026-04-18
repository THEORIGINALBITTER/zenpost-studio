import { isTauri } from '@tauri-apps/api/core';
import { isImageFormat, type SupportedFormat } from '../utils/fileConverter';
import { getCloudDocumentUrl } from './cloudStorageService';

const LS_KEY = 'zenpost_converter_recent_v1';
const HISTORY_FILE = 'converter-history.json';

export interface ConverterHistoryItem {
  id: string;
  fileName: string;
  fromFormat: SupportedFormat;
  targetFormats: SupportedFormat[];
  createdAt: number;
  previewImages?: Array<{
    format: SupportedFormat;
    fileName: string;
    url: string;
  }>;
  cloudImageAssets?: Array<{
    format: string;
    fileName: string;
    docId: number;
    url: string;
  }>;
}

const isBlobUrl = (url: string): boolean => /^blob:/i.test(url);

const sanitizeConverterHistory = (
  items: ConverterHistoryItem[],
): { items: ConverterHistoryItem[]; changed: boolean } => {
  let changed = false;

  const sanitized = items.flatMap((item) => {
    const cloudImageAssets = Array.isArray(item.cloudImageAssets)
      ? item.cloudImageAssets
          .map((asset) => {
            const freshUrl = getCloudDocumentUrl(asset?.docId ?? 0) ?? asset?.url ?? '';
            return {
              ...asset,
              url: freshUrl,
            };
          })
          .filter((asset) => typeof asset?.url === 'string' && /^https?:\/\//i.test(asset.url))
      : [];
    const previewImages = Array.isArray(item.previewImages)
      ? item.previewImages.filter((image) => typeof image?.url === 'string' && !isBlobUrl(image.url))
      : [];

    const hasImageTargets = Array.isArray(item.targetFormats) && item.targetFormats.some((format) => isImageFormat(format));
    const normalizedPreviewImages = cloudImageAssets.length > 0
      ? cloudImageAssets.map((asset) => ({
          format: asset.format as SupportedFormat,
          fileName: asset.fileName,
          url: asset.url,
        }))
      : previewImages;

    const didChangeCloudAssets = cloudImageAssets.length !== (item.cloudImageAssets?.length ?? 0);
    const didChangePreviewImages =
      normalizedPreviewImages.length !== (item.previewImages?.length ?? 0) ||
      normalizedPreviewImages.some((image, index) => item.previewImages?.[index]?.url !== image.url);

    if (didChangeCloudAssets || didChangePreviewImages) {
      changed = true;
    }

    if (hasImageTargets && cloudImageAssets.length === 0 && normalizedPreviewImages.length === 0) {
      changed = true;
      return [];
    }

    return [{
      ...item,
      previewImages: normalizedPreviewImages.length > 0 ? normalizedPreviewImages : undefined,
      cloudImageAssets: cloudImageAssets.length > 0 ? cloudImageAssets : undefined,
    }];
  });

  return {
    items: sanitized.slice(0, 12),
    changed,
  };
};

export async function loadConverterHistory(): Promise<ConverterHistoryItem[]> {
  if (isTauri()) {
    try {
      const { readTextFile, exists, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      const ok = await exists(HISTORY_FILE, { baseDir: BaseDirectory.AppData });
      if (!ok) return [];
      const text = await readTextFile(HISTORY_FILE, { baseDir: BaseDirectory.AppData });
      const data: unknown = JSON.parse(text);
      if (!Array.isArray(data)) return [];
      const sanitized = sanitizeConverterHistory(data as ConverterHistoryItem[]);
      if (sanitized.changed) {
        await saveConverterHistory(sanitized.items);
      }
      return sanitized.items;
    } catch {
      return [];
    }
  }

  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const sanitized = sanitizeConverterHistory(data as ConverterHistoryItem[]);
    if (sanitized.changed) {
      await saveConverterHistory(sanitized.items);
    }
    return sanitized.items;
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
