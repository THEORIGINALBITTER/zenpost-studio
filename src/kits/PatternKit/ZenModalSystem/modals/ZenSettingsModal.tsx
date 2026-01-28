import { useState, useEffect } from 'react';
import { ZenModal } from '../components/ZenModal';
import { ZenModalHeader } from '../components/ZenModalHeader';
import { ZenRoughButton } from '../components/ZenRoughButton';
import { ZenAISettingsContent } from './components/ZenAISettingsContent';
import { ZenSocialMediaSettingsContent } from './components/ZenSocialMediaSettingsContent';
import { ZenEditorSettingsContent } from './components/ZenEditorSettingsContent';
import { ZenLicenseSettingsContent } from './components/ZenLicenseSettingsContent';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faShareNodes, faPenNib, faIdCard } from '@fortawesome/free-solid-svg-icons';

interface ZenSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  defaultTab?: 'ai' | 'social' | 'editor' | 'license';
  defaultSocialTab?: 'twitter' | 'reddit' | 'linkedin' | 'devto' | 'medium' | 'github';
  showMissingSocialHint?: boolean;
  missingSocialLabel?: string;
}

type TabType = 'ai' | 'social' | 'editor' | 'license';

export const ZenSettingsModal = ({
  isOpen,
  onClose,
  onSave,
  defaultTab = 'ai',
  defaultSocialTab,
  showMissingSocialHint = false,
  missingSocialLabel,
}: ZenSettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [isCompactTabs, setIsCompactTabs] = useState(false);
  const [tabButtonWidth, setTabButtonWidth] = useState(220);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, isOpen]);

  useEffect(() => {
    const updateSize = () => {
      const compact = window.innerWidth < 900;
      setIsCompactTabs(compact);
      if (compact) {
        const width = Math.max(180, Math.min(260, window.innerWidth - 140));
        setTabButtonWidth(width);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleSave = () => {
    // Save logic is handled by individual tab components (auto-save)
    onSave?.();
    onClose();
  };

  return (
    <ZenModal isOpen={isOpen} onClose={onClose} size="xl" showCloseButton={false}>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          backgroundColor: '#1E1E1E',
          borderRadius: 12,
          minHeight: '600px',
          maxHeight: '85vh',
        }}
      >
        {/* Fixed Header */}
        <div
          style={{
            padding: '32px 32px 24px 32px',
            borderBottom: '1px solid #AC8E66',
            backgroundColor: '#1E1E1E',
          }}
        >
          <ZenModalHeader
            title="System Einstellungen"
            subtitle="AI Provider & Social Media APIs konfigurieren"
            titleColor="#AC8E66"
            subtitleColor="#777"
            titleSize="13px"
            subtitleSize="11px"
            onClose={onClose}
            onSave={handleSave}
          />

          {/* Tabs - Simplified */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 32,
              justifyContent: 'center',
              flexWrap: 'wrap',
              flexDirection: isCompactTabs ? 'column' : 'row',
              alignItems: 'center',
            }}
          >
            <ZenRoughButton
              label="AI Einstellungen"
              icon={<FontAwesomeIcon icon={faRobot} />}
              onClick={() => {
                console.log('AI Tab clicked');
                setActiveTab('ai');
              }}
              variant={activeTab === 'ai' ? 'active' : 'default'}
              size={isCompactTabs ? 'small' : 'default'}
              width={isCompactTabs ? tabButtonWidth : undefined}
              height={isCompactTabs ? 44 : undefined}
            />

            <ZenRoughButton
              label="Social Media APIs"
              icon={<FontAwesomeIcon icon={faShareNodes} />}
              onClick={() => {
                console.log('Social Tab clicked');
                setActiveTab('social');
              }}
              variant={activeTab === 'social' ? 'active' : 'default'}
              size={isCompactTabs ? 'small' : 'default'}
              width={isCompactTabs ? tabButtonWidth : undefined}
              height={isCompactTabs ? 44 : undefined}
            />

            <ZenRoughButton
              label="Editor"
              icon={<FontAwesomeIcon icon={faPenNib} />}
              onClick={() => {
                console.log('Editor Tab clicked');
                setActiveTab('editor');
              }}
              variant={activeTab === 'editor' ? 'active' : 'default'}
              size={isCompactTabs ? 'small' : 'default'}
              width={isCompactTabs ? tabButtonWidth : undefined}
              height={isCompactTabs ? 44 : undefined}
            />

            <ZenRoughButton
              label="Lizenz & Account"
              icon={<FontAwesomeIcon icon={faIdCard} />}
              onClick={() => {
                console.log('License Tab clicked');
                setActiveTab('license');
              }}
              variant={activeTab === 'license' ? 'active' : 'default'}
              size={isCompactTabs ? 'small' : 'default'}
              width={isCompactTabs ? tabButtonWidth : undefined}
              height={isCompactTabs ? 44 : undefined}
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingTop: '24px',
          }}
        >
          {activeTab === 'ai' && <ZenAISettingsContent />}
          {activeTab === 'social' && (
            <ZenSocialMediaSettingsContent
              initialTab={defaultSocialTab}
              showMissingConfigHint={showMissingSocialHint}
              missingPlatformLabel={missingSocialLabel}
            />
          )}
          {activeTab === 'editor' && <ZenEditorSettingsContent />}
          {activeTab === 'license' && <ZenLicenseSettingsContent />}
        </div>
      </div>
    </ZenModal>
  );
};
