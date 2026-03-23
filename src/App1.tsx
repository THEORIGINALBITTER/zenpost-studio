// App1.tsx
import { useState, useEffect, useMemo, useRef } from "react";
import { Helmet } from "react-helmet-async";

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
  faChevronDown,
  faRotateLeft,
  faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { ConverterScreen } from "./screens/ConverterScreen";
import { ContentTransformScreen } from "./screens/ContentTransformScreen";
import { ContentStudioDashboardScreen } from "./screens/ContentStudio/ContentStudioDashboardScreen";
import { ContentStudioProjectMapScreen } from "./screens/ContentStudio/ContentStudioProjectMapScreen";
import { DocStudioScreen } from "./screens/DocStudioScreen";
import { GettingStartedScreen, type GettingStartedRecentItem } from "./screens/GettingStartedScreen";
import { MobileInboxScreen } from "./screens/MobileInboxScreen";
import { ZenHeader } from "./kits/PatternKit/ZenHeader";
import { ZenSettingsModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenSettingsModal";
import { ZenAboutModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenAboutModal";
import { ZenBugReportModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenBugReportModal";
import { ZenMailSuccessModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenMailSuccessModal";
import { ZenContentStudioModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenContentStudioModal";
import { ZenWebProjectPickerModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenWebProjectPickerModal";
import { ZenPlannerModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenPlannerModal";
import { ZenExportModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenExportModal";
import { ZenUpgradeModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenUpgradeModal";
import { ZenBootstrapModal } from "./kits/PatternKit/ZenModalSystem/modals/ZenBootstrapModal";
import { createDefaultProjectMetadata, type ProjectMetadata } from "./kits/PatternKit/ZenModalSystem/modals/ZenMetadataModal";
import type { ScheduledPost } from "./types/scheduling";
import { defaultDocInputFields, type DocStudioState } from "./screens/DocStudio/types";
import { initializePublishingProject, loadSchedule, saveScheduledPostsWithFiles } from "./services/publishingService";
import { loadArticles, type ZenArticle } from "./services/publishingService";
import { WalkthroughModal } from "./kits/HelpDocStudio";
import { getSmartDocTemplate } from "./screens/DocStudio/templates";
import { open } from "@tauri-apps/plugin-dialog";
import { exists as fsExists, mkdir as fsMkdir, readDir, readFile, readTextFile, stat, writeTextFile } from "@tauri-apps/plugin-fs";
import { LicenseProvider, useLicense } from "./contexts/LicenseContext";
import { FeatureGate } from "./components/FeatureGate";
import { ZenPublishingBanner } from "./components/ZenPublishingBanner";
import { usePublishingEngine } from "./services/publishingEngine";
import { pushDocsToGitHub } from "./services/githubDocsService";
import { loadSocialConfig } from "./services/socialMediaService";
import { CornerRibbon } from "./components/CornerRibbon";
import { isTauri } from "@tauri-apps/api/core";
import { useOpenExternal } from "./hooks/useOpenExternal";
import { useZenIdle } from "./hooks/useZenIdle";
import { ensureAppConfig, markBootstrapNoticeSeen, updateLastProjectPath } from "./services/appConfigService";
import { getLastProjectPath, getRecentProjectPaths, rememberProjectPath, removeProjectPath } from "./utils/projectHistory";
import {
  encodeWebProjectPath, isWebProjectPath,
  getDirectoryHandle, readMarkdownFiles,
  type WebProject,
} from "./services/webProjectService";
import { loadZenStudioSettings, parseZenThoughtsFromEditor, patchZenStudioSettings, initZenStudioSettings } from "./services/zenStudioSettingsService";
import { getWebMobileDraftFileContent, getWebMobilePhotoDataUrl, type MobileDraft } from "./services/mobileInboxService";

import ZenCursor from "./components/ZenCursor";

const blocksToMarkdown = (blocks: Array<{ type: string; data: Record<string, unknown> }>, title?: string): string => {
  const lines: string[] = [];
  const hasH1 = blocks.some((block) => {
    if (block.type !== 'header') return false;
    const level = typeof block.data.level === 'number' ? block.data.level : 2;
    return level === 1;
  });
  if (title && !hasH1) lines.push(`# ${title}`, '');
  for (const block of blocks) {
    switch (block.type) {
      case 'header': {
        const level = typeof block.data.level === 'number' ? block.data.level : 2;
        lines.push(`${'#'.repeat(level)} ${String(block.data.text ?? '')}`);
        break;
      }
      case 'image': {
        // Server stores URL in data.src (custom) OR data.url OR data.file.url (EditorJS default)
        const fileObj = block.data.file as Record<string, unknown> | undefined;
        const url = String(block.data.src ?? fileObj?.url ?? block.data.url ?? '');
        const alt = String(block.data.alt ?? block.data.caption ?? '');
        if (url) lines.push(`![${alt}](${url})`);
        break;
      }
      case 'youtube':
      case 'video':
      case 'embed': {
        const url = String(block.data.url ?? block.data.src ?? block.data.embed ?? '');
        const label = block.type === 'youtube' ? 'YouTube' : block.type === 'video' ? 'Video' : 'Embed';
        if (url) lines.push(`[${label}: ${url}](${url})`);
        break;
      }
      case 'quote': {
        const text = String(block.data.text ?? '').trim();
        const caption = String(block.data.caption ?? '').trim();
        if (text) lines.push(`> ${text}`);
        if (caption) lines.push(`> — ${caption}`);
        break;
      }
      case 'list': {
        type ListItem = { content?: string; items?: ListItem[] };
        const rawItems = Array.isArray(block.data.items) ? block.data.items : [];
        const ordered = block.data.style === 'ordered';
        rawItems.forEach((item, i) => {
          // Items can be plain strings OR objects {content, items, meta}
          const text = typeof item === 'string' ? item : String((item as ListItem).content ?? '');
          if (text.trim()) lines.push(ordered ? `${i + 1}. ${text.trim()}` : `- ${text.trim()}`);
        });
        break;
      }
      case 'cta': {
        const text = String(block.data.text ?? 'Link');
        const url = String(block.data.url ?? '');
        if (url) lines.push(`[${text}](${url})`);
        break;
      }
      case 'delimiter':
        lines.push('---');
        break;
      case 'code': {
        const code = String(block.data.code ?? '').trim();
        if (code) lines.push('```\n' + code + '\n```');
        break;
      }
      default: {
        const text = String(block.data.text ?? '').trim();
        if (text) lines.push(text);
      }
    }
    lines.push('');
  }
  return lines.join('\n').trim();
};

const extractFirstImageUrlFromBlocks = (
  blocks: Array<{ type: string; data: Record<string, unknown> }>
): string => {
  for (const block of blocks) {
    if (block.type !== 'image') continue;
    const fileObj = block.data.file as Record<string, unknown> | undefined;
    const url = String(block.data.src ?? fileObj?.url ?? block.data.url ?? '').trim();
    if (url) return url;
  }
  return '';
};


type Screen = "welcome" | "converter" | "content-transform" | "doc-studio" | "getting-started" | "mobile-inbox";

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
  const { checkFeature, requestUpgrade } = useLicense();
  const WEB_DOCS_STORAGE_KEY = "zenpost_web_documents_v1";
  const [isMobileBlocked, setIsMobileBlocked] = useState(false);
  const isIdle = useZenIdle(2000);
  const { openExternal } = useOpenExternal();
  const [currentScreen, setCurrentScreen] = useState<Screen>("getting-started");
  const [bootstrapComplete, setBootstrapComplete] = useState(!isTauri());
  const appReadyFiredRef = useRef(false);
  const [showAISettingsModal, setShowAISettingsModal] = useState(false);
  const [settingsDefaultTab, setSettingsDefaultTab] = useState<'ai' | 'social' | 'editor' | 'license' | 'localai' | 'api' | 'zenstudio' | 'mobile'>('ai');
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showBugReportModal, setShowBugReportModal] = useState(false);
  const [showMailSuccessModal, setShowMailSuccessModal] = useState(false);
  const [showWalkthroughModal, setShowWalkthroughModal] = useState(false);
  const [showBootstrapModal, setShowBootstrapModal] = useState(false);
  const [bootstrapProjectPath, setBootstrapProjectPath] = useState<string | null>(null);

  // Track step information for each screen
  const [converterStep, setConverterStep] = useState(1);
  const [contentTransformStep, setContentTransformStep] = useState(1);
  const [contentStudioDashboardView, setContentStudioDashboardView] = useState<"dashboard" | "project-map">("dashboard");
  const [dashboardActiveContextPath, setDashboardActiveContextPath] = useState<string | null>(null);
  const [docStudioStep, setDocStudioStep] = useState(0);
  const [docStudioInitialWizard, setDocStudioInitialWizard] = useState<'github' | 'docs-site' | undefined>(undefined);

  // Content transfer between Doc Studio and Content AI Studio
  const [transferContent, setTransferContent] = useState<string | null>(null);
  const [transferFileName, setTransferFileName] = useState<string | null>(null);
  const [transferPostMeta, setTransferPostMeta] = useState<{ title: string; subtitle: string; imageUrl: string; date: string } | null>(null);
  const [cameFromDocStudio, setCameFromDocStudio] = useState(false);
  const [cameFromDashboard, setCameFromDashboard] = useState(false);
  const [returnToDocStudioStep, setReturnToDocStudioStep] = useState<number>(0);

  // Store Doc Studio state to preserve it when switching to Content AI Studio
  const [docStudioState, setDocStudioState] = useState<DocStudioState | null>(null);
  const [contentStudioProjectPath, setContentStudioProjectPath] = useState<string | null>(null);
  const [contentStudioRecentProjectPaths, setContentStudioRecentProjectPaths] = useState<string[]>(() => getRecentProjectPaths());
  const [contentStudioRecentArticles, setContentStudioRecentArticles] = useState<ZenArticle[]>([]);
  const [contentStudioAllFiles, setContentStudioAllFiles] = useState<StudioFile[]>([]);
  const [webDocuments, setWebDocuments] = useState<WebStoredDocument[]>([]);
  const [contentStudioServerArticles, setContentStudioServerArticles] = useState<unknown[] | undefined>(undefined);
  const [contentStudioServerArticlesLoading, setContentStudioServerArticlesLoading] = useState(false);
  const [contentStudioServerArticlesError, setContentStudioServerArticlesError] = useState<string | null>(null);
  const [activeServerArticleSlug, setActiveServerArticleSlug] = useState<string | null>(null);
  const [activeBlogForEditor, setActiveBlogForEditor] = useState<import('./services/zenStudioSettingsService').BlogConfig | null>(null);
  const [contentStudioServerCachePath, setContentStudioServerCachePath] = useState<string | null>(null);
  const [contentStudioRequestedArticleId, setContentStudioRequestedArticleId] = useState<string | null>(null);
  const [contentStudioRequestedFilePath, setContentStudioRequestedFilePath] = useState<string | null>(null);
  const [docStudioRequestedFilePath, setDocStudioRequestedFilePath] = useState<string | null>(null);
  const [docStudioRequestedWebDocument, setDocStudioRequestedWebDocument] = useState<{ fileName: string; content: string } | null>(null);
  const [showContentStudioModal, setShowContentStudioModal] = useState(false);
  const [contentStudioModalTab, setContentStudioModalTab] = useState<"project" | "all">("project");
  const [showWebProjectPicker, setShowWebProjectPicker] = useState(false);
  const [contentTransformHeaderAction, setContentTransformHeaderAction] = useState<
    "preview"
    | "next"
    | "copy"
    | "download"
    | "edit"
    | "post"
    | "posten"
    | "post_direct"
    | "reset"
    | "back_doc"
    | "back_dashboard"
    | "back_posting"
    | "save"
    | "save_as"
    | "save_server"
    | "transform"
    | "format_only"
    | "post_all"
    | "goto_platforms"
    | null
  >(null);
  const [showContentSaveMenu, setShowContentSaveMenu] = useState(false);
  const contentSaveMenuRef = useRef<HTMLDivElement | null>(null);
  const [_contentTransformHeaderTab, setContentTransformHeaderTab] = useState<"preview" | "next">("next");
  const [_contentTransformShowBackToPosting, setContentTransformShowBackToPosting] = useState(false);
  const [contentTransformStep2SelectionCount, setContentTransformStep2SelectionCount] = useState(0);
  const [contentTransformStep2CanProceed, setContentTransformStep2CanProceed] = useState(false);
  const [contentStudioMetadata, setContentStudioMetadata] = useState<ProjectMetadata>({
    authorName: "",
    authorEmail: "",
    companyName: "",
    license: "MIT",
    year: new Date().getFullYear().toString(),
    website: "",
    repository: "",
    contributingUrl: "",
    description: "",
    keywords: "",
    lang: "de",
  });

  // Publishing State (geteilt zwischen Doc Studio & Content AI Studio)
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [plannerDefaultTab, setPlannerDefaultTab] = useState<'planen' | 'kalender' | 'checklist'>('planen');
  const [selectedDateFromCalendar, setSelectedDateFromCalendar] = useState<Date | undefined>(undefined);
  const [schedulerPlatformPosts, setSchedulerPlatformPosts] = useState<Array<{ platform: string; content: string }>>([]);
  const [contentPlannerSuggestion, setContentPlannerSuggestion] = useState<{
    key: string;
    tabId: string;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    content: string;
    platform?: string;
  } | null>(null);
  // Track which scheduled post is being edited (to update on save)
  const [editingScheduledPostId, setEditingScheduledPostId] = useState<string | null>(null);

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportContent, setExportContent] = useState<string>("");
  const [exportTags, setExportTags] = useState<string[]>([]);
  const [isEditingZenThoughts, setIsEditingZenThoughts] = useState(false);
  const [exportDocumentName, setExportDocumentName] = useState<string>("");
  const [exportSubtitle, setExportSubtitle] = useState<string>("");
  const [exportImageUrl, setExportImageUrl] = useState<string>("");
  const [docStudioHeaderAction, setDocStudioHeaderAction] = useState<"save" | "preview" | "rescan" | null>(null);
  const [docStudioPreviewMode, setDocStudioPreviewMode] = useState(false);
  const [docStudioGeneratedContent, setDocStudioGeneratedContent] = useState<string>("");

  // App-Start: Studio-Settings aus Datei laden (überschreibt localStorage mit persistiertem Stand)
  useEffect(() => { void initZenStudioSettings(); }, []);

  useEffect(() => {
    if (!showContentSaveMenu) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (contentSaveMenuRef.current && target && !contentSaveMenuRef.current.contains(target)) {
        setShowContentSaveMenu(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showContentSaveMenu]);

  useEffect(() => {
    if (currentScreen !== "content-transform" || contentTransformStep !== 1) {
      setShowContentSaveMenu(false);
    }
  }, [currentScreen, contentTransformStep]);

  useEffect(() => {
    if (contentTransformStep !== 0 && contentStudioDashboardView !== "dashboard") {
      setContentStudioDashboardView("dashboard");
    }
  }, [contentTransformStep, contentStudioDashboardView]);

  const refetchContentStudioServerArticles = () => {
    const settings = loadZenStudioSettings();
    const activeServer = settings.servers?.[settings.activeServerIndex ?? 0];
    const localCachePath = (
      activeServer?.contentServerLocalCachePath
      ?? settings.contentServerLocalCachePath
      ?? ''
    ).trim();
    if (!localCachePath) {
      setContentStudioServerArticles([]);
      setContentStudioServerArticlesError('Lokaler Server-Cache-Pfad fehlt. Bitte in API-Einstellungen setzen.');
      return;
    }
    let base = (settings.contentServerApiUrl ?? '').trim();
    if (!base) {
      setContentStudioServerArticles([]);
      setContentStudioServerArticlesError('Keine Verbindung. Stelle Deine Verbindung im Zahnrad unter API ein.');
      return;
    }
    if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
    const endpoint = (settings.contentServerListEndpoint ?? '/articles.php').trim();
    const url = /^https?:\/\//i.test(endpoint) ? endpoint : `${base.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
    const headers: Record<string, string> = {};
    if (settings.contentServerApiKey) headers['Authorization'] = `Bearer ${settings.contentServerApiKey}`;
    setContentStudioServerArticlesLoading(true);
    setContentStudioServerArticlesError(null);
    fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(10000) })
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          setContentStudioServerArticles(data as unknown[]);
          return;
        }
        setContentStudioServerArticles([]);
        setContentStudioServerArticlesError('Antwort vom Server ist ungültig. Bitte API-Endpoint prüfen.');
      })
      .catch((err: unknown) => {
        setContentStudioServerArticles([]);
        const message = err instanceof Error ? err.message.toLowerCase() : '';
        const connectionIssue =
          message.includes('load failed') ||
          message.includes('failed to fetch') ||
          message.includes('network') ||
          message.includes('timeout') ||
          message.includes('http 0');
        setContentStudioServerArticlesError(
          connectionIssue
            ? 'Keine Verbindung. Stelle Deine Verbindung im Zahnrad unter API ein.'
            : 'Server konnte nicht geladen werden. Bitte API-Einstellungen prüfen.'
        );
      })
      .finally(() => setContentStudioServerArticlesLoading(false));
  };

  useEffect(() => {
    if (currentScreen !== "content-transform" || contentTransformStep !== 0) return;
    refetchContentStudioServerArticles();
  }, [currentScreen, contentTransformStep]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(max-width: 900px)");
    const isIpad = () =>
      /iPad/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isMobileLikeDevice = () => {
      const ua = navigator.userAgent || "";
      const mobileUa = /Android|iPhone|iPod|Windows Phone|webOS|Mobile/i.test(ua);
      const touchPoints = navigator.maxTouchPoints || 0;
      const viewportWidth = Math.min(
        window.innerWidth || Number.MAX_SAFE_INTEGER,
        window.screen?.width || Number.MAX_SAFE_INTEGER
      );
      // Handles phones/tablets even when "Desktop Website" is enabled.
      const touchViewportMatch = touchPoints > 1 && viewportWidth <= 1280;

      return mobileUa || touchViewportMatch;
    };

    const update = () => {
      const shouldBlock =
        !isTauri() && !isIpad() && (media.matches || isMobileLikeDevice());
      setIsMobileBlocked(shouldBlock);
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => {
        window.removeEventListener("resize", update);
        window.removeEventListener("orientationchange", update);
        media.removeEventListener("change", update);
      };
    }

    if (typeof media.addListener === "function") {
      media.addListener(update);
      return () => {
        window.removeEventListener("resize", update);
        window.removeEventListener("orientationchange", update);
        media.removeListener(update);
      };
    }

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!isTauri()) return;
    document.body.classList.add("zen-tauri");
    document.documentElement.classList.add("zen-tauri");
    return () => {
      document.body.classList.remove("zen-tauri");
      document.documentElement.classList.remove("zen-tauri");
    };
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    const bootstrap = async () => {
      try {
        const info = await ensureAppConfig();
        const nextPath = info.config.lastProjectPath ?? info.defaultProjectPath;
        if (!info.config.hasSeenBootstrapNotice) {
          setBootstrapProjectPath(info.defaultProjectPath);
          setShowBootstrapModal(true);
          void markBootstrapNoticeSeen();
        }
        if (nextPath) {
          rememberProjectPath(nextPath);
          setContentStudioProjectPath(nextPath);
          await refreshContentStudioData(nextPath);
        }
      } finally {
        setBootstrapComplete(true);
      }
    };
    void bootstrap();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!bootstrapComplete || appReadyFiredRef.current) return;
    appReadyFiredRef.current = true;
    let cancelled = false;
    const fireReady = async () => {
      try {
        if (typeof document !== "undefined" && "fonts" in document) {
          await (document as Document & { fonts?: { ready: Promise<void> } }).fonts?.ready;
        }
      } catch {
        // ignore font readiness errors
      }
      await new Promise(requestAnimationFrame);
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      if (cancelled) return;
      window.dispatchEvent(new Event("zenpost-app-ready"));
    };
    void fireReady();
    return () => {
      cancelled = true;
    };
  }, [bootstrapComplete]);


  // Content AI Studio Editor Type (block = Editor.js, markdown = ZenMarkdownEditor)
  const [contentEditorType, setContentEditorType] = useState<"block" | "markdown">("block");

  const handleSelectConverter = () => {
    setIsEditingZenThoughts(false);
    setCurrentScreen("converter");
  };
  const handleSelectContentTransform = () => {
    setCameFromDocStudio(false);
    setCameFromDashboard(false);
    setMultiPlatformMode(false);
    setIsEditingZenThoughts(false);
    setActiveServerArticleSlug(null);
    setContentStudioServerCachePath(null);
    setContentStudioDashboardView("dashboard");
    setContentTransformStep(0);
    setCurrentScreen("content-transform");
  };

  // Multi-platform mode for Content AI Studio
  const [multiPlatformMode, setMultiPlatformMode] = useState(false);

  // Navigate to Content AI Studio from Export Modal for multi-platform transform
  const handleNavigateToMultiPlatformTransform = () => {
    // Export content is already set, use it as initial content
    setTransferContent(exportContent);
    setTransferFileName(null);
    setTransferPostMeta(null);
    setCameFromDocStudio(false);
    setCameFromDashboard(false);
    setMultiPlatformMode(true);
    setContentStudioDashboardView("dashboard");
    setContentTransformStep(2); // Start at platform selection
    setCurrentScreen("content-transform");
  };

  const persistWebDocument = (content: string, fileName: string) => {
    const safeName = fileName?.trim() || `Web-Dokument-${new Date().toISOString()}.md`;
    const now = Date.now();
    setWebDocuments((prev) => {
      const existingIndex = prev.findIndex((doc) => doc.name === safeName);
      let next: WebStoredDocument[];
      if (existingIndex >= 0) {
        next = prev.map((doc, index) =>
          index === existingIndex ? { ...doc, content, updatedAt: now } : doc
        );
      } else {
        next = [
          {
            id: `webdoc-${now}-${Math.random().toString(36).slice(2, 8)}`,
            name: safeName,
            content,
            updatedAt: now,
          },
          ...prev,
        ];
      }
      next.sort((a, b) => b.updatedAt - a.updatedAt);
      const capped = next.slice(0, 40);
      if (typeof window !== "undefined") {
        localStorage.setItem(WEB_DOCS_STORAGE_KEY, JSON.stringify(capped));
      }
      return capped;
    });
    return safeName;
  };

  const handleOpenWebDocumentInDocStudio = (content: string, fileName: string) => {
    const safeName = fileName?.trim() || "Web-Dokument.md";
    setDocStudioRequestedWebDocument({ fileName: safeName, content });
    setDocStudioStep(3);
    setCurrentScreen("doc-studio");
    setShowContentStudioModal(false);
  };

  const handleLoadWebDocument = (content: string, fileName: string) => {
    const safeName = persistWebDocument(content, fileName);

    if (currentScreen === "doc-studio") {
      handleOpenWebDocumentInDocStudio(content, safeName);
      return;
    }

    setTransferContent(content);
    setTransferFileName(safeName);
    setTransferPostMeta(null);
    setActiveServerArticleSlug(null);
    setContentStudioServerCachePath(null);
    setCameFromDocStudio(false);
    setCameFromDashboard(false);
    setMultiPlatformMode(false);
    setContentStudioDashboardView("dashboard");
    setContentTransformStep(1);
    setCurrentScreen("content-transform");
    setShowContentStudioModal(false);
  };

  const handleEditScheduledPost = async (post: ScheduledPost) => {
    // Use the post content directly - don't add headers automatically
    // The content should already contain any headers from previous edits
    let fullContent = post.content || '';

    // Prefer opening the saved file path directly when available
    if (isTauri() && post.savedFilePath) {
      setContentStudioRequestedFilePath(post.savedFilePath);
      setTransferContent(null);
      setTransferFileName(null);
      setTransferPostMeta({
        title: post.title || '',
        subtitle: post.subtitle || '',
        imageUrl: post.imageUrl || '',
        date: post.scheduledDate
          ? (post.scheduledDate instanceof Date ? post.scheduledDate : new Date(post.scheduledDate)).toISOString().split('T')[0]
          : '',
      });
      setEditingScheduledPostId(post.id);
      setCameFromDocStudio(false);
      setCameFromDashboard(false);
      setShowPlannerModal(false);
      setContentTransformStep(1);
      setCurrentScreen("content-transform");
      return;
    }

    // Only add title header if content doesn't already start with a markdown header
    const startsWithHeader = /^#\s/.test(fullContent.trim());
    if (!startsWithHeader && post.title) {
      // Add title and subtitle only if content doesn't have a header
      let header = `# ${post.title}\n\n`;
      if (post.subtitle) {
        header += `*${post.subtitle}*\n\n`;
      }
      fullContent = header + fullContent;
    }

    // Track which post is being edited so we can update it on save
    setEditingScheduledPostId(post.id);
    setTransferContent(fullContent.trim());
    setTransferFileName(post.title || post.platform);
    setTransferPostMeta({
      title: post.title || '',
      subtitle: post.subtitle || '',
      imageUrl: post.imageUrl || '',
      date: post.scheduledDate
        ? (post.scheduledDate instanceof Date ? post.scheduledDate : new Date(post.scheduledDate)).toISOString().split('T')[0]
        : '',
    });
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
      getLastProjectPath();
    if (!projectPath) return;
    try {
      await saveScheduledPostsWithFiles(projectPath, posts);
    } catch (error) {
      console.error('[PublishingService] Failed to save scheduled posts:', error);
    }
  };

  // Publishing Engine — detects due posts and exposes publish/skip actions
  const publishingEngine = usePublishingEngine(scheduledPosts, persistScheduledPosts);

  // GitHub Docs Push
  const [docStudioGithubDocsFileCount, setDocStudioGithubDocsFileCount] = useState(0);

  const scanDocsForGitHub = async (rootPath: string): Promise<Array<{ path: string; name: string }>> => {
    const results: Array<{ path: string; name: string }> = [];
    // All text-based file types worth syncing to GitHub docs
    const allowedExtensions = new Set(['md', 'mdx', 'txt', 'html', 'php', 'js', 'css', 'json', 'yaml', 'yml', 'example', 'nojekyll']);
    // Folders to never include
    const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', '.zenpost', 'src-tauri', '.vite', 'fixtures']);
    // Specific filenames to always skip
    const skipFiles = new Set(['.DS_Store', 'Thumbs.db', '.gitignore', 'package-lock.json', 'yarn.lock']);
    const maxDepth = 6;

    const scan = async (dirPath: string, depth: number) => {
      if (depth > maxDepth) return;
      let entries: Awaited<ReturnType<typeof readDir>>;
      try {
        entries = await readDir(dirPath);
      } catch {
        return;
      }

      for (const entry of entries) {
        const name = entry.name || '';
        if (entry.isDirectory) {
          if (name.startsWith('.') || skipDirs.has(name)) continue;
          await scan(`${dirPath}/${name}`, depth + 1);
        } else if (entry.isFile) {
          if (skipFiles.has(name) || name.startsWith('.DS_')) continue;
          const ext = name.split('.').pop()?.toLowerCase() || '';
          // Allow extensionless files like ".nojekyll" by checking the full name too
          const isAllowed = allowedExtensions.has(ext) || allowedExtensions.has(name.replace(/^\./, ''));
          if (!isAllowed) continue;
          const fullPath = `${dirPath}/${name}`;
          const repoName = fullPath
            .replace(rootPath, '')
            .replace(/^[/\\]/, '')
            .replace(/\\/g, '/');
          results.push({ path: fullPath, name: repoName || name });
        }
      }
    };

    await scan(rootPath, 0);
    return results;
  };



  const handlePushDocsToGitHubFromDocStudio = async () => {
    const config = loadSocialConfig();
    if (!config.github?.docsRepo) {
      throw new Error('Kein Docs-Repository konfiguriert (Einstellungen → Social Media → GitHub)');
    }
    if (!config.github?.accessToken) throw new Error('GitHub Access Token fehlt');
    if (!config.github?.username) throw new Error('GitHub Username fehlt');

    const projectPath = docStudioState?.projectPath || getLastProjectPath('doc');
    if (!projectPath || isWebProjectPath(projectPath)) {
      throw new Error('Kein lokaler Projektordner gewählt');
    }

    const docs = await scanDocsForGitHub(projectPath);
    if (docs.length === 0) {
      throw new Error('Keine Markdown-Dateien im Projekt gefunden');
    }

    const files = await Promise.all(
      docs.map(async (file) => ({
        name: file.name,
        content: await readTextFile(file.path),
      })),
    );

    return pushDocsToGitHub(files, config.github);
  };

  const handlePushTemplatesToGitHubFromDocStudio = async (templates: import('./services/githubDocsService').GeneratedTemplate[]) => {
    const config = loadSocialConfig();
    if (!config.github?.docsRepo) {
      throw new Error('Kein Docs-Repository konfiguriert (Einstellungen → Social Media → GitHub)');
    }
    if (!config.github?.accessToken) throw new Error('GitHub Access Token fehlt');
    if (!config.github?.username) throw new Error('GitHub Username fehlt');

    if (templates.length === 0) {
      throw new Error('Keine generierten Templates vorhanden');
    }

    const files = templates.map((tpl) => ({ name: tpl.name, content: tpl.content }));
    // docsPath: '' — template paths are repo-absolute (README.md, DataRoom/DATA_ROOM.md, etc.)
    return pushDocsToGitHub(files, { ...config.github, docsPath: '' });
  };

  const handleSaveDocsSiteLocally = async (config: import('./services/docsSiteService').DocsSiteConfig) => {
    const projectPath = docStudioState?.projectPath || getLastProjectPath('doc');
    if (!projectPath || isWebProjectPath(projectPath)) throw new Error('Kein lokaler Projektordner gewählt');

    // Ensure docs/ folder exists
    const docsDir = `${projectPath}/docs`;
    if (!(await fsExists(docsDir).catch(() => false))) {
      await fsMkdir(docsDir, { recursive: true });
    }

    // Create stub files for new pages (don't overwrite existing)
    for (const newPage of config.newPages ?? []) {
      const filePath = `${projectPath}/${newPage.relPath}`;
      const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
      if (!(await fsExists(parentDir).catch(() => false))) {
        await fsMkdir(parentDir, { recursive: true });
      }
      if (!(await fsExists(filePath).catch(() => false))) {
        await writeTextFile(filePath, `# ${newPage.title}\n\nInhalt hier einfügen.\n`);
      }
    }

    // Read all page content (new stubs now exist)
    const markdownFiles = await Promise.all(
      config.pages.map(async (page) => {
        try {
          const content = await readTextFile(`${projectPath}/${page.file}`);
          return { name: page.file, content };
        } catch {
          return { name: page.file, content: `# ${page.label}\n\nInhalt hier einfügen.\n` };
        }
      }),
    );

    const { generateDocsSite } = await import('./services/docsSiteService');
    const files = generateDocsSite(config, markdownFiles);
    for (const file of files) {
      // Skip dotfiles (e.g. .nojekyll) — only needed for GitHub Pages, not local
      const basename = file.name.split('/').pop() ?? '';
      if (basename.startsWith('.')) continue;
      await writeTextFile(`${projectPath}/${file.name}`, file.content);
    }
  };

  const handlePushDocsSiteToGitHub = async (config: import('./services/docsSiteService').DocsSiteConfig) => {
    const socialConfig = loadSocialConfig();
    if (!socialConfig.github?.docsRepo) throw new Error('Kein Docs-Repository konfiguriert (Einstellungen → GitHub)');
    if (!socialConfig.github?.accessToken) throw new Error('GitHub Access Token fehlt');
    if (!socialConfig.github?.username) throw new Error('GitHub Username fehlt');

    const projectPath = docStudioState?.projectPath || getLastProjectPath('doc');
    if (!projectPath || isWebProjectPath(projectPath)) throw new Error('Kein lokaler Projektordner gewählt');

    // Stub content for new pages (not yet on disk)
    const stubContent: Record<string, string> = {};
    for (const newPage of config.newPages ?? []) {
      stubContent[newPage.relPath] = `# ${newPage.title}\n\nInhalt hier einfügen.\n`;
    }

    const markdownFiles = await Promise.all(
      config.pages.map(async (page) => {
        try {
          const content = await readTextFile(`${projectPath}/${page.file}`);
          return { name: page.file, content };
        } catch {
          return { name: page.file, content: stubContent[page.file] ?? `# ${page.label}\n\nInhalt nicht verfügbar.` };
        }
      }),
    );

    const { generateDocsSite } = await import('./services/docsSiteService');
    const files = generateDocsSite(config, markdownFiles);

    // docsPath: '' — paths in generateDocsSite are already absolute (docs/index.html, etc.)
    return pushDocsToGitHub(files, { ...socialConfig.github, docsPath: '' });
  };

  useEffect(() => {
    if (currentScreen !== 'doc-studio') return;
    const projectPath = docStudioState?.projectPath || getLastProjectPath('doc');
    if (!projectPath || isWebProjectPath(projectPath)) {
      setDocStudioGithubDocsFileCount(0);
      return;
    }
    let cancelled = false;
    scanDocsForGitHub(projectPath)
      .then((files) => {
        if (!cancelled) setDocStudioGithubDocsFileCount(files.length);
      })
      .catch(() => {
        if (!cancelled) setDocStudioGithubDocsFileCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [currentScreen, docStudioState?.projectPath]);

  // Handle file saved from Doc Studio/Content AI Studio - update scheduled post if one is being edited
  const handleFileSavedWhileEditing = async (filePath: string, content: string, fileName: string) => {
    if (!editingScheduledPostId) return;

    console.log('[App] File saved while editing scheduled post:', editingScheduledPostId, fileName, filePath);

    // Strip ALL version patterns from filename for clean title: "Name_2026-02-03_v1_2026-02-03_v1.md" → "Name"
    const cleanTitle = fileName
      .replace(/\.md$/i, '')
      .replace(/_\d{4}-\d{2}-\d{2}_v\d+/g, '');

    // Find and update the scheduled post
    const updatedPosts = scheduledPosts.map((post) => {
      if (post.id !== editingScheduledPostId) return post;

      // Strip frontmatter from content to get the actual content
      let actualContent = content;
      if (content.startsWith('---')) {
        const endIndex = content.indexOf('---', 3);
        if (endIndex !== -1) {
          actualContent = content.substring(endIndex + 3).trim();
        }
      }

      return {
        ...post,
        title: cleanTitle,
        content: actualContent,
        characterCount: actualContent.length,
        wordCount: actualContent.split(/\s+/).filter(Boolean).length,
        // Store the actual file path where the user saved the file
        savedFilePath: filePath,
      };
    });

    // Persist the updated posts
    await persistScheduledPosts(updatedPosts);

    // Clear the editing state
    setEditingScheduledPostId(null);
  };

  const reloadScheduledPosts = async () => {
    if (!isTauri()) return;
    const projectPath =
      docStudioState?.projectPath ||
      contentStudioProjectPath ||
      getLastProjectPath();
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
    setIsEditingZenThoughts(false);
    // Locked Doc Studio should open upgrade modal directly (no intermediate lock screen)
    if (!checkFeature("DOC_STUDIO")) {
      requestUpgrade("DOC_STUDIO");
      return;
    }

    // Check if there's a saved project path in localStorage
    const savedProjectPath = getLastProjectPath('doc');
    if (savedProjectPath) {
      setDocStudioState((prev) => ({
        projectPath: prev?.projectPath ?? savedProjectPath,
        projectInfo: prev?.projectInfo ?? null,
        selectedTemplate: prev?.selectedTemplate ?? null,
        selectedTemplates: prev?.selectedTemplates ?? [],
        generatedContent: prev?.generatedContent ?? '',
        activeTabId: prev?.activeTabId ?? null,
        openFileTabs: prev?.openFileTabs ?? [],
        tabContents: prev?.tabContents ?? {},
        dirtyTabs: prev?.dirtyTabs ?? {},
        tone: prev?.tone ?? 'professional',
        length: prev?.length ?? 'medium',
        audience: prev?.audience ?? 'intermediate',
        targetLanguage: prev?.targetLanguage ?? 'deutsch',
        inputFields: prev?.inputFields ?? { ...defaultDocInputFields },
        metadata: prev?.metadata ?? createDefaultProjectMetadata(),
      }));
    }

    // Always start at Project step when entering Doc Studio
    setDocStudioStep(0);
    setReturnToDocStudioStep(0);

    setCurrentScreen("doc-studio");
  };

  const handleOpenDocStudioForPosting = (content: string) => {
    const storedProjectPath = getLastProjectPath('doc');
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
      inputFields: prev?.inputFields ?? { ...defaultDocInputFields },
      metadata: prev?.metadata ?? createDefaultProjectMetadata(),
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
    setTransferPostMeta(null);
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

  const handleSelectMobileInbox = () => {
    setCurrentScreen("mobile-inbox");
  };

  const MOBILE_INLINE_IMAGE_MAX_DIMENSION = 1800;
  const MOBILE_INLINE_IMAGE_MAX_LENGTH = 280000;
  const MOBILE_INLINE_IMAGE_JPEG_QUALITY = 0.82;
  const MOBILE_DEFAULT_IMAGE_WIDTH_PERCENT = 25;
  const isDevRuntime = typeof import.meta !== "undefined" && !!import.meta.env?.DEV;
  const mobileInlineBlobUrlCacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    return () => {
      mobileInlineBlobUrlCacheRef.current.forEach((blobUrl) => {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch {
          // ignore
        }
      });
      mobileInlineBlobUrlCacheRef.current.clear();
    };
  }, []);

  const loadImageFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("image_load_failed"));
      image.src = dataUrl;
    });

  const optimizeInlineImageDataUrl = async (dataUrl: string): Promise<string> => {
    if (!dataUrl.startsWith("data:image/")) return dataUrl;

    // Mobile drafts may contain line breaks inside base64 payload.
    // Normalize first so size checks + canvas decoding are reliable.
    const commaIdx = dataUrl.indexOf(",");
    if (commaIdx <= 0) return dataUrl;
    const header = dataUrl.slice(0, commaIdx + 1);
    const payload = dataUrl.slice(commaIdx + 1).replace(/\s+/g, "");
    const normalizedDataUrl = `${header}${payload}`;

    if (normalizedDataUrl.length < MOBILE_INLINE_IMAGE_MAX_LENGTH) return normalizedDataUrl;

    const mime = normalizedDataUrl.slice(5, normalizedDataUrl.indexOf(";"));
    if (!mime || mime.includes("gif") || mime.includes("svg")) return normalizedDataUrl;

    try {
      const image = await loadImageFromDataUrl(normalizedDataUrl);
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (!width || !height) return normalizedDataUrl;

      const scale = Math.min(
        1,
        MOBILE_INLINE_IMAGE_MAX_DIMENSION / width,
        MOBILE_INLINE_IMAGE_MAX_DIMENSION / height
      );
      const targetWidth = Math.max(1, Math.round(width * scale));
      const targetHeight = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return dataUrl;
      ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

      const optimized = canvas.toDataURL("image/jpeg", MOBILE_INLINE_IMAGE_JPEG_QUALITY);
      if (!optimized || optimized.length >= normalizedDataUrl.length) return normalizedDataUrl;
      return optimized;
    } catch {
      return normalizedDataUrl;
    }
  };

  const optimizeMobileInlineImagesInMarkdown = async (markdown: string): Promise<string> => {
    const imageMatches = Array.from(
      markdown.matchAll(/!\[[^\]]*\]\((data:image\/[a-zA-Z0-9.+-]+;base64,[^)]+)\)/gi)
    );
    if (imageMatches.length === 0) return markdown;

    const uniqueDataUrls = Array.from(
      new Set(imageMatches.map((match) => String(match[1] ?? "")))
    ).filter(Boolean);
    let nextContent = markdown;
    let changedCount = 0;
    let totalSavedChars = 0;

    for (const originalDataUrl of uniqueDataUrls) {
      if (originalDataUrl.length < MOBILE_INLINE_IMAGE_MAX_LENGTH) continue;
      const optimizedDataUrl = await optimizeInlineImageDataUrl(originalDataUrl);
      if (optimizedDataUrl !== originalDataUrl) {
        nextContent = nextContent.split(originalDataUrl).join(optimizedDataUrl);
        changedCount += 1;
        totalSavedChars += originalDataUrl.length - optimizedDataUrl.length;
      }

      if (isDevRuntime) {
        const delta = originalDataUrl.length - optimizedDataUrl.length;
        const percent = originalDataUrl.length > 0
          ? Math.round((Math.max(delta, 0) / originalDataUrl.length) * 100)
          : 0;
        console.info(
          `[MobileInlineImage][debug] image processed: before=${originalDataUrl.length} chars, after=${optimizedDataUrl.length} chars, saved=${Math.max(delta, 0)} chars (${percent}%)`
        );
      }
    }

    if (isDevRuntime) {
      console.info(
        `[MobileInlineImage][debug] markdown processed: images=${uniqueDataUrls.length}, optimized=${changedCount}, savedTotal=${totalSavedChars} chars, markdownBefore=${markdown.length}, markdownAfter=${nextContent.length}`
      );
    }

    return nextContent;
  };

  const applyDefaultMobileImageWidth = (markdown: string, widthPercent: number): string => {
    const clamped = Math.max(10, Math.min(100, Math.round(widthPercent)));
    let next = markdown;

    // Markdown image syntax -> HTML img with explicit width
    next = next.replace(/!\[([^\]]*)\]\((data:image\/[a-zA-Z0-9.+-]+;base64,[^)]+)\)/gi, (_m, alt, src) => {
      const safeAlt = String(alt ?? '').replace(/"/g, '&quot;');
      const safeSrc = String(src ?? '').trim();
      return `<img src="${safeSrc}" alt="${safeAlt}" style="width:${clamped}%">`;
    });

    // Existing HTML image: force width if it is a data URL image
    next = next.replace(/<img\b([^>]*?)\bsrc=["'](data:image\/[^"']+)["']([^>]*)\/?>/gi, (_m, beforeSrc, src, afterSrc) => {
      const before = String(beforeSrc ?? '').replace(/\s*\bstyle=["'][^"']*["']/gi, '');
      const after = String(afterSrc ?? '').replace(/\s*\bstyle=["'][^"']*["']/gi, '');
      return `<img${before} src="${String(src).trim()}"${after} style="width:${clamped}%">`;
    });

    return next;
  };

  const dataUrlToBlobUrl = async (dataUrl: string): Promise<string> => {
    const cached = mobileInlineBlobUrlCacheRef.current.get(dataUrl);
    if (cached) return cached;

    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    mobileInlineBlobUrlCacheRef.current.set(dataUrl, blobUrl);
    return blobUrl;
  };

  const replaceLargeInlineImagesWithBlobUrls = async (markdown: string): Promise<string> => {
    if (isTauri()) return markdown;

    const imgMatches = Array.from(
      markdown.matchAll(/<img\b([^>]*?)\bsrc=["'](data:image\/[^"']+)["']([^>]*)\/?>/gi)
    );
    if (imgMatches.length === 0) return markdown;

    const uniqueLargeDataUrls = Array.from(
      new Set(
        imgMatches
          .map((match) => String(match[2] ?? ""))
          .filter((src) => src.startsWith("data:image/"))
      )
    );
    if (uniqueLargeDataUrls.length === 0) return markdown;

    let next = markdown;
    for (const dataUrl of uniqueLargeDataUrls) {
      try {
        const blobUrl = await dataUrlToBlobUrl(dataUrl);
        next = next.split(dataUrl).join(blobUrl);
      } catch {
        // keep original data URL if conversion fails
      }
    }

    return next;
  };

  const handleOpenMobileDraftInContentAI = async (draft: MobileDraft, photoReference: string | null) => {
    const dateStr = new Date(draft.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
    const cleanMobileDraftTitle = (raw: string) => {
      const firstLine = raw
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.length > 0) ?? '';
      if (!firstLine) return '';

      // Markdown/Notation bereinigen
      const withoutMarkdown = firstLine
        .replace(/^#{1,6}\s+/, '') // heading prefix
        .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // image markdown
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
        .replace(/[`*_~>#-]+/g, ' ') // inline markdown chars
        .replace(/\s+/g, ' ')
        .trim();

      const maxLen = 64;
      if (withoutMarkdown.length <= maxLen) return withoutMarkdown;
      return `${withoutMarkdown.slice(0, maxLen - 1).trimEnd()}…`;
    };

    const draftTitleFromText = cleanMobileDraftTitle(draft.text || "");
    const transferTitle = draftTitleFromText || `Mobil-Entwurf ${dateStr}${draft.platform ? ` · ${draft.platform}` : ""}`;
    const stripUnsupportedAssetImageUrls = (input: string, replacementDataUrl?: string) => {
      let fallbackUsed = false;
      const applyFallback = (altText: string) => {
        if (replacementDataUrl && !fallbackUsed) {
          fallbackUsed = true;
          return `![${altText}](${replacementDataUrl})`;
        }
        return '';
      };

      let next = input;

      // Markdown image syntax
      next = next.replace(/!\[([^\]]*)\]\(([^)]+)\)/gi, (_match, alt, url) => {
        const rawUrl = String(url ?? '').trim();
        if (!/^asset:\/\//i.test(rawUrl)) return `![${String(alt ?? '').trim()}](${rawUrl})`;
        return applyFallback(String(alt ?? '').trim());
      });

      // HTML img syntax (single or double quoted src)
      next = next.replace(/<img\b[^>]*\bsrc=["'](asset:\/\/[^"']+)["'][^>]*\/?>/gi, () => {
        return applyFallback('');
      });

      // Any remaining naked asset:// image URLs
      next = next.replace(/asset:\/\/[^\s)"'>]+\.(?:png|jpe?g|gif|webp|bmp|heic|heif|avif)/gi, '');

      // Keep markdown clean after removals.
      return next.replace(/\n{3,}/g, '\n\n').trim();
    };

    let content = draft.text || "";
    let inlinePhotoDataUrl: string | null = null;

    // Web runtime: avoid loading huge embedded base64 payloads from .md.
    // Use sidecar photo file (photo:) as the canonical image source.
    const shouldReadEmbeddedFallback =
      draft.hasEmbeddedImage &&
      draft.filePath &&
      (isTauri() || !photoReference || (!isTauri() && !draft.webPhotoDataUrl));

    if (shouldReadEmbeddedFallback) {
      // Lazy: base64 jetzt erst aus der .md lesen (wurde beim Laden der Liste bewusst übersprungen)
      try {
        const mdContent = isTauri()
          ? await readTextFile(draft.filePath)
          : await getWebMobileDraftFileContent(draft.filePath);
        if (!mdContent) throw new Error("missing markdown content");
        const trimmed = mdContent.trimStart();
        const bodyStart = trimmed.indexOf("\n---");
        const fullBody = bodyStart !== -1 ? trimmed.slice(bodyStart + 4).trimStart() : trimmed;
        content = fullBody; // enthält ![](data:image/...) + Text
      } catch {
        // fallthrough: nur Text übertragen
      }
    }

    const hasDataImageInContent = /!\[[^\]]*\]\(data:image\/[a-zA-Z0-9.+-]+;base64,[^)]+\)/i.test(content);
    if (!hasDataImageInContent && photoReference) {
      // Fallback für alte Drafts ohne embedded base64: .jpg vom Mac lesen
      try {
        if (isTauri()) {
          const bytes = await readFile(photoReference);
          const CHUNK = 8192;
          let binary = "";
          for (let i = 0; i < bytes.length; i += CHUNK) {
            binary += String.fromCharCode(...(bytes.subarray(i, i + CHUNK) as unknown as number[]));
          }
          const base64 = btoa(binary);
          const ext = photoReference.split(".").pop()?.toLowerCase() ?? "jpg";
          const mime =
            ext === "png" ? "image/png" :
            ext === "webp" ? "image/webp" :
            ext === "gif" ? "image/gif" :
            ext === "bmp" ? "image/bmp" :
            "image/jpeg";
          inlinePhotoDataUrl = `data:${mime};base64,${base64}`;
        } else {
          inlinePhotoDataUrl = draft.webPhotoDataUrl ?? await getWebMobilePhotoDataUrl(photoReference);
        }
        if (!inlinePhotoDataUrl) throw new Error("missing photo");
        content = `![](${inlinePhotoDataUrl})\n\n${content}`;
      } catch {
        // Foto nicht lesbar — nur Text übertragen
      }
    }

    // Mobile Drafts enthalten teils asset://-URLs, die in der Desktop-WebView nicht ladbar sind.
    // Ersetze diese durch das eingebettete Fallback-Bild (wenn vorhanden) oder entferne sie.
    content = stripUnsupportedAssetImageUrls(content, inlinePhotoDataUrl ?? undefined);

    const optimizedContent = await optimizeMobileInlineImagesInMarkdown(content);
    const widthAdjustedContent = applyDefaultMobileImageWidth(optimizedContent, MOBILE_DEFAULT_IMAGE_WIDTH_PERCENT);
    const blobSafeContent = await replaceLargeInlineImagesWithBlobUrls(widthAdjustedContent);
    setTransferContent(blobSafeContent);
    setTransferFileName(transferTitle);
    setTransferPostMeta(null);
    setContentStudioRequestedFilePath(null);
    setContentStudioRequestedArticleId(null);
    setCameFromDocStudio(false);
    setCameFromDashboard(false);
    setContentStudioDashboardView("dashboard");
    setContentTransformStep(1);
    setCurrentScreen("content-transform");
  };

  // Open Content AI from Dashboard with blog-post preset
  const handleOpenContentAIFromDashboard = () => {
    setCameFromDashboard(true);
    setCameFromDocStudio(false);
    setIsEditingZenThoughts(false);
    setTransferContent(null); // No initial content
    setTransferPostMeta(null);
    setContentStudioDashboardView("dashboard");
    setContentTransformStep(0);
    setCurrentScreen("content-transform");
  };

  // Return to Content AI Studio Dashboard from editor
  const handleBackToGettingStarted = (_generatedContent?: string) => {
    setIsEditingZenThoughts(false);
    setCameFromDashboard(false);
    setContentStudioDashboardView("dashboard");
    setContentTransformStep(0);
    setCurrentScreen("content-transform");
  };

  const handleBackToWelcome = () => {
    setIsEditingZenThoughts(false);
    setCurrentScreen("getting-started");
  };

  const handleOpenZenThoughtsEditor = async (content: string, filePathOverride?: string) => {
    setShowAISettingsModal(false);
    setCameFromDashboard(true);
    setCameFromDocStudio(false);
    setMultiPlatformMode(false);
    setIsEditingZenThoughts(true);
    const projectPath = contentStudioProjectPath || getLastProjectPath();
    const filePath = filePathOverride || (projectPath ? `${projectPath}/ZEN_GEDANKEN.md` : null);

    if (isTauri() && filePath) {
      try {
        await writeTextFile(filePath, content);
        setTransferContent(null);
        setTransferFileName(null);
        setTransferPostMeta(null);
        setContentStudioRequestedFilePath(filePath);
      } catch (error) {
        console.error("[ZenStudio] ZEN_GEDANKEN.md konnte nicht geschrieben werden:", error);
        setTransferContent(content);
        setTransferFileName("ZEN_GEDANKEN.md");
        setTransferPostMeta(null);
      }
    } else {
      setTransferContent(content);
      setTransferFileName("ZEN_GEDANKEN.md");
      setTransferPostMeta(null);
    }

    setContentTransformStep(1);
    setContentStudioDashboardView("dashboard");
    setCurrentScreen("content-transform");
  };

  const handleContentTransformChange = (
    content: string,
    meta?: {
      source: 'step1' | 'step4';
      activeTabId?: string | null;
      activeTabKind?: 'draft' | 'file' | 'article' | 'derived';
      activeTabFilePath?: string;
      activeTabTitle?: string;
      activeTabSubtitle?: string;
      activeTabImageUrl?: string;
      tags?: string[];
    }
  ) => {
    setExportContent(content);
    if (meta?.tags) setExportTags(meta.tags);
    if (meta?.activeTabSubtitle !== undefined) setExportSubtitle(meta.activeTabSubtitle ?? '');
    if (meta?.activeTabImageUrl !== undefined) setExportImageUrl(meta.activeTabImageUrl ?? '');
    if (!isEditingZenThoughts && meta?.source === 'step1' && meta.activeTabId) {
      const trimmed = content.trim();
      if (trimmed.length >= 20) {
        const title = (meta.activeTabTitle || 'Entwurf').trim() || 'Entwurf';
        const subtitle = meta.activeTabSubtitle?.trim() || undefined;
        const imageUrl = meta.activeTabImageUrl?.trim() || undefined;
        const key = `${meta.activeTabId}:${trimmed.slice(0, 140)}`;
        setContentPlannerSuggestion({
          key,
          tabId: meta.activeTabId,
          title,
          subtitle,
          imageUrl,
          content: content,
        });
      } else {
        setContentPlannerSuggestion((prev) => (prev?.tabId === meta.activeTabId ? null : prev));
      }
    }
    if (!isEditingZenThoughts) return;
    if (meta?.source !== 'step1') return;
    if (meta?.activeTabKind !== 'file') return;

    const settings = loadZenStudioSettings();
    const fallbackProjectPath = contentStudioProjectPath || getLastProjectPath();
    const expectedThoughtsPath =
      settings.thoughtsFilePath || (fallbackProjectPath ? `${fallbackProjectPath}/ZEN_GEDANKEN.md` : null);
    if (!expectedThoughtsPath || !meta.activeTabFilePath) return;
    if (meta.activeTabFilePath !== expectedThoughtsPath) return;

    patchZenStudioSettings({ thoughts: parseZenThoughtsFromEditor(content) });
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

  const [homeToast, setHomeToast] = useState(false);
  const handleHomeClick = () => {
    const hasDirty = Object.values(docStudioState?.dirtyTabs ?? {}).some(Boolean);
    if (hasDirty) {
      setHomeToast(true);
      setTimeout(() => setHomeToast(false), 3500);
    }
    resetDocStudioSession();
    setCurrentScreen("getting-started");
  };
  const resetDocStudioSession = () => {
    setDocStudioState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        selectedTemplate: null,
        selectedTemplates: [],
        generatedContent: "",
        activeTabId: null,
        openFileTabs: [],
        tabContents: {},
        dirtyTabs: {},
      };
    });
    setDocStudioStep(0);
  };


  const handleSettingsClick = () => {
    setSettingsDefaultTab('ai');
    setShowAISettingsModal(true);
  };
  const handleCloseSettingsModal = () => setShowAISettingsModal(false);

  const handleInfoClick = () => setShowAboutModal(true);
  const handleOpenBugReport = () => {
    setShowAboutModal(false);
    setShowBugReportModal(true);
  };
  const handleCloseBugReport = () => {
    setShowBugReportModal(false);
  };
  const handleSendBugReportMail = () => {
    const activeTabId = docStudioState?.activeTabId ?? "";
    if (!activeTabId.startsWith("tpl:bug")) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const counterKey = `zen_bug_report_counter_${year}_${month}`;
    const raw = localStorage.getItem(counterKey);
    const current = raw ? Number.parseInt(raw, 10) : 0;
    const next = Number.isFinite(current) ? current + 1 : 1;
    localStorage.setItem(counterKey, String(next));

    const subject = `BugReport_${year}_${month}_${String(next).padStart(3, "0")}`;
    const rawBody = docStudioState?.tabContents?.[activeTabId] ?? "";
    const body = rawBody
      // normalize newlines
      .replace(/\r\n/g, "\n")
      // fenced code blocks -> keep content only
      .replace(/```[\s\S]*?\n([\s\S]*?)```/g, (_m, code) => `${code}\n`)
      // inline code
      .replace(/`([^`]+)`/g, "$1")
      // links [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
      // headings
      .replace(/^#{1,6}\s+/gm, "")
      // bold/italic
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      // collapse 3+ newlines
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const mailto = `mailto:saghallo@denisbitter.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    void openExternal(mailto);
    setShowMailSuccessModal(true);
  };
  const handleOpenBugTemplateInDocStudio = () => {
    const storedProjectPath = getLastProjectPath();
    const templateId = 'bug' as const;
    const tabId = `tpl:${templateId}`;
    const templateContent = getSmartDocTemplate(templateId, docStudioState?.projectInfo ?? null);

    setDocStudioState((prev) => ({
      projectPath: storedProjectPath ?? prev?.projectPath ?? null,
      projectInfo: prev?.projectInfo ?? null,
      selectedTemplate: templateId,
      selectedTemplates: [templateId],
      generatedContent: templateContent,
      activeTabId: tabId,
      openFileTabs: [],
      tabContents: { [tabId]: templateContent },
      dirtyTabs: { [tabId]: false },
      tone: prev?.tone ?? 'professional',
      length: prev?.length ?? 'medium',
      audience: prev?.audience ?? 'intermediate',
      targetLanguage: prev?.targetLanguage ?? 'deutsch',
      inputFields: prev?.inputFields ?? { ...defaultDocInputFields },
      metadata: prev?.metadata ?? createDefaultProjectMetadata(),
    }));

    setShowBugReportModal(false);
    setShowAboutModal(false);
    setReturnToDocStudioStep(3);
    setDocStudioStep(3);
    setCurrentScreen("doc-studio");
  };
  const handleHelpClick = () => setShowWalkthroughModal(true);
  const handleCloseAboutModal = () => setShowAboutModal(false);
  const handleCloseContentStudioModal = () => setShowContentStudioModal(false);

  const refreshContentStudioData = async (projectPathOverride?: string) => {
    const storedProjectPath = projectPathOverride ?? getLastProjectPath();
    setContentStudioProjectPath(storedProjectPath);
    setContentStudioRecentProjectPaths(getRecentProjectPaths());
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

  const gettingStartedRecentItems = useMemo<GettingStartedRecentItem[]>(() => {
    const articleFileNames = new Set(contentStudioRecentArticles.map((article) => article.fileName.toLowerCase()));

    const articleItems: GettingStartedRecentItem[] = contentStudioRecentArticles.map((article) => ({
      id: `article:${article.id}`,
      title: article.title || article.fileName || "Artikel",
      subtitle: article.fileName,
      updatedAt: new Date(article.updatedAt || article.createdAt || Date.now()).getTime(),
      source: "content-ai",
      articleId: article.id,
    }));

    const fileItems: GettingStartedRecentItem[] = contentStudioAllFiles.map((file) => {
      const normalizedPath = file.path.replace(/\\/g, "/").toLowerCase();
      const isArticleFile =
        normalizedPath.includes("/publishing/articles/") ||
        normalizedPath.includes("/posts/") ||
        normalizedPath.includes("/blog/") ||
        articleFileNames.has(file.name.toLowerCase());

      return {
        id: `file:${file.path}`,
        title: file.name,
        subtitle: file.path,
        updatedAt: file.modifiedAt ?? 0,
        source: isArticleFile ? "content-ai" : "doc-studio",
        filePath: file.path,
      };
    });

    const merged = [...articleItems, ...fileItems]
      .filter((item) => item.updatedAt > 0)
      .sort((a, b) => b.updatedAt - a.updatedAt);

    const deduped: GettingStartedRecentItem[] = [];
    const seenKeys = new Set<string>();
    for (const item of merged) {
      const key = item.articleId ? `a:${item.articleId}` : `f:${item.filePath ?? item.id}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      deduped.push(item);
      if (deduped.length >= 8) break;
    }

    return deduped;
  }, [contentStudioRecentArticles, contentStudioAllFiles]);

  const handleOpenServerArticle = async (slug: string) => {
    const settings = loadZenStudioSettings();
    let base = (settings.contentServerApiUrl ?? '').trim();
    if (!base) return;
    if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
    const endpoint = (settings.contentServerListEndpoint ?? '/articles.php').trim();
    const listUrl = /^https?:\/\//i.test(endpoint) ? endpoint : `${base.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
    const url = `${listUrl}?slug=${encodeURIComponent(slug)}`;
    const headers: Record<string, string> = {};
    if (settings.contentServerApiKey) headers['Authorization'] = `Bearer ${settings.contentServerApiKey}`;
    const res = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return;
    const data = await res.json() as {
      success?: boolean;
      title?: string;
      subtitle?: string;
      date?: string;
      publishDate?: string;
      image?: string;
      imageUrl?: string;
      markdown?: string;
      blocks?: Array<{ type: string; data: Record<string, unknown> }>;
    };
    if (data.success === false) return;
    // Prefer pre-rendered markdown field if server provides it
    const blocks = data.blocks ?? [];
    const markdown = data.markdown?.trim() ? data.markdown : blocksToMarkdown(blocks, data.title);
    const imageFromBlocks = extractFirstImageUrlFromBlocks(blocks);
    persistWebDocument(markdown, `${slug}.md`);
    setTransferContent(markdown);
    setTransferFileName(`${slug}.md`);
    setTransferPostMeta({
      title: (data.title ?? '').trim(),
      subtitle: (data.subtitle ?? '').trim(),
      imageUrl: (((data.image ?? data.imageUrl) ?? imageFromBlocks) ?? '').trim(),
      date: ((data.date ?? data.publishDate) ?? '').trim(),
    });
    const activeServer = settings.servers?.[settings.activeServerIndex ?? 0];
    const resolvedServerCachePath = (
      activeServer?.contentServerLocalCachePath
      ?? settings.contentServerLocalCachePath
      ?? null
    );
    setContentStudioServerCachePath(resolvedServerCachePath);
    setActiveServerArticleSlug(slug);
    setCameFromDocStudio(false);
    setCameFromDashboard(false);
    setCurrentScreen("content-transform");
    setContentTransformStep(1);
  };

  const handleDeleteServerArticle = async (slug: string): Promise<void> => {
    const settings = loadZenStudioSettings();
    let base = (settings.contentServerApiUrl ?? '').trim();
    if (!base) return;
    if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
    const endpoint = (settings.contentServerDeleteEndpoint ?? '/delete_articles.php').trim();
    const endpointUrl = /^https?:\/\//i.test(endpoint) ? endpoint : `${base.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
    const url = `${endpointUrl}?slug=${encodeURIComponent(slug)}`;
    const headers: Record<string, string> = {};
    if (settings.contentServerApiKey) headers['Authorization'] = `Bearer ${settings.contentServerApiKey}`;
    const res = await fetch(url, { method: 'DELETE', headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // Optimistic removal + reload to confirm
    setContentStudioServerArticles((prev) =>
      Array.isArray(prev) ? prev.filter((a) => (a as { slug?: string }).slug !== slug) : prev
    );
    refetchContentStudioServerArticles();
  };

  const handleContinueRecentItem = (item: GettingStartedRecentItem) => {
    if (item.source === "content-ai") {
      setActiveServerArticleSlug(null);
      setContentStudioServerCachePath(null);
      if (item.articleId) {
        setContentStudioRequestedArticleId(item.articleId);
      } else if (item.filePath) {
        setContentStudioRequestedFilePath(item.filePath);
      }
      setCurrentScreen("content-transform");
      setContentTransformStep(1);
      setCameFromDocStudio(false);
      setCameFromDashboard(false);
      return;
    }

    // Direct upgrade modal for locked Doc Studio also from "Weiterbearbeiten"
    if (!checkFeature("DOC_STUDIO")) {
      requestUpgrade("DOC_STUDIO");
      return;
    }

    if (item.filePath) {
      setDocStudioRequestedFilePath(item.filePath);
    }
    setDocStudioStep(3);
    setCurrentScreen("doc-studio");
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
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(WEB_DOCS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as WebStoredDocument[];
      if (!Array.isArray(parsed)) return;
      setWebDocuments(
        parsed
          .filter((doc) =>
            doc &&
            typeof doc.id === "string" &&
            typeof doc.name === "string" &&
            typeof doc.content === "string" &&
            typeof doc.updatedAt === "number"
          )
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, 40)
      );
    } catch (error) {
      console.warn("[App1] Could not load stored web documents:", error);
    }
  }, []);

  useEffect(() => {
    if (currentScreen !== "content-transform") return;
    setContentStudioRequestedArticleId(null);
    setContentStudioRequestedFilePath(null);
    refreshContentStudioData();
  }, [currentScreen]);

  useEffect(() => {
    if (currentScreen !== "getting-started") return;
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
      rememberProjectPath(detail);
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
    rememberProjectPath(docStudioState.projectPath, 8, 'doc');
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
        rememberProjectPath(result);
        setContentStudioRecentProjectPaths(getRecentProjectPaths());
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

  const handleSwitchContentStudioProject = async (path: string) => {
    if (!path) return;
    rememberProjectPath(path);
    setContentStudioRecentProjectPaths(getRecentProjectPaths());
    // Clear stale file lists immediately so the dashboard doesn't show
    // the previous project's documents tagged under the new project path
    setContentStudioAllFiles([]);
    if (!isWebProjectPath(path)) {
      setWebDocuments([]);
    }
    setContentStudioProjectPath(path);
    if (isTauri()) {
      await updateLastProjectPath(path);
    }
    if (!isWebProjectPath(path)) {
      await refreshContentStudioData(path);
    }
  };

  const handleWebProjectCreated = async (project: WebProject, initialDocs?: Array<{name: string; content: string; modifiedAt: number}>) => {
    const path = encodeWebProjectPath(project.id);
    rememberProjectPath(path);
    setContentStudioRecentProjectPaths(getRecentProjectPaths());
    setContentStudioProjectPath(path);
    // Pre-loaded docs from webkitdirectory picker
    if (initialDocs && initialDocs.length > 0) {
      const now = Date.now();
      setWebDocuments((prev) => {
        const newDocs = initialDocs.map((f, i) => ({
          id: `webdir_${project.id}_${i}`,
          name: f.name,
          content: f.content,
          updatedAt: f.modifiedAt || now,
        }));
        const existingIds = new Set(newDocs.map((d) => d.id));
        return [...newDocs, ...prev.filter((d) => !existingIds.has(d.id))].slice(0, 40);
      });
      return;
    }
    // For directory projects via File System Access API: read markdown files from handle
    if (project.type === 'directory') {
      try {
        const handle = await getDirectoryHandle(project.id);
        if (handle) {
          const files = await readMarkdownFiles(handle);
          if (files.length > 0) {
            const now = Date.now();
            setWebDocuments((prev) => {
              const newDocs = files.map((f, i) => ({
                id: `webdir_${project.id}_${i}`,
                name: f.name,
                content: f.content,
                updatedAt: now,
              }));
              const existingIds = new Set(newDocs.map((d) => d.id));
              return [...newDocs, ...prev.filter((d) => !existingIds.has(d.id))].slice(0, 40);
            });
          }
        }
      } catch {
        /* ignore read errors */
      }
    }
  };

  // Hilfefunktion für Header-Text
  const getLeftText = () => {
    if (currentScreen === "welcome") {
      return <span style={{ color: "#AC8E66",  }}>禅 ZenPost Studio</span>;
    }

    const studioNames: Record<Exclude<Screen, "welcome">, string> = {
      "converter": "Converter Studio",
      "content-transform": "Content AI Studio",
      "doc-studio": "Doc Studio",
      "getting-started": "Getting Started",
      "mobile-inbox": "Mobile Inbox",
    };

    return (
      <>
        禅 ZenPost Studio · <span style={{ color: "#AC8E66" }}>{studioNames[currentScreen]}</span>
      
     
      </>

    );
  };

  const getRightText = () => {
    switch (currentScreen) {
      case "converter":
        const normalizedConverterStep = Math.min(Math.max(converterStep, 1), 2);
        const converterText = normalizedConverterStep === 1 ? 'Datei laden & Ziel wählen' : 'Ergebnis';
        return <>Step {normalizedConverterStep}/2 · <span style={{ color: "#AC8E66" }}>{converterText}</span></>;
      case "content-transform":
        const transformText = contentTransformStep === 0
          ? (contentStudioDashboardView === "project-map" ? 'Projektmappe' : 'Dashboard')
          :
                              contentTransformStep === 1 ? 'Quelle eingeben' :
                              contentTransformStep === 2 ? 'Plattform wählen' :
                              contentTransformStep === 3 ? 'Post Stil anpassen' : 'Ergebnis';
        return <>Step {contentTransformStep === 0 ? 1 : contentTransformStep}/4 • <span style={{ color: "#AC8E66" }}>{transformText}</span></>;
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
      case "mobile-inbox":
        return <>Mobile · <span style={{ color: "#AC8E66" }}>iPhone Entwürfe</span></>;
      default:
        return "";
    }
  };
  {/ * Hilfefunktion für StudioBar im Header * */}
  const renderStudioBar = () => {
    // DocStudio Tab-Leiste (Step 3 - Editor)
    if (currentScreen === "doc-studio" && docStudioStep === 3) {
      const isBugTemplateActive = (docStudioState?.activeTabId ?? "").startsWith("tpl:bug");
      const lockStudioBarForPreview = docStudioPreviewMode;
      return (
        <div className="flex items-center 
        justify-between flex-wrap gap-2 
        px-[4vw] py-[3px] mt-[10px]">
          <div className="flex flex-wrap gap-2">
            <StudioBarButton
              label="Projektmappe"
              icon={<FontAwesomeIcon icon={faFileLines} />}
              onClick={() => {
                setDocStudioStep(2);
              }}
              disabled={lockStudioBarForPreview}
            />
          </div>
          <div className="flex flex-wrap gap-2 ml-auto">
            <StudioBarButton
              label="Export"
              icon={<FontAwesomeIcon icon={faFileExport} />}
              onClick={() => {
                setExportContent(docStudioGeneratedContent);
                // Extract document name from active tab
                const activeTabId = docStudioState?.activeTabId;
                let docName = "Export";
                if (activeTabId?.startsWith("tpl:")) {
                  const template = activeTabId.replace("tpl:", "");
                  const templateLabels: Record<string, string> = {
                    readme: "README",
                    changelog: "Changelog",
                    "api-docs": "API-Docs",
                    contributing: "Contributing",
                    "data-room": "Data-Room",
                    draft: "Entwurf",
                  };
                  docName = templateLabels[template] || template;
                } else if (activeTabId?.startsWith("file:")) {
                  const filePath = activeTabId.replace(/^file:/, "");
                  const rawFileName = filePath.split(/[\\/]/).pop() || filePath;
                  docName = rawFileName
                    .replace(/^web:/i, "")
                    .replace(/\.[^.]+$/, "")
                    .trim() || "Export";
                }
                setExportDocumentName(docName);
                setShowExportModal(true);
              }}
              disabled={lockStudioBarForPreview}
            />
            {isBugTemplateActive && (
              <StudioBarButton
                label="E-Mail senden"
                icon={<FontAwesomeIcon icon={faPaperPlane} />}
                onClick={handleSendBugReportMail}
                disabled={lockStudioBarForPreview}
              />
            )}
            <StudioBarButton
              label="Speichern"
              icon={<FontAwesomeIcon icon={faSave} />}
              onClick={() => setDocStudioHeaderAction("save")}
              disabled={lockStudioBarForPreview}
            />
            <StudioBarButton
              label={docStudioPreviewMode ? "Nachbearbeiten" : "Preview"}
              icon={<FontAwesomeIcon icon={faFileLines} />}
              onClick={() => setDocStudioHeaderAction("preview")}
              active={docStudioPreviewMode}
            />
          </div>
        </div>
      );
    }

    // DocStudio Tab-Leiste (Step 2 - Templates)
    if (currentScreen === "doc-studio" && docStudioStep === 2) {
      return (
        <div className="flex items-center justify-between flex-wrap gap-2 px-[4vw] py-[3px] mt-[10px]">
          <div className="flex flex-wrap gap-2">
            <StudioBarButton
              label="Dashboard"
              icon={<FontAwesomeIcon icon={faTableList} />}
              onClick={() => {
                setCurrentScreen("doc-studio");
                setDocStudioStep(0);
              }}
            />
            <StudioBarButton
              label="Projektmappe"
              icon={<FontAwesomeIcon icon={faFileLines} />}
              onClick={() => {
                setDocStudioStep(2);
              }}
              active
            />
            <StudioBarButton
              label="Neue Analyse"
              icon={<FontAwesomeIcon icon={faRotateLeft} />}
              onClick={() => {
                setDocStudioHeaderAction("rescan");
              }}
            />
          </div>
        </div>
      );
    }

    // Content Transform Tab-Leiste
    if (currentScreen !== "content-transform") return undefined;
    if (contentTransformStep === 0) {
      return (
        <div className="px-[4vw] py-[3px] mt-[10px]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex flex-wrap gap-2">
              <StudioBarButton
                label="Dashboard"
                icon={<FontAwesomeIcon icon={faTableList} />}
                onClick={() => {
                  setContentStudioDashboardView("dashboard");
                  setContentTransformStep(0);
                }}
                active={contentStudioDashboardView === "dashboard"}
              />
              <StudioBarButton
                label="Projektmappe"
                icon={<FontAwesomeIcon icon={faFolderOpen} />}
                onClick={() => {
                  if (dashboardActiveContextPath) void handleSwitchContentStudioProject(dashboardActiveContextPath);
                  setContentStudioDashboardView("project-map");
                  setContentTransformStep(0);
                }}
                active={contentStudioDashboardView === "project-map"}
              />

            </div>
            <div className="flex flex-wrap gap-2 ml-auto">
              <StudioBarButton
                label="Direkt schreiben"
                icon={<FontAwesomeIcon icon={faPencil} />}
                onClick={() => {
                  setContentStudioDashboardView("dashboard");
                  setContentTransformStep(1);
                }}
              />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="px-[4vw] py-[3px] mt-[10px]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {contentTransformStep !== 4 && (
            <div className="flex flex-wrap gap-2">
              <StudioBarButton
                label="Dashboard"
                icon={<FontAwesomeIcon icon={faFolderOpen} />}
                onClick={() => {
                  setContentStudioDashboardView("dashboard");
                  setContentTransformStep(0);
                }}
              />
              <StudioBarButton
                label="Planen"
                icon={<FontAwesomeIcon icon={faClock} />}
                onClick={() => {
                  setSchedulerPlatformPosts([]);
                  setPlannerDefaultTab('planen');
                  setShowPlannerModal(true);
                }}
              />
            </div>
          )}
          {contentTransformStep === 1 && (
            <div className="flex flex-wrap gap-2 ml-auto">
              <StudioBarButton
                label="AI für Plattformen"
                icon={<FontAwesomeIcon icon={faWandMagicSparkles} />}
                onClick={handleNavigateToMultiPlatformTransform}
              />
              <div ref={contentSaveMenuRef} style={{ position: "relative" }}>
                <StudioBarButton
                  label={showContentSaveMenu ? "Speichern ▲" : "Speichern ▾"}
                  icon={<FontAwesomeIcon icon={faChevronDown} style={{ transform: showContentSaveMenu ? "rotate(180deg)" : "none" }} />}
                  onClick={() => setShowContentSaveMenu((prev) => !prev)}
                  active={showContentSaveMenu}
                />
                {showContentSaveMenu && (
                  <div
                    style={{
                      position: "absolute",
                      top: "42px",
                      left: 0,
                      width: "220px",
                      border: "0.5px solid #AC8E66",
                      borderRadius: "0 0 10px 10px",
                      background: "#121212",
                      boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
                      zIndex: 60,
                      overflow: "hidden",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowContentSaveMenu(false);
                        setContentTransformHeaderAction("save");
                      }}
                      style={saveMenuItemStyle}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(172, 142, 102, 0.16)";
                        e.currentTarget.style.color = "#F4E8D5";
                        e.currentTarget.style.border = "0 0 12px 12px";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#121212";
                        e.currentTarget.style.color = "#EFEBDC";
                      }}
                    >
                      <FontAwesomeIcon icon={faSave} />
                      <span>Speichern</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowContentSaveMenu(false);
                        setContentTransformHeaderAction("save_as");
                      }}
                      style={saveMenuItemStyle}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(172, 142, 102, 0.16)";
                        e.currentTarget.style.color = "#F4E8D5";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#121212";
                        e.currentTarget.style.color = "#EFEBDC";
                      }}
                    >
                      <FontAwesomeIcon icon={faSave} />
                      <span>Speichern unter...</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowContentSaveMenu(false);
                        setContentTransformHeaderAction("save_server");
                      }}
                      style={saveMenuItemStyle}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(172, 142, 102, 0.16)";
                        e.currentTarget.style.color = "#F4E8D5";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#121212";
                        e.currentTarget.style.color = "#EFEBDC";
                      }}
                    >
                      <FontAwesomeIcon icon={faFileExport} />
                      <span>Auf Server speichern</span>
                    </button>
                  </div>
                )}
              </div>
              <StudioBarButton
                label="Preview"
                icon={<FontAwesomeIcon icon={faFileLines} />}
                onClick={() => setContentTransformHeaderAction("preview")}
              />
            </div>
          )}
          {(contentTransformStep === 2 || contentTransformStep === 3) && (
            <div className="flex flex-wrap gap-2 ml-auto">
              {contentTransformStep === 2 && (
                <>
                  <StudioBarButton
                    label={
                      contentTransformStep2SelectionCount > 0
                        ? `Weiter (${contentTransformStep2SelectionCount})`
                        : "Weiter"
                    }
                    icon={<FontAwesomeIcon icon={faArrowLeft} style={{ transform: "rotate(180deg)" }} />}
                    onClick={() => setContentTransformHeaderAction("next")}
                    disabled={!contentTransformStep2CanProceed}
                    active={contentTransformStep2CanProceed}
                  />
                </>
              )}
              {contentTransformStep === 3 && (
                <>
                  <StudioBarButton
                    label="AI Transform"
                    icon={<FontAwesomeIcon icon={faWandMagicSparkles} />}
                    onClick={() => setContentTransformHeaderAction("transform")}
                    active
                  />
                  <StudioBarButton
                    label="Formatieren für Plattform"
                    icon={<FontAwesomeIcon icon={faWandMagicSparkles} />}
                    onClick={() => setContentTransformHeaderAction("format_only")}
                  />
                </>
              )}
            </div>
          )}
          {contentTransformStep === 4 && (
            <div
              className="flex items-center justify-between flex-wrap gap-2 w-full"
              style={{ opacity: isIdle ? 0.35 : 1, transition: "opacity 250ms ease" }}
            >
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

              {/* Rechts: Posten, Export & Planen */}
              <div className="flex flex-wrap gap-2 ml-auto">
                <StudioBarButton
                  label={multiPlatformMode ? "Alles posten" : "Plattform wählen"}
                  icon={<FontAwesomeIcon icon={faPaperPlane} />}
                  onClick={() => setContentTransformHeaderAction(multiPlatformMode ? "post_all" : "goto_platforms")}
                />
                {multiPlatformMode && (
                  <StudioBarButton
                    label="Plattformen"
                    icon={<FontAwesomeIcon icon={faTableList} />}
                    onClick={() => setContentTransformHeaderAction("goto_platforms")}
                  />
                )}
                <StudioBarButton
                  label="Export"
                  icon={<FontAwesomeIcon icon={faFileExport} />}
                  onClick={() => setShowExportModal(true)}
                />
                <StudioBarButton
                  label="Planen"
                  icon={<FontAwesomeIcon icon={faClock} />}
                  onClick={() => {
                    setSchedulerPlatformPosts([]);
                    setPlannerDefaultTab('planen');
                    setShowPlannerModal(true);
                  }}
                />
              </div>
            </div>
          )}
        </div>
        {contentTransformStep === 1 && null}
      </div>
    );
  };

  if (isMobileBlocked) {
    return (
      <>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "48px 28px 36px",
            background: "#111111",
            color: "#EFE7DC",
            fontFamily: "IBM Plex Mono, monospace",
            boxSizing: "border-box",
          }}
        >
          {/* Top: Brand mark */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <div style={{ width: "24px", height: "1px", background: "#AC8E66" }} />
              <span style={{ fontSize: "10px", color: "#AC8E66", letterSpacing: "0.18em", textTransform: "uppercase" as const }}>
                ZenPost Studio
              </span>
            </div>
            <div style={{ fontSize: "10px", color: "#EFE7DC", letterSpacing: "0.08em", paddingLeft: "34px" }}>
              v0.1 · Building in Public
            </div>
          </div>

          {/* Middle: Story */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: "52px", paddingBottom: "52px" }}>
            <div
              style={{
                fontSize: "30px",
                fontWeight: 700,
                lineHeight: 1.15,
                color: "#EFE7DC",
                marginBottom: "28px",
                letterSpacing: "-0.02em",
              }}
            >
              Ein Werkzeug<br />
              <span style={{ color: "#AC8E66" }}>für ruhiges</span><br />
              Schreiben.
            </div>

            <div
              style={{
                fontSize: "12px",
                lineHeight: 1.95,
                color: "#EFE7DC",
                borderLeft: "1px solid #222",
                paddingLeft: "16px",
                marginBottom: "40px",
              }}
            >
              ZenPost Studio ist ein Tool —<br />
              gebaut für Menschen, die denken,<br />
              bevor sie posten.<br />
              <br />

              1 mal Schreiben. 9mal Transformieren.<br />
              Eine Mobil App entsteht gerade —<br />
              noch nicht für Mobile verfügbar.<br />
              <br />
              <span style={{ color: "#AC8E66" }}>Jetzt testen:</span> Web Desktop<br />
              oder Desktop App (Mac / Windows / Linux).<br />
              <br />
              Die Geschichte dahinter...<br />
              Öffentlich. Ehrlich. Zeile für Zeile.
              <br />
              Als Dev Log - Building in Public
            </div>

            {/* Ornamental divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
              <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, #AC8E66, transparent)" }} />
              <span style={{ fontSize: "9px", color: "#AC8E66", letterSpacing: "0.2em" }}>DEV LOG</span>
              <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, #AC8E66, transparent)" }} />
            </div>

            {/* Primary CTA */}
            <button
              onClick={() => openExternal("https://zenpostmobil.denisbitter.de")}
              style={{
                padding: "14px 18px",
                background: "rgba(172,142,102,)",
                border: "1px solid #AC8E66",
                borderRadius: "6px",
                color: "#AC8E66",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "13px",
                cursor: "pointer",
                textAlign: "left" as const,
                letterSpacing: "0.02em",
                marginBottom: "20px",
              }}
            >
              Building in Public lesen ↗
            </button>

            {/* Secondary links */}
            <div style={{ display: "flex", gap: "24px" }}>
              <button
                onClick={() => openExternal("https://zenpostdocs.denisbitter.de/")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#EFE7DC",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: "11px",
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                  textDecorationColor: "#2a2a2a",
                }}
              >
                ZenPost Guide
              </button>
              <button
                onClick={() => openExternal("https://github.com/THEORIGINALBITTER/zenpost-studio")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#EFE7DC",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: "11px",
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                  textDecorationColor: "#2a2a2a",
                }}
              >
                GitHub
              </button>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              borderTop: "1px solid #1c1c1c",
              paddingTop: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "10px", 
              color: "#4e4e4e", letterSpacing: "0.08em" }}>
              Desktop Web Mobil 
            </span>
            <button
              onClick={() => openExternal("https://denisbitter.de")}
              style={{
                background: "none",
                border: "none",
                fontSize: "10px",
                color: "#404040",
                fontFamily: "IBM Plex Mono, monospace",
                cursor: "pointer",
                padding: 0,
                letterSpacing: "0.06em",
              }}
            >
              by <span style={{ color: "#AC8E66" }}>Denis Bitter</span>
            </button>
          </div>
        </div>
        <ZenCursor />
      </>
    );
  }

  const seoMeta = (() => {
    const appName = "ZenPost Studio";
    const baseDescription =
      "ZenPost Studio verwandelt Inhalte in plattformspezifische Formate und hilft bei Planung, Doku und Publishing.";

    if (currentScreen === "doc-studio") {
      return {
        title: `${appName} | Doc Studio`,
        description: `Dokumentation erstellen, strukturieren und exportieren mit dem ${appName} Doc Studio.`,
        keywords: "Dokumentation,Doc Studio,README,API Docs,ZenPost",
      };
    }

    if (currentScreen === "content-transform") {
      if (contentTransformStep === 0) {
        return {
          title: `${appName} | Content Dashboard`,
          description: "Projektübersicht, Dokumente und Publishing-Planung im ZenPost Content Dashboard.",
          keywords: "Content Dashboard,Content Studio,Publishing,ZenPost",
        };
      }
      return {
        title: `${appName} | Content Transformer`,
        description: "Inhalte in mehrere Plattformformate transformieren, optimieren und direkt weiterverwenden.",
        keywords: "Content Transformation,Social Media,Blog,Markdown,ZenPost",
      };
    }

    if (currentScreen === "converter") {
      return {
        title: `${appName} | Format Converter`,
        description: `Dateien und Inhalte mit dem ${appName} Converter in passende Arbeitsformate umwandeln.`,
        keywords: "Format Converter,Markdown,Dokumenten-Conversion,ZenPost",
      };
    }

    if (currentScreen === "getting-started") {
      return {
        title: `${appName} | Getting Started`,
        description: "Schnellstart in ZenPost Studio mit Einstieg in Converter, Content Studio und Doc Studio.",
        keywords: "Getting Started,Onboarding,ZenPost Studio",
      };
    }

    return {
      title: `${appName} | Welcome`,
      description: baseDescription,
      keywords: "ZenPost Studio,Content Workflow,Publishing,Documentation",
    };
  })();

  const seoRuntime = (() => {
    const fallbackCanonical = "https://zenpost.denisbitter.de/";

    if (typeof window === "undefined") {
      return {
        canonicalHref: fallbackCanonical,
        ogUrl: fallbackCanonical,
        robots: "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
      };
    }

    const canonicalHref = `${window.location.origin}${window.location.pathname}`;
    const hostname = window.location.hostname.toLowerCase();
    const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
    const shouldIndex = !isTauri() && !isLocalHost;

    return {
      canonicalHref,
      ogUrl: canonicalHref,
      robots: shouldIndex
        ? "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
        : "noindex,nofollow",
    };
  })();

  return (
    <>
      <Helmet>
        <html lang="de" />
        <title>{seoMeta.title}</title>
        <link rel="canonical" href={seoRuntime.canonicalHref} />
        <meta name="description" content={seoMeta.description} />
        <meta name="keywords" content={seoMeta.keywords} />
        <meta name="application-name" content="ZenPost Studio" />
        <meta name="robots" content={seoRuntime.robots} />
        <meta property="og:title" content={seoMeta.title} />
        <meta property="og:description" content={seoMeta.description} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="ZenPost Studio" />
        <meta property="og:url" content={seoRuntime.ogUrl} />
        <meta property="og:image" content="/github-preview-1200x630.png" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={seoMeta.title} />
        <meta property="twitter:description" content={seoMeta.description} />
        <meta property="twitter:image" content="/github-preview-1200x630.png" />
      </Helmet>
      <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        minWidth: '1200px',
        background: '#1a1a1a',
      }}
    >
      <ZenCursor />
      {/* Corner Ribbon - Desktop/Web Switch */}
      <CornerRibbon />

      {/* Globaler Header - Fixed */}
      <ZenHeader
        leftText={getLeftText()}
        rightText={getRightText()}
     
        onHome={currentScreen !== "welcome" && currentScreen !== "getting-started" ? handleHomeClick : undefined}
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
            onSelectMobileInbox={handleSelectMobileInbox}
          />
        )}
        {currentScreen === "converter" && (
          <ConverterScreen
            onBack={handleBackToWelcome}
            onStepChange={setConverterStep}
            onOpenInContentStudio={(content, fileName) => {
              setTransferContent(content);
              setTransferFileName(fileName);
              setTransferPostMeta(null);
              setCameFromDocStudio(false);
              setCameFromDashboard(false);
              setMultiPlatformMode(false);
              setContentTransformStep(1);
              setCurrentScreen("content-transform");
            }}
          />
        )}
        {currentScreen === "content-transform" && (
          contentTransformStep === 0 ? (
            contentStudioDashboardView === "project-map" ? (
              <ContentStudioProjectMapScreen
                isDesktopRuntime={isTauri()}
                projectPath={contentStudioProjectPath}
                allFiles={contentStudioAllFiles}
                webDocuments={webDocuments}
                onBack={() => setContentStudioDashboardView("dashboard")}
                onStartWriting={() => {
                  setContentStudioDashboardView("dashboard");
                  setContentTransformStep(1);
                }}
                onOpenFile={(filePath) => {
                  setContentStudioRequestedFilePath(filePath);
                  setContentStudioDashboardView("dashboard");
                  setContentTransformStep(1);
                }}
                onLoadWebDocument={(content, fileName) => {
                  handleLoadWebDocument(content, fileName);
                }}
              />
            ) : (
              <ContentStudioDashboardScreen
                projectPath={contentStudioProjectPath}
                recentProjectPaths={contentStudioRecentProjectPaths}
                documents={[
                  ...contentStudioAllFiles.map((file) => ({
                    id: `file:${file.path}`,
                    name: file.name,
                    path: file.path,
                    projectPath: contentStudioProjectPath ?? undefined,
                    subtitle: file.path,
                    updatedAt: file.modifiedAt,
                  })),
                  // Web-Dokumente nur anzeigen wenn das aktive Projekt ein Web-Projekt ist
                  ...(isWebProjectPath(contentStudioProjectPath ?? '') ? webDocuments.map((doc) => ({
                    id: `web:${doc.id}`,
                    name: doc.name,
                    projectPath: contentStudioProjectPath ?? undefined,
                    subtitle: 'Web-Dokument',
                    updatedAt: doc.updatedAt,
                  })) : []),
                ]}
                onSelectProjectPath={(path) => {
                  void handleSwitchContentStudioProject(path);
                }}
                onPickProject={() => {
                  if (isTauri()) {
                    void handleSelectContentStudioProject();
                    return;
                  }
                  setShowWebProjectPicker(true);
                }}
                onStartWriting={() => {
                  setActiveServerArticleSlug(null);
                  setContentStudioServerCachePath(null);
                  setActiveBlogForEditor(null);
                  setContentStudioDashboardView("dashboard");
                  setContentTransformStep(1);
                }}
                onStartWritingToBlog={(blog) => {
                  setActiveServerArticleSlug(null);
                  setContentStudioServerCachePath(null);
                  setActiveBlogForEditor(blog);
                  setContentStudioDashboardView("dashboard");
                  setContentTransformStep(1);
                }}
                onOpenBlogPost={(filePath, blog) => {
                  setActiveServerArticleSlug(null);
                  setContentStudioServerCachePath(null);
                  setActiveBlogForEditor(blog);
                  setContentStudioRequestedFilePath(filePath);
                  setContentStudioDashboardView("dashboard");
                  setContentTransformStep(1);
                }}
                onActiveContextChange={setDashboardActiveContextPath}
                onOpenDashboardDocument={(doc) => {
                  setActiveServerArticleSlug(null);
                  setContentStudioServerCachePath(null);
                  if (doc.id.startsWith("file:")) {
                    const filePath = doc.id.replace(/^file:/, "");
                    if (filePath) {
                      setContentStudioRequestedFilePath(filePath);
                      setContentStudioDashboardView("dashboard");
                      setContentTransformStep(1);
                    }
                    return;
                  }
                  if (doc.id.startsWith("web:")) {
                    const webId = doc.id.replace(/^web:/, "");
                    const matched = webDocuments.find((item) => item.id === webId);
                    if (matched) {
                      handleLoadWebDocument(matched.content, matched.name);
                    }
                    return;
                  }
                }}
                onOpenDocuments={(path) => {
                  if (path) void handleSwitchContentStudioProject(path);
                  setContentStudioDashboardView("project-map");
                }}
                onOpenPlanner={() => {
                  setSchedulerPlatformPosts([]);
                  setPlannerDefaultTab('planen');
                  setShowPlannerModal(true);
                }}
                onOpenCalendar={() => {
                  setPlannerDefaultTab('kalender');
                  setShowPlannerModal(true);
                }}
                serverArticles={contentStudioServerArticles}
                serverArticlesLoading={contentStudioServerArticlesLoading}
                serverError={contentStudioServerArticlesError}
                serverName={(() => { const s = loadZenStudioSettings(); return s.servers?.[s.activeServerIndex ?? 0]?.name ?? undefined; })()}
                serverLocalCachePath={(() => {
                  const s = loadZenStudioSettings();
                  const activeServer = s.servers?.[s.activeServerIndex ?? 0];
                  return activeServer?.contentServerLocalCachePath ?? s.contentServerLocalCachePath ?? null;
                })()}
                onOpenServerArticle={(slug) => { void handleOpenServerArticle(slug); }}
                onDeleteServerArticle={handleDeleteServerArticle}
                onOpenApiSettings={() => {
                  setSettingsDefaultTab('api');
                  setShowAISettingsModal(true);
                }}
                onRemoveProject={(path) => {
                  removeProjectPath(path);
                  setContentStudioRecentProjectPaths(getRecentProjectPaths());
                  if (contentStudioProjectPath === path) {
                    const remaining = getRecentProjectPaths();
                    setContentStudioProjectPath(remaining[0] ?? null);
                  }
                }}
                blogs={loadZenStudioSettings().blogs ?? []}
              />
            )
          ) : (
            <ContentTransformScreen
              onBack={handleBackToWelcome}
              onStepChange={setContentTransformStep}
              currentStep={contentTransformStep}
              initialContent={transferContent}
              initialFileName={transferFileName}
              initialPostMeta={transferPostMeta}
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
              projectPath={activeServerArticleSlug ? (contentStudioServerCachePath ?? contentStudioProjectPath) : activeBlogForEditor ? `${activeBlogForEditor.path}/posts` : contentStudioProjectPath}
              requestedArticleId={contentStudioRequestedArticleId}
              onArticleRequestHandled={() => setContentStudioRequestedArticleId(null)}
              requestedFilePath={contentStudioRequestedFilePath}
              onFileRequestHandled={() => setContentStudioRequestedFilePath(null)}
              metadata={contentStudioMetadata}
              onMetadataChange={setContentStudioMetadata}
              onStep2SelectionChange={(count, canProceed) => {
                setContentTransformStep2SelectionCount(count);
                setContentTransformStep2CanProceed(canProceed);
              }}
              headerAction={contentTransformHeaderAction}
              onHeaderActionHandled={() => setContentTransformHeaderAction(null)}
              onStep1BackToPostingChange={setContentTransformShowBackToPosting}
              onOpenDocStudioForPosting={handleOpenDocStudioForPosting}
              onContentChange={handleContentTransformChange}
              editorType={contentEditorType}
              onEditorTypeChange={setContentEditorType}
              multiPlatformMode={multiPlatformMode}
              onMultiPlatformModeChange={setMultiPlatformMode}
              onFileSaved={handleFileSavedWhileEditing}
              onOpenZenThoughtsEditor={handleOpenZenThoughtsEditor}
              serverArticleSlug={activeServerArticleSlug}
              blogSaveTarget={activeBlogForEditor}
              onBlogPostSaved={() => setActiveBlogForEditor(null)}
            />
          )
        )}
        {currentScreen === "doc-studio" && (
          <FeatureGate featureId="DOC_STUDIO" onClose={handleDocStudioBack}>
            <DocStudioScreen
              onBack={handleDocStudioBack}
              onTransferToContentStudio={handleTransferToContentStudio}
              onStepChange={(step) => { setDocStudioStep(step); if (step !== 0) setDocStudioInitialWizard(undefined); }}
              initialStep={docStudioStep}
              initialWizard={docStudioInitialWizard}
              savedState={docStudioState}
              onStateChange={handleSaveDocStudioState}
              onGeneratedContentChange={setDocStudioGeneratedContent}
              onPreviewModeChange={setDocStudioPreviewMode}
              headerAction={docStudioHeaderAction}
              onHeaderActionHandled={() => setDocStudioHeaderAction(null)}
              requestedFilePath={docStudioRequestedFilePath}
              onFileRequestHandled={() => setDocStudioRequestedFilePath(null)}
              requestedWebDocument={docStudioRequestedWebDocument}
              onWebDocumentRequestHandled={() => setDocStudioRequestedWebDocument(null)}
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
              onOpenProjectDocuments={() => {
                setContentStudioModalTab("all");
                setShowContentStudioModal(true);
              }}
              availableProjectDocuments={contentStudioAllFiles}
              availableWebDocuments={webDocuments}
              onOpenEditorSettings={() => {
                setSettingsDefaultTab('editor');
                setShowAISettingsModal(true);
              }}
              onFileSaved={handleFileSavedWhileEditing}
              onPushDocsToGitHub={
                !isWebProjectPath(docStudioState?.projectPath ?? '')
                  ? () => handlePushDocsToGitHubFromDocStudio()
                  : undefined
              }
              githubDocsFileCount={docStudioGithubDocsFileCount}
              onPushTemplatesToGitHub={
                !isWebProjectPath(docStudioState?.projectPath ?? '')
                  ? handlePushTemplatesToGitHubFromDocStudio
                  : undefined
              }
              onOpenGitHubSettings={() => {
                setSettingsDefaultTab('social');
                setShowAISettingsModal(true);
              }}
              onSaveDocsSiteLocally={
                !isWebProjectPath(docStudioState?.projectPath ?? '')
                  ? handleSaveDocsSiteLocally
                  : undefined
              }
              onPushDocsSiteToGitHub={
                !isWebProjectPath(docStudioState?.projectPath ?? '')
                  ? handlePushDocsSiteToGitHub
                  : undefined
              }
            />
          </FeatureGate>
        )}
        {currentScreen === "getting-started" && (
          <GettingStartedScreen
            onBack={handleBackToWelcome}
            onOpenDocStudio={handleSelectDocStudio}
            onOpenDocStudioWizard={(wizard) => {
              setDocStudioInitialWizard(wizard);
              handleSelectDocStudio();
            }}
            onOpenContentAI={handleOpenContentAIFromDashboard}
            onOpenConverter={handleSelectConverter}
            onOpenMobileInbox={handleSelectMobileInbox}
            onOpenMobileSettings={() => {
              setSettingsDefaultTab('mobile');
              setShowAISettingsModal(true);
            }}
            onOpenApiSettings={() => {
              setSettingsDefaultTab('api');
              setShowAISettingsModal(true);
            }}
            recentItems={gettingStartedRecentItems}
            onContinueRecent={handleContinueRecentItem}
            onOpenServerArticle={(slug) => { void handleOpenServerArticle(slug); }}
          />
        )}
        {currentScreen === "mobile-inbox" && (
          <MobileInboxScreen onOpenInContentAI={handleOpenMobileDraftInContentAI} />
        )}
      </div>


      {/* Unsaved-changes toast */}
      {homeToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '28px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1a1a1a',
            border: '0.5px solid #AC8E66',
            borderRadius: '10px',
            padding: '10px 20px',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            color: '#E7CCAA',
            zIndex: 9999,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
          }}
        >
          Nicht gespeicherte Änderungen wurden verworfen.
        </div>
      )}

      {/* Settings-Modal */}
      <ZenSettingsModal
        isOpen={showAISettingsModal}
        onClose={handleCloseSettingsModal}
        defaultTab={settingsDefaultTab}
        onOpenZenThoughtsEditor={handleOpenZenThoughtsEditor}
      />

      {/* About-Modal */}
      <ZenAboutModal
        isOpen={showAboutModal}
        onClose={handleCloseAboutModal}
        onOpenBugReport={handleOpenBugReport}
      />

      {/* Walkthrough Modal */}
      <WalkthroughModal
        isOpen={showWalkthroughModal}
        onClose={() => setShowWalkthroughModal(false)}
        autoStart={true}
      />

      <ZenBugReportModal
        isOpen={showBugReportModal}
        onClose={handleCloseBugReport}
        onOpenInDocStudio={handleOpenBugTemplateInDocStudio}
      />

      <ZenMailSuccessModal
        isOpen={showMailSuccessModal}
        onClose={() => setShowMailSuccessModal(false)}
      />

      <ZenWebProjectPickerModal
        isOpen={showWebProjectPicker}
        onClose={() => setShowWebProjectPicker(false)}
        onCreated={(project, initialDocs) => { void handleWebProjectCreated(project, initialDocs); }}
      />

      <ZenContentStudioModal
        isOpen={showContentStudioModal}
        onClose={handleCloseContentStudioModal}
        title={currentScreen === "doc-studio" ? "Doc Studio" : "Content Studio"}
        projectPath={contentStudioProjectPath}
        recentArticles={contentStudioRecentArticles}
        allFiles={contentStudioAllFiles}
        webDocuments={webDocuments}
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
        onOpenWebDocument={(content, fileName) => handleLoadWebDocument(content, fileName)}
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
        suggestedEditorPost={
          currentScreen === 'content-transform' && !isEditingZenThoughts ? contentPlannerSuggestion ?? undefined : undefined
        }
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
        documentName={exportDocumentName}
        tags={exportTags}
        subtitle={exportSubtitle || undefined}
        imageUrl={exportImageUrl || undefined}
        onNavigateToTransform={handleNavigateToMultiPlatformTransform}
      />

      {/* Upgrade Modal - triggered by FeatureGate or manual */}
      <UpgradeModalWrapper />


      {/* Publishing Engine Banner */}
      <ZenPublishingBanner
        duePosts={publishingEngine.duePosts}
        publishing={publishingEngine.publishing}
        results={publishingEngine.results}
        onPublish={publishingEngine.publish}
        onSkip={publishingEngine.skip}
      />
      </div>
    </>
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

