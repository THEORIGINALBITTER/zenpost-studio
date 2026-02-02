import { useState, useEffect, useMemo, useRef } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { exists, readTextFile, writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { isTauri } from '@tauri-apps/api/core';

// Import Checklist Templates
import { getChecklistTasksForPlatform } from '../../../../utils/getChecklistForPlatform';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faClipboardList,
  faClock,
  faLightbulb,
  faSave,
  faBook,
  faCirclePlus,
  faCircleQuestion,
  faDownload,
  faChevronDown,
  faChevronRight,
  faCompress,
  faExpand,
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
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { ZenModal } from '../components/ZenModal';
import { MODAL_CONTENT } from '../config/ZenModalConfig';
import { ZenRoughButton } from '../components/ZenRoughButton';
import { ZenDropdown } from '../components/ZenDropdown';
import { ZenCloseButton } from '../../../DesignKit/ZenCloseButton';
import { ZenAddButton } from '../../../DesignKit/ZenAddButton';
import { ZenMarkdownEditor } from '../../ZenMarkdownEditor';
import { downloadICSFile, generateICSFile } from '../../../../utils/calendarExport';
import type { ScheduledPost, SocialPlatform, PublishingStatus } from '../../../../types/scheduling';
import { getPublishingPaths, initializePublishingProject, loadSchedule, saveScheduledPostsWithFiles } from '../../../../services/publishingService';
import {
  formatChecklistAsXlsx,
  loadChecklist,
  saveChecklist,
  type ChecklistItem,
} from '../../../../utils/checklistStorage';
import {
  buildExportPayload,
  exportPayloadToCsv,
  exportPayloadToMarkdown,
  exportPayloadToPdf,
} from '../../../../utils/exportLayer';

// ==================== TYPES ====================

interface ZenPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduledPosts: ScheduledPost[];
  projectPath?: string | null;
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
  initialSchedules?: Partial<Record<SocialPlatform, { date: string; time: string }>>;
  defaultTab?: 'planen' | 'kalender' | 'checklist';
}

type TabType = 'planen' | 'kalender' | 'checklist';

type PostSchedule = { date: string; time: string };
type ScheduleMap = Record<string, PostSchedule>;
type PlannerPost = {
  id: string;
  platform: SocialPlatform;
  title: string;
  subtitle?: string;
  content: string;
  characterCount: number;
  wordCount: number;
  source: 'content' | 'manual' | 'scheduled';
};

type PlannerStorage = {
  version: '1.0.0';
  updatedAt: string;
  manualPosts: PlannerPost[];
  schedules: ScheduleMap;
  checklistItems: ChecklistItem[];
};

// ==================== CONSTANTS ====================





const PLATFORM_INFO: Record<SocialPlatform, { emoji: string; name: string; color: string; icon: IconDefinition }> = {
  linkedin: { emoji: '💼', name: 'LinkedIn', color: '#0077B5', icon: faLinkedin },
  reddit: { emoji: '🤖', name: 'Reddit', color: '#FF4500', icon: faReddit },
  github: { emoji: '⚙️', name: 'GitHub', color: '#181717', icon: faGithub },
  devto: { emoji: '👨‍💻', name: 'Dev.to', color: '#0A0A0A', icon: faDev },
  medium: { emoji: '📝', name: 'Medium', color: '#00AB6C', icon: faMedium },
  hashnode: { emoji: '🔷', name: 'Hashnode', color: '#2962FF', icon: faHashnode },
  twitter: { emoji: '🐦', name: 'Twitter/X', color: '#1DA1F2', icon: faTwitter },
};

const UNKNOWN_PLATFORM_INFO = { emoji: '❔', name: 'Unbekannt', color: '#888', icon: faCircleQuestion };

const getPlatformInfo = (platform: SocialPlatform | undefined) =>
  (platform ? PLATFORM_INFO[platform] : undefined) ?? UNKNOWN_PLATFORM_INFO;

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const DAY_NAMES = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

const DEFAULT_TASKS = [
  'Content erstellt und überprüft',
  'Hashtags und Keywords recherchiert',
  'Bilder/Grafiken vorbereitet',
  'Beste Posting-Zeit festgelegt',
  'Cross-Posting geplant',
  'Engagement-Strategie definiert',
  'Analytics-Ziele gesetzt',
  'Community-Interaktion geplant',
];

const TABS: { id: TabType; label: string; icon: IconDefinition }[] = [
  { id: 'planen', label: 'Planen', icon: faClock },
  { id: 'kalender', label: 'Kalender', icon: faCalendarDays },
  { id: 'checklist', label: 'Checklist', icon: faClipboardList },
];

const DEFAULT_CHECKLIST_COLLAPSED = false;
const DEFAULT_WORKFLOW_COLLAPSED = false;
const WORKFLOW_COLLAPSED_KEY = 'zenpost_checklist_workflow_collapsed';
const CHECKLIST_COLLAPSED_KEY = 'zenpost_checklist_all_collapsed';
const WORKFLOW_SCOPE_KEY = 'zenpost_checklist_workflow_scope';

// ==================== HELPER FUNCTIONS ====================
const resolvePlannerStorageInfo = async (projectPath?: string | null) => {
  const storedPath =
    projectPath ?? (typeof window !== 'undefined' ? localStorage.getItem('zenpost_last_project_path') : null);

  if (!storedPath) return null;

  const paths = await getPublishingPaths(storedPath);
  return {
    projectPath: storedPath,
    storagePath: `${paths.root}/planner_posts.json`,
  };
};



// Helper Helper: Default-Time generieren (z.B. “nächste 15 Minuten”)


