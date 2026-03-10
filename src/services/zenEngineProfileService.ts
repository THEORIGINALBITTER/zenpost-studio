/**
 * ZenEngine Profil — Schreibstil + Regelgruppen.
 * Persistiert in localStorage. Wird in ZenBlockEditor.runAnalysis angewendet.
 */

const STORAGE_KEY = 'zen_engine_profile_v1';

export type WritingStyle = 'formal' | 'casual' | 'technical';

export type RuleGroupId =
  | 'passive_voice'
  | 'filler_word'
  | 'weak_word'
  | 'nominal_style'
  | 'double_space'
  | 'exclamation_overuse'
  | 'anglicism'
  | 'bracket_overuse'
  | 'sentence_too_long'
  | 'cliche'
  | 'redundancy'
  | 'word_repetition'
  | 'user_rule';

export interface RuleGroupSettings {
  passive_voice:       boolean;
  filler_word:         boolean;
  weak_word:           boolean;
  nominal_style:       boolean;
  double_space:        boolean;
  exclamation_overuse: boolean;
  anglicism:           boolean;
  bracket_overuse:     boolean;
  sentence_too_long:   boolean;
  cliche:              boolean;
  redundancy:          boolean;
  word_repetition:     boolean;
}

export interface ZenEngineProfile {
  writingStyle: WritingStyle;
  ruleGroups:   RuleGroupSettings;
}

const DEFAULT_PROFILE: ZenEngineProfile = {
  writingStyle: 'formal',
  ruleGroups: {
    passive_voice:       true,
    filler_word:         true,
    weak_word:           true,
    nominal_style:       true,
    double_space:        true,
    exclamation_overuse: true,
    anglicism:           true,
    bracket_overuse:     true,
    sentence_too_long:   true,
    cliche:              true,
    redundancy:          true,
    word_repetition:     true,
  },
};

export function getEngineProfile(): ZenEngineProfile {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return {
      ...DEFAULT_PROFILE,
      ...stored,
      ruleGroups: { ...DEFAULT_PROFILE.ruleGroups, ...(stored.ruleGroups ?? {}) },
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveEngineProfile(profile: ZenEngineProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

/** Stil-Presets: welche Regelgruppen werden für den Stil deaktiviert */
const STYLE_PRESETS: Record<WritingStyle, Partial<RuleGroupSettings>> = {
  formal:    {},
  casual:    { weak_word: false, filler_word: false, cliche: false },
  technical: { nominal_style: false, anglicism: false, cliche: false },
};

/** Preset anwenden — überschreibt ruleGroups, User kann danach noch manuell anpassen */
export function applyStylePreset(style: WritingStyle): ZenEngineProfile {
  const base: RuleGroupSettings = {
    passive_voice: true, filler_word: true, weak_word: true,
    nominal_style: true, double_space: true, exclamation_overuse: true,
    anglicism: true, bracket_overuse: true, sentence_too_long: true,
    cliche: true, redundancy: true, word_repetition: true,
  };
  const profile: ZenEngineProfile = {
    writingStyle: style,
    ruleGroups: { ...base, ...STYLE_PRESETS[style] },
  };
  saveEngineProfile(profile);
  return profile;
}

/** true → Suggestion anzeigen */
export function isRuleGroupActive(ruleId: string, profile: ZenEngineProfile): boolean {
  if (ruleId === 'user_rule') return true; // User Rules immer aktiv
  return (profile.ruleGroups as unknown as Record<string, boolean>)[ruleId] ?? true;
}
