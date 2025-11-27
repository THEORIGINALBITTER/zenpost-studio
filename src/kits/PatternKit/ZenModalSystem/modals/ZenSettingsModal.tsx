import { useState } from 'react';
import { ZenModal } from '../components/ZenModal';
import { ZenModalHeader } from '../components/ZenModalHeader';
import { ZenModalFooter } from '../components/ZenModalFooter';
import { ZenRoughButton } from '../components/ZenRoughButton';
import { ZenAISettingsContent } from './components/ZenAISettingsContent';
import { ZenSocialMediaSettingsContent } from './components/ZenSocialMediaSettingsContent';

interface ZenSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  defaultTab?: 'ai' | 'social';
}

type TabType = 'ai' | 'social';

export const ZenSettingsModal = ({
  isOpen,
  onClose,
  onSave,
  defaultTab = 'ai',
}: ZenSettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleSave = () => {
    try {
      setSaveStatus('saving');
      // Save logic is handled by individual tab components
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
        onSave?.();
        onClose();
      }, 1000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const tabs = [
    { id: 'ai' as TabType, label: 'AI Einstellungen', icon: '🤖' },
    { id: 'social' as TabType, label: 'Social Media APIs', icon: '🌐' },
  ];

  return (
    <ZenModal isOpen={isOpen} onClose={onClose} size="xl">
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          backgroundColor: '#1E1E1E',
          borderWidth: 1,
          borderColor: '#3a3a3a',
          borderRadius: 12,
          minHeight: '600px',
          maxHeight: '85vh',
        }}
      >
        {/* Fixed Header */}
        <div
          style={{
            padding: 32,
            paddingBottom: 24,
            borderBottomWidth: 1,
            borderBottomColor: '#AC8E66',
            position: 'relative',
            zIndex: 10,
          }}
        >
          <ZenModalHeader
            title="System Einstellungen"
            subtitle="AI Provider & Social Media APIs konfigurieren"
            titleColor="#AC8E66"
            subtitleColor="#777"
            titleSize="24px"
            subtitleSize="11px"
            onClose={onClose}
            onSave={handleSave}
          />

          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 24,
              borderBottomWidth: 1,
              borderBottomColor: '#3a3a3a',
              justifyContent: 'center',
            }}
          >
            {tabs.map((tab) => (
              <div key={tab.id} style={{ position: 'relative' }}>
                <ZenRoughButton
                  label={tab.label}
                  icon={tab.icon}
                  onClick={() => setActiveTab(tab.id)}
                  variant={activeTab === tab.id ? 'active' : 'default'}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {activeTab === 'ai' && <ZenAISettingsContent />}
          {activeTab === 'social' && <ZenSocialMediaSettingsContent />}
        </div>

        {/* Footer */}
        <ZenModalFooter>
          <ZenRoughButton label="Abbrechen" onClick={onClose} />
          <ZenRoughButton
            label={
              saveStatus === 'saving'
                ? 'Speichern...'
                : saveStatus === 'saved'
                ? '✓ Gespeichert!'
                : saveStatus === 'error'
                ? 'Fehler beim Speichern'
                : 'Speichern'
            }
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            variant="active"
          />
        </ZenModalFooter>
      </div>
    </ZenModal>
  );
};
