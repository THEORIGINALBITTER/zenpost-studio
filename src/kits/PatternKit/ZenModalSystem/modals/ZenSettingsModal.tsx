import { useState, useEffect } from 'react';
import { ZenModal } from '../components/ZenModal';
import { MODAL_CONTENT } from '../config/ZenModalConfig';
import { ZenAISettingsContent } from './components/ZenAISettingsContent';
import { ZenSocialMediaSettingsContent } from './components/ZenSocialMediaSettingsContent';
import { ZenEditorSettingsContent } from './components/ZenEditorSettingsContent';
import { ZenLicenseSettingsContent } from './components/ZenLicenseSettingsContent';
import { ZenLocalAISetupContent } from './components/ZenLocalAISetupContent';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faShareNodes, faPenNib, faIdCard, faServer } from '@fortawesome/free-solid-svg-icons';

interface ZenSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  defaultTab?: 'ai' | 'social' | 'editor' | 'license' | 'localai';
  defaultSocialTab?: 'twitter' | 'reddit' | 'linkedin' | 'devto' | 'medium' | 'github';
  showMissingSocialHint?: boolean;
  missingSocialLabel?: string;
}

type TabType = 'ai' | 'localai' | 'social' | 'editor' | 'license';

export const ZenSettingsModal = ({
  isOpen,
  onClose,
  onSave: _onSave,
  defaultTab = 'ai',
  defaultSocialTab,
  showMissingSocialHint = false,
  missingSocialLabel,
}: ZenSettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [isCompactTabs, setIsCompactTabs] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, isOpen]);

  useEffect(() => {
    const updateSize = () => {
      setIsCompactTabs(window.innerWidth < 900);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);


  // Modal-Content aus zentraler Config
  const content = MODAL_CONTENT.settings;

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={content.title}
      subtitle={content.subtitle}
      headerAlign="center"
      showCloseButton={true}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          borderRadius: 12,
          height: '85vh',
          maxHeight: '85vh',
        }}
      >
        {/* Sticky Tabs */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            padding: '24px 24px 20px 24px',
            marginBottom: '-40px',
            background: 'linear-gradient(180deg, #EDE6D8 0%, #E7DFD0 100%)',
            boxShadow: '0 -1px 5px rgba(0, 0, 0, 0.15)',
            borderRadius: '12px 12px 0 0',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: isCompactTabs ? 4 : 6,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {[
              { id: 'ai' as TabType, label: 'AI Einstellungen', icon: faRobot },
              { id: 'localai' as TabType, label: 'Lokale KI', icon: faServer },
              { id: 'social' as TabType, label: 'Social Media APIs', icon: faShareNodes },
              { id: 'editor' as TabType, label: 'Editor', icon: faPenNib },
              { id: 'license' as TabType, label: 'Lizenz & Account', icon: faIdCard },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    transform: 'translateY(20px)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: isCompactTabs ? '8px 12px' : '10px 20px',
                    minWidth: isCompactTabs ? '120px' : '150px',
                    height: '40px',
                    background: isActive
                      ? '#151515'
                      : 'transparent',
                    border: isActive
                    ? `2px 2px 0 0 solid #EDE6D8`
                    : `2px 2px 0 0 solid #EDE6D8`,
                    borderRadius: '12px 12px 0 0',
                    boxShadow: isActive
                      ? '0 -4px 12px rgba(172, 142, 102, 0.25)'
                      : '0 -2px 8px rgba(0, 0, 0, 0.15)',
                    cursor: 'pointer',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: isCompactTabs ? '10px' : '10px',
                    color:  isActive
                      ? '#AC8E66'
                    : '#151515',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = '#AC8E66';
                      e.currentTarget.style.boxShadow = '0 -4px 12px rgba(172, 142, 102, 0.2)';
                      e.currentTarget.style.transform = 'translateY(19px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = '#EDE6D8';
                      e.currentTarget.style.boxShadow = '0 -2px 8px rgba(0, 0, 0, 0.15)';
                      e.currentTarget.style.transform = 'translateY(20px)';
                    }
                  }}
                >
                  <FontAwesomeIcon
                    icon={tab.icon}
                    style={{ color: '#AC8E66', fontSize: isCompactTabs ? '10px' : '10px' }}
                  />
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingTop: '100px',
            background: 'linear-gradie, #EDE6D8 0%, #E7DFD0 100%)',
           
            borderRadius: '12px 12px 0 0',
          }}
        >
                 {activeTab === 'editor' && <ZenEditorSettingsContent />}
          {activeTab === 'ai' && <ZenAISettingsContent onSwitchTab={(tab) => setActiveTab(tab as TabType)} />}
          {activeTab === 'localai' && <ZenLocalAISetupContent />}
          {activeTab === 'social' && (
            <ZenSocialMediaSettingsContent
              initialTab={defaultSocialTab}
              showMissingConfigHint={showMissingSocialHint}
              missingPlatformLabel={missingSocialLabel}
            />
          )}
   
          {activeTab === 'license' && <ZenLicenseSettingsContent />}
        </div>
      </div>
    </ZenModal>
  );
};
