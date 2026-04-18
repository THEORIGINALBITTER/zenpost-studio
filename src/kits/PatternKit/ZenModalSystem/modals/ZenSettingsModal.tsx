import { useState, useEffect, useRef } from 'react';
import { exportAllSettingsAsFile, importAllSettingsFromFile } from '../../../../services/zenStudioSettingsService';
import { ZenModal } from '../components/ZenModal';
import { MODAL_CONTENT } from '../config/ZenModalConfig';
import { ZenAISettingsContent } from './components/ZenAISettingsContent';
import { ZenSocialMediaSettingsContent } from './components/ZenSocialMediaSettingsContent';
import { ZenEditorSettingsContent } from './components/ZenEditorSettingsContent';
import { ZenLicenseSettingsContent } from './components/ZenLicenseSettingsContent';
import { ZenLocalAISetupContent } from './components/ZenLocalAISetupContent';
import { ZenStudioSettingsContent } from './components/ZenStudioSettingsContent';
import { ZenMobileSettingsContent } from './components/ZenMobileSettingsContent';
import { ZenApiSettingsContent } from './components/ZenApiSettingsContent';
import { ZenEngineSettingsContent } from './components/ZenEngineSettingsContent';
import { ZenNewsletterSettingsContent } from './components/ZenNewsletterSettingsContent';
import { ZenConverterSettingsContent } from './components/ZenConverterSettingsContent';
import { ZenCloudSettingsContent } from './components/ZenCloudSettingsContent';
import { ZenPlannerSettingsContent } from './components/ZenPlannerSettingsContent';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faShareNodes, faPenNib, faIdCard, faServer, faLightbulb, faMobileScreen, faPlug, faBolt, faEnvelope, faArrowsRotate, faCloud, faCalendarDays } from '@fortawesome/free-solid-svg-icons';

interface ZenSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  defaultTab?: 'ai' | 'social' | 'editor' | 'license' | 'localai' | 'api' | 'zenstudio' | 'mobile' | 'cloud' | 'converter';
  defaultSocialTab?: 'twitter' | 'reddit' | 'linkedin' | 'devto' | 'medium' | 'github';
  showMissingSocialHint?: boolean;
  missingSocialLabel?: string;
  onOpenZenThoughtsEditor?: (content: string, filePath?: string) => void;
}

type TabType = 'ai' | 'localai' | 'social' | 'editor' | 'license' | 'api' | 'zenstudio' | 'mobile' | 'zenengine' | 'newsletter' | 'converter' | 'cloud' | 'planner';

const TABS: { id: TabType; label: string; icon: typeof faRobot }[] = [
  { id: 'cloud', label: 'ZenCloud', icon: faCloud },
  { id: 'ai', label: 'AI', icon: faRobot },
  { id: 'localai', label: 'Lokale AI', icon: faServer },
  { id: 'social', label: 'Media API', icon: faShareNodes },
  { id: 'api', label: 'Server API', icon: faPlug },
  { id: 'editor', label: 'Editor', icon: faPenNib },
  { id: 'mobile', label: 'Mobile APP', icon: faMobileScreen },
  { id: 'zenengine', label: 'ZenEngine', icon: faBolt },
  { id: 'newsletter', label: 'Newsletter', icon: faEnvelope },
  { id: 'converter', label: 'Converter', icon: faArrowsRotate },
  { id: 'planner', label: 'Planner', icon: faCalendarDays },
  { id: 'zenstudio', label: 'ZenGedanken', icon: faLightbulb },
  { id: 'license', label: 'Lizenz', icon: faIdCard },
];

