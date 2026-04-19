import { useEffect, useMemo, useRef, useState } from 'react';
import {
  faFileCode,
  faFileAlt,
  faFilePdf,
  faFileLines,
  faRobot,
  faFileWord,
} from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { isTauri } from '@tauri-apps/api/core';
import JSZip from 'jszip';
import { ZenSettingsModal, ZenGeneratingModal, ZenImageGalleryModal } from '../kits/PatternKit/ZenModalSystem';
import { Step1FormatSelection } from './converter-steps/Step1FormatSelection';
import { Step4Result } from './converter-steps/Step4Result';
import {
  convertFile,
  SupportedFormat,
  detectFormatFromFilename,
  getFileExtension,
  isImageFormat,
} from '../utils/fileConverter';
import { importDocumentToMarkdown } from '../services/documentImportService';
import type { OpenConverterWithFileRequest } from '../services/converterBridgeService';
import { loadConverterHistory, saveConverterHistory, type ConverterHistoryItem } from '../services/converterHistoryService';
import { loadZenStudioSettings, patchZenStudioSettings } from '../services/zenStudioSettingsService';
import { saveToConverterFolder, saveToLocalConverterFolder, dataUrlToUint8Array } from '../services/converterStorageService';
import { canUploadToZenCloud, getCloudDocumentUrl, uploadCloudDocument, uploadCloudImageDataUrl } from '../services/cloudStorageService';
import { resolveImageMeta, saveImageMeta } from '../services/imageMetaService';

interface FormatOption {
  value: SupportedFormat;
  label: string;
  icon: any;
}

const formatOptions: FormatOption[] = [
  { value: 'code', label: 'Code (AI)', icon: faRobot },
  { value: 'json', label: 'JSON', icon: faFileCode },
  { value: 'md', label: 'Markdown', icon: faFileLines },
  { value: 'gfm', label: 'Markdown (GitHub)', icon: faGithub },
  { value: 'editorjs', label: 'Editor.js', icon: faFileCode },
  { value: 'html', label: 'HTML', icon: faFileAlt },
  { value: 'txt', label: 'Text', icon: faFileAlt },
  { value: 'pdf', label: 'PDF', icon: faFilePdf },
  { value: 'docx', label: 'Word', icon: faFileWord },
  { value: 'png', label: 'PNG', icon: faFileAlt },
  { value: 'jpg', label: 'JPG', icon: faFileAlt },
  { value: 'webp', label: 'WEBP', icon: faFileAlt },
  { value: 'svg', label: 'SVG', icon: faFileAlt },
];

interface ConverterScreenProps {
  onBack?: () => void;
  onStepChange?: (step: number) => void;
  onOpenInContentStudio?: (content: string, fileName: string) => void;
  pendingOpenFileRequest?: OpenConverterWithFileRequest | null;
  onPendingOpenFileHandled?: (requestId: string) => void;
}

type ImagePreset = 'logo' | 'illustration' | 'photo' | 'custom';
type CropRect = { x: number; y: number; w: number; h: number };
type SvgSize = { width: number; height: number };
type ImageFilters = {
  grayscale: number;
  sepia: number;
  contrast: number;
  brightness: number;
  saturation: number;
  blur: number;
  sharpen: number;
};

type ImageMetaFields = {
  title: string;
  altText: string;
  caption: string;
  tags: string[];
};

