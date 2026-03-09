import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCode,
  faFileLines,
  faImage,
  faCrop,
  faMagnifyingGlass,
  faBookOpen,
  faBolt,
  faCircleInfo,
} from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { ZenModal } from '../components/ZenModal';
import ZenEngine from '../../../../services/zenEngineService';
import { getUserRules } from '../../../../services/userRulesService';
import { getFeedback, getFeedbackStats, resetFeedback } from '../../../../services/userFeedbackService';

interface ZenEngineAboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BUILT_IN_RULES = [
  { id: 'passive_voice',    label: 'Passive Voice',     count: 5,  desc: 'wird, wurde, wurden, worden, werden' },
  { id: 'filler_word',      label: 'Füllwörter',        count: 8,  desc: 'eigentlich, irgendwie, halt, sozusagen …' },
  { id: 'weak_word',        label: 'Schwache Wörter',   count: 6,  desc: 'sehr, wirklich, natürlich, einfach …' },
  { id: 'nominal_style',    label: 'Nominalstil',       count: 8,  desc: 'Durchführung, Verwendung, Umsetzung …' },
  { id: 'double_space',     label: 'Doppelte Leerzeichen', count: 1, desc: 'Formatierungs-Check' },
  { id: 'exclamation',      label: 'Ausrufezeichen',    count: 1,  desc: 'Mehrfach-!! erkennen' },
];

const CAPABILITIES: Array<{ icon: IconDefinition; label: string; desc: string; detail: string }> = [
  {
    icon: faCode,
    label: 'Markdown → HTML',
    desc: 'cmark-kompatibel via comrak (Rust)',
    detail: 'Wandelt Markdown-Text in sauberes HTML um — vollständig kompatibel zum CommonMark-Standard. Unterstützt GFM-Erweiterungen: Tabellen, Strikethrough, Tasklisten und Autolinks. Läuft via comrak (Rust-Bibliothek) direkt in der nativen Engine — kein JavaScript, kein Browser-DOM.',
  },
  {
    icon: faFileLines,
    label: 'Plain Text Extraktion',
    desc: 'Markdown-Syntax entfernen für AI-Calls',
    detail: 'Entfernt alle Markdown-Syntax-Zeichen (**, __, #, >, ` usw.) und gibt reinen Fließtext zurück. Wird intern für AI-Calls verwendet, damit das Sprachmodell keinen Markup-Ballast verarbeiten muss — spart Tokens und verbessert die Antwortqualität.',
  },
  {
    icon: faImage,
    label: 'Image Processing',
    desc: 'Resize, Convert, Optimize (JPEG/PNG/WebP)',
    detail: 'Verarbeitet Bilder direkt in der C++-Engine: Skalieren (Fit/Fill), Format-Konvertierung zwischen JPEG, PNG und WebP sowie verlustbehaftete Optimierung mit einstellbarer Qualitätsstufe. Alle Operationen laufen lokal — kein Upload, kein Netzwerk.',
  },
  {
    icon: faCrop,
    label: 'Thumbnail Generator',
    desc: 'Plattform-optimierte Dimensionen (8 Plattformen)',
    detail: 'Erstellt automatisch platform-optimierte Thumbnail-Versionen aus dem ersten Bild im Artikel. Unterstützte Plattformen: LinkedIn (1200×627), Twitter/X (1200×675), YouTube (1280×720), Dev.to (1000×420), Medium (1400×936), Reddit (1200×628), GitHub Blog & Discussion (1200×630).',
  },
  {
    icon: faMagnifyingGlass,
    label: 'Rule Engine (C++)',
    desc: 'Substring-Matching, Phase 2: LLVM JIT / Regex',
    detail: 'Analysiert Text mit einem regelbasierten C++17-Engine: erkennt Passiv, Füllwörter, schwache Wörter, Nominalstil, doppelte Leerzeichen und Ausrufezeichen-Overuse. Jedes Match enthält Position, Konfidenz und Ersetzungsvorschläge. Phase 2 plant LLVM JIT-Kompilierung für Regex-Regeln.',
  },
  {
    icon: faBookOpen,
    label: 'User Rules',
    desc: 'Lernfähig — eigene Wörter & Phrases',
    detail: 'Eigene Wörter und Phrasen, die im Editor über „+ Wort / Phrase lernen" hinzugefügt werden, landen als User Rules direkt in der C++-Engine. Die Engine lernt deinen persönlichen Schreibstil: welche Begriffe du meidest, welche Alternativen du bevorzugst — persistent im lokalen Speicher.',
  },
];

