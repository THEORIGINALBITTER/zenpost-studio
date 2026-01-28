/**
 * ZenLicenseSettingsContent
 * Settings tab for license management and account info
 */

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCrown,
  faUser,
  faCalendarAlt,
  faKey,
  faShoppingCart,
  faSignOutAlt,
  faCheckCircle,
  faClock,
  faGift,
  faExternalLinkAlt,
} from '@fortawesome/free-solid-svg-icons';
import { useLicense } from '../../../../../contexts/LicenseContext';
import { ZenRoughButton } from '../../components/ZenRoughButton';
import { generateDemoKey } from '../../../../../services/licenseService';

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
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleActivate = async () => {
    setLocalError(null);
    setSuccessMessage(null);

    if (!licenseKey.trim()) {
      setLocalError('Bitte gib einen Lizenzschlüssel ein');
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
    <div style={{ padding: '0 32px 32px 32px' }}>
      {/* Success Message */}
      {successMessage && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid #22c55e',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#22c55e' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#22c55e' }}>
            {successMessage}
          </span>
        </div>
      )}

      {/* License Status Card */}
      <div
        style={{
          backgroundColor: '#2a2a2a',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          border: isPro ? '2px solid #AC8E66' : '1px solid #3a3a3a',
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
                background: isPro
                  ? 'linear-gradient(135deg, #d8b27c, #AC8E66)'
                  : 'linear-gradient(135deg, #555, #333)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FontAwesomeIcon
                icon={isPro ? faCrown : faUser}
                style={{ fontSize: 20, color: isPro ? '#1a1a1a' : '#888' }}
              />
            </div>
            <div>
              <h3 style={{ fontFamily: 'monospace', fontSize: 16, color: '#e5e5e5', margin: 0 }}>
                ZenStudio {tier.toUpperCase()}
              </h3>
              <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#888', margin: '4px 0 0 0' }}>
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
                <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#666', margin: 0 }}>
                  Aktiviert am
                </p>
                <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#e5e5e5', margin: 0 }}>
                  {formatDate(license.activatedAt)}
                </p>
              </div>
            </div>
          )}

          {/* Expiry / Trial End */}
          {(license.expiresAt || trial?.endsAt) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FontAwesomeIcon icon={faClock} style={{ color: isTrial ? '#f59e0b' : '#AC8E66', fontSize: 12 }} />
              <div>
                <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#666', margin: 0 }}>
                  {isTrial ? 'Trial endet' : 'Gültig bis'}
                </p>
                <p style={{ fontFamily: 'monospace', fontSize: 12, color: isTrial ? '#f59e0b' : '#e5e5e5', margin: 0 }}>
                  {formatDate(isTrial ? trial?.endsAt : license.expiresAt)}
                  {isTrial && trial && (
                    <span style={{ marginLeft: 8, color: '#f59e0b' }}>
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
                  Lizenzschlüssel
                </p>
                <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#e5e5e5', margin: 0 }}>
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
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid #f59e0b',
              borderRadius: 8,
            }}
          >
            <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#f59e0b', margin: 0 }}>
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
          Aktionen
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* If FREE - Show upgrade options */}
          {!isPro && (
            <>
              {canStartTrial && (
                <ZenRoughButton
                  label="7 Tage kostenlos testen"
                  icon={<FontAwesomeIcon icon={faGift} />}
                  onClick={handleStartTrial}
                  variant="active"
                />
              )}

              <ZenRoughButton
                label="PRO Version kaufen"
                icon={<FontAwesomeIcon icon={faShoppingCart} />}
                onClick={() => window.open('https://zenpost.studio/pricing', '_blank')}
                variant="default"
              />
            </>
          )}

          {/* If Trial - Show buy option prominently */}
          {isTrial && (
            <ZenRoughButton
              label="Jetzt upgraden - PRO kaufen"
              icon={<FontAwesomeIcon icon={faShoppingCart} />}
              onClick={() => window.open('https://zenpost.studio/pricing', '_blank')}
              variant="active"
            />
          )}

          {/* License Key Input Toggle */}
          {!showKeyInput ? (
            <ZenRoughButton
              label="Lizenzschlüssel eingeben"
              icon={<FontAwesomeIcon icon={faKey} />}
              onClick={() => setShowKeyInput(true)}
              variant="default"
            />
          ) : (
            <div
              style={{
                backgroundColor: '#1a1a1a',
                padding: 16,
                borderRadius: 8,
                border: '1px solid #3a3a3a',
              }}
            >
              <label style={{ display: 'block', fontFamily: 'monospace', fontSize: 11, color: '#888', marginBottom: 8 }}>
                Lizenzschlüssel:
              </label>
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                placeholder="ZENPOST-PRO-XXXX-XXXX-XXXX"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #3a3a3a',
                  borderRadius: 8,
                  fontFamily: 'monospace',
                  fontSize: 13,
                  color: '#e5e5e5',
                  marginBottom: 12,
                  outline: 'none',
                }}
              />
              {(localError || error) && (
                <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#ef4444', marginBottom: 12 }}>
                  {localError || error}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
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
        </div>
      </div>

      {/* Help Section */}
      <div
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: 8,
          padding: 16,
          border: '1px solid #3a3a3a',
        }}
      >
        <h4 style={{ fontFamily: 'monospace', fontSize: 12, color: '#888', marginBottom: 12 }}>
          Hilfe & Support
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a
            href="https://zenpost.studio/pricing"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'monospace',
              fontSize: 11,
              color: '#AC8E66',
              textDecoration: 'none',
            }}
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} style={{ fontSize: 10 }} />
            Preise & Pakete ansehen
          </a>
          <a
            href="https://zenpost.studio/support"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'monospace',
              fontSize: 11,
              color: '#AC8E66',
              textDecoration: 'none',
            }}
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} style={{ fontSize: 10 }} />
            Support kontaktieren
          </a>
        </div>

        {/* Demo Key (for testing - remove in production) */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #3a3a3a' }}>
          <button
            onClick={handleGenerateDemo}
            style={{
              fontFamily: 'monospace',
              fontSize: 10,
              color: '#555',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Demo-Schlüssel generieren (nur für Tests)
          </button>
        </div>
      </div>
    </div>
  );
};
