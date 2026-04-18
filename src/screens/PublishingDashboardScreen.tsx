import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagicWandSparkles,
  faFolderOpen,
  faArrowRotateRight,
  faWrench,
} from '@fortawesome/free-solid-svg-icons';
import { ZenRoughButton } from '../kits/PatternKit/ZenModalSystem';
import { StudioActionCard } from '../components/StudioActionCard';
import {
  initializePublishingProject,
  loadArticles,
  type ZenArticle,
} from '../services/publishingService';
import { getLastProjectPath, rememberProjectPath } from '../utils/projectHistory';

interface PublishingDashboardScreenProps {
  onBack: () => void;
  onOpenContentAI?: () => void;
  onOpenConverter?: () => void;
}

export function PublishingDashboardScreen({ onBack: _onBack, onOpenContentAI, onOpenConverter }: PublishingDashboardScreenProps) {
  const [projectPath, setProjectPath] = useState<string | null>(() => {
    return getLastProjectPath();
  });
  const [articles, setArticles] = useState<ZenArticle[]>([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);

  const persistProjectPath = (path: string) => {
    setProjectPath(path);
    rememberProjectPath(path);
  };

  const handleSelectProject = async () => {
    try {
      const result = await open({ directory: true, multiple: false, title: 'Projektordner wählen' });
      if (typeof result === 'string') {
        persistProjectPath(result);
        await loadArticlesData(result);
      }
    } catch (error) {
      console.error('[PublishingDashboard] Projektwahl abgebrochen oder fehlgeschlagen.', error);
    }
  };

  const loadArticlesData = useCallback(
    async (path: string, forceRescan = false) => {
      try {
        setIsLoadingArticles(true);
        await initializePublishingProject(path);
        const list = await loadArticles(path, forceRescan);
        setArticles(list);
      } catch (error) {
        console.error('[PublishingDashboard] Artikel konnten nicht geladen werden:', error);
      } finally {
        setIsLoadingArticles(false);
      }
    },
    []
  );

  useEffect(() => {
    if (projectPath) {
      loadArticlesData(projectPath);
    }
  }, [projectPath, loadArticlesData]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#1A1A1A',
        color: '#e5e5e5',
        padding: '32px',
        overflow: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
        }}
      >
        <div>
          <h1 style={{ fontFamily: 'monospace', fontSize: '28px', margin: 0, color: '#AC8E66' }}>
            Publishing Dashboard
   
          <p style={{ fontFamily: 'monospace', fontSize: '12px', color: '#999', marginTop: '8px'}}>
            Dein zentraler Startpunkt für Content Management
          </p>
                 </h1>
        </div>
  
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontFamily: 'monospace', fontSize: '16px', margin: 0, color: '#e5e5e5', marginBottom: '16px' }}>
          Studios & Tools
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          <StudioActionCard
            icon={<FontAwesomeIcon icon={faMagicWandSparkles} />}
            title="Content AI Studio"
            description="Artikel schreiben & transformieren"
            onClick={onOpenContentAI}
            surface="dark"
            highlighted
          />
          <StudioActionCard
            icon={<FontAwesomeIcon icon={faWrench} />}
            title="Converter"
            description="Format-Konvertierung"
            onClick={onOpenConverter}
            surface="dark"
          />
        </div>
      </div>

      {/* Project Selection */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
          <ZenRoughButton
            label={projectPath ? "Projekt wechseln" : "Projekt wählen"}
            icon={<FontAwesomeIcon icon={faFolderOpen} />}
            onClick={handleSelectProject}
            variant="default"
          />
          {projectPath && (
            <ZenRoughButton
              label="Refresh"
              icon={<FontAwesomeIcon icon={faArrowRotateRight} />}
              onClick={() => loadArticlesData(projectPath, true)}
              disabled={isLoadingArticles}
            />
          )}
        </div>
        {projectPath && (
          <div style={{
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#777',
            paddingLeft: '8px',
            borderLeft: '2px solid #AC8E66',
            marginLeft: '4px'
          }}>
            {projectPath}
          </div>
        )}
      </div>

      {/* Articles List */}
      <div>
        <h2 style={{ fontFamily: 'monospace', fontSize: '16px', margin: 0, color: '#e5e5e5', marginBottom: '16px' }}>
          Deine Artikel ({articles.length})
        </h2>

        {!projectPath ? (
          <div style={emptyStateStyle}>
            <FontAwesomeIcon icon={faFolderOpen} style={{ fontSize: '48px', color: '#3A3A3A', marginBottom: '16px' }} />
            <p style={{ fontFamily: 'monospace', fontSize: '13px', color: '#999', margin: 0 }}>
              Wähle zuerst einen Projektordner, um deine Artikel zu sehen
            </p>
          </div>
        ) : articles.length === 0 ? (
          <div style={emptyStateStyle}>
            <FontAwesomeIcon icon={faMagicWandSparkles} style={{ fontSize: '48px', color: '#3A3A3A', marginBottom: '16px' }} />
            <p style={{ fontFamily: 'monospace', fontSize: '13px', color: '#999', margin: 0, marginBottom: '16px' }}>
              Noch keine Artikel vorhanden
            </p>
            <ZenRoughButton
              label="Ersten Artikel schreiben"
              icon={<FontAwesomeIcon icon={faMagicWandSparkles} />}
              onClick={onOpenContentAI}
              variant="default"
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onClick={() => {
                  // TODO: Open article in Content AI Studio for editing
                  console.log('Edit article:', article.id);
                  onOpenContentAI?.();
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Article Card Component
interface ArticleCardProps {
  article: ZenArticle;
  onClick: () => void;
}

const ArticleCard = ({ article, onClick }: ArticleCardProps) => (
  <button
    onClick={onClick}
    style={{
      border: '1px solid #3A3A3A',
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
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = '#AC8E66';
      e.currentTarget.style.backgroundColor = '#111';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = '#3A3A3A';
      e.currentTarget.style.backgroundColor = '#0A0A0A';
    }}
  >
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#e5e5e5', marginBottom: '4px' }}>
        {article.title}
      </div>
      {article.subtitle && (
        <div style={{ fontSize: '11px', color: '#777', marginBottom: '6px' }}>
          {article.subtitle}
        </div>
      )}
      <div style={{ fontSize: '10px', color: '#555', display: 'flex', gap: '12px' }}>
        <span>Erstellt: {new Date(article.createdAt).toLocaleDateString('de-DE')}</span>
        {article.publishDate && <span>• Veröffentlicht: {article.publishDate}</span>}
      </div>
    </div>
    <div style={{ fontSize: '11px', color: '#AC8E66' }}>
      Bearbeiten →
    </div>
  </button>
);

const emptyStateStyle: CSSProperties = {
  border: '1px dashed #3A3A3A',
  borderRadius: '12px',
  padding: '48px',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '200px',
};