export function ZenEngineAboutModal({ isOpen, onClose }: ZenEngineAboutModalProps) {
  const [version, setVersion] = useState<string | null>(null);
  const [feedbackStats, setFeedbackStats] = useState(() => getFeedbackStats(getFeedback()));
  const [hoveredCap, setHoveredCap] = useState<string | null>(null);
  const userRules = getUserRules();

  useEffect(() => {
    if (!isOpen) return;
    ZenEngine.version().then(setVersion).catch(() => setVersion('–'));
    setFeedbackStats(getFeedbackStats(getFeedback()));
  }, [isOpen]);

  const mono: React.CSSProperties = { fontFamily: 'IBM Plex Mono, monospace' };
  const gold = '#AC8E66';
  const dimmed = 'rgba(172,142,102,0.5)';
  const border = 'rgba(172,142,102,0.2)';

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      theme="paper"
      zIndex={20000}
      title="ZenEngine"
      subtitle={
        <span style={{ ...mono, fontSize: 11, color: gold, opacity: 0.8 }}>
          {version ?? '…'}
        </span>
      }
    >
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Tagline */}
        <p style={{ ...mono, fontSize: 11, color: '#555', margin: 0, lineHeight: 1.7, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <FontAwesomeIcon icon={faBolt} style={{ color: gold, fontSize: 12, marginTop: 2, flexShrink: 0 }} />
          <span>
            Native C++17-Engine, eingebettet via Rust FFI in Tauri —
            läuft lokal, kein Netzwerk, kein Overhead.
            Übernimmt Markdown-Rendering, Bildverarbeitung und regelbasierte Textanalyse.
          </span>
        </p>

        {/* Capabilities */}
        <div>
          <p style={{ ...mono, fontSize: 9, color: dimmed, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, margin: '0 0 10px' }}>
            Fähigkeiten
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {CAPABILITIES.map(cap => {
              const isHovered = hoveredCap === cap.label;
              return (
                <div
                  key={cap.label}
                  onMouseEnter={() => setHoveredCap(cap.label)}
                  onMouseLeave={() => setHoveredCap(null)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: `1px solid ${isHovered ? gold : border}`,
                    background: isHovered ? 'rgba(172,142,102,0.09)' : 'rgba(172,142,102,0.04)',
                    transition: 'border-color 0.15s, background 0.15s',
                    cursor: 'default',
                  }}
                >
                  <div style={{ ...mono, fontSize: 10, color: '#333', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <FontAwesomeIcon icon={cap.icon} style={{ color: gold, fontSize: 10, width: 12, flexShrink: 0 }} />
                    {cap.label}
                  </div>
                  <div style={{ ...mono, fontSize: 9, color: isHovered ? '#555' : '#888', lineHeight: 1.6, transition: 'color 0.15s' }}>
                    {isHovered ? cap.detail : cap.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Built-in Rules */}
        <div>
          <p style={{ ...mono, fontSize: 9, color: dimmed, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
            Eingebaute Regeln · {BUILT_IN_RULES.reduce((s, r) => s + r.count, 0)} gesamt
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {BUILT_IN_RULES.map((rule, i) => (
              <div key={rule.id} style={{
                display: 'flex', alignItems: 'baseline', gap: 10,
                padding: '5px 0',
                borderBottom: i < BUILT_IN_RULES.length - 1 ? `1px solid ${border}` : 'none',
              }}>
                <span style={{ ...mono, fontSize: 9, color: gold, minWidth: 24, textAlign: 'right' }}>
                  {rule.count}×
                </span>
                <span style={{ ...mono, fontSize: 10, color: '#333', minWidth: 130 }}>
                  {rule.label}
                </span>
                <span style={{ ...mono, fontSize: 9, color: '#999', flex: 1 }}>
                  {rule.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* User Rules */}
        <div>
          <p style={{ ...mono, fontSize: 9, color: dimmed, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
            Gelernte Regeln · {userRules.length} gesamt
          </p>
          {userRules.length === 0 ? (
            <p style={{ ...mono, fontSize: 10, color: '#bbb', margin: 0 }}>
              Noch keine — klicke im Editor auf „+ Wort / Phrase lernen".
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {userRules.map((rule, i) => (
                <div key={rule.pattern} style={{
                  display: 'flex', alignItems: 'baseline', gap: 10,
                  padding: '5px 0',
                  borderBottom: i < userRules.length - 1 ? `1px solid ${border}` : 'none',
                }}>
                  <span style={{
                    ...mono, fontSize: 10,
                    background: 'rgba(172,142,102,0.12)', color: gold,
                    borderRadius: 4, padding: '1px 6px', border: `1px solid rgba(172,142,102,0.3)`,
                    flexShrink: 0,
                  }}>
                    {rule.pattern}
                  </span>
                  <span style={{ ...mono, fontSize: 9, color: '#888', flex: 1 }}>
                    {rule.suggestion}
                  </span>
                  {rule.replacements.length > 0 && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      {rule.replacements.map(r => (
                        <span key={r} style={{
                          ...mono, fontSize: 9, padding: '0 5px',
                          border: `1px solid ${border}`, borderRadius: 3, color: '#999',
                        }}>
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feedback / Lernstatus */}
        <div>
          <p style={{ ...mono, fontSize: 9, color: dimmed, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
            Lernstatus
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
            {[
              { label: 'Angenommen', value: feedbackStats.totalAccepted },
              { label: 'Ignoriert',  value: feedbackStats.totalIgnored },
              { label: 'Stumm',      value: feedbackStats.suppressed },
            ].map(stat => (
              <div key={stat.label} style={{
                padding: '7px 10px', borderRadius: 6,
                border: `1px solid ${border}`, background: 'rgba(172,142,102,0.04)',
                textAlign: 'center',
              }}>
                <div style={{ ...mono, fontSize: 16, color: gold, fontWeight: 700 }}>{stat.value}</div>
                <div style={{ ...mono, fontSize: 8, color: '#999', marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>
          {feedbackStats.suppressed > 0 && (
            <button
              type="button"
              onClick={() => { resetFeedback(); setFeedbackStats(getFeedbackStats(getFeedback())); }}
              style={{
                ...mono, fontSize: 9, background: 'transparent', border: `1px solid ${border}`,
                borderRadius: 4, color: dimmed, padding: '3px 10px', cursor: 'pointer', width: '100%',
              }}
            >
              Lernhistorie zurücksetzen
            </button>
          )}
        </div>

        {/* Footer note */}
        <p style={{ ...mono, fontSize: 9, color: dimmed, margin: 0, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <FontAwesomeIcon icon={faCircleInfo} style={{ fontSize: 9 }} />
          Phase 2 geplant: LLVM JIT · Regex-Regeln · Sprachmodell-Integration
        </p>
      </div>
    </ZenModal>
  );
}
