import { useEffect, useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faArrowLeft, faArrowUpRightFromSquare, faImages } from '@fortawesome/free-solid-svg-icons';
import { SupportedFormat, getFileExtension } from '../../utils/fileConverter';
import {
  aspectForMode,
  buildCenteredRectForAspect,
  clampRect,
  inferModeFromAspect,
  moveRectByImagePixels,
  normalizedAspectForResize,
  pixelsToNormalizedRect,
  rectToPixels,
  scaleRectAroundCenter,
  type CropMode,
} from '../../services/converterCropService';

interface Step4ResultProps {
  activeFormat: SupportedFormat;
  availableFormats: SupportedFormat[];
  outputByFormat: Record<string, string>;
  outputSizeByFormat?: Record<string, number>;
  showImageControls?: boolean;
  imageQuality?: number;
  imageRasterSize?: number;
  imageSmoothEdges?: boolean;
  maxImageOutputSize?: number | null;
  cropRect?: { x: number; y: number; w: number; h: number } | null;
  cropAspect?: number | null;
  svgOutputSize?: { width: number; height: number } | null;
  imageFilters?: {
    grayscale: number;
    sepia: number;
    contrast: number;
    brightness: number;
    saturation: number;
    blur: number;
    sharpen: number;
  };
  uiMaxSizeOpen?: boolean;
  uiFiltersOpen?: boolean;
  uiExportOpen?: boolean;
  activeImagePreset?: 'logo' | 'illustration' | 'photo' | 'custom';
  isPreviewRefreshing?: boolean;
  onActiveFormatChange: (format: SupportedFormat) => void;
  onImageQualityChange?: (value: number) => void;
  onImageRasterSizeChange?: (value: number) => void;
  onImageSmoothEdgesChange?: (value: boolean) => void;
  onMaxImageOutputSizeChange?: (value: number | null) => void;
  onCropRectChange?: (rect: { x: number; y: number; w: number; h: number } | null) => void;
  onCropAspectChange?: (aspect: number | null) => void;
  onSvgOutputSizeChange?: (size: { width: number; height: number } | null) => void;
  onImageFiltersChange?: (filters: {
    grayscale: number;
    sepia: number;
    contrast: number;
    brightness: number;
    saturation: number;
    blur: number;
    sharpen: number;
  }) => void;
  onUiMaxSizeOpenChange?: (open: boolean) => void;
  onUiFiltersOpenChange?: (open: boolean) => void;
  onUiExportOpenChange?: (open: boolean) => void;
  onImagePresetSelect?: (preset: 'logo' | 'illustration' | 'photo') => void;
  copyFeedback?: string | null;
  cloudSaveFeedback?: string | null;
  imageMeta?: {
    title: string;
    altText: string;
    caption: string;
    tags: string[];
  };
  onCopyImageDataUrl?: () => void;
  onCopyImageBase64?: () => void;
  onSaveDataUrlTxt?: () => void;
  onSaveBase64Txt?: () => void;
  onImageMetaChange?: (meta: { title: string; altText: string; caption: string; tags: string[] }) => void;
  onDownload: (format: SupportedFormat) => void;
  onDownloadAll?: () => void;
  onStartOver: () => void;
  onOpenInContentStudio?: () => void;
  showOpenInContentStudio?: boolean;
  onOpenImageGallery?: () => void;
}

