/**
 * ZenEngine Rule Stats — verfolgt wie oft welche Regelgruppe anschlägt.
 * Kumulativ + Zeitstempel, persistiert in localStorage.
 */

const STORAGE_KEY = 'zen_rule_stats_v1';

export interface RuleGroupStat {
  hits:     number;   // Gesamt-Treffer seit Reset
  lastSeen: number;   // Timestamp (ms) des letzten Treffers
  sessions: number;   // Wie viele Analyse-Läufe haben diese Regel gesehen
}

export type RuleStatsStore = Record<string, RuleGroupStat>;

export function getRuleStats(): RuleStatsStore {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveRuleStats(store: RuleStatsStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/**
 * Zeichnet einen Analyse-Lauf auf.
 * hitMap: { ruleId → Anzahl Treffer in diesem Lauf }
 */
export function recordAnalysisRun(hitMap: Record<string, number>): void {
  if (Object.keys(hitMap).length === 0) return;
  const store = getRuleStats();
  const now = Date.now();
  for (const [ruleId, count] of Object.entries(hitMap)) {
    if (count === 0) continue;
    const prev = store[ruleId] ?? { hits: 0, lastSeen: 0, sessions: 0 };
    store[ruleId] = {
      hits:     prev.hits + count,
      lastSeen: now,
      sessions: prev.sessions + 1,
    };
  }
  saveRuleStats(store);
}

export function resetRuleStats(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Gibt Gesamttreffer über alle Gruppen zurück */
export function getTotalHits(store: RuleStatsStore): number {
  return Object.values(store).reduce((sum, s) => sum + s.hits, 0);
}

/** Formatiert lastSeen als "vor X Tagen / Stunden / Minuten" */
export function formatLastSeen(ts: number): string {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  const min  = Math.floor(diff / 60_000);
  const h    = Math.floor(diff / 3_600_000);
  const d    = Math.floor(diff / 86_400_000);
  if (d > 0)  return `vor ${d} Tag${d !== 1 ? 'en' : ''}`;
  if (h > 0)  return `vor ${h} Std.`;
  if (min > 0) return `vor ${min} Min.`;
  return 'gerade eben';
}
