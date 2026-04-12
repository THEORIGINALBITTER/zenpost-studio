import type { ScheduledPost, SocialPlatform } from '../types/scheduling';

export type PlannerDraftPrefill = {
  requestId: string;
  platform: SocialPlatform;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  content: string;
  date?: string;
  time?: string;
};

export type OpenPlannerWithPostRequest = {
  post?: ScheduledPost;
  focusPostId?: string;
  defaultTab: 'planen' | 'kalender' | 'checklist';
  preSelectedDate?: Date;
  prefilledPlanPost?: PlannerDraftPrefill;
  requestId: string;
};

type OpenPlannerWithPostListener = (request: OpenPlannerWithPostRequest) => void;

const listeners = new Set<OpenPlannerWithPostListener>();

function buildRequestId(): string {
  return `open-planner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function openPlannerWithScheduledPost(payload: {
  post?: ScheduledPost;
  focusPostId?: string;
  defaultTab?: 'planen' | 'kalender' | 'checklist';
  preSelectedDate?: Date;
  prefilledPlanPost?: Omit<PlannerDraftPrefill, 'requestId'>;
}): OpenPlannerWithPostRequest {
  const requestId = buildRequestId();
  const request: OpenPlannerWithPostRequest = {
    post: payload.post,
    focusPostId: payload.focusPostId ?? payload.post?.id,
    defaultTab: payload.defaultTab ?? 'checklist',
    preSelectedDate: payload.preSelectedDate,
    prefilledPlanPost: payload.prefilledPlanPost
      ? {
          ...payload.prefilledPlanPost,
          requestId,
        }
      : undefined,
    requestId,
  };
  listeners.forEach((listener) => listener(request));
  return request;
}

export function subscribeToOpenPlannerWithScheduledPost(listener: OpenPlannerWithPostListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
