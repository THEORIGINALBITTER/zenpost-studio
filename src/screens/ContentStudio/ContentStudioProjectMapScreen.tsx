import { useMemo, useRef, useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDownAZ, faCalendarDays, faCloud, faFileImport, faFolderOpen, faGlobe, faImage, faStickyNote } from '@fortawesome/free-solid-svg-icons';
import { getWebProjectName, isWebProjectPath } from '../../services/webProjectService';
import { getCloudProjectName, isCloudProjectPath } from '../../services/cloudProjectService';
import { getCloudDocumentUrl } from '../../services/cloudStorageService';
import { loadLocalZenNoteMeta } from '../../services/zenNoteMetaService';
import { parseZenNoteFileName, resolveZenNoteFolderColor, resolveZenNoteTagColor } from '../../services/zenNoteColorService';
import {
  CONVERTER_IMAGE_ACTIONS,
  openImageAssetInConverter,
  type ConverterImageAsset,
} from '../../services/assetActionService';
import {
  buildContentStudioAggregateItems,
  matchesContentStudioSearch,
  sortContentStudioAggregateItems,
  type ContentStudioAggregateItem,
  type ContentStudioAggregateItemSource,
} from '../../services/contentStudioSearchService';
import {
  transferContentStudioItem,
  type ContentStudioTransferItem,
  type ContentStudioTransferExecutionTarget,
} from '../../services/contentStudioTransferService';
import { listResolvedContentStudioTransferTargets } from '../../services/contentStudioTransferBridgeService';

type StudioFile = {
  path: string;
  name: string;
  modifiedAt?: number;
};

type WebDocument = {
  id: string;
  name: string;
  content: string;
  updatedAt: number;
};

type ContentStudioProjectMapScreenProps = {
  isDesktopRuntime: boolean;
  projectPath: string | null;
  allFiles: StudioFile[];
  webDocuments: WebDocument[];
  cloudDocuments: Array<{ id: number; fileName: string; createdAt: string }>;
  showServerTab?: boolean;
  serverArticles?: unknown[];
  serverArticlesLoading?: boolean;
  serverError?: string | null;
  serverName?: string;
  serverLocalCachePath?: string | null;
  onActivateWebTab?: () => void;
  onActivateCloudTab?: () => void;
  onActivateZenNoteTab?: () => void;
  onActivateServerTab?: () => void;
  onBack: () => void;
  onStartWriting: () => void;
  onImportDocument: (file: File, context: 'files' | 'web' | 'cloud' | 'zennote' | 'server') => Promise<void>;
  onOpenFile: (filePath: string) => void;
  onPreviewLocalImage?: (filePath: string, fileName: string) => void;
  onPreviewLocalDocument?: (filePath: string, fileName: string) => void;
  onLoadWebDocument: (content: string, fileName: string) => void;
  onPreviewWebDocument?: (content: string, fileName: string) => void;
  onOpenCloudDocument: (docId: number, fileName: string) => void;
  onOpenZenNoteDocument?: (docId: number, fileName: string) => void;
  onPreviewCloudDocument?: (docId: number, fileName: string) => void;
  onPreviewZenNoteDocument?: (docId: number, fileName: string) => void;
  onPreviewCloudImage?: (docId: number, fileName: string) => void;
  onOpenServerArticle?: (slug: string) => void;
  onPreviewServerArticle?: (slug: string) => void;
  onRefreshProjectMapData?: () => Promise<void> | void;
};

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'avif', 'bmp']);

const isImageFileName = (fileName: string): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.has(extension);
};

const getFileKindLabel = (fileName: string): 'Bild' | 'Dokument' => (
  isImageFileName(fileName) ? 'Bild' : 'Dokument'
);

const getAggregateItemThumbnailUrl = (item: ContentStudioAggregateItem): string | null => {
  if (item.source === 'cloud' && isImageFileName(item.payload.fileName)) {
    return getCloudDocumentUrl(item.payload.docId);
  }
  return null;
};

const formatLocalPathTail = (path: string, depth = 2): string => {
  const normalized = path.trim().replace(/[\\/]+$/, '');
  if (!normalized) return '';
  const parts = normalized.split(/[\\/]/).filter(Boolean);
  return parts.slice(-depth).join('/');
};

const groupTransferTargets = (targets: ContentStudioTransferExecutionTarget[]) => {
  const localTargets = targets.filter((target) => target.target === 'local');
  const onlineTargets = targets.filter((target) => target.target !== 'local');
  return [
    ...(localTargets.length > 0 ? [{ key: 'local', label: 'Lokal', items: localTargets }] : []),
    ...(onlineTargets.length > 0 ? [{ key: 'online', label: 'Online', items: onlineTargets }] : []),
  ];
};

