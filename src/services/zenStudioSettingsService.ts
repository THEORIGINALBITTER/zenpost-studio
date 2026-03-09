import defaultZenThoughts from '../data/zenThoughts.json';
import { ZEN_STUDIO_SETTINGS_STORAGE_KEY } from '../constants/settingsKeys';

export interface ServerConfig {
  name: string;
  contentServerApiUrl: string | null;
  contentServerApiKey: string | null;
  contentServerLocalCachePath: string | null;
  contentServerApiEndpoint: string;
  contentServerImageUploadEndpoint: string;
  contentServerPingEndpoint: string;
  contentServerListEndpoint: string;
  contentServerDeleteEndpoint: string;
  contentServerImageBaseUrl: string | null;
}

const defaultServerConfig: ServerConfig = {
  name: 'Server A',
  contentServerApiUrl: null,
  contentServerApiKey: null,
  contentServerLocalCachePath: null,
  contentServerApiEndpoint: '/save_articles.php',
  contentServerImageUploadEndpoint: '/upload_images.php',
  contentServerPingEndpoint: '/ping.php',
  contentServerListEndpoint: '/articles.php',
  contentServerDeleteEndpoint: '/delete_articles.php',
  contentServerImageBaseUrl: null,
};

export interface ZenStudioSettings {
  showInGettingStarted: boolean;
  showInDocStudio: boolean;
  showInContentAIStudio: boolean;
  thoughts: string[];
  thoughtsFilePath: string | null;
  contentServerApiUrl: string | null;
  contentServerApiKey: string | null;
  contentServerLocalCachePath: string | null;
  contentServerApiEndpoint: string;
  contentServerImageUploadEndpoint: string;
  contentServerPingEndpoint: string;
  contentServerListEndpoint: string;
  contentServerDeleteEndpoint: string;
  contentServerImageBaseUrl: string | null;
  servers: ServerConfig[];
  activeServerIndex: number;
}

export const defaultZenStudioSettings: ZenStudioSettings = {
  showInGettingStarted: true,
  showInDocStudio: false,
  showInContentAIStudio: false,
  thoughts: [...defaultZenThoughts],
  thoughtsFilePath: null,
  contentServerApiUrl: null,
  contentServerApiKey: null,
  contentServerLocalCachePath: null,
  contentServerApiEndpoint: '/save_articles.php',
  contentServerImageUploadEndpoint: '/upload_images.php',
  contentServerPingEndpoint: '/ping.php',
  contentServerListEndpoint: '/articles.php',
  contentServerDeleteEndpoint: '/delete_articles.php',
  contentServerImageBaseUrl: null,
  servers: [{ ...defaultServerConfig }],
  activeServerIndex: 0,
};

