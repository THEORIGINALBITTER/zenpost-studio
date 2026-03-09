import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMugHot, faCode, faToggleOn, faToggleOff,
  faTrash, faChartBar, faRotateLeft, faGraduationCap,
} from '@fortawesome/free-solid-svg-icons';
import {
  getEngineProfile, saveEngineProfile, applyStylePreset,
  type ZenEngineProfile, type WritingStyle, type RuleGroupSettings,
} from '../../../../../services/zenEngineProfileService';
import { getUserRules, deleteUserRule } from '../../../../../services/userRulesService';
import { getFeedback, getFeedbackStats, resetFeedback } from '../../../../../services/userFeedbackService';

const mono = 'IBM Plex Mono, monospace';
const gold = '#AC8E66';

const RULE_GROUPS: Array<{ id: keyof RuleGroupSettings; label: string; desc: string }> = [
  { id: 'passive_voice',      label: 'Passive Voice',          desc: 'wird, wurde, wurden, werden …' },
  { id: 'filler_word',        label: 'Füllwörter',             desc: 'eigentlich, halt, irgendwie …' },
  { id: 'weak_word',          label: 'Schwache Wörter',        desc: 'sehr, wirklich, tatsächlich …' },
  { id: 'nominal_style',      label: 'Nominalstil',            desc: 'Durchführung, Verwendung …' },
  { id: 'double_space',       label: 'Doppelte Leerzeichen',   desc: 'Formatierungs-Check' },
  { id: 'exclamation_overuse', label: 'Ausrufezeichen',        desc: '!! Mehrfach-Ausrufezeichen' },
];

const STYLE_OPTIONS: Array<{ id: WritingStyle; label: string; desc: string; icon: typeof faBriefcase }> = [
  { id: 'formal',    label: 'Formal',    desc: 'Alle Regeln aktiv',                    icon: faGraduationCap },
  { id: 'casual',    label: 'Casual',    desc: 'Füllwörter & schwache Wörter toleriert', icon: faMugHot },
  { id: 'technical', label: 'Technical', desc: 'Nominalstil toleriert',                 icon: faCode },
];