export function ContentStudioProjectMapScreen({
  isDesktopRuntime,
  projectPath,
  allFiles,
  webDocuments,
  cloudDocuments,
  showServerTab = false,
  serverArticles = [],
  serverArticlesLoading = false,
  serverError = null,
  serverName,
  serverLocalCachePath = null,
  onActivateWebTab,
  onActivateCloudTab,
  onActivateZenNoteTab,
  onActivateServerTab,
  onBack,
  onStartWriting: _onStartWriting,
  onImportDocument,
  onOpenFile,
  onPreviewLocalImage,
  onPreviewLocalDocument,
  onLoadWebDocument,
  onPreviewWebDocument,
  onOpenCloudDocument,
  onOpenZenNoteDocument,
  onPreviewCloudDocument,
  onPreviewZenNoteDocument,
  onPreviewCloudImage,
  onOpenServerArticle,
  onPreviewServerArticle,
  onRefreshProjectMapData,
}: ContentStudioProjectMapScreenProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const transferMenuRef = useRef<HTMLDivElement | null>(null);
  const assetMenuRef = useRef<HTMLDivElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fileSearch, setFileSearch] = useState('');
  const [fileSort, setFileSort] = useState<'name-asc' | 'name-desc' | 'date-desc' | 'date-asc'>('name-asc');
  const [activeTab, setActiveTab] = useState<'project' | 'web' | 'cloud' | 'zennote' | 'server'>(isDesktopRuntime ? 'project' : 'web');
  const [aggregateSourceFilter, setAggregateSourceFilter] = useState<'all' | ContentStudioAggregateItemSource>('all');
  const [aggregateKindFilter, setAggregateKindFilter] = useState<'all' | 'image' | 'document'>('all');
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [transferMenuItemId, setTransferMenuItemId] = useState<string | null>(null);
  const [assetMenuItemId, setAssetMenuItemId] = useState<string | null>(null);
  const [transferMenuGroupKey, setTransferMenuGroupKey] = useState<'local' | 'online' | null>(null);
  const [transferMenuSide, setTransferMenuSide] = useState<'left' | 'right'>('left');
  const [transferingItemId, setTransferingItemId] = useState<string | null>(null);
  const [transferFeedback, setTransferFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [lastLocalTransfer, setLastLocalTransfer] = useState<{ itemId: string; pathLabel: string } | null>(null);
  const [hoveredTransferTargetId, setHoveredTransferTargetId] = useState<string | null>(null);
  const [titleHovered, setTitleHovered] = useState(false);
  const [zenNoteMetaSyncTick, setZenNoteMetaSyncTick] = useState(0);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (
        event.key === 'zenpost_zennote_tag_colors' ||
        event.key === 'zenpost_zennote_folder_colors' ||
        event.key === 'zenpost_zennote_custom_tags'
      ) {
        setZenNoteMetaSyncTick((current) => current + 1);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const zenNoteMeta = useMemo(() => loadLocalZenNoteMeta(), [zenNoteMetaSyncTick]);

  const filteredWebDocuments = useMemo(
    () => webDocuments.filter((doc) => matchesContentStudioSearch(doc.name, doc.name, fileSearch)),
    [webDocuments, fileSearch]
  );

  const filteredCloudDocuments = useMemo(
    () => cloudDocuments.filter((doc) =>
      !doc.fileName.endsWith('.json') &&
      !doc.fileName.endsWith('.zennote') &&
      matchesContentStudioSearch(doc.fileName, doc.fileName, fileSearch)
    ),
    [cloudDocuments, fileSearch]
  );

  const filteredZenNoteDocuments = useMemo(
    () => cloudDocuments.filter((doc) =>
      doc.fileName.endsWith('.zennote') &&
      matchesContentStudioSearch(doc.fileName, doc.fileName, fileSearch)
    ),
    [cloudDocuments, fileSearch]
  );

  const filteredServerArticles = useMemo(
    () =>
      (Array.isArray(serverArticles) ? serverArticles : []).filter((raw) => {
        const slug = typeof raw === 'string' ? raw : ((raw as { slug?: string }).slug ?? '');
        const title = typeof raw === 'string' ? raw : ((raw as { title?: string }).title || slug);
        return matchesContentStudioSearch(title, slug, fileSearch);
      }),
    [serverArticles, fileSearch]
  );

  const aggregateItems = useMemo(
    () =>
      buildContentStudioAggregateItems({
        localFiles: allFiles,
        webDocuments,
        cloudDocuments,
        serverArticles: showServerTab ? serverArticles : [],
      }),
    [allFiles, cloudDocuments, serverArticles, showServerTab, webDocuments]
  );

  const filteredAggregateItems = useMemo(
    () =>
      sortContentStudioAggregateItems(
        aggregateItems.filter((item) => {
          const matchesSource = aggregateSourceFilter === 'all' || item.source === aggregateSourceFilter;
          const itemFileName =
            item.source === 'local'
              ? item.title
              : item.source === 'web'
                ? item.payload.fileName
                : item.source === 'cloud' || item.source === 'zennote'
                  ? item.payload.fileName
                  : item.source === 'server'
                    ? `${item.payload.slug}.md`
                    : item.title;
          const isImage = isImageFileName(itemFileName);
          const matchesKind =
            aggregateKindFilter === 'all' ||
            (aggregateKindFilter === 'image' && isImage) ||
            (aggregateKindFilter === 'document' && !isImage);
          return matchesSource && matchesKind && matchesContentStudioSearch(item.title, item.searchPath, fileSearch);
        }),
        fileSort
      ),
    [aggregateItems, aggregateKindFilter, aggregateSourceFilter, fileSearch, fileSort]
  );

  const aggregateImageCount = useMemo(() => {
    return aggregateItems.filter((item) => {
      const itemFileName =
        item.source === 'local'
          ? item.title
          : item.source === 'web'
            ? item.payload.fileName
            : item.source === 'cloud' || item.source === 'zennote'
              ? item.payload.fileName
              : item.source === 'server'
                ? `${item.payload.slug}.md`
                : item.title;
      return isImageFileName(itemFileName);
    }).length;
  }, [aggregateItems]);

  const aggregateDocumentCount = aggregateItems.length - aggregateImageCount;

  const zenNoteCount = cloudDocuments.filter((doc) => doc.fileName.endsWith('.zennote')).length;

  useEffect(() => {
    if (projectPath && isCloudProjectPath(projectPath)) {
      setActiveTab('cloud');
      return;
    }
    setActiveTab('project');
  }, [projectPath]);

  useEffect(() => {
    if (showServerTab || activeTab !== 'server') return;
    if (projectPath && isCloudProjectPath(projectPath)) {
      setActiveTab('cloud');
      return;
    }
    setActiveTab('project');
  }, [activeTab, isDesktopRuntime, projectPath, showServerTab]);

  useEffect(() => {
    if (!transferMenuItemId) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (transferMenuRef.current && target && !transferMenuRef.current.contains(target)) {
        setTransferMenuItemId(null);
        setTransferMenuGroupKey(null);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [transferMenuItemId]);

  useEffect(() => {
    if (!assetMenuItemId) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (assetMenuRef.current && target && !assetMenuRef.current.contains(target)) {
        setAssetMenuItemId(null);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [assetMenuItemId]);

  const projectContextLabel = useMemo(() => {
    if (activeTab === 'server') {
      if (serverName && serverLocalCachePath) return `Server: ${serverName} · Cache: ${serverLocalCachePath}`;
      if (serverName) return `Server: ${serverName}`;
      if (serverLocalCachePath) return `Server Cache: ${serverLocalCachePath}`;
      return 'Server-Inhalte';
    }

    if (activeTab === 'cloud' || activeTab === 'zennote') {
      if (projectPath && isCloudProjectPath(projectPath)) {
        const cloudName = getCloudProjectName(projectPath);
        return cloudName ? `Cloud-Projekt: ${cloudName}` : `Cloud-Projekt: ${projectPath}`;
      }
      return 'Kein Cloud-Projekt ausgewählt';
    }

    if (activeTab === 'web') {
      if (projectPath && isWebProjectPath(projectPath)) {
        const webName = getWebProjectName(projectPath);
        return webName ? `Web-Projekt: ${webName}` : `Web-Projekt: ${projectPath}`;
      }
      return 'Web-Dokumente';
    }

    return projectPath ? `Aktueller Projekt Ordner: ${projectPath}` : 'Kein Projekt ausgewählt';
  }, [activeTab, projectPath, serverLocalCachePath, serverName]);

  const handleDroppedFile = async (file: File) => {
    setLoadError(null);
    setIsConverting(true);
    try {
      const importContext =
        activeTab === 'project'
          ? (projectPath && isCloudProjectPath(projectPath) ? 'cloud' : 'files')
          : activeTab;
      await onImportDocument(file, importContext);
    } catch {
      setLoadError('Datei konnte nicht geladen werden.');
    } finally {
      setIsConverting(false);
    }
  };

  const openAggregateItem = (item: ContentStudioAggregateItem) => {
    if (item.source === 'local') {
      onOpenFile(item.payload.path);
      return;
    }
    if (item.source === 'web') {
      onLoadWebDocument(item.payload.content, item.payload.fileName);
      return;
    }
    if (item.source === 'cloud') {
      onOpenCloudDocument(item.payload.docId, item.payload.fileName);
      return;
    }
    if (item.source === 'zennote') {
      onOpenZenNoteDocument?.(item.payload.docId, item.payload.fileName);
      return;
    }
    if (item.source === 'server') {
      onOpenServerArticle?.(item.payload.slug);
    }
  };

  const previewAggregateItem = (item: ContentStudioAggregateItem): boolean => {
    if (item.source === 'local' && isImageFileName(item.title) && onPreviewLocalImage) {
      onPreviewLocalImage(item.payload.path, item.title);
      return true;
    }
    if (item.source === 'local' && !isImageFileName(item.title) && onPreviewLocalDocument) {
      onPreviewLocalDocument(item.payload.path, item.title);
      return true;
    }
    if (item.source === 'web' && onPreviewWebDocument) {
      onPreviewWebDocument(item.payload.content, item.payload.fileName);
      return true;
    }
    if (item.source === 'cloud' && isImageFileName(item.payload.fileName) && onPreviewCloudImage) {
      onPreviewCloudImage(item.payload.docId, item.payload.fileName);
      return true;
    }
    if (item.source === 'cloud' && !isImageFileName(item.payload.fileName) && onPreviewCloudDocument) {
      onPreviewCloudDocument(item.payload.docId, item.payload.fileName);
      return true;
    }
    if (item.source === 'zennote' && onPreviewZenNoteDocument) {
      onPreviewZenNoteDocument(item.payload.docId, item.payload.fileName);
      return true;
    }
    if (item.source === 'server' && onPreviewServerArticle) {
      onPreviewServerArticle(item.payload.slug);
      return true;
    }
    return false;
  };

  const previewCloudDocument = (docId: number, fileName: string): boolean => {
    if (isImageFileName(fileName) && onPreviewCloudImage) {
      onPreviewCloudImage(docId, fileName);
      return true;
    }
    if (!isImageFileName(fileName) && onPreviewCloudDocument) {
      onPreviewCloudDocument(docId, fileName);
      return true;
    }
    return false;
  };

  const previewZenNoteDocument = (docId: number, fileName: string): boolean => {
    if (!onPreviewZenNoteDocument) return false;
    onPreviewZenNoteDocument(docId, fileName);
    return true;
  };

  const localTransferDirectoryPath = useMemo(() => {
    if (!isDesktopRuntime || !projectPath) return null;
    if (isCloudProjectPath(projectPath) || isWebProjectPath(projectPath)) return null;
    return projectPath;
  }, [isDesktopRuntime, projectPath]);

  const mapAggregateItemToTransferItem = (item: ContentStudioAggregateItem): ContentStudioTransferItem | null => {
    if (item.source === 'local') {
      return {
        source: 'local',
        fileName: item.title,
        path: item.payload.path,
      };
    }
    if (item.source === 'web') {
      return {
        source: 'web',
        fileName: item.payload.fileName,
        content: item.payload.content,
      };
    }
    if (item.source === 'cloud' || item.source === 'zennote') {
      return {
        source: item.source,
        fileName: item.payload.fileName,
        docId: item.payload.docId,
      };
    }
    if (item.source === 'server') {
      return {
        source: 'server',
        fileName: item.payload.slug ? `${item.payload.slug}.md` : `${item.title}.md`,
        slug: item.payload.slug,
      };
    }
    return null;
  };

  const getTransferTargetsForItem = (item: ContentStudioAggregateItem) => {
    const transferItem = mapAggregateItemToTransferItem(item);
    if (!transferItem) return [];
    return listResolvedContentStudioTransferTargets(transferItem, {
      localDirectoryPath: localTransferDirectoryPath,
    });
  };

  const handleTransferItem = async (item: ContentStudioAggregateItem, target: ContentStudioTransferExecutionTarget) => {
    const transferItem = mapAggregateItemToTransferItem(item);
    if (!transferItem) {
      setTransferFeedback({ ok: false, message: 'Für diese Quelle ist Transfer noch nicht verfügbar.' });
      return;
    }
    setTransferingItemId(item.id);
    setTransferMenuItemId(null);
    const result = await transferContentStudioItem(transferItem, target, {
      localDirectoryPath: localTransferDirectoryPath,
    });
    setTransferingItemId(null);
    if (!result.success) {
      setLastLocalTransfer(null);
      setTransferFeedback({ ok: false, message: result.error });
      return;
    }
    const localPathLabel = result.localPath ? formatLocalPathTail(result.localPath) : '';
    const localTransferHint = localPathLabel ? ` · lokal gespeichert in ${localPathLabel}` : '';
    if (localPathLabel) {
      setLastLocalTransfer({ itemId: item.id, pathLabel: localPathLabel });
    } else {
      setLastLocalTransfer(null);
    }
    setTransferFeedback({
      ok: true,
      message: `${target.label}: ${result.fileName}${localTransferHint}`,
    });
    await onRefreshProjectMapData?.();
  };

  const canOpenItemInConverter = (item: ContentStudioAggregateItem): boolean => {
    if (!isImageFileName(item.title)) return false;
    return item.source === 'local' || item.source === 'cloud';
  };

  const toConverterImageAsset = (item: ContentStudioAggregateItem): ConverterImageAsset | null => {
    if (!canOpenItemInConverter(item)) return null;
    if (item.source === 'local') {
      return {
        source: 'local',
        fileName: item.title,
        path: item.payload.path,
      };
    }
    if (item.source === 'cloud') {
      return {
        source: 'cloud',
        fileName: item.payload.fileName,
        docId: item.payload.docId,
      };
    }
    return null;
  };

  const handleOpenImageInConverter = async (
    item: ContentStudioAggregateItem,
    preset: 'default' | 'format-change' | 'compress-image' | 'image-filters' = 'default',
  ) => {
    const asset = toConverterImageAsset(item);
    if (!asset) return;
    const result = await openImageAssetInConverter(asset, preset);
    if (!result.success) {
      setTransferFeedback({ ok: false, message: result.error });
    }
  };

  const getImageAssetActions = (item: ContentStudioAggregateItem) => {
    if (!canOpenItemInConverter(item)) return [];

    return [
      {
        key: 'open',
        label: 'Öffnen',
        description: 'Vorschau des Bildes anzeigen',
        action: () => {
          if (!previewAggregateItem(item)) {
            openAggregateItem(item);
          }
        },
      },
      {
        key: 'converter',
        label: 'Im Converter öffnen',
        description: 'Bild direkt in den Converter laden',
        action: () => { void handleOpenImageInConverter(item, 'default'); },
      },
      ...CONVERTER_IMAGE_ACTIONS.filter((action) => action.key !== 'converter').map((action) => ({
        key: action.key,
        label: action.label,
        description: action.description,
        action: () => { void handleOpenImageInConverter(item, action.preset); },
      })),
    ];
  };

  return (
    <div className="flex items-center bg-[#1a1a1a] justify-center mt-[50px] mb-[24px] px-[12px]">
      <div
        style={{
          width: '100%',
          maxWidth: '1020px',
          borderRadius: '14px',
          border: '0.5px solid #2F2F2F',
          background: '#e8e3d8',
          padding: 'clamp(18px, 4vw, 40px)',
          textAlign: 'left',
        }}
      >
        <div style={{ marginBottom: '12px' }}>
          <div
            onClick={onBack}
            title="Zurück zum Dashboard"
            onMouseEnter={() => setTitleHovered(true)}
            onMouseLeave={() => setTitleHovered(false)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
            }}
          >
            <FontAwesomeIcon icon={faFolderOpen} style={{ fontSize: '22px', color: '#AC8E66' }} />
            <div style={{ position: 'relative', overflow: 'hidden', height: '27px' }}>
              {/* Original text — slides up on hover */}
              <h2 style={{
                fontSize: '18px', color: '#3e362c', margin: 0,
                fontFamily: 'IBM Plex Mono, monospace', whiteSpace: 'nowrap',
                transform: titleHovered ? 'translateY(-100%)' : 'translateY(0)',
                opacity: titleHovered ? 0 : 1,
                transition: 'transform 0.22s ease, opacity 0.18s ease',
              }}>
                Content Projektmappe
              </h2>
              {/* Hover text — slides in from below */}
              <h2 style={{
                fontSize: '18px', fontWeight: 400, color: '#3e362c', margin: 0,
                fontFamily: 'IBM Plex Mono, monospace', whiteSpace: 'nowrap',
                position: 'absolute', top: 0, left: 0,
                transform: titleHovered ? 'translateY(0)' : 'translateY(100%)',
                opacity: titleHovered ? 1 : 0,
                transition: 'transform 0.22s ease, opacity 0.18s ease',
              }}>
                zum Dashbord →
              </h2>
            </div>
          </div>
        </div>

        <p style={{ color: '#3e362c', marginBottom: '14px', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace' }}>
          {projectContextLabel}
        </p>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragActive(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void handleDroppedFile(file);
          }}
          style={{
            background: '#d2cabd',
            border: `1px dashed ${isDragActive ? '#AC8E66' : '#3A3A3A'}`,
            borderRadius: '12px',
            padding: '18px',
            textAlign: 'center',
            marginBottom: '14px',
            color: '#3e362c',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
          }}
        >
          {isConverting ? 'Konvertiere Dokument…' : 'Datei hier ablegen (Drag & Drop)'}
          <div style={{ marginTop: '8px', fontSize: '9px', color: '#1a1a1a/20' }}>
            Unterstützt: .md, .txt, .json, .pdf, .docx, .doc, .pages
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              marginTop: '10px',
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px dotted  rgba(30, 24, 16, 0.9',
              background: 'transparent',
              color: '#3e362c',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            <FontAwesomeIcon icon={faFileImport} /> Dokument laden
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,.json,.pdf,.docx,.doc,.pages"
            style={{ display: 'none' }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleDroppedFile(file);
              event.currentTarget.value = '';
            }}
          />
        </div>

        {loadError && (
          <div style={{ marginBottom: '12px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#e07a7a' }}>
            {loadError}
          </div>
        )}

        {transferFeedback && (
          <div
            style={{
              marginBottom: '12px',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              color: transferFeedback.ok ? '#1F8A41' : '#B3261E',
            }}
          >
            {transferFeedback.message}
          </div>
        )}

        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          <button
            onClick={() => setActiveTab('project')}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: `1px solid ${activeTab === 'project' ? '#3e362c' : '#3A3A3A'}`,
              background: activeTab === 'project' ? ' #3e362c' : 'transparent',
              color: activeTab === 'project' ? '#e8e3d8' : '#777',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            Projektinhalt
          </button>
          <button
            onClick={() => {
              setActiveTab('web');
              onActivateWebTab?.();
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: `1px solid ${activeTab === 'web' ? '#3e362c' : '#3A3A3A'}`,
              background: activeTab === 'web' ? ' #3e362c' : 'transparent',
              color: activeTab === 'web' ? '#e8e3d8' : '#777',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            Web · {webDocuments.length}
          </button>
          <button
            onClick={() => {
              setActiveTab('cloud');
              onActivateCloudTab?.();
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: `1px solid ${activeTab === 'cloud' ? '#3e362c' : '#3A3A3A'}`,
              background: activeTab === 'cloud' ? ' #3e362c' : 'transparent',
              color: activeTab === 'cloud' ? '#e8e3d8' : '#777',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <FontAwesomeIcon icon={faCloud} style={{ fontSize: '10px' }} />
            ZenCloud · {cloudDocuments.filter((d) => !d.fileName.endsWith('.json') && !d.fileName.endsWith('.zennote')).length}
          </button>
          <button
            onClick={() => {
              setActiveTab('zennote');
              onActivateZenNoteTab?.();
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: `1px solid ${activeTab === 'zennote' ? '#3e362c' : '#3A3A3A'}`,
              background: activeTab === 'zennote' ? ' #3e362c' : 'transparent',
              color: activeTab === 'zennote' ? '#e8e3d8' : '#777',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <FontAwesomeIcon icon={faStickyNote} style={{ fontSize: '10px' }} />
            ZenNote · {zenNoteCount}
          </button>
          {showServerTab && (
            <button
              onClick={() => {
                setActiveTab('server');
                onActivateServerTab?.();
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: `1px solid ${activeTab === 'server' ? '#3e362c' : '#3A3A3A'}`,
                background: activeTab === 'server' ? ' #3e362c' : 'transparent',
                color: activeTab === 'server' ? '#e8e3d8' : '#777',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '10px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <FontAwesomeIcon icon={faGlobe} style={{ fontSize: '10px' }} />
              Server · {Array.isArray(serverArticles) ? serverArticles.length : 0}
            </button>
          )}
        </div>

        <div style={{ 
          marginBottom: '10px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ 
            fontFamily: 'IBM Plex Mono, monospace', 
            fontSize: '11px', 
            color: '#252525' }}>
            {activeTab === 'project'
              ? 'Projektinhalt'
              : activeTab === 'cloud'
                ? 'Cloud-Dokumente'
                : activeTab === 'zennote'
                  ? 'ZenNote Notizen'
                  : activeTab === 'server'
                    ? 'Server Artikel'
                    : 'Web-Dokumente'}
          </span>
          {activeTab === 'project' && (
            <button
              type="button"
              onClick={() =>
                setFileSort((prev) =>
                  prev === 'name-asc'
                    ? 'name-desc'
                    : prev === 'name-desc'
                      ? 'date-desc'
                      : prev === 'date-desc'
                        ? 'date-asc'
                        : 'name-asc'
                )
              }
              style={{
                border: '0.5px solid #3e362c',
                borderRadius: '8px',
                padding: '6px 10px',
                color: '#252525',
                background: 'transparent',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '10px',
              }}
            >
              <FontAwesomeIcon icon={fileSort.startsWith('name') ? faArrowDownAZ : faCalendarDays} />
              {fileSort === 'name-asc' ? 'A-Z' : fileSort === 'name-desc' ? 'Z-A' : fileSort === 'date-desc' ? 'Neueste' : 'Aelteste'}
            </button>
          )}
        </div>

        <input
          type="text"
          value={fileSearch}
          onChange={(event) => setFileSearch(event.target.value)}
          placeholder="Suchen...und finden"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '8px 10px',
            border: '1px solid rgba(30, 24, 16, 0.75)',
            borderRadius: '8px',
            background: 'transparent',
            color: '#3e362c',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '10px',
            marginBottom: '12px',
          }}
        />

        {activeTab === 'project' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              marginBottom: '12px',
            }}
          >
            {([
              { id: 'all', label: `Alle · ${aggregateItems.length}` },
              { id: 'local', label: `Lokal · ${aggregateItems.filter((item) => item.source === 'local').length}` },
              { id: 'web', label: `Web · ${aggregateItems.filter((item) => item.source === 'web').length}` },
              { id: 'cloud', label: `ZenCloud · ${aggregateItems.filter((item) => item.source === 'cloud').length}` },
              { id: 'zennote', label: `ZenNote · ${aggregateItems.filter((item) => item.source === 'zennote').length}` },
              ...(showServerTab
                ? [{ id: 'server', label: `Server · ${aggregateItems.filter((item) => item.source === 'server').length}` }]
                : []),
            ] as Array<{ id: 'all' | ContentStudioAggregateItemSource; label: string }>).map((chip) => {
              const isActive = aggregateSourceFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setAggregateSourceFilter(chip.id)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: `1px solid ${isActive ? '#3e362c' : '#8f8473'}`,
                    background: isActive ? '#3e362c' : 'transparent',
                    color: isActive ? '#e8e3d8' : '#3e362c',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '9px',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'project' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              marginBottom: '12px',
            }}
          >
            {([
              { id: 'all', label: `Typ · Alle ${aggregateItems.length}` },
              { id: 'image', label: `Bild · ${aggregateImageCount}` },
              { id: 'document', label: `Dokument · ${aggregateDocumentCount}` },
            ] as const).map((chip) => {
              const isActive = aggregateKindFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setAggregateKindFilter(chip.id)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '4px',
                    border: `1px solid ${isActive ? '#AC8E66' : 'rgba(143,132,115,0.9)'}`,
                    background: isActive ? '#3e362c' : 'transparent',
                    color: isActive ? '#e8e3d8' : '#3e362c',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '9px',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease, border-color 0.15s ease',
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activeTab === 'project'
            ? filteredAggregateItems.map((item) => {
                const thumbnailUrl = getAggregateItemThumbnailUrl(item);
                const parsedZenNote =
                  item.source === 'zennote'
                    ? parseZenNoteFileName(item.payload.fileName)
                    : null;
                const zenNoteFolderColor = parsedZenNote?.folder
                  ? resolveZenNoteFolderColor(parsedZenNote.folder, zenNoteMeta.folderColors, '#AC8E66')
                  : '#AC8E66';
                const zenNoteTagColor = parsedZenNote?.tag
                  ? resolveZenNoteTagColor(parsedZenNote.tag, zenNoteMeta.tagColors)
                  : '#777';
                const isImageItem =
                  item.source === 'local'
                    ? isImageFileName(item.title)
                    : item.source === 'cloud'
                      ? isImageFileName(item.payload.fileName)
                      : false;
                const itemFileName =
                  item.source === 'local'
                    ? item.title
                    : item.source === 'web'
                      ? item.payload.fileName
                      : item.source === 'cloud' || item.source === 'zennote'
                        ? item.payload.fileName
                        : item.source === 'server'
                          ? `${item.payload.slug}.md`
                          : item.title;
                const itemKindLabel = getFileKindLabel(itemFileName);
                return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (previewAggregateItem(item)) return;
                    openAggregateItem(item);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      openAggregateItem(item);
                      return;
                    }
                    if (event.key !== ' ') return;
                    event.preventDefault();
                    void previewAggregateItem(item);
                  }}
                  onMouseEnter={() => setHoveredItemId(item.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  style={{
                    border: hoveredItemId === item.id
                      ? `1px solid ${item.source === 'zennote' ? zenNoteFolderColor : '#4caf50'}`
                      : '0.5px solid #3A3A3A',
                    borderLeft: item.source === 'zennote' ? `4px solid ${zenNoteFolderColor}` : undefined,
                    borderRadius: '10px',
                    padding: '8px 10px',
                    minHeight: isImageItem ? '62px' : '54px',
                    background: hoveredItemId === item.id
                      ? item.source === 'zennote'
                        ? `${zenNoteFolderColor}90`
                        : 'rgba(205,195,176,0.08)'
                      : 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#3e362c',
                    fontFamily: 'IBM Plex Mono, monospace',
                    position: 'relative',
                    zIndex: transferMenuItemId === item.id ? 3 : 1,
                    overflow: 'visible',
                    transform: hoveredItemId === item.id ? 'translateX(3px)' : 'translateX(0)',
                    transition: 'transform 0.15s ease, border-color 0.15s ease, background 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1 }}>
                      {isImageItem ? (
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '7px',
                            border: '0.5px solid rgba(62,54,44,0.28)',
                            background: thumbnailUrl ? 'rgba(255,255,255,0.18)' : 'rgba(172,142,102,0.10)',
                            overflow: 'hidden',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {thumbnailUrl ? (
                            <img
                              src={thumbnailUrl}
                              alt={item.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          ) : (
                            <FontAwesomeIcon icon={faImage} style={{ fontSize: '18px', color: '#AC8E66' }} />
                          )}
                        </div>
                      ) : null}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '10px', color: '#252525', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.35 }}>
                          {item.source === 'zennote' ? (parsedZenNote?.title || item.title) : item.title}
                        </div>
                        {item.source === 'zennote' ? (
                          <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                            {parsedZenNote?.folder ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  background: `${zenNoteFolderColor}90`,
                                  border: `0.5px solid ${zenNoteFolderColor}44`,
                                  color: '#252525',
                                  fontSize: '8px',
                                  letterSpacing: '0.04em',
                                  textTransform: 'uppercase',
                                }}
                              >
                                Ordner · {parsedZenNote.folder}
                              </span>
                            ) : null}
                            {parsedZenNote?.tag ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  background: '#3e362c',
                                  border: `0.5px solid ${zenNoteTagColor}66`,
                                  color: '#e8e3d8',
                                  fontSize: '8px',
                                  fontWeight: 600,
                                  letterSpacing: '0.04em',
                                  textTransform: 'uppercase',
                                }}
                              >
                                Tag · {parsedZenNote.tag}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <div style={{ fontSize: '8px', color: '#6a5f51', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '3px' }}>
                            {item.subtitle}
                          </div>
                        )}
                        {lastLocalTransfer?.itemId === item.id && (
                          <div
                            style={{
                              marginTop: '5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '2px 7px',
                              borderRadius: '5px',
                              border: '0.5px solid rgba(31,138,65,0.24)',
                              background: 'rgba(31,138,65,0.08)',
                              color: '#1F8A41',
                              fontSize: '8px',
                              fontWeight: 600,
                              letterSpacing: '0.03em',
                            }}
                          >
                            Lokal → {lastLocalTransfer.pathLabel}
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      ref={transferMenuItemId === item.id ? transferMenuRef : null}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '6px',
                        flexShrink: 0,
                        position: 'relative',
                        overflow: 'visible',
                        zIndex: transferMenuItemId === item.id || assetMenuItemId === item.id ? 180 : 2,
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '0.5px solid rgba(62,54,44,0.18)',
                            background: itemKindLabel === 'Bild' ? 'rgba(172,142,102,0.3)' : 'rgba(62,54,44,0.03)',
                            color: '#5c5248',
                            fontSize: '8px',
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {itemKindLabel}
                        </div>
                        <div
                          style={{
                            padding: '2px 6px',
                            borderRadius: '5px',
                            border: item.source === 'zennote'
                              ? `0.5px solid ${zenNoteFolderColor}36`
                              : '0.5px solid rgba(62,54,44,0.18)',
                            background: item.source === 'zennote' ? `${zenNoteFolderColor}80` : 'rgba(62,54,44,0.03)',
                            color: item.source === 'zennote' ? '#252525' : '#5c5248',
                            fontSize: '8px',
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {item.source === 'local'
                            ? 'Lokal'
                            : item.source === 'web'
                              ? 'Web'
                              : item.source === 'cloud'
                                ? 'Cloud'
                                : item.source === 'zennote'
                                  ? 'ZenNote'
                                  : 'Server'}
                        </div>
                      </div>
                      {getImageAssetActions(item).length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setAssetMenuItemId((current) => current === item.id ? null : item.id);
                            setTransferMenuItemId((current) => current === item.id ? null : current);
                          }}
                          style={{
                            border: '0.5px solid rgba(172,142,102,0.32)',
                            borderRadius: '8px',
                            background: 'rgba(172,142,102,0.08)',
                            color: '#7a6d5c',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '8px',
                            lineHeight: 1,
                            height: '28px',
                            padding: '0 9px',
                            cursor: 'pointer',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                            zIndex: 200
                          }}
                          aria-label="Bildaktionen öffnen"
                        >
                          Aktionen
                        </button>
                      )}
                      {assetMenuItemId === item.id && (
                        <div
                          ref={assetMenuRef}
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            transform: 'translateY(-100%)',
                            right: getTransferTargetsForItem(item).length > 0 ? '34px' : 0,
                            width: '248px',
                            borderRadius: '12px',
                            border: '1px solid rgba(62,54,44,0.18)',
                            background: 'rgba(239,232,220,0.92)',
                            backdropFilter: 'blur(18px)',
                            WebkitBackdropFilter: 'blur(18px)',
                            boxShadow: '0 22px 48px rgba(0,0,0,0.22)',
                            padding: '6px',
                            zIndex: 240,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                           
                          }}
                        >
                          <div
                            style={{
                              padding: '4px 6px 2px',
                              fontSize: '7px',
                              letterSpacing: '0.12em',
                              textTransform: 'uppercase',
                              color: '#8a7b68',
                              fontFamily: 'IBM Plex Mono, monospace',
                             
                            }}
                          >
                            Bildaktionen
                          </div>
                          {getImageAssetActions(item).map((assetAction) => (
                            <button
                              key={`${item.id}:asset:${assetAction.key}`}
                              type="button"
                              onClick={() => {
                                setAssetMenuItemId(null);
                                assetAction.action();
                              }}
                              style={{
                                textAlign: 'left',
                                border: '1px solid rgba(62,54,44,0.16)',
                                borderRadius: '9px',
                                background: 'rgba(255,255,255,0.14)',
                                color: '#3e362c',
                                fontFamily: 'IBM Plex Mono, monospace',
                                fontSize: '9px',
                                padding: '8px 9px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: '10px', color: '#252525', marginBottom: '1px' }}>{assetAction.label}</div>
                                <div
                                  style={{
                                    fontSize: '7px',
                                    color: '#6c6254',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {assetAction.description}
                                </div>
                              </div>
                              <div style={{ flexShrink: 0, fontSize: '11px', color: '#7a6d5c', opacity: 0.9 }}>
                                →
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {getTransferTargetsForItem(item).length > 0 && (
                      <button
                        type="button"
                        onClick={(event) => {
                          const triggerRect = event.currentTarget.getBoundingClientRect();
                          const menuWidth = 236;
                          const openLeft = triggerRect.left + menuWidth > window.innerWidth - 16;
                          const groupedTargets = groupTransferTargets(getTransferTargetsForItem(item));
                          setTransferMenuSide(openLeft ? 'left' : 'right');
                          setTransferMenuItemId((current) => {
                            const next = current === item.id ? null : item.id;
                            setTransferMenuGroupKey(next ? (groupedTargets[0]?.key as 'local' | 'online' | null) : null);
                            return next;
                          });
                        }}
                        disabled={transferingItemId === item.id}
                        style={{
                          border: '0.5px solid rgba(62,54,44,0.18)',
                          borderRadius: '8px',
                          background: transferMenuItemId === item.id ? 'rgba(239,232,220,0.86)' : 'transparent',
                          color: '#7a6d5c',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '12px',
                          lineHeight: 1,
                          width: '28px',
                          height: '28px',
                          padding: 0,
                          cursor: transferingItemId === item.id ? 'wait' : 'pointer',
                          opacity: transferingItemId === item.id ? 0.6 : 1,
                          boxShadow: transferMenuItemId === item.id ? '0 6px 16px rgba(0,0,0,0.10)' : 'none',
                        }}
                        aria-label="Transfer-Menue oeffnen"
                      >
                        {transferingItemId === item.id ? '…' : '⋯'}
                      </button>
                      )}
                      {transferMenuItemId === item.id && (
                        (() => {
                          const groupedTargets = groupTransferTargets(getTransferTargetsForItem(item));
                          const activeGroup = groupedTargets.find((group) => group.key === transferMenuGroupKey) ?? groupedTargets[0] ?? null;
                          return (
                        <div
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 6px)',
                            minWidth: groupedTargets.length > 1 ? '356px' : '236px',
                            maxWidth: groupedTargets.length > 1 ? '396px' : '248px',
                            borderRadius: '12px',
                            border: '1px solid rgba(62,54,44,0.18)',
                            background: 'rgba(239,232,220,0.82)',
                            backdropFilter: 'blur(18px)',
                            WebkitBackdropFilter: 'blur(18px)',
                            boxShadow: '0 22px 48px rgba(0,0,0,0.22)',
                            padding: '6px',
                            zIndex: 220,
                            display: 'grid',
                            gridTemplateColumns: groupedTargets.length > 1 ? '132px minmax(0, 1fr)' : '1fr',
                            gap: '6px',
                            ...(transferMenuSide === 'left' ? { right: '-4px' } : { left: '-4px' }),
                          }}
                        >
                          {groupedTargets.length > 1 ? (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                paddingRight: '2px',
                                borderRight: '1px solid rgba(62,54,44,0.10)',
                              }}
                            >
                              <div
                                style={{
                                  padding: '4px 6px 2px',
                                  fontSize: '7px',
                                  letterSpacing: '0.12em',
                                  textTransform: 'uppercase',
                                  color: '#8a7b68',
                                  fontFamily: 'IBM Plex Mono, monospace',
                                }}
                              >
                                Zielbereich
                              </div>
                              {groupedTargets.map((group) => (
                                <button
                                  key={`${item.id}:group:${group.key}`}
                                  type="button"
                                  onClick={() => setTransferMenuGroupKey(group.key as 'local' | 'online')}
                                  style={{
                                    border: transferMenuGroupKey === group.key
                                      ? '1px solid rgba(172,142,102,0.42)'
                                      : '1px solid rgba(62,54,44,0.14)',
                                    borderRadius: '9px',
                                    background: transferMenuGroupKey === group.key
                                      ? 'rgba(172,142,102,0.12)'
                                      : 'rgba(255,255,255,0.12)',
                                    color: '#3e362c',
                                    fontFamily: 'IBM Plex Mono, monospace',
                                    fontSize: '9px',
                                    padding: '9px 10px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'background 0.14s ease, border-color 0.14s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px',
                                  }}
                                >
                                  <span>{group.label}</span>
                                  <span style={{ opacity: 0.66 }}>→</span>
                                </button>
                              ))}
                            </div>
                          ) : null}
                          {activeGroup ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div
                                style={{
                                  padding: '4px 6px 2px',
                                  fontSize: '7px',
                                  letterSpacing: '0.12em',
                                  textTransform: 'uppercase',
                                  color: '#8a7b68',
                                  fontFamily: 'IBM Plex Mono, monospace',
                                }}
                              >
                                {groupedTargets.length === 1 ? activeGroup.label : `${activeGroup.label} Ziele`}
                              </div>
                              {groupedTargets.length === 1 && (
                                <div
                                  style={{
                                    display: 'none',
                                  }}
                                >
                                  {activeGroup.label}
                                </div>
                              )}
                              {activeGroup.items.map((target) => (
                                <button
                                  key={target.key}
                                  type="button"
                                  onClick={() => {
                                    void handleTransferItem(item, target);
                                  }}
                                  onMouseEnter={() => setHoveredTransferTargetId(`${item.id}:${target.key}`)}
                                  onMouseLeave={() => setHoveredTransferTargetId((current) => (current === `${item.id}:${target.key}` ? null : current))}
                                  style={{
                                    textAlign: 'left',
                                    border: hoveredTransferTargetId === `${item.id}:${target.key}`
                                      ? '1px solid rgba(172,142,102,0.42)'
                                      : '1px solid rgba(62,54,44,0.16)',
                                    borderRadius: '9px',
                                    background: hoveredTransferTargetId === `${item.id}:${target.key}`
                                      ? 'rgba(172,142,102,0.12)'
                                      : 'rgba(255,255,255,0.14)',
                                    color: '#3e362c',
                                    fontFamily: 'IBM Plex Mono, monospace',
                                    fontSize: '9px',
                                    padding: '8px 9px',
                                    cursor: 'pointer',
                                    backdropFilter: 'blur(6px)',
                                    WebkitBackdropFilter: 'blur(6px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '10px',
                                    boxShadow: hoveredTransferTargetId === `${item.id}:${target.key}`
                                      ? '0 8px 18px rgba(0,0,0,0.10)'
                                      : 'none',
                                    transform: hoveredTransferTargetId === `${item.id}:${target.key}` ? 'translateX(2px)' : 'translateX(0)',
                                    transition: 'background 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease, transform 0.14s ease',
                                  }}
                                >
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontSize: '10px', color: '#252525', marginBottom: '1px' }}>{target.label}</div>
                                    <div
                                      style={{
                                        fontSize: '7px',
                                        color: '#6c6254',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {target.description}
                                      {target.target === 'local' && target.localDirectoryPath
                                        ? ` · ${formatLocalPathTail(target.localDirectoryPath)}`
                                        : ''}
                                    </div>
                                  </div>
                                  <div
                                    style={{
                                      flexShrink: 0,
                                      fontSize: '11px',
                                      color: '#7a6d5c',
                                      opacity: 0.9,
                                    }}
                                  >
                                    →
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                          );
                        })()
                      )}
                    </div>
                  </div>
                </div>
                );
              })
            : activeTab === 'cloud'
            ? filteredCloudDocuments.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => {
                    if (previewCloudDocument(doc.id, doc.fileName)) return;
                    onOpenCloudDocument(doc.id, doc.fileName);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') return;
                    if (event.key !== ' ') return;
                    event.preventDefault();
                    void previewCloudDocument(doc.id, doc.fileName);
                  }}
                  onMouseEnter={() => setHoveredItemId(String(doc.id))}
                  onMouseLeave={() => setHoveredItemId(null)}
                  style={{
                    border: hoveredItemId === String(doc.id) ? '1px solid #AC8E66' : '0.5px solid #3A3A3A',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    background: hoveredItemId === String(doc.id) ? '#d2cabd' : 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#3e362c',
                    fontFamily: 'IBM Plex Mono, monospace',
                    transform: hoveredItemId === String(doc.id) ? 'translateX(3px)' : 'translateX(0)',
                    transition: 'transform 0.15s ease, border-color 0.15s ease, background 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    {isImageFileName(doc.fileName) ? (
                      <div
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '8px',
                          border: '0.5px solid rgba(62,54,44,0.28)',
                          background: 'rgba(255,255,255,0.18)',
                          overflow: 'hidden',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {getCloudDocumentUrl(doc.id) ? (
                          <img
                            src={getCloudDocumentUrl(doc.id) ?? undefined}
                            alt={doc.fileName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <FontAwesomeIcon icon={faImage} style={{ fontSize: '18px', color: '#AC8E66' }} />
                        )}
                      </div>
                    ) : null}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '11px', color: '#252525', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FontAwesomeIcon icon={faCloud} style={{ fontSize: '9px', color: '#3e362c' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.fileName}</span>
                        <span
                          style={{
                            marginLeft: '6px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '0.5px solid rgba(62,54,44,0.45)',
                            background: isImageFileName(doc.fileName) ? 'rgba(172,142,102,0.16)' : 'rgba(62,54,44,0.06)',
                            color: '#252525',
                            fontSize: '8px',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {getFileKindLabel(doc.fileName)}
                        </span>
                      </div>
                      <div style={{ fontSize: '9px', color: '#3e362c' }}>
                        {new Date(doc.createdAt).toLocaleString('de-DE')}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            : activeTab === 'zennote'
            ? filteredZenNoteDocuments.map((doc) => (
                (() => {
                  const parsed = parseZenNoteFileName(doc.fileName);
                  const folderColor = parsed.folder
                    ? resolveZenNoteFolderColor(parsed.folder, zenNoteMeta.folderColors, '#AC8E66')
                    : '#AC8E66';
                  const tagColor = parsed.tag
                    ? resolveZenNoteTagColor(parsed.tag, zenNoteMeta.tagColors)
                    : '#777';
                  return (
                    <button
                      key={doc.id}
                      onClick={() => onOpenZenNoteDocument?.(doc.id, doc.fileName)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') return;
                        if (event.key !== ' ') return;
                        event.preventDefault();
                        void previewZenNoteDocument(doc.id, doc.fileName);
                      }}
                      onMouseEnter={() => setHoveredItemId(String(doc.id))}
                      onMouseLeave={() => setHoveredItemId(null)}
                      style={{
                        border: hoveredItemId === String(doc.id) ? `1px solid ${folderColor}` : '0.5px solid #3A3A3A',
                        borderLeft: `px solid ${folderColor}`,
                        borderRadius: '10px',
                        padding: '10px 12px',
                        background: hoveredItemId === String(doc.id) ? `${folderColor}14` : 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: '#3e362c',
                        fontFamily: 'IBM Plex Mono, monospace',
                        transform: hoveredItemId === String(doc.id) ? 'translateX(3px)' : 'translateX(0)',
                        transition: 'transform 0.15s ease, border-color 0.15s ease, background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '11px', color: '#252525', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FontAwesomeIcon icon={faStickyNote} style={{ fontSize: '9px', color: folderColor }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {parsed.title || doc.fileName.replace(/\.zennote$/, '')}
                            </span>
                          </div>
                          <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {parsed.folder ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: `${folderColor}`,
                                  border: `0.5px solid ${folderColor}`,
                                  color: '#252525',
                                  fontSize: '8px',
                                  letterSpacing: '0.04em',
                                  textTransform: 'uppercase',
                                }}
                              >
                                Ordner · {parsed.folder}
                              </span>
                            ) : null}
                            {parsed.tag ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(255,255,255,0.76)',
                                  border: `1px solid ${tagColor}`,
                                  color: '#252525',
                                  fontSize: '8px',
                                  fontWeight: 600,
                                  letterSpacing: '0.04em',
                                  textTransform: 'uppercase',
                                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35)',
                                }}
                              >
                                Tag · {parsed.tag}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <div
                            style={{
                              padding: '4px 7px',
                              borderRadius: '4px',
                              border: '0.5px solid rgba(62,54,44,0.45)',
                              background: 'rgba(62,54,44,0.06)',
                              color: '#252525',
                              fontSize: '8px',
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                            }}
                          >
                            Dokument
                          </div>
                          <div
                            style={{
                              padding: '4px 7px',
                              borderRadius: '4px',
                              border: `0.5px solid ${folderColor}`,
                              background: folderColor,
                              color: '#252525',
                              fontSize: '8px',
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                            }}
                          >
                            ZenNote
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '9px', color: '#3e362c', marginTop: '8px' }}>
                        {new Date(doc.createdAt).toLocaleString('de-DE')}
                      </div>
                    </button>
                  );
                })()
              ))
            : activeTab === 'server'
            ? filteredServerArticles.map((raw, index) => {
                const slug = typeof raw === 'string' ? raw : ((raw as { slug?: string }).slug ?? '');
                const title = typeof raw === 'string' ? raw : ((raw as { title?: string }).title || slug);
                const key = slug || `server-${index}`;
                return (
                  <button
                    key={key}
                    onClick={() => slug && onOpenServerArticle?.(slug)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') return;
                      if (event.key !== ' ') return;
                      if (!slug || !onPreviewServerArticle) return;
                      event.preventDefault();
                      void onPreviewServerArticle(slug);
                    }}
                    onMouseEnter={() => setHoveredItemId(key)}
                    onMouseLeave={() => setHoveredItemId(null)}
                    style={{
                      border: hoveredItemId === key ? '1px solid #4caf50' : '0.5px solid #3A3A3A',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      background: hoveredItemId === key ? 'rgba(205,195,176,0.12)' : 'transparent',
                      textAlign: 'left',
                      cursor: slug ? 'pointer' : 'default',
                      color: '#3e362c',
                      fontFamily: 'IBM Plex Mono, monospace',
                      transform: hoveredItemId === key ? 'translateX(3px)' : 'translateX(0)',
                      transition: 'transform 0.15s ease, border-color 0.15s ease, background 0.15s ease',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#252525', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FontAwesomeIcon icon={faGlobe} style={{ fontSize: '9px', color: '#3e362c' }} />
                      {title}
                    </div>
                    {title !== slug && slug ? (
                      <div style={{ fontSize: '9px', color: '#7a7a7a', marginTop: '3px' }}>
                        {slug}
                      </div>
                    ) : null}
                  </button>
                );
              })
            : filteredWebDocuments.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onLoadWebDocument(doc.content, doc.name)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') return;
                    if (event.key !== ' ') return;
                    if (!onPreviewWebDocument) return;
                    event.preventDefault();
                    onPreviewWebDocument(doc.content, doc.name);
                  }}
                  onMouseEnter={() => setHoveredItemId(doc.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  style={{
                    border: hoveredItemId === doc.id ? '1px solid #4caf50' : '0.5px solid #3A3A3A',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    background: hoveredItemId === doc.id ? 'rgba(205,195,176,0.12)' : 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#3e362c',
                    fontFamily: 'IBM Plex Mono, monospace',
                    transform: hoveredItemId === doc.id ? 'translateX(3px)' : 'translateX(0)',
                    transition: 'transform 0.15s ease, border-color 0.15s ease, background 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#3e362c' }}>{doc.name}</div>
                  <div style={{ fontSize: '9px', color: '#3e362c' }}>
                    Zuletzt geladen: {new Date(doc.updatedAt).toLocaleString('de-DE')}
                  </div>
                </button>
              ))}
        </div>

        {activeTab === 'project' && filteredAggregateItems.length === 0 && (
          <div style={{ marginTop: '10px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#777' }}>
            {aggregateItems.length === 0
              ? 'Noch keine Inhalte gefunden.'
              : aggregateSourceFilter === 'all'
                ? 'Keine Treffer.'
                : 'Keine Treffer für diesen Filter.'}
          </div>
        )}
        {activeTab === 'web' && filteredWebDocuments.length === 0 && (
          <div style={{ marginTop: '10px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#777' }}>
            {webDocuments.length === 0 ? 'Noch keine Web-Dokumente geladen.' : 'Keine Treffer.'}
          </div>
        )}
        {activeTab === 'cloud' && filteredCloudDocuments.length === 0 && (
          <div style={{ marginTop: '10px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#777' }}>
            {cloudDocuments.length === 0 ? 'Keine Cloud-Dokumente gefunden.' : 'Keine Treffer.'}
          </div>
        )}
        {activeTab === 'zennote' && filteredZenNoteDocuments.length === 0 && (
          <div style={{ marginTop: '10px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#777' }}>
            {zenNoteCount === 0 ? 'Keine ZenNote-Notizen gefunden.' : 'Keine Treffer.'}
          </div>
        )}
        {activeTab === 'server' && filteredServerArticles.length === 0 && (
          <div style={{ marginTop: '10px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#777' }}>
            {serverArticlesLoading
              ? 'Server-Artikel werden geladen…'
              : serverError
                ? serverError
                : Array.isArray(serverArticles) && serverArticles.length === 0
                  ? 'Keine Server-Artikel gefunden.'
                  : 'Keine Treffer.'}
          </div>
        )}
      </div>
    </div>
  );
}
