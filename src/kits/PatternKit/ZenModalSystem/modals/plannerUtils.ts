import type { DragEvent } from 'react';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faCircleQuestion,
} from '@fortawesome/free-solid-svg-icons';
import {
  faLinkedin,
  faReddit,
  faGithub,
  faDev,
  faMedium,
  faHashnode,
  faTwitter,
} from '@fortawesome/free-brands-svg-icons';
import type { SocialPlatform } from '../../../../types/scheduling';
import { getPublishingPaths } from '../../../../services/publishingService';
import type { PlannerPost, PostSchedule, ScheduleMap, TabType } from './plannerTypes';
import { faCalendarDays, faClipboardList, faClock, faEarthEurope } from '@fortawesome/free-solid-svg-icons';

// ==================== PLATFORM INFO ====================

export const PLATFORM_INFO: Record<SocialPlatform, { name: string; color: string; icon: IconDefinition; bg: string }> = {
  linkedin: { name: 'LinkedIn', color: '#0077B5', icon: faLinkedin, bg: '#0077B51A' },
  reddit:   { name: 'Reddit',   color: '#FF4500', icon: faReddit,   bg: '#FF45001A1A' },
  github:   { name: 'GitHub',   color: '#181717', icon: faGithub,   bg: '#1817171A' },
  devto:    { name: 'Dev.to',   color: '#0A0A0A', icon: faDev,      bg: '#0A0A0A1A' },
  medium:   { name: 'Medium',   color: '#00AB6C', icon: faMedium,   bg: '#00AB6C1A' },
  hashnode: { name: 'Hashnode', color: '#2962FF', icon: faHashnode, bg: '#2962FF1A' },
  twitter:  { name: 'Twitter/X',color: '#1DA1F2', icon: faTwitter,  bg: '#1DA1F21A' },
};

export const UNKNOWN_PLATFORM_INFO = { name: 'Unbekannt', color: '#888', icon: faCircleQuestion, bg: '#8888881A' };

export const getPlatformInfo = (platform: SocialPlatform | undefined) =>
  (platform ? PLATFORM_INFO[platform] : undefined) ?? UNKNOWN_PLATFORM_INFO;

// ==================== CALENDAR CONSTANTS ====================

export const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

export const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// ==================== CHECKLIST CONSTANTS ====================

export const DEFAULT_TASKS = [
  'Content erstellt und überprüft',
  'Hashtags und Keywords recherchiert',
  'Bilder/Grafiken vorbereitet',
  'Beste Posting-Zeit festgelegt',
  'Cross-Posting geplant',
  'Engagement-Strategie definiert',
  'Analytics-Ziele gesetzt',
  'Community-Interaktion geplant',
];

export const TABS: { id: TabType; label: string; icon: IconDefinition }[] = [
  { id: 'planen',    label: 'Planen',    icon: faClock },
  { id: 'kalender',  label: 'Kalender',  icon: faCalendarDays },
  { id: 'checklist', label: 'ToDo',      icon: faClipboardList },
  { id: 'übersicht', label: 'Übersicht', icon: faEarthEurope },
];

export const DEFAULT_CHECKLIST_COLLAPSED = false;
export const DEFAULT_WORKFLOW_COLLAPSED = false;
export const WORKFLOW_COLLAPSED_KEY = 'zenpost_checklist_workflow_collapsed';
export const CHECKLIST_COLLAPSED_KEY = 'zenpost_checklist_all_collapsed';
export const WORKFLOW_SCOPE_KEY = 'zenpost_checklist_workflow_scope';

// ==================== PURE HELPER FUNCTIONS ====================

export const buildStableContentId = (platform: string, content: string, title: string): string => {
  const source = `${platform}-${title}-${content.substring(0, 100)}`;
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    const char = source.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `content-${platform}-${Math.abs(hash).toString(36)}`;
};

export const resolvePlannerStorageInfo = async (projectPath?: string | null) => {
  const storedPath =
    projectPath ?? (typeof window !== 'undefined' ? localStorage.getItem('zenpost_last_project_path') : null);

  if (!storedPath) return null;

  const paths = await getPublishingPaths(storedPath);
  return {
    projectPath: storedPath,
    storagePath: `${paths.root}/planner_posts.json`,
  };
};

export const getDefaultTime = () => {
  const now = new Date();
  const minutes = now.getMinutes();
  const rounded = Math.ceil(minutes / 15) * 15;

  if (rounded === 60) {
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
  } else {
    now.setMinutes(rounded);
  }

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

export const getTodayDate = () => new Date().toISOString().split('T')[0];

export const sanitizeBaseName = (input: string): string =>
  input
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Post';

export const buildPlannerFileName = (base: string, dateStr: string, version: number) =>
  `${base}_${dateStr}_v${version}.md`;

export const resolvePlannerSavePath = async (
  projectPath: string,
  baseName: string,
  dateStr: string,
): Promise<string> => {
  // Dynamic import to avoid circular dependency with Tauri FS
  const { exists } = await import('@tauri-apps/plugin-fs');
  let version = 1;
  let candidate = buildPlannerFileName(baseName, dateStr, version);
  while (await exists(`${projectPath}/${candidate}`)) {
    version += 1;
    candidate = buildPlannerFileName(baseName, dateStr, version);
  }
  return `${projectPath}/${candidate}`;
};

export const buildScheduleMap = (
  posts: PlannerPost[],
  date: string,
  overrides?: Partial<Record<SocialPlatform, PostSchedule>>,
): ScheduleMap => {
  const map: ScheduleMap = {};
  posts.forEach((post) => {
    const override = overrides?.[post.platform];
    map[post.id] = {
      date: override?.date ?? date,
      time: override?.time ?? '',
    };
  });
  return map;
};

export const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const fromDateKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map((v) => Number(v));
  return new Date(year, (month || 1) - 1, day || 1);
};

// ==================== IMAGE DRAG & DROP HELPERS ====================

export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Datei konnte nicht gelesen werden.'));
    reader.readAsDataURL(file);
  });

export const extractDroppedImageUrl = (event: DragEvent<HTMLElement>): string => {
  const dt = event.dataTransfer;
  if (!dt) return '';
  const uriList = dt.getData('text/uri-list');
  if (uriList) {
    const first = uriList.split('\n').map(l => l.trim()).find(l => l && !l.startsWith('#'));
    if (first) return first;
  }
  const text = dt.getData('text/plain');
  if (text && /^https?:\/\//i.test(text.trim())) return text.trim();
  return '';
};
