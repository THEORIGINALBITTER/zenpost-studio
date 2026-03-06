import { readDir, readTextFile, readFile, writeFile, writeTextFile, exists, mkdir } from "@tauri-apps/plugin-fs";
import { homeDir, join } from "@tauri-apps/api/path";
import { isTauri } from "@tauri-apps/api/core";
import JSZip from "jszip";

export type MobileDraft = {
  id: string;
  text: string;
  photoUri: string | null;
  webPhotoDataUrl?: string | null;
  createdAt: string;
  platform?: string;
  /** Nativer Pfad zur .md-Datei — für Lazy loading des eingebetteten Fotos */
  filePath: string;
  /** true wenn die .md ein eingebettetes base64-Foto enthält */
  hasEmbeddedImage: boolean;
};

const STORAGE_KEY = "zenpost_mobile_inbox_path";
const WEB_DRAFTS_CACHE_KEY = "zenpost_mobile_inbox_web_drafts";
let webMobileInboxFiles: File[] = [];
const processedMobileInboxPackages = new Set<string>();

export async function getDefaultMobileInboxPath(): Promise<string> {
  const home = await homeDir();
  return join(home, "Documents", "ZenPost", "mobile-inbox");
}

export function getSavedMobileInboxPath(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function saveMobileInboxPath(path: string) {
  localStorage.setItem(STORAGE_KEY, path);
}

export function saveWebMobileInboxFiles(files: File[], label: string) {
  webMobileInboxFiles = files;
  saveMobileInboxPath(label);
}

function normalizeWebPath(path: string): string {
  const raw = String(path ?? "").trim();
  if (!raw) return "";

  let normalized = raw;
  try {
    normalized = decodeURIComponent(raw);
  } catch {
    normalized = raw;
  }

  normalized = normalized
    .replace(/^asset:\/\//i, "")
    .replace(/^file:\/\//i, "")
    .replace(/[?#].*$/, "")
    .replace(/^\.?\//, "")
    .replace(/\\/g, "/")
    .trim()
    .toLowerCase();

  return normalized;
}

function getWebPathBasename(path: string): string {
  const normalized = normalizeWebPath(path);
  if (!normalized) return "";
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function findWebMobileInboxFile(pathOrName: string): File | null {
  const target = normalizeWebPath(pathOrName);
  const targetBase = getWebPathBasename(pathOrName);
  if (!target) return null;
  for (const file of webMobileInboxFiles) {
    const withRel = normalizeWebPath((file as File & { webkitRelativePath?: string }).webkitRelativePath || "");
    const byName = normalizeWebPath(file.name);
    const withRelBase = getWebPathBasename(withRel);
    const byNameBase = getWebPathBasename(byName);
    if (
      withRel === target ||
      withRel.endsWith(`/${target}`) ||
      byName === target ||
      (targetBase && (withRelBase === targetBase || byNameBase === targetBase))
    ) {
      return file;
    }
  }
  return null;
}

export async function getWebMobileDraftFileContent(pathOrName: string): Promise<string | null> {
  const file = findWebMobileInboxFile(pathOrName);
  if (!file) return null;
  try {
    return await file.text();
  } catch {
    return null;
  }
}

export async function getWebMobilePhotoDataUrl(pathOrName: string): Promise<string | null> {
  const file = findWebMobileInboxFile(pathOrName);
  if (!file) return null;
  try {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  } catch {
    return null;
  }
}

export async function getMobileInboxPath(): Promise<string> {
  const saved = getSavedMobileInboxPath();
  if (saved) return saved;
  if (!isTauri()) return "Kein Ordner gewaehlt (Web)";
  return getDefaultMobileInboxPath();
}

/** Ordner anlegen falls nicht vorhanden */
export async function ensureMobileInboxDir(): Promise<string> {
  const path = await getMobileInboxPath();
  if (!isTauri()) return path;
  const dirExists = await exists(path);
  if (!dirExists) {
    await mkdir(path, { recursive: true });
  }
  return path;
}

/** YAML-Frontmatter + Body parsen; base64-Bilder werden NICHT in body geladen (Lazy loading) */
function parseMdFrontmatter(content: string): {
  meta: Record<string, string>;
  body: string;
  hasEmbeddedImage: boolean;
} {
  const meta: Record<string, string> = {};
  let body = content;

  if (content.startsWith("---")) {
    const end = content.indexOf("\n---", 3);
    if (end !== -1) {
      const block = content.slice(3, end).trim();
      body = content.slice(end + 4).trimStart();
      for (const line of block.split("\n")) {
        const colon = line.indexOf(":");
        if (colon !== -1) {
          meta[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
        }
      }
    }
  }

  // Eingebettete base64-Bilder an beliebiger Stelle erkennen.
  // Für Listenansicht entfernen wir sie aus `text`, damit keine riesigen Strings im UI landen.
  const embeddedImagePattern = /!\[[^\]]*\]\(data:image\/[a-zA-Z0-9.+-]+;base64,[^)]+\)/gi;
  const hasEmbeddedImage = embeddedImagePattern.test(body);
  if (hasEmbeddedImage) {
    body = body.replace(embeddedImagePattern, "").replace(/\n{3,}/g, "\n\n").trim();
  }

  return { meta, body, hasEmbeddedImage };
}

function sanitizeDraftStem(raw: string): string {
  const cleaned = String(raw ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || `draft_${Date.now()}`;
}

function basenameOfPath(input: string): string {
  const normalized = String(input ?? "").replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
}

async function importMobileInboxPackages(basePath: string): Promise<number> {
  let importedCount = 0;
  const entries = await readDir(basePath);
  const zipPackages = entries.filter((entry) => {
    if (!entry.name) return false;
    const lower = entry.name.toLowerCase();
    return lower.endsWith(".zip") || lower.endsWith(".zpost");
  });

  for (const pack of zipPackages) {
    const packageName = pack.name!;
    if (processedMobileInboxPackages.has(packageName)) continue;

    try {
      const packagePath = await join(basePath, packageName);
      const bytes = await readFile(packagePath);
      const zip = await JSZip.loadAsync(bytes);

      const zipFiles = Object.values(zip.files).filter((f) => !f.dir);
      const mdEntry = zipFiles.find((f) => f.name.toLowerCase().endsWith(".md"));
      if (!mdEntry) {
        processedMobileInboxPackages.add(packageName);
        continue;
      }

      const mdContent = await mdEntry.async("string");
      const { meta } = parseMdFrontmatter(mdContent);
      const stemFromMeta = sanitizeDraftStem(meta.id || packageName.replace(/\.(zip|zpost)$/i, ""));
      const targetMdPath = await join(basePath, `${stemFromMeta}.md`);
      await writeTextFile(targetMdPath, mdContent);

      const photoField = meta.photo ? basenameOfPath(meta.photo) : "";
      if (photoField) {
        const photoEntry =
          zip.file(meta.photo) ||
          zip.file(photoField) ||
          zipFiles.find((f) => basenameOfPath(f.name).toLowerCase() === photoField.toLowerCase());

        if (photoEntry) {
          const photoBytes = await photoEntry.async("uint8array");
          const targetPhotoPath = await join(basePath, photoField);
          await writeFile(targetPhotoPath, photoBytes);
        }
      }

      importedCount += 1;
      processedMobileInboxPackages.add(packageName);
    } catch {
      // Paket defekt oder inkompatibel -> beim nächsten Lauf erneut versuchen.
    }
  }
  return importedCount;
}

type CachedWebDraft = {
  id: string;
  text: string;
  photoUri: string | null;
  webPhotoDataUrl?: string | null;
  createdAt: string;
  platform?: string;
  filePath: string;
  hasEmbeddedImage: boolean;
};

function getCachedWebDrafts(): MobileDraft[] {
  try {
    const raw = localStorage.getItem(WEB_DRAFTS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CachedWebDraft[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((d) => ({
      id: d.id,
      text: d.text,
      photoUri: d.photoUri ?? null,
      webPhotoDataUrl: d.webPhotoDataUrl ?? null,
      createdAt: d.createdAt,
      platform: d.platform,
      filePath: d.filePath,
      hasEmbeddedImage: !!d.hasEmbeddedImage,
    }));
  } catch {
    return [];
  }
}

function setCachedWebDrafts(drafts: MobileDraft[]) {
  const serializable: CachedWebDraft[] = drafts.map((d) => ({
    id: d.id,
    text: d.text,
    photoUri: d.photoUri,
    webPhotoDataUrl: d.webPhotoDataUrl ?? null,
    createdAt: d.createdAt,
    platform: d.platform,
    filePath: d.filePath,
    hasEmbeddedImage: d.hasEmbeddedImage,
  }));
  localStorage.setItem(WEB_DRAFTS_CACHE_KEY, JSON.stringify(serializable));
}

async function loadWebMobileDrafts(basePath: string): Promise<{ drafts: MobileDraft[]; basePath: string; importedPackages: number }> {
  if (webMobileInboxFiles.length === 0) {
    return {
      drafts: getCachedWebDrafts().sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      basePath,
      importedPackages: 0,
    };
  }

  const mdFiles = webMobileInboxFiles.filter((f) => f.name.toLowerCase().endsWith(".md"));
  const drafts: MobileDraft[] = [];

  for (const file of mdFiles) {
    try {
      const content = await file.text();
      const { meta, body, hasEmbeddedImage } = parseMdFrontmatter(content);
      if (!meta.id || !meta.createdAt) continue;

      drafts.push({
        id: meta.id,
        text: body.trim(),
        photoUri: meta.photo ?? null,
        webPhotoDataUrl: meta.photo ? await getWebMobilePhotoDataUrl(meta.photo) : null,
        createdAt: meta.createdAt,
        platform: meta.platform,
        filePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
        hasEmbeddedImage,
      });
    } catch {
      // beschädigte Datei überspringen
    }
  }

  const sorted = drafts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  setCachedWebDrafts(sorted);
  return { drafts: sorted, basePath, importedPackages: 0 };
}

export async function loadMobileDrafts(): Promise<{ drafts: MobileDraft[]; basePath: string; importedPackages: number }> {
  const basePath = await ensureMobileInboxDir();
  if (!isTauri()) {
    return loadWebMobileDrafts(basePath);
  }

  const importedPackages = await importMobileInboxPackages(basePath);

  const pathExists = await exists(basePath);

  if (!pathExists) {
    return { drafts: [], basePath, importedPackages };
  }

  const entries = await readDir(basePath);
  const mdFiles = entries.filter((e) => e.name?.endsWith(".md"));

  const drafts: MobileDraft[] = [];
  for (const file of mdFiles) {
    try {
      const filePath = await join(basePath, file.name!);
      const content = await readTextFile(filePath);
      const { meta, body, hasEmbeddedImage } = parseMdFrontmatter(content);

      if (!meta.id || !meta.createdAt) continue;

      drafts.push({
        id: meta.id,
        text: body.trim(),
        photoUri: meta.photo ?? null,
        webPhotoDataUrl: null,
        createdAt: meta.createdAt,
        platform: meta.platform,
        filePath,
        hasEmbeddedImage,
      });
    } catch {
      // beschädigte Datei überspringen
    }
  }

  return {
    drafts: drafts.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    basePath,
    importedPackages,
  };
}
