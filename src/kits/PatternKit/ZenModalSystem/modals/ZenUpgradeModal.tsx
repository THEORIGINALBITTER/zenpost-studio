/**
 * ZenUpgradeModal
 * Modal for upgrading to PRO tier - Zen Style
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
import { ZenModal } from '../index';
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

  // PRO features list
  const proFeatures = PRO_FEATURES.map((id) => FEATURES[id]).filter(Boolean).slice(0, 6);
  const highlightedFeature = highlightFeature ? FEATURES[highlightFeature] : null;

  // Success State
  if (success) {
    return (
      <ZenModal isOpen={isOpen} onClose={onClose} size="lg">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 40px',
            backgroundColor: '#1E1E1E',
          }}
        >
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #d8b27c, #AC8E66)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              boxShadow: '0 8px 32px rgba(172, 142, 102, 0.4)',
              animation: 'pulse 2s infinite',
            }}
          >
            <FontAwesomeIcon icon={faCheck} style={{ fontSize: 48, color: '#1a1a1a' }} />
          </div>
          <h2 style={{ fontFamily: 'monospace', fontSize: 24, color: '#AC8E66', margin: '0 0 12px 0' }}>
            Willkommen bei ZenStudio PRO!
          </h2>
          <p style={{ fontFamily: 'monospace', fontSize: 14, color: '#888', margin: 0 }}>
            Alle Features sind jetzt freigeschaltet
          </p>
        </div>
      </ZenModal>
    );
  }

  // Already PRO State
  if (isPro) {
    return (
      <ZenModal isOpen={isOpen} onClose={onClose} size="md">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 40px',
            backgroundColor: '#1E1E1E',
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #d8b27c, #AC8E66)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              boxShadow: '0 8px 32px rgba(172, 142, 102, 0.4)',
            }}
          >
            <FontAwesomeIcon icon={faCrown} style={{ fontSize: 36, color: '#1a1a1a' }} />
          </div>
          <h3 style={{ fontFamily: 'monospace', fontSize: 20, color: '#AC8E66', margin: '0 0 8px 0' }}>
            Du bist bereits PRO!
          </h3>
          <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#888', margin: 0 }}>
            Alle Features sind für dich freigeschaltet
          </p>
          <button
            onClick={onClose}
            style={{
              marginTop: 24,
              padding: '12px 32px',
              backgroundColor: 'transparent',
              color: '#AC8E66',
              border: '1px solid #AC8E66',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Schließen
          </button>
        </div>
      </ZenModal>
    );
  }

  return (
    <ZenModal isOpen={isOpen} onClose={onClose} size="lg">
      <div
        style={{
          position: 'relative',
          backgroundColor: '#242424',
          borderRadius: 12,
          overflow: 'hidden',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
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
            Upgrade auf PRO
          </h1>

          <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#888', margin: 0 }}>
            Schalte alle Premium-Features frei
          </p>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 32px 32px 32px',
          }}
        >
          {/* Highlighted Feature */}
          {highlightedFeature && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 16,
                backgroundColor: 'rgba(172, 142, 102, 0.1)',
                borderRadius: 12,
                marginBottom: 24,
                border: '1px solid #AC8E66',
              }}
            >
              <FontAwesomeIcon icon={faRocket} style={{ fontSize: 20, color: '#AC8E66' }} />
              <div>
                <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#e5e5e5', margin: 0 }}>
                  <strong style={{ color: '#AC8E66' }}>{highlightedFeature.name}</strong> ist ein PRO Feature
                </p>
                <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#888', margin: '4px 0 0 0' }}>
                  {highlightedFeature.description}
                </p>
              </div>
            </div>
          )}

          {/* Pricing Cards */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ fontFamily: 'monospace', fontSize: 11, color: '#666', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
              Preise & Optionen
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {/* Monthly */}
              <div
                style={{
                  padding: 16,
                  backgroundColor: '#1a1a1a',
                  borderRadius: 12,
                  border: '1px solid #3a3a3a',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#888', margin: '0 0 8px 0' }}>
                  Monatlich
                </p>
                <p style={{ fontFamily: 'monospace', fontSize: 24, color: '#AC8E66', margin: 0 }}>
                  {PRICING.pro.monthly}€
                </p>
                <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#666', margin: '4px 0 0 0' }}>
                  pro Monat
                </p>
              </div>

              {/* Yearly - Recommended */}
              <div
                style={{
                  padding: 16,
                  backgroundColor: 'rgba(172, 142, 102, 0.1)',
                  borderRadius: 12,
                  border: '2px solid #AC8E66',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: -10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '4px 12px',
                    backgroundColor: '#AC8E66',
                    color: '#1a1a1a',
                    fontFamily: 'monospace',
                    fontSize: 9,
                    fontWeight: 600,
                    borderRadius: 12,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Empfohlen
                </span>
                <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#AC8E66', margin: '0 0 8px 0' }}>
                  Jährlich
                </p>
                <p style={{ fontFamily: 'monospace', fontSize: 24, color: '#AC8E66', margin: 0 }}>
                  {PRICING.pro.yearly}€
                </p>
                <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#22c55e', margin: '4px 0 0 0' }}>
                  Spare {Math.round((1 - PRICING.pro.yearly / (PRICING.pro.monthly * 12)) * 100)}%
                </p>
              </div>

              {/* Lifetime */}
              <div
                style={{
                  padding: 16,
                  backgroundColor: '#1a1a1a',
                  borderRadius: 12,
                  border: '1px solid #3a3a3a',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#888', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  Lifetime
                  <FontAwesomeIcon icon={faInfinity} style={{ fontSize: 10, color: '#AC8E66' }} />
                </p>
                <p style={{ fontFamily: 'monospace', fontSize: 24, color: '#AC8E66', margin: 0 }}>
                  {PRICING.pro.lifetime}€
                </p>
                <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#666', margin: '4px 0 0 0' }}>
                  einmalig
                </p>
              </div>
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
                    backgroundColor: highlightFeature === f.id ? 'rgba(172, 142, 102, 0.15)' : '#1a1a1a',
                    borderRadius: 8,
                    border: highlightFeature === f.id ? '1px solid #AC8E66' : '1px solid transparent',
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
                      color: highlightFeature === f.id ? '#AC8E66' : '#888',
                    }}
                  >
                    {f.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* License Key Input */}
          {showKeyInput && (
            <div
              style={{
                backgroundColor: '#1a1a1a',
                padding: 20,
                borderRadius: 12,
                marginBottom: 24,
                border: '1px solid #3a3a3a',
              }}
            >
              <label style={{ display: 'block', fontFamily: 'monospace', fontSize: 11, color: '#888', marginBottom: 8 }}>
                Lizenzschlüssel eingeben:
              </label>
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                placeholder="ZENPOST-PRO-XXXX-XXXX-XXXX"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #3a3a3a',
                  borderRadius: 8,
                  fontFamily: 'monospace',
                  fontSize: 14,
                  color: '#e5e5e5',
                  marginBottom: (localError || error) ? 12 : 0,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {(localError || error) && (
                <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#ef4444', margin: 0 }}>
                  {localError || error}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {showKeyInput ? (
              <>
                {/* Activate Button */}
                <button
                  onClick={handleActivate}
                  disabled={isLoading}
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
                    cursor: isLoading ? 'wait' : 'pointer',
                    opacity: isLoading ? 0.7 : 1,
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 20px rgba(172, 142, 102, 0.3)',
                  }}
                >
                  <FontAwesomeIcon icon={faKey} />
                  {isLoading ? 'Aktiviere...' : 'Lizenz aktivieren'}
                </button>

                {/* Back Button */}
                <button
                  onClick={() => {
                    setShowKeyInput(false);
                    setLicenseKey('');
                    setLocalError(null);
                  }}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'transparent',
                    color: '#888',
                    border: '1px solid #3a3a3a',
                    borderRadius: 12,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Zurück
                </button>
              </>
            ) : (
              <>
                {/* Trial Button */}
                {canStartTrial && (
                  <button
                    onClick={handleStartTrial}
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

                {/* License Key Button */}
                <button
                  onClick={() => setShowKeyInput(true)}
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
                  <FontAwesomeIcon icon={faKey} />
                  Lizenzschlüssel eingeben
                </button>
              </>
            )}
          </div>

          {/* Footer - Demo Key */}
          <p
            style={{
              fontFamily: 'monospace',
              fontSize: 10,
              color: '#555',
              marginTop: 20,
              textAlign: 'center',
            }}
          >
            <button
              onClick={handleGenerateDemo}
              style={{
                background: 'none',
                border: 'none',
                color: '#555',
                fontFamily: 'monospace',
                fontSize: 10,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#AC8E66';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#555';
              }}
            >
              Demo-Schlüssel generieren (nur zum Testen)
            </button>
          </p>
        </div>
      </div>
    </ZenModal>
  );
};

export default ZenUpgradeModal;