export const loadZenStudioSettings = (): ZenStudioSettings => {
  if (typeof window === 'undefined') return { ...defaultZenStudioSettings };
  const raw = localStorage.getItem(ZEN_STUDIO_SETTINGS_STORAGE_KEY);
  if (!raw) return { ...defaultZenStudioSettings };
  try {
    const parsed = JSON.parse(raw) as Partial<ZenStudioSettings>;
    return {
      ...defaultZenStudioSettings,
      ...parsed,
      thoughts:
        Array.isArray(parsed.thoughts) && parsed.thoughts.length > 0
          ? parsed.thoughts.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          : [...defaultZenStudioSettings.thoughts],
      thoughtsFilePath: typeof parsed.thoughtsFilePath === 'string' && parsed.thoughtsFilePath.trim().length > 0
        ? parsed.thoughtsFilePath.trim()
        : null,
      contentServerApiUrl:
        typeof parsed.contentServerApiUrl === 'string' && parsed.contentServerApiUrl.trim().length > 0
          ? parsed.contentServerApiUrl.trim()
          : null,
      contentServerApiKey:
        typeof parsed.contentServerApiKey === 'string' && parsed.contentServerApiKey.trim().length > 0
          ? parsed.contentServerApiKey.trim()
          : null,
      contentServerLocalCachePath:
        typeof parsed.contentServerLocalCachePath === 'string' && parsed.contentServerLocalCachePath.trim().length > 0
          ? parsed.contentServerLocalCachePath.trim()
          : null,
      contentServerApiEndpoint:
        typeof parsed.contentServerApiEndpoint === 'string' && parsed.contentServerApiEndpoint.trim().length > 0
          ? parsed.contentServerApiEndpoint.trim()
          : defaultZenStudioSettings.contentServerApiEndpoint,
      contentServerImageUploadEndpoint:
        typeof parsed.contentServerImageUploadEndpoint === 'string' && parsed.contentServerImageUploadEndpoint.trim().length > 0
          ? parsed.contentServerImageUploadEndpoint.trim()
          : defaultZenStudioSettings.contentServerImageUploadEndpoint,
      contentServerPingEndpoint:
        typeof parsed.contentServerPingEndpoint === 'string' && parsed.contentServerPingEndpoint.trim().length > 0
          ? parsed.contentServerPingEndpoint.trim()
          : defaultZenStudioSettings.contentServerPingEndpoint,
      contentServerListEndpoint:
        typeof parsed.contentServerListEndpoint === 'string' && parsed.contentServerListEndpoint.trim().length > 0
          ? parsed.contentServerListEndpoint.trim()
          : defaultZenStudioSettings.contentServerListEndpoint,
      contentServerDeleteEndpoint:
        typeof parsed.contentServerDeleteEndpoint === 'string' && parsed.contentServerDeleteEndpoint.trim().length > 0
          ? parsed.contentServerDeleteEndpoint.trim()
          : defaultZenStudioSettings.contentServerDeleteEndpoint,
      contentServerImageBaseUrl:
        typeof parsed.contentServerImageBaseUrl === 'string' && parsed.contentServerImageBaseUrl.trim().length > 0
          ? parsed.contentServerImageBaseUrl.trim()
          : null,
      servers: (() => {
        if (Array.isArray(parsed.servers) && parsed.servers.length > 0) {
          return (parsed.servers as Partial<ServerConfig>[]).map((s) => ({
            name: typeof s.name === 'string' && s.name.trim().length > 0 ? s.name.trim() : 'Server',
            contentServerApiUrl: typeof s.contentServerApiUrl === 'string' && s.contentServerApiUrl.trim().length > 0 ? s.contentServerApiUrl.trim() : null,
            contentServerApiKey: typeof s.contentServerApiKey === 'string' && s.contentServerApiKey.trim().length > 0 ? s.contentServerApiKey.trim() : null,
            contentServerLocalCachePath: typeof s.contentServerLocalCachePath === 'string' && s.contentServerLocalCachePath.trim().length > 0 ? s.contentServerLocalCachePath.trim() : null,
            contentServerApiEndpoint: typeof s.contentServerApiEndpoint === 'string' && s.contentServerApiEndpoint.trim().length > 0 ? s.contentServerApiEndpoint.trim() : defaultServerConfig.contentServerApiEndpoint,
            contentServerImageUploadEndpoint: typeof s.contentServerImageUploadEndpoint === 'string' && s.contentServerImageUploadEndpoint.trim().length > 0 ? s.contentServerImageUploadEndpoint.trim() : defaultServerConfig.contentServerImageUploadEndpoint,
            contentServerPingEndpoint: typeof s.contentServerPingEndpoint === 'string' && s.contentServerPingEndpoint.trim().length > 0 ? s.contentServerPingEndpoint.trim() : defaultServerConfig.contentServerPingEndpoint,
            contentServerListEndpoint: typeof s.contentServerListEndpoint === 'string' && s.contentServerListEndpoint.trim().length > 0 ? s.contentServerListEndpoint.trim() : defaultServerConfig.contentServerListEndpoint,
            contentServerDeleteEndpoint: typeof s.contentServerDeleteEndpoint === 'string' && s.contentServerDeleteEndpoint.trim().length > 0 ? s.contentServerDeleteEndpoint.trim() : defaultServerConfig.contentServerDeleteEndpoint,
            contentServerImageBaseUrl: typeof s.contentServerImageBaseUrl === 'string' && s.contentServerImageBaseUrl.trim().length > 0 ? s.contentServerImageBaseUrl.trim() : null,
          }));
        }
        // Migration: build Server A from existing flat fields
        const flatUrl = typeof parsed.contentServerApiUrl === 'string' && parsed.contentServerApiUrl.trim().length > 0 ? parsed.contentServerApiUrl.trim() : null;
        const flatKey = typeof parsed.contentServerApiKey === 'string' && parsed.contentServerApiKey.trim().length > 0 ? parsed.contentServerApiKey.trim() : null;
        const flatCachePath = typeof parsed.contentServerLocalCachePath === 'string' && parsed.contentServerLocalCachePath.trim().length > 0 ? parsed.contentServerLocalCachePath.trim() : null;
        const flatEndpoint = typeof parsed.contentServerApiEndpoint === 'string' && parsed.contentServerApiEndpoint.trim().length > 0 ? parsed.contentServerApiEndpoint.trim() : defaultServerConfig.contentServerApiEndpoint;
        const flatUpload = typeof parsed.contentServerImageUploadEndpoint === 'string' && parsed.contentServerImageUploadEndpoint.trim().length > 0 ? parsed.contentServerImageUploadEndpoint.trim() : defaultServerConfig.contentServerImageUploadEndpoint;
        const flatPing = typeof parsed.contentServerPingEndpoint === 'string' && parsed.contentServerPingEndpoint.trim().length > 0 ? parsed.contentServerPingEndpoint.trim() : defaultServerConfig.contentServerPingEndpoint;
        const flatList = typeof parsed.contentServerListEndpoint === 'string' && parsed.contentServerListEndpoint.trim().length > 0 ? parsed.contentServerListEndpoint.trim() : defaultServerConfig.contentServerListEndpoint;
        const flatDelete = typeof parsed.contentServerDeleteEndpoint === 'string' && parsed.contentServerDeleteEndpoint.trim().length > 0 ? parsed.contentServerDeleteEndpoint.trim() : defaultServerConfig.contentServerDeleteEndpoint;
        const flatImageBase = typeof parsed.contentServerImageBaseUrl === 'string' && parsed.contentServerImageBaseUrl.trim().length > 0 ? parsed.contentServerImageBaseUrl.trim() : null;
        return [{ name: 'Server A', contentServerApiUrl: flatUrl, contentServerApiKey: flatKey, contentServerLocalCachePath: flatCachePath, contentServerApiEndpoint: flatEndpoint, contentServerImageUploadEndpoint: flatUpload, contentServerPingEndpoint: flatPing, contentServerListEndpoint: flatList, contentServerDeleteEndpoint: flatDelete, contentServerImageBaseUrl: flatImageBase }];
      })(),
      activeServerIndex: typeof parsed.activeServerIndex === 'number' && parsed.activeServerIndex >= 0 ? parsed.activeServerIndex : 0,
    };
  } catch {
    return { ...defaultZenStudioSettings };
  }
};

