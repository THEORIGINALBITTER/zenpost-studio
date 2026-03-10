import { exists, mkdir, readDir, readTextFile, remove, writeTextFile } from '@tauri-apps/plugin-fs';
import { getProjectDataDir } from './appConfigService';

export type EditorTheme = 'dark' | 'light';

export interface EditorSettings {
  fontSize: number;
  autoSaveEnabled: boolean;
  autoSaveIntervalSec: number;
  wrapLines: boolean;
  showLineNumbers: boolean;
  theme: EditorTheme;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

export const defaultEditorSettings: EditorSettings = {
  fontSize: 12,
  autoSaveEnabled: false,
  autoSaveIntervalSec: 30,
  wrapLines: true,
  showLineNumbers: true,
  theme: 'light',
  marginTop: 48,
  marginBottom: 48,
  marginLeft: 64,
  marginRight: 64,
};

const EDITOR_DIR = 'editor';
const SETTINGS_FILE = 'settings.json';
const AUTOSAVE_FILE = 'autosave.md';
const AUTOSAVES_DIR = 'autosaves';

const getEditorRoot = async (projectPath: string): Promise<string> => {
  const projectDataDir = await getProjectDataDir(projectPath);
  return `${projectDataDir}/${EDITOR_DIR}`;
};

const ensureEditorDir = async (projectPath: string): Promise<string> => {
  const editorRoot = await getEditorRoot(projectPath);
  if (!(await exists(editorRoot))) {
    await mkdir(editorRoot, { recursive: true });
  }
  return editorRoot;
};

export const getEditorSettingsPath = async (projectPath: string): Promise<string> => {
  const editorRoot = await getEditorRoot(projectPath);
  return `${editorRoot}/${SETTINGS_FILE}`;
};

export const getEditorAutosavePath = async (projectPath: string): Promise<string> => {
  const editorRoot = await getEditorRoot(projectPath);
  return `${editorRoot}/${AUTOSAVE_FILE}`;
};

export const loadEditorSettings = async (projectPath: string): Promise<EditorSettings> => {
  try {
    const settingsPath = await getEditorSettingsPath(projectPath);
    if (!(await exists(settingsPath))) {
      return { ...defaultEditorSettings };
    }
    const raw = await readTextFile(settingsPath);
    const parsed = JSON.parse(raw) as Partial<EditorSettings>;
    return { ...defaultEditorSettings, ...parsed };
  } catch (error) {
    console.error('[EditorSettings] Failed to load settings:', error);
    return { ...defaultEditorSettings };
  }
};

export const saveEditorSettings = async (
  projectPath: string,
  settings: EditorSettings
): Promise<void> => {
  await ensureEditorDir(projectPath);
  const settingsPath = await getEditorSettingsPath(projectPath);
  await writeTextFile(settingsPath, JSON.stringify(settings, null, 2));
};

export const saveEditorAutosave = async (
  projectPath: string,
  content: string
): Promise<string> => {
  await ensureEditorDir(projectPath);
  const filePath = await getEditorAutosavePath(projectPath);
  await writeTextFile(filePath, content);
  return filePath;
};

type DraftAutosaveMeta = {
  key: string;
  updatedAt: string;
  checksum: string;
  contentLength: number;
};

export type DraftAutosaveRecord = {
  content: string;
  meta: DraftAutosaveMeta;
};

const sanitizeKey = (key: string) => key.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 140);

const quickChecksum = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return `${hash}`;
};

const ensureDraftAutosavesDir = async (projectPath: string): Promise<string> => {
  const editorRoot = await ensureEditorDir(projectPath);
  const autosavesRoot = `${editorRoot}/${AUTOSAVES_DIR}`;
  if (!(await exists(autosavesRoot))) {
    await mkdir(autosavesRoot, { recursive: true });
  }
  return autosavesRoot;
};

const MAX_AUTOSAVE_VERSIONS = 5;

const getDraftAutosavesDirPath = async (projectPath: string): Promise<string> => {
  const editorRoot = await getEditorRoot(projectPath);
  return `${editorRoot}/${AUTOSAVES_DIR}`;
};

