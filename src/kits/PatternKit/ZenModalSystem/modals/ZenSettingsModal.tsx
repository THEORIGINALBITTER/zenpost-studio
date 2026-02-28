import { useState, useEffect } from 'react';
import { ZenModal } from '../components/ZenModal';
import { MODAL_CONTENT } from '../config/ZenModalConfig';
import { ZenAISettingsContent } from './components/ZenAISettingsContent';
import { ZenSocialMediaSettingsContent } from './components/ZenSocialMediaSettingsContent';
import { ZenEditorSettingsContent } from './components/ZenEditorSettingsContent';
import { ZenLicenseSettingsContent } from './components/ZenLicenseSettingsContent';
import { ZenLocalAISetupContent } from './components/ZenLocalAISetupContent';
import { ZenStudioSettingsContent } from './components/ZenStudioSettingsContent';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faShareNodes, faPenNib, faIdCard, faServer, faLightbulb } from '@fortawesome/free-solid-svg-icons';

interface ZenSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  defaultTab?: 'ai' | 'social' | 'editor' | 'license' | 'localai' | 'zenstudio';
  defaultSocialTab?: 'twitter' | 'reddit' | 'linkedin' | 'devto' | 'medium' | 'github';
  showMissingSocialHint?: boolean;
  missingSocialLabel?: string;
  onOpenZenThoughtsEditor?: (content: string, filePath?: string) => void;
}

type TabType = 'ai' | 'localai' | 'social' | 'editor' | 'license' | 'zenstudio';

const TABS: { id: TabType; label: string; icon: typeof faRobot }[] = [
  { id: 'ai', label: 'AI', icon: faRobot },
  { id: 'localai', label: 'Lokale AI', icon: faServer },
  { id: 'social', label: 'Social Media', icon: faShareNodes },
  { id: 'editor', label: 'Editor', icon: faPenNib },
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

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, isOpen]);

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
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          height: 'calc(90vh - 74px)',
          overflow: 'hidden',
        }}
      >
        {/* Sidebar */}
        <nav
          style={{
            width: 180,
            minWidth: 180,
            background: 'linear-gradient(0deg, #0B0B0B 0%, #171717 100%)',
            borderRadius: '0 0 0 12px',
            display: 'flex',
            flexDirection: 'column',
            paddingTop: 8,
            paddingBottom: 8,
            overflowY: 'auto',
          }}
        >
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
                    ? 'rgba(172, 142, 102, 0.12)'
                    : isHovered
                    ? 'rgba(172, 142, 102, 0.06)'
                    : 'transparent',
                  borderTop: 'none',
                  borderRight: 'none',
                  borderBottom: 'none',
                  borderLeft: `3px solid ${isActive ? '#AC8E66' : isHovered ? 'rgba(172,142,102,0.35)' : 'transparent'}`,
                  color: isActive ? '#AC8E66' : isHovered ? '#aaaaaa' : '#777777',
                  cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 11,
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 0.15s',
                }}
              >
                <FontAwesomeIcon
                  icon={tab.icon}
                  style={{ width: 14, flexShrink: 0, color: isActive ? '#AC8E66' : isHovered ? '#999' : '#555' }}
                />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Content Panel */}
        <div
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
          {activeTab === 'social' && (
            <ZenSocialMediaSettingsContent
              initialTab={defaultSocialTab}
              showMissingConfigHint={showMissingSocialHint}
              missingPlatformLabel={missingSocialLabel}
            />
          )}
          {activeTab === 'editor' && <ZenEditorSettingsContent />}
          {activeTab === 'zenstudio' && (
            <ZenStudioSettingsContent onOpenZenThoughtsEditor={onOpenZenThoughtsEditor} />
          )}
          {activeTab === 'license' && <ZenLicenseSettingsContent />}
        </div>
      </div>
    </ZenModal>
  );
};
