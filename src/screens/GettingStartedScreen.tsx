import { useState, useEffect } from 'react';
import { useOpenExternal } from '../hooks/useOpenExternal';
import { loadMobileDrafts, type MobileDraft } from '../services/mobileInboxService';
import { listCloudDocuments, canUploadToZenCloud } from '../services/cloudStorageService';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faBook,
  faCalendarDays,
  faCloudArrowUp,
  faCode,
  faFileLines,
  faFolderOpen,
  faGear,
  faImages,
  faMobileScreen,
  faNoteSticky,
  faPencil,
  faQrcode,
  faServer,
  faSpinner,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import { ZenPlannerModal } from '../kits/PatternKit/ZenModalSystem/modals/ZenPlannerModal';
import { ZenThoughtLine } from '../components/ZenThoughtLine';
import { StudioActionCard } from '../components/StudioActionCard';
import { openAppSettings } from '../services/appShellBridgeService';
import { loadZenStudioSettings } from '../services/zenStudioSettingsService';
import { subscribeToCloudSessionSync } from '../services/cloudSessionSyncService';
import { loadLocalZenNoteMeta } from '../services/zenNoteMetaService';
import { resolveZenNoteFolderColor, resolveZenNoteTagColor } from '../services/zenNoteColorService';
import * as QRCode from 'qrcode';



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
  onOpenDocStudioWizard?: (wizard: 'github' | 'docs-site' ) => void;
  onOpenContentAI?: () => void;
  onOpenConverter?: () => void;
  onOpenConverterSettings?: () => void;
  onOpenImageGallery?: () => void;
  onOpenZenNote?: () => void;
  onOpenMobileInbox?: () => void;
  onOpenMobileSettings?: () => void;
  onOpenApiSettings?: () => void;
  onOpenServerArticle?: (slug: string) => void;
}

