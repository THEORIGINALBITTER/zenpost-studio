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

export interface BlogConfig {
  id: string;
  name: string;
  tagline?: string;
  author?: string;
  path: string;
  siteUrl?: string;
  // Deployment
  deployType?: 'none' | 'git' | 'ftp' | 'php-api';
  gitAutoPush?: boolean;
  ftpHost?: string;
  ftpUser?: string;
  ftpPassword?: string;
  ftpRemotePath?: string; // z.B. /public_html/blog/posts/
  ftpProtocol?: 'ftp' | 'ftps' | 'sftp';
  phpApiUrl?: string;
  phpApiKey?: string;
}

export type NewsletterProvider = 'none' | 'custom-api' | 'php-generator' | 'mailchimp' | 'beehiiv' | 'buttondown';

export interface NewsletterPhpGenConfig {
  emailMethod: 'php-mail' | 'smtp';
  fromEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpEncryption: 'tls' | 'ssl';
  storageMethod: 'json' | 'sqlite' | 'mysql';
  sqlitePath: string;   // für sqlite, z.B. ../data/subscribers.sqlite
  dbHost: string;
  dbName: string;
  dbUser: string;
  dbPass: string;
  apiKey: string;
  siteUrl: string;
  apiBaseUrl: string;
}

export const defaultPhpGenConfig: NewsletterPhpGenConfig = {
  emailMethod: 'php-mail',
  fromEmail: '',
  fromName: '',
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  smtpPass: '',
  smtpEncryption: 'tls',
  storageMethod: 'mysql',
  sqlitePath: '../data/subscribers.sqlite',
  dbHost: 'localhost',
  dbName: '',
  dbUser: '',
  dbPass: '',
  apiKey: '',
  siteUrl: '',
  apiBaseUrl: '',
};

export interface NewsletterConfig {
  enabled: boolean;
  provider: NewsletterProvider;
  apiUrl: string;       // custom-api / php-generator: notify endpoint
  apiKey: string;       // custom-api & mailchimp & beehiiv & buttondown
  audienceId: string;   // mailchimp list id
  wizardStep: number;   // 0=choose, 1=configure, 2=done
  phpGen: NewsletterPhpGenConfig;
}

export const defaultNewsletterConfig: NewsletterConfig = {
  enabled: false,
  provider: 'none',
  apiUrl: '',
  apiKey: '',
  audienceId: '',
  wizardStep: 0,
  phpGen: { ...defaultPhpGenConfig },
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
  zenpostmobilPath: string | null;
  blogs: BlogConfig[];
  newsletter: NewsletterConfig;
}