/** Entfernt ältere Versionen über maxVersions hinaus */
const pruneOldVersions = async (
  autosavesRoot: string,
  safeKey: string,
  maxVersions: number
): Promise<void> => {
  try {
    const entries = await readDir(autosavesRoot);
    const pattern = new RegExp(`^${safeKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_\\d+\\.md$`);
    const versions = entries
      .filter((e) => e.name && pattern.test(e.name))
      .map((e) => e.name!)
      .sort()
      .reverse(); // neueste zuerst
    const toDelete = versions.slice(maxVersions);
    for (const name of toDelete) {
      const base = name.replace(/\.md$/, '');
      try { await remove(`${autosavesRoot}/${name}`); } catch { /* no-op */ }
      try { await remove(`${autosavesRoot}/${base}.json`); } catch { /* no-op */ }
    }
  } catch {
    // pruning ist best-effort
  }
};

export const saveDraftAutosave = async (
  projectPath: string,
  key: string,
  content: string
): Promise<DraftAutosaveRecord> => {
  const autosavesRoot = await ensureDraftAutosavesDir(projectPath);
  const safeKey = sanitizeKey(key);
  const timestamp = Date.now();
  const base = `${safeKey}_${timestamp}`;
  const meta: DraftAutosaveMeta = {
    key,
    updatedAt: new Date().toISOString(),
    checksum: quickChecksum(content),
    contentLength: content.length,
  };
  await writeTextFile(`${autosavesRoot}/${base}.md`, content);
  await writeTextFile(`${autosavesRoot}/${base}.json`, JSON.stringify(meta, null, 2));
  await pruneOldVersions(autosavesRoot, safeKey, MAX_AUTOSAVE_VERSIONS);
  return { content, meta };
};

export const listDraftAutosaves = async (
  projectPath: string,
  key: string
): Promise<DraftAutosaveRecord[]> => {
  try {
    const autosavesRoot = await getDraftAutosavesDirPath(projectPath);
    if (!(await exists(autosavesRoot))) return [];
    const entries = await readDir(autosavesRoot);
    const safeKey = sanitizeKey(key);
    const pattern = new RegExp(`^${safeKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_\\d+\\.md$`);
    const mdFiles = entries
      .filter((e) => e.name && pattern.test(e.name))
      .map((e) => e.name!)
      .sort()
      .reverse() // neueste zuerst
      .slice(0, MAX_AUTOSAVE_VERSIONS);

    const records: DraftAutosaveRecord[] = [];
    for (const name of mdFiles) {
      try {
        const base = name.replace(/\.md$/, '');
        const content = await readTextFile(`${autosavesRoot}/${name}`);
        // Timestamp aus Dateiname extrahieren
        const tsMatch = base.match(/_(\d+)$/);
        const fallbackDate = tsMatch ? new Date(Number(tsMatch[1])).toISOString() : new Date(0).toISOString();
        let meta: DraftAutosaveMeta = {
          key,
          updatedAt: fallbackDate,
          checksum: quickChecksum(content),
          contentLength: content.length,
        };
        const metaPath = `${autosavesRoot}/${base}.json`;
        if (await exists(metaPath)) {
          try {
            const raw = await readTextFile(metaPath);
            meta = { ...meta, ...(JSON.parse(raw) as Partial<DraftAutosaveMeta>) };
          } catch { /* broken meta — fallback above */ }
        }
        records.push({ content, meta });
      } catch { /* unlesbare Datei überspringen */ }
    }
    return records;
  } catch {
    return [];
  }
};

export const loadDraftAutosave = async (
  projectPath: string,
  key: string
): Promise<DraftAutosaveRecord | null> => {
  try {
    // Zuerst neue versionierte Dateien prüfen
    const versions = await listDraftAutosaves(projectPath, key);
    if (versions.length > 0) return versions[0];

    // Fallback: altes Format {safeKey}.md
    const autosavesRoot = await getDraftAutosavesDirPath(projectPath);
    const safeKey = sanitizeKey(key);
    const legacyContent = `${autosavesRoot}/${safeKey}.md`;
    const legacyMeta = `${autosavesRoot}/${safeKey}.json`;
    if (!(await exists(legacyContent))) return null;
    const content = await readTextFile(legacyContent);
    let meta: DraftAutosaveMeta = {
      key,
      updatedAt: new Date(0).toISOString(),
      checksum: quickChecksum(content),
      contentLength: content.length,
    };
    if (await exists(legacyMeta)) {
      try {
        meta = { ...meta, ...(JSON.parse(await readTextFile(legacyMeta)) as Partial<DraftAutosaveMeta>) };
      } catch { /* ignore */ }
    }
    return { content, meta };
  } catch (error) {
    console.error('[EditorSettings] Failed to load draft autosave:', error);
    return null;
  }
};