export const Step4Result = ({
  activeFormat,
  availableFormats,
  outputByFormat,
  outputSizeByFormat = {},
  showImageControls = false,
  imageQuality = 86,
  imageRasterSize = 160,
  imageSmoothEdges = true,
  maxImageOutputSize = null,
  cropRect = null,
  cropAspect = null,
  svgOutputSize = null,
  imageFilters = {
    grayscale: 0,
    sepia: 0,
    contrast: 100,
    brightness: 100,
    saturation: 100,
    blur: 0,
    sharpen: 0,
  },
  uiMaxSizeOpen = true,
  uiFiltersOpen = true,
  uiExportOpen = true,
  activeImagePreset = 'custom',
  isPreviewRefreshing = false,
  onActiveFormatChange,
  onImageQualityChange,
  onImageRasterSizeChange,
  onImageSmoothEdgesChange,
  onMaxImageOutputSizeChange,
  onCropRectChange,
  onCropAspectChange,
  onSvgOutputSizeChange,
  onImageFiltersChange,
  onUiMaxSizeOpenChange,
  onUiFiltersOpenChange,
  onUiExportOpenChange,
  onImagePresetSelect,
  copyFeedback = null,
  cloudSaveFeedback = null,
  imageMeta = { title: '', altText: '', caption: '', tags: [] },
  onCopyImageDataUrl,
  onCopyImageBase64,
  onSaveDataUrlTxt,
  onSaveBase64Txt,
  onImageMetaChange,
  onDownload,
  onDownloadAll,
  onStartOver,
  onOpenInContentStudio,
  showOpenInContentStudio = false,
  onOpenImageGallery,
}: Step4ResultProps) => {
  const outputContent = outputByFormat[activeFormat] ?? '';
  const isImageFormat = activeFormat === 'png' || activeFormat === 'jpg' || activeFormat === 'jpeg' || activeFormat === 'webp' || activeFormat === 'svg';
  const isRasterOutput = activeFormat === 'png' || activeFormat === 'jpg' || activeFormat === 'jpeg' || activeFormat === 'webp';
  const isCropSupported = isImageFormat;
  const isBlobUrl = outputContent.startsWith('blob:');
  const isDataImageUrl = outputContent.startsWith('data:image/');
  const isHttpImageUrl = /^https?:\/\//i.test(outputContent);
  const svgDataUrl =
    activeFormat === 'svg' && outputContent
      ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(outputContent)}`
      : '';
  const imagePreviewSrc = isBlobUrl ? outputContent : isDataImageUrl ? outputContent : isHttpImageUrl ? outputContent : svgDataUrl;
  const canCopyBase64 = isBlobUrl || isHttpImageUrl || outputContent.startsWith('data:') || activeFormat === 'svg';
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [cropBaseDimensions, setCropBaseDimensions] = useState<{ width: number; height: number } | null>(null);
  const [customMaxSizeInput, setCustomMaxSizeInput] = useState('');
  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const previewImgRef = useRef<HTMLImageElement | null>(null);
  const [previewSize, setPreviewSize] = useState<{ width: number; height: number } | null>(null);
  const [localCropRect, setLocalCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(cropRect);
  const [cropMode, setCropMode] = useState<CropMode>(() => inferModeFromAspect(cropAspect));
  const [svgSizeInput, setSvgSizeInput] = useState<{ width: string; height: string }>({
    width: svgOutputSize ? String(svgOutputSize.width) : '',
    height: svgOutputSize ? String(svgOutputSize.height) : '',
  });
  const [openMaxSize, setOpenMaxSize] = useState(uiMaxSizeOpen);
  const [openFilters, setOpenFilters] = useState(uiFiltersOpen);
  const [openMeta, setOpenMeta] = useState(true);
  const [openExport, setOpenExport] = useState(uiExportOpen);
  const [rightHasTopShadow, setRightHasTopShadow] = useState(false);
  const [rightHasBottomShadow, setRightHasBottomShadow] = useState(false);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);
  const [cropLock, setCropLock] = useState(false);
  const [cropSizeInput, setCropSizeInput] = useState<{ w: string; h: string }>({ w: '', h: '' });
  const [cropNudgeStep, setCropNudgeStep] = useState<string>('10');
  const effectiveCropDimensions = cropBaseDimensions ?? imageDimensions;

  const filterString = `grayscale(${imageFilters.grayscale}%) sepia(${imageFilters.sepia}%) contrast(${imageFilters.contrast}%) brightness(${imageFilters.brightness}%) saturate(${imageFilters.saturation}%) blur(${imageFilters.blur}px)`;
  const imageBytes = useMemo(() => {
    if (!isImageFormat) return 0;
    if (outputSizeByFormat[activeFormat]) return outputSizeByFormat[activeFormat];
    if (isDataImageUrl) {
      const base64Part = outputContent.split(',')[1] ?? '';
      const padding = (base64Part.match(/=*$/)?.[0].length ?? 0);
      return Math.max(0, Math.floor((base64Part.length * 3) / 4) - padding);
    }
    return new Blob([outputContent]).size;
  }, [isImageFormat, outputContent, outputSizeByFormat, activeFormat, isDataImageUrl]);
  const imageKb = (imageBytes / 1024).toFixed(1);
  const charCount = outputContent.length;

  const sizePresets: { label: string; value: number | null }[] = [
    { label: 'Original', value: null },
    { label: '800', value: 800 },
    { label: '1280', value: 1280 },
    { label: '1920', value: 1920 },
    { label: '2560', value: 2560 },
    { label: '3840 (4K)', value: 3840 },
  ];

  const handleCustomMaxSize = () => {
    const val = parseInt(customMaxSizeInput, 10);
    if (!isNaN(val) && val >= 100 && val <= 16000) {
      onMaxImageOutputSizeChange?.(val);
      setCustomMaxSizeInput('');
    }
  };

  const handleApplySvgSize = () => {
    const w = parseInt(svgSizeInput.width, 10);
    const h = parseInt(svgSizeInput.height, 10);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      onSvgOutputSizeChange?.({ width: w, height: h });
    }
  };

  const handleResetSvgSize = () => {
    onSvgOutputSizeChange?.(null);
    setSvgSizeInput({ width: '', height: '' });
  };

  const Accordion = ({
    title,
    open,
    onToggle,
    children,
  }: {
    title: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }) => (
    <div style={{ borderTop: '1px solid rgba(172,142,102,0.25)', padding: '8px' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'transparent',
          border: 'none',
          paddingLeft: 10,
          cursor: 'pointer',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '10px',
          color: '#6b5a40',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: '12px', color: '#8a7a60' }}>{open ? '–' : '+'}</span>
      </button>
      {open && <div style={{ marginTop: '8px' }}>{children}</div>}
    </div>
  );

  useEffect(() => {
    setLocalCropRect(cropRect);
  }, [cropRect]);

  useEffect(() => {
    if (cropAspect !== null) {
      setCropMode(inferModeFromAspect(cropAspect));
    }
  }, [cropAspect]);

  useEffect(() => {
    setSvgSizeInput({
      width: svgOutputSize ? String(svgOutputSize.width) : '',
      height: svgOutputSize ? String(svgOutputSize.height) : '',
    });
  }, [svgOutputSize]);

  useEffect(() => {
    setOpenMaxSize(uiMaxSizeOpen);
  }, [uiMaxSizeOpen]);

  useEffect(() => {
    setOpenFilters(uiFiltersOpen);
  }, [uiFiltersOpen]);

  useEffect(() => {
    setOpenExport(uiExportOpen);
  }, [uiExportOpen]);

  useEffect(() => {
    const el = rightPanelRef.current;
    if (!el) return;
    const updateShadows = () => {
      setRightHasTopShadow(el.scrollTop > 2);
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      setRightHasBottomShadow(remaining > 2);
    };
    updateShadows();
    el.addEventListener('scroll', updateShadows);
    const ro = new ResizeObserver(updateShadows);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateShadows);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!previewWrapRef.current) return;
    const update = () => {
      const rect = previewWrapRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        setPreviewSize({ width: rect.width, height: rect.height });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(previewWrapRef.current);
    return () => ro.disconnect();
  }, [imagePreviewSrc]);

  const ensureCropRect = () => {
    if (!effectiveCropDimensions || !previewSize) return;
    if (!localCropRect) {
      const targetAspect = cropMode === 'original' || cropMode === 'free' ? null : aspectForMode(cropMode);
      const next = buildCenteredRectForAspect(effectiveCropDimensions, targetAspect);
      setLocalCropRect(next);
      onCropRectChange?.(next);
    }
  };

  useEffect(() => {
    if (!isImageFormat || !isRasterOutput) return;
    ensureCropRect();
  }, [isImageFormat, isRasterOutput, effectiveCropDimensions, previewSize, localCropRect, cropMode]);

  const applyCropMode = (nextMode: CropMode) => {
    setCropMode(nextMode);
    const targetAspect = nextMode === 'original' || nextMode === 'free' ? null : aspectForMode(nextMode);
    onCropAspectChange?.(targetAspect);
    if (!effectiveCropDimensions) return;
    const nextRect = buildCenteredRectForAspect(effectiveCropDimensions, targetAspect);
    setLocalCropRect(nextRect);
    onCropRectChange?.(nextRect);
  };

  const optionToMode = (value: number | null | 'free'): CropMode => {
    if (value === 'free') return 'free';
    if (value === null) return 'original';
    if (Math.abs(value - 1) < 0.01) return 'ratio-1-1';
    if (Math.abs(value - 16 / 9) < 0.01) return 'ratio-16-9';
    return 'ratio-9-16';
  };

  const dragState = useRef<{
    mode: 'move' | 'nw' | 'ne' | 'sw' | 'se';
    startX: number;
    startY: number;
    startRect: { x: number; y: number; w: number; h: number };
  } | null>(null);

  const updateCropFromPointer = (clientX: number, clientY: number) => {
    if (!dragState.current || !previewSize || !localCropRect) return;
    const dx = clientX - dragState.current.startX;
    const dy = clientY - dragState.current.startY;
    const dxN = dx / previewSize.width;
    const dyN = dy / previewSize.height;
    const imageAspect = effectiveCropDimensions
      ? effectiveCropDimensions.width / effectiveCropDimensions.height
      : 1;
    const start = dragState.current.startRect;
    let next = { ...start };
    if (dragState.current.mode === 'move') {
      next = { ...start, x: start.x + dxN, y: start.y + dyN };
    } else {
      const previewAspect = previewSize.width / previewSize.height;
      const enforcedAspect = normalizedAspectForResize(
        imageAspect,
        previewAspect,
        cropMode,
        cropLock,
        start
      );
      if (dragState.current.mode === 'se') {
        const w = start.w + dxN;
        const h = enforcedAspect ? w / enforcedAspect : start.h + dyN;
        next = { ...start, w, h };
      } else if (dragState.current.mode === 'sw') {
        const w = start.w - dxN;
        const h = enforcedAspect ? w / enforcedAspect : start.h + dyN;
        next = { x: start.x + dxN, y: start.y, w, h };
      } else if (dragState.current.mode === 'ne') {
        const w = start.w + dxN;
        const h = enforcedAspect ? w / enforcedAspect : start.h - dyN;
        next = { x: start.x, y: start.y + (start.h - h), w, h };
      } else if (dragState.current.mode === 'nw') {
        const w = start.w - dxN;
        const h = enforcedAspect ? w / enforcedAspect : start.h - dyN;
        next = { x: start.x + dxN, y: start.y + (start.h - h), w, h };
      }
    }
    next = clampRect(next, previewSize);
    setLocalCropRect(next);
    onCropRectChange?.(next);
  };

  const onPointerDown = (mode: 'move' | 'nw' | 'ne' | 'sw' | 'se') => (e: React.PointerEvent) => {
    if (!localCropRect || !previewSize) return;
    previewWrapRef.current?.setPointerCapture(e.pointerId);
    dragState.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startRect: { ...localCropRect },
    };
    const onMove = (ev: PointerEvent) => updateCropFromPointer(ev.clientX, ev.clientY);
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    updateCropFromPointer(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragState.current) {
      dragState.current = null;
      previewWrapRef.current?.releasePointerCapture(e.pointerId);
    }
  };

  useEffect(() => {
    if (!isImageFormat || !imagePreviewSrc) {
      setImageDimensions(null);
      setCropBaseDimensions(null);
      return;
    }
    let disposed = false;
    const image = new Image();
    image.onload = () => {
      if (disposed) return;
      const nextDimensions = {
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      };
      setImageDimensions(nextDimensions);
      // Keep crop math aligned with the currently displayed preview image.
      setCropBaseDimensions(nextDimensions);
    };
    image.onerror = () => {
      if (!disposed) setImageDimensions(null);
    };
    image.src = imagePreviewSrc;
    return () => {
      disposed = true;
    };
  }, [isImageFormat, imagePreviewSrc]);

  useEffect(() => {
    if (!effectiveCropDimensions || !localCropRect) return;
    const px = rectToPixels(localCropRect, effectiveCropDimensions);
    setCropSizeInput({ w: String(px.w), h: String(px.h) });
  }, [effectiveCropDimensions, localCropRect]);

  const handleCropKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!previewSize || !effectiveCropDimensions || !localCropRect) return;
    const key = event.key;
    const baseStep = Math.max(1, parseInt(cropNudgeStep, 10) || 10);
    const step = event.shiftKey ? baseStep * 5 : baseStep;

    if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
      event.preventDefault();
      const dx = key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0;
      const dy = key === 'ArrowUp' ? -step : key === 'ArrowDown' ? step : 0;
      const next = moveRectByImagePixels(localCropRect, dx, dy, effectiveCropDimensions);
      setLocalCropRect(next);
      onCropRectChange?.(next);
      return;
    }

    if (key === '+' || key === '=') {
      event.preventDefault();
      const next = scaleRectAroundCenter(localCropRect, 1.06, previewSize);
      setLocalCropRect(next);
      onCropRectChange?.(next);
      return;
    }

    if (key === '-' || key === '_') {
      event.preventDefault();
      const next = scaleRectAroundCenter(localCropRect, 0.94, previewSize);
      setLocalCropRect(next);
      onCropRectChange?.(next);
      return;
    }

    if (key === '0') {
      event.preventDefault();
      const next = buildCenteredRectForAspect(
        effectiveCropDimensions,
        cropMode === 'free' || cropMode === 'original' ? null : aspectForMode(cropMode)
      );
      setLocalCropRect(next);
      onCropRectChange?.(next);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'clamp(24px, 4vw, 48px) clamp(12px, 3vw, 32px)',
        maxWidth: '1080px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        gap: '16px',
      }}
    >
      {/* Header */}
      <div style={{ width: '100%' }}>
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 'clamp(16px, 2.5vw, 12px)',
            fontWeight: 400,
            margin: '0 0 4px',
          }}
        >
          
        
          <span style={{ color: '#d0cbb8' }}> Konvertierung abgeschlossen</span>
        </p>
        
        <p style={{ margin: 0, fontSize: '10px', color: '#d0cbb8', fontFamily: 'IBM Plex Mono, monospace' }}>
          {isImageFormat && imageDimensions
            ? `${imageDimensions.width}x${imageDimensions.height} px · ${imageKb} KB`
            : `${charCount.toLocaleString('de-DE')} Zeichen`} ·{' '}
          {availableFormats.length} Format{availableFormats.length !== 1 ? 'e' : ''}
        </p>
        
      </div>

  

      {/* Output card — full width, beige */}
      <div
        style={{
          width: '100%',
          borderRadius: '12px',
          border: '1px solid #d0cbb8',
          background: '#d0cbb8',
          boxShadow: '4px 4px 20px rgba(0,0,0,0.28)',
          overflow: 'hidden',
        }}
      >
        {/* Format tab bar */}
        {availableFormats.length > 1 && (
          <div
            style={{
              display: 'flex',
              gap: '2px',
              padding: '10px 12px 0',
              borderBottom: '1px solid rgba(172,142,102,0.25)',
            }}
          >
            {availableFormats.map((fmt) => {
              const isActive = fmt === activeFormat;
              return (
                <button
                  key={fmt}
                  onClick={() => onActiveFormatChange(fmt)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px 6px 0 0',
                    border: isActive ? '1px solid rgba(172,142,102,0.55)' : '1px solid transparent',
                    borderBottom: isActive ? '1px solid #d0cbb8' : '1px solid transparent',
                    background: isActive ? '#d0cbb8' : 'rgba(0,0,0,0.06)',
                    color: isActive ? '#1a1a1a' : '#7a7060',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '10px',
                    cursor: 'pointer',
                    fontWeight: isActive ? 500 : 400,
                    marginBottom: '-1px',
                    position: 'relative',
                    zIndex: isActive ? 2 : 1,
                  }}
                >
                  {fmt.toUpperCase()}
                </button>
              );
            })}
          </div>
        )}

        {/* Output viewer */}
        <div style={{ padding: availableFormats.length > 1 ? '16px' : '16px' }}>
          {availableFormats.length === 1 && (
            <p
              style={{
                margin: '0 0 8px',
                fontSize: '9px',
                color: '#7a7060',
                fontFamily: 'IBM Plex Mono, monospace',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              {activeFormat.toUpperCase()} · Ergebnis
            </p>
          )}
          {isImageFormat ? (
            <div
              style={{
                width: '100%',
                minHeight: '320px',
                background: 'rgba(255,255,255,0.35)',
                border: '1px solid rgba(172,142,102,0.3)',
                borderRadius: '8px',
                padding: '12px',
                boxSizing: 'border-box',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  flex: 1,
                  minHeight: '296px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
              
                  position: 'sticky',
                  top: 0,
                }}
              >
                {imagePreviewSrc ? (
                  <div
                    ref={previewWrapRef}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onKeyDown={handleCropKeyboard}
                    tabIndex={0}
                    title="Tastatursteuerung: Pfeile bewegen, +/- zoomen, 0 zentriert"
                    style={{
                      position: 'relative',
                      display: 'inline-block',
                      maxWidth: '100%',
                      maxHeight: '440px',
                      outline: 'none',
                    }}
                  >
                    <img
                      ref={previewImgRef}
                      src={imagePreviewSrc}
                      alt={`Preview ${activeFormat}`}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '440px',
                        objectFit: 'contain',
                        borderRadius: '6px',
                        border: '1px solid rgba(172,142,102,0.25)',
                        background: '#e8e3d8',
                        display: 'block',
                        filter: isImageFormat ? filterString : 'none',
                      }}
                    />
                    {showImageControls && isCropSupported && localCropRect && previewSize && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          pointerEvents: 'none',
                        }}
                      >
                        <div
                          role="presentation"
                          style={{
                            position: 'absolute',
                            inset: 0,
                            pointerEvents: 'auto',
                          }}
                        >
                          <div
                            role="presentation"
                            onPointerDown={onPointerDown('move')}
                            style={{
                              position: 'absolute',
                              left: `${localCropRect.x * previewSize.width}px`,
                              top: `${localCropRect.y * previewSize.height}px`,
                              width: `${localCropRect.w * previewSize.width}px`,
                              height: `${localCropRect.h * previewSize.height}px`,
                              border: '1px solid rgba(255,255,255,0.9)',
                              boxShadow: '0 0 0 9999px rgba(0,0,0,0.25)',
                              cursor: 'move',
                              boxSizing: 'border-box',
                              pointerEvents: 'auto',
                            }}
                          >
                            {(['nw', 'ne', 'sw', 'se'] as const).map((dir) => {
                              const isLeft = dir.includes('w');
                              const isTop = dir.includes('n');
                              return (
                                <div
                                  key={dir}
                                  role="presentation"
                                  onPointerDown={onPointerDown(dir)}
                                  style={{
                                    position: 'absolute',
                                    width: '14px',
                                    height: '14px',
                                    background: '#fff',
                                    border: '1px solid rgba(172,142,102,0.9)',
                                    borderRadius: '2px',
                                    left: isLeft ? '-7px' : undefined,
                                    right: !isLeft ? '-7px' : undefined,
                                    top: isTop ? '-7px' : undefined,
                                    bottom: !isTop ? '-7px' : undefined,
                                    cursor: `${dir}-resize`,
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#7a7060' }}>
                    Keine Bildvorschau verfügbar
                  </span>
                )}
              </div>
              {showImageControls && (
                <div
                  ref={rightPanelRef}
                  style={{
                    width: '300px',
                    borderRadius: '8px',
                    border: '1px solid rgba(172,142,102,0.35)',
                    background: '#e8e3d8',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    maxHeight: '440px',
                    overflowY: 'auto',
                    position: 'relative',
                  }}
                >
                  {rightHasTopShadow && (
                    <div
                      style={{
                        position: 'sticky',
                        top: 0,
                        height: 10,
                        margin: '-12px -12px 0',
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.18), rgba(0,0,0,0))',
                        pointerEvents: 'none',
                        zIndex: 2,
                      }}
                    />
                  )}
                  {rightHasBottomShadow && (
                    <div
                      style={{
                        position: 'sticky',
                        bottom: 0,
                        height: 10,
                        margin: '0 -12px -12px',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.18), rgba(0,0,0,0))',
                        pointerEvents: 'none',
                        zIndex: 2,
                      }}
                    />
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '10px',
                        color: '#6b5a40',
                        fontFamily: 'IBM Plex Mono, monospace',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}
                    >
                      Live Preview
                    </p>
                      <span style={{ fontSize: '10px', color: '#252525', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {isPreviewRefreshing ? 'Aktualisiere Vorschau…' : 'Vorschau ist live aktiv'}
                  </span>
                    {isPreviewRefreshing && (
                      <span
                        style={{
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '9px',
                          color: '#6b5a40',
                          background: 'rgba(172,142,102,0.18)',
                          border: '1px solid rgba(172,142,102,0.35)',
                          borderRadius: '999px',
                          padding: '2px 6px',
                        }}
                      >
                        Aktualisiere…
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {[
                      { id: 'logo', label: 'Logo' },
                      { id: 'illustration', label: 'Illustration' },
                      { id: 'photo', label: 'Foto' },
                    ].map((preset) => {
                      const active = activeImagePreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => onImagePresetSelect?.(preset.id as 'logo' | 'illustration' | 'photo')}
                          style={{
                            borderRadius: '6px',
                            border: active ? '1px solid rgba(172,142,102,0.8)' : '1px solid rgba(90,80,60,0.3)',
                            background: active ? '#AC8E66' : 'rgba(255,255,255,0.35)',
                            color: active ? '#fff' : '#5a5040',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '10px',
                            padding: '5px 6px',
                            cursor: 'pointer',
                          }}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '10px', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace' }}>
                      Qualität: {imageQuality}%
                    </span>
                    <input
                      type="range"
                      min={35}
                      max={100}
                      step={1}
                      value={imageQuality}
                      onChange={(event) => onImageQualityChange?.(Number(event.target.value))}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '10px', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace' }}>
                      Raster/Detail (SVG): {imageRasterSize}px
                    </span>
                    <input
                      type="range"
                      min={48}
                      max={2048}
                      step={16}
                      value={imageRasterSize}
                      onChange={(event) => onImageRasterSizeChange?.(Number(event.target.value))}
                    />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={imageSmoothEdges}
                      onChange={(event) => onImageSmoothEdgesChange?.(event.target.checked)}
                    />
                    <span style={{ fontSize: '10px', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace' }}>
                      Kanten glätten
                    </span>
                  </label>
                  <Accordion
                    title="Max. Ausgabegröße"
                    open={openMaxSize}
                    onToggle={() => {
                      const next = !openMaxSize;
                      setOpenMaxSize(next);
                      onUiMaxSizeOpenChange?.(next);
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {sizePresets.map((opt) => {
                        const isActive = maxImageOutputSize === opt.value && !customMaxSizeInput;
                        return (
                          <button
                            key={String(opt.value)}
                            type="button"
                            onClick={() => {
                              onMaxImageOutputSizeChange?.(opt.value);
                              setCustomMaxSizeInput('');
                            }}
                            style={{
                              borderRadius: '6px',
                              border: isActive ? '1px solid rgba(172,142,102,0.8)' : '1px solid rgba(90,80,60,0.3)',
                              background: isActive ? '#AC8E66' : 'rgba(255,255,255,0.35)',
                              color: isActive ? '#fff' : '#5a5040',
                              fontFamily: 'IBM Plex Mono, monospace',
                              fontSize: '9px',
                              padding: '5px 6px',
                              cursor: 'pointer',
                            }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <input
                        type="number"
                        min={100}
                        max={16000}
                        placeholder="Eigener Wert px"
                        value={customMaxSizeInput}
                        onChange={(e) => setCustomMaxSizeInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCustomMaxSize(); }}
                        style={{
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '9px',
                          width: '120px',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(90,80,60,0.35)',
                          background: 'rgba(255,255,255,0.6)',
                          color: '#3a2a10',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleCustomMaxSize}
                        disabled={!customMaxSizeInput}
                        style={{
                          borderRadius: '6px',
                          border: '1px solid rgba(172,142,102,0.5)',
                          background: customMaxSizeInput ? '#AC8E66' : 'rgba(172,142,102,0.12)',
                          color: customMaxSizeInput ? '#fff' : '#9a8870',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '9px',
                          padding: '5px 8px',
                          cursor: customMaxSizeInput ? 'pointer' : 'not-allowed',
                        }}
                      >
                        Setzen
                      </button>
                    </div>
                    <span style={{ fontSize: '9px', color: '#7a7060', fontFamily: 'IBM Plex Mono, monospace' }}>
                      Gilt für PNG, JPG, WEBP
                    </span>
                  </Accordion>
                  {isCropSupported && (
                    <div style={{ borderTop: '1px solid rgba(172,142,102,0.25)', marginTop: '2px', paddingTop: '8px' }}>
                      <p
                        style={{
                          margin: '0 0 6px',
                          fontSize: '10px',
                          color: '#6b5a40',
                          fontFamily: 'IBM Plex Mono, monospace',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                        }}
                      >
                        Zuschnitt
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                        {[
                          { label: 'Original', value: null },
                          { label: '1:1', value: 1 },
                          { label: '16:9', value: 16 / 9 },
                          { label: '9:16', value: 9 / 16 },
                          { label: 'Frei', value: 'free' as const },
                        ].map((opt) => {
                          const mode = optionToMode(opt.value);
                          const isActive = cropMode === mode;
                          return (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => applyCropMode(mode)}
                              style={{
                                borderRadius: '6px',
                                border: isActive ? '1px solid rgba(172,142,102,0.8)' : '1px solid rgba(90,80,60,0.3)',
                                background: isActive ? '#AC8E66' : 'rgba(255,255,255,0.35)',
                                color: isActive ? '#fff' : '#5a5040',
                                fontFamily: 'IBM Plex Mono, monospace',
                                fontSize: '9px',
                                padding: '5px 6px',
                                cursor: 'pointer',
                              }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      <span style={{ fontSize: '9px', color: '#7a7060', fontFamily: 'IBM Plex Mono, monospace' }}>
                        Rahmen ziehen oder verschieben (PNG/JPG/WEBP/SVG)
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            applyCropMode(cropMode === 'free' ? 'original' : 'free');
                          }}
                          style={{
                            borderRadius: '6px',
                            border: '1px solid rgba(90,80,60,0.35)',
                            background: cropMode === 'free' ? 'rgba(255,255,255,0.45)' : '#AC8E66',
                            color: cropMode === 'free' ? '#5a5040' : '#fff',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '9px',
                            padding: '5px 8px',
                            cursor: 'pointer',
                          }}
                        >
                          {cropMode === 'free' ? 'Proportional aus' : 'Proportional an'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCropLock((v) => !v)}
                          style={{
                            borderRadius: '6px',
                            border: '1px solid rgba(90,80,60,0.35)',
                            background: cropLock ? '#AC8E66' : 'rgba(255,255,255,0.45)',
                            color: cropLock ? '#fff' : '#5a5040',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '9px',
                            padding: '5px 8px',
                            cursor: 'pointer',
                          }}
                        >
                          {cropLock ? 'Lock aktiv' : 'Lock aus'}
                        </button>
                      </div>
                      {effectiveCropDimensions && localCropRect && previewSize && (
                        <div style={{ marginTop: '6px', borderTop: '1px dashed rgba(90,80,60,0.25)', paddingTop: '6px' }}>
                          <div style={{ fontSize: '9px', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px', marginLeft: '6px' }}>
                            Bild einpassen
                          </div>
                          <div style={{ fontSize: '9px', color: '#7a7060', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>
                            Tasten: Pfeile bewegen · +/- zoom · 0 zentriert · Shift = großer Schritt
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '9px', color: '#7a7060', fontFamily: 'IBM Plex Mono, monospace' }}>Schritt</span>
                            <input
                              type="number"
                              min={1}
                              max={300}
                              value={cropNudgeStep}
                              onChange={(e) => setCropNudgeStep(e.target.value)}
                              style={{
                                fontFamily: 'IBM Plex Mono, monospace',
                                fontSize: '9px',
                                width: '70px',
                                padding: '4px 6px',
                                borderRadius: '6px',
                                border: '1px solid rgba(90,80,60,0.35)',
                                background: 'rgba(255,255,255,0.6)',
                                color: '#3a2a10',
                                outline: 'none',
                              }}
                            />
                            <span style={{ fontSize: '9px', color: '#7a7060', fontFamily: 'IBM Plex Mono, monospace' }}>px</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 30px)', gap: '6px', marginBottom: '6px' }}>
                            <div />
                            <button
                              type="button"
                              onClick={() => {
                                const step = Math.max(1, parseInt(cropNudgeStep, 10) || 10);
                                const next = moveRectByImagePixels(localCropRect, 0, -step, effectiveCropDimensions);
                                setLocalCropRect(next);
                                onCropRectChange?.(next);
                              }}
                              style={{ borderRadius: '6px', border: '1px solid rgba(90,80,60,0.35)', background: 'rgba(255,255,255,0.45)', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', cursor: 'pointer' }}
                            >
                              ↑
                            </button>
                            <div />
                            <button
                              type="button"
                              onClick={() => {
                                const step = Math.max(1, parseInt(cropNudgeStep, 10) || 10);
                                const next = moveRectByImagePixels(localCropRect, -step, 0, effectiveCropDimensions);
                                setLocalCropRect(next);
                                onCropRectChange?.(next);
                              }}
                              style={{ borderRadius: '6px', border: '1px solid rgba(90,80,60,0.35)', background: 'rgba(255,255,255,0.45)', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', cursor: 'pointer' }}
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = buildCenteredRectForAspect(
                                  effectiveCropDimensions,
                                  cropMode === 'free' || cropMode === 'original' ? null : aspectForMode(cropMode)
                                );
                                setLocalCropRect(next);
                                onCropRectChange?.(next);
                              }}
                              style={{ borderRadius: '6px', border: '1px solid rgba(90,80,60,0.35)', background: 'rgba(255,255,255,0.45)', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', cursor: 'pointer' }}
                            >
                              •
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const step = Math.max(1, parseInt(cropNudgeStep, 10) || 10);
                                const next = moveRectByImagePixels(localCropRect, step, 0, effectiveCropDimensions);
                                setLocalCropRect(next);
                                onCropRectChange?.(next);
                              }}
                              style={{ borderRadius: '6px', border: '1px solid rgba(90,80,60,0.35)', background: 'rgba(255,255,255,0.45)', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', cursor: 'pointer' }}
                            >
                              →
                            </button>
                            <div />
                            <button
                              type="button"
                              onClick={() => {
                                const step = Math.max(1, parseInt(cropNudgeStep, 10) || 10);
                                const next = moveRectByImagePixels(localCropRect, 0, step, effectiveCropDimensions);
                                setLocalCropRect(next);
                                onCropRectChange?.(next);
                              }}
                              style={{ borderRadius: '6px', border: '1px solid rgba(90,80,60,0.35)', background: 'rgba(255,255,255,0.45)', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', cursor: 'pointer' }}
                            >
                              ↓
                            </button>
                            <div />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const next = scaleRectAroundCenter(localCropRect, 1.06, previewSize);
                                setLocalCropRect(next);
                                onCropRectChange?.(next);
                              }}
                              style={{ borderRadius: '6px', border: '1px solid rgba(90,80,60,0.35)', background: 'rgba(255,255,255,0.45)', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', padding: '4px 8px', cursor: 'pointer' }}
                            >
                              Zoom +
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = scaleRectAroundCenter(localCropRect, 0.94, previewSize);
                                setLocalCropRect(next);
                                onCropRectChange?.(next);
                              }}
                              style={{ borderRadius: '6px', border: '1px solid rgba(90,80,60,0.35)', background: 'rgba(255,255,255,0.45)', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', padding: '4px 8px', cursor: 'pointer' }}
                            >
                              Zoom -
                            </button>
                          </div>
                        </div>
                      )}
                      {effectiveCropDimensions && localCropRect && (
                        <div style={{ marginTop: '6px' }}>
                          <div style={{ fontSize: '9px', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace' }}>
                            Größe: {Math.round(localCropRect.w * effectiveCropDimensions.width)}×{Math.round(localCropRect.h * effectiveCropDimensions.height)} px
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                            <input
                              type="number"
                              min={1}
                              placeholder="Breite px"
                              value={cropSizeInput.w}
                              onChange={(e) => setCropSizeInput((prev) => ({ ...prev, w: e.target.value }))}
                              style={{
                                fontFamily: 'IBM Plex Mono, monospace',
                                fontSize: '9px',
                                width: '90px',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                border: '1px solid rgba(90,80,60,0.35)',
                                background: 'rgba(255,255,255,0.6)',
                                color: '#3a2a10',
                                outline: 'none',
                              }}
                            />
                            <input
                              type="number"
                              min={1}
                              placeholder="Höhe px"
                              value={cropSizeInput.h}
                              onChange={(e) => setCropSizeInput((prev) => ({ ...prev, h: e.target.value }))}
                              style={{
                                fontFamily: 'IBM Plex Mono, monospace',
                                fontSize: '9px',
                                width: '90px',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                border: '1px solid rgba(90,80,60,0.35)',
                                background: 'rgba(255,255,255,0.6)',
                                color: '#3a2a10',
                                outline: 'none',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!previewSize) return;
                                const wPx = Math.max(1, parseInt(cropSizeInput.w, 10) || 1);
                                const hPx = Math.max(1, parseInt(cropSizeInput.h, 10) || 1);
                                const imageAspect = effectiveCropDimensions.width / effectiveCropDimensions.height;
                                const targetAspect =
                                  cropMode === 'free'
                                    ? null
                                    : (aspectForMode(cropMode) ?? imageAspect);
                                const finalW = wPx;
                                const finalH = targetAspect
                                  ? Math.max(1, Math.round(finalW / targetAspect))
                                  : hPx;
                                const next = pixelsToNormalizedRect(
                                  finalW,
                                  finalH,
                                  effectiveCropDimensions,
                                  localCropRect,
                                  previewSize
                                );
                                setLocalCropRect(next);
                                onCropRectChange?.(next);
                                setCropSizeInput({ w: String(finalW), h: String(finalH) });
                              }}
                              style={{
                                borderRadius: '6px',
                                border: '1px solid rgba(172,142,102,0.5)',
                                background: 'rgba(255,255,255,0.45)',
                                color: '#5a5040',
                                fontFamily: 'IBM Plex Mono, monospace',
                                fontSize: '9px',
                                padding: '5px 8px',
                                cursor: 'pointer',
                              }}
                            >
                              Setzen
                            </button>
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <button
                          type="button"
                            onClick={() => {
                              setLocalCropRect(null);
                              onCropRectChange?.(null);
                              setCropMode('original');
                              onCropAspectChange?.(null);
                              setCropLock(false);
                            }}
                          style={{
                            borderRadius: '6px',
                            border: '1px solid rgba(90,80,60,0.35)',
                            background: 'rgba(255,255,255,0.45)',
                            color: '#5a5040',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '9px',
                            padding: '5px 8px',
                            cursor: 'pointer',
                          }}
                        >
                          Zuschnitt zurücksetzen
                        </button>
                      </div>
                    </div>
                  )}
                  {activeFormat === 'svg' && (
                    <div style={{ borderTop: '1px solid rgba(172,142,102,0.25)', marginTop: '2px', paddingTop: '8px' }}>
                      <p
                        style={{
                          margin: '0 0 6px',
                          fontSize: '10px',
                          color: '#6b5a40',
                          fontFamily: 'IBM Plex Mono, monospace',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                        }}
                      >
                        SVG Ausgabegröße
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                        {[
                          { label: '1080×1080', width: 1080, height: 1080 },
                          { label: '1920×1080', width: 1920, height: 1080 },
                          { label: '1080×1920', width: 1080, height: 1920 },
                        ].map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => onSvgOutputSizeChange?.({ width: opt.width, height: opt.height })}
                            style={{
                              borderRadius: '6px',
                              border: '1px solid rgba(90,80,60,0.3)',
                              background: 'rgba(255,255,255,0.35)',
                              color: '#5a5040',
                              fontFamily: 'IBM Plex Mono, monospace',
                              fontSize: '9px',
                              padding: '5px 6px',
                              cursor: 'pointer',
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                        <input
                          type="number"
                          min={1}
                          placeholder="Breite"
                          value={svgSizeInput.width}
                          onChange={(e) => setSvgSizeInput((prev) => ({ ...prev, width: e.target.value }))}
                          style={{
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '9px',
                            width: '90px',
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: '1px solid rgba(90,80,60,0.35)',
                            background: 'rgba(255,255,255,0.6)',
                            color: '#3a2a10',
                            outline: 'none',
                          }}
                        />
                        <input
                          type="number"
                          min={1}
                          placeholder="Höhe"
                          value={svgSizeInput.height}
                          onChange={(e) => setSvgSizeInput((prev) => ({ ...prev, height: e.target.value }))}
                          style={{
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '9px',
                            width: '90px',
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: '1px solid rgba(90,80,60,0.35)',
                            background: 'rgba(255,255,255,0.6)',
                            color: '#3a2a10',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleApplySvgSize}
                          style={{
                            borderRadius: '6px',
                            border: '1px solid rgba(172,142,102,0.5)',
                            background: 'rgba(255,255,255,0.45)',
                            color: '#5a5040',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '9px',
                            padding: '5px 8px',
                            cursor: 'pointer',
                          }}
                        >
                          Setzen
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <button
                          type="button"
                          onClick={handleResetSvgSize}
                          style={{
                            borderRadius: '6px',
                            border: '1px solid rgba(90,80,60,0.35)',
                            background: 'rgba(255,255,255,0.45)',
                            color: '#5a5040',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '9px',
                            padding: '5px 8px',
                            cursor: 'pointer',
                          }}
                        >
                          SVG Größe zurücksetzen
                        </button>
                      </div>
                    </div>
                  )}
                  {isImageFormat && (
                    <Accordion
                      title="Filter"
                      open={openFilters}
                      onToggle={() => {
                        const next = !openFilters;
                        setOpenFilters(next);
                        onUiFiltersOpenChange?.(next);
                      }}
                    >
                      {[
                        { key: 'grayscale', label: 'Schwarz‑Weiß', min: 0, max: 100 },
                        { key: 'sepia', label: 'Sepia', min: 0, max: 100 },
                        { key: 'contrast', label: 'Kontrast', min: 50, max: 150 },
                        { key: 'brightness', label: 'Helligkeit', min: 50, max: 150 },
                        { key: 'saturation', label: 'Sättigung', min: 0, max: 200 },
                        { key: 'blur', label: 'Blur', min: 0, max: 10 },
                        { key: 'sharpen', label: 'Schärfen', min: 0, max: 100 },
                      ].map((f) => (
                        <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '9px', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace' }}>
                            {f.label}: {imageFilters[f.key as keyof typeof imageFilters]}
                          </span>
                          <input
                            type="range"
                            min={f.min}
                            max={f.max}
                            step={1}
                            value={imageFilters[f.key as keyof typeof imageFilters]}
                            onChange={(e) => {
                              const next = { ...imageFilters, [f.key]: Number(e.target.value) };
                              onImageFiltersChange?.(next);
                            }}
                          />
                        </label>
                      ))}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '6px' }}>
                        {[
                          { label: 'Noir', filters: { grayscale: 100, sepia: 0, contrast: 120, brightness: 95, saturation: 0, blur: 0, sharpen: 20 } },
                          { label: 'Warm', filters: { grayscale: 0, sepia: 35, contrast: 110, brightness: 105, saturation: 120, blur: 0, sharpen: 0 } },
                          { label: 'Film', filters: { grayscale: 0, sepia: 20, contrast: 115, brightness: 98, saturation: 90, blur: 0, sharpen: 10 } },
                          { label: 'Crisp', filters: { grayscale: 0, sepia: 0, contrast: 125, brightness: 102, saturation: 110, blur: 0, sharpen: 35 } },
                        ].map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => onImageFiltersChange?.(p.filters)}
                            style={{
                              borderRadius: '6px',
                              border: '1px solid rgba(90,80,60,0.3)',
                              background: 'rgba(255,255,255,0.35)',
                              color: '#5a5040',
                              fontFamily: 'IBM Plex Mono, monospace',
                              fontSize: '9px',
                              padding: '5px 6px',
                              cursor: 'pointer',
                            }}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => onImageFiltersChange?.({
                          grayscale: 0,
                          sepia: 0,
                          contrast: 100,
                          brightness: 100,
                          saturation: 100,
                          blur: 0,
                          sharpen: 0,
                        })}
                        style={{
                          borderRadius: '6px',
                          border: '1px solid rgba(90,80,60,0.35)',
                          background: 'rgba(255,255,255,0.45)',
                          color: '#5a5040',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '9px',
                          padding: '5px 8px',
                          cursor: 'pointer',
                        }}
                      >
                        Filter zurücksetzen
                      </button>
                      <div style={{ fontSize: '9px', color: '#7a7060', fontFamily: 'IBM Plex Mono, monospace', marginTop: '6px' }}>
                        Filter wirken auf PNG/JPG/WEBP/SVG Export.
                      </div>
                    </Accordion>
                  )}
                  {isImageFormat && (
                    <Accordion
                      title="Meta/SEO"
                      open={openMeta}
                      onToggle={() => setOpenMeta((prev) => !prev)}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '9px', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace' }}>
                            Titel
                          </span>
                          <input
                            type="text"
                            value={imageMeta.title}
                            onChange={(event) =>
                              onImageMetaChange?.({ ...imageMeta, title: event.target.value })
                            }
                            placeholder="Bildtitel"
                            style={{
                              fontFamily: 'IBM Plex Mono, monospace',
                              fontSize: '9px',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: '1px solid rgba(90,80,60,0.35)',
                              background: 'rgba(255,255,255,0.6)',
                              color: '#3a2a10',
                              outline: 'none',
                            }}
                          />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '9px', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace' }}>
                            ALT Text
                          </span>
                          <input
                            type="text"
                            value={imageMeta.altText}
                            onChange={(event) =>
                              onImageMetaChange?.({ ...imageMeta, altText: event.target.value })
                            }
                            placeholder="Beschreibung für SEO/Screenreader"
                            style={{
                              fontFamily: 'IBM Plex Mono, monospace',
                              fontSize: '9px',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: '1px solid rgba(90,80,60,0.35)',
                              background: 'rgba(255,255,255,0.6)',
                              color: '#3a2a10',
                              outline: 'none',
                            }}
                          />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '9px', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace' }}>
                            Caption
                          </span>
                          <textarea
                            value={imageMeta.caption}
                            onChange={(event) =>
                              onImageMetaChange?.({ ...imageMeta, caption: event.target.value })
                            }
                            rows={2}
                            placeholder="Kurzbeschreibung / Kontext"
                            style={{
                              fontFamily: 'IBM Plex Mono, monospace',
                              fontSize: '9px',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: '1px solid rgba(90,80,60,0.35)',
                              background: 'rgba(255,255,255,0.6)',
                              color: '#3a2a10',
                              outline: 'none',
                              resize: 'vertical',
                            }}
                          />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '9px', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace' }}>
                            Tags
                          </span>
                          <input
                            type="text"
                            value={imageMeta.tags.join(', ')}
                            onChange={(event) => {
                              const tags = event.target.value
                                .split(',')
                                .map((entry) => entry.trim().toLowerCase())
                                .filter(Boolean)
                                .filter((entry, index, arr) => arr.indexOf(entry) === index);
                              onImageMetaChange?.({ ...imageMeta, tags });
                            }}
                            placeholder="seo, bild, produkt..."
                            style={{
                              fontFamily: 'IBM Plex Mono, monospace',
                              fontSize: '9px',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: '1px solid rgba(90,80,60,0.35)',
                              background: 'rgba(255,255,255,0.6)',
                              color: '#3a2a10',
                              outline: 'none',
                            }}
                          />
                        </label>
                      </div>
                    </Accordion>
                  )}
                
                  <Accordion
                    title="Export/Info"
                    open={openExport}
                    onToggle={() => {
                      const next = !openExport;
                      setOpenExport(next);
                      onUiExportOpenChange?.(next);
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '10px', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace' }}>
                        Größe: {imageKb} KB
                      </span>
                      {imageDimensions && (
                        <span style={{ fontSize: '10px', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace' }}>
                          Pixel: {imageDimensions.width}x{imageDimensions.height}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', marginTop: '8px' }}>
           
               
                    
                    </div>
                  </Accordion>
                </div>
              )}
            </div>
          ) : (
            <textarea
              value={outputContent}
              readOnly
              style={{
                width: '100%',
                height: '320px',
                background: 'rgba(255,255,255,0.35)',
                border: '1px solid rgba(172,142,102,0.3)',
                borderRadius: '8px',
                padding: '12px',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
                color: '#2a2010',
                lineHeight: 1.6,
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          )}
        </div>
      </div>

      {/* Action row */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
        }}
      >
             {/* Start over */}
        <button
          onClick={onStartOver}
          style={{
            padding: '9px 16px',
            marginBottom: '10px',
            borderRadius: '8px',
            border: '0.5px solid #3A3A3A',
            background: 'transparent',
            color: '#d0cbb8',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'left',
            gap: '7px',
          }}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Neue Konvertierung
        </button>
        
        {/* Download active format */}
        {activeFormat !== 'pdf' && (
          <button
            onClick={() => onDownload(activeFormat)}
            style={{
                    padding: '9px 16px',
            marginBottom: '10px',
            borderRadius: '8px',
            border: '0.5px solid #3A3A3A',
            background: 'transparent',
            color: '#d0cbb8',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'left',
            gap: '7px'
            }}
          >
            <FontAwesomeIcon icon={faDownload} />
            {activeFormat.toUpperCase()} speichern
          </button>
        )}

        {/* Download all (if multiple) */}
        {availableFormats.length > 1 && (
          <button
            onClick={onDownloadAll}
            style={{
                     padding: '9px 16px',
            marginBottom: '10px',
            borderRadius: '8px',
            border: '0.5px solid #3A3A3A',
            background: 'transparent',
            color: '#d0cbb8',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'left',
            gap: '7px'
            }}
          >
            <FontAwesomeIcon icon={faDownload} />
            Alle speichern
          </button>
        )}

        {/* ZenImage Gallery */}
        {onOpenImageGallery && (
          <button
            onClick={onOpenImageGallery}
            style={{
                   padding: '9px 16px',
            marginBottom: '10px',
            borderRadius: '8px',
            border: '0.5px solid #3A3A3A',
            background: 'transparent',
            color: '#d0cbb8',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'left',
            gap: '7px'
            }}
          >
            <FontAwesomeIcon icon={faImages} />
            ZenImage
          </button>
        )}

        {isPreviewRefreshing && (
          <span
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
             background: 'transparent',
            color: '#d0cbb8',
              border: '1px solid rgba(172,142,102,0.35)',
              borderRadius: '8px',
              padding: '7px 10px',
            }}
          >
            Aktualisiere…
          </span>
        )}

        {copyFeedback && (
          <span
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              color: '#9fd2ad',
              background: 'rgba(60,120,80,0.22)',
              border: '1px solid rgba(100,170,120,0.45)',
              borderRadius: '8px',
              padding: '7px 10px',
            }}
          >
            {copyFeedback}
          </span>
        )}

        {cloudSaveFeedback && (
          <span
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              color: '#9fd2ad',
              background: 'rgba(60,120,80,0.22)',
              border: '1px solid rgba(100,170,120,0.45)',
              borderRadius: '8px',
              padding: '7px 10px',
            }}
          >
            {cloudSaveFeedback}
          </span>
        )}

        {/* Open in Content Studio */}
        {showOpenInContentStudio && (
          <button
            onClick={onOpenInContentStudio}
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              border: '0.5px solid #3A3A3A',
              background: 'transparent',
              color: '#AC8E66',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
            }}
          >
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
            Im Content Studio öffnen{' '}
            <span style={{ opacity: 0.6, fontSize: '9px' }}>
              ({getFileExtension(activeFormat).replace('.', '').toUpperCase()})
            </span>
          </button>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

       
      </div>
    </div>
  );
};
