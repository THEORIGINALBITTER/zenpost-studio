import { useEffect, useRef, useState } from 'react';
import { transformContent } from '../../services/aiService';
import './discussionComposer.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onUsePost: (content: string, platform: 'linkedin' | 'twitter') => void;
}

export function DiscussionComposer({ open, onClose, onUsePost }: Props) {
  const [step, setStep] = useState(1);
  const [comment, setComment] = useState('');
  const [context, setContext] = useState('');
  const [url, setUrl] = useState('');
  const [interpretation, setInterpretation] = useState('');
  const [stance, setStance] = useState('');
  const [format, setFormat] = useState<'reply' | 'linkedin' | 'twitter'>('reply');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const inFlight = useRef(false);
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>('textarea, button')?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const elements = Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea, input, select') ?? []);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    dialog?.addEventListener('keydown', trap);
    return () => { dialog?.removeEventListener('keydown', trap); previous?.focus(); };
  }, [open]);

  async function generate(understand: boolean) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(''); setCopied(false);
    try {
      const result = await transformContent(JSON.stringify(understand ? { comment, context, sourceUrl: url } : { comment, context, sourceUrl: url, interpretation, authorPosition: stance }), {
        platform: format === 'twitter' ? 'twitter' : 'linkedin',
        discussionTask: understand ? 'understand' : format === 'reply' ? 'reply' : 'post',
        targetLanguage: 'deutsch', allowEmoji: false,
      });
      if (!result.success || !result.data) throw new Error(result.error || 'Kein Entwurf erstellt.');
      if (understand) { setInterpretation(result.data); setStep(2); }
      else { setDraft(result.data); setStep(4); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Erstellung fehlgeschlagen.'); }
    finally { inFlight.current = false; setBusy(false); }
  }

  if (!open) return null;
  return <div className="zen-discussion-backdrop">
    <section ref={dialogRef} className="zen-discussion" role="dialog" aria-modal="true" aria-labelledby="discussion-title">
      <header><h2 id="discussion-title">Auf eine Diskussion reagieren</h2><button disabled={busy} onClick={onClose} aria-label="Diskussion schließen">Schließen</button></header>
      <p>Schritt {step}/4 · {['Kommentar und Kontext', 'Einwand verstehen', 'Eigene Haltung', 'Entwurf prüfen'][step - 1]}</p>
      {step === 1 && <>
        <label>Fremder Kommentar oder Gegenposition<textarea disabled={busy} value={comment} onChange={e => setComment(e.target.value)} /></label>
        <label>Kontext: Worauf bezieht sich der Kommentar? (optional)<textarea disabled={busy} value={context} onChange={e => setContext(e.target.value)} /></label>
        <label>Quellenlink (optional, wird nicht automatisch gelesen)<input disabled={busy} type="url" value={url} onChange={e => setUrl(e.target.value)} /></label>
        <button disabled={busy || !comment.trim()} onClick={() => void generate(true)}>Einwand verstehen</button>
      </>}
      {step === 2 && <>
        <p>Dies ist eine KI-Einordnung. Prüfe und korrigiere sie, bevor du weitergehst.</p>
        <label>So verstehe ich den Einwand<textarea disabled={busy} value={interpretation} onChange={e => setInterpretation(e.target.value)} /></label>
        <button disabled={!interpretation.trim()} onClick={() => setStep(3)}>Einordnung übernehmen</button>
      </>}
      {step === 3 && <>
        <label>Was ist deine Haltung? Wo stimmst du zu, wo widersprichst du und warum?<textarea disabled={busy} value={stance} onChange={e => setStance(e.target.value)} /></label>
        <label>Was möchtest du erstellen?<select disabled={busy} value={format} onChange={e => setFormat(e.target.value as typeof format)}>
          <option value="reply">Antwortkommentar zum Kopieren</option><option value="linkedin">Eigener LinkedIn-Beitrag</option><option value="twitter">Eigener X-Beitrag</option>
        </select></label>
        <button disabled={busy || !stance.trim()} onClick={() => void generate(false)}>Entwurf erstellen</button>
      </>}
      {step === 4 && <>
        <label>{format === 'reply' ? 'Deine Antwort' : 'Dein eigener Beitrag'}<textarea disabled={busy} value={draft} onChange={e => { setDraft(e.target.value); setCopied(false); }} /></label>
        <p>{format === 'reply' ? 'Kopiere die Antwort und füge sie selbst in der ursprünglichen Diskussion ein.' : 'Übernimm den Entwurf in den Editor. Dort kannst du ihn prüfen und über Export veröffentlichen.'}</p>
        <button disabled={!draft.trim()} onClick={async () => { try { await navigator.clipboard.writeText(draft); setCopied(true); } catch { setError('Kopieren fehlgeschlagen. Bitte den Text manuell markieren und kopieren.'); } }}>{copied ? 'Kopiert' : 'Entwurf kopieren'}</button>
        {format !== 'reply' && <button disabled={!draft.trim()} onClick={() => { onUsePost(draft, format); onClose(); }}>Als neuen Beitrag im Editor öffnen</button>}
      </>}
      {busy && <p role="status">Wird erstellt …</p>}
      {error && <p role="alert">{error}</p>}
      {step > 1 && <button disabled={busy} onClick={() => { setError(''); setStep(step - 1); }}>Zurück</button>}
    </section>
  </div>;
}
