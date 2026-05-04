import type { EditorPaperIntensity, EditorTheme } from './editorSettingsService';

export type EditorPaperStyle = 'classic' | 'dot';

export const EDITOR_PAPER_STYLE_OPTIONS: Array<{ id: EditorPaperStyle; label: string }> = [
  { id: 'classic', label: 'Classic' },
  { id: 'dot', label: 'Dot' },
];

export const EDITOR_PAPER_INTENSITY_OPTIONS: Array<{ id: EditorPaperIntensity; label: string }> = [
  { id: 'soft', label: 'Soft' },
  { id: 'medium', label: 'Medium' },
  { id: 'strong', label: 'Strong' },
];

type PaperStyleInput = {
  theme: EditorTheme;
  paperStyle: EditorPaperStyle;
  paperIntensity?: EditorPaperIntensity;
  baseBackground: string;
};

type PaperStyleOutput = {
  backgroundColor: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  scrollOffsetY?: number;
};

const INTENSITY_SCALE: Record<EditorPaperIntensity, number> = {
  soft: 0.45,
  medium: 0.65,
  strong: 1,
};

const clampAlpha = (value: number) => Math.max(0, Math.min(1, value));

const scaleAlpha = (alpha: number, intensity: EditorPaperIntensity) =>
  clampAlpha(alpha * INTENSITY_SCALE[intensity]).toFixed(3);

const rgba = (rgb: string, alpha: number, intensity: EditorPaperIntensity) =>
  `rgba(${rgb},${scaleAlpha(alpha, intensity)})`;

export const resolveEditorPaperStyle = ({
  theme,
  paperStyle,
  paperIntensity = 'medium',
  baseBackground,
}: PaperStyleInput): PaperStyleOutput => {
  if (paperStyle === 'classic') {
    return {
      backgroundColor: baseBackground,
      scrollOffsetY: 0,
    };
  }

  const lineRgb = theme === 'dark' ? '208,203,184' : '140,114,74';
  const dotAlpha = theme === 'dark' ? 0.34 : 0.4;

  if (paperStyle === 'dot') {
    return {
      backgroundColor: baseBackground,
      backgroundImage: `radial-gradient(${rgba(lineRgb, dotAlpha, paperIntensity)} 1.15px, transparent 1.15px)`,
      backgroundSize: '20px 20px',
      backgroundPosition: '0 0',
      scrollOffsetY: 0,
    };
  }

  return { backgroundColor: baseBackground, scrollOffsetY: 0 };
};
