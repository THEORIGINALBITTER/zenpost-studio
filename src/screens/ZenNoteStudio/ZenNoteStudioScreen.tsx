import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faTrash,
  faFileLines,
  faNoteSticky,
  faArrowRightToBracket,
  faSpinner,
  faCheck,
  faSearch,
  faTag,
  faFolder,
  faBolt,
  faLayerGroup,
  faXmark,
  faRightLeft,
  faCalendarPlus,
  faPenToSquare,
  faMoon,
  faSun,
} from '@fortawesome/free-solid-svg-icons';
import type { ScheduledPost } from '../../types/scheduling';
import { loadZenStudioSettings } from '../../services/zenStudioSettingsService';
import {
  listCloudDocuments,
  uploadCloudDocument,
  downloadCloudDocumentText,
  deleteCloudDocument,
} from '../../services/cloudStorageService';
import {
  loadLocalZenNoteMeta,
  loadMergedZenNoteMeta,
  persistZenNoteMeta,
  saveLocalZenNoteMeta,
  subscribeToZenNoteMetaSync,
  toZenNoteMetaState,
} from '../../services/zenNoteMetaService';
import { insertContentStudioSnippet, openContentStudioAsDraft } from '../../services/contentStudioBridgeService';
import { openPlannerWithScheduledPost } from '../../services/plannerBridgeService';
import { subscribeToCloudSessionSync } from '../../services/cloudSessionSyncService';
import {
  parseZenNoteFileName,
  resolveZenNoteFolderColor,
  resolveZenNoteTagColor,
} from '../../services/zenNoteColorService';
import { openAppSettings } from '../../services/appShellBridgeService';
import { ZenMarkdownEditor } from '../../kits/PatternKit/ZenMarkdownEditor';
import { ZenDropdown } from '../../kits/PatternKit/ZenModalSystem/components/ZenDropdown';
import { defaultEditorSettings } from '../../services/editorSettingsService';

const ZEN_NOTE_MIME = 'text/zennote';
const KNOWN_TAGS = ['js', 'ts', 'php', 'css', 'html', 'sql', 'bash', 'py', 'markdown', 'text'];

function loadCustomTags(): string[] {
  return loadLocalZenNoteMeta().customTags;
}
function saveCustomTags(tags: string[]) {
  const current = loadLocalZenNoteMeta();
  saveLocalZenNoteMeta({
    customTags: tags,
    tagColors: current.tagColors,
    folderColors: current.folderColors,
  });
}
function getAllTags(customTags: string[]) {
  return [...KNOWN_TAGS, ...customTags.filter((t) => !KNOWN_TAGS.includes(t))];
}

interface ZenNote {
  id: number;
  title: string;
  tag: string;
  folder: string;
  createdAt: string;
}

interface ZenNoteStudioScreenProps {
  insertTargetActive?: boolean;
  requestedNoteId?: number | null;
  onRequestedNoteHandled?: () => void;
  onStudioBarChange?: (content: React.ReactNode) => void;
  publishingBannerVisible?: boolean;
}

// ── Frontmatter helpers ────────────────────────────────────────────────────
function readFrontmatterDate(content: string): string {
  const match = content.match(/^---\n[\s\S]*?^planned:\s*(.+)$/m);
  return match?.[1]?.trim() ?? '';
}

function writeFrontmatterDate(content: string, date: string): string {
  const hasFm = /^---\n/.test(content);
  if (!hasFm) {
    const fm = date ? `---\nplanned: ${date}\n---\n\n` : '';
    return fm + content;
  }
  const hasField = /^planned:\s*.+$/m.test(content);
  if (!date) {
    return content.replace(/^planned:[^\n]*\n?/m, '');
  }
  if (hasField) {
    return content.replace(/^(planned:\s*).*$/m, `planned: ${date}`);
  }
  return content.replace(/^(---\n[\s\S]*?)(^---)/m, `$1planned: ${date}\n$2`);
}

type TabType = 'all' | 'quick' | 'folder' | 'tag';
interface ActiveTab { type: TabType; value: string }

const gold = '#AC8E66';
const bgSidebar = '#252525';
const bgList = '#1a1a1a';
const border = '#2A2A2A';
const textPrimary = '#d0cbb8';
const textMuted = '#e8e3d8';
const textIcon = '#d0cbb8';
const fontMono = 'IBM Plex Mono, monospace';


