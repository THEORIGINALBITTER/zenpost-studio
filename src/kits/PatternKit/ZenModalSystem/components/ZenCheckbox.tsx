import type { CSSProperties, ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

type ZenCheckboxProps = {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  size?: number;
  checkSize?: number;
  style?: CSSProperties;
  accentColor?: string;
};

export const ZenCheckbox = ({
  checked,
  onChange,
  disabled = false,
  size = 16,
  checkSize = 8,
  style,
  accentColor = '#AC8E66',
}: ZenCheckboxProps) => (
  <div
    role="checkbox"
    aria-checked={checked}
    aria-disabled={disabled}
    tabIndex={disabled ? -1 : 0}
    onClick={() => {
      if (!disabled) onChange(!checked);
    }}
    onKeyDown={(e) => {
      if (disabled) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onChange(!checked);
      }
    }}
    style={{
      width: size,
      height: size,
      borderRadius: 4,
      border: checked ? `1.5px solid ${accentColor}` : '1.5px solid #4A4A4A',
      backgroundColor: checked ? 'rgba(172,142,102,0.18)' : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: disabled ? 'not-allowed' : 'pointer',
      flexShrink: 0,
      transition: 'border-color 0.15s, background-color 0.15s',
      opacity: disabled ? 0.55 : 1,
      ...style,
    }}
  >
    {checked && (
      <FontAwesomeIcon icon={faCheck} style={{ fontSize: checkSize, color: accentColor }} />
    )}
  </div>
);

type ZenCheckboxOptionProps = {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
  style?: CSSProperties;
  labelStyle?: CSSProperties;
};

export const ZenCheckboxOption = ({
  checked,
  onChange,
  label,
  disabled = false,
  style,
  labelStyle,
}: ZenCheckboxOptionProps) => (
  <button
    type="button"
    onClick={() => {
      if (!disabled) onChange(!checked);
    }}
    disabled={disabled}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '9px 12px',
      backgroundColor: 'transparent',
      border: '1px solid rgba(172,142,102,0.35)',
      borderRadius: 6,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: 11,
      color: '#555',
      userSelect: 'none',
      boxShadow: 'none',
      ...style,
    }}
  >
    <ZenCheckbox checked={checked} onChange={onChange} disabled={disabled} />
    <span style={{ ...labelStyle }}>{label}</span>
  </button>
);
