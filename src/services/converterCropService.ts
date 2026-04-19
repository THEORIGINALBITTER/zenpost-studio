export type CropRect = { x: number; y: number; w: number; h: number };
export type Size = { width: number; height: number };
export type CropMode = 'original' | 'ratio-1-1' | 'ratio-16-9' | 'ratio-9-16' | 'free';

const EPSILON = 0.01;

export function approxEqual(a: number | null, b: number | null, epsilon = EPSILON): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) < epsilon;
}

export function aspectForMode(mode: CropMode): number | null {
  if (mode === 'ratio-1-1') return 1;
  if (mode === 'ratio-16-9') return 16 / 9;
  if (mode === 'ratio-9-16') return 9 / 16;
  return null;
}

export function inferModeFromAspect(aspect: number | null): CropMode {
  if (aspect === null) return 'original';
  if (approxEqual(aspect, 1)) return 'ratio-1-1';
  if (approxEqual(aspect, 16 / 9)) return 'ratio-16-9';
  if (approxEqual(aspect, 9 / 16)) return 'ratio-9-16';
  return 'free';
}

export function clampRect(rect: CropRect, previewSize: Size, minPx = 40): CropRect {
  const minW = minPx / previewSize.width;
  const minH = minPx / previewSize.height;
  const w = Math.max(rect.w, minW);
  const h = Math.max(rect.h, minH);
  const x = Math.min(Math.max(rect.x, 0), 1 - w);
  const y = Math.min(Math.max(rect.y, 0), 1 - h);
  return { x, y, w, h };
}

export function buildCenteredRectForAspect(
  imageSize: Size,
  targetAspect: number | null,
): CropRect {
  const imageAspect = imageSize.width / imageSize.height;
  const aspect = targetAspect ?? imageAspect;
  let w = 1;
  let h = 1;

  if (imageAspect > aspect) {
    h = 1;
    w = (aspect * imageSize.height) / imageSize.width;
  } else {
    w = 1;
    h = (imageSize.width / aspect) / imageSize.height;
  }

  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

export function normalizedAspectForResize(
  imageAspect: number,
  previewAspect: number,
  mode: CropMode,
  lockEnabled: boolean,
  startRect: CropRect,
): number | null {
  if (lockEnabled) return startRect.w / startRect.h;
  if (mode === 'free') return null;
  const targetAspect = aspectForMode(mode) ?? imageAspect;
  return targetAspect / previewAspect;
}

export function rectToPixels(rect: CropRect, imageSize: Size): { w: number; h: number } {
  return {
    w: Math.round(rect.w * imageSize.width),
    h: Math.round(rect.h * imageSize.height),
  };
}

export function pixelsToNormalizedRect(
  widthPx: number,
  heightPx: number,
  imageSize: Size,
  currentRect: CropRect,
  previewSize: Size,
): CropRect {
  const wN = Math.min(1, Math.max(1, widthPx) / imageSize.width);
  const hN = Math.min(1, Math.max(1, heightPx) / imageSize.height);
  const cx = currentRect.x + currentRect.w / 2;
  const cy = currentRect.y + currentRect.h / 2;
  return clampRect({ x: cx - wN / 2, y: cy - hN / 2, w: wN, h: hN }, previewSize);
}

export function moveRectByImagePixels(
  rect: CropRect,
  dxPx: number,
  dyPx: number,
  imageSize: Size,
): CropRect {
  const dx = dxPx / Math.max(1, imageSize.width);
  const dy = dyPx / Math.max(1, imageSize.height);
  const x = Math.min(Math.max(rect.x + dx, 0), 1 - rect.w);
  const y = Math.min(Math.max(rect.y + dy, 0), 1 - rect.h);
  return { ...rect, x, y };
}

export function scaleRectAroundCenter(
  rect: CropRect,
  scaleFactor: number,
  previewSize: Size,
): CropRect {
  const safeScale = Math.max(0.5, Math.min(2, scaleFactor));
  const nextW = rect.w * safeScale;
  const nextH = rect.h * safeScale;
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  return clampRect(
    {
      x: cx - nextW / 2,
      y: cy - nextH / 2,
      w: nextW,
      h: nextH,
    },
    previewSize
  );
}
