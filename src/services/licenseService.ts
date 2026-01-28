/**
 * ZenStudio License Service
 * Manages license validation, storage, and feature access
 */

import { LicenseTier, FEATURES, isProFeature } from '../config/featureFlags';

const LICENSE_STORAGE_KEY = 'zenpost_license';
const TRIAL_STORAGE_KEY = 'zenpost_trial';

export interface LicenseInfo {
  tier: LicenseTier;
  licenseKey?: string;
  activatedAt?: string;
  expiresAt?: string;
  email?: string;
  isValid: boolean;
  isTrial?: boolean;
  trialEndsAt?: string;
}

export interface TrialInfo {
  startedAt: string;
  endsAt: string;
  daysRemaining: number;
  isExpired: boolean;
}

const DEFAULT_LICENSE: LicenseInfo = {
  tier: 'free',
  isValid: true,
  isTrial: false,
};

/**
 * Get current license info from storage
 */
export const getLicenseInfo = (): LicenseInfo => {
  try {
    const stored = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (stored) {
      const license = JSON.parse(stored) as LicenseInfo;

      // Check if license is expired
      if (license.expiresAt) {
        const expiryDate = new Date(license.expiresAt);
        if (expiryDate < new Date()) {
          // License expired, revert to free
          return { ...DEFAULT_LICENSE, licenseKey: license.licenseKey };
        }
      }

      return license;
    }
  } catch (error) {
    console.error('Error reading license:', error);
  }

  return DEFAULT_LICENSE;
};

/**
 * Save license info to storage
 */
export const saveLicenseInfo = (license: LicenseInfo): void => {
  try {
    localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(license));
  } catch (error) {
    console.error('Error saving license:', error);
  }
};

/**
 * Validate a license key (local validation for now)
 * In production, this would call a license server
 */
export const validateLicenseKey = async (licenseKey: string): Promise<LicenseInfo> => {
  // Simple local validation format: ZENPOST-PRO-XXXX-XXXX-XXXX
  const proPattern = /^ZENPOST-PRO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  const lifetimePattern = /^ZENPOST-LIFETIME-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (proPattern.test(licenseKey)) {
    const license: LicenseInfo = {
      tier: 'pro',
      licenseKey,
      activatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      isValid: true,
    };
    saveLicenseInfo(license);
    return license;
  }

  if (lifetimePattern.test(licenseKey)) {
    const license: LicenseInfo = {
      tier: 'pro',
      licenseKey,
      activatedAt: new Date().toISOString(),
      isValid: true,
    };
    saveLicenseInfo(license);
    return license;
  }

  // Invalid key
  return {
    ...DEFAULT_LICENSE,
    isValid: false,
  };
};

/**
 * Start a trial period (7 days)
 */
export const startTrial = (): LicenseInfo => {
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const trialInfo: TrialInfo = {
    startedAt: now.toISOString(),
    endsAt: trialEnd.toISOString(),
    daysRemaining: 7,
    isExpired: false,
  };

  localStorage.setItem(TRIAL_STORAGE_KEY, JSON.stringify(trialInfo));

  const license: LicenseInfo = {
    tier: 'pro',
    activatedAt: now.toISOString(),
    expiresAt: trialEnd.toISOString(),
    isValid: true,
    isTrial: true,
    trialEndsAt: trialEnd.toISOString(),
  };

  saveLicenseInfo(license);
  return license;
};

/**
 * Get trial info
 */
export const getTrialInfo = (): TrialInfo | null => {
  try {
    const stored = localStorage.getItem(TRIAL_STORAGE_KEY);
    if (stored) {
      const trial = JSON.parse(stored) as TrialInfo;
      const endsAt = new Date(trial.endsAt);
      const now = new Date();
      const daysRemaining = Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

      return {
        ...trial,
        daysRemaining,
        isExpired: endsAt < now,
      };
    }
  } catch (error) {
    console.error('Error reading trial info:', error);
  }

  return null;
};

/**
 * Check if trial has been used
 */
export const hasUsedTrial = (): boolean => {
  return localStorage.getItem(TRIAL_STORAGE_KEY) !== null;
};

/**
 * Check if user can access a specific feature
 */
export const canAccessFeature = (featureId: string): boolean => {
  const license = getLicenseInfo();

  // PRO users can access everything
  if (license.tier === 'pro' && license.isValid) {
    return true;
  }

  // Free users can only access free features
  return !isProFeature(featureId);
};

/**
 * Get feature info with access status
 */
export const getFeatureAccess = (featureId: string) => {
  const feature = FEATURES[featureId];
  const hasAccess = canAccessFeature(featureId);

  return {
    ...feature,
    hasAccess,
    requiresUpgrade: !hasAccess,
  };
};

/**
 * Deactivate license (return to free tier)
 */
export const deactivateLicense = (): void => {
  saveLicenseInfo(DEFAULT_LICENSE);
};

/**
 * Get current tier
 */
export const getCurrentTier = (): LicenseTier => {
  return getLicenseInfo().tier;
};

/**
 * Check if user is PRO
 */
export const isPro = (): boolean => {
  const license = getLicenseInfo();
  return license.tier === 'pro' && license.isValid;
};

/**
 * Generate a demo PRO license key (for testing)
 */
export const generateDemoKey = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `ZENPOST-PRO-${segment()}-${segment()}-${segment()}`;
};
