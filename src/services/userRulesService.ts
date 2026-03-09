/**
 * ZenEngine User Rules — persisted in localStorage.
 * Same Rule structure as the C++ engine: { pattern, suggestion, replacements, confidence }
 * Applied on the TS side via substring matching, merged with C++ engine results.
 */

const STORAGE_KEY = 'zen_user_rules_v1';

export interface UserRule {
  pattern: string;       // word or phrase to match (case-sensitive)
  suggestion: string;    // hint text shown in panel
  replacements: string[]; // optional replacement chips
  confidence: number;    // 0.0–1.0
  createdAt: number;
}

export function getUserRules(): UserRule[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function addUserRule(rule: Omit<UserRule, 'createdAt'>): void {
  const rules = getUserRules().filter(r => r.pattern !== rule.pattern); // dedupe
  rules.push({ ...rule, createdAt: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

export function deleteUserRule(pattern: string): void {
  const rules = getUserRules().filter(r => r.pattern !== pattern);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

/** Apply user rules against text — same substring algorithm as C++ engine */
export interface UserRuleMatch {
  rule_id: string;       // always 'user_rule'
  matched_text: string;
  start: number;
  end: number;
  confidence: number;
  suggestion: string;
  replacements: string[];
  isUserRule: true;
}

export function applyUserRules(text: string, rules: UserRule[]): UserRuleMatch[] {
  const matches: UserRuleMatch[] = [];
  for (const rule of rules) {
    let pos = 0;
    while (true) {
      const idx = text.indexOf(rule.pattern, pos);
      if (idx === -1) break;
      matches.push({
        rule_id: 'user_rule',
        matched_text: rule.pattern,
        start: idx,
        end: idx + rule.pattern.length,
        confidence: rule.confidence,
        suggestion: rule.suggestion,
        replacements: rule.replacements,
        isUserRule: true,
      });
      pos = idx + rule.pattern.length;
    }
  }
  return matches;
}
