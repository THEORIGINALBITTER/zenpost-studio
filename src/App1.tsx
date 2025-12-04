// App1.tsx
import { useState } from "react";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { ConverterScreen } from "./screens/ConverterScreen";
import { ContentTransformScreen } from "./screens/ContentTransformScreen";
import { DocStudioScreen } from "./screens/DocStudioScreen";
import { ZenHeader } from "./kits/PatternKit/ZenHeader";
import { ZenHomeModal } from "../src/kits/PatternKit/ZenModalSystem/modals/ZenHomeModal";
import { ZenAISettingsModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenAISettingsModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircle } from "@fortawesome/free-solid-svg-icons";

type Screen = "welcome" | "converter" | "content-transform" | "doc-studio";

// Doc Studio state interface
interface DocStudioState {
  projectPath: string | null;
  projectInfo: {
    name: string;
    description: string;
    version: string;
    dependencies: string[];
    fileTypes: string[];
    hasTests: boolean;
    hasApi: boolean;
  } | null;
  selectedTemplate: 'readme' | 'changelog' | 'api-docs' | 'contributing' | 'blog-post' | 'data-room' | null;
  generatedContent: string;
  tone: 'professional' | 'casual' | 'technical' | 'enthusiastic';
  length: 'short' | 'medium' | 'long';
  audience: 'beginner' | 'intermediate' | 'expert';
  targetLanguage: string;
  metadata: {
    authorName: string;
    authorEmail: string;
    companyName: string;
    license: string;
    year: string;
    website: string;
    repository: string;
    contributingUrl: string;
  };
}

