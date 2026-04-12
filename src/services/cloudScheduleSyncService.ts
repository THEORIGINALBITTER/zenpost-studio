import type { ScheduledPost } from '../types/scheduling';
import { loadScheduleFromCloud } from './cloudScheduleService';

export type CloudScheduleSyncPayload = {
  posts: ScheduledPost[];
};

function serializePosts(posts: ScheduledPost[]): string {
  return JSON.stringify(
    posts.map((post) => ({
      ...post,
      scheduledDate: post.scheduledDate
        ? (post.scheduledDate instanceof Date ? post.scheduledDate.toISOString() : new Date(post.scheduledDate).toISOString())
        : null,
      createdAt: post.createdAt
        ? (post.createdAt instanceof Date ? post.createdAt.toISOString() : new Date(post.createdAt).toISOString())
        : null,
    })),
  );
}

export function subscribeToCloudScheduleSync(
  listener: (payload: CloudScheduleSyncPayload) => void,
  options?: { intervalMs?: number },
): () => void {
  const intervalMs = options?.intervalMs ?? 15000;
  let lastSignature = '';
  let active = true;

  const poll = async () => {
    if (!active) return;
    const posts = await loadScheduleFromCloud();
    if (!posts) return;
    const signature = serializePosts(posts);
    if (signature === lastSignature) return;
    lastSignature = signature;
    listener({ posts });
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
