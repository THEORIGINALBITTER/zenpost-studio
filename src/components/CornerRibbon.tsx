import { useState, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faNoteSticky,
  faPlus,
  faArrowRightToBracket,
  faSpinner,
  faCheck,
  faCloudArrowUp,
  faSearch,
  faXmark,
  faArrowUpRightFromSquare,
} from '@fortawesome/free-solid-svg-icons';
import { loadZenStudioSettings } from '../services/zenStudioSettingsService';
import {
  listCloudDocuments,
  uploadCloudDocument,
  downloadCloudDocumentText,
} from '../services/cloudStorageService';

const ZEN_NOTE_MIME = 'text/zennote';
const gold = '#AC8E66';
const fontMono = 'IBM Plex Mono, monospace';

interface QuickNote {
  id: number;
  title: string;
}

export function CornerRibbon() {
  const [open, setOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [quickText, setQuickText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [search, setSearch] = useState('');
  const [inserting, setInserting] = useState<number | null>(null);
  const [insertedId, setInsertedId] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const settings = loadZenStudioSettings();
  const isLoggedIn = !!settings.cloudAuthToken && !!settings.cloudProjectId;

  // ── Load recent notes ──────────────────────────────────────────────────────
  const loadNotes = useCallback(async () => {
    if (!settings.cloudProjectId) return;
    setLoadingNotes(true);
    const docs = await listCloudDocuments(settings.cloudProjectId);
    if (docs) {
      setNotes(
        docs
          .filter((d) => d.mimeType === ZEN_NOTE_MIME || d.fileName.endsWith('.zennote'))
          .slice(0, 20)
          .map((d) => ({ id: d.id, title: d.fileName.replace(/(__[a-z]+)?\.zennote$/, '') }))
      );
    }
    setLoadingNotes(false);
  }, [settings.cloudProjectId]);

  useEffect(() => {
    if (open && isLoggedIn) void loadNotes();
  }, [open, isLoggedIn, loadNotes]);

  // ── Close on outside click ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── Save quick note ────────────────────────────────────────────────────────
  const saveQuickNote = async () => {
    if (!quickText.trim() || !isLoggedIn) return;
    setSaving(true);
    const title = `Quick ${new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
    const blob = new Blob([quickText], { type: ZEN_NOTE_MIME });
    const file = new File([blob], `${title}.zennote`, { type: ZEN_NOTE_MIME });
    const result = await uploadCloudDocument(file);
    setSaving(false);
    if (result) {
      setSaveOk(true);
      setQuickText('');
      setNotes((prev) => [{ id: result.id, title }, ...prev]);
      setTimeout(() => setSaveOk(false), 2000);
    }
  };

  // ── Insert note into editor ────────────────────────────────────────────────
  const insertNote = async (note: QuickNote) => {
    setInserting(note.id);
    const content = await downloadCloudDocumentText(note.id);
    if (content) {
      window.dispatchEvent(new CustomEvent('zenpost:insert-snippet', { detail: { content } }));
    }
    setInserting(null);
    setInsertedId(note.id);
    setTimeout(() => setInsertedId(null), 2000);
  };

  const filtered = notes.filter((n) =>
    !search || n.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      ref={panelRef}
      style={{ position: 'fixed', top: 100, right: 0, zIndex: 9999 }}
    >
      {/* ── Quick Panel ─────────────────────────────────────────────────── */}
      {open && (
        <div
          onMouseDown={(e) => {
            // Prevent stealing focus from editor — except when clicking the quick-note textarea
            if ((e.target as HTMLElement).tagName !== 'TEXTAREA') e.preventDefault();
          }}
          style={{
          position: 'absolute',
          top: '110%',
          right: 0,
          width: 300,
          background: '#1a1a1a',
          border: `1px solid ${gold}60`,
          borderRadius: '10px 0 0 10px',
          boxShadow: '-8px 3px 32px rgba(0,0,0,0.5)',
          fontFamily: fontMono,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: gold, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <FontAwesomeIcon icon={faNoteSticky} style={{ marginRight: 6 }} />
              ZenNote Quick
            </span>
            <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 12 }}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>

          {!isLoggedIn ? (
            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ color: '#d0cbb8', fontSize: 10, textAlign: 'center', lineHeight: 1.7, fontFamily: fontMono }}>
                ZenNote benötigt einen<br />ZenPost Cloud Account
              </div>
              <button
                className="zen-gold-btn"
                onClick={() => {
                  setOpen(false);
                  window.dispatchEvent(new CustomEvent('zenpost:open-settings', { detail: { tab: 'cloud' } }));
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px' }}
              >
                <FontAwesomeIcon icon={faArrowRightToBracket} style={{ fontSize: 10 }} />
                Anmelden
              </button>
            </div>
          ) : (
            <>
              {/* Quick textarea */}
              <div style={{ padding: '10px 12px 8px' }}>
                <textarea
                  ref={textareaRef}
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  placeholder="Schnelle Notiz oder Code-Snippet…"
                  rows={4}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault();
                      void saveQuickNote();
                    }
                  }}
                  style={{
                    width: '100%', background: '#1a1a1a', border: `1px solid #2a2a2a`,
                    borderRadius: 6, color: '#d4cfbf', fontFamily: fontMono, fontSize: 11,
                    lineHeight: 1.7, padding: '8px 10px', outline: 'none', resize: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span style={{ fontSize: 9, color: '#67ad6f' }}>⌘+ Enter zum Speichern</span>
                  <button
                    onClick={() => { void saveQuickNote(); }}
                    disabled={saving || !quickText.trim()}
                    style={{
                      background: quickText.trim() ? `${gold}18` : 'transparent',
                      border: `1px solid ${quickText.trim() ? gold : '#333'}`,
                      borderRadius: 5, color: saveOk ? '#4caf50' : quickText.trim() ? gold : '#444',
                      cursor: quickText.trim() ? 'pointer' : 'default',
                      padding: '3px 10px', fontSize: 10, fontFamily: fontMono,
                    }}
                  >
                    {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : saveOk ? <><FontAwesomeIcon icon={faCheck} style={{ marginRight: 4 }} />Gespeichert</> : <><FontAwesomeIcon icon={faCloudArrowUp} style={{ marginRight: 4 }} />Speichern</>}
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid #1e1e1e', margin: '2px 0' }} />

              {/* Search */}
              <div style={{ padding: '6px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 5, padding: '3px 8px' }}>
                  <FontAwesomeIcon icon={faSearch} style={{ fontSize: 9, color: '#555' }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Notiz suchen…"
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#ccc', fontFamily: fontMono, fontSize: 9 }}
                  />
                </div>
              </div>

              {/* Recent notes */}
              <div style={{ maxHeight: 180, overflowY: 'auto', borderTop: '1px solid #1a1a1a' }}>
                {loadingNotes && (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#555', fontSize: 10 }}>
                    <FontAwesomeIcon icon={faSpinner} spin />
                  </div>
                )}
                {!loadingNotes && filtered.length === 0 && (
                  <div style={{ padding: '12px 14px', color: '#444', fontSize: 9, textAlign: 'center' }}>
                    {notes.length === 0 ? 'Noch keine Notizen' : 'Keine Treffer'}
                  </div>
                )}
                {!loadingNotes && filtered.map((note) => {
                  const isIns = inserting === note.id;
                  const isOk = insertedId === note.id;
                  return (
                    <div key={note.id} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #1a1a1a' }}>
                      <div style={{ flex: 1, padding: '7px 12px', fontSize: 10, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <FontAwesomeIcon icon={faNoteSticky} style={{ marginRight: 6, color: '#444', fontSize: 9 }} />
                        {note.title}
                      </div>
                      <button
                        onClick={() => { void insertNote(note); }}
                        disabled={isIns}
                        title="In Editor einfügen"
                        style={{
                          background: isOk ? 'rgba(76,175,80,0.1)' : 'transparent',
                          border: 'none', borderLeft: '1px solid #1a1a1a',
                          color: isOk ? '#4caf50' : '#999',
                          cursor: 'pointer', padding: '0 12px', alignSelf: 'stretch', fontSize: 11,
                        }}
                        onMouseEnter={(e) => { if (!isOk) (e.currentTarget as HTMLButtonElement).style.color = gold; }}
                        onMouseLeave={(e) => { if (!isOk) (e.currentTarget as HTMLButtonElement).style.color = '#555'; }}
                      >
                        {isIns ? <FontAwesomeIcon icon={faSpinner} spin /> : isOk ? <FontAwesomeIcon icon={faCheck} /> : <FontAwesomeIcon icon={faArrowRightToBracket} />}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div style={{ padding: '6px 12px', borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => {
                    setOpen(false);
                    window.dispatchEvent(new CustomEvent('zenpost:navigate', { detail: { screen: 'zen-note' } }));
                  }}
                  style={{ background: 'transparent', border: `1px solid #2a2a2a`, borderRadius: 4, color: '#888', cursor: 'pointer', padding: '2px 8px', fontSize: 9, fontFamily: fontMono, display: 'flex', alignItems: 'center', gap: 4 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = gold; (e.currentTarget as HTMLButtonElement).style.borderColor = `${gold}60`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#888'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a2a'; }}
                >
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} style={{ fontSize: 8 }} />ZenNote Studio
                </button>
                <button
                  onClick={() => { setQuickText(''); setTimeout(() => textareaRef.current?.focus(), 50); }}
                  style={{ background: 'transparent', border: `1px solid #2a2a2a`, borderRadius: 4, color: '#AC8E66', cursor: 'pointer', padding: '2px 8px', fontSize: 9, fontFamily: fontMono }}
                >
                  <FontAwesomeIcon icon={faPlus} style={{ marginRight: 3 }} />Neue Notiz
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Trigger Badge ────────────────────────────────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onMouseDown={(e) => e.preventDefault()}
        onKeyDown={(e) => { if (e.key === 'Enter') setOpen((v) => !v); }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          transform: isHovered || open ? 'translateX(0)' : 'translateX(185px)',
          width: 200,
          padding: '9px 18px 9px 12px',
          background: open ? gold : '#AC8E66',
          color: '#1a1a1a',
          fontFamily: fontMono,
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.04em',
          borderRadius: '6px 0 0 6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          boxShadow: '-6px 6px 18px rgba(0,0,0,0.1)',
          transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        {/* 禅 Icon */}
        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, fontSize: '16px', lineHeight: 1 }}>
            <FontAwesomeIcon icon={faNoteSticky} />
        </span>
        <span style={{ opacity: isHovered || open ? 1 : 0, transition: 'opacity 0.15s ease', flex: 1, textAlign: 'center' }}>
          ZenNote | Quick
        </span>
       
      </div>
    </div>
  );
}
