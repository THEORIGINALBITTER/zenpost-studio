import { exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
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

const getDraftAutosavePaths = async (projectPath: string, key: string) => {
  const autosavesRoot = await ensureDraftAutosavesDir(projectPath);
  const safeKey = sanitizeKey(key);
  return {
    contentPath: `${autosavesRoot}/${safeKey}.md`,
    metaPath: `${autosavesRoot}/${safeKey}.json`,
  };
};

export const saveDraftAutosave = async (
  projectPath: string,
  key: string,
  content: string
): Promise<DraftAutosaveRecord> => {
  const paths = await getDraftAutosavePaths(projectPath, key);
  const meta: DraftAutosaveMeta = {
    key,
    updatedAt: new Date().toISOString(),
    checksum: quickChecksum(content),
    contentLength: content.length,
  };
  await writeTextFile(paths.contentPath, content);
  await writeTextFile(paths.metaPath, JSON.stringify(meta, null, 2));
  return { content, meta };
};

export const loadDraftAutosave = async (
  projectPath: string,
  key: string
): Promise<DraftAutosaveRecord | null> => {
  try {
    const paths = await getDraftAutosavePaths(projectPath, key);
    if (!(await exists(paths.contentPath))) return null;
    const content = await readTextFile(paths.contentPath);
    let meta: DraftAutosaveMeta = {
      key,
      updatedAt: new Date(0).toISOString(),
      checksum: quickChecksum(content),
      contentLength: content.length,
    };
    if (await exists(paths.metaPath)) {
      try {
        const rawMeta = await readTextFile(paths.metaPath);
        meta = { ...meta, ...(JSON.parse(rawMeta) as Partial<DraftAutosaveMeta>) };
      } catch {
        // ignore broken meta, content still usable
      }
    }
    return { content, meta };
  } catch (error) {
    console.error('[EditorSettings] Failed to load draft autosave:', error);
    return null;
  }
};
