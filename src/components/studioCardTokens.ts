export type StudioCardSurface = 'paper' | 'dark';
export type StudioCardDensity = 'default' | 'compact';

export const STUDIO_CARD_TOKENS = {
  radius: '12px',
  hoverTranslateY: '-2px',
  hoverShadow: '0 6px 16px rgba(0,0,0,0.12)',
  iconSize: '16px',
  trailingSize: '10px',
  typography: {
    default: {
      titleSize: '12px',
      descriptionSize: '10px',
      statusSize: '9px',
      titleGap: '4px',
      lineHeight: 1.45,
      gap: '10px',
      padding: '16px',
    },
    compact: {
      titleSize: '10px',
      descriptionSize: '8px',
      statusSize: '8px',
      titleGap: '4px',
      lineHeight: 1.4,
      gap: '8px',
      padding: '12px 14px',
    },
  },
  surface: {
    paper: {
      baseBorder: '#3e362c',
      titleColor: '#1a1a1a',
      descriptionColor: '#3e362c',
      statusColor: '#5a5040',
      baseBackground: '#e8e3d8',
      hoverBackground: 'rgba(21, 21, 21, 0.08)',
    },
    dark: {
      baseBorder: '#3A3A3A',
      titleColor: '#e5e5e5',
      descriptionColor: '#777',
      statusColor: '#999',
      baseBackground: '#0A0A0A',
      hoverBackground: '#111',
      highlightedBackground: 'linear-gradient(145deg, rgba(172,142,102,0.1), rgba(172,142,102,0.05))',
    },
  },
} as const;
