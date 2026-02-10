import { useState, useEffect } from "react";
import { ZenModal } from "../components/ZenModal";
import { ZenModalFooter } from "../components/ZenModalFooter";
import { ZenRoughButton } from "../components/ZenRoughButton";
import { getModalPreset } from "../config/ZenModalConfig";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faCircleQuestion, faLink, faCodeBranch, faClock } from "@fortawesome/free-solid-svg-icons";
import { WalkthroughOverlay } from "../../../HelpDocStudio/components/WalkthroughOverlay";
import { GITHUB_STEPS } from "../../../HelpDocStudio/config/walkthroughSteps";

interface ZenGithubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ZenGithubModal = ({ isOpen, onClose }: ZenGithubModalProps) => {
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const modalPreset = getModalPreset('settings');

  // Reset walkthrough state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setShowWalkthrough(false);
    }
  }, [isOpen]);

  const githubFeatures = [
    {
      icon: faLink,
      label: "Repository verbinden",
      description: "Verbinde dein GitHub Repository",
    },
    {
      icon: faCodeBranch,
      label: "Branch Management",
      description: "Verwalte Branches und Pull Requests",
    },
    {
      icon: faClock,
      label: "Versions-Historie",
      description: "Verfolge alle Änderungen",
    },
  ];

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
            steps={GITHUB_STEPS}
            onComplete={() => setShowWalkthrough(false)}
            autoStart={true}
          />
        </div>
      </ZenModal>
    );
  }

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      title="GitHub Integration"
      subtitle="Verbinde dein Repository"
    >
      <div
        className="relative flex flex-col"
        style={{ minHeight: modalPreset.minHeight }}
      >
        {/* Content */}
        <div className="flex-1 flex flex-col gap-6 p-8 overflow-y-auto">
          {/* GitHub Icon */}
          <div className="flex justify-center">
            <FontAwesomeIcon
              icon={faGithub}
              style={{ fontSize: '64px', color: '#AC8E66' }}
            />
          </div>

          {/* Description */}
          <p className="font-mono text-[12px] text-[#] text-center"
            style={{padding: "10px"}}
          >
            Verwalte deine GitHub Repository-Integration für Versionskontrolle und Zusammenarbeit.
          </p>

          {/* Features */}
          <div className="flex flex-col gap-3 items-center"
            style={{padding: "20px"}}
          >
            {githubFeatures.map((feature) => (
              <div
                key={feature.label}
                style={{
                  width: '100%',
                  maxWidth: '320px',
                  padding: '16px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #3A3A3A',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <FontAwesomeIcon
                  icon={feature.icon}
                  style={{ fontSize: '20px', color: '#AC8E66' }}
                />
                <div>
                  <div className="font-mono text-[11px] text-[#e5e5e5]">
                    {feature.label}
                  </div>
                  <div className="font-mono text-[9px] text-[#777]">
                    {feature.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 items-center" style={{padding: "20px"}}>
            <ZenRoughButton
              label="Repository verbinden"
              icon={<FontAwesomeIcon icon={faGithub} />}
              onClick={() => {
                // Placeholder für GitHub Verbindung
                console.log('GitHub Repository verbinden');
              }}
            />

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
