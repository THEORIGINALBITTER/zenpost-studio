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

interface UseCaseCardData {
  id: string;
  title: string;
  description: string;
  icon: any;
  action: () => void;
}

export function GettingStartedScreen({
  onBack: _onBack,
  onOpenDocStudio,
  onOpenContentAI,
  onOpenConverter,
  recentItems = [],
  onContinueRecent,
}: GettingStartedScreenProps) {
  const [projectPath] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('zenpost_last_project_path');
  });
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);

  const useCases: UseCaseCardData[] = [
    {
      id: 'document-code',
      title: 'Code dokumentieren',
      description: 'README, API-Docs, Changelog und technische Doku erstellen',
      icon: faBook,
      action: () => onOpenDocStudio?.(),
    },
    {
      id: 'social-media',
      title: 'Content transformieren',
      description: 'Content AI Studio für LinkedIn, X, Medium und weitere Kanäle',
      icon: faWandMagicSparkles,
      action: () => onOpenContentAI?.(),
    },
    {
      id: 'convert-markdown',
      title: 'Dateiformate konvertieren',
      description: 'Markdown, Text und strukturierte Inhalte bereinigen/konvertieren',
      icon: faFileLines,
      action: () => onOpenConverter?.(),
    },
    {
      id: 'schedule-posts',
      title: 'Posts planen',
      description: 'Kalender, Scheduling und Veröffentlichungen vorbereiten',
      icon: faCalendarDays,
      action: () => setShowPlannerModal(true),
    },
    {
      id: 'write-article',
      title: 'Artikel schreiben',
      description: 'Direkt in Content AI Studio mit KI-Unterstützung starten',
      icon: faPencil,
      action: () => onOpenContentAI?.(),
    },
    {
      id: 'manage-articles',
      title: 'Dokumente verwalten',
      description: 'Projektdateien öffnen, fortsetzen und gezielt weiterbearbeiten',
      icon: faFolderOpen,
      action: () => onOpenDocStudio?.(),
    },
  ];

  const sortedRecent = [...recentItems].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6);

  return (
    <div
      style={{
        display: 'flex',
        paddingTop: '25px',
        flexDirection: 'column',
        minHeight: '100%',
        backgroundColor: 'transparent',
        color: '#e5e5e5',
        padding: '28px 36px 20px',
        overflowY: 'auto',
      }}
    >
      <div style={{ maxWidth: '1120px', width: '100%', margin: '0 auto' }}>
        <div
          style={{
            border: '1px solid rgba(172, 142, 102, 0.4)',
            borderRadius: '12px',
            padding: '26px 24px 20px',
            background: 'transparent',
            boxShadow: 'inset 0 0 28px rgba(0,0,0,0.35)',
            marginTop: '22px',
          }}
        >
          <h1
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '31px',
              margin: '0',
              padding: '15px',
              color: '#AC8E66',
              letterSpacing: '0.4px',
            }}
          >
            Was möchtest du heute machen?
          </h1>
       
        </div>

        <div
          style={{
            paddingTop: '150px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '16px',
          }}
        >
          {useCases.map((useCase) => (
            <UseCaseCard
              key={useCase.id}
              title={useCase.title}
              description={useCase.description}
              icon={useCase.icon}
              onClick={useCase.action}
            />
          ))}
        </div>

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
              <span style={{ color: '#AC8E66' }}>Weitermachen</span>
              <span style={{ fontSize: '11px', color: '#777' }}>— Zuletzt bearbeitet</span>
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

interface UseCaseCardProps {
  title: string;
  description: string;
  icon: any;
  onClick: () => void;
}

const UseCaseCard = ({ title, description, icon, onClick }: UseCaseCardProps) => (
  <button
    onClick={onClick}
    style={{
      border: '1px solid #3A3A3A',
      borderRadius: '14px',
      padding: '18px',
      background: 'linear-gradient(165deg, #161616 0%, #0A0A0A 100%)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      fontFamily: 'IBM Plex Mono, monospace',
      cursor: 'pointer',
      transition: 'all 0.22s ease',
      color: '#e5e5e5',
      textAlign: 'left',
      width: '100%',
      minHeight: '146px',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = '#AC8E66';
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.33)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = '#3A3A3A';
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <div
      style={{
        width: '42px',
        height: '42px',
        borderRadius: '10px',
        background: 'rgba(172, 142, 102, 0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <FontAwesomeIcon icon={icon} style={{ fontSize: '16px', color: '#AC8E66' }} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#efefef', marginBottom: '7px' }}>{title}</div>
      <div style={{ fontSize: '11px', color: '#7d7d7d', lineHeight: 1.45 }}>{description}</div>
    </div>
    <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '13px', color: '#AC8E66', marginTop: '5px' }} />
  </button>
);

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
        background: '#0B0B0B',
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
        e.currentTarget.style.borderColor = '#AC8E66';
        e.currentTarget.style.backgroundColor = '#111';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#2A2A2A';
        e.currentTarget.style.backgroundColor = '#0B0B0B';
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#e5e5e5' }}>{item.title}</div>
          <span
            style={{
              border: '1px solid #3A3328',
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
      <div style={{ fontSize: '11px', color: '#AC8E66' }}>Fortsetzen</div>
    </button>
  );
};
