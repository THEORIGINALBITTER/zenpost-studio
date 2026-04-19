import { useState, useEffect, useRef, useCallback, useMemo, type DragEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { faArrowRight, faFileUpload, faCheckCircle, faExternalLinkAlt, faInfoCircle, faCode, faAlignLeft, faFileLines, faSave, faMoon, faSun, faFolderOpen } from '@fortawesome/free-solid-svg-icons';
import { faApple, faLinkedin, faTwitter, faDev, faMedium, faReddit, faGithub, faHashnode } from '@fortawesome/free-brands-svg-icons';
import { useOpenExternal } from '../../hooks/useOpenExternal';
import { isTauri } from '@tauri-apps/api/core';
import { revealItemInDir } from '@tauri-apps/plugin-opener';

import { ZenRoughButton, ZenModal, ZenDropdown } from '../../kits/PatternKit/ZenModalSystem';
import { ZenModalHeader } from '../../kits/PatternKit/ZenModalSystem/components/ZenModalHeader';
import { ZenModalFooter } from '../../kits/PatternKit/ZenModalSystem/components/ZenModalFooter';
import { ZenBlockEditor } from '../../kits/PatternKit/ZenBlockEditor';
import { ZenMarkdownEditor } from '../../kits/PatternKit/ZenMarkdownEditor';
import { type PreviewThemeId } from '../../kits/PatternKit/ZenMarkdownPreview';
import { Step1StyleThemeQuickMenu } from './components/Step1StyleThemeQuickMenu';
import { importDocumentToMarkdown } from '../../services/documentImportService';
import { defaultEditorSettings, saveEditorSettings, type EditorSettings } from '../../services/editorSettingsService';
import type { ContentPlatform } from '../../services/aiService';
import { ZenThoughtLine } from '../../components/ZenThoughtLine';
import {
  saveImageToOpfs,
  EDITOR_IMAGE_MAX_FILE_SIZE_MB,
  isEditorImageOversized,
} from '../../utils/editorImageCompression';
import { canUploadToZenCloud, uploadCloudDocument, uploadCloudImageDataUrl } from '../../services/cloudStorageService';
import { loadZenStudioSettings } from '../../services/zenStudioSettingsService';
import { resolveImageMeta, saveImageMeta } from '../../services/imageMetaService';

// Platform display info for tabs
const PLATFORM_TAB_INFO: Record<ContentPlatform, { label: string; icon: any }> = {
  linkedin: { label: 'LinkedIn', icon: faLinkedin },
  twitter: { label: 'Twitter', icon: faTwitter },
  devto: { label: 'Dev.to', icon: faDev },
  medium: { label: 'Medium', icon: faMedium },
  reddit: { label: 'Reddit', icon: faReddit },
  'github-discussion': { label: 'GitHub', icon: faGithub },
  'github-blog': { label: 'GitHub Blog', icon: faGithub },
  youtube: { label: 'YouTube', icon: faGithub }, // No YouTube icon, use placeholder
  'blog-post': { label: 'Blog', icon: faHashnode },
};

interface Step1SourceInputProps {
  sourceContent: string;
  fileName: string;
  error: string | null;
  editorSettings?: EditorSettings;
  onSourceContentChange: (content: string) => void;
  onFileNameChange: (name: string) => void;
  onNext: () => void;
  onOpenMetadata?: () => void;
  onError?: (error: string) => void;
  onPreview?: (content?: string) => void;
  onSaveToProject?: (content?: string) => void;
  onSaveAsToProject?: (content?: string) => void;
  onSaveToServer?: (content?: string) => void;
  canSaveToProject?: boolean;
  canSaveToServer?: boolean;
  saveToServerLabel?: string;
  editTabs?: ContentPlatform[];
  activeEditTab?: ContentPlatform | null;
  onEditTabChange?: (platform: ContentPlatform) => void;
  cameFromEdit?: boolean; // Flag to show "Back to Posting" button
  onBackToPosting?: (content?: string) => void; // Callback to go directly to Step 4
  cameFromDocStudio?: boolean; // Flag to show "Back to Doc Studio" button
  onBackToDocStudio?: (editedContent?: string) => void; // Callback to go back to Doc Studio
  editorType?: "block" | "markdown"; // Editor type to use
  onEditorTypeChange?: (type: "block" | "markdown") => void; // Callback to change editor type
  showInlineActions?: boolean;
  onOpenConverter?: () => void;
  showDockedEditorToggle?: boolean;
  docTabs?: Array<{ id: string; title: string; kind: 'draft' | 'file' | 'article' | 'derived'; filePath?: string; displayPath?: string }>;
  activeDocTabId?: string | null;
  dirtyDocTabs?: Record<string, boolean>;
  onDocTabChange?: (tabId: string) => void;
  onCloseDocTab?: (tabId: string) => void;
  onNewDraft?: () => void;
  projectPath?: string | null;
  onRegisterLiveContentGetter?: (getter: (() => Promise<string>) | null) => void;
  comparisonBaseContent?: string;
  comparisonBaseLabel?: string;
  comparisonBaseOptions?: Array<{ id: string; label: string }>;
  comparisonBaseSelection?: string;
  onComparisonBaseChange?: (value: string) => void;
  onAdoptCurrentAsComparisonBase?: () => void;
  autosaveStatusText?: string | null;
  onOpenEditorSettings?: () => void;
  autosaveRestoreBanner?: import('../../services/editorSettingsService').DraftAutosaveRecord | null;
  onAutosaveBannerRestore?: () => void;
  onAutosaveBannerDismiss?: () => void;
  autosaveHistory?: import('../../services/editorSettingsService').DraftAutosaveRecord[];
  onAutosaveHistoryRestore?: (record: import('../../services/editorSettingsService').DraftAutosaveRecord) => void;
  onAutosaveHistoryCompare?: (record: import('../../services/editorSettingsService').DraftAutosaveRecord) => void;
  zenThoughts?: string[];
  showZenThoughtInHeader?: boolean;
  postMeta?: {
    title: string;
    subtitle: string;
    imageUrl: string;
    date: string;
    tags: string[];
    imageAlt: string;
    imageTitle: string;
    imageCaption: string;
  };
  onMetaChange?: (meta: {
    title: string;
    subtitle: string;
    imageUrl: string;
    date: string;
    tags: string[];
    imageAlt: string;
    imageTitle: string;
    imageCaption: string;
  }) => void;
  analysisKeywords?: string[];
  onAnalysisKeywordsChange?: (keywords: string[]) => void;
  previewTheme?: PreviewThemeId;
  onPreviewThemeChange?: (theme: PreviewThemeId) => void;
}

type LineDiffRow = {
  left: string;
  right: string;
  status: 'same' | 'added' | 'removed' | 'modified';
};



const EXTERNAL_DOCS_URL =
  "https://zenpostdocs.denisbitter.de/workflows/pages-export.html";

const ZenRoughCircle = ({ number }: { number: number }) => {
  const size = 40;

  return (
    <div className="flex-shrink-0" style={{ position: 'relative', width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="rgba(172, 142, 102, 0.1)"
          stroke="#AC8E66"
          strokeWidth="5"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span className="font-mono text-[#AC8E66] font-bold text-sm">
          {number}
        </span>
      </div>
    </div>
  );
};




// Configurable Step Item Component
interface ZenStepItemProps {
  number: number;
  title: string;
  description: string;
  icon: any;
  index: number;
  // Konfigurierbare Optionen
  titleSize?: string;
  descriptionSize?: string;
  iconSize?: string;
  gap?: number; // Abstand zwischen Circle und Content
  titleIconGap?: number; // Abstand zwischen Icon und Titel
  titleDescriptionGap?: number; // Abstand zwischen Titel und Description
}

const ZenStepItem = ({
  number,
  title,
  description,
  icon,
  index,
  titleSize = '16px',
  descriptionSize = '14px',
  iconSize = '14px',
  gap = 16,
  titleIconGap = 8,
  titleDescriptionGap = 8,
}: ZenStepItemProps) => {
  return (
    <div
      className="flex opacity-0 animate-fade-in"
      style={{
        animationDelay: `${index * 100}ms`,
        gap: `${gap}px`,
      }}
    >
      {/* Step Number with Rough Circle */}
      <ZenRoughCircle number={number} />

      {/* Step Content */}
      <div className="flex-1" style={{ paddingTop: 4 }}>
        <h3
          className="font-mono text-[#e5e5e5] flex items-center"
          style={{
            fontSize: titleSize,
            gap: `${titleIconGap}px`,
            marginBottom: `${titleDescriptionGap}px`,
          }}
        >
          <FontAwesomeIcon
            icon={icon}
            className="text-[#AC8E66]"
                style={{
      fontSize: iconSize,
      marginTop: '-15px',   // <— sorgt für perfekte vertikale Mitte
    }}
          />
          {title}
        </h3>
        <p
          className="font-mono text-[#999] leading-relaxed"
          style={{ fontSize: descriptionSize }}
        >
          {description}
        </p>
      </div>
    </div>
  );
};

const RotatedTab = ({
  onClick,
  disabled,
  style,
  label,
  hoverLabel,
  color,
  title,
}: {
  onClick: () => void;
  disabled?: boolean;
  style: React.CSSProperties;
  label: string;
  hoverLabel: string;
  color: string;
  title?: string;
}) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="lg:flex"
      style={{
        position: 'absolute',
        transformOrigin: 'left top',
        padding: '10px 10px',
        borderRadius: '8px 8px 0px 0px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '10px',
        color,
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
        zIndex: 1,
        overflow: 'hidden',
        minWidth: '80px',
        transition: 'background 0.2s ease',
        ...style,
      }}
    >
      {/* Fade-swap: label ↔ hoverLabel */}
      <span style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: hovered ? 0 : 1,
        transition: 'opacity 0.18s ease',
        padding: '0 10px',
      }}>
        {label}
      </span>
      <span style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: hovered ? 1 : 0,
        color: disabled ? color : '#d0cbb8',
      
        transition: 'opacity 0.18s ease',
        padding: '0 10px',
      }}>
        {hoverLabel}
      </span>
      {/* Invisible spacer to maintain button size */}
      <span style={{ visibility: 'hidden' }}>{label.length > hoverLabel.length ? label : hoverLabel}</span>
    </button>
  );
};

