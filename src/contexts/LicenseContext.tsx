/**
 * ZenStudio License Context
 * Provides license state and actions throughout the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  LicenseInfo,
  TrialInfo,
  getLicenseInfo,
  validateLicenseKey,
  startTrial as startTrialService,
  getTrialInfo,
  hasUsedTrial,
  canAccessFeature,
  deactivateLicense,
  isPro as isProCheck,
} from '../services/licenseService';
import { LicenseTier, FEATURES, FeatureFlag } from '../config/featureFlags';

interface LicenseContextType {
  // State
  license: LicenseInfo;
  trial: TrialInfo | null;
  isLoading: boolean;
  error: string | null;

  // Computed
  isPro: boolean;
  isTrial: boolean;
  canStartTrial: boolean;
  tier: LicenseTier;

  // Actions
  activateLicense: (key: string) => Promise<boolean>;
  startTrial: () => void;
  logout: () => void;
  checkFeature: (featureId: string) => boolean;
  getFeature: (featureId: string) => FeatureFlag & { hasAccess: boolean };

  // Modal control
  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;
  upgradeFeatureId: string | null;
  requestUpgrade: (featureId?: string) => void;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

interface LicenseProviderProps {
  children: ReactNode;
}

export const LicenseProvider: React.FC<LicenseProviderProps> = ({ children }) => {
  const [license, setLicense] = useState<LicenseInfo>(getLicenseInfo());
  const [trial, setTrial] = useState<TrialInfo | null>(getTrialInfo());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeatureId, setUpgradeFeatureId] = useState<string | null>(null);

  // Refresh license info on mount
  useEffect(() => {
    setLicense(getLicenseInfo());
    setTrial(getTrialInfo());
  }, []);

  // Check license expiry periodically
  useEffect(() => {
    const checkExpiry = () => {
      const currentLicense = getLicenseInfo();
      if (currentLicense.tier !== license.tier || currentLicense.isValid !== license.isValid) {
        setLicense(currentLicense);
      }

      const currentTrial = getTrialInfo();
      if (currentTrial?.isExpired && !trial?.isExpired) {
        setTrial(currentTrial);
        // Trial expired, revert to free
        if (license.isTrial) {
          setLicense({ ...license, tier: 'free', isValid: true, isTrial: false });
        }
      }
    };

    const interval = setInterval(checkExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [license, trial]);

  const activateLicense = useCallback(async (key: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await validateLicenseKey(key);
      setLicense(result);

      if (!result.isValid) {
        setError('Ungültiger Lizenzschlüssel');
        return false;
      }

      return true;
    } catch (err) {
      setError('Fehler bei der Lizenzaktivierung');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startTrial = useCallback(() => {
    const trialLicense = startTrialService();
    setLicense(trialLicense);
    setTrial(getTrialInfo());
  }, []);

  const logout = useCallback(() => {
    deactivateLicense();
    setLicense(getLicenseInfo());
    setTrial(null);
  }, []);

  const checkFeature = useCallback((featureId: string): boolean => {
    return canAccessFeature(featureId);
  }, []);

  const getFeature = useCallback((featureId: string): FeatureFlag & { hasAccess: boolean } => {
    const feature = FEATURES[featureId];
    return {
      ...feature,
      hasAccess: canAccessFeature(featureId),
    };
  }, []);

  const requestUpgrade = useCallback((featureId?: string) => {
    setUpgradeFeatureId(featureId || null);
    setShowUpgradeModal(true);
  }, []);

  const value: LicenseContextType = {
    license,
    trial,
    isLoading,
    error,
    isPro: isProCheck(),
    isTrial: license.isTrial || false,
    canStartTrial: !hasUsedTrial(),
    tier: license.tier,
    activateLicense,
    startTrial,
    logout,
    checkFeature,
    getFeature,
    showUpgradeModal,
    setShowUpgradeModal,
    upgradeFeatureId,
    requestUpgrade,
  };

  return (
    <LicenseContext.Provider value={value}>
      {children}
    </LicenseContext.Provider>
  );
};

/**
 * Hook to access license context
 */
export const useLicense = (): LicenseContextType => {
  const context = useContext(LicenseContext);
  if (context === undefined) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
};

/**
 * Hook to check if a specific feature is accessible
 */
export const useFeatureAccess = (featureId: string) => {
  const { checkFeature, getFeature, requestUpgrade } = useLicense();

  return {
    hasAccess: checkFeature(featureId),
    feature: getFeature(featureId),
    requestUpgrade: () => requestUpgrade(featureId),
  };
};

export default LicenseContext;
