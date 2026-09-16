/**
 * "Warum ist mein Post nicht online?" — verifiziert nach einem erfolgreichen
 * Speichern, ob die veröffentlichte Seite tatsächlich erreichbar ist, statt
 * nur zu vertrauen, dass ein Upload-Request mit Erfolg beantwortet wurde.
 * Genau die Lücke, die heute Abend mehrfach zu "Speichern erfolgreich,
 * Inhalt trotzdem unsichtbar" geführt hat.
 */

export type LiveVerificationResult =
  | { status: 'live' }
  | { status: 'unreachable'; reason: string }
  | { status: 'skipped' };

// Plain page-URL check ONLY: on a single-page app whose server answers every
// path with 200 (SPA fallback, serving the app shell for unknown routes),
// this can never actually detect a missing post — it always sees 200 and
// calls it live. Kept as the last-resort check for setups without a
// manifest.json (e.g. FTP-only deploys); prefer verifyPostInManifest
// wherever a manifest URL + slug are available.
export async function verifyPostIsLive(url: string, timeoutMs = 6000): Promise<LiveVerificationResult> {
  if (!/^https?:\/\//i.test(url)) return { status: 'skipped' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    if (!res.ok) {
      return { status: 'unreachable', reason: `Seite antwortet mit HTTP ${res.status}` };
    }
    return { status: 'live' };
  } catch (e) {
    const isAbort = e instanceof DOMException && e.name === 'AbortError';
    return {
      status: 'unreachable',
      reason: isAbort ? 'Zeitüberschreitung — Seite hat nicht rechtzeitig geantwortet' : 'Seite nicht erreichbar (Netzwerkfehler)',
    };
  } finally {
    clearTimeout(timer);
  }
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function fetchManifestAndCheckSlug(
  manifestUrl: string,
  slug: string,
  timeoutMs: number,
): Promise<LiveVerificationResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(manifestUrl, { method: 'GET', signal: controller.signal });
    if (!res.ok) {
      return { status: 'unreachable', reason: `manifest.json antwortet mit HTTP ${res.status}` };
    }
    const data = await res.json().catch(() => null) as {
      posts?: Array<{ slug?: string }>;
      documents?: Array<{ id?: string }>;
    } | null;
    const posts = Array.isArray(data?.posts) ? data!.posts! : [];
    const documents = Array.isArray(data?.documents) ? data!.documents! : [];
    // A docs-shaped site tracks entries under documents[].id, not
    // posts[].slug — check both so this works for either site type.
    const found = posts.some((p) => String(p?.slug ?? '') === slug) || documents.some((d) => String(d?.id ?? '') === slug);
    if (!found) {
      const total = posts.length + documents.length;
      return { status: 'unreachable', reason: `"${slug}" steht nicht in manifest.json (${total} Einträge gelistet)` };
    }
    return { status: 'live' };
  } catch (e) {
    const isAbort = e instanceof DOMException && e.name === 'AbortError';
    return {
      status: 'unreachable',
      reason: isAbort ? 'Zeitüberschreitung — manifest.json hat nicht rechtzeitig geantwortet' : 'manifest.json nicht erreichbar (Netzwerkfehler)',
    };
  } finally {
    clearTimeout(timer);
  }
}

// Authoritative check: re-fetches the live manifest.json (bypassing caches
// via a cache-busting query param) and confirms the slug is actually listed
// as a post. Unlike a page-URL fetch, this can't be fooled by a catch-all
// SPA route that answers 200 for literally any path — a save that never
// really reached posts/ (or landed in the wrong shape/folder) shows up here
// as "missing", not "live".
//
// The very first check runs right after the upload request resolves, which
// can race the server's own write — manifest.json is sometimes still being
// written when this fires, so an immediate "missing" doesn't necessarily
// mean the save failed. Retried a few times with a growing delay before
// reporting unreachable, so a save that's simply not flushed to disk yet
// doesn't get flagged as a false alarm.
export async function verifyPostInManifest(
  siteUrl: string,
  slug: string,
  timeoutMs = 6000,
  retryDelaysMs: number[] = [800, 1500, 2500],
): Promise<LiveVerificationResult> {
  const base = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
  const manifestBase = `${base.replace(/\/+$/, '')}/manifest.json`;

  let lastResult = await fetchManifestAndCheckSlug(`${manifestBase}?t=${Date.now()}`, slug, timeoutMs);
  for (const wait of retryDelaysMs) {
    if (lastResult.status === 'live') break;
    await delay(wait);
    lastResult = await fetchManifestAndCheckSlug(`${manifestBase}?t=${Date.now()}`, slug, timeoutMs);
  }
  return lastResult;
}
