import { appDataDir, documentDir, join } from '@tauri-apps/api/path';
import { exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

export type AppConfig = {
  version: '1.0.0';
  lastProjectPath?: string | null;
  hasSeenBootstrapNotice?: boolean;
  createdAt: string;
  updatedAt: string;
};

type AppConfigInfo = {
  appRoot: string;
  configPath: string;
  defaultProjectPath: string;
  config: AppConfig;
};

const APP_DIR = 'ZenStudio';
const CONFIG_DIR = 'config';
const CONFIG_FILE = 'config.json';
const PROJECTS_DIR = 'projects';
const DEFAULT_PROJECT_DIR = 'default';

const ensureDir = async (path: string) => {
  if (await exists(path)) return;
  await mkdir(path, { recursive: true });
};

const getAppRoot = async () => {
  const docs = await documentDir();
  return join(docs, APP_DIR);
};

const getConfigPath = async (appRoot: string) => join(appRoot, CONFIG_DIR, CONFIG_FILE);

const getDefaultProjectPath = async (appRoot: string) =>
  join(appRoot, PROJECTS_DIR, DEFAULT_PROJECT_DIR);

const loadConfigFile = async (configPath: string): Promise<AppConfig | null> => {
  try {
    if (!(await exists(configPath))) return null;
    const raw = await readTextFile(configPath);
    return JSON.parse(raw) as AppConfig;
  } catch {
    return null;
  }
};

const saveConfigFile = async (configPath: string, config: AppConfig) => {
  await writeTextFile(configPath, JSON.stringify(config, null, 2));
};

export const ensureAppConfig = async (): Promise<AppConfigInfo> => {
  const appRoot = await getAppRoot();
  const configPath = await getConfigPath(appRoot);
  const defaultProjectPath = await getDefaultProjectPath(appRoot);

  await ensureDir(appRoot);
  await ensureDir(await join(appRoot, CONFIG_DIR));
  await ensureDir(await join(appRoot, PROJECTS_DIR));
  await ensureDir(defaultProjectPath);

  const existing = await loadConfigFile(configPath);
  const now = new Date().toISOString();
  let nextConfig: AppConfig;

  if (existing) {
    nextConfig = {
      ...existing,
      hasSeenBootstrapNotice: existing.hasSeenBootstrapNotice ?? false,
      updatedAt: now,
    };
  } else {
    nextConfig = {
      version: '1.0.0',
      lastProjectPath: defaultProjectPath,
      hasSeenBootstrapNotice: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  if (nextConfig.lastProjectPath) {
    const pathExists = await exists(nextConfig.lastProjectPath);
    if (!pathExists) {
      nextConfig.lastProjectPath = defaultProjectPath;
    }
  } else {
    nextConfig.lastProjectPath = defaultProjectPath;
  }

  await saveConfigFile(configPath, nextConfig);

  return {
    appRoot,
    configPath,
    defaultProjectPath,
    config: nextConfig,
  };
};

export const updateLastProjectPath = async (projectPath: string): Promise<AppConfigInfo> => {
  const info = await ensureAppConfig();
  const now = new Date().toISOString();
  const nextConfig: AppConfig = {
    ...info.config,
    lastProjectPath: projectPath,
    updatedAt: now,
  };
  await saveConfigFile(info.configPath, nextConfig);
  return { ...info, config: nextConfig };
};

export const markBootstrapNoticeSeen = async (): Promise<AppConfigInfo> => {
  const info = await ensureAppConfig();
  if (info.config.hasSeenBootstrapNotice) return info;
  const now = new Date().toISOString();
  const nextConfig: AppConfig = {
    ...info.config,
    hasSeenBootstrapNotice: true,
    updatedAt: now,
  };
  await saveConfigFile(info.configPath, nextConfig);
  return { ...info, config: nextConfig };
};

/**
 * Generate a simple hash from a string for creating unique folder names
 */
const hashString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

/**
 * Get the project-specific data directory inside AppData
 * This avoids using hidden folders (.zenpost) which Tauri blocks
 */
export const getProjectDataDir = async (projectPath: string): Promise<string> => {
  const appData = await appDataDir();
  const projectHash = hashString(projectPath);
  const safeName = projectPath.split('/').pop() || 'default';
  return join(appData, 'projects', `${safeName}_${projectHash}`);
};

/**
 * Get the AppData root directory
 */
export const getAppDataRoot = async (): Promise<string> => {
  return appDataDir();
};