export const ZenSettingsModal = ({
  isOpen,
  onClose,
  onSave: _onSave,
  defaultTab = 'ai',
  defaultSocialTab,
  showMissingSocialHint = false,
  missingSocialLabel,
  onOpenZenThoughtsEditor,
}: ZenSettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [hoveredTab, setHoveredTab] = useState<TabType | null>(null);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const contentPanelRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const handleExportAll = () => {
    exportAllSettingsAsFile();
    setBackupMsg('Backup gespeichert unter Download');
    setTimeout(() => setBackupMsg(null), 5000);
  };

  const handleImportAll = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importAllSettingsFromFile(file);
      setBackupMsg('Settings wiederhergestellt — bitte neu starten');
    } catch (err) {
      setBackupMsg(err instanceof Error ? err.message : 'Fehler beim Import');
    }
    e.target.value = '';
    setTimeout(() => setBackupMsg(null), 5000);
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    contentPanelRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab, isOpen]);

  const content = MODAL_CONTENT.settings;

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      size="xxl"
      title={content.title}
      subtitle={content.subtitle}
      headerAlign="center"
      showCloseButton={true}
      bodyStyle={{ overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Sidebar */}
        <nav
          style={{
            width: 180,
            minWidth: 180,
            background: '#1a1a1a',
            borderRadius: '0 0 0 12px',
            display: 'flex',
            flexDirection: 'column',
            paddingTop: 8,
            paddingBottom: 8,
            overflow: 'hidden',
            flexShrink: 0,
            alignSelf: 'stretch',
          }}
        >
          {/* Backup — oben in Sidebar */}
          <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid rgba(172,142,102,0.25)' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#d0cbb8', marginBottom: 5, 
              letterSpacing: '0.12em', fontWeight: 600 }}>
        Einstellungen sichern</div>
            <button
              onClick={handleExportAll}
              style={{ width: '100%', padding: '6px 10px', marginBottom: 4, background: 'transparent', border: '1px solid rgba(172,142,102,0.45)', borderRadius: 4, color: '#C8A87A', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, cursor: 'pointer', textAlign: 'left' }}
            >
              ↓ Export
            </button>
            <label style={{ width: '100%', display: 'block', padding: '6px 10px', background: 'transparent', border: '1px solid rgba(172,142,102,0.25)', borderRadius: 4, 
              color: '#888', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, cursor: 'pointer' }}>
              ↑ Import
              <input ref={importInputRef} type="file" accept=".json" onChange={handleImportAll} style={{ display: 'none' }} />
            </label>
            {backupMsg && (
              <div style={{ marginTop: 5, fontFamily: 'IBM Plex Mono, monospace', 
              fontSize: 10, color: backupMsg.includes('Fehler') ? '#c0392b' : '#d0cbb8', lineHeight: 1.4 }}>
                {backupMsg}
              </div>
            )}
          </div>

          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const isHovered = hoveredTab === tab.id && !isActive;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                onMouseEnter={() => setHoveredTab(tab.id)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 20px',
                  background: isActive
                    ? '#d0cbb8'
                    : isHovered
                    ? 'rgba(172, 142, 102, 0.06)'
                    : 'transparent',
                  borderTop: 'none',
                  borderRight: 'none',
                  borderBottom: 'none',
                  borderLeft: `5px solid ${isActive ? '#AC8E66' : isHovered ? 'rgba(172,142,102,0.35)' : 'transparent'}`,
                  color: isActive ? '#1a1a1a' : isHovered ? '#aaaaaa' : '#777777',
                  cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 11,
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 0.15s',
                  borderRadius: '3px 0 0 3px',
                }}
              >
                <FontAwesomeIcon
                  icon={tab.icon}
                  style={{ width: 14, flexShrink: 0, color: isActive ? '#1a1a1a' : isHovered ? '#999' : '#555' }}
                />
                <div style={{ position: 'relative', overflow: 'hidden', height: '16px', flex: 1 }}>
                  <span style={{
                    position: 'absolute', top: 0, left: 0, whiteSpace: 'nowrap',
                    transform: isHovered ? 'translateY(-100%)' : 'translateY(0)',
                    opacity: isHovered ? 0 : 1,
                    transition: 'transform 0.22s ease, opacity 0.18s ease',
                  }}>
                    {tab.label}
                  </span>
                  <span style={{
                    position: 'absolute', top: 0, left: 0, whiteSpace: 'nowrap',
                    color: '#AC8E66',
                    transform: isHovered ? 'translateY(0)' : 'translateY(100%)',
                    opacity: isHovered ? 1 : 0,
                    transition: 'transform 0.22s ease, opacity 0.18s ease',
                  }}>
                    Öffnen →
                  </span>
                </div>
              </button>
            );
          })}

        </nav>

        {/* Content Panel */}
        <div
          ref={contentPanelRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            background: 'linear-gradient(180deg, #EDE6D8 0%, #E7DFD0 100%)',
            borderRadius: '0 0 12px 0',
          }}
        >
          {activeTab === 'ai' && (
            <ZenAISettingsContent onSwitchTab={(tab) => setActiveTab(tab as TabType)} />
          )}
          {activeTab === 'localai' && <ZenLocalAISetupContent />}
          {activeTab === 'api' && <ZenApiSettingsContent />}
          {activeTab === 'cloud' && <ZenCloudSettingsContent />}
          {activeTab === 'social' && (
            <ZenSocialMediaSettingsContent
              initialTab={defaultSocialTab}
              showMissingConfigHint={showMissingSocialHint}
              missingPlatformLabel={missingSocialLabel}
            />
          )}
          {activeTab === 'editor' && <ZenEditorSettingsContent />}
          {activeTab === 'mobile' && <ZenMobileSettingsContent />}
          {activeTab === 'zenstudio' && (
            <ZenStudioSettingsContent onOpenZenThoughtsEditor={onOpenZenThoughtsEditor} />
          )}
          {activeTab === 'zenengine' && <ZenEngineSettingsContent />}
          {activeTab === 'newsletter' && <ZenNewsletterSettingsContent />}
          {activeTab === 'converter' && <ZenConverterSettingsContent />}
          {activeTab === 'planner' && <ZenPlannerSettingsContent />}
          {activeTab === 'license' && <ZenLicenseSettingsContent />}
        </div>
      </div>
    </ZenModal>
  );
};
