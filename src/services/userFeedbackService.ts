/**
 * ZenEngine Feedback — Engine lernt vom Nutzer.
 * Trackt accept/ignore pro Regel+Pattern in localStorage.
 * Suppression: einmal ignoriert und öfter ignoriert als akzeptiert → Hinweis wird ausgeblendet.
 */

const STORAGE_KEY = 'zen_rule_feedback_v1';

export interface PatternFeedback {
  accepted: number;
  ignored:  number;
  lastUpdated: number;
}

/** key: `${ruleId}::${pattern.trim()}` */
export type FeedbackStore = Record<string, PatternFeedback>;

export function getFeedback(): FeedbackStore {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveFeedback(store: FeedbackStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function feedbackKey(ruleId: string, pattern: string): string {
  return `${ruleId}::${pattern.trim()}`;
}

export function recordAccepted(ruleId: string, pattern: string): void {
  const store = getFeedback();
  const key = feedbackKey(ruleId, pattern);
  const f = store[key] ?? { accepted: 0, ignored: 0, lastUpdated: 0 };
  store[key] = { accepted: f.accepted + 1, ignored: f.ignored, lastUpdated: Date.now() };
  saveFeedback(store);
}

export function recordIgnored(ruleId: string, pattern: string): void {
  const store = getFeedback();
  const key = feedbackKey(ruleId, pattern);
  const f = store[key] ?? { accepted: 0, ignored: 0, lastUpdated: 0 };
  store[key] = { accepted: f.accepted, ignored: f.ignored + 1, lastUpdated: Date.now() };
  saveFeedback(store);
}

/** true → Hinweis ausblenden: einmal ignoriert und mehr ignoriert als akzeptiert */
export function isSuppressed(ruleId: string, pattern: string, store: FeedbackStore): boolean {
  const f = store[feedbackKey(ruleId, pattern)];
  if (!f) return false;
  return f.ignored >= 1 && f.ignored > f.accepted;
}

/** Anzahl suppressierter Patterns (für About-Modal) */
export function getSuppressedCount(store: FeedbackStore): number {
  return Object.values(store).filter(f => f.ignored >= 1 && f.ignored > f.accepted).length;
}

/** Gesamtstatistik */
export function getFeedbackStats(store: FeedbackStore): {
  totalAccepted: number;
  totalIgnored: number;
  suppressed: number;
  patterns: number;
} {
  const values = Object.values(store);
  return {
    totalAccepted: values.reduce((s, f) => s + f.accepted, 0),
    totalIgnored:  values.reduce((s, f) => s + f.ignored,  0),
    suppressed:    getSuppressedCount(store),
    patterns:      values.length,
  };
}

export function resetFeedback(): void {
  localStorage.removeItem(STORAGE_KEY);
}
