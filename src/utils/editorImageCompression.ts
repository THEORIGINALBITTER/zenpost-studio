// Für Tauri: nur Sanity-Check (keine Canvas-Verarbeitung mehr) — 50MB
// Für Web: gilt auch als Canvas-Schutz
export const EDITOR_IMAGE_MAX_FILE_SIZE_MB = 50;
export const EDITOR_IMAGE_MAX_DIMENSION_PX = 1920;
export const EDITOR_IMAGE_COMPRESS_QUALITY = 0.8;

const SVG_MIME = 'image/svg+xml';
const GIF_MIME = 'image/gif';

const readBlobAsDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Datei konnte nicht gelesen werden.'));
    reader.readAsDataURL(blob);
  });

const loadImageFromObjectUrl = (objectUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'));
    img.src = objectUrl;
  });

const normalizeMime = (mime: string | undefined, fallbackName?: string): string => {
  const normalized = String(mime ?? '').trim().toLowerCase();
  if (normalized.startsWith('image/')) return normalized;

  const ext = fallbackName?.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return GIF_MIME;
    case 'svg':
      return SVG_MIME;
    case 'bmp':
      return 'image/bmp';
    case 'avif':
      return 'image/avif';
    default:
      return 'image/jpeg';
  }
};

export const isEditorImageOversized = (file: File) =>
  file.size > EDITOR_IMAGE_MAX_FILE_SIZE_MB * 1024 * 1024;

export const compressEditorImageBlobToDataUrl = async (
  blob: Blob,
  fileName?: string
): Promise<string> => {
  const mime = normalizeMime(blob.type, fileName);

  // Canvas re-encoding would break vector graphics and animated GIFs.
  if (mime === SVG_MIME || mime === GIF_MIME) {
    return readBlobAsDataUrl(blob);
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await loadImageFromObjectUrl(objectUrl);
    const scale = Math.min(
      1,
      EDITOR_IMAGE_MAX_DIMENSION_PX / Math.max(img.width || 1, img.height || 1)
    );
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas nicht verfügbar.');
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', EDITOR_IMAGE_COMPRESS_QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const compressEditorImageFileToDataUrl = (file: File): Promise<string> =>
  compressEditorImageBlobToDataUrl(file, file.name);

// ─── OPFS (Origin Private File System) — Web-only image storage ──────────────
// Replaces base64/Canvas approach in browser mode.
// Images are stored in navigator.storage (sandboxed, persistent, no permissions needed).
// Path format: opfs://zenpost-images/1234567890-photo.jpg

export const OPFS_IMAGE_DIR = 'zenpost-images';
export const OPFS_SCHEME = 'opfs://';

export const isOpfsImagePath = (src: string): boolean =>
  typeof src === 'string' && src.startsWith(OPFS_SCHEME);

const mimeFromName = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'avif': return 'image/avif';
    default: return 'image/jpeg';
  }
};

export const saveImageToOpfs = async (file: File): Promise<string> => {
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle(OPFS_IMAGE_DIR, { create: true });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${Date.now()}-${safeName}`;
  const fileHandle = await dir.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(file);
  await writable.close();
  return `${OPFS_SCHEME}${OPFS_IMAGE_DIR}/${fileName}`;
};

export const loadOpfsImageAsBlobUrl = async (opfsPath: string): Promise<string> => {
  const relative = opfsPath.slice(OPFS_SCHEME.length); // e.g. "zenpost-images/1234-photo.jpg"
  const parts = relative.split('/');
  if (parts.length < 2) throw new Error(`Ungültiger OPFS-Pfad: ${opfsPath}`);
  const dirName = parts.slice(0, -1).join('/');
  const fileName = parts[parts.length - 1];
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle(dirName, { create: false });
  const fileHandle = await dir.getFileHandle(fileName, { create: false });
  const file = await fileHandle.getFile();
  const mime = mimeFromName(fileName);
  return URL.createObjectURL(new Blob([await file.arrayBuffer()], { type: mime }));
};
