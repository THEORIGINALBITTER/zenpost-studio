/**
 * ZenImageStore — Synchroner Cache: base64 data URL → stabiler Blob-URL
 *
 * Problem: Inline base64-Bilder in Markdown-Content sind 1–4 MB groß.
 * Jede Textänderung lässt ReactMarkdown den gesamten String neu parsen,
 * der Browser decoded base64 erneut → sichtbares Flackern in der Preview.
 *
 * Lösung: Einmal dekodieren → Blob erstellen → stable Blob-URL merken.
 * Gleiche base64 → gleiche Blob-URL → kein Re-Decode, kein Flackern.
 * Das Original-`content` bleibt unverändert (für Posting/Export).
 */

// ─── Intern ───────────────────────────────────────────────────────────────────

const MAX_ENTRIES = 80; // max gecachte Bilder bevor LRU-Eviction
const store = new Map<string, string>(); // base64DataUrl → blobUrl

/** Erzeugt aus einer data URL synchron eine Blob-URL. */
function createBlobUrl(dataUrl: string): string {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx < 0) throw new Error('Invalid data URL');
  const header = dataUrl.slice(0, commaIdx);
  const base64 = dataUrl.slice(commaIdx + 1);
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch?.[1] ?? 'image/jpeg';

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const blob = new Blob([bytes], { type: mime });
  return URL.createObjectURL(blob);
}

/** LRU-Eviction: ältesten Eintrag entfernen wenn der Cache voll ist. */
function evictOldest() {
  const firstKey = store.keys().next().value;
  if (firstKey !== undefined) {
    const oldUrl = store.get(firstKey);
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    store.delete(firstKey);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Gibt eine stabile Blob-URL für eine base64 data URL zurück.
 * Beim ersten Aufruf wird die Blob-URL erzeugt und gecacht.
 * Alle folgenden Aufrufe mit der gleichen data URL geben dieselbe URL zurück.
 *
 * Fällt auf die Original-data-URL zurück wenn Blob-Erzeugung fehlschlägt.
 */
export function getOrCreateBlobUrl(dataUrl: string): string {
  const cached = store.get(dataUrl);
  if (cached) return cached;

  try {
    if (store.size >= MAX_ENTRIES) evictOldest();
    const blobUrl = createBlobUrl(dataUrl);
    store.set(dataUrl, blobUrl);
    return blobUrl;
  } catch {
    return dataUrl; // graceful fallback: data URL direkt nutzen
  }
}

/**
 * Ersetzt alle inline `data:image/...;base64,...` in einem Markdown-String
 * durch stabile Blob-URLs. Nur für die Preview — Original-Content unverändert.
 *
 * Pattern matcht nur data URLs mit ≥80 Zeichen Base64-Anteil,
 * um kurze placeholder-ähnliche Strings zu überspringen.
 */
const DATA_IMAGE_RE = /!\[([^\]]*)\]\((data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]{80,})\)/g;

export function internalizeImages(content: string): string {
  if (!content.includes('data:image/')) return content;
  return content.replace(DATA_IMAGE_RE, (_, alt, dataUrl) => {
    const blobUrl = getOrCreateBlobUrl(dataUrl);
    return `![${alt}](${blobUrl})`;
  });
}

/**
 * Alle Blob-URLs freigeben — aufrufen wenn der Content komplett entladen wird.
 */
export function clearImageStore(): void {
  store.forEach((blobUrl) => URL.revokeObjectURL(blobUrl));
  store.clear();
}

export const zenImageStoreSize = (): number => store.size;
