import { useState, useEffect } from 'react';
import { loadMobileDrafts, type MobileDraft } from '../services/mobileInboxService';
import { isTauri } from '@tauri-apps/api/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faBook,
  faCalendarDays,
  faDownload,
  faFileLines,
  faFolderOpen,
  faMobileScreen,
  faPencil,
  faQrcode,
  faServer,
  faSpinner,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import { ZenPlannerModal } from '../kits/PatternKit/ZenModalSystem/modals/ZenPlannerModal';
import { ZenThoughtLine } from '../components/ZenThoughtLine';
import { loadZenStudioSettings } from '../services/zenStudioSettingsService';

import type { ScheduledPost } from '../types/scheduling';

export type GettingStartedRecentItem = {
  id: string;
  title: string;
  subtitle?: string;
  updatedAt: number;
  source: 'doc-studio' | 'content-ai';
  articleId?: string;
  filePath?: string;
};

interface GettingStartedScreenProps {
  onBack: () => void;
  onOpenDocStudio?: () => void;
  onOpenContentAI?: () => void;
  onOpenConverter?: () => void;
  onOpenMobileInbox?: () => void;
  onOpenMobileSettings?: () => void;
  onOpenApiSettings?: () => void;
  recentItems?: GettingStartedRecentItem[];
  onContinueRecent?: (item: GettingStartedRecentItem) => void;
  onOpenServerArticle?: (slug: string) => void;
}

