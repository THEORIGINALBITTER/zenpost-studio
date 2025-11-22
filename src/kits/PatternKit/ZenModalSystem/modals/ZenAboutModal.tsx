import { ZenModal } from "../components/ZenModal";
import { ZenModalHeader } from "../components/ZenModalHeader";
import { ZenModalFooter } from "../components/ZenModalFooter";
import { ZenRoughButton } from "../components/ZenRoughButton";
import { getModalPreset } from "../config/ZenModalConfig";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faBook, faLifeRing } from "@fortawesome/free-solid-svg-icons";

interface ZenAboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ZenAboutModal = ({ isOpen, onClose }: ZenAboutModalProps) => {
  const modalPreset = getModalPreset('about');
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
            onClose={onClose}
          />

          {/* Description */}
          <p className="font-mono text-[12px] text-[#ccc] text-center"
          style={{padding: "10px"}}
          >
            Transform your Markdown files into json format with ease.
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
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <ZenModalFooter />
      </div>
    </ZenModal>
  );
};