export const Step1SourceInput = ({
  sourceContent,
  fileName: _fileName,
  error,
  editorSettings,
  onSourceContentChange,
  onFileNameChange,
  onNext,
  onOpenMetadata: _onOpenMetadata,
  onError,
  onPreview,
  onSaveToProject,
  onSaveAsToProject,
  onSaveToServer,
  canSaveToProject = false,
  canSaveToServer = false,
  saveToServerLabel,
  editTabs = [],
  activeEditTab = null,
  onEditTabChange,
  cameFromEdit: _cameFromEdit = false,
  onBackToPosting: _onBackToPosting,
  cameFromDocStudio: _cameFromDocStudio = false,
  onBackToDocStudio: _onBackToDocStudio,
  editorType = "block",
  onEditorTypeChange,
  showInlineActions = true,
  onOpenConverter,
  showDockedEditorToggle = false,
  docTabs = [],
  activeDocTabId = null,
  dirtyDocTabs = {},
  onDocTabChange,
  onCloseDocTab,
  onNewDraft,
  projectPath,
  onRegisterLiveContentGetter,
  comparisonBaseContent = '',
  comparisonBaseLabel = 'Basis',
  comparisonBaseOptions = [],
  comparisonBaseSelection,
  onComparisonBaseChange,
  onAdoptCurrentAsComparisonBase,
  autosaveStatusText,
  onOpenEditorSettings,
  autosaveRestoreBanner = null,
  onAutosaveBannerRestore,
  onAutosaveBannerDismiss,
  autosaveHistory = [],
  onAutosaveHistoryRestore,
  onAutosaveHistoryCompare,
  zenThoughts = [],
  showZenThoughtInHeader = false,
  postMeta,
  onMetaChange,
  analysisKeywords = [],
  onAnalysisKeywordsChange,
  previewTheme = 'mono-clean',
  onPreviewThemeChange,
}: Step1SourceInputProps) => {
  const { openExternal } = useOpenExternal();
  const [_isConverting, setIsConverting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isImageDragActive, setIsImageDragActive] = useState(false);
  const [isMetaImageDragActive, setIsMetaImageDragActive] = useState(false);
  const blockImageInserterRef = useRef<((images: Array<{ url: string; alt?: string }>) => void) | null>(null);
  const [showPagesHelp, setShowPagesHelp] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [showComparison, setShowComparison] = useState(false);
  const latestContentRef = useRef(sourceContent);
  const editorSnapshotGetterRef = useRef<(() => Promise<string>) | null>(null);

  useEffect(() => {
    latestContentRef.current = sourceContent;
  }, [sourceContent]);

  const emitSourceContentChange = (content: string) => {
    latestContentRef.current = content;
    onSourceContentChange(content);
  };

  const resolveLiveContent = useCallback(async (): Promise<string> => {
    const getter = editorSnapshotGetterRef.current;
    if (!getter) return latestContentRef.current;
    try {
      const snapshot = await getter();
      if (typeof snapshot === 'string') {
        if (snapshot !== latestContentRef.current) {
          latestContentRef.current = snapshot;
          onSourceContentChange(snapshot);
        }
        return snapshot;
      }
    } catch {
      // fallback to latest ref
    }
    return latestContentRef.current;
  }, [onSourceContentChange]);

  useEffect(() => {
    onRegisterLiveContentGetter?.(resolveLiveContent);
    return () => onRegisterLiveContentGetter?.(null);
  }, [onRegisterLiveContentGetter, resolveLiveContent]);

  useEffect(() => {
    if (editorType !== 'block') {
      editorSnapshotGetterRef.current = null;
    }
  }, [editorType]);


  const [showOutline, setShowOutline] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  const [showStyleThemes, setShowStyleThemes] = useState(false);
  const [editorToggleHovered, setEditorToggleHovered] = useState(false);
  const [outlineFocusRequest, setOutlineFocusRequest] = useState<{ line: number; token: number } | null>(null);
  const [outlineBlockFocusRequest, setOutlineBlockFocusRequest] = useState<{ headingIndex: number; token: number } | null>(null);
  const [blockHeadingRequest, setBlockHeadingRequest] = useState<{ level: number; token: number } | null>(null);
  const [activeCursorLine, setActiveCursorLine] = useState<number>(0);
  const hasDerivedDocTabs = docTabs.some((tab) => tab.kind === 'derived');
  const currentMetaImageUrl = (postMeta?.imageUrl ?? '').trim();
  const cloudImageUploadEnabled = canUploadToZenCloud();
  const metaImageIsInlineData = /^data:image\//i.test(currentMetaImageUrl);
  const metaImageIsBlob = /^blob:/i.test(currentMetaImageUrl);
  const metaImageInvalidForServer = metaImageIsInlineData || metaImageIsBlob;

  // Blob URL für lokale Bild-Vorschau (Tauri: readFile statt convertFileSrc)
  const [metaImageBlobUrl, setMetaImageBlobUrl] = useState<string | null>(null);
  const metaImageBlobUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const isLocalPath = /^(file:\/\/|\/|[a-zA-Z]:[\\/])/i.test(currentMetaImageUrl);
    if (!isTauri() || !isLocalPath) {
      if (metaImageBlobUrlRef.current) { URL.revokeObjectURL(metaImageBlobUrlRef.current); metaImageBlobUrlRef.current = null; }
      setMetaImageBlobUrl(null);
      return;
    }
    let cancelled = false;
    const filePath = currentMetaImageUrl.replace(/^file:\/\//i, '');
    import('@tauri-apps/plugin-fs').then(({ readFile }) => readFile(filePath)).then((bytes) => {
      if (cancelled) return;
      const ext = filePath.split('.').pop()?.toLowerCase() ?? 'png';
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/png';
      const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
      if (metaImageBlobUrlRef.current) URL.revokeObjectURL(metaImageBlobUrlRef.current);
      metaImageBlobUrlRef.current = url;
      setMetaImageBlobUrl(url);
    }).catch(() => { if (!cancelled) setMetaImageBlobUrl(null); });
    return () => { cancelled = true; };
  }, [currentMetaImageUrl]);
  const contentDiagnostics = useMemo(() => {
    const raw = sourceContent ?? '';
    const byteSize = new TextEncoder().encode(raw).length;
    const inlineDataImageCount = (raw.match(/data:image\/[a-zA-Z0-9.+-]+;base64,/gi) ?? []).length;
    const approxMb = byteSize / (1024 * 1024);
    const approxKb = byteSize / 1024;
    return {
      byteSize,
      inlineDataImageCount,
      formattedSize: approxMb >= 1
        ? `${approxMb.toFixed(2)} MB`
        : `${approxKb.toFixed(1)} KB`,
      isHeavy: approxMb >= 1 || inlineDataImageCount >= 1,
    };
  }, [sourceContent]);
  const modifierKeyLabel = useMemo(() => {
    if (typeof window === 'undefined') return 'Cmd/Ctrl';
    return /Mac|iPhone|iPad|iPod/.test(window.navigator.platform) ? 'Cmd' : 'Ctrl';
  }, []);
  const canUseComparison = comparisonBaseOptions.length > 0;
  const toggleOutlinePanel = () => {
    setShowOutline((prev) => {
      const next = !prev;
      if (next) setShowComparison(false);
      return next;
    });
  };
  const toggleComparisonPanel = () => {
    if (!canUseComparison) return;
    setShowComparison((prev) => {
      const next = !prev;
      if (next) setShowOutline(false);
      return next;
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowOutline(false);
        setShowMeta(false);
      }

      const isToggleOutlineShortcut =
        (e.metaKey || e.ctrlKey) &&
        (e.key.toLowerCase() === "g" || e.code === "KeyG");
      if (isToggleOutlineShortcut) {
        e.preventDefault();
        e.stopPropagation();
        toggleOutlinePanel();
        return;
      }

      const isSaveShortcut =
        (e.metaKey || e.ctrlKey) &&
        (e.key.toLowerCase() === "s" || e.code === "KeyS");
      if (isSaveShortcut) {
        e.preventDefault();
        e.stopPropagation();
        if (!canSaveToProject) return;
        void (async () => {
          const content = await resolveLiveContent();
          if (e.shiftKey) {
            onSaveAsToProject?.(content);
            return;
          }
          onSaveToProject?.(content);
        })();
        return;
      }

      const isCloseTabShortcut =
        (e.metaKey || e.ctrlKey) &&
        (e.key.toLowerCase() === "w" || e.code === "KeyW");
      if (isCloseTabShortcut) {
        if (!activeDocTabId || !onCloseDocTab) return;
        e.preventDefault();
        e.stopPropagation();
        onCloseDocTab(activeDocTabId);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [activeDocTabId, canSaveToProject, onCloseDocTab, onSaveAsToProject, onSaveToProject, resolveLiveContent, toggleOutlinePanel]);




  

  const updateQuickEditorSettings = useCallback((patch: Partial<EditorSettings>) => {
    if (typeof window === 'undefined') return;
    const nextSettings = {
      ...defaultEditorSettings,
      ...editorSettings,
      ...patch,
    };
    localStorage.setItem('zenpost_editor_settings', JSON.stringify(nextSettings));
    window.dispatchEvent(
      new CustomEvent('zen-editor-settings-updated', { detail: nextSettings })
    );
    if (projectPath && isTauri()) {
      void saveEditorSettings(projectPath, nextSettings).catch((error) => {
        console.warn('[Step1SourceInput] Quick settings save failed:', error);
      });
    }
  }, [editorSettings, projectPath]);

  const updateEditorTheme = (nextTheme: 'dark' | 'light') => {
    updateQuickEditorSettings({ theme: nextTheme });
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    onFileNameChange(file.name);
    setIsConverting(true);
    try {
      const result = await importDocumentToMarkdown(file, {
        convertCode: true,
        fallbackToRawOnConvertError: true,
        allowJsonPrettyFallback: true,
        requireNonEmpty: false,
      });

      if (result.success) {
        emitSourceContentChange(result.content);
        onError?.('');
        return;
      }

      onError?.(result.error || 'Konvertierung fehlgeschlagen');
    } catch (err) {
      console.error('Document conversion failed:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      onError?.(`Konvertierung fehlgeschlagen: ${errorMsg}`);
    } finally {
      setIsConverting(false);
    }
  };

  const MAX_IMAGE_DROP_FILES = 4;

  const isImageFile = (file: File) =>
    file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(file.name);
  const sanitizeFileStem = (name: string) =>
    name
      .replace(/\.[^/.]+$/, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'image';

  const isImagePath = (inputPath: string) => /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(inputPath);

  const normalizeDroppedPath = (rawPath: string): string => {
    const trimmed = rawPath.trim();
    if (!trimmed) return '';
    const withoutBrackets = trimmed.replace(/^<|>$/g, '');
    if (withoutBrackets.startsWith('file://')) {
      const fileUrlPath = withoutBrackets.replace(/^file:\/\//, '');
      return decodeURIComponent(fileUrlPath);
    }
    return withoutBrackets;
  };

  const handleImageDrop = async (files: FileList | File[]): Promise<boolean> => {
    const imageFiles = Array.from(files).filter(isImageFile);
    if (imageFiles.length === 0) return false;

    const limitedFiles = imageFiles.slice(0, MAX_IMAGE_DROP_FILES);
    const oversized = limitedFiles.find((file) => isEditorImageOversized(file));
    if (oversized) {
      onError?.(
        `Bild zu groß: ${oversized.name} ist größer als ${EDITOR_IMAGE_MAX_FILE_SIZE_MB}MB.`
      );
      return true;
    }

    setIsConverting(true);
    try {
      const markdownImageLines: string[] = [];
      const blockImages: Array<{ url: string; alt?: string }> = [];

      // ZenCloud verbunden: Bilder immer als Cloud-Asset speichern, nicht inline/local
      if (canUploadToZenCloud()) {
        for (const imageFile of limitedFiles) {
          const safeStem = sanitizeFileStem(imageFile.name);
          const uploaded = await uploadCloudDocument(imageFile);
          if (uploaded?.url) {
            if (editorType === 'block' && blockImageInserterRef.current) {
              blockImages.push({ url: uploaded.url, alt: safeStem });
            } else {
              markdownImageLines.push(`![${safeStem}](${uploaded.url})`);
            }
          }
        }
        if (blockImages.length === 0 && markdownImageLines.length === 0) {
          onError?.('Cloud Upload fehlgeschlagen.');
        }
      } else if (isTauri()) {
        // Tauri lokales Projekt: Datei auf Disk schreiben → absoluter Pfad
        const { writeFile, mkdir } = await import('@tauri-apps/plugin-fs');
        let imagesDir: string;
        if (projectPath) {
          const { dirname } = await import('@tauri-apps/api/path');
          imagesDir = `${await dirname(projectPath)}/_assets`;
        } else {
          const { documentDir } = await import('@tauri-apps/api/path');
          imagesDir = `${await documentDir()}/zenpost-images`;
        }
        await mkdir(imagesDir, { recursive: true });
        for (const imageFile of limitedFiles) {
          const safeStem = sanitizeFileStem(imageFile.name);
          const safeName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const filePath = `${imagesDir}/${Date.now()}-${safeName}`;
          await writeFile(filePath, new Uint8Array(await imageFile.arrayBuffer()));
          if (editorType === 'block' && blockImageInserterRef.current) {
            blockImages.push({ url: filePath, alt: safeStem });
          } else {
            markdownImageLines.push(`![${safeStem}](${filePath})`);
          }
        }
      } else {
        // Web lokales Projekt: OPFS
        for (const imageFile of limitedFiles) {
          const safeStem = sanitizeFileStem(imageFile.name);
          const opfsPath = await saveImageToOpfs(imageFile);
          if (editorType === 'block' && blockImageInserterRef.current) {
            blockImages.push({ url: opfsPath, alt: safeStem });
          } else {
            markdownImageLines.push(`![${safeStem}](${opfsPath})`);
          }
        }
      }

      if (editorType === 'block' && blockImageInserterRef.current && blockImages.length > 0) {
        blockImageInserterRef.current(blockImages);
        onError?.('');
        return true;
      }

      const current = await resolveLiveContent();
      const trimmedCurrent = current.trimEnd();
      const imageMarkdown = markdownImageLines.join('\n\n');
      const nextContent = trimmedCurrent
        ? `${trimmedCurrent}\n\n${imageMarkdown}\n`
        : `${imageMarkdown}\n`;

      emitSourceContentChange(nextContent);
    } catch (error) {
      console.error('Image drop handling failed:', error);
      onError?.('Bilder konnten nicht verarbeitet werden.');
    } finally {
      setIsConverting(false);
    }

    return true;
  };

  const handleImagePathDrop = useCallback(async (paths: string[]): Promise<boolean> => {
    const normalized = paths
      .map(normalizeDroppedPath)
      .filter((path) => path.length > 0)
      .filter(isImagePath)
      .slice(0, MAX_IMAGE_DROP_FILES);
    if (normalized.length === 0) return false;

    setIsConverting(true);
    try {
      const markdownImageLines: string[] = [];
      const blockImages: Array<{ url: string; alt?: string }> = [];

      if (canUploadToZenCloud()) {
        // ZenCloud verbunden: Datei einlesen und als Cloud-Asset hochladen
        const { readFile } = await import('@tauri-apps/plugin-fs');
        for (const sourcePath of normalized) {
          const sourceName = sourcePath.split('/').pop()?.split('\\').pop() || 'image';
          const safeStem = sanitizeFileStem(sourceName);
          try {
            const bytes = await readFile(sourcePath);
            const ext = sourceName.split('.').pop()?.toLowerCase() ?? 'jpg';
            const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
            const file = new File([bytes], sourceName, { type: mime });
            const uploaded = await uploadCloudDocument(file);
            if (uploaded?.url) {
              if (editorType === 'block' && blockImageInserterRef.current) {
                blockImages.push({ url: uploaded.url, alt: safeStem });
              } else {
                markdownImageLines.push(`![${safeStem}](${uploaded.url})`);
              }
            }
          } catch { /* einzelnes Bild überspringen */ }
        }
      } else {
        // Lokales Projekt: roher Pfad (Tauri konvertiert zu asset:// beim Rendern)
        for (const sourcePath of normalized) {
          const sourceName = sourcePath.split('/').pop()?.split('\\').pop() || 'image';
          const safeStem = sanitizeFileStem(sourceName);
          if (editorType === 'block' && blockImageInserterRef.current) {
            blockImages.push({ url: sourcePath, alt: safeStem });
          } else {
            markdownImageLines.push(`![${safeStem}](${sourcePath})`);
          }
        }
      }

      if (editorType === 'block' && blockImageInserterRef.current && blockImages.length > 0) {
        blockImageInserterRef.current(blockImages);
        onError?.('');
        return true;
      }

      const current = await resolveLiveContent();
      const trimmedCurrent = current.trimEnd();
      const imageMarkdown = markdownImageLines.join('\n\n');
      const nextContent = trimmedCurrent
        ? `${trimmedCurrent}\n\n${imageMarkdown}\n`
        : `${imageMarkdown}\n`;
      emitSourceContentChange(nextContent);
      onError?.('');
    } catch (error) {
      console.error('Image path drop handling failed:', error);
      onError?.('Bildpfad konnte nicht verarbeitet werden.');
    } finally {
      setIsConverting(false);
    }

    return true;
  }, [editorType, onError, projectPath, resolveLiveContent]);

  const dragContainsImages = (event: DragEvent<HTMLElement>) => {
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer) return false;

    // items prüfen: in den meisten Browsern während dragover verfügbar
    if (dataTransfer.items && dataTransfer.items.length > 0) {
      const hasImage = Array.from(dataTransfer.items).some((item) => {
        if (item.type.startsWith('image/')) return true;
        if (item.kind === 'file') {
          const file = item.getAsFile();
          // file ist null in WKWebView/Tauri während dragover (Security) → optimistisch akzeptieren
          return !file || isImageFile(file);
        }
        return false;
      });
      if (hasImage) return true;
    }

    // files prüfen: in Chrome während dragover direkt zugänglich
    if (dataTransfer.files && dataTransfer.files.length > 0) {
      return Array.from(dataTransfer.files).some(isImageFile);
    }

    // Fallback: wenn 'Files' im types-Array steht aber files noch nicht zugänglich sind (Tauri/WebKit dragover)
    return Array.from(dataTransfer.types || []).includes('Files');
  };

  const extractImagePathsFromDataTransfer = (event: DragEvent<HTMLElement>): string[] => {
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer) return [];
    const uriListRaw = dataTransfer.getData('text/uri-list');
    const textRaw = dataTransfer.getData('text/plain');
    const candidates = `${uriListRaw}\n${textRaw}`
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
    return candidates.map(normalizeDroppedPath).filter(isImagePath);
  };

  const EMPTY_META = {
    title: '',
    subtitle: '',
    imageUrl: '',
    date: '',
    tags: [] as string[],
    imageAlt: '',
    imageTitle: '',
    imageCaption: '',
  };

  const updatePostMetaField = useCallback((field: 'title' | 'subtitle' | 'imageUrl' | 'date' | 'imageAlt' | 'imageTitle' | 'imageCaption', value: string) => {
    onMetaChange?.({ ...(postMeta ?? EMPTY_META), [field]: value });
  }, [onMetaChange, postMeta]);

  const updatePostMetaTags = useCallback((tags: string[]) => {
    onMetaChange?.({ ...(postMeta ?? EMPTY_META), tags });
  }, [onMetaChange, postMeta]);

  const applyImageMetaForUrl = useCallback((imageUrl: string, fileNameHint?: string) => {
    const trimmedUrl = imageUrl.trim();
    if (!trimmedUrl) return;
    const resolved = resolveImageMeta({ url: trimmedUrl, fileName: fileNameHint });
    const current = postMeta ?? EMPTY_META;
    const nextMeta = {
      ...current,
      imageUrl: trimmedUrl,
      imageTitle: current.imageTitle?.trim() ? current.imageTitle : resolved.title,
      imageAlt: current.imageAlt?.trim() ? current.imageAlt : resolved.altText,
      imageCaption: current.imageCaption?.trim() ? current.imageCaption : resolved.caption,
    };
    onMetaChange?.(nextMeta);
    saveImageMeta(
      { url: trimmedUrl, fileName: fileNameHint },
      {
        title: nextMeta.imageTitle ?? '',
        altText: nextMeta.imageAlt ?? '',
        caption: nextMeta.imageCaption ?? '',
        tags: nextMeta.tags ?? [],
      }
    );
  }, [onMetaChange, postMeta]);

  const commitMetaImageUrl = useCallback(async (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      updatePostMetaField('imageUrl', '');
      return;
    }

    if (!cloudImageUploadEnabled) {
      applyImageMetaForUrl(trimmed);
      return;
    }

    if (/^https?:\/\//i.test(trimmed)) {
      applyImageMetaForUrl(trimmed);
      return;
    }

    try {
      if (/^data:image\//i.test(trimmed)) {
        const uploaded = await uploadCloudImageDataUrl(trimmed, 'meta-cover.jpg');
        if (uploaded?.url) {
          applyImageMetaForUrl(uploaded.url, 'meta-cover.jpg');
          onError?.('');
          return;
        }
      }

      if (/^blob:/i.test(trimmed)) {
        const response = await fetch(trimmed);
        const blob = await response.blob();
        const uploaded = await uploadCloudDocument(new File([blob], 'meta-cover.jpg', { type: blob.type || 'image/jpeg' }));
        if (uploaded?.url) {
          applyImageMetaForUrl(uploaded.url, 'meta-cover.jpg');
          onError?.('');
          return;
        }
      }

      if (isTauri() && (isImagePath(trimmed) || trimmed.startsWith('file://') || /^(\/|[a-zA-Z]:[\\/])/.test(trimmed))) {
        const { readFile } = await import('@tauri-apps/plugin-fs');
        const normalizedPath = normalizeDroppedPath(trimmed);
        const sourceName = normalizedPath.split('/').pop()?.split('\\').pop() || 'meta-cover.jpg';
        const bytes = await readFile(normalizedPath);
        const ext = sourceName.split('.').pop()?.toLowerCase() ?? 'jpg';
        const mime = ext === 'png'
          ? 'image/png'
          : ext === 'svg'
            ? 'image/svg+xml'
            : ext === 'webp'
              ? 'image/webp'
              : ext === 'gif'
                ? 'image/gif'
                : 'image/jpeg';
        const uploaded = await uploadCloudDocument(new File([bytes], sourceName, { type: mime }));
        if (uploaded?.url) {
          applyImageMetaForUrl(uploaded.url, sourceName);
          onError?.('');
          return;
        }
      }

      applyImageMetaForUrl(trimmed);
    } catch (error) {
      console.error('Meta image input commit failed:', error);
      applyImageMetaForUrl(trimmed);
      onError?.('Bild konnte nicht in ZenCloud hochgeladen werden. Eingabe wurde unverändert übernommen.');
    }
  }, [applyImageMetaForUrl, cloudImageUploadEnabled, onError, updatePostMetaField]);

  const extractDroppedImageUrl = (event: DragEvent<HTMLElement>): string => {
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer) return '';

    const uriListRaw = dataTransfer.getData('text/uri-list');
    const textRaw = dataTransfer.getData('text/plain');
    const candidates = `${uriListRaw}\n${textRaw}`
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map(normalizeDroppedPath);

    const directUrl = candidates.find((candidate) => /^https?:\/\//i.test(candidate));
    if (directUrl) return directUrl;

    const imagePath = candidates.find(isImagePath);
    if (imagePath) return imagePath;

    return '';
  };

  const handleMetaImageDrop = useCallback(async (event: DragEvent<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsMetaImageDragActive(false);

    const imageFiles = Array.from(event.dataTransfer?.files ?? []).filter(isImageFile);
    if (imageFiles.length > 0) {
      const firstImage = imageFiles[0];
      if (isEditorImageOversized(firstImage)) {
        onError?.(`Bild zu groß: ${firstImage.name} ist größer als ${EDITOR_IMAGE_MAX_FILE_SIZE_MB}MB.`);
        return;
      }
      try {
        let imageUrl: string;
        if (cloudImageUploadEnabled) {
          const uploaded = await uploadCloudDocument(firstImage);
          if (!uploaded?.url) {
            throw new Error('Cloud Upload fehlgeschlagen');
          }
          imageUrl = uploaded.url;
        } else if (isTauri()) {
          // Tauri: save to _assets/ folder next to doc (same as editor) — no base64
          const { writeFile, mkdir } = await import('@tauri-apps/plugin-fs');
          let imagesDir: string;
          if (projectPath) {
            const { dirname } = await import('@tauri-apps/api/path');
            imagesDir = `${await dirname(projectPath)}/_assets`;
          } else {
            const { documentDir } = await import('@tauri-apps/api/path');
            imagesDir = `${await documentDir()}/zenpost-images`;
          }
          await mkdir(imagesDir, { recursive: true });
          const safeName = firstImage.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const filePath = `${imagesDir}/${Date.now()}-${safeName}`;
          await writeFile(filePath, new Uint8Array(await firstImage.arrayBuffer()));
          imageUrl = filePath;
        } else {
          imageUrl = await saveImageToOpfs(firstImage);
        }
        applyImageMetaForUrl(imageUrl, firstImage.name);
        onError?.('');
        return;
      } catch (error) {
        console.error('Meta image drop handling failed:', error);
        onError?.('Bild konnte nicht als URL übernommen werden.');
        return;
      }
    }

    const droppedUrl = extractDroppedImageUrl(event);
    if (droppedUrl) {
      if (cloudImageUploadEnabled && isTauri() && isImagePath(droppedUrl)) {
        try {
          const { readFile } = await import('@tauri-apps/plugin-fs');
          const sourceName = droppedUrl.split('/').pop()?.split('\\').pop() || 'image';
          const bytes = await readFile(droppedUrl);
          const ext = sourceName.split('.').pop()?.toLowerCase() ?? 'jpg';
          const mime = ext === 'png'
            ? 'image/png'
            : ext === 'svg'
              ? 'image/svg+xml'
              : ext === 'webp'
                ? 'image/webp'
                : ext === 'gif'
                  ? 'image/gif'
                  : 'image/jpeg';
          const uploaded = await uploadCloudDocument(new File([bytes], sourceName, { type: mime }));
          if (uploaded?.url) {
            applyImageMetaForUrl(uploaded.url, sourceName);
            onError?.('');
            return;
          }
        } catch (error) {
          console.error('Meta image cloud path upload failed:', error);
        }
      }
      applyImageMetaForUrl(droppedUrl);
      onError?.('');
      return;
    }

    onError?.('Nur Bilddateien oder Bild-URLs sind für Bild-URL erlaubt.');
  }, [applyImageMetaForUrl, cloudImageUploadEnabled, onError, projectPath, updatePostMetaField]);

  useEffect(() => {
    const imageUrl = (postMeta?.imageUrl ?? '').trim();
    if (!imageUrl) return;
    const fileNameHint = (() => {
      const noQuery = imageUrl.split('?')[0];
      const segment = noQuery.split('/').pop() ?? '';
      return segment || undefined;
    })();
    saveImageMeta(
      { url: imageUrl, fileName: fileNameHint },
      {
        title: postMeta?.imageTitle ?? '',
        altText: postMeta?.imageAlt ?? '',
        caption: postMeta?.imageCaption ?? '',
        tags: postMeta?.tags ?? [],
      }
    );
  }, [postMeta?.imageAlt, postMeta?.imageCaption, postMeta?.imageTitle, postMeta?.imageUrl]);

  // Get active doc tab info
  const activeDocTab = docTabs.find((tab) => tab.id === activeDocTabId);

  // Extract title from content if it starts with a markdown heading
  const extractTitleFromContent = (content: string): string | null => {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  };

  const contentTitle = extractTitleFromContent(sourceContent);
  const displayFileName = activeDocTab?.title || contentTitle || (sourceContent ? 'Dokument' : 'Neues Dokument');
  const displayPath = (() => {
    if (activeDocTab?.displayPath) {
      const dp = activeDocTab.displayPath;
      if (dp.startsWith('@cloud:')) {
        const cloudName = loadZenStudioSettings().cloudProjectName;
        const slash = dp.indexOf('/');
        const docPart = slash >= 0 ? dp.slice(slash + 1) : null;
        return cloudName
          ? (docPart ? `@ZenCloud // ${cloudName} / ${docPart}` : `@cloud: ${cloudName}`)
          : dp;
      }
      return dp;
    }
    if (projectPath?.startsWith('@cloud:')) {
      const cloudName = loadZenStudioSettings().cloudProjectName;
      return cloudName ? `@ZenCloud // ${cloudName} / ${displayFileName}` : `@cloud: ${displayFileName}`;
    }
    return projectPath ? `${projectPath}/${displayFileName}` : displayFileName;
  })();
  const revealPath = activeDocTab?.filePath || (projectPath && !projectPath.startsWith('@') ? projectPath : null);
  const showTitleHeader = docTabs.length > 0 || (sourceContent && sourceContent.trim().length > 0);
  const comparisonRows = useMemo<LineDiffRow[]>(() => {
    if (comparisonBaseContent === undefined) return [];
    const leftLines = comparisonBaseContent.split('\n');
    const rightLines = sourceContent.split('\n');
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

    const rows: LineDiffRow[] = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (leftLines[i] === rightLines[j]) {
        rows.push({ left: leftLines[i], right: rightLines[j], status: 'same' });
        i += 1;
        j += 1;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        rows.push({ left: leftLines[i], right: '', status: 'removed' });
        i += 1;
      } else {
        rows.push({ left: '', right: rightLines[j], status: 'added' });
        j += 1;
      }
    }
    while (i < n) {
      rows.push({ left: leftLines[i], right: '', status: 'removed' });
      i += 1;
    }
    while (j < m) {
      rows.push({ left: '', right: rightLines[j], status: 'added' });
      j += 1;
    }
    // GitHub-style: pair consecutive removed/added blocks side-by-side
    const mergedRows: LineDiffRow[] = [];
    let idx = 0;
    while (idx < rows.length) {
      const current = rows[idx];
      if (current.status === 'same') {
        mergedRows.push(current);
        idx += 1;
        continue;
      }
      // Collect the full block of consecutive removed + added lines
      const removed: string[] = [];
      const added: string[] = [];
      let k = idx;
      while (k < rows.length && (rows[k].status === 'removed' || rows[k].status === 'added')) {
        if (rows[k].status === 'removed') removed.push(rows[k].left);
        else added.push(rows[k].right);
        k += 1;
      }
      // Pair them side-by-side
      const pairCount = Math.max(removed.length, added.length);
      for (let p = 0; p < pairCount; p += 1) {
        const l = removed[p] ?? '';
        const r = added[p] ?? '';
        if (l && r) {
          mergedRows.push({ left: l, right: r, status: 'modified' });
        } else if (l) {
          mergedRows.push({ left: l, right: '', status: 'removed' });
        } else {
          mergedRows.push({ left: '', right: r, status: 'added' });
        }
      }
      idx = k;
    }

    return mergedRows;
  }, [comparisonBaseContent, sourceContent]);

  useEffect(() => {
    if (!canUseComparison && showComparison) {
      setShowComparison(false);
    }
  }, [canUseComparison, showComparison]);

  const extractOutline = (content: string) => {
    const lines = content.split('\n');
    const items: Array<{ level: number; text: string; line: number }> = [];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        items.push({ level: match[1].length, text: match[2].trim(), line: index });
      }
    }
    return items;
  };

  const outlineItems = extractOutline(sourceContent);
  const activeOutlineLine =
    outlineItems
      .filter((item) => item.line <= activeCursorLine)
      .map((item) => item.line)
      .pop() ?? outlineItems[0]?.line ?? -1;

  const insertHeading = (level: number) => {
    if (editorType === 'block') {
      setBlockHeadingRequest({ level, token: Date.now() });
      return;
    }
    const prefix = `${'#'.repeat(level)} `;
    const trimmed = sourceContent.replace(/\s*$/, '');
    const next = trimmed ? `${trimmed}\n\n${prefix}` : `${prefix}`;
    emitSourceContentChange(next);
  };

  const handleOutlineItemClick = (itemLine: number, headingIndex: number) => {
    setActiveCursorLine(itemLine);
    if (editorType === 'block') {
      if (headingIndex >= 0) {
        setOutlineBlockFocusRequest({ headingIndex, token: Date.now() });
      }
      return;
    }
    setOutlineFocusRequest({ line: itemLine, token: Date.now() });
  };

  const handleActiveBlockHeadingChange = (headingIndex: number) => {
    const outlineItem = outlineItems[headingIndex];
    if (!outlineItem) return;
    setActiveCursorLine(outlineItem.line);
  };

  return (
    <div className="flex-1 flex 
    flex-col 
    items-center 
    justify-center 
    pt-[2px]
    bg-[#1a1a1a]
    "
    >
      <div style={{ height: '18px', width: '100%', flexShrink: 0 }} />
      <div className="flex flex-col items-center w-3/4 max-w-3xl">
        <div
          style={{
            width: '100%',
            transform: showOutline ? 'translateX(120px)' : 'translateX(0)',
            transition: 'transform 0.9s ease-ease',
          }}
        >
          {/* Document Title Header - like Doc Studio */}
          {showTitleHeader && (
            <div
              className="w-full pl-[8px] pb-[10px]"
              style={{
                position: 'relative',
                paddingTop: 0,
              }}
            >
              <ZenThoughtLine
                thoughts={zenThoughts}
                visible={showZenThoughtInHeader}
                containerStyle={{
                  marginBottom: '6px',
                  paddingLeft: '2px',
                  
                }}
                textStyle={{
                color: '#e8e3d8',
  }}
                
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '4px' }}>
                <p className="font-mono fontWeight-[200] text-[11px] text-[#d0cbb8]" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                   <FontAwesomeIcon
                     icon={faFolderOpen}
                     style={{ color: '#d0cbb8', fontSize: '10px', flexShrink: 0, cursor: revealPath ? 'pointer' : 'default', transition: 'all 0.2s' }}
                     onClick={() => revealPath && revealItemInDir(revealPath)}
                     onMouseEnter={(e) => { if (revealPath) e.currentTarget.style.transform = 'scale(1.5)'; }}
                     onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                   />
                   {displayPath}
                </p>
                {autosaveStatusText ? (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      marginRight: 20,
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: 11,
                      color: '#d0cbb8',
                      whiteSpace: 'nowrap',
                    }}
                    title={autosaveStatusText}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: '#AC8E66',
                        boxShadow: '0 0 10px rgba(172,142,102,0.35)',
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    <span>{autosaveStatusText}</span>
                  </div>
                ) : null}
              </div>
            
            </div>
          )}
          {/* Doc Tabs */}
          {docTabs.length > 0 && (
            <div className="w-full" style={{ marginBottom: '-19px', position: 'relative', zIndex: 0 }}>
              <div
                className="zen-no-scrollbar"
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '3px',
                  padding: '1px',
                  backgroundColor: 'transparent',
                  borderRadius: '12px 12px 0 0',
                  borderBottom: 'none',
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                }}
              >
                {docTabs.map((tab) => {
                  const isActive = tab.id === activeDocTabId;
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
                        marginBottom: '5px',
                        flex: '0 0 auto',
                        padding: '10px 16px',
                        backgroundColor: isActive ? '#d0cbb8' : '#1a1a1a',
                        borderTop: isActive ? '1px solid #AC8E66' : '1px dotted #777',
                        borderLeft: isActive ? '1px solid #AC8E66' : '1px dotted #777',
                        borderRight: isActive ? '1px solid #AC8E66' : '1px dotted #777',
                        borderRadius: '8px 8px 0px 0px',
                        borderBottom: 'none',
                        cursor: 'pointer',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: isActive ? '10px' : '9px',
                
                        color: isActive ? '#1a1a1a' : '#777',
                        transition: 'all 0.1s',
                        transform: isActive ? 'translateY(0)' : 'translateY(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
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
                          e.currentTarget.style.color = '#999';
                          e.currentTarget.style.borderColor = '#777';
                          e.currentTarget.style.transform = 'translateY(8px)';
                        }
                      }}
                    >
                      {isDirty ? <span style={{ color: '#AC8E66' }}>•</span> : null}
                      <span style={{ whiteSpace: 'nowrap' }}>{tab.title.length > 20 ? tab.title.slice(0, 20) + '…' : tab.title}</span>
                      <span
                        onClick={(event) => {
                          event.stopPropagation();
                          onCloseDocTab?.(tab.id);
                        }}
                        style={{
                          marginLeft: 'auto',
                          fontSize: '12px',
                          color: isActive ? '#1a1a1a' : '#777',
                          opacity: 0.8,
                        }}
                      >
                        ×
                      </span>
                    </button>
                  );
                })}
                {onNewDraft && (
                  <button
                    onClick={onNewDraft}
                    title="Neuen Entwurf öffnen"
                    style={{
                      marginBottom: '5px',
                      flex: '0 0 auto',
                      padding: '10px 12px',
                      backgroundColor: '#1a1a1a',
                      borderTop: '1px dotted #555',
                      borderLeft: '1px dotted #555',
                      borderRight: '1px dotted #555',
                      borderRadius: '8px 8px 0px 0px',
                      borderBottom: 'none',
                      cursor: 'pointer',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '14px',
                      color: '#777',
                      transition: 'all 0.2s',
                      transform: 'translateY(8px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                      zIndex: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#e8e3d8';
                      e.currentTarget.style.borderColor = '#e8e3d8';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.zIndex = '0'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#666';
                      e.currentTarget.style.borderColor = '#555';
                      e.currentTarget.style.transform = 'translateY(8px)';
                      e.currentTarget.style.zIndex = '0'
                    }}
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          )}

          <input
            id="file-upload"
            type="file"
            accept=".md,.markdown,.txt,.html,.htm,.json,.docx,.doc"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileUpload(file);
              e.currentTarget.value = '';
            }}
            className="hidden"
          />

          {/* Drop Zone — visible when editor is empty */}
          {!sourceContent.trim() && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
              onDragEnter={(e) => { e.preventDefault(); setIsDragActive(true); }}
              onDragLeave={() => setIsDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragActive(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void handleFileUpload(file);
              }}
              onClick={() => document.getElementById('file-upload')?.click()}
              style={{
                borderRadius: '0px 0px 10px 10px',
                border: isDragActive
                  ? '1.5px dashed #AC8E66'
                  : '1px dashed #1a1a1a',
                background: isDragActive
                  ? 'rgba(172,142,102,0.1)'
                  : '#d0cbb8',
                padding: '36px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginTop: '10px',
                marginBottom: '20px',
                position: 'relative',
                zIndex: 10,
              }}
            >
              <FontAwesomeIcon
                icon={isDragActive ? faFolderOpen : faFileUpload}
                style={{ fontSize: '22px', color: isDragActive ? '#AC8E66' : '#1a1a1a' }}
              />
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: isDragActive ? '#AC8E66' : '#1a1a1a' }}>
                {isDragActive ? 'Loslassen zum Laden' : 'Datei hier ablegen oder klicken zum Auswählen'}
              </span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#1a1a1a' }}>
                .md · .txt · .docx · .html · .pdf
              </span>
            </div>
          )}

          {/* Editor - Block oder Markdown */}
          <div className="w-full mb-4" style={{ 
            paddingTop: docTabs.length > 0 ? 0 : 10, marginTop: docTabs.length > 0 ? 0 : 20 }}>
          {showComparison && comparisonBaseContent !== undefined && (
            <div
              style={{
                marginBottom: '0.5px',
                padding: '10px',
                border: '0.5px solid #3a3a3a',
                borderRadius: '0 0 0 0 ',
                backgroundColor: '#1a1a1a',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                gap: '10px', 
                marginBottom: '8px', flexWrap: 'wrap' }}>
                <div className="font-mono text-[10px] text-[#d0cbb8] py-[10px]">
                  Vorher: {comparisonBaseLabel}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {comparisonBaseOptions.length > 1 ? (
                    <div style={{ width: '320px', color:  '#d0cbb8' }}>
                      <ZenDropdown
                        value={comparisonBaseSelection ?? comparisonBaseOptions[0]?.id ?? ''}
                        onChange={(value) => onComparisonBaseChange?.(value)}
                        options={comparisonBaseOptions.map((option) => ({ value: option.id, label: option.label }))}
                        variant="compact"
                      />
                    </div>
                  ) : null}
                  <div className="font-mono text-[10px] text-[#d0cbb8]">
                    Zeichen Δ {sourceContent.length - comparisonBaseContent.length}
                  </div>
                  {onAdoptCurrentAsComparisonBase ? (
                    <button
                      onClick={onAdoptCurrentAsComparisonBase}
                      className="font-mono text-[9px] px-[10px] py-[10px] rounded-[4px] border-[0.5px] border-[#d0cbb8] text-[#d0cbb8]
                      hover:bg-[#d0cbb8] transition-colors
                      hover:text-[#1a1a1a]
                      hover:border-[#AC8E66] focus:outline-none focus:ring-2 focus:ring-[#AC8E66]/50"
                      title="Aktuelle Version als neue Vergleichs-Basis übernehmen"
                    >
                      Änderungen übernehmen
                    </button>
                  ) : null}
                  <button
                    onClick={() => setShowComparison(false)}
                    title="Vergleich schließen"
                    style={{
                      background: 'transparent',
                      border: '1px solid #d0cbb8',
                      borderRadius: '4px',
                      color: '#f35120',
                      width: '30px',
                      height: '30px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '12px',
                      lineHeight: 1,
                      transition: 'border-color 0.15s, color 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#AC8E66'; e.currentTarget.style.color = '#f35120'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3A3A3A'; e.currentTarget.style.color = '#f35120'; }}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  maxHeight: '240px',
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
                        backgroundColor:
                          row.status === 'removed'
                            ? 'rgba(239,68,68,1)'
                            : row.status === 'modified'
                              ? 'rgba(245, 158, 11,1 )'
                              : '#171717',
                        color:
                          row.status === 'removed'
                            ? '#1a1a1a'
                            : row.status === 'modified'
                              ? '#1a1a1a'
                              : '#1a1a1a',
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
                        backgroundColor:
                          row.status === 'added'
                            ? 'rgba(34,197,94,1)'
                            : row.status === 'modified'
                              ? 'rgba(245, 158, 11, 1)'
                              : '#d0cbb8',
                        color:
                          row.status === 'added'
                            ? '#1a1a1a'
                            : row.status === 'modified'
                              ? '#1a1a1a'
                              : '#1a1a1a',
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
          {editTabs.length > 1 && !hasDerivedDocTabs && (
            <div className="mb-4 w-full max-w-4xl">
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '8px',
                  backgroundColor: '#1F1F1F',
                  borderRadius: '12px',
                  border: '1px solid #3A3A3A',
                }}
              >
                {editTabs.map((platform) => {
                  const isActive = activeEditTab === platform;
                  const tabInfo = PLATFORM_TAB_INFO[platform];
                  return (
                    <button
                      key={platform}
                      onClick={() => onEditTabChange?.(platform)}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        backgroundColor: isActive ? '#AC8E66' : 'transparent',
                        border: isActive ? 'none' : '1px solid #3A3A3A',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '12px',
                        fontWeight: isActive ? '600' : '400',
                        color: isActive ? '#1A1A1A' : '#999',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <FontAwesomeIcon icon={tabInfo.icon} />
                      {tabInfo.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex w-full gap-6" style={{ 
            position: 'relative' 
            }}>
            {/* Outline Toggle Tab (left edge) */}

            <div style={{
              position: 'relative',
              top: -90,
              left: -5,
            }}
>
            <RotatedTab
              onClick={toggleOutlinePanel}
              style={{
                left: showOutline ? -258 : -28,
                top: showOutline ? 60 : 190,
                transform: showOutline ? 'rotate(0deg)' : 'rotate(-90deg)',
                backgroundColor: '#1a1a1a',
                   border: "0.5px solid rgba(208, 203, 184, 0.45)",
              }}
              label={showOutline ? 'Gliederung ausblenden' : 'Gliederung'}
              hoverLabel={showOutline ? 'Schließen ×' : 'Öffnen →'}
              color="#aaaaaa"
            />

            <RotatedTab
              onClick={toggleComparisonPanel}
              disabled={!canUseComparison}
              style={{
                left: -28,
                top: showComparison ? 295 : 300,
                transform: 'rotate(-90deg)',
                backgroundColor: !canUseComparison ? '#0f0f0f' : showComparison ? '#d0cbb8' : '#1a1a1a',
                border: !canUseComparison ? '1px solid #3A3A3A' :  "0.5px solid rgba(208, 203, 184, 0.45)",
                cursor: !canUseComparison ? 'not-allowed' : 'pointer',
              }}
              label={`Vergleich ${showComparison ? 'an' : 'aus'}`}
              hoverLabel={!canUseComparison ? 'Nicht verfügbar' : showComparison ? 'Ausblenden ×' : 'Einblenden →'}
              color={!canUseComparison ? '#1a1a1a' : showComparison ? '#1a1a1a' : '#aaaaaa'}
              title={!canUseComparison ? 'Keine Vergleichsbasis verfügbar.' : `Vergleich ${showComparison ? 'ausblenden' : 'anzeigen'}`}
            />

            {/* Meta Tab Button */}
            <RotatedTab
              onClick={() => setShowMeta((v) => !v)}
              style={{
                left: -28,
                top: 420,
                transform: 'rotate(-90deg)',
                backgroundColor: showMeta ? '#d0cbb8' : '#1a1a1a',
                   border: "0.5px solid rgba(208, 203, 184, 0.45)",
              }}
              label="Post Metadaten"
              hoverLabel={showMeta ? 'Schließen ×' : 'Öffnen →'}
              color={showMeta ? '#1a1a1a' : '#aaaaaa'}
            />

            <Step1StyleThemeQuickMenu
              isOpen={showStyleThemes}
              onToggle={() => setShowStyleThemes((v) => !v)}
              previewTheme={previewTheme}
              onPreviewThemeChange={onPreviewThemeChange}
              editorSettings={editorSettings}
              onEditorSettingsChange={updateQuickEditorSettings}
              autosaveStatusText={autosaveStatusText}
              autosaveHistory={autosaveHistory}
              onOpenEditorSettings={onOpenEditorSettings}
              onAutosaveHistoryRestore={onAutosaveHistoryRestore}
              onAutosaveHistoryCompare={onAutosaveHistoryCompare}
              onOpenComparison={() => setShowComparison(true)}
            />

            {/* Meta Panel */}
            {showMeta && (
              <div
                style={{
                  width: 240,
                  position: 'absolute',
                  top: 90,
                  left: -260,
                  padding: '12px',
                  borderRadius: 10,
                  background: '#d0cbb8',
                  border: '1px solid rgba(21, 21, 21, 0.35)',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
                  
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  maxHeight: 'calc(100vh - 320px)',
                  overflowY: 'auto',
                  zIndex: 6,
                  transform: 'translateX(120px)',

                }}
              >
                <div className="
                font-mono text-[10px] 
                text-[#1a1a1a] tracking-wide">Post Metadaten · ESC Closed</div>
             
                {/* Tags section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="font-mono text-[10px] text-[#1a1a1a]">Tags/Keywords</div>
                    {analysisKeywords.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const current = postMeta?.tags ?? [];
                          const merged = Array.from(new Set([...current, ...analysisKeywords]));
                          updatePostMetaTags(merged);
                        }}
                        style={{
                           background: 'rgba(208, 255, 184, 0.4)',
                            boxShadow: 'none',
                          borderRadius: 4,
                          
                          color: '#1a1a1a',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: 8,
                          padding: '4px 6px',
                          cursor: 'pointer',
                        
                        }}
                        title="Top-Keywords aus Analyse als Tags übernehmen"
                      >
                        Aus Analyse übernehmen
                      </button>
                    )}
                  </div>
                  {/* Chip list */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, minHeight: 24 }}>
                    {(postMeta?.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          background: '#252525',
                          border: '1px solid #777',
                          borderRadius: 4,
                          padding: '2px 7px',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: 9,
                          color: '#e4e3cb ',
                        }}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => updatePostMetaTags((postMeta?.tags ?? []).filter(t => t !== tag))}
                          style={{ 
                            background: 'transparent', 
                            boxShadow: 'none',
                            border: 'none', 
                            color: '#cc2d05', 
                            cursor: 'pointer', 
                            padding: 0, 
                            fontSize: 14, lineHeight: 1 }}
                          title={`"${tag}" entfernen`}
                        >×</button>
                      </span>
                    ))}
                    {(postMeta?.tags ?? []).length === 0 && (
                      <div className="font-mono text-[9px] text-[#d12a00] "
                      style={{ textAlign: 'left', width: '100%' }}
                      >
                        Noch keine Tags
                        </div>
                    )}
                  </div>
                  {/* Add tag input */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ',') && newTagInput.trim()) {
                          e.preventDefault();
                          const tag = newTagInput.trim().replace(/^,+|,+$/g, '');
                          if (tag && !(postMeta?.tags ?? []).includes(tag)) {
                            updatePostMetaTags([...(postMeta?.tags ?? []), tag]);
                          }
                          setNewTagInput('');
                        }
                      }}
                      placeholder="Tag hinzufügen…"
                      style={{
                        flex: 1,
                        background: '#e4e3cb', border: '0.5px solid #3A3A3A', borderRadius: 4,
                        padding: '4px 7px', fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: 10, color: '#252525', outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const tag = newTagInput.trim();
                        if (tag && !(postMeta?.tags ?? []).includes(tag)) {
                          updatePostMetaTags([...(postMeta?.tags ?? []), tag]);
                        }
                        setNewTagInput('');
                      }}
                      style={{
                        background: 'transparent', border: '0.5px solid #3A3A3A', borderRadius: 4,
                        color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9,
                        padding: '4px 8px', cursor: 'pointer',
                      }}
                    >+</button>
                  </div>
                  <div className="font-mono text-[9px] text-[#1a1a1a]" style={{ lineHeight: '11px' }}>
                    Enter oder Komma zum Hinzufügen · Wird als YAML tags + keywords gespeichert
                  </div>
                </div>

                {(['title', 'subtitle', 'imageUrl', 'imageTitle', 'imageAlt', 'imageCaption', 'date'] as const).map((field) => (
                  <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div className="font-mono text-[10px] text-[#1a1a1a]">
                      {field === 'imageUrl'
                        ? 'Bild-URL'
                        : field === 'title'
                        ? 'Titel'
                        : field === 'subtitle'
                        ? 'Untertitel'
                        : field === 'imageTitle'
                        ? 'Bild-Titel'
                        : field === 'imageAlt'
                        ? 'Bild ALT Text'
                        : field === 'imageCaption'
                        ? 'Bild-Caption'
                        : 'Datum'}
                    </div>
                    {field === 'title' || field === 'subtitle' || field === 'imageCaption' ? (
                      <textarea
                        value={postMeta?.[field] ?? ''}
                        onChange={(e) => updatePostMetaField(field, e.target.value)}
                        rows={field === 'title' ? 2 : field === 'subtitle' ? 3 : 2}
                        placeholder={
                          field === 'title'
                            ? 'Titel eingeben...'
                            : field === 'subtitle'
                            ? 'Untertitel eingeben...'
                            : 'Bild-Caption eingeben...'
                        }
                        style={{
                          background: '#e4e3cb',
                          border: '0.5px solid #3A3A3A',
                          borderRadius: 4,
                          padding: '6px 8px',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '10px',
                          color: '#1a1a1a',
                          width: '100%',
                          outline: 'none',
                          boxSizing: 'border-box',
                          resize: 'vertical',
                          minHeight: field === 'title' ? 42 : field === 'subtitle' ? 54 : 42,
                          lineHeight: '14px',
                        }}
                      />
                    ) : (
                      <input
                        type={field === 'date' ? 'date' : 'text'}
                        value={postMeta?.[field] ?? ''}
                        onChange={(e) => updatePostMetaField(field, e.target.value)}
                        onBlur={field === 'imageUrl' ? (event) => {
                          void commitMetaImageUrl(event.target.value);
                        } : undefined}
                        onKeyDown={field === 'imageUrl' ? (event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void commitMetaImageUrl((event.target as HTMLInputElement).value);
                          }
                        } : undefined}
                        onDragEnter={field === 'imageUrl' ? (event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setIsMetaImageDragActive(true);
                        } : undefined}
                        onDragOver={field === 'imageUrl' ? (event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setIsMetaImageDragActive(true);
                        } : undefined}
                        onDragLeave={field === 'imageUrl' ? (event) => {
                          const nextTarget = event.relatedTarget as Node | null;
                          if (nextTarget && event.currentTarget.contains(nextTarget)) return;
                          setIsMetaImageDragActive(false);
                        } : undefined}
                        onDrop={field === 'imageUrl' ? (event) => {
                          void handleMetaImageDrop(event);
                        } : undefined}
                        placeholder={
                          field === 'imageUrl'
                            ? 'https://...'
                            : field === 'date'
                            ? new Date().toISOString().slice(0, 10)
                            : field === 'imageTitle'
                            ? 'Titel für OG/Twitter'
                            : field === 'imageAlt'
                            ? 'Beschreibung für Screenreader'
                            : ''
                        }
                        style={{
                          background: field === 'imageUrl' && isMetaImageDragActive ? 'rgba(172, 142, 102, 0.08)' : '#e4e3cb',
                          border: field === 'imageUrl' && isMetaImageDragActive ? '0.5px solid #AC8E66' : '0.5px solid #3A3A3A',
                          borderRadius: 4,
                          padding: '6px 8px',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '10px',
                          color: '#1a1a1a',
                          width: '100%',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    )}
                    {field === 'imageUrl' && (
                      <>
                        <div
                          className="font-mono text-[9px]"
                          style={{ color: (postMeta?.imageUrl ?? '').trim() ? '#1a1a1a' : '#1a1a1a' }}
                        >
                          {(postMeta?.imageUrl ?? '').trim() ? 'Bild erkannt' : 'Kein Bild gesetzt'}
                        </div>
                        <div
                          className="font-mono text-[9px]"
                          style={{ color: cloudImageUploadEnabled ? '#1a1a1a' : '#8b8b8b', lineHeight: '12px' }}
                        >
                          {cloudImageUploadEnabled
                            ? 'Drag & Drop lädt Titelbild direkt in ZenCloud und speichert die Asset-URL.'
                            : 'Drag & Drop setzt lokal Pfad/OPFS. Mit ZenCloud wird hier direkt die Asset-URL gespeichert.'}
                        </div>
                        {metaImageIsInlineData && isTauri() && (
                          <div
                            className="font-mono text-[9px]"
                            style={{ color: '#d39b52', lineHeight: '13px' }}
                          >
                            Altes Format (base64) — wird beim nächsten Speichern automatisch in _assets/ konvertiert.
                          </div>
                        )}
                        {metaImageInvalidForServer && !isTauri() && (
                          <div
                            className="font-mono text-[9px]"
                            style={{
                              color: '#d39b52',
                              lineHeight: '12px',
                            }}
                          >
                            Hinweis: data/blob Bild-URLs werden beim Server-Export hochgeladen,
                            wenn in ZenSettings ein Upload-Endpunkt gesetzt ist.
                          </div>
                        )}
                        {(postMeta?.imageUrl ?? '').trim() &&
                          (metaImageBlobUrl || /^(https?:\/\/|data:image\/|blob:)/i.test((postMeta?.imageUrl ?? '').trim())) && (
                            <img
                              src={metaImageBlobUrl ?? (postMeta?.imageUrl ?? '').trim()}
                              alt="Meta Bild Vorschau"
                              style={{
                                width: '100%',
                                maxHeight: '50%',
                                objectFit: 'fill',
                                borderRadius: 4,
                                fontSize: '12px',
                                
                                border: 'none',
                                background: '#0f0f0f',
                              }}
                            />
                          )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Outline Panel */}
            {showOutline && (
              <div
                className=" lg:flex"
                style={{
                  width: 240,
                  alignSelf: 'flex-start',
                  position: 'absolute',
                  top: 90,
                  left: -260,
                  padding: '12px',
                  borderRadius: 10,
                  background: '#1a1a1a',
                  border: '1px solid rgba(172, 142, 102, 0.25)',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  maxHeight: 'calc(100vh - 320px)',
                  overflowY: 'auto',
                  zIndex: 6,
                }}
              >
                <div className="font-mono text-[10px] text-[#AC8E66] tracking-wide">Struktur ESC Closed</div>
                {editorType === 'block' && (
                  <div className="
                  font-mono 
                  
                  text-[10px]
                  leading-[12px]
                  text-[#d0cbb8]">
                    Kapitelklick bleibt im Block-Editor und springt zur passenden Ueberschrift.
                  </div>
                )}

                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-6">
                    <div className="font-mono text-[9px] pb-[2px] text-[#999]">Schnell einfuegen</div>
                    <div className="flex flex-wrap gap-6">
                      <button
                        onClick={() => insertHeading(1)}
                        style={{
                          padding: '6px 10px',
                          background: 'transparent',
                          border: '1px solid #3A3A3A',
                          borderRadius: 6,
                          color: '#e5e5e5',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        H1
                      </button>
                      <button
                        onClick={() => insertHeading(2)}
                        style={{
                          padding: '6px 10px',
                          background: 'transparent',
                          border: '1px solid #3A3A3A',
                          borderRadius: 6,
                          color: '#e5e5e5',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        H2
                      </button>
                      <button
                        onClick={() => insertHeading(3)}
                        style={{
                          padding: '6px 10px',
                          background: 'transparent',
                          border: '1px solid #3A3A3A',
                          borderRadius: 6,
                          color: '#e5e5e5',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        H3
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    <div className="
                    font-mono 
                    text-[9px] 
                    border-t-[1 pt-[5px] 
                    text-[#e3d4bf]">Erkannte Struktur</div>
                    {outlineItems.length === 0 ? (
                      <div className="
                      font-mono 
                      text-[11px] 
                      text-[#999]">
                        Keine Ueberschriften erkannt.
                      </div>
                    ) : (
                      <div className="
                      flex 
                      flex-col 
                      gap-6">
                        {outlineItems.map((item, idx) => (
                          <button
                            key={`${item.text}-${idx}`}
                            className="
                            font-mono 
                            text-[10px] 
                            
                            text-[#c8c8c8]
                            "
                            style={{
                              marginLeft: (item.level - 1) * 8,
                              opacity: item.level === 1 ? 1 : 0.95,
                              background: item.line === activeOutlineLine ? 'rgba(172, 142, 102, 1)' : 'transparent',
                              border: item.line === activeOutlineLine ? '1px solid rgba(172, 142, 102, 0.45)' : '1px solid transparent',
                              cursor: 'pointer',
                              textAlign: item.line === activeOutlineLine ? 'right' : 'left',
                              width: '100%',
                              padding: '3px 6px',
                              lineHeight: '13px',
                              borderRadius: 2,
                              color: item.line === activeOutlineLine ? '#151515' : '#c8c8c8',
                            }}
                            onClick={() => handleOutlineItemClick(item.line, idx)}
                          >
                            {item.text}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
</div>
            {/* Autosave Restore Banner */}
            {autosaveRestoreBanner && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 14px',
                background: 'rgba(172,142,102,0.10)',
                borderBottom: '1px solid rgba(172,142,102,0.35)',
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
                color: '#D4C5A9', flexShrink: 0,
              }}>
                <FontAwesomeIcon icon={faSave} style={{ color: '#AC8E66', fontSize: 10, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>
                  Autosave von {new Date(autosaveRestoreBanner.meta.updatedAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} gefunden ({(autosaveRestoreBanner.meta.contentLength / 1000).toFixed(1)} KB)
                </span>
                <button
                  type="button" onClick={onAutosaveBannerRestore}
                  style={{ background: '#AC8E66', border: 'none', borderRadius: 4, color: '#fff', fontSize: 10, padding: '3px 10px', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}
                >
                  Wiederherstellen
                </button>
                <button
                  type="button" onClick={onAutosaveBannerDismiss}
                  style={{ background: 'transparent', border: '1px solid #3A3A3A', borderRadius: 4, color: '#888', fontSize: 10, padding: '3px 8px', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace' }}
                >
                  Verwerfen
                </button>
              </div>
            )}

            <div
              style={{
                position: 'relative',
                zIndex: '1',
                overflow: 'visible',
                flex: 1,
                minWidth: 0,
              }}
              onDragEnterCapture={(event) => {
                if (!dragContainsImages(event)) return;
                event.preventDefault();
                event.stopPropagation();
                setIsImageDragActive(true);
              }}
              onDragOverCapture={(event) => {
                if (!dragContainsImages(event)) return;
                event.preventDefault();
                event.stopPropagation();
                setIsImageDragActive(true);
              }}
              onDragLeave={(event) => {
                const nextTarget = event.relatedTarget as Node | null;
                if (nextTarget && event.currentTarget.contains(nextTarget)) return;
                setIsImageDragActive(false);
              }}
              onDropCapture={(event) => {
                const hasImageFiles = dragContainsImages(event);
                const imagePaths = extractImagePathsFromDataTransfer(event);
                const hasImagePaths = imagePaths.length > 0;
                if (!hasImageFiles && !hasImagePaths) {
                  setIsImageDragActive(false);
                  return;
                }
                event.preventDefault();
                event.stopPropagation();
                setIsImageDragActive(false);
                // Tauri: Pfade bevorzugen → convertFileSrc, kein base64, kein Canvas
                if (isTauri() && hasImagePaths) {
                  void handleImagePathDrop(imagePaths);
                  return;
                }
                if (hasImageFiles && event.dataTransfer.files?.length) {
                  void handleImageDrop(event.dataTransfer.files);
                  return;
                }
                if (hasImagePaths) {
                  void handleImagePathDrop(imagePaths);
                }
              }}
            >
              {isImageDragActive ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    border: '1.5px dashed #AC8E66',
                    borderRadius: '10px',
                    background: 'rgba(172,142,102,0.08)',
                    zIndex: 5,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '11px',
                    color: '#AC8E66',
                  }}
                >
                  Bilder ablegen zum Einfügen
                </div>
              ) : null}
              {editorType === "block" ? (
                <ZenBlockEditor
                  key={`block-${activeDocTabId ?? 'no-tab'}`}
                  value={sourceContent}
                  onChange={emitSourceContentChange}
                  onRegisterContentSnapshotGetter={(getter) => {
                    editorSnapshotGetterRef.current = getter;
                  }}
                  onRegisterImageInserter={(inserter) => {
                    blockImageInserterRef.current = inserter;
                  }}
                  headingRequest={blockHeadingRequest}
                  focusHeadingRequest={outlineBlockFocusRequest}
                  onActiveHeadingChange={handleActiveBlockHeadingChange}
                  placeholder="Schreibe was du denkst oder nutze + für Formatierung... oder einfach eine Datei hochladen per Drag & Drop."
                  height="calc(90vh - 210px)"
                  fontSize={editorSettings?.fontSize}
                  wrapLines={editorSettings?.wrapLines}
                  showLineNumbers={editorSettings?.showLineNumbers}
                  theme={editorSettings?.theme ?? 'dark'}
                  previewTheme={previewTheme}
                  onKeywordsChange={onAnalysisKeywordsChange}
                />
              ) : (
                <ZenMarkdownEditor
                  key={`markdown-${activeDocTabId ?? 'no-tab'}`}
                  value={sourceContent}
                  onChange={emitSourceContentChange}
                  projectPath={projectPath}
                  focusLineRequest={outlineFocusRequest}
                  onActiveLineChange={setActiveCursorLine}
                  placeholder="Schreibe deinen Markdown-Inhalt hier... oder lade Inhalt über Projekte Ordner ein"
                  height="calc(90vh - 210px)"
                  fontSize={editorSettings?.fontSize}
                  showLineNumbers={editorSettings?.showLineNumbers}
                  theme={editorSettings?.theme ?? 'dark'}
                  previewTheme={previewTheme}
                  showZenNoteButton={true}
                />
              )}
           {showDockedEditorToggle && (
             <>
               <button
                 onClick={() => onEditorTypeChange?.(editorType === "block" ? "markdown" : "block")}
                 onMouseEnter={() => setEditorToggleHovered(true)}
                 onMouseLeave={() => setEditorToggleHovered(false)}
                 style={{
                   position: "absolute",
                   left: 'calc(100% + 1px)',
                   top: "-5px",
                   transform: "translatex(10%) rotate(90deg)",
                   transformOrigin: "left center",
                   padding: "10px 12px",
                   backgroundColor: "#121212",
                   border: "0.5px solid rgba(208, 203, 184, 0.45)",
                   borderRadius: '8px 8px 0px 0px',
                   cursor: "pointer",
                   fontFamily: "IBM Plex Mono, monospace",
                   fontSize: "11px",
                   color: "#aaa",
                   display: "flex",
                   alignItems: "center",
                   gap: "6px",
                   boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
                   zIndex: -1,
                   whiteSpace: "nowrap",
                   minWidth: "140px",
                   justifyContent: "center",
                 }}
               >
                 <FontAwesomeIcon icon={editorType === "block" ? faAlignLeft : faCode} style={{ color: "#AC8E66" }} />
                 <div style={{ position: 'relative', overflow: 'hidden', height: '14px', flex: 1 }}>
                   <span style={{
                     display: 'block',
                     transform: editorToggleHovered ? 'translateY(-100%)' : 'translateY(0)',
                     opacity: editorToggleHovered ? 0 : 1,
                     transition: 'transform 0.22s ease, opacity 0.18s ease',
                   }}>
                     {editorType === "block" ? "Markdown Editor" : "Block Editor"}
                   </span>
                   <span style={{
                     display: 'block',
                     position: 'absolute', top: 0, left: 0, whiteSpace: 'nowrap',
                     color: '#d0cbb8',
                     transform: editorToggleHovered ? 'translateY(0)' : 'translateY(100%)',
                     opacity: editorToggleHovered ? 1 : 0,
                     transition: 'transform 0.22s ease, opacity 0.18s ease',
                   }}>
                     {editorType === "block" ? "zu Markdown →" : "zu Block →"}
                   </span>
                 </div>
               </button>
               <div
                 style={{
                   position: "absolute",
                   left: "100%",
                   top: "145px",
                   transform: "translatex(10%) rotate(90deg)",
                   transformOrigin: "left center",
                   zIndex: -1,
                 }}
               >
                 <div
                   style={{
                     display: "flex",
                     alignItems: "center",
                     gap: "6px",
                     padding: "6px 6px",
                     backgroundColor: "#0A0A0A",
                        border: "0.5px solid rgba(208, 203, 184, 0.45)",
                     borderRadius: '8px 8px 0px 0px',
                     fontFamily: "IBM Plex Mono, monospace",
                     fontSize: "10px",
                     color: "#aaa",
                     boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
                     whiteSpace: "nowrap",
                   }}
                 >
                   <button
                     onClick={() => updateEditorTheme('dark')}
                     style={{
                       padding: "6px 10px",
                       borderRadius: "4px",
                       border: editorSettings?.theme === 'dark' ? "0.5px solid rgba(208, 203, 184, 0.45)" : "1px solid #3A3A3A",
                       backgroundColor: editorSettings?.theme === 'dark' ? "#1a1a1a" : "transparent",
                       color: "#aaa",
                       cursor: "pointer",
                       fontFamily: "IBM Plex Mono, monospace",
                       fontSize: "9px",
                       display: "flex",
                       alignItems: "center",
                       gap: "6px",
                     }}
                   >
                     <FontAwesomeIcon
                       icon={faMoon}
                       style={{ color: editorSettings?.theme === 'dark' ? '#AC8E66' : '#777' }}
                     />
                     Dark
                   </button>
                   <button
                     onClick={() => updateEditorTheme('light')}
                     style={{
                       zIndex: 0,
                       padding: "6px 10px",
                       borderRadius: "4px",
                       border: editorSettings?.theme === 'light' ? "0.5px solid #d0cbb8" : "1px solid #3A3A3A",
                       backgroundColor: editorSettings?.theme === 'light' ? "#D9D4C5" : "transparent",
                       color: editorSettings?.theme === 'light' ? "#1a1a1a" : "#e5e5e5",
                       cursor: "pointer",
                       fontFamily: "IBM Plex Mono, monospace",
                       fontSize: "9px",
                       display: "flex",
                       alignItems: "center",
                       gap: "6px",
                     }}
                   >
                     <FontAwesomeIcon
                       icon={faSun}
                       style={{ color: editorSettings?.theme === 'light' ? '#AC8E66' : '#777' }}
                     />
                     Light
                   </button>
                 </div>
               </div>
             </>
           )}

            </div>

          </div>

          {/* Editor Tab Bar */}
          {showInlineActions && (
            <div>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#1A1A1A',
                  borderRadius: '0 0 12px 12px',
                  borderTop: '1px solid #3A3A3A',
                  marginTop: '-1px',
                }}
              >
              <button
                onClick={() => onEditorTypeChange?.(editorType === "block" ? "markdown" : "block")}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid #3A3A3A',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '11px',
                  color: '#e5e5e5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#AC8E66';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#3A3A3A';
                }}
              >
                <FontAwesomeIcon icon={editorType === "block" ? faAlignLeft : faCode} style={{ color: '#AC8E66' }} />
                {editorType === "block" ? "Markdown" : "Block Editor"}
              </button>
              <button
                onClick={async () => {
                  const content = await resolveLiveContent();
                  onPreview?.(content);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid #3A3A3A',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '11px',
                  color: '#e5e5e5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#AC8E66';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#3A3A3A';
                }}
              >
                <FontAwesomeIcon icon={faFileLines} style={{ color: '#AC8E66' }} />
                Preview
              </button>
              <button
                onClick={async () => {
                  const content = await resolveLiveContent();
                  onSaveToProject?.(content);
                }}
                disabled={!canSaveToProject}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid #3A3A3A',
                  borderRadius: '6px',
                  cursor: canSaveToProject ? 'pointer' : 'not-allowed',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '11px',
                  color: canSaveToProject ? '#e5e5e5' : '#555',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  opacity: canSaveToProject ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (canSaveToProject) e.currentTarget.style.borderColor = '#AC8E66';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#3A3A3A';
                }}
              >
                <FontAwesomeIcon icon={faSave} style={{ color: '#AC8E66' }} />
                Speichern
              </button>
              <button
                onClick={async () => {
                  const content = await resolveLiveContent();
                  onSaveAsToProject?.(content);
                }}
                disabled={!canSaveToProject}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid #3A3A3A',
                  borderRadius: '6px',
                  cursor: canSaveToProject ? 'pointer' : 'not-allowed',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '11px',
                  color: canSaveToProject ? '#e5e5e5' : '#555',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  opacity: canSaveToProject ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (canSaveToProject) e.currentTarget.style.borderColor = '#AC8E66';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#3A3A3A';
                }}
              >
                <FontAwesomeIcon icon={faSave} style={{ color: '#AC8E66' }} />
                Speichern unter
              </button>
              <button
                onClick={async () => {
                  const content = await resolveLiveContent();
                  onSaveToServer?.(content);
                }}
                disabled={!canSaveToServer}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${canSaveToServer ? '#AC8E66' : '#3A3A3A'}`,
                  borderRadius: '6px',
                  cursor: canSaveToServer ? 'pointer' : 'not-allowed',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '11px',
                  color: canSaveToServer ? '#AC8E66' : '#555',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  opacity: canSaveToServer ? 1 : 0.4,
                }}
              >
                <FontAwesomeIcon icon={faExternalLinkAlt} />
                {saveToServerLabel ?? 'Auf Server speichern'}
              </button>
              <div style={{ flex: 1 }} />
              <button
                onClick={onNext}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#AC8E66',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: '#0A0A0A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                }}
              >
                Weiter
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
              </div>
              <div
                className="font-mono text-[9px] text-[#8a8a8a]"
                style={{
                  marginTop: '6px',
                  padding: '0 12px 8px 12px',
                  letterSpacing: '0.02em',
                }}
              >
                Shortcuts: {modifierKeyLabel}+S Speichern, {modifierKeyLabel}+Shift+S Speichern unter, {modifierKeyLabel}+W Tab schliessen, {modifierKeyLabel}+G Gliederung, Esc Schliessen
              </div>
              <div
                className="font-mono text-[9px]"
                style={{
                  marginTop: '2px',
                  padding: '0 12px 10px 12px',
                  letterSpacing: '0.02em',
                  color: contentDiagnostics.isHeavy ? '#d39b52' : '#777',
                }}
              >
                Inhalt: {contentDiagnostics.formattedSize} · data:image eingebettet: {contentDiagnostics.inlineDataImageCount}
                {contentDiagnostics.isHeavy ? ' · Tipp: Bilder als URL statt Base64 speichern.' : ''}
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 text-center">
            <p className="text-[#E89B5A] font-mono text-[10px]">{error}</p>
          </div>
        )}
      </div>

      {/* Pages Export Help Modal */}
      <ZenModal
        isOpen={showPagesHelp}
        onClose={() => setShowPagesHelp(false)}
        size="lg"
        showCloseButton={false}
      >
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            minHeight: '25vh',
            maxHeight: '80vh',
          }}
        >
          {/* Header */}
          <div
            style={{
              paddingBottom: 16,
              borderBottom: '1px solid #AC8E66',
              position: 'relative',
              zIndex: 10,
            }}
          >
            <ZenModalHeader
              title="Pages-Dokument als DOCX exportieren"
              subtitle="Folge diesen Schritten um dein Pages-Dokument zu konvertieren"
                 subtitle2="DOCX-Export behält Formatierungen, Bilder und Tabellen bei!"
              titleColor="#AC8E66"
              subtitleColor="#999"
              titleSize="14px"
              subtitleSize="11px"
              onClose={() => setShowPagesHelp(false)}
            />

             {/* Success Tip */}
      
          </div>

          {/* Scrollable Content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '20px ',
              paddingLeft: "16",
            }}
          >
            <div className="space-y-5">
              {[
                {
                  number: 1,
                  title: 'Pages-Dokument öffnen',
                  description: 'Öffne dein Dokument in Apple Pages',
                  icon: faApple,
                },
                {
                  number: 2,
                  title: 'Export-Menü öffnen',
                  description: 'Gehe zu: Ablage → Exportieren → Word...',
                  icon: faFileUpload,
                },
                {
                  number: 3,
                  title: 'Format wählen',
                  description: 'Wähle "Word" (.docx) als Exportformat',
                  icon: faCheckCircle,
                },
                {
                  number: 4,
                  title: 'Datei speichern',
                  description: 'Speichere die DOCX-Datei an einem Ort deiner Wahl',
                  icon: faCheckCircle,
                },
                {
                  number: 5,
                  title: 'Hier hochladen',
                  description: 'Lade die DOCX-Datei in ZenPost Studio hoch',
                  icon: faArrowRight,
                },
              ].map((step, index) => (
                <ZenStepItem
                  key={step.number}
                  number={step.number}
                  title={step.title}
                  description={step.description}
                  icon={step.icon}
                  index={index}
                  titleSize="14px"
                  descriptionSize="12px"
                  iconSize="30px"
                  gap={14}
                  titleIconGap={8}
                  titleDescriptionGap={6}
                />
              ))}
            </div>

           
          </div>

          {/* Footer */}
          <ZenModalFooter showFooterText={false}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: 12,
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                flexWrap: 'wrap',
              }}
            >
              <ZenRoughButton
                label="ZenPost Guide"
                icon={
                  <FontAwesomeIcon
                    icon={faExternalLinkAlt}
                    className="text-[#AC8E66]"
                  />
                }
                onClick={async () => {
                  try {
                    await openExternal(EXTERNAL_DOCS_URL);
                  } catch (error) {
                    console.error('Failed to open URL:', error);
                  }
                }}
              />
              <ZenRoughButton
                label="Verstanden"
                icon={
                  <FontAwesomeIcon
                    icon={faCheckCircle}
                    className="text-[#AC8E66]"
                  />
                }
                onClick={() => setShowPagesHelp(false)}
                variant="default"
              />
            </div>
          </ZenModalFooter>
        </div>

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(-10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }

          .autosave-label-default {
            transform: translateY(0);
            opacity: 1;
          }
          .autosave-label-hover {
            transform: translateY(100%);
            opacity: 0;
          }
          button:hover .autosave-label-default {
            transform: translateY(-100%);
            opacity: 0;
          }
          button:hover .autosave-label-hover {
            transform: translateY(0);
            opacity: 1;
          }
        `}</style>
      </ZenModal>

      {/* Tip Modal */}
      <ZenModal
        isOpen={showTipModal}
        onClose={() => setShowTipModal(false)}
        size="medium"
        showCloseButton={true}
      >
        <div style={{ padding: '24px' }}>
          <h2 style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '18px',
            color: '#AC8E66',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <FontAwesomeIcon icon={faInfoCircle} />
            Unterstützte Dateiformate
          </h2>

          <div style={{
            backgroundColor: '#1A1A1A',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <p style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '13px',
              color: '#e5e5e5',
              lineHeight: '1.8',
              margin: 0,
            }}>
              Du kannst folgende Dateiformate hochladen:
            </p>
            <ul style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
              color: '#999',
              lineHeight: '2',
              marginTop: '12px',
              paddingLeft: '20px',
            }}>
              <li><span style={{ color: '#AC8E66' }}>Markdown</span> (.md, .markdown)</li>
              <li><span style={{ color: '#AC8E66' }}>Word</span> (.docx, .doc)</li>
              <li><span style={{ color: '#AC8E66' }}>HTML</span> (.html, .htm)</li>
              <li><span style={{ color: '#AC8E66' }}>JSON</span> (.json)</li>
              <li><span style={{ color: '#AC8E66' }}>Text</span> (.txt)</li>
            </ul>
          </div>

          <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            color: '#777',
            lineHeight: '1.6',
          }}>
            Die Datei wird automatisch zu Markdown konvertiert und die AI optimiert den Inhalt für deine Zielplattform.
          </p>
       
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                   <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            color: '#777',
            lineHeight: '1.6',
          }}>
            Hast du ein anderes Format? <span>Nutze einfach den Converter</span> 
       

            </p>
      
          </div>
          <div className='flex justify-center mt-4'>
            <ZenRoughButton
              label="Converter öffnen"
              icon={<FontAwesomeIcon icon={faCheckCircle} className="text-[#AC8E66] " />}
              onClick={() => {
                setShowTipModal(false);
                onOpenConverter?.();
              }}
              variant="default"
            />
          </div>
        </div>
      </ZenModal>
    </div>
  );
};
