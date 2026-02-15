// ./screens/WelcomeScreen.tsx
import { ZenLogoFlip } from "../kits/DesignKit/ZenLogoFlip";
import { PaperBG } from "../kits/DesignKit/PaperBG";
import { ZenSubtitle } from "../kits/PatternKit/ZenSubtitle";
import { ZenRoughButton, ZenFooterText} from "../kits/PatternKit/ZenModalSystem";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagicWandSparkles, faBook, faLayerGroup } from "@fortawesome/free-solid-svg-icons";

interface WelcomeScreenProps {
  onSelectConverter?: () => void;
  onSelectContentTransform?: () => void;
  onSelectDocStudio?: () => void;
  onSelectGettingStarted?: () => void;
}

export const WelcomeScreen = ({
  onSelectConverter: _onSelectConverter,
  onSelectContentTransform,
  onSelectDocStudio,
  onSelectGettingStarted,
}: WelcomeScreenProps) => {


  return (
    <PaperBG>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        {/* Logo Flip Card */}
        <div style={{ width: '130px', height: '130px', marginTop: '20px' }}>
          <ZenLogoFlip />
        </div>
        <h4 className="font-mono text-2xl text-[#AC8E66] font-normal "
        
        style={{padding: "10px"}}
        >ZenPost Studio</h4>
        <ZenSubtitle className="text-[#999] text-center max-w-md mt-[-20px]">
          1 mal Schreiben - 9 mal Veröffentlichen<br/> Wähle dein Studio
        </ZenSubtitle>

        <div className="flex flex-col gap-3 mt-6 text-[#fff] ">

              <ZenRoughButton


            label="Getting Started"
            icon={<FontAwesomeIcon 
              icon={faLayerGroup} 
              className="text-[#AC8E66]" />}
            onClick={onSelectGettingStarted}
            title="Was möchtest du heute machen?"
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
            title="Projekt-Dokumentation automatisch generieren "
          />
      

          {/*
          <ZenRoughButton
            label="Converter Studio"
            icon={<FontAwesomeIcon icon={faFileLines} className="text-[#AC8E66]" />}
            onClick={onSelectConverter}
            title="Markdown & Editor.js konvertieren und bereinigen"
          />
          */}

        </div>

      
        </div>

        {/* Eigene Footer-Komponente */}
  

        {/* Copyright Footer */}
        <ZenFooterText className="mb-8 border-t border-[#AC8E66]"  />

        {/* About Modal */}
 

      </div>
    </PaperBG>
  );
};
