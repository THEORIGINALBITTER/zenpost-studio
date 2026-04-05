import type { SocialPlatform, ScheduledPost } from '../../../../types/scheduling';
import type { ChecklistItem } from '../../../../utils/checklistStorage';

export type TabType = 'planen' | 'kalender' | 'checklist';
export type CalendarView = 'month' | 'week';
export type PostSchedule = { date: string; time: string };
export type ScheduleMap = Record<string, PostSchedule>;

export type PlannerPost = {
  id: string;
  platform: SocialPlatform;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  content: string;
  characterCount: number;
  wordCount: number;
  source: 'content' | 'manual' | 'scheduled';
};

export type PlannerStorage = {
  version: '1.0.0';
  updatedAt: string;
  manualPosts: PlannerPost[];
  schedules: ScheduleMap;
  checklistItems: ChecklistItem[];
};

export interface ZenPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduledPosts: ScheduledPost[];
  projectPath?: string | null;
  projectName?: string | null;
  onReloadSchedule?: () => void;
  posts?: Array<{
    platform: SocialPlatform;
    title: string;
    subtitle?: string;
    content: string;
    characterCount: number;
    wordCount: number;
  }>;
  onScheduleSave?: (scheduledPosts: ScheduledPost[]) => void;
  onScheduledPostsChange?: (posts: ScheduledPost[]) => void;
  onEditPost?: (post: ScheduledPost) => void;
  onAddPost?: (date: Date) => void;
  preSelectedDate?: Date;
  initialSchedules?: Partial<Record<SocialPlatform, PostSchedule>>;
  defaultTab?: TabType;
  suggestedEditorPost?: {
    key: string;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    content: string;
    platform?: string;
  };
}

// Re-export for convenience so consumers only need to import from plannerTypes
export type { ScheduledPost, ChecklistItem };
