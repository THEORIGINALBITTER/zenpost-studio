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
