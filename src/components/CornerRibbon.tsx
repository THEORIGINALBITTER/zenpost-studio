import { useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { useOpenExternal } from '../hooks/useOpenExternal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';

export function CornerRibbon() {
  const { openExternal } = useOpenExternal();
  const isDesktop = isTauri();
  const isMobile = !isDesktop;

  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (isMobile) {
      // Mobile: erst öffnen, dann ggf. zweiten Klick nutzen
      setIsHovered((prev) => !prev);
      return;
    }

    if (isDesktop) {
      openExternal('https://zenpost.denisbitter.de');
    } else {
      openExternal('https://github.com/THEORIGINALBITTER/zenpost-studio/releases');
    }
  };

  const label = isDesktop
    ? 'Web Version öffnen'
    : 'Desktop App laden';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 0,
        zIndex: 9999,
      }}
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleClick();
        }}
        style={{
          transform: isHovered ? 'translateX(0)' : 'translateX(185px)',
          width: 200,
          padding: '9px 18px 9px 12px',
          background: '#AC8E66',
          color: '#0A0A0A',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.04em',
          borderRadius: '6px 0 0 6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          boxShadow: '-6px 6px 18px rgba(0,0,0,0.4)',
          transition:
            'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), background 0.2s ease',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        {/* 禅 Icon */}
        <span
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            fontSize: '16px',
            lineHeight: 1,
          }}
        >
          禅
        </span>

        {/* Label */}
        <span
          style={{
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.15s ease',
            flex: 1,
            textAlign: 'center',
          }}
        >
          {label}
        </span>

        {/* Icon */}
        <FontAwesomeIcon
          icon={isDesktop ? faExternalLinkAlt : faDownload}
          style={{
            fontSize: '11px',
            flexShrink: 0,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.15s ease',
          }}
        />
      </div>
    </div>
  );
}