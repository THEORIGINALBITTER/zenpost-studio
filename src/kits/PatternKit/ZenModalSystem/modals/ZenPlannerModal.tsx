import { useState, useEffect, useMemo, useRef, useCallback, type DragEvent } from 'react';
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
  faCheck,
  faImage,

  faCirclePlus,
  faCircleQuestion,
  faDownload,
  faChevronDown,
  faChevronRight,
  faChevronLeft,

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
import { ZenExportCard } from '../components/ZenExportCard';
import { ZenDropdown } from '../components/ZenDropdown';
import { ZenCloseButton } from '../../../DesignKit/ZenCloseButton';
import { ZenAddButton } from '../../../DesignKit/ZenAddButton';
import { ZenMarkdownEditor } from '../../ZenMarkdownEditor';
import { downloadICSFile, generateICSFile } from '../../../../utils/calendarExport';
import type { ScheduledPost, SocialPlatform, PublishingStatus } from '../../../../types/scheduling';
import { deletePost, getPublishingPaths, initializePublishingProject, loadSchedule, saveScheduledPostsWithFiles } from '../../../../services/publishingService';
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
  initialSchedules?: Partial<Record<SocialPlatform, { date: string; time: string }>>;
  defaultTab?: 'planen' | 'kalender' | 'checklist';
  suggestedEditorPost?: {
    key: string;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    content: string;
    platform?: string;
  };
}

type TabType = 'planen' | 'kalender' | 'checklist';
type CalendarView = 'month' | 'week';

type PostSchedule = { date: string; time: string };
type ScheduleMap = Record<string, PostSchedule>;
type PlannerPost = {
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

type PlannerStorage = {
  version: '1.0.0';
  updatedAt: string;
  manualPosts: PlannerPost[];
  schedules: ScheduleMap;
  checklistItems: ChecklistItem[];
};

// ==================== CONSTANTS ====================



const PLATFORM_INFO: Record<SocialPlatform, { name: string; color: string; icon: IconDefinition; bg: string; }> = {
     
  linkedin: { name: 'LinkedIn', color: '#0077B5', icon: faLinkedin, bg: '#0077B51A',  },
  reddit: { name: 'Reddit', color: '#FF4500', icon: faReddit, bg: '#FF45001A1A', },
  github: { name: 'GitHub', color: '#181717', icon: faGithub, bg: '#1817171A', },
  devto: { name: 'Dev.to', color: '#0A0A0A', icon: faDev, bg: '#0A0A0A1A', },
  medium: { name: 'Medium', color: '#00AB6C', icon: faMedium, bg: '#00AB6C1A', },
  hashnode: { name: 'Hashnode', color: '#2962FF', icon: faHashnode, bg: '#2962FF1A', },
  twitter: { name: 'Twitter/X', color: '#1DA1F2', icon: faTwitter, bg: '#1DA1F21A', },
};



const UNKNOWN_PLATFORM_INFO = { name: 'Unbekannt', color: '#888', icon: faCircleQuestion, bg: '#8888881A' };

const getPlatformInfo = (platform: SocialPlatform | undefined) =>
  (platform ? PLATFORM_INFO[platform] : undefined) ?? UNKNOWN_PLATFORM_INFO;

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

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
  { id: 'checklist', label: 'ToDo', icon: faClipboardList },
];

const DEFAULT_CHECKLIST_COLLAPSED = false;
const DEFAULT_WORKFLOW_COLLAPSED = false;
const WORKFLOW_COLLAPSED_KEY = 'zenpost_checklist_workflow_collapsed';
const CHECKLIST_COLLAPSED_KEY = 'zenpost_checklist_all_collapsed';
const WORKFLOW_SCOPE_KEY = 'zenpost_checklist_workflow_scope';

// ==================== HELPER FUNCTIONS ====================
const buildStableContentId = (platform: string, content: string, title: string): string => {
  const source = `${platform}-${title}-${content.substring(0, 100)}`;
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    const char = source.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `content-${platform}-${Math.abs(hash).toString(36)}`;
};

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

const sanitizeBaseName = (input: string): string =>
  input
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Post';

const buildPlannerFileName = (base: string, dateStr: string, version: number) =>
  `${base}_${dateStr}_v${version}.md`;

const resolvePlannerSavePath = async (
  projectPath: string,
  baseName: string,
  dateStr: string
): Promise<string> => {
  let version = 1;
  let candidate = buildPlannerFileName(baseName, dateStr, version);
  while (await exists(`${projectPath}/${candidate}`)) {
    version += 1;
    candidate = buildPlannerFileName(baseName, dateStr, version);
  }
  return `${projectPath}/${candidate}`;
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

const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromDateKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map((v) => Number(v));
  return new Date(year, (month || 1) - 1, day || 1);
};

// ==================== MAIN COMPONENT ====================

