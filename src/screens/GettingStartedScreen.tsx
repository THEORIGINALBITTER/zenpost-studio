import { useCallback, useEffect, useState } from 'react';
import {  ZenFooterText} from "../kits/PatternKit/ZenModalSystem";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBook,
  faMagicWandSparkles,
  faFileLines,
  faCalendarDays,
  faPencil,
  faFolderOpen,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import { ZenPlannerModal } from '../kits/PatternKit/ZenModalSystem/modals/ZenPlannerModal';
import {
  initializePublishingProject,
  loadArticles,
  type ZenArticle,
} from '../services/publishingService';
import type { ScheduledPost } from '../types/scheduling';

interface GettingStartedScreenProps {
  onBack: () => void;
  onOpenDocStudio?: () => void;
  onOpenContentAI?: () => void;
  onOpenConverter?: () => void;
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
}: GettingStartedScreenProps) {
  const [projectPath] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('zenpost_last_project_path');
  });
  const [recentArticles, setRecentArticles] = useState<ZenArticle[]>([]);
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);

  const loadRecentArticles = useCallback(async (path: string) => {
    try {
      await initializePublishingProject(path);
      const list = await loadArticles(path);
      setRecentArticles(list.slice(0, 3)); // Only show 3 most recent
    } catch (error) {
      console.error('[GettingStarted] Artikel konnten nicht geladen werden:', error);
    }
  }, []);

  useEffect(() => {
    if (projectPath) {
      loadRecentArticles(projectPath);
    }
  }, [projectPath, loadRecentArticles]);

  const useCases: UseCaseCardData[] = [
    {
      id: 'document-code',
      title: 'Ich will meinen Code dokumentieren',
      description: 'README, API-Docs, Changelog automatisch erstellen',
      icon: faBook,
      action: () => onOpenDocStudio?.(),
    },
    {
      id: 'social-media',
      title: 'Ich will Content für Social Media erstellen',
      description: 'Text transformieren für LinkedIn, Twitter, Medium & mehr',
      icon: faMagicWandSparkles,
      action: () => onOpenContentAI?.(),
    },
    {
      id: 'convert-markdown',
      title: 'Ich will mein Markdown konvertieren',
      description: 'Format-Konvertierung und Bereinigung',
      icon: faFileLines,
      action: () => onOpenConverter?.(),
    },
    {
      id: 'schedule-posts',
      title: 'Ich will meine Posts planen',
      description: 'Content-Kalender und Scheduling',
      icon: faCalendarDays,
      action: () => setShowPlannerModal(true),
    },
    {
      id: 'write-article',
      title: 'Ich will einen Blog-Artikel schreiben',
      description: 'Neuen Blog-Post mit KI-Unterstützung erstellen',
      icon: faPencil,
      action: () => onOpenContentAI?.(),
    },
    {
      id: 'manage-articles',
      title: 'Ich will meine Artikel verwalten',
      description: 'Gespeicherte Artikel bearbeiten und organisieren',
      icon: faFolderOpen,
      action: () => onOpenContentAI?.(),
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'transparent',
        color: '#e5e5e5',
        padding: '32px',
        overflow: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: 'monospace',
            fontSize: '23px',
            margin: '10px',
            color: '#AC8E66',
          }}
        >
          Was möchtest du heute machen?
        </h1>
        <p
          style={{
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#777',
            marginTop: '12px',
          }}
        >
          Wähle eine Aufgabe, um loszulegen
        </p>
      </div>

      {/* Use-Case Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          maxWidth: '1000px',
          margin: '0 auto',
          width: '100%',
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

      {/* Weitermachen Section */}
      {recentArticles.length > 0 && (
        <div style={{ marginTop: '48px', maxWidth: '1000px', margin: '48px auto 0', width: '100%' }}>
          <h2
            style={{
              fontFamily: 'monospace',
              fontSize: '18px',
              color: '#e5e5e5',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ color: '#AC8E66' }}>Weitermachen</span>
            <span style={{ fontSize: '12px', color: '#777' }}>
              — Zuletzt bearbeitet
            </span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentArticles.map((article) => (
              <RecentArticleCard
                key={article.id}
                article={article}
                onClick={() => onOpenContentAI?.()}
              />
            ))}
          </div>
        </div>
      )}

      {/* Planner Modal */}
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

// Use-Case Card Component
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
      borderRadius: '16px',
      padding: '24px',
      background: 'linear-gradient(145deg, #1A1A1A, #0A0A0A)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
      fontFamily: 'monospace',
      cursor: 'pointer',
      transition: 'all 0.25s ease',
      color: '#e5e5e5',
      textAlign: 'left',
      width: '100%',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = '#AC8E66';
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 8px 24px rgba(172, 142, 102, 0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = '#3A3A3A';
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <div
      style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: 'rgba(172, 142, 102, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <FontAwesomeIcon icon={icon} style={{ fontSize: '20px', color: '#AC8E66' }} />
    </div>
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: '#e5e5e5',
          marginBottom: '6px',
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: '12px', color: '#777', lineHeight: 1.4 }}>
        {description}
      </div>
    </div>
    <FontAwesomeIcon
      icon={faArrowRight}
      style={{ fontSize: '14px', color: '#AC8E66', marginTop: '4px' }}
    />
  </button>
);



        {/* Copyright Footer */}
        <ZenFooterText className="mb-8 border-t border-[#AC8E66]"  />

// Recent Article Card Component
interface RecentArticleCardProps {
  article: ZenArticle;
  onClick: () => void;
}

const RecentArticleCard = ({ article, onClick }: RecentArticleCardProps) => (
  <button
    onClick={onClick}
    style={{
      border: '1px solid #2A2A2A',
      borderRadius: '12px',
      padding: '16px 20px',
      background: '#0A0A0A',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontFamily: 'monospace',
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
      e.currentTarget.style.backgroundColor = '#0A0A0A';
    }}
  >
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#e5e5e5',
          marginBottom: '4px',
        }}
      >
        {article.title}
      </div>
      <div style={{ fontSize: '10px', color: '#555' }}>
        Zuletzt bearbeitet: {new Date(article.updatedAt || article.createdAt).toLocaleDateString('de-DE')}
      </div>
    </div>
    <div style={{ fontSize: '11px', color: '#AC8E66' }}>Fortsetzen</div>
  </button>
);