export const ConverterScreen = ({
  onBack: _onBack,
  onStepChange,
  onOpenInContentStudio,
  pendingOpenFileRequest,
  onPendingOpenFileHandled,
}: ConverterScreenProps) => {
  const ensureZenCloudImageUrl = async (image: { fileName: string; url: string }): Promise<string | null> => {
    if (!image.url) return null;
    if (/^https?:\/\//i.test(image.url)) return image.url;
    if (/^data:image\//i.test(image.url)) {
      const uploaded = await uploadCloudImageDataUrl(image.url, image.fileName);
      return uploaded?.url ?? null;
    }
    if (/^blob:/i.test(image.url)) {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const file = new File([blob], image.fileName, { type: blob.type || 'image/png' });
      const uploaded = await uploadCloudDocument(file);
      return uploaded?.url ?? null;
    }
    return image.url;
  };

  const toPreviewUrl = (format: SupportedFormat, content: string): string | null => {
    if (!isImageFormat(format)) return null;
    if (content.startsWith('data:image/') || content.startsWith('blob:') || /^https?:\/\//i.test(content)) {
      return content;
    }
    if (format === 'svg' && content.trim().startsWith('<svg')) {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`;
    }
    return null;
  };

  const getImageMimeType = (format: SupportedFormat): string => {
    if (format === 'png') return 'image/png';
    if (format === 'webp') return 'image/webp';
    if (format === 'svg') return 'image/svg+xml';
    return 'image/jpeg';
  };

  // Step State
  const [currentStep, setCurrentStep] = useState(1);

  // Notify parent of step changes
  const handleSetCurrentStep = (step: number) => {
    setCurrentStep(step);
    onStepChange?.(step);
  };

  // Data State
  const [inputContent, setInputContent] = useState('');
  const [inputBinaryContent, setInputBinaryContent] = useState<ArrayBuffer | null>(null);
  const [outputByFormat, setOutputByFormat] = useState<Record<string, string>>({});
  const [outputSizeByFormat, setOutputSizeByFormat] = useState<Record<string, number>>({});
  const blobUrlsRef = useRef<string[]>([]);
  const [fromFormat, setFromFormat] = useState<SupportedFormat>('txt');
  const [selectedToFormats, setSelectedToFormats] = useState<SupportedFormat[]>(['md']);
  const [activeResultFormat, setActiveResultFormat] = useState<SupportedFormat>('md');
  const [isConverting, setIsConverting] = useState(false);
  const [isPreviewRefreshing, setIsPreviewRefreshing] = useState(false);
  const [isPreparingInput, setIsPreparingInput] = useState(false);
  const [imageQuality, setImageQuality] = useState(86);
  const [imageRasterSize, setImageRasterSize] = useState(160);
  const [imageSmoothEdges, setImageSmoothEdges] = useState(true);
  const [maxImageOutputSize, setMaxImageOutputSize] = useState<number | null>(() => (
    loadZenStudioSettings().converter.maxImageOutputSize ?? null
  ));
  const [uiMaxSizeOpen, setUiMaxSizeOpen] = useState<boolean>(() => loadZenStudioSettings().converter.uiMaxSizeOpen);
  const [uiFiltersOpen, setUiFiltersOpen] = useState<boolean>(() => loadZenStudioSettings().converter.uiFiltersOpen);
  const [uiExportOpen, setUiExportOpen] = useState<boolean>(() => loadZenStudioSettings().converter.uiExportOpen);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [cropAspect, setCropAspect] = useState<number | null>(null);
  const [svgOutputSize, setSvgOutputSize] = useState<SvgSize | null>(null);
  const [imageFilters, setImageFilters] = useState<ImageFilters>({
    grayscale: 0,
    sepia: 0,
    contrast: 100,
    brightness: 100,
    saturation: 100,
    blur: 0,
    sharpen: 0,
  });
  const [activeImagePreset, setActiveImagePreset] = useState<ImagePreset>('custom');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [cloudSaveFeedback, setCloudSaveFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [detectedSourceFormat, setDetectedSourceFormat] = useState<SupportedFormat | null>(null);
  const [recentConversions, setRecentConversions] = useState<ConverterHistoryItem[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImageGalleryOpen, setIsImageGalleryOpen] = useState(false);
  const [imageMeta, setImageMeta] = useState<ImageMetaFields>({ title: '', altText: '', caption: '', tags: [] });
  const [imageMetaContext, setImageMetaContext] = useState<{
    cloudDocId?: number | null;
    projectId?: number | null;
    url?: string | null;
    fileName?: string | null;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastConversionRef = useRef<{ outputs: Record<string, string>; sizes: Record<string, number> } | null>(null);
  const historyHydratedRef = useRef(false);
  const handledPendingRequestIdsRef = useRef<Set<string>>(new Set());
  const latestInputBinaryContentRef = useRef<ArrayBuffer | null>(null);
  const latestInputTextContentRef = useRef<string>('');
  const latestFromFormatRef = useRef<SupportedFormat | null>(null);
  const latestFileNameRef = useRef<string>('');

  const parseCloudDocIdFromSource = (source?: string | null): number | null => {
    const raw = String(source ?? '').trim();
    if (!raw) return null;
    const match = raw.match(/^project-map-cloud:(\d+)$/i);
    if (!match) return null;
    const docId = parseInt(match[1], 10);
    return Number.isFinite(docId) && docId > 0 ? docId : null;
  };

  const applyPendingPreset = async (
    preset: OpenConverterWithFileRequest['preset'],
    file: File,
  ): Promise<void> => {
    const detectedFormat = detectFormatFromFilename(file.name);
    const isImage = !!detectedFormat && isImageFormat(detectedFormat);
    if (!isImage) return;

    if (preset === 'format-change') {
      const targets: SupportedFormat[] = detectedFormat === 'svg' ? ['png'] : ['jpg', 'png', 'webp'];
      setSelectedToFormats(targets);
      setActiveResultFormat(targets[0]);
      return;
    }

    if (preset === 'compress-image') {
      const targets: SupportedFormat[] = detectedFormat === 'svg' ? ['png'] : ['webp'];
      setSelectedToFormats(targets);
      setActiveResultFormat(targets[0]);
      const success = await runConversion({ targetFormats: targets });
      if (success) handleSetCurrentStep(2);
      return;
    }

    if (preset === 'image-filters') {
      const targets: SupportedFormat[] = detectedFormat === 'svg' ? ['png'] : ['png', 'webp'];
      setSelectedToFormats(targets);
      setActiveResultFormat(targets[0]);
      const isRasterFilterSource =
        detectedFormat === 'png' ||
        detectedFormat === 'jpg' ||
        detectedFormat === 'jpeg' ||
        detectedFormat === 'webp';
      const success = await runConversion({ targetFormats: targets });
      if (success || isRasterFilterSource) handleSetCurrentStep(2);
    }
  };

  const targetFormatOptions = formatOptions.filter((option) => option.value !== 'code');
  const availableOutputFormats = useMemo(
    () => selectedToFormats.filter((format) => Boolean(outputByFormat[format])),
    [selectedToFormats, outputByFormat]
  );
  const activeOutputContent = outputByFormat[activeResultFormat] ?? '';
  const hasAnyInput = inputBinaryContent !== null || inputContent.trim().length > 0;
  const showImageOptions = Boolean(detectedSourceFormat && isImageFormat(detectedSourceFormat));
  const currentSettings = loadZenStudioSettings();
  const converterSettings = currentSettings.converter;
  const zenCloudImageModeEnabled = converterSettings.imageStorageMode === 'cloud';
  const zenCloudUploadAvailable = canUploadToZenCloud();
  const converterStorageStatus = zenCloudImageModeEnabled
    ? zenCloudUploadAvailable
      ? {
          tone: 'ready' as const,
          title: 'Bildziel: ZenCloud aktiv',
          detail: `Neue Bild-Konvertierungen werden direkt in ZenCLoud // ${currentSettings.cloudProjectName ?? 'ZenCloud'} gespeichert.`,
        }
      : {
          tone: 'warning' as const,
          title: 'Bildziel: ZenCloud gewählt, aber nicht verbunden',
          detail: 'Für echte Cloud-Assets fehlen Login oder aktives ZenCloud-Projekt.',
        }
    : {
        tone: 'neutral' as const,
        title: 'Bildziel: Lokal',
        detail: 'Bilder bleiben lokal, bis du den Bilder-Ordner oder ZenCloud-Modus aktivierst.',
      };

  useEffect(() => {
    void loadConverterHistory().then((items) => {
      if (items.length > 0) setRecentConversions(items);
      historyHydratedRef.current = true;
    });
  }, []);

  useEffect(() => {
    if (!historyHydratedRef.current) return;
    void saveConverterHistory(recentConversions);
  }, [recentConversions]);

  useEffect(() => {
    if (!pendingOpenFileRequest?.requestId || !pendingOpenFileRequest.file) return;
    if (handledPendingRequestIdsRef.current.has(pendingOpenFileRequest.requestId)) return;
    handledPendingRequestIdsRef.current.add(pendingOpenFileRequest.requestId);
    handleSetCurrentStep(1);
    void (async () => {
      await handleFileUpload(pendingOpenFileRequest.file, pendingOpenFileRequest.source);
      // Wait one tick so uploaded file state is committed before preset auto-conversion runs.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      await applyPendingPreset(pendingOpenFileRequest.preset, pendingOpenFileRequest.file);
      onPendingOpenFileHandled?.(pendingOpenFileRequest.requestId);
    })();
  }, [onPendingOpenFileHandled, pendingOpenFileRequest]);

  const isRasterOutput = (format: SupportedFormat) =>
    format === 'png' || format === 'jpg' || format === 'jpeg' || format === 'webp';

  const shouldCrop = (rect: CropRect | null) => {
    if (!rect) return false;
    const delta = Math.abs(rect.w - 1) + Math.abs(rect.h - 1) + Math.abs(rect.x) + Math.abs(rect.y);
    return delta > 0.001;
  };

  const parseLength = (value: string | null): { num: number; unit: string } | null => {
    if (!value) return null;
    const match = String(value).trim().match(/^(-?\d+(\.\d+)?)([a-z%]*)$/i);
    if (!match) return null;
    return { num: parseFloat(match[1]), unit: match[3] ?? '' };
  };

  const formatLength = (num: number, unit: string) => `${Math.max(0, num)}${unit}`;

  const cropSvgOutput = (svgText: string, rect: CropRect): string | null => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgEl = doc.documentElement;
      if (!svgEl || svgEl.tagName.toLowerCase() !== 'svg') return null;

      const vb = svgEl.getAttribute('viewBox');
      let vbX = 0;
      let vbY = 0;
      let vbW = 0;
      let vbH = 0;

      if (vb) {
        const parts = vb.split(/[\s,]+/).map((p) => parseFloat(p));
        if (parts.length >= 4 && parts.every((n) => !Number.isNaN(n))) {
          [vbX, vbY, vbW, vbH] = parts;
        }
      }

      if (!vb || vbW <= 0 || vbH <= 0) {
        const w = parseLength(svgEl.getAttribute('width'));
        const h = parseLength(svgEl.getAttribute('height'));
        if (!w || !h || w.num <= 0 || h.num <= 0) return null;
        vbX = 0;
        vbY = 0;
        vbW = w.num;
        vbH = h.num;
      }

      const nx = vbX + rect.x * vbW;
      const ny = vbY + rect.y * vbH;
      const nw = rect.w * vbW;
      const nh = rect.h * vbH;
      svgEl.setAttribute('viewBox', `${nx} ${ny} ${nw} ${nh}`);

      const wAttr = parseLength(svgEl.getAttribute('width'));
      const hAttr = parseLength(svgEl.getAttribute('height'));
      if (wAttr && hAttr && wAttr.num > 0 && hAttr.num > 0) {
        svgEl.setAttribute('width', formatLength(wAttr.num * rect.w, wAttr.unit));
        svgEl.setAttribute('height', formatLength(hAttr.num * rect.h, hAttr.unit));
      }

      return new XMLSerializer().serializeToString(svgEl);
    } catch {
      return null;
    }
  };

  const applySvgOutputSize = (svgText: string, size: SvgSize): string | null => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgEl = doc.documentElement;
      if (!svgEl || svgEl.tagName.toLowerCase() !== 'svg') return null;

      const width = Math.max(1, Math.round(size.width));
      const height = Math.max(1, Math.round(size.height));

      const vb = svgEl.getAttribute('viewBox');
      if (!vb) {
        const w = parseLength(svgEl.getAttribute('width'));
        const h = parseLength(svgEl.getAttribute('height'));
        if (w && h && w.num > 0 && h.num > 0) {
          svgEl.setAttribute('viewBox', `0 0 ${w.num} ${h.num}`);
        }
      }

      svgEl.setAttribute('width', `${width}px`);
      svgEl.setAttribute('height', `${height}px`);

      return new XMLSerializer().serializeToString(svgEl);
    } catch {
      return null;
    }
  };

  const applySvgFilters = (svgText: string, filters: ImageFilters): string | null => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgEl = doc.documentElement;
      if (!svgEl || svgEl.tagName.toLowerCase() !== 'svg') return null;

      const ns = 'http://www.w3.org/2000/svg';
      let defs = svgEl.querySelector('defs');
      if (!defs) {
        defs = doc.createElementNS(ns, 'defs');
        svgEl.insertBefore(defs, svgEl.firstChild);
      }

      const existing = defs.querySelector('#zenpost-filters');
      if (existing) existing.remove();

      const filterEl = doc.createElementNS(ns, 'filter');
      filterEl.setAttribute('id', 'zenpost-filters');
      filterEl.setAttribute('color-interpolation-filters', 'sRGB');
      filterEl.setAttribute('x', '-20%');
      filterEl.setAttribute('y', '-20%');
      filterEl.setAttribute('width', '140%');
      filterEl.setAttribute('height', '140%');

      let input = 'SourceGraphic';

      if (filters.blur > 0) {
        const blur = doc.createElementNS(ns, 'feGaussianBlur');
        blur.setAttribute('in', input);
        blur.setAttribute('stdDeviation', String(filters.blur));
        blur.setAttribute('result', 'blur');
        filterEl.appendChild(blur);
        input = 'blur';
      }

      const g = Math.min(1, Math.max(0, filters.grayscale / 100));
      if (g > 0) {
        const m = [
          0.2126 + 0.7874 * (1 - g), 0.7152 - 0.7152 * (1 - g), 0.0722 - 0.0722 * (1 - g), 0, 0,
          0.2126 - 0.2126 * (1 - g), 0.7152 + 0.2848 * (1 - g), 0.0722 - 0.0722 * (1 - g), 0, 0,
          0.2126 - 0.2126 * (1 - g), 0.7152 - 0.7152 * (1 - g), 0.0722 + 0.9278 * (1 - g), 0, 0,
          0, 0, 0, 1, 0,
        ];
        const fe = doc.createElementNS(ns, 'feColorMatrix');
        fe.setAttribute('in', input);
        fe.setAttribute('type', 'matrix');
        fe.setAttribute('values', m.map((v) => v.toFixed(6)).join(' '));
        fe.setAttribute('result', 'grayscale');
        filterEl.appendChild(fe);
        input = 'grayscale';
      }

      const s = Math.min(1, Math.max(0, filters.sepia / 100));
      if (s > 0) {
        const sepia = [
          0.393, 0.769, 0.189, 0, 0,
          0.349, 0.686, 0.168, 0, 0,
          0.272, 0.534, 0.131, 0, 0,
          0, 0, 0, 1, 0,
        ];
        const identity = [
          1, 0, 0, 0, 0,
          0, 1, 0, 0, 0,
          0, 0, 1, 0, 0,
          0, 0, 0, 1, 0,
        ];
        const m = identity.map((v, i) => v * (1 - s) + sepia[i] * s);
        const fe = doc.createElementNS(ns, 'feColorMatrix');
        fe.setAttribute('in', input);
        fe.setAttribute('type', 'matrix');
        fe.setAttribute('values', m.map((v) => v.toFixed(6)).join(' '));
        fe.setAttribute('result', 'sepia');
        filterEl.appendChild(fe);
        input = 'sepia';
      }

      const sat = Math.max(0, filters.saturation / 100);
      if (sat !== 1) {
        const fe = doc.createElementNS(ns, 'feColorMatrix');
        fe.setAttribute('in', input);
        fe.setAttribute('type', 'saturate');
        fe.setAttribute('values', sat.toFixed(4));
        fe.setAttribute('result', 'saturate');
        filterEl.appendChild(fe);
        input = 'saturate';
      }

      const contrast = Math.max(0, filters.contrast / 100);
      const brightness = (filters.brightness - 100) / 100;
      if (contrast !== 1 || brightness !== 0) {
        const intercept = brightness + 0.5 * (1 - contrast);
        const fe = doc.createElementNS(ns, 'feComponentTransfer');
        fe.setAttribute('in', input);
        const channels = ['R', 'G', 'B'] as const;
        channels.forEach((ch) => {
          const func = doc.createElementNS(ns, `feFunc${ch}`);
          func.setAttribute('type', 'linear');
          func.setAttribute('slope', contrast.toFixed(4));
          func.setAttribute('intercept', intercept.toFixed(4));
          fe.appendChild(func);
        });
        fe.setAttribute('result', 'transfer');
        filterEl.appendChild(fe);
        input = 'transfer';
      }

      if (filters.sharpen > 0) {
        const a = Math.min(1, Math.max(0, filters.sharpen / 100));
        const k = [
          0, -a, 0,
          -a, 1 + 4 * a, -a,
          0, -a, 0,
        ];
        const fe = doc.createElementNS(ns, 'feConvolveMatrix');
        fe.setAttribute('in', input);
        fe.setAttribute('kernelMatrix', k.map((v) => v.toFixed(4)).join(' '));
        fe.setAttribute('divisor', '1');
        fe.setAttribute('preserveAlpha', 'true');
        fe.setAttribute('result', 'sharpen');
        filterEl.appendChild(fe);
        input = 'sharpen';
      }

      defs.appendChild(filterEl);
      svgEl.setAttribute('filter', 'url(#zenpost-filters)');

      return new XMLSerializer().serializeToString(svgEl);
    } catch {
      return null;
    }
  };

  const cropRasterOutput = async (
    content: string,
    format: SupportedFormat,
    rect: CropRect,
  ): Promise<{ data: string; byteSize?: number } | null> => {
    try {
      const blob = content.startsWith('blob:')
        ? await (await fetch(content)).blob()
        : await (await fetch(content)).blob();
      const bitmap = await createImageBitmap(blob);
      const sx = Math.max(0, Math.floor(rect.x * bitmap.width));
      const sy = Math.max(0, Math.floor(rect.y * bitmap.height));
      const sw = Math.max(1, Math.floor(rect.w * bitmap.width));
      const sh = Math.max(1, Math.floor(rect.h * bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
      const mime =
        format === 'jpg' || format === 'jpeg'
          ? 'image/jpeg'
          : format === 'webp'
          ? 'image/webp'
          : 'image/png';
      const blobOut = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (b) => resolve(b ?? new Blob()),
          mime,
          mime === 'image/png' ? undefined : imageQuality / 100
        );
      });
      const url = URL.createObjectURL(blobOut);
      return { data: url, byteSize: blobOut.size };
    } catch {
      return null;
    }
  };

  const hasActiveFilters = (f: ImageFilters) =>
    f.grayscale > 0 ||
    f.sepia > 0 ||
    f.contrast !== 100 ||
    f.brightness !== 100 ||
    f.saturation !== 100 ||
    f.blur > 0 ||
    f.sharpen > 0;

  const buildFilterString = (f: ImageFilters) =>
    `grayscale(${f.grayscale}%) sepia(${f.sepia}%) contrast(${f.contrast}%) brightness(${f.brightness}%) saturate(${f.saturation}%) blur(${f.blur}px)`;

  const applySharpen = (data: ImageData, amount: number) => {
    if (amount <= 0) return data;
    const a = Math.min(1, amount / 100);
    const w = data.width;
    const h = data.height;
    const src = data.data;
    const out = new Uint8ClampedArray(src.length);
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        let r = 0, g = 0, b = 0, k = 0;
        for (let ky = -1; ky <= 1; ky += 1) {
          for (let kx = -1; kx <= 1; kx += 1) {
            const ix = Math.min(w - 1, Math.max(0, x + kx));
            const iy = Math.min(h - 1, Math.max(0, y + ky));
            const idx = (iy * w + ix) * 4;
            const kv = kernel[k++];
            r += src[idx] * kv;
            g += src[idx + 1] * kv;
            b += src[idx + 2] * kv;
          }
        }
        const idx = (y * w + x) * 4;
        out[idx] = Math.min(255, Math.max(0, src[idx] * (1 - a) + r * a));
        out[idx + 1] = Math.min(255, Math.max(0, src[idx + 1] * (1 - a) + g * a));
        out[idx + 2] = Math.min(255, Math.max(0, src[idx + 2] * (1 - a) + b * a));
        out[idx + 3] = src[idx + 3];
      }
    }
    return new ImageData(out, w, h);
  };

  const applyFiltersToRaster = async (
    content: string,
    format: SupportedFormat,
    filters: ImageFilters,
  ): Promise<{ data: string; byteSize?: number } | null> => {
    try {
      const blob = content.startsWith('blob:')
        ? await (await fetch(content)).blob()
        : await (await fetch(content)).blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.filter = buildFilterString(filters);
      ctx.drawImage(bitmap, 0, 0);
      ctx.filter = 'none';
      if (filters.sharpen > 0) {
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const sharpened = applySharpen(img, filters.sharpen);
        ctx.putImageData(sharpened, 0, 0);
      }
      const mime =
        format === 'jpg' || format === 'jpeg'
          ? 'image/jpeg'
          : format === 'webp'
          ? 'image/webp'
          : 'image/png';
      const blobOut = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (b) => resolve(b ?? new Blob()),
          mime,
          mime === 'image/png' ? undefined : imageQuality / 100
        );
      });
      const url = URL.createObjectURL(blobOut);
      return { data: url, byteSize: blobOut.size };
    } catch {
      return null;
    }
  };

  const runConversion = async (
    opts: {
      silent?: boolean;
      preserveActiveFormat?: boolean;
      skipHistory?: boolean;
      targetFormats?: SupportedFormat[];
    } = {}
  ): Promise<boolean> => {
    const { silent = false, preserveActiveFormat = false, skipHistory = false, targetFormats } = opts;
    const effectiveTargetFormats = targetFormats && targetFormats.length > 0 ? targetFormats : selectedToFormats;
    const shouldPersistOutputs = !(silent && skipHistory);
    const hasStateBinary = inputBinaryContent instanceof ArrayBuffer && inputBinaryContent.byteLength > 0;
    const hasStateText = inputContent.trim().length > 0;
    const refBinary = latestInputBinaryContentRef.current;
    const refText = latestInputTextContentRef.current;
    const sourceContent: string | ArrayBuffer = hasStateBinary
      ? inputBinaryContent
      : hasStateText
        ? inputContent
        : (refBinary instanceof ArrayBuffer && refBinary.byteLength > 0 ? refBinary : refText);
    const effectiveFromFormat: SupportedFormat = (
      hasStateBinary || hasStateText
        ? fromFormat
        : (latestFromFormatRef.current ?? fromFormat)
    );
    const effectiveFileNameRaw = fileName.trim() || latestFileNameRef.current.trim();
    const effectiveFileName = effectiveFileNameRaw || 'converted';
    const outputBaseFileName = effectiveFileName.replace(/\.[^/.]+$/, '') || 'converted';

    if (typeof sourceContent === 'string' && !sourceContent.trim()) {
      if (!silent) setError('Bitte zuerst eine Datei hochladen.');
      return false;
    }

    if (sourceContent instanceof ArrayBuffer && sourceContent.byteLength === 0) {
      if (!silent) setError('Bitte zuerst eine Datei hochladen.');
      return false;
    }

    if (effectiveTargetFormats.length === 0) {
      if (!silent) setError('Bitte mindestens ein Ausgabeformat wählen.');
      return false;
    }

    if (silent) {
      setIsPreviewRefreshing(true);
    } else {
      setIsConverting(true);
      setError(null);
    }

    try {
      const nextOutputs: Record<string, string> = {};
      const failedFormats: SupportedFormat[] = [];
      const cloudOutputUrls: Partial<Record<SupportedFormat, string>> = {};
      let cloudSavedImages = 0;
      const cloudImageAssets: NonNullable<ConverterHistoryItem['cloudImageAssets']> = [];
      const previewImages: NonNullable<ConverterHistoryItem['previewImages']> = [];

      const converterSettings = loadZenStudioSettings().converter;
      const zenCloudImageModeEnabled = converterSettings.imageStorageMode === 'cloud';
      const zenCloudUploadAvailable = canUploadToZenCloud();
      const preferZenCloudImageSave = zenCloudImageModeEnabled && zenCloudUploadAvailable;
      const shouldAutoSave = shouldPersistOutputs && (converterSettings.autoSave || preferZenCloudImageSave);
      const hasImageTargets = effectiveTargetFormats.some((format) => isImageFormat(format));

      // Alte Blob-URLs freigeben bevor neue erstellt werden
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      blobUrlsRef.current = [];

      const nextSizes: Record<string, number> = {};

      for (const targetFormat of effectiveTargetFormats) {
        const result = await convertFile(sourceContent, effectiveFromFormat, targetFormat, effectiveFileName, {
          imageQuality: imageQuality / 100,
          imageRasterSize,
          imageSmoothEdges,
          imageMaxOutputSize: (maxImageOutputSize ?? converterSettings.maxImageOutputSize) ?? undefined,
        });
        if (result.success && result.data) {
          let data = result.data;
          let byteSize = result.byteSize;
          if (shouldCrop(cropRect)) {
            if (isRasterOutput(targetFormat)) {
              const cropped = await cropRasterOutput(data, targetFormat, cropRect as CropRect);
              if (cropped?.data) {
                data = cropped.data;
                byteSize = cropped.byteSize;
              }
            } else if (targetFormat === 'svg' && typeof data === 'string') {
              const croppedSvg = cropSvgOutput(data, cropRect as CropRect);
              if (croppedSvg) data = croppedSvg;
            }
          }
          if (isRasterOutput(targetFormat) && hasActiveFilters(imageFilters)) {
            const filtered = await applyFiltersToRaster(data, targetFormat, imageFilters);
            if (filtered?.data) {
              data = filtered.data;
              byteSize = filtered.byteSize;
            }
          }
          if (targetFormat === 'svg' && typeof data === 'string' && hasActiveFilters(imageFilters)) {
            const filteredSvg = applySvgFilters(data, imageFilters);
            if (filteredSvg) data = filteredSvg;
          }
          if (targetFormat === 'svg' && typeof data === 'string' && svgOutputSize) {
            const sized = applySvgOutputSize(data, svgOutputSize);
            if (sized) data = sized;
          }
          nextOutputs[targetFormat] = data;
          const previewUrl = typeof data === 'string' ? toPreviewUrl(targetFormat, data) : null;
          if (previewUrl) {
            previewImages.push({
              format: targetFormat,
              fileName: `${outputBaseFileName}${getFileExtension(targetFormat)}`,
              url: previewUrl,
            });
          }
          if (data.startsWith('blob:')) {
            blobUrlsRef.current.push(data);
            if (byteSize) nextSizes[targetFormat] = byteSize;
          }
          continue;
        }
        failedFormats.push(targetFormat);
      }

      if (Object.keys(nextOutputs).length === 0) {
        if (!silent) setError('Konvertierung fehlgeschlagen.');
        return false;
      }

      // Auto-Save in konfigurierte Ordner
      if (shouldAutoSave) {
        const baseFileName = outputBaseFileName;
        const autoSaveErrors: string[] = [];

        for (const [fmt, content] of Object.entries(nextOutputs)) {
          const format = fmt as SupportedFormat;
          const outFileName = `${baseFileName}${getFileExtension(format)}`;
          const folderType = isImageFormat(format) ? 'images' : 'archive';
          const shouldSaveImageToZenCloud = folderType === 'images' && preferZenCloudImageSave;

          if (preferZenCloudImageSave && folderType !== 'images' && !converterSettings.autoSave) {
            continue;
          }

          let payload: string | Uint8Array;
          if (content.startsWith('blob:')) {
            const resp = await fetch(content);
            payload = new Uint8Array(await resp.arrayBuffer());
          } else if (content.startsWith('data:')) {
            payload = dataUrlToUint8Array(content);
          } else {
            payload = content;
          }

          if (shouldSaveImageToZenCloud) {
            try {
              const cloudUpload = await uploadCloudDocument(
                new File([payload], outFileName, { type: getImageMimeType(format) })
              );
              if (cloudUpload) {
                cloudSavedImages += 1;
                cloudOutputUrls[format] = cloudUpload.url;
                cloudImageAssets.push({
                  format,
                  fileName: outFileName,
                  docId: cloudUpload.id,
                  url: cloudUpload.url,
                });
              } else {
                autoSaveErrors.push(fmt);
              }
            } catch {
              autoSaveErrors.push(fmt);
            }
          }

          if (converterSettings.autoSave) {
            const saved = shouldSaveImageToZenCloud
              ? await saveToLocalConverterFolder(folderType, outFileName, payload)
              : await saveToConverterFolder(folderType, outFileName, payload);

            if (!saved.success && !shouldSaveImageToZenCloud) {
              autoSaveErrors.push(fmt);
            } else if (folderType === 'images' && saved.success && saved.storage === 'cloud') {
              cloudSavedImages += 1;
              cloudOutputUrls[format] = saved.cloudAsset.url;
              cloudImageAssets.push({
                format,
                fileName: saved.cloudAsset.fileName,
                docId: saved.cloudAsset.id,
                url: saved.cloudAsset.url,
              });
            }
          } else if (!shouldSaveImageToZenCloud && !preferZenCloudImageSave) {
            continue;
          }
        }

        if (!silent && cloudSavedImages > 0) {
          const projectName = loadZenStudioSettings().cloudProjectName ?? 'ZenCloud';
          showCloudSaveFeedback(
            `${cloudSavedImages} Bild${cloudSavedImages !== 1 ? 'er' : ''} in ${projectName} gespeichert`
          );
        }

        if (!silent && autoSaveErrors.length > 0) {
          const hint = preferZenCloudImageSave
            ? 'ZenCloud verbunden?'
            : !isTauri() && converterSettings.useOpfsInWeb
              ? 'Browser-Speicher verfügbar?'
              : 'Ordner konfiguriert?';
          setError(`Auto-Save fehlgeschlagen für: ${autoSaveErrors.join(', ')} — ${hint}`);
        }
      }

      if (shouldAutoSave) {
        for (const [format, url] of Object.entries(cloudOutputUrls)) {
          if (!url) continue;
          nextOutputs[format as SupportedFormat] = url;
        }

        if (preferZenCloudImageSave) {
          for (const format of effectiveTargetFormats) {
            if (!isImageFormat(format)) continue;
            if (cloudOutputUrls[format]) continue;
            delete nextOutputs[format];
            delete nextSizes[format];
          }
        }
      }

      setOutputByFormat({ ...nextOutputs });
      setOutputSizeByFormat(nextSizes);
      lastConversionRef.current = { outputs: { ...nextOutputs }, sizes: nextSizes };
      const firstSuccessFormat = effectiveTargetFormats.find((format) => Boolean(nextOutputs[format]));
      if (firstSuccessFormat && !preserveActiveFormat) {
        setActiveResultFormat(firstSuccessFormat);
      }

      const cloudHistoryBlocked = shouldAutoSave && preferZenCloudImageSave && hasImageTargets && cloudImageAssets.length === 0;
      if (cloudHistoryBlocked) {
        setError('ZenCloud-Speicherung fehlgeschlagen — Eintrag nicht in die Konvertierungs-Mappe übernommen.');
      }

      if (!silent && !skipHistory) {
        const mustUseCloudPreviewImages = preferZenCloudImageSave;
        const historyPreviewImages =
          mustUseCloudPreviewImages
            ? cloudImageAssets.map((asset) => ({
                format: asset.format as SupportedFormat,
                fileName: asset.fileName,
                url: asset.url,
              }))
            : cloudImageAssets.length > 0
            ? cloudImageAssets.map((asset) => ({
                format: asset.format as SupportedFormat,
                fileName: asset.fileName,
                url: asset.url,
              }))
            : previewImages;

        if (!cloudHistoryBlocked) {
          setRecentConversions((prev) => [
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              fileName: effectiveFileName || 'Untitled',
              fromFormat: effectiveFromFormat,
              targetFormats: Object.keys(nextOutputs) as SupportedFormat[],
              createdAt: Date.now(),
              previewImages: historyPreviewImages.length > 0 ? historyPreviewImages : undefined,
              cloudImageAssets: cloudImageAssets.length > 0 ? cloudImageAssets : undefined,
            },
            ...prev,
          ].slice(0, 12));
        }
      }

      if (!silent && failedFormats.length > 0) {
        setError(`Teilweise konvertiert. Fehlgeschlagen: ${failedFormats.join(', ')}`);
      }

      return true;
    } catch (err) {
      if (!silent) {
        setError(`Fehler: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
      }
      return false;
    } finally {
      if (silent) {
        setIsPreviewRefreshing(false);
      } else {
        setIsConverting(false);
      }
    }
  };

  const handleFileUpload = async (file: File, sourceHint?: string) => {
    const cloudDocId = parseCloudDocIdFromSource(sourceHint);
    const projectId = loadZenStudioSettings().cloudProjectId ?? null;
    const cloudUrl = cloudDocId ? getCloudDocumentUrl(cloudDocId) : null;
    const nextMetaContext = {
      cloudDocId,
      projectId,
      url: cloudUrl,
      fileName: file.name,
    };
    setImageMetaContext(nextMetaContext);
    setImageMeta(resolveImageMeta(nextMetaContext));

    setFileName(file.name);
    latestFileNameRef.current = file.name;
    latestInputBinaryContentRef.current = null;
    latestInputTextContentRef.current = '';
    latestFromFormatRef.current = null;
    setOutputByFormat({});
    setOutputSizeByFormat({});
    setError(null);
    setCloudSaveFeedback(null);
    setIsPreparingInput(true);
    setInputBinaryContent(null);
    setCropRect(null);
    setCropAspect(null);
    setSvgOutputSize(null);
    setImageFilters({
      grayscale: 0,
      sepia: 0,
      contrast: 100,
      brightness: 100,
      saturation: 100,
      blur: 0,
      sharpen: 0,
    });

    try {
      const detectedFormat = detectFormatFromFilename(file.name);
      if (detectedFormat && isImageFormat(detectedFormat)) {
        const preferredTargets: SupportedFormat[] =
          detectedFormat === 'svg' ? ['png'] : ['svg', 'webp'];

        if (detectedFormat === 'svg') {
          const svgText = await file.text();
          if (!svgText.trim()) {
            setError('SVG-Datei ist leer.');
            return;
          }
          setInputContent(svgText);
          setInputBinaryContent(null);
          setFromFormat('svg');
          latestInputTextContentRef.current = svgText;
          latestInputBinaryContentRef.current = null;
          latestFromFormatRef.current = 'svg';
          setDetectedSourceFormat('svg');
        } else {
          const arrayBuffer = await file.arrayBuffer();
          setInputBinaryContent(arrayBuffer);
          setInputContent('');
          setFromFormat(detectedFormat);
          latestInputBinaryContentRef.current = arrayBuffer;
          latestInputTextContentRef.current = '';
          latestFromFormatRef.current = detectedFormat;
          setDetectedSourceFormat(detectedFormat);
        }
        setSelectedToFormats(preferredTargets);
        setActiveResultFormat(preferredTargets[0]);
        setActiveImagePreset('custom');
        return;
      }

      const result = await importDocumentToMarkdown(file, {
        convertCode: true,
        fallbackToRawOnConvertError: true,
        allowJsonPrettyFallback: true,
        requireNonEmpty: true,
      });

      if (!result.success) {
        setError(result.error || 'Datei konnte nicht geladen werden.');
        return;
      }

      setInputContent(result.content);
      setInputBinaryContent(null);
      setFromFormat(result.contentFormat);
      latestInputTextContentRef.current = result.content;
      latestInputBinaryContentRef.current = null;
      latestFromFormatRef.current = result.contentFormat;
      setDetectedSourceFormat(result.detectedFormat);
      setActiveResultFormat(selectedToFormats[0] ?? 'md');
      setActiveImagePreset('custom');
    } catch {
      setError('Datei konnte nicht geladen werden.');
    } finally {
      setIsPreparingInput(false);
    }
  };

  const handleConvert = async (): Promise<boolean> => runConversion();

  useEffect(() => {
    if (currentStep !== 2) return;
    if (!showImageOptions) return;
    if (Object.keys(outputByFormat).length === 0) return;

    const timer = window.setTimeout(() => {
      void runConversion({
        silent: true,
        preserveActiveFormat: true,
        skipHistory: true,
      });
    }, 260);

    return () => window.clearTimeout(timer);
  }, [
    currentStep,
    showImageOptions,
    imageQuality,
    imageRasterSize,
    imageSmoothEdges,
    maxImageOutputSize,
    cropRect,
    svgOutputSize,
    imageFilters,
    selectedToFormats,
    fromFormat,
    inputContent,
    inputBinaryContent,
    fileName,
  ]);

  const handleDownload = async (format: SupportedFormat) => {
    try {
      if (showImageOptions && isImageFormat(format)) {
        const ok = await runConversion({ silent: true, preserveActiveFormat: true, skipHistory: true });
        if (!ok) return;
      }

      const latestOutputs = lastConversionRef.current?.outputs ?? outputByFormat;
      const outputContent = latestOutputs[format] ?? '';
      if (!outputContent) {
        setError('Keine Ausgabe zum Herunterladen verfügbar');
        return;
      }

      // Bestimme den Standarddateinamen
      const baseFileName = fileName
        ? fileName.replace(/\.[^/.]+$/, '')
        : 'converted';
      const defaultFileName = `${baseFileName}${getFileExtension(format)}`;

      const downloadInBrowser = (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = defaultFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };

      const isRasterOutput = format === 'png' || format === 'jpg' || format === 'jpeg' || format === 'webp';
      const isSvgOutput = format === 'svg';
      const isDocxOutput = format === 'docx';

      // Hilfsfunktion: blob: URL oder data: URL → Uint8Array
      const contentToBytes = async (content: string): Promise<Uint8Array<ArrayBuffer>> => {
        if (content.startsWith('blob:') || /^https?:\/\//i.test(content)) {
          const ab = await (await fetch(content)).arrayBuffer();
          return new Uint8Array(ab.slice(0));
        }
        const base64Part = content.split(',')[1] ?? '';
        const binary = atob(base64Part);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        return bytes;
      };

      // Web-Fallback: ohne Tauri Save-Dialog direkt herunterladen
      if (!isTauri()) {
        if (isRasterOutput) {
          const bytes = await contentToBytes(outputContent);
          downloadInBrowser(new Blob([bytes], { type: `image/${format === 'jpg' ? 'jpeg' : format}` }));
        } else if (isSvgOutput) {
          downloadInBrowser(new Blob([outputContent], { type: 'image/svg+xml;charset=utf-8' }));
        } else if (isDocxOutput) {
          const bytes = await contentToBytes(outputContent);
          downloadInBrowser(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
        } else {
          downloadInBrowser(new Blob([outputContent], { type: 'text/plain;charset=utf-8' }));
        }
        setError(null);
        return;
      }

      // Cloud-Upload wenn Cloud-Modus aktiv (auch in Tauri)
      if (isRasterOutput && zenCloudImageModeEnabled && zenCloudUploadAvailable) {
        try {
          const bytes = await contentToBytes(outputContent);
          const mime = `image/${format === 'jpg' ? 'jpeg' : format}`;
          const cloudResult = await uploadCloudDocument(new File([bytes], defaultFileName, { type: mime }));
          if (cloudResult) {
            const projectName = loadZenStudioSettings().cloudProjectName ?? 'ZenCloud';
            showCloudSaveFeedback(`${defaultFileName} in ${projectName} gespeichert`);
            setError(null);
            return;
          }
          setError('Cloud-Upload fehlgeschlagen — bitte ZenCloud-Verbindung prüfen.');
          return;
        } catch {
          setError('Cloud-Upload fehlgeschlagen.');
          return;
        }
      }

      // Öffne Save-Dialog mit Tauri
      const filePath = await save({
        defaultPath: defaultFileName,
        filters: [
          {
            name: `${format.toUpperCase()} Datei`,
            extensions: [getFileExtension(format).replace('.', '')],
          },
        ],
      });

      if (!filePath) {
        // Benutzer hat abgebrochen
        return;
      }

      if (isRasterOutput) {
        await writeFile(filePath, await contentToBytes(outputContent));
      } else if (isSvgOutput) {
        await writeTextFile(filePath, outputContent);
      } else if (isDocxOutput) {
        await writeFile(filePath, await contentToBytes(outputContent));
      } else {
        await writeTextFile(filePath, outputContent);
      }

      // Erfolg - entferne mögliche vorherige Fehler
      setError(null);
    } catch (error) {
      console.error('Download-Fehler:', error);
      setError(`Download fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  const handleDownloadAll = async () => {
    if (showImageOptions) {
      const ok = await runConversion({ silent: true, preserveActiveFormat: true, skipHistory: true });
      if (!ok) return;
    }

    const latestOutputs = lastConversionRef.current?.outputs ?? outputByFormat;
    const formatsToSave = availableOutputFormats.filter((fmt) => fmt !== 'pdf' && Boolean(latestOutputs[fmt]));
    if (formatsToSave.length === 0) {
      setError('Keine Ausgaben zum Speichern verfügbar');
      return;
    }

    const baseFileName = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'converted';
    const zipFileName = `${baseFileName}-converted.zip`;

    const decodeDataUrl = (dataUrl: string) => {
      const base64Part = dataUrl.split(',')[1] ?? '';
      const binary = atob(base64Part);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    };

    const contentToBytes = async (content: string) => {
      if (content.startsWith('blob:') || /^https?:\/\//i.test(content)) {
        return new Uint8Array(await (await fetch(content)).arrayBuffer());
      }
      return decodeDataUrl(content);
    };

    try {
      const zip = new JSZip();
      for (const fmt of formatsToSave) {
        const content = latestOutputs[fmt] ?? '';
        const filename = `${baseFileName}${getFileExtension(fmt)}`;

        if (fmt === 'png' || fmt === 'jpg' || fmt === 'jpeg' || fmt === 'webp') {
          if (content.startsWith('blob:') || content.startsWith('data:image/') || /^https?:\/\//i.test(content)) {
            zip.file(filename, await contentToBytes(content));
          }
          continue;
        }

        if (fmt === 'docx') {
          if (!content.startsWith('data:')) continue;
          zip.file(filename, decodeDataUrl(content));
          continue;
        }

        zip.file(filename, content);
      }

      const zipBytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });

      if (!isTauri()) {
        const blob = new Blob([zipBytes], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = zipFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setError(null);
        return;
      }

      const filePath = await save({
        defaultPath: zipFileName,
        filters: [{ name: 'ZIP', extensions: ['zip'] }],
      });
      if (!filePath) return;
      await writeFile(filePath, zipBytes);
      setError(null);
    } catch (error) {
      setError(`Alle speichern fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  const copyWithFallback = async (value: string): Promise<boolean> => {
    if (!value) return false;

    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        // fallback below
      }
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  };

  const getCurrentImageData = async (): Promise<{ dataUrl: string; base64: string }> => {
    const content = outputByFormat[activeResultFormat] ?? '';
    if (!content) return { dataUrl: '', base64: '' };

    if (content.startsWith('blob:')) {
      try {
        const resp = await fetch(content);
        const blob = await resp.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = String(reader.result ?? '');
            resolve({ dataUrl, base64: dataUrl.split(',')[1] ?? '' });
          };
          reader.onerror = () => resolve({ dataUrl: '', base64: '' });
          reader.readAsDataURL(blob);
        });
      } catch {
        return { dataUrl: '', base64: '' };
      }
    }

    if (/^https?:\/\//i.test(content)) {
      try {
        const resp = await fetch(content);
        const blob = await resp.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = String(reader.result ?? '');
            resolve({ dataUrl, base64: dataUrl.split(',')[1] ?? '' });
          };
          reader.onerror = () => resolve({ dataUrl: '', base64: '' });
          reader.readAsDataURL(blob);
        });
      } catch {
        return { dataUrl: '', base64: '' };
      }
    }

    if (content.startsWith('data:')) {
      return { dataUrl: content, base64: content.split(',')[1] ?? '' };
    }

    if (activeResultFormat === 'svg') {
      const encoded = encodeURIComponent(content);
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encoded}`;
      const base64 = btoa(unescape(encodeURIComponent(content)));
      return { dataUrl, base64 };
    }

    return { dataUrl: '', base64: '' };
  };

  const handleImagePresetSelect = (preset: 'logo' | 'illustration' | 'photo') => {
    setActiveImagePreset(preset);
    if (preset === 'logo') {
      setImageQuality(96);
      setImageRasterSize(96);
      return;
    }
    if (preset === 'illustration') {
      setImageQuality(84);
      setImageRasterSize(176);
      return;
    }
    setImageQuality(72);
    setImageRasterSize(256);
  };

  const showCopyFeedback = (message: string) => {
    setCopyFeedback(message);
    window.setTimeout(() => setCopyFeedback(null), 2000);
  };

  const showCloudSaveFeedback = (message: string) => {
    setCloudSaveFeedback(message);
    window.setTimeout(() => setCloudSaveFeedback(null), 3500);
  };

  const handleCopyImageDataUrl = async () => {
    const { dataUrl } = await getCurrentImageData();
    if (!dataUrl) {
      setError('Keine Data URL zum Kopieren verfügbar');
      return;
    }
    const ok = await copyWithFallback(dataUrl);
    if (ok) {
      setError(null);
      showCopyFeedback('Data URL kopiert');
    } else {
      setError('Kopieren fehlgeschlagen (Clipboard blockiert)');
    }
  };

  const handleCopyImageBase64 = async () => {
    const { base64 } = await getCurrentImageData();
    if (!base64) {
      setError('Für dieses Ergebnis ist kein Base64-String verfügbar');
      return;
    }
    const ok = await copyWithFallback(base64);
    if (ok) {
      setError(null);
      showCopyFeedback('Base64 kopiert');
    } else {
      setError('Kopieren fehlgeschlagen (Clipboard blockiert)');
    }
  };

  const saveTextFileInBrowser = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveImageText = async (kind: 'dataurl' | 'base64') => {
    const { dataUrl, base64 } = await getCurrentImageData();
    const payload = kind === 'dataurl' ? dataUrl : base64;
    if (!payload) {
      setError(`Kein ${kind === 'dataurl' ? 'Data URL' : 'Base64'}-Inhalt verfügbar`);
      return;
    }

    const baseFileName = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'converted-image';
    const defaultFileName = `${baseFileName}-${kind}.txt`;

    try {
      if (!isTauri()) {
        saveTextFileInBrowser(payload, defaultFileName);
        setError(null);
        return;
      }

      const filePath = await save({
        defaultPath: defaultFileName,
        filters: [{ name: 'Textdatei', extensions: ['txt'] }],
      });

      if (!filePath) return;
      await writeTextFile(filePath, payload);
      setError(null);
    } catch (error) {
      setError(`TXT speichern fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };


  // Render step content
  const step1Props = {
    detectedFormatLabel: detectedSourceFormat ? detectedSourceFormat.toUpperCase() : 'Auto',
    fileName,
    hasInputContent: hasAnyInput,
    selectedFormats: selectedToFormats,
    formatOptions: targetFormatOptions,
    recentConversions,
    error,
    isPreparingInput,
    isConverting,
    fileInputRef,
    onToggleFormat: (format: SupportedFormat) => {
      setSelectedToFormats((prev) => {
        const next = prev.includes(format)
          ? prev.filter((item) => item !== format)
          : [...prev, format];
        if (next.length > 0 && !next.includes(activeResultFormat)) {
          setActiveResultFormat(next[0]);
        }
        return next;
      });
    },
    onApplyRecentTargets: (targets: SupportedFormat[]) => {
      const uniqueTargets = Array.from(new Set(targets));
      if (uniqueTargets.length === 0) return;
      setSelectedToFormats(uniqueTargets);
      setActiveResultFormat(uniqueTargets[0]);
    },
    onDeleteRecentItem: (id: string) => {
      setRecentConversions((prev) => prev.filter((item) => item.id !== id));
    },
    onClearRecentItems: () => {
      setRecentConversions([]);
    },
    onInsertRecentIntoContentStudio: (item: ConverterHistoryItem) => {
      if (!item.cloudImageAssets || item.cloudImageAssets.length === 0) return;
      const snippet = item.cloudImageAssets
        .map((asset) => {
          const url = getCloudDocumentUrl(asset.docId) ?? asset.url;
          const meta = resolveImageMeta({
            cloudDocId: asset.docId,
            projectId: currentSettings.cloudProjectId ?? null,
            url,
            fileName: asset.fileName,
          });
          const alt = meta.altText || asset.fileName;
          return `![${alt}](${url})`;
        })
        .join('\n\n');
      onOpenInContentStudio?.(snippet, item.fileName || 'ZenCloud-Bilder.md');
    },
    onCreateRecentAsZenNote: async (item: ConverterHistoryItem) => {
      if (!canUploadToZenCloud()) return false;
      const images = item.cloudImageAssets?.length ? item.cloudImageAssets : item.previewImages;
      if (!images || images.length === 0) return false;
      const noteLines: string[] = [];
      for (const image of images) {
        const cloudUrl = await ensureZenCloudImageUrl({
          fileName: image.fileName,
          url: image.url,
        });
        if (!cloudUrl) continue;
        const meta = resolveImageMeta({
          url: cloudUrl,
          fileName: image.fileName,
        });
        noteLines.push(`![${meta.altText || image.fileName}](${cloudUrl})`);
      }
      if (noteLines.length === 0) return false;
      const noteContent = noteLines.join('\n\n');
      const baseName = (item.fileName || 'Quicknote').replace(/\.[^.]+$/, '').trim() || 'Quicknote';
      const noteTitle = `${baseName} Quicknote`;
      const blob = new Blob([noteContent], { type: 'text/zennote' });
      const file = new File([blob], `${noteTitle}.zennote`, { type: 'text/zennote' });
      const result = await uploadCloudDocument(file);
      return !!result;
    },
    onUploadFile: (file: File) => { void handleFileUpload(file); },
    onConvert: async () => {
      const success = await handleConvert();
      if (success) handleSetCurrentStep(2);
    },
    onOpenImageGallery: zenCloudUploadAvailable ? () => setIsImageGalleryOpen(true) : undefined,
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1FormatSelection {...step1Props} />;
      case 2:
        return (
          <Step4Result
            activeFormat={activeResultFormat}
            outputByFormat={outputByFormat}
            outputSizeByFormat={outputSizeByFormat}
            availableFormats={availableOutputFormats}
            onActiveFormatChange={setActiveResultFormat}
            showImageControls={showImageOptions}
            imageQuality={imageQuality}
            imageRasterSize={imageRasterSize}
            imageSmoothEdges={imageSmoothEdges}
            maxImageOutputSize={maxImageOutputSize}
            cropRect={cropRect}
            cropAspect={cropAspect}
            svgOutputSize={svgOutputSize}
            imageFilters={imageFilters}
            uiMaxSizeOpen={uiMaxSizeOpen}
            uiFiltersOpen={uiFiltersOpen}
            uiExportOpen={uiExportOpen}
            activeImagePreset={activeImagePreset}
            isPreviewRefreshing={isPreviewRefreshing}
            onImageQualityChange={(value) => {
              setImageQuality(value);
              setActiveImagePreset('custom');
            }}
            onImageRasterSizeChange={(value) => {
              setImageRasterSize(value);
              setActiveImagePreset('custom');
            }}
            onImageSmoothEdgesChange={(value) => {
              setImageSmoothEdges(value);
              setActiveImagePreset('custom');
            }}
            onMaxImageOutputSizeChange={(value) => {
              setMaxImageOutputSize(value);
              const current = loadZenStudioSettings().converter;
              patchZenStudioSettings({ converter: { ...current, maxImageOutputSize: value } });
            }}
            onCropRectChange={(rect) => setCropRect(rect)}
            onCropAspectChange={(aspect) => setCropAspect(aspect)}
            onSvgOutputSizeChange={(size) => setSvgOutputSize(size)}
            onImageFiltersChange={(next) => setImageFilters(next)}
            onUiMaxSizeOpenChange={(open) => {
              setUiMaxSizeOpen(open);
              const current = loadZenStudioSettings().converter;
              patchZenStudioSettings({ converter: { ...current, uiMaxSizeOpen: open } });
            }}
            onUiFiltersOpenChange={(open) => {
              setUiFiltersOpen(open);
              const current = loadZenStudioSettings().converter;
              patchZenStudioSettings({ converter: { ...current, uiFiltersOpen: open } });
            }}
            onUiExportOpenChange={(open) => {
              setUiExportOpen(open);
              const current = loadZenStudioSettings().converter;
              patchZenStudioSettings({ converter: { ...current, uiExportOpen: open } });
            }}
            onImagePresetSelect={handleImagePresetSelect}
            copyFeedback={copyFeedback}
            cloudSaveFeedback={cloudSaveFeedback}
            onCopyImageDataUrl={handleCopyImageDataUrl}
            onCopyImageBase64={handleCopyImageBase64}
            onSaveDataUrlTxt={() => void handleSaveImageText('dataurl')}
            onSaveBase64Txt={() => void handleSaveImageText('base64')}
            imageMeta={imageMeta}
            onImageMetaChange={(next) => {
              setImageMeta(next);
              if (imageMetaContext) {
                saveImageMeta(imageMetaContext, next);
              }
            }}
            onDownload={handleDownload}
            onDownloadAll={() => void handleDownloadAll()}
            onStartOver={() => {
              blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
              blobUrlsRef.current = [];
              handleSetCurrentStep(1);
              setInputContent('');
              setInputBinaryContent(null);
              setOutputByFormat({});
              setOutputSizeByFormat({});
              setFileName('');
              setFromFormat('txt');
              setDetectedSourceFormat(null);
              setSelectedToFormats(['md']);
              setActiveResultFormat('md');
              setImageQuality(86);
              setImageRasterSize(160);
              setImageSmoothEdges(true);
              setMaxImageOutputSize(loadZenStudioSettings().converter.maxImageOutputSize ?? null);
              setCropRect(null);
              setCropAspect(null);
              setSvgOutputSize(null);
              setImageFilters({
                grayscale: 0,
                sepia: 0,
                contrast: 100,
                brightness: 100,
                saturation: 100,
                blur: 0,
                sharpen: 0,
              });
              setActiveImagePreset('custom');
              setError(null);
              setCloudSaveFeedback(null);
              setImageMeta({ title: '', altText: '', caption: '', tags: [] });
              setImageMetaContext(null);
            }}
            showOpenInContentStudio={
              !isTauri() &&
              !!activeOutputContent &&
              !(activeResultFormat === 'png' || activeResultFormat === 'jpg' || activeResultFormat === 'jpeg' || activeResultFormat === 'webp' || activeResultFormat === 'svg' || activeResultFormat === 'docx')
            }
            onOpenInContentStudio={() => {
              const name = fileName?.trim() || `converted${getFileExtension(activeResultFormat)}`;
              onOpenInContentStudio?.(activeOutputContent, name);
            }}
            onOpenImageGallery={zenCloudUploadAvailable ? () => setIsImageGalleryOpen(true) : undefined}
          />
        );
      default:
        return <Step1FormatSelection {...step1Props} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
      {/* Step Indicator */}
      <div className="flex justify-center gap-2 pt-6 pb-2">
        {[1, 2].map((step) => (
          <div
            key={step}
            className={`w-2 h-2 rounded-full transition-colors ${
              step === currentStep
                ? 'bg-[#AC8E66]'
                : step < currentStep
                ? 'bg-[#AC8E66]/50'
                : 'bg-[#555]'
            }`}
          />
        ))}
      </div>

      <div className="flex justify-center px-[10px] pb-[10px]">
        <div
          style={{
            marginTop: '10px',
            width: 'min(100%, 660px)',
            paddingTop: '10px',
            borderRadius: '10px',
            border:
              converterStorageStatus.tone === 'ready'
                ? '1px solid rgba(94,163,111,0.34)'
                : converterStorageStatus.tone === 'warning'
                ? '1px solid rgba(172,142,102,0.34)'
                : '1px solid rgba(120,120,120,0.28)',
            background:
              converterStorageStatus.tone === 'ready'
                ? 'rgba(94,163,111,0.10)'
                : converterStorageStatus.tone === 'warning'
                ? 'rgba(172,142,102,0.10)'
                : 'rgba(255,255,255,0.03)',
            padding: '10px 14px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              color:
                converterStorageStatus.tone === 'ready'
                  ? '#9ad1a9'
                  : converterStorageStatus.tone === 'warning'
                  ? '#E7CCAA'
                  : '#c9c4bc',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
            }}
          >
            {converterStorageStatus.title}
          </div>
          <div
            style={{
              color: '#b7b0a5',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              marginTop: '4px',
            }}
          >
            {converterStorageStatus.detail}
          </div>
        </div>
      </div>

      {/* Step Content */}
      {renderStepContent()}

      {/* Settings Modal */}
      <ZenSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={() => setError(null)}
        defaultTab="ai"
      />

      {/* Generating Modal */}
      <ZenGeneratingModal
        isOpen={isConverting}
        templateName={`${selectedToFormats.map((format) => format.toUpperCase()).join(', ')} Konvertierung`}
        onClose={() => setIsConverting(false)}
      />

      {/* ZenImage Gallery */}
      <ZenImageGalleryModal
        isOpen={isImageGalleryOpen}
        onClose={() => setIsImageGalleryOpen(false)}
      />
    </div>
  );
};
