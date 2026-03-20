import { useEffect, useState, type ChangeEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faFolderOpen, faMobileScreen, faQrcode } from '@fortawesome/free-solid-svg-icons';
import { open } from '@tauri-apps/plugin-dialog';
import { isTauri } from '@tauri-apps/api/core';
import { getMobileInboxPath, saveMobileInboxPath, saveWebMobileInboxFiles } from '../../../../../services/mobileInboxService';
import * as QRCode from 'qrcode';

const MOBILE_APP_DOWNLOAD_URL = 'https://zenpostapp.denisbitter.de';
const MOBILE_APP_QR_FALLBACK_SRC = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&format=png&bgcolor=transparent&data=${encodeURIComponent(MOBILE_APP_DOWNLOAD_URL)}`;

export const ZenMobileSettingsContent = () => {
  const [mobileInboxPath, setMobileInboxPath] = useState('');
  const [webInputKey, setWebInputKey] = useState(0);
  const [mobileAppQrSrc, setMobileAppQrSrc] = useState(MOBILE_APP_QR_FALLBACK_SRC);

  useEffect(() => {
    getMobileInboxPath().then(setMobileInboxPath).catch(() => setMobileInboxPath(''));
  }, []);

  useEffect(() => {
    let isMounted = true;
    void QRCode.toDataURL(MOBILE_APP_DOWNLOAD_URL, {
      margin: 1,
      width: 260,
      color: { dark: '#000000', light: '#0000' },
    })
      .then((dataUrl) => {
        if (isMounted) setMobileAppQrSrc(dataUrl);
      })
      .catch(() => {
        if (isMounted) setMobileAppQrSrc(MOBILE_APP_QR_FALLBACK_SRC);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChangeMobileFolder = async () => {
    if (!isTauri()) return;
    const selected = await open({ directory: true, multiple: false, title: 'Mobile Inbox Ordner waehlen' });
    if (typeof selected !== 'string') return;
    saveMobileInboxPath(selected);
    setMobileInboxPath(selected);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('zenpost-mobile-inbox-changed'));
    }
  };

  const handleWebFolderPicked = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const first = files[0] as File & { webkitRelativePath?: string };
    const folder =
      first.webkitRelativePath?.split('/').filter(Boolean)[0] ||
      'Ausgewaehlter Browser-Ordner';
    saveWebMobileInboxFiles(files, folder);
    setMobileInboxPath(folder);
    setWebInputKey((prev) => prev + 1);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('zenpost-mobile-inbox-changed'));
    }
  };

  const handleOpenDownload = () => {
    if (typeof window === 'undefined') return;
    window.open(MOBILE_APP_DOWNLOAD_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full flex justify-center" style={{ padding: '32px 32px' }}>
      <div className="w-full max-w-[860px] rounded-[10px] bg-[#E8E1D2] border border-[#AC8E66]/60 shadow-2xl overflow-hidden">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '24px 32px' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#555' }}>
            Mobile Einstellungen
          </div>

            <div style={panelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FontAwesomeIcon icon={faDownload} style={{ color: '#AC8E66' }} />
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#333' }}>
                Mobile App Dev LOG
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
              <div
                style={{
                  width: 132,
                  height: 132,
                  borderRadius: 10,
                  border: '1px solid rgba(172,142,102,0.45)',
                  background: 'transparent',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img src={mobileAppQrSrc} alt="QR-Code fuer Mobile App Download" style={{ width: '100%', height: '100%' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#666', lineHeight: 1.5 }}>
                  <FontAwesomeIcon icon={faQrcode} style={{ marginRight: 6, color: '#AC8E66' }} />
                  QR scannen und DEV Log lesen.
                </div>
                <button type="button" onClick={handleOpenDownload} style={buttonStyle}>
                  DEV LOG Seite oeffnen
                </button>
                <code style={codeRowStyle}>{MOBILE_APP_DOWNLOAD_URL}</code>
              </div>
            </div>
          </div>

          <div style={panelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FontAwesomeIcon icon={faFolderOpen} style={{ color: '#AC8E66' }} />
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#333' }}>
                  Mobile Inbox Ordner
                </span>
              </div>
              {isTauri() && (
                <button type="button" onClick={handleChangeMobileFolder} style={buttonStyle}>
                  Aendern
                </button>
              )}
              {!isTauri() && (
                <label style={buttonStyle} htmlFor="web-mobile-folder-input">
                  Ordner waehlen
                </label>
              )}
            </div>
            <div style={codeRowStyle}>{mobileInboxPath || 'Kein Ordner gesetzt'}</div>
            {!isTauri() && (
              <div style={hintStyle}>Web nutzt Browser-Zugriff auf ausgewaehlte Dateien (kein nativer Dateisystem-Pfad).</div>
            )}
            {!isTauri() && (
              <input
                key={webInputKey}
                id="web-mobile-folder-input"
                type="file"
                multiple
                onChange={handleWebFolderPicked}
                ref={(el) => {
                  if (!el) return;
                  el.setAttribute('webkitdirectory', '');
                  el.setAttribute('directory', '');
                }}
                style={{ display: 'none' }}
              />
            )}
          </div>

        

          <div style={panelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FontAwesomeIcon icon={faMobileScreen} style={{ color: '#AC8E66' }} />
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#333' }}>
                Hilfe: So funktioniert es
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              <div style={helpItemStyle}>1. Entwurf auf dem iPhone in der ZenPost Mobile App erstellen.</div>
              <div style={helpItemStyle}>2. Entwurf in den Mobile Inbox Ordner synchronisieren oder AirDrop nutzen.</div>
              <div style={helpItemStyle}>3. Im Dashboard unter Mobile auf "Inbox abrufen" klicken und in Content AI oeffnen.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const panelStyle: React.CSSProperties = {
  border: '1px solid rgba(172,142,102,0.45)',
  borderRadius: 10,
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.25)',
};

const codeRowStyle: React.CSSProperties = {
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10px',
  color: '#555',
  marginTop: 8,
  border: '1px solid rgba(58,58,58,0.35)',
  borderRadius: 8,
  padding: '7px 10px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  background: 'rgba(255,255,255,0.32)',
};

const buttonStyle: React.CSSProperties = {
  border: '1px solid #3A3A3A',
  borderRadius: 8,
  padding: '7px 12px',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10px',
  color: '#AC8E66',
  backgroundColor: 'rgba(172,142,102,0.1)',
  cursor: 'pointer',
};

const hintStyle: React.CSSProperties = {
  marginTop: 8,
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10px',
  color: '#777',
};

const helpItemStyle: React.CSSProperties = {
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10px',
  color: '#555',
  lineHeight: 1.45,
};