const getDefaultTime = () => {
  const now = new Date();
  const minutes = now.getMinutes();
  const rounded = Math.ceil(minutes / 15) * 15; // 0, 15, 30, 45, 60

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



const buildScheduleMap = (
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

// ==================== MAIN COMPONENT ====================

export function ZenPlannerModal({
  isOpen,
  onClose,
  scheduledPosts,
  projectPath,
  onReloadSchedule,
  posts = [],
  onScheduleSave,
  onScheduledPostsChange,
  onEditPost,
  onAddPost: _onAddPost,
  preSelectedDate,
  initialSchedules,
  defaultTab = 'planen',
}: ZenPlannerModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [plannerLoaded, setPlannerLoaded] = useState(false);
  const [plannerStoragePath, setPlannerStoragePath] = useState<string | null>(null);
  const [plannerProjectPath, setPlannerProjectPath] = useState<string | null>(null);
  const lastLoadedPathRef = useRef<string | null>(null);


  // ==================== PLANEN STATE ====================
  const initialDate = preSelectedDate ? preSelectedDate.toISOString().split('T')[0] : '';

  // ==================== MANUAL PLAN POSTS ====================
  const [manualPosts, setManualPosts] = useState<PlannerPost[]>([]);
  const [newPostPlatform, setNewPostPlatform] = useState<SocialPlatform>('linkedin');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostSubtitle, setNewPostSubtitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');

  const planningPosts = useMemo<PlannerPost[]>(() => {
    // Combine posts from editor, manual posts, and scheduled posts
    const fromEditor = posts.map((post, index) => ({
      ...post,
      id: `${post.platform}-${index}`,
      source: 'content' as const,
    }));

    // Convert scheduledPosts to PlannerPost format (avoid duplicates by ID)
    const existingIds = new Set([
      ...fromEditor.map(p => p.id),
      ...manualPosts.map(p => p.id),
    ]);

    const fromScheduled: PlannerPost[] = scheduledPosts
      .filter(p => !existingIds.has(p.id))
      .map(post => ({
        id: post.id,
        platform: post.platform,
        title: post.title,
        subtitle: '',
        content: post.content,
        characterCount: post.characterCount,
        wordCount: post.wordCount,
        source: 'scheduled' as const,
      }));

    return [...fromEditor, ...manualPosts, ...fromScheduled];
  }, [posts, manualPosts, scheduledPosts]);

  const [schedules, setSchedules] = useState<ScheduleMap>(() => {
    const base = buildScheduleMap(planningPosts, initialDate, initialSchedules);
    // Add schedules from scheduledPosts (they already have date/time)
    scheduledPosts.forEach(post => {
      if (post.scheduledDate || post.scheduledTime) {
        let dateStr = '';
        if (post.scheduledDate) {
          const d = post.scheduledDate;
          dateStr = d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0];
        }
        base[post.id] = {
          date: dateStr,
          time: post.scheduledTime ?? '',
        };
      }
    });
    return base;
  });

  // ==================== CHECKLIST STATE ====================
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [checklistLoaded, setChecklistLoaded] = useState(false);
  const [customTask, setCustomTask] = useState('');
  const [checklistTargetPostId, setChecklistTargetPostId] = useState<string | null>(null);
  const [collapsedChecklistPosts, setCollapsedChecklistPosts] = useState<Record<string, boolean>>({});
  const [highlightChecklistPostId, setHighlightChecklistPostId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);
  const [tooltipState, setTooltipState] = useState<{ scope: 'workflow' | 'checklist' | null; text: string | null }>({
    scope: null,
    text: null,
  });
  const [defaultChecklistCollapsed, setDefaultChecklistCollapsed] = useState(DEFAULT_CHECKLIST_COLLAPSED);
  const [isWorkflowCollapsed, setIsWorkflowCollapsed] = useState(DEFAULT_WORKFLOW_COLLAPSED);
  const [workflowProgressScope, setWorkflowProgressScope] = useState<'all' | 'open'>('all');

  const workflowCollapsedKey = `${WORKFLOW_COLLAPSED_KEY}_${projectPath ?? 'default'}`;
  const checklistCollapsedKey = `${CHECKLIST_COLLAPSED_KEY}_${projectPath ?? 'default'}`;
  const workflowScopeKey = `${WORKFLOW_SCOPE_KEY}_${projectPath ?? 'default'}`;

  const checklistVisibleItems = useMemo(() => {
    if (planningPosts.length === 0) return checklistItems;
    const postIds = new Set(planningPosts.map(post => post.id));
    return checklistItems.filter(item => !item.postId || postIds.has(item.postId));
  }, [checklistItems, planningPosts]);

  useEffect(() => {
    if (!isOpen) return;
    setSchedules((prev) => {
      const base = buildScheduleMap(planningPosts, initialDate, initialSchedules);
      // Preserve existing schedules
      planningPosts.forEach((post) => {
        if (prev[post.id]) {
          base[post.id] = prev[post.id];
        }
      });
      // Add schedules from scheduledPosts (they already have date/time)
      scheduledPosts.forEach(post => {
        // Only set if not already in prev (don't override user changes)
        if (!prev[post.id] && (post.scheduledDate || post.scheduledTime)) {
          let dateStr = '';
          if (post.scheduledDate) {
            const d = post.scheduledDate;
            dateStr = d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0];
          }
          base[post.id] = {
            date: dateStr,
            time: post.scheduledTime ?? '',
          };
        }
      });
      return base;
    });
  }, [isOpen, initialSchedules, initialDate, planningPosts, scheduledPosts]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(defaultTab);
  }, [defaultTab, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      lastLoadedPathRef.current = null;
      setPlannerLoaded(false);
      setPlannerStoragePath(null);
      setPlannerProjectPath(null);
      return;
    }

    const resolveInfo = async () => {
      const info = await resolvePlannerStorageInfo(projectPath);
      setPlannerStoragePath(info?.storagePath ?? null);
      setPlannerProjectPath(info?.projectPath ?? null);
    };
    resolveInfo();
  }, [isOpen, projectPath]);

  useEffect(() => {
    if (!isOpen) return;

    if (!isTauri()) {
      setPlannerLoaded(true);
      return;
    }

    if (!plannerStoragePath || !plannerProjectPath) {
      setPlannerLoaded(true);
      return;
    }

    if (lastLoadedPathRef.current === plannerStoragePath) return;
    lastLoadedPathRef.current = plannerStoragePath;
    setPlannerLoaded(false);

    const loadPlannerData = async () => {
      try {
        await initializePublishingProject(plannerProjectPath);
        const fileExists = await exists(plannerStoragePath);
        if (!fileExists) {
          setPlannerLoaded(true);
          return;
        }

        const raw = await readTextFile(plannerStoragePath);
        const parsed = JSON.parse(raw) as Partial<PlannerStorage>;
        const savedManualPosts = Array.isArray(parsed.manualPosts) ? parsed.manualPosts : [];
        const savedSchedules = parsed.schedules && typeof parsed.schedules === 'object' ? parsed.schedules : {};
        const savedChecklist = Array.isArray(parsed.checklistItems) ? parsed.checklistItems : [];

        const nextPlanningPosts: PlannerPost[] = [
          ...posts.map((post, index) => ({
            ...post,
            id: `${post.platform}-${index}`,
            source: 'content' as const,
          })),
          ...savedManualPosts,
        ];

        const baseSchedules = buildScheduleMap(nextPlanningPosts, initialDate, initialSchedules);
        const mergedSchedules = { ...baseSchedules, ...savedSchedules };

        setManualPosts(savedManualPosts);
        setChecklistItems(savedChecklist);
        setSchedules(mergedSchedules);
      } catch (error) {
        console.error('[Planner] Failed to load planner storage', error);
      } finally {
        setPlannerLoaded(true);
      }
    };

    void loadPlannerData();
  }, [isOpen, plannerStoragePath, plannerProjectPath, initialDate, initialSchedules, posts]);

  useEffect(() => {
    if (!preSelectedDate) return;
    const dateStr = preSelectedDate.toISOString().split('T')[0];
    setSchedules(prev => {
      const updated = { ...prev };
      planningPosts.forEach(post => {
        const current = updated[post.id];
        if (!current?.date) {
          updated[post.id] = {
            date: dateStr,
            time: current?.time ?? '',
          };
        }
      });
      return updated;
    });
  }, [preSelectedDate, planningPosts]);

  // ==================== KALENDER STATE ====================
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDetailDate, setCalendarDetailDate] = useState<Date | null>(null);
  const [calendarEditMap, setCalendarEditMap] = useState<Record<string, PostSchedule>>({});
  const [calendarStatusList, setCalendarStatusList] = useState<'scheduled' | 'draft' | null>(null);
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // Initialize calendarEditMap when a detail view opens
  useEffect(() => {
    if (calendarDetailDate || calendarStatusList) {
      const newMap: Record<string, PostSchedule> = {};
      scheduledPosts.forEach(post => {
        let dateStr = '';
        if (post.scheduledDate) {
          const d = post.scheduledDate;
          dateStr = d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0];
        }
        newMap[post.id] = { date: dateStr, time: post.scheduledTime ?? '' };
      });
      setCalendarEditMap(newMap);
    }
  }, [calendarDetailDate, calendarStatusList, scheduledPosts]);

  useEffect(() => {
    if (!isOpen || !plannerLoaded) return;
    if (!isTauri()) return;
    if (!plannerStoragePath || !plannerProjectPath) return;

    const timeout = setTimeout(async () => {
      try {
        await initializePublishingProject(plannerProjectPath);

        const payload: PlannerStorage = {
          version: '1.0.0',
          updatedAt: new Date().toISOString(),
          manualPosts,
          schedules,
          checklistItems,
        };

        await writeTextFile(plannerStoragePath, JSON.stringify(payload, null, 2));
      } catch (error) {
        console.error('[Planner] Failed to autosave planner storage', error);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [isOpen, plannerLoaded, plannerStoragePath, plannerProjectPath, manualPosts, schedules, checklistItems]);

  // Autosave scheduledPosts when they change
  useEffect(() => {
    if (!isOpen) return;
    if (!isTauri()) return;
    if (!projectPath) return;
    if (scheduledPosts.length === 0) return;

    const timeout = setTimeout(async () => {
      try {
        await saveScheduledPostsWithFiles(projectPath, scheduledPosts);
      } catch (error) {
        console.error('[Planner] Failed to autosave scheduled posts', error);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [isOpen, projectPath, scheduledPosts]);

  useEffect(() => {
    if (!isOpen) return;
    setChecklistLoaded(false);
    loadChecklist([], projectPath)
      .then(items => {
        setChecklistItems(items);
        setChecklistLoaded(true);
      })
      .catch(() => {
        setChecklistItems([]);
        setChecklistLoaded(true);
      });
  }, [isOpen, projectPath]);

  useEffect(() => {
    if (!isOpen) return;
    if (!isTauri()) return;
    if (!projectPath) return;
    if (!onScheduledPostsChange) return;

    const reload = async () => {
      try {
        await initializePublishingProject(projectPath);
        const project = await loadSchedule(projectPath);
        onScheduledPostsChange(project.posts);
      } catch (error) {
        console.error('[Planner] Failed to reload schedule', error);
      }
    };

    void reload();
  }, [isOpen, projectPath, onScheduledPostsChange]);

  useEffect(() => {
    if (!checklistLoaded) return;
    if (planningPosts.length === 0) return;

    const firstPostId = planningPosts[0]?.id;
    let changed = false;
    let nextItems = checklistItems.map(item => {
      if (!item.postId && firstPostId) {
        changed = true;
        return { ...item, postId: firstPostId };
      }
      return item;
    });

    const itemsByPost = new Map<string, ChecklistItem[]>();
    nextItems.forEach(item => {
      const key = item.postId ?? 'unassigned';
      if (!itemsByPost.has(key)) itemsByPost.set(key, []);
      itemsByPost.get(key)?.push(item);
    });

    const additions: ChecklistItem[] = [];
    planningPosts.forEach(post => {
      const defaults = getChecklistTasksForPlatform(post.platform) || DEFAULT_TASKS;
      const existingTexts = new Set((itemsByPost.get(post.id) ?? []).map(item => item.text));
      defaults.forEach((task, index) => {
        if (existingTexts.has(task)) return;
        additions.push({
          id: `${post.id}-task-${index}`,
          text: task,
          completed: false,
          source: 'default',
          postId: post.id,
        });
        changed = true;
      });
    });

    if (additions.length > 0) {
      nextItems = [...nextItems, ...additions];
    }

    if (changed) {
      setChecklistItems(nextItems);
    }
  }, [checklistLoaded, checklistItems, planningPosts]);

  useEffect(() => {
    if (!checklistLoaded) return;
    saveChecklist(checklistItems, projectPath).catch(() => {});
  }, [checklistItems, checklistLoaded, projectPath]);

  useEffect(() => {
    if (planningPosts.length === 0) {
      if (checklistTargetPostId !== null) setChecklistTargetPostId(null);
      return;
    }
    if (!checklistTargetPostId || !planningPosts.some(post => post.id === checklistTargetPostId)) {
      setChecklistTargetPostId(planningPosts[0].id);
    }
  }, [planningPosts, checklistTargetPostId]);

  useEffect(() => {
    if (planningPosts.length === 0) return;
    setCollapsedChecklistPosts(prev => {
      let changed = false;
      const next = { ...prev };
      planningPosts.forEach(post => {
        if (typeof next[post.id] !== 'boolean') {
          next[post.id] = defaultChecklistCollapsed;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [planningPosts, defaultChecklistCollapsed]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(workflowCollapsedKey, String(isWorkflowCollapsed));
  }, [isWorkflowCollapsed, workflowCollapsedKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedWorkflow = window.localStorage.getItem(workflowCollapsedKey);
    if (storedWorkflow === 'true') setIsWorkflowCollapsed(true);
    if (storedWorkflow === 'false') setIsWorkflowCollapsed(false);
  }, [workflowCollapsedKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedChecklist = window.localStorage.getItem(checklistCollapsedKey);
    if (storedChecklist === 'true') setDefaultChecklistCollapsed(true);
    if (storedChecklist === 'false') setDefaultChecklistCollapsed(false);
  }, [checklistCollapsedKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(checklistCollapsedKey, String(defaultChecklistCollapsed));
  }, [defaultChecklistCollapsed, checklistCollapsedKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedScope = window.localStorage.getItem(workflowScopeKey);
    if (storedScope === 'open' || storedScope === 'all') {
      setWorkflowProgressScope(storedScope);
    }
  }, [workflowScopeKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(workflowScopeKey, workflowProgressScope);
  }, [workflowProgressScope, workflowScopeKey]);

  // ==================== PLANEN HANDLERS ====================
  const handleDateChange = (postId: string, date: string) => {
    setSchedules(prev => ({
      ...prev,
      [postId]: { ...(prev[postId] ?? { date: '', time: '' }), date },
    }));
  };

  const handleEditPostClick = (post: ScheduledPost) => {
    onEditPost?.(post);
  };

  const handleTimeChange = (postId: string, time: string) => {
    setSchedules(prev => ({
      ...prev,
      [postId]: { ...(prev[postId] ?? { date: '', time: '' }), time },
    }));
  };

  const buildScheduledPostForEdit = (post: PlannerPost, schedule: PostSchedule): ScheduledPost => ({
    id: post.id,
    platform: post.platform,
    title: post.title,
    subtitle: post.subtitle,
    content: post.content,
    scheduledDate: schedule.date ? new Date(schedule.date) : undefined,
    scheduledTime: schedule.time || undefined,
    status: schedule.date && schedule.time ? 'scheduled' : 'draft',
    characterCount: post.characterCount,
    wordCount: post.wordCount,
    createdAt: new Date(),
  });

  const updateScheduledPost = (postId: string, dateStr: string, timeStr: string) => {
    if (!onScheduledPostsChange) return;
    const updated = scheduledPosts.map((post) => {
      if (post.id !== postId) return post;
      const updatedDate = dateStr ? new Date(dateStr) : undefined;
      const updatedTime = timeStr || undefined;
      return {
        ...post,
        scheduledDate: updatedDate,
        scheduledTime: updatedTime,
        status: (updatedDate && updatedTime ? 'scheduled' : 'draft') as PublishingStatus,
      };
    });
    onScheduledPostsChange(updated);
  };

  const handleSaveSchedule = async (options?: { closeAfter?: boolean }) => {
    if (!onScheduleSave && !onScheduledPostsChange && !(isTauri() && projectPath)) return;

    const scheduledPostsData: ScheduledPost[] = planningPosts.map(post => {
      const schedule = schedules[post.id] ?? { date: '', time: '' };
      const scheduledDate = schedule.date ? new Date(schedule.date) : undefined;
      const existing = scheduledPosts.find(existingPost => existingPost.id === post.id);

      return {
        id: post.id,
        platform: post.platform,
        title: post.title,
        subtitle: post.subtitle,
        content: post.content,
        scheduledDate,
        scheduledTime: schedule.time || undefined,
        status: (schedule.date && schedule.time) ? 'scheduled' : 'draft',
        characterCount: post.characterCount,
        wordCount: post.wordCount,
        createdAt: existing?.createdAt ?? new Date(),
      };
    });

    const merged = new Map<string, ScheduledPost>();
    scheduledPosts.forEach(post => merged.set(post.id, post));
    scheduledPostsData.forEach(post => merged.set(post.id, post));
    const nextPosts = Array.from(merged.values());

    if (onScheduledPostsChange) {
      onScheduledPostsChange(nextPosts);
    }

    if (isTauri() && projectPath) {
      try {
        await saveScheduledPostsWithFiles(projectPath, nextPosts);
      } catch (error) {
        console.error('[Planner] Failed to persist schedule directly', error);
      }
    }

    if (options?.closeAfter) {
      onClose();
    }

    if (onScheduleSave && !onScheduledPostsChange) {
      onScheduleSave(scheduledPostsData);
    }
  };

  const writeTestSchedule = async () => {
    if (!isTauri() || !projectPath) return;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const testPost: ScheduledPost = {
      id: `test-${Date.now()}`,
      platform: 'linkedin',
      title: 'Test Post',
      subtitle: 'Automatisch erzeugt',
      content: 'Testinhalt aus dem Planner.',
      scheduledDate: new Date(dateStr),
      scheduledTime: timeStr,
      status: 'scheduled',
      characterCount: 24,
      wordCount: 4,
      createdAt: new Date(),
    };
    try {
      await saveScheduledPostsWithFiles(projectPath, [testPost]);
      onScheduledPostsChange?.([testPost]);
    } catch (error) {
      console.error('[Planner] Failed to write test schedule', error);
    }
  };

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const hasAnySchedule = planningPosts.some(post => {
    const schedule = schedules[post.id] ?? { date: '', time: '' };
    return schedule.date && schedule.time;
  });

  // ==================== KALENDER HANDLERS ====================
  const handleExportCalendar = async () => {
    try {
      if (scheduledCount === 0) return;
      if (isTauri()) {
        const filePath = await save({
          defaultPath: 'zenpost-calendar.ics',
          filters: [{ name: 'Calendar', extensions: ['ics'] }],
        });
        if (!filePath) return;
        const icsContent = generateICSFile(scheduledPosts);
        await writeTextFile(filePath, icsContent);
        return;
      }
      downloadICSFile(scheduledPosts);
    } catch (error) {
      console.error('Kalender-Export fehlgeschlagen:', error);
    }
  };

  const getScheduledPostsForDate = (date: Date): ScheduledPost[] => {
    return scheduledPosts.filter(post => {
      if (!post.scheduledDate) return false;
      const postDate = new Date(post.scheduledDate);
      return (
        postDate.getDate() === date.getDate() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const calendarDetailPosts = useMemo(
    () => (calendarDetailDate ? getScheduledPostsForDate(calendarDetailDate) : []),
    [calendarDetailDate, scheduledPosts],
  );

  useEffect(() => {
    if (!calendarDetailDate) return;
    const nextMap: Record<string, PostSchedule> = {};
    calendarDetailPosts.forEach((post) => {
      const dateStr = post.scheduledDate ? new Date(post.scheduledDate).toISOString().split('T')[0] : '';
      nextMap[post.id] = {
        date: dateStr,
        time: post.scheduledTime ?? '',
      };
    });
    setCalendarEditMap(nextMap);
  }, [calendarDetailDate, calendarDetailPosts]);

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Date[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(new Date(year, month, -startingDayOfWeek + i + 1));
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  const isCurrentMonth = (date: Date): boolean => date.getMonth() === currentDate.getMonth();

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // ==================== CHECKLIST HANDLERS ====================
  const addCustomTask = () => {
    if (!customTask.trim()) return;
    const fallbackPostId = planningPosts[0]?.id;
    const targetPostId = checklistTargetPostId || fallbackPostId;
    const newItem: ChecklistItem = {
      id: `custom-${Date.now()}`,
      text: customTask.trim(),
      completed: false,
      source: 'custom',
      postId: targetPostId,
    };
    setChecklistItems(prev => [...prev, newItem]);
    setCustomTask('');
  };

  const checklistSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToChecklistPost = (postId: string) => {
    const target = checklistSectionRefs.current[postId];
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setHighlightChecklistPostId(postId);
    if (highlightTimeoutRef.current !== null) {
      window.clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightChecklistPostId(null);
      highlightTimeoutRef.current = null;
    }, 1200);
  };

  const openedChecklistPosts = useMemo(() => {
    return planningPosts.filter(post => !collapsedChecklistPosts[post.id]);
  }, [planningPosts, collapsedChecklistPosts]);

  const openedChecklistItems = useMemo(() => {
    if (openedChecklistPosts.length === 0) return [];
    const openIds = new Set(openedChecklistPosts.map(post => post.id));
    return checklistVisibleItems.filter(item => !item.postId || openIds.has(item.postId));
  }, [checklistVisibleItems, openedChecklistPosts]);

  const workflowStats = useMemo(() => {
    const sourceItems = workflowProgressScope === 'open' ? openedChecklistItems : checklistVisibleItems;
    const completed = sourceItems.filter(item => item.completed).length;
    return {
      completed,
      total: sourceItems.length,
      percent: sourceItems.length > 0 ? Math.round((completed / sourceItems.length) * 100) : 0,
    };
  }, [workflowProgressScope, openedChecklistItems, checklistVisibleItems]);

  const exportPosts = useMemo(
    () => (workflowProgressScope === 'open' ? openedChecklistPosts : planningPosts),
    [workflowProgressScope, openedChecklistPosts, planningPosts],
  );

  const exportChecklistItems = useMemo(() => {
    if (workflowProgressScope !== 'open') return checklistItems;
    const openIds = new Set(openedChecklistPosts.map(post => post.id));
    return checklistItems.filter(item => item.postId && openIds.has(item.postId));
  }, [workflowProgressScope, checklistItems, openedChecklistPosts]);

  const exportPayload = useMemo(
    () =>
      buildExportPayload({
        posts: exportPosts,
        schedules,
        checklistItems: exportChecklistItems,
        projectPath,
      }),
    [exportPosts, schedules, exportChecklistItems, projectPath],
  );

  const [publishingPaths, setPublishingPaths] = useState<Awaited<ReturnType<typeof getPublishingPaths>> | null>(null);

  useEffect(() => {
    if (!projectPath) {
      setPublishingPaths(null);
      return;
    }
    getPublishingPaths(projectPath).then(setPublishingPaths);
  }, [projectPath]);

  const setAllChecklistCollapsed = (collapsed: boolean) => {
    setDefaultChecklistCollapsed(collapsed);
    setCollapsedChecklistPosts(prev => {
      const next: Record<string, boolean> = { ...prev };
      planningPosts.forEach(post => {
        next[post.id] = collapsed;
      });
      return next;
    });
  };

  const completedCount = workflowStats.completed;
  const totalCount = workflowStats.total;
  const completionPercentage = workflowStats.percent;

  const scheduledCount = scheduledPosts.filter(p => p.status === 'scheduled').length;
  const draftCount = scheduledPosts.filter(p => p.status === 'draft').length;

  const days = getDaysInMonth(currentDate);

  // ==================== RENDER FUNCTIONS ====================

  const renderPlanenContent = () => (
    <div style={{ padding: '24px' }}>
      {/* Info Box */}
      <div
        style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#1A1A1A',
          borderRadius: '8px',
          border: '1px solid #3A3A3A',
        }}
      >
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '12px',
            color: '#777',
            lineHeight: '1.6',
            margin: 0,
          }}
        >
          <FontAwesomeIcon icon={faLightbulb} style={{ color: '#AC8E66', marginRight: '8px' }} />
          Plane deine Posts im Voraus. Wähle Datum und Uhrzeit für jede Plattform oder lasse sie leer für "Entwurf"-Status.
        </p>
      </div>

      {/* Manual Add */}
      <div
        style={{
          marginBottom: '16px',
          padding: '16px',
          backgroundColor: '#1A1A1A',
          borderRadius: '8px',
          border: '1px solid #3A3A3A',
        }}
      >
        <h4
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '12px',
            color: '#e5e5e5',
            margin: 0,
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FontAwesomeIcon icon={faCirclePlus} style={{ color: '#AC8E66' }} />
          Neuen Post planen
        </h4>
        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '10px',
          }}
        >
          <ZenDropdown
            value={newPostPlatform}
            onChange={(value) => {
              const nextPlatform = value as SocialPlatform;
              setNewPostPlatform(nextPlatform);
            }}
            options={(Object.keys(PLATFORM_INFO) as SocialPlatform[]).map((platform) => ({
              value: platform,
              label: getPlatformInfo(platform).name,
            }))}
            
            variant="compact"
          />
          <input
            type="text"
            value={newPostTitle}
            onChange={(e) => setNewPostTitle(e.target.value)}
            placeholder="Titel (optional)"
            style={{
              flex: 1,
              padding: '8px 10px',
              backgroundColor: '#0A0A0A',
              border: '1px solid #3A3A3A',
              borderRadius: '6px',
              color: '#e5e5e5',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
              width: '150px',
            }}
          />
            <input
            type="text"
            value={newPostSubtitle} // ✅
            onChange={(e) => setNewPostSubtitle(e.target.value)}
            placeholder="Untertitel (optional)"
            style={{
              flex: 1,
              padding: '8px 10px',
              backgroundColor: '#0A0A0A',
              border: '1px solid #3A3A3A',
              borderRadius: '6px',
              color: '#e5e5e5',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
            }}
          />
        </div>

        <div
          style={{
            marginBottom: '12px',
            borderRadius: '12px',
            border: '1px solid #AC8E66',
            backgroundColor: '#1F1F1F',
            padding: '12px',
          }}
        >
          <ZenMarkdownEditor
            value={newPostContent}
            onChange={setNewPostContent}
            placeholder="Schreibe hier deinen Post-Inhalt..."
            height="220px"
            showPreview={false}
            showLineNumbers={false}
            showCharCount={true}
            title={newPostTitle || undefined}
            subtitle={newPostSubtitle || undefined}
            showHeader={true}
          />
        </div>

        <ZenAddButton
          size="sm"
          onClick={() => {
            const trimmedTitle = newPostTitle.trim();
            const trimmedContent = newPostContent.trim();
            const contentValue = trimmedContent || trimmedTitle || '';
            const wordCount = contentValue ? contentValue.split(/\s+/).filter(Boolean).length : 0;

            // Default Datum aus preSelectedDae ansosnten Heute 
            const defaultDate = initialDate || getTodayDate();


            // Default Uhrzeit ncöstne 15 Minuten 
            const defaultTime = getDefaultTime(); // ✅
            const newId = `manual-${Date.now()}`;


            setManualPosts(prev => [
              ...prev,
              {
                id: newId,
                platform: newPostPlatform,
                title: trimmedTitle || getPlatformInfo(newPostPlatform).name,
                content: contentValue,
                characterCount: contentValue.length,
                wordCount,
                source: 'manual',
              },
            ]);

            // Hier wird setSchedule gesetzt default Datum und Uhrzeit
            setSchedules(prev => ({
              ...prev,
              [newId]: { date: defaultDate,
                time: defaultTime, // ✅
              },
            }));

            setNewPostTitle('');
            setNewPostSubtitle(''); // ✅
            setNewPostContent('');
          }}
        />
      </div>

      {/* Platform Schedule Cards */}
      {planningPosts.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {planningPosts.map(post => {
            const info = getPlatformInfo(post.platform);
            const schedule = schedules[post.id] ?? { date: '', time: '' };

            return (
              <div
                key={post.id}
                style={{
                  padding: '20px',
                  backgroundColor: '#1A1A1A',
                  borderRadius: '12px',
                  border: '1px solid #3A3A3A',
                  position: 'relative',
                }}
              >
                {/* Platform Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    marginBottom: '16px',
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{info.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <h4
                      style={{
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '14px',
                        color: '#e5e5e5',
                        margin: 0,
                      }}
                    >
                      {info.name}
                    </h4>
                    <p
                      style={{
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '10px',
                        color: '#777',
                        margin: 0,
                      }}
                    >
                      {post.characterCount} Zeichen
                    </p>
                    {/* Post Title */}
                    {post.title && (
                      <p
                        style={{
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '12px',
                          color: '#AC8E66',
                          margin: 0,
                          marginTop: '8px',
                          fontWeight: 'bold',
                        }}
                      >
                        {post.title}
                      </p>
                    )}
                    {/* Post Subtitle */}
                    {post.subtitle && (
                      <p
                        style={{
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '10px',
                          color: '#999',
                          margin: 0,
                          marginTop: '2px',
                        }}
                      >
                        {post.subtitle}
                      </p>
                    )}
                  </div>
                </div>
                {post.source === 'manual' && (
                  <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                    <ZenCloseButton
                      onClick={() => {
                        setManualPosts(prev => prev.filter(item => item.id !== post.id));
                        setSchedules(prev => {
                          const next = { ...prev };
                          delete next[post.id];
                          return next;
                        });
                      }}
                      size="sm"
                    />
                  </div>
                )}

                {/* Date & Time Inputs - 2 Column Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  marginBottom: '12px',
                }}>
                  {/* Date Input */}
                  <div>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '9px',
                        color: '#999',
                        marginBottom: '4px',
                      }}
                    >
                      <FontAwesomeIcon icon={faCalendarDays} style={{ fontSize: '9px' }} />
                      Datum
                    </label>
                    <input
                      type="date"
                      value={schedule.date}
                      onChange={(e) => handleDateChange(post.id, e.target.value)}
                      min={getTodayDate()}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        backgroundColor: '#0A0A0A',
                        border: '1px solid #3A3A3A',
                        borderRadius: '6px',
                        color: '#e5e5e5',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '11px',
                      }}
                    />
                  </div>

                  {/* Time Input */}
                  <div>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '9px',
                        color: '#999',
                        marginBottom: '4px',
                      }}
                    >
                      <FontAwesomeIcon icon={faClock} style={{ fontSize: '9px' }} />
                      Uhrzeit
                    </label>
                    <input
                      type="time"
                      value={schedule.time}
                      onChange={(e) => handleTimeChange(post.id, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        backgroundColor: '#0A0A0A',
                        border: '1px solid #3A3A3A',
                        borderRadius: '6px',
                        color: '#e5e5e5',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                </div>

                {/* Status Badge */}
                {schedule.date && schedule.time && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '6px 12px',
                      backgroundColor: '#AC8E66',
                      borderRadius: '4px',
                      textAlign: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '10px',
                        color: '#0A0A0A',
                        fontWeight: 'bold',
                      }}
                    >
                      ✓ Geplant
                    </span>
                  </div>
                )}

                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                  <ZenRoughButton
                    label="Weiterbearbeiten"
                    size="small"
                    width={180}
                    height={36}
                    onClick={() => {
                      onEditPost?.(buildScheduledPostForEdit(post, schedule));
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#1A1A1A',
            borderRadius: '12px',
            border: '1px dashed #3A3A3A',
            marginBottom: '24px',
          }}
        >
          <p
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '14px',
              color: '#777',
              margin: 0,
            }}
          >
            Keine Posts zum Planen vorhanden.
            <br />
            <span style={{ fontSize: '12px', color: '#555' }}>
              Erstelle Content im Content AI Studio oder nutze "Neuen Post planen".
            </span>
          </p>
        </div>
      )}

      {(scheduledPosts.length > 0) && (
        <div style={{ marginBottom: '24px' }}>
          <h4
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
              color: '#e5e5e5',
              marginBottom: '12px',
            }}
          >
            Geplante Posts
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
            }}
          >
            {scheduledPosts
              .filter((post) => post.status === 'scheduled')
              .map((post) => {
                const info = getPlatformInfo(post.platform);
                const dateValue = post.scheduledDate ? new Date(post.scheduledDate).toISOString().split('T')[0] : '';
                const timeValue = post.scheduledTime || '';
                return (
                  <div
                    key={post.id}
                    style={{
                      padding: '16px',
                      backgroundColor: '#1A1A1A',
                      borderRadius: '12px',
                      border: '1px solid #3A3A3A',
                      position: 'relative',
                    }}
                  >
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      <ZenCloseButton
                        onClick={() => onScheduledPostsChange?.(scheduledPosts.filter(item => item.id !== post.id))}
                        size="sm"
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '22px' }}>{info.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: '#e5e5e5' }}>
                          {info.name}
                        </div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
                          {post.characterCount} Zeichen
                        </div>
                        {/* Post Title */}
                        {post.title && (
                          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#AC8E66', marginTop: '6px', fontWeight: 'bold' }}>
                            {post.title}
                          </div>
                        )}
                        {/* Post Subtitle */}
                        {post.subtitle && (
                          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#999', marginTop: '2px' }}>
                            {post.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Date & Time - 2 Column Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#999', marginBottom: '4px' }}>
                          <FontAwesomeIcon icon={faCalendarDays} style={{ fontSize: '9px' }} />
                          Datum
                        </label>
                        <input
                          type="date"
                          value={dateValue}
                          onChange={(e) => updateScheduledPost(post.id, e.target.value, timeValue)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            backgroundColor: '#0A0A0A',
                            border: '1px solid #3A3A3A',
                            borderRadius: '6px',
                            color: '#e5e5e5',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '10px',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#999', marginBottom: '4px' }}>
                          <FontAwesomeIcon icon={faClock} style={{ fontSize: '9px' }} />
                          Uhrzeit
                        </label>
                        <input
                          type="time"
                          value={timeValue}
                          onChange={(e) => updateScheduledPost(post.id, dateValue, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            backgroundColor: '#0A0A0A',
                            border: '1px solid #3A3A3A',
                            borderRadius: '6px',
                            color: '#e5e5e5',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '10px',
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: '8px', marginBottom: '8px', textAlign: 'center' }}>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#0A0A0A', backgroundColor: '#AC8E66', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold' }}>
                        ✓ Geplant
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <ZenRoughButton
                        label="Weiterbearbeiten"
                        size="small"
                        width={180}
                        height={36}
                        onClick={() => handleEditPostClick(post)}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {(scheduledPosts.length > 0) && (
        <div style={{ marginBottom: '24px' }}>
          <h4
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
              color: '#e5e5e5',
              marginBottom: '12px',
            }}
          >
            Entwürfe
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
            }}
          >
            {scheduledPosts
              .filter((post) => post.status === 'draft')
              .map((post) => {
                const info = getPlatformInfo(post.platform);
                const dateValue = post.scheduledDate ? new Date(post.scheduledDate).toISOString().split('T')[0] : '';
                const timeValue = post.scheduledTime || '';
                return (
                  <div
                    key={post.id}
                    style={{
                      padding: '16px',
                      backgroundColor: '#1A1A1A',
                      borderRadius: '12px',
                      border: '1px solid #3A3A3A',
                      position: 'relative',
                    }}
                  >
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      <ZenCloseButton
                        onClick={() => onScheduledPostsChange?.(scheduledPosts.filter(item => item.id !== post.id))}
                        size="sm"
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '22px' }}>{info.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: '#e5e5e5' }}>
                          {info.name}
                        </div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
                          {post.characterCount} Zeichen
                        </div>
                        {/* Post Title */}
                        {post.title && (
                          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#AC8E66', marginTop: '6px', fontWeight: 'bold' }}>
                            {post.title}
                          </div>
                        )}
                        {/* Post Subtitle */}
                        {post.subtitle && (
                          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#999', marginTop: '2px' }}>
                            {post.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Date & Time - 2 Column Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#999', marginBottom: '4px' }}>
                          <FontAwesomeIcon icon={faCalendarDays} style={{ fontSize: '9px' }} />
                          Datum
                        </label>
                        <input
                          type="date"
                          value={dateValue}
                          onChange={(e) => updateScheduledPost(post.id, e.target.value, timeValue)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            backgroundColor: '#0A0A0A',
                            border: '1px solid #3A3A3A',
                            borderRadius: '6px',
                            color: '#e5e5e5',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '10px',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#999', marginBottom: '4px' }}>
                          <FontAwesomeIcon icon={faClock} style={{ fontSize: '9px' }} />
                          Uhrzeit
                        </label>
                        <input
                          type="time"
                          value={timeValue}
                          onChange={(e) => updateScheduledPost(post.id, dateValue, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            backgroundColor: '#0A0A0A',
                            border: '1px solid #3A3A3A',
                            borderRadius: '6px',
                            color: '#e5e5e5',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '10px',
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
                      <ZenRoughButton
                        label="Weiterbearbeiten"
                        size="small"
                        width={180}
                        height={36}
                        onClick={() => handleEditPostClick(post)}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Save Button */}
      {planningPosts.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ZenRoughButton
            label="Zeitplan speichern"
            icon={<FontAwesomeIcon icon={faSave} />}
            onClick={() => {
              void handleSaveSchedule({ closeAfter: true });
            }}
            variant={hasAnySchedule ? 'active' : 'default'}
          />
        </div>
      )}
    </div>
  );

  const renderKalenderContent = () => (
    <div style={{ padding: '24px' }}>
      {/* Stats Row */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          justifyContent: 'center',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setCalendarDetailDate(null);
            setCalendarStatusList(prev => (prev === 'scheduled' ? null : 'scheduled'));
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0A0A0A',
            borderRadius: '6px',
            border: '1px solid #AC8E66',
            textAlign: 'center',
            cursor: 'pointer',
          }}
          title="Geplante Posts anzeigen"
        >
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px', color: '#AC8E66', fontWeight: 'bold' }}>
            {scheduledCount}
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
            Geplant
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            setCalendarDetailDate(null);
            setCalendarStatusList(prev => (prev === 'draft' ? null : 'draft'));
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0A0A0A',
            borderRadius: '6px',
            border: '1px solid #3A3A3A',
            textAlign: 'center',
            cursor: 'pointer',
          }}
          title="Entwürfe anzeigen"
        >
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px', color: '#999', fontWeight: 'bold' }}>
            {draftCount}
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
            Entwürfe
          </div>
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <ZenRoughButton
          label="Kalender exportieren (ICS)"
          icon={<FontAwesomeIcon icon={faDownload} />}
          onClick={handleExportCalendar}
          variant={scheduledCount > 0 ? 'active' : 'default'}
        />
      </div>

      {calendarStatusList && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#0A0A0A',
            borderRadius: '10px',
            border: '1px solid #AC8E66',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px', color: '#e5e5e5' }}>
              {calendarStatusList === 'scheduled' ? 'Geplante Posts' : 'Entwürfe'}
            </div>
            <ZenCloseButton onClick={() => setCalendarStatusList(null)} />
          </div>
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {scheduledPosts
              .filter((post) => post.status === calendarStatusList)
              .map((post) => {
                const info = getPlatformInfo(post.platform);
                const edit = calendarEditMap[post.id] ?? { date: '', time: '' };
                return (
                  <div
                    key={post.id}
                    style={{
                      padding: '12px',
                      backgroundColor: '#1A1A1A',
                      borderRadius: '8px',
                      border: '1px solid #3A3A3A',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FontAwesomeIcon icon={info.icon} style={{ color: '#AC8E66' }} />
                        <div>
                          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: '#e5e5e5' }}>
                            {post.title || info.name}
                          </div>
                          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
                            {post.content ? post.content.slice(0, 90) : 'Kein Inhalt'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {calendarStatusList === 'draft' && (
                          <ZenRoughButton
                            label="Planen"
                            onClick={() => {
                              const today = new Date().toISOString().split('T')[0];
                              const updatedPost = {
                                ...post,
                                scheduledDate: new Date(today),
                                status: 'scheduled' as const,
                              };
                              onScheduledPostsChange?.(
                                scheduledPosts.map(p => p.id === post.id ? updatedPost : p)
                              );
                              setCalendarStatusList(null);
                            }}
                            variant="active"
                          />
                        )}
                        {calendarStatusList === 'scheduled' && (
                          <ZenRoughButton
                            label="Neu planen"
                            onClick={() => {
                              const updated: ScheduledPost[] = scheduledPosts.map(item => {
                                if (item.id !== post.id) return item;
                                const updatedDate = edit.date ? new Date(edit.date) : undefined;
                                const updatedTime = edit.time || undefined;
                                return {
                                  ...item,
                                  scheduledDate: updatedDate,
                                  scheduledTime: updatedTime,
                                  status: (updatedDate && updatedTime ? 'scheduled' : 'draft') as any,
                                };
                              });
                              onScheduledPostsChange?.(updated);
                              setCalendarStatusList(null);
                            }}
                            variant="active"
                          />
                        )}
                        <ZenRoughButton
                          label="Bearbeiten"
                          onClick={() => handleEditPostClick(post)}
                          variant="default"
                        />
                        <ZenRoughButton
                          label="Löschen"
                          onClick={() => {
                            onScheduledPostsChange?.(scheduledPosts.filter(item => item.id !== post.id));
                            setCalendarStatusList(null);
                          }}
                          variant="default"
                        />
                      </div>
                    </div>

                    {calendarStatusList === 'scheduled' && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                          type="date"
                          value={edit.date}
                          onChange={(e) => {
                            setCalendarEditMap(prev => ({ ...prev, [post.id]: { ...edit, date: e.target.value } }));
                          }}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#0A0A0A',
                            border: '1px solid #3A3A3A',
                            borderRadius: '6px',
                            color: '#e5e5e5',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '9px',
                          }}
                        />
                        <input
                          type="time"
                          value={edit.time}
                          onChange={(e) => {
                            setCalendarEditMap(prev => ({ ...prev, [post.id]: { ...edit, time: e.target.value } }));
                          }}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#0A0A0A',
                            border: '1px solid #3A3A3A',
                            borderRadius: '6px',
                            color: '#e5e5e5',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '11px',
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            {scheduledPosts.filter((post) => post.status === calendarStatusList).length === 0 && (
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#777' }}>
                Keine Einträge vorhanden.
              </div>
            )}
          </div>
        </div>
      )}

      {calendarDetailDate && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#0A0A0A',
            borderRadius: '10px',
            border: '1px solid #AC8E66',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px', color: '#e5e5e5' }}>
                {calendarDetailDate.toLocaleDateString('de-DE')}
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#777' }}>
                {calendarDetailPosts.length} Posts an diesem Tag
              </div>
            </div>
            <ZenCloseButton onClick={() => setCalendarDetailDate(null)} />
          </div>

          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {calendarDetailPosts.length === 0 && (
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#777' }}>
                Keine Posts an diesem Datum.
              </div>
            )}

            {calendarDetailPosts.map((post) => {
              const info = getPlatformInfo(post.platform);
              const edit = calendarEditMap[post.id] ?? { date: '', time: '' };
              return (
                <div
                  key={post.id}
                  style={{
                    padding: '12px',
                    backgroundColor: '#1A1A1A',
                    borderRadius: '8px',
                    border: '1px solid #3A3A3A',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FontAwesomeIcon icon={info.icon} style={{ color: '#AC8E66' }} />
                      <div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: '#e5e5e5' }}>
                          {post.title || info.name}
                        </div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
                          {post.content ? post.content.slice(0, 90) : 'Kein Inhalt'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <ZenRoughButton
                        label="Neu planen"
                        onClick={() => {
                          const updated: ScheduledPost[] = scheduledPosts.map(item => {
                            if (item.id !== post.id) return item;
                            const updatedDate = edit.date ? new Date(edit.date) : undefined;
                            const updatedTime = edit.time || undefined;
                            return {
                              ...item,
                              scheduledDate: updatedDate,
                              scheduledTime: updatedTime,
                              status: (updatedDate && updatedTime ? 'scheduled' : 'draft') as any,
                            };
                          });
                          onScheduledPostsChange?.(updated);
                          setCalendarDetailDate(null);
                        }}
                        variant="active"
                      />
                      <ZenRoughButton
                        label="Bearbeiten"
                        onClick={() => handleEditPostClick(post)}
                        variant="default"
                      />
                      <ZenRoughButton
                        label="Löschen"
                        onClick={() => {
                          onScheduledPostsChange?.(scheduledPosts.filter(item => item.id !== post.id));
                          setCalendarDetailDate(null);
                        }}
                        variant="default"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      type="date"
                      value={edit.date}
                      onChange={(e) => {
                        setCalendarEditMap(prev => ({ ...prev, [post.id]: { ...edit, date: e.target.value } }));
                      }}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: '#0A0A0A',
                        border: '1px solid #3A3A3A',
                        borderRadius: '6px',
                        color: '#e5e5e5',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '9px',
                      }}
                    />
                    <input
                      type="time"
                      value={edit.time}
                      onChange={(e) => {
                        setCalendarEditMap(prev => ({ ...prev, [post.id]: { ...edit, time: e.target.value } }));
                      }}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: '#0A0A0A',
                        border: '1px solid #3A3A3A',
                        borderRadius: '6px',
                        color: '#e5e5e5',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar Navigation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <button
          type="button"
          onClick={goToPreviousMonth}
          style={{
            padding: '6px 12px',
            backgroundColor: '#0A0A0A',
            border: '1px solid #3A3A3A',
            borderRadius: '4px',
            color: '#e5e5e5',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          ← Zurück
        </button>

        <div style={{ textAlign: 'center' }}>
          <h3
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '13px',
              color: '#e5e5e5',
              margin: 0,
            }}
          >
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button
            type="button"
            onClick={goToToday}
            style={{
              marginTop: '4px',
              padding: '3px 10px',
              backgroundColor: 'transparent',
              border: '1px solid #3A3A3A',
              borderRadius: '3px',
              color: '#999',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '9px',
              cursor: 'pointer',
            }}
          >
            Heute
          </button>
        </div>

        <button
          type="button"
          onClick={goToNextMonth}
          style={{
            padding: '6px 12px',
            backgroundColor: '#0A0A0A',
            border: '1px solid #3A3A3A',
            borderRadius: '4px',
            color: '#e5e5e5',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          Weiter →
        </button>
      </div>

      {/* Day Names */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '3px',
          marginBottom: '6px',
        }}
      >
        {DAY_NAMES.map(day => (
          <div
            key={day}
            style={{
              padding: '4px',
              textAlign: 'center',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '9px',
              color: '#777',
              fontWeight: 'bold',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '3px',
        }}
      >
        {days.map((date, index) => {
          const postsOnDate = getScheduledPostsForDate(date);
          const isCurrent = isCurrentMonth(date);
          const isTodayDate = isToday(date);
          const hasPosts = postsOnDate.length > 0;
          const dateKey = date.toISOString().split('T')[0];
          const isDragOver = dragOverDate === dateKey && isCurrent;

          return (
            <div
              key={index}
              onClick={() => {
                if (!isCurrent) return;
                setCalendarStatusList(null);
                setCalendarDetailDate(prev => {
                  if (prev && prev.toDateString() === date.toDateString()) return null;
                  return date;
                });
              }}
              onDragOver={(e) => {
                if (!isCurrent || !draggedPostId) return;
                e.preventDefault();
                setDragOverDate(dateKey);
              }}
              onDragLeave={() => {
                setDragOverDate(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (!isCurrent || !draggedPostId) return;

                // Update the post's scheduled date
                const updated = scheduledPosts.map(post => {
                  if (post.id !== draggedPostId) return post;
                  return {
                    ...post,
                    scheduledDate: date,
                    status: 'scheduled' as const,
                  };
                });
                onScheduledPostsChange?.(updated);
                setDraggedPostId(null);
                setDragOverDate(null);
              }}
              style={{
                minHeight: '60px',
                padding: '6px',
                backgroundColor: isDragOver ? '#2A2A1A' : (isTodayDate ? 'transparent' : '#1A1A1A'),
                border: `1px solid ${isDragOver ? '#AC8E66' : (isTodayDate ? '#AC8E66' : '#3A3A3A')}`,
                borderRadius: '4px',
                opacity: isCurrent ? 1 : 0.3,
                cursor: isCurrent ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                transform: isDragOver ? 'scale(1.02)' : 'none',
              }}
            >
              {/* Date Number */}
              <div
                style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '11px',
                  color: isTodayDate ? '#fff' : '#e5e5e5',
                  fontWeight: 'bold',
                  marginBottom: '3px',
                }}
              >
                {date.getDate()}
              </div>

              {/* Posts */}
              {hasPosts && (
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
                  onDragOver={(e) => {
                    if (!isCurrent || !draggedPostId) return;
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverDate(dateKey);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isCurrent || !draggedPostId) return;
                    const updated = scheduledPosts.map(p => {
                      if (p.id !== draggedPostId) return p;
                      return { ...p, scheduledDate: date, status: 'scheduled' as const };
                    });
                    onScheduledPostsChange?.(updated);
                    setDraggedPostId(null);
                    setDragOverDate(null);
                  }}
                >
                  {postsOnDate.slice(0, 2).map(post => {
                    const info = getPlatformInfo(post.platform);
                    const isDragging = draggedPostId === post.id;
                    return (
                      <div
                        key={post.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggedPostId(post.id);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', post.id);
                        }}
                        onDragEnd={() => {
                          setDraggedPostId(null);
                          setDragOverDate(null);
                        }}
                        onDragOver={(e) => {
                          if (!draggedPostId || isDragging) return;
                          e.preventDefault();
                          setDragOverDate(dateKey);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!isCurrent || !draggedPostId || isDragging) return;
                          const updated = scheduledPosts.map(p => {
                            if (p.id !== draggedPostId) return p;
                            return { ...p, scheduledDate: date, status: 'scheduled' as const };
                          });
                          onScheduledPostsChange?.(updated);
                          setDraggedPostId(null);
                          setDragOverDate(null);
                        }}
                        style={{
                          padding: '2px 3px',
                          backgroundColor: isDragging ? '#2A2A1A' : '#0A0A0A',
                          borderRadius: '2px',
                          fontSize: '9px',
                          fontFamily: 'IBM Plex Mono, monospace',
                          color: '#AC8E66',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          cursor: isDragging ? 'grabbing' : 'grab',
                          opacity: isDragging ? 0.5 : 1,
                          border: isDragging ? '1px dashed #AC8E66' : '1px solid transparent',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (draggedPostId) return;
                          setCalendarStatusList(null);
                          setCalendarDetailDate(date);
                        }}
                      >
                        <FontAwesomeIcon icon={info.icon} style={{ fontSize: '8px', color: '#AC8E66' }} />
                        <span style={{ fontSize: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {info.name} · {post.scheduledTime || '--:--'}
                        </span>
                      </div>
                    );
                  })}
                  {postsOnDate.length > 2 && (
                    <div
                      style={{
                        fontSize: '7px',
                        fontFamily: 'IBM Plex Mono, monospace',
                        color: '#777',
                        textAlign: 'center',
                      }}
                    >
                      +{postsOnDate.length - 2}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );

  const checklistSections = useMemo(() => {
    const itemsByPost = new Map<string, ChecklistItem[]>();
    checklistItems.forEach(item => {
      const key = item.postId ?? 'unassigned';
      if (!itemsByPost.has(key)) itemsByPost.set(key, []);
      itemsByPost.get(key)?.push(item);
    });

    const orderedSections = planningPosts.map(post => ({
      post,
      items: itemsByPost.get(post.id) ?? [],
    }));

    const unassigned = itemsByPost.get('unassigned') ?? [];
    return { orderedSections, unassigned };
  }, [checklistItems, planningPosts]);

  const renderChecklistContent = () => (
    <div style={{ padding: '24px' }}>
      {/* Progress Overview */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          backgroundColor: '#1A1A1A',
          paddingBottom: '12px',
        }}
      >
        <div
          style={{
            padding: '16px',
            backgroundColor: '#0A0A0A',
            borderRadius: '8px',
            border: '1px solid #AC8E66',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '12px',
                  color: '#e5e5e5',
                  margin: 0,
                  marginBottom: '2px',
                }}
              >
                Workflow Fortschritt
              </h3>
              <p
                style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '10px',
                  color: '#777',
                  margin: 0,
                }}
              >
                {completedCount} von {totalCount} Aufgaben erledigt
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['all', 'open'] as const).map(scope => {
                  const isActive = workflowProgressScope === scope;
                  return (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => setWorkflowProgressScope(scope)}
                      style={{
                        backgroundColor: isActive ? '#AC8E66' : '#1A1A1A',
                        border: '1px solid #3A3A3A',
                        color: isActive ? '#0A0A0A' : '#AC8E66',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '9px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                      title={scope === 'all' ? 'Alle Aufgaben' : 'Nur geöffnete Sektionen'}
                    >
                      {scope === 'all' ? 'Alle' : 'Geöffnet'}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setIsWorkflowCollapsed(prev => !prev)}
                onMouseEnter={() => setTooltipState({
                  scope: 'workflow',
                  text: isWorkflowCollapsed ? 'Workflow einblenden' : 'Workflow ausblenden',
                })}
                onMouseLeave={() => setTooltipState({ scope: null, text: null })}
                style={{
                  backgroundColor: '#1A1A1A',
                  border: '1px solid #3A3A3A',
                  color: '#AC8E66',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '10px',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                <FontAwesomeIcon icon={isWorkflowCollapsed ? faChevronRight : faChevronDown} />
              </button>
              <div
                style={{
                  fontSize: '24px',
                  fontFamily: 'IBM Plex Mono, monospace',
                  color: '#AC8E66',
                  fontWeight: 'bold',
                }}
              >
                {completionPercentage}%
              </div>
            </div>
          </div>
          {tooltipState.scope === 'workflow' && tooltipState.text && (
            <div
              style={{
                marginTop: '6px',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '9px',
                color: '#AC8E66',
              }}
            >
              {tooltipState.text}
            </div>
          )}

          {/* Progress Bar */}
          {!isWorkflowCollapsed && (
            <>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: '#1A1A1A',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${completionPercentage}%`,
                    backgroundColor: '#AC8E66',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              {/* Post Stats */}
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '12px',
                }}
              >
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '16px', color: '#AC8E66', fontWeight: 'bold' }}>
                    {scheduledCount}
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
                    Geplant
                  </div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '16px', color: '#999', fontWeight: 'bold' }}>
                    {draftCount}
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
                    Entwürfe
                  </div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '16px', color: '#e5e5e5', fontWeight: 'bold' }}>
                    {scheduledPosts.length}
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
                    Gesamt
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginTop: '10px',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '9px',
                  color: '#777',
                }}
              >
                {openedChecklistPosts.length > 0
                  ? `Geöffnet: ${openedChecklistPosts.length} · ${openedChecklistPosts
                      .map(post => getPlatformInfo(post.platform).name)
                      .join(', ')}`
                  : 'Geöffnet: keine'}
              </div>
              <div
                style={{
                  marginTop: '8px',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '9px',
                  color: '#777',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <span>Projekt:</span>
                <span style={{ color: '#AC8E66' }}>{projectPath ?? '—'}</span>
                {onReloadSchedule && (
                  <button
                    type="button"
                    onClick={onReloadSchedule}
                    style={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #3A3A3A',
                      color: '#AC8E66',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '9px',
                      padding: '3px 6px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Neu laden
                  </button>
                )}
              </div>
              <div
                style={{
                  marginTop: '6px',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '9px',
                  color: '#777',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <span>Schedule:</span>
                <span style={{ color: '#AC8E66' }}>{publishingPaths?.scheduleFile ?? '—'}</span>
                <button
                  type="button"
                  onClick={writeTestSchedule}
                  style={{
                    backgroundColor: '#1A1A1A',
                    border: '1px solid #3A3A3A',
                    color: '#AC8E66',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '9px',
                    padding: '3px 6px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Test schreiben
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Platform Overview */}
      {planningPosts.length > 0 && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#1A1A1A',
            borderRadius: '6px',
            border: '1px solid #3A3A3A',
          }}
        >
          <h4
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              color: '#e5e5e5',
              margin: 0,
              marginBottom: '10px',
            }}
          >
            Deine geplanten Post von
          </h4>
          <div
            style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
            }}
          >
            {planningPosts.map(post => {
              const info = getPlatformInfo(post.platform);
              return (
                <div
                  key={post.id}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: '#0A0A0A',
                    borderRadius: '4px',
                    border: '1px solid #3A3A3A',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                  onClick={() => scrollToChecklistPost(post.id)}
                >
                  <span style={{ fontSize: '14px' }}>{info.emoji}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#e5e5e5' }}>
                    {info.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Checklist */}
      <div style={{ marginBottom: '16px' }}>
        <h4
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            color: '#e5e5e5',
            margin: 0,
            marginBottom: '10px',
          }}
        >
          <FontAwesomeIcon icon={faClipboardList} style={{ marginRight: '6px',marginTop: '-2px', color: '#AC8E66' , fontSize: '14px' }} /> 
            Deine Aufgaben
        </h4>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <button
            type="button"
            onClick={() => setAllChecklistCollapsed(true)}
            onMouseEnter={() => setTooltipState({ scope: 'checklist', text: 'Alle einklappen' })}
            onMouseLeave={() => setTooltipState({ scope: null, text: null })}
            style={{
              backgroundColor: '#1A1A1A',
              border: '1px solid #3A3A3A',
              color: '#AC8E66',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              padding: '4px 6px',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <FontAwesomeIcon icon={faCompress} />
          </button>
          <button
            type="button"
            onClick={() => setAllChecklistCollapsed(false)}
            onMouseEnter={() => setTooltipState({ scope: 'checklist', text: 'Alle ausklappen' })}
            onMouseLeave={() => setTooltipState({ scope: null, text: null })}
            style={{
              backgroundColor: '#1A1A1A',
              border: '1px solid #3A3A3A',
              color: '#AC8E66',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              padding: '4px 6px',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <FontAwesomeIcon icon={faExpand} />
          </button>
        </div>
        {tooltipState.scope === 'checklist' && tooltipState.text && (
          <div
            style={{
              marginTop: '-4px',
              marginBottom: '8px',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '9px',
              color: '#AC8E66',
            }}
          >
            {tooltipState.text}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {checklistSections.orderedSections.map(({ post, items }) => {
            const info = getPlatformInfo(post.platform);
            const schedule = schedules[post.id];
            const dateLabel = schedule?.date
              ? new Date(schedule.date).toLocaleDateString('de-DE')
              : 'Entwurf';
            const timeLabel = schedule?.time ? ` · ${schedule.time}` : '';
            const postTitle = post.title || info.name;
            const postSubtitle = post.subtitle?.trim();
            const isCollapsed = !!collapsedChecklistPosts[post.id];
            const isHighlighted = highlightChecklistPostId === post.id;

            return (
              <div
                key={post.id}
                ref={(node) => {
                  checklistSectionRefs.current[post.id] = node;
                }}
                style={{
                  padding: '10px',
                  backgroundColor: isHighlighted ? '#142015' : '#121212',
                  borderRadius: '6px',
                  border: `1px solid ${isHighlighted ? '#3FB950' : '#3A3A3A'}`,
                  boxShadow: isHighlighted ? '0 0 0 1px #3FB950 inset' : 'none',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setCollapsedChecklistPosts(prev => ({
                      ...prev,
                      [post.id]: !prev[post.id],
                    }));
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FontAwesomeIcon icon={info.icon} style={{ color: '#AC8E66', fontSize: '12px' }} />
                    <div>
                      <div
                        style={{
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '10px',
                          color: '#e5e5e5',
                        }}
                      >
                        {info.name} · {postTitle}
                      </div>
                      {postSubtitle && (
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
                          {postSubtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
                    {dateLabel}{timeLabel} {isCollapsed ? '▸' : '▾'}
                  </div>
                </div>

                {!isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {items.map(item => {
                    const isCompleted = item.completed;
                    return (
                      <label
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          backgroundColor: isCompleted ? '#1A1A1A' : '#0A0A0A',
                          border: `1px solid ${isCompleted ? '#AC8E66' : '#3A3A3A'}`,
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={() => {
                            setChecklistItems(prev =>
                              prev.map(current =>
                                current.id === item.id
                                  ? { ...current, completed: !current.completed }
                                  : current,
                              ),
                            );
                          }}
                          style={{
                            width: '16px',
                            height: '16px',
                            cursor: 'pointer',
                            accentColor: '#AC8E66',
                          }}
                        />
                        <span
                          style={{
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '10px',
                            color: isCompleted ? '#777' : '#e5e5e5',
                            textDecoration: isCompleted ? 'line-through' : 'none',
                            flex: 1,
                          }}
                        >
                          {item.text}
                        </span>
                        {isCompleted && <span style={{ fontSize: '12px' }}>✓</span>}
                      </label>
                    );
                  })}
                  {items.length === 0 && (
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
                      Keine Aufgaben für diesen Post.
                    </div>
                  )}
                  </div>
                )}
              </div>
            );
          })}

          {checklistSections.unassigned.length > 0 && (
            <div
              style={{
                padding: '10px',
                backgroundColor: '#121212',
                borderRadius: '6px',
                border: '1px dashed #3A3A3A',
              }}
            >
              <div
                style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '10px',
                  color: '#777',
                  marginBottom: '8px',
                }}
              >
                Weitere Aufgaben
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {checklistSections.unassigned.map(item => {
                  const isCompleted = item.completed;
                  return (
                    <label
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        backgroundColor: isCompleted ? '#1A1A1A' : '#0A0A0A',
                        border: `1px solid ${isCompleted ? '#AC8E66' : '#3A3A3A'}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => {
                          setChecklistItems(prev =>
                            prev.map(current =>
                              current.id === item.id
                                ? { ...current, completed: !current.completed }
                                : current,
                            ),
                          );
                        }}
                        style={{
                          width: '16px',
                          height: '16px',
                          cursor: 'pointer',
                          accentColor: '#AC8E66',
                        }}
                      />
                      <span
                        style={{
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '10px',
                          color: isCompleted ? '#777' : '#e5e5e5',
                          textDecoration: isCompleted ? 'line-through' : 'none',
                          flex: 1,
                        }}
                      >
                        {item.text}
                      </span>
                      {isCompleted && <span style={{ fontSize: '12px' }}>✓</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Custom Task */}
      <div
        style={{
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: '#1A1A1A',
          borderRadius: '6px',
          border: '1px solid #3A3A3A',
        }}
      >
        <h4
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            color: '#e5e5e5',
            margin: 0,
            marginBottom: '10px',
          }}
        >
        <span className="inline-flex items-center gap-2">
  <FontAwesomeIcon icon={faCirclePlus} style={{ fontSize: '14px', color: '#AC8E66', marginTop: '-2px', marginRight: '6px' }} />
   Eigene Aufgabe hinzufügen
</span>
        </h4>
        <div style={{ display: 'flex', gap: '6px' }}>
          {planningPosts.length > 0 && (
            <ZenDropdown
              value={checklistTargetPostId ?? planningPosts[0]?.id}
              onChange={(value) => setChecklistTargetPostId(value as string)}
              options={planningPosts.map(post => {
                const info = getPlatformInfo(post.platform);
                const label = `${info.name} · ${post.title || 'Post'}`;
                return { value: post.id, label };
              })}
              variant="compact"
            />
          )}
          <input
            type="text"
            value={customTask}
            onChange={(e) => setCustomTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomTask()}
            placeholder="Neue Aufgabe..."
            style={{
              flex: 1,
              padding: '6px 10px',
              backgroundColor: '#0A0A0A',
              border: '1px solid #3A3A3A',
              borderRadius: '4px',
              color: '#e5e5e5',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
            }}
          />
          <button
            onClick={addCustomTask}
            style={{
              padding: '6px 12px',
              backgroundColor: '#AC8E66',
              border: 'none',
              borderRadius: '4px',
              color: '#0A0A0A',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Export */}
      <div
        style={{
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: '#1A1A1A',
          borderRadius: '6px',
          border: '1px solid #3A3A3A',
        }}
      >
        <h4
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            color: '#e5e5e5',
            margin: 0,
            marginBottom: '10px',
          }}
        >
           <FontAwesomeIcon icon={faDownload} style={{ fontSize: '14px', color: '#AC8E66', marginRight: '6px', marginTop: '-2px' }}   />

          Export (JSON → MD / CSV / PDF)
        </h4>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
          {(['all', 'open'] as const).map(scope => {
            const isActive = workflowProgressScope === scope;
            return (
              <button
                key={scope}
                type="button"
                onClick={() => setWorkflowProgressScope(scope)}
                style={{
                  backgroundColor: isActive ? '#AC8E66' : '#1A1A1A',
                  border: '1px solid #3A3A3A',
                  color: isActive ? '#0A0A0A' : '#AC8E66',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '9px',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                title={scope === 'all' ? 'Alle Posts exportieren' : 'Nur geöffnete Posts exportieren'}
              >
                {scope === 'all' ? 'Alle' : 'Geöffnet'}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <ZenRoughButton
            label="JSON"
            onClick={async () => {
              const content = JSON.stringify(exportPayload, null, 2);
              const filename = 'zenpost-export.json';
              if (isTauri()) {
                const filePath = await save({
                  defaultPath: filename,
                  filters: [{ name: 'JSON', extensions: ['json'] }],
                });
                if (filePath) await writeTextFile(filePath, content);
              } else if (typeof window !== 'undefined') {
                const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
              }
            }}
          />
          <ZenRoughButton
            label="Markdown"
            onClick={async () => {
              const content = exportPayloadToMarkdown(exportPayload);
              const filename = 'zenpost-export.md';
              if (isTauri()) {
                const filePath = await save({
                  defaultPath: filename,
                  filters: [{ name: 'Markdown', extensions: ['md'] }],
                });
                if (filePath) await writeTextFile(filePath, content);
              } else if (typeof window !== 'undefined') {
                const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
              }
            }}
          />
          <ZenRoughButton
            label="CSV"
            onClick={async () => {
              const content = exportPayloadToCsv(exportPayload);
              const filename = 'zenpost-export.csv';
              if (isTauri()) {
                const filePath = await save({
                  defaultPath: filename,
                  filters: [{ name: 'CSV', extensions: ['csv'] }],
                });
                if (filePath) await writeTextFile(filePath, content);
              } else if (typeof window !== 'undefined') {
                const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
              }
            }}
          />
          <ZenRoughButton
            label="PDF"
            onClick={async () => {
              const buffer = await exportPayloadToPdf(exportPayload);
              const filename = 'zenpost-export.pdf';
              if (isTauri()) {
                const filePath = await save({
                  defaultPath: filename,
                  filters: [{ name: 'PDF', extensions: ['pdf'] }],
                });
                if (filePath) {
                  const normalizedPath = filePath.toLowerCase().endsWith('.pdf')
                    ? filePath
                    : `${filePath}.pdf`;
                  await writeFile(normalizedPath, buffer);
                }
              } else if (typeof window !== 'undefined') {
                const arrayBuffer = buffer.slice().buffer as ArrayBuffer;
                const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
              }
            }}
          />
          <ZenRoughButton
            label="XLSX (Checklist)"
            onClick={async () => {
              const buffer = await formatChecklistAsXlsx(checklistItems, 'zenpost-checklist');
              const filename = 'zenpost-checklist.xlsx';
              if (isTauri()) {
                const filePath = await save({
                  defaultPath: filename,
                  filters: [{ name: 'Excel', extensions: ['xlsx'] }],
                });
                if (filePath) {
                  const normalizedPath = filePath.toLowerCase().endsWith('.xlsx')
                    ? filePath
                    : `${filePath}.xlsx`;
                  await writeFile(normalizedPath, buffer);
                }
              } else if (typeof window !== 'undefined') {
                const arrayBuffer = buffer.slice().buffer as ArrayBuffer;
                const blob = new Blob([arrayBuffer], {
                  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
              }
            }}
          />
        </div>
      </div>

      {/* Completion Message */}
      {completionPercentage === 100 && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#AC8E66',
            borderRadius: '6px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '6px' }}>🎉</div>
          <p
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              color: '#0A0A0A',
              fontWeight: 'bold',
              margin: 0,
            }}
          >
            Perfekt! Alle Aufgaben erledigt. Du bist bereit zum Veröffentlichen!
          </p>
        </div>
      )}

      {/* Resource Buttons */}
      <div
        style={{
          padding: '12px',
          backgroundColor: '#1A1A1A',
          borderRadius: '6px',
          border: '1px solid #3A3A3A',
        }}
      >
        <h4
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            color: '#e5e5e5',
            margin: 0,
            marginBottom: '10px',
          }}
        >
            <FontAwesomeIcon icon={faCircleQuestion}  style={{ fontSize: '14px', color: '#AC8E66', marginRight: '6px' }} />
                     Hilfreiche Ressourcen
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <ZenRoughButton
            label="Wiki & Dokumentation"
            icon={<FontAwesomeIcon icon={faBook} className="text-[#AC8E66]" />}
            href="https://github.com/THEORIGINALBITTER/zenpost-studio/wiki"
            target="_blank"
            rel="noopener noreferrer"
          />
          
        </div>
      </div>
    </div>
  );

  // Modal-Content aus zentraler Config
  const content = MODAL_CONTENT.planner;

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={() => {
        void handleSaveSchedule({ closeAfter: true });
      }}
      title={content.title}
      subtitle={content.subtitle}
      fullscreen
      showCloseButton={true}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Tabs */}
        <div style={{ padding: '0 24px' }}>
          <div style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #AC8E66',
            paddingBottom: '0',
          }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  backgroundColor: activeTab === tab.id ? '#AC8E66' : 'transparent',
                  border: 'none',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '13px',
                  color: activeTab === tab.id ? '#0A0A0A' : '#999',
                  fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                  transition: 'all 0.2s',
                }}
              >
                <FontAwesomeIcon icon={tab.icon} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'planen' && renderPlanenContent()}
          {activeTab === 'kalender' && renderKalenderContent()}
          {activeTab === 'checklist' && renderChecklistContent()}
        </div>
      </div>
    </ZenModal>
  );
}
