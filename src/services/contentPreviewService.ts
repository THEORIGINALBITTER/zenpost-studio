export type ContentPreviewImageItem = {
  kind: 'image';
  src: string;
  fileName: string;
  format?: string;
};

export type ContentPreviewDocumentItem = {
  kind: 'document';
  fileName: string;
  format?: string;
  content: string;
};

export type ContentPreviewItem = ContentPreviewImageItem | ContentPreviewDocumentItem;

export type ContentPreviewState = {
  title: string;
  subtitle?: string;
  items: ContentPreviewItem[];
  openAction?: {
    label?: string;
    onOpen: () => void | Promise<void>;
  };
};

export const getImageMimeTypeForFileName = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'bmp':
      return 'image/bmp';
    case 'svg':
      return 'image/svg+xml';
    case 'avif':
      return 'image/avif';
    default:
      return 'image/jpeg';
  }
};

export const createBase64FromBytes = (bytes: Uint8Array): string => {
  const chunkSize = 8192;
  let binary = '';
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...(bytes.subarray(index, index + chunkSize) as unknown as number[]));
  }
  return btoa(binary);
};

export const createImageDataUrlFromBytes = (bytes: Uint8Array, fileName: string): string => {
  const mimeType = getImageMimeTypeForFileName(fileName);
  const base64 = createBase64FromBytes(bytes);
  return `data:${mimeType};base64,${base64}`;
};

export const downloadPreviewAsset = async (src: string, fileName: string): Promise<void> => {
  const response = await fetch(src);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1200);
};
