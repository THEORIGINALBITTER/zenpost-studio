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
}

export const defaultEditorSettings: EditorSettings = {
  fontSize: 12,
  autoSaveEnabled: false,
  autoSaveIntervalSec: 30,
  wrapLines: true,
  showLineNumbers: true,
  theme: 'light',
};

const EDITOR_DIR = 'editor';
const SETTINGS_FILE = 'settings.json';
const AUTOSAVE_FILE = 'autosave.md';

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