export function ZenPlannerModal({
  isOpen,
  onClose,
  scheduledPosts,
  projectPath,
  projectName,
  posts = [],
  onScheduleSave,
  onScheduledPostsChange,
  onEditPost,
  onAddPost: _onAddPost,
  preSelectedDate,
  initialSchedules,
  defaultTab = 'planen',
  suggestedEditorPost,
}: ZenPlannerModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [plannerLoaded, setPlannerLoaded] = useState(false);
  const [showPlanenScheduledPosts, setShowPlanenScheduledPosts] = useState(false);
  const [plannerStoragePath, setPlannerStoragePath] = useState<string | null>(null);
  const [plannerProjectPath, setPlannerProjectPath] = useState<string | null>(null);
  const lastLoadedPathRef = useRef<string | null>(null);
  const [reschedulePost, setReschedulePost] = useState<ScheduledPost | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [dismissedSuggestionKeys, setDismissedSuggestionKeys] = useState<Record<string, true>>({});
  const [suggestedImportPlatform, setSuggestedImportPlatform] = useState<SocialPlatform>('linkedin');

  
   // ==================== Alle Task Schliessen  STATE ====================



  // ==================== PLANEN STATE ====================
  const initialDate = preSelectedDate ? preSelectedDate.toISOString().split('T')[0] : '';

  // ==================== MANUAL PLAN POSTS ====================
  const [manualPosts, setManualPosts] = useState<PlannerPost[]>([]);
  const [newPostPlatform, setNewPostPlatform] = useState<SocialPlatform>('linkedin');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostSubtitle, setNewPostSubtitle] = useState('');
  const [newPostImageUrl, setNewPostImageUrl] = useState('');
  const [isNewPostImageDragActive, setIsNewPostImageDragActive] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostDate, setNewPostDate] = useState('');
  const [newPostTime, setNewPostTime] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setShowChecklistExportModal(false);
      setReschedulePost(null);
      setDismissedSuggestionKeys({});
      return;
    }
    setShowPlanenScheduledPosts(posts.length === 0);
  }, [isOpen, posts.length]);

  const planningPosts = useMemo<PlannerPost[]>(() => {
    // Combine posts from editor with stable IDs
    const fromEditor = posts.map((post) => {
      // First try to find an existing scheduled post with same platform+content
      const existingId = scheduledPosts.find(
        p => p.platform === post.platform && p.content === post.content
      )?.id ?? null;
      // Use existing ID if found, otherwise generate a stable content-based ID
      const id = existingId ?? buildStableContentId(post.platform, post.content, post.title);

      return {
        ...post,
        id,
        source: 'content' as const,
      };
    });

    // Convert scheduledPosts to PlannerPost format (avoid duplicates by ID)
    const existingIds = new Set([
      ...fromEditor.map(p => p.id),
      ...manualPosts.map(p => p.id),
    ]);

    const fromScheduled: PlannerPost[] = posts.length === 0
      ? scheduledPosts
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
          }))
      : [];

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
  const [showChecklistExportModal, setShowChecklistExportModal] = useState(false);
  const [customTask, setCustomTask] = useState('');
  const [editingChecklistItemId, setEditingChecklistItemId] = useState<string | null>(null);
  const [editingChecklistText, setEditingChecklistText] = useState('');
  const [checklistTargetPostId, setChecklistTargetPostId] = useState<string | null>(null);
  const [checklistBulkPostId, setChecklistBulkPostId] = useState<string | null>(null);
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

  const checklistBulkItems = useMemo(() => {
    if (!checklistBulkPostId) return checklistVisibleItems;
    return checklistVisibleItems.filter(item => item.postId === checklistBulkPostId);
  }, [checklistVisibleItems, checklistBulkPostId]);

  const allChecklistBulkItemsCompleted =
    checklistBulkItems.length > 0 &&
    checklistBulkItems.every(item => item.completed);

  const selectedChecklistBulkPost = useMemo(
    () => planningPosts.find(post => post.id === checklistBulkPostId) ?? null,
    [planningPosts, checklistBulkPostId],
  );

  const toggleChecklistBulkItems = () => {
    if (checklistBulkItems.length === 0) return;

    setChecklistItems(prev =>
      prev.map(item => {
        const matchesScope = checklistBulkPostId
          ? item.postId === checklistBulkPostId
          : true;

        return matchesScope
          ? { ...item, completed: !allChecklistBulkItemsCompleted }
          : item;
      }),
    );
  };

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
          ...posts.map((post) => {
            const existingId = scheduledPosts.find(
              p => p.platform === post.platform && p.content === post.content
            )?.id ?? null;
            const id = existingId ?? buildStableContentId(post.platform, post.content, post.title);
            return {
              ...post,
              id,
              source: 'content' as const,
            };
          }),
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

  const effectiveScheduledPosts = useMemo<ScheduledPost[]>(() => {
    const merged = new Map<string, ScheduledPost>();

    scheduledPosts.forEach((post) => {
      merged.set(post.id, post);
    });

    planningPosts.forEach((post) => {
      const schedule = schedules[post.id] ?? { date: '', time: '' };
      const scheduledDate = schedule.date ? new Date(schedule.date) : undefined;
      const scheduledTime = schedule.time || undefined;
      const status: PublishingStatus = (schedule.date && schedule.time) ? 'scheduled' : 'draft';
      const existing = merged.get(post.id);

      const resolvedProjectId = existing?.projectId ?? projectPath ?? undefined;
      const resolvedProjectName = existing?.projectName
        ?? projectName
        ?? (projectPath ? projectPath.split('/').pop() ?? projectPath : undefined);

      merged.set(post.id, {
        id: post.id,
        platform: post.platform,
        title: post.title || existing?.title || '',
        subtitle: post.subtitle || existing?.subtitle,
        content: post.content || existing?.content || '',
        scheduledDate,
        scheduledTime,
        status,
        characterCount: post.characterCount || existing?.characterCount || 0,
        wordCount: post.wordCount || existing?.wordCount || 0,
        createdAt: existing?.createdAt ?? new Date(),
        savedFilePath: existing?.savedFilePath,
        projectId: resolvedProjectId,
        projectName: resolvedProjectName,
      });
    });

    return Array.from(merged.values());
  }, [planningPosts, schedules, scheduledPosts]);

  // ==================== INLINE POST EDITOR ====================
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [isEditImageDragActive, setIsEditImageDragActive] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [isPlanenInfoCollapsed, setIsPlanenInfoCollapsed] = useState(false);

  const openInlineEdit = (post: ScheduledPost) => {
    setEditingPost(post);
    setEditTitle(post.title || '');
    setEditSubtitle(post.subtitle || '');
    setEditImageUrl(post.imageUrl || '');
    setEditContent(post.content || '');
    const dateStr = post.scheduledDate
      ? (post.scheduledDate instanceof Date ? post.scheduledDate : new Date(post.scheduledDate)).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    setEditDate(dateStr);
    setEditTime(post.scheduledTime || getDefaultTime());
  };

  const handleEditImageDrop = useCallback(async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsEditImageDragActive(false);
    const imageFiles = Array.from(event.dataTransfer?.files ?? []).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      try {
        const dataUrl = await fileToDataUrl(imageFiles[0]);
        setEditImageUrl(dataUrl);
        return;
      } catch { return; }
    }
    const droppedUrl = extractDroppedImageUrl(event);
    if (droppedUrl) setEditImageUrl(droppedUrl);
  }, []);

  const saveInlineEdit = () => {
    if (!editingPost || !onScheduledPostsChange) return;
    const trimmedContent = editContent.trim();
    const updatedPost: ScheduledPost = {
      ...editingPost,
      title: editTitle.trim() || editingPost.title,
      subtitle: editSubtitle.trim() || undefined,
      imageUrl: editImageUrl.trim() || undefined,
      content: trimmedContent,
      characterCount: trimmedContent.length,
      wordCount: trimmedContent ? trimmedContent.split(/\s+/).filter(Boolean).length : 0,
      scheduledDate: editDate ? new Date(editDate) : editingPost.scheduledDate,
      scheduledTime: editTime || editingPost.scheduledTime,
      status: (editDate && editTime ? 'scheduled' : 'draft') as PublishingStatus,
    };
    // Update schedules map too
    if (editDate) {
      setSchedules(prev => ({
        ...prev,
        [editingPost.id]: { date: editDate, time: editTime || '' },
      }));
    }
    // Push to manualPosts (replace if exists, else add)
    setManualPosts(prev => {
      const exists = prev.some(p => p.id === editingPost.id);
      const asPlannerPost = {
        id: updatedPost.id,
        platform: updatedPost.platform,
        title: updatedPost.title,
        subtitle: updatedPost.subtitle,
        imageUrl: updatedPost.imageUrl,
        content: updatedPost.content,
        characterCount: updatedPost.characterCount,
        wordCount: updatedPost.wordCount,
        source: 'manual' as const,
      };
      if (exists) return prev.map(p => p.id === editingPost.id ? asPlannerPost : p);
      return [...prev, asPlannerPost];
    });
    // Also persist via onScheduledPostsChange
    const merged = new Map<string, ScheduledPost>();
    effectiveScheduledPosts.forEach(p => merged.set(p.id, p));
    merged.set(updatedPost.id, updatedPost);
    onScheduledPostsChange(Array.from(merged.values()));
    setEditingPost(null);
  };

  // ==================== KALENDER STATE ====================
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [calendarDetailDate, setCalendarDetailDate] = useState<Date | null>(null);
  const [calendarEditMap, setCalendarEditMap] = useState<Record<string, PostSchedule>>({});
  const [calendarStatusList, setCalendarStatusList] = useState<'scheduled' | 'draft' | null>(null);
  const [calendarProjectFilter, setCalendarProjectFilter] = useState<string | null>(null);

  // Collect unique projects from all posts (for filter dropdown)
  const availableProjects = useMemo(() => {
    const map = new Map<string, string>(); // projectId → projectName
    effectiveScheduledPosts.forEach((p) => {
      if (p.projectId) map.set(p.projectId, p.projectName ?? p.projectId.split('/').pop() ?? p.projectId);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [effectiveScheduledPosts]);

  // Posts filtered by project (used in calendar rendering and status list)
  const projectFilteredPosts = useMemo(() => {
    if (!calendarProjectFilter) return effectiveScheduledPosts;
    return effectiveScheduledPosts.filter((p) => p.projectId === calendarProjectFilter);
  }, [effectiveScheduledPosts, calendarProjectFilter]);
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [manualMovePostId, setManualMovePostId] = useState<string | null>(null);
  const [postMoveTimeEditor, setPostMoveTimeEditor] = useState<{ postId: string; date: string; time: string } | null>(null);
  const draggedPostIdRef = useRef<string | null>(null);
  const dragOverDateRef = useRef<string | null>(null);

  const setDraggedPost = (postId: string | null) => {
    draggedPostIdRef.current = postId;
    setDraggedPostId(postId);
  };

  const setDragOverDateSafe = (dateKey: string | null) => {
    dragOverDateRef.current = dateKey;
    setDragOverDate(dateKey);
  };

  const resolveDraggedPostId = (e?: { dataTransfer?: DataTransfer | null }): string | null => {
    const transferId = e?.dataTransfer?.getData?.('text/plain');
    if (transferId && transferId.trim()) return transferId.trim();
    return draggedPostIdRef.current;
  };

  const manualMovePost = useMemo(
    () => effectiveScheduledPosts.find((post) => post.id === manualMovePostId) ?? null,
    [effectiveScheduledPosts, manualMovePostId]
  );

  // Initialize calendarEditMap when a detail view opens
  useEffect(() => {
    if (calendarDetailDate || calendarStatusList) {
      const newMap: Record<string, PostSchedule> = {};
      effectiveScheduledPosts.forEach(post => {
        let dateStr = '';
        if (post.scheduledDate) {
          const d = post.scheduledDate;
          dateStr = d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0];
        }
        newMap[post.id] = { date: dateStr, time: post.scheduledTime ?? '' };
      });
      setCalendarEditMap(newMap);
    }
  }, [calendarDetailDate, calendarStatusList, effectiveScheduledPosts]);

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
    const storageProjectPath = projectPath ?? plannerProjectPath;
    if (!storageProjectPath) return;
    if (effectiveScheduledPosts.length === 0) return;

    const timeout = setTimeout(async () => {
      try {
        await saveScheduledPostsWithFiles(storageProjectPath, effectiveScheduledPosts);
      } catch (error) {
        console.error('[Planner] Failed to autosave scheduled posts', error);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [isOpen, plannerProjectPath, projectPath, effectiveScheduledPosts]);

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

  // Stable ref to avoid re-triggering the reload when the callback identity changes each render
  const onScheduledPostsChangeRef = useRef(onScheduledPostsChange);
  useEffect(() => { onScheduledPostsChangeRef.current = onScheduledPostsChange; }, [onScheduledPostsChange]);

  useEffect(() => {
    if (!isOpen) return;
    if (!isTauri()) return;
    if (!projectPath) return;
    if (!onScheduledPostsChangeRef.current) return;

    const reload = async () => {
      try {
        await initializePublishingProject(projectPath);
        const project = await loadSchedule(projectPath);
        onScheduledPostsChangeRef.current?.(project.posts);
      } catch (error) {
        console.error('[Planner] Failed to reload schedule', error);
      }
    };

    void reload();
  // onScheduledPostsChange intentionally excluded — use ref to avoid re-firing on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projectPath]);

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
    if (!checklistBulkPostId) return;
    if (!planningPosts.some(post => post.id === checklistBulkPostId)) {
      setChecklistBulkPostId(null);
    }
  }, [planningPosts, checklistBulkPostId]);

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

  const handleDeleteScheduledPost = async (postId: string) => {
    setManualPosts(prev => prev.filter(item => item.id !== postId));
    setSchedules(prev => {
      const next = { ...prev };
      delete next[postId];
      return next;
    });

    const next = scheduledPosts.filter(item => item.id !== postId);
    onScheduledPostsChange?.(next);

    const deleteProjectPath = projectPath ?? plannerProjectPath;
    if (isTauri() && deleteProjectPath) {
      try {
        await deletePost(deleteProjectPath, postId);
      } catch (error) {
        console.error('[Planner] Failed to delete post from schedule:', error);
      }
    }
  };

  const buildScheduledPostForEdit = (post: PlannerPost, schedule: PostSchedule): ScheduledPost => {
    const existing = effectiveScheduledPosts.find((p) => p.id === post.id);
    return {
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
      createdAt: existing?.createdAt ?? new Date(),
      projectId: existing?.projectId ?? projectPath ?? undefined,
      projectName: existing?.projectName ?? projectName ?? (projectPath ? projectPath.split('/').pop() : undefined),
    };
  };

  const upsertPostSchedule = (postId: string, dateStr: string, timeStr: string) => {
    setSchedules(prev => ({
      ...prev,
      [postId]: { date: dateStr, time: timeStr },
    }));

    if (!onScheduledPostsChange) return;

    const basePost =
      effectiveScheduledPosts.find((post) => post.id === postId) ??
      scheduledPosts.find((post) => post.id === postId);
    if (!basePost) return;

    const updatedDate = dateStr ? new Date(dateStr) : undefined;
    const updatedTime = timeStr || undefined;
    const updatedPost: ScheduledPost = {
      ...basePost,
      scheduledDate: updatedDate,
      scheduledTime: updatedTime,
      status: (updatedDate && updatedTime ? 'scheduled' : 'draft') as PublishingStatus,
    };

    const merged = new Map<string, ScheduledPost>();
    effectiveScheduledPosts.forEach((post) => merged.set(post.id, post));
    merged.set(updatedPost.id, updatedPost);
    onScheduledPostsChange(Array.from(merged.values()));
  };

  const updateScheduledPost = (postId: string, dateStr: string, timeStr: string) => {
    upsertPostSchedule(postId, dateStr, timeStr);
  };

  const handleSaveSchedule = async (options?: { closeAfter?: boolean }) => {
    const storageProjectPath = projectPath ?? plannerProjectPath;
    if (!onScheduleSave && !onScheduledPostsChange && !(isTauri() && storageProjectPath)) return;
    if (planningPosts.length === 0) {
      if (options?.closeAfter) {
        onClose();
      }
      return;
    }

    const scheduledPostsData: ScheduledPost[] = await Promise.all(planningPosts.map(async post => {
      const schedule = schedules[post.id] ?? { date: '', time: '' };
      const scheduledDate = schedule.date ? new Date(schedule.date) : undefined;
      const existing = scheduledPosts.find(existingPost => existingPost.id === post.id);
      const resolvedContent = post.content?.trim()
        ? post.content
        : (existing?.content ?? '');
      const resolvedTitle = post.title?.trim()
        ? post.title
        : (existing?.title ?? '');
      const resolvedSubtitle = post.subtitle?.trim()
        ? post.subtitle
        : (existing?.subtitle ?? '');
      let resolvedFilePath = existing?.savedFilePath;

      // For manual posts, persist a real file in the project folder (if available)
      if (
        !resolvedFilePath &&
        isTauri() &&
        projectPath &&
        post.source === 'manual' &&
        resolvedContent.trim().length > 0
      ) {
        const baseName = sanitizeBaseName(resolvedTitle || post.platform || 'Post');
        const dateStr = schedule.date || getTodayDate();
        try {
          const filePath = await resolvePlannerSavePath(projectPath, baseName, dateStr);
          await writeTextFile(filePath, resolvedContent);
          resolvedFilePath = filePath;
        } catch (error) {
          console.error('[Planner] Failed to write manual post file:', error);
        }
      }

      return {
        id: post.id,
        platform: post.platform,
        title: resolvedTitle,
        subtitle: resolvedSubtitle,
        content: resolvedContent,
        scheduledDate,
        scheduledTime: schedule.time || undefined,
        status: (schedule.date && schedule.time) ? 'scheduled' : 'draft',
        characterCount: resolvedContent.length || post.characterCount,
        wordCount: resolvedContent
          ? resolvedContent.split(/\s+/).filter(Boolean).length
          : post.wordCount,
        createdAt: existing?.createdAt ?? new Date(),
        savedFilePath: resolvedFilePath,
      };
    }));

    const merged = new Map<string, ScheduledPost>();
    scheduledPosts.forEach(post => merged.set(post.id, post));
    scheduledPostsData.forEach(post => merged.set(post.id, post));
    const nextPosts = Array.from(merged.values());

    if (onScheduledPostsChange) {
      onScheduledPostsChange(nextPosts);
    }

    if (isTauri() && storageProjectPath) {
      try {
        await saveScheduledPostsWithFiles(storageProjectPath, nextPosts);
      } catch (error) {
        console.error('[Planner] Failed to persist schedule directly', error);
      }
    }

    if (options?.closeAfter) {
      onClose();
    }

    if (onScheduleSave && !onScheduledPostsChange) {
      onScheduleSave(nextPosts);
    }
  };

  const getTodayDate = () => new Date().toISOString().split('T')[0];

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
        const icsContent = generateICSFile(effectiveScheduledPosts);
        await writeTextFile(filePath, icsContent);
        return;
      }
      downloadICSFile(effectiveScheduledPosts);
    } catch (error) {
      console.error('Kalender-Export fehlgeschlagen:', error);
    }
  };

  const getScheduledPostsForDate = (date: Date): ScheduledPost[] => {
    return projectFilteredPosts.filter(post => {
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
    [calendarDetailDate, effectiveScheduledPosts],
  );

  const applyCalendarDate = (postId: string, date: Date, options?: { openTimeEditor?: boolean }) => {
    const dateStr = toLocalDateKey(date);
    const existingTime =
      schedules[postId]?.time ||
      effectiveScheduledPosts.find((post) => post.id === postId)?.scheduledTime ||
      '';
    setSchedules((prev) => ({
      ...prev,
      [postId]: { date: dateStr, time: existingTime },
    }));

    if (!onScheduledPostsChange) return;
    const updated = scheduledPosts.map((post) => {
      if (post.id !== postId) return post;
      return {
        ...post,
        scheduledDate: date,
        status: 'scheduled' as const,
      };
    });
    onScheduledPostsChange(updated);

    if (options?.openTimeEditor !== false) {
      setPostMoveTimeEditor({ postId, date: dateStr, time: existingTime });
    }
  };

  const handlePostMoveTimeEditorChange = (nextTime: string) => {
    if (!postMoveTimeEditor) return;
    const postId = postMoveTimeEditor.postId;
    const dateStr = postMoveTimeEditor.date;
    const hasDate = !!dateStr;

    setPostMoveTimeEditor((prev) => (prev ? { ...prev, time: nextTime } : prev));
    setSchedules((prev) => ({
      ...prev,
      [postId]: { date: dateStr, time: nextTime },
    }));

    if (!onScheduledPostsChange) return;
    const updated = scheduledPosts.map((post) => {
      if (post.id !== postId) return post;
      return {
        ...post,
        scheduledDate: hasDate ? new Date(dateStr) : post.scheduledDate,
        scheduledTime: nextTime || undefined,
        status: (hasDate && !!nextTime ? 'scheduled' : 'draft') as PublishingStatus,
      };
    });
    onScheduledPostsChange(updated);
  };

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
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday-first (DE)

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

  const goToToday = () => setCurrentDate(new Date());

  const getStartOfWeek = (date: Date) => {
    const base = new Date(date);
    const day = base.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    base.setDate(base.getDate() + diff);
    base.setHours(0, 0, 0, 0);
    return base;
  };

  const weekDays = useMemo(() => {
    const start = getStartOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, index) => {
      const next = new Date(start);
      next.setDate(start.getDate() + index);
      return next;
    });
  }, [currentDate]);

  const goToPreviousCalendarPeriod = () => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      if (calendarView === 'week') {
        next.setDate(next.getDate() - 7);
      } else {
        next.setMonth(next.getMonth() - 1, 1);
      }
      return next;
    });
  };

  const goToNextCalendarPeriod = () => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      if (calendarView === 'week') {
        next.setDate(next.getDate() + 7);
      } else {
        next.setMonth(next.getMonth() + 1, 1);
      }
      return next;
    });
  };

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

  const focusChecklistPost = (postId: string) => {
    setChecklistBulkPostId(postId);
    setCollapsedChecklistPosts(() =>
      Object.fromEntries(planningPosts.map(post => [post.id, post.id !== postId])),
    );
    window.setTimeout(() => {
      scrollToChecklistPost(postId);
    }, 0);
  };

  const showAllChecklistPosts = () => {
    setChecklistBulkPostId(null);
    setCollapsedChecklistPosts({});
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

  const [_publishingPaths, setPublishingPaths] = useState<Awaited<ReturnType<typeof getPublishingPaths>> | null>(null);

  useEffect(() => {
    if (!projectPath) {
      setPublishingPaths(null);
      return;
    }
    getPublishingPaths(projectPath).then(setPublishingPaths);
  }, [projectPath]);

  const completedCount = workflowStats.completed;
  const totalCount = workflowStats.total;
  const completionPercentage = workflowStats.percent;

  const scheduledCount = projectFilteredPosts.filter(p => p.status === 'scheduled').length;
  const draftCount = projectFilteredPosts.filter(p => p.status === 'draft').length;
  const suggestedPostExists = useMemo(() => {
    if (!suggestedEditorPost) return false;
    const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');
    const targetContent = normalize(suggestedEditorPost.content);
    const targetTitle = normalize(suggestedEditorPost.title || '');
    return planningPosts.some((post) => {
      const postContent = normalize(post.content);
      const postTitle = normalize(post.title || '');
      return postContent === targetContent && postTitle === targetTitle;
    });
  }, [planningPosts, suggestedEditorPost]);
  const showEditorSuggestion =
    activeTab === 'planen' &&
    posts.length === 0 &&
    !!suggestedEditorPost &&
    suggestedEditorPost.content.trim().length > 0 &&
    !dismissedSuggestionKeys[suggestedEditorPost.key] &&
    !suggestedPostExists;

  useEffect(() => {
    if (!suggestedEditorPost) return;
    const rawPlatform = suggestedEditorPost.platform as SocialPlatform | undefined;
    if (rawPlatform && PLATFORM_INFO[rawPlatform]) {
      setSuggestedImportPlatform(rawPlatform);
      return;
    }
    setSuggestedImportPlatform('linkedin');
  }, [suggestedEditorPost?.key]);

  // ==================== IMAGE DRAG & DROP ====================
  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error ?? new Error('Datei konnte nicht gelesen werden.'));
      reader.readAsDataURL(file);
    });

  const extractDroppedImageUrl = (event: DragEvent<HTMLElement>): string => {
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

  const handleNewPostImageDrop = useCallback(async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsNewPostImageDragActive(false);

    const imageFiles = Array.from(event.dataTransfer?.files ?? []).filter(f =>
      f.type.startsWith('image/')
    );

    if (imageFiles.length > 0) {
      try {
        const dataUrl = await fileToDataUrl(imageFiles[0]);
        setNewPostImageUrl(dataUrl);
        return;
      } catch {
        return;
      }
    }

    const droppedUrl = extractDroppedImageUrl(event);
    if (droppedUrl) {
      setNewPostImageUrl(droppedUrl);
    }
  }, []);

  const importSuggestedEditorPost = () => {
    if (!suggestedEditorPost) return;
    const platform = suggestedImportPlatform;
    const title = (suggestedEditorPost.title || '').trim();
    const subtitle = (suggestedEditorPost.subtitle || '').trim();
    const imageUrl = (suggestedEditorPost.imageUrl || '').trim();
    const content = suggestedEditorPost.content;
    const postId = buildStableContentId(platform, content, title || 'Post');
    setManualPosts((prev) => {
      if (prev.some((item) => item.id === postId)) return prev;
      return [
        ...prev,
        {
          id: postId,
          platform,
          title,
          subtitle,
          imageUrl: imageUrl || undefined,
          content,
          characterCount: content.length,
          wordCount: content.split(/\s+/).filter(Boolean).length,
          source: 'manual',
        },
      ];
    });
    setShowPlanenScheduledPosts(true);
    setDismissedSuggestionKeys((prev) => ({ ...prev, [suggestedEditorPost.key]: true }));
  };

  const days = getDaysInMonth(currentDate);

  const getISOWeek = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Group 42 days into 6 weeks of 7
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  // ==================== RENDER FUNCTIONS ====================
  const openRescheduleModal = (post: ScheduledPost) => {
    const dateValue = post.scheduledDate
      ? new Date(post.scheduledDate).toISOString().split('T')[0]
      : '';
    setReschedulePost(post);
    setRescheduleDate(dateValue);
    setRescheduleTime(post.scheduledTime ?? '');
  };

  const renderPlanenContent = () => (
    <div style={{ padding: '24px' }}>
      {/* Info Box */}
      <div
        style={{
          marginBottom: '24px',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #3A3A3A',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <p
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              color: '#1a1a1a',
              lineHeight: '1.6',
              margin: 0,
              flex: 1,
            }}
          >
            <FontAwesomeIcon icon={faLightbulb} style={{ color: '#AC8E66', marginRight: '8px' }} />
            Planen Hinweise
          </p>
          <button
            type="button"
            onClick={() => setIsPlanenInfoCollapsed(prev => !prev)}
            style={{
              width: '28px',
              height: '28px',
              backgroundColor: 'transparent',
              border: '1px solid rgba(172,142,102,0.4)',
              borderRadius: '999px',
              color: '#555',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
            title={isPlanenInfoCollapsed ? 'Hinweis einblenden' : 'Hinweis ausblenden'}
          >
            <FontAwesomeIcon
              icon={isPlanenInfoCollapsed ? faChevronRight : faChevronDown}
              style={{ fontSize: '10px', color: '#AC8E66' }}
            />
          </button>
        </div>
        {!isPlanenInfoCollapsed && (
          <p
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              color: '#1a1a1a',
              lineHeight: '1.6',
              margin: '10px 0 0 0',
            }}
          >
            Plane deine Posts im Voraus. Wähle deine Plattform. Ein Überblick alle deiner geplanten Dinge findest du im Kalender.
          </p>
        )}
      </div>

      {showEditorSuggestion && suggestedEditorPost ? (
        <div
          style={{
            marginBottom: '16px',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #AC8E66',
            backgroundColor: 'rgba(172, 142, 102, 0.06)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <FontAwesomeIcon icon={faLightbulb} style={{ color: '#AC8E66', fontSize: '11px' }} />
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#AC8E66' }}>
              Aktiver Entwurf aus dem Content AI Studio
            </span>
          </div>
          {/* Post Metadaten Preview */}
          <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: '#e5e5e5', fontWeight: '600' }}>
              {suggestedEditorPost.title || 'Entwurf'}
            </div>
            {suggestedEditorPost.subtitle && (
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#AC8E66' }}>
                {suggestedEditorPost.subtitle}
              </div>
            )}
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#555', marginTop: '2px' }}>
              {suggestedEditorPost.content.trim().slice(0, 100)}{suggestedEditorPost.content.trim().length > 100 ? '…' : ''}
            </div>
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ minWidth: '160px' }}>
              <ZenDropdown
                value={suggestedImportPlatform}
                onChange={(value) => setSuggestedImportPlatform(value as SocialPlatform)}
                options={(Object.keys(PLATFORM_INFO) as SocialPlatform[]).map((platform) => ({
                  value: platform,
                  label: getPlatformInfo(platform).name,
                }))}
                variant="button"
              />
            </div>
            <ZenRoughButton
              label="In Planner übernehmen"
              icon={<FontAwesomeIcon icon={faCheck} />}
              onClick={importSuggestedEditorPost}
              size="small"
            />
            <ZenRoughButton
              label="Ignorieren"
              onClick={() =>
                setDismissedSuggestionKeys((prev) => ({ ...prev, [suggestedEditorPost.key]: true }))
              }
              size="small"
            />
          </div>
        </div>
      ) : null}

      {/* Manual Add */}
      <div
        style={{
          marginBottom: '16px',
          padding: '16px',
   
          borderRadius: '8px',
          border: '1px solid #3A3A3A',
        }}
      >
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            color: '#555',
            fontWeight: '200',
            margin: 0,
            marginBottom: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FontAwesomeIcon icon={faCirclePlus} 
          style={{ color: '#AC8E66' }} />
          Neuen Post planen
        </p>
        {/* Plattform */}
        <div style={{ marginBottom: '10px' }}>
          <ZenDropdown
            value={newPostPlatform}
            onChange={(value) => setNewPostPlatform(value as SocialPlatform)}
            options={(Object.keys(PLATFORM_INFO) as SocialPlatform[]).map((platform) => ({
              value: platform,
              label: getPlatformInfo(platform).name,
            }))}
            variant="compact"
          />
        </div>
        {/* Titel + Untertitel — konsistent mit Content AI Studio Post-Metadaten */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
          <input
            type="text"
            value={newPostTitle}
            onChange={(e) => setNewPostTitle(e.target.value)}
            placeholder="Titel"
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: 'transparent',
              border: '1px solid #3A3A3A',
              borderRadius: '6px',
              color: '#1a1a1a',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '13px',
              fontWeight: '100',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <input
            type="text"
            value={newPostSubtitle}
            onChange={(e) => setNewPostSubtitle(e.target.value)}
            placeholder="Untertitel"
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: 'transparent',
              border: '1px solid #2E2E2E',
              borderRadius: '6px',
              color: '#1a1a1a',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Titelbild — drag & drop drop zone */}
        <div
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsNewPostImageDragActive(true); }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsNewPostImageDragActive(true); }}
          onDragLeave={(e) => {
            const next = e.relatedTarget as Node | null;
            if (next && e.currentTarget.contains(next)) return;
            setIsNewPostImageDragActive(false);
          }}
          onDrop={(e) => { void handleNewPostImageDrop(e); }}
          style={{
            position: 'relative',
            marginBottom: '8px',
            borderRadius: '8px',
            border: isNewPostImageDragActive ? '1px solid #AC8E66' : '1px dashed #3A3A3A',
            background: isNewPostImageDragActive ? 'rgba(172,142,102,0.08)' : 'transparent',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          {/* Image preview strip */}
          {newPostImageUrl && /^(https?:\/\/|data:image\/|blob:|file:\/\/|\/)/i.test(newPostImageUrl.trim()) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 10px',
              borderBottom: '1px solid #2A2A2A',
            }}>
              <img
                src={newPostImageUrl.trim()}
                alt="Vorschau"
                style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#AC8E66', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Bild erkannt
              </span>
              <button
                type="button"
                onClick={() => setNewPostImageUrl('')}
                style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 12, padding: '0 2px', lineHeight: 1 }}
                title="Bild entfernen"
              >×</button>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px' }}>
            <FontAwesomeIcon icon={faImage} style={{ fontSize: '11px', color: isNewPostImageDragActive ? '#AC8E66' : '#555', flexShrink: 0 }} />
            <input
              type="text"
              value={newPostImageUrl}
              onChange={(e) => setNewPostImageUrl(e.target.value)}
              placeholder={isNewPostImageDragActive ? 'Bild hier ablegen…' : 'Titelbild URL — oder Bild hierher ziehen'}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: 'transparent',
                border: 'none',
                color: newPostImageUrl ? '#e5e5e5' : '#555',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '10px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Datum + Uhrzeit — nebeneinander */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          {/* Datum */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FontAwesomeIcon icon={faCalendarDays} style={{ fontSize: '9px' }} />
              Datum
            </label>
            <input
              type="date"
              value={newPostDate}
              onChange={(e) => setNewPostDate(e.target.value)}
              style={{
                padding: '8px 10px',
                backgroundColor: 'transparent',
                border: '1px solid #3A3A3A',
                borderRadius: '6px',
                color: '#1a1a1a',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>
          {/* Uhrzeit */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FontAwesomeIcon icon={faClock} style={{ fontSize: '9px' }} />
              Uhrzeit
            </label>
            <input
              type="time"
              value={newPostTime}
              onChange={(e) => setNewPostTime(e.target.value)}
              style={{
                padding: '8px 10px',
                backgroundColor: 'transparent',
                border: '1px solid #3A3A3A',
                borderRadius: '6px',
                color: '#1a1a1a',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div
          style={{
            marginBottom: '12px',
            borderRadius: '12px',
            border: '0.5px solid #AC8E66',
            backgroundColor: '#1F1F1F',
            padding: '12px',
          }}
        >
          <ZenMarkdownEditor
            value={newPostContent}
            onChange={setNewPostContent}
            placeholder="Schreibe hier deine ersten Gedanken-Inhalt..."
            height="220px"
            showPreview={false}
            showLineNumbers={true}
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
            const newId = `manual-${Date.now()}`;

            setManualPosts(prev => [
              ...prev,
              {
                id: newId,
                platform: newPostPlatform,
                title: trimmedTitle || getPlatformInfo(newPostPlatform).name,
                subtitle: newPostSubtitle.trim() || undefined,
                imageUrl: newPostImageUrl.trim() || undefined,
                content: contentValue,
                characterCount: contentValue.length,
                wordCount,
                source: 'manual',
              },
            ]);

            setSchedules(prev => ({
              ...prev,
              [newId]: {
                date: newPostDate || initialDate || getTodayDate(),
                time: newPostTime || getDefaultTime(),
              },
            }));

            setNewPostTitle('');
            setNewPostSubtitle('');
            setNewPostImageUrl('');
            setNewPostContent('');
            setNewPostDate('');
            setNewPostTime('');
          }}
        />
      </div>

      {/* Platform Schedule Cards */}
      {showPlanenScheduledPosts && (
        planningPosts.length > 0 ? (
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
              const existingScheduled = effectiveScheduledPosts.find(p => p.id === post.id);

              return (
                <div
                  key={post.id}
                  style={{
                    padding: '20px',
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
                    <FontAwesomeIcon icon={info.icon} style={{ fontSize: '22px', color: '#AC8E66' }} />
                    <div style={{ flex: 1 }}>
                      <h4
                        style={{
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '14px',
                          color: '#555',
                          fontWeight: 'normal',
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
                          margin: '-',
                        }}
                      >
                        {post.characterCount} Zeichen
                      </p>
                      {/* Post Title */}
                      {post.title && (
                        <p
                          style={{
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '10px',
                            color: '#555',
                            marginTop: '-20px',
                         
                            fontWeight: 'normal',
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
                            marginTop: '-px',
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
                    display: 'grid-2-col',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '100px',
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
                          color: '#555',
                          marginBottom: '4px',
                        }}
                      >
                        <FontAwesomeIcon icon={faCalendarDays} style={{ 
                          fontSize: '9px' }} />
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
                          backgroundColor: 'transparent',
                          border: '1px solid #3A3A3A',
                          borderRadius: '6px',
                          color: '#666',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '11px',
                        }}
                      />
                    </div>

                    {/* Time Input */}
                    <div>
                      <label
                        style={{
                          marginTop: '10px',                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '9px',
                          color: '#555',
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
                          backgroundColor: 'transparent',
                          border: '1px solid #3A3A3A',
                          borderRadius: '6px',
                          color: '#666',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '11px',
                        }}
                      />
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '6px 12px',
                      backgroundColor: schedule.date && schedule.time ? '#151515' : 'transparent',
                      borderRadius: '8px',
                      textAlign: 'center',
                      border: schedule.date && schedule.time ? 'none' : '1px dashed #3a3a3a',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '10px',
                        color: schedule.date && schedule.time ? '#AC8E66' : '#555',
                        fontWeight: 'normal',
                      }}
                    >
                      {schedule.date && schedule.time ? '✓ Geplant' : 'Datum & Uhrzeit eingeben zum Einplanen'}
                    </span>
                  </div>

                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                    <ZenRoughButton
                      label="Weiterbearbeiten"
                      size='default'
                      onClick={() => {
                        if (existingScheduled) {
                          handleEditPostClick(existingScheduled);
                          return;
                        }
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
              backgroundColor: 'transparent',
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
        )
      )}

      {effectiveScheduledPosts.length > 50 && showPlanenScheduledPosts && (
        <div style={{ marginBottom: '24px' }}>
          <h4
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
              color: '#555',
              marginBottom: '12px',
              fontWeight: 'normal',
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
            {effectiveScheduledPosts
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
                      backgroundColor: 'transparent',
                      borderRadius: '12px',
                      border: '0.5px solid #3A3A3A',
                      position: 'relative',
                    }}
                  >
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      <ZenCloseButton
                        onClick={() => void handleDeleteScheduledPost(post.id)}
                        size="sm"
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                      <FontAwesomeIcon icon={info.icon} style={{ fontSize: '20px', color: '#AC8E66' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: '#555' }}>
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
                    <div style={{ display: 'grid-2-col', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                      <div>
                        <label style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px', fontFamily: 'IBM Plex Mono, monospace', 
                          fontSize: '9px', 
                          color: '#555', 
                          marginBottom: '4px' }}>
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
                            backgroundColor: 'transparent',
                            border: '1px solid #3A3A3A',
                            borderRadius: '6px',
                            color: '#555',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '10px',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ 
                          marginTop: '10px',
                          display: 'flex', 
                          alignItems: 'center', gap: '4px', 
                          fontFamily: 'IBM Plex Mono, monospace', 
                          fontSize: '9px', 
                          color: '#666', 
                          marginBottom: '4px' }}>
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
                            backgroundColor: 'transparent',
                            border: '1px solid #3A3A3A',
                            borderRadius: '6px',
                            color: '#555',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '10px',
                            fontWeight: 'normal'
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ 
                      marginTop: '12px',
                      padding: '6px 12px',
                      backgroundColor: 'transparent',
                      borderRadius: '4px',
                      textAlign: 'center',
                      }}
                      >
                      <span
                      style={{
                        fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px',
                        color: '#AC8E66',
                        padding: '4px 10px', borderRadius: '4px',
                        fontWeight: 'normal',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        }}
                        >
                        <FontAwesomeIcon icon={faCheck} style={{ fontSize: '9px' }} />
                        Geplant
                      </span>
                    </div>
                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                      <ZenRoughButton
                        label="Weiterbearbeiten"
                        size="default"
                     
                        onClick={() => handleEditPostClick(post)}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {effectiveScheduledPosts.length > 10 && showPlanenScheduledPosts && (
        <div style={{ marginBottom: '24px' }}>
          <h4
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
              color: '#555',
              marginBottom: '12px',
            }}
          >
            Entwürfe...
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
            }}
          >
            {effectiveScheduledPosts
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
                      backgroundColor: 'transparent',
                      borderRadius: '12px',
                      border: '1px solid #3A3A3A',
                      position: 'relative',
                    }}
                  >
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      <ZenCloseButton
                        onClick={() => void handleDeleteScheduledPost(post.id)}
                        size="sm"
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                      <FontAwesomeIcon icon={info.icon} style={{ fontSize: '20px', color: '#AC8E66' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: '#555' }}>
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
                          <div style={{ fontFamily: 'IBM Plex Mono, monospace', 
                          fontSize: '9px', color: '#999', 
                          marginTop: '2px' }}>
                            {post.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Date & Time - 2 Column Grid */}
                    <div style={{ display: 'grid', gap: '8px', marginBottom: '10px' }}>
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
                            backgroundColor: 'transparent',
                            border: '1px solid #3A3A3A',
                            borderRadius: '6px',
                            color: '#555',
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
                            backgroundColor: 'transparent',
                            border: '1px solid #3A3A3A',
                            borderRadius: '6px',
                            color: '#555',
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

    </div>
  );

  const renderCalendarPostChip = (
    post: ScheduledPost,
    date: Date,
    dateKey: string,
    options?: { compact?: boolean }
  ) => {
    const compact = options?.compact ?? false;
    const info = getPlatformInfo(post.platform);
    const isDragging = draggedPostIdRef.current === post.id || draggedPostId === post.id;
    const isManualMoveSelected = manualMovePostId === post.id;
    const isMoveTimeEditorOpen = postMoveTimeEditor?.postId === post.id;

    return (
      <div key={post.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {isMoveTimeEditorOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px',
              borderRadius: '5px',
              border: '1px dashed #AC8E66',
              backgroundColor: '#d0cbb8',
            }}
          >
            <input
              type="time"
              value={postMoveTimeEditor.time}
              onChange={(e) => handlePostMoveTimeEditorChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setPostMoveTimeEditor(null); }}
              style={{
                width: '72px',
                padding: '2px 4px',
                backgroundColor: 'transparent',
                border: '1px solid #3A3A3A',
                borderRadius: '4px',
                color: '#1a1a1a',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '8px',
              }}
            />
            <button
              type="button"
              onClick={() => setPostMoveTimeEditor(null)}
              style={{
                border: '1px solid #3A3A3A',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                color: '#1a1a1a',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '8px',
                lineHeight: 1,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
              title="Uhrzeit bestätigen"
            >
              OK
            </button>
          </div>
        )}
        <div
          draggable
          onDragStart={(e) => {
            setDraggedPost(post.id);
            setDragOverDateSafe(null);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', post.id);
          }}
          onDragEnd={() => {
            const draggedId = draggedPostIdRef.current;
            const overDateKey = dragOverDateRef.current;
            if (draggedId && overDateKey) {
              applyCalendarDate(draggedId, fromDateKey(overDateKey));
            }
            setDraggedPost(null);
            setDragOverDateSafe(null);
          }}
          onDragOver={(e) => {
            if (!draggedPostIdRef.current || isDragging) return;
            e.preventDefault();
            setDragOverDateSafe(dateKey);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const draggedId = resolveDraggedPostId(e);
            if (!draggedId || isDragging) return;
            applyCalendarDate(draggedId, date);
            setDraggedPost(null);
            setDragOverDateSafe(null);
          }}
          style={{
            padding: compact ? '6px 8px' : '2px 5px',
            backgroundColor: isDragging ? 'rgba(172,142,102,0.25)' : 'rgba(172,142,102,0.1)',
            borderRadius: '4px',
            fontSize: compact ? '11px' : '10px',
            fontFamily: 'IBM Plex Mono, monospace',
            color: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            gap: compact ? '6px' : '3px',
            cursor: isDragging ? 'grabbing' : 'grab',
            opacity: isDragging ? 0.8 : 1,
            border: isDragging || isManualMoveSelected ? '1px dashed #1a1a1a' : '1px solid rgba(172,142,102,1)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isTauri()) {
              setManualMovePostId((prev) => (prev === post.id ? null : post.id));
              return;
            }
            if (draggedPostIdRef.current) return;
            setCalendarStatusList(null);
            setCalendarDetailDate(date);
          }}
        >
          <FontAwesomeIcon icon={info.icon} style={{ fontSize: compact ? '13px' : '12px', color: '#1a1a1a' }} />
          <span style={{ fontSize: compact ? '11px' : '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {info.name} · {post.scheduledTime || '--:--'}
          </span>
          {isTauri() && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setManualMovePostId((prev) => (prev === post.id ? null : post.id));
              }}
              style={{
                marginLeft: 'auto',
                border: isManualMoveSelected ? '1px dashed #AC8E66' : '1px solid #3A3A3A',
                borderRadius: '4px',
                background: 'transparent',
                color: '#1a1a1a',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: compact ? '9px' : '8px',
                lineHeight: 1,
                padding: compact ? '6px 5px' : '5px 4px',
                cursor: 'pointer',
              }}
              title="Post zum Verschieben markieren"
            >
              move
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderCalendarDayCell = (
    date: Date,
    dayIndex: number,
    options?: { showMonthOpacity?: boolean; minHeight?: number; postLimit?: number; compactPosts?: boolean }
  ) => {
    const showMonthOpacity = options?.showMonthOpacity ?? true;
    const minHeight = options?.minHeight ?? 76;
    const postLimit = options?.postLimit ?? 2;
    const compactPosts = options?.compactPosts ?? true;
    const postsOnDate = getScheduledPostsForDate(date);
    const isCurrent = isCurrentMonth(date);
    const isTodayDate = isToday(date);
    const hasPosts = postsOnDate.length > 0;
    const dateKey = toLocalDateKey(date);
    const isDragOver = dragOverDate === dateKey && (showMonthOpacity ? isCurrent : true);
    const isSelected = calendarDetailDate?.toDateString() === date.toDateString();
    const isWeekend = dayIndex >= 5;

    return (
      <div
        key={dateKey}
        onClick={() => {
          if (showMonthOpacity && !isCurrent) return;
          if (isTauri() && manualMovePostId) {
            applyCalendarDate(manualMovePostId, date);
            setManualMovePostId(null);
            setCalendarStatusList(null);
            setCalendarDetailDate(date);
            return;
          }
          setCalendarStatusList(null);
          setCalendarDetailDate(prev => {
            if (prev && prev.toDateString() === date.toDateString()) return null;
            return date;
          });
        }}
        onDragOver={(e) => {
          if ((showMonthOpacity && !isCurrent) || !draggedPostIdRef.current) return;
          e.preventDefault();
          setDragOverDateSafe(dateKey);
        }}
        onDragLeave={() => { setDragOverDateSafe(null); }}
        onDrop={(e) => {
          e.preventDefault();
          const draggedId = resolveDraggedPostId(e);
          if ((showMonthOpacity && !isCurrent) || !draggedId) return;
          applyCalendarDate(draggedId, date);
          setDraggedPost(null);
          setDragOverDateSafe(null);
        }}
        style={{
          minHeight,
          padding: compactPosts ? '6px' : '10px',
          backgroundColor: isDragOver
            ? '#1a1a1a'
            : isSelected
            ? 'rgba(172, 142, 102, 0.12)'
            : isTodayDate
            ? 'rgba(172, 142, 102, 0.08)'
            : isWeekend && (!showMonthOpacity || isCurrent)
            ? 'rgba(255,255,255,0.02)'
            : 'transparent',
          border: `1px solid ${
            isDragOver ? '#AC8E66'
            : isSelected ? '#AC8E66'
            : isTodayDate ? 'rgba(172, 142, 102, 0.5)'
            : '#2E2E2E'
          }`,
          borderRadius: '6px',
          opacity: showMonthOpacity ? (isCurrent ? 1 : 0.25) : 1,
          cursor: (showMonthOpacity ? isCurrent : true) ? (isTauri() && manualMovePostId ? 'copy' : 'pointer') : 'default',
          transition: 'all 0.15s ease',
          transform: isDragOver ? 'scale(1.02)' : 'none',
        }}
      >
        <div
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: compactPosts ? '11px' : '12px',
            color: isTodayDate ? '#AC8E66' : isWeekend && (!showMonthOpacity || isCurrent) ? 'rgba(172, 142, 102, 0.6)' : '#777',
            fontWeight: isTodayDate || hasPosts ? '600' : 'normal',
            marginBottom: compactPosts ? '4px' : '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>
            {DAY_NAMES[dayIndex]} {date.getDate()}
          </span>
          {!compactPosts && (
            <span style={{ fontSize: '9px', color: '#999' }}>
              {date.toLocaleDateString('de-DE', { month: 'short' })}
            </span>
          )}
        </div>

        {hasPosts && (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: compactPosts ? '2px' : '6px' }}
            onDragOver={(e) => {
              if ((showMonthOpacity && !isCurrent) || !draggedPostIdRef.current) return;
              e.preventDefault();
              e.stopPropagation();
              setDragOverDateSafe(dateKey);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const draggedId = resolveDraggedPostId(e);
              if ((showMonthOpacity && !isCurrent) || !draggedId) return;
              applyCalendarDate(draggedId, date);
              setDraggedPost(null);
              setDragOverDateSafe(null);
            }}
          >
            {postsOnDate.slice(0, postLimit).map(post => renderCalendarPostChip(post, date, dateKey, { compact: compactPosts }))}
            {postsOnDate.length > postLimit && (
              <div
                style={{
                  fontSize: '8px',
                  fontFamily: 'IBM Plex Mono, monospace',
                  color: '#AC8E66',
                  textAlign: 'center',
                  opacity: 0.7,
                  marginTop: '1px',
                }}
              >
                +{postsOnDate.length - postLimit} mehr
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderKalenderContent = () => (
    <div style={{ padding: '24px' }}>

      {/* Projekt-Filter */}
      {availableProjects.length > 1 && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#555' }}>Projekt:</span>
          <button
            onClick={() => setCalendarProjectFilter(null)}
            style={{
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
              padding: '3px 10px', borderRadius: 4, cursor: 'pointer', border: 'none',
              background: calendarProjectFilter === null ? '#AC8E66' : '#2a2a2a',
              color: calendarProjectFilter === null ? '#0a0a0a' : '#aaa',
            }}
          >Alle</button>
          {availableProjects.map(({ id, name }) => (
            <button
              key={id}
              onClick={() => setCalendarProjectFilter(id)}
              style={{
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
                padding: '3px 10px', borderRadius: 4, cursor: 'pointer', border: 'none',
                background: calendarProjectFilter === id ? '#AC8E66' : '#2a2a2a',
                color: calendarProjectFilter === id ? '#0a0a0a' : '#aaa',
                maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
              title={name}
            >{name}</button>
          ))}
        </div>
      )}

      {calendarStatusList && (
        <div
          style={{
            padding: '16px',
            backgroundColor: 'transparent',
            borderRadius: '10px',
            border: '1px solid #AC8E66',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#555' }}>
                {calendarStatusList === 'scheduled' ? 'Geplante Posts' : 'Entwürfe'}
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#AC8E66' }}>
                {projectFilteredPosts.filter(p => p.status === calendarStatusList).length} <span style={{ color: '#555' }}>{calendarStatusList === 'scheduled' ? 'Posts geplant' : 'Entwürfe vorhanden'}</span>
              </div>
            </div>
            <ZenCloseButton onClick={() => setCalendarStatusList(null)} />
          </div>

          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {projectFilteredPosts
              .filter((post) => post.status === calendarStatusList)
              .map((post) => {
                const info = getPlatformInfo(post.platform);
                const edit = calendarEditMap[post.id] ?? { date: '', time: '' };
                return (
                  <div
                    key={post.id}
                    style={{
                      padding: '12px',
                      backgroundColor: 'transparent',
                      borderRadius: '8px',
                      border: '1px solid #3A3A3A',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FontAwesomeIcon icon={info.icon} style={{ color: '#AC8E66' }} />
                        <div>
                          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: '#555' }}>
                            {post.title || info.name}
                          </div>
                          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
                            {post.content ? post.content.slice(0, 90) : 'Kein Inhalt'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <ZenRoughButton
                          label={edit.date && edit.time ? "Als geplant setzen" : "Neu planen"}
                          onClick={() => {
                            if (edit.date && edit.time) {
                              updateScheduledPost(post.id, edit.date, edit.time);
                              return;
                            }
                            openRescheduleModal(post);
                          }}
                          variant="default"
                          size="small"
                        />
                        <ZenRoughButton
                          label="Post bearbeiten"
                          onClick={() => openInlineEdit(post)}
                          variant="default"
                          size="small"
                        />
                        <ZenRoughButton
                          label="Weiterbearbeiten"
                          onClick={() => handleEditPostClick(post)}
                          variant="default"
                          size="small"
                        />
                        <ZenRoughButton
                          label="Löschen"
                          onClick={() => {
                            void handleDeleteScheduledPost(post.id);
                            setCalendarStatusList(null);
                          }}
                          variant="default"
                          size="small"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {postMoveTimeEditor?.postId === post.id && (
                        <div style={{ width: '100%', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#555' }}>
                          {`${post.title || info.name} verschoben auf ${postMoveTimeEditor.date}.`}
                        </div>
                      )}
                      <input
                        type="date"
                        value={edit.date}
                        onChange={(e) => {
                          setCalendarEditMap(prev => ({ ...prev, [post.id]: { ...edit, date: e.target.value } }));
                        }}
                        style={{
                          padding: '8px 10px',
                          backgroundColor: 'transparent',
                          border: '1px solid #3A3A3A',
                          borderRadius: '6px',
                          color: '#121212',
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
                          padding: '8px 10px',
                          backgroundColor: 'transparent',
                          border: '1px solid #3A3A3A',
                          borderRadius: '6px',
                          color: '#555',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '9px',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            {projectFilteredPosts.filter((post) => post.status === calendarStatusList).length === 0 && (
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
            backgroundColor: 'transparent',
            borderRadius: '10px',
            border: '1px solid #AC8E66',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#555', }}>
                {calendarDetailDate.toLocaleDateString('de-DE')}
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#AC8E66' }}>
                {calendarDetailPosts.length} <span className="text-[#555]">Posts an diesem Tag geplant</span> 
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
                    backgroundColor: 'transparent',
                    borderRadius: '8px',
                    border: '1px solid #3A3A3A',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FontAwesomeIcon icon={info.icon} style={{ color: '#AC8E66' }} />
                      <div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: '#555' }}>
                          {post.title || info.name}
                        </div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
                          {post.content ? post.content.slice(0, 90) : 'Kein Inhalt'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <ZenRoughButton
                        label={edit.date && edit.time ? "Als geplant setzen" : "Neu planen"}
                        onClick={() => {
                          if (edit.date && edit.time) {
                            updateScheduledPost(post.id, edit.date, edit.time);
                            return;
                          }
                          openRescheduleModal(post);
                        }}
                        variant="default"
                      />
                      <ZenRoughButton
                        label="Post bearbeiten"
                        onClick={() => openInlineEdit(post)}
                        variant="default"
                      />
                      <ZenRoughButton
                        label="Weiterbearbeiten"
                        onClick={() => handleEditPostClick(post)}
                        variant="default"
                      />
                      <ZenRoughButton
                        label="Löschen"
                        onClick={() => {
                            void handleDeleteScheduledPost(post.id);
                          setCalendarDetailDate(null);
                        }}
                        variant="default"
                      />
                    </div>
                  </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {postMoveTimeEditor?.postId === post.id && (
                        <div style={{ width: '100%', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#555' }}>
                          {`${post.title || info.name} verschoben auf ${postMoveTimeEditor.date}.`}
                        </div>
                      )}
                      <input
                        type="date"
                        value={edit.date}
                      onChange={(e) => {
                        setCalendarEditMap(prev => ({ ...prev, [post.id]: { ...edit, date: e.target.value } }));
                      }}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: 'transparent',
                        border: '1px solid #3A3A3A',
                        borderRadius: '6px',
                        color: '#121212',
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
                        padding: '8px 10px',
                        backgroundColor: 'transparent',
                        border: '1px solid #3A3A3A',
                        borderRadius: '6px',
                        color: '#555',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '9px',
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
          marginBottom: '20px',
          padding: '12px 16px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          border: '1px solid #2E2E2E',
        }}
      >
        <button
          type="button"
          onClick={goToPreviousCalendarPeriod}
          style={{
            padding: '6px 12px',
            backgroundColor: 'transparent',
            border: '1px solid #3A3A3A',
            borderRadius: '4px',
            color: '#d0cbb8',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize: '10px' }} />
          Zurück
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '10px' }}>
            {([
              { id: 'month', label: 'Monat' },
              { id: 'week', label: 'Woche' },
            ] as const).map((view) => {
              const isActive = calendarView === view.id;
              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setCalendarView(view.id)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: isActive ? '#AC8E66' : 'transparent',
                    border: '1px solid #3A3A3A',
                    borderRadius: '4px',
                    color: isActive ? '#1a1a1a' : '#d0cbb8',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '9px',
                    cursor: 'pointer',
                  }}
                >
                  {view.label}
                </button>
              );
            })}
          </div>
          <div
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '18px',
              fontWeight: '600',
              color: '#d0cbb8',
              letterSpacing: '0.04em',
              lineHeight: 1,
            }}
          >
            {calendarView === 'month'
              ? MONTH_NAMES[currentDate.getMonth()]
              : `${weekDays[0].toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} - ${weekDays[6].toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}`}
          </div>
          <div
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              color: '#d0cbb8',
              marginTop: '3px',
              letterSpacing: '0.08em',
            }}
          >
            {calendarView === 'month'
              ? currentDate.getFullYear()
              : `KW ${getISOWeek(weekDays[0])} · ${weekDays[0].getFullYear()}`}
          </div>
          <button
            type="button"
            onClick={goToToday}
            style={{
              marginTop: '8px',
              padding: '5px 14px',
              backgroundColor: 'transparent',
              border: '0.5px solid #d0cbb8',
              borderRadius: '4px',
              color: '#d0cbb8',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '9px',
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            {`Heute, ${new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}`}
          </button>
        </div>

        <button
          type="button"
          onClick={goToNextCalendarPeriod}
          style={{
            padding: '6px 12px',
            backgroundColor: 'transparent',
            border: '1px solid #3A3A3A',
            borderRadius: '4px',
            color: '#d0cbb8',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          Weiter
          <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '10px' }} />
        </button>
      </div>

      {isTauri() && (
        <div
          style={{
            marginBottom: '12px',
            padding: '10px 12px',
            border: '1px dashed #3A3A3A',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#777' }}>
            {manualMovePost
              ? `Verschieben aktiv: ${manualMovePost.title || getPlatformInfo(manualMovePost.platform).name}. Im Kalender anderen Tag verschieben.`
              : 'zum Verschieben drag & drop oder move klicken'}
          </div>
          
        </div>
      )}

      {calendarView === 'month' ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '28px repeat(7, 1fr)',
              gap: '4px',
              marginBottom: '4px',
              borderBottom: '1px solid #3A3A3A',
              paddingBottom: '8px',
            }}
          >
            <div
              style={{
                padding: '4px',
                textAlign: 'center',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '8px',
                color: '#555',
                letterSpacing: '0.03em',
              }}
            >
              KW
            </div>
            {DAY_NAMES.map((day, i) => (
              <div
                key={day}
                style={{
                  padding: '4px',
                  textAlign: 'center',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '10px',
                  color: i >= 5 ? '#AC8E66' : '#777',
                  fontWeight: 'normal',
                  letterSpacing: '0.05em',
                }}
              >
                {day}
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '28px repeat(7, 1fr)',
              gap: '4px',
            }}
          >
            {weeks.flatMap((week, weekIndex) => {
              const kw = getISOWeek(week[0]);
              return [
                <div
                  key={`kw-${weekIndex}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    paddingTop: '8px',
                    background: '#d0cbb8',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '8px',
                    color: '#444',
                    userSelect: 'none',
                  }}
                >
                  {kw}
                </div>,
                ...week.map((date, dayIndex) =>
                  renderCalendarDayCell(date, dayIndex, {
                    showMonthOpacity: true,
                    minHeight: 76,
                    postLimit: 2,
                    compactPosts: true,
                  }),
                ),
              ];
            })}
          </div>
        </>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '8px',
          }}
        >
          {weekDays.map((date, dayIndex) =>
            renderCalendarDayCell(date, dayIndex, {
              showMonthOpacity: false,
              minHeight: 280,
              postLimit: 8,
              compactPosts: false,
            }),
          )}
        </div>
      )}

    </div>
  );

  const renderChecklistExportSection = () => (
    <div
      style={{
        padding: '12px',
        backgroundColor: 'transparent',
        borderRadius: '6px',
        border: '1px solid #3A3A3A',
      }}
    >
      <h4
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '11px',
          fontWeight: 'normal',
          color: '#555',
          margin: 0,
          marginBottom: '10px',
        }}
      >
        <FontAwesomeIcon icon={faDownload} style={{ fontSize: '14px', color: '#AC8E66', marginRight: '6px', marginTop: '-2px' }} />
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
                backgroundColor: isActive ? '#AC8E66' : 'transparent',
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
      <div style={{ display: 'grid', gap: '10px' }}>
        <ZenExportCard
          title="JSON"
          subtitle="Strukturierter Export für Tools & Backups"
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
        <ZenExportCard
          title="Markdown"
          subtitle="Perfekt für GitHub, Notion und Doku"
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
        <ZenExportCard
          title="CSV"
          subtitle="Tabellenformat für Excel & Sheets"
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
        <ZenExportCard
          title="PDF"
          subtitle="Fertiges Dokument zum Teilen"
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
        <ZenExportCard
          title="XLSX (Checklist)"
          subtitle="Checkliste als Excel-Datei"
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
          backgroundColor: 'transparent',
          paddingBottom: '12px',
        }}
      >
        <div
          style={{
            padding: '16px',
            backgroundColor: 'transparent',
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
                  color: '#555',
                  margin: 0,
                  marginBottom: '2px',
                  fontWeight: 'normal',
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
                        backgroundColor: isActive ? '#AC8E66' : 'transparent',
                        border: '1px solid #151515',
                        color: isActive ? '#151515' : '#AC8E66',
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
                  scope: null,
                  text: isWorkflowCollapsed ? 'Workflow einblenden' : 'Workflow ausblenden',
                })}
                onMouseLeave={() => setTooltipState({ scope: null, text: null })}
                style={{
                  backgroundColor: 'transparent',
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
                  backgroundColor: 'transparent',
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
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', 
                    fontSize: '9px', color: '#777' }}>
                    Entwürfe
                  </div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '16px', color: '#555', fontWeight: 'bold' }}>
                    {effectiveScheduledPosts.length}
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
                <span style={{ color: '#777' }}>{projectPath ?? '—'}</span>
               
              </div>

                    {/* Completion Message */}
      {completionPercentage === 100 && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: 'transparent',
            borderRadius: '6px',
            textAlign: 'center',
          }}
        >
          <div style={{ 
            fontSize: '24px', 
            marginBottom: '6px' 
            }}
            >
              <FontAwesomeIcon icon={faCheck} style={{ color: '#151515' }} />
              </div>
          <p
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              color: '#1a1a1a',
              fontWeight: 'bold',
              margin: 0,
            }}
          >
            Perfekt - Alle Aufgaben erledigt. <br/>
            Du bist bereit zum Veröffentlichen!
          </p>
        </div>
      )}



            </>
          )}
        </div>
      </div>



      {/* Add Custom Task / Empty State */}
      <div className="pt-[0px]"></div>
      {planningPosts.length === 0 ? (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            backgroundColor: 'transparent',
            borderRadius: '12px',
            border: '1px dashed #AC8E66',
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
            Keine ToDos vorhanden.
            <br />
            <span style={{ fontSize: '12px', color: '#555' }}>
              Plane zuerst einen Post, damit du die Aufgaben zuordnen kannst.
            </span>
          </p>
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
            <ZenRoughButton
              label="Jetzt planen"
              onClick={() => setActiveTab('planen')}
              size="small"
              variant="default"
            />
          </div>
        </div>
      ) : (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '6px',
            border: '0.5px dotted #AC8E66',
          }}
        >
          <h4
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              fontWeight: 'normal',
              color: '#555',
              margin: 0,
              marginBottom: '10px',
            }}
          >
            <span className="inline-flex items-center gap-2">
              <FontAwesomeIcon icon={faCirclePlus} style={{ fontSize: '14px', color: '#AC8E66', marginTop: '-2px', marginRight: '6px' }} />
              Eigene Aufgabe hinzufügen
            </span>
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '2px 2px 0 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '420px' }}>
              <label
                style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '9px',
                  color: '#777',
                }}
              >
                Plattform
              </label>
              <ZenDropdown
                value={checklistTargetPostId ?? planningPosts[0]?.id}
                onChange={(value) => setChecklistTargetPostId(value as string)}
                options={planningPosts.map(post => {
                  const info = getPlatformInfo(post.platform);
                  const label = `${info.name} · ${post.title || 'Post'}`;
                  return { value: post.id, label };
                })}
                variant="compact"
                fullWidth
              />
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'stretch' }}>
              <input
                type="text"
                value={customTask}
                onChange={(e) => setCustomTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomTask()}
                placeholder="Neue Aufgabe..."
                style={{
                  flex: 1,
                  padding: '12px 10px',
                  backgroundColor: 'transparent',
                  border: '1px solid #3A3A3A',
                  borderRadius: '4px',
                  color: '#555',
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
                  color: '#151515',
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
        </div>
      )}




      {/* Platform Overview */}
      {planningPosts.length > 0 && (
        <div          
          style={{
            marginTop: '50px',
            padding: '12px',
          
            borderRadius: '6px',
            border: '1px solid #3A3A3A',
          }}
        >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '12px',
            flexWrap: 'wrap',
          }}
        >
       
          <div
            style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
              alignItems: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={showAllChecklistPosts}
              style={{
                padding: '8px 12px 9px',
               
                backgroundColor: checklistBulkPostId === null ? '#f6f1e6' : 'transparent',
                border: '1px solid #3A3A3A',
                borderBottom: checklistBulkPostId === null ? '2px solid #AC8E66' : '1px solid #3A3A3A',
                borderRadius: '8px 8px 0 0',
                color: checklistBulkPostId === null ? '#1a1a1a' : '#1a1a1a',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '9px',
                cursor: 'pointer',
                transform: 'translateY(-46px)',
                minHeight: '34px',
              }}
              title="Alle geplanten Posts"
            >
              Alle
            </button>
            {planningPosts.map(post => {
              const info = getPlatformInfo(post.platform);
              const isActive = checklistBulkPostId === post.id;
              return (
                <button
                  key={post.id}
                  type="button"
                  style={{
                    padding: '8px 12px 9px',
                    backgroundColor: isActive ? '#f6f1e6' : 'transparent',
                    borderRadius: '8px 8px 0 0',
                    border: '1px solid #3A3A3A',
                    borderBottom: isActive ? '2px solid #AC8E66' : '1px solid #3A3A3A',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transform: 'translateY(-45px) translateX(10px)',
                    
                    minHeight: '34px',
                  }}
                  onClick={() => focusChecklistPost(post.id)}
                >
                  <FontAwesomeIcon icon={info.icon} style={{ fontSize: '14px', color: isActive ? '#AC8E66' : '#AC8E66' }} />
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: isActive ? '#1a1a1a' : '#555' }}>
                    {info.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

            




      {/* Checklist */}
      <div style={{ marginBottom: '16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '10px',
            marginTop: '8px',
            marginRight: '3px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={toggleChecklistBulkItems}
            disabled={checklistBulkItems.length === 0}
            style={{
              padding: '6px 10px',
              background: 'transparent',
              border: '1px solid rgba(172,142,102,0.4)',
              borderRadius: 3,
              color: checklistBulkItems.length === 0 ? '#777' : '#555',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 9,
              cursor: checklistBulkItems.length === 0 ? 'not-allowed' : 'pointer',
              opacity: checklistBulkItems.length === 0 ? 0.5 : 1,
            }}
            title={
              selectedChecklistBulkPost
                ? `Nur Tasks für ${getPlatformInfo(selectedChecklistBulkPost.platform).name}`
                : 'Alle sichtbaren Tasks'
            }
          >
            {allChecklistBulkItemsCompleted
              ? selectedChecklistBulkPost
                ? 'Post-Tasks öffnen'
                : 'Alle Tasks öffnen'
              : selectedChecklistBulkPost
                ? 'Post-Tasks abschließen'
                : 'Alle Tasks abschließen'}
          </button>
        </div>

        

        

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
                  backgroundColor: isHighlighted ? '#d0cbb8' : 'transparent',
                  borderRadius: '6px',
                  
                  border: `1px solid ${isHighlighted ? '#AC8E66' : info.color}`,
                  boxShadow: isHighlighted ? '0 0 0 10px # inset' : 'none',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: info.bg,
                    marginBottom: '8px',
                    borderRadius:'5px',
                    padding: '5px',
                    minHeight: '50px',
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
                    <FontAwesomeIcon icon={info.icon} style={{ color: info.color, fontSize: '12px' }} />
                    <div>
                      <div
                        style={{
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#1a1a1a',
                        }}
                      >
                        {info.name} · {postTitle}
                      </div>
                      {postSubtitle && (
                        <div style={{ 
                          fontFamily: 'IBM Plex Mono, monospace', 
                          fontSize: '10px', 
                          color: '#1a1a1a' }}>
                          {postSubtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ 
                    fontFamily: 'IBM Plex Mono, monospace', 
                    fontSize: '9px', 
                    color: '#1a1a1a' }}>
                    {dateLabel}{timeLabel} {isCollapsed ? '▸' : '▾'}
                  </div>
                </div>

                {!isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {items.map(item => {
                    const isCompleted = item.completed;
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          backgroundColor: isCompleted ? 'transparent' : 'transparent',
                          border: `1px solid ${isCompleted ? '#AC8E66' : '#3A3A3A'}`,
                          borderRadius: '4px',
                          cursor: 'default',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <button
                          type="button"
                          aria-label={isCompleted ? 'Aufgabe als offen markieren' : 'Aufgabe als erledigt markieren'}
                          onClick={() => {
                            setChecklistItems(prev =>
                              prev.map(current =>
                                current.id === item.id
                                  ? { ...current, completed: !current.completed }
                                  : current,
                              ),
                            );
                          }}
                          style={{
                            width: '20px',
                            height: '20px',
                            minWidth: '20px',
                            borderRadius: '6px',
                            border: `1px solid ${isCompleted ? '#AC8E66' : '#8A8A8A'}`,
                            backgroundColor: isCompleted ? '#AC8E66' : '#F4F1EA',
                            color: isCompleted ? '#151515' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: isCompleted
                              ? '0 1px 3px rgba(172,142,102,0.28)'
                              : 'inset 0 1px 2px rgba(0,0,0,0.12)',
                            transition: 'all 0.2s ease',
                            padding: 0,
                          }}
                        >
                          <FontAwesomeIcon icon={faCheck} style={{ fontSize: '10px' }} />
                        </button>
                        {editingChecklistItemId === item.id ? (
                          <input
                            type="text"
                            value={editingChecklistText}
                            onChange={(e) => setEditingChecklistText(e.target.value)}
                            onBlur={() => {
                              const trimmed = editingChecklistText.trim();
                              if (trimmed) {
                                setChecklistItems(prev =>
                                  prev.map(current =>
                                    current.id === item.id ? { ...current, text: trimmed } : current,
                                  ),
                                );
                              }
                              setEditingChecklistItemId(null);
                              setEditingChecklistText('');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              } else if (e.key === 'Escape') {
                                setEditingChecklistItemId(null);
                                setEditingChecklistText('');
                              }
                            }}
                            autoFocus
                            style={{
                              flex: 1,
                              padding: '4px 6px',
                              backgroundColor: 'transparent',
                              border: '1px dotted #AC8E66',
                              borderRadius: '4px',
                              color: '#555',
                              fontFamily: 'IBM Plex Mono, monospace',
                              fontSize: '10px',
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              fontFamily: 'IBM Plex Mono, monospace',
                              fontSize: '10px',
                              color: isCompleted ? '#333' : '#555',
                              textDecoration: isCompleted ? 'line-through' : 'none',
                              flex: 1,
                            }}
                          >
                            {item.text}
                          </span>
                        )}
                        {editingChecklistItemId !== item.id && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChecklistItemId(item.id);
                              setEditingChecklistText(item.text);
                            }}
                            style={{
                              background: 'transparent',
                              border: '#AC8E66',
                              borderRadius: '2px',
                              padding: '4px 10px',
                              marginLeft: '6px',
                              color: '#555',
                              fontFamily: 'IBM Plex Mono, monospace',
                              fontSize: '10px',
                              cursor: 'pointer',
                              boxShadow: '1px',
                             
                            }}
                          >
                            todo bearbeiten
                          </button>
                        )}
                      </div>
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
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        backgroundColor: isCompleted ? 'transparent' : 'transparent',
                        border: `1px solid ${isCompleted ? '#AC8E66' : '#3A3A3A'}`,
                        borderRadius: '4px',
                        cursor: 'default',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <button
                        type="button"
                        aria-label={isCompleted ? 'Aufgabe als offen markieren' : 'Aufgabe als erledigt markieren'}
                        onClick={() => {
                          setChecklistItems(prev =>
                            prev.map(current =>
                              current.id === item.id
                                ? { ...current, completed: !current.completed }
                                : current,
                            ),
                          );
                        }}
                        style={{
                          width: '20px',
                          height: '20px',
                          minWidth: '20px',
                          borderRadius: '6px',
                          border: `1px solid ${isCompleted ? '#AC8E66' : '#8A8A8A'}`,
                          backgroundColor: isCompleted ? '#AC8E66' : '#F4F1EA',
                          color: isCompleted ? '#151515' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: isCompleted
                            ? '0 1px 3px rgba(172,142,102,0.28)'
                            : 'inset 0 1px 2px rgba(0,0,0,0.12)',
                          transition: 'all 0.2s ease',
                          padding: 0,
                        }}
                      >
                        <FontAwesomeIcon icon={faCheck} style={{ fontSize: '10px' }} />
                      </button>
                      {editingChecklistItemId === item.id ? (
                        <input
                          type="text"
                          value={editingChecklistText}
                          onChange={(e) => setEditingChecklistText(e.target.value)}
                          onBlur={() => {
                            const trimmed = editingChecklistText.trim();
                            if (trimmed) {
                              setChecklistItems(prev =>
                                prev.map(current =>
                                  current.id === item.id ? { ...current, text: trimmed } : current,
                                ),
                              );
                            }
                            setEditingChecklistItemId(null);
                            setEditingChecklistText('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            } else if (e.key === 'Escape') {
                              setEditingChecklistItemId(null);
                              setEditingChecklistText('');
                            }
                          }}
                          autoFocus
                          style={{
                            flex: 1,
                            padding: '4px 6px',
                            backgroundColor: 'tranparent',
                            border: '1px solid #AC8E66',
                            borderRadius: '4px',
                            color: '#555',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '10px',
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '10px',
                            color: isCompleted ? '#777' : '#555',
                            textDecoration: isCompleted ? 'line-through' : 'none',
                            flex: 1,
                          }}
                        >
                          {item.text}
                        </span>
                      )}
                      {editingChecklistItemId !== item.id && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingChecklistItemId(item.id);
                            setEditingChecklistText(item.text);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            marginLeft: '6px',
                            color: '#AC8E66',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '10px',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          bearbeiten
                        </button>
                      )}
                      {isCompleted && <span style={{ fontSize: '12px' }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
        </div>
      )}

  


  

      {/* Resource Buttons */}
    
    </div>
  );

  // Modal-Content aus zentraler Config
  const content = MODAL_CONTENT.planner;

  return (
    <>
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
          {/* Tabs + Header Actions */}
          <div style={{ padding: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: '1px solid #AC8E66',
              paddingBottom: '0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 24px',
                      backgroundColor: activeTab === tab.id ? '#1a1a1a' : 'transparent',
                      border: 'none',
                      borderRadius: '8px 8px 0 0',
                      cursor: 'pointer',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '11px',
                      color: activeTab === tab.id ? '#d0cbb8' : '#777',
                      fontWeight: activeTab === tab.id ? '600' : 'normal',
                      transition: 'all 0.2s',
                    }}
                  >
                    <FontAwesomeIcon icon={tab.icon} />
                    {tab.label}
                  </button>
                ))}
              </div>
            <div style={{ 
              marginLeft: 'auto', 
          
              display: 'flex', 
              gap: '10px', 
              alignItems: 'center' }}>
              {activeTab === 'planen' && (
                <button
                  type="button"
                  onClick={() => setShowPlanenScheduledPosts(prev => !prev)}
                  style={{
                padding: '12px 24px 12px',
                  backgroundColor: showPlanenScheduledPosts ? 'transparent' : '#151515',

                  border: `1px solid ${showPlanenScheduledPosts ? '#555' : '#555'}`,
                  borderBottom: 'none',

                 borderRadius: '8px 8px 0 0',

                  color: showPlanenScheduledPosts ? '#777' : '#d0cbb8',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '10px',
                  fontWeight: showPlanenScheduledPosts ? 'normal' : 'normal',
                  cursor: 'pointer',
                  }}
                  title={showPlanenScheduledPosts ? 'Geplante Posts ausblenden' : 'Geplante Posts anzeigen'}
                >
                  {showPlanenScheduledPosts ? 'Posts ausblenden' : 'Posts anzeigen'}
                </button>
              )}
              {(activeTab === 'kalender' || activeTab === 'checklist') && (
                <button
                  type="button"
                    onClick={() => {
                      if (activeTab === 'kalender') {
                        void handleExportCalendar();
                        return;
                      }
                      setShowChecklistExportModal(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 18px',
                      backgroundColor: '#1a1a1a',
                      border: 'none',
                      borderRadius: '8px 8px 0 0',
                      cursor: 'pointer',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '11px',
                      color: '#d0cbb8',
                      fontWeight: '200',
                      transition: 'all 0.2s',
                    }}
                    title={activeTab === 'kalender' ? 'Kalender exportieren (ICS)' : 'Export öffnen'}
                  >
                    <FontAwesomeIcon icon={faDownload} />
                    Export
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCalendarDetailDate(null);
                    if (activeTab !== 'kalender') {
                      setActiveTab('kalender');
                      setCalendarStatusList('scheduled');
                      return;
                    }
                    setCalendarStatusList(prev => (prev === 'scheduled' ? null : 'scheduled'));
                  }}
                  style={{
                    padding: '12px 24px 12px',
                    margin: '0 2px',
                    backgroundColor: calendarStatusList === 'scheduled' ? '#151515' : 'transparent',
                    borderBottom: 'none',
                    borderRadius: '8px 8px 0 0',
                    border: calendarStatusList === 'scheduled' ? '0.5px solid #AC8E66' : '0.5px solid #3A3A3A',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                  title="Geplante Posts anzeigen"
                >
                  <div style={{ 
                    fontFamily: 'IBM Plex Mono, monospace', 
                    fontWeight: 'normal',
                    fontSize: '11px', 
                    color: calendarStatusList === 'scheduled' ? '#d0cbb8' : '#777' }}>
                    {scheduledCount} <span style={{ color: calendarStatusList === 'scheduled' ? '#d0cbb8' : '#777' }}>Geplante</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCalendarDetailDate(null);
                    if (activeTab !== 'kalender') {
                      setActiveTab('kalender');
                      setCalendarStatusList('draft');
                      return;
                    }
                    setCalendarStatusList(prev => (prev === 'draft' ? null : 'draft'));
                  }}
                  style={{
                    padding: '12px 24px 12px',
                    margin: '0 2px',
                    backgroundColor: calendarStatusList === 'draft' ? '#151515' : 'transparent',
                    borderBottom: 'none',
                    borderRadius: '8px 8px 0 0',
                    border: calendarStatusList === 'draft' ? '0.5px solid #AC8E66' : '0.5px solid #3A3A3A',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                  title="Entwürfe anzeigen"
                >
                  <div style={{ 
                    fontFamily: 'IBM Plex Mono, monospace', 
                    fontSize: '11px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '4px',
                    color: calendarStatusList === 'draft' ? '#d0cbb8' : '#999', 
                    fontWeight: 'normal' }}>
                    {draftCount} Entwürfe
                  </div>
                </button>
              </div>
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
      <ZenModal
        isOpen={showChecklistExportModal}
        onClose={() => setShowChecklistExportModal(false)}
        title="Export"
        subtitle="Exportiere Aufgaben und Inhalte aus der Checkliste"
        size="lg"
        showCloseButton={true}
      >
        <div style={{ padding: '24px' }}>
          {renderChecklistExportSection()}
        </div>
      </ZenModal>
      {/* ===== INLINE POST EDITOR ===== */}
      <ZenModal
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        title="Post bearbeiten"
        subtitle={editingPost?.title || ''}
        size="xl"
        showCloseButton={true}
        zIndex={10200}
      >
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Platform indicator */}
          {editingPost && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <FontAwesomeIcon icon={getPlatformInfo(editingPost.platform).icon} style={{ color: '#AC8E66', fontSize: '14px' }} />
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#777' }}>
                {getPlatformInfo(editingPost.platform).name}
              </span>
            </div>
          )}

          {/* Titel */}
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Titel"
            style={{
              width: '100%', padding: '10px 12px', backgroundColor: 'transparent',
              border: '1px solid #3A3A3A', borderRadius: '6px', color: '#1a1a1a',
              fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', fontWeight: '100',
              outline: 'none', boxSizing: 'border-box',
            }}
          />

          {/* Untertitel */}
          <input
            type="text"
            value={editSubtitle}
            onChange={(e) => setEditSubtitle(e.target.value)}
            placeholder="Untertitel (optional)"
            style={{
              width: '100%', padding: '8px 12px', backgroundColor: 'transparent',
              border: '1px solid #2E2E2E', borderRadius: '6px', color: '#777',
              fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px',
              outline: 'none', boxSizing: 'border-box',
            }}
          />

          {/* Titelbild — drag & drop */}
          <div
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditImageDragActive(true); }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditImageDragActive(true); }}
            onDragLeave={(e) => {
              const next = e.relatedTarget as Node | null;
              if (next && e.currentTarget.contains(next)) return;
              setIsEditImageDragActive(false);
            }}
            onDrop={(e) => { void handleEditImageDrop(e); }}
            style={{
              borderRadius: '4px',
              border: isEditImageDragActive ? '1px solid #AC8E66' : '1px dashed #3A3A3A',
              background: isEditImageDragActive ? 'rgba(172,142,102,0.08)' : 'transparent',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            {editImageUrl && /^(https?:\/\/|data:image\/|blob:|file:\/\/|\/)/i.test(editImageUrl.trim()) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderBottom: '1px solid #2A2A2A' }}>
                <img src={editImageUrl.trim()} alt="Vorschau" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 2 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#AC8E66', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Bild erkannt</span>
                <button type="button" onClick={() => setEditImageUrl('')}
                  style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 12, padding: '0 2px' }}>×</button>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '18px 10px' }}>
              <FontAwesomeIcon icon={faImage} style={{ fontSize: '11px', color: isEditImageDragActive ? '#AC8E66' : '#555', flexShrink: 0 }} />
              <input
                type="text"
                value={editImageUrl}
                onChange={(e) => setEditImageUrl(e.target.value)}
                placeholder={isEditImageDragActive ? 'Bild hier ablegen…' : 'Titelbild URL — oder Bild hierher ziehen'}
                style={{
                  flex: 1, padding: '10px', backgroundColor: 'transparent', border: 'none',
                  color: editImageUrl ? '#e5e5e5' : '#555',
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Datum + Uhrzeit */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FontAwesomeIcon icon={faCalendarDays} style={{ fontSize: '9px' }} /> Datum
              </label>
              <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                style={{ padding: '8px 10px', backgroundColor: 'transparent', border: '1px solid #3A3A3A', borderRadius: '6px', color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FontAwesomeIcon icon={faClock} style={{ fontSize: '9px' }} /> Uhrzeit
              </label>
              <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)}
                style={{ padding: '8px 10px', backgroundColor: 'transparent', border: '1px solid #3A3A3A', borderRadius: '6px', color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Inhalt */}
          <div style={{ borderRadius: '12px', border: '0.5px solid #AC8E66', backgroundColor: '#1F1F1F', padding: '12px' }}>
            <ZenMarkdownEditor
              value={editContent}
              onChange={setEditContent}
              placeholder="Post-Inhalt bearbeiten..."
              height="200px"
              showPreview={false}
              showLineNumbers={false}
              showCharCount={true}
              title={editTitle || undefined}
              subtitle={editSubtitle || undefined}
              showHeader={true}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
            <ZenRoughButton label="Abbrechen" onClick={() => setEditingPost(null)} size="small" />
            <ZenRoughButton
              label="Speichern"
              onClick={saveInlineEdit}
              size="small"
              variant="default"
            />
          </div>
        </div>
      </ZenModal>

      <ZenModal
        isOpen={!!reschedulePost}
        onClose={() => setReschedulePost(null)}
        title="Neu planen"

        subtitle="Datum und Uhrzeit anpassen"
        size="md"
        showCloseButton={true}
      >
        <div style={{ 
          padding: '20px',
          display: 'flex', 
          flexDirection: 'column', 
          gap: '14px',
          marginLeft: '20px'
          
          }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontFamily: 'IBM Plex Mono, monospace', 
                fontSize: '10px', color: '#999', 
                marginBottom: '6px', display: 'block'
                 }}
                 >
                Datum
              </label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                style={{
                  width: '50%',
                  padding: '8px 10px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #3A3A3A',
                  borderRadius: '6px',
                  color: '#efefef',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '11px',
                }}
              />
            </div>
            <div>
              <label style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#999', marginBottom: '6px', display: 'block' }}>
                Uhrzeit
              </label>
              <input
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                style={{
                  width: '50%',
                  padding: '8px 10px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #3A3A3A',
                  borderRadius: '6px',
                  color: '#efefef',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '11px',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <ZenRoughButton
              label="Abbrechen"
              onClick={() => setReschedulePost(null)}
              size="small"
            />
            <ZenRoughButton
              label="Speichern"
              onClick={() => {
                if (!reschedulePost) return;
                upsertPostSchedule(reschedulePost.id, rescheduleDate, rescheduleTime);
                setReschedulePost(null);
              }}
              size="small"
              variant="default"
            />
          </div>
        </div>
      </ZenModal>
    </>
  );
}
