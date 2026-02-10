import { useState, useEffect } from "react";
import { ZenModal } from "../components/ZenModal";
import { ZenModalFooter } from "../components/ZenModalFooter";
import { ZenRoughButton } from "../components/ZenRoughButton";
import { MODAL_CONTENT, getModalPreset } from "../config/ZenModalConfig";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faBook, faLifeRing, faBug } from "@fortawesome/free-solid-svg-icons";
import { useOpenExternal } from "../../../../hooks/useOpenExternal";
import { WalkthroughOverlay } from "../../../HelpDocStudio/components/WalkthroughOverlay";
import { ABOUT_MODAL_STEPS } from "../../../HelpDocStudio/config/walkthroughSteps";

interface ZenAboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBugReport?: () => void;
}

export const ZenAboutModal = ({ isOpen, onClose, onOpenBugReport }: ZenAboutModalProps) => {
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const modalPreset = getModalPreset('about');
  const { openExternal } = useOpenExternal();

  // Reset walkthrough state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setShowWalkthrough(false);
    }
  }, [isOpen]);
  const links = [
    {
      icon: faBook,
      label: "ZenPost Guide",
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
      await openExternal(url);
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

  // Modal-Content aus zentraler Config
  const content = MODAL_CONTENT.about;

  return (
    <>
      <ZenModal
        isOpen={isOpen}
        onClose={onClose}
        title={content.title}
        subtitle={content.subtitle}
        headerAlign="center"
      >
        <div
          className="relative flex flex-col"
          style={{ minHeight: modalPreset.minHeight }}
        >
          {/* Content */}
          <div className="flex-1 flex flex-col gap-6 p-8 overflow-y-auto">
            {/* Description */}
            <p className="font-mono text-[12px] text-[#555] text-center"
            style={{padding: "10px"}}
            >
              Schreibe einmal. Poste 9 mal mit KI unterstützten Vorlagen <br/>für soziale Medien und Doc Studio.
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
                label="Bugs melden"
                icon={<FontAwesomeIcon icon={faBug} />}
                onClick={() => onOpenBugReport?.()}
              />
            </div>
          </div>

          {/* Footer */}
          <ZenModalFooter />
        </div>
      </ZenModal>
    </>
  );
};
