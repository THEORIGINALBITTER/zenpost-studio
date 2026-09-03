import { loadZenStudioSettings, saveZenStudioSettings, type ZenStudioSettings } from './zenStudioSettingsService';

const SETTINGS_FILENAME = '__zenpost_settings_backup.json';
const CACHED_DOC_ID_KEY = 'zenpost_cloud_settings_doc_id';
const CLOUD_SETTINGS_SYNC_STATUS_KEY = 'zenpost_cloud_settings_sync_status';
const RESTORE_KEYS = [
  'zenpost_zen_studio_settings',
  'zenpost_ai_config',
  'zenpost_editor_settings',
  'zenpost_social_config',
] as const;

type CloudSettingsBackup = {
  _version: 1;
  _exportedAt: string;
  _app: 'ZenPost Studio';
  zenpost_zen_studio_settings?: ZenStudioSettings;
  zenpost_ai_config?: unknown;
  zenpost_editor_settings?: unknown;
  zenpost_social_config?: unknown;
};

export type CloudSettingsSyncStatus = {
  timestamp: string;
  source: 'manual-save' | 'manual-load' | 'auto-load';
  result: 'success' | 'empty' | 'error';
  message: string;
};

export const getCloudSettingsSyncStatus = (): CloudSettingsSyncStatus | null => {
  try {
    const raw = localStorage.getItem(CLOUD_SETTINGS_SYNC_STATUS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CloudSettingsSyncStatus;
    if (!parsed?.timestamp || !parsed?.source || !parsed?.result) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const setCloudSettingsSyncStatus = (status: CloudSettingsSyncStatus): void => {
  try {
    localStorage.setItem(CLOUD_SETTINGS_SYNC_STATUS_KEY, JSON.stringify(status));
    window.dispatchEvent(new CustomEvent('zenpost:cloud-settings-sync-status', { detail: status }));
  } catch {
    /* ignore */
  }
};

const getAuth = (): { baseUrl: string; token: string; projectId: number } | null => {
  const settings = loadZenStudioSettings();
  const token = settings.cloudAuthToken;
  const projectId = settings.cloudProjectId;
  const baseUrl = (settings.cloudApiBaseUrl ?? 'https://denisbitter.de/stage02/api').trim().replace(/\/+$/, '');
  if (!token || !projectId || !baseUrl) return null;
  return { baseUrl, token, projectId };
};

const getCachedDocId = (): number | null => {
  try {
    const raw = localStorage.getItem(CACHED_DOC_ID_KEY);
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
};

const setCachedDocId = (id: number | null): void => {
  try {
    if (id === null) localStorage.removeItem(CACHED_DOC_ID_KEY);
    else localStorage.setItem(CACHED_DOC_ID_KEY, String(id));
  } catch {
    /* ignore */
  }
};

const buildCloudBackupPayload = (): CloudSettingsBackup => {
  const backup: CloudSettingsBackup = {
    _version: 1,
    _exportedAt: new Date().toISOString(),
    _app: 'ZenPost Studio',
  };

  for (const key of RESTORE_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      (backup as Record<string, unknown>)[key] = JSON.parse(raw);
    } catch {
      (backup as Record<string, unknown>)[key] = raw;
    }
  }

  if (backup.zenpost_zen_studio_settings) {
    backup.zenpost_zen_studio_settings = {
      ...backup.zenpost_zen_studio_settings,
      cloudAuthToken: null,
      cloudUserEmail: null,
    };
  }

  return backup;
};

async function findSettingsDocId(baseUrl: string, token: string, projectId: number): Promise<number | null> {
  try {
    const res = await fetch(`${baseUrl}/documents_list.php?projectId=${projectId}`, {
      headers: { 'X-Auth-Token': token },
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null) as {
      success?: boolean;
      documents?: Array<{ id: number; file_name: string }>;
    } | null;
    if (!json?.success || !Array.isArray(json.documents)) return null;
    const doc = json.documents.find((d) => d.file_name === SETTINGS_FILENAME);
    return doc?.id ?? null;
  } catch {
    return null;
  }
}

export const saveSettingsBackupToCloud = async (): Promise<boolean> => {
  const auth = getAuth();
  if (!auth) return false;
  const { baseUrl, token, projectId } = auth;

  const payload = buildCloudBackupPayload();
  const file = new File([JSON.stringify(payload, null, 2)], SETTINGS_FILENAME, { type: 'application/json' });
  let docId = getCachedDocId();

  if (!docId) docId = await findSettingsDocId(baseUrl, token, projectId);

  if (docId) {
    try {
      const updateForm = new FormData();
      updateForm.append('id', String(docId));
      updateForm.append('file', file);
      const updateRes = await fetch(`${baseUrl}/documents_update.php`, {
        method: 'POST',
        headers: { 'X-Auth-Token': token },
        body: updateForm,
      });
      if (updateRes.ok) {
        const updated = await updateRes.json().catch(() => null) as { success?: boolean } | null;
        if (updated?.success) {
          setCachedDocId(docId);
          return true;
        }
      }
    } catch {
      /* fall through to upload */
    }
  }

  try {
    const uploadForm = new FormData();
    uploadForm.append('projectId', String(projectId));
    uploadForm.append('file', file);
    const uploadRes = await fetch(`${baseUrl}/documents_upload.php`, {
      method: 'POST',
      headers: { 'X-Auth-Token': token },
      body: uploadForm,
    });
    if (!uploadRes.ok) return false;
    const uploaded = await uploadRes.json().catch(() => null) as { success?: boolean; id?: number } | null;
    if (uploaded?.success && uploaded.id) {
      setCachedDocId(uploaded.id);
      return true;
    }
  } catch {
    return false;
  }

  return false;
};

const applyBackup = (backup: CloudSettingsBackup): boolean => {
  let restored = 0;
  const localSettings = loadZenStudioSettings();

  for (const key of RESTORE_KEYS) {
    const value = backup[key];
    if (value === undefined) continue;
    if (key === 'zenpost_zen_studio_settings') {
      const cloudSettings = (value as ZenStudioSettings);
      saveZenStudioSettings({
        ...localSettings,
        ...cloudSettings,
        cloudAuthToken: localSettings.cloudAuthToken,
        cloudUserEmail: localSettings.cloudUserEmail,
        cloudProjectId: localSettings.cloudProjectId,
        cloudProjectName: localSettings.cloudProjectName,
        cloudApiBaseUrl: localSettings.cloudApiBaseUrl,
      });
      restored++;
      continue;
    }
    localStorage.setItem(key, JSON.stringify(value));
    restored++;
  }

  if (restored > 0) {
    window.dispatchEvent(new CustomEvent('zenpost:settings-restored', { detail: { source: 'cloud' } }));
    return true;
  }
  return false;
};

export const loadSettingsBackupFromCloud = async (): Promise<boolean> => {
  const auth = getAuth();
  if (!auth) return false;
  const { baseUrl, token, projectId } = auth;

  let docId = getCachedDocId();
  if (!docId) {
    docId = await findSettingsDocId(baseUrl, token, projectId);
    if (docId) setCachedDocId(docId);
  }
  if (!docId) return false;

  try {
    const res = await fetch(`${baseUrl}/documents_download.php?id=${docId}`, {
      headers: { 'X-Auth-Token': token },
    });
    if (!res.ok) {
      setCachedDocId(null);
      return false;
    }
    const text = await res.text().catch(() => '');
    if (!text) return false;
    const parsed = JSON.parse(text) as CloudSettingsBackup;
    if (!parsed || parsed._app !== 'ZenPost Studio') return false;
    return applyBackup(parsed);
  } catch {
    return false;
  }
};
