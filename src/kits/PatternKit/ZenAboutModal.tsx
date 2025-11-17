import { ZenModal } from "./ZenModal";
import { ZenFooterText } from "./ZenFooterText";
import { ZenCloseButton } from "../DesignKit/ZenCloseButton";
import { ZenRoughButton } from "./ZenRoughButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faBook, faLifeRing } from "@fortawesome/free-solid-svg-icons";

interface ZenAboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ZenAboutModal = ({ isOpen, onClose }: ZenAboutModalProps) => {
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
      label: "Support",
      url: "https://github.com/THEORIGINALBITTER/zenpost-studio/issues",
      description: "Get help & report issues",
    },
  ];

  return (
    <ZenModal isOpen={isOpen} onClose={onClose}>
      <div className="relative flex flex-col min-h-[480px]">
        {/* Close Button oben rechts im Modal */}
        <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 50 }}>
          <ZenCloseButton onClick={onClose} />
        </div>
        {/* 🧘 Inhalt mit zusätzlichem oberen Abstand */}
        <div className="flex-1 flex flex-col gap-6 p-8 pt-20 overflow-y-auto">
          {/* Header */}
          <div className="text-center">
            <h2 className="font-mono text-2xl text-[#AC8E66] mb-2">
              ZenPost Studio
            </h2>
            <p className="font-mono text-[9px] text-[#888]">Version 1.0.0</p>
          </div>

          {/* Description */}
          <p className="font-mono text-[12px] text-[#ccc] text-center">
            Transform your Markdown files into Editor.js JSON format with ease.
          </p>

          {/* Links */}
          <div className="flex flex-col gap-3 items-center">
            {links.map((link) => (
              <ZenRoughButton
                key={link.label}
                label={link.label}
                icon={<FontAwesomeIcon icon={link.icon} />}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#3a3a3a] py-3 px-4">
          <ZenFooterText />
        </div>
      </div>
    </ZenModal>
  );
};