function encodeFileName(title: string, tag: string, folder: string): string {
  const safeTitle = (title.trim() || 'Notiz').replace(/@@/g, '-').replace(/\//g, '-');
  const safeFolder = folder.trim().replace(/@@/g, '-').replace(/\//g, '-');
  const withTag = tag ? `${safeTitle}__${tag}` : safeTitle;
  return safeFolder ? `${safeFolder}@@${withTag}.zennote` : `${withTag}.zennote`;
}

function readStoredEditorTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  try {
    const raw = localStorage.getItem('zenpost_editor_settings');
    if (!raw) return 'dark';
    return (JSON.parse(raw) as { theme?: string }).theme === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function ZenNoteStudioScreen({ insertTargetActive = false, requestedNoteId = null, onRequestedNoteHandled, onStudioBarChange, publishingBannerVisible = false }: ZenNoteStudioScreenProps) {
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1600
  );
  const [editorTheme, setEditorTheme] = useState<'dark' | 'light'>(readStoredEditorTheme);
  const [notes, setNotes] = useState<ZenNote[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [editorTitle, setEditorTitle] = useState('');
  const [editorTag, setEditorTag] = useState('');
  const [editorFolder, setEditorFolder] = useState('');
  const [editorPlannedDate, setEditorPlannedDate] = useState('');
  const [plannerAddOk, setPlannerAddOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [insertOk, setInsertOk] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [hoveredNoteId, setHoveredNoteId] = useState<number | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);
  const [renamingNoteId, setRenamingNoteId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>({ type: 'all', value: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderValue, setNewFolderValue] = useState('');
  const [newTagMode, setNewTagMode] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [customTags, setCustomTags] = useState<string[]>(() => loadCustomTags());
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');
  const [movingNoteId, setMovingNoteId] = useState<number | null>(null);
  const [moveDropdownNoteId, setMoveDropdownNoteId] = useState<number | null>(null);
  const [folderColors, setFolderColors] = useState<Record<string, string>>(() => loadLocalZenNoteMeta().folderColors);
  const [tagColors, setTagColors] = useState<Record<string, string>>(() => loadLocalZenNoteMeta().tagColors);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [metaDocId, setMetaDocId] = useState<number | null>(null);
  const [folderPanelOpen, setFolderPanelOpen] = useState(false);
  const [tagPanelOpen, setTagPanelOpen] = useState(false);
  const insertMenuRef = useRef<HTMLDivElement>(null);
  const folderPanelRef = useRef<HTMLDivElement>(null);
  const tagPanelRef = useRef<HTMLDivElement>(null);

  // ── Close move dropdown on outside click ──────────────────────────────────
  useEffect(() => {
    if (moveDropdownNoteId === null) return;
    const handler = () => setMoveDropdownNoteId(null);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moveDropdownNoteId]);

  // ── Close insert menu on outside click ────────────────────────────────────
  useEffect(() => {
    if (!showInsertMenu) return;
    const handler = (e: MouseEvent) => {
      if (insertMenuRef.current && !insertMenuRef.current.contains(e.target as Node)) {
        setShowInsertMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showInsertMenu]);

  // ── Close folder/tag panel on outside click ───────────────────────────────
  useEffect(() => {
    if (!folderPanelOpen) return;
    const handler = (e: MouseEvent) => {
      if (folderPanelRef.current && !folderPanelRef.current.contains(e.target as Node)) {
        setFolderPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [folderPanelOpen]);

  useEffect(() => {
    if (!tagPanelOpen) return;
    const handler = (e: MouseEvent) => {
      if (tagPanelRef.current && !tagPanelRef.current.contains(e.target as Node)) {
        setTagPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [tagPanelOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncTheme = (event: Event) => {
      const detail = (event as CustomEvent<{ theme?: string }>).detail;
      if (detail?.theme === 'light' || detail?.theme === 'dark') {
        setEditorTheme(detail.theme);
        return;
      }
      setEditorTheme(readStoredEditorTheme());
    };
    window.addEventListener('zen-editor-settings-updated', syncTheme);
    return () => window.removeEventListener('zen-editor-settings-updated', syncTheme);
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        void createNote();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renameInputRef = useRef<HTMLInputElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const newTagInputRef = useRef<HTMLInputElement>(null);
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeNoteIdRef = useRef<number | null>(null);
  const editorContentRef = useRef('');
  const editorTitleRef = useRef('');
  const editorTagRef = useRef('');
  const editorFolderRef = useRef('');

  const settings = loadZenStudioSettings();
  const isLoggedIn = !!settings.cloudAuthToken && !!settings.cloudProjectId;

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadNotes = useCallback(async () => {
    const projectId = settings.cloudProjectId;
    if (!projectId) { setLoading(false); return; }
    const docs = await listCloudDocuments(projectId);
    if (!docs) { setLoading(false); return; }
    const { docId, meta } = await loadMergedZenNoteMeta(projectId);
    setMetaDocId(docId);
    const metaState = toZenNoteMetaState(meta);
    setCustomTags(metaState.customTags);
    setTagColors(metaState.tagColors);
    setFolderColors(metaState.folderColors);

    const zenNotes = docs
      .filter((d) => d.mimeType === ZEN_NOTE_MIME || d.fileName.endsWith('.zennote'))
      .map((d) => {
        const { title, tag, folder } = parseZenNoteFileName(d.fileName);
        return { id: d.id, title, tag, folder, createdAt: d.createdAt };
      });
    setNotes(zenNotes);
    setLoading(false);
  }, [settings.cloudProjectId]);

  const syncZenNoteMetaToCloud = useCallback(async (
    nextCustomTags: string[],
    nextTagColors: Record<string, string>,
    nextFolderColors: Record<string, string>,
  ) => {
    const nextDocId = await persistZenNoteMeta({
      customTags: nextCustomTags,
      tagColors: nextTagColors,
      folderColors: nextFolderColors,
    }, metaDocId);
    if (nextDocId) setMetaDocId(nextDocId);
  }, [metaDocId]);

  useEffect(() => { void loadNotes(); }, [loadNotes]);
  useEffect(() => { activeNoteIdRef.current = activeNoteId; }, [activeNoteId]);
  useEffect(() => { editorContentRef.current = editorContent; }, [editorContent]);
  useEffect(() => { editorTitleRef.current = editorTitle; }, [editorTitle]);
  useEffect(() => { editorTagRef.current = editorTag; }, [editorTag]);
  useEffect(() => { editorFolderRef.current = editorFolder; }, [editorFolder]);
  useEffect(() => {
    if (!settings.cloudProjectId) return;
    return subscribeToZenNoteMetaSync(settings.cloudProjectId, ({ docId, meta }) => {
      setMetaDocId(docId);
      const next = toZenNoteMetaState(meta);
      setCustomTags(next.customTags);
      setTagColors(next.tagColors);
      setFolderColors(next.folderColors);
    });
  }, [settings.cloudProjectId]);

  useEffect(() => {
    return subscribeToCloudSessionSync(({ current, reason }) => {
      if (!current.projectId) {
        setNotes([]);
        setLoading(false);
        return;
      }
      if (reason === 'login' || reason === 'project-change' || reason === 'focus') {
        setLoading(true);
        void loadNotes();
      }
    }, { intervalMs: 5000 });
  }, [loadNotes]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const usedFolders = Array.from(new Set(notes.map((n) => n.folder).filter(Boolean))).sort();
  const usedTags = Array.from(new Set(notes.map((n) => n.tag).filter(Boolean))).sort();

  const filteredNotes = notes.filter((n) => {
    let matchTab = true;
    if (activeTab.type === 'all') matchTab = true; // alle = wirklich alle
    else if (activeTab.type === 'quick') matchTab = n.title.startsWith('Quick ') && !n.folder;
    else if (activeTab.type === 'folder') matchTab = n.folder === activeTab.value;
    else if (activeTab.type === 'tag') matchTab = n.tag === activeTab.value;
    const matchTagFilter = !tagFilter || n.tag === tagFilter;
    const q = searchQuery.toLowerCase().trim();
    return matchTab && matchTagFilter && (!q || n.title.toLowerCase().includes(q));
  });

  // Tags visible in current tab (for chips)
  const visibleTags = Array.from(new Set(
    notes.filter((n) => {
      if (activeTab.type === 'all') return true;
      if (activeTab.type === 'quick') return n.title.startsWith('Quick ');
      if (activeTab.type === 'folder') return n.folder === activeTab.value;
      return false; // tag tab doesn't need chips
    }).map((n) => n.tag).filter(Boolean)
  )).sort();
  const showTagChips = (activeTab.type === 'all' || activeTab.type === 'quick' || activeTab.type === 'folder') && visibleTags.length > 1;

  // ── Open ───────────────────────────────────────────────────────────────────
  const openNote = async (noteId: number, title: string, tag: string, folder: string) => {
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    if (dirty && activeNoteIdRef.current !== null) {
      await doSave(activeNoteIdRef.current, editorTitleRef.current, editorTagRef.current, editorFolderRef.current, editorContentRef.current);
    }
    setActiveNoteId(noteId);
    setEditorTitle(title);
    setEditorTag(tag);
    setEditorFolder(folder);
    setEditorContent('');
    setDirty(false);
    const content = await downloadCloudDocumentText(noteId);
    const resolved = content ?? '';
    setEditorContent(resolved);
    setEditorPlannedDate(readFrontmatterDate(resolved));
  };

  useEffect(() => {
    if (requestedNoteId === null || loading) return;
    const requestedNote = notes.find((note) => note.id === requestedNoteId);
    if (!requestedNote) return;
    void openNote(requestedNote.id, requestedNote.title, requestedNote.tag, requestedNote.folder);
    onRequestedNoteHandled?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedNoteId, loading, notes]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const doSave = async (noteId: number, title: string, tag: string, folder: string, content: string): Promise<number | null> => {
    setSaving(true);
    try {
      const fileName = encodeFileName(title, tag, folder);
      const blob = new Blob([content], { type: ZEN_NOTE_MIME });
      const file = new File([blob], fileName, { type: ZEN_NOTE_MIME });
      const result = await uploadCloudDocument(file);
      if (!result) return null;
      await deleteCloudDocument(noteId);
      setNotes((prev) => prev.map((n) =>
        n.id === noteId ? { ...n, id: result.id, title: title.trim() || 'Notiz', tag, folder } : n
      ));
      setActiveNoteId(result.id);
      activeNoteIdRef.current = result.id;
      setDirty(false);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2000);
      return result.id;
    } catch { return null; }
    finally { setSaving(false); }
  };

  const saveCurrentNote = () => {
    if (activeNoteIdRef.current === null) return;
    void doSave(activeNoteIdRef.current, editorTitleRef.current, editorTagRef.current, editorFolderRef.current, editorContentRef.current);
  };

  // ── Planned date ───────────────────────────────────────────────────────────
  const handlePlannedDateChange = (date: string) => {
    setEditorPlannedDate(date);
    const updated = writeFrontmatterDate(editorContentRef.current, date);
    setEditorContent(updated);
    editorContentRef.current = updated;
    setDirty(true);
  };

  const handleAddToPlanner = () => {
    const hasPlannedDate = !!editorPlannedDate;
    const dateToUse = editorPlannedDate || new Date().toISOString().split('T')[0];
    const [year, month, day] = dateToUse.split('-').map(Number);
    const scheduledDate = new Date(year, month - 1, day);
    const content = editorContentRef.current;
    const words = content.replace(/^---[\s\S]*?---\n*/m, '').trim().split(/\s+/).length;
    if (hasPlannedDate) {
      openPlannerWithScheduledPost({
        defaultTab: 'planen',
        preSelectedDate: scheduledDate,
        prefilledPlanPost: {
          platform: 'linkedin',
          title: editorTitleRef.current || 'ZenNote',
          content,
          date: dateToUse,
          time: '09:00',
        },
      });
    } else {
      const post: ScheduledPost = {
        id: `zennote-${activeNoteIdRef.current ?? Date.now()}`,
        platform: 'linkedin',
        title: editorTitleRef.current || 'ZenNote',
        content: content,
        scheduledDate,
        scheduledTime: '09:00',
        status: 'draft',
        characterCount: content.length,
        wordCount: words,
        createdAt: new Date(),
      };
      openPlannerWithScheduledPost({
        post,
        focusPostId: post.id,
        defaultTab: 'checklist',
        preSelectedDate: scheduledDate,
      });
    }
    setPlannerAddOk(true);
    setTimeout(() => setPlannerAddOk(false), 2500);
  };

  // ── Create ─────────────────────────────────────────────────────────────────
  const createNote = async (folder = '') => {
    const defaultFolder = folder || (activeTab.type === 'folder' ? activeTab.value : '');
    const title = `Notiz ${new Date().toLocaleDateString('de-DE')}`;
    const content = `# ${title}\n\n`;
    setSaving(true);
    try {
      const fileName = encodeFileName(title, '', defaultFolder);
      const blob = new Blob([content], { type: ZEN_NOTE_MIME });
      const file = new File([blob], fileName, { type: ZEN_NOTE_MIME });
      const result = await uploadCloudDocument(file);
      if (!result) return;
      const newNote: ZenNote = { id: result.id, title, tag: '', folder: defaultFolder, createdAt: new Date().toISOString() };
      setNotes((prev) => [newNote, ...prev]);
      setActiveNoteId(result.id);
      setEditorTitle(title);
      setEditorTag('');
      setEditorFolder(defaultFolder);
      setEditorContent(content);
      setDirty(false);
    } finally { setSaving(false); }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleteNote = async (noteId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingNoteId(noteId);
    await deleteCloudDocument(noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (activeNoteId === noteId) {
      setActiveNoteId(null);
      setEditorContent('');
      setEditorTitle('');
      setEditorTag('');
      setEditorFolder('');
    }
    setDeletingNoteId(null);
  };

  // ── Rename ─────────────────────────────────────────────────────────────────
  const startRename = (note: ZenNote, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingNoteId(note.id);
    setRenameValue(note.title);
    setTimeout(() => renameInputRef.current?.select(), 30);
  };

  const commitRename = async (noteId: number) => {
    const newTitle = renameValue.trim();
    if (!newTitle) { setRenamingNoteId(null); return; }
    setRenamingNoteId(null);
    if (noteId === activeNoteId) {
      setEditorTitle(newTitle);
      editorTitleRef.current = newTitle;
      setDirty(true);
      saveCurrentNote();
    } else {
      const content = await downloadCloudDocumentText(noteId);
      const note = notes.find((n) => n.id === noteId);
      if (content !== null) await doSave(noteId, newTitle, note?.tag ?? '', note?.folder ?? '', content);
    }
  };

  // ── Tag / Folder change ────────────────────────────────────────────────────
  const handleTagChange = (newTag: string) => {
    if (newTag === '__new__') {
      setNewTagMode(true);
      setTimeout(() => newTagInputRef.current?.focus(), 30);
      return;
    }
    setEditorTag(newTag);
    editorTagRef.current = newTag;
    // Optimistic update — sofort in der Liste sichtbar
    if (activeNoteIdRef.current !== null) {
      setNotes((prev) => prev.map((n) => n.id === activeNoteIdRef.current ? { ...n, tag: newTag } : n));
    }
    setDirty(true);
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => saveCurrentNote(), 2000);
  };

  const commitNewTag = () => {
    const name = newTagValue.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setNewTagMode(false);
    setNewTagValue('');
    if (!name || getAllTags(customTags).includes(name)) return;
    const next = [...customTags, name];
    setCustomTags(next);
    saveCustomTags(next);
    void syncZenNoteMetaToCloud(next, tagColors, folderColors);
    setEditorTag(name);
    editorTagRef.current = name;
    if (activeNoteIdRef.current !== null) {
      setNotes((prev) => prev.map((n) => n.id === activeNoteIdRef.current ? { ...n, tag: name } : n));
    }
    setDirty(true);
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => saveCurrentNote(), 1000);
  };

  const handleFolderChange = (newFolder: string) => {
    if (newFolder === '__new__') {
      setNewFolderMode(true);
      setTimeout(() => newFolderInputRef.current?.focus(), 30);
      return;
    }
    setEditorFolder(newFolder);
    editorFolderRef.current = newFolder;
    // Optimistic update — Note verschwindet sofort aus "alle" wenn Ordner gesetzt
    if (activeNoteIdRef.current !== null) {
      setNotes((prev) => prev.map((n) => n.id === activeNoteIdRef.current ? { ...n, folder: newFolder } : n));
    }
    setDirty(true);
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    // Sofort speichern bei Ordner-Wechsel (nicht verzögern)
    void doSave(activeNoteIdRef.current!, editorTitleRef.current, editorTagRef.current, newFolder, editorContentRef.current);
  };

  // ── Editor content change ──────────────────────────────────────────────────
  const handleEditorChange = (value: string) => {
    setEditorContent(value);
    setDirty(true);
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => saveCurrentNote(), 3000);
  };

  // ── Insert-Bridge ──────────────────────────────────────────────────────────
  const handleInsert = () => {
    if (!editorContent.trim()) return;
    insertContentStudioSnippet({ content: editorContent, title: editorTitleRef.current });
    setInsertOk(true);
    setTimeout(() => setInsertOk(false), 2000);
  };

  const [openAsDraftOk, setOpenAsDraftOk] = useState(false);

  const handleOpenAsDraft = () => {
    if (!editorContent.trim()) return;
    openContentStudioAsDraft({ content: editorContent, title: editorTitleRef.current });
    setOpenAsDraftOk(true);
    setTimeout(() => setOpenAsDraftOk(false), 2500);
  };

  useEffect(() => {
    if (!onStudioBarChange) return;
    onStudioBarChange(
      <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end' }}>
    
        {/* Planen */}
        <button
          onClick={handleAddToPlanner}
          disabled={!activeNoteId}
          style={{ width: 130, height: 40, borderTop: plannerAddOk ? '1px solid #4caf50' : '1px dotted #2A2A2A', borderLeft: plannerAddOk ? '1px solid #4caf50' : '1px dotted #2A2A2A', borderRight: plannerAddOk ? '1px solid #4caf50' : '1px dotted #2A2A2A', borderBottom: 0, borderRadius: '10px 10px 0 0', padding: '0 10px', background: '#121212', display: 'flex', alignItems: 'center', gap: 8, fontFamily: fontMono, fontSize: 10, color: plannerAddOk ? '#4caf50' : '#d0cbb8', cursor: !activeNoteId ? 'not-allowed' : 'pointer', opacity: !activeNoteId ? 0.2 : 1, transition: 'all 0.2s ease', marginBottom: '-2px' }}
          onMouseEnter={(e) => { if (activeNoteId && !plannerAddOk) { e.currentTarget.style.borderColor = '#AC8E66'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
          onMouseLeave={(e) => { if (activeNoteId && !plannerAddOk) { e.currentTarget.style.borderColor = '#2A2A2A'; e.currentTarget.style.transform = 'translateY(0)'; } }}
        >
          <span style={{ display: 'inline-flex', color: '#d0cbb8' }}><FontAwesomeIcon icon={plannerAddOk ? faCheck : faCalendarPlus} /></span>
          <span>{plannerAddOk ? 'Geplant!' : 'Planen'}</span>
        </button>
        {/* Einfügen */}
        <div ref={insertMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { if (!insertOk && !openAsDraftOk) setShowInsertMenu((prev) => !prev); }}
            disabled={!editorContent.trim()}
            style={{ width: 130, height: 40, borderTop: (insertOk || openAsDraftOk) ? '1px solid #4caf50' : '1px dotted #2A2A2A', borderLeft: (insertOk || openAsDraftOk) ? '1px solid #4caf50' : '1px dotted #2A2A2A', borderRight: (insertOk || openAsDraftOk) ? '1px solid #4caf50' : '1px dotted #2A2A2A', borderBottom: 0, borderRadius: '10px 10px 0 0', padding: '0 10px', background: '#121212', display: 'flex', alignItems: 'center', gap: 8, fontFamily: fontMono, fontSize: 10, color: (insertOk || openAsDraftOk) ? '#4caf50' : '#d0cbb8', cursor: !editorContent.trim() ? 'not-allowed' : 'pointer', opacity: !editorContent.trim() ? 0.2 : 1, transition: 'all 0.2s ease', marginBottom: '-2px' }}
            onMouseEnter={(e) => { if (editorContent.trim() && !insertOk && !openAsDraftOk) { e.currentTarget.style.borderColor = '#AC8E66'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
            onMouseLeave={(e) => { if (editorContent.trim() && !insertOk && !openAsDraftOk) { e.currentTarget.style.borderColor = '#2A2A2A'; e.currentTarget.style.transform = 'translateY(0)'; } }}
          >
            <span style={{ display: 'inline-flex', color: '#d0cbb8' }}><FontAwesomeIcon icon={insertOk || openAsDraftOk ? faCheck : faArrowRightToBracket} /></span>
            <span>{insertOk ? 'Eingefügt!' : openAsDraftOk ? 'Geöffnet!' : `Einfügen ${showInsertMenu ? '▲' : '▾'}`}</span>
          </button>
          {showInsertMenu && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#d0cbb8', border: 'none', boxShadow: 'none', borderRadius: 2, overflow: 'hidden', minWidth: 200, zIndex: 200 }}>
              {insertTargetActive && (
                <button onClick={() => { setShowInsertMenu(false); handleInsert(); }} style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', boxShadow: 'none', border: 'none', color: '#1a1a1a', fontFamily: fontMono, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(172,142,102,0.12)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                  <FontAwesomeIcon icon={faArrowRightToBracket} style={{ color: bgList }} />
                  In Editor einfügen
                </button>
              )}
              <button onClick={() => { setShowInsertMenu(false); handleOpenAsDraft(); }} style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', color: '#1a1a1a', fontFamily: fontMono, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(172,142,102,0.12)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                <FontAwesomeIcon icon={faPenToSquare} style={{ color: bgList }} />
                Als Entwurf öffnen
              </button>
            </div>
          )}
        </div>
            {/* Theme switcher */}
        <div style={{ height: 40, borderTop: '1px dotted #2A2A2A', borderLeft: '1px dotted #2A2A2A', borderRight: '1px dotted #2A2A2A', borderBottom: 0, borderRadius: '10px 10px 0 0', padding: '0 8px', background: '#121212', display: 'flex', alignItems: 'center', gap: 4, marginBottom: '-2px' }}>
          <button type="button" onClick={() => updateEditorTheme('dark')} title="Dark Theme" style={{ border: 'none', borderRadius: 6, background: editorTheme === 'dark' ? '#d0cbb8' : 'transparent', color: editorTheme === 'dark' ? '#AC8E66' : '#888', width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <FontAwesomeIcon icon={faMoon} style={{ fontSize: 10 }} />
          </button>
          <button type="button" onClick={() => updateEditorTheme('light')} title="Light Theme" style={{ border: 'none', borderRadius: 6, background: editorTheme === 'light' ? '#d0cbb8' : 'transparent', color: editorTheme === 'light' ? '#AC8E66' : '#888', width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <FontAwesomeIcon icon={faSun} style={{ fontSize: 10 }} />
          </button>
        </div>
      </div>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onStudioBarChange, activeNoteId, editorContent, editorTheme, plannerAddOk, insertOk, openAsDraftOk, showInsertMenu, insertTargetActive]);

  // ── New Folder ─────────────────────────────────────────────────────────────
  const commitNewFolder = () => {
    const name = newFolderValue.trim();
    setNewFolderMode(false);
    setNewFolderValue('');
    if (!name) return;
    void syncZenNoteMetaToCloud(customTags, tagColors, folderColors);
    if (activeNoteIdRef.current !== null) {
      setEditorFolder(name);
      editorFolderRef.current = name;
      // Optimistic update + sofort speichern
      setNotes((prev) => prev.map((n) => n.id === activeNoteIdRef.current ? { ...n, folder: name } : n));
      setDirty(false);
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
      void doSave(activeNoteIdRef.current, editorTitleRef.current, editorTagRef.current, name, editorContentRef.current);
    }
    setActiveTab({ type: 'folder', value: name });
  };

  // ── Ordner umbenennen ──────────────────────────────────────────────────────
  const commitRenameFolder = async () => {
    const oldName = renamingFolder;
    const newName = renameFolderValue.trim();
    setRenamingFolder(null);
    setRenameFolderValue('');
    if (!oldName || !newName || newName === oldName) return;
    // Alle Notizen im alten Ordner umbenennen
    const toRename = notes.filter((n) => n.folder === oldName);
    for (const note of toRename) {
      const content = await downloadCloudDocumentText(note.id);
      if (content !== null) {
        await doSave(note.id, note.title, note.tag, newName, content);
      }
    }
    if (folderColors[oldName]) {
      const nextFolderColors = { ...folderColors, [newName]: folderColors[oldName] };
      delete nextFolderColors[oldName];
      setFolderColors(nextFolderColors);
      localStorage.setItem('zenpost_zennote_folder_colors', JSON.stringify(nextFolderColors));
      void syncZenNoteMetaToCloud(customTags, tagColors, nextFolderColors);
    }
    if (activeTab.type === 'folder' && activeTab.value === oldName) {
      setActiveTab({ type: 'folder', value: newName });
    }
    if (editorFolderRef.current === oldName) {
      setEditorFolder(newName);
      editorFolderRef.current = newName;
    }
  };

  // ── Custom Tag löschen ─────────────────────────────────────────────────────
  const deleteCustomTag = (tag: string) => {
    const next = customTags.filter((t) => t !== tag);
    setCustomTags(next);
    saveCustomTags(next);
    // Farbe entfernen
    const nextColors = { ...tagColors };
    delete nextColors[tag];
    setTagColors(nextColors);
    localStorage.setItem('zenpost_zennote_tag_colors', JSON.stringify(nextColors));
    void syncZenNoteMetaToCloud(next, nextColors, folderColors);
    if (activeTab.type === 'tag' && activeTab.value === tag) {
      setActiveTab({ type: 'all', value: '' });
    }
  };

  const deleteFolder = async (folder: string) => {
    const notesInFolder = notes.filter((n) => n.folder === folder);
    setNotes((prev) => prev.map((n) => n.folder === folder ? { ...n, folder: '' } : n));
    for (const note of notesInFolder) {
      const content = await downloadCloudDocumentText(note.id);
      if (content !== null) {
        await doSave(note.id, note.title, note.tag, '', content);
      }
    }
    const nextColors = { ...folderColors };
    delete nextColors[folder];
    setFolderColors(nextColors);
    localStorage.setItem('zenpost_zennote_folder_colors', JSON.stringify(nextColors));
    void syncZenNoteMetaToCloud(customTags, tagColors, nextColors);
    if (activeTab.type === 'folder' && activeTab.value === folder) {
      setActiveTab({ type: 'all', value: '' });
    }
  };

  // ── Notiz verschieben ──────────────────────────────────────────────────────
  const moveNote = async (noteId: number, targetFolder: string) => {
    setMovingNoteId(noteId);
    const note = notes.find((n) => n.id === noteId);
    if (!note) { setMovingNoteId(null); return; }
    // Optimistic: sofort aus aktuellem Tab verschwinden lassen
    setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, folder: targetFolder } : n));
    const content = await downloadCloudDocumentText(noteId);
    if (content !== null) {
      await doSave(noteId, note.title, note.tag, targetFolder, content);
    }
    setMovingNoteId(null);
    if (noteId === activeNoteIdRef.current) {
      setEditorFolder(targetFolder);
      editorFolderRef.current = targetFolder;
    }
  };

  // ── Tag color ──────────────────────────────────────────────────────────────
  const getFolderColor = (folder: string) => resolveZenNoteFolderColor(folder, folderColors, gold);
  const saveFolderColor = (folder: string, color: string) => {
    const next = { ...folderColors, [folder]: color };
    setFolderColors(next);
    localStorage.setItem('zenpost_zennote_folder_colors', JSON.stringify(next));
    void syncZenNoteMetaToCloud(customTags, tagColors, next);
  };
  const getTagColor = (tag: string) => resolveZenNoteTagColor(tag, tagColors);
  const saveTagColor = (tag: string, color: string) => {
    const next = { ...tagColors, [tag]: color };
    setTagColors(next);
    localStorage.setItem('zenpost_zennote_tag_colors', JSON.stringify(next));
    void syncZenNoteMetaToCloud(customTags, next, folderColors);
  };
  const getNoteAccentColor = (note: ZenNote) => {
    if (activeTab.type === 'tag') return getTagColor(activeTab.value);
    if (activeTab.type === 'folder') return getFolderColor(activeTab.value);
    if (activeTab.type === 'quick') return '#f0c060';
    if (note.folder) return getFolderColor(note.folder);
    if (note.tag) return getTagColor(note.tag);
    if (note.title.startsWith('Quick ')) return '#f0c060';
    return gold;
  };

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16, fontFamily: fontMono }}>
        <FontAwesomeIcon icon={faNoteSticky} style={{ fontSize: 32, color: '#d0cbb8', }} />
        <p style={{ color: '#d0cbb8', fontSize: 12 }}>ZenNote Studio benötigt einen ZenPost Cloud Account.</p>
        <button
          className="zen-gold-btn"
          onClick={() => openAppSettings('cloud')}
          style={{ padding: '8px 20px', fontSize: 10 }}
        >
          Einstellungen → ZenCloud
        </button>
      </div>
    );
  }

  const folderOptions = [
    { value: '', label: 'kein Ordner' },
    ...usedFolders.map((f) => ({ value: f, label: f })),
    { value: '__new__', label: '+ Neuer Ordner…' },
  ];
  const isMetaCompact = viewportWidth <= 1380;
  const metaDropdownDesktopWidth = 290;
  const metaDateDesktopWidth = 250;
  const metaFieldStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minWidth: isMetaCompact ? 0 : 200,
    flex: isMetaCompact ? '1 1 calc(50% - 6px)' : '0 0 auto',
  };
  const updateEditorTheme = (nextTheme: 'dark' | 'light') => {
    if (typeof window === 'undefined') return;
    let nextSettings: Record<string, unknown> = { ...defaultEditorSettings, theme: nextTheme };
    try {
      const raw = localStorage.getItem('zenpost_editor_settings');
      if (raw) {
        nextSettings = {
          ...defaultEditorSettings,
          ...(JSON.parse(raw) as Record<string, unknown>),
          theme: nextTheme,
        };
      }
    } catch {
      // keep fallback defaults
    }
    localStorage.setItem('zenpost_editor_settings', JSON.stringify(nextSettings));
    setEditorTheme(nextTheme);
    window.dispatchEvent(new CustomEvent('zen-editor-settings-updated', { detail: nextSettings }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: publishingBannerVisible ? 'calc(100vh - 120px)' : 'calc(100vh - 80px)', fontFamily: fontMono, background: '#1a1a1a' }}>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

      {/* ── Panel 1: Vertical Tabs ────────────────────────────────────────── */}
      <div style={{
        width: 56, minWidth: 56, background: bgSidebar,
        borderRight: `1px solid ${border}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 100, paddingBottom: 16, overflowY: 'auto', overflowX: 'hidden',
      }}>

        {/* Fixed: Alle */}
        <VerticalTab
          label="alle"
          icon={faLayerGroup}
          count={notes.length}
          active={activeTab.type === 'all'}
          color={textIcon}
          onClick={() => setActiveTab({ type: 'all', value: '' })}
        />

        {/* Fixed: Quick */}
        <VerticalTab
          label="quick"
          icon={faBolt}
          count={notes.filter((n) => n.title.startsWith('Quick ') && !n.folder).length}
          active={activeTab.type === 'quick'}
          color='#f0c060'
          onClick={() => setActiveTab({ type: 'quick', value: '' })}
        />

        {/* Divider + Folder-Panel-Button */}
        {usedFolders.length > 0 && (
          <div style={{ width: 24, height: 1, background: border, margin: '10px 0', flexShrink: 0 }} />
        )}
        {usedFolders.length > 0 && (
          <button
            onClick={() => setFolderPanelOpen((p) => !p)}
            title="Ordner"
            style={{
              width: 35, minHeight: 72, background: (folderPanelOpen || activeTab.type === 'folder') ? textPrimary : 'transparent',
              border: 'none', borderRadius: '0 3px 0 3px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 6, padding: '14px 0', flexShrink: 0, transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { if (!folderPanelOpen && activeTab.type !== 'folder') e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={(e) => { if (!folderPanelOpen && activeTab.type !== 'folder') e.currentTarget.style.background = 'transparent'; }}
          >
            <FontAwesomeIcon icon={faFolder} style={{ fontSize: 11, color: (folderPanelOpen || activeTab.type === 'folder') ? '#141414' : '#666' }} />
            <span style={{ fontSize: 11, color: (folderPanelOpen || activeTab.type === 'folder') ? '#141414' : '#aaa', fontFamily: fontMono, writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', letterSpacing: '0.06em', lineHeight: 1 }}>
              Ordner
            </span>
            <span style={{ fontSize: 9, color: (folderPanelOpen || activeTab.type === 'folder') ? '#141414' : '#666', fontFamily: fontMono, lineHeight: 1 }}>
              {usedFolders.length}
            </span>
          </button>
        )}

        {/* Divider + Tag-Panel-Button */}
        {usedTags.length > 0 && (
          <div style={{ width: 24, height: 1, background: border, margin: '6px 0', flexShrink: 0 }} />
        )}
        {usedTags.length > 0 && (
          <button
            onClick={() => setTagPanelOpen((p) => !p)}
            title="Tags"
            style={{
              width: 35, minHeight: 72, background: (tagPanelOpen || activeTab.type === 'tag') ? textPrimary : 'transparent',
              border: 'none', borderRadius: '0 3px 0 3px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 6, padding: '14px 0', flexShrink: 0, transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { if (!tagPanelOpen && activeTab.type !== 'tag') e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={(e) => { if (!tagPanelOpen && activeTab.type !== 'tag') e.currentTarget.style.background = 'transparent'; }}
          >
            <FontAwesomeIcon icon={faTag} style={{ fontSize: 11, color: (tagPanelOpen || activeTab.type === 'tag') ? '#141414' : '#666' }} />
            <span style={{ fontSize: 11, color: (tagPanelOpen || activeTab.type === 'tag') ? '#141414' : '#aaa', fontFamily: fontMono, writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', letterSpacing: '0.06em', lineHeight: 1 }}>
              Tags
            </span>
            <span style={{ fontSize: 9, color: (tagPanelOpen || activeTab.type === 'tag') ? '#141414' : '#666', fontFamily: fontMono, lineHeight: 1 }}>
              {usedTags.length}
            </span>
          </button>
        )}
      </div>

      {/* ── Folder Popover Panel ──────────────────────────────────────────── */}
      {folderPanelOpen && (
        <div
          ref={folderPanelRef}
          style={{
            position: 'absolute', top: 0, left: 56, zIndex: 50,
            background: '#252525', borderRight: `1px solid ${border}`,
            borderBottom: `1px solid ${border}`,
            borderRadius: '0 0 8px 0',
            minWidth: 200, maxWidth: 260,
            boxShadow: '4px 4px 20px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}
        >
          <div style={{ 
            padding: '10px 12px 6px', 
            fontSize: 10, 
            color: textPrimary, 
            fontFamily: fontMono, 
            letterSpacing: '0.1em', 
            textTransform: 'uppercase', 
            borderBottom: `1px solid ${border}` }}>
            Deine Ordner
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {usedFolders.map((f) => (
              renamingFolder === f ? (
                <div key={f} style={{ padding: '6px 12px' }}>
                  <input
                    value={renameFolderValue}
                    onChange={(e) => setRenameFolderValue(e.target.value)}
                    onBlur={() => { void commitRenameFolder(); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); void commitRenameFolder(); }
                      if (e.key === 'Escape') { setRenamingFolder(null); setRenameFolderValue(''); }
                    }}
                    autoFocus
                    style={{ width: '100%', background: '#141414', border: `1px solid ${gold}`, borderRadius: 3, color: textPrimary, fontFamily: fontMono, fontSize: 10, padding: '4px 6px', outline: 'none' }}
                  />
                </div>
              ) : (
                <FolderPanelRow
                  key={f}
                  label={f}
                  count={notes.filter((n) => n.folder === f).length}
                  active={activeTab.type === 'folder' && activeTab.value === f}
                  color={getFolderColor(f)}
                  onClick={() => { setActiveTab({ type: 'folder', value: f }); setFolderPanelOpen(false); }}
                  onColorChange={(c) => saveFolderColor(f, c)}
                  onRename={() => { setRenamingFolder(f); setRenameFolderValue(f); }}
                  onDelete={() => { void deleteFolder(f); }}
                />
              )
            ))}
          </div>
        </div>
      )}

      {/* ── Tag Popover Panel ────────────────────────────────────────────── */}
      {tagPanelOpen && (
        <div
          ref={tagPanelRef}
          style={{
            position: 'absolute', top: 0, left: 56, zIndex: 50,
            background: '#252525', borderRight: `1px solid ${border}`,
            borderBottom: `1px solid ${border}`,
            borderRadius: '0 0 8px 0',
            minWidth: 200, maxWidth: 260,
            boxShadow: '4px 4px 20px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}
        >
          <div style={{ 
            padding: '10px 12px 6px', 
            fontSize: 10, 
            color: textPrimary, 
            fontFamily: fontMono, 
            letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: `1px solid ${border}` }}>
            Alle Tags
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {usedTags.map((tag) => (
              <TagPanelRow
                key={tag}
                label={tag}
                count={notes.filter((n) => n.tag === tag).length}
                active={activeTab.type === 'tag' && activeTab.value === tag}
                color={getTagColor(tag)}
                isCustom={customTags.includes(tag)}
                onClick={() => { setActiveTab({ type: 'tag', value: tag }); setTagPanelOpen(false); }}
                onColorChange={(c) => saveTagColor(tag, c)}
                onDelete={() => deleteCustomTag(tag)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Panel 2: Notizen-Liste ─────────────────────────────────────────── */}
      <div style={{ width: 260, minWidth: 230, background: bgList, borderRight: `1px solid ${border}`,
        display: 'flex', flexDirection: 'column' }}>
        {(() => {
          const accentColor =
            activeTab.type === 'folder' ? getFolderColor(activeTab.value) :
            activeTab.type === 'tag' ? getTagColor(activeTab.value) :
            activeTab.type === 'quick' ? '#f0c060' : null;
          return (
        <div style={{ padding: '12px 12px 12px',
          borderBottom: `1px solid ${border}`,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          background: accentColor ? `${accentColor}22` : 'transparent',
          borderLeft: accentColor ? `3px solid ${accentColor}` : '3px solid transparent',
        }}>
          <span style={{ fontSize: 11, color: accentColor ?? '#e8e3d8', letterSpacing: '0.05em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: 600 }}>
            {activeTab.type === 'all' && 'Alle Notizen'}
            {activeTab.type === 'quick' && 'Quick Notes'}
            {activeTab.type === 'folder' && activeTab.value}
            {activeTab.type === 'tag' && activeTab.value}
          </span>
          <button
            onClick={() => { void createNote(); }}
            disabled={saving}
            title="Neue Notiz (⌘N)"
            style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: 6,
              color: '#e8e3d8', cursor: 'pointer', padding: '3px 8px', fontSize: 11, flexShrink: 0 }}
          >
            {saving && activeNoteId === null ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPlus} />}
          </button>
        </div>
          );
        })()}

        {/* Search */}
        <div style={{ padding: '8px 10px', borderBottom: `1px solid ${border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a1a', border: `1px solid ${border}`, borderRadius: 6, padding: '4px 8px' }}>
            <FontAwesomeIcon icon={faSearch} style={{ fontSize: 9, color: textMuted }} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suchen…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: textPrimary, fontFamily: fontMono, fontSize: 10 }}
            />
            {(searchQuery || tagFilter) && (
              <button
                onClick={() => { setSearchQuery(''); setTagFilter(''); }}
                style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 9, padding: 0 }}
                title="Filter zurücksetzen"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            )}
          </div>
        </div>

        {/* Tag filter chips */}
        {showTagChips && (
          <div style={{ padding: '6px 10px', borderBottom: `1px solid ${border}`, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {visibleTags.map((t) => {
              const c = getTagColor(t);
              const active = tagFilter === t;
              return (
                <button
                  key={t}
                  onClick={() => setTagFilter(active ? '' : t)}
                  style={{
                    background: active ? `${c}25` : '#1a1a1a',
                    border: `1px solid ${active ? c : '#3a3a3a'}`,
                    borderRadius: 4, color: active ? c : '#999',
                    fontFamily: fontMono, fontSize: 10, padding: '2px 8px', cursor: 'pointer',
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && <div style={{ padding: 20, color: textMuted, fontSize: 11, textAlign: 'center' }}><FontAwesomeIcon icon={faSpinner} spin /></div>}
          {!loading && filteredNotes.length === 0 && (
            <div style={{ padding: '24px 14px', color: textMuted, fontSize: 11, textAlign: 'center', lineHeight: 1.6 }}>
              <FontAwesomeIcon icon={faNoteSticky} style={{ display: 'block', margin: '0 auto 10px', fontSize: 22, color: border }} />
              {notes.length === 0 ? <><br /><strong style={{ color: '#d0cbb8' }}>+</strong> zum Starten</> : 'Keine Treffer'}
            </div>
          )}
          {filteredNotes.map((note) => {
            const isActive = note.id === activeNoteId;
            const isHovered = note.id === hoveredNoteId;
            const isDeleting = note.id === deletingNoteId;
            const noteAccentColor = getNoteAccentColor(note);
            return (
              <div key={note.id} onMouseEnter={() => setHoveredNoteId(note.id)} onMouseLeave={() => setHoveredNoteId(null)} style={{ position: 'relative', borderBottom: `1px solid ${border}`, zIndex: moveDropdownNoteId === note.id ? 20 : 1 }}>
                {renamingNoteId === note.id ? (
                  <div style={{ padding: '8px 36px 8px 12px' }}>
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => { void commitRename(note.id); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); void commitRename(note.id); }
                        if (e.key === 'Escape') setRenamingNoteId(null);
                      }}
                      style={{ width: '100%', background: '#1e1e1e', border: `1px solid ${gold}`, borderRadius: 4, color: textPrimary, fontFamily: fontMono, fontSize: 10, padding: '3px 5px', outline: 'none' }}
                    />
                    <div style={{ fontSize: 9, color: textMuted, marginTop: 2 }}>Enter · Esc</div>
                  </div>
                ) : (
                  <button
                    onClick={() => { void openNote(note.id, note.title, note.tag, note.folder); }}
                    onDoubleClick={(e) => startRename(note, e)}
                    title="Klick: öffnen · Doppelklick: umbenennen"
                    style={{
                      width: '100%', textAlign: 'left', padding: `9px ${isHovered ? '62px' : '12px'} 9px 12px`,
                      background: isActive ? `${noteAccentColor}18` : isHovered ? 'rgba(255,255,255,0.025)' : 'transparent',
                      borderLeft: `5px solid ${isActive ? noteAccentColor : 'transparent'}`,
                      borderRadius: '2px',
                      border: 'none', cursor: 'pointer', display: 'block',
                    }}
                  >
                    <div style={{ fontSize: 12, color: isActive ? textPrimary : '#ddd', overflow: 'hidden', 
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                      <FontAwesomeIcon icon={faFileLines} style={{ marginRight: 6, color: isActive ? noteAccentColor : '#777', fontSize: 10 }} />
                      {note.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, color: textPrimary }}>{new Date(note.createdAt).toLocaleDateString('de-DE')}</span>
                      {note.folder && (
                        <span style={{ fontSize: 9, color: getFolderColor(note.folder), background: `${getFolderColor(note.folder)}20`, border: `1px solid ${getFolderColor(note.folder)}50`, borderRadius: 3, padding: '1px 5px' }}>
                          {note.folder}
                        </span>
                      )}
                      {note.tag && <span style={{ fontSize: 9, color: getTagColor(note.tag), background: `${getTagColor(note.tag)}20`, border: `1px solid ${getTagColor(note.tag)}50`, borderRadius: 3, padding: '1px 5px' }}>{note.tag}</span>}
                    </div>
                  </button>
                )}
                {(isHovered || isDeleting || movingNoteId === note.id) && (
                  <div style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 1 }}>
                    {/* Move button */}
                    {usedFolders.length > 0 && (
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setMoveDropdownNoteId(moveDropdownNoteId === note.id ? null : note.id); }}
                          title="In Ordner verschieben"
                          style={{ background: moveDropdownNoteId === note.id ? `${gold}20` : 'transparent', border: 'none', cursor: 'pointer', color: moveDropdownNoteId === note.id ? gold : '#888', 
                            fontSize: 10, padding: '4px 5px', borderRadius: 4 }}
                        >
                          {movingNoteId === note.id ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faRightLeft} />}
                        </button>
                        {/* Folder dropdown */}
                        {moveDropdownNoteId === note.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{ 
                              position: 'absolute', 
                              right: 0, top: '100%', 
                              marginTop: 4, background: '#1a1a1a', 
                              border: `1px solid ${border}`, 
                              borderRadius: 6, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', 
                              minWidth: 150, overflow: 'hidden', zIndex: 200 }}
                          >
                            <div style={{ padding: '5px 10px', fontSize: 9, color: '#555', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${border}` }}>Verschieben nach</div>
                            {note.folder && (
                              <button
                                onClick={() => { setMoveDropdownNoteId(null); void moveNote(note.id, ''); }}
                                style={{ 
                                  width: '100%', 
                                  textAlign: 'left', 
                                  padding: '6px 12px', 
                                  background: 'transparent', 
                                  border: 'none', color: '#888', 
                                  cursor: 'pointer', fontFamily: fontMono, 
                                  fontSize: 10, display: 'flex', alignItems: 'center', gap: 6 }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                              >
                                <FontAwesomeIcon icon={faXmark} style={{ fontSize: 9, color: '#555' }} />
                                kein Ordner
                              </button>
                            )}
                            {usedFolders.filter((f) => f !== note.folder).map((f) => (
                              <button
                                key={f}
                                onClick={() => { setMoveDropdownNoteId(null); void moveNote(note.id, f); }}
                                style={{ width: '100%', textAlign: 'left', padding: '6px 12px', background: 'transparent', border: 'none', color: textPrimary, cursor: 'pointer', fontFamily: fontMono, fontSize: 10, display: 'flex', alignItems: 'center', gap: 6 }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                              >
                                <FontAwesomeIcon icon={faFolder} style={{ fontSize: 9, color: textIcon }} />
                                {f}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Delete button */}
                    <button onClick={(e) => { void deleteNote(note.id, e); }} title="Notiz löschen" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#e07070', fontSize: 10, padding: '4px 5px', borderRadius: 4 }}>
                      {isDeleting ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faTrash} />}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Panel 3: Editor ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {activeNoteId === null ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <FontAwesomeIcon icon={faNoteSticky} style={{ fontSize: 36, color: textMuted }} />
            <p style={{ color: textMuted, fontSize: 12 }}>Notiz auswählen oder neue erstellen</p>
            <button onClick={() => { void createNote(); }} style={{ background: 'transparent', border: `1px solid ${gold}`, borderRadius: 8, color: gold, cursor: 'pointer', padding: '8px 18px', fontSize: 11, fontFamily: fontMono }}>
              <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />Neue Notiz
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

            {/* Meta-Leiste: Folder + Tag + Aktionen */}
            <div style={{ padding: '6px 14px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10, background: bgSidebar, flexShrink: 0, flexWrap: 'wrap' }}>

              {/* Folder Picker */}
              <div style={metaFieldStyle}>
                <FontAwesomeIcon icon={faFolder} style={{ fontSize: 9, color: textIcon, flexShrink: 0 }} />
                {newFolderMode ? (
                  <input
                    ref={newFolderInputRef}
                    value={newFolderValue}
                    onChange={(e) => setNewFolderValue(e.target.value)}
                    onBlur={commitNewFolder}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); commitNewFolder(); }
                      if (e.key === 'Escape') { setNewFolderMode(false); setNewFolderValue(''); }
                    }}
                    placeholder="Ordner-Name…"
                    autoFocus
                    style={{ background: '#1e1e1e', border: `1px solid ${gold}`, borderRadius: 4, color: textPrimary, fontFamily: fontMono, fontSize: 10, padding: '2px 8px', outline: 'none', height: 24, width: isMetaCompact ? '100%' : 140 }}
                  />
                ) : (
                  <ZenDropdown
                    value={editorFolder}
                    onChange={handleFolderChange}
                    options={folderOptions}
                    variant="compact"
                    theme="paper"
                    triggerHeight={35}
                    placeholder="kein Ordner"
                    fullWidth={isMetaCompact}
                    width={isMetaCompact ? undefined : metaDropdownDesktopWidth}
                  />
                )}
              </div>

              {!isMetaCompact && <div style={{ width: 1, height: 14, background: border }} />}

              {/* Tag Picker */}
              <div style={metaFieldStyle}>
                <FontAwesomeIcon icon={faTag} style={{ fontSize: 9, color: textIcon, flexShrink: 0 }} />
                {newTagMode ? (
                  <input
                    ref={newTagInputRef}
                    value={newTagValue}
                    onChange={(e) => setNewTagValue(e.target.value)}
                    onBlur={commitNewTag}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); commitNewTag(); }
                      if (e.key === 'Escape') { setNewTagMode(false); setNewTagValue(''); }
                    }}
                    placeholder="Tag-Name…"
                    autoFocus
                    style={{ background: '#1e1e1e', border: `1px solid ${textIcon}`, borderRadius: 4, color: textPrimary, fontFamily: fontMono, fontSize: 10, padding: '2px 8px', outline: 'none', height: 24, width: isMetaCompact ? '100%' : 120 }}
                  />
                ) : (
                  <ZenDropdown
                    value={editorTag}
                    onChange={handleTagChange}
                    options={[
                      { value: '', label: 'kein Tag' },
                      ...getAllTags(customTags).map((t) => ({ value: t, label: t })),
                      { value: '__new__', label: '+ Neuer Tag…' },
                    ]}
                    variant="compact"
                    theme="paper"
                    triggerHeight={35}
                    placeholder="kein Tag"
                    fullWidth={isMetaCompact}
                    width={isMetaCompact ? undefined : metaDropdownDesktopWidth}
                  />
                )}
              </div>

              {!isMetaCompact && <div style={{ width: 1, height: 14, background: border }} />}

              {/* Datum Picker */}
              <div style={{ ...metaFieldStyle, flex: isMetaCompact ? '1 1 100%' : '0 0 auto' }}>
                <FontAwesomeIcon icon={faCalendarPlus} style={{ fontSize: 9, color: textIcon, flexShrink: 0 }} />
                <ZenDropdown
                  value=""
                  onChange={() => {}}
                  disabled={!activeNoteId}
                  triggerHeight={35}
                  triggerLabel={editorPlannedDate
                    ? editorPlannedDate.split('-').reverse().join('.')
                    : 'Datum'}
                  theme="paper"
                  variant="compact"
                  fullWidth={isMetaCompact}
                  width={isMetaCompact ? undefined : metaDateDesktopWidth}
                  customMenuContent={(closeMenu) => {
                    const today = new Date().toISOString().split('T')[0];
                    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
                    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
                    const pickDate = (d: string) => { handlePlannedDateChange(d); closeMenu(); };
                    const btnStyle: React.CSSProperties = {
                      flex: 1, padding: '4px 0', background: 'transparent',
                      border: '1px dotted #3A3A3A', borderRadius: 4,
                      color: '#d0cbb8', fontFamily: fontMono, fontSize: 10,
                      cursor: 'pointer',
                    };
                    return (
                      <div style={{ padding: '12px', fontFamily: fontMono }}>
                        <div style={{
                          fontSize: 9,
                          color: '#d0cbb8',
                          marginBottom: 8,
                          textTransform: 'uppercase',
                          letterSpacing: 1 }}>Datum wählen</div>
                        <input
                          type="date"
                          value={editorPlannedDate}
                          onChange={(e) => { if (e.target.value) pickDate(e.target.value); }}
                          style={{
                            width: '100%', background: '#0e0e0e',
                            border: '1px dotted #3A3A3A', borderRadius: 4,
                            color: textPrimary, fontFamily: fontMono, fontSize: 11,
                            padding: '6px 8px', outline: 'none', marginBottom: 10,
                            colorScheme: 'dark',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 4, marginBottom: editorPlannedDate ? 8 : 0 }}>
                          <button style={btnStyle} onClick={() => pickDate(today)} onMouseEnter={(e) => { e.currentTarget.style.borderColor = gold; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3A3A3A'; }}>Heute</button>
                          <button style={btnStyle} onClick={() => pickDate(tomorrow)} onMouseEnter={(e) => { e.currentTarget.style.borderColor = gold; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3A3A3A'; }}>Morgen</button>
                          <button style={btnStyle} onClick={() => pickDate(nextWeek)} onMouseEnter={(e) => { e.currentTarget.style.borderColor = gold; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3A3A3A'; }}>+7 Tage</button>
                        </div>
                        {editorPlannedDate && (
                          <button
                            onClick={() => { handlePlannedDateChange(''); closeMenu(); }}
                            style={{ width: '100%', padding: '4px 0',
                              background: 'transparent',
                              border: '1px dotted #555',
                              borderRadius: 4,
                              color: '#999',
                              fontFamily: fontMono,
                              fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#c0392b'; e.currentTarget.style.color = '#c0392b'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#666'; }}
                          >
                            <FontAwesomeIcon icon={faTrash} style={{ fontSize: 9 }} />
                            Datum löschen
                          </button>
                        )}
                      </div>
                    );
                  }}
                />
              </div>

              <div style={{ flex: 1 }} />

              {/* Save indicator */}
              {saving && <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 10, color: textMuted }} />}
              {saveOk && !saving && <FontAwesomeIcon icon={faCheck} style={{ fontSize: 10, color: '#4caf50' }} />}

            </div>

            {/* ZenMarkdownEditor */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <ZenMarkdownEditor
                value={editorContent}
                onChange={handleEditorChange}
                title={editorTitle}
                onTitleChange={(t) => { setEditorTitle(t); editorTitleRef.current = t; setDirty(true); }}
                theme={editorTheme}
                hideTopBorder={true}
                height="calc(100vh - 280px)"
                width = "98%"
                showLineNumbers={true}
                showCharCount={true}
                showHeader={true}
                showZenNoteButton={false}
                placeholder={`# Titel\n\nText hier...\n\n\`\`\`js\n// Code-Snippet\nconsole.log('hello');\n\`\`\``}
              />
            </div>
          </div>
        )}
      </div>
      </div>{/* Main Content */}
    </div>
  );
}

// ── Vertical Tab ───────────────────────────────────────────────────────────
function VerticalTab({ label, icon, count, active, color, onClick, onDoubleClick }: {
  label: string; icon: typeof faLayerGroup; count: number; active: boolean; color: string; onClick: () => void; onDoubleClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title={`${label} (${count})${onDoubleClick ? ' · Doppelklick: umbenennen' : ''}`}
      style={{
        width: 35,
        minHeight: 72,
        background: active ? color : 'transparent',
        border: 'none',
        borderRadius: '0 3px 0 3px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '14px 0',
        flexShrink: 0,
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >
      <FontAwesomeIcon icon={icon} style={{ fontSize: 11, color: active ? '#141414' : '#666' }} />
      <span style={{
        fontSize: 11,
        color: active ? '#141414' : '#aaa',
        fontFamily: fontMono,
        writingMode: 'vertical-rl',
        textOrientation: 'mixed',
        transform: 'rotate(180deg)',
        letterSpacing: '0.06em',
        lineHeight: 1,
        maxHeight: 48,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {label}
      </span>
      <span style={{ fontSize: 9, color: active ? '#141414' : '#666', fontFamily: fontMono, lineHeight: 1 }}>
        {count}
      </span>
    </button>
  );
}

// ── Folder Panel Row ───────────────────────────────────────────────────────
function FolderPanelRow({ label, count, active, color, onClick, onColorChange, onRename, onDelete }: {
  label: string; count: number; active: boolean; color: string;
  onClick: () => void; onColorChange: (c: string) => void;
  onRename: () => void; onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', background: active ? `${color}22` : hovered ? 'rgba(255,255,255,0.04)' : 'transparent', borderLeft: active ? `2px solid ${color}` : '2px solid transparent', transition: 'background 0.12s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Color dot — input overlay verhindert bubbling */}
      <div style={{ position: 'relative', width: 8, height: 8, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        <input type="color" value={color} onChange={(e) => onColorChange(e.target.value)} onClick={(e) => e.stopPropagation()} title="Farbe ändern" style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }} />
      </div>
      {/* Label */}
      <span style={{ flex: 1, fontSize: 10, color: active ? color : '#d0cbb8', fontFamily: 'IBM Plex Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {/* Count */}
      <span style={{ fontSize: 9, color: '#555', fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>{count}</span>
      {/* Hover actions */}
      {hovered && (
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <button onClick={onRename} title="Umbenennen" style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: 9, padding: '2px 4px', borderRadius: 3 }} onMouseEnter={(e) => { e.currentTarget.style.color = '#AC8E66'; }} onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; }}>
            <FontAwesomeIcon icon={faPenToSquare} />
          </button>
          <button onClick={onDelete} title="Ordner löschen (Notizen bleiben)" style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: 9, padding: '2px 4px', borderRadius: 3 }} onMouseEnter={(e) => { e.currentTarget.style.color = '#e07070'; }} onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; }}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tag Panel Row ──────────────────────────────────────────────────────────
function TagPanelRow({ label, count, active, color, isCustom, onClick, onColorChange, onDelete }: {
  label: string; count: number; active: boolean; color: string; isCustom: boolean;
  onClick: () => void; onColorChange: (c: string) => void; onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', background: active ? `${color}22` : hovered ? 'rgba(255,255,255,0.04)' : 'transparent', borderLeft: active ? `2px solid ${color}` : '2px solid transparent', transition: 'background 0.12s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div style={{ position: 'relative', width: 8, height: 8, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        <input type="color" value={color} onChange={(e) => onColorChange(e.target.value)} onClick={(e) => e.stopPropagation()} title="Farbe ändern" style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }} />
      </div>
      <span style={{ flex: 1, fontSize: 10, color: active ? color : '#d0cbb8', fontFamily: 'IBM Plex Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span style={{ fontSize: 9, color: '#555', fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>{count}</span>
      {hovered && isCustom && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Tag löschen" style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: 9, padding: '2px 4px', borderRadius: 3, flexShrink: 0 }} onMouseEnter={(e) => { e.currentTarget.style.color = '#e07070'; }} onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; }}>
          <FontAwesomeIcon icon={faXmark} />
        </button>
      )}
    </div>
  );
}
