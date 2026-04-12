import type { PlannerStorage } from '../kits/PatternKit/ZenModalSystem/modals/plannerTypes';
import type { ScheduledPost } from '../types/scheduling';
import {
  loadPlannerBootstrapState,
  type PlannerBootstrapSource,
  type PlannerBootstrapState,
} from './plannerBootstrapService';

export type PlannerCloudBridgeState = PlannerBootstrapState;

type PlannerCloudBridgeListener = (state: PlannerCloudBridgeState) => void;

function serializePosts(posts: ScheduledPost[]): string {
  return JSON.stringify(
    posts.map((post) => ({
      ...post,
      scheduledDate: post.scheduledDate
        ? (post.scheduledDate instanceof Date
            ? post.scheduledDate.toISOString()
            : new Date(post.scheduledDate).toISOString())
        : null,
      createdAt: post.createdAt
        ? (post.createdAt instanceof Date
            ? post.createdAt.toISOString()
            : new Date(post.createdAt).toISOString())
        : null,
    })),
  );
}

function serializePlanner(planner: PlannerStorage | null): string {
  if (!planner) return 'null';
  return JSON.stringify({
    updatedAt: planner.updatedAt,
    manualPosts: planner.manualPosts,
    schedules: planner.schedules,
    checklistItems: planner.checklistItems,
  });
}

function serializeState(state: PlannerCloudBridgeState): string {
  return JSON.stringify({
    source: state.source,
    posts: serializePosts(state.posts),
    planner: serializePlanner(state.planner),
  });
}

export async function loadPlannerCloudBridgeState(
  projectPath?: string | null,
): Promise<PlannerCloudBridgeState> {
  return loadPlannerBootstrapState(projectPath);
}

export function subscribeToPlannerCloudBridge(
  listener: PlannerCloudBridgeListener,
  options?: { intervalMs?: number; projectPath?: string | null; includeLocal?: boolean },
): () => void {
  const intervalMs = options?.intervalMs ?? 15000;
  let active = true;
  let projectPath = options?.projectPath ?? null;
  let lastSignature = '';

  const emit = async () => {
    if (!active) return;
    const nextState = await loadPlannerCloudBridgeState(projectPath);
    if (!options?.includeLocal && nextState.source !== 'cloud') return;
    const signature = serializeState(nextState);
    if (signature === lastSignature) return;
    lastSignature = signature;
    listener(nextState);
  };

  void emit();

  const intervalId = window.setInterval(() => { void emit(); }, intervalMs);
  const onFocus = () => { void emit(); };
  const onVisibility = () => {
    if (document.visibilityState === 'visible') void emit();
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

export function getPlannerBridgeSourceLabel(source: PlannerBootstrapSource): string {
  if (source === 'cloud') return 'cloud';
  if (source === 'local') return 'local';
  return 'empty';
}
