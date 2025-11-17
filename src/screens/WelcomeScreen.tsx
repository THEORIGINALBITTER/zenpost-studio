// ./screens/WelcomeScreen.tsx
import { useState } from "react";

import { ZenLogoFlip } from "../kits/DesignKit/ZenLogoFlip";
import { ZenSubtitle } from "../kits/PatternKit/ZenSubtitle";
import { ZenRoughButton } from "../kits/PatternKit/ZenRoughButton";
import { ZenInfoText } from "../kits/PatternKit/ZenInfoText";
import { ZenHeader } from "../kits/PatternKit/ZenHeader";
import { ZenInfoFooter } from "../kits/PatternKit/ZenInfoFooter";
import { ZenFooterText } from "../kits/PatternKit/ZenFooterText";
import { ZenAboutModal } from "../kits/PatternKit/ZenAboutModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileLines, faCode, faMagicWandSparkles } from "@fortawesome/free-solid-svg-icons";

interface WelcomeScreenProps {
  onSelectMarkdown?: () => void;
  onSelectEditorJS?: () => void;
  onSelectContentTransform?: () => void;
}

export const WelcomeScreen = ({
  onSelectMarkdown,
  onSelectEditorJS,
  onSelectContentTransform,
}: WelcomeScreenProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
      <ZenHeader />

      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        {/* Logo Flip Card */}
        <div style={{ width: '130px', height: '130px' }}>
          <ZenLogoFlip />
        </div>
        <h4 className="font-mono text-2xl text-[#e5e5e5] font-normal mt-2">Willkommen</h4>
        <ZenSubtitle>ZenPost – dein Markdown kann mehr.</ZenSubtitle>

        <div className="flex flex-col gap-3 mt-6">
          <ZenRoughButton
            label="Markdown (.md)"
            icon={<FontAwesomeIcon icon={faFileLines} className="text-[#AC8E66]" />}
            onClick={onSelectMarkdown}
          />
          <ZenRoughButton
            label="Editor.js Block-JSON"
            icon={<FontAwesomeIcon icon={faCode} className="text-[#AC8E66]" />}
            onClick={onSelectEditorJS}
          />
          <ZenRoughButton
            label="Content Transform"
            icon={<FontAwesomeIcon icon={faMagicWandSparkles} className="text-[#AC8E66]" />}
            onClick={onSelectContentTransform}
          />
        </div>

        <div className="mt-16 text-[9px] leading-relaxed max-w-xs text-center text-[#777]">
          <ZenInfoText>
            Hier kannst du Markdown-Dateien bereinigen und in Editor.js-JSON umwandeln …
          </ZenInfoText>
        </div>
      </div>

      {/* Eigene Footer-Komponente */}
      <ZenInfoFooter
        onClick={() => setIsModalOpen(true)}
        fixed={false}
        className="mb-4"
      />

      {/* Copyright Footer */}
      <ZenFooterText className="mb-8" />

      {/* About Modal */}
      <ZenAboutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};