import { useState, useEffect, useRef, useCallback } from 'react';
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
} from '@fortawesome/free-solid-svg-icons';
import type { ScheduledPost } from '../../types/scheduling';
import { loadZenStudioSettings } from '../../services/zenStudioSettingsService';
import {
  listCloudDocuments,
  uploadCloudDocument,
  downloadCloudDocumentText,
  deleteCloudDocument,
} from '../../services/cloudStorageService';
import { ZenMarkdownEditor } from '../../kits/PatternKit/ZenMarkdownEditor';
import { ZenDropdown } from '../../kits/PatternKit/ZenModalSystem/components/ZenDropdown';

const ZEN_NOTE_MIME = 'text/zennote';
const KNOWN_TAGS = ['js', 'ts', 'php', 'css', 'html', 'sql', 'bash', 'py', 'markdown', 'text'];

function loadCustomTags(): string[] {
  try {
    const raw = localStorage.getItem('zenpost_zennote_custom_tags');
    if (raw) return JSON.parse(raw) as string[];
  } catch { /* ignore */ }
  return [];
}
function saveCustomTags(tags: string[]) {
  localStorage.setItem('zenpost_zennote_custom_tags', JSON.stringify(tags));
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
  onAddToPlanner?: (post: ScheduledPost) => void;
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
const bgSidebar = '#141414';
const bgList = '#1c1c1c';
const border = '#2A2A2A';
const textPrimary = '#E7CCAA';
const textMuted = '#888';
const fontMono = 'IBM Plex Mono, monospace';

const TAG_COLORS: Record<string, string> = {
  js: '#f0db4f', ts: '#007acc', php: '#787cb5', css: '#264de4',
  html: '#e34c26', sql: '#cc2927', bash: '#4eaa25', py: '#3776ab',
  markdown: '#6a9fb5', text: '#888',
};

// Folder separator: @@ — slash gets stripped by PHP on server upload
// Format: "FolderName@@NoteTitle__tag.zennote"
// Legacy: also reads old "/" separator for existing notes
function parseFileName(fileName: string): { title: string; tag: string; folder: string } {
  const base = fileName.replace(/\.zennote$/, '');
  let folder = '';
  let rest = base;

  const atIdx = base.indexOf('@@');
  if (atIdx !== -1) {
    folder = base.slice(0, atIdx);
    rest = base.slice(atIdx + 2);
  } else {
    const slashIdx = base.indexOf('/');
    if (slashIdx !== -1) {
      folder = base.slice(0, slashIdx);
      rest = base.slice(slashIdx + 1);
    }
  }

  const sep = rest.lastIndexOf('__');
  if (sep === -1) return { title: rest, tag: '', folder };
  const maybeTag = rest.slice(sep + 2);
  if (maybeTag && /^[a-zA-Z0-9_-]+$/.test(maybeTag)) return { title: rest.slice(0, sep), tag: maybeTag, folder };
  return { title: rest, tag: '', folder };
}

function encodeFileName(title: string, tag: string, folder: string): string {
  const safeTitle = (title.trim() || 'Notiz').replace(/@@/g, '-').replace(/\//g, '-');
  const safeFolder = folder.trim().replace(/@@/g, '-').replace(/\//g, '-');
  const withTag = tag ? `${safeTitle}__${tag}` : safeTitle;
  return safeFolder ? `${safeFolder}@@${withTag}.zennote` : `${withTag}.zennote`;
}

export function ZenNoteStudioScreen({ insertTargetActive = false, onAddToPlanner }: ZenNoteStudioScreenProps) {
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
  const [tagColors, setTagColors] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('zenpost_zennote_tag_colors');
      if (raw) return JSON.parse(raw) as Record<string, string>;
    } catch { /* ignore */ }
    return {};
  });
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const insertMenuRef = useRef<HTMLDivElement>(null);

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
  const editorTheme = (() => {
    try {
      const raw = localStorage.getItem('zenpost_editor_settings');
      if (raw) return (JSON.parse(raw) as { theme?: string }).theme === 'light' ? 'light' : 'dark';
    } catch { /* ignore */ }
    return 'dark' as const;
  })() as 'dark' | 'light';
  const isLoggedIn = !!settings.cloudAuthToken && !!settings.cloudProjectId;

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadNotes = useCallback(async () => {
    const projectId = settings.cloudProjectId;
    if (!projectId) { setLoading(false); return; }
    const docs = await listCloudDocuments(projectId);
    if (!docs) { setLoading(false); return; }
    const zenNotes = docs
      .filter((d) => d.mimeType === ZEN_NOTE_MIME || d.fileName.endsWith('.zennote'))
      .map((d) => {
        const { title, tag, folder } = parseFileName(d.fileName);
        return { id: d.id, title, tag, folder, createdAt: d.createdAt };
      });
    setNotes(zenNotes);
    setLoading(false);
  }, [settings.cloudProjectId]);

  useEffect(() => { void loadNotes(); }, [loadNotes]);
  useEffect(() => { activeNoteIdRef.current = activeNoteId; }, [activeNoteId]);
  useEffect(() => { editorContentRef.current = editorContent; }, [editorContent]);
  useEffect(() => { editorTitleRef.current = editorTitle; }, [editorTitle]);
  useEffect(() => { editorTagRef.current = editorTag; }, [editorTag]);
  useEffect(() => { editorFolderRef.current = editorFolder; }, [editorFolder]);

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
    if (!onAddToPlanner) return;
    const dateToUse = editorPlannedDate || new Date().toISOString().split('T')[0];
    const [year, month, day] = dateToUse.split('-').map(Number);
    const scheduledDate = new Date(year, month - 1, day);
    const content = editorContentRef.current;
    const words = content.replace(/^---[\s\S]*?---\n*/m, '').trim().split(/\s+/).length;
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
    onAddToPlanner(post);
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
    window.dispatchEvent(new CustomEvent('zenpost:insert-snippet', {
      detail: { content: editorContent, title: editorTitleRef.current },
    }));
    setInsertOk(true);
    setTimeout(() => setInsertOk(false), 2000);
  };

  const [openAsDraftOk, setOpenAsDraftOk] = useState(false);

  const handleOpenAsDraft = () => {
    if (!editorContent.trim()) return;
    window.dispatchEvent(new CustomEvent('zenpost:open-as-draft', {
      detail: { content: editorContent, title: editorTitleRef.current },
    }));
    setOpenAsDraftOk(true);
    setTimeout(() => setOpenAsDraftOk(false), 2500);
  };

  // ── New Folder ─────────────────────────────────────────────────────────────
  const commitNewFolder = () => {
    const name = newFolderValue.trim();
    setNewFolderMode(false);
    setNewFolderValue('');
    if (!name) return;
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
    if (activeTab.type === 'tag' && activeTab.value === tag) {
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
  const getTagColor = (tag: string) => tagColors[tag] ?? TAG_COLORS[tag] ?? '#888';
  const saveTagColor = (tag: string, color: string) => {
    const next = { ...tagColors, [tag]: color };
    setTagColors(next);
    localStorage.setItem('zenpost_zennote_tag_colors', JSON.stringify(next));
  };

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16, fontFamily: fontMono }}>
        <FontAwesomeIcon icon={faNoteSticky} style={{ fontSize: 32, color: textMuted }} />
        <p style={{ color: textMuted, fontSize: 12 }}>ZenNote Studio benötigt einen ZenPost Cloud Account.</p>
        <button
          className="zen-gold-btn"
          onClick={() => window.dispatchEvent(new CustomEvent('zenpost:open-settings', { detail: { tab: 'cloud' } }))}
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', fontFamily: fontMono, background: '#1a1a1a' }}>

      {/* ── Studio Bar ──────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', background: '#1a1a1a', display: 'flex', alignItems: 'flex-end', padding: '10px 16px 0', gap: 8, justifyContent: 'space-between', flexShrink: 0 }}>
        {/* Goldene Linie über allen Tabs */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: '#AC8E66', zIndex: 10, pointerEvents: 'none' }} />
        {/* Left: Notizen Tab */}
        <div style={{ display: 'flex', gap: 8, zIndex: 1 }}>
         
        </div>
        {/* Right: Action Tabs */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', zIndex: 1 }}>
          {onAddToPlanner && (
            <>
              {/* Datum-Tab — steht allein links mit Auto-Margin */}
              <div
                style={{ position: 'relative', width: 130, height: 40, marginRight: '30px', marginBottom: '2px' }}
                onMouseEnter={(e) => { if (activeNoteId) { const inner = e.currentTarget.querySelector('div') as HTMLElement | null; if (inner) inner.style.borderColor = '#AC8E66'; } }}
                onMouseLeave={(e) => { const inner = e.currentTarget.querySelector('div') as HTMLElement | null; if (inner) inner.style.borderColor = editorPlannedDate ? gold : '#3A3A3A'; }}
              >
                <div style={{ width: '100%', height: '100%', borderTop: editorPlannedDate ? `1px solid ${gold}` : '1px dotted #3A3A3A', borderLeft: editorPlannedDate ? `1px solid ${gold}` : '1px dotted #3A3A3A', borderRight: editorPlannedDate ? `1px solid ${gold}` : '1px dotted #3A3A3A', borderBottom: 0, borderRadius: '10px 10px 0 0', background: editorPlannedDate ? 'rgba(172,142,102,0.08)' : '#121212', display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', fontFamily: fontMono, fontSize: 10, color: editorPlannedDate ? gold : '#a1a1a1', opacity: !activeNoteId ? 0.4 : 1, pointerEvents: 'none', transition: 'border-color 0.2s' }}>
                  <span style={{ color: editorPlannedDate ? gold : '#555', display: 'inline-flex' }}><FontAwesomeIcon icon={faCalendarPlus} /></span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editorPlannedDate || 'Datum'}</span>
                </div>
                <input type="date" value={editorPlannedDate} onChange={(e) => handlePlannedDateChange(e.target.value)} disabled={!activeNoteId} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: !activeNoteId ? 'not-allowed' : 'pointer', width: '100%', height: '100%' }} />
              </div>
              {/* Planen-Tab */}
              <button
                onClick={handleAddToPlanner}
                disabled={!activeNoteId}
                style={{ width: 130, height: 40, borderTop: plannerAddOk ? '1px solid #4caf50' : '1px dotted #3A3A3A', borderLeft: plannerAddOk ? '1px solid #4caf50' : '1px dotted #3A3A3A', borderRight: plannerAddOk ? '1px solid #4caf50' : '1px dotted #3A3A3A', borderBottom: 0, borderRadius: '10px 10px 0 0', padding: '0 10px', background: '#121212', display: 'flex', alignItems: 'center', gap: 8, fontFamily: fontMono, fontSize: 10, color: plannerAddOk ? '#4caf50' : '#a1a1a1', cursor: !activeNoteId ? 'not-allowed' : 'pointer', opacity: !activeNoteId ? 0.4 : 1, transition: 'border-color 0.2s' }}
                onMouseEnter={(e) => { if (activeNoteId && !plannerAddOk) e.currentTarget.style.borderColor = '#AC8E66'; }}
                onMouseLeave={(e) => { if (activeNoteId && !plannerAddOk) e.currentTarget.style.borderColor = '#3A3A3A'; }}
              >
                <span style={{ color: plannerAddOk ? '#4caf50' : gold, display: 'inline-flex' }}><FontAwesomeIcon icon={plannerAddOk ? faCheck : faCalendarPlus} /></span>
                <span>{plannerAddOk ? 'Geplant!' : 'Planen'}</span>
              </button>
            </>
          )}
          {/* Einfügen ▾ Dropdown */}
          <div ref={insertMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { if (!insertOk && !openAsDraftOk) setShowInsertMenu((prev) => !prev); }}
              disabled={!editorContent.trim()}
              style={{ width: 130, height: 40, borderTop: (insertOk || openAsDraftOk) ? '1px solid #4caf50' : '1px dotted #3A3A3A', borderLeft: (insertOk || openAsDraftOk) ? '1px solid #4caf50' : '1px dotted #3A3A3A', borderRight: (insertOk || openAsDraftOk) ? '1px solid #4caf50' : '1px dotted #3A3A3A', borderBottom: 0, borderRadius: '10px 10px 0 0', padding: '0 10px', background: '#121212', display: 'flex', alignItems: 'center', gap: 8, fontFamily: fontMono, fontSize: 10, color: (insertOk || openAsDraftOk) ? '#4caf50' : '#a1a1a1', cursor: !editorContent.trim() ? 'not-allowed' : 'pointer', opacity: !editorContent.trim() ? 0.4 : 1, transition: 'border-color 0.2s' }}
              onMouseEnter={(e) => { if (editorContent.trim() && !insertOk && !openAsDraftOk) e.currentTarget.style.borderColor = '#AC8E66'; }}
              onMouseLeave={(e) => { if (editorContent.trim() && !insertOk && !openAsDraftOk) e.currentTarget.style.borderColor = '#3A3A3A'; }}
            >
              <span style={{ color: insertOk || openAsDraftOk ? '#4caf50' : gold, display: 'inline-flex' }}><FontAwesomeIcon icon={insertOk || openAsDraftOk ? faCheck : faArrowRightToBracket} /></span>
              <span>{insertOk ? 'Eingefügt!' : openAsDraftOk ? 'Geöffnet!' : `Einfügen ${showInsertMenu ? '▲' : '▾'}`}</span>
            </button>
            {showInsertMenu && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#1a1a1a', border: '1px solid #AC8E66', borderRadius: 8, overflow: 'hidden', minWidth: 200, zIndex: 200 }}>
                {insertTargetActive && (
                  <button
                    onClick={() => { setShowInsertMenu(false); handleInsert(); }}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid #2a2a2a', color: '#EFEBDC', fontFamily: fontMono, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(172,142,102,0.12)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <FontAwesomeIcon icon={faArrowRightToBracket} style={{ color: gold }} />
                    In Editor einfügen
                  </button>
                )}
                <button
                  onClick={() => { setShowInsertMenu(false); handleOpenAsDraft(); }}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', color: '#EFEBDC', fontFamily: fontMono, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(172,142,102,0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <FontAwesomeIcon icon={faPenToSquare} style={{ color: gold }} />
                  Als Entwurf öffnen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

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
          color={gold}
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

        {/* Divider + Folders */}
        {usedFolders.length > 0 && (
          <div style={{ width: 24, height: 1, background: border, margin: '10px 0', flexShrink: 0 }} />
        )}
        {usedFolders.map((f) => (
          renamingFolder === f ? (
            <div key={f} style={{ width: 52, padding: '6px 2px' }}>
              <input
                value={renameFolderValue}
                onChange={(e) => setRenameFolderValue(e.target.value)}
                onBlur={() => { void commitRenameFolder(); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); void commitRenameFolder(); }
                  if (e.key === 'Escape') { setRenamingFolder(null); setRenameFolderValue(''); }
                }}
                autoFocus
                style={{ width: '100%', background: '#1e1e1e', border: `1px solid ${gold}`, borderRadius: 3, color: textPrimary, fontFamily: fontMono, fontSize: 9, padding: '4px 4px', outline: 'none' }}
              />
              <div style={{ fontSize: 8, color: '#555', textAlign: 'center', marginTop: 2 }}>Enter</div>
            </div>
          ) : (
            <VerticalTab
              key={f}
              label={f}
              icon={faFolder}
              count={notes.filter((n) => n.folder === f).length}
              active={activeTab.type === 'folder' && activeTab.value === f}
              color={gold}
              onClick={() => setActiveTab({ type: 'folder', value: f })}
              onDoubleClick={() => { setRenamingFolder(f); setRenameFolderValue(f); }}
            />
          )
        ))}

        {/* Divider + Tags */}
        {usedTags.length > 0 && (
          <div style={{ width: 24, height: 1, background: border, margin: '6px 0', flexShrink: 0 }} />
        )}
        {usedTags.map((tag) => (
          <VerticalTabWithColor
            key={tag}
            label={tag}
            count={notes.filter((n) => n.tag === tag).length}
            active={activeTab.type === 'tag' && activeTab.value === tag}
            color={getTagColor(tag)}
            onClick={() => setActiveTab({ type: 'tag', value: tag })}
            onColorChange={(c) => saveTagColor(tag, c)}
            isCustom={customTags.includes(tag)}
            onDelete={() => deleteCustomTag(tag)}
          />
        ))}
      </div>

      {/* ── Panel 2: Notizen-Liste ─────────────────────────────────────────── */}
      <div style={{ width: 260, minWidth: 230, background: bgList, borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 12px 12px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#ccc', letterSpacing: '0.05em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: 600 }}>
            {activeTab.type === 'all' && 'Alle Notizen'}
            {activeTab.type === 'quick' && 'Quick Notes'}
            {activeTab.type === 'folder' && activeTab.value}
            {activeTab.type === 'tag' && activeTab.value}
          </span>
          <button
            onClick={() => { void createNote(); }}
            disabled={saving}
            title="Neue Notiz (⌘N)"
            style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: 6, color: gold, cursor: 'pointer', padding: '3px 8px', fontSize: 11, flexShrink: 0 }}
          >
            {saving && activeNoteId === null ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPlus} />}
          </button>
        </div>

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
              {notes.length === 0 ? <><br /><strong style={{ color: gold }}>+</strong> zum Starten</> : 'Keine Treffer'}
            </div>
          )}
          {filteredNotes.map((note) => {
            const isActive = note.id === activeNoteId;
            const isHovered = note.id === hoveredNoteId;
            const isDeleting = note.id === deletingNoteId;
            return (
              <div key={note.id} onMouseEnter={() => setHoveredNoteId(note.id)} onMouseLeave={() => setHoveredNoteId(null)} style={{ position: 'relative', borderBottom: `1px solid ${border}` }}>
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
                      background: isActive ? 'rgba(172,142,102,0.08)' : isHovered ? 'rgba(255,255,255,0.025)' : 'transparent',
                      borderLeft: `2px solid ${isActive ? gold : 'transparent'}`,
                      border: 'none', cursor: 'pointer', display: 'block',
                    }}
                  >
                    <div style={{ fontSize: 12, color: isActive ? textPrimary : '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                      <FontAwesomeIcon icon={faFileLines} style={{ marginRight: 6, color: isActive ? gold : '#777', fontSize: 10 }} />
                      {note.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, color: '#777' }}>{new Date(note.createdAt).toLocaleDateString('de-DE')}</span>
                      {note.folder && (
                        <span style={{ fontSize: 9, color: '#AC8E66', background: 'rgba(172,142,102,0.12)', border: '1px solid rgba(172,142,102,0.35)', borderRadius: 3, padding: '1px 5px' }}>
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
                          style={{ background: moveDropdownNoteId === note.id ? `${gold}20` : 'transparent', border: 'none', cursor: 'pointer', color: moveDropdownNoteId === note.id ? gold : '#888', fontSize: 10, padding: '4px 5px', borderRadius: 4 }}
                        >
                          {movingNoteId === note.id ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faRightLeft} />}
                        </button>
                        {/* Folder dropdown */}
                        {moveDropdownNoteId === note.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{ position: 'absolute', right: 0, bottom: '100%', marginBottom: 4, background: '#1a1a1a', border: `1px solid ${border}`, borderRadius: 6, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', minWidth: 150, overflow: 'hidden', zIndex: 200 }}
                          >
                            <div style={{ padding: '5px 10px', fontSize: 9, color: '#555', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${border}` }}>Verschieben nach</div>
                            {note.folder && (
                              <button
                                onClick={() => { setMoveDropdownNoteId(null); void moveNote(note.id, ''); }}
                                style={{ width: '100%', textAlign: 'left', padding: '6px 12px', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontFamily: fontMono, fontSize: 10, display: 'flex', alignItems: 'center', gap: 6 }}
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
                                <FontAwesomeIcon icon={faFolder} style={{ fontSize: 9, color: gold }} />
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
            <FontAwesomeIcon icon={faNoteSticky} style={{ fontSize: 36, color: border }} />
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
              <FontAwesomeIcon icon={faFolder} style={{ fontSize: 9, color: textMuted }} />
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
                  style={{ background: '#1e1e1e', border: `1px solid ${gold}`, borderRadius: 4, color: textPrimary, fontFamily: fontMono, fontSize: 10, padding: '2px 8px', outline: 'none', height: 24, width: 140 }}
                />
              ) : (
                <ZenDropdown
                  value={editorFolder}
                  onChange={handleFolderChange}
                  options={folderOptions}
                  variant="compact"
                  theme="dark"
                  triggerHeight={24}
                  placeholder="kein Ordner"
                />
              )}

              <div style={{ width: 1, height: 14, background: border }} />

              {/* Tag Picker */}
              <FontAwesomeIcon icon={faTag} style={{ fontSize: 9, color: textMuted }} />
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
                  style={{ background: '#1e1e1e', border: `1px solid ${gold}`, borderRadius: 4, color: textPrimary, fontFamily: fontMono, fontSize: 10, padding: '2px 8px', outline: 'none', height: 24, width: 120 }}
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
                  theme="dark"
                  triggerHeight={24}
                  placeholder="kein Tag"
                />
              )}

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
                height="calc(100vh - 160px)"
                showLineNumbers={false}
                showCharCount={false}
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

// ── Vertical Tab with color picker (for tags) ──────────────────────────────
function VerticalTabWithColor({ label, count, active, color, onClick, onColorChange, onDelete, isCustom }: {
  label: string; count: number; active: boolean; color: string;
  onClick: () => void; onColorChange: (color: string) => void;
  onDelete?: () => void; isCustom?: boolean;
}) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ position: 'relative', width: 56, flexShrink: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <input
        ref={colorInputRef}
        type="color"
        value={color}
        onChange={(e) => onColorChange(e.target.value)}
        style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', width: 0, height: 0, top: 0, left: 0 }}
      />
      <button
        onClick={onClick}
        title={`${label} — Doppelklick auf Punkt: Farbe ändern`}
        style={{
          width: 56, minHeight: 72, background: active ? `${color}18` : 'transparent',
          border: 'none', borderRight: `3px solid ${active ? color : 'transparent'}`,
          cursor: 'pointer', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '14px 0', transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
      >
        <div
          onDoubleClick={(e) => { e.stopPropagation(); colorInputRef.current?.click(); }}
          title="Doppelklick: Farbe ändern"
          style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }}
        />
        <span style={{
          fontSize: 11, color: active ? color : '#aaa', fontFamily: fontMono,
          writingMode: 'vertical-rl', textOrientation: 'mixed',
          transform: 'rotate(180deg)', letterSpacing: '0.06em',
          lineHeight: 1, maxHeight: 52, overflow: 'hidden',
        }}>
          {label}
        </span>
        <span style={{ fontSize: 9, color: active ? `${color}cc` : '#666', fontFamily: fontMono, lineHeight: 1 }}>
          {count}
        </span>
      </button>
      {/* Delete button for custom tags */}
      {isCustom && onDelete && hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Custom Tag löschen"
          style={{
            position: 'absolute', top: 3, right: 3,
            background: 'rgba(20,20,20,0.9)', border: 'none',
            borderRadius: 3, color: '#e07070', cursor: 'pointer',
            fontSize: 8, padding: '1px 3px', lineHeight: 1,
          }}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      )}
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
        width: 56,
        minHeight: 72,
        background: active ? `${color}18` : 'transparent',
        border: 'none',
        borderRight: `3px solid ${active ? color : 'transparent'}`,
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
      <FontAwesomeIcon icon={icon} style={{ fontSize: 11, color: active ? color : '#666' }} />
      <span style={{
        fontSize: 11,
        color: active ? color : '#aaa',
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
      <span style={{ fontSize: 9, color: active ? `${color}cc` : '#666', fontFamily: fontMono, lineHeight: 1 }}>
        {count}
      </span>
    </button>
  );
}
