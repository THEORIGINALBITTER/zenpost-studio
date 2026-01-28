import { exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

export interface EditorSettings {
  fontSize: number;
  autoSaveEnabled: boolean;
  autoSaveIntervalSec: number;
  wrapLines: boolean;
  showLineNumbers: boolean;
}

export const defaultEditorSettings: EditorSettings = {
  fontSize: 12,
  autoSaveEnabled: false,
  autoSaveIntervalSec: 30,
  wrapLines: true,
  showLineNumbers: true,
};

const EDITOR_DIR = '.zenpost/editor';
const SETTINGS_FILE = `${EDITOR_DIR}/settings.json`;
const AUTOSAVE_FILE = `${EDITOR_DIR}/autosave.md`;

const ensureEditorDir = async (projectPath: string) => {
  const fullPath = `${projectPath}/${EDITOR_DIR}`;
  if (!(await exists(fullPath))) {
    await mkdir(fullPath, { recursive: true });
  }
};

export const getEditorSettingsPath = (projectPath: string) =>
  `${projectPath}/${SETTINGS_FILE}`;

export const getEditorAutosavePath = (projectPath: string) =>
  `${projectPath}/${AUTOSAVE_FILE}`;

export const loadEditorSettings = async (projectPath: string): Promise<EditorSettings> => {
  try {
    const settingsPath = getEditorSettingsPath(projectPath);
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
  const settingsPath = getEditorSettingsPath(projectPath);
  await writeTextFile(settingsPath, JSON.stringify(settings, null, 2));
};

export const saveEditorAutosave = async (
  projectPath: string,
  content: string
): Promise<string> => {
  await ensureEditorDir(projectPath);
  const filePath = getEditorAutosavePath(projectPath);
  await writeTextFile(filePath, content);
  return filePath;
};
