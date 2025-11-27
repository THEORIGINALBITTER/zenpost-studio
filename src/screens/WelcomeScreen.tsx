// ./screens/WelcomeScreen.tsx
import { useState } from "react";

import { ZenLogoFlip } from "../kits/DesignKit/ZenLogoFlip";
import { ZenSubtitle } from "../kits/PatternKit/ZenSubtitle";
import { ZenRoughButton, ZenFooterText, ZenAboutModal } from "../kits/PatternKit/ZenModalSystem";
import { ZenInfoText } from "../kits/PatternKit/ZenInfoText";
import { ZenHeader } from "../kits/PatternKit/ZenHeader";
import { ZenInfoFooter } from "../kits/PatternKit/ZenInfoFooter";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileLines, faMagicWandSparkles, faBook } from "@fortawesome/free-solid-svg-icons";

interface WelcomeScreenProps {
  onSelectConverter?: () => void;
  onSelectContentTransform?: () => void;
  onSelectDocStudio?: () => void;
}

export const WelcomeScreen = ({
  onSelectConverter,
  onSelectContentTransform,
  onSelectDocStudio,
}: WelcomeScreenProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
      <ZenHeader
        leftText="ZenPost Studio"
        rightText="Content konvertieren, mit KI transformieren oder Dokumentation generieren"
        leftTextHighlight={true}
      />

      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        {/* Logo Flip Card */}
        <div style={{ width: '130px', height: '130px' }}>
          <ZenLogoFlip />
        </div>
        <h4 className="font-mono text-2xl text-[#e5e5e5] font-normal mt-2">Willkommen</h4>
        <ZenSubtitle>ZenPost – dein Markdown kann mehr.</ZenSubtitle>

        <div className="flex flex-col gap-3 mt-6">
          <ZenRoughButton
            label="Converter Studio"
            icon={<FontAwesomeIcon icon={faFileLines} className="text-[#AC8E66]" />}
            onClick={onSelectConverter}
            title="Markdown & Editor.js konvertieren und bereinigen"
          />
          <ZenRoughButton
            label="Content AI Studio"
            icon={<FontAwesomeIcon icon={faMagicWandSparkles} className="text-[#AC8E66]" />}
            onClick={onSelectContentTransform}
            title="Content mit KI für Social Media transformieren"
          />
          <ZenRoughButton
            label="Doc Studio"
            icon={<FontAwesomeIcon icon={faBook} className="text-[#AC8E66]" />}
            onClick={onSelectDocStudio}
            title="Projekt-Dokumentation automatisch generieren"
          />
        </div>

        <div className="mt-16 text-[9px] leading-relaxed max-w-xs text-center text-[#777]">
          <ZenInfoText>
            Wähle dein Studio: Content konvertieren, mit KI transformieren oder Dokumentation generieren …
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