export default function App1() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("welcome");
  const [showHomeModal, setShowHomeModal] = useState(false);
  const [showAISettingsModal, setShowAISettingsModal] = useState(false);

  // Track step information for each screen
  const [converterStep, setConverterStep] = useState(1);
  const [contentTransformStep, setContentTransformStep] = useState(1);
  const [docStudioStep, setDocStudioStep] = useState(1);

  // Content transfer between Doc Studio and Content AI Studio
  const [transferContent, setTransferContent] = useState<string | null>(null);
  const [cameFromDocStudio, setCameFromDocStudio] = useState(false);
  const [returnToDocStudioStep, setReturnToDocStudioStep] = useState<number>(3);

  // Store Doc Studio state to preserve it when switching to Content AI Studio
  const [docStudioState, setDocStudioState] = useState<DocStudioState | null>(null);

  const handleSelectConverter = () => setCurrentScreen("converter");
  const handleSelectContentTransform = () => {
    setCameFromDocStudio(false);
    setCurrentScreen("content-transform");
  };
  const handleSelectDocStudio = () => {
    setReturnToDocStudioStep(1); // Reset to step 1 when starting fresh
    setCurrentScreen("doc-studio");
  };

  // Save Doc Studio state before transferring
  const handleSaveDocStudioState = (state: DocStudioState) => {
    setDocStudioState(state);
  };

  // Transfer content from Doc Studio to Content AI Studio
  const handleTransferToContentStudio = (content: string, currentDocStudioStep: number, state: DocStudioState) => {
    setTransferContent(content);
    setCameFromDocStudio(true);
    setReturnToDocStudioStep(currentDocStudioStep); // Remember which step to return to
    setDocStudioState(state); // Save the entire Doc Studio state
    setCurrentScreen("content-transform");
  };

  // Return to Doc Studio from Content AI Studio
  const handleBackToDocStudio = (editedContent?: string) => {
    if (editedContent && docStudioState) {
      // Update the saved state with edited content
      setDocStudioState({
        ...docStudioState,
        generatedContent: editedContent,
      });
    }
    setCameFromDocStudio(false);
    setCurrentScreen("doc-studio");
    // Keep returnToDocStudioStep and docStudioState so DocStudioScreen can use them
  };

  const handleBackToWelcome = () => {
    setCurrentScreen("welcome");
  };

  const handleHomeClick = () => setShowHomeModal(true);
  const handleConfirmHome = () => {
    setShowHomeModal(false);
    setCurrentScreen("welcome");
  };
  const handleCloseHomeModal = () => setShowHomeModal(false);

  const handleSettingsClick = () => setShowAISettingsModal(true);
  const handleCloseSettingsModal = () => setShowAISettingsModal(false);

  // Hilfefunktion für Header-Text
  const getLeftText = () => {
    if (currentScreen === "welcome") {
      return <span style={{ color: "#AC8E66" }}>ZenPost Studio</span>;
    }

    const studioNames: Record<Exclude<Screen, "welcome">, string> = {
      "converter": "Converter Studio",
      "content-transform": "Content AI Studio",
      "doc-studio": "Doc Studio"
    };

    return (
      <>
        ZenPost Studio · <span style={{ color: "#AC8E66" }}>{studioNames[currentScreen]}</span>
      </>
    );
  };

  const getRightText = () => {
    switch (currentScreen) {
      case "converter":
        const converterText = converterStep === 1 ? 'Format wählen' :
                             converterStep === 2 ? 'Inhalt bereitstellen' :
                             converterStep === 3 ? 'Konvertierung' : 'Fertig!';
        return <>Step {converterStep}/4 · <span style={{ color: "#AC8E66" }}>{converterText}</span></>;
      case "content-transform":
        const transformText = contentTransformStep === 1 ? 'Quelle eingeben' :
                              contentTransformStep === 2 ? 'Plattform wählen' :
                              contentTransformStep === 3 ? 'Stil anpassen' : 'Ergebnis';
        return <>Step {contentTransformStep}/4 • <span style={{ color: "#AC8E66" }}>{transformText}</span></>;
      case "doc-studio":
        const docText = docStudioStep === 1 ? 'Projekt wählen' :
                       docStudioStep === 2 ? 'Template wählen' :
                       docStudioStep === 3 ? 'Generieren & Bearbeiten' :
                       docStudioStep === 4 ? 'Vorschau & Veröffentlichen' : 'Publishing Management';
        return (
          <>
            <FontAwesomeIcon icon={faCircle} style={{ color: "#AC8E66", fontSize: "8px" }} /> Schritt {docStudioStep}/5 • <span style={{ color: "#AC8E66" }}>{docText}</span>
          </>
        );
      default:
        return "Content konvertieren, mit KI transformieren oder Dokumentation generieren";
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Globaler Header - Fixed */}
      <ZenHeader
        leftText={getLeftText()}
        rightText={getRightText()}
        onBack={currentScreen !== "welcome" ? handleBackToWelcome : undefined}
        onHome={currentScreen !== "welcome" ? handleHomeClick : undefined}
        onSettings={handleSettingsClick}
        showSettingsNotification={false}
      />

      {/* Scrollable Content Area */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Screens */}
        {currentScreen === "welcome" && (
          <WelcomeScreen
            onSelectConverter={handleSelectConverter}
            onSelectContentTransform={handleSelectContentTransform}
            onSelectDocStudio={handleSelectDocStudio}
          />
        )}
        {currentScreen === "converter" && <ConverterScreen onBack={handleBackToWelcome} onStepChange={setConverterStep} />}
        {currentScreen === "content-transform" && (
          <ContentTransformScreen
            onBack={handleBackToWelcome}
            onStepChange={setContentTransformStep}
            initialContent={transferContent}
            cameFromDocStudio={cameFromDocStudio}
            onBackToDocStudio={handleBackToDocStudio}
          />
        )}
        {currentScreen === "doc-studio" && (
          <DocStudioScreen
            onBack={handleBackToWelcome}
            onTransferToContentStudio={handleTransferToContentStudio}
            onStepChange={setDocStudioStep}
            initialStep={returnToDocStudioStep}
            savedState={docStudioState}
            onStateChange={handleSaveDocStudioState}
          />
        )}
      </div>


      {/* Home-Modal */}
      <ZenHomeModal
        isOpen={showHomeModal}
        onClose={handleCloseHomeModal}
        onConfirm={handleConfirmHome}
      />

      {/* AI-Settings-Modal */}
      <ZenAISettingsModal
        isOpen={showAISettingsModal}
        onClose={handleCloseSettingsModal}
      />
    </div>
  );
}
