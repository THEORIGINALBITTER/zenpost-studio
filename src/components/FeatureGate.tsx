/**
 * FeatureGate Component
 * Wraps features that require specific license tiers
 * Shows upgrade prompt for locked features
 */

import React, { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faCrown, faCheck, faGift, faRocket } from '@fortawesome/free-solid-svg-icons';
import { useFeatureAccess, useLicense } from '../contexts/LicenseContext';
import { FEATURES, PRO_FEATURES } from '../config/featureFlags';

interface FeatureGateProps {
  /** Feature ID to check access for */
  featureId: string;
  /** Content to render if access is granted */
  children: ReactNode;
  /** Optional fallback to render if access denied (defaults to lock overlay) */
  fallback?: ReactNode;
  /** Show inline lock instead of overlay */
  inline?: boolean;
  /** Hide completely if no access (no lock shown) */
  hideIfLocked?: boolean;
  /** Custom message for the lock overlay */
  lockMessage?: string;
}

/**
 * FeatureGate - Conditionally renders children based on feature access
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  featureId,
  children,
  fallback,
  inline = false,
  hideIfLocked = false,
  lockMessage,
}) => {
  const { hasAccess, feature, requestUpgrade } = useFeatureAccess(featureId);
  const { canStartTrial, startTrial } = useLicense();

  if (hasAccess) {
    return <>{children}</>;
  }

  if (hideIfLocked) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default lock UI
  if (inline) {
    return (
      <InlineLock
        featureName={feature?.name || featureId}
        onClick={requestUpgrade}
      />
    );
  }

  return (
    <LockedScreen
      featureId={featureId}
      featureName={feature?.name || featureId}
      featureDescription={feature?.description || ''}
      message={lockMessage || `${feature?.name} ist ein PRO Feature`}
      onUpgrade={requestUpgrade}
      onStartTrial={canStartTrial ? startTrial : undefined}
    />
  );
};

/**
 * Inline lock badge for buttons/small elements
 */
interface InlineLockProps {
  featureName: string;
  onClick: () => void;
}

