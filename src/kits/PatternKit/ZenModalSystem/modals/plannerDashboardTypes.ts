import type { SocialPlatform } from '../../../../types/scheduling';

export type PlannerOverviewStatusFilter = 'all' | 'scheduled' | 'draft';

export interface PlannerDashboardPost {
  id: string;
  platform: SocialPlatform;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  content: string;
  characterCount: number;
  wordCount: number;
  schedule?: {
    date: string;
    time: string;
  };
  isScheduled: boolean;
}

export interface PlannerDashboardStats {
  totalPosts: number;
  scheduledPosts: number;
  draftPosts: number;
  todoCompleted: number;
  todoTotal: number;
  completionRate: number;
}

export interface PlannerDashboardPlatformMixItem {
  platform: SocialPlatform;
  total: number;
  scheduled: number;
  drafts: number;
}

export interface PlannerDashboardDayBucket {
  dateKey: string;
  label: string;
  posts: PlannerDashboardPost[];
}

export interface PlannerDashboardWorkflowHealth {
  postsWithoutImage: number;
  unscheduledDrafts: number;
  postsWithTodoRisk: number;
  openTodoPosts: number;
  totalOpenTodos: number;
  healthyPosts: number;
}

export interface PlannerDashboardQuickAction {
  id: string;
  label: string;
  hint: string;
  count?: number;
  targetPostId?: string;
  action: 'open-draft-post' | 'open-next-post' | 'open-todo-post' | 'open-cloud';
}

export interface PlannerDashboardAttentionItem {
  id: string;
  platform: SocialPlatform;
  title: string;
  detail: string;
  severity: 'high' | 'medium' | 'low';
  kind: 'missing-image' | 'draft' | 'todo-risk';
  targetPostId: string;
  action: 'open-post' | 'open-todo-post';
}

export interface PlannerDashboardModel {
  allPosts: PlannerDashboardPost[];
  filteredPosts: PlannerDashboardPost[];
  availablePlatforms: SocialPlatform[];
  stats: PlannerDashboardStats;
  platformMix: PlannerDashboardPlatformMixItem[];
  nextSevenDays: PlannerDashboardDayBucket[];
  workflowHealth: PlannerDashboardWorkflowHealth;
  quickActions: PlannerDashboardQuickAction[];
  attentionItems: PlannerDashboardAttentionItem[];
  lastSyncLabel: string | null;
}
