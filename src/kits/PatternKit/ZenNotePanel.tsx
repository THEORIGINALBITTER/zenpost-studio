/**
 * ZenNotePanel — kompaktes floating Panel für ZenNote Studio
 * Erscheint im ZenMarkdownEditor und ermöglicht direktes Einfügen von Notizen.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faFileLines,
  faNoteSticky,
  faSpinner,
  faArrowRightToBracket,
  faXmark,
  faTag,
  faFolder,
  faArrowsRotate,
} from '@fortawesome/free-solid-svg-icons';
import { loadZenStudioSettings } from '../../services/zenStudioSettingsService';
import {
  listCloudDocuments,
  downloadCloudDocumentText,
} from '../../services/cloudStorageService';

const ZEN_NOTE_MIME = 'text/zennote';
const KNOWN_TAGS = ['js', 'ts', 'php', 'css', 'html', 'sql', 'bash', 'py', 'markdown', 'text'];

function loadCustomTags(): string[] {
  try {
    const raw = localStorage.getItem('zenpost_zennote_custom_tags');
    if (raw) return JSON.parse(raw) as string[];
  } catch { /* ignore */ }
  return [];
}

function loadTagColors(): Record<string, string> {
  try {
    const raw = localStorage.getItem('zenpost_zennote_tag_colors');
    if (raw) return JSON.parse(raw) as Record<string, string>;
  } catch { /* ignore */ }
  return {};
}

interface PanelNote {
  id: number;
  title: string;
  tag: string;
  folder: string;
}

const gold = '#AC8E66';
const fontMono = 'IBM Plex Mono, monospace';
const border = '#2A2A2A';
const textPrimary = '#E7CCAA';

const BASE_TAG_COLORS: Record<string, string> = {
  js: '#f0db4f', ts: '#007acc', php: '#787cb5', css: '#264de4',
  html: '#e34c26', sql: '#cc2927', bash: '#4eaa25', py: '#3776ab',
  markdown: '#6a9fb5', text: '#888',
};

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
  const allTags = [...KNOWN_TAGS, ...loadCustomTags()];
  if (maybeTag && (/^[a-zA-Z0-9_-]+$/.test(maybeTag) || allTags.includes(maybeTag))) {
    return { title: rest.slice(0, sep), tag: maybeTag, folder };
  }
  return { title: rest, tag: '', folder };
}

interface ZenNotePanelProps {
  onClose: () => void;
}

