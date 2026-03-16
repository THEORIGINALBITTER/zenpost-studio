/**
 * ZenEngine Web Fallback — TypeScript port of all 9 built-in rule groups.
 * Used when running in browser (no Tauri/C++ available).
 * Matches C++ zen_engine.cpp built_in_rules() 1:1.
 */
import type { AnalysisResultV2, MatchV2, SuggestionV2 } from './zenEngineService';

// ─── Word Boundary Helpers ─────────────────────────────────────────────────────

const WORD_CHAR_RE = /[a-zA-ZÄÖÜäöüßÀ-öø-ÿ0-9]/;

function isWordChar(str: string, idx: number): boolean {
  if (idx < 0 || idx >= str.length) return false;
  return WORD_CHAR_RE.test(str[idx]);
}

function findWord(
  text: string,
  pattern: string,
  ruleId: string,
  confidence: number,
  replacement = '',
): MatchV2[] {
  const results: MatchV2[] = [];
  const lower = text.toLowerCase();
  const pat = pattern.toLowerCase();
  let pos = 0;
  while (pos < lower.length) {
    const idx = lower.indexOf(pat, pos);
    if (idx === -1) break;
    const end = idx + pat.length;
    if (!isWordChar(text, idx - 1) && !isWordChar(text, end)) {
      results.push({ rule_id: ruleId, snippet: text.slice(idx, end), start: idx, end, score: confidence, replacement });
    }
    pos = idx + 1;
  }
  return results;
}

function findSubstring(
  text: string,
  pattern: string,
  ruleId: string,
  confidence: number,
  replacement = '',
): MatchV2[] {
  const results: MatchV2[] = [];
  let pos = 0;
  while (pos < text.length) {
    const idx = text.indexOf(pattern, pos);
    if (idx === -1) break;
    const end = idx + pattern.length;
    results.push({ rule_id: ruleId, snippet: text.slice(idx, end), start: idx, end, score: confidence, replacement });
    pos = end;
  }
  return results;
}

function findRegex(
  text: string,
  pattern: string,
  ruleId: string,
  confidence: number,
  replacement = '',
): MatchV2[] {
  const results: MatchV2[] = [];
  try {
    const re = new RegExp(pattern, 'gu');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      results.push({ rule_id: ruleId, snippet: m[0], start: m.index, end: m.index + m[0].length, score: confidence, replacement });
      if (m[0].length === 0) re.lastIndex++;
    }
  } catch { /* invalid regex — skip */ }
  return results;
}

// ─── Suggestion text per rule group ───────────────────────────────────────────

const RULE_SUGGESTIONS: Record<string, string> = {
  passive_voice:        'Aktive Formulierung bevorzugen',
  filler_word:          'Füllwort entfernen',
  weak_word:            'Stärkeres Wort wählen',
  nominal_style:        'Aktiv formulieren (Substantiv → Verb)',
  anglicism:            'Deutschen Ausdruck erwägen',
  bracket_overuse:      'Klammern vereinfachen',
  sentence_too_long:    'Satz zu lang — in kürzere Sätze aufteilen',
  double_space:         'Doppelte Leerzeichen entfernen',
  exclamation_overuse:  'Satzzeichen reduzieren',
  user_rule:            'Eigene Regel',
};

// ─── Built-in rule analysis ────────────────────────────────────────────────────

