// App1.tsx
import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFolderOpen,
  faFileLines,
  faPencil,
  faArrowLeft,
  faTableList,
  faClock,
  faFileExport,
  faWandMagicSparkles,
  faSave,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { ConverterScreen } from "./screens/ConverterScreen";
import { ContentTransformScreen } from "./screens/ContentTransformScreen";
import { DocStudioScreen } from "./screens/DocStudioScreen";
import { GettingStartedScreen } from "./screens/GettingStartedScreen";
import { ZenHeader } from "./kits/PatternKit/ZenHeader";
import { ZenHomeModal } from "../src/kits/PatternKit/ZenModalSystem/modals/ZenHomeModal";
import { ZenSettingsModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenSettingsModal";
import { ZenAboutModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenAboutModal";
import { ZenContentStudioModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenContentStudioModal";
import { ZenPlannerModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenPlannerModal";
import { ZenExportModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenExportModal";
import { ZenUpgradeModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenUpgradeModal";
import { ZenBootstrapModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenBootstrapModal";
import type { ProjectMetadata } from "./kits/PatternKit/ZenModalSystem/modals/ZenMetadataModal";
import type { ScheduledPost } from "./types/scheduling";
import type { DocStudioState } from "./screens/DocStudio/types";
import { initializePublishingProject, loadSchedule, saveScheduledPostsWithFiles } from "./services/publishingService";
import { loadArticles, type ZenArticle } from "./services/publishingService";
import { WalkthroughModal } from "./kits/HelpDocStudio";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir, stat } from "@tauri-apps/plugin-fs";
import { LicenseProvider, useLicense } from "./contexts/LicenseContext";
import { FeatureGate } from "./components/FeatureGate";
import { isTauri } from "@tauri-apps/api/core";
import { useOpenExternal } from "./hooks/useOpenExternal";
import { ensureAppConfig, markBootstrapNoticeSeen, updateLastProjectPath } from "./services/appConfigService";

type DeveloperInfoProps = {
  onOpenProfile: () => void;
  compact?: boolean;
};

const DeveloperInfo = ({ onOpenProfile, compact = false }: DeveloperInfoProps) => (
  <div
    style={{
      marginTop: compact ? "14px" : "22px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: compact ? "10px" : "14px",
    }}
  >
    <div
      style={{
        width: compact ? "88px" : "120px",
        height: compact ? "88px" : "120px",
        borderRadius: "999px",
        border: "2px solid #AC8E66",
        overflow: "hidden",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      }}
    >
      <img
        src="/denis-rund.png"
        alt="Denis Bitter"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
    <div
      style={{
        fontFamily: "IBM Plex Mono, monospace",
        fontSize: compact ? "16px" : "20px",
        color: "#e5e5e5",
        textAlign: "center",
      }}
    >
      Moin, ich bin{" "}
      <button
        onClick={onOpenProfile}
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          color: "#AC8E66",
          fontFamily: "inherit",
          fontSize: "inherit",
          cursor: "pointer",
        }}
      >
        DenisBitter
      </button>
    </div>
    <div
      style={{
        fontFamily: "IBM Plex Mono, monospace",
        fontSize: compact ? "12px" : "14px",
        color: "#bfbfbf",
        textAlign: "center",
        lineHeight: 1.6,
        maxWidth: "520px",
      }}
    >
      Software Architect, Full-Stack Entwickler und Dozent aus Hamburg.
      <br />
      Ich glaube daran, dass gute Technologie verstanden werden muss —
      nicht nur funktionieren.
    </div>
  </div>
);

type Screen = "welcome" | "converter" | "content-transform" | "doc-studio" | "getting-started";

// Doc Studio state interface is shared in DocStudio types

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
  const [isMobileBlocked, setIsMobileBlocked] = useState(false);
  const { openExternal } = useOpenExternal();
  const [currentScreen, setCurrentScreen] = useState<Screen>("welcome");
  const [showHomeModal, setShowHomeModal] = useState(false);
  const [showAISettingsModal, setShowAISettingsModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showWalkthroughModal, setShowWalkthroughModal] = useState(false);
  const [showBootstrapModal, setShowBootstrapModal] = useState(false);
  const [bootstrapProjectPath, setBootstrapProjectPath] = useState<string | null>(null);

  // Track step information for each screen
  const [converterStep, setConverterStep] = useState(1);
  const [contentTransformStep, setContentTransformStep] = useState(1);
  const [docStudioStep, setDocStudioStep] = useState(0);

  // Content transfer between Doc Studio and Content AI Studio
  const [transferContent, setTransferContent] = useState<string | null>(null);
  const [transferFileName, setTransferFileName] = useState<string | null>(null);
  const [cameFromDocStudio, setCameFromDocStudio] = useState(false);
  const [cameFromDashboard, setCameFromDashboard] = useState(false);
  const [returnToDocStudioStep, setReturnToDocStudioStep] = useState<number>(0);

  // Store Doc Studio state to preserve it when switching to Content AI Studio
  const [docStudioState, setDocStudioState] = useState<DocStudioState | null>(null);
  const [contentStudioProjectPath, setContentStudioProjectPath] = useState<string | null>(null);
  const [contentStudioRecentArticles, setContentStudioRecentArticles] = useState<ZenArticle[]>([]);
  const [contentStudioAllFiles, setContentStudioAllFiles] = useState<StudioFile[]>([]);
  const [contentStudioRequestedArticleId, setContentStudioRequestedArticleId] = useState<string | null>(null);
  const [contentStudioRequestedFilePath, setContentStudioRequestedFilePath] = useState<string | null>(null);
  const [docStudioRequestedFilePath, setDocStudioRequestedFilePath] = useState<string | null>(null);
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
  const [_contentTransformHeaderTab, setContentTransformHeaderTab] = useState<"preview" | "next">("next");
  const [_contentTransformShowBackToPosting, setContentTransformShowBackToPosting] = useState(false);
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
  const [docStudioHeaderAction, setDocStudioHeaderAction] = useState<"save" | "preview" | null>(null);
  const [docStudioGeneratedContent, setDocStudioGeneratedContent] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(max-width: 900px)");
    const isIpad = () =>
      /iPad/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const update = () => {
      const shouldBlock = !isTauri() && !isIpad() && media.matches;
      setIsMobileBlocked(shouldBlock);
    };

    update();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    if (typeof media.addListener === "function") {
      media.addListener(update);
      return () => media.removeListener(update);
    }

    return;
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    const bootstrap = async () => {
      const info = await ensureAppConfig();
      const nextPath = info.config.lastProjectPath ?? info.defaultProjectPath;
      if (!info.config.hasSeenBootstrapNotice) {
        setBootstrapProjectPath(info.defaultProjectPath);
        setShowBootstrapModal(true);
        void markBootstrapNoticeSeen();
      }
      if (nextPath) {
        localStorage.setItem('zenpost_last_project_path', nextPath);
        setContentStudioProjectPath(nextPath);
        await refreshContentStudioData(nextPath);
      }
    };
    void bootstrap();
  }, []);


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
    setTransferFileName(null);
    setCameFromDocStudio(false);
    setCameFromDashboard(false);
    setMultiPlatformMode(true);
    setContentTransformStep(2); // Start at platform selection
    setCurrentScreen("content-transform");
  };

  const handleLoadWebDocument = (content: string, fileName: string) => {
    setTransferContent(content);
    setTransferFileName(fileName);
    setCameFromDocStudio(false);
    setCameFromDashboard(false);
    setMultiPlatformMode(false);
    setContentTransformStep(1);
    setCurrentScreen("content-transform");
    setShowContentStudioModal(false);
  };

  const handleEditScheduledPost = (post: ScheduledPost) => {
    // Build content with title and subtitle as markdown headers
    let fullContent = '';
    if (post.title) {
      fullContent += `# ${post.title}\n\n`;
    }
    if (post.subtitle) {
      fullContent += `*${post.subtitle}*\n\n`;
    }
    fullContent += post.content || '';

    setTransferContent(fullContent.trim());
    setCameFromDocStudio(false);
    setCameFromDashboard(false);
    setShowPlannerModal(false);
    setContentTransformStep(1);
    setCurrentScreen("content-transform");
  };

  const persistScheduledPosts = async (posts: ScheduledPost[]) => {
    setScheduledPosts(posts);
    const projectPath =
      docStudioState?.projectPath ||
      contentStudioProjectPath ||
      localStorage.getItem('zenpost_last_project_path');
    if (!projectPath) return;
    try {
      await saveScheduledPostsWithFiles(projectPath, posts);
    } catch (error) {
      console.error('[PublishingService] Failed to save scheduled posts:', error);
    }
  };

  const reloadScheduledPosts = async () => {
    if (!isTauri()) return;
    const projectPath =
      docStudioState?.projectPath ||
      contentStudioProjectPath ||
      localStorage.getItem('zenpost_last_project_path');
    if (!projectPath) return;
    try {
      await initializePublishingProject(projectPath);
      const project = await loadSchedule(projectPath);
      setScheduledPosts(project.posts);
    } catch (error) {
      console.error('[PublishingService] Failed to reload scheduled posts:', error);
    }
  };
  const handleSelectDocStudio = () => {
    // Check if there's a saved project path in localStorage
    const savedProjectPath = localStorage.getItem('zenpost_last_project_path');

    if (savedProjectPath) {
      // Start at Context (Step 0)
      setDocStudioStep(0);
      setReturnToDocStudioStep(0);
    } else {
      // No project selected, start at Context (Step 0)
      setDocStudioStep(0);
      setReturnToDocStudioStep(0);
    }

    setCurrentScreen("doc-studio");
  };

  const handleOpenDocStudioForPosting = (content: string) => {
    const storedProjectPath = localStorage.getItem('zenpost_last_project_path');
    setDocStudioState((prev) => ({
      projectPath: storedProjectPath ?? prev?.projectPath ?? null,
      projectInfo: prev?.projectInfo ?? null,
      selectedTemplate: null,
      selectedTemplates: prev?.selectedTemplates ?? [],
      generatedContent: content,
      activeTabId: prev?.activeTabId ?? null,
      openFileTabs: prev?.openFileTabs ?? [],
      tabContents: prev?.tabContents ?? {},
      dirtyTabs: prev?.dirtyTabs ?? {},
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

  const handleSelectGettingStarted = () => {
    setCurrentScreen("getting-started");
  };

  // Open Content AI from Dashboard with blog-post preset
  const handleOpenContentAIFromDashboard = () => {
    setCameFromDashboard(true);
    setCameFromDocStudio(false);
    setTransferContent(null); // No initial content
    setContentTransformStep(1);
    setCurrentScreen("content-transform");
  };

  // Return to Getting Started from Content AI
  const handleBackToGettingStarted = (_generatedContent?: string) => {
    setCameFromDashboard(false);
    setCurrentScreen("getting-started");
    // Could save the generated content here if needed
  };

  const handleBackToWelcome = () => {
    setCurrentScreen("welcome");
  };

  // Handle step-wise back navigation for DocStudioScreen
  const handleDocStudioBack = () => {
    if (docStudioStep > 0) {
      // Go to previous step within DocStudio
      setDocStudioStep(docStudioStep - 1);
    } else {
      // Step 0: go back to welcome screen
      handleBackToWelcome();
    }
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
  const handleHelpClick = () => setShowWalkthroughModal(true);
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
    if (typeof window === 'undefined') return;
    const handleProjectPathUpdated = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (!detail) return;
      localStorage.setItem('zenpost_last_project_path', detail);
      setContentStudioProjectPath(detail);
      setDocStudioState(prev => (prev ? { ...prev, projectPath: detail } : prev));
      refreshContentStudioData(detail);
    };
    window.addEventListener('zenpost-project-path-updated', handleProjectPathUpdated as EventListener);
    return () => {
      window.removeEventListener('zenpost-project-path-updated', handleProjectPathUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!showContentStudioModal) return;
    refreshContentStudioData();
  }, [showContentStudioModal]);

  useEffect(() => {
    if (!isTauri()) return;
    if (!docStudioState?.projectPath) return;
    localStorage.setItem('zenpost_last_project_path', docStudioState.projectPath);
    void updateLastProjectPath(docStudioState.projectPath);
  }, [docStudioState?.projectPath]);

  useEffect(() => {
    if (!isTauri()) return;
    const projectPath = docStudioState?.projectPath ?? contentStudioProjectPath;
    if (!projectPath) return;
    const loadScheduled = async () => {
      try {
        await initializePublishingProject(projectPath);
        const project = await loadSchedule(projectPath);
        setScheduledPosts(project.posts);
      } catch (error) {
        console.error('[PublishingService] Failed to load scheduled posts:', error);
      }
    };
    void loadScheduled();
  }, [docStudioState?.projectPath, contentStudioProjectPath]);

  useEffect(() => {
    if (!showPlannerModal) return;
    void reloadScheduledPosts();
  }, [showPlannerModal]);

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
        if (isTauri()) {
          await updateLastProjectPath(result);
        }
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
      "getting-started": "Getting Started",
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
        const docText = docStudioStep === 0 ? 'Projekt' :
                       docStudioStep === 1 ? 'Analyse' :
                       docStudioStep === 2 ? 'Templates' :
                       docStudioStep === 3 ? 'Editor' : 'Doc Studio';
        return (
          <>
            Step {docStudioStep + 1}/4 • <span style={{ color: "#AC8E66" }}>{docText}</span>
          </>
        );
      case "getting-started":
        return <>Getting Started · <span style={{ color: "#AC8E66" }}>Was möchtest du tun?</span></>;
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
              label="Neue Analyse"
              icon={<FontAwesomeIcon icon={faRotateLeft} />}
              onClick={() => {
                setDocStudioStep(1);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2 ml-auto">
            <StudioBarButton
              label="Export"
              icon={<FontAwesomeIcon icon={faFileExport} />}
              onClick={() => {
                setExportContent(docStudioGeneratedContent);
                setShowExportModal(true);
              }}
            />
            <StudioBarButton
              label="Speichern"
              icon={<FontAwesomeIcon icon={faSave} />}
              onClick={() => setDocStudioHeaderAction("save")}
            />
            <StudioBarButton
              label="Preview"
              icon={<FontAwesomeIcon icon={faFileLines} />}
              onClick={() => setDocStudioHeaderAction("preview")}
            />
          </div>
        </div>
      );
    }

    // Content Transform Tab-Leiste
    if (currentScreen !== "content-transform") return undefined;
    return (
      <div className="px-[4vw] py-[3px] mt-[10px]">
        <div className="flex items-center justify-between flex-wrap gap-2">
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
            <div className="flex flex-wrap gap-2 ml-auto">
              <StudioBarButton
                label="KI für Plattformen"
                icon={<FontAwesomeIcon icon={faWandMagicSparkles} />}
                onClick={handleNavigateToMultiPlatformTransform}
              />
              <StudioBarButton
                label="Speichern"
                icon={<FontAwesomeIcon icon={faSave} />}
                onClick={() => setContentTransformHeaderAction("save")}
              />
              <StudioBarButton
                label="Preview"
                icon={<FontAwesomeIcon icon={faFileLines} />}
                onClick={() => setContentTransformHeaderAction("preview")}
              />
            </div>
          )}
          {(contentTransformStep === 2 || contentTransformStep === 3) && (
            <div className="flex flex-wrap gap-2 ml-auto">
              <StudioBarButton
                label="KI für Plattformen"
                icon={<FontAwesomeIcon icon={faWandMagicSparkles} />}
                onClick={handleNavigateToMultiPlatformTransform}
              />
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

              {/* Rechts: KI Transform, Export & Planen */}
              <div className="flex flex-wrap gap-2 ml-auto">
                <StudioBarButton
                  label="KI für Plattformen"
                  icon={<FontAwesomeIcon icon={faWandMagicSparkles} />}
                  onClick={handleNavigateToMultiPlatformTransform}
                />
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
        {contentTransformStep === 1 && null}
      </div>
    );
  };

  if (isMobileBlocked) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "linear-gradient(180deg, #0B0B0B 0%, #151515 100%)",
          color: "#e5e5e5",
          textAlign: "center",
          fontFamily: "IBM Plex Mono, monospace",
        }}
      >
        <div
          style={{
            maxWidth: "520px",
            backgroundColor: "rgba(10, 10, 10, 0.9)",
            border: "1px solid #AC8E66",
            borderRadius: "12px",
            padding: "28px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              marginBottom: "12px",
              color: "#AC8E66",
            }}
          >
            ZenPost Studio
          </div>
          <div style={{ fontSize: "13px", lineHeight: 1.6 }}>
            Diese App ist nur auf Desktop oder iPad verfügbar.
            <br />
            Die mobile App-Version ist für dein Gerät noch nicht verfügbar.
          </div>
          <div
            style={{
              marginTop: "18px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <button
              onClick={() => openExternal("https://theoriginalbitter.github.io/zenpost-studio/")}
              style={{
                width: "220px",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #3A3A3A",
                background: "transparent",
                color: "#e5e5e5",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Wiki & Docs
            </button>
            <button
              onClick={() => openExternal("https://github.com/THEORIGINALBITTER/zenpost-studio")}
              style={{
                width: "220px",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #3A3A3A",
                background: "transparent",
                color: "#e5e5e5",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              GitHub
            </button>
            <button
              onClick={() => openExternal("mailto:saghallo@denisbitter.de")}
              style={{
                width: "220px",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #3A3A3A",
                background: "transparent",
                color: "#e5e5e5",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Support E-Mail
            </button>
          </div>
          <DeveloperInfo
            compact={true}
            onOpenProfile={() => openExternal("https://denisbitter.de/about")}
          />
          <button
            onClick={() => openExternal("https://denisbitter.de")}
            style={{
              marginTop: "18px",
              paddingTop: "14px",
              borderTop: "1px solid #2A2A2A",
              fontSize: "11px",
              color: "#8e8e8e",
              letterSpacing: "0.02em",
              background: "transparent",
              borderLeft: "none",
              borderRight: "none",
              borderBottom: "none",
              width: "100%",
              fontFamily: "IBM Plex Mono, monospace",
              cursor: "pointer",
            }}
          >
            Made with <span style={{ color: "#AC8E66" }}>♥</span> by{" "}
            <span style={{ color: "#AC8E66" }}>Denis Bitter</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        minWidth: '1200px',
        background: 'linear-gradient(180deg, #0B0B0B 0%, #151515 100%)',
      }}
    >
      {/* Globaler Header - Fixed */}
      <ZenHeader
        leftText={getLeftText()}
        rightText={getRightText()}
     
        onHome={currentScreen !== "welcome" ? handleHomeClick : undefined}
        onSettings={handleSettingsClick}
        onInfo={handleInfoClick}
        onHelp={handleHelpClick}
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
            onSelectGettingStarted={handleSelectGettingStarted}
          />
        )}
        {currentScreen === "converter" && (
          <ConverterScreen
            onBack={handleBackToWelcome}
            onStepChange={setConverterStep}
            onOpenInContentStudio={(content, fileName) => {
              setTransferContent(content);
              setTransferFileName(fileName);
              setCameFromDocStudio(false);
              setCameFromDashboard(false);
              setMultiPlatformMode(false);
              setContentTransformStep(1);
              setCurrentScreen("content-transform");
            }}
          />
        )}
        {currentScreen === "content-transform" && (
          <ContentTransformScreen
            onBack={handleBackToWelcome}
            onStepChange={setContentTransformStep}
            currentStep={contentTransformStep}
            initialContent={transferContent}
            initialFileName={transferFileName}
            initialPlatform={cameFromDashboard ? 'blog-post' : undefined}
            cameFromDocStudio={cameFromDocStudio}
            cameFromDashboard={cameFromDashboard}
            onBackToDocStudio={handleBackToDocStudio}
            onBackToDashboard={handleBackToGettingStarted}
            onOpenConverter={() => {
              setCameFromDocStudio(false);
              setCameFromDashboard(false);
              setMultiPlatformMode(false);
              setCurrentScreen("converter");
              setConverterStep(1);
            }}
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
            onEditorTypeChange={setContentEditorType}
            multiPlatformMode={multiPlatformMode}
            onMultiPlatformModeChange={setMultiPlatformMode}
          />
        )}
        {currentScreen === "doc-studio" && (
          <FeatureGate featureId="DOC_STUDIO" onClose={handleDocStudioBack}>
            <DocStudioScreen
              onBack={handleDocStudioBack}
              onTransferToContentStudio={handleTransferToContentStudio}
              onStepChange={setDocStudioStep}
              initialStep={docStudioStep}
              savedState={docStudioState}
              onStateChange={handleSaveDocStudioState}
              onGeneratedContentChange={setDocStudioGeneratedContent}
              headerAction={docStudioHeaderAction}
              onHeaderActionHandled={() => setDocStudioHeaderAction(null)}
              requestedFilePath={docStudioRequestedFilePath}
              onFileRequestHandled={() => setDocStudioRequestedFilePath(null)}
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
            />
          </FeatureGate>
        )}
        {currentScreen === "getting-started" && (
          <GettingStartedScreen
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

      {/* Walkthrough Modal */}
      <WalkthroughModal
        isOpen={showWalkthroughModal}
        onClose={() => setShowWalkthroughModal(false)}
        autoStart={true}
      />

      <ZenContentStudioModal
        isOpen={showContentStudioModal}
        onClose={handleCloseContentStudioModal}
        title={currentScreen === "doc-studio" ? "Doc Studio" : "Content Studio"}
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
          if (currentScreen === "doc-studio") {
            setDocStudioRequestedFilePath(filePath);
          } else {
            setContentStudioRequestedFilePath(filePath);
          }
          setShowContentStudioModal(false);
        }}
        onLoadWebDocument={handleLoadWebDocument}
        onOpenConverter={() => {
          setShowContentStudioModal(false);
          setCurrentScreen("converter");
        }}
        metadata={contentStudioMetadata}
        onSaveMetadata={setContentStudioMetadata}
      />

      <ZenBootstrapModal
        isOpen={showBootstrapModal}
        onClose={() => setShowBootstrapModal(false)}
        defaultProjectPath={bootstrapProjectPath ?? '—'}
      />

      {/* Publishing Modal (kombiniert Planen, Kalender, Checklist) */}
      <ZenPlannerModal
        isOpen={showPlannerModal}
        onClose={() => {
          setShowPlannerModal(false);
          setSelectedDateFromCalendar(undefined);
        }}
        scheduledPosts={scheduledPosts}
        projectPath={
          currentScreen === 'doc-studio'
            ? docStudioState?.projectPath ?? contentStudioProjectPath
            : contentStudioProjectPath
        }
        onReloadSchedule={reloadScheduledPosts}
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
