import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ZenEngine, { type MarkdownResult, type RuleAnalysisResult, generatePlatformThumbnail, type PlatformThumbnailResult, adaptV2ToV1 } from '../../services/zenEngineService';
import { recordAnalysisRun } from '../../services/zenEngineStatsService';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { save } from '@tauri-apps/plugin-dialog';
import { downloadDir, join } from '@tauri-apps/api/path';
import { isTauri } from '@tauri-apps/api/core';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRotateLeft,
  faDownload,
  faCheck,
  faCog,
  faCalendarDays,

  faArrowRight,
  faCompress,
  faCode,
  faEdit,
  faWandMagicSparkles,
  faBriefcase,
  faWrench,
  faBolt,
  faPenNib,
  faTriangleExclamation,
  faCopy,
  faExternalLinkAlt,
  faImage,
} from '@fortawesome/free-solid-svg-icons';
import { ZenRoughButton, ZenPlannerModal, ZenPostenModal, ZenPostMethodModal, ZenDropdown } from '../../kits/PatternKit/ZenModalSystem';
import { PREVIEW_THEME_LABELS, type PreviewThemeId, ZenMarkdownPreview } from '../../kits/PatternKit/ZenMarkdownPreview';
import { useZenIdle } from '../../hooks/useZenIdle';
import { useOpenExternal } from '../../hooks/useOpenExternal';
import {
  ContentPlatform,
  improveText,
  continueText,
  summarizeText,
  textToMarkdown,
  type ImprovementStyle,
} from '../../services/aiService';
import type { ScheduledPost } from '../../types/scheduling';
import {
  postToSocialMedia,
  loadSocialConfig,
  isPlatformConfigured,
  SocialPlatform,
  PostResult,
} from '../../services/socialMediaService';

import {
  defaultEditorSettings,
  getEditorMarginValuesFromPreset,
  saveEditorSettings,
  type EditorMarginPresetId,
  type EditorSettings,
} from '../../services/editorSettingsService';
import { EDITOR_SETTINGS_STORAGE_KEY } from '../../constants/settingsKeys';
import { applySteuerFormatConfig, autoFixSteuerFormatContent, validateSteuerFormatContent } from '../../config/formatConfigTrans';
import { preparePostContent } from '../../config/platformPostRules';
import { optimizeImagesInMarkdown } from '../../utils/exportLayer';

interface Step4TransformResultProps {
  transformedContent: string;
  platform: ContentPlatform;
  autoSelectedModel?: string | null;
  onReset: () => void;
  onBack: () => void;
  onOpenSettings: (targetSocialPlatform?: SocialPlatform) => void;
  onContentChange?: (content: string, meta?: { source: 'ai' | 'translator' | 'manual'; action?: string }) => void; // Allow updating content after translation
  cameFromDocStudio?: boolean;
  cameFromDashboard?: boolean;
  isPreview?: boolean;
  headerAction?: "copy" | "download" | "edit" | "post" | "posten" | "post_all" | "reset" | "back_doc" | "back_dashboard" | null;
  onHeaderActionHandled?: () => void;
  useHeaderActions?: boolean;
  onBackToDocStudio?: (editedContent?: string) => void;
  onBackToDashboard?: (generatedContent?: string) => void;
  onOpenPlatformSelection?: () => void;
  onGoToTransform?: (platform: ContentPlatform) => void; // Navigate to Step 2/3 for AI transformation
  // Multi-platform mode props
  multiPlatformMode?: boolean;
  transformedContents?: Partial<Record<ContentPlatform, string>>;
  activeResultTab?: ContentPlatform | null;
  onActiveResultTabChange?: (platform: ContentPlatform) => void;
  docTabs?: Array<{ id: string; title: string; kind: 'draft' | 'file' | 'article' | 'derived' }>;
  activeDocTabId?: string | null;
  dirtyDocTabs?: Record<string, boolean>;
  onDocTabChange?: (tabId: string) => void;
  onCloseDocTab?: (tabId: string) => void;
  activeDocTabContent?: string;
  docTabContents?: Record<string, string>;
  originalContent?: string;
  originalLabel?: string;
  projectPath?: string | null;
  onNewDraft?: () => void;
  previewTheme?: PreviewThemeId;
  onPreviewThemeChange?: (theme: PreviewThemeId) => void;
}

type ImproveOption = {
  style: ImprovementStyle;
  icon: IconDefinition;
  label: string;
  desc: string;
};

type LineDiffRow = {
  left: string;
  right: string;
  status: 'same' | 'added' | 'removed' | 'modified';
};

const PLATFORM_CHAR_LIMITS: Partial<Record<ContentPlatform, number>> = {
  twitter: 280,
  linkedin: 3000,
  reddit: 40000,
  devto: 100000,
  medium: 100000,
};


const improveBaseStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: '#2A2A2A',
  border: '0.5px solid #3a3a3a',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  textAlign: 'left',
};

const improveHoverStyle: React.CSSProperties = {
  backgroundColor: '#3a3a3a',
  borderColor: '#AC8E66',

};

const improveDisabledStyle: React.CSSProperties = {
  opacity: 0.5,
  cursor: 'not-allowed',
};



const IMPROVE_OPTIONS: ImproveOption[] = [
  { style: 'charming',      icon: faWandMagicSparkles, label: 'Mehr Charme',        desc: 'Persönlicher & einladender' },
  { style: 'professional',  icon: faBriefcase,         label: 'Professioneller',   desc: 'Formell & business-gerecht' },
  { style: 'technical',     icon: faWrench,            label: 'Technischer',       desc: 'Präzise & detailliert' },
  { style: 'concise',       icon: faBolt,              label: 'Kürzer & knapper',  desc: 'Auf den Punkt gebracht' },
  { style: 'general',       icon: faPenNib,            label: 'Allgemein',         desc: 'Grammatik & Lesbarkeit' },
];

const platformLabels: Record<ContentPlatform, string> = {
  linkedin: 'LinkedIn Post',
  devto: 'dev.to Artikel',
  twitter: 'Twitter Thread',
  medium: 'Medium Blog',
  reddit: 'Reddit Post',
  'github-discussion': 'GitHub Discussion',
  'github-blog': 'GitHub Blog Post',
  youtube: 'YouTube Description',
  'blog-post': 'Blog Post',
};

// Map ContentPlatform to SocialPlatform
const platformMapping: Record<ContentPlatform, SocialPlatform | null> = {
  twitter: 'twitter',
  reddit: 'reddit',
  linkedin: 'linkedin',
  devto: 'devto',
  medium: 'medium',
  'github-discussion': 'github',
  'github-blog': 'github',
  youtube: null, // YouTube doesn't have direct posting API in this implementation
  'blog-post': null, // Generic blog post doesn't have direct posting
};

const socialToContentPlatform: Record<SocialPlatform, ContentPlatform> = {
  linkedin: 'linkedin',
  twitter: 'twitter',
  reddit: 'reddit',
  devto: 'devto',
  medium: 'medium',
  github: 'github-discussion',
};

