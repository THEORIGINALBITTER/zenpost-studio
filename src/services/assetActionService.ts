import { readFile } from '@tauri-apps/plugin-fs';
import { getCloudDocumentUrl } from './cloudStorageService';
import {
  openConverterWithFile,
  type OpenConverterWithFileRequest,
} from './converterBridgeService';
import { getImageMimeTypeForFileName } from './contentPreviewService';

export type ConverterImagePreset = NonNullable<OpenConverterWithFileRequest['preset']>;

export type LocalImageAsset = {
  source: 'local';
  fileName: string;
  path: string;
};

export type CloudImageAsset = {
  source: 'cloud';
  fileName: string;
  docId: number;
  mimeType?: string | null;
};

export type ConverterImageAsset = LocalImageAsset | CloudImageAsset;

export type ConverterImageActionDefinition = {
  key: 'converter' | 'format' | 'compress' | 'filters';
  label: string;
  description: string;
  preset: ConverterImagePreset;
};

export const CONVERTER_IMAGE_ACTIONS: ConverterImageActionDefinition[] = [
  {
    key: 'converter',
    label: 'Im Converter öffnen',
    description: 'Bild direkt in den Converter laden',
    preset: 'default',
  },
  {
    key: 'format',
    label: 'Format ändern',
    description: 'Mit Format-Vorschlag für PNG/JPG/WEBP starten',
    preset: 'format-change',
  },
  {
    key: 'compress',
    label: 'Größe verkleinern',
    description: 'Direkt für kleinere Ausgabe im Converter öffnen',
    preset: 'compress-image',
  },
  {
    key: 'filters',
    label: 'Farben / Filter',
    description: 'Mit Fokus auf Bildoptionen weiterarbeiten',
    preset: 'image-filters',
  },
];

export async function openImageAssetInConverter(
  asset: ConverterImageAsset,
  preset: ConverterImagePreset = 'default',
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    if (asset.source === 'local') {
      const bytes = await readFile(asset.path);
      const file = new File([bytes], asset.fileName, {
        type: getImageMimeTypeForFileName(asset.fileName),
      });
      openConverterWithFile({
        file,
        source: 'project-map-local',
        preset,
      });
      return { success: true };
    }

    const url = getCloudDocumentUrl(asset.docId);
    if (!url) {
      return { success: false, error: 'Cloud-Bild konnte nicht für den Converter geladen werden.' };
    }

    const response = await fetch(url);
    const blob = await response.blob();
    const file = new File([blob], asset.fileName, {
      type: blob.type || asset.mimeType || getImageMimeTypeForFileName(asset.fileName),
    });
    openConverterWithFile({
      file,
      source: 'project-map-cloud',
      preset,
    });
    return { success: true };
  } catch {
    return { success: false, error: 'Bild konnte nicht an den Converter übergeben werden.' };
  }
}