export const defaultZenStudioSettings: ZenStudioSettings = {
  showInGettingStarted: false,
  showInDocStudio: true,
  showInContentAIStudio: true,
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
  zenpostmobilPath: null,
  blogs: [],
  newsletter: { ...defaultNewsletterConfig },
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
      zenpostmobilPath: typeof parsed.zenpostmobilPath === 'string' && parsed.zenpostmobilPath.trim().length > 0
        ? parsed.zenpostmobilPath.trim()
        : null,
      blogs: (() => {
        if (Array.isArray(parsed.blogs) && parsed.blogs.length > 0) {
          return (parsed.blogs as Partial<BlogConfig>[])
            .filter((b) => typeof b.id === 'string' && typeof b.name === 'string' && typeof b.path === 'string')
            .map((b) => ({
              id: b.id!,
              name: b.name!,
              tagline: typeof b.tagline === 'string' && b.tagline.trim() ? b.tagline.trim() : undefined,
              author: typeof b.author === 'string' && b.author.trim() ? b.author.trim() : undefined,
              path: b.path!,
              siteUrl: typeof b.siteUrl === 'string' && b.siteUrl.trim() ? b.siteUrl.trim() : undefined,
              deployType: b.deployType,
              gitAutoPush: b.gitAutoPush,
              ftpHost: typeof b.ftpHost === 'string' && b.ftpHost.trim() ? b.ftpHost.trim() : undefined,
              ftpUser: typeof b.ftpUser === 'string' && b.ftpUser.trim() ? b.ftpUser.trim() : undefined,
              ftpPassword: typeof b.ftpPassword === 'string' && b.ftpPassword.trim() ? b.ftpPassword.trim() : undefined,
              ftpRemotePath: typeof b.ftpRemotePath === 'string' && b.ftpRemotePath.trim() ? b.ftpRemotePath.trim() : undefined,
              ftpProtocol: b.ftpProtocol,
              phpApiUrl: typeof b.phpApiUrl === 'string' && b.phpApiUrl.trim() ? b.phpApiUrl.trim() : undefined,
              phpApiKey: typeof b.phpApiKey === 'string' && b.phpApiKey.trim() ? b.phpApiKey.trim() : undefined,
            }));
        }
        // Migration: promote legacy zenpostmobilPath to first blog entry
        const legacyPath = typeof parsed.zenpostmobilPath === 'string' && parsed.zenpostmobilPath.trim().length > 0
          ? parsed.zenpostmobilPath.trim() : null;
        return legacyPath ? [{ id: 'zenpostmobil', name: 'zenpostmobil', path: legacyPath, siteUrl: 'https://zenpostmobil.denisbitter.de' }] : [];
      })(),
      newsletter: (() => {
        const n = parsed.newsletter as Partial<NewsletterConfig> | undefined;
        if (!n) return { ...defaultNewsletterConfig };
        const g = (n.phpGen ?? {}) as Partial<NewsletterPhpGenConfig>;
        return {
          enabled:     typeof n.enabled === 'boolean' ? n.enabled : false,
          provider:    (['none','custom-api','php-generator','mailchimp','beehiiv','buttondown'] as NewsletterProvider[]).includes(n.provider as NewsletterProvider) ? n.provider! : 'none',
          apiUrl:      typeof n.apiUrl === 'string' ? n.apiUrl : '',
          apiKey:      typeof n.apiKey === 'string' ? n.apiKey : '',
          audienceId:  typeof n.audienceId === 'string' ? n.audienceId : '',
          wizardStep:  typeof n.wizardStep === 'number' ? n.wizardStep : 0,
          phpGen: {
            emailMethod:    g.emailMethod === 'smtp' ? 'smtp' : 'php-mail',
            fromEmail:      typeof g.fromEmail === 'string' ? g.fromEmail : '',
            fromName:       typeof g.fromName === 'string' ? g.fromName : '',
            smtpHost:       typeof g.smtpHost === 'string' ? g.smtpHost : '',
            smtpPort:       typeof g.smtpPort === 'string' ? g.smtpPort : '587',
            smtpUser:       typeof g.smtpUser === 'string' ? g.smtpUser : '',
            smtpPass:       typeof g.smtpPass === 'string' ? g.smtpPass : '',
            smtpEncryption: g.smtpEncryption === 'ssl' ? 'ssl' : 'tls',
            storageMethod:  (['json','sqlite','mysql'] as const).includes(g.storageMethod as 'json'|'sqlite'|'mysql') ? g.storageMethod as 'json'|'sqlite'|'mysql' : 'mysql',
            sqlitePath:     typeof g.sqlitePath === 'string' && g.sqlitePath.trim() ? g.sqlitePath.trim() : '../data/subscribers.sqlite',
            dbHost:         typeof g.dbHost === 'string' ? g.dbHost : 'localhost',
            dbName:         typeof g.dbName === 'string' ? g.dbName : '',
            dbUser:         typeof g.dbUser === 'string' ? g.dbUser : '',
            dbPass:         typeof g.dbPass === 'string' ? g.dbPass : '',
            apiKey:         typeof g.apiKey === 'string' ? g.apiKey : '',
            siteUrl:        typeof g.siteUrl === 'string' ? g.siteUrl : '',
            apiBaseUrl:     typeof g.apiBaseUrl === 'string' ? g.apiBaseUrl : '',
          },
        };
      })(),
    };
  } catch {
    return { ...defaultZenStudioSettings };
  }
};

export const saveZenStudioSettings = (settings: ZenStudioSettings): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ZEN_STUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('zen-studio-settings-updated', { detail: settings }));
  // Tauri: auch in Datei persistieren (silent, background)
  void persistSettingsToFile(settings);
};