export function ZenNotePanel({ onClose }: ZenNotePanelProps) {
  const [notes, setNotes] = useState<PanelNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [folderFilter, setFolderFilter] = useState('');
  const [inserting, setInserting] = useState<number | null>(null);
  const [insertedId, setInsertedId] = useState<number | null>(null);
  const [previewNote, setPreviewNote] = useState<{ id: number; content: string | null } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tagColors = loadTagColors();
  const getTagColor = (tag: string) => tagColors[tag] ?? BASE_TAG_COLORS[tag] ?? '#888';

  const settings = loadZenStudioSettings();
  const isLoggedIn = !!settings.cloudAuthToken && !!settings.cloudProjectId;

  const load = useCallback(async () => {
    setLoading(true);
    if (!settings.cloudProjectId) { setLoading(false); return; }
    const docs = await listCloudDocuments(settings.cloudProjectId);
    if (!docs) { setLoading(false); return; }
    const zenNotes = docs
      .filter((d) => d.mimeType === ZEN_NOTE_MIME || d.fileName.endsWith('.zennote'))
      .map((d) => {
        const { title, tag, folder } = parseFileName(d.fileName);
        return { id: d.id, title, tag, folder };
      });
    setNotes(zenNotes);
    setLoading(false);
  }, [settings.cloudProjectId]);

  useEffect(() => { void load(); }, [load]);

  const usedTags = Array.from(new Set(notes.map((n) => n.tag).filter(Boolean))).sort();
  const usedFolders = Array.from(new Set(notes.map((n) => n.folder).filter(Boolean))).sort();

  const filtered = notes.filter((n) => {
    const matchTag = !tagFilter || n.tag === tagFilter;
    const matchFolder = !folderFilter || n.folder === folderFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || n.title.toLowerCase().includes(q);
    return matchTag && matchFolder && matchSearch;
  });

  const hasActiveFilter = !!(tagFilter || folderFilter || search);

  const insertNote = async (note: PanelNote) => {
    setInserting(note.id);
    const content = await downloadCloudDocumentText(note.id);
    if (content) {
      window.dispatchEvent(new CustomEvent('zenpost:insert-snippet', {
        detail: { content },
      }));
    }
    setInserting(null);
    setInsertedId(note.id);
    setTimeout(() => setInsertedId(null), 2000);
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: 280,
      background: '#111',
      borderLeft: `1px solid ${border}`,
      borderRadius: '0 10px 10px 0',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 40,
      boxShadow: '-6px 0 24px rgba(0,0,0,0.4)',
      fontFamily: fontMono,
    }}>

      {/* Header */}
      <div style={{ padding: '10px 12px 8px', borderBottom: `1px solid #1e1e1e`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FontAwesomeIcon icon={faNoteSticky} style={{ fontSize: 11, color: gold }} />
          <span style={{ fontSize: 10, color: gold, letterSpacing: '0.07em', textTransform: 'uppercase' }}>ZenNote</span>
          {hasActiveFilter && (
            <button
              onClick={() => { setTagFilter(''); setFolderFilter(''); setSearch(''); }}
              title="Filter zurücksetzen"
              style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: 9, padding: '1px 4px', marginLeft: 2 }}
            >
              <FontAwesomeIcon icon={faXmark} style={{ marginRight: 2 }} />alle
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => { void load(); }}
            disabled={loading}
            style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 11, padding: '2px 4px' }}
            title="Notizen neu laden"
          >
            <FontAwesomeIcon icon={faArrowsRotate} spin={loading} />
          </button>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 13, padding: '2px 4px' }}
            title="Panel schließen"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 10px', borderBottom: `1px solid #1e1e1e`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#1a1a1a', border: `1px solid ${border}`, borderRadius: 6, padding: '4px 8px' }}>
          <FontAwesomeIcon icon={faSearch} style={{ fontSize: 9, color: '#555' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen…"
            autoFocus
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#d4cfbf', fontFamily: fontMono, fontSize: 10 }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 9, padding: 0 }}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
        </div>
      </div>

      {/* Folder filter chips */}
      {usedFolders.length > 0 && (
        <div style={{ padding: '6px 10px', borderBottom: `1px solid #1e1e1e`, display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
          {usedFolders.map((f) => {
            const active = folderFilter === f;
            return (
              <button
                key={f}
                onClick={() => setFolderFilter(active ? '' : f)}
                style={{
                  background: active ? `${gold}20` : 'transparent',
                  border: `1px solid ${active ? gold : '#333'}`,
                  borderRadius: 4, color: active ? gold : '#666',
                  fontFamily: fontMono, fontSize: 9, padding: '2px 7px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <FontAwesomeIcon icon={faFolder} style={{ fontSize: 8 }} />
                {f}
              </button>
            );
          })}
        </div>
      )}

      {/* Tag filter chips */}
      {usedTags.length > 0 && (
        <div style={{ padding: '5px 10px', borderBottom: `1px solid #1e1e1e`, display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
          {usedTags.map((t) => {
            const color = getTagColor(t);
            const active = tagFilter === t;
            return (
              <button
                key={t}
                onClick={() => setTagFilter(active ? '' : t)}
                style={{
                  background: active ? `${color}20` : 'transparent',
                  border: `1px solid ${active ? color : '#333'}`,
                  borderRadius: 4, color: active ? color : '#555',
                  fontFamily: fontMono, fontSize: 9, padding: '2px 7px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <FontAwesomeIcon icon={faTag} style={{ fontSize: 8 }} />
                {t}
              </button>
            );
          })}
        </div>
      )}

      {/* Note list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!isLoggedIn && (
          <div style={{ padding: '20px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ color: '#555', fontSize: 10, textAlign: 'center', lineHeight: 1.6, fontFamily: 'IBM Plex Mono, monospace' }}>
              ZenNote benötigt einen<br />ZenCloud Account
            </div>
            <button
              className="zen-gold-btn"
              onClick={() => window.dispatchEvent(new CustomEvent('zenpost:open-settings', { detail: { tab: 'cloud' } }))}
            >
              Anmelden
            </button>
          </div>
        )}
        {isLoggedIn && loading && (
          <div style={{ padding: '20px', color: '#555', fontSize: 11, textAlign: 'center' }}>
            <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 6 }} />
          </div>
        )}
        {isLoggedIn && !loading && filtered.length === 0 && (
          <div style={{ padding: '24px 12px', color: '#444', fontSize: 10, textAlign: 'center', lineHeight: 1.7 }}>
            <FontAwesomeIcon icon={faNoteSticky} style={{ display: 'block', margin: '0 auto 8px', fontSize: 20, color: '#222' }} />
            {notes.length === 0 ? 'Noch keine Notizen' : 'Keine Treffer'}
          </div>
        )}
        {isLoggedIn && filtered.map((note) => {
          const isInserting = inserting === note.id;
          const isInserted = insertedId === note.id;
          const tagColor = note.tag ? getTagColor(note.tag) : undefined;
          const isPreviewOpen = previewNote?.id === note.id;
          return (
            <div
              key={note.id}
              style={{ borderBottom: `1px solid #1a1a1a`, display: 'flex', alignItems: 'center', position: 'relative' }}
              onMouseEnter={() => {
                if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
                previewTimerRef.current = setTimeout(async () => {
                  setPreviewLoading(true);
                  setPreviewNote({ id: note.id, content: null });
                  const content = await downloadCloudDocumentText(note.id);
                  setPreviewNote({ id: note.id, content });
                  setPreviewLoading(false);
                }, 400);
              }}
              onMouseLeave={() => {
                if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
                setPreviewNote(null);
              }}
            >
              {/* Preview Popup */}
              {isPreviewOpen && (
                <div style={{
                  position: 'absolute', right: '100%', top: 0, width: 240,
                  background: '#1a1a1a', border: `1px solid ${gold}40`,
                  borderRadius: 8, padding: '10px 12px', zIndex: 100,
                  boxShadow: '-6px 4px 24px rgba(0,0,0,0.6)',
                  pointerEvents: 'none',
                }}>
                  <div style={{ fontSize: 9, color: gold, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Vorschau</div>
                  {previewLoading ? (
                    <FontAwesomeIcon icon={faSpinner} spin style={{ color: '#555', fontSize: 11 }} />
                  ) : (
                    <div style={{ fontSize: 10, color: '#aaa', fontFamily: fontMono, lineHeight: 1.6, maxHeight: 160, overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {(previewNote?.content ?? '').slice(0, 300) || '(leer)'}
                      {(previewNote?.content ?? '').length > 300 && <span style={{ color: '#555' }}> …</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Note info */}
              <div style={{ flex: 1, padding: '8px 8px 8px 12px', minWidth: 0 }}>
                <div style={{ fontSize: 10, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                  <FontAwesomeIcon icon={faFileLines} style={{ marginRight: 5, color: '#555', fontSize: 9 }} />
                  {note.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  {note.folder && (
                    <span style={{ fontSize: 9, color: gold, background: `${gold}15`, border: `1px solid ${gold}35`, borderRadius: 3, padding: '0 4px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <FontAwesomeIcon icon={faFolder} style={{ fontSize: 7 }} />
                      {note.folder}
                    </span>
                  )}
                  {note.tag && tagColor && (
                    <span style={{ fontSize: 9, color: tagColor, background: `${tagColor}20`, border: `1px solid ${tagColor}40`, borderRadius: 3, padding: '0 4px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <FontAwesomeIcon icon={faTag} style={{ fontSize: 7 }} />
                      {note.tag}
                    </span>
                  )}
                </div>
              </div>

              {/* Insert button */}
              <button
                onClick={() => { void insertNote(note); }}
                disabled={isInserting}
                title="In Editor einfügen"
                style={{
                  background: isInserted ? 'rgba(76,175,80,0.1)' : 'transparent',
                  border: 'none', borderLeft: `1px solid #1e1e1e`,
                  color: isInserted ? '#4caf50' : '#555',
                  cursor: 'pointer', padding: '0 12px', alignSelf: 'stretch',
                  fontSize: 11, transition: 'color 0.2s', flexShrink: 0,
                }}
                onMouseEnter={(e) => { if (!isInserted) (e.currentTarget as HTMLButtonElement).style.color = gold; }}
                onMouseLeave={(e) => { if (!isInserted) (e.currentTarget as HTMLButtonElement).style.color = '#555'; }}
              >
                {isInserting ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faArrowRightToBracket} />}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div style={{ padding: '6px 12px', borderTop: `1px solid #1a1a1a`, fontSize: 9, color: '#333', textAlign: 'center', flexShrink: 0 }}>
        <FontAwesomeIcon icon={faArrowRightToBracket} style={{ margin: '0 3px' }} /> = in Editor einfügen
      </div>
    </div>
  );
}
