export type PreviewThemeId = 'color-classic' | 'color-soft' | 'mono-clean' | 'mono-ink';

export type PreviewThemeGroup = 'color' | 'mono';

export const PREVIEW_THEME_LABELS: Record<PreviewThemeId, string> = {
  'color-classic': 'Color Classic',
  'color-soft': 'Color Soft',
  'mono-clean': 'Mono Clean',
  'mono-ink': 'Mono Ink',
};

export const PREVIEW_THEME_OPTIONS: Array<{
  id: PreviewThemeId;
  label: string;
  group: PreviewThemeGroup;
}> = [
  { id: 'color-classic', label: PREVIEW_THEME_LABELS['color-classic'], group: 'color' },
  { id: 'color-soft', label: PREVIEW_THEME_LABELS['color-soft'], group: 'color' },
  { id: 'mono-clean', label: PREVIEW_THEME_LABELS['mono-clean'], group: 'mono' },
  { id: 'mono-ink', label: PREVIEW_THEME_LABELS['mono-ink'], group: 'mono' },
];

export const PREVIEW_THEME_EDITOR_TOKENS: Record<
  PreviewThemeId,
  {
    text: string;
    heading: string;
    placeholder: string;
    lineNumbers: string;
    activeLine: string;
  }
> = {
  'color-classic': {
    text: '#8B7355',
    heading: '#AC8E66',
    placeholder: '#9E8A70',
    lineNumbers: '#8B7355',
    activeLine: 'rgba(172, 142, 102, 0.18)',
  },
  'color-soft': {
    text: '#75624E',
    heading: '#9C7A50',
    placeholder: '#8F7E69',
    lineNumbers: '#8F7E69',
    activeLine: 'rgba(156, 122, 80, 0.16)',
  },
  'mono-clean': {
    text: '#2b2b2b',
    heading: '#1f1f1f',
    placeholder: '#6B6B6B',
    lineNumbers: '#6B6B6B',
    activeLine: 'rgba(31, 31, 31, 0.07)',
  },
  'mono-ink': {
    text: '#111111',
    heading: '#111111',
    placeholder: '#4A4A4A',
    lineNumbers: '#4A4A4A',
    activeLine: 'rgba(17, 17, 17, 0.08)',
  },
};

export const getPreviewThemeVisual = (themeId: PreviewThemeId) => {
  switch (themeId) {
    case 'color-classic':
      return {
        accent: '#C49A62',
        text: '#C49A62',
        activeBg: 'rgba(196,154,98,0.16)',
        activeBorder: 'rgba(196,154,98,0.65)',
      };
    case 'color-soft':
      return {
        accent: '#B69272',
        text: '#B69272',
        activeBg: 'rgba(182,146,114,0.18)',
        activeBorder: 'rgba(182,146,114,0.65)',
      };
    case 'mono-ink':
      return {
        accent: '#F1E7D0',
        text: '#F1E7D0',
        activeBg: 'rgba(241,231,208,0.14)',
        activeBorder: 'rgba(241,231,208,0.55)',
      };
    case 'mono-clean':
    default:
      return {
        accent: '#D8D0BF',
        text: '#D8D0BF',
        activeBg: 'rgba(216,208,191,0.12)',
        activeBorder: 'rgba(216,208,191,0.5)',
      };
  }
};
