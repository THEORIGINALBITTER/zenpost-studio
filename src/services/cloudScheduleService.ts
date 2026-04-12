/**
 * Cloud Schedule Service
 * Syncs scheduled posts to/from ZenCloud using the documents API.
 * Stores schedule as a special JSON document named __zenpost_schedule.json.
 */

import { loadZenStudioSettings } from './zenStudioSettingsService';
import type { ScheduledPost } from '../types/scheduling';

const SCHEDULE_FILENAME = '__zenpost_schedule.json';
const CACHED_DOC_ID_KEY = 'zenpost_cloud_schedule_doc_id';

const getAuth = (): { baseUrl: string; token: string; projectId: number } | null => {
  const settings = loadZenStudioSettings();
  const token = settings.cloudAuthToken;
  const projectId = settings.cloudProjectId;
  const baseUrl = (settings.cloudApiBaseUrl ?? 'https://denisbitter.de/stage02/api').trim().replace(/\/+$/, '');
  if (!token || !projectId || !baseUrl) return null;
  return { baseUrl, token, projectId };
};

export const isCloudLoggedIn = (): boolean => !!getAuth();

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

const setCachedDocId = (id: number | null) => {
  try {
    if (id === null) localStorage.removeItem(CACHED_DOC_ID_KEY);
    else localStorage.setItem(CACHED_DOC_ID_KEY, String(id));
  } catch { /* ignore */ }
};

/** Find existing schedule document in the cloud project (by filename). */
async function findScheduleDocId(baseUrl: string, token: string, projectId: number): Promise<number | null> {
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
    const doc = json.documents.find((d) => d.file_name === SCHEDULE_FILENAME);
    return doc?.id ?? null;
  } catch {
    return null;
  }
}

/** Save scheduled posts to ZenCloud. Returns true on success. */
export async function saveScheduleToCloud(posts: ScheduledPost[]): Promise<boolean> {
  const auth = getAuth();
  if (!auth) return false;
  const { baseUrl, token, projectId } = auth;

  const json = JSON.stringify(posts, null, 2);
  const file = new File([json], SCHEDULE_FILENAME, { type: 'application/json' });

  let docId = getCachedDocId();

  // Try update first if we have a cached doc ID
  if (docId) {
    try {
      const form = new FormData();
      form.append('id', String(docId));
      form.append('file', file);
      const res = await fetch(`${baseUrl}/documents_update.php`, {
        method: 'POST',
        headers: { 'X-Auth-Token': token },
        body: form,
      });
      if (res.ok) {
        const result = await res.json().catch(() => null) as { success?: boolean } | null;
        if (result?.success) return true;
      }
      // If update failed, doc may no longer exist — clear cache and fall through to upload
      setCachedDocId(null);
      docId = null;
    } catch { /* fall through */ }
  }

  // No cached ID — search by filename
  if (!docId) {
    docId = await findScheduleDocId(baseUrl, token, projectId);
  }

  if (docId) {
    // Found existing doc — update it
    try {
      const form = new FormData();
      form.append('id', String(docId));
      form.append('file', file);
      const res = await fetch(`${baseUrl}/documents_update.php`, {
        method: 'POST',
        headers: { 'X-Auth-Token': token },
        body: form,
      });
      if (res.ok) {
        const result = await res.json().catch(() => null) as { success?: boolean } | null;
        if (result?.success) {
          setCachedDocId(docId);
          return true;
        }
      }
    } catch { /* fall through to upload */ }
  }

  // Upload as new document
  try {
    const form = new FormData();
    form.append('projectId', String(projectId));
    form.append('file', file);
    const res = await fetch(`${baseUrl}/documents_upload.php`, {
      method: 'POST',
      headers: { 'X-Auth-Token': token },
      body: form,
    });
    if (!res.ok) return false;
    const result = await res.json().catch(() => null) as { success?: boolean; id?: number } | null;
    if (result?.success && result.id) {
      setCachedDocId(result.id);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Load scheduled posts from ZenCloud. Returns null if not logged in or not found. */
export async function loadScheduleFromCloud(): Promise<ScheduledPost[] | null> {
  const auth = getAuth();
  if (!auth) return null;
  const { baseUrl, token, projectId } = auth;

  let docId = getCachedDocId();

  if (!docId) {
    docId = await findScheduleDocId(baseUrl, token, projectId);
    if (docId) setCachedDocId(docId);
  }

  if (!docId) return null;

  try {
    const res = await fetch(`${baseUrl}/documents_download.php?id=${docId}`, {
      headers: { 'X-Auth-Token': token },
    });
    if (!res.ok) {
      // Doc may no longer exist
      setCachedDocId(null);
      return null;
    }
    const text = await res.text().catch(() => null);
    if (!text) return null;
    const posts = JSON.parse(text) as ScheduledPost[];
    return Array.isArray(posts) ? posts : null;
  } catch {
    return null;
  }
}