// ─── Datei-Persistenz (Tauri only) ───────────────────────────────────────────

const SETTINGS_FILE_NAME = 'studio-settings.json';

const getSettingsFilePath = async (): Promise<string> => {
  const { appDataDir } = await import('@tauri-apps/api/path');
  return `${await appDataDir()}/${SETTINGS_FILE_NAME}`;
};

const persistSettingsToFile = async (settings: ZenStudioSettings): Promise<void> => {
  try {
    const { isTauri } = await import('@tauri-apps/api/core');
    if (!isTauri()) return;
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    const filePath = await getSettingsFilePath();
    await writeTextFile(filePath, JSON.stringify(settings, null, 2));
  } catch {
    // Fehler still ignorieren — localStorage bleibt Fallback
  }
};

/** Beim App-Start aufrufen: lädt Datei → synchronisiert localStorage */
export const initZenStudioSettings = async (): Promise<void> => {
  try {
    const { isTauri } = await import('@tauri-apps/api/core');
    if (!isTauri()) return;
    const { exists, readTextFile } = await import('@tauri-apps/plugin-fs');
    const filePath = await getSettingsFilePath();
    if (!(await exists(filePath))) return;
    const raw = await readTextFile(filePath);
    const parsed = JSON.parse(raw) as Partial<ZenStudioSettings>;
    // In localStorage schreiben damit loadZenStudioSettings() sofort den richtigen Wert hat
    if (typeof window !== 'undefined') {
      localStorage.setItem(ZEN_STUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(parsed));
      window.dispatchEvent(new CustomEvent('zen-studio-settings-updated', { detail: { ...defaultZenStudioSettings, ...parsed } }));
    }
  } catch {
    // Datei nicht lesbar → localStorage bleibt wie er ist
  }
};

// ─── Export / Import ──────────────────────────────────────────────────────────

/** Config als JSON-Datei herunterladen (Browser download) */
export const exportZenStudioSettingsAsFile = (): void => {
  const settings = loadZenStudioSettings();
  const json = JSON.stringify(settings, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zenpost-config-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/** JSON-Datei einlesen und als aktive Config setzen */
export const importZenStudioSettingsFromFile = (file: File): Promise<void> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<ZenStudioSettings>;
        const merged: ZenStudioSettings = { ...defaultZenStudioSettings, ...parsed };
        saveZenStudioSettings(merged);
        resolve();
      } catch {
        reject(new Error('Ungültige Konfigurationsdatei.'));
      }
    };
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
    reader.readAsText(file);
  });

/** Alle App-Settings (AI, Editor, Social, Studio) als eine JSON-Datei exportieren */
export const exportAllSettingsAsFile = (): void => {
  const ALL_KEYS = [
    'zenpost_zen_studio_settings',
    'zenpost_ai_config',
    'zenpost_editor_settings',
    'zenpost_social_config',
  ];
  const backup: Record<string, unknown> = {
    _version: 1,
    _exportedAt: new Date().toISOString(),
    _app: 'ZenPost Studio',
  };
  for (const key of ALL_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try { backup[key] = JSON.parse(raw); } catch { backup[key] = raw; }
    }
  }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zenpost-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/** Vollständiges Settings-Backup wiederherstellen */
export const importAllSettingsFromFile = (file: File): Promise<void> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Record<string, unknown>;
        const RESTORABLE_KEYS = [
          'zenpost_zen_studio_settings',
          'zenpost_ai_config',
          'zenpost_editor_settings',
          'zenpost_social_config',
        ];
        let restored = 0;
        for (const key of RESTORABLE_KEYS) {
          if (parsed[key] !== undefined) {
            localStorage.setItem(key, JSON.stringify(parsed[key]));
            restored++;
          }
        }
        if (restored === 0) reject(new Error('Keine gültigen Settings in der Datei gefunden.'));
        else resolve();
      } catch {
        reject(new Error('Ungültige Backup-Datei.'));
      }
    };
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
    reader.readAsText(file);
  });

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
