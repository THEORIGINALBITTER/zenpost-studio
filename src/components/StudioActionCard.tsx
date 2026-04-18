import { useState, type CSSProperties, type ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { STUDIO_CARD_TOKENS, type StudioCardSurface } from './studioCardTokens';

interface StudioActionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  onClick?: () => void;
  accentColor?: string;
  surface?: StudioCardSurface;
  highlighted?: boolean;
  statusText?: string;
  children?: ReactNode;
  trailing?: ReactNode;
  minHeight?: number;
  compact?: boolean;
  disabledHint?: string;
}

export function StudioActionCard({
  title,
  description,
  icon,
  onClick,
  accentColor = '#AC8E66',
  surface = 'paper',
  highlighted = false,
  statusText,
  children,
  trailing,
  minHeight,
  compact = false,
  disabledHint,
}: StudioActionCardProps) {
  const [hovered, setHovered] = useState(false);
  const density = compact ? 'compact' : 'default';
  const densityTokens = STUDIO_CARD_TOKENS.typography[density];
  const surfaceTokens = STUDIO_CARD_TOKENS.surface[surface];
  const isPaper = surface === 'paper';
  const darkSurfaceTokens = STUDIO_CARD_TOKENS.surface.dark;
  const isDisabled = !onClick;
  const hoverActive = hovered && !!onClick;

  const borderColor = highlighted
    ? `${accentColor}${isPaper ? '66' : ''}`
    : surfaceTokens.baseBorder;

  const backgroundColor = isPaper
    ? highlighted
      ? hoverActive
        ? `${accentColor}26`
        : `${accentColor}14`
      : hoverActive
        ? surfaceTokens.hoverBackground
        : surfaceTokens.baseBackground
    : highlighted
      ? darkSurfaceTokens.highlightedBackground
      : hoverActive
        ? surfaceTokens.hoverBackground
        : surfaceTokens.baseBackground;

  const titleColor = surfaceTokens.titleColor;
  const descriptionColor = surfaceTokens.descriptionColor;
  const statusColor = surfaceTokens.statusColor;

  const cardStyle: CSSProperties = {
    borderRadius: STUDIO_CARD_TOKENS.radius,
    border: isPaper ? `0.5px solid ${borderColor}` : `${highlighted ? 2 : 1}px solid ${borderColor}`,
    background: backgroundColor,
    padding: densityTokens.padding,
    cursor: onClick ? 'pointer' : 'default',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: densityTokens.gap,
    transition: 'all 0.18s ease',
    fontFamily: 'IBM Plex Mono, monospace',
    minHeight,
    transform: hoverActive ? `translateY(${STUDIO_CARD_TOKENS.hoverTranslateY})` : 'translateY(0)',
    boxShadow: hoverActive ? STUDIO_CARD_TOKENS.hoverShadow : 'none',
    color: titleColor,
    opacity: isDisabled && disabledHint ? 0.78 : 1,
  };

  return (
    <button
      onClick={onClick}
      style={cardStyle}
      disabled={isDisabled}
      title={isDisabled ? disabledHint : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: STUDIO_CARD_TOKENS.iconSize, color: accentColor, display: 'flex', alignItems: 'center' }}>
          {icon}
        </div>
        <div style={{ fontSize: STUDIO_CARD_TOKENS.trailingSize, color: accentColor, opacity: 0.8, display: 'flex', alignItems: 'center' }}>
          {trailing ?? <FontAwesomeIcon icon={faArrowRight} />}
        </div>
      </div>

      <div>
        <p style={{ margin: `0 0 ${densityTokens.titleGap} 0`, fontSize: densityTokens.titleSize, fontWeight: 400, color: titleColor }}>
          {title}
        </p>
        <p style={{ margin: 0, fontSize: densityTokens.descriptionSize, color: descriptionColor, lineHeight: densityTokens.lineHeight }}>
          {description}
        </p>
      </div>

      {statusText ? (
        <div style={{ marginTop: '2px', fontSize: densityTokens.statusSize, color: statusColor }}>
          {statusText}
        </div>
      ) : null}

      {isDisabled && disabledHint ? (
        <div style={{ marginTop: '2px', fontSize: densityTokens.statusSize, color: statusColor }}>
          {disabledHint}
        </div>
      ) : null}

      {children}
    </button>
  );
}
