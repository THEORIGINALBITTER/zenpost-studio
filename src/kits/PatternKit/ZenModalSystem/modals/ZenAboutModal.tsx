import { useState, useEffect } from "react";
import { ZenModal } from "../components/ZenModal";
import { ZenModalHeader } from "../components/ZenModalHeader";
import { ZenModalFooter } from "../components/ZenModalFooter";
import { ZenRoughButton } from "../components/ZenRoughButton";
import { getModalPreset } from "../config/ZenModalConfig";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faBook, faLifeRing, faCircleQuestion } from "@fortawesome/free-solid-svg-icons";
import { openUrl } from '@tauri-apps/plugin-opener';
import { WalkthroughOverlay } from "../../../HelpDocStudio/components/WalkthroughOverlay";
import { ABOUT_MODAL_STEPS } from "../../../HelpDocStudio/config/walkthroughSteps";

interface ZenAboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ZenAboutModal = ({ isOpen, onClose }: ZenAboutModalProps) => {
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const modalPreset = getModalPreset('about');

  // Reset walkthrough state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setShowWalkthrough(false);
    }
  }, [isOpen]);
  const links = [
    {
      icon: faBook,
      label: "Wiki & Docs",
      url: "https://theoriginalbitter.github.io/zenpost-studio/",
      description: "View documentation and guides",
    },
    {
      icon: faGithub,
      label: "GitHub",
      url: "https://github.com/THEORIGINALBITTER/zenpost-studio",
      description: "View source code",
    },
    {
      icon: faLifeRing,
      label: "Support E-Mail",
      url: "mailto:saghallo@denisbitter.de",
      description: "Get help & report issues",
    },
  ];

  const handleLinkClick = async (url: string) => {
    try {
      await openUrl(url);
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  };

  if (showWalkthrough) {
    return (
      <ZenModal isOpen={isOpen} onClose={onClose} size="xl" showCloseButton={true}>
        <div
          style={{
            minHeight: '600px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <WalkthroughOverlay
            steps={ABOUT_MODAL_STEPS}
            onComplete={() => setShowWalkthrough(false)}
            autoStart={true}
          />
        </div>
      </ZenModal>
    );
  }

  return (
    <ZenModal isOpen={isOpen} onClose={onClose}>
      <div
        className="relative flex flex-col"
        style={{ minHeight: modalPreset.minHeight }}
      >
        {/* 🧘 Inhalt mit zusätzlichem oberen Abstand */}
        <div className="flex-1 flex flex-col gap-6 p-8 pt-20 overflow-y-auto">
          {/* Header */}
          <ZenModalHeader
            title={modalPreset.title}
            subtitle={modalPreset.subtitle}
            titleColor={modalPreset.titleColor}
            subtitleColor={modalPreset.subtitleColor}
            titleSize={modalPreset.titleSize}
            subtitleSize={modalPreset.subtitleSize}
          />

          {/* Description */}
          <p className="font-mono text-[12px] text-[#ccc] text-center"
          style={{padding: "10px"}}
          >
            Schreibe einmal. Poste 9 mal mit KI unterstützten Vorlagen <br/>für soziale Medien.
          </p>

          {/* Links */}
          <div className="flex flex-col gap-3 items-center"
          style={{padding: "40px"}}
          >
            {links.map((link) => (
              <ZenRoughButton
                key={link.label}
                label={link.label}
                icon={<FontAwesomeIcon icon={link.icon} />}
                onClick={() => handleLinkClick(link.url)}
              />
            ))}

            {/* Help Button */}
            <ZenRoughButton
              label="Hilfe & Tutorial"
              icon={<FontAwesomeIcon icon={faCircleQuestion} />}
              onClick={() => setShowWalkthrough(true)}
            />
          </div>
        </div>

        {/* Footer */}
        <ZenModalFooter />
      </div>
    </ZenModal>
  );
};
