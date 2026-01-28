import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faCog,
} from '@fortawesome/free-solid-svg-icons';
import {
  faLinkedin,
  faTwitter,
  faReddit,
  faGithub,
  faDev,
  faMedium,
} from '@fortawesome/free-brands-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { ZenModal } from '../components/ZenModal';
import { ZenModalHeader } from '../components/ZenModalHeader';
import { ZenModalFooter } from '../components/ZenModalFooter';
import { ZenRoughButton } from '../components/ZenRoughButton';
import { getModalPreset } from '../config/ZenModalConfig';
import {
  SocialPlatform,
  loadSocialConfig,
  isPlatformConfigured,
} from '../../../../services/socialMediaService';

interface ZenPostenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlatforms: (platforms: SocialPlatform[]) => void;
  currentPlatform?: SocialPlatform | null;
}

interface PlatformInfo {
  name: string;
  icon: IconDefinition;
  color: string;
}

const PLATFORM_INFO: Record<SocialPlatform, PlatformInfo> = {
  linkedin: { name: 'LinkedIn', icon: faLinkedin, color: '#0077B5' },
  twitter: { name: 'Twitter', icon: faTwitter, color: '#1DA1F2' },
  reddit: { name: 'Reddit', icon: faReddit, color: '#FF4500' },
  devto: { name: 'Dev.to', icon: faDev, color: '#0A0A0A' },
  medium: { name: 'Medium', icon: faMedium, color: '#00AB6C' },
  github: { name: 'GitHub', icon: faGithub, color: '#181717' },
};

const ALL_PLATFORMS: SocialPlatform[] = ['linkedin', 'twitter', 'reddit', 'devto', 'medium', 'github'];

export const ZenPostenModal = ({
  isOpen,
  onClose,
  onSelectPlatforms,
  currentPlatform,
}: ZenPostenModalProps) => {
  const modalPreset = getModalPreset('posten-select');
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
  const [configuredPlatforms, setConfiguredPlatforms] = useState<Set<SocialPlatform>>(new Set());

  // Load configuration status on open
  useEffect(() => {
    if (isOpen) {
      const loadConfig = async () => {
        const config = await loadSocialConfig();
        const configured = new Set<SocialPlatform>();

        for (const platform of ALL_PLATFORMS) {
          if (isPlatformConfigured(platform, config)) {
            configured.add(platform);
          }
        }

        setConfiguredPlatforms(configured);
      };

      loadConfig();

      // Pre-select current platform if provided
      if (currentPlatform && !selectedPlatforms.includes(currentPlatform)) {
        setSelectedPlatforms([currentPlatform]);
      }
    }
  }, [isOpen, currentPlatform]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSelectedPlatforms([]);
    }
  }, [isOpen]);

  const togglePlatform = (platform: SocialPlatform) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platform)) {
        return prev.filter(p => p !== platform);
      } else {
        return [...prev, platform];
      }
    });
  };

  const handleContinue = () => {
    if (selectedPlatforms.length > 0) {
      onSelectPlatforms(selectedPlatforms);
    }
  };

  const isConfigured = (platform: SocialPlatform) => configuredPlatforms.has(platform);
  const isSelected = (platform: SocialPlatform) => selectedPlatforms.includes(platform);

  return (
    <ZenModal isOpen={isOpen} onClose={onClose}>
      <div
        className="relative flex flex-col"
        style={{ minHeight: modalPreset.minHeight, minWidth: modalPreset.minWidth }}
      >
        {/* Content */}
        <div className="flex-1 flex flex-col gap-4 p-8 pt-16 overflow-y-auto">

          {/* Header */}
          <ZenModalHeader 
            title={modalPreset.title}
            subtitle={modalPreset.subtitle}
            titleColor={modalPreset.titleColor}
            subtitleColor={modalPreset.subtitleColor}
            titleSize={modalPreset.titleSize}
            subtitleSize={modalPreset.subtitleSize}
          />

          {/* Platform Grid */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {ALL_PLATFORMS.map((platform) => {
              const info = PLATFORM_INFO[platform];
              const configured = isConfigured(platform);
              const selected = isSelected(platform);

              return (
                <button
                  key={platform}
                  onClick={() => togglePlatform(platform)}
                  className={`
                    relative flex items-center gap-3 p-4 rounded-lg border-2 transition-all
                    ${selected
                      ? 'border-[#AC8E66] bg-[#2A2A2A]'
                      : 'border-[#3a3a3a] bg-[#1F1F1F] hover:border-[#555]'
                    }
                  `}
                  style={{ minHeight: '70px' }}
                >
                  {/* Checkbox indicator */}
                  <div
                    className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                      ${selected
                        ? 'border-[#AC8E66] bg-[#AC8E66]'
                        : 'border-[#555] bg-transparent'
                      }
                    `}
                  >
                    {selected && (
                      <FontAwesomeIcon icon={faCheck} className="text-[#1A1A1A] text-xs" />
                    )}
                  </div>

                  {/* Platform icon */}
                  <FontAwesomeIcon
                    icon={info.icon}
                    className={`text-xl ${selected ? 'text-[#AC8E66]' : 'text-[#777]'}`}
                  />

                  {/* Platform name */}
                  <span
                    className={`font-mono text-sm ${selected ? 'text-[#e5e5e5]' : 'text-[#999]'}`}
                  >
                    {info.name}
                  </span>

                  {/* Configuration status */}
                  {!configured && (
                    <div
                      className="absolute top-2 right-2"
                      title="Nicht konfiguriert"
                    >
                      <FontAwesomeIcon icon={faCog} className="text-[#555] text-xs" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Info text */}
          <div className="mt-4 p-3 bg-[#1A1A1A] rounded-lg border border-[#3A3A3A]">
            <p className="font-mono text-[11px] text-[#777] text-center">
              {selectedPlatforms.length === 0
                ? 'Wähle mindestens eine Plattform aus'
                : `${selectedPlatforms.length} Plattform${selectedPlatforms.length > 1 ? 'en' : ''} ausgewählt`
              }
            </p>
            {selectedPlatforms.some(p => !configuredPlatforms.has(p)) && (
              <p className="font-mono text-[10px] text-[#AC8E66] text-center mt-1">
                Hinweis: Einige Plattformen sind nicht konfiguriert
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-col items-center gap-2 justify-center mt-4 sm:flex-row sm:gap-4">
            <ZenRoughButton
              label="Abbrechen"
              onClick={onClose}
              size="small"
            />

            <ZenRoughButton
              label="Weiter"
              onClick={handleContinue}
              size="small"
              variant={selectedPlatforms.length > 0 ? 'active' : 'default'}
              disabled={selectedPlatforms.length === 0}
            />
          </div>
        </div>

        {/* Footer */}
        <ZenModalFooter />
      </div>
    </ZenModal>
  );
};
