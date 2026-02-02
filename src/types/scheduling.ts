/**
 * Scheduling Types for Content Management & Publishing
 * @author Denis Bitter <contact@denisbitter.de>
 */

export type PublishingStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export type SocialPlatform = 'linkedin' | 'reddit' | 'github' | 'devto' | 'medium' | 'hashnode' | 'twitter';

export interface ScheduledPost {
  id: string;
  platform: SocialPlatform;
  title: string;
  subtitle?: string;
  content: string;
  scheduledDate?: Date;
  scheduledTime?: string;
  status: PublishingStatus;
  characterCount: number;
  wordCount: number;
  createdAt: Date;
  seriesId?: string;
}

export interface ContentSeries {
  id: string;
  name: string;
  description: string;
  posts: string[]; // Array of post IDs
  createdAt: Date;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  platform: SocialPlatform;
  postId: string;
}

export interface TodoItem {
  id: string;
  postId: string;
  task: string;
  completed: boolean;
  createdAt: Date;
}

export interface PublishingWorkflow {
  postId: string;
  tasks: TodoItem[];
  completionPercentage: number;
}
