import { useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { useOpenExternal } from '../hooks/useOpenExternal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';

export function CornerRibbon() {
  const { openExternal } = useOpenExternal();
  const isDesktop = isTauri();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (isDesktop) {
      openExternal('https://zenpost.denisbitter.de');
    } else {
      openExternal('https://github.com/THEORIGINALBITTER/zenpost-studio/releases');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: '150px',
        height: '150px',
        overflow: 'hidden',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'absolute',
          bottom: isHovered ? '32px' : '30px',
          right: '-45px',
          width: '200px',
          padding: '6px 0',
          background: isHovered
            ? 'linear-gradient(135deg, #C4A97A 0%, #AC8E66 100%)'
            : 'linear-gradient(135deg, #AC8E66 0%, #8B7355 100%)',
          color: '#0A0A0A',
          textAlign: 'center',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '10px',
          fontWeight: 600,
          transform: 'rotate(-45deg)',
          boxShadow: isHovered
            ? '0 2px 10px rgba(172, 142, 102, 0.1)'
            : '0 2px 10px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          transition: 'all 0.2s ease',
        }}
      >
        <FontAwesomeIcon
          icon={isDesktop ? faExternalLinkAlt : faDownload}
          style={{ fontSize: '11px' }}
        />
        {isHovered ? 'Klick hier' : (isDesktop ? 'Web Version' : 'Desktop App')}
      </div>
    </div>
  );
}