interface WebStoredDocument {
  id: string;
  name: string;
  content: string;
  updatedAt: number;
}

const saveMenuItemStyle: React.CSSProperties = {
  width: "100%",
  height: "38px",
  border: "0",
  borderTop: "0.5px solid #2A2A2A",
  background: "#121212",
  color: "#EFEBDC",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "0 12px",
  fontFamily: "IBM Plex Mono, monospace",
  fontSize: "10px",
  cursor: "pointer",
  textAlign: "left",
};

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
      borderTop: active ? "1px solid #2A2A2A" : "1px dotted #2A2A2A",
      borderLeft: active ? "1px solid #2A2A2A" : "1px dotted #2A2A2A",
      borderRight: active ? "1px solid #2A2A2A" : "1px dotted #2A2A2A",
      borderBottom: "0",
      borderRadius: "10px 10px 0 0",
      padding: "0 10px",
      background:
        active
          ? "#151515"
          : "#121212",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontFamily: "IBM Plex Mono, monospace",
      fontSize: 
        active ? "10px" : "10px",
      fontWeight: active ? "normal" : "normal",
      // Textfarbe anpassen
      color: 
      active ? "#EFEBDC" : "#a1a1a1",
     
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "all 0.2s ease",
      opacity: disabled ? 0.2 : 1,
      overflow: "hidden",
      marginBottom: "-2px",
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