type StudioId = 'doc-studio' | 'content-ai' | 'converter' | 'mobile' | 'zen-note';
const MOBILE_DEV_BLOG_URL = 'https://zenpostapp.denisbitter.de';
const MOBILE_DEV_BLOG_QR_FALLBACK_SRC = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&format=png&bgcolor=transparent&data=${encodeURIComponent(MOBILE_DEV_BLOG_URL)}`;

interface StudioDef {
  id: StudioId;
  label: string;
  shortLabel: string;
  description: string;
  useCases: {
    title: string;
    description: string;
    icon: any;
    action?: () => void;
    statusText?: string;
    disabledHint?: string;
  }[];
}

type ServerSlugItem = { slug: string; title?: string; date?: string };

const SidebarTab = ({ studio, isActive, onClick }: { studio: StudioDef; isActive: boolean; onClick: () => void }) => {
  const [hovered, setHovered] = useState(false);
  const showHover = hovered && !isActive;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '40px',
        height: '100px',
        borderRadius: '10px 0 0 10px',
        borderTop: isActive ? '1px solid #3e362c' : `0.5px solid ${showHover ? '#AC8E66' : '#3A3A3A'}`,
        borderLeft: isActive ? '1px solid #3e362c' : `0.5px solid ${showHover ? '#AC8E66' : '#3A3A3A'}`,
        borderBottom: isActive ? '1px solid #3e362c' : `0.5px solid ${showHover ? '#AC8E66' : '#3A3A3A'}`,
        borderRight: 'none',
        background: isActive ? '#d0cbb8' : showHover ? '#242424' : '#1a1a1a',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        transition: 'background 0.2s, border-color 0.2s',
        position: 'relative',
        zIndex: isActive ? 20 : 10,
        overflow: 'hidden',
      }}
    >
      {/* Label fade: text ↔ "→" on hover */}
      <div style={{ 
        position: 'relative', 
        width: '100%', 
        height: '80px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' }}>
        <span style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '9px',
          color: isActive ? '#1a1a1a' : '#e8e3d8',
          whiteSpace: 'nowrap',
          letterSpacing: '0.3px',
          position: 'absolute',
          opacity: showHover ? 0 : 1,
          transition: 'opacity 0.18s ease',
        }}>
          {studio.shortLabel}
        </span>
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '13px',
          color: '#d0cbb8',
          position: 'absolute',
          opacity: showHover ? 1 : 0,
          transition: 'opacity 0.18s ease',
        }}>
          →
        </span>
      </div>
      {studio.id === 'mobile' && (
        <span style={{
          position: 'absolute', top: '6px', right: '3px',
          fontSize: '8px', fontFamily: 'IBM Plex Mono, monospace',
          color: isActive ? '#7a5a30' : '#e8e3d8',
          background: isActive ? 'rgba(172,142,102,0.25)' : 'rgba(172,142,102,0.15)',
          borderRadius: '3px', padding: '1px 4px',
          border: '0.5px solid rgba(172,142,102,0.5)',
          writingMode: 'horizontal-tb', letterSpacing: '0.5px', lineHeight: 1,
        }}>
          BETA
        </span>
      )}
    </button>
  );
};

export function GettingStartedScreen({
  onBack: _onBack,
  onOpenDocStudio,
  onOpenDocStudioWizard,
  onOpenContentAI,
  onOpenConverter,
  onOpenConverterSettings,
  onOpenImageGallery,
  onOpenZenNote,
  onOpenMobileInbox,
  onOpenMobileSettings,
  onOpenApiSettings,
  onOpenServerArticle,
}: GettingStartedScreenProps) {
  const { openExternal } = useOpenExternal();
  const isDesktopRuntime = isTauri();
  const [zenStudioSettings] = useState(() => loadZenStudioSettings());
  const [projectPath] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('zenpost_last_project_path');
  });
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [activeStudio, setActiveStudio] = useState<StudioId>('content-ai');
  const [mobileDrafts, setMobileDrafts] = useState<MobileDraft[]>([]);
  const [serverArticles, setServerArticles] = useState<ServerSlugItem[] | null>(null);
  const [serverLoading, setServerLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmingDeleteSlug, setConfirmingDeleteSlug] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);
  const [devBlogQrSrc, setDevBlogQrSrc] = useState(MOBILE_DEV_BLOG_QR_FALLBACK_SRC);
  const [zenNoteRecent, setZenNoteRecent] = useState<Array<{ id: number; title: string; tag: string; folder: string }>>([]);
  const [zenNoteRecentLoading, setZenNoteRecentLoading] = useState(false);

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
    const activeServer = settings.servers?.[settings.activeServerIndex ?? 0];
    const localCachePath = (
      activeServer?.contentServerLocalCachePath
      ?? settings.contentServerLocalCachePath
      ?? ''
    ).trim();
    if (!localCachePath) {
      setServerError('Lokaler Server-Cache-Pfad fehlt. Bitte in Einstellungen → API setzen.');
      setServerArticles([]);
      return;
    }
    let base = (settings.contentServerApiUrl ?? '').trim();
    if (!base) {
      setServerError('Keine Server-URL konfiguriert. Bitte in Einstellungen → API eintragen.');
      setServerArticles([]);
      return;
    }
    if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
    const endpoint = (settings.contentServerListEndpoint ?? '/articles.php').trim();
    const url = /^https?:\/\//i.test(endpoint) ? endpoint : `${base.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
    setServerLoading(true);
    setServerError(null);
    try {
      const headers: Record<string, string> = {};
      if (settings.contentServerApiKey) headers['Authorization'] = `Bearer ${settings.contentServerApiKey}`;
      let listText: string;
      let listStatus: number;
      if (isTauri()) {
        const res = await invoke<{ status: number; body: string }>('http_fetch', {
          request: { url, method: 'GET', headers, body: null },
        });
        listStatus = res.status;
        listText = res.body;
      } else {
        const res = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(10000) });
        listStatus = res.status;
        listText = await res.text();
      }
      if (listStatus < 200 || listStatus >= 300) throw new Error(`HTTP ${listStatus}`);
      const data = JSON.parse(listText) as unknown;
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
      let deleteStatus: number;
      if (isTauri()) {
        const res = await invoke<{ status: number; body: string }>('http_fetch', {
          request: { url, method: 'DELETE', headers, body: null },
        });
        deleteStatus = res.status;
      } else {
        const res = await fetch(url, { method: 'DELETE', headers });
        deleteStatus = res.status;
      }
      if (deleteStatus < 200 || deleteStatus >= 300) throw new Error(`HTTP ${deleteStatus}`);
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

  useEffect(() => {
    if (activeStudio !== 'zen-note') return;
    const settings = loadZenStudioSettings();
    const projectId = settings.cloudProjectId;
    if (!projectId) return;
    setZenNoteRecentLoading(true);
    listCloudDocuments(projectId).then((docs) => {
      if (!docs) { setZenNoteRecentLoading(false); return; }
      const parsed = docs
        .filter((d) => d.fileName.endsWith('.zennote'))
        .map((d) => {
          const base = d.fileName.replace(/\.zennote$/, '');
          let folder = '';
          let rest = base;
          const atIdx = base.indexOf('@@');
          if (atIdx !== -1) { folder = base.slice(0, atIdx); rest = base.slice(atIdx + 2); }
          const sep = rest.lastIndexOf('__');
          const tag = sep !== -1 && /^[a-zA-Z0-9_-]+$/.test(rest.slice(sep + 2)) ? rest.slice(sep + 2) : '';
          const title = sep !== -1 && tag ? rest.slice(0, sep) : rest;
          return { id: d.id, title, tag, folder };
        })
        .slice(0, 8);
      setZenNoteRecent(parsed);
      setZenNoteRecentLoading(false);
    });
  }, [activeStudio]);

  useEffect(() => {
    return subscribeToCloudSessionSync(({ current, reason }) => {
      if (activeStudio !== 'zen-note') return;
      if (!current.projectId) {
        setZenNoteRecent([]);
        setZenNoteRecentLoading(false);
        return;
      }
      if (reason === 'login' || reason === 'project-change' || reason === 'focus') {
        const settings = loadZenStudioSettings();
        const projectId = settings.cloudProjectId;
        if (!projectId) return;
        setZenNoteRecentLoading(true);
        listCloudDocuments(projectId).then((docs) => {
          if (!docs) { setZenNoteRecentLoading(false); return; }
          const parsed = docs
            .filter((d) => d.fileName.endsWith('.zennote'))
            .map((d) => {
              const base = d.fileName.replace(/\.zennote$/, '');
              let folder = '';
              let rest = base;
              const atIdx = base.indexOf('@@');
              if (atIdx !== -1) { folder = base.slice(0, atIdx); rest = base.slice(atIdx + 2); }
              const sep = rest.lastIndexOf('__');
              const tag = sep !== -1 && /^[a-zA-Z0-9_-]+$/.test(rest.slice(sep + 2)) ? rest.slice(sep + 2) : '';
              const title = sep !== -1 && tag ? rest.slice(0, sep) : rest;
              return { id: d.id, title, tag, folder };
            })
            .slice(0, 8);
          setZenNoteRecent(parsed);
          setZenNoteRecentLoading(false);
        });
      }
    }, { intervalMs: 5000 });
  }, [activeStudio]);

  useEffect(() => {
    let isMounted = true;
    void QRCode.toDataURL(MOBILE_DEV_BLOG_URL, {
      margin: 1,
      width: 240,
      color: { dark: '#000000', light: '#0000' },
    })
      .then((dataUrl) => {
        if (isMounted) setDevBlogQrSrc(dataUrl);
      })
      .catch(() => {
        if (isMounted) setDevBlogQrSrc(MOBILE_DEV_BLOG_QR_FALLBACK_SRC);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenDevBlog = () => {
    void openExternal(MOBILE_DEV_BLOG_URL);
  };

  const studios: StudioDef[] = [
    {
      id: 'content-ai',
      label: 'Content AI',
      shortLabel: 'Content AI',
      description: '1mal schreiben. 9mal transformieren für Social Media, Artikel und Blog',
      useCases: [
        {
          title: 'Dokumenten Dashboard',
          description: 'LinkedIn, X, Medium , Dev, Substack und mehr ',
          icon: faWandMagicSparkles,
          action: () => onOpenContentAI?.(),
        },
        {
          title: 'Artikel schreiben',
          description: 'Hier haben deine Gedanken platzt',
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
      id: 'doc-studio',
      label: 'Doc Studio',
      shortLabel: 'Doc Studio',
      description: isDesktopRuntime
        ? 'Technische Dokumentation, README und Code-Doku erstellen'
        : 'Technische Dokumentation ist nur in der Desktop-App verfuegbar',
      useCases: [
        {
          title: 'Dokumenten Dahsboard',
          description: 'Projektdateien öffnen, fortsetzen und gezielt weiterbearbeiten',
          icon: faFolderOpen,
          action: isDesktopRuntime ? () => onOpenDocStudio?.() : undefined,
          disabledHint: isDesktopRuntime ? undefined : 'Nur in der Desktop-App verfuegbar',
        },
        {
          title: 'Code dokumentieren',
          description: 'README, API-Docs, Changelog und technische Doku erstellen',
          icon: faBook,
          action: isDesktopRuntime ? () => onOpenDocStudio?.() : undefined,
          disabledHint: isDesktopRuntime ? undefined : 'Nur in der Desktop-App verfuegbar',
        },
        {
          title: 'Docs Wizard',
          description: 'GitHub Pages, Templates und Docs-Website aus Markdown generieren',
          icon: faCloudArrowUp,
          action: isDesktopRuntime ? () => onOpenDocStudioWizard?.('docs-site') : undefined,
          disabledHint: isDesktopRuntime ? undefined : 'Nur in der Desktop-App verfuegbar',
        },
      ],
    },
    {
      id: 'zen-note',
      label: 'ZenNote',
      shortLabel: 'ZenNote',
      description: 'Cloud-Notizen & Code-Snippets — direkt in den Editor einfügen',
      useCases: [
        {
          title: 'Notizen & Snippets',
          description: 'Markdown-Notizen und Code-Snippets in der Cloud speichern',
          icon: faNoteSticky,
          action: () => onOpenZenNote?.(),
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
          statusText: loadZenStudioSettings().cloudProjectId
            ? 'Bilder optional direkt in ZenCloud speichern'
            : 'Mit ZenCloud Bilder projektbezogen speichern',
        },
     
        ...(canUploadToZenCloud() ? [{
          title: 'ZenImage Gallery',
          description: 'Cloud-Bilder verwalten, hochladen und URLs kopieren',
          icon: faImages,
          action: () => onOpenImageGallery?.(),
          statusText: loadZenStudioSettings().cloudProjectName ?? 'ZenCloud',
        }] : []),
           {
          title: 'Converter Einstellungen',
          description: 'Zielordner, Browser-Speicher und ZenCloud fuer Bilder konfigurieren',
          icon: faGear,
          action: () => onOpenConverterSettings?.(),
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

  const visibleStudios = isDesktopRuntime
    ? studios
    : studios.filter((studio) => studio.id !== 'doc-studio');
  const currentStudio = visibleStudios.find((s) => s.id === activeStudio) ?? visibleStudios[0];


  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        backgroundColor: '#e8e3d8',
        color: '#252525',
        padding: '28px 36px 20px',
        overflowY: 'auto',
      }}
    >
      <style>
        {`
          .zen-getting-started-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(172,142,102,0.58) rgba(255,255,255,0.04);
          }
          .zen-getting-started-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .zen-getting-started-scroll::-webkit-scrollbar-track {
            background: rgba(255,255,255,0.04);
            border-radius: 999px;
          }
          .zen-getting-started-scroll::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, rgba(208,203,184,0.54), rgba(172,142,102,0.82));
            border-radius: 999px;
            border: 1px solid rgba(26,26,26,0.16);
          }
          .zen-getting-started-scroll::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, rgba(231,204,170,0.74), rgba(172,142,102,0.96));
          }
        `}
      </style>
      <div style={{ maxWidth: '1120px', width: '100%', margin: '0 auto' }}>

        {/* Header */}
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '20px',
           
            margin: '0 0 8px 0',
            padding: '15px',
            color: '#3e362c',
            letterSpacing: '0.4px',
          }}
        >
          Was möchtest du heute machen?
          <br />
           <span style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '10px',
          
          color: '#3e362c',
          letterSpacing: '0.3px',
          margin: '0 0 0 0px',
          padding: 0,
        }}>
          1mal schreiben · 9mal transformieren · lokal · deine KI
        </span>
        </p>

       

        <ZenThoughtLine
          thoughts={zenStudioSettings.thoughts}
          visible={zenStudioSettings.showInGettingStarted}
        />

        {/* Studio Tab-Reiter Card */}
        <div
          style={{
            marginTop: '28px',
            display: 'flex',
            alignItems: 'stretch',
            maxHeight: 'min(72vh, 720px)',
          }}
        >

          {/* Left: vertical studio tabs */}
          <div
            className="zen-getting-started-scroll"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              paddingTop: '12px',
              marginRight: '-1px',
              position: 'relative',
              zIndex: 5,
              maxHeight: '100%',
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingRight: '4px',
              scrollbarWidth: 'thin',
            }}
          >
            {visibleStudios.map((studio) => {
              const isActive = studio.id === activeStudio;
              return (
                <SidebarTab
                  key={studio.id}
                  studio={studio}
                  isActive={isActive}
                  onClick={() => setActiveStudio(studio.id)}
                />
              );
            })}
          </div>

          {/* Active studio card (beige) */}
          <div
            className="zen-getting-started-scroll"
            style={{
              flex: 1,
              borderRadius: '0 14px 14px 0',
              borderTop: '0.5px solid #3e362c',
              borderRight: '0.5px solid #3e362c',
              borderBottom: '0.5px solid #3e362c',
              borderLeft: '0.5px solid #3e362c',
              background: '#d0cbb8',
              padding: '24px 28px',
              boxShadow: '4px 4px 20px rgba(0,0,0,0.25)',
              zIndex: 5,
              maxHeight: '100%',
              overflowY: 'auto',
              overflowX: 'hidden',
              scrollbarWidth: 'thin',
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
                  <StudioActionCard
                    onClick={() => onOpenMobileInbox?.()}
                    surface="paper"
                    title="Inbox abrufen"
                    description="Mobile Entwürfe öffnen und in Content AI weiterbearbeiten."
                    icon={<FontAwesomeIcon icon={faMobileScreen} />}
                    statusText={
                      isTauri()
                        ? `${mobileDrafts.length} Entwurf${mobileDrafts.length !== 1 ? 'e' : ''} gefunden`
                        : 'Desktop-App oder ZenCloud erforderlich'
                    }
                  >
                  </StudioActionCard>

                  <StudioActionCard
                    onClick={handleOpenDevBlog}
                    surface="paper"
                    title="App in Entwicklung"
                    description="Scan & folge dem Prozess auf zenpostapp.denisbitter.de"
                    icon={<FontAwesomeIcon icon={faCode} />}
                    trailing={<FontAwesomeIcon icon={faQrcode} />}
                  >
                    <div
                      style={{
                        alignSelf: 'center',
                        width: 96,
                        height: 96,
                        border: '1px solid rgba(172,142,102,0.35)',
                        borderRadius: 8,
                        backgroundColor: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <img src={devBlogQrSrc} alt="QR-Code Dev Blog" style={{ width: '100%', height: '100%' }} />
                    </div>
                  </StudioActionCard>

                  <StudioActionCard
                    onClick={() => onOpenMobileSettings?.()}
                    surface="paper"
                    title="Mobile Inbox Ordner einstellen"
                    description="Öffnet direkt die Systemeinstellungen im Tab Mobile."
                    icon={<FontAwesomeIcon icon={faFolderOpen} />}
                  />
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
                    <StudioActionCard
                      key={uc.title}
                      onClick={uc.action}
                      surface="paper"
                      title={uc.title}
                      description={uc.description}
                      icon={<FontAwesomeIcon icon={uc.icon} />}
                      statusText={uc.statusText}
                      disabledHint={uc.disabledHint}
                    />
                  ))}

                  {/* Server Artikel card — only for content-ai with configured REST API server */}
                  {activeStudio === 'content-ai' && !!(zenStudioSettings.servers?.some((s) => !!s.contentServerApiUrl) || zenStudioSettings.contentServerApiUrl) && (
                    <StudioActionCard
                      onClick={() => { void loadServerArticles(); }}
                      surface="paper"
                      title="Server Artikel"
                      description={serverArticles !== null
                        ? `${serverArticles.length} Artikel gefunden`
                        : 'Artikel vom Server per API laden'}
                      icon={
                        <FontAwesomeIcon
                          icon={serverLoading ? faSpinner : faServer}
                          spin={serverLoading}
                        />
                      }
                      accentColor="#1F8A41"
                      highlighted={serverArticles !== null}
                    />
                  )}
                </div>

                {/* Delete toast */}
                {deleteToast && (
                  <div style={{
                    padding: '8px 14px',
                    borderRadius: '3px',
                    background: 'rgba(31,111,63,0.12)',
                    border: '0.5px solid rgba(31,138,65,0.4)',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '10px',
                    color: '#1F6F3F',
                  }}>
                    {deleteToast}
                  </div>
                )}

                {/* ZenNote recent list */}
                {activeStudio === 'zen-note' && (() => {
                  const { folderColors, tagColors } = loadLocalZenNoteMeta();
                  const gold = '#AC8E66';
                  return (
                  <div style={{
                    border: '0.5px solid rgba(172,142,102,0.3)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.3)',
                    maxHeight: '260px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    <div style={{
                      padding: '10px 16px',
                      borderBottom: '0.5px solid rgba(172,142,102,0.2)',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '9px',
                      color: '#7a7060',
                      letterSpacing: '0.08em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                      <FontAwesomeIcon icon={faNoteSticky} style={{ color: '#3e362c', fontSize: 10 }} />
                      LETZTE NOTIZEN
                      {zenNoteRecentLoading && <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 10, color: '#3e362c' }} />}
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                    {zenNoteRecent.length === 0 && !zenNoteRecentLoading ? (
                      <div style={{ 
                        padding: '12px 16px', 
                        fontFamily: 'IBM Plex Mono, monospace', 
                        fontSize: '10px', 
                        color: '#aaa' }}>
                        {loadZenStudioSettings().cloudProjectId ? 'Keine Notizen vorhanden' : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                            <span>Nicht eingeloggt — ZenCloud konfigurieren</span>
                            <button
                              className="zen-gold-btn"
                              onClick={() => openAppSettings('cloud')}
                            >
                              Anmelden
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      zenNoteRecent.map((note) => {
                        const folderColor = note.folder ? resolveZenNoteFolderColor(note.folder, folderColors, gold) : null;
                        const tagColor = note.tag ? resolveZenNoteTagColor(note.tag, tagColors) : null;
                        return (
                        <button
                          key={note.id}
                          onClick={() => onOpenZenNote?.()}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 16px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: '0.5px solid rgba(172,142,102,0.12)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontFamily: 'IBM Plex Mono, monospace',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(172,142,102,0.08)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          {note.folder && folderColor ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '8px', color: '#252525', background: `${folderColor}80`, border: `1px solid ${folderColor}50`, borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>
                              <FontAwesomeIcon icon={faNoteSticky} style={{ fontSize: 9, color: '#252525' }} />
                              {note.folder}
                            </span>
                          ) : (
                            <FontAwesomeIcon icon={faNoteSticky} style={{ fontSize: 11, color: tagColor ?? '#3e362c', flexShrink: 0 }} />
                          )}
                          <span style={{ flex: 1, fontSize: '10px', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {note.title}
                          </span>
                          {note.tag && tagColor &&  (
                            <span style={{ fontSize: '8px', color: '#252525', background: `${tagColor}80`, border: `1px solid ${tagColor}50`, borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>
                              {note.tag}
                            </span>
                          )}
                          <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: 9, color: '#AC8E66', opacity: 0.5, flexShrink: 0 }} />
                        </button>
                        );
                      })
                    )}
                    </div>
                  </div>
                  );
                })()}

                {/* Server article list */}
                {serverArticles !== null && activeStudio === 'content-ai' && (
                  <div
                    style={{
             
                      padding: '2px',
                      overflow: 'hidden',
                      boxShadow: 'none',
                   

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
                      <p style={{ margin: 0, 
                      padding: '12px 16px', 
                      fontSize: '12px', 
                      color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace' }}>
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
                              padding: '10px 25px',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              fontFamily: 'IBM Plex Mono, monospace',
                              textAlign: 'left',
                              boxShadow: 'none',
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
                                boxShadow: 'none',
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



