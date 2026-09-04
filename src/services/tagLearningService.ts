/**
 * Tag Learning — lernt, welche Tags der Nutzer zu welchen Content-Keywords
 * vergibt, und schlägt sie beim nächsten ähnlichen Post vor.
 *
 * Deterministisch (Häufigkeits-/Ko-Vorkommen-Zählung), kein LLM-Call nötig —
 * derselbe Ansatz wie userFeedbackService (Accept/Ignore lernen), nur für
 * Wort→Tag-Assoziationen statt Regel-Akzeptanz. Erster Baustein des im
 * Konzeptpapier beschriebenen portablen Stimm-/Kategorisierungsprofils.
 */

const STORAGE_KEY = 'zen_tag_learning_v1';

/** key: keyword (lowercase) → value: Record<tag, count> */
export type TagLearningStore = Record<string, Record<string, number>>;

function getStore(): TagLearningStore {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveStore(store: TagLearningStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

/**
 * Beim Speichern eines Posts aufrufen: merkt sich, dass diese Keywords
 * zusammen mit diesen Tags vorkamen — für jedes Keyword×Tag-Paar wird ein
 * Zähler erhöht.
 */
export function recordTagAssociation(keywords: string[], tags: string[]): void {
  if (keywords.length === 0 || tags.length === 0) return;
  const store = getStore();
  for (const rawKeyword of keywords) {
    const keyword = rawKeyword.trim().toLowerCase();
    if (!keyword) continue;
    const perTag = store[keyword] ?? {};
    for (const rawTag of tags) {
      const tag = rawTag.trim();
      if (!tag) continue;
      perTag[tag] = (perTag[tag] ?? 0) + 1;
    }
    store[keyword] = perTag;
  }
  saveStore(store);
}

/**
 * Schlägt Tags für die gegebenen Content-Keywords vor, sortiert nach
 * gelernter Relevanz (Summe der Ko-Vorkommen über alle Keywords).
 * `exclude` filtert Tags heraus, die der Post schon hat.
 */
export function suggestTagsForKeywords(
  keywords: string[],
  limit = 5,
  exclude: string[] = [],
): string[] {
  const store = getStore();
  const excludeSet = new Set(exclude.map((t) => t.trim()));
  const scores = new Map<string, number>();

  for (const rawKeyword of keywords) {
    const keyword = rawKeyword.trim().toLowerCase();
    const perTag = store[keyword];
    if (!perTag) continue;
    for (const [tag, count] of Object.entries(perTag)) {
      if (excludeSet.has(tag)) continue;
      scores.set(tag, (scores.get(tag) ?? 0) + count);
    }
  }

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

export function resetTagLearning(): void {
  localStorage.removeItem(STORAGE_KEY);
}
