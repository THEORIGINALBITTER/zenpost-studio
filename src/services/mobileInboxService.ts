import { readDir, readTextFile, exists, mkdir } from "@tauri-apps/plugin-fs";
import { homeDir, join } from "@tauri-apps/api/path";

export type MobileDraft = {
  id: string;
  text: string;
  photoUri: string | null;
  createdAt: string;
  platform?: string;
  /** Nativer Pfad zur .md-Datei — für Lazy loading des eingebetteten Fotos */
  filePath: string;
  /** true wenn die .md ein eingebettetes base64-Foto enthält */
  hasEmbeddedImage: boolean;
};

const STORAGE_KEY = "zenpost_mobile_inbox_path";

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

export async function getMobileInboxPath(): Promise<string> {
  const saved = getSavedMobileInboxPath();
  if (saved) return saved;
  return getDefaultMobileInboxPath();
}

/** Ordner anlegen falls nicht vorhanden */
export async function ensureMobileInboxDir(): Promise<string> {
  const path = await getMobileInboxPath();
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

  // base64-Bild aus dem Body rausstreifen — nur beim Öffnen in Content AI neu laden
  let hasEmbeddedImage = false;
  if (body.trimStart().startsWith("![](data:image/")) {
    hasEmbeddedImage = true;
    const closeIdx = body.indexOf(")");
    body = closeIdx !== -1 ? body.slice(closeIdx + 1).trimStart() : "";
  }

  return { meta, body, hasEmbeddedImage };
}

export async function loadMobileDrafts(): Promise<{ drafts: MobileDraft[]; basePath: string }> {
  const basePath = await ensureMobileInboxDir();
  const pathExists = await exists(basePath);

  if (!pathExists) {
    return { drafts: [], basePath };
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
  };
}
