/**
 * FeatureGate Component
 * Wraps features that require specific license tiers
 * Shows upgrade prompt for locked features
 */

import React, { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faCrown } from '@fortawesome/free-solid-svg-icons';
import { useFeatureAccess, useLicense } from '../contexts/LicenseContext';

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
    <LockedOverlay
      featureName={feature?.name || featureId}
      message={lockMessage || `${feature?.name} ist ein PRO Feature`}
      onClick={requestUpgrade}
    >
      {children}
    </LockedOverlay>
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
 * Overlay lock for larger content areas
 */
interface LockedOverlayProps {
  featureName: string;
  message: string;
  onClick: () => void;
  children: ReactNode;
}

const LockedOverlay: React.FC<LockedOverlayProps> = ({
  featureName,
  message,
  onClick,
  children,
}) => (
  <div className="relative">
    {/* Blurred content */}
    <div className="filter blur-sm opacity-50 pointer-events-none select-none">
      {children}
    </div>

    {/* Lock overlay */}
    <div
      className="absolute inset-0 flex flex-col items-center justify-center
        bg-[#1a1a1a]/80 backdrop-blur-sm rounded-lg cursor-pointer
        hover:bg-[#1a1a1a]/70 transition-colors"
      onClick={onClick}
    >
      <div className="text-center p-6">
        <div
          className="w-16 h-16 mx-auto mb-4 rounded-full
            bg-gradient-to-br from-[#d8b27c] to-[#AC8E66]
            flex items-center justify-center shadow-lg"
        >
          <FontAwesomeIcon icon={faCrown} className="text-2xl text-[#1a1a1a]" />
        </div>

        <h3 className="text-lg font-mono text-[#AC8E66] mb-2">
          {featureName}
        </h3>

        <p className="text-sm text-[#888] font-mono mb-4 max-w-xs">
          {message}
        </p>

        <button
          className="px-6 py-2 bg-gradient-to-r from-[#d8b27c] to-[#AC8E66]
            text-[#1a1a1a] font-mono text-sm rounded-lg
            hover:from-[#e5c38d] hover:to-[#b99a72] transition-all
            shadow-lg hover:shadow-xl"
        >
          Upgrade auf PRO
        </button>
      </div>
    </div>
  </div>
);

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
