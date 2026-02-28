/**
 * ZenLicenseSettingsContent
 * Settings tab for license management and account info
 */

import { useState } from 'react';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {

  faUser,
  faCalendarAlt,
  faKey,
  faShoppingCart,
  faSignOutAlt,
  faCheckCircle,
  faClock,
  faGift,
  faExternalLinkAlt,
  faEye,
  faEyeSlash,
  faFolder,
} from '@fortawesome/free-solid-svg-icons';
import { useLicense } from '../../../../../contexts/LicenseContext';
import { ZenRoughButton } from '../../components/ZenRoughButton';
import { generateDemoKey } from '../../../../../services/licenseService';
import { useOpenExternal } from '../../../../../hooks/useOpenExternal';

export const ZenLicenseSettingsContent = () => {
  const {
    license,
    trial,
    isPro,
    isTrial,
    canStartTrial,
    tier,
    activateLicense,
    startTrial,
    logout,
    isLoading,
    error,
  } = useLicense();

  const [licenseKey, setLicenseKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [showLicenseKey, setShowLicenseKey] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { openExternal } = useOpenExternal();

  const handleActivate = async () => {
    setLocalError(null);
    setSuccessMessage(null);

    if (!licenseKey.trim()) {
      setLocalError('Bitte gib einen Lizenzkey ein');
      return;
    }

    const result = await activateLicense(licenseKey.trim().toUpperCase());
    if (result) {
      setSuccessMessage('Lizenz erfolgreich aktiviert!');
      setLicenseKey('');
      setShowKeyInput(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleStartTrial = () => {
    startTrial();
    setSuccessMessage('7-Tage-Trial gestartet!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeactivate = () => {
    if (confirm('Möchtest du die Lizenz wirklich deaktivieren?')) {
      logout();
      setSuccessMessage('Lizenz deaktiviert');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleGenerateDemo = () => {
    const demoKey = generateDemoKey();
    setLicenseKey(demoKey);
    setShowKeyInput(true);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const maskLicenseKey = (key?: string) => {
    if (!key) return '-';
    const parts = key.split('-');
    if (parts.length < 3) return key;
    return `${parts[0]}-${parts[1]}-****-****-****`;
  };

  return (
    <div className="w-full flex justify-center" style={{ padding: "32px 32px" }}>
    <div className="w-full max-w-[860px] rounded-[10px] bg-[#E8E1D2] border border-[#AC8E66]/60 shadow-2xl overflow-hidden">
    <div style={{ padding: '32px 32px 32px 32px' }}>
      {/* Success Message */}
      {successMessage && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid #AC8E66',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#AC8E66' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#AC8E66' }}>
            {successMessage}
          </span>
        </div>
      )}

      {/* License Status Card */}
      <div
        style={{
      
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          border: isPro ? '1px dotted #AC8E66' : '1px solid #555',
        }}
      >
        {/* Header with Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: '1px solid #AC8E66',
                background: isPro
                  ? 'transparent'
                  : 'linear-gradient(135deg, #555, #333)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FontAwesomeIcon
                icon={isPro ? faFolder : faUser}
                style={{ fontSize: 20, color: isPro ? '#A18F55' : '#dbd9d5' }}
              />
            </div>
            <div>
              <h3 style={{ fontFamily: 'monospace', fontSize: 16, color: '#AC8E66', margin: 0 }}>
                ZenPost Studio {tier.toUpperCase()}
              </h3>
              <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#555', margin: '0px 0 0 0' }}>
                {isPro ? (isTrial ? 'Trial Version' : 'Vollversion') : 'Kostenlose Version'}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              backgroundColor: isPro ? 'rgba(172, 142, 102, 0.2)' : 'rgba(136, 136, 136, 0.2)',
              border: `1px solid ${isPro ? '#AC8E66' : '#555'}`,
            }}
          >
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: isPro ? '#AC8E66' : '#888' }}>
              {isPro ? (isTrial ? 'TRIAL AKTIV' : 'PRO AKTIV') : 'FREE'}
            </span>
          </div>
        </div>

        {/* License Details */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {/* Activated Date */}
          {license.activatedAt && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FontAwesomeIcon icon={faCalendarAlt} style={{ color: '#AC8E66', fontSize: 12 }} />
              <div>
                <p style={{ fontFamily: 'monospace', fontSize: 9, color: '#555', margin: 0 }}>
                  Aktiviert am
                </p>
                <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#555', margin: 0 }}>
                  {formatDate(license.activatedAt)}
                </p>
              </div>
            </div>
          )}

          {/* Expiry / Trial End */}
          {(license.expiresAt || trial?.endsAt) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FontAwesomeIcon icon={faClock} style={{ color: isTrial ? '#AC8E66' : '#AC8E66', fontSize: 12 }} />
              <div>
                <p style={{ fontFamily: 'monospace', fontSize: 9, color: '#555', margin: 0 }}>
                  {isTrial ? 'Trial endet' : 'Gültig bis'}
                </p>
                <p style={{ fontFamily: 'monospace', fontSize: 12, color: isTrial ? '#AC8E66' : '#121212', margin: 0 }}>
                  {formatDate(isTrial ? trial?.endsAt : license.expiresAt)}
                  {isTrial && trial && (
                    <span style={{ marginLeft: 8, color: '#AC8E66' }}>
                      ({trial.daysRemaining} {trial.daysRemaining === 1 ? 'Tag' : 'Tage'})
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* License Key (masked) */}
          {license.licenseKey && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, gridColumn: 'span 2' }}>
              <FontAwesomeIcon icon={faKey} style={{ color: '#AC8E66', fontSize: 12 }} />
              <div>
                <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#666', margin: 0 }}>
                  Lizenzkey
                </p>
                <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#121212', margin: 0 }}>
                  {maskLicenseKey(license.licenseKey)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Trial Warning */}
        {isTrial && trial && trial.daysRemaining <= 3 && (
          <div
            style={{
              marginTop: 16,
              padding: '12px 16px',
              backgroundColor: 'transparent',
              border: '1px solid #dbd9d5',
              borderRadius: 8,
            }}
          >
            <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#dbd9d5', margin: 0 }}>
              <FontAwesomeIcon icon={faClock} style={{ marginRight: 8 }} />
              Dein Trial läuft in {trial.daysRemaining} {trial.daysRemaining === 1 ? 'Tag' : 'Tagen'} ab.
              Upgrade jetzt um alle Features zu behalten!
            </p>
          </div>
        )}
      </div>

      {/* Actions Section */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ fontFamily: 'monospace', fontSize: 12, color: '#888', marginBottom: 16 }}>
     
        </h4>

        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {/* If FREE - Show upgrade options */}
          {!isPro && (
            <>
              {canStartTrial && (
                <ZenRoughButton
                  label="7 Tage kostenlos testen"
                  icon={<FontAwesomeIcon icon={faGift} />}
                  onClick={handleStartTrial}
                  variant="default"
                />
              )}

            
            </>
          )}

          {/* If Trial - Show buy option prominently */}
          {isTrial && (
            <ZenRoughButton
              label="Jetzt upgraden - PRO kaufen"
              icon={<FontAwesomeIcon icon={faShoppingCart} />}
              onClick={() => window.open('https://zenpost.studio/pricing', '_blank')}
              variant="default"
            />
          )}

          {/* License Key Input Toggle */}
      

          {/* Deactivate License (only for PRO users) */}
          {isPro && !isTrial && (
            <button
              onClick={handleDeactivate}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 16px',
                backgroundColor: 'transparent',
                color: '#666',
                border: '1px solid #3a3a3a',
                borderRadius: 8,
                fontFamily: 'monospace',
                fontSize: 11,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#ef4444';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#3a3a3a';
                e.currentTarget.style.color = '#666';
              }}
            >
              <FontAwesomeIcon icon={faSignOutAlt} />
              Lizenz deaktivieren
            </button>
          )}

                  <button
            onClick={handleGenerateDemo}
            style={{
            
              fontFamily: 'monospace',
              fontSize: 10,
              color: '#555',
              background: 'none',
              border: '#AC8E66 1px dashed',
              cursor: 'pointer',
     
              padding: '10px',
      
            }}
          >
            Beta-Key für ZenPost Studio Pro generieren (nur für Betatest)
          </button>
        </div>

      

        {/* License Key Input - Full Width Below */}
        {showKeyInput && (
          <div
            style={{
              backgroundColor: '#1a1a1a',
              padding: 16,
              borderRadius: 8,
              border: '1px solid #3a3a3a',
              marginTop: 12,
            }}
          >
            <label style={{ display: 'block', fontFamily: 'monospace', fontSize: 11, color: '#888', marginBottom: 8 }}>
              Lizenzkey für ZenPost Studio Pro mit Doc Studio:
            </label>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => setShowLicenseKey((prev) => !prev)}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#AC8E66',
                  cursor: 'pointer',
                  padding: 0,
                }}
                aria-label={showLicenseKey ? 'Lizenzschlüssel verbergen' : 'Lizenzschlüssel anzeigen'}
              >
                <FontAwesomeIcon icon={showLicenseKey ? faEyeSlash : faEye} />
              </button>
              <input
                type={showLicenseKey ? "text" : "password"}
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                placeholder="ZENPOST-PRO-XXXX-XXXX-XXXX"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  paddingLeft: 34,
                  maxWidth: 600,
                  backgroundColor: 'transparent',
                  border: '1px solid #AC8E66',
                  borderRadius: 8,
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: '#999',
                  outline: 'none',
                }}
              />
            </div>
            {(localError || error) && (
              <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#ef4444', marginBottom: 12 }}>
                {localError || error}
              </p>
            )}
            <div style={{ display: 'flex', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={handleActivate}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#AC8E66',
                  color: '#1a1a1a',
                  border: 'none',
                  borderRadius: 8,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  cursor: isLoading ? 'wait' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                {isLoading ? 'Aktiviere...' : 'Aktivieren'}
              </button>
              <button
                onClick={() => {
                  setShowKeyInput(false);
                  setLicenseKey('');
                  setLocalError(null);
                }}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'transparent',
                  color: '#888',
                  border: '1px solid #3a3a3a',
                  borderRadius: 8,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div
        style={{
          backgroundColor: 'transparent',
          borderRadius: 8,
          padding: 16,
          border: '1px dotted #666',
        }}
      >
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#151515', marginBottom: 12 }}>
          Hilfe & Support
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => openExternal('https://theoriginalbitter.github.io/zenpost-studio/#/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'monospace',
              fontSize: 11,
              color: '#AC8E66',
              textDecoration: 'none',
              background: 'transparent',
              border: 'none',
              padding: '12px',
              cursor: 'pointer',
            }}
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} style={{ fontSize: 10 }} />
            Lizenz Policy
          </button>
          <button
            onClick={() => openExternal('https://github.com/THEORIGINALBITTER/zenpost-studio/issues/new')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'monospace',
              fontSize: 11,
              color: '#AC8E66',
              textDecoration: 'none',
              background: 'transparent',
              border: 'none',
              padding: '12px',
              cursor: 'pointer',
            }}
          >
            <FontAwesomeIcon icon={faGithub} style={{ fontSize: 10 }} />
            Problem auf GitHub senden
          </button>



       
        </div>

        {/* Demo Key (for testing - remove in production) */}

      </div>
    </div>
    </div>
    </div>
  );
};