export const Step4TransformResult = ({
  transformedContent,
  platform,
  autoSelectedModel,
  onReset,
  onBack,
  onOpenSettings,
  onContentChange,
  cameFromDocStudio: _cameFromDocStudio,
  cameFromDashboard: _cameFromDashboard,
  isPreview = false,
  headerAction,
  onHeaderActionHandled,
  useHeaderActions = false,
  onBackToDocStudio,
  onBackToDashboard,
  onOpenPlatformSelection,
  onGoToTransform,
  multiPlatformMode = false,
  transformedContents = {},
  activeResultTab,
  onActiveResultTabChange,
  docTabs = [],
  activeDocTabId = null,
  dirtyDocTabs = {},
  onDocTabChange,
  onCloseDocTab,
  activeDocTabContent = '',
  docTabContents = {},
  originalContent = '',
  originalLabel = 'Original',
  projectPath,
  onNewDraft: _onNewDraft,
  previewTheme: externalPreviewTheme,
  onPreviewThemeChange,
}: Step4TransformResultProps) => {
  const isIdle = useZenIdle(2000);
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(() => {
    if (typeof window === 'undefined') return { ...defaultEditorSettings };
    const raw = localStorage.getItem(EDITOR_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...defaultEditorSettings };
    try { return { ...defaultEditorSettings, ...JSON.parse(raw) }; } catch { return { ...defaultEditorSettings }; }
  });
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<EditorSettings>).detail;
      if (detail) setEditorSettings(detail);
    };
    window.addEventListener('zen-editor-settings-updated', handler);
    return () => window.removeEventListener('zen-editor-settings-updated', handler);
  }, []);
  const [_copied, setCopied] = useState(false);
  const [_isPosting, setIsPosting] = useState(false);
  const [postResult, setPostResult] = useState<PostResult | null>(null);
  const [currentContent, setCurrentContent] = useState(transformedContent);

  const handleMarginPresetChange = useCallback(
    (preset: Exclude<EditorMarginPresetId, 'custom'>) => {
      const nextSettings = {
        ...editorSettings,
        ...getEditorMarginValuesFromPreset(preset),
      };

      setEditorSettings(nextSettings);

      if (typeof window !== 'undefined') {
        localStorage.setItem(EDITOR_SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
        window.dispatchEvent(new CustomEvent('zen-editor-settings-updated', { detail: nextSettings }));
      }

      if (projectPath) {
        saveEditorSettings(projectPath, nextSettings).catch((error) => {
          console.error('[EditorSettings] Failed to save margin preset:', error);
        });
      }
    },
    [editorSettings, projectPath]
  );

  // Sync currentContent when transformedContent changes (e.g., tab switch in multi-platform mode)
  useEffect(() => {
    if (transformedContent) {
      setCurrentContent(transformedContent);
    }
  }, [transformedContent]);

  useEffect(() => {
    // In Preview mode, tab switches should always show the selected tab content.
    if (!isPreview) return;
    if (!activeDocTabId || activeDocTabId === 'draft') return;
    setCurrentContent(activeDocTabContent);
  }, [activeDocTabId, activeDocTabContent, isPreview]);

  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [autoFixFeedback, setAutoFixFeedback] = useState<string | null>(null);
  const activeQaPlatform = (multiPlatformMode && activeResultTab ? activeResultTab : platform) as ContentPlatform;
  const qaResult = useMemo(
    () => validateSteuerFormatContent(currentContent, activeQaPlatform),
    [currentContent, activeQaPlatform]
  );

  const handleAutoFixQa = () => {
    const result = autoFixSteuerFormatContent(currentContent, activeQaPlatform);
    if (!result.changed) {
      setAutoFixFeedback('Keine automatische Korrektur notwendig.');
      window.setTimeout(() => setAutoFixFeedback(null), 3000);
      return;
    }

    setCurrentContent(result.content);
    onContentChange?.(result.content, {
      source: 'manual',
      action: 'qa-autofix',
    });
    setActivePanel('vergleich');
    setAutoFixFeedback(
      result.appliedFixes.length > 0
        ? `Auto-Fix angewendet: ${result.appliedFixes.join(' ')}`
        : 'Auto-Fix angewendet.'
    );
    window.setTimeout(() => setAutoFixFeedback(null), 4000);
  };

  // Posten Modal State
  const [showPostenModal, setShowPostenModal] = useState(false);
  const [showPostMethodModal, setShowPostMethodModal] = useState(false);
  const [selectedPostPlatforms, setSelectedPostPlatforms] = useState<SocialPlatform[]>([]);
  const [_isMultiPosting, setIsMultiPosting] = useState(false);
  const [multiPostResults, setMultiPostResults] = useState<PostResult[]>([]);
  const [isAITransformMode, setIsAITransformMode] = useState(false);
  // LinkedIn cover image
  const [linkedInCoverImage, setLinkedInCoverImage] = useState<File | null>(null);
  const [linkedInCoverPreview, setLinkedInCoverPreview] = useState<string | null>(null);

  // Text-AI State
  const [showTextAI, setShowTextAI] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Improvement Style Selection State
  const [showImproveOptions, setShowImproveOptions] = useState(false);
  const [customInstruction, setCustomInstruction] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // File save feedback (replaces alert())
  const [downloadFeedback, setDownloadFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const showDownloadFeedback = (ok: boolean, msg: string) => {
    setDownloadFeedback({ ok, msg });
    setTimeout(() => setDownloadFeedback(null), 3000);
  };

  // ZenEngine Stats + Quality Analysis
  const [engineStats, setEngineStats] = useState<MarkdownResult | null>(null);
  const [qualityAnalysis, setQualityAnalysis] = useState<RuleAnalysisResult | null>(null);
  const engineDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stripBase64Images = useCallback(
    (text: string) =>
      text.replace(
        /!\[([^\]]*)\]\(\s*data:[^)\s]+(?:\s+["'][^"']*["'])?\s*\)/g,
        '![$1]()'
      ),
    []
  );

  const runEngineAnalysis = useCallback((text: string) => {
    if (engineDebounceRef.current) clearTimeout(engineDebounceRef.current);
    engineDebounceRef.current = setTimeout(async () => {
      // Strip base64 image data before stats/analysis — embedded images inflate
      // char_count and confuse the rule engine with binary-like character sequences.
      const textForEngine = stripBase64Images(text);
      try {
        const [stats, qualityV2] = await Promise.all([
          ZenEngine.renderMarkdown(textForEngine),
          ZenEngine.analyzeTextV2(textForEngine),
        ]);
        setEngineStats(stats);
        setQualityAnalysis(adaptV2ToV1(qualityV2));
        const hitMap: Record<string, number> = {};
        for (const m of qualityV2.matches) hitMap[m.rule_id] = (hitMap[m.rule_id] ?? 0) + 1;
        recordAnalysisRun(hitMap);
      } catch {
        // Engine nicht verfügbar (z.B. Web-Build) — graceful degradation
      }
    }, 600);
  }, [stripBase64Images]);

  useEffect(() => {
    runEngineAnalysis(currentContent);
    return () => { if (engineDebounceRef.current) clearTimeout(engineDebounceRef.current); };
  }, [currentContent, runEngineAnalysis]);

  // Platform Thumbnail — silently generated in background when content or platform changes
  const [platformThumbnail, setPlatformThumbnail] = useState<PlatformThumbnailResult | null>(null);
  const thumbnailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setPlatformThumbnail(null);
    if (thumbnailDebounceRef.current) clearTimeout(thumbnailDebounceRef.current);
    thumbnailDebounceRef.current = setTimeout(async () => {
      try {
        const result = await generatePlatformThumbnail(currentContent, activeQaPlatform);
        setPlatformThumbnail(result);
      } catch { /* silent — kein Bild im Content oder Engine nicht verfügbar */ }
    }, 800);
    return () => { if (thumbnailDebounceRef.current) clearTimeout(thumbnailDebounceRef.current); };
  }, [currentContent, activeQaPlatform]);

  // Success feedback
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');
  const [activePanel, setActivePanel] = useState<'vergleich' | 'engine' | 'thumbnail' | 'qa' | null>(null);
  const togglePanel = (panel: 'vergleich' | 'engine' | 'thumbnail' | 'qa') =>
    setActivePanel(prev => prev === panel ? null : panel);
  const handleDownloadThumbnail = async () => {
    if (!platformThumbnail?.dataUrl) return;
    try {
      const [meta, data] = platformThumbnail.dataUrl.split(',');
      if (!meta || !data) return;
      const isBase64 = meta.includes('base64');
      const mimeMatch = /data:([^;]+);/i.exec(meta);
      const mimeType = mimeMatch?.[1] ?? 'image/jpeg';
      const byteString = isBase64 ? atob(data) : decodeURIComponent(data);
      const byteArray = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i += 1) {
        byteArray[i] = byteString.charCodeAt(i);
      }

      if (isTauri()) {
        const defaultName = `thumbnail-${platformThumbnail.platform}.jpg`;
        const defaultBase = projectPath || (await downloadDir());
        const defaultPath = await join(defaultBase, defaultName);
        const filePath = await save({
          defaultPath,
          filters: [{ name: 'JPEG', extensions: ['jpg', 'jpeg'] }],
        });
        if (!filePath) return;
        await writeFile(filePath, byteArray);
        return;
      }

      const blob = new Blob([byteArray], { type: mimeType });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `thumbnail-${platformThumbnail.platform}.jpg`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      const anchor = document.createElement('a');
      anchor.href = platformThumbnail.dataUrl;
      anchor.download = `thumbnail-${platformThumbnail.platform}.jpg`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
  };
  const [comparisonSource, setComparisonSource] = useState<string>('original');

  const activePreviewTheme = externalPreviewTheme ?? 'mono-clean';
  const failedMultiPostResults = useMemo(
    () => multiPostResults.filter((result) => !result.success),
    [multiPostResults]
  );
  const engineInputContent = useMemo(() => stripBase64Images(currentContent), [currentContent, stripBase64Images]);
  const engineBlockedRanges = useMemo(() => {
    const text = engineInputContent;
    const ranges: Array<{ start: number; end: number }> = [];
    const addRanges = (regex: RegExp) => {
      let match: RegExpExecArray | null = null;
      while ((match = regex.exec(text)) !== null) {
        if (typeof match.index === 'number') {
          ranges.push({ start: match.index, end: match.index + match[0].length });
        }
      }
    };
    addRanges(/```[\s\S]*?```/g);
    addRanges(/`[^`\n]+`/g);

    let offset = 0;
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.includes('|') && line.split('|').length >= 3) {
        ranges.push({ start: offset, end: offset + line.length });
      }
      offset += line.length + 1;
    }

    return ranges;
  }, [engineInputContent]);
  const highlightedPreviewContent = useMemo(() => {
    if (activePanel !== 'engine' || !qualityAnalysis?.suggestions?.length) {
      return currentContent;
    }

    const source = engineInputContent;

    const sorted = [...qualityAnalysis.suggestions]
      .filter(
        (s) =>
          Number.isFinite(s.start) &&
          Number.isFinite(s.end) &&
          s.end > s.start &&
          s.end <= engineInputContent.length
      )
      .filter((s) => !engineBlockedRanges.some((r) => s.start < r.end && s.end > r.start))
      .sort((a, b) => a.start - b.start);

    if (sorted.length === 0) return source;

    const safe: Array<{ start: number; end: number }> = [];
    let lastEnd = -1;
    for (const s of sorted) {
      if (s.start >= lastEnd) {
        safe.push({ start: s.start, end: s.end });
        lastEnd = s.end;
      }
    }

    let result = source;
    for (let i = safe.length - 1; i >= 0; i -= 1) {
      const { start, end } = safe[i];
      result = `${result.slice(0, start)}<mark data-zen-marker="hl-blue">${result.slice(start, end)}</mark>${result.slice(end)}`;
    }

    return result;
  }, [activePanel, qualityAnalysis, engineInputContent, currentContent, engineBlockedRanges]);

  const engineSuggestions = useMemo(() => {
    if (!qualityAnalysis?.suggestions?.length) return [];
    const map = new Map<
      string,
      { rule: string; suggestion: string; confidence: number; count: number }
    >();
    for (const s of qualityAnalysis.suggestions) {
      const key = `${s.rule}||${s.suggestion}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (s.confidence > existing.confidence) {
          existing.confidence = s.confidence;
        }
      } else {
        map.set(key, { rule: s.rule, suggestion: s.suggestion, confidence: s.confidence, count: 1 });
      }
    }
    return Array.from(map.values());
  }, [qualityAnalysis]);
  const hasPostingErrors = Boolean((postResult && !postResult.success) || failedMultiPostResults.length > 0);

  const comparisonSourceOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [
      { value: 'original', label: `Original: ${originalLabel}` },
    ];
    if (docTabs.length > 0) {
      docTabs.forEach((tab) => {
        if (tab.id === activeDocTabId) return;
        options.push({ value: `tab:${tab.id}`, label: `Tab: ${tab.title}` });
      });
    }
    return options;
  }, [docTabs, activeDocTabId, originalLabel]);

  useEffect(() => {
    if (!comparisonSourceOptions.some((opt) => opt.value === comparisonSource)) {
      setComparisonSource('original');
    }
  }, [comparisonSourceOptions, comparisonSource]);

  const selectedComparisonTabId = comparisonSource.startsWith('tab:')
    ? comparisonSource.slice(4)
    : null;
  const selectedComparisonTab = selectedComparisonTabId
    ? docTabs.find((tab) => tab.id === selectedComparisonTabId) ?? null
    : null;
  const activeComparisonContent = selectedComparisonTabId
    ? docTabContents[selectedComparisonTabId] ?? ''
    : originalContent;
  const activeComparisonLabel = selectedComparisonTab
    ? `Tab: ${selectedComparisonTab.title}`
    : originalLabel;

  const hasComparison = !!activeComparisonContent && activeComparisonContent !== currentContent;
  const comparisonRows = useMemo<LineDiffRow[]>(() => {
    if (!hasComparison) return [];
    const leftLines = activeComparisonContent.split('\n');
    const rightLines = currentContent.split('\n');
    const n = leftLines.length;
    const m = rightLines.length;
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

    for (let i = n - 1; i >= 0; i -= 1) {
      for (let j = m - 1; j >= 0; j -= 1) {
        dp[i][j] = leftLines[i] === rightLines[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }

    const rawRows: LineDiffRow[] = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (leftLines[i] === rightLines[j]) {
        rawRows.push({ left: leftLines[i], right: rightLines[j], status: 'same' });
        i += 1;
        j += 1;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        rawRows.push({ left: leftLines[i], right: '', status: 'removed' });
        i += 1;
      } else {
        rawRows.push({ left: '', right: rightLines[j], status: 'added' });
        j += 1;
      }
    }
    while (i < n) { rawRows.push({ left: leftLines[i], right: '', status: 'removed' }); i += 1; }
    while (j < m) { rawRows.push({ left: '', right: rightLines[j], status: 'added' }); j += 1; }

    // Block-pairing: pair consecutive removed+added lines side-by-side (GitHub-style)
    const mergedRows: LineDiffRow[] = [];
    let idx = 0;
    while (idx < rawRows.length) {
      const row = rawRows[idx];
      if (row.status === 'same') {
        mergedRows.push(row);
        idx += 1;
      } else {
        const removed: string[] = [];
        const added: string[] = [];
        let k = idx;
        while (k < rawRows.length && (rawRows[k].status === 'removed' || rawRows[k].status === 'added')) {
          if (rawRows[k].status === 'removed') removed.push(rawRows[k].left);
          else added.push(rawRows[k].right);
          k += 1;
        }
        const pairCount = Math.max(removed.length, added.length);
        for (let p = 0; p < pairCount; p += 1) {
          const l = removed[p] ?? '';
          const r = added[p] ?? '';
          if (l && r) mergedRows.push({ left: l, right: r, status: 'modified' });
          else if (l) mergedRows.push({ left: l, right: '', status: 'removed' });
          else mergedRows.push({ left: '', right: r, status: 'added' });
        }
        idx = k;
      }
    }
    return mergedRows;
  }, [hasComparison, activeComparisonContent, currentContent]);

  useEffect(() => {
    if (multiPlatformMode && activeResultTab && transformedContents[activeResultTab] !== undefined) {
      setCurrentContent(transformedContents[activeResultTab] || '');
      return;
    }
    setCurrentContent(transformedContent || '');
  }, [transformedContent, platform, activeResultTab, multiPlatformMode, transformedContents]);

  // Text-AI Handler
  const handleTextAI = async (action: 'improve' | 'continue' | 'summarize' | 'markdown', improveStyle?: ImprovementStyle) => {
    setIsAIProcessing(true);
    setAiError(null);

    try {
      let result;
      switch (action) {
        case 'improve':
          result = await improveText(currentContent, {
            style: improveStyle || 'general',
            customInstruction: improveStyle === 'custom' ? customInstruction : undefined,
          });
          break;
        case 'continue':
          result = await continueText(currentContent);
          break;
        case 'summarize':
          result = await summarizeText(currentContent);
          break;
        case 'markdown':
          result = await textToMarkdown(currentContent);
          break;
      }

      if (result.success && result.data) {
        // Show success feedback
        const actionLabels: Record<string, string> = {
          improve: improveStyle === 'charming' ? 'Mehr Charme hinzugefügt' :
                   improveStyle === 'professional' ? 'Professioneller gestaltet' :
                   improveStyle === 'technical' ? 'Technisch verbessert' :
                   improveStyle === 'concise' ? 'Text gekürzt' :
                   improveStyle === 'custom' ? 'Eigene Anweisung angewendet' :
                   'Text verbessert',
          continue: 'Text fortgesetzt',
          summarize: 'Text zusammengefasst',
          markdown: 'In Markdown konvertiert',
        };
        setLastAction(actionLabels[action] || 'Verarbeitet');
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);

        setCurrentContent(result.data);
        onContentChange?.(result.data, { source: 'ai', action });
        setShowTextAI(false);
        setShowImproveOptions(false);
        setShowCustomInput(false);
        setCustomInstruction('');
      } else {
        setAiError(result.error || 'AI-Verarbeitung fehlgeschlagen');
      }
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setIsAIProcessing(false);
    }
  };

  // Handle improvement style selection
  const handleImproveClick = () => {
    setShowImproveOptions(!showImproveOptions);
    setShowCustomInput(false);
  };

 
 
  const { openExternal } = useOpenExternal();
  const socialPlatform = platformMapping[platform];
  const config = loadSocialConfig();
  const hasConfig = socialPlatform ? isPlatformConfigured(socialPlatform, config) : false;
  const preferredSettingsPlatform = useMemo<SocialPlatform | undefined>(() => {
    if (postResult && !postResult.success) return postResult.platform;
    if (failedMultiPostResults.length > 0) return failedMultiPostResults[0].platform;
    return socialPlatform ?? undefined;
  }, [postResult, failedMultiPostResults, socialPlatform]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  const handleContentUpdate = (newContent: string) => {
    setCurrentContent(newContent);
    onContentChange?.(newContent, { source: 'translator' });
  };

const handleDownload = async () => {
  try {
    const filename = `${platform}-content.md`;
    const dir = await downloadDir();
    const path = await join(dir, filename);

    // Image optimization (D: Stats)
    const IMAGE_PATTERN = /!\[[^\]]*\]\((data:image\/[^)]+)\)/g;
    const imagesBefore = [...currentContent.matchAll(IMAGE_PATTERN)];
    let contentToSave = currentContent;
    let statsMsg = '';

    if (imagesBefore.length > 0) {
      const sizeBefore = imagesBefore.reduce((sum, m) => sum + m[1].length, 0);
      contentToSave = await optimizeImagesInMarkdown(currentContent);
      const sizeAfter = [...contentToSave.matchAll(IMAGE_PATTERN)].reduce((sum, m) => sum + m[1].length, 0);
      const savedKb = Math.round((sizeBefore - sizeAfter) / 1024);
      statsMsg = `\n${imagesBefore.length} Bild${imagesBefore.length !== 1 ? 'er' : ''} optimiert (-${savedKb} KB)`;
    }

    await writeTextFile(path, contentToSave);
    showDownloadFeedback(true, `Gespeichert${statsMsg}`);
  } catch {
    showDownloadFeedback(false, 'Fehler beim Speichern');
  }
};
  const handlePost = async () => {
    if (!socialPlatform) {
      alert('Diese Plattform unterstützt derzeit kein direktes Posten. Bitte kopiere den Content manuell.');
      return;
    }

    if (!hasConfig) {
      const shouldConfigure = window.confirm(
        'Du hast noch keine API-Credentials konfiguriert. Möchtest du das jetzt tun?\n\n' +
        'Hinweis: Die API-Integration ist optional. Du kannst den Content auch manuell kopieren und posten.'
      );
      if (shouldConfigure) {
        onOpenSettings(socialPlatform);
      }
      return;
    }

    let contentForPost = currentContent;
    let qaForCurrent = validateSteuerFormatContent(contentForPost, platform);
    if (!qaForCurrent.ok) {
      if (platform === 'twitter') {
        const fix = autoFixSteuerFormatContent(contentForPost, 'twitter');
        const fixedQa = validateSteuerFormatContent(fix.content, 'twitter');
        if (fix.changed && fixedQa.ok) {
          const previewTweets = fix.content.split(/\n{2,}/).filter(Boolean).length;
          const shouldUseFix = window.confirm(
            `Twitter-Inhalt ist zu lang. Soll automatisch gekürzt und als Vorschlag übernommen werden?\n\nVorschlag: ${previewTweets} Tweet${previewTweets === 1 ? '' : 's'}`
          );
          if (shouldUseFix) {
            contentForPost = fix.content;
            setCurrentContent(fix.content);
            onContentChange?.(fix.content, { source: 'manual', action: 'twitter-post-autofix' });
            qaForCurrent = fixedQa;
          }
        }
      }
    }

    if (!qaForCurrent.ok) {
      const message = qaForCurrent.errors.map((issue) => `- ${issue.message}`).join('\n');
      alert(`Posten blockiert durch QA-Regeln:\n${message}`);
      return;
    }

    setIsPosting(true);
    setPostResult(null);

    try {
      const formattedContent = applySteuerFormatConfig(contentForPost, platform);

      // Prepare content based on platform
      let postContent: any;

      switch (platform) {
        case 'twitter': {
          const preparedTwitter = preparePostContent('twitter', formattedContent, {});
          const tweets = preparedTwitter.text.split('\n\n').filter((t) => t.trim());
          postContent = {
            text: tweets[0],
            thread: tweets.length > 1 ? tweets.slice(1) : undefined,
          };
          break;
        }

        case 'reddit': {
          const redditLines = formattedContent.split('\n');
          const redditTitle = redditLines[0].replace(/^#\s*/, '').substring(0, 300);
          const redditBody = redditLines.slice(1).join('\n').trim();
          const preparedReddit = preparePostContent('reddit', redditBody, { title: redditTitle });
          postContent = {
            subreddit: 'test',
            title: preparedReddit.title ?? redditTitle,
            text: preparedReddit.text,
          };
          break;
        }

        case 'linkedin':
          postContent = {
            text: formattedContent,
            visibility: 'PUBLIC',
            ...(linkedInCoverImage ? { coverImageFile: linkedInCoverImage } : {}),
          };
          break;

        case 'devto':
          const devtoLines = formattedContent.split('\n');
          const devtoTitle = devtoLines[0].replace(/^#\s*/, '');
          const bodyMarkdown = devtoLines.slice(1).join('\n').trim();
          postContent = {
            title: devtoTitle,
            body_markdown: bodyMarkdown,
            published: false, // Draft by default
            tags: [],
          };
          break;

        case 'medium':
          const mediumLines = formattedContent.split('\n');
          const mediumTitle = mediumLines[0].replace(/^#\s*/, '');
          const content = mediumLines.slice(1).join('\n').trim();
          postContent = {
            title: mediumTitle,
            content,
            contentFormat: 'markdown' as const,
            publishStatus: 'draft' as const,
          };
          break;

        case 'github-discussion':
          const ghLines = formattedContent.split('\n');
          const ghTitle = ghLines[0].replace(/^#\s*/, '');
          const body = ghLines.slice(1).join('\n').trim();
          postContent = {
            owner: '', // User needs to specify
            repo: '', // User needs to specify
            title: ghTitle,
            body,
            categoryId: '', // User needs to specify
          };
          break;

        default:
          postContent = { text: formattedContent };
      }

      const result = await postToSocialMedia(socialPlatform, postContent, config);
      setPostResult(result);

      if (result.success && result.url) {
        try { await openExternal(result.url); } catch { window.open(result.url, '_blank'); }
      }
    } catch (error) {
      setPostResult({
        success: false,
        platform: socialPlatform,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
    } finally {
      setIsPosting(false);
    }
  };

  // Multi-Platform Posting Handlers
  const handlePlatformSelection = (platforms: SocialPlatform[]) => {
    setSelectedPostPlatforms(platforms);
    setShowPostenModal(false);

    // If in AI Transform mode, go directly to transformation
    if (isAITransformMode) {
      setIsAITransformMode(false);
      // Navigate to Step 2/3 for AI transformation
      if (platforms.length > 0 && onGoToTransform) {
        const socialToContent: Record<SocialPlatform, ContentPlatform> = {
          linkedin: 'linkedin',
          twitter: 'twitter',
          reddit: 'reddit',
          devto: 'devto',
          medium: 'medium',
          github: 'github-discussion',
        };
        const contentPlatform = socialToContent[platforms[0]];
        onGoToTransform(contentPlatform);
      }
    } else {
      setShowPostMethodModal(true);
    }
  };

  const prepareContentForPlatform = (targetPlatform: SocialPlatform, sourceOverride?: string): any => {
    const contentPlatform = socialToContentPlatform[targetPlatform];
    const preparedContent = applySteuerFormatConfig(sourceOverride ?? currentContent, contentPlatform);
    const lines = preparedContent.split('\n');
    const title = lines[0].replace(/^#\s*/, '');
    const body = lines.slice(1).join('\n').trim();

    switch (targetPlatform) {
      case 'twitter': {
        const preparedTwit = preparePostContent('twitter', preparedContent, {});
        const tweets = preparedTwit.text.split('\n\n').filter((t) => t.trim());
        return {
          text: tweets[0],
          thread: tweets.length > 1 ? tweets.slice(1) : undefined,
        };
      }
      case 'reddit': {
        const preparedRed = preparePostContent('reddit', body, { title: title.substring(0, 300) });
        return {
          subreddit: 'test',
          title: preparedRed.title ?? title.substring(0, 300),
          text: preparedRed.text,
        };
      }
      case 'linkedin':
        return {
          text: preparedContent,
          visibility: 'PUBLIC',
          ...(linkedInCoverImage ? { coverImageFile: linkedInCoverImage } : {}),
        };
      case 'devto':
        return {
          title,
          body_markdown: body,
          published: false,
          tags: [],
        };
      case 'medium':
        return {
          title,
          content: body,
          contentFormat: 'markdown' as const,
          publishStatus: 'draft' as const,
        };
      case 'github':
        return {
          owner: '',
          repo: '',
          title,
          body,
          categoryId: '',
        };
      default:
        return { text: preparedContent };
    }
  };

  const handleMultiDirectPost = async (platformsOverride?: SocialPlatform[]) => {
    setShowPostMethodModal(false);
    setIsMultiPosting(true);
    setMultiPostResults([]);

    const results: PostResult[] = [];
    const currentConfig = loadSocialConfig();
    const targetPlatforms = platformsOverride && platformsOverride.length > 0
      ? platformsOverride
      : selectedPostPlatforms;

    for (const targetPlatform of targetPlatforms) {
      if (!isPlatformConfigured(targetPlatform, currentConfig)) {
        results.push({
          success: false,
          platform: targetPlatform,
          error: `${targetPlatform} nicht konfiguriert`,
        });
        continue;
      }

      try {
        let sourceForPlatform = currentContent;
        if (targetPlatform === 'twitter') {
          const fix = autoFixSteuerFormatContent(currentContent, 'twitter');
          if (fix.changed) {
            sourceForPlatform = fix.content;
          }
        }

        const postContent = prepareContentForPlatform(targetPlatform, sourceForPlatform);
        const qaPlatform = socialToContentPlatform[targetPlatform];
        const qaCheck = validateSteuerFormatContent(
          targetPlatform === 'twitter'
            ? [postContent.text, ...(postContent.thread ?? [])].filter(Boolean).join('\n\n')
            : (postContent.body_markdown ?? postContent.content ?? postContent.text ?? postContent.body ?? ''),
          qaPlatform
        );
        if (!qaCheck.ok) {
          results.push({
            success: false,
            platform: targetPlatform,
            error: qaCheck.errors.map((issue) => issue.message).join(' | '),
          });
          continue;
        }
        const result = await postToSocialMedia(targetPlatform, postContent, currentConfig);
        results.push(result);

        if (result.success && result.url) {
          try { await openExternal(result.url); } catch { window.open(result.url, '_blank'); }
        }
      } catch (error) {
        results.push({
          success: false,
          platform: targetPlatform,
          error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        });
      }
    }

    setMultiPostResults(results);
    setIsMultiPosting(false);
  };

  const handlePostAllFromCurrentResult = async () => {
    const fromTabs = multiPlatformMode
      ? (Object.keys(transformedContents) as ContentPlatform[])
      : [];
    const candidateContentPlatforms = fromTabs.length > 0 ? fromTabs : [platform];

    const allTargets = candidateContentPlatforms
      .map((contentPlatform) => platformMapping[contentPlatform])
      .filter((value): value is SocialPlatform => value !== null);

    const uniqueTargets = Array.from(new Set(allTargets));

    if (uniqueTargets.length === 0) {
      alert('Für die ausgewählten Plattformen ist kein Direkt-Posting verfügbar.');
      return;
    }

    setSelectedPostPlatforms(uniqueTargets);
    await handleMultiDirectPost(uniqueTargets);
  };

  const handleMultiAIOptimize = () => {
    setShowPostMethodModal(false);

    // Navigate to Step 2/3 for AI transformation
    // Use the first selected platform for transformation
    if (selectedPostPlatforms.length > 0 && onGoToTransform) {
      // Map SocialPlatform to ContentPlatform
      const socialToContent: Record<SocialPlatform, ContentPlatform> = {
        linkedin: 'linkedin',
        twitter: 'twitter',
        reddit: 'reddit',
        devto: 'devto',
        medium: 'medium',
        github: 'github-discussion',
      };
      const contentPlatform = socialToContent[selectedPostPlatforms[0]];
      onGoToTransform(contentPlatform);
    }
  };

  useEffect(() => {
    if (!headerAction) return;
    if (headerAction === "copy") {
      handleCopy();
    } else if (headerAction === "download") {
      handleDownload();
    } else if (headerAction === "edit") {
      onBack();
    } else if (headerAction === "post") {
      if (isPreview && onOpenPlatformSelection) {
        onOpenPlatformSelection();
      } else {
        handlePost();
      }
    } else if (headerAction === "posten") {
      if (isPreview && onOpenPlatformSelection) {
        onOpenPlatformSelection();
      } else {
        setShowPostenModal(true);
      }
    } else if (headerAction === "post_all") {
      void handlePostAllFromCurrentResult();
    } else if (headerAction === "reset") {
      onReset();
    } else if (headerAction === "back_doc" && onBackToDocStudio) {
      onBackToDocStudio(currentContent);
    } else if (headerAction === "back_dashboard" && onBackToDashboard) {
      onBackToDashboard(currentContent);
    }
    onHeaderActionHandled?.();
  }, [
    headerAction,
    onHeaderActionHandled,
    onBack,
    onReset,
    onBackToDocStudio,
    onBackToDashboard,
    currentContent,
    handleCopy,
    handleDownload,
    handlePost,
    handlePostAllFromCurrentResult,
  ]);

  return (
    <div className="flex-1 flex flex-col items-center"
        style={{ padding: '0.5rem 1.5rem' }}
    >


      <div className="flex flex-col items-center w-full max-w-4xl">

   
       
        {/* Multi-Platform: 1× schreiben → N× transformieren */}
        {multiPlatformMode && Object.keys(transformedContents).length > 1 && (
          <div style={{ width: '90vw', padding: '0 24px', marginBottom: '2px', boxSizing: 'border-box' }}>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#AC8E66', margin: 0 }}>
              1× geschrieben · {Object.keys(transformedContents).length}× transformiert
            </p>
          </div>
        )}

        {/* Multi-Platform Tab Bar */}
        {multiPlatformMode
          && Object.keys(transformedContents).length > 1
          && docTabs.filter((tab) => tab.kind === 'derived').length === 0 && (
          <div
            style={{
              width: '90vw',
              marginBottom: '4px',
              padding: '0 24px',
              boxSizing: 'border-box',
              opacity: isIdle ? 0.35 : 1,
              transition: 'opacity 250ms ease',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-end',
              }}
            >
              {Object.keys(transformedContents).map((platformKey) => {
                const platformValue = platformKey as ContentPlatform;
                const isActive = activeResultTab === platformValue;
                return (
                  <button
                    key={platformKey}
                    onClick={() => {
                      onActiveResultTabChange?.(platformValue);
                    }}
                    style={{
                      flex: 1,
                      padding: '7px 12px',
                      backgroundColor: isActive ? '#d9d4c5' : '#1a1a1a',
                      border: isActive ? '1px solid #AC8E66' : '1px solid #3A3A3A',
                      borderBottom: 'none',
                      borderRadius: '8px 8px 0 0',
                      cursor: 'pointer',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '10px',
                      fontWeight: isActive ? '500' : '400',
                      color: isActive ? '#151515' : '#8f8f8f',
                      transition: 'all 0.2s',
                      lineHeight: 1.2,
                      minHeight: '35px',
                      transform: 'translateY(0)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = '#AC8E66';
                        e.currentTarget.style.color = '#AC8E66';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = '#3A3A3A';
                        e.currentTarget.style.color = '#8f8f8f';
                      }
                    }}
                  >
                    {platformLabels[platformValue]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Auto-Select Info */}
        {autoSelectedModel && (
          <div className="mb-8 w-full max-w-2xl">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 20px',
                backgroundColor: '#2A2A2A',
                border: '1px solid #AC8E66',
                borderRadius: '8px',
              }}
            >
              <FontAwesomeIcon icon={faWandMagicSparkles} style={{ color: '#AC8E66', fontSize: '16px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#AC8E66',
                    fontWeight: 600,
                  }}
                >
                  Auto-Select aktiv
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    color: '#999',
                    marginTop: '4px',
                  }}
                >
                  {autoSelectedModel}
                </p>
              </div>
            </div>
          </div>
        )}

        {hasPostingErrors && (
          <div
            style={{
              width: '90vw',
              marginBottom: '24px',
              paddingTop: '12px',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '16px',
               
                border: '1px solid rgba(179,38,30,0.45)',
                background: ' transparent',
                boxShadow: '0 10px 24px rgba(0,0,0,0.22)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: '9px', }}>
                <FontAwesomeIcon icon={faTriangleExclamation} 
                style={{ color: '#d0cbb8', fontSize: '12px' }} />
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', 
                  fontSize: '11px', color: '#d0cbb8',  }}>
                  Posting Einstellungs Fehler
                </span>
              </div>

              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {postResult && !postResult.success && (
                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,180,171,0.35)',
                      background: 'rgba(20,20,20,0.65)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <FontAwesomeIcon icon={faRotateLeft} style={{ color: '#d0cbb8', fontSize: '10px' }} />
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#d0cbb8' }}>
                      {platformLabels[platform]}: {postResult.error || 'Unbekannter Fehler'}
                    </span>
                  </div>
                )}

                {failedMultiPostResults.map((result, index) => (
                  <div
                    key={`posting-error-${result.platform}-${index}`}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'rgba(20,20,20,0.65)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <FontAwesomeIcon icon={faRotateLeft} style={{ color: '#d0cbb8', fontSize: '10px' }} />
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#d0cbb8' }}>
                      {result.platform}: {result.error || 'Unbekannter Fehler'}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 10, marginLeft: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => onOpenSettings(preferredSettingsPlatform)}
                  style={{
                    border: '1px solid #888',
                    background: '#d0cbb8',
                    color: '#1a1a1a',
                    borderRadius: '8px',
                    padding: '7px 12px',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  Einstellungen öffnen
                </button>
                {/* Copy & Open fallback — always useful when API fails */}
                <button
                  type="button"
                  onClick={async () => {
                    const platformOpenUrls: Record<SocialPlatform, string> = {
                      linkedin: 'https://www.linkedin.com/feed/?shareActive=true',
                      twitter: 'https://twitter.com/compose/tweet',
                      reddit: 'https://www.reddit.com/submit',
                      devto: 'https://dev.to/new',
                      medium: 'https://medium.com/new-story',
                      github: 'https://github.com',
                    };
                    try { await navigator.clipboard.writeText(currentContent.substring(0, 3000)); } catch {}
                    const url = (socialPlatform && platformOpenUrls[socialPlatform]) || '#';
                    try { await openExternal(url); } catch { window.open(url, '_blank', 'noopener,noreferrer'); }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    border: '1px solid #888',
                    background: '#d0cbb8',
                    color: '#1a1a1a',
                    borderRadius: '8px',
                    padding: '7px 12px',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  <FontAwesomeIcon icon={faCopy} style={{ fontSize: '9px' }} />
                  Kopieren &amp; Öffnen
                  <FontAwesomeIcon icon={faExternalLinkAlt} style={{ fontSize: '8px' }} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Outer layout: left vertical panel buttons + result container */}
        <div style={{ display: 'flex', alignItems: 'flex-start', width: '90vw', marginTop: '14px', gap: '2px' }}>

          {/* Left vertical panel buttons */}
          {currentContent && currentContent.trim() && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '48px', marginLeft:'25px', flexShrink: 0 }}>
              <button
                onClick={() => togglePanel('vergleich')}
                style={{
                  padding: '10px 7px',
                  backgroundColor: activePanel === 'vergleich' ? '#d9d4c5' : '#1a1a1a',
                  border: activePanel === 'vergleich' ? '1px solid #AC8E66' : '1px dotted #3A3A3A',
                  borderRadius: '0 6px 6px 0',
                  cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '10px',
                 
                  color: activePanel === 'vergleich' ? '#1a1a1a' : '#d0cbb8',
                  transition: 'all 0.2s',
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.05em',
                }}
                onMouseEnter={(e) => {
                  if (activePanel !== 'vergleich') {
                    e.currentTarget.style.color = '#AC8E66';
                    e.currentTarget.style.borderColor = '#AC8E66';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activePanel !== 'vergleich') {
                    e.currentTarget.style.color = '#d0cbb8';
                    e.currentTarget.style.borderColor = '#3A3A3A';
                  }
                }}
              >
                Vergleich
              </button>
              <button
                onClick={() => togglePanel('engine')}
                style={{
                  padding: '10px 7px',
                  backgroundColor: activePanel === 'engine' ? '#d9d4c5' : '#151515',
                  border: activePanel === 'engine' ? '1px solid #AC8E66' : '1px dotted #3A3A3A',
                  borderRadius: '0 6px 6px 0',
                  cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '10px',
             
                  color: activePanel === 'engine' ? '#1a1a1a' : '#d0cbb8',
                  transition: 'all 0.2s',
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.05em',
                }}
                onMouseEnter={(e) => {
                  if (activePanel !== 'engine') {
                    e.currentTarget.style.color = '#AC8E66';
                    e.currentTarget.style.borderColor = '#AC8E66';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activePanel !== 'engine') {
                    e.currentTarget.style.color = '#d0cbb8';
                    e.currentTarget.style.borderColor = '#3A3A3A';
                  }
                }}
              >
                Engine{qualityAnalysis && qualityAnalysis.match_count > 0 ? ` · ${qualityAnalysis.match_count}` : ''}
              </button>
              {(qaResult.errors.length > 0 || qaResult.warnings.length > 0) && (
                <button
                  onClick={() => togglePanel('qa')}
                  style={{
                    padding: '20px 7px',
                    backgroundColor: activePanel === 'qa' ? '#d9d4c5' : '#151515',
                    border: activePanel === 'qa' ? '1px solid #AC8E66' : '1px dotted #3A3A3A',
                     borderRadius: '0 6px 6px 0',
                    cursor: 'pointer',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '10px',
                   
                    color: activePanel === 'qa' ? '#1a1a1a' : '#d0cbb8',
                    transition: 'all 0.2s',
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.05em',
                  }}
                  onMouseEnter={(e) => {
                    if (activePanel !== 'qa') {
                      e.currentTarget.style.color = '#AC8E66';
                      e.currentTarget.style.borderColor = '#AC8E66';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activePanel !== 'qa') {
                      e.currentTarget.style.color = '#d0cbb8';
                      e.currentTarget.style.borderColor = '#3A3A3A';
                    }
                  }}
                >
                  QA
                </button>
              )}
              {platformThumbnail && (
                <button
                  onClick={() => togglePanel('thumbnail')}
                  style={{
                    padding: '10px 7px',
                    backgroundColor: activePanel === 'thumbnail' ? '#d9d4c5' : '#151515',
                    border: activePanel === 'thumbnail' ? '1px solid #AC8E66' : '1px dotted #3A3A3A',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '8px',
                    
                    color: activePanel === 'thumbnail' ? '#1a1a1a' : '#d0cbb8',
                    transition: 'all 0.2s',
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.05em',
                  }}
                  onMouseEnter={(e) => {
                    if (activePanel !== 'thumbnail') {
                      e.currentTarget.style.color = '#AC8E66';
                      e.currentTarget.style.borderColor = '#AC8E66';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activePanel !== 'thumbnail') {
                      e.currentTarget.style.color = '#d0cbb8';
                      e.currentTarget.style.borderColor = '#3A3A3A';
                    }
                  }}
                >
                  Thumbnail
                </button>
              )}
            </div>
          )}

          {/* Result Container */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              backgroundColor: "#d0cbb8",
              border: "0.5px solid #AC8E66",
              borderRadius: "1.5rem",
              padding: '0.9rem 0',
            }}
          >
          {/* ── Header: platform + status + stats ─────────────────── */}
          <div style={{ 
            padding: '0.75rem 1.5rem 0.75rem 1.75rem', 
            display: 'flex', flexDirection: 'column', gap: 6 }}>

            {/* Row 1: platform name + status badge + image picker */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>

                {/* Platform label */}
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', 
                 color: '#1a1a1a', letterSpacing: '0.04em' }}>
                  {platformLabels[activeQaPlatform]}     <span color="#dbd9ce"  > | Preview Theme {PREVIEW_THEME_LABELS[activePreviewTheme]}</span>
                 
                </span>
                
                 
             
                                                    

                {/* Status badge */}
                {socialPlatform !== null && (
                  postResult?.success ? (
                    <a
                      href={postResult.url ?? '#'}
                      onClick={async (e) => {
                        e.preventDefault();
                        if (postResult.url) {
                          try { await openExternal(postResult.url); } catch { window.open(postResult.url, '_blank'); }
                        }
                      }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px', borderRadius: '20px',
                        border: '1px solid rgba(76,175,80,0.5)',
                        background: 'rgba(76,175,80,0.12)',
                        fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px',
                        color: '#4caf50', letterSpacing: '0.03em', textDecoration: 'none',
                        cursor: postResult.url ? 'pointer' : 'default',
                      }}
                    >
                      <FontAwesomeIcon icon={faCheck} style={{ fontSize: '7px' }} />
                      Gepostet!{postResult.url ? ' →' : ''}
                    </a>
                  ) : hasConfig ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px', borderRadius: '8px',
                      border: '1px solid rgba(74,163,104,0.35)',
                      background: 'rgba(74,163,104,0.07)',
                      fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px',
                      color: '#1a1a1a', letterSpacing: '0.03em',
                    }}>
                      <FontAwesomeIcon icon={faCheck} style={{ fontSize: '7px' }} />
                      Bereit zum Posten
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenSettings(socialPlatform)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        boxShadow: 'none',
                        border: '1px solid rgba(172,142,102,0.35)',
                        background: 'rgba(172,142,102,0.06)',
                        fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px',
                        color: '#1a1a1a', letterSpacing: '0.03em',
                        cursor: 'pointer', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#d0cbb8'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(172,142,102,0.1)'; }}
                    >
                      <FontAwesomeIcon icon={faCog} style={{ fontSize: '7px' }} />
                      API einrichten
                    </button>
                  )
                )}

                {/* LinkedIn cover image picker */}
                {socialPlatform === 'linkedin' && hasConfig && (
                  linkedInCoverPreview ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <img
                        src={linkedInCoverPreview}
                        alt="Cover"
                        style={{ width: 32, height: 20, objectFit: 'cover', borderRadius: 4, border: '1px solid rgba(172,142,102,0.4)' }}
                      />
                      <button
                        type="button"
                        onClick={() => { setLinkedInCoverImage(null); setLinkedInCoverPreview(null); }}
                        style={{
                          fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px',
                          color: '#555', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        }}
                      >×</button>
                    </span>
                  ) : (
                    <label style={{
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px', borderRadius: '8px',
                      border: '1px solid #2e2e2e',
                      fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#555',
                    }}>
                      <FontAwesomeIcon icon={faImage} style={{ fontSize: '8px' }} />
                      Titelbild
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setLinkedInCoverImage(file);
                          setLinkedInCoverPreview(URL.createObjectURL(file));
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )
                )}
              </div>

              {/* Right: close only */}
        
            </div>

            {/* Row 2: stats — muted, smaller */}
            {currentContent && currentContent.trim() ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
                {(() => {
                  const words = engineStats?.word_count ?? currentContent.split(/\s+/).filter(Boolean).length;
                  const mins = Math.max(1, Math.ceil(words / 200));
                  const limit = PLATFORM_CHAR_LIMITS[activeQaPlatform];
                  const chars = engineStats?.char_count ?? currentContent.length;
                  const lines = engineStats?.line_count;
                  const over = limit ? chars > limit : false;
                  const pct = limit ? Math.min(100, (chars / limit) * 100) : 0;

                  const Dot = () => <span style={{ color: '#1a1a1a', padding: '10px 6px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px' }}>·</span>;
                  const Stat = ({ children, color }: { children: React.ReactNode; color?: string }) => (
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: color ?? '#1a1a1a' }}>{children}</span>
                  );

                  return (
                    <>
                      <Stat>{words.toLocaleString('de-DE')} Wörter</Stat>
                      <Dot /><Stat>{mins} Min.</Stat>
                      {lines ? <><Dot /><Stat>{lines} Zeilen</Stat></> : null}
                      <Dot />
                      <Stat color={over ? '#1a1a1a' : '#1a1a1a'}>
                        {chars.toLocaleString('de-DE')}{limit ? ` / ${limit.toLocaleString('de-DE')}` : ''} Zeichen
                      </Stat>
                      {limit && (
                        <>
                          <Dot />
                          <div style={{ width: 48, height: 3, background: '#222', borderRadius: 2, overflow: 'hidden', alignSelf: 'center' }}>
                            <div style={{
                              height: '100%', width: `${pct}%`,
                              background: over ? '#c97a3a' : pct > 80 ? '#7a6a2a' : '#2a4a2a',
                              borderRadius: 2, transition: 'width 0.3s, background 0.3s',
                            }} />
                          </div>
                        </>
                      )}
                   
                      {downloadFeedback && (
                        <><Dot /><Stat color={downloadFeedback.ok ? '#4caf50' : '#c97a3a'}>{downloadFeedback.ok ? '✓ ' : '✗ '}{downloadFeedback.msg}</Stat></>
                      )}
                   
                    

                    </>
                    
                  );
                })()}
              </div>
            ) : null}
          </div>

    {/* Text-AI Tab Bar */}
          {showTextAI && currentContent && currentContent.trim() && (
            <div
              style={{
                padding: '0 1.5rem 1rem 1.5rem',
                opacity: isIdle ? 0.35 : 1,
                transition: 'opacity 250ms ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: 'transparent',
                  borderRadius: '12px',
                  border: '0.5px dotted #3a3a3a',
                  flexWrap: 'wrap',
                }}
              >
                {/* Text verbessern */}
                <div style={{ flex: '1 1 auto', minWidth: '140px', position: 'relative' }}>
                  <button
                    onClick={handleImproveClick}
                    disabled={isAIProcessing}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: showImproveOptions ? 'transparent' : 'transparent',
                      border: showImproveOptions ? '0.5px solid #AC8E66' : '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5',
                      fontFamily: 'monospace',
                      fontSize: '10px',
                      cursor: isAIProcessing ? 'not-allowed' : 'pointer',
                      opacity: isAIProcessing ? 0.5 : 1,
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onMouseEnter={(e) => {
                      if (!isAIProcessing && !showImproveOptions) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = '#AC8E66';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!showImproveOptions) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = '#3a3a3a';
                      }
                    }}
                  >
                    <FontAwesomeIcon icon={faWandMagicSparkles} style={{ color: '#AC8E66', fontSize: '16px' }} />
                    <span>Text verbessern</span>
                  </button>

                  {/* Improvement Style Dropdown */}
                  {showImproveOptions && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: '65%',
                        transform: 'translateX(-50%)',
                        marginTop: '10px',
                        backgroundColor: '#0A0A0A',
                        border: '0.5px solid #AC8E66',
                        borderRadius: '12px',
                        padding: '8px',
                        minWidth: '350px',
                        zIndex: 100,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      }}
                    >
                      <p style={{
                        fontFamily: 'monospace',
                        fontSize: '10px',
                        color: '#AC8E66',
                        margin: '0 0 8px 0',
                        textAlign: 'center',
                        fontWeight: 600,
                      }}>
                        Wie soll verbessert werden?
                      </p>

                      {/* Style Options */}
                {IMPROVE_OPTIONS.map((option) => (
  <button
    key={option.style}
    onClick={() => handleTextAI('improve', option.style)}
    disabled={isAIProcessing}
    style={{
      ...improveBaseStyle,
      ...(isAIProcessing ? improveDisabledStyle : {}),
    }}
    onMouseEnter={(e) => {
      if (!isAIProcessing) Object.assign(e.currentTarget.style, improveHoverStyle);
    }}
    onMouseLeave={(e) => {
      Object.assign(e.currentTarget.style, improveBaseStyle);
    }}
  >
    <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#e5e5e5', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
      <FontAwesomeIcon icon={option.icon} style={{ color: '#AC8E66', fontSize: '12px' }} />
      <span>{option.label}</span>
    </div>

    <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#777', marginTop: '2px' }}>
      {option.desc}
    </div>
  </button>
))}


                      {/* Custom Input Toggle */}
                      <button
                        onClick={() => setShowCustomInput(!showCustomInput)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: showCustomInput ? '#3a3a3a' : '#2A2A2A',
                          border: showCustomInput ? '1px solid #AC8E66' : '1px solid #3a3a3a',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => {
                          if (!showCustomInput) {
                            e.currentTarget.style.backgroundColor = '#3a3a3a';
                            e.currentTarget.style.borderColor = '#AC8E66';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!showCustomInput) {
                            e.currentTarget.style.backgroundColor = '#2A2A2A';
                            e.currentTarget.style.borderColor = '#3a3a3a';
                          }
                        }}
                      >
                        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#e5e5e5', fontWeight: 500 }}>
                            <FontAwesomeIcon icon={faEdit} style={{ fontSize: '10px', marginTop: '-2px', color: '#AC8E66', marginRight: '8px' }} />
                              Eigene Anweisung
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#777', marginTop: '2px' }}>
                          Beschreibe selbst wie
                        </div>
                      </button>

                      {/* Custom Instruction Input */}
                      {showCustomInput && (
                        <div style={{ marginTop: '8px' }}>
                          <textarea
                            value={customInstruction}
                            onChange={(e) => setCustomInstruction(e.target.value)}
                            placeholder="z.B. 'Mache den Text lustiger' oder 'Füge mehr Beispiele hinzu'"
                            style={{
                              width: '93%',
                              minHeight: '80px',
                              padding: '10px',
                              backgroundColor: '#2A2A2A',
                              border: '1px solid #3a3a3a',
                              borderRadius: '8px',
                              color: '#e5e5e5',
                              fontFamily: 'monospace',
                              fontSize: '10px',
                              resize: 'vertical',
                              outline: 'none',
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = '#AC8E66';
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = '#3a3a3a';
                            }}
                          />
                          <button
                            onClick={() => handleTextAI('improve', 'custom')}
                            disabled={isAIProcessing || !customInstruction.trim()}
                            style={{
                              width: '100%',
                              marginTop: '8px',
                              padding: '10px',
                              backgroundColor: customInstruction.trim() ? '#AC8E66' : '#3a3a3a',
                              border: 'none',
                              borderRadius: '8px',
                              color: customInstruction.trim() ? '#1A1A1A' : '#777',
                              fontFamily: 'monospace',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: customInstruction.trim() ? 'pointer' : 'not-allowed',
                              transition: 'all 0.2s',
                            }}
                          >
                            Verbessern mit eigener Anweisung
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Text fortsetzen */}
                <button
                  onClick={() => handleTextAI('continue')}
                  disabled={isAIProcessing}
                  style={{
                    flex: '1 1 auto',
                    minWidth: '140px',
                    padding: '12px 16px',
                    backgroundColor: 'transparent',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e5e5e5',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    cursor: isAIProcessing ? 'not-allowed' : 'pointer',
                    opacity: isAIProcessing ? 0.5 : 1,
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isAIProcessing) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = '#AC8E66';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = '#3a3a3a';
                  }}
                >
                  <FontAwesomeIcon icon={faArrowRight} style={{ color: '#AC8E66', fontSize: '16px' }} />
                  <span>Text fortsetzen</span>
                </button>

                {/* Zusammenfassen */}
                <button
                  onClick={() => handleTextAI('summarize')}
                  disabled={isAIProcessing}
                  style={{
                    flex: '1 1 auto',
                    minWidth: '140px',
                    padding: '12px 16px',
                    backgroundColor: 'transparent',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e5e5e5',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    cursor: isAIProcessing ? 'not-allowed' : 'pointer',
                    opacity: isAIProcessing ? 0.5 : 1,
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isAIProcessing) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = '#AC8E66';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = '#3a3a3a';
                  }}
                >
                  <FontAwesomeIcon icon={faCompress} style={{ color: '#AC8E66', fontSize: '16px' }} />
                  <span>Zusammenfassen</span>
                </button>

                {/* Markdown-Format */}
                <button
                  onClick={() => handleTextAI('markdown')}
                  disabled={isAIProcessing}
                  style={{
                    flex: '1 1 auto',
                    minWidth: '140px',
                    padding: '12px 16px',
                    backgroundColor: 'transparent',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e5e5e5',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    cursor: isAIProcessing ? 'not-allowed' : 'pointer',
                    opacity: isAIProcessing ? 0.5 : 1,
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isAIProcessing) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = '#AC8E66';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = '#3a3a3a';
                  }}
                >
                  <FontAwesomeIcon icon={faCode} style={{ color: '#AC8E66', fontSize: '16px' }} />
                  <span>Markdown-Format</span>
                </button>
              </div>

              {/* AI Processing Indicator */}
              {isAIProcessing && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: 'transparent',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    height: '40px',
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      border: '1px solid #AC8E66',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#AC8E66', fontWeight: '600' }}>
                    AI verarbeitet...
                  </span>
                </div>
              )}

              {/* AI Success Message */}
              {showSuccessMessage && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid #22c55e',
                    borderRadius: '8px',
                    color: '#22c55e',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    textAlign: 'center',
                    animation: 'fadeIn 0.3s ease-out',
                  }}
                >
                  <FontAwesomeIcon icon={faCheck} style={{ marginRight: 6 }} />{lastAction}! Der Text wurde aktualisiert.
                </div>
              )}

              {/* AI Error */}
              {aiError && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    borderRadius: '8px',
                    color: '#ef4444',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    textAlign: 'center',
                  }}
                >
                  {aiError}
                </div>
              )}

              <style>{`
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(-10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
            </div>
          )}


          {docTabs.length > 0 && currentContent && currentContent.trim() && (
            <div style={{ padding: '0 25px', position: 'relative' }}>
              <div
                className="zen-no-scrollbar"
                style={{
                  display: 'flex',
                  width: '100%',
                  gap: 8,
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                  marginTop: '10px',
                }}
              >
                {docTabs.map((tab) => {
                  const isActive = activeDocTabId === tab.id;
                  const isDirty = !!dirtyDocTabs[tab.id];
                  return (
                    <button
                      key={tab.id}
                      ref={(el) => {
                        if (isActive && el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                        }
                      }}
                      onClick={() => onDocTabChange?.(tab.id)}
                      style={{
                        flex: '0 0 auto',
                        padding: '12px 16px',
                        backgroundColor: isActive ? '#d9d4c5' : '#2a2a2a',
                        border: isActive ? '0.5px solid #666' : '1px dotted #1A1A1A',
                        borderRadius: '8px 8px 0px 0px',
                        borderBottom: 'none',
                        cursor: 'pointer',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: isActive ? '9px' : '10px',
                        
                        color: isActive ? '#1a1a1a' : '#999',
                        transition: 'all 0.1s',
                        transform: isActive ? 'translateY(0)' : 'translateY(12px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'left',
                        gap: '8px',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color = '#AC8E66';
                          e.currentTarget.style.borderColor = '#AC8E66';
                          e.currentTarget.style.transform = 'translateY(0)';
                      
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color = '#888';
                          e.currentTarget.style.borderColor = '#3A3A3A';
                          e.currentTarget.style.transform = 'translateY(12px)';

                        }
                      }}
                    >
                      {isDirty ? <span 
                      style={{ 
                        color: isActive ? '#151515' : '#555' }}>•</span> : null}
                      <span style={{ whiteSpace: 'nowrap' }}>{tab.title.length > 20 ? tab.title.slice(0, 20) + '…' : tab.title}</span>
                      {tab.kind !== 'draft' && (
                        <span
                          onClick={(event) => {
                            event.stopPropagation();
                            onCloseDocTab?.(tab.id);
                          }}
                          style={{
                            marginLeft: 'auto',
                         
                            fontSize: '12px',
                            color: isActive ? '#151515' : '#555',
                            opacity: 0.8,
                          }}
                        >
                          ×
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

      

          {/* Content Display */}
          <div style={{ padding: '0 1.5rem 1rem 1.5rem' }}>
            {activePanel === 'vergleich' && !hasComparison && (
              <div style={{ marginBottom: '0.5px', padding: '10px 14px', border: '0.5px solid #3a3a3a', borderRadius: '0 0 0 0', backgroundColor: '#d0cbb8' }}>
                <span className="font-mono text-[10px] text-[#555]">Keine Vergleichsquelle verfügbar — öffne mehrere Dokumente als Tabs.</span>
              </div>
            )}
            {activePanel === 'vergleich' && hasComparison && (
              <div
                style={{
                  marginBottom: '12px',
                  padding: '10px',
                  border: '0.5px solid #3a3a3a',
                  borderRadius: '0 0 10px 10px',
                  backgroundColor: '#d0cbb8',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="font-mono text-[10px] text-[#1a1a1a]">Vorher:</span>
                    {comparisonSourceOptions.length > 1 ? (
                      <ZenDropdown
                        value={comparisonSource}
                        onChange={setComparisonSource}
                        options={comparisonSourceOptions}
                        variant="compact"
                      />
                    ) : (
                      <span className="font-mono text-[10px] text-[#1a1a1a]">{activeComparisonLabel}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="font-mono text-[10px] text-[#1a1a1a]">
                      Zeichen Δ {currentContent.length - activeComparisonContent.length}
                    </div>
                    <button
                      onClick={onBack}
                      className="font-mono bg-transparent text-[9px]  px-2 py-1 rounded border border-[#AC8E66] text-[#1a1a1a] hover:bg-[#d0cbb8]/90 transition-colors"
                      title="Änderungen als neue Version in den Editor übernehmen"
                    >
                      Änderungen übernehmen
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    maxHeight: '340px',
                    overflow: 'auto',
                  }}
                >
                  <div style={{ border: '0.5px solid #3a3a3a', borderRadius: '8px', overflow: 'hidden' }}>
                    {comparisonRows.map((row, index) => (
                      <div
                        key={`left-${index}`}
                        style={{
                          padding: '3px 8px',
                          minHeight: '18px',
                          borderBottom: '0.5px solid #202020',
                          backgroundColor: (row.status === 'removed' || row.status === 'modified') ? 'rgba(239,68,68)' : '#171717',
                          color: (row.status === 'removed' || row.status === 'modified') ? '#1a1a1a' : '#888',
                          fontFamily: 'monospace',
                          fontSize: '10px',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {row.left || ' '}
                      </div>
                    ))}
                  </div>
                  <div style={{ border: '0.5px solid #AC8E66', borderRadius: '8px', overflow: 'hidden' }}>
                    {comparisonRows.map((row, index) => (
                      <div
                        key={`right-${index}`}
                        style={{
                          padding: '3px 8px',
                          minHeight: '18px',
                          borderBottom: '0.5px solid #202020',
                          backgroundColor: (row.status === 'added' || row.status === 'modified') ? 'rgba(34,197,94)' : '#171717',
                          color: (row.status === 'added' || row.status === 'modified') ? '#1a1a1a' : '#d9d4c5',
                          fontFamily: 'monospace',
                          fontSize: '10px',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {row.right || ' '}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {activePanel === 'qa' && (qaResult.errors.length > 0 || qaResult.warnings.length > 0) && (
              <div
                style={{
                  marginBottom: '0.1px',
                  padding: '10px',
                  border: '0.5px solid #3a3a3a',
                  borderRadius: '0 0 0 0',
                  backgroundColor: '#1a1a1a',
                  boxShadow: 'none'
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: qaResult.errors.length > 0 ? '1px solid #ef4444' : '1px solid #AC8E66',
                    backgroundColor: qaResult.errors.length > 0 ? 'transparent' : '#d0cbb8',
                  }}
                >
                  <div className="flex items-center  border-[#1a1a1a] justify-between gap-3">
                    <p
                      style={{
                        margin: 0,
                        fontSize: '12px',
                        fontFamily: 'monospace',
                       
                        color: qaResult.errors.length > 0 ? '#d0cbb8' : '#1a1a1a',
                        
                      }}
                    >
                      QA Check · {platformLabels[activeQaPlatform]}
                    </p>
                    <button
                      type="button"
                      onClick={handleAutoFixQa}
                      style={{
                        padding: '6px 10px',
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        borderRadius: '6px',
                        boxShadow: 'none',
                        border: '0.5px solid #1a1a1a',
                        background: '#d0cbb8',
                        color: '#1a1a1a',
                        cursor: 'pointer',
                      }}
                    >
                      Auto-Fix
                    </button>
                  </div>
                  {qaResult.errors.map((issue) => (
                    <p
                      key={`err-${issue.code}-${issue.message}`}
                      style={{
                        margin: '6px 0 0 0',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#d0cbb8',
                      }}
                    >
                      Fehler: {issue.message}
                    </p>
                  ))}
                  {qaResult.warnings.map((issue) => (
                    <p
                      key={`warn-${issue.code}-${issue.message}`}
                      style={{
                        margin: '6px 0 0 0',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: '#1a1a1a',
                      }}
                    >
                      Hinweis: {issue.message}
                    </p>
                  ))}
                  {autoFixFeedback && (
                    <p
                      style={{
                        margin: '8px 0 0 0',
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        color: '#d9d4c5',
                      }}
                    >
                      {autoFixFeedback}
                    </p>
                  )}
                </div>
              </div>
            )}
            {activePanel === 'engine' && (
              <div
                style={{
                  marginBottom: '0.1px',
                  padding: '10px',
                  border: '0.5px solid #1a1a1a',
                  borderRadius: '0 ',
                  backgroundColor: '#cfcbbc',
                }}
              >
                <div
                  className="rounded-[6px] border border-[#1a1a1a] overflow-hidden"
                  style={{ background: '#d0cbb8' }}
                >
                  <div className="px-[3px] py-[1.5px]  border-b 
                  border-[#1a1a1a] flex items-center  justify-between">
                    <span className="font-mono text-[11px] text-[#1a1a1a] tracking-wider uppercase">
                      ZenEngine Analyse
                    </span>
                    {qualityAnalysis && (
                      <span className="font-mono text-[12px]" style={{ color: qualityAnalysis.match_count > 3 ? '#c97a3a' : '#5a7a5a' }}>
                        {qualityAnalysis.match_count === 0 ? 'Keine Hinweise' : `${qualityAnalysis.match_count} Hinweis${qualityAnalysis.match_count !== 1 ? 'e' : ''}`}
                      </span>
                    )}
                  </div>
                  {engineSuggestions.length > 0 ? (
                    <div className="px-[3px] divide-y divide-[#3a3a2a]">
                      {engineSuggestions.slice(0, 8).map((s, i) => (
                          <div key={i} className="flex items-start gap-2 px-[3px] py-[1.5px]">
                            <span
                              className="font-mono text-[12px] mt-[0.5px] shrink-0"
                              style={{ color: s.confidence >= 0.9 ? '#c97a3a' : '#888860' }}
                            >
                              {Math.round(s.confidence * 100)}%
                            </span>
                            <span className="px-[3px] px-[3px] font-mono text-[12px] text-[#666]">
                              <span className="text-[#888]">{' · '}</span>
                              <span className="text-[#AC8E66]">
                                {s.rule.replace(/_/g, ' ')}
                              </span>
                              {s.count > 1 ? (
                                <span className="text-[#777]">{` (${s.count}x)`}</span>
                              ) : null}
                              {' — '}{s.suggestion}
                            </span>
                          </div>
                        ))}
                      {engineSuggestions.length > 8 && (
                        <div className="px-[3px] py-[1.5px] font-mono text-[9px] text-[#555]">
                          +{engineSuggestions.length - 8} weitere Hinweise
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="px-[3px] py-[2px] font-mono text-[9px] text-[#5a7a5a]">
                      Keine Stilprobleme gefunden.
                    </div>
                  )}
                </div>
              </div>
            )}
            {activePanel === 'thumbnail' && platformThumbnail && (
              <div
                style={{
                  marginBottom: '12px',
                  padding: '10px',
                  border: '0.5px solid #3a3a3a',
                  borderRadius: '10px',
                  backgroundColor: '#101010',
                }}
              >
                <div
                  className="rounded-[6px] border border-[#3a3a2a]/30 overflow-hidden"
                  style={{ background: 'rgba(172,142,102,0.04)' }}
                >
                  <div className="px-3 py-1.5 border-b border-[#3a3a2a]/20 flex items-center justify-between">
                    <span className="font-mono text-[9px] text-[#888] tracking-wider uppercase">
                      Thumbnail
                    </span>
                    <span className="font-mono text-[9px] text-[#555]">
                      {platformThumbnail.width}×{platformThumbnail.height}px · JPEG 85%
                    </span>
                  </div>
                  <div className="p-3">
                <img
                  src={platformThumbnail.dataUrl}
                  alt="Platform Thumbnail"
                  style={{ width: '100%', height: 'auto', borderRadius: '4px', display: 'block' }}
                />
                <button
                  type="button"
                  onClick={handleDownloadThumbnail}
                  className="inline-block mt-2 font-mono text-[9px] px-2 py-1 rounded border border-[#AC8E66]/50 text-[#AC8E66] no-underline hover:bg-[#AC8E66]/10 transition-colors"
                >
                  ↓ Download
                </button>
              </div>
            </div>
          </div>
        )}
            {currentContent && currentContent.trim() ? (
              <ZenMarkdownPreview
                content={highlightedPreviewContent}
                height="calc(100vh - 320px)"
                projectPath={projectPath}
                onContentChange={handleContentUpdate}
                showTextAI={showTextAI}
                onToggleTextAI={() => setShowTextAI((prev) => !prev)}
                isTextAIDisabled={isAIProcessing}
                autoHideReadingCursor={isIdle}
                collapseControlsByDefault
                previewTheme={activePreviewTheme}
                onPreviewThemeChange={onPreviewThemeChange}
                marginTop={editorSettings.marginTop}
                marginBottom={editorSettings.marginBottom}
                marginLeft={editorSettings.marginLeft}
                marginRight={editorSettings.marginRight}
                onMarginPresetChange={handleMarginPresetChange}
              />
            ) : (
              <div
                style={{
                  height: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1a1a1a',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  gap: '8px',
                  fontWeight: '200',
                  background : '#d0cbb8',
                  borderRadius: '12px'
                }}
              >
               
                <span>Schreibe was du denkst, nutze dafür einfach den Nachbearbeiten Tab.</span>
               
              </div>
            )}
          </div>
        </div>
        </div>{/* end outer flex row */}

        {/* Post Result Status */}
        {postResult && postResult.success && (
          <div
            style={{
              width: '100%',
              maxWidth: '42rem',
              marginBottom: '24px',
              padding: '8px 24px',
              borderRadius: '8px',
              border: '1px solid #16a34a',
              background: 'rgba(20,83,45,0.2)',
            }}
          >
            <div className="flex items-center gap-3">
              <FontAwesomeIcon
                icon={postResult.success ? faCheck : faRotateLeft}
                className={postResult.success ? 'text-green-500' : 'text-red-500'}
              />
              <div className="flex-1 flex items-center gap-2">
                <p
                  className={`font-mono text-sm ${
                    postResult.success ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {postResult.success
                    ? `Erfolgreich auf ${platformLabels[platform]} gepostet!`
                    : `Fehler beim Posten: ${postResult.error}`}
                </p>
                {!postResult.success && (
                  <button
                    onClick={() => onOpenSettings(postResult.platform)}
                    className="text-[#777] hover:text-[#AC8E66] transition-colors"
                    title="Social Media API konfigurieren"
                  >
                    <FontAwesomeIcon icon={faCog} className="text-lg" />
                  </button>
                )}
                {postResult.success && postResult.url && (
                  <a
                    href={postResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline ml-2"
                  >
                    Post öffnen →
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {!useHeaderActions && (
          <div
            className="flex flex-wrap gap-4 mb-8 justify-center"
            style={{ padding: "0.5rem 1.5rem" }}
          >
            <ZenRoughButton
              label="Export"
              icon={<FontAwesomeIcon icon={faDownload} className="text-[#AC8E66]" />}
              onClick={handleDownload}
            />

            <ZenRoughButton
              label="Planen"
              icon={<FontAwesomeIcon icon={faCalendarDays} className="text-[#AC8E66]" />}
              onClick={() => setShowPlannerModal(true)}
              variant="default"
            />
          </div>
        )}

      </div>

      {/* Planner Modal */}
      <ZenPlannerModal
        isOpen={showPlannerModal}
        onClose={() => setShowPlannerModal(false)}
        scheduledPosts={scheduledPosts}
        posts={socialPlatform ? [{
          platform: socialPlatform as any,
          title: currentContent.split('\n')[0]?.replace(/^#\s*/, '') || 'Untitled',
          content: currentContent,
          characterCount: currentContent.length,
          wordCount: currentContent.split(/\s+/).filter(Boolean).length,
        }] : []}
        onScheduleSave={(posts) => {
          setScheduledPosts(posts);
          setShowPlannerModal(false);
        }}
        defaultTab="planen"
      />

      {/* Posten Platform Selection Modal */}
      <ZenPostenModal
        isOpen={showPostenModal}
        onClose={() => setShowPostenModal(false)}
        onSelectPlatforms={handlePlatformSelection}
        currentPlatform={socialPlatform}
        initialSelectedPlatforms={selectedPostPlatforms.length > 0 ? selectedPostPlatforms : undefined}
      />

      {/* Posten Method Choice Modal */}
      <ZenPostMethodModal
        isOpen={showPostMethodModal}
        onClose={() => setShowPostMethodModal(false)}
        onDirectPost={handleMultiDirectPost}
        onAIOptimize={handleMultiAIOptimize}
        selectedPlatforms={selectedPostPlatforms}
      />
    </div>
  );
};
