import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faMobileScreen, faQrcode } from '@fortawesome/free-solid-svg-icons';
import { isTauri } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import * as QRCode from 'qrcode';

const MOBILE_APP_DOWNLOAD_URL = 'https://zenpostapp.denisbitter.de';
const DOC_LINK = 'https://zenpostdocs.denisbitter.de/workflows/mobile-app.html'
const POCKET_APP_URL = 'https://zenpostpocket.denisbitter.de';
const MOBILE_APP_QR_FALLBACK_SRC = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&format=png&bgcolor=transparent&data=${encodeURIComponent(MOBILE_APP_DOWNLOAD_URL)}`;
const POCKET_APP_QR_FALLBACK_SRC = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&format=png&bgcolor=transparent&data=${encodeURIComponent(POCKET_APP_URL)}`;

export const ZenMobileSettingsContent = () => {
  const [mobileAppQrSrc, setMobileAppQrSrc] = useState(MOBILE_APP_QR_FALLBACK_SRC);
  const [pocketAppQrSrc, setPocketAppQrSrc] = useState(POCKET_APP_QR_FALLBACK_SRC);

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

  // Replaces the old "Mobile Inbox Ordner" (AirDrop-a-folder-and-hope) flow
  // — Pocket Studio syncs drafts through ZenCloud directly, so there's no
  // folder to configure or "Inbox abrufen" step anymore, just a link/QR to
  // the app itself.
  useEffect(() => {
    let isMounted = true;
    void QRCode.toDataURL(POCKET_APP_URL, {
      margin: 1,
      width: 260,
      color: { dark: '#000000', light: '#0000' },
    })
      .then((dataUrl) => {
        if (isMounted) setPocketAppQrSrc(dataUrl);
      })
      .catch(() => {
        if (isMounted) setPocketAppQrSrc(POCKET_APP_QR_FALLBACK_SRC);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenPocketApp = async () => {
    if (isTauri()) {
      await openUrl(POCKET_APP_URL);
    } else {
      window.open(POCKET_APP_URL, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenDownload = async () => {
    if (isTauri()) {
      await openUrl(MOBILE_APP_DOWNLOAD_URL);
    } else {
      window.open(MOBILE_APP_DOWNLOAD_URL, '_blank', 'noopener,noreferrer');
    }
  };

    const handleOpenDownloadDoc = async () => {
    if (isTauri()) {
      await openUrl(DOC_LINK);
    } else {
      window.open(DOC_LINK, '_blank', 'noopener,noreferrer');
    }
  };


  return (
    <div className="w-full flex justify-center" style={{ padding: '32px 32px' }}>
      <div className="w-full max-w-[860px] rounded-[10px] bg-[#E8E1D2] border border-[#AC8E66]/60 overflow-hidden">
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
                  DEV LOG Seite hier oeffnen
                </button>
                 <button type="button" onClick={handleOpenDownloadDoc} style={buttonStyle}>
                  ZenPost Studio Dokumentation
                </button>
               
              </div>
            </div>
          </div>

          <div style={panelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FontAwesomeIcon icon={faMobileScreen} style={{ color: '#AC8E66' }} />
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#333' }}>
                ZenPost Pocket
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
                <img src={pocketAppQrSrc} alt="QR-Code fuer ZenPost Pocket" style={{ width: '100%', height: '100%' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#666', lineHeight: 1.5 }}>
                  <FontAwesomeIcon icon={faQrcode} style={{ marginRight: 6, color: '#AC8E66' }} />
                  QR scannen, um Pocket Studio auf dem Handy zu öffnen. Entwürfe synchronisieren automatisch über ZenCloud — kein Ordner, kein AirDrop nötig.
                </div>
                <button type="button" onClick={handleOpenPocketApp} style={buttonStyle}>
                  Pocket Studio hier oeffnen
                </button>
              </div>
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

const buttonStyle: React.CSSProperties = {
  border: '0.5px solid #1a1a1a',
  borderRadius: 4,
  padding: '7px 12px',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10px',
  color: '#666',
  boxShadow: 'none',

  backgroundColor: 'transparent',
  cursor: 'pointer',
};