export const saveZenStudioSettings = (settings: ZenStudioSettings): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ZEN_STUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('zen-studio-settings-updated', { detail: settings }));
};

export const patchZenStudioSettings = (patch: Partial<ZenStudioSettings>): ZenStudioSettings => {
  const current = loadZenStudioSettings();
  const next: ZenStudioSettings = {
    ...current,
    ...patch,
    thoughts:
      Array.isArray(patch.thoughts) && patch.thoughts.length > 0
        ? patch.thoughts.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : current.thoughts,
    thoughtsFilePath:
      typeof patch.thoughtsFilePath === 'string'
        ? (patch.thoughtsFilePath.trim().length > 0 ? patch.thoughtsFilePath.trim() : null)
        : current.thoughtsFilePath,
    contentServerApiUrl:
      typeof patch.contentServerApiUrl === 'string'
        ? (patch.contentServerApiUrl.trim().length > 0 ? patch.contentServerApiUrl.trim() : null)
        : current.contentServerApiUrl,
    contentServerApiKey:
      typeof patch.contentServerApiKey === 'string'
        ? (patch.contentServerApiKey.trim().length > 0 ? patch.contentServerApiKey.trim() : null)
        : current.contentServerApiKey,
    contentServerLocalCachePath:
      typeof patch.contentServerLocalCachePath === 'string'
        ? (patch.contentServerLocalCachePath.trim().length > 0 ? patch.contentServerLocalCachePath.trim() : null)
        : current.contentServerLocalCachePath,
    contentServerApiEndpoint:
      typeof patch.contentServerApiEndpoint === 'string'
        ? (patch.contentServerApiEndpoint.trim().length > 0 ? patch.contentServerApiEndpoint.trim() : defaultZenStudioSettings.contentServerApiEndpoint)
        : current.contentServerApiEndpoint,
    contentServerImageUploadEndpoint:
      typeof patch.contentServerImageUploadEndpoint === 'string'
        ? (patch.contentServerImageUploadEndpoint.trim().length > 0 ? patch.contentServerImageUploadEndpoint.trim() : defaultZenStudioSettings.contentServerImageUploadEndpoint)
        : current.contentServerImageUploadEndpoint,
    contentServerPingEndpoint:
      typeof patch.contentServerPingEndpoint === 'string'
        ? (patch.contentServerPingEndpoint.trim().length > 0 ? patch.contentServerPingEndpoint.trim() : defaultZenStudioSettings.contentServerPingEndpoint)
        : current.contentServerPingEndpoint,
    contentServerListEndpoint:
      typeof patch.contentServerListEndpoint === 'string'
        ? (patch.contentServerListEndpoint.trim().length > 0 ? patch.contentServerListEndpoint.trim() : defaultZenStudioSettings.contentServerListEndpoint)
        : current.contentServerListEndpoint,
    contentServerDeleteEndpoint:
      typeof patch.contentServerDeleteEndpoint === 'string'
        ? (patch.contentServerDeleteEndpoint.trim().length > 0 ? patch.contentServerDeleteEndpoint.trim() : defaultZenStudioSettings.contentServerDeleteEndpoint)
        : current.contentServerDeleteEndpoint,
    contentServerImageBaseUrl:
      typeof patch.contentServerImageBaseUrl === 'string'
        ? (patch.contentServerImageBaseUrl.trim().length > 0 ? patch.contentServerImageBaseUrl.trim() : null)
        : current.contentServerImageBaseUrl,
    servers: Array.isArray(patch.servers) && patch.servers.length > 0 ? patch.servers : current.servers,
    activeServerIndex: typeof patch.activeServerIndex === 'number' ? patch.activeServerIndex : current.activeServerIndex,
  };
  saveZenStudioSettings(next);
  return next;
};

export const serializeZenThoughtsForEditor = (thoughts: string[]): string =>
  thoughts.map((line) => line.trim()).filter(Boolean).join('\n');

export const parseZenThoughtsFromEditor = (content: string): string[] => {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : [...defaultZenStudioSettings.thoughts];
};
