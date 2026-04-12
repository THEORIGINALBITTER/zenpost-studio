import { loadPlannerFromCloud } from './cloudPlannerService';
import type { PlannerStorage } from '../kits/PatternKit/ZenModalSystem/modals/plannerTypes';

export type CloudPlannerSyncPayload = {
  planner: PlannerStorage;
};

function serializePlanner(planner: PlannerStorage): string {
  return JSON.stringify({
    updatedAt: planner.updatedAt,
    manualPosts: planner.manualPosts,
    schedules: planner.schedules,
    checklistItems: planner.checklistItems,
  });
}

export function subscribeToCloudPlannerSync(
  listener: (payload: CloudPlannerSyncPayload) => void,
  options?: { intervalMs?: number },
): () => void {
  const intervalMs = options?.intervalMs ?? 15000;
  let lastSignature = '';
  let active = true;

  const poll = async () => {
    if (!active) return;
    const planner = await loadPlannerFromCloud();
    if (!planner) return;
    const signature = serializePlanner(planner);
    if (signature === lastSignature) return;
    lastSignature = signature;
    listener({ planner });
  };

  void poll();
  const intervalId = window.setInterval(() => { void poll(); }, intervalMs);
  const onFocus = () => { void poll(); };
  const onVisibility = () => {
    if (document.visibilityState === 'visible') void poll();
  };
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    active = false;
    window.clearInterval(intervalId);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
