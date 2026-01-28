/**
 * ZenUpgradeModal
 * Modal for upgrading to PRO tier
 */

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCrown,
  faCheck,
  faRocket,
  faKey,
  faGift,
  faInfinity,
} from '@fortawesome/free-solid-svg-icons';
import { ZenModal, ZenModalHeader, ZenRoughButton } from '../index';
import { useLicense } from '../../../../contexts/LicenseContext';
import { FEATURES, PRICING, PRO_FEATURES } from '../../../../config/featureFlags';
import { generateDemoKey } from '../../../../services/licenseService';

interface ZenUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightFeature?: string | null;
}

export const ZenUpgradeModal: React.FC<ZenUpgradeModalProps> = ({
  isOpen,
  onClose,
  highlightFeature,
}) => {
  const { activateLicense, startTrial, canStartTrial, isLoading, error, isPro } = useLicense();
  const [licenseKey, setLicenseKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleActivate = async () => {
    setLocalError(null);
    if (!licenseKey.trim()) {
      setLocalError('Bitte gib einen Lizenzschlüssel ein');
      return;
    }

    const result = await activateLicense(licenseKey.trim().toUpperCase());
    if (result) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setLicenseKey('');
        setShowKeyInput(false);
      }, 2000);
    }
  };

  const handleStartTrial = () => {
    startTrial();
    setSuccess(true);
    setTimeout(() => {
      onClose();
      setSuccess(false);
    }, 2000);
  };

  const handleGenerateDemo = () => {
    const demoKey = generateDemoKey();
    setLicenseKey(demoKey);
    setShowKeyInput(true);
  };

  // Group PRO features by category
  const proFeaturesList = PRO_FEATURES.map((id) => FEATURES[id]).filter(Boolean);

  if (success) {
    return (
      <ZenModal isOpen={isOpen} onClose={onClose} size="large">
        <div className="flex flex-col items-center justify-center py-12">
          <div
            className="w-20 h-20 rounded-full bg-gradient-to-br from-[#d8b27c] to-[#AC8E66]
              flex items-center justify-center mb-[12px] animate-pulse"
          >
            <FontAwesomeIcon icon={faCheck} className="text-3xl text-[#1a1a1a]" />
          </div>
          <h2 className="text-xl font-mono text-[#AC8E66] mb-2">
            Willkommen bei ZenStudio PRO!
          </h2>
          <p className="text-sm font-mono text-[#888]">
            Alle Features sind jetzt freigeschaltet
          </p>
        </div>
      </ZenModal>
    );
  }

  if (isPro) {
    return (
      <ZenModal isOpen={isOpen} onClose={onClose} size="md">
        <ZenModalHeader title="ZenStudio PRO" onClose={onClose} />
        <div className="p-6 text-center">
          <div
            className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#d8b27c] to-[#AC8E66]
              flex items-center justify-center mb-4"
          >
            <FontAwesomeIcon icon={faCrown} className="text-2xl text-[#1a1a1a]" />
          </div>
          <h3 className="text-lg font-mono text-[#AC8E66] mb-2">
            Du bist bereits PRO!
          </h3>
          <p className="text-sm font-mono text-[#888]">
            Alle Features sind für dich freigeschaltet
          </p>
        </div>
      </ZenModal>
    );
  }

  return (
    <ZenModal isOpen={isOpen} onClose={onClose} size="lg">
      <ZenModalHeader
        title="Upgrade auf PRO"
        onClose={onClose}
      />

      <div
        className="px-[12px] pb-6 overflow-y-auto zen-scrollbar"
        style={{ maxHeight: '70vh' }}
      >
        {/* Highlighted Feature */}
        {highlightFeature && FEATURES[highlightFeature] && (
          <div className="mb-[12px] p-[10px] bg-[#AC8E66]/10 border border-[#AC8E66] rounded-lg">
            <p className="text-sm font-mono text-[#AC8E66]">
              <FontAwesomeIcon icon={faRocket} className="mr-2" />
              <strong>{FEATURES[highlightFeature].name}</strong> ist ein PRO Feature
            </p>
            <p className="text-xs font-mono text-[#888] mt-1">
              {FEATURES[highlightFeature].description}
            </p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px] mb-[12px]">
          {/* Monthly */}
          <div className="p-[10px] bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg">
            <h4 className="font-mono text-[#e5e5e5] text-sm mb-2">Monatlich</h4>
            <p className="text-2xl font-mono text-[#AC8E66]">
              {PRICING.pro.monthly}€
              <span className="text-xs text-[#888]">/Monat</span>
            </p>
          </div>

          {/* Yearly - Recommended */}
          <div className="p-[10px] bg-[#2a2a2a] border-2 border-[#AC8E66] rounded-lg relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[#AC8E66] text-[#1a1a1a] text-[10px] font-mono rounded">
              EMPFOHLEN
            </span>
            <h4 className="font-mono text-[#e5e5e5] text-sm mb-2">Jährlich</h4>
            <p className="text-2xl font-mono text-[#AC8E66]">
              {PRICING.pro.yearly}€
              <span className="text-xs text-[#888]">/Jahr</span>
            </p>
            <p className="text-[10px] font-mono text-green-500 mt-1">
              Spare {Math.round((1 - PRICING.pro.yearly / (PRICING.pro.monthly * 12)) * 100)}%
            </p>
          </div>

          {/* Lifetime */}
          <div className="p-[10px] bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg">
            <h4 className="font-mono text-[#e5e5e5] text-sm mb-2 flex items-center gap-2">
              Lifetime
              <FontAwesomeIcon icon={faInfinity} className="text-[#AC8E66] text-xs" />
            </h4>
            <p className="text-2xl font-mono text-[#AC8E66]">
              {PRICING.pro.lifetime}€
              <span className="text-xs text-[#888]"> einmalig</span>
            </p>
          </div>
        </div>

        {/* PRO Features List */}
        <div className="mb-[12px]">
          <h4 className="font-mono text-sm text-[#888] mb-3">PRO Features:</h4>
          <div className="grid grid-cols-2 gap-2">
            {proFeaturesList.slice(0, 8).map((feature) => (
              <div
                key={feature.id}
                className={`flex items-center gap-2 text-xs font-mono p-2 rounded
                  ${highlightFeature === feature.id ? 'bg-[#AC8E66]/20 text-[#AC8E66]' : 'text-[#888]'}`}
              >
                <FontAwesomeIcon icon={faCheck} className="text-[#AC8E66]" />
                {feature.name}
              </div>
            ))}
          </div>
        </div>

        {/* License Key Input */}
        {showKeyInput ? (
          <div className="mb-[12px]">
            <label className="block text-xs font-mono text-[#888] mb-2">
              Lizenzschlüssel eingeben:
            </label>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
              placeholder="ZENPOST-PRO-XXXX-XXXX-XXXX"
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg
                font-mono text-sm text-[#e5e5e5] placeholder-[#555]
                focus:border-[#AC8E66] focus:outline-none"
            />
            {(localError || error) && (
              <p className="text-xs font-mono text-red-400 mt-2">{localError || error}</p>
            )}
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {showKeyInput ? (
            <>
              <ZenRoughButton
                label={isLoading ? 'Aktiviere...' : 'Lizenz aktivieren'}
                onClick={handleActivate}
                variant="active"
                disabled={isLoading}
              />
              <button
                onClick={() => setShowKeyInput(false)}
                className="text-xs font-mono text-[#888] hover:text-[#AC8E66]"
              >
                Zurück
              </button>
            </>
          ) : (
            <>
              {/* Trial Button */}
              {canStartTrial && (
                <ZenRoughButton
                  label="7 Tage kostenlos testen"
                  onClick={handleStartTrial}
                  variant="active"
                  icon={<FontAwesomeIcon icon={faGift} />}
                />
              )}

              {/* License Key */}
              <ZenRoughButton
                label="Lizenzschlüssel eingeben"
                onClick={() => setShowKeyInput(true)}
                variant="default"
                icon={<FontAwesomeIcon icon={faKey} />}
              />

              {/* Demo Key (for testing) */}
              <button
                onClick={handleGenerateDemo}
                className="text-[10px] font-mono text-[#555] hover:text-[#AC8E66] transition-colors"
              >
                Demo-Schlüssel generieren (nur zum Testen)
              </button>
            </>
          )}
        </div>
      </div>
    </ZenModal>
  );
};

export default ZenUpgradeModal;
