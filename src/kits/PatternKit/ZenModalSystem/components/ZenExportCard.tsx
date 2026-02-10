import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface ZenExportCardProps {
  title: string;
  subtitle: string;
  onClick?: () => void;
  icon?: IconDefinition;
  active?: boolean;
  disabled?: boolean;
}

export const ZenExportCard = ({
  title,
  subtitle,
  onClick,
  icon,
  active = false,
  disabled = false,
}: ZenExportCardProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      padding: '12px 14px',
      minHeight: '64px',
      borderRadius: '8px',
      border: active ? '1px solid #AC8E66' : '1px solid #3A3A3A',
      backgroundColor: '#0F0F0F',
      color: '#dbd9d5',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      textAlign: 'left',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.12s ease',
      boxShadow: active ? '0 0 0 1px #AC8E66 inset, 0 0 14px rgba(172, 142, 102, 0.18)' : 'none',
    }}
    onMouseEnter={(e) => {
      if (disabled || active) return;
      e.currentTarget.style.borderColor = '#6B5A42';
    }}
    onMouseLeave={(e) => {
      if (disabled || active) return;
      e.currentTarget.style.borderColor = '#3A3A3A';
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {icon && <FontAwesomeIcon icon={icon} style={{ color: '#AC8E66', fontSize: '12px' }} />}
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: '#dbd9d5' }}>
        {title}
      </span>
    </div>
    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
      {subtitle}
    </span>
  </button>
);
