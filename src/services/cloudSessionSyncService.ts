import { ZEN_STUDIO_SETTINGS_STORAGE_KEY } from '../constants/settingsKeys';
import { loadZenStudioSettings } from './zenStudioSettingsService';

const CLOUD_SCHEDULE_DOC_ID_KEY = 'zenpost_cloud_schedule_doc_id';
const CLOUD_PLANNER_DOC_ID_KEY = 'zenpost_cloud_planner_doc_id';

export type CloudSessionSnapshot = {
  authToken: string | null;
  userEmail: string | null;
  projectId: number | null;
  projectName: string | null;
};

export type CloudSessionChangeReason =
  | 'init'
  | 'login'
  | 'logout'
  | 'project-change'
  | 'focus'
  | 'interval';

export type CloudSessionSyncEvent = {
  reason: CloudSessionChangeReason;
  current: CloudSessionSnapshot;
  previous: CloudSessionSnapshot | null;
};

type CloudSessionListener = (event: CloudSessionSyncEvent) => void;

function getSnapshot(): CloudSessionSnapshot {
  const settings = loadZenStudioSettings();
  return {
    authToken: settings.cloudAuthToken ?? null,
    userEmail: settings.cloudUserEmail ?? null,
    projectId: settings.cloudProjectId ?? null,
    projectName: settings.cloudProjectName ?? null,
  };
}

function serializeSnapshot(snapshot: CloudSessionSnapshot): string {
  return JSON.stringify(snapshot);
}

export function clearCloudSessionCaches(): void {
  try {
    localStorage.removeItem(CLOUD_SCHEDULE_DOC_ID_KEY);
    localStorage.removeItem(CLOUD_PLANNER_DOC_ID_KEY);
  } catch {
    /* ignore */
  }
}

export function subscribeToCloudSessionSync(
  listener: CloudSessionListener,
  options?: { intervalMs?: number },
): () => void {
  const intervalMs = options?.intervalMs ?? 5000;
  let active = true;
  let previous: CloudSessionSnapshot | null = null;
  let lastSignature = '';

  const emitIfChanged = (reason: CloudSessionChangeReason) => {
    if (!active) return;

    const current = getSnapshot();
    const nextSignature = serializeSnapshot(current);
    const changed = nextSignature !== lastSignature;

    if (!changed && reason !== 'focus' && reason !== 'init') return;

    const previousSnapshot = previous;
    previous = current;
    lastSignature = nextSignature;

    if (previousSnapshot) {
      const authChanged = previousSnapshot.authToken !== current.authToken;
      const projectChanged = previousSnapshot.projectId !== current.projectId;
      if (authChanged || projectChanged) {
        clearCloudSessionCaches();
      }
    }

    let effectiveReason: CloudSessionChangeReason = reason;
    if (previousSnapshot) {
      const wasLoggedIn = !!previousSnapshot.authToken;
      const isLoggedIn = !!current.authToken;
      if (!wasLoggedIn && isLoggedIn) effectiveReason = 'login';
      else if (wasLoggedIn && !isLoggedIn) effectiveReason = 'logout';
      else if (previousSnapshot.projectId !== current.projectId) effectiveReason = 'project-change';
    }

    listener({
      reason: effectiveReason,
      current,
      previous: previousSnapshot,
    });
  };

  emitIfChanged('init');

  const intervalId = window.setInterval(() => emitIfChanged('interval'), intervalMs);
  const onFocus = () => emitIfChanged('focus');
  const onStorage = (event: StorageEvent) => {
    if (event.key && event.key !== ZEN_STUDIO_SETTINGS_STORAGE_KEY) return;
    emitIfChanged('interval');
  };

  window.addEventListener('focus', onFocus);
  window.addEventListener('storage', onStorage);
  document.addEventListener('visibilitychange', onFocus);

  return () => {
    active = false;
    window.clearInterval(intervalId);
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', onFocus);
  };
}
