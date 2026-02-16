/**
 * ZenUpgradeModal
 * Modal for upgrading to PRO tier - Zen Style
 */

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faRocket,
  faKey,
  faGift,
  faFileLines,
  faCalendarDays,
  faWandMagicSparkles,
  faCodeBranch,
  faFolder,
} from '@fortawesome/free-solid-svg-icons';
import { ZenModal } from '../index';
import { useLicense } from '../../../../contexts/LicenseContext';
import { FEATURES } from '../../../../config/featureFlags';
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
  const highlightedFeature = highlightFeature ? FEATURES[highlightFeature] : null;
  const docFeatureHighlights = [
    {
      id: 'DOC_STUDIO',
      icon: faFolder,
      badge: 'Core',
      fallbackName: 'Doc Studio',
      fallbackDescription: 'Projekt scannen, Datenfelder ergänzen und strukturierte Dokumente erstellen.',
    },
    {
      id: 'BLOCK_EDITOR',
      icon: faFileLines,
      badge: 'Editor',
      fallbackName: 'Block Editor',
      fallbackDescription: 'Visuelles Bearbeiten mit sauberem Markdown-Output und schnellem Workflow.',
    },
    {
      id: 'AI_TEXT_PREVIEW',
      icon: faWandMagicSparkles,
      badge: 'AI',
      fallbackName: 'AI Text Preview',
      fallbackDescription: 'Im Preview direkt verbessern, übersetzen und formatieren.',
    },
    {
      id: 'EXPORT_PDF',
      icon: faFileLines,
      badge: 'Export',
      fallbackName: 'PDF/HTML Export',
      fallbackDescription: 'Dokumente professionell als PDF oder HTML ausgeben.',
    },
    {
      id: 'CONTENT_CALENDAR',
      icon: faCalendarDays,
      badge: 'Workflow',
      fallbackName: 'Content Kalender',
      fallbackDescription: 'Dokumentation und Veröffentlichungsplanung in einem Ablauf verbinden.',
    },
    {
      id: 'GITHUB_INTEGRATION',
      icon: faCodeBranch,
      badge: 'Integration',
      fallbackName: 'GitHub Sync',
      fallbackDescription: 'Änderungen mit Repository-Workflows verbinden.',
    },
  ].map((entry) => ({
    ...entry,
    feature: FEATURES[entry.id],
  }));

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
            <FontAwesomeIcon icon={faFolder} style={{ fontSize: 36, color: '#AC8E66' }} />
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
            background: 'transparent',
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
              background: ' #AC8E66)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(172, 142, 102, 0.4)',
            }}
          >
            <FontAwesomeIcon icon={faFolder} style={{ fontSize: 36, color: '#AC8E66' }} />
          </div>

          <h1 style={{ fontFamily: 'monospace', fontSize: 24, color: '#AC8E66', margin: '0 0 8px 0' }}>
            Upgrade auf Doc Studio [ BETA ]
          </h1>

          <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#888', margin: 0 }}>
            Schalte alle DocStudio-Features frei
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
       

          {/* Doc Features Grid */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ fontFamily: 'monospace', fontSize: 11, color: '#666', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
              Doc Studio PRO Feature Pack
            </h4>
            <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#888', margin: '0 0 12px 0', lineHeight: 1.5 }}>
              Für technische Dokumentation, Team-Workflows und KI-gestützte Überarbeitung in einem Studio.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {docFeatureHighlights.map((entry) => {
                const f = entry.feature;
                const name = f?.name ?? entry.fallbackName;
                const description = f?.description ?? entry.fallbackDescription;
                const isHighlighted = highlightFeature === f?.id;
                return (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    padding: '10px 12px',
                    backgroundColor: isHighlighted ? 'rgba(172, 142, 102, 0.15)' : '#1a1a1a',
                    borderRadius: 8,
                    border: isHighlighted ? '1px solid #AC8E66' : '1px solid #2e2e2e',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FontAwesomeIcon icon={entry.icon} style={{ fontSize: 11, color: '#AC8E66' }} />
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 11,
                          color: isHighlighted ? '#AC8E66' : '#d0d0d0',
                        }}
                      >
                        {name}
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 9,
                        color: '#c9a978',
                        border: '1px solid rgba(172, 142, 102, 0.45)',
                        borderRadius: 999,
                        padding: '1px 6px',
                      }}
                    >
                      {entry.badge}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 10, color: '#8e8e8e', lineHeight: 1.4 }}>
                    {description}
                  </p>
                </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 14px',
              border: '1px solid rgba(172, 142, 102, 0.35)',
              borderRadius: 10,
              background: 'rgba(172, 142, 102, 0.06)',
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#d8c2a0' }}>
                Beta verfügbar <br/> zum testen einfach Key generieren
              </span>
            </div>
           

                      {/* Beta Key */}
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
                e.currentTarget.style.color = '#AC8E66';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#555';
              }}
            >
              Beta-Key generieren 
            </button>
          </p>
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
                Lizenzkey eingeben:
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
                    boxShadow: '0 4px 20px rgba(172, 142, 102, 0)',
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
                  Lizenzkey eingeben
                </button>
              </>
            )}
          </div>

      
        </div>
      </div>
    </ZenModal>
  );
};

export default ZenUpgradeModal;
