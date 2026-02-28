import { useState } from 'react';
import type { CSSProperties } from 'react';

const STORAGE_KEY = 'zenpost_getting_started_zen_thought_index';

const getNextThought = (thoughts: string[]): string => {
  if (thoughts.length === 0) return '';
  if (typeof window === 'undefined') return thoughts[0];

  const raw = localStorage.getItem(STORAGE_KEY);
  const currentIndex = raw ? Number.parseInt(raw, 10) : -1;
  const safeIndex = Number.isFinite(currentIndex) ? currentIndex : -1;
  const nextIndex = (safeIndex + 1) % thoughts.length;
  localStorage.setItem(STORAGE_KEY, String(nextIndex));
  return thoughts[nextIndex];
};

interface ZenThoughtLineProps {
  thoughts: string[];
  visible?: boolean;
  containerStyle?: CSSProperties;
}

export const ZenThoughtLine = ({ thoughts, visible = true, containerStyle }: ZenThoughtLineProps) => {
  const [thought] = useState<string>(() => getNextThought(thoughts));

  if (!visible || !thought) return null;

  return (
    <div style={{ marginTop: '0px', paddingLeft: '15px', ...containerStyle }}>
      <div
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '9px',
          fontWeight: 400,
          color: '#8f8f8f',
          letterSpacing: '0.2px',
        }}
      >
        <span style={{ color: '#AC8E66', textTransform: 'uppercase' }}>ZEN Gedanken </span>
        {thought}
      </div>
    </div>
  );
};