type StudioId = 'doc-studio' | 'content-ai' | 'converter' | 'mobile';
const MOBILE_APP_DOWNLOAD_URL = 'https://zenpost.studio';
const MOBILE_APP_QR_SRC = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(MOBILE_APP_DOWNLOAD_URL)}`;

interface StudioDef {
  id: StudioId;
  label: string;
  shortLabel: string;
  description: string;
  useCases: {
    title: string;
    description: string;
    icon: any;
    action: () => void;
  }[];
}

type ServerSlugItem = { slug: string; title?: string; date?: string };

export function GettingStartedScreen({
  onBack: _onBack,
  onOpenDocStudio,
  onOpenContentAI,
  onOpenConverter,
  onOpenMobileInbox,
  onOpenMobileSettings,
  onOpenApiSettings,
  recentItems = [],
  onContinueRecent,
  onOpenServerArticle,
}: GettingStartedScreenProps) {
  const [zenStudioSettings] = useState(() => loadZenStudioSettings());
  const [projectPath] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('zenpost_last_project_path');
  });
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [activeStudio, setActiveStudio] = useState<StudioId>('doc-studio');
  const [mobileDrafts, setMobileDrafts] = useState<MobileDraft[]>([]);
  const [serverArticles, setServerArticles] = useState<ServerSlugItem[] | null>(null);
  const [serverLoading, setServerLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmingDeleteSlug, setConfirmingDeleteSlug] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);

  const getFriendlyServerError = (rawError: string | null): string => {
    if (!rawError) return '';
    const normalized = rawError.toLowerCase();
    const isConnectionIssue =
      normalized.includes('load failed') ||
      normalized.includes('failed to fetch') ||
      normalized.includes('networkerror') ||
      normalized.includes('network error') ||
      normalized.includes('timeout') ||
      normalized.includes('http 0') ||
      normalized.includes('fetch');

    if (isConnectionIssue) {
      return 'Keine Verbindung. Stelle Deine Verbindung im Zahnrad unter API ein.';
    }
    return rawError;
  };

  const refreshMobileDrafts = () => {
    loadMobileDrafts().then(({ drafts }) => {
      setMobileDrafts(drafts.slice(0, 3));
    });
  };

  const loadServerArticles = async () => {
    const settings = loadZenStudioSettings();
    let base = (settings.contentServerApiUrl ?? '').trim();
    if (!base) { setServerError('Keine Server-URL konfiguriert. Bitte in Einstellungen → API eintragen.'); return; }
    if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
    const endpoint = (settings.contentServerListEndpoint ?? '/articles.php').trim();
    const url = /^https?:\/\//i.test(endpoint) ? endpoint : `${base.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
    setServerLoading(true);
    setServerError(null);
    try {
      const headers: Record<string, string> = {};
      if (settings.contentServerApiKey) headers['Authorization'] = `Bearer ${settings.contentServerApiKey}`;
      const res = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as unknown;
      if (!Array.isArray(data)) throw new Error('Unerwartetes Antwortformat');
      setServerArticles(data as ServerSlugItem[]);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Verbindungsfehler');
      setServerArticles([]);
    } finally {
      setServerLoading(false);
    }
  };

  const deleteServerArticle = async (slug: string) => {
    const settings = loadZenStudioSettings();
    let base = (settings.contentServerApiUrl ?? '').trim();
    if (!base) return;
    if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
    const endpoint = (settings.contentServerDeleteEndpoint ?? '/delete_articles.php').trim();
    const endpointUrl = /^https?:\/\//i.test(endpoint) ? endpoint : `${base.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
    const url = `${endpointUrl}?slug=${encodeURIComponent(slug)}`;
    setDeletingSlug(slug);
    try {
      const headers: Record<string, string> = {};
      if (settings.contentServerApiKey) headers['Authorization'] = `Bearer ${settings.contentServerApiKey}`;
      const res = await fetch(url, { method: 'DELETE', headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDeleteToast('Artikel erfolgreich gelöscht');
      setTimeout(() => setDeleteToast(null), 3000);
      void loadServerArticles();
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Löschen fehlgeschlagen');
    } finally {
      setDeletingSlug(null);
      setConfirmingDeleteSlug(null);
    }
  };

  useEffect(() => {
    refreshMobileDrafts();
  }, []);

  const handleOpenMobileDownload = () => {
    if (typeof window === 'undefined') return;
    window.open(MOBILE_APP_DOWNLOAD_URL, '_blank', 'noopener,noreferrer');
  };

  const studios: StudioDef[] = [
    {
      id: 'doc-studio',
      label: 'Doc Studio',
      shortLabel: 'Doc Studio',
      description: 'Technische Dokumentation, README und Code-Doku erstellen',
      useCases: [
        {
          title: 'Code dokumentieren',
          description: 'README, API-Docs, Changelog und technische Doku erstellen',
          icon: faBook,
          action: () => onOpenDocStudio?.(),
        },
        {
          title: 'Dokumente verwalten',
          description: 'Projektdateien öffnen, fortsetzen und gezielt weiterbearbeiten',
          icon: faFolderOpen,
          action: () => onOpenDocStudio?.(),
        },
      ],
    },
    {
      id: 'content-ai',
      label: 'Content AI',
      shortLabel: 'Content AI',
      description: 'KI-gestütztes Schreiben für Social Media, Artikel und Planung',
      useCases: [
        {
          title: 'Dokumenten Dashboard',
          description: 'LinkedIn, X, Medium und weitere Kanäle bespielen',
          icon: faWandMagicSparkles,
          action: () => onOpenContentAI?.(),
        },
        {
          title: 'Artikel schreiben',
          description: 'Direkt mit KI-Unterstützung starten',
          icon: faPencil,
          action: () => onOpenContentAI?.(),
        },
        {
          title: 'Posts planen',
          description: 'Kalender, Scheduling und Veröffentlichungen vorbereiten',
          icon: faCalendarDays,
          action: () => setShowPlannerModal(true),
        },
      ],
    },
    {
      id: 'converter',
      label: 'Converter',
      shortLabel: 'Converter',
      description: 'Dateiformate bereinigen, konvertieren und transformieren',
      useCases: [
        {
          title: 'Dateiformate konvertieren',
          description: 'Markdown, Text und strukturierte Inhalte, Bildformate bereinigen/konvertieren',
          icon: faFileLines,
          action: () => onOpenConverter?.(),
        },
      ],
    },
    {
      id: 'mobile',
      label: 'Mobile Inbox Beta Version',
      shortLabel: 'Mobile',
      description: 'iPhone-Entwürfe via iCloud — Ideen unterwegs festhalten, hier weiterbearbeiten',
      useCases: [],
    },
  ];

  const currentStudio = studios.find((s) => s.id === activeStudio)!;
  const sortedRecent = [...recentItems].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        backgroundColor: 'transparent',
        color: '#e5e5e5',
        padding: '28px 36px 20px',
        overflowY: 'auto',
      }}
    >
      <div style={{ maxWidth: '1120px', width: '100%', margin: '0 auto' }}>

        {/* Header */}
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '20px',
            fontWeight: '500',
            margin: '0 0 8px 0',
            padding: '15px',
            color: '#AC8E66',
            letterSpacing: '0.4px',
          }}
        >
          Was möchtest du heute machen?
        </p>

        <ZenThoughtLine
          thoughts={zenStudioSettings.thoughts}
          visible={zenStudioSettings.showInGettingStarted}
        />

        {/* Studio Tab-Reiter Card */}
        <div style={{ marginTop: '28px', display: 'flex', alignItems: 'stretch' }}>

          {/* Left: vertical studio tabs */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              paddingTop: '12px',
              marginRight: '-1px',
              position: 'relative',
              zIndex: 5,
            }}
          >
            {studios.map((studio) => {
              const isActive = studio.id === activeStudio;
              return (
                <button
                  key={studio.id}
                  onClick={() => setActiveStudio(studio.id)}
                  style={{
                    width: '36px',
                    height: '100px',
                    borderRadius: '10px 0 0 10px',
                    borderTop: isActive ? '1px solid #b8b0a0' : '0.5px solid #3A3A3A',
                    borderLeft: isActive ? '1px solid #b8b0a0' : '0.5px solid #3A3A3A',
                    borderBottom: isActive ? '1px solid #b8b0a0' : '0.5px solid #3A3A3A',
                    borderRight: 'none',
                    background: isActive ? '#d0cbb8' : '#1a1a1a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    transition: 'background 0.2s',
                    position: 'relative',
                    zIndex: isActive ? 20 : 10,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = '#2a2a2a';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = '#1a1a1a';
                  }}
                >
                  <span
                    style={{
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed',
                      transform: 'rotate(180deg)',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '9px',
                      color: isActive ? '#1a1a1a' : '#8E8E8E',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      maxHeight: '90px',
                      letterSpacing: '0.3px',
                    }}
                  >
                    {studio.shortLabel}
                  </span>
                  {studio.id === 'mobile' && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '3px',
                        fontSize: '6px',
                        fontFamily: 'IBM Plex Mono, monospace',
                        color: isActive ? '#7a5a30' : '#AC8E66',
                        background: isActive ? 'rgba(172,142,102,0.25)' : 'rgba(172,142,102,0.15)',
                        borderRadius: '3px',
                        padding: '1px 4px',
                        border: '0.5px solid rgba(172,142,102,0.5)',
                        writingMode: 'horizontal-tb',
                        letterSpacing: '0.5px',
                        lineHeight: 1,
                      }}
                    >
                      BETA
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active studio card (beige) */}
          <div
            style={{
              flex: 1,
              borderRadius: '0 14px 14px 0',
              borderTop: '1px solid #b8b0a0',
              borderRight: '1px solid #b8b0a0',
              borderBottom: '1px solid #b8b0a0',
              borderLeft: 'none',
              background: '#d0cbb8',
              padding: '24px 28px',
              boxShadow: '4px 4px 20px rgba(0,0,0,0.25)',
              zIndex: 15,
            }}
          >
            {/* Studio header */}
            <div style={{ marginBottom: '20px' }}>
              <p
                style={{
                  fontSize: '9px',
                  color: '#7a7060',
                  fontFamily: 'IBM Plex Mono, monospace',
                  margin: '0 0 6px 0',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Studio
              </p>
              <p
                style={{
                  fontSize: '18px',
                  color: '#1a1a1a',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontWeight: '500',
                  margin: '0 0 4px 0',
                }}
              >
                {currentStudio.label}
              </p>
              <p
                style={{
                  fontSize: '10px',
                  color: '#5a5040',
                  fontFamily: 'IBM Plex Mono, monospace',
                  margin: 0,
                  borderTop: '1px solid rgba(172,142,102,0.3)',
                  paddingTop: '10px',
                  marginTop: '10px',
                }}
              >
                {currentStudio.description}
              </p>
            </div>

            {/* Use case cards — oder Mobile Drafts */}
            {activeStudio === 'mobile' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: '12px',
                  }}
                >
                  <button
                    onClick={() => onOpenMobileInbox?.()}
                    style={{
                      borderRadius: '12px',
                      border: '0.5px solid rgba(172,142,102,0.35)',
                      background: 'rgba(255,255,255,0.45)',
                      padding: '16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      transition: 'all 0.18s ease',
                      fontFamily: 'IBM Plex Mono, monospace',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.7)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.45)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <FontAwesomeIcon icon={faMobileScreen} style={{ fontSize: '16px', color: '#AC8E66' }} />
                      <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '10px', color: '#AC8E66', opacity: 0.6 }} />
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 200, color: '#1a1a1a' }}>
                        Inbox abrufen
                      </p>
                      <p style={{ margin: 0, fontSize: '9px', color: '#7a7060', lineHeight: 1.45 }}>
                        Mobile Entwürfe öffnen und in Content AI weiterbearbeiten.
                      </p>
                    </div>
                    <div style={{ marginTop: '2px', fontSize: '9px', color: '#5a5040' }}>
                      {isTauri()
                        ? `${mobileDrafts.length} Entwurf${mobileDrafts.length !== 1 ? 'e' : ''} gefunden`
                        : 'Desktop-App erforderlich'}
                    </div>
                  </button>

                  <button
                    onClick={handleOpenMobileDownload}
                    style={{
                      borderRadius: '12px',
                      border: '0.5px solid rgba(172,142,102,0.35)',
                      background: 'rgba(255,255,255,0.45)',
                      padding: '16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      transition: 'all 0.18s ease',
                      fontFamily: 'IBM Plex Mono, monospace',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.7)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.45)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <FontAwesomeIcon icon={faDownload} style={{ fontSize: '16px', color: '#AC8E66' }} />
                      <FontAwesomeIcon icon={faQrcode} style={{ fontSize: '12px', color: '#AC8E66', opacity: 0.8 }} />
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 200, color: '#1a1a1a' }}>
                        App herunterladen
                      </p>
                      <p style={{ margin: 0, fontSize: '9px', color: '#7a7060', lineHeight: 1.45 }}>
                        QR-Code scannen oder Download-Seite direkt öffnen.
                      </p>
                    </div>
                    <div
                      style={{
                        alignSelf: 'center',
                        width: 96,
                        height: 96,
                        border: '1px solid rgba(172,142,102,0.35)',
                        borderRadius: 8,
                        backgroundColor: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <img src={MOBILE_APP_QR_SRC} alt="QR-Code App Download" style={{ width: '100%', height: '100%' }} />
                    </div>
                  </button>

                  <button
                    onClick={() => onOpenMobileSettings?.()}
                    style={{
                      borderRadius: '12px',
                      border: '0.5px solid rgba(172,142,102,0.35)',
                      background: 'rgba(255,255,255,0.45)',
                      padding: '16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      transition: 'all 0.18s ease',
                      fontFamily: 'IBM Plex Mono, monospace',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.7)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.45)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <FontAwesomeIcon icon={faFolderOpen} style={{ fontSize: '16px', color: '#AC8E66' }} />
                      <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '10px', color: '#AC8E66', opacity: 0.6 }} />
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 200, color: '#1a1a1a' }}>
                        Mobile Inbox Ordner einstellen
                      </p>
                      <p style={{ margin: 0, fontSize: '9px', color: '#7a7060', lineHeight: 1.45 }}>
                        Öffnet direkt die Systemeinstellungen im Tab Mobile.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {currentStudio.useCases.map((uc) => (
                    <button
                      key={uc.title}
                      onClick={uc.action}
                      style={{
                        borderRadius: '12px',
                        border: '0.5px solid rgba(172,142,102,0.35)',
                        background: 'rgba(255,255,255,0.45)',
                        padding: '16px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        transition: 'all 0.18s ease',
                        fontFamily: 'IBM Plex Mono, monospace',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.7)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.45)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <FontAwesomeIcon icon={uc.icon} style={{ fontSize: '16px', color: '#AC8E66' }} />
                        <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '10px', color: '#AC8E66', opacity: 0.6 }} />
                      </div>
                      <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 200, color: '#1a1a1a' }}>
                          {uc.title}
                        </p>
                        <p style={{ margin: 0, fontSize: '9px', color: '#7a7060', lineHeight: 1.45 }}>
                          {uc.description}
                        </p>
                      </div>
                    </button>
                  ))}

                  {/* Server Artikel card — only for content-ai */}
                  {activeStudio === 'content-ai' && (
                    <button
                      onClick={() => { void loadServerArticles(); }}
                      style={{
                        borderRadius: '12px',
                        border: '0.5px solid rgba(31,138,65,0.4)',
                        background: serverArticles !== null ? 'rgba(31,138,65,0.08)' : 'rgba(255,255,255,0.45)',
                        padding: '16px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        transition: 'all 0.18s ease',
                        fontFamily: 'IBM Plex Mono, monospace',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(31,138,65,0.15)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = serverArticles !== null ? 'rgba(31,138,65,0.08)' : 'rgba(255,255,255,0.45)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <FontAwesomeIcon
                          icon={serverLoading ? faSpinner : faServer}
                          spin={serverLoading}
                          style={{ fontSize: '16px', color: '#1F8A41' }}
                        />
                        <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '10px', color: '#1F8A41', opacity: 0.6 }} />
                      </div>
                      <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 200, color: '#1a1a1a' }}>
                          Server Artikel
                        </p>
                        <p style={{ margin: 0, fontSize: '9px', color: '#7a7060', lineHeight: 1.45 }}>
                          {serverArticles !== null
                            ? `${serverArticles.length} Artikel gefunden`
                            : 'Artikel vom Server laden'}
                        </p>
                      </div>
                    </button>
                  )}
                </div>

                {/* Delete toast */}
                {deleteToast && (
                  <div style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: 'rgba(31,111,63,0.12)',
                    border: '0.5px solid rgba(31,138,65,0.4)',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '10px',
                    color: '#1F6F3F',
                  }}>
                    {deleteToast}
                  </div>
                )}

                {/* Server article list */}
                {serverArticles !== null && activeStudio === 'content-ai' && (
                  <div
                    style={{
                      border: '0.5px solid rgba(31,138,65,0.3)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      background: 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {serverError && (
                      <div
                        style={{
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: '10px',
                            color: '#B3261E',
                            fontFamily: 'IBM Plex Mono, monospace',
                            flex: 1,
                            minWidth: '220px',
                          }}
                        >
                          {getFriendlyServerError(serverError)}
                        </p>
                        <button
                          onClick={() => onOpenApiSettings?.()}
                          style={{
                            border: '0.5px solid rgba(179,38,30,0.45)',
                            borderRadius: '8px',
                            background: 'rgba(179,38,30,0.08)',
                            color: '#8f1d16',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '9px',
                            padding: '6px 10px',
                            cursor: onOpenApiSettings ? 'pointer' : 'not-allowed',
                            opacity: onOpenApiSettings ? 1 : 0.6,
                          }}
                          disabled={!onOpenApiSettings}
                          title="API-Einstellungen öffnen"
                        >
                          API jetzt öffnen
                        </button>
                      </div>
                    )}
                    {serverArticles.length === 0 && !serverError && (
                      <p style={{ margin: 0, padding: '12px 16px', fontSize: '10px', color: '#7a7060', fontFamily: 'IBM Plex Mono, monospace' }}>
                        Keine Artikel gefunden.
                      </p>
                    )}
                    {serverArticles.map((article, i) => {
                      const slug = typeof article === 'string' ? article : article.slug;
                      const title = typeof article === 'string' ? article : (article.title || article.slug);
                      const date = typeof article === 'string' ? '' : (article.date ?? '');
                      const isConfirming = confirmingDeleteSlug === slug;
                      const isDeleting = deletingSlug === slug;
                      return (
                        <div
                          key={slug}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            borderTop: i > 0 ? '0.5px solid rgba(31,138,65,0.15)' : 'none',
                          }}
                        >
                          <button
                            onClick={() => onOpenServerArticle?.(slug)}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 16px',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              fontFamily: 'IBM Plex Mono, monospace',
                              textAlign: 'left',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(31,138,65,0.08)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '10px', color: '#1a1a1a', fontWeight: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {title}
                              </div>
                              {date && (
                                <div style={{ fontSize: '9px', color: '#7a7060', marginTop: '2px' }}>{date}</div>
                              )}
                            </div>
                            <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '9px', color: '#1F8A41', marginLeft: '8px', flexShrink: 0 }} />
                          </button>
                          <button
                            disabled={isDeleting}
                            onClick={() => {
                              if (isConfirming) {
                                void deleteServerArticle(slug);
                              } else {
                                setConfirmingDeleteSlug(slug);
                                setTimeout(() => setConfirmingDeleteSlug((s) => s === slug ? null : s), 3000);
                              }
                            }}
                            style={{
                              flexShrink: 0,
                              padding: '6px 10px',
                              marginRight: '8px',
                              border: isConfirming ? '0.5px solid rgba(180,30,30,0.4)' : '0.5px solid rgba(172,142,102,0.3)',
                              borderRadius: '6px',
                              background: isConfirming ? 'rgba(180,30,30,0.08)' : 'transparent',
                              color: isConfirming ? '#B3261E' : '#8a7a6a',
                              fontFamily: 'IBM Plex Mono, monospace',
                              fontSize: '9px',
                              cursor: isDeleting ? 'default' : 'pointer',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.15s',
                            }}
                          >
                            {isDeleting ? '…' : isConfirming ? 'Löschen?' : '×'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recent items */}
        {sortedRecent.length > 0 && (
          <div style={{ marginTop: '28px' }}>
            <h2
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '16px',
                color: '#e5e5e5',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
              }}
            >
              <span style={{ fontSize: '9px', fontWeight: '100', color: '#777' }}>Zuletzt bearbeitet</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sortedRecent.map((item) => (
                <RecentItemCard
                  key={item.id}
                  item={item}
                  onClick={() => onContinueRecent?.(item)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <ZenPlannerModal
        isOpen={showPlannerModal}
        onClose={() => setShowPlannerModal(false)}
        scheduledPosts={scheduledPosts}
        projectPath={projectPath}
        onScheduledPostsChange={setScheduledPosts}
        posts={[]}
        onScheduleSave={() => setShowPlannerModal(false)}
        onEditPost={() => {}}
        onAddPost={() => {}}
        defaultTab="planen"
      />
    </div>
  );
}

interface RecentItemCardProps {
  item: GettingStartedRecentItem;
  onClick: () => void;
}

const RecentItemCard = ({ item, onClick }: RecentItemCardProps) => {
  const sourceLabel = item.source === 'doc-studio' ? 'Doc Studio' : 'Content AI';

  return (
    <button
      onClick={onClick}
      style={{
        border: '1px solid #2A2A2A',
        borderRadius: '12px',
        padding: '14px 18px',
        background: 'transparent',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: 'IBM Plex Mono, monospace',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        color: '#e5e5e5',
        textAlign: 'left',
        width: '100%',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.border = '0.5px solid #AC8E66';
        e.currentTarget.style.backgroundColor = '#111';
        e.currentTarget.style.transform = 'translateX(5px)';
        e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.33)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.border = '0.5px solid #2a2a2a';
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.transform = 'translateX(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ fontSize: '10px', fontWeight: 200, color: '#e5e5e5' }}>{item.title}</div>
          <span
            style={{
              border: '0.5px dotted #3A3328',
              color: '#c9ab82',
              borderRadius: '999px',
              fontSize: '9px',
              padding: '1px 7px',
            }}
          >
            {sourceLabel}
          </span>
        </div>
        <div style={{ fontSize: '10px', color: '#777' }}>
          Zuletzt bearbeitet: {new Date(item.updatedAt).toLocaleDateString('de-DE')}
          {item.subtitle ? ` · ${item.subtitle}` : ''}
        </div>
      </div>
      <div style={{ fontSize: '10px', color: '#AC8E66' }}>Fortsetzen</div>
    </button>
  );
};