const InlineLock: React.FC<InlineLockProps> = ({ featureName, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-3 py-2 bg-[#2a2a2a] border border-[#AC8E66]
      rounded-lg text-[#AC8E66] hover:bg-[#3a3a3a] transition-colors"
    title={`${featureName} freischalten`}
  >
    <FontAwesomeIcon icon={faLock} className="text-xs" />
    <span className="text-xs font-mono">PRO</span>
  </button>
);

/**
 * Full-screen locked feature screen
 */
interface LockedScreenProps {
  featureId: string;
  featureName: string;
  featureDescription: string;
  message: string;
  onUpgrade: () => void;
  onStartTrial?: () => void;
}

const LockedScreen: React.FC<LockedScreenProps> = ({
  featureId,
  featureName,
  featureDescription,
  onUpgrade,
  onStartTrial,
}) => {
  // Get some PRO features to display
  const proFeatures = PRO_FEATURES
    .map((id) => FEATURES[id])
    .filter(Boolean)
    .slice(0, 6);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 120px)',
        padding: '40px 20px',
        backgroundColor: '#1A1A1A',
      }}
    >
      {/* Main Content Card */}
      <div
        style={{
          maxWidth: 600,
          width: '100%',
          backgroundColor: '#242424',
          borderRadius: 16,
          border: '2px solid #AC8E66',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header with Crown */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(172, 142, 102, 0.2), rgba(172, 142, 102, 0.05))',
            padding: '40px 32px',
            textAlign: 'center',
            borderBottom: '1px solid #3a3a3a',
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              margin: '0 auto 20px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #d8b27c, #AC8E66)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(172, 142, 102, 0.4)',
            }}
          >
            <FontAwesomeIcon icon={faCrown} style={{ fontSize: 36, color: '#1a1a1a' }} />
          </div>

          <h1 style={{ fontFamily: 'monospace', fontSize: 24, color: '#AC8E66', margin: '0 0 8px 0' }}>
            {featureName}
          </h1>

          <p style={{ fontFamily: 'monospace', fontSize: 14, color: '#888', margin: 0 }}>
            {featureDescription || 'Dieses Feature ist Teil von ZenStudio PRO'}
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '32px' }}>
          {/* Feature highlight */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px',
              backgroundColor: 'rgba(172, 142, 102, 0.1)',
              borderRadius: 12,
              marginBottom: 24,
            }}
          >
            <FontAwesomeIcon icon={faRocket} style={{ fontSize: 20, color: '#AC8E66' }} />
            <div>
              <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#e5e5e5', margin: 0 }}>
                Schalte <strong style={{ color: '#AC8E66' }}>{featureName}</strong> frei
              </p>
              <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#888', margin: '4px 0 0 0' }}>
                Upgrade auf PRO für vollen Zugang
              </p>
            </div>
          </div>

          {/* PRO Features Grid */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ fontFamily: 'monospace', fontSize: 11, color: '#666', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
              Alle PRO Features
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {proFeatures.map((f) => (
                <div
                  key={f.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    backgroundColor: f.id === featureId ? 'rgba(172, 142, 102, 0.15)' : '#1a1a1a',
                    borderRadius: 8,
                    border: f.id === featureId ? '1px solid #AC8E66' : '1px solid transparent',
                  }}
                >
                  <FontAwesomeIcon
                    icon={faCheck}
                    style={{ fontSize: 10, color: '#AC8E66' }}
                  />
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 11,
                      color: f.id === featureId ? '#AC8E66' : '#888',
                    }}
                  >
                    {f.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Trial Button */}
            {onStartTrial && (
              <button
                onClick={onStartTrial}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, #d8b27c, #AC8E66)',
                  color: '#1a1a1a',
                  border: 'none',
                  borderRadius: 12,
                  fontFamily: 'monospace',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 20px rgba(172, 142, 102, 0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 24px rgba(172, 142, 102, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(172, 142, 102, 0.3)';
                }}
              >
                <FontAwesomeIcon icon={faGift} />
                7 Tage kostenlos testen
              </button>
            )}

            {/* Upgrade Button */}
            <button
              onClick={onUpgrade}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '16px 24px',
                backgroundColor: 'transparent',
                color: '#AC8E66',
                border: '2px solid #AC8E66',
                borderRadius: 12,
                fontFamily: 'monospace',
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(172, 142, 102, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <FontAwesomeIcon icon={faCrown} />
              {onStartTrial ? 'Preise & Optionen ansehen' : 'Upgrade auf PRO'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer Text */}
      <p
        style={{
          fontFamily: 'monospace',
          fontSize: 11,
          color: '#555',
          marginTop: 24,
          textAlign: 'center',
        }}
      >
        Du hast bereits einen Lizenzschlüssel?{' '}
        <button
          onClick={onUpgrade}
          style={{
            background: 'none',
            border: 'none',
            color: '#AC8E66',
            fontFamily: 'monospace',
            fontSize: 11,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Hier eingeben
        </button>
      </p>
    </div>
  );
};

/**
 * Hook-based feature check for programmatic use
 */
export const useFeatureGate = (featureId: string) => {
  const { checkFeature, requestUpgrade } = useLicense();
  const hasAccess = checkFeature(featureId);

  return {
    hasAccess,
    gate: (callback: () => void) => {
      if (hasAccess) {
        callback();
      } else {
        requestUpgrade(featureId);
      }
    },
  };
};

/**
 * PRO Badge component
 */
export const ProBadge: React.FC<{ small?: boolean }> = ({ small = false }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5
      bg-gradient-to-r from-[#d8b27c] to-[#AC8E66]
      text-[#1a1a1a] font-mono rounded ${small ? 'text-[8px]' : 'text-[10px]'}`}
  >
    <FontAwesomeIcon icon={faCrown} className={small ? 'text-[6px]' : 'text-[8px]'} />
    PRO
  </span>
);

/**
 * Lock Icon for menus/lists
 */
export const LockIcon: React.FC<{ featureId: string }> = ({ featureId }) => {
  const { hasAccess } = useFeatureAccess(featureId);

  if (hasAccess) return null;

  return (
    <FontAwesomeIcon
      icon={faLock}
      className="text-[10px] text-[#AC8E66] ml-1"
      title="PRO Feature"
    />
  );
};

export default FeatureGate;