export function ZenEngineSettingsContent() {
  const [profile, setProfile] = useState<ZenEngineProfile>(getEngineProfile);
  const [userRules, setUserRules] = useState(getUserRules);
  const [feedbackStats, setFeedbackStats] = useState(() => getFeedbackStats(getFeedback()));

  function updateProfile(next: ZenEngineProfile) {
    setProfile(next);
    saveEngineProfile(next);
  }

  function toggleRuleGroup(id: keyof RuleGroupSettings) {
    const next: ZenEngineProfile = {
      ...profile,
      ruleGroups: { ...profile.ruleGroups, [id]: !profile.ruleGroups[id] },
    };
    updateProfile(next);
  }

  function selectStyle(style: WritingStyle) {
    setProfile(applyStylePreset(style));
  }

  function handleDeleteRule(pattern: string) {
    deleteUserRule(pattern);
    setUserRules(getUserRules());
  }

  function handleResetFeedback() {
    resetFeedback();
    setFeedbackStats(getFeedbackStats(getFeedback()));
  }

  const sectionLabel = (text: string) => (
    <p style={{ fontFamily: mono, fontSize: 9, color: `${gold}99`, textTransform: 'uppercase', letterSpacing: 1.2, margin: '0 0 12px' }}>
      {text}
    </p>
  );

  const divider = () => (
    <div style={{ borderTop: `1px solid rgba(172,142,102,0.2)`, margin: '24px 0' }} />
  );

  return (
    <div className="w-full flex justify-center" style={{ padding: '32px 32px' }}>
      <div className="w-full max-w-[860px] bg-[#E8E1D2] border border-[#AC8E66]/60 shadow-2xl rounded-[10px]" style={{ overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 28px 18px', borderBottom: '1px solid rgba(172,142,102,0.25)', background: 'rgba(172,142,102,0.06)' }}>
          <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: '#222', letterSpacing: 0.3 }}>
            ZenEngine
          </div>
          <div style={{ fontFamily: mono, fontSize: 10, color: '#888', marginTop: 3 }}>
            Regeln · Stil · Lernhistorie
          </div>
        </div>

        <div style={{ padding: '24px 28px' }}>

          {/* ── Schreibstil ── */}
          {sectionLabel('Schreibstil')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 0 }}>
            {STYLE_OPTIONS.map(s => {
              const active = profile.writingStyle === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectStyle(s.id)}
                  style={{
                    fontFamily: mono, fontSize: 10, padding: '10px 12px',
                    borderRadius: 7, cursor: 'pointer', textAlign: 'left',
                    border: active ? `1.5px solid ${gold}` : '1.5px solid rgba(172,142,102,0.25)',
                    background: active ? `rgba(172,142,102,0.12)` : 'transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                    <FontAwesomeIcon icon={s.icon} style={{ color: active ? gold : '#aaa', fontSize: 11 }} />
                    <span style={{ fontWeight: active ? 700 : 400, color: active ? '#333' : '#666' }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize: 9, color: '#999', lineHeight: 1.4 }}>{s.desc}</div>
                </button>
              );
            })}
          </div>

          {divider()}

          {/* ── Regelgruppen ── */}
          {sectionLabel('Regelgruppen')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {RULE_GROUPS.map((rg, i) => {
              const active = profile.ruleGroups[rg.id];
              return (
                <div
                  key={rg.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '7px 10px', borderRadius: 6,
                    background: i % 2 === 0 ? 'rgba(172,142,102,0.04)' : 'transparent',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleRuleGroup(rg.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && toggleRuleGroup(rg.id)}
                >
                  <FontAwesomeIcon
                    icon={active ? faToggleOn : faToggleOff}
                    style={{ color: active ? gold : '#ccc', fontSize: 16, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontFamily: mono, fontSize: 10, color: active ? '#333' : '#aaa', fontWeight: 500 }}>
                      {rg.label}
                    </span>
                    <span style={{ fontFamily: mono, fontSize: 9, color: '#bbb', marginLeft: 10 }}>
                      {rg.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {divider()}

          {/* ── Gelernte Regeln ── */}
          {sectionLabel(`Gelernte Regeln · ${userRules.length} gesamt`)}
          {userRules.length === 0 ? (
            <p style={{ fontFamily: mono, fontSize: 10, color: '#bbb', margin: 0 }}>
              Noch keine — im Editor auf „+ Wort / Phrase lernen" klicken.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {userRules.map((rule, i) => (
                <div key={rule.pattern} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                  borderBottom: i < userRules.length - 1 ? '1px solid rgba(172,142,102,0.15)' : 'none',
                }}>
                  <span style={{
                    fontFamily: mono, fontSize: 10, background: 'rgba(172,142,102,0.12)',
                    color: gold, borderRadius: 4, padding: '1px 7px',
                    border: '1px solid rgba(172,142,102,0.3)', flexShrink: 0,
                  }}>
                    {rule.pattern}
                  </span>
                  <span style={{ fontFamily: mono, fontSize: 9, color: '#888', flex: 1 }}>
                    {rule.suggestion}
                  </span>
                  {rule.replacements.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {rule.replacements.slice(0, 3).map(r => (
                        <span key={r} style={{
                          fontFamily: mono, fontSize: 9, padding: '0 5px',
                          border: '1px solid rgba(172,142,102,0.25)', borderRadius: 3, color: '#999',
                        }}>
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(rule.pattern)}
                    title="Regel löschen"
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: '#ccc', padding: '2px 4px', flexShrink: 0,
                      fontSize: 11,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#e05c5c')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {divider()}

          {/* ── Lernhistorie ── */}
          {sectionLabel('Lernhistorie')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Angenommen', value: feedbackStats.totalAccepted, icon: faChartBar },
              { label: 'Ignoriert',  value: feedbackStats.totalIgnored,  icon: faChartBar },
              { label: 'Stumm',      value: feedbackStats.suppressed,     icon: faChartBar },
              { label: 'Patterns',   value: feedbackStats.patterns,        icon: faChartBar },
            ].map(stat => (
              <div key={stat.label} style={{
                padding: '10px 12px', borderRadius: 7, textAlign: 'center',
                border: '1px solid rgba(172,142,102,0.2)', background: 'rgba(172,142,102,0.04)',
              }}>
                <div style={{ fontFamily: mono, fontSize: 18, color: gold, fontWeight: 700 }}>
                  {stat.value}
                </div>
                <div style={{ fontFamily: mono, fontSize: 8, color: '#999', marginTop: 2 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {feedbackStats.patterns > 0 && (
            <button
              type="button"
              onClick={handleResetFeedback}
              style={{
                fontFamily: mono, fontSize: 9, display: 'flex', alignItems: 'center', gap: 7,
                background: 'transparent', border: '1px solid rgba(172,142,102,0.3)',
                borderRadius: 5, color: `${gold}aa`, padding: '5px 12px', cursor: 'pointer',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = gold; (e.currentTarget as HTMLButtonElement).style.color = gold; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(172,142,102,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = `${gold}aa`; }}
            >
              <FontAwesomeIcon icon={faRotateLeft} style={{ fontSize: 9 }} />
              Lernhistorie zurücksetzen
            </button>
          )}

          {feedbackStats.patterns === 0 && (
            <p style={{ fontFamily: mono, fontSize: 10, color: '#bbb', margin: 0 }}>
              Noch kein Feedback gespeichert — Hinweise annehmen oder ignorieren um zu starten.
            </p>
          )}

        </div>
      </div>
    </div>
  );
}
