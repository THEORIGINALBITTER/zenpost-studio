// Statically imported (not `await import(...)`) on purpose: a runtime dynamic
// `import()` call needs the webview to resolve a chunk URL at execution time,
// which failed under the app's actual runtime protocol ("Importing a module
// script failed") — for the whole library, not just per-diagram-type chunks.
// A static import is wired into the normal module graph at build time and
// loads exactly like every other dependency in this app, so it doesn't hit
// that failure mode. Costs a bit of extra initial bundle weight (it still
// ends up in its own build chunk via vite.config.ts's manualChunks) in
// exchange for actually working reliably.
import mermaid from 'mermaid/dist/mermaid.esm.mjs';

export type MermaidTheme = 'default' | 'dark';

// Live editor UI (ZenCodeBlockTool) reads this to match the app's current
// Dark/Light toggle without needing a prop threaded into the vanilla EditorJS
// tool class. Set via setPreferredMermaidTheme() from a React effect whenever
// the app theme changes. Exported PNGs (replaceMermaidBlocksWithImages) never
// read this — published output always renders with the 'default' theme so a
// diagram doesn't look broken on a page in a different color scheme.
let preferredTheme: MermaidTheme = 'default';
export function setPreferredMermaidTheme(theme: MermaidTheme) {
  preferredTheme = theme;
}
export function getPreferredMermaidTheme(): MermaidTheme {
  return preferredTheme;
}

let initializedTheme: MermaidTheme | null = null;

// mermaid.render() is not safe to call concurrently — multiple diagrams
// rendering at once on the same page can collide internally and one of them
// fails with a misleading "Syntax error" even though the text is valid.
// This queue serializes every render call app-wide so only one runs at a time.
let renderQueue: Promise<unknown> = Promise.resolve();

/**
 * Renders Mermaid diagram source to an SVG string.
 * Throws on invalid Mermaid syntax — callers (mid-typing content is the
 * normal case) must catch and show a soft error instead of the raw SVG.
 */
export function renderMermaidToSvg(code: string, id: string, theme: MermaidTheme = 'default'): Promise<string> {
  const run = async () => {
    if (initializedTheme !== theme) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme,
        suppressErrorRendering: true,
      });
      initializedTheme = theme;
    }
    const { svg } = await mermaid.render(id, code);
    return svg;
  };

  const result = renderQueue.then(run, run);
  // Keep the queue alive even after a failure — swallow here, the caller
  // still gets the real rejection via `result`.
  renderQueue = result.catch(() => {});
  return result;
}

/** Rasterizes an SVG string to a PNG data URL (white background, 2x scale for sharpness). */
async function svgToPngDataUrl(svg: string, scale = 2): Promise<string> {
  const widthMatch = svg.match(/width="([\d.]+)(?:px)?"/);
  const heightMatch = svg.match(/height="([\d.]+)(?:px)?"/);
  let width = widthMatch ? parseFloat(widthMatch[1]) : 0;
  let height = heightMatch ? parseFloat(heightMatch[1]) : 0;
  if (!width || !height) {
    const viewBoxMatch = svg.match(/viewBox="[\d.\-]+\s+[\d.\-]+\s+([\d.]+)\s+([\d.]+)"/);
    if (viewBoxMatch) {
      width = parseFloat(viewBoxMatch[1]);
      height = parseFloat(viewBoxMatch[2]);
    }
  }
  if (!width || !height) {
    width = 800;
    height = 600;
  }

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('SVG konnte nicht als Bild geladen werden'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D-Kontext nicht verfügbar');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

const MERMAID_FENCE = /```mermaid\n([\s\S]*?)```/g;

/**
 * Replaces every ```mermaid fenced block in the markdown with an uploaded PNG
 * image reference. `uploadPng` is injected so this util stays independent of
 * any specific upload backend's config typing. Per-diagram failures (invalid
 * syntax, upload error) are non-fatal — that block is left untouched.
 */
export async function replaceMermaidBlocksWithImages(
  markdown: string,
  uploadPng: (pngDataUrl: string, fileNameBase: string) => Promise<string | null>,
  fileNameBase: string,
): Promise<string> {
  const matches = [...markdown.matchAll(MERMAID_FENCE)];
  let result = markdown;
  let index = 0;
  for (const match of matches) {
    index += 1;
    try {
      const name = `${fileNameBase}-${index}`;
      const svg = await renderMermaidToSvg(match[1], name);
      const png = await svgToPngDataUrl(svg);
      const url = await uploadPng(png, name);
      if (url) result = result.replace(match[0], `![Mermaid-Diagramm](${url})`);
    } catch {
      // Diagramm bleibt als Codeblock stehen — Speichern/Publish darf nicht abbrechen.
    }
  }
  return result;
}

/**
 * Replaces every ```mermaid fenced block with an inline `data:image/png`
 * markdown image — no upload, purely local rasterization. For static exports
 * (PDF/EPUB) that can embed a real image but have no upload endpoint of their
 * own. Per-diagram failures are non-fatal — that block is left untouched.
 */
export async function embedMermaidAsDataUriImages(markdown: string): Promise<string> {
  const matches = [...markdown.matchAll(MERMAID_FENCE)];
  let result = markdown;
  let index = 0;
  for (const match of matches) {
    index += 1;
    try {
      const svg = await renderMermaidToSvg(match[1], `embed-mermaid-${index}`);
      const png = await svgToPngDataUrl(svg);
      result = result.replace(match[0], `![Mermaid-Diagramm](${png})`);
    } catch {
      // Diagramm bleibt als Codeblock stehen — Export darf nicht abbrechen.
    }
  }
  return result;
}

function downloadPngDataUrl(pngDataUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.href = pngDataUrl;
  link.download = fileName;
  link.click();
}

/**
 * Prepares markdown for platforms that only accept plain text pasted from the
 * clipboard (LinkedIn, X, Medium, Reddit, ...): every ```mermaid block is
 * rendered to PNG, then either uploaded via `uploadPng` (e.g. into ZenImage)
 * or — if that's unavailable/fails — downloaded locally as a fallback, and
 * replaced with a short placeholder note either way so the user knows to
 * attach the image manually. Per-diagram render failures are non-fatal.
 */
export async function resolveMermaidForClipboard(
  markdown: string,
  uploadPng: (pngDataUrl: string, fileNameBase: string) => Promise<string | null>,
): Promise<{ content: string; assetCount: number }> {
  const matches = [...markdown.matchAll(MERMAID_FENCE)];
  let result = markdown;
  let assetCount = 0;
  let index = 0;
  for (const match of matches) {
    index += 1;
    try {
      const name = `diagram-clipboard-${index}`;
      const svg = await renderMermaidToSvg(match[1], name);
      const png = await svgToPngDataUrl(svg);
      const url = await uploadPng(png, name).catch(() => null);
      let placeholder: string;
      if (url) {
        placeholder = `[Diagramm "${index}" — in ZenImage gespeichert, bitte manuell einfügen]`;
      } else {
        downloadPngDataUrl(png, `${name}.png`);
        placeholder = `[Diagramm "${index}" — als Bild heruntergeladen, bitte manuell einfügen]`;
      }
      result = result.replace(match[0], placeholder);
      assetCount += 1;
    } catch {
      // Diagramm bleibt als Codeblock stehen — Kopieren/Veröffentlichen darf nicht abbrechen.
    }
  }
  return { content: result, assetCount };
}
