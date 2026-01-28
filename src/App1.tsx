// App1.tsx
import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFolderOpen,
  faFileLines,
  faArrowRight,
  faPencil,
  faArrowLeft,
  faTableList,
  faClock,
  faFileExport,
  faRocket,
  faSave,
  faCode,
  faAlignLeft,
} from "@fortawesome/free-solid-svg-icons";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { ConverterScreen } from "./screens/ConverterScreen";
import { ContentTransformScreen } from "./screens/ContentTransformScreen";
import { DocStudioScreen } from "./screens/DocStudioScreen";
import { PublishingDashboardScreen } from "./screens/PublishingDashboardScreen";
import { ZenHeader } from "./kits/PatternKit/ZenHeader";
import { ZenHomeModal } from "../src/kits/PatternKit/ZenModalSystem/modals/ZenHomeModal";
import { ZenSettingsModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenSettingsModal";
import { ZenAboutModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenAboutModal";
import { ZenContentStudioModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenContentStudioModal";
import { ZenPlannerModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenPlannerModal";
import { ZenExportModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenExportModal";
import { ZenUpgradeModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenUpgradeModal";
import type { ProjectMetadata } from "./kits/PatternKit/ZenModalSystem/modals/ZenMetadataModal";
import type { TargetLanguage } from "./services/aiService";
import type { ScheduledPost } from "./types/scheduling";
import { saveScheduledPostsWithFiles } from "./services/publishingService";
import { loadArticles, type ZenArticle } from "./services/publishingService";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir, stat } from "@tauri-apps/plugin-fs";
import { LicenseProvider, useLicense } from "./contexts/LicenseContext";
import { FeatureGate } from "./components/FeatureGate";

type Screen = "welcome" | "converter" | "content-transform" | "doc-studio" | "publishing-dashboard";

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
  selectedTemplate: 'readme' | 'changelog' | 'api-docs' | 'contributing' | 'data-room' | null;
  generatedContent: string;
  tone: 'professional' | 'casual' | 'technical' | 'enthusiastic';
  length: 'short' | 'medium' | 'long';
  audience: 'beginner' | 'intermediate' | 'expert';
  targetLanguage: TargetLanguage;
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

// Main App wrapped with LicenseProvider
export default function App1() {
  return (
    <LicenseProvider>
      <AppContent />
    </LicenseProvider>
  );
}

// App content (moved from App1)
function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("welcome");
  const [showHomeModal, setShowHomeModal] = useState(false);
  const [showAISettingsModal, setShowAISettingsModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Track step information for each screen
  const [converterStep, setConverterStep] = useState(1);
  const [contentTransformStep, setContentTransformStep] = useState(1);
  const [docStudioStep, setDocStudioStep] = useState(1);

  // Content transfer between Doc Studio and Content AI Studio
  const [transferContent, setTransferContent] = useState<string | null>(null);
  const [cameFromDocStudio, setCameFromDocStudio] = useState(false);
  const [cameFromDashboard, setCameFromDashboard] = useState(false);
  const [returnToDocStudioStep, setReturnToDocStudioStep] = useState<number>(3);

  // Store Doc Studio state to preserve it when switching to Content AI Studio
  const [docStudioState, setDocStudioState] = useState<DocStudioState | null>(null);
  const [contentStudioProjectPath, setContentStudioProjectPath] = useState<string | null>(null);
  const [contentStudioRecentArticles, setContentStudioRecentArticles] = useState<ZenArticle[]>([]);
  const [contentStudioAllFiles, setContentStudioAllFiles] = useState<StudioFile[]>([]);
  const [contentStudioRequestedArticleId, setContentStudioRequestedArticleId] = useState<string | null>(null);
  const [contentStudioRequestedFilePath, setContentStudioRequestedFilePath] = useState<string | null>(null);
  const [showContentStudioModal, setShowContentStudioModal] = useState(false);
  const [contentStudioModalTab, setContentStudioModalTab] = useState<"project" | "recent">("project");
  const [contentTransformHeaderAction, setContentTransformHeaderAction] = useState<
    "preview"
    | "next"
    | "copy"
    | "download"
    | "edit"
    | "post"
    | "posten"
    | "reset"
    | "back_doc"
    | "back_dashboard"
    | "back_posting"
    | "save"
    | null
  >(null);
  const [contentTransformHeaderTab, setContentTransformHeaderTab] = useState<"preview" | "next">("next");
  const [contentTransformShowBackToPosting, setContentTransformShowBackToPosting] = useState(false);
  const [contentStudioMetadata, setContentStudioMetadata] = useState<ProjectMetadata>({
    authorName: "",
    authorEmail: "",
    companyName: "",
    license: "MIT",
    year: new Date().getFullYear().toString(),
    website: "",
    repository: "",
    contributingUrl: "",
  });

  // Publishing State (geteilt zwischen Doc Studio & Content AI Studio)
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [plannerDefaultTab, setPlannerDefaultTab] = useState<'planen' | 'kalender' | 'checklist'>('planen');
  const [selectedDateFromCalendar, setSelectedDateFromCalendar] = useState<Date | undefined>(undefined);
  const [schedulerPlatformPosts, setSchedulerPlatformPosts] = useState<Array<{ platform: string; content: string }>>([]);

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportContent, setExportContent] = useState<string>("");

  // DocStudio Header Action State
  const [_docStudioHeaderAction, setDocStudioHeaderAction] = useState<
    "preview" | "planen" | null
  >(null);
  const [docStudioPreviewMode, setDocStudioPreviewMode] = useState(false);

  // Content AI Studio Editor Type (block = Editor.js, markdown = ZenMarkdownEditor)
  const [contentEditorType, setContentEditorType] = useState<"block" | "markdown">("block");

  const handleSelectConverter = () => setCurrentScreen("converter");
  const handleSelectContentTransform = () => {
    setCameFromDocStudio(false);
    setCameFromDashboard(false);
    setMultiPlatformMode(false);
    setContentTransformStep(1);
    setCurrentScreen("content-transform");
  };

  // Multi-platform mode for Content AI Studio
  const [multiPlatformMode, setMultiPlatformMode] = useState(false);

  // Navigate to Content AI Studio from Export Modal for multi-platform transform
  const handleNavigateToMultiPlatformTransform = () => {
    // Export content is already set, use it as initial content
    setTransferContent(exportContent);
    setCameFromDocStudio(false);
    setCameFromDashboard(false);
    setMultiPlatformMode(true);
    setContentTransformStep(2); // Start at platform selection
    setCurrentScreen("content-transform");
  };

  const handleEditScheduledPost = (post: ScheduledPost) => {
    setTransferContent(post.content);
    setCameFromDocStudio(false);
    setCameFromDashboard(false);
    setShowPlannerModal(false);
    setContentTransformStep(1);
    setCurrentScreen("content-transform");
  };

  const persistScheduledPosts = async (posts: ScheduledPost[]) => {
    setScheduledPosts(posts);
    const projectPath =
      contentStudioProjectPath ||
      docStudioState?.projectPath ||
      localStorage.getItem('zenpost_last_project_path');
    if (!projectPath) return;
    try {
      await saveScheduledPostsWithFiles(projectPath, posts);
    } catch (error) {
      console.error('[PublishingService] Failed to save scheduled posts:', error);
    }
  };
  const handleSelectDocStudio = () => {
    // Check if there's a saved project path in localStorage
    const savedProjectPath = localStorage.getItem('zenpost_last_project_path');

    if (savedProjectPath) {
      // If project already selected, skip to Step 2
      setDocStudioStep(2);
      setReturnToDocStudioStep(2);
    } else {
      // No project selected, start at Step 1
      setDocStudioStep(1);
      setReturnToDocStudioStep(1);
    }

    setCurrentScreen("doc-studio");
  };

  const handleOpenDocStudioForPosting = (content: string) => {
    const storedProjectPath = localStorage.getItem('zenpost_last_project_path');
    setDocStudioState((prev) => ({
      projectPath: storedProjectPath ?? prev?.projectPath ?? null,
      projectInfo: prev?.projectInfo ?? null,
      selectedTemplate: null,
      generatedContent: content,
      tone: prev?.tone ?? 'professional',
      length: prev?.length ?? 'medium',
      audience: prev?.audience ?? 'intermediate',
      targetLanguage: prev?.targetLanguage ?? 'deutsch',
      metadata: prev?.metadata ?? {
        authorName: '',
        authorEmail: '',
        companyName: '',
        license: 'MIT',
        year: new Date().getFullYear().toString(),
        website: '',
        repository: '',
        contributingUrl: '',
      },
    }));
    setReturnToDocStudioStep(3);
    setDocStudioStep(3);
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
    setContentTransformStep(1);
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
    setDocStudioStep(returnToDocStudioStep); // Restore the step when returning
    setCurrentScreen("doc-studio");
  };

  const handleSelectPublishingDashboard = () => {
    setCurrentScreen("publishing-dashboard");
  };

  // Open Content AI from Dashboard with blog-post preset
  const handleOpenContentAIFromDashboard = () => {
    setCameFromDashboard(true);
    setCameFromDocStudio(false);
    setTransferContent(null); // No initial content
    setContentTransformStep(1);
    setCurrentScreen("content-transform");
  };

  // Return to Dashboard from Content AI
  const handleBackToDashboard = (_generatedContent?: string) => {
    setCameFromDashboard(false);
    setCurrentScreen("publishing-dashboard");
    // Could save the generated content here if needed
  };

  const handleBackToWelcome = () => {
    setCurrentScreen("welcome");
  };

  // Handle step-wise back navigation for DocStudioScreen
  const handleDocStudioBack = () => {
    if (docStudioStep > 2) {
      // Go to previous step within DocStudio (Step 3+ -> Step 2+)
      setDocStudioStep(docStudioStep - 1);
    } else if (docStudioStep === 2) {
      // Step 2: Always go back to welcome screen (skip Step 1 if project already selected)
      handleBackToWelcome();
    } else {
      // Step 1: go back to welcome screen
      handleBackToWelcome();
    }
  };

  const handleContentTransformBack = () => {
    if (contentTransformStep > 1) {
      setContentTransformStep(contentTransformStep - 1);
      return;
    }
    handleBackToWelcome();
  };

  // Determine which back handler to use based on current screen
  const getBackHandler = () => {
    if (currentScreen === "welcome") return undefined;
    if (currentScreen === "doc-studio") return handleDocStudioBack;
    if (currentScreen === "content-transform") return handleContentTransformBack;
    return handleBackToWelcome;
  };

  const handleHomeClick = () => setShowHomeModal(true);
  const handleConfirmHome = () => {
    setShowHomeModal(false);
    setCurrentScreen("welcome");
  };
  const handleCloseHomeModal = () => setShowHomeModal(false);

  const handleSettingsClick = () => setShowAISettingsModal(true);
  const handleCloseSettingsModal = () => setShowAISettingsModal(false);

  const handleInfoClick = () => setShowAboutModal(true);
  const handleCloseAboutModal = () => setShowAboutModal(false);
  const handleCloseContentStudioModal = () => setShowContentStudioModal(false);

  const refreshContentStudioData = async (projectPathOverride?: string) => {
    const storedProjectPath = projectPathOverride ?? localStorage.getItem('zenpost_last_project_path');
    setContentStudioProjectPath(storedProjectPath);
    if (!storedProjectPath) {
      setContentStudioRecentArticles([]);
      setContentStudioAllFiles([]);
      return;
    }
    const [articles, files] = await Promise.all([
      loadArticles(storedProjectPath),
      scanProjectFiles(storedProjectPath, 200),
    ]);
    setContentStudioRecentArticles(articles.slice(0, 3));
    setContentStudioAllFiles(files);
  };

  // Listen for macOS "About" menu event
  useEffect(() => {
    const handleAboutMenu = () => {
      console.log('[App1] About menu clicked - opening ZenAboutModal');
      setShowAboutModal(true);
    };

    // Check if we're in Tauri environment
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      // Listen for the show-about event from Rust
      const unlisten = (window as any).__TAURI__.event.listen('show-about', () => {
        handleAboutMenu();
      });

      return () => {
        unlisten.then((fn: any) => fn());
      };
    }
  }, []);

  useEffect(() => {
    if (currentScreen !== "content-transform") return;
    setContentStudioRequestedArticleId(null);
    setContentStudioRequestedFilePath(null);
    refreshContentStudioData();
  }, [currentScreen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleFilesUpdated = () => {
      refreshContentStudioData();
    };
    window.addEventListener('zenpost-project-files-updated', handleFilesUpdated);
    return () => {
      window.removeEventListener('zenpost-project-files-updated', handleFilesUpdated);
    };
  }, []);

  useEffect(() => {
    if (!showContentStudioModal) return;
    refreshContentStudioData();
  }, [showContentStudioModal]);

  useEffect(() => {
    if (currentScreen !== "content-transform") return;
    if (contentTransformStep === 1) {
      setContentTransformHeaderTab("next");
    }
  }, [contentTransformStep, currentScreen]);

  const handleSelectContentStudioProject = async () => {
    try {
      const result = await open({
        directory: true,
        multiple: false,
        title: 'Projektordner waehlen',
      });
      if (typeof result === 'string') {
        localStorage.setItem('zenpost_last_project_path', result);
        setContentStudioProjectPath(result);
        await refreshContentStudioData(result);
      }
    } catch (error) {
      console.error('[App1] Content Studio Projektwahl fehlgeschlagen.', error);
    }
  };

  // Hilfefunktion für Header-Text
  const getLeftText = () => {
    if (currentScreen === "welcome") {
      return <span style={{ color: "#AC8E66" }}>ZenPost Studio</span>;
    }

    const studioNames: Record<Exclude<Screen, "welcome">, string> = {
      "converter": "Converter Studio",
      "content-transform": "Content AI Studio",
      "doc-studio": "Doc Studio",
      "publishing-dashboard": "Publishing Dashboard",
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
                              contentTransformStep === 3 ? 'Post Stil anpassen' : 'Ergebnis';
        return <>Step {contentTransformStep}/4 • <span style={{ color: "#AC8E66" }}>{transformText}</span></>;
      case "doc-studio":
        const docText = docStudioStep === 1 ? 'Projekt wählen' :
                       docStudioStep === 2 ? 'Template wählen' :
                       docStudioStep === 3 ? 'Generieren & Bearbeiten' :
                       docStudioStep === 4 ? 'Vorschau & Veröffentlichen' : 'Publishing Management';
        return (
          <>
            Step {docStudioStep}/5 • <span style={{ color: "#AC8E66" }}>{docText}</span>
          </>
        );
      case "publishing-dashboard":
        return <>Publishing Dashboard · <span style={{ color: "#AC8E66" }}>Artikel & Planung</span></>;
      default:
        return "Content konvertieren, mit KI transformieren oder Dokumentation generieren";
    }
  };
  {/ * Hilfefunktion für StudioBar im Header * */}
  const renderStudioBar = () => {
    // DocStudio Tab-Leiste
    if (currentScreen === "doc-studio" && docStudioStep === 3) {
      return (
        <div className="flex items-center justify-between flex-wrap gap-2 px-[4vw] py-[3px] mt-[10px]">
          <div className="flex flex-wrap gap-2">
            <StudioBarButton
              label="Projekt + Dokumente"
              icon={<FontAwesomeIcon icon={faFolderOpen} />}
              onClick={() => {
                setContentStudioModalTab("project");
                setShowContentStudioModal(true);
              }}
            />
            <StudioBarButton
              label="Planen"
              icon={<FontAwesomeIcon icon={faClock} />}
              onClick={() => {
                setPlannerDefaultTab('planen');
                setShowPlannerModal(true);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <StudioBarButton
              label="Preview"
              icon={<FontAwesomeIcon icon={faFileLines} />}
              onClick={() => {
                setDocStudioHeaderAction("preview");
                setDocStudioPreviewMode(!docStudioPreviewMode);
              }}
              active={docStudioPreviewMode}
            />
          </div>
        </div>
      );
    }

    // Content Transform Tab-Leiste
    if (currentScreen !== "content-transform") return undefined;
    return (
      <div className="flex items-center justify-between flex-wrap gap-2 px-[4vw] py-[3px] mt-[10px]">
        {contentTransformStep !== 4 && (
          <div className="flex flex-wrap gap-2">
            <StudioBarButton
              label="Projekt + Dokumente"
              icon={<FontAwesomeIcon icon={faFolderOpen} />}
              onClick={() => {
                setContentStudioModalTab("project");
                setShowContentStudioModal(true);
              }}
              active={contentStudioModalTab === "project"}
            />
            <StudioBarButton
              label="Planen"
              icon={<FontAwesomeIcon icon={faClock} />}
              onClick={() => {
                setPlannerDefaultTab('planen');
                setShowPlannerModal(true);
              }}
            />
          </div>
        )}
        {contentTransformStep === 1 && (
          <div className="flex flex-wrap gap-2">
            <StudioBarButton
              label={contentEditorType === "block" ? "Markdown" : "Block"}
              icon={<FontAwesomeIcon icon={contentEditorType === "block" ? faAlignLeft : faCode} />}
              onClick={() => setContentEditorType(contentEditorType === "block" ? "markdown" : "block")}
            />
            <StudioBarButton
              label="Preview"
              icon={<FontAwesomeIcon icon={faFileLines} />}
              onClick={() => {
                setContentTransformHeaderTab("preview");
                setContentTransformHeaderAction("preview");
              }}
              active={contentTransformHeaderTab === "preview"}
            />
            <StudioBarButton
              label="Speichern"
              icon={<FontAwesomeIcon icon={faSave} />}
              onClick={() => setContentTransformHeaderAction("save")}
            />
            <StudioBarButton
              label="Weiter"
              icon={<FontAwesomeIcon icon={faArrowRight} />}
              onClick={() => {
                setContentTransformHeaderTab("next");
                setContentTransformHeaderAction("next");
              }}
              active={contentTransformHeaderTab === "next"}
            />
            {contentTransformShowBackToPosting && (
              <StudioBarButton
                label="Zurück zum Posten"
                icon={<FontAwesomeIcon icon={faRocket} />}
                onClick={() => setContentTransformHeaderAction("back_posting")}
              />
            )}
          </div>
        )}
        {contentTransformStep === 4 && (
          <>
            {/* Links: Nachbearbeiten */}
            <div className="flex flex-wrap gap-2">
              <StudioBarButton
                label="Nachbearbeiten"
                icon={<FontAwesomeIcon icon={faPencil} />}
                onClick={() => setContentTransformHeaderAction("edit")}
              />
              {/* Navigation */}
              {cameFromDocStudio && (
                <>
                  <div style={{ width: '1px', height: '24px', backgroundColor: '#3A3A3A', margin: '0 4px' }} />
                  <StudioBarButton
                    label="Zurück zu Doc Studio"
                    icon={<FontAwesomeIcon icon={faArrowLeft} />}
                    onClick={() => setContentTransformHeaderAction("back_doc")}
                  />
                </>
              )}
              {cameFromDashboard && (
                <>
                  <div style={{ width: '1px', height: '24px', backgroundColor: '#3A3A3A', margin: '0 4px' }} />
                  <StudioBarButton
                    label="Zum Dashboard"
                    icon={<FontAwesomeIcon icon={faTableList} />}
                    onClick={() => setContentTransformHeaderAction("back_dashboard")}
                  />
                </>
              )}
            </div>

            {/* Rechts: Export & Planen */}
            <div className="flex flex-wrap gap-2 ml-auto">
              <StudioBarButton
                label="Export"
                icon={<FontAwesomeIcon icon={faFileExport} />}
                onClick={() => setShowExportModal(true)}
              />
              <StudioBarButton
                label="Planen"
                icon={<FontAwesomeIcon icon={faClock} />}
                onClick={() => {
                  setPlannerDefaultTab('planen');
                  setShowPlannerModal(true);
                }}
              />
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Globaler Header - Fixed */}
      <ZenHeader
        leftText={getLeftText()}
        rightText={getRightText()}
        onBack={getBackHandler()}
        onHome={currentScreen !== "welcome" ? handleHomeClick : undefined}
        onSettings={handleSettingsClick}
        onInfo={handleInfoClick}
        showSettingsNotification={false}
        studioBar={renderStudioBar()}
      />

      {/* Scrollable Content Area */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Screens */}
        {currentScreen === "welcome" && (
          <WelcomeScreen
            onSelectConverter={handleSelectConverter}
            onSelectContentTransform={handleSelectContentTransform}
            onSelectDocStudio={handleSelectDocStudio}
            onSelectPublishingDashboard={handleSelectPublishingDashboard}
          />
        )}
        {currentScreen === "converter" && <ConverterScreen onBack={handleBackToWelcome} onStepChange={setConverterStep} />}
        {currentScreen === "content-transform" && (
          <ContentTransformScreen
            onBack={handleBackToWelcome}
            onStepChange={setContentTransformStep}
            currentStep={contentTransformStep}
            initialContent={transferContent}
            initialPlatform={cameFromDashboard ? 'blog-post' : undefined}
            cameFromDocStudio={cameFromDocStudio}
            cameFromDashboard={cameFromDashboard}
            onBackToDocStudio={handleBackToDocStudio}
            onBackToDashboard={handleBackToDashboard}
            projectPath={contentStudioProjectPath}
            requestedArticleId={contentStudioRequestedArticleId}
            onArticleRequestHandled={() => setContentStudioRequestedArticleId(null)}
            requestedFilePath={contentStudioRequestedFilePath}
            onFileRequestHandled={() => setContentStudioRequestedFilePath(null)}
            metadata={contentStudioMetadata}
            onMetadataChange={setContentStudioMetadata}
            headerAction={contentTransformHeaderAction}
            onHeaderActionHandled={() => setContentTransformHeaderAction(null)}
            onStep1BackToPostingChange={setContentTransformShowBackToPosting}
            onOpenDocStudioForPosting={handleOpenDocStudioForPosting}
            onContentChange={setExportContent}
            editorType={contentEditorType}
            multiPlatformMode={multiPlatformMode}
            onMultiPlatformModeChange={setMultiPlatformMode}
          />
        )}
        {currentScreen === "doc-studio" && (
          <FeatureGate featureId="DOC_STUDIO">
            <DocStudioScreen
              onBack={handleDocStudioBack}
              onTransferToContentStudio={handleTransferToContentStudio}
              onStepChange={setDocStudioStep}
              initialStep={docStudioStep}
              savedState={docStudioState}
              onStateChange={handleSaveDocStudioState}
              scheduledPosts={scheduledPosts}
              onScheduledPostsChange={setScheduledPosts}
              onShowScheduler={() => {
                setPlannerDefaultTab('planen');
                setShowPlannerModal(true);
              }}
              onShowCalendar={() => {
                setPlannerDefaultTab('kalender');
                setShowPlannerModal(true);
              }}
              onShowChecklist={() => {
                setPlannerDefaultTab('checklist');
                setShowPlannerModal(true);
              }}
              onSetSchedulerPlatformPosts={setSchedulerPlatformPosts}
              onSetSelectedDateFromCalendar={setSelectedDateFromCalendar}
              showPreview={docStudioPreviewMode}
              onPreviewChange={setDocStudioPreviewMode}
            />
          </FeatureGate>
        )}
        {currentScreen === "publishing-dashboard" && (
          <PublishingDashboardScreen
            onBack={handleBackToWelcome}
            onOpenDocStudio={handleSelectDocStudio}
            onOpenContentAI={handleOpenContentAIFromDashboard}
            onOpenConverter={handleSelectConverter}
          />
        )}
      </div>


      {/* Home-Modal */}
      <ZenHomeModal
        isOpen={showHomeModal}
        onClose={handleCloseHomeModal}
        onConfirm={handleConfirmHome}
      />

      {/* Settings-Modal */}
      <ZenSettingsModal
        isOpen={showAISettingsModal}
        onClose={handleCloseSettingsModal}
        defaultTab="ai"
      />

      {/* About-Modal */}
      <ZenAboutModal
        isOpen={showAboutModal}
        onClose={handleCloseAboutModal}
      />

      <ZenContentStudioModal
        isOpen={showContentStudioModal}
        onClose={handleCloseContentStudioModal}
        projectPath={contentStudioProjectPath}
        recentArticles={contentStudioRecentArticles}
        allFiles={contentStudioAllFiles}
        scheduledPosts={scheduledPosts}
        activeTab={contentStudioModalTab}
        onSelectProject={handleSelectContentStudioProject}
        onEditScheduledPost={handleEditScheduledPost}
        onOpenArticle={(articleId) => {
          setContentStudioRequestedArticleId(articleId);
          setShowContentStudioModal(false);
        }}
        onOpenFile={(filePath) => {
          setContentStudioRequestedFilePath(filePath);
          setShowContentStudioModal(false);
        }}
        metadata={contentStudioMetadata}
        onSaveMetadata={setContentStudioMetadata}
      />

      {/* Publishing Modal (kombiniert Planen, Kalender, Checklist) */}
      <ZenPlannerModal
        isOpen={showPlannerModal}
        onClose={() => {
          setShowPlannerModal(false);
          setSelectedDateFromCalendar(undefined);
        }}
        scheduledPosts={scheduledPosts}
        projectPath={contentStudioProjectPath}
        onScheduledPostsChange={persistScheduledPosts}
        posts={schedulerPlatformPosts.map(p => ({
          platform: p.platform as any,
          title: '',
          content: p.content,
          characterCount: p.content.length,
          wordCount: p.content.split(/\s+/).filter(Boolean).length,
        }))}
        onScheduleSave={(newScheduledPosts) => {
          const next = [...scheduledPosts, ...newScheduledPosts];
          void persistScheduledPosts(next);
          setShowPlannerModal(false);
        }}
        onEditPost={handleEditScheduledPost}
        onAddPost={(date) => {
          setSelectedDateFromCalendar(date);
          setPlannerDefaultTab('planen');
        }}
        preSelectedDate={selectedDateFromCalendar}
        defaultTab={plannerDefaultTab}
      />

      {/* Export Modal */}
      <ZenExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        content={exportContent}
        onNavigateToTransform={handleNavigateToMultiPlatformTransform}
      />

      {/* Upgrade Modal - triggered by FeatureGate or manual */}
      <UpgradeModalWrapper />
    </div>
  );
}

// Wrapper component to connect UpgradeModal to LicenseContext
function UpgradeModalWrapper() {
  const { showUpgradeModal, setShowUpgradeModal, upgradeFeatureId } = useLicense();

  return (
    <ZenUpgradeModal
      isOpen={showUpgradeModal}
      onClose={() => setShowUpgradeModal(false)}
      highlightFeature={upgradeFeatureId}
    />
  );
}

interface StudioBarButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}

interface StudioFile {
  path: string;
  name: string;
  modifiedAt?: number;
}

const scanProjectFiles = async (rootPath: string, limit: number): Promise<StudioFile[]> => {
  const results: StudioFile[] = [];
  const allowedExtensions = new Set(["md", "markdown", "mdx", "txt", "json", "html", "htm"]);
  const skipDirs = new Set(["node_modules", ".git", "dist", "build", ".zenpost", "src-tauri", ".vite"]);
  const maxDepth = 4;

  const scan = async (dirPath: string, depth: number) => {
    if (depth > maxDepth || results.length >= limit) return;
    let entries: Awaited<ReturnType<typeof readDir>>;
    try {
      entries = await readDir(dirPath);
    } catch {
      return;
    }

    for (const entry of entries) {
      const name = entry.name || "";
      if (entry.isDirectory) {
        if (name.startsWith(".") || skipDirs.has(name)) continue;
        await scan(`${dirPath}/${name}`, depth + 1);
        if (results.length >= limit) return;
      } else if (entry.isFile) {
        const ext = name.split(".").pop()?.toLowerCase() || "";
        if (!allowedExtensions.has(ext)) continue;
        let modifiedAt: number | undefined;
        try {
          const info = await stat(`${dirPath}/${name}`);
          modifiedAt = info.mtime ? info.mtime.getTime() : undefined;
        } catch {
          modifiedAt = undefined;
        }
        results.push({ path: `${dirPath}/${name}`, name, modifiedAt });
        if (results.length >= limit) return;
      }
    }
  };

  await scan(rootPath, 0);
  return results;
};
// Tabs Color und Größe der Komponente anpassen
const StudioBarButton = ({
  label,
  icon,
  onClick,
  disabled,
  active,
}: StudioBarButtonProps) => (
  <button
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    style={{
      width: "150px",
      height: "40px",
      border: active ? "2px solid #AC8E66" : "1px solid #3A3A3A",
      borderBottom: "0",
      borderRadius: "10px 10px 0 0",
      padding: "0 10px",
      background:
        active
          ? "linear-gradient(145deg, rgba(172,142,102,0.1), rgba(172,142,102,0.05))"
          : "#1A1A1A",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontFamily: "monospace",
      fontSize: "11px",
      // Textfarbe anpassen
      color: "#e5e5e5",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "all 0.2s ease",
      opacity: disabled ? 0.6 : 1,
      overflow: "hidden",
      marginBottom: "-1px",
    }}
    onMouseEnter={(e) => {
      if (!disabled) {
        e.currentTarget.style.borderColor = "#AC8E66";
        e.currentTarget.style.transform = "translateY(-1px)";
      }
    }}
    onMouseLeave={(e) => {
      if (!disabled) {
        e.currentTarget.style.borderColor = active ? "#AC8E66" : "#3A3A3A";
        e.currentTarget.style.transform = "translateY(0)";
      }
    }}
  >
    <span style={{ color: "#AC8E66", display: "inline-flex" }}>{icon}</span>
    <span
      style={{
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
      title={label}
    >
      {label}
    </span>
  </button>
);
