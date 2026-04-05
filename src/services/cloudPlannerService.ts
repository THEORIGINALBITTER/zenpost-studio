/**
 * Cloud Planner Service
 * Syncs the global planner (manualPosts, schedules, checklistItems) to/from ZenCloud.
 * One single document per user: __zenpost_planner.json
 *
 * Prerequisite: user must be logged into ZenCloud (cloudAuthToken + cloudProjectId set).
 */

import { loadZenStudioSettings } from './zenStudioSettingsService';
import type { PlannerPost, PlannerStorage, ScheduleMap } from '../kits/PatternKit/ZenModalSystem/modals/plannerTypes';
import type { ChecklistItem } from '../utils/checklistStorage';

const PLANNER_FILENAME = '__zenpost_planner.json';
const CACHED_DOC_ID_KEY = 'zenpost_cloud_planner_doc_id';

const getAuth = (): { baseUrl: string; token: string; projectId: number } | null => {
  const settings = loadZenStudioSettings();
  const token = settings.cloudAuthToken;
  const projectId = settings.cloudProjectId;
  const baseUrl = (settings.cloudApiBaseUrl ?? 'https://denisbitter.de/stage02/api').trim().replace(/\/+$/, '');
  if (!token || !projectId || !baseUrl) return null;
  return { baseUrl, token, projectId };
};

export const isCloudPlannerAvailable = (): boolean => !!getAuth();

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

async function findPlannerDocId(baseUrl: string, token: string, projectId: number): Promise<number | null> {
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
    const doc = json.documents.find((d) => d.file_name === PLANNER_FILENAME);
    return doc?.id ?? null;
  } catch {
    return null;
  }
}

/** Save planner data to ZenCloud. Returns true on success. */
export async function savePlannerToCloud(
  manualPosts: PlannerPost[],
  schedules: ScheduleMap,
  checklistItems: ChecklistItem[],
): Promise<boolean> {
  const auth = getAuth();
  if (!auth) return false;
  const { baseUrl, token, projectId } = auth;

  const payload: PlannerStorage = {
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    manualPosts,
    schedules,
    checklistItems,
  };

  const file = new File(
    [JSON.stringify(payload, null, 2)],
    PLANNER_FILENAME,
    { type: 'application/json' },
  );

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
      // Update failed — doc may no longer exist
      setCachedDocId(null);
      docId = null;
    } catch { /* fall through */ }
  }

  // Search by filename
  if (!docId) {
    docId = await findPlannerDocId(baseUrl, token, projectId);
  }

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

/** Load planner data from ZenCloud. Returns null if not logged in or not found. */
export async function loadPlannerFromCloud(): Promise<PlannerStorage | null> {
  const auth = getAuth();
  if (!auth) return null;
  const { baseUrl, token, projectId } = auth;

  let docId = getCachedDocId();

  if (!docId) {
    docId = await findPlannerDocId(baseUrl, token, projectId);
    if (docId) setCachedDocId(docId);
  }

  if (!docId) return null;

  try {
    const res = await fetch(`${baseUrl}/documents_download.php?id=${docId}`, {
      headers: { 'X-Auth-Token': token },
    });
    if (!res.ok) {
      setCachedDocId(null);
      return null;
    }
    const text = await res.text().catch(() => null);
    if (!text) return null;
    const parsed = JSON.parse(text) as Partial<PlannerStorage>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      version: '1.0.0',
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      manualPosts: Array.isArray(parsed.manualPosts) ? parsed.manualPosts : [],
      schedules: (parsed.schedules && typeof parsed.schedules === 'object') ? parsed.schedules : {},
      checklistItems: Array.isArray(parsed.checklistItems) ? parsed.checklistItems : [],
    };
  } catch {
    return null;
  }
}
