import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faBook,
  faCalendarDays,
  faFileLines,
  faFolderOpen,
  faPencil,
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
  recentItems?: GettingStartedRecentItem[];
  onContinueRecent?: (item: GettingStartedRecentItem) => void;
}

type StudioId = 'doc-studio' | 'content-ai' | 'converter';

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

export function GettingStartedScreen({
  onBack: _onBack,
  onOpenDocStudio,
  onOpenContentAI,
  onOpenConverter,
  recentItems = [],
  onContinueRecent,
}: GettingStartedScreenProps) {
  const [zenStudioSettings] = useState(() => loadZenStudioSettings());
  const [projectPath] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('zenpost_last_project_path');
  });
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [activeStudio, setActiveStudio] = useState<StudioId>('doc-studio');

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
          title: 'Content transformieren',
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
          description: 'Markdown, Text und strukturierte Inhalte bereinigen/konvertieren',
          icon: faFileLines,
          action: () => onOpenConverter?.(),
        },
      ],
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
                    border: isActive ? '1px solid #b8b0a0' : '0.5px solid #3A3A3A',
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
                </button>
              );
            })}
          </div>

          {/* Active studio card (beige) */}
          <div
            style={{
              flex: 1,
              borderRadius: '0 14px 14px 0',
              border: '1px solid #b8b0a0',
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

            {/* Use case cards */}
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
            </div>
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
