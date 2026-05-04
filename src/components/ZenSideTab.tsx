import { useState, type CSSProperties } from 'react';

interface ZenSideTabProps {
  onClick: () => void;
  disabled?: boolean;
  style?: CSSProperties;
  label: string;
  hoverLabel: string;
  textColor?: string;
  hoverTextColor?: string;
  title?: string;
  className?: string;
}

export function ZenSideTab({
  onClick,
  disabled = false,
  style,
  label,
  hoverLabel,
  textColor = '#aaaaaa',
  hoverTextColor,
  title,
  className,
}: ZenSideTabProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={className}
      style={{
        position: 'absolute',
        transformOrigin: 'left top',
        padding: '10px 10px',
        borderRadius: '8px 8px 0px 0px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '10px',
        color: textColor,
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
        zIndex: 1,
        overflow: 'hidden',
        minWidth: '80px',
        transition: 'background 0.2s ease',
        ...style,
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: hovered ? 0 : 1,
          transition: 'opacity 0.18s ease',
          padding: '0 10px',
        }}
      >
        {label}
      </span>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: hovered ? 1 : 0,
          color: disabled ? textColor : hoverTextColor ?? '#d0cbb8',
          transition: 'opacity 0.18s ease',
          padding: '0 10px',
        }}
      >
        {hoverLabel}
      </span>
      <span style={{ visibility: 'hidden' }}>
        {label.length > hoverLabel.length ? label : hoverLabel}
      </span>
    </button>
  );
}
