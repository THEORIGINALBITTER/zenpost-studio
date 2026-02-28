import { useState, useEffect, useRef } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { save } from '@tauri-apps/plugin-dialog';
import {
  faLinkedin,
  faDev,
  faTwitter,
  faMedium,
  faReddit,
  faGithub,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons';
import { faNewspaper } from '@fortawesome/free-solid-svg-icons';
import { ZenSettingsModal, ZenMetadataModal, ZenGeneratingModal, ZenSaveSuccessModal, ZenModal, ZenModalHeader, ZenRoughButton, type ProjectMetadata } from '../kits/PatternKit/ZenModalSystem';
import { ZenFooterText } from '../kits/PatternKit/ZenModalSystem';
import { Step1SourceInput } from './transform-steps/Step1SourceInput';
import { Step2PlatformSelection } from './transform-steps/Step2PlatformSelection';
import { Step3StyleOptions } from './transform-steps/Step3StyleOptions';
import { Step4TransformResult } from './transform-steps/Step4TransformResult';
import {
  transformContent,
  translateContent,
  type ContentPlatform,
  type ContentTone,
  type ContentLength,
  type ContentAudience,
  type TargetLanguage,
} from '../services/aiService';
import { loadArticle } from '../services/publishingService';
import {
  postToSocialMedia,
  loadSocialConfig,
  isPlatformConfigured,
  type SocialPlatform,
  type LinkedInPostOptions,
  type TwitterPostOptions,
  type RedditPostOptions,
  type DevToPostOptions,
  type MediumPostOptions,
} from '../services/socialMediaService';
import {
  defaultEditorSettings,
  loadEditorSettings,
  saveDraftAutosave,
  loadDraftAutosave,
  type EditorSettings,
} from '../services/editorSettingsService';
import {
  loadZenStudioSettings,
  type ZenStudioSettings,
} from '../services/zenStudioSettingsService';

interface PlatformOption {
  value: ContentPlatform;
  label: string;
  icon: any;
  description: string;
}

type PlatformStyleConfig = {
  tone: ContentTone;
  length: ContentLength;
  audience: ContentAudience;
};

const platformOptions: PlatformOption[] = [
  {
    value: 'linkedin',
    label: 'LinkedIn Post',
    icon: faLinkedin,
    description: 'Professional business network post',
  },
  {
    value: 'devto',
    label: 'dev.to Article',
    icon: faDev,
    description: 'Community-focused developer article',
  },
  {
    value: 'twitter',
    label: 'Twitter Thread',
    icon: faTwitter,
    description: 'Concise, engaging thread',
  },
  {
    value: 'medium',
    label: 'Medium Blog',
    icon: faMedium,
    description: 'Long-form storytelling blog',
  },
  {
    value: 'reddit',
    label: 'Reddit Post',
    icon: faReddit,
    description: 'Community discussion post',
  },
  {
    value: 'github-discussion',
    label: 'GitHub Discussion',
    icon: faGithub,
    description: 'Technical collaborative discussion',
  },
  {
    value: 'github-blog',
    label: 'GitHub Blog Post',
    icon: faGithub,
    description: 'Markdown blog post for GitHub Pages',
  },
  {
    value: 'youtube',
    label: 'YouTube Description',
    icon: faYoutube,
    description: 'SEO-optimized video description',
  },
  {
    value: 'blog-post',
    label: 'Blog Post',
    icon: faNewspaper,
    description: 'Comprehensive blog article with SEO',
  },
];

const defaultPlatformStyles: Record<ContentPlatform, PlatformStyleConfig> = {
  linkedin: { tone: 'professional', length: 'medium', audience: 'intermediate' },
  devto: { tone: 'technical', length: 'long', audience: 'intermediate' },
  twitter: { tone: 'enthusiastic', length: 'short', audience: 'intermediate' },
  medium: { tone: 'professional', length: 'long', audience: 'intermediate' },
  reddit: { tone: 'casual', length: 'medium', audience: 'intermediate' },
  'github-discussion': { tone: 'technical', length: 'medium', audience: 'expert' },
  'github-blog': { tone: 'technical', length: 'long', audience: 'intermediate' },
  youtube: { tone: 'enthusiastic', length: 'medium', audience: 'beginner' },
  'blog-post': { tone: 'professional', length: 'long', audience: 'intermediate' },
};

interface ContentTransformScreenProps {
  onBack: () => void;
  onStepChange?: (step: number) => void;
  currentStep?: number;
  initialContent?: string | null;
  initialFileName?: string | null;
  initialPlatform?: ContentPlatform;
  cameFromDocStudio?: boolean;
  cameFromDashboard?: boolean;
  onBackToDocStudio?: (editedContent?: string) => void;
  onBackToDashboard?: (generatedContent?: string) => void;
  onOpenConverter?: () => void;
  projectPath?: string | null;
  requestedArticleId?: string | null;
  onArticleRequestHandled?: () => void;
  requestedFilePath?: string | null;
  onFileRequestHandled?: () => void;
  metadata?: ProjectMetadata;
  onMetadataChange?: (metadata: ProjectMetadata) => void;
  headerAction?: "preview" | "next" | "copy" | "download" | "edit" | "post" | "posten" | "post_direct" | "reset" | "back_doc" | "back_dashboard" | "back_posting" | "save" | "save_as" | "transform" | null;
  onHeaderActionHandled?: () => void;
  onStep1BackToPostingChange?: (visible: boolean) => void;
  onStep2SelectionChange?: (count: number, canProceed: boolean) => void;
  onOpenDocStudioForPosting?: (content: string) => void;
  onContentChange?: (
    content: string,
    meta?: {
      source: 'step1' | 'step4';
      activeTabId?: string | null;
      activeTabKind?: 'draft' | 'file' | 'article' | 'derived';
      activeTabFilePath?: string;
      activeTabTitle?: string;
    }
  ) => void;
  editorType?: "block" | "markdown";
  onEditorTypeChange?: (type: "block" | "markdown") => void;
  multiPlatformMode?: boolean;
  onMultiPlatformModeChange?: (enabled: boolean) => void;
  /** Called when a file is saved successfully with the new path and content */
  onFileSaved?: (filePath: string, content: string, fileName: string) => void;
  onOpenZenThoughtsEditor?: (content: string, filePath?: string) => void;
}

type ContentDocTab = {
  id: string;
  title: string;
  kind: 'draft' | 'file' | 'article' | 'derived';
  filePath?: string;
  articleId?: string;
};

export const ContentTransformScreen = ({
  onBack: _onBack,
  onStepChange,
  currentStep: externalStep,
  initialContent,
  initialFileName,
  initialPlatform,
  cameFromDocStudio,
  cameFromDashboard,
  onBackToDocStudio,
  onBackToDashboard,
  onOpenConverter,
  projectPath,
  requestedArticleId,
  onArticleRequestHandled,
  requestedFilePath,
  onFileRequestHandled,
  metadata: externalMetadata,
  onMetadataChange,
  headerAction,
  onHeaderActionHandled,
  onStep1BackToPostingChange,
  onStep2SelectionChange,
  onOpenDocStudioForPosting,
  onContentChange: onExternalContentChange,
  editorType = "block",
  onEditorTypeChange,
  multiPlatformMode = false,
  onMultiPlatformModeChange,
  onFileSaved,
  onOpenZenThoughtsEditor,
}: ContentTransformScreenProps) => {
  // Step Management
  const [currentStep, setCurrentStep] = useState<number>(externalStep ?? 1);
  const effectiveStep = externalStep ?? currentStep;
  const setStep = (step: number) => {
    if (externalStep !== undefined) {
      onStepChange?.(step);
      return;
    }
    setCurrentStep(step);
    onStepChange?.(step);
  };

  // Step 1: Source Input
  const STEP1_SAVED_COMPARISON_ID = '__saved__';
  const STEP1_TAB_COMPARISON_PREFIX = 'tab:';
  const [sourceContent, setSourceContent] = useState<string>('');
  const sourceContentRef = useRef<string>('');
  const liveContentGetterRef = useRef<(() => Promise<string>) | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [openDocTabs, setOpenDocTabs] = useState<ContentDocTab[]>([]);
  const [activeDocTabId, setActiveDocTabId] = useState<string | null>(null);
  const activeDocTabIdRef = useRef<string | null>(null);
  const [docTabContents, setDocTabContents] = useState<Record<string, string>>({});
  const [dirtyDocTabs, setDirtyDocTabs] = useState<Record<string, boolean>>({});
  const [step1ComparisonBaseByTab, setStep1ComparisonBaseByTab] = useState<Record<string, string>>({});
  const [step1ComparisonSelectionByTab, setStep1ComparisonSelectionByTab] = useState<Record<string, string>>({});
  const [editorSettings, setEditorSettings] = useState<EditorSettings>({
    ...defaultEditorSettings,
  });
  const lastAutosaveRef = useRef<Record<string, string>>({});
  const [step1AutosaveStatus, setStep1AutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [step1AutosaveAt, setStep1AutosaveAt] = useState<string | null>(null);
  const restoredAutosaveKeysRef = useRef<Record<string, boolean>>({});
  const [pendingCloseTabId, setPendingCloseTabId] = useState<string | null>(null);

  const emitExternalContentChange = (
    content: string,
    source: 'step1' | 'step4',
    tabId?: string | null
  ) => {
    const resolvedTabId = tabId ?? activeDocTabIdRef.current ?? null;
    const resolvedTab = resolvedTabId ? openDocTabs.find((tab) => tab.id === resolvedTabId) : null;
    onExternalContentChange?.(content, {
      source,
      activeTabId: resolvedTabId,
      activeTabKind: resolvedTab?.kind,
      activeTabFilePath: resolvedTab?.filePath,
      activeTabTitle: resolvedTab?.title,
    });
  };

  useEffect(() => {
    activeDocTabIdRef.current = activeDocTabId;
  }, [activeDocTabId]);

  useEffect(() => {
    sourceContentRef.current = sourceContent;
  }, [sourceContent]);

  useEffect(() => {
    if (!activeDocTabId) return;
    if (!openDocTabs.find((tab) => tab.id === activeDocTabId)) {
      setActiveDocTabId(null);
    }
  }, [openDocTabs, activeDocTabId]);

  useEffect(() => {
    if (activeDocTabId || openDocTabs.length === 0) return;
    const nextTab = openDocTabs[0];
    activeDocTabIdRef.current = nextTab.id;
    setActiveDocTabId(nextTab.id);
    const nextContent = docTabContents[nextTab.id] ?? '';
    setSourceContent(nextContent);
    emitExternalContentChange(nextContent, 'step1', nextTab.id);
    setFileName(nextTab.title ?? '');
  }, [openDocTabs, activeDocTabId, docTabContents]);

  useEffect(() => {
    const hasDraftTab = openDocTabs.some((tab) => tab.kind === 'draft');
    if (hasDraftTab) return;
    const draftTabId = `draft-${Date.now()}`;
    setOpenDocTabs((prev) => [...prev, { id: draftTabId, title: 'Entwurf', kind: 'draft' }]);
    setDocTabContents((prev) => ({ ...prev, [draftTabId]: '' }));
    setDirtyDocTabs((prev) => ({ ...prev, [draftTabId]: false }));
    if (!activeDocTabIdRef.current) {
      activeDocTabIdRef.current = draftTabId;
      setActiveDocTabId(draftTabId);
      setSourceContent('');
      setFileName('Entwurf');
      emitExternalContentChange('', 'step1', draftTabId);
    }
  }, [openDocTabs]);

  useEffect(() => {
    setStep1ComparisonBaseByTab((prev) => {
      let changed = false;
      const next = { ...prev };
      openDocTabs.forEach((tab) => {
        if (next[tab.id] === undefined) {
          next[tab.id] = docTabContents[tab.id] ?? '';
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [openDocTabs, docTabContents]);

  useEffect(() => {
    setStep1ComparisonSelectionByTab((prev) => {
      let changed = false;
      const next = { ...prev };
      openDocTabs.forEach((tab) => {
        if (!next[tab.id]) {
          next[tab.id] = STEP1_SAVED_COMPARISON_ID;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [openDocTabs]);

  const getActiveSavePlatform = (): ContentPlatform => {
    if (multiPlatformMode && activeEditTab) return activeEditTab;
    return selectedPlatform;
  };

  const buildDefaultSaveName = (baseName: string, version: number) => {
    const date = new Date().toISOString().slice(0, 10);
    return `${baseName}_${date}_v${version}.md`;
  };

  // Strip existing version pattern from filename: "Name_2026-02-03_v1.md" → "Name"
  // Also handles multiple nested patterns: "Name_2026-02-03_v1_2026-02-03_v1" → "Name"
  const stripVersionPattern = (name: string): string => {
    // First remove .md extension
    let base = name.replace(/\.md$/i, '');
    // Remove ALL occurrences of _YYYY-MM-DD_vN pattern (no $ anchor, removes all)
    // Pattern: underscore, 4 digits, dash, 2 digits, dash, 2 digits, underscore, v, digits
    base = base.replace(/_\d{4}-\d{2}-\d{2}_v\d+/g, '');
    return base;
  };

  const resolveNextAvailableName = async (baseName: string, baseDir: string) => {
    // First strip any existing version pattern from the base name
    const cleanBase = stripVersionPattern(baseName);
    let version = 1;
    let candidate = buildDefaultSaveName(cleanBase, version);
    while (await exists(`${baseDir}/${candidate}`)) {
      version += 1;
      candidate = buildDefaultSaveName(cleanBase, version);
    }
    return candidate;
  };

  // Get the base name for saving - use original filename if available, otherwise use platform
  const getSaveBaseName = (): string => {
    // Check if there's an active tab with a file
    if (activeDocTabId) {
      const activeTab = openDocTabs.find((tab) => tab.id === activeDocTabId);
      if (activeTab?.title) {
        // Remove .md extension and version pattern to get clean base name
        return stripVersionPattern(activeTab.title);
      }
    }
    // Fallback to fileName state
    if (fileName) {
      return stripVersionPattern(fileName);
    }
    // Final fallback to platform
    return getActiveSavePlatform();
  };

  const getLatestSourceContent = (override?: string) =>
    override ?? sourceContentRef.current ?? sourceContent;

  const getStep1AutosaveKey = () => {
    const activeTab = activeDocTabId ? openDocTabs.find((tab) => tab.id === activeDocTabId) : null;
    if (!activeTab) return 'content-step1:global';
    if (activeTab.kind === 'file' && activeTab.filePath) return `content-step1:file:${activeTab.filePath}`;
    if (activeTab.kind === 'article' && activeTab.articleId) return `content-step1:article:${activeTab.articleId}`;
    return `content-step1:tab:${activeTab.id}`;
  };

  const resolveLatestSourceContent = async (override?: string) => {
    if (typeof override === 'string') return override;
    const getter = liveContentGetterRef.current;
    if (getter) {
      try {
        const snapshot = await getter();
        if (typeof snapshot === 'string') {
          sourceContentRef.current = snapshot;
          if (snapshot !== sourceContent) {
            setSourceContent(snapshot);
          }
          return snapshot;
        }
      } catch {
        // fallback to state/ref
      }
    }
    return getLatestSourceContent();
  };

  const finalizeSavedSource = (
    filePath: string | undefined,
    savedName: string,
    content: string,
    options?: { markAsFile?: boolean }
  ) => {
    if (activeDocTabId) {
      setDirtyDocTabs((prev) => ({ ...prev, [activeDocTabId]: false }));
      setDocTabContents((prev) => ({ ...prev, [activeDocTabId]: content }));
      setStep1ComparisonBaseByTab((prev) => ({ ...prev, [activeDocTabId]: content }));
      if (options?.markAsFile && filePath) {
        setOpenDocTabs((prev) =>
          prev.map((tab) =>
            tab.id === activeDocTabId
              ? { ...tab, kind: 'file' as const, filePath, title: savedName }
              : tab
          )
        );
        setFileName(savedName);
      }
    }
    setSavedFileName(savedName);
    setSavedFilePath(filePath);
    setShowSaveSuccess(true);
    if (filePath) {
      onFileSaved?.(filePath, content, savedName);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('zenpost-project-files-updated'));
    }
  };

  const handleSaveAsSourceToProject = async (contentOverride?: string) => {
    const contentToSave = await resolveLatestSourceContent(contentOverride);
    if (!contentToSave.trim()) {
      alert('Kein Inhalt zum Speichern.');
      return;
    }

    const saveBaseName = getSaveBaseName();
    const defaultName = buildDefaultSaveName(saveBaseName, 1);

    if (isTauri()) {
      if (!projectPath) {
        alert('Kein Projektordner gesetzt.');
        return;
      }
      const suggestedName = await resolveNextAvailableName(saveBaseName, projectPath);
      const filePath = await save({
        defaultPath: `${projectPath}/${suggestedName}`,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });
      if (!filePath) return;
      if (!filePath.startsWith(projectPath)) {
        alert('Bitte speichere innerhalb des Projektordners.');
        return;
      }
      await writeTextFile(filePath, contentToSave);
      const savedName = filePath.split(/[\\/]/).pop() || suggestedName;
      finalizeSavedSource(filePath, savedName, contentToSave, { markAsFile: true });
      return;
    }

    const blob = new Blob([contentToSave], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const userName = window.prompt('Dateiname anpassen?', defaultName);
    const finalName = (userName && userName.trim()) ? userName.trim() : defaultName;
    const finalFileName = finalName.endsWith('.md') ? finalName : `${finalName}.md`;
    link.download = finalFileName;
    link.click();
    URL.revokeObjectURL(url);
    finalizeSavedSource(undefined, finalFileName, contentToSave);
  };

  const handleSaveSourceToProject = async (contentOverride?: string) => {
    const contentToSave = await resolveLatestSourceContent(contentOverride);
    if (!contentToSave.trim()) {
      alert('Kein Inhalt zum Speichern.');
      return;
    }

    const activeTab = activeDocTabId ? openDocTabs.find((tab) => tab.id === activeDocTabId) : null;

    if (isTauri() && activeTab?.kind === 'file' && activeTab.filePath) {
      await writeTextFile(activeTab.filePath, contentToSave);
      const savedName = activeTab.filePath.split(/[\\/]/).pop() || activeTab.title || 'Dokument.md';
      finalizeSavedSource(activeTab.filePath, savedName, contentToSave);
      return;
    }

    await handleSaveAsSourceToProject(contentToSave);
  };

  // Track initial content load to prevent re-loading
  const loadedInitialKeyRef = useRef<string | null>(null);
  const lastRequestedArticleIdRef = useRef<string | null>(null);
  const lastRequestedFilePathRef = useRef<string | null>(null);

  // Load initial content if provided (from Doc Studio or Planner) - when content changes
  useEffect(() => {
    if (initialContent === null || initialContent === undefined) return;
    const initialKey = `${initialFileName ?? ''}::${initialContent}`;
    if (initialKey !== loadedInitialKeyRef.current) {
      // Extract title from content if it starts with a markdown heading
      const extractTitleFromContent = (content: string): string | null => {
        const match = content.match(/^#\s+(.+)$/m);
        return match ? match[1].trim() : null;
      };

      const contentTitle = extractTitleFromContent(initialContent);
      const tabTitle = initialFileName || contentTitle || 'Geplanter Post';
      const tabId = `initial-${Date.now()}`;

      // Create a new tab for the initial content (don't clear existing tabs)
      const newTab: ContentDocTab = {
        id: tabId,
        title: tabTitle,
        kind: 'draft',
      };

      setOpenDocTabs((prev) => {
        // Check if tab with same title already exists
        const existingTab = prev.find((tab) => tab.title === tabTitle);
        if (existingTab) {
          // Update existing tab content
          setDocTabContents((prevContents) => ({ ...prevContents, [existingTab.id]: initialContent }));
          setActiveDocTabId(existingTab.id);
          return prev;
        }
        // Add new tab
        return [...prev, newTab];
      });

      setDocTabContents((prev) => ({ ...prev, [tabId]: initialContent }));
      setActiveDocTabId(tabId);
      setSourceContent(initialContent);
      setFileName(tabTitle);
      loadedInitialKeyRef.current = initialKey;
    }
  }, [initialContent, initialFileName]);

  useEffect(() => {
    if (!projectPath) return;
    let isMounted = true;
    const loadSettings = async () => {
      const loaded = await loadEditorSettings(projectPath);
      if (isMounted) {
        setEditorSettings(loaded);
      }
    };
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, [projectPath]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<EditorSettings>).detail;
      if (detail) {
        setEditorSettings(detail);
      }
    };
    window.addEventListener('zen-editor-settings-updated', handler);
    return () => window.removeEventListener('zen-editor-settings-updated', handler);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ZenStudioSettings>).detail;
      if (detail) {
        setZenStudioSettings(detail);
      } else {
        setZenStudioSettings(loadZenStudioSettings());
      }
    };
    window.addEventListener('zen-studio-settings-updated', handler);
    return () => window.removeEventListener('zen-studio-settings-updated', handler);
  }, []);

  useEffect(() => {
    if (!projectPath || !editorSettings.autoSaveEnabled) return;
    const autosaveKey = getStep1AutosaveKey();
    if (!autosaveKey || restoredAutosaveKeysRef.current[autosaveKey]) return;
    restoredAutosaveKeysRef.current[autosaveKey] = true;
    loadDraftAutosave(projectPath, autosaveKey)
      .then((draft) => {
        if (!draft?.content) return;
        if (draft.content === sourceContent) return;
        const shouldRestore = window.confirm(
          `Entwurf gefunden (${new Date(draft.meta.updatedAt).toLocaleString('de-DE')}). Wiederherstellen?`
        );
        if (!shouldRestore) return;
        const restored = draft.content;
        sourceContentRef.current = restored;
        setSourceContent(restored);
        emitExternalContentChange(restored, 'step1');
        if (activeDocTabId) {
          setDocTabContents((prev) => ({ ...prev, [activeDocTabId]: restored }));
          setDirtyDocTabs((prev) => ({ ...prev, [activeDocTabId]: true }));
        }
      })
      .catch((error) => {
        console.error('[ContentTransform] Restore Autosave fehlgeschlagen:', error);
      });
  }, [projectPath, editorSettings.autoSaveEnabled, activeDocTabId, sourceContent, openDocTabs]);

  useEffect(() => {
    if (!projectPath || !editorSettings.autoSaveEnabled) return;
    if (!sourceContent.trim()) return;
    const autosaveKey = getStep1AutosaveKey();
    const debounceMs = 1200;
    const timeout = setTimeout(() => {
      const trimmed = sourceContent.trim();
      if (lastAutosaveRef.current[autosaveKey] === trimmed) return;
      setStep1AutosaveStatus('saving');
      saveDraftAutosave(projectPath, autosaveKey, sourceContent)
        .then(() => {
          lastAutosaveRef.current[autosaveKey] = trimmed;
          setStep1AutosaveStatus('saved');
          setStep1AutosaveAt(new Date().toISOString());
        })
        .catch((error) => {
          console.error('[ContentTransform] Autosave fehlgeschlagen:', error);
          setStep1AutosaveStatus('error');
        });
    }, debounceMs);
    return () => clearTimeout(timeout);
  }, [projectPath, editorSettings.autoSaveEnabled, sourceContent, activeDocTabId, openDocTabs]);

  useEffect(() => {
    if (!requestedArticleId || !projectPath) return;
    if (requestedArticleId === lastRequestedArticleIdRef.current) return;
    let isMounted = true;
    const loadRequestedArticle = async () => {
      const article = await loadArticle(projectPath, requestedArticleId);
      if (!article || !isMounted) return;
      const tabId = `article:${requestedArticleId}`;
      const title = article.title || 'Artikel';
      const content = article.content || '';
      setOpenDocTabs((prev) =>
        prev.some((tab) => tab.id === tabId)
          ? prev
          : [...prev, { id: tabId, title, kind: 'article', articleId: requestedArticleId }]
      );
      setDocTabContents((prev) => ({ ...prev, [tabId]: content }));
      setDirtyDocTabs((prev) => ({ ...prev, [tabId]: false }));
      setActiveDocTabId(tabId);
      setSourceContent(content);
      setFileName(title);
      setError(null);
      setStep(1);
      lastRequestedArticleIdRef.current = requestedArticleId;
      onArticleRequestHandled?.();
    };
    loadRequestedArticle();
    return () => {
      isMounted = false;
    };
  }, [projectPath, requestedArticleId, onArticleRequestHandled]);

  useEffect(() => {
    if (!requestedFilePath) return;
    const tabId = `file:${requestedFilePath}`;
    const existingFileTab =
      openDocTabs.find((tab) => tab.kind === 'file' && tab.filePath === requestedFilePath) ??
      openDocTabs.find((tab) => tab.id === tabId);
    const targetTabId = existingFileTab?.id ?? tabId;
    if (requestedFilePath === lastRequestedFilePathRef.current && existingFileTab) {
      const content = docTabContents[targetTabId] ?? '';
      setActiveDocTabId(targetTabId);
      setSourceContent(content);
      const fileNameFromPath = requestedFilePath.split(/[\\/]/).pop() || 'Datei';
      setFileName(fileNameFromPath);
      setError(null);
      setStep(1);
      onFileRequestHandled?.();
      return;
    }
    let isMounted = true;
    const loadRequestedFile = async () => {
      try {
        const content = await readTextFile(requestedFilePath);
        if (!isMounted) return;
        const fileNameFromPath = requestedFilePath.split(/[\\/]/).pop() || 'Datei';
        const resolvedTabId =
          existingFileTab?.id ||
          openDocTabs.find((tab) => tab.kind === 'file' && tab.filePath === requestedFilePath)?.id ||
          tabId;
        setOpenDocTabs((prev) => {
          const match =
            prev.find((tab) => tab.kind === 'file' && tab.filePath === requestedFilePath) ??
            prev.find((tab) => tab.id === tabId);
          if (!match) {
            return [...prev, { id: tabId, title: fileNameFromPath, kind: 'file', filePath: requestedFilePath }];
          }
          if (match.title === fileNameFromPath && match.kind === 'file' && match.filePath === requestedFilePath) {
            return prev;
          }
          return prev.map((tab) =>
            tab.id === match.id
              ? { ...tab, title: fileNameFromPath, kind: 'file', filePath: requestedFilePath }
              : tab
          );
        });
        setDocTabContents((prev) => ({ ...prev, [resolvedTabId]: content }));
        setDirtyDocTabs((prev) => ({ ...prev, [resolvedTabId]: false }));
        setActiveDocTabId(resolvedTabId);
        setSourceContent(content);
        setFileName(fileNameFromPath);
        setError(null);
        setStep(1);
        lastRequestedFilePathRef.current = requestedFilePath;
        onFileRequestHandled?.();
      } catch (error) {
        console.error('[ContentTransform] Datei konnte nicht geladen werden:', error);
      }
    };
    loadRequestedFile();
    return () => {
      isMounted = false;
    };
  }, [requestedFilePath, openDocTabs, docTabContents, onFileRequestHandled]);

  // Step 2: Platform Selection
  const [selectedPlatform, setSelectedPlatform] = useState<ContentPlatform>(initialPlatform || 'linkedin');

  // Multi-platform selection (for multi-select mode)
  const [selectedPlatforms, setSelectedPlatforms] = useState<ContentPlatform[]>([]);
  const [activeEditTab, setActiveEditTab] = useState<ContentPlatform | null>(null);

  // Step 3: Style Options
  const [tone, setTone] = useState<ContentTone>('professional');
  const [length, setLength] = useState<ContentLength>('medium');
  const [audience, setAudience] = useState<ContentAudience>('intermediate');
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>('deutsch');
  const [styleMode, setStyleMode] = useState<'global' | 'platform'>('platform');
  const [stylePlatformOverrides, setStylePlatformOverrides] = useState<Partial<Record<ContentPlatform, PlatformStyleConfig>>>({});
  const [activeStylePlatform, setActiveStylePlatform] = useState<ContentPlatform | null>(null);

  // Step 4: Result
  const [transformedContent, setTransformedContent] = useState<string>('');
  const [isTransforming, setIsTransforming] = useState<boolean>(false);
  const transformInFlightRef = useRef(false);

  // Multi-platform results (for multi-select mode)
  const [transformedContents, setTransformedContents] = useState<Record<ContentPlatform, string>>({} as Record<ContentPlatform, string>);
  const [activeResultTab, setActiveResultTab] = useState<ContentPlatform | null>(null);
  const [step4OriginalContent, setStep4OriginalContent] = useState<string>('');
  const [step4SourceTabId, setStep4SourceTabId] = useState<string | null>(null);
  const [resultTabBySource, setResultTabBySource] = useState<Record<string, string>>({});
  const [step4LastChangeSource, setStep4LastChangeSource] = useState<'ai' | 'translator' | 'manual'>('manual');

  // Propagate content changes to parent (for Export Modal)
  useEffect(() => {
    if (transformedContent) {
      emitExternalContentChange(transformedContent, 'step4');
    }
  }, [transformedContent, openDocTabs]);

  useEffect(() => {
    if (effectiveStep !== 1) return;
    if (!multiPlatformMode) return;
    const tabs = Object.keys(transformedContents).length
      ? (Object.keys(transformedContents) as ContentPlatform[])
      : selectedPlatforms;
    if (!activeEditTab && tabs.length > 0) {
      setActiveEditTab(tabs[0]);
      return;
    }
    if (activeEditTab && Object.prototype.hasOwnProperty.call(transformedContents, activeEditTab)) {
      setSourceContent(transformedContents[activeEditTab] || '');
    }
  }, [effectiveStep, multiPlatformMode, transformedContents, selectedPlatforms, activeEditTab]);
  const [isPosting, setIsPosting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSelectedModel, setAutoSelectedModel] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Track if user came from "Nachbearbeiten" flow
  const [cameFromEdit, setCameFromEdit] = useState<boolean>(false);

  // Settings Modal
  const [showSettings, setShowSettings] = useState(false);
  const [settingsDefaultTab, setSettingsDefaultTab] = useState<'ai' | 'social' | 'editor' | 'zenstudio'>('ai');
  const [settingsSocialTab, setSettingsSocialTab] = useState<
    'twitter' | 'reddit' | 'linkedin' | 'devto' | 'medium' | 'github' | undefined
  >(undefined);
  const [settingsMissingSocialHint, setSettingsMissingSocialHint] = useState(false);
  const [settingsMissingSocialLabel, setSettingsMissingSocialLabel] = useState<string | undefined>(undefined);
  const [zenStudioSettings, setZenStudioSettings] = useState<ZenStudioSettings>(() =>
    loadZenStudioSettings()
  );

  // Metadata Modal
  const [showMetadata, setShowMetadata] = useState(false);

  // Save Success Modal
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [savedFileName, setSavedFileName] = useState('');
  const [savedFilePath, setSavedFilePath] = useState<string | undefined>(undefined);
  const [localMetadata, setLocalMetadata] = useState<ProjectMetadata>({
    authorName: '',
    authorEmail: '',
    companyName: '',
    license: 'MIT',
    year: new Date().getFullYear().toString(),
    website: '',
    repository: '',
    contributingUrl: '',
  });
  const metadata = externalMetadata ?? localMetadata;
  const handleMetadataSave = (newMetadata: ProjectMetadata) => {
    if (onMetadataChange) {
      onMetadataChange(newMetadata);
    } else {
      setLocalMetadata(newMetadata);
    }
  };

  // Extract metadata from content (auto-detect from document)
  // TODO: Implement auto-extraction feature
  // const extractMetadataFromContent = (content: string): Partial<ProjectMetadata> => {
  //   const extracted: Partial<ProjectMetadata> = {};
  //   // Extract GitHub repository URL
  //   const repoMatch = content.match(/https?:\/\/github\.com\/[\w-]+\/[\w-]+/i);
  //   if (repoMatch) extracted.repository = repoMatch[0];
  //   // ... weitere Extractions
  //   return extracted;
  // };

  // Replace placeholders in content with metadata
  const replacePlaceholders = (content: string): string => {
    let result = content;

    // Replace common placeholders
    const replacements: Record<string, string> = {
      '[yourName]': metadata.authorName || '[yourName]',
      '[Your Name]': metadata.authorName || '[Your Name]',
      '[authorName]': metadata.authorName || '[authorName]',
      '[yourEmail]': metadata.authorEmail || '[yourEmail]',
      '[Your Email]': metadata.authorEmail || '[Your Email]',
      '[authorEmail]': metadata.authorEmail || '[authorEmail]',
      '[companyName]': metadata.companyName || '[companyName]',
      '[Company Name]': metadata.companyName || '[Company Name]',
      '[website]': metadata.website || '[website]',
      '[Website]': metadata.website || '[Website]',
      '[repository]': metadata.repository || '[repository]',
      '[Repository]': metadata.repository || '[Repository]',
      '[year]': metadata.year || '[year]',
      '[Year]': metadata.year || '[Year]',
      '[description]': metadata.description || '[description]',
      '[Description]': metadata.description || '[Description]',
      '[keywords]': metadata.keywords || '[keywords]',
      '[Keywords]': metadata.keywords || '[Keywords]',
      '[lang]': metadata.lang || '[lang]',
      '[Lang]': metadata.lang || '[Lang]',
    };

    Object.entries(replacements).forEach(([placeholder, value]) => {
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });

    return result;
  };

  const getPlatformLabel = (platform: ContentPlatform) => {
    const match = platformOptions.find((option) => option.value === platform);
    return match?.label || platform;
  };

  const getPlatformStyleConfig = (platform: ContentPlatform): PlatformStyleConfig => {
    return stylePlatformOverrides[platform] ?? defaultPlatformStyles[platform];
  };

  const getEffectivePlatformStyle = (platform: ContentPlatform): PlatformStyleConfig => {
    if (multiPlatformMode && styleMode === 'global') {
      return { tone, length, audience };
    }
    if (multiPlatformMode && styleMode === 'platform') {
      return getPlatformStyleConfig(platform);
    }
    return { tone, length, audience };
  };

  const getSocialTabForPlatform = (platform: ContentPlatform) => {
    switch (platform) {
      case 'linkedin':
        return 'linkedin';
      case 'twitter':
        return 'twitter';
      case 'reddit':
        return 'reddit';
      case 'devto':
        return 'devto';
      case 'medium':
        return 'medium';
      case 'github-discussion':
      case 'github-blog':
        return 'github';
      default:
        return undefined;
    }
  };

  const captureStep4Original = (contentSnapshot?: string) => {
    setStep4OriginalContent(getLatestSourceContent(contentSnapshot));
    setStep4SourceTabId(activeDocTabIdRef.current);
    setStep4LastChangeSource('manual');
  };

  const openStep4FromSource = async (contentOverride?: string, mode: 'preview' | 'posting' = 'preview') => {
    const snapshot = await resolveLatestSourceContent(contentOverride);
    setPreviewMode(mode === 'preview');
    setTransformedContent(snapshot);
    captureStep4Original(snapshot);
    setCameFromEdit(false);
    setStep(4);
  };

  const upsertResultVersionTab = (nextContent: string, source: 'ai' | 'translator' | 'manual') => {
    const sourceKey = step4SourceTabId ?? '__draft__';
    const sourceTab = step4SourceTabId ? openDocTabs.find((tab) => tab.id === step4SourceTabId) : null;
    const baseTitleRaw = sourceTab?.title || fileName || 'Entwurf';
    const baseTitle = baseTitleRaw.replace(/\s·\s(Neu|AI|AI Überarbeitung|Übersetzt)$/i, '');
    const suffix = source === 'translator' ? 'Übersetzt' : source === 'ai' ? 'AI Überarbeitung' : 'Neu';
    const nextTitle = `${baseTitle} · ${suffix}`;

    const mappedId = resultTabBySource[sourceKey];
    const mappedTabExists = mappedId ? openDocTabs.some((tab) => tab.id === mappedId) : false;
    const resultTabId = mappedTabExists ? mappedId : `derived:${sourceKey}:${Date.now()}`;

    if (!mappedTabExists) {
      setOpenDocTabs((prev) => [
        ...prev,
        {
          id: resultTabId,
          title: nextTitle,
          kind: 'derived',
        },
      ]);
      setResultTabBySource((prev) => ({ ...prev, [sourceKey]: resultTabId }));
    } else {
      setOpenDocTabs((prev) =>
        prev.map((tab) => (tab.id === resultTabId ? { ...tab, title: nextTitle } : tab))
      );
    }

    setDocTabContents((prev) => ({ ...prev, [resultTabId]: nextContent }));
    setDirtyDocTabs((prev) => ({ ...prev, [resultTabId]: true }));
    activeDocTabIdRef.current = resultTabId;
    setActiveDocTabId(resultTabId);
    setSourceContent(nextContent);
    setFileName(nextTitle);
  };

  const handleNextFromStep1 = () => {
    if (!sourceContent.trim()) {
      setError('Bitte gib Inhalt ein oder lade eine Datei hoch');
    
      return;
    }
    setError(null);
    setStep(2);
  };

  useEffect(() => {
    onStep1BackToPostingChange?.(effectiveStep === 1 && cameFromEdit);
  }, [cameFromEdit, effectiveStep, onStep1BackToPostingChange]);

  useEffect(() => {
    if (headerAction !== "post") return;
    if (effectiveStep !== 4) return;
    setPreviewMode(false);
    onOpenDocStudioForPosting?.(transformedContent);
    onHeaderActionHandled?.();
  }, [effectiveStep, headerAction, onHeaderActionHandled, onOpenDocStudioForPosting, transformedContent]);

  const step2SelectionCount = multiPlatformMode ? selectedPlatforms.length : selectedPlatform ? 1 : 0;
  const step2CanProceed = step2SelectionCount > 0;

  useEffect(() => {
    if (effectiveStep !== 2) {
      onStep2SelectionChange?.(0, false);
      return;
    }
    onStep2SelectionChange?.(step2SelectionCount, step2CanProceed);
  }, [effectiveStep, onStep2SelectionChange, step2SelectionCount, step2CanProceed]);

  useEffect(() => {
    if (!multiPlatformMode) {
      setActiveStylePlatform(null);
      return;
    }
    if (selectedPlatforms.length === 0) {
      setActiveStylePlatform(null);
      return;
    }
    if (!activeStylePlatform || !selectedPlatforms.includes(activeStylePlatform)) {
      setActiveStylePlatform(selectedPlatforms[0]);
    }
  }, [activeStylePlatform, multiPlatformMode, selectedPlatforms]);

  const handleNextFromStep2 = () => {
    if (!step2CanProceed) {
      return;
    }
    setError(null);
    if (multiPlatformMode && selectedPlatforms.length > 0 && !activeStylePlatform) {
      setActiveStylePlatform(selectedPlatforms[0]);
    }
    setStep(3);
  };

  const handleDocTabChange = (tabId: string) => {
    activeDocTabIdRef.current = tabId;
    setActiveDocTabId(tabId);
    const nextContent = docTabContents[tabId] ?? '';
    setSourceContent(nextContent);
    emitExternalContentChange(nextContent, 'step1', tabId);
    const nextTitle = openDocTabs.find((tab) => tab.id === tabId)?.title ?? '';
    setFileName(nextTitle);
  };

  const closeDocTab = (tabId: string, force = false) => {
    // Only check dirty state if not forcing close (e.g., from "Nicht speichern" dialog)
    if (!force && dirtyDocTabs[tabId]) {
      return;
    }
    const remainingTabs = openDocTabs.filter((tab) => tab.id !== tabId);
    setOpenDocTabs(remainingTabs);
    setDocTabContents((prev) => {
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
    setDirtyDocTabs((prev) => {
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
    setStep1ComparisonBaseByTab((prev) => {
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
    setStep1ComparisonSelectionByTab((prev) => {
      const next = { ...prev };
      delete next[tabId];
      Object.keys(next).forEach((key) => {
        if (next[key] === `${STEP1_TAB_COMPARISON_PREFIX}${tabId}`) {
          next[key] = STEP1_SAVED_COMPARISON_ID;
        }
      });
      return next;
    });
    if (activeDocTabId === tabId || remainingTabs.length === 0) {
      const nextTab = remainingTabs[0] ?? null;
      if (nextTab) {
        setActiveDocTabId(nextTab.id);
        const nextContent = docTabContents[nextTab.id] ?? '';
        setSourceContent(nextContent);
        emitExternalContentChange(nextContent, 'step1', nextTab.id);
        setFileName(nextTab.title ?? '');
      } else {
        setActiveDocTabId(null);
        setSourceContent('');
        emitExternalContentChange('', 'step1', null);
        setFileName('');
      }
    }
  };

  const handleCloseDocTab = (tabId: string) => {
    if (dirtyDocTabs[tabId]) {
      setPendingCloseTabId(tabId);
      return;
    }
    closeDocTab(tabId);
  };

  const saveTabContent = async (tabId: string) => {
    const tab = openDocTabs.find((item) => item.id === tabId);
    const content = docTabContents[tabId] ?? '';
    if (!tab) return false;

    if (isTauri() && tab.kind === 'file' && tab.filePath) {
      await writeTextFile(tab.filePath, content);
      setDirtyDocTabs((prev) => ({ ...prev, [tabId]: false }));
      setSavedFileName(tab.title);
      setSavedFilePath(tab.filePath);
      setShowSaveSuccess(true);
      return true;
    }

    if (isTauri()) {
      if (!projectPath) {
        alert('Kein Projektordner gesetzt.');
        return false;
      }
      const fallbackName = tab.title || buildDefaultSaveName(getActiveSavePlatform(), 1);
      const filePath = await save({
        defaultPath: `${projectPath}/${fallbackName}`,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });
      if (!filePath) return false;
      if (!filePath.startsWith(projectPath)) {
        alert('Bitte speichere innerhalb des Projektordners.');
        return false;
      }
      await writeTextFile(filePath, content);
      setDirtyDocTabs((prev) => ({ ...prev, [tabId]: false }));
      setSavedFileName(filePath.split(/[\\/]/).pop() || fallbackName);
      setSavedFilePath(filePath);
      setShowSaveSuccess(true);
      return true;
    }

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const fallbackName = tab.title || buildDefaultSaveName(getActiveSavePlatform(), 1);
    const userName = window.prompt('Dateiname anpassen?', fallbackName);
    const finalName = (userName && userName.trim()) ? userName.trim() : fallbackName;
    const finalFileName = finalName.endsWith('.md') ? finalName : `${finalName}.md`;
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFileName;
    link.click();
    URL.revokeObjectURL(url);
    setDirtyDocTabs((prev) => ({ ...prev, [tabId]: false }));
    setSavedFileName(finalFileName);
    setSavedFilePath(undefined);
    setShowSaveSuccess(true);
    return true;
  };

  const handleSourceContentChange = (content: string) => {
    sourceContentRef.current = content;
    setSourceContent(content);

    // Determine which tab to mark as dirty
    // Priority: activeDocTabId > tab matching fileName > first tab
    let targetTabId: string | null = null;
    const activeTabIdNow = activeDocTabIdRef.current;

    if (openDocTabs.length > 0) {
      // First try: use activeDocTabId if it's valid
      if (activeTabIdNow) {
        const activeTab = openDocTabs.find((tab) => tab.id === activeTabIdNow);
        if (activeTab) {
          targetTabId = activeTabIdNow;
        }
      }

      // Second try: find tab by filename
      if (!targetTabId && fileName) {
        const matchingTab = openDocTabs.find((tab) => tab.title === fileName);
        if (matchingTab) {
          targetTabId = matchingTab.id;
          activeDocTabIdRef.current = targetTabId;
          setActiveDocTabId(targetTabId);
        }
      }

      // Third try: use first tab
      if (!targetTabId) {
        targetTabId = openDocTabs[0].id;
        activeDocTabIdRef.current = targetTabId;
        setActiveDocTabId(targetTabId);
        setFileName(openDocTabs[0].title);
      }

      // Mark the tab as dirty and update content
      setDocTabContents((prev) => ({ ...prev, [targetTabId as string]: content }));
      setDirtyDocTabs((prev) => ({ ...prev, [targetTabId as string]: true }));
    } else if (content && content.trim().length > 0) {
      // No tabs exist - create a new draft tab automatically
      const newTabId = `draft-${Date.now()}`;
      const newTab: ContentDocTab = {
        id: newTabId,
        title: 'Entwurf',
        kind: 'draft',
      };

      setOpenDocTabs([newTab]);
      setDocTabContents({ [newTabId]: content });
      setDirtyDocTabs({ [newTabId]: true });
      activeDocTabIdRef.current = newTabId;
      setActiveDocTabId(newTabId);
      setFileName('Entwurf');
    }

    emitExternalContentChange(content, 'step1', targetTabId);
    if (multiPlatformMode && activeEditTab) {
      setTransformedContents((prev) => ({ ...prev, [activeEditTab]: content }));
      if (activeResultTab === activeEditTab) {
        setTransformedContent(content);
      }
    }
  };

  const handleTransform = async () => {
    if (transformInFlightRef.current) return;
    transformInFlightRef.current = true;
    setPreviewMode(false);
    setIsTransforming(true);
    setError(null);
    setAutoSelectedModel(null);

    try {
      // Replace placeholders in source content before transforming
      const processedContent = replacePlaceholders(sourceContent);

      // Multi-platform mode: transform for all selected platforms
      if (multiPlatformMode && selectedPlatforms.length > 0) {
        const results: Record<ContentPlatform, string> = {} as Record<ContentPlatform, string>;
        const failedPlatforms: Array<{ platform: ContentPlatform; error: string }> = [];
        let firstAutoModel: string | null = null;

        console.log('[Multi-Platform] Starting transformation for platforms:', selectedPlatforms);
        console.log('[Multi-Platform] Source content length:', processedContent.length);

        let platformIndex = 0;
        for (const platform of selectedPlatforms) {
          const styleConfig = getEffectivePlatformStyle(platform);
          // Add small delay between API calls to avoid potential caching issues
          if (platformIndex > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          platformIndex++;

          console.log(`[Multi-Platform] Transforming for: ${platform}`);

          const result = await transformContent(processedContent, {
            platform,
            tone: styleConfig.tone,
            length: styleConfig.length,
            audience: styleConfig.audience,
            targetLanguage,
          });

          console.log(`[Multi-Platform] Result for ${platform}:`, {
            success: result.success,
            dataLength: result.data?.length,
            dataPreview: result.data?.substring(0, 100),
            error: result.error
          });

          if (result.success && result.data) {
            let finalContent = result.data;

            // Save first auto-selected model info
            if (!firstAutoModel && result.autoSelectedModel) {
              firstAutoModel = result.autoSelectedModel;
            }

            // Translate if target language is not deutsch
            if (targetLanguage && targetLanguage !== 'deutsch') {
              const translateResult = await translateContent(finalContent, targetLanguage);
              if (translateResult.success && translateResult.data) {
                finalContent = translateResult.data;
              }
            }

            results[platform] = finalContent;
          } else {
            failedPlatforms.push({
              platform,
              error: result.error || 'Unbekannter Fehler',
            });
          }
        }

        if (Object.keys(results).length > 0) {
          setTransformedContents(results);
          // Set the first platform as active tab
          const firstPlatform = selectedPlatforms[0];
          setActiveResultTab(firstPlatform);
          setTransformedContent(results[firstPlatform] || '');
          captureStep4Original();
          setStep4LastChangeSource('ai');
          if (firstAutoModel) {
            setAutoSelectedModel(firstAutoModel);
          }
          setStep(4);
        } else {
          const detail = failedPlatforms
            .slice(0, 2)
            .map(({ platform, error }) => `${getPlatformLabel(platform)}: ${error}`)
            .join(' | ');
          setError(`Transformation für alle Plattformen fehlgeschlagen${detail ? ` (${detail})` : ''}`);
        }
      } else {
        // Single platform mode (original behavior)
        const result = await transformContent(processedContent, {
          platform: selectedPlatform,
          tone,
          length,
          audience,
          targetLanguage,
        });

        if (result.success && result.data) {
          let finalContent = result.data;

          // Save auto-selected model info if available
          if (result.autoSelectedModel) {
            setAutoSelectedModel(result.autoSelectedModel);
          }

          // Step 2: Translate if target language is not deutsch (assuming source is deutsch)
          if (targetLanguage && targetLanguage !== 'deutsch') {
            const translateResult = await translateContent(finalContent, targetLanguage);
            if (translateResult.success && translateResult.data) {
              finalContent = translateResult.data;
            } else {
              // Translation failed, but we still have the transformed content
              console.warn('Translation failed:', translateResult.error);
              setError(`Transformation erfolgreich, aber Übersetzung fehlgeschlagen: ${translateResult.error}`);
            }
          }

          setTransformedContent(finalContent);
          captureStep4Original();
          setStep4LastChangeSource('ai');
          setStep(4);
        } else {
          const errorMsg = result.error || 'Transformation fehlgeschlagen';
          setError(errorMsg);
          // Show notification if error is related to AI configuration
          if (
            errorMsg.includes('API') ||
            errorMsg.includes('konfiguriert') ||
            errorMsg.includes('Konfiguration') ||
            errorMsg.includes('fehlt') ||
            errorMsg.includes('Einstellungen') ||
            errorMsg.includes('Key')
          ) {
            // Settings notification handled by modal
          }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(errorMsg);
      // Show notification if error is related to AI configuration
      if (
        errorMsg.includes('API') ||
        errorMsg.includes('konfiguriert') ||
        errorMsg.includes('Konfiguration') ||
        errorMsg.includes('fehlt') ||
        errorMsg.includes('Einstellungen') ||
        errorMsg.includes('Key')
      ) {
        // Settings notification handled by modal
      }
    } finally {
      setIsTransforming(false);
      transformInFlightRef.current = false;
    }
  };

  const handleReset = () => {
    setStep(1);
    setSourceContent('');
    setFileName('');
    setTransformedContent('');
    setError(null);
    setPreviewMode(false);
  };

  const handlePostDirectly = async () => {
    setIsPosting(true);
    setError(null);
    setSettingsMissingSocialHint(false);

    try {
      // Check if content exists
      if (!sourceContent.trim()) {
        setError('Kein Content zum Posten vorhanden');
        setIsPosting(false);
        return;
      }

      // Load social media config
      const config = loadSocialConfig();

      // Map ContentPlatform to SocialPlatform
      const platformMap: Record<ContentPlatform, SocialPlatform | null> = {
        'linkedin': 'linkedin',
        'twitter': 'twitter',
        'reddit': 'reddit',
        'devto': 'devto',
        'medium': 'medium',
        'github-discussion': 'github',
        'github-blog': 'github',
        'youtube': null, // YouTube is not supported for direct posting
        'blog-post': null, // Generic blog post is not supported for direct posting
      };

      const socialPlatform = platformMap[selectedPlatform];

      if (!socialPlatform) {
        setError('Diese Plattform unterstützt kein direktes Posten');
        setIsPosting(false);
        return;
      }

      // Check if platform is configured
      if (!isPlatformConfigured(socialPlatform, config)) {
        setSettingsDefaultTab('social');
        setSettingsSocialTab(getSocialTabForPlatform(selectedPlatform));
        setSettingsMissingSocialHint(true);
        setSettingsMissingSocialLabel(getPlatformLabel(selectedPlatform));
        setShowSettings(true);
        setIsPosting(false);
        return;
      }

      // Prepare content based on platform
      let postContent: any;

      switch (socialPlatform) {
        case 'linkedin':
          postContent = {
            text: sourceContent,
            visibility: 'PUBLIC',
          } as LinkedInPostOptions;
          break;

        case 'twitter':
          // Split content into thread if too long
          const maxTweetLength = 280;
          if (sourceContent.length > maxTweetLength) {
            const sentences = sourceContent.split(/[.!?]+/).filter(s => s.trim());
            const thread: string[] = [];
            let currentTweet = '';

            for (const sentence of sentences) {
              if ((currentTweet + sentence).length > maxTweetLength) {
                if (currentTweet) thread.push(currentTweet.trim());
                currentTweet = sentence;
              } else {
                currentTweet += sentence + '.';
              }
            }
            if (currentTweet) thread.push(currentTweet.trim());

            postContent = {
              text: thread[0],
              thread: thread.slice(1),
            } as TwitterPostOptions;
          } else {
            postContent = {
              text: sourceContent,
            } as TwitterPostOptions;
          }
          break;

        case 'reddit':
          // Extract title (first line or first 100 chars)
          const lines = sourceContent.split('\n');
          const title = lines[0] || sourceContent.substring(0, 100);
          const body = lines.length > 1 ? lines.slice(1).join('\n') : sourceContent;

          postContent = {
            subreddit: 'test', // User would need to specify subreddit
            title: title,
            text: body,
          } as RedditPostOptions;

          // For Reddit, we need subreddit - show error
          setError('Für Reddit Posts muss ein Subreddit angegeben werden. Nutze die Transform-Funktion für mehr Optionen.');
          setIsPosting(false);
          return;

        case 'devto':
          // Extract title
          const devtoLines = sourceContent.split('\n');
          const devtoTitle = devtoLines[0] || 'Untitled';
          const devtoBody = devtoLines.length > 1 ? devtoLines.slice(1).join('\n') : sourceContent;

          postContent = {
            title: devtoTitle,
            body_markdown: devtoBody,
            published: false, // Save as draft by default
            tags: [],
          } as DevToPostOptions;
          break;

        case 'medium':
          const mediumLines = sourceContent.split('\n');
          const mediumTitle = mediumLines[0] || 'Untitled';
          const mediumContent = mediumLines.length > 1 ? mediumLines.slice(1).join('\n') : sourceContent;

          postContent = {
            title: mediumTitle,
            content: mediumContent,
            contentFormat: 'markdown',
            publishStatus: 'draft', // Save as draft by default
            tags: [],
          } as MediumPostOptions;
          break;

        case 'github':
          setError('GitHub Discussions benötigt Repository-Informationen. Nutze die Transform-Funktion für mehr Optionen.');
          setIsPosting(false);
          return;

        default:
          setError('Plattform nicht unterstützt');
          setIsPosting(false);
          return;
      }

      // Post to social media
      const result = await postToSocialMedia(socialPlatform, postContent, config);

      if (result.success) {
        // Show success message
        alert(`✓ Erfolgreich auf ${selectedPlatform} gepostet!\n${result.url || ''}`);
        handleReset();
      } else {
        setError(result.error || 'Posting fehlgeschlagen');
        if (result.error?.includes('configuration') || result.error?.includes('not found')) {
          // Settings notification handled by modal
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unbekannter Fehler beim Posten';
      setError(errorMsg);
    } finally {
      setIsPosting(false);
    }
  };

  useEffect(() => {
    if (!headerAction) return;
    if (headerAction === "preview") {
      void (async () => {
        await openStep4FromSource();
        onHeaderActionHandled?.();
      })();
      return;
    }
    if (headerAction === "transform" && effectiveStep === 3) {
      if (!isTransforming) {
        void handleTransform();
      }
      onHeaderActionHandled?.();
      return;
    }
    if (headerAction === "post_direct" && effectiveStep === 3) {
      if (!isPosting) {
        void handlePostDirectly();
      }
      onHeaderActionHandled?.();
      return;
    }
    if (headerAction === "next") {
      if (effectiveStep === 1) {
        handleNextFromStep1();
      }
      if (effectiveStep === 2) {
        handleNextFromStep2();
      }
    }
    if (headerAction === "back_posting" && effectiveStep === 1) {
      void openStep4FromSource(undefined, 'posting');
    }
    if (headerAction === "save" && effectiveStep === 1) {
      void handleSaveSourceToProject();
    }
    if (headerAction === "save_as" && effectiveStep === 1) {
      void handleSaveAsSourceToProject();
    }
    onHeaderActionHandled?.();
  }, [
    effectiveStep,
    headerAction,
    handleNextFromStep1,
    handlePostDirectly,
    handleTransform,
    isPosting,
    isTransforming,
    onHeaderActionHandled,
    sourceContent,
    setCameFromEdit,
  ]);

  // Render Step Content
  const renderStepContent = () => {
    switch (effectiveStep) {
      case 1:
        const editTabs =
          multiPlatformMode && Object.keys(transformedContents).length > 0
            ? (Object.keys(transformedContents) as ContentPlatform[])
            : [];
        const step1ComparisonSelection = activeDocTabId
          ? step1ComparisonSelectionByTab[activeDocTabId] ?? STEP1_SAVED_COMPARISON_ID
          : STEP1_SAVED_COMPARISON_ID;
        const step1SelectedComparisonTabId = step1ComparisonSelection.startsWith(STEP1_TAB_COMPARISON_PREFIX)
          ? step1ComparisonSelection.slice(STEP1_TAB_COMPARISON_PREFIX.length)
          : null;
        const step1SelectedComparisonTab = step1SelectedComparisonTabId
          ? openDocTabs.find((tab) => tab.id === step1SelectedComparisonTabId) ?? null
          : null;
        const step1ComparisonBaseOptions = activeDocTabId
          ? [
              { id: STEP1_SAVED_COMPARISON_ID, label: 'Letzte gespeicherte Version' },
              ...openDocTabs
                .filter((tab) => tab.id !== activeDocTabId)
                .map((tab) => ({ id: `${STEP1_TAB_COMPARISON_PREFIX}${tab.id}`, label: `Tab: ${tab.title}` })),
            ]
          : [];
        const step1ComparisonBaseContent = activeDocTabId
          ? step1ComparisonSelection === STEP1_SAVED_COMPARISON_ID
            ? step1ComparisonBaseByTab[activeDocTabId] ?? ''
            : docTabContents[step1SelectedComparisonTabId ?? ''] ?? ''
          : '';
        const activeStep1TabTitle = openDocTabs.find((tab) => tab.id === activeDocTabId)?.title;
        const step1ComparisonBaseLabel = step1ComparisonSelection === STEP1_SAVED_COMPARISON_ID
          ? `${activeStep1TabTitle ?? fileName ?? 'Dokument'} · gespeicherte Basis`
          : step1SelectedComparisonTab
            ? `Tab: ${step1SelectedComparisonTab.title}`
            : 'Vergleichsbasis';
        return (
          <>
            <Step1SourceInput
              sourceContent={sourceContent}
              fileName={fileName}
              error={error}
              editorSettings={editorSettings}
              onSourceContentChange={handleSourceContentChange}
              onFileNameChange={setFileName}
              onNext={handleNextFromStep1}
              onOpenMetadata={() => setShowMetadata(true)}
              onError={setError}
              onPreview={(latestContent) => {
                void openStep4FromSource(latestContent, 'preview');
              }}
              onSaveToProject={(latestContent) => {
                void handleSaveSourceToProject(latestContent);
              }}
              onSaveAsToProject={(latestContent) => {
                void handleSaveAsSourceToProject(latestContent);
              }}
              canSaveToProject={!!sourceContent.trim() && (!isTauri() || !!projectPath)}
              editTabs={editTabs}
              activeEditTab={activeEditTab}
              onEditTabChange={(platform) => {
                setActiveEditTab(platform);
                if (Object.prototype.hasOwnProperty.call(transformedContents, platform)) {
                  const nextContent = transformedContents[platform] || '';
                  setSourceContent(nextContent);
                  setTransformedContent(nextContent);
                } else {
                  setSourceContent('');
                  setTransformedContent('');
                }
              }}
              cameFromEdit={cameFromEdit}
              onBackToPosting={(latestContent) => {
                // User edited content, go directly to Step 4 for posting
                void openStep4FromSource(latestContent, 'posting');
              }}
              onRegisterLiveContentGetter={(getter) => {
                liveContentGetterRef.current = getter;
              }}
              cameFromDocStudio={cameFromDocStudio}
              onBackToDocStudio={() => onBackToDocStudio?.(sourceContent)}
              editorType={editorType}
              onEditorTypeChange={onEditorTypeChange}
              showInlineActions={false}
              showDockedEditorToggle={true}
              onOpenConverter={() => {
                onOpenConverter?.();
              }}
              docTabs={openDocTabs}
              activeDocTabId={activeDocTabId}
              dirtyDocTabs={dirtyDocTabs}
              onDocTabChange={handleDocTabChange}
              onCloseDocTab={handleCloseDocTab}
              projectPath={projectPath}
              comparisonBaseContent={step1ComparisonBaseContent}
              comparisonBaseLabel={step1ComparisonBaseLabel}
              comparisonBaseOptions={step1ComparisonBaseOptions}
              comparisonBaseSelection={step1ComparisonSelection}
              onComparisonBaseChange={(value) => {
                if (!activeDocTabId) return;
                setStep1ComparisonSelectionByTab((prev) => ({ ...prev, [activeDocTabId]: value }));
              }}
              onAdoptCurrentAsComparisonBase={() => {
                if (!activeDocTabId) return;
                setStep1ComparisonBaseByTab((prev) => ({
                  ...prev,
                  [activeDocTabId]: sourceContent,
                }));
                setStep1ComparisonSelectionByTab((prev) => ({
                  ...prev,
                  [activeDocTabId]: STEP1_SAVED_COMPARISON_ID,
                }));
              }}
              autosaveStatusText={
                !editorSettings.autoSaveEnabled
                  ? 'Autosave · off'
                  : step1AutosaveStatus === 'saving'
                    ? 'Autosave · speichert...'
                    : step1AutosaveStatus === 'error'
                      ? 'Autosave · fehler'
                      : step1AutosaveStatus === 'saved'
                        ? `Autosave · ${step1AutosaveAt ? new Date(step1AutosaveAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'ok'}`
                        : 'Autosave · on'
              }
              onOpenEditorSettings={() => {
                setSettingsDefaultTab('editor');
                setShowSettings(true);
              }}
              zenThoughts={zenStudioSettings.thoughts}
              showZenThoughtInHeader={zenStudioSettings.showInContentAIStudio}
            />
          </>
        );
      case 2:
        return (
          <Step2PlatformSelection
            selectedPlatform={selectedPlatform}
            platformOptions={platformOptions}
            onPlatformChange={setSelectedPlatform}
            onBack={() => setStep(1)}
            onNext={handleNextFromStep2}
            multiSelectMode={multiPlatformMode}
            selectedPlatforms={selectedPlatforms}
            onSelectedPlatformsChange={setSelectedPlatforms}
          />
        );
      case 3:
        const selectedPlatformOption = platformOptions.find(
          (option) => option.value === selectedPlatform
        );
        const selectedPlatformLabels = multiPlatformMode
          ? selectedPlatforms.map(p => platformOptions.find(o => o.value === p)?.label || p)
          : [];
        const activeStyleTarget = activeStylePlatform ?? selectedPlatforms[0] ?? selectedPlatform;
        const activeStyleConfig = getEffectivePlatformStyle(activeStyleTarget);
        const selectedPlatformOptions = selectedPlatforms.map((platform) => ({
          value: platform,
          label: getPlatformLabel(platform),
        }));
        return (
          <Step3StyleOptions
            selectedPlatform={selectedPlatform}
            platformLabel={selectedPlatformOption?.label || 'Plattform'}
            selectedPlatforms={selectedPlatforms}
            platformLabels={selectedPlatformLabels}
            multiPlatformMode={multiPlatformMode}
            tone={activeStyleConfig.tone}
            length={activeStyleConfig.length}
            audience={activeStyleConfig.audience}
            targetLanguage={targetLanguage}
            styleMode={styleMode}
            onStyleModeChange={setStyleMode}
            activeStylePlatform={activeStyleTarget}
            stylePlatformOptions={selectedPlatformOptions}
            onActiveStylePlatformChange={setActiveStylePlatform}
            onApplyCurrentStyleToAll={
              multiPlatformMode && styleMode === 'platform'
                ? () => {
                    const sourcePlatform = activeStylePlatform ?? selectedPlatforms[0];
                    if (!sourcePlatform) return;
                    const sourceConfig = getPlatformStyleConfig(sourcePlatform);
                    const nextOverrides = { ...stylePlatformOverrides };
                    selectedPlatforms.forEach((platform) => {
                      nextOverrides[platform] = sourceConfig;
                    });
                    setStylePlatformOverrides(nextOverrides);
                  }
                : undefined
            }
            onToneChange={(nextTone) => {
              if (multiPlatformMode && styleMode === 'platform' && activeStyleTarget) {
                const base = getPlatformStyleConfig(activeStyleTarget);
                setStylePlatformOverrides((prev) => ({
                  ...prev,
                  [activeStyleTarget]: { ...base, tone: nextTone },
                }));
                return;
              }
              setTone(nextTone);
            }}
            onLengthChange={(nextLength) => {
              if (multiPlatformMode && styleMode === 'platform' && activeStyleTarget) {
                const base = getPlatformStyleConfig(activeStyleTarget);
                setStylePlatformOverrides((prev) => ({
                  ...prev,
                  [activeStyleTarget]: { ...base, length: nextLength },
                }));
                return;
              }
              setLength(nextLength);
            }}
            onAudienceChange={(nextAudience) => {
              if (multiPlatformMode && styleMode === 'platform' && activeStyleTarget) {
                const base = getPlatformStyleConfig(activeStyleTarget);
                setStylePlatformOverrides((prev) => ({
                  ...prev,
                  [activeStyleTarget]: { ...base, audience: nextAudience },
                }));
                return;
              }
              setAudience(nextAudience);
            }}
            onTargetLanguageChange={setTargetLanguage}
            onBack={() => setStep(2)}
            onBackToEditor={() => setStep(1)}
            onTransform={handleTransform}
            onPostDirectly={handlePostDirectly}
            isTransforming={isTransforming}
            isPosting={isPosting}
            error={error}
          />
        );
      case 4:
        const step4HeaderAction =
          headerAction === "copy" ||
          headerAction === "download" ||
          headerAction === "edit" ||
          headerAction === "reset" ||
          headerAction === "post" ||
          headerAction === "posten" ||
          headerAction === "back_doc" ||
          headerAction === "back_dashboard"
            ? headerAction
            : null;

        return (
          <>
            <Step4TransformResult
              transformedContent={transformedContent}
              platform={multiPlatformMode && activeResultTab ? activeResultTab : selectedPlatform}
              autoSelectedModel={autoSelectedModel}
              onReset={() => {
                handleReset();
                // Reset multi-platform state
                if (multiPlatformMode) {
                  setSelectedPlatforms([]);
                  setTransformedContents({} as Record<ContentPlatform, string>);
                  setActiveResultTab(null);
                  onMultiPlatformModeChange?.(false);
                }
              }}
              onBack={() => {
                // Nachbearbeiten: Zum Editor mit transformiertem Content
                setPreviewMode(false);
                const nextContent = multiPlatformMode
                  ? (() => {
                      const nextTab = activeResultTab ?? selectedPlatforms[0] ?? null;
                      setActiveEditTab(nextTab);
                      if (nextTab && Object.prototype.hasOwnProperty.call(transformedContents, nextTab)) {
                        return transformedContents[nextTab] || '';
                      }
                      return '';
                    })()
                  : transformedContent;

                if (nextContent !== step4OriginalContent) {
                  upsertResultVersionTab(nextContent, step4LastChangeSource);
                } else {
                  setSourceContent(nextContent);
                }

                if (multiPlatformMode) {
                  const nextTab = activeResultTab ?? selectedPlatforms[0] ?? null;
                  setActiveEditTab(nextTab);
                }
                setCameFromEdit(true); // Mark that user came from edit
                setStep(1);
              }}
              onOpenSettings={() => {
                setSettingsDefaultTab('ai');
                setSettingsSocialTab(undefined);
                setSettingsMissingSocialHint(false);
                setSettingsMissingSocialLabel(undefined);
                setShowSettings(true);
              }}
              onContentChange={(content, meta) => {
                setTransformedContent(content);
                setStep4LastChangeSource(meta?.source ?? 'manual');
                if (multiPlatformMode && activeResultTab) {
                  setTransformedContents((prev) => ({ ...prev, [activeResultTab]: content }));
                }
              }}
              cameFromDocStudio={cameFromDocStudio}
              cameFromDashboard={cameFromDashboard}
              isPreview={previewMode}
              useHeaderActions
              headerAction={step4HeaderAction}
              onHeaderActionHandled={onHeaderActionHandled}
              onBackToDocStudio={() => onBackToDocStudio?.(transformedContent)}
              onBackToDashboard={() => onBackToDashboard?.(transformedContent)}
              onGoToTransform={(targetPlatform) => {
                // Navigate to Step 2 with the selected platform, then to Step 3
                setSelectedPlatform(targetPlatform);
                setStep(3); // Go directly to Step 3 (Style Options)
              }}
              multiPlatformMode={multiPlatformMode}
              transformedContents={transformedContents}
              activeResultTab={activeResultTab}
            onActiveResultTabChange={(platform) => {
              setActiveResultTab(platform);
              // Update the displayed content to match the selected tab
              if (Object.prototype.hasOwnProperty.call(transformedContents, platform)) {
                setTransformedContent(transformedContents[platform] || '');
              }
            }}
              docTabs={openDocTabs}
              activeDocTabId={activeDocTabId}
              dirtyDocTabs={dirtyDocTabs}
              onDocTabChange={handleDocTabChange}
              onCloseDocTab={handleCloseDocTab}
              activeDocTabContent={activeDocTabId ? docTabContents[activeDocTabId] ?? '' : ''}
              docTabContents={docTabContents}
              originalContent={step4OriginalContent}
              originalLabel={
                step4SourceTabId
                  ? openDocTabs.find((tab) => tab.id === step4SourceTabId)?.title || 'Original'
                  : fileName || 'Original'
              }
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="flex flex-col h-screen text-[#e5e5e5] overflow-hidden"
      style={{ backgroundColor: effectiveStep === 2 || effectiveStep === 3 ? '#d0cbb8' : 'transparent' }}
    >
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">{renderStepContent()}</div>

      {/* Footer */}
      <div className="relative border-t border-[#AC8E66] py-3">
        <ZenFooterText />
      </div>

      {/* Settings Modal */}
      <ZenSettingsModal
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          setSettingsMissingSocialHint(false);
          setSettingsMissingSocialLabel(undefined);
        }}
        onSave={() => setError(null)}
        defaultTab={settingsDefaultTab}
        defaultSocialTab={settingsSocialTab}
        showMissingSocialHint={settingsMissingSocialHint}
        missingSocialLabel={settingsMissingSocialLabel}
        onOpenZenThoughtsEditor={onOpenZenThoughtsEditor}
      />

      {/* Metadata Modal */}
      <ZenMetadataModal
        isOpen={showMetadata}
        onClose={() => setShowMetadata(false)}
        metadata={metadata}
        onSave={(newMetadata) => {
          handleMetadataSave(newMetadata);
          setShowMetadata(false);
        }}
      />

      {/* Generating Modal */}
      <ZenGeneratingModal
        isOpen={isTransforming}
        templateName={`${selectedPlatform} Content`}
        onClose={() => setIsTransforming(false)}
      />

      {/* Save Success Modal */}
      <ZenSaveSuccessModal
        isOpen={showSaveSuccess}
        onClose={() => setShowSaveSuccess(false)}
        fileName={savedFileName}
        filePath={savedFilePath}
      />

      <ZenModal
        isOpen={!!pendingCloseTabId}
        onClose={() => setPendingCloseTabId(null)}
        size="md"
      >
        <ZenModalHeader
          title="Ungespeicherte Änderungen"
     
        />
        <div style={{ 
          padding: '24px', 
          display: 'flex', 
          flexDirection: 'column', gap: '16px' }}>
          <p style={{ 
            fontFamily: 'IBM Plex Mono, monospace', 
            fontSize: '12px', color: '#555', textAlign: 'center'  }}>
            Möchtest du vor dem Schließen speichern?
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <ZenRoughButton
              label="Abbrechen"
              size="small"
              width={120}
              height={38}
              onClick={() => setPendingCloseTabId(null)}
            />
            <ZenRoughButton
              label="Nicht speichern"
              size="small"
              width={160}
              height={38}
              onClick={() => {
                if (!pendingCloseTabId) return;
                closeDocTab(pendingCloseTabId, true); // force close without saving
                setPendingCloseTabId(null);
              }}
            />
            <ZenRoughButton
              label="Speichern"
              size="small"
              width={140}
              height={38}
              onClick={async () => {
                if (!pendingCloseTabId) return;
                const saved = await saveTabContent(pendingCloseTabId);
                if (saved) {
                  closeDocTab(pendingCloseTabId);
                  setPendingCloseTabId(null);
                }
              }}
            />
          </div>
        </div>
      </ZenModal>
    </div>
  );
};