function runBuiltinRules(text: string): MatchV2[] {
  const m: MatchV2[] = [];

  // ── Passive Voice (word boundary) ──────────────────────────────────────────
  for (const [pattern, conf] of [
    ['wurde', 0.75], ['wurden', 0.75], ['worden', 0.75],
    ['wird', 0.70], ['werden', 0.70],
  ] as [string, number][]) {
    m.push(...findWord(text, pattern, 'passive_voice', conf));
  }

  // ── Füllwörter (word boundary) ─────────────────────────────────────────────
  for (const [pattern, conf] of [
    ['eigentlich', 0.85], ['irgendwie', 0.85], ['sozusagen', 0.85],
    ['gewissermaßen', 0.85], ['übrigens', 0.80], ['bekanntlich', 0.80],
    ['halt', 0.80], ['eben', 0.80], ['quasi', 0.80],
    ['selbstverständlich', 0.75], ['irgendwann', 0.75], ['irgendein', 0.75],
    ['irgendwelch', 0.75], ['natürlich', 0.70], ['ja', 0.65], ['mal', 0.60],
  ] as [string, number][]) {
    m.push(...findWord(text, pattern, 'filler_word', conf));
  }

  // ── Schwache Intensivierungen (word boundary) ──────────────────────────────
  for (const [pattern, conf] of [
    ['sehr', 0.70], ['wirklich', 0.70],
    ['tatsächlich', 0.65], ['ziemlich', 0.65],
    ['einfach', 0.60], ['grundsätzlich', 0.60],
    ['prinzipiell', 0.60], ['relativ', 0.60],
  ] as [string, number][]) {
    m.push(...findWord(text, pattern, 'weak_word', conf));
  }

  // ── Nominalstil (word boundary) ────────────────────────────────────────────
  for (const [pattern, conf] of [
    ['Durchführung', 0.75], ['Verwendung', 0.75], ['Umsetzung', 0.75],
    ['Bearbeitung', 0.75], ['Erstellung', 0.75], ['Überprüfung', 0.75],
    ['Optimierung', 0.70], ['Verbesserung', 0.70],
    ['Implementierung', 0.70], ['Bereitstellung', 0.70],
  ] as [string, number][]) {
    m.push(...findWord(text, pattern, 'nominal_style', conf));
  }

  // ── Anglizismen (word boundary) ────────────────────────────────────────────
  for (const [pattern, conf] of [
    ['Deadline', 0.70], ['Brainstorming', 0.60], ['Roadmap', 0.60],
    ['Rollout', 0.65], ['Pipeline', 0.65],
    ['Meeting', 0.60], ['Feedback', 0.50], ['Workflow', 0.55],
  ] as [string, number][]) {
    m.push(...findWord(text, pattern, 'anglicism', conf));
  }

  // ── Klammern-Missbrauch (regex) ────────────────────────────────────────────
  m.push(...findRegex(text, '\\([^)]{40,}\\)', 'bracket_overuse', 0.75));
  m.push(...findRegex(text, '\\([^)]+\\)[^.!?\\n]{0,30}\\([^)]+\\)', 'bracket_overuse', 0.70));

  // ── Zu lange Sätze (regex) ─────────────────────────────────────────────────
  m.push(...findRegex(text, '[A-Za-zÀ-öø-ÿ][^.!?\\n]{180,}[.!?]', 'sentence_too_long', 0.80));

  // ── Doppelte Leerzeichen (substring) ──────────────────────────────────────
  m.push(...findSubstring(text, '  ', 'double_space', 1.00, ' '));

  // ── Ausrufezeichen-Missbrauch (substring) ─────────────────────────────────
  m.push(...findSubstring(text, '!!', 'exclamation_overuse', 0.90, '!'));
  m.push(...findSubstring(text, '!?', 'exclamation_overuse', 0.85, '!'));
  m.push(...findSubstring(text, '?!', 'exclamation_overuse', 0.85, '?'));
  m.push(...findSubstring(text, '??', 'exclamation_overuse', 0.90, '?'));

  return m;
}

// ─── User rules from JSON ──────────────────────────────────────────────────────

interface UserRuleRaw {
  pattern: string;
  suggestion?: string;
  confidence?: number;
  replacements?: string[];
  is_regex?: boolean;
}

function runUserRules(text: string, rulesJson: string): MatchV2[] {
  const results: MatchV2[] = [];
  try {
    const rules = JSON.parse(rulesJson) as UserRuleRaw[];
    if (!Array.isArray(rules)) return results;
    for (const rule of rules) {
      if (!rule.pattern) continue;
      const conf = rule.confidence ?? 0.80;
      const repl = rule.replacements?.[0] ?? '';
      const matches = rule.is_regex
        ? findRegex(text, rule.pattern, 'user_rule', conf, repl)
        : findSubstring(text, rule.pattern, 'user_rule', conf, repl);
      results.push(...matches);
    }
  } catch { /* invalid JSON */ }
  return results;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function analyzeTextWeb(text: string, rulesJson?: string): AnalysisResultV2 {
  const allMatches: MatchV2[] = [
    ...runBuiltinRules(text),
    ...(rulesJson ? runUserRules(text, rulesJson) : []),
  ];

  allMatches.sort((a, b) => a.start - b.start);

  const matchedIds = new Set(allMatches.map(m => m.rule_id));
  const suggestions: SuggestionV2[] = [];
  for (const ruleId of matchedIds) {
    const maxScore = allMatches
      .filter(m => m.rule_id === ruleId)
      .reduce((max, m) => Math.max(max, m.score), 0);
    suggestions.push({
      rule_id: ruleId,
      text: RULE_SUGGESTIONS[ruleId] ?? ruleId,
      score: maxScore,
    });
  }

  return {
    matches: allMatches,
    suggestions,
    warnings: [],
    match_count: allMatches.length,
  };
}

export function autofixTextWeb(text: string): { text: string; fix_count: number } {
  let result = text;
  let fixCount = 0;

  // double_space
  const before = result.length;
  result = result.replace(/ {2,}/g, ' ');
  if (result.length !== before) fixCount++;

  // exclamation_overuse
  for (const [from, to] of [['!!', '!'], ['!?', '!'], ['?!', '?'], ['??', '?']]) {
    if (result.includes(from)) {
      result = result.split(from).join(to);
      fixCount++;
    }
  }

  return { text: result, fix_count: fixCount };
}
