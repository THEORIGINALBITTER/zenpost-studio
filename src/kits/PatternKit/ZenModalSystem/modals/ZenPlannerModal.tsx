import { useState, useEffect, useMemo, useRef, useCallback, type DragEvent } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { isTauri } from '@tauri-apps/api/core';

// Import Checklist Templates
import { getChecklistTasksForPlatform } from '../../../../utils/getChecklistForPlatform';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faClock,
  faLightbulb,
  faCheck,
  faImage,
  faCirclePlus,
  faDownload,
  faChevronDown,
  faChevronRight,
  faChevronLeft,
} from '@fortawesome/free-solid-svg-icons';
import { ZenModal } from '../components/ZenModal';
import { MODAL_CONTENT } from '../config/ZenModalConfig';
import { ZenExportCard } from '../components/ZenExportCard';
import { ZenDropdown } from '../components/ZenDropdown';
import { ZenCloseButton } from '../../../DesignKit/ZenCloseButton';
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
// ── Planner modules ──────────────────────────────────────────────────────────
import type { ZenPlannerModalProps, TabType, CalendarView, PostSchedule, PlannerPost } from './plannerTypes';
import {
  PLATFORM_INFO, getPlatformInfo,
  MONTH_NAMES, DAY_NAMES, DEFAULT_TASKS, TABS,
  DEFAULT_CHECKLIST_COLLAPSED, DEFAULT_WORKFLOW_COLLAPSED,
  WORKFLOW_COLLAPSED_KEY, CHECKLIST_COLLAPSED_KEY, WORKFLOW_SCOPE_KEY,
  buildStableContentId, getDefaultTime, getTodayDate,
  sanitizeBaseName, resolvePlannerSavePath,
  buildScheduleMap, toLocalDateKey, fromDateKey,
  fileToDataUrl, extractDroppedImageUrl,
} from './plannerUtils';
import { usePlannerStorage } from './hooks/usePlannerStorage';
import { getCloudProjectName, isCloudProjectPath } from '../../../../services/cloudProjectService';
import { loadZenStudioSettings } from '../../../../services/zenStudioSettingsService';
import { isCloudPlannerAvailable, loadPlannerFromCloud } from '../../../../services/cloudPlannerService';
import { loadScheduleFromCloud } from '../../../../services/cloudScheduleService';
import { openAppSettings } from '../../../../services/appShellBridgeService';
import { editScheduledPostInContentStudio } from '../../../../services/contentStudioBridgeService';
import { subscribeToCloudSessionSync } from '../../../../services/cloudSessionSyncService';
import {
  comparePlannerDueDateTimeAsc,
  comparePlannerDueDateTimeOverdueFirst,
  getPlannerScheduleVisualState,
} from '../../../../services/plannerScheduleStatusService';
import { buildPlannerDashboardModel } from './plannerDashboardUtils';
import { ZenPlannerDashboard } from './ZenPlannerDashboard';



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
  focusPostId = null,
  prefilledPlanPost = null,
  bootstrapState = null,
  suggestedEditorPost,
}: ZenPlannerModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [showPlanenScheduledPosts, setShowPlanenScheduledPosts] = useState(false);
  const [reschedulePost, setReschedulePost] = useState<ScheduledPost | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [dismissedSuggestionKeys, setDismissedSuggestionKeys] = useState<Record<string, true>>({});
  const [suggestedImportPlatform, setSuggestedImportPlatform] = useState<SocialPlatform>('linkedin');

  
   // ==================== Alle Task Schliessen  STATE ====================



  // ==================== PLANEN STATE ====================
  const initialDate = preSelectedDate ? preSelectedDate.toISOString().split('T')[0] : '';

  // ── Planner storage: load / autosave via hook ────────────────────────────────
  const {
    plannerProjectPath,
    manualPosts,
    setManualPosts,
    schedules,
    setSchedules,
    checklistItems,
    setChecklistItems,
  } = usePlannerStorage({ isOpen, projectPath, posts, scheduledPosts, initialDate, initialSchedules, bootstrapState });

  // ==================== MANUAL PLAN POSTS ====================
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


  // ==================== ÜBERSICHT STATE ====================
  const [übersichtLoading, setÜbersichtLoading] = useState(false);
  const [übersichtLoaded, setÜbersichtLoaded] = useState(false);
  const [übersichtError, setÜbersichtError] = useState<string | null>(null);
  const [übersichtScheduledPosts, setÜbersichtScheduledPosts] = useState<ScheduledPost[]>([]);
  const [übersichtManualPosts, setÜbersichtManualPosts] = useState<import('./plannerTypes').PlannerPost[]>([]);
  const [übersichtSchedules, setÜbersichtSchedules] = useState<import('./plannerTypes').ScheduleMap>({});
  const [übersichtPlatformFilter, setÜbersichtPlatformFilter] = useState<string | null>(null);
  const [übersichtStatusFilter, setÜbersichtStatusFilter] = useState<'all' | 'scheduled' | 'draft'>('all');
  const [übersichtChecklistItems, setÜbersichtChecklistItems] = useState<import('../../../../utils/checklistStorage').ChecklistItem[]>([]);
  const [übersichtLastCloudSyncAt, setÜbersichtLastCloudSyncAt] = useState<string | null>(null);
  const cloudSettings = loadZenStudioSettings();

  // ==================== CHECKLIST STATE ====================

  const [checklistLoaded, setChecklistLoaded] = useState(false);
  const [showChecklistExportModal, setShowChecklistExportModal] = useState(false);
  const [customTask, setCustomTask] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
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

  const reloadÜbersichtFromCloud = useCallback(async () => {
    if (!isCloudPlannerAvailable()) {
      setÜbersichtLoaded(true);
      setÜbersichtError(null);
      return;
    }

    setÜbersichtLoading(true);
    setÜbersichtError(null);

    try {
      const [planner, schedule] = await Promise.all([loadPlannerFromCloud(), loadScheduleFromCloud()]);
      setÜbersichtScheduledPosts(schedule ?? []);
      setÜbersichtManualPosts(planner?.manualPosts ?? []);
      setÜbersichtSchedules(planner?.schedules ?? {});
      setÜbersichtChecklistItems(planner?.checklistItems ?? []);
      setÜbersichtLastCloudSyncAt(new Date().toISOString());
    } catch {
      setÜbersichtError('Cloud-Daten konnten nicht geladen werden.');
    } finally {
      setÜbersichtLoading(false);
      setÜbersichtLoaded(true);
    }
  }, []);

  // ── Übersicht: Cloud-Daten laden wenn Tab aktiv wird ──────────────────────
  useEffect(() => {
    if (activeTab !== 'übersicht' || übersichtLoaded || übersichtLoading) return;
    void reloadÜbersichtFromCloud();
  }, [activeTab, reloadÜbersichtFromCloud, übersichtLoaded, übersichtLoading]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'übersicht') return;

    return subscribeToCloudSessionSync(({ reason, current }) => {
      if (reason === 'logout' || !current.authToken || !current.projectId) {
        setÜbersichtScheduledPosts([]);
        setÜbersichtManualPosts([]);
        setÜbersichtSchedules({});
        setÜbersichtChecklistItems([]);
        setÜbersichtLastCloudSyncAt(null);
        setÜbersichtLoaded(true);
        setÜbersichtError(null);
        return;
      }

      if (reason === 'login' || reason === 'project-change' || reason === 'focus') {
        void reloadÜbersichtFromCloud();
      }
    }, { intervalMs: 5000 });
  }, [activeTab, isOpen, reloadÜbersichtFromCloud]);

  useEffect(() => {
    if (activeTab !== 'übersicht') return;
    setÜbersichtScheduledPosts(scheduledPosts);
  }, [activeTab, scheduledPosts]);

  useEffect(() => {
    if (activeTab !== 'übersicht') return;
    setÜbersichtManualPosts(manualPosts);
    setÜbersichtSchedules(schedules);
    setÜbersichtChecklistItems(checklistItems);
  }, [activeTab, manualPosts, schedules, checklistItems]);

  // ── Übersicht: Reset wenn Modal schließt ───────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setÜbersichtLoaded(false);
      setÜbersichtScheduledPosts([]);
      setÜbersichtManualPosts([]);
      setÜbersichtSchedules({});
      setÜbersichtChecklistItems([]);
      setÜbersichtLastCloudSyncAt(null);
      setÜbersichtError(null);
      setÜbersichtPlatformFilter(null);
      setÜbersichtStatusFilter('all');
    }
  }, [isOpen]);

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
      // scheduledPosts are the canonical cloud-synced calendar source.
      // Always reconcile matching IDs so stale local planner schedules cannot
      // override a newer date/time from another device.
      scheduledPosts.forEach(post => {
        let dateStr = '';
        if (post.scheduledDate) {
          const d = post.scheduledDate;
          dateStr = d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0];
        }
        if (dateStr || post.scheduledTime) {
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
    if (!isOpen || !focusPostId) return;
    if (activeTab !== 'checklist') return;
    if (!planningPosts.some((post) => post.id === focusPostId)) return;
    focusChecklistPost(focusPostId);
  }, [isOpen, activeTab, focusPostId, planningPosts]);

  useEffect(() => {
    if (!isOpen || !prefilledPlanPost) return;
    setNewPostPlatform(prefilledPlanPost.platform);
    setNewPostTitle(prefilledPlanPost.title);
    setNewPostSubtitle(prefilledPlanPost.subtitle || '');
    setNewPostImageUrl(prefilledPlanPost.imageUrl || '');
    setNewPostContent(prefilledPlanPost.content);
    setNewPostDate(prefilledPlanPost.date || '');
    setNewPostTime(prefilledPlanPost.time || '');
  }, [isOpen, prefilledPlanPost]);


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
    setSchedules(prev => ({
      ...prev,
      [editingPost.id]: { date: editDate || '', time: editTime || '' },
    }));
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
    pushScheduledPost(updatedPost);
    setEditingPost(null);
  };

  // ==================== KALENDER STATE ====================
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [calendarDetailDate, setCalendarDetailDate] = useState<Date | null>(null);
  const [calendarEditMap, setCalendarEditMap] = useState<Record<string, PostSchedule>>({});
  const [calendarStatusList, setCalendarStatusList] = useState<'scheduled' | 'draft' | null>(null);
  const [calendarStatusPlatformFilter, setCalendarStatusPlatformFilter] = useState<SocialPlatform | 'all'>('all');
  const [calendarStatusDateSort, setCalendarStatusDateSort] = useState<'none' | 'earliest' | 'latest'>('none');
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
  const calendarStatusBasePosts = useMemo(() => {
    if (!calendarStatusList) return [];
    return projectFilteredPosts.filter((p) => p.status === calendarStatusList);
  }, [projectFilteredPosts, calendarStatusList]);
  const calendarStatusPlatforms = useMemo(
    () => Array.from(new Set(calendarStatusBasePosts.map((p) => p.platform))),
    [calendarStatusBasePosts]
  );
  const calendarStatusPosts = useMemo(() => {
    const filtered = calendarStatusBasePosts.filter((post) => {
      if (calendarStatusPlatformFilter !== 'all' && post.platform !== calendarStatusPlatformFilter) return false;
      return true;
    });
    if (calendarStatusDateSort === 'none') return filtered;
    return [...filtered].sort((a, b) => {
      const aDate = a.scheduledDate ? new Date(a.scheduledDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.scheduledDate ? new Date(b.scheduledDate).getTime() : Number.MAX_SAFE_INTEGER;
      return calendarStatusDateSort === 'earliest' ? aDate - bDate : bDate - aDate;
    });
  }, [calendarStatusBasePosts, calendarStatusPlatformFilter, calendarStatusDateSort]);
  const calendarStatusCount = useMemo(() => calendarStatusPosts.length, [calendarStatusPosts]);
  const calendarStatusLabel = useMemo(() => {
    if (calendarStatusList === 'scheduled') return calendarStatusCount === 1 ? 'Post' : 'Posts';
    return calendarStatusCount === 1 ? 'Entwurf' : 'Entwürfe';
  }, [calendarStatusList, calendarStatusCount]);
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
    setCalendarStatusPlatformFilter('all');
    setCalendarStatusDateSort('none');
  }, [calendarStatusList]);


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
    editScheduledPostInContentStudio(post);
  };

  const openPlannerPostById = useCallback((postId: string) => {
    const scheduled =
      effectiveScheduledPosts.find((post) => post.id === postId) ??
      scheduledPosts.find((post) => post.id === postId);

    if (scheduled) {
      handleEditPostClick(scheduled);
      return;
    }

    const plannerPost = planningPosts.find((post) => post.id === postId);
    if (!plannerPost) return;

    const schedule = schedules[plannerPost.id] ?? { date: '', time: '' };
    onEditPost?.(buildScheduledPostForEdit(plannerPost, schedule));
  }, [effectiveScheduledPosts, scheduledPosts, planningPosts, schedules, onEditPost]);

  const renderCalendarActionButtons = (
    post: ScheduledPost,
    edit: PostSchedule,
    options?: { onAfterDelete?: () => void }
  ) => {
    const isScheduled = post.status === 'scheduled';
    const statusToggleLabel = isScheduled ? 'Als Entwurf setzen' : 'Als geplant setzen';

    return (
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button
          className="zen-planner-btn"
          type="button"
          onClick={() => {
            if (isScheduled) {
              updateScheduledPost(post.id, '', '');
              return;
            }

            const nextDate =
              edit.date ||
              (post.scheduledDate ? toLocalDateKey(new Date(post.scheduledDate)) : '');
            const nextTime = edit.time || post.scheduledTime || '';

            if (nextDate && nextTime) {
              updateScheduledPost(post.id, nextDate, nextTime);
              return;
            }

            openRescheduleModal(post);
          }}
          style={{
            padding: '8px 12px',
            backgroundColor: 'transparent',
            border: '1px solid #777',
            borderRadius: '8px',
            color: '#555',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '10px',
            cursor: 'pointer',
          }}
        >
          {statusToggleLabel}
        </button>
        <button
          className="zen-planner-btn"
          type="button"
          onClick={() => openInlineEdit(post)}
          style={{
            padding: '8px 12px',
            backgroundColor: 'transparent',
            border: '1px solid #777',
            borderRadius: '8px',
            color: '#555',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '10px',
            cursor: 'pointer',
          }}
        >
          Post bearbeiten
        </button>
        <button
          className="zen-planner-btn"
          type="button"
          onClick={() => handleEditPostClick(post)}
          style={{
            padding: '8px 12px',
            backgroundColor: 'transparent',
            border: '1px solid #777',
            borderRadius: '8px',
            color: '#555',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '10px',
            cursor: 'pointer',
          }}
        >
          Weiterbearbeiten
        </button>
        <button
          className="zen-planner-btn"
          type="button"
          onClick={() => {
            void handleDeleteScheduledPost(post.id);
            options?.onAfterDelete?.();
          }}
          style={{
            padding: '8px 12px',
            backgroundColor: 'transparent',
            border: '1px solid #777',
            borderRadius: '8px',
            color: '#555',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '10px',
            cursor: 'pointer',
          }}
        >
          Löschen
        </button>
      </div>
    );
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

  const pushScheduledPost = (scheduledPost: ScheduledPost) => {
    if (!onScheduledPostsChange) return;
    const merged = new Map<string, ScheduledPost>();
    effectiveScheduledPosts.forEach((post) => merged.set(post.id, post));
    merged.set(scheduledPost.id, scheduledPost);
    onScheduledPostsChange(Array.from(merged.values()));
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
    }).sort((a, b) =>
      comparePlannerDueDateTimeAsc(
        { scheduledDate: a.scheduledDate, scheduledTime: a.scheduledTime },
        { scheduledDate: b.scheduledDate, scheduledTime: b.scheduledTime }
      )
    );
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
    upsertPostSchedule(postId, dateStr, existingTime);

    if (options?.openTimeEditor !== false) {
      setPostMoveTimeEditor({ postId, date: dateStr, time: existingTime });
    } else {
      setPostMoveTimeEditor(null);
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
    const updated = effectiveScheduledPosts.map((post) => {
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

  const openChecklistScopeForPost = useCallback((postId?: string) => {
    setActiveTab('checklist');
    setWorkflowProgressScope('open');

    if (!postId) {
      showAllChecklistPosts();
      return;
    }

    focusChecklistPost(postId);
  }, [focusChecklistPost]);

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
  const sortedPlanningPosts = useMemo(() => {
    return [...planningPosts].sort((a, b) => {
      const aSchedule = schedules[a.id] ?? { date: '', time: '' };
      const bSchedule = schedules[b.id] ?? { date: '', time: '' };
      return comparePlannerDueDateTimeOverdueFirst(
        {
          isScheduled: !!(aSchedule.date && aSchedule.time),
          scheduledDate: aSchedule.date || undefined,
          scheduledTime: aSchedule.time || undefined,
        },
        {
          isScheduled: !!(bSchedule.date && bSchedule.time),
          scheduledDate: bSchedule.date || undefined,
          scheduledTime: bSchedule.time || undefined,
        }
      );
    });
  }, [planningPosts, schedules]);
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
            <FontAwesomeIcon icon={faLightbulb} style={{ color: '#1a1a1a', marginRight: '8px' }} />
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
              style={{ fontSize: '10px', color: '#1a1a1a' }}
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
            <FontAwesomeIcon icon={faLightbulb} style={{ color: '#1a1a1a', fontSize: '11px' }} />
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', 
              fontSize: '10px', color: '#1a1a1a' }}>
              Aktiver Entwurf aus dem Content AI Studio
            </span>
          </div>
          {/* Post Metadaten Preview */}
          <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', 
              color: '#1a1a1a', fontWeight: '600' }}>
              <span>Title:</span> {suggestedEditorPost.title || 'Entwurf'}
           
            </div>
            {suggestedEditorPost.subtitle && (
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', 
              fontSize: '10px', color: '#444' }}>
                 <span>Untertitel:</span> {suggestedEditorPost.subtitle}
              </div>
            )}
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#555', marginTop: '2px' }}>
              <span>Inhalt:</span>  {suggestedEditorPost.content.trim().slice(0, 100)}{suggestedEditorPost.content.trim().length > 100 ? '…' : ''}
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
            <button
              className="zen-planner-btn"
              type="button"
              onClick={importSuggestedEditorPost}
              style={{
                padding: '9px 12px',
                backgroundColor: 'transparent',
                border: '1px solid #777',
                borderRadius: '4px',
                color: '#555',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '10px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FontAwesomeIcon icon={faCheck} style={{ fontSize: '10px' }} />
              In Planner übernehmen
            </button>
            <button
              className="zen-planner-btn"
              type="button"
              onClick={() =>
                setDismissedSuggestionKeys((prev) => ({ ...prev, [suggestedEditorPost.key]: true }))
              }
              style={{
                padding: '9px 12px',
                backgroundColor: 'transparent',
                border: '1px solid #777',
                borderRadius: '4px',
                color: '#555',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              Ignorieren
            </button>
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '11px',
            gap: '8px',
          }}
        >
          <p
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              color: '#1a1a1a',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <FontAwesomeIcon icon={faCirclePlus} style={{ color: '#1a1a1a' }} />
            Neuen Post planen
          </p>
          <button
            type="button"
            onClick={() => {
              const trimmedTitle = newPostTitle.trim();
              const trimmedContent = newPostContent.trim();
              const contentValue = trimmedContent || trimmedTitle || '';
              const wordCount = contentValue ? contentValue.split(/\s+/).filter(Boolean).length : 0;
              const newId = `manual-${Date.now()}`;
              const nextSchedule: PostSchedule = {
                date: newPostDate || initialDate || getTodayDate(),
                time: newPostTime || getDefaultTime(),
              };
              const newPlannerPost: PlannerPost = {
                id: newId,
                platform: newPostPlatform,
                title: trimmedTitle || getPlatformInfo(newPostPlatform).name,
                subtitle: newPostSubtitle.trim() || undefined,
                imageUrl: newPostImageUrl.trim() || undefined,
                content: contentValue,
                characterCount: contentValue.length,
                wordCount,
                source: 'manual',
              };

              setManualPosts((prev) => [
                ...prev,
                newPlannerPost,
              ]);

              setSchedules((prev) => ({
                ...prev,
                [newId]: nextSchedule,
              }));

              pushScheduledPost(buildScheduledPostForEdit(newPlannerPost, nextSchedule));

              setNewPostTitle('');
              setNewPostSubtitle('');
              setNewPostImageUrl('');
              setNewPostContent('');
              setNewPostDate('');
              setNewPostTime('');
            }}
            style={{
              width: '30px',
              height: '30px',
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
            title="Post hinzufügen"
          >
            <FontAwesomeIcon icon={faCirclePlus} style={{ 
              fontSize: '18px', color: '#1a1a1a' }} />
          </button>
        </div>
        {/* Plattform */}
        <div style={{ marginBottom: '10px' }}>
          <ZenDropdown
          
            value={newPostPlatform}
            onChange={(value) => setNewPostPlatform(value as SocialPlatform)}
            options={(Object.keys(PLATFORM_INFO) as SocialPlatform[]).map((platform) => ({
              value: platform,
              label: getPlatformInfo(platform).name,
            }))}
            variant="button"
            theme="paper"
          />
        </div>
        {/* Titel + Untertitel — konsistent mit Content AI Studio Post-Metadaten */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '6px', marginBottom: '10px' }}>


          <input
            className="zen-planner-title-input"
            type="text"
            value={newPostTitle}
            onChange={(e) => setNewPostTitle(e.target.value)}
            placeholder="Dein Titel hier"
            style={{
              width: 'calc(100% - 26px)',
              padding: '10px 12px',
              backgroundColor: 'transparent',
              boxShadow: 'none',
              border: '1px solid #3A3A3A',
              borderRadius: '6px',
              color: '#1a1a1a',
              WebkitTextFillColor: '#1a1a1a',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
              fontWeight: '400',
              outline: 'none',
              
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
               boxShadow: 'none',
              borderRadius: '6px',
              color: '#1a1a1a',
              WebkitTextFillColor: '#1a1a1a',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              fontWeight: '400',
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
            boxShadow: 'none',
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
            className="planner-image-input"
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
            <label style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                 boxShadow: 'none',
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
            <label style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                 boxShadow: 'none',
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
            {sortedPlanningPosts.map(post => {
              const info = getPlatformInfo(post.platform);
              const schedule = schedules[post.id] ?? { date: '', time: '' };
              const existingScheduled = effectiveScheduledPosts.find(p => p.id === post.id);
              const isCardScheduled = !!(schedule.date && schedule.time);
              const cardScheduleState = getPlannerScheduleVisualState({
                isScheduled: isCardScheduled,
                scheduledDate: schedule.date,
                scheduledTime: schedule.time,
              });
              const isCardOverdue = cardScheduleState === 'overdue';

              return (
                <div
                  key={post.id}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    border: isCardOverdue ? '1px solid #dc2626' : '1px solid #3A3A3A',
                    backgroundColor: isCardOverdue ? 'rgba(220,38,38,0.05)' : 'transparent',
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
                    <FontAwesomeIcon icon={info.icon} style={{ fontSize: '22px', color: `${info.color}`}} />
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
                  <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {schedule.date && schedule.time && (
                      <span
                        style={{
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '12px',
                          color: isCardOverdue ? '#dc2626' : '#1a1a1a',
                          padding: '2px 7px',
                          borderRadius: '3px',
                          border: isCardOverdue ? '1px solid rgba(220,38,38,0.6)' : '1px solid rgba(26, 26, 26, 0.45)',
                          fontWeight: 'normal',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          lineHeight: 1.1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <FontAwesomeIcon icon={faCheck} style={{ fontSize: '8px' }} />
                        {isCardOverdue ? 'Überfällig' : 'Geplant'}
                      </span>
                    )}
                    {post.source === 'manual' && (
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
                    )}
                  </div>

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
                          width: '95%',
                          padding: '6px 8px',
                          backgroundColor: 'transparent',
                          boxShadow: 'none',
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
                           boxShadow: 'none',
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
                          width: '95%',
                          padding: '6px 8px',
                          backgroundColor: 'transparent',
                           boxShadow: 'none',
                          border: '1px solid #3A3A3A',
                          borderRadius: '6px',
                          color: '#666',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '11px',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                    <button
                      className="zen-planner-btn"
                      type="button"
                      onClick={() => {
                        if (existingScheduled) {
                          handleEditPostClick(existingScheduled);
                          return;
                        }
                        onEditPost?.(buildScheduledPostForEdit(post, schedule));
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: 'transparent',
                        border: '1px solid #777',
                        borderRadius: '8px',
                        color: '#555',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      Weiterbearbeiten
                    </button>
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
                    <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '9px',
                          color: '#AC8E66',
                          padding: '2px 7px',
                          borderRadius: '999px',
                          border: '1px solid rgba(172, 142, 102, 0.45)',
                          fontWeight: 'normal',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          lineHeight: 1.1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <FontAwesomeIcon icon={faCheck} style={{ fontSize: '8px' }} />
                        Geplant
                      </span>
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
                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                      <button
                        className="zen-planner-btn"
                        type="button"
                        onClick={() => handleEditPostClick(post)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: 'transparent',
                          border: '1px solid #777',
                          borderRadius: '8px',
                          color: '#555',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        Weiterbearbeiten
                      </button>
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
                      <button
                        className="zen-planner-btn"
                        type="button"
                        onClick={() => handleEditPostClick(post)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          backgroundColor: 'transparent',
                          border: '1px solid #777',
                          borderRadius: '8px',
                          color: '#555',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        Weiterbearbeiten
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

    </div>
  );

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
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: '#1a1a1a' }}>
                {calendarStatusList === 'scheduled' ? 'Geplant' : 'Entwürfe'}: {calendarStatusCount}{' '}
                <span style={{ color: '#555' }}>{calendarStatusLabel}</span>
              </div>
              {(calendarStatusPlatformFilter !== 'all' || calendarStatusDateSort !== 'none') && (
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777', marginTop: 4 }}>
                  von insgesamt {calendarStatusBasePosts.length}
                </div>
              )}
            </div>
            <button
              className="zen-planner-btn"
              type="button"
              onClick={() => setCalendarStatusList(null)}
              title="Status-Liste schließen"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '999px',
                border: '1px solid #777',
                backgroundColor: 'transparent',
                color: '#555',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <FontAwesomeIcon icon={faCheck} style={{ fontSize: '12px' }} />
            </button>
          </div>

          <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              fontFamily: 'IBM Plex Mono, monospace', 
              fontSize: '10px', color: '#555' }}>Filter:</span>
            <button
              className="zen-planner-btn"
              type="button"
              onClick={() => setCalendarStatusPlatformFilter('all')}
              style={{
                padding: '4px 10px',
                backgroundColor: calendarStatusPlatformFilter === 'all' ? 'rgba(172,142,102,0.18)' : 'transparent',
                border: `1px solid ${calendarStatusPlatformFilter === 'all' ? '#AC8E66' : '#777'}`,
                borderRadius: '4px',
                color: '#555',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '9px',
                cursor: 'pointer',
              }}
            >
              Alle
            </button>
            {calendarStatusPlatforms.map((platform) => {
              const platformInfo = getPlatformInfo(platform);
              const isActive = calendarStatusPlatformFilter === platform;
              return (
                <button
                  key={platform}
                  className="zen-planner-btn"
                  type="button"
                  onClick={() => setCalendarStatusPlatformFilter(platform)}
                  style={{
                    padding: '4px 10px',
                    backgroundColor: isActive ? 'rgba(172,142,102,0.18)' : 'transparent',
                    border: `1px solid ${isActive ? '#AC8E66' : '#777'}`,
                    borderRadius: '4px',
                    color: '#555',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '9px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title={platformInfo.name}
                >
                  <FontAwesomeIcon icon={platformInfo.icon} style={{ fontSize: '9px', color: platformInfo.color }} />
                  {platformInfo.name}
                </button>
              );
            })}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ZenDropdown
                value={calendarStatusDateSort}
                onChange={(value) => setCalendarStatusDateSort(value as 'none' | 'earliest' | 'latest')}
                options={[
                  { value: 'none', label: 'Datum: Standard' },
                  { value: 'earliest', label: 'Datum: Früheste zuerst' },
                  { value: 'latest', label: 'Datum: Neueste zuerst' },
                ]}
                variant="button"
                      theme="paper"
                width={320}
                triggerHeight={34}
              />
              {(calendarStatusDateSort !== 'none' || calendarStatusPlatformFilter !== 'all') && (
                <button
                  className="zen-planner-btn"
                  type="button"
                  onClick={() => {
                    setCalendarStatusDateSort('none');
                    setCalendarStatusPlatformFilter('all');
                  }}
                  style={{
                    padding: '6px 8px',
                    backgroundColor: 'transparent',
                    border: '1px solid #777',
                    borderRadius: '6px',
                    color: '#555',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '9px',
                    cursor: 'pointer',
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {calendarStatusPosts.map((post) => {
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
                      boxShadow: `inset 5px 0 0 ${info.color}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FontAwesomeIcon icon={info.icon} style={{ color: `${info.color}`,fontSize: '15px', }} />
                        <div>
                          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: '#555' }}>
                            {post.title || info.name}
                          </div>
                          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
                            {post.content ? post.content.slice(0, 90) : 'Kein Inhalt'}
                          </div>
                        </div>
                      </div>
                      {renderCalendarActionButtons(post, edit, {
                        onAfterDelete: () => setCalendarStatusList(null),
                      })}
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
                          border: '1px solid #555',
                          borderRadius: '6px',
                          color: '#555',
                          boxShadow: 'none',
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
                          border: '1px solid #555',
                          borderRadius: '6px',
                           boxShadow: 'none',
                          color: '#555',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '9px',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            {calendarStatusPosts.length === 0 && (
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
                    boxShadow: `inset 5px 0 0 ${info.color}`,
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
                    {renderCalendarActionButtons(post, edit, {
                      onAfterDelete: () => setCalendarDetailDate(null),
                    })}
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
            ? `Verschieben aktiv: ${manualMovePost.title || getPlatformInfo(manualMovePost.platform).name}. Im Kalender anderen Tag auswählen.`
            : 'zum Verschieben drag & drop oder verschieben klicken'}
        </div>
      </div>

      {/* Day Names Header — mit KW-Spalte */}
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
        {/* KW-Header */}
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

      {/* Calendar Grid — mit KW-Spalte */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '28px repeat(7, 1fr)',
          gap: '4px',
        }}
      >
        {(calendarView === 'week' ? [weekDays] : weeks).flatMap((week, weekIndex) => {
          const kw = getISOWeek(week[0]);
          return [
            // Kalenderwoche-Zelle
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
            // 7 Tages-Zellen
            ...week.map((date, dayIndex) => {
              const postsOnDate = getScheduledPostsForDate(date);
              const isCurrent = calendarView === 'week' ? true : isCurrentMonth(date);
              const isTodayDate = isToday(date);
              const hasPosts = postsOnDate.length > 0;
              const dateKey = toLocalDateKey(date);
              const isDragOver = dragOverDate === dateKey && isCurrent;
              const isSelected = calendarDetailDate?.toDateString() === date.toDateString();
              const isWeekend = dayIndex >= 5; // Sa=5, So=6

              return (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  onClick={() => {
                    if (!isCurrent) return;
                    if (manualMovePostId) {
                      applyCalendarDate(manualMovePostId, date, { openTimeEditor: false });
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
                    if (!isCurrent || !draggedPostIdRef.current) return;
                    e.preventDefault();
                    setDragOverDateSafe(dateKey);
                  }}
                  onDragLeave={() => { setDragOverDateSafe(null); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const draggedId = resolveDraggedPostId(e);
                    if (!isCurrent || !draggedId) return;
                    applyCalendarDate(draggedId, date);
                    setDraggedPost(null);
                    setDragOverDateSafe(null);
                  }}
                  style={{
                    minHeight: calendarView === 'week' ? '320px' : '76px',
                    padding: '6px',
                    backgroundColor: isDragOver
                      ? '#1a1a1a'
                      : isSelected
                      ? 'rgba(172, 142, 102, 0.12)'
                      : isTodayDate
                      ? 'rgba(172, 201, 172, 0.08)'
                      : isWeekend && isCurrent
                      ? 'rgba(255,255,255,0.02)'
                      : 'transparent',
                    border: `1px solid ${
                      isDragOver ? '#AC8E66'
                      : isSelected ? '#AC8E66'
                      : isTodayDate ? 'rgba(172, 201, 172, 0.9)'
                      : '#2E2E2E'
                    }`,
                    borderRadius: '6px',
                    opacity: isCurrent ? 1 : 0.25,
                    cursor: isCurrent ? (manualMovePostId ? 'copy' : 'pointer') : 'default',
                    transition: 'all 0.15s ease',
                    transform: isDragOver ? 'scale(1.02)' : 'none',
                  }}
                >
                  {/* Date Number */}
                  <div
                    style={{
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '11px',
                      color: isTodayDate ? '#AC8E66' : isWeekend && isCurrent ? 'rgba(172, 142, 102, 0.2)' : '#777',
                      fontWeight: isTodayDate || hasPosts ? '600' : 'normal',
                      marginBottom: '4px',
                    }}
                  >
                    {date.getDate()}
                  </div>

                  {/* Posts */}
                  {hasPosts && (
                    <div
                      style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
                      onDragOver={(e) => {
                        if (!isCurrent || !draggedPostIdRef.current) return;
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverDateSafe(dateKey);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const draggedId = resolveDraggedPostId(e);
                        if (!isCurrent || !draggedId) return;
                        applyCalendarDate(draggedId, date);
                        setDraggedPost(null);
                        setDragOverDateSafe(null);
                      }}
                    >
                      {postsOnDate.slice(0, calendarView === 'week' ? 10 : 2).map(post => {
                        const info = getPlatformInfo(post.platform);
                        const isDragging = draggedPostIdRef.current === post.id || draggedPostId === post.id;
                        const isManualMoveSelected = manualMovePostId === post.id;
                        const isMoveTimeEditorOpen = postMoveTimeEditor?.postId === post.id;
                        const calendarScheduleState = getPlannerScheduleVisualState({
                          isScheduled: post.status === 'scheduled',
                          scheduledDate: post.scheduledDate,
                          scheduledTime: post.scheduledTime,
                        });
                        const isTodayScheduledPost = calendarScheduleState === 'today';
                        const isOverdueScheduledPost = calendarScheduleState === 'overdue';
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
                                if (!isCurrent || !draggedId || isDragging) return;
                                applyCalendarDate(draggedId, date);
                                setDraggedPost(null);
                                setDragOverDateSafe(null);
                              }}
                              style={{
                                padding: '2px 5px',
                                backgroundColor: isDragging
                                  ? 'rgba(172,142,102,0.25)'
                                  : isOverdueScheduledPost
                                  ? 'rgba(220,38,38,0.14)'
                                  : 'rgba(172,142,102,0.1)',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontFamily: 'IBM Plex Mono, monospace',
                                color: '#1a1a1a',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                cursor: isDragging ? 'grabbing' : 'grab',
                                opacity: isDragging ? 0.8 : 1,
                                boxShadow: `inset 3px 0 0 ${info.color}`,
                                border: isDragging || isManualMoveSelected
                                  ? '1px dashed #1a1a1a'
                                  : isOverdueScheduledPost
                                  ? '1px solid #dc2626'
                                  : isTodayScheduledPost
                                  ? '1px solid #dc2626'
                                  : '1px solid rgba(172,142,102,1)',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (draggedPostIdRef.current) return;
                                handleEditPostClick(post);
                              }}
                            >
                              <FontAwesomeIcon icon={info.icon} style={{ fontSize: '12px', color: '#1a1a1a' }} />
                              <span style={{ fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {info.name} · {post.scheduledTime || '--:--'}
                              </span>
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
                                  fontSize: '8px',
                                  lineHeight: 1,
                                  padding: '5px 4px',
                                  cursor: 'pointer',
                                }}
                                title="Post zum Verschieben markieren"
                              >
                                verschieben
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {postsOnDate.length > 2 && (
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
                          +{postsOnDate.length - 2} mehr
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }),
          ];
        })}
      </div>

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
                border: '0.5px solid #1a1a1a',
                color: isActive ? '#0A0A0A' : '#AC8E66',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '10px',
                padding: '4px 6px',
                borderRadius: '4px',
                boxShadow: 'none',
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

  // ==================== ÜBERSICHT RENDER ====================
  const renderÜbersichtContent = () => {
    const model = buildPlannerDashboardModel({
      scheduledPosts: übersichtScheduledPosts,
      manualPosts: übersichtManualPosts,
      schedules: übersichtSchedules,
      checklistItems: übersichtChecklistItems,
      lastCloudSyncAt: übersichtLastCloudSyncAt,
      platformFilter: übersichtPlatformFilter,
      statusFilter: übersichtStatusFilter,
    });

    return (
      <ZenPlannerDashboard
        isCloudAvailable={isCloudPlannerAvailable()}
        isLoading={übersichtLoading}
        error={übersichtError}
        model={model}
        platformFilter={übersichtPlatformFilter}
        statusFilter={übersichtStatusFilter}
        onPlatformFilterChange={setÜbersichtPlatformFilter}
        onStatusFilterChange={setÜbersichtStatusFilter}
        onOpenCloudSettings={() => openAppSettings('cloud')}
        onOpenPlannerPost={openPlannerPostById}
        onOpenTodoScope={openChecklistScopeForPost}
      />
    );
  };

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
                 <div
                style={{
                  marginTop: '1px',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '12px',
                  color: '#1a1a1a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <span>Projekt:</span>
                <span style={{ color: '#1a1a1a' }}>
                  {projectPath
                    ? isCloudProjectPath(projectPath)
                      ? cloudSettings.cloudAuthToken && cloudSettings.cloudProjectId
                        ? `@cloud: ${cloudSettings.cloudProjectName ?? getCloudProjectName(projectPath) ?? projectName ?? projectPath.slice(7)}`
                        : '—'
                      : projectPath.split('/').pop() ?? projectPath
                    : '—'}
                </span>
               
              </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  Workflow Fortschritt
                  {openedChecklistPosts.length > 0 && openedChecklistPosts.map((post, i) => {
                    const info = getPlatformInfo(post.platform);
                    return (
                      <span key={post.id} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: info.color, fontWeight: 'normal' }}>
                        {info.name}{i < openedChecklistPosts.length - 1 ? ',' : ''}
                      </span>
                    );
                  })}
                </span>
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
                        border: '0.5px solid #1a1a1a',
                        color: isActive ? '#1a1a1a' : '#AC8E66',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '10px',
                        padding: '5px 10px',
                        boxShadow: 'none',
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
                  boxShadow: 'none',
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
              <FontAwesomeIcon icon={faCheck} style={{ color: '#11b616' }} />
              </div>
          <p
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              color: '#777',
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
            <button
              className="zen-planner-btn"
              type="button"
              onClick={() => setActiveTab('planen')}
              style={{
                padding: '9px 12px',
                backgroundColor: 'transparent',
                border: '1px solid #777',
                borderRadius: '8px',
                color: '#555',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              Jetzt planen
            </button>
          </div>
        </div>
      ) : null}




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
              className="zen-planner-btn"
              type="button"
              onClick={showAllChecklistPosts}
              style={{
                padding: '8px 12px 9px',
               
                backgroundColor: checklistBulkPostId === null ? '#1a1a1a' : 'transparent',
                border: '1px solid #3A3A3A',
                borderBottom: checklistBulkPostId === null ? 'transparent' : 'transparent',
                borderRadius: '8px 8px 0 0',
                color: checklistBulkPostId === null ? '#d0cbb8' : '#1a1a1a',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '9px',
                boxShadow: 'none',
                cursor: 'pointer',
                transform: 'translateY(-47px)',
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
                    backgroundColor: isActive ? info.color : 'transparent',
                    borderRadius: '8px 8px 0 0',
                    border: '1px solid #3A3A3A',
                    borderBottom: isActive ? `2px solid ${info.color}` : 'transparent',
                    boxShadow: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transform: 'translateY(-47px) translateX(1px)',
                    minHeight: '34px',
                  }}
                  onClick={() => focusChecklistPost(post.id)}
                >
                  <FontAwesomeIcon icon={info.icon} style={{ fontSize: '14px', color: isActive ? '#d0cbb8' : '#1a1a1a' }} />
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: isActive ? '#d0cbb8' : '#1a1a1a' }}>
                    {info.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Post-Tasks Button — rechts in der Tab-Zeile */}
          <button
            type="button"
            onClick={toggleChecklistBulkItems}
            disabled={checklistBulkItems.length === 0}
            style={{
              padding: '6px 10px',
              background: (!allChecklistBulkItemsCompleted && selectedChecklistBulkPost)
                ? getPlatformInfo(selectedChecklistBulkPost.platform).color
                : (!allChecklistBulkItemsCompleted && !selectedChecklistBulkPost)
                  ? '#1a1a1a'
                  : 'transparent',
              border: '1px solid #3A3A3A',
              borderBottom: 'none',
              borderRadius: '8px 8px 0 0',
              boxShadow: 'none',
              color: (!allChecklistBulkItemsCompleted && selectedChecklistBulkPost) ? '#fff' : (!allChecklistBulkItemsCompleted && !selectedChecklistBulkPost) ? '#d0cbb8' : checklistBulkItems.length === 0 ? '#1a1a1a' : '#555',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 9,
              cursor: checklistBulkItems.length === 0 ? 'not-allowed' : 'pointer',
              opacity: checklistBulkItems.length === 0 ? 0.5 : 1,
              marginLeft: 'auto',
              transform: 'translateY(-47px) translateX(1px)',
               minHeight: '34px',
              flexShrink: 0,
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
                : 'Alle Tasks nicht abschliessen'
              : selectedChecklistBulkPost
                ? 'Post-Tasks abschließen'
                : 'Alle Tasks abschließen'}
          </button>

          {/* + Aufgabe hinzufügen Button */}
          <button
            type="button"
            onClick={() => setShowAddTask(p => !p)}
            style={{
              padding: '6px 10px',
              background: showAddTask ? '#1a1a1a' : 'transparent',
              border: '1px solid #1a1a1a',
              borderBottom: '0px',
              borderRadius: '8px 8px 0 0',
              boxShadow: 'none',
              color: showAddTask ? '#d0cbb8' : '#777',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 10,
          
              cursor: 'pointer',
              transform: 'translateY(-47px)',
              minHeight: '34px',
              lineHeight: 1,
            }}
            title="Eigene Aufgabe hinzufügen"
          >
            Eigener Task
          </button>
        </div>

        {/* Inline Add-Task Formular */}
        {showAddTask && (
          <div style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            padding: '10px 12px',
            background: 'rgba(172,142,102,0.06)',
            border: '1px solid rgba(172,142,102,0.3)',
            transform: 'translateY(-47px)',
            borderRadius: '6px 6px 6px 6px',
            paddingTop: '10px',
         
          }}>
            <ZenDropdown
              value={checklistTargetPostId ?? planningPosts[0]?.id ?? ''}
              onChange={(v) => setChecklistTargetPostId(v)}
              options={planningPosts.map(post => {
                const info = getPlatformInfo(post.platform);
                return { value: post.id, label: `${info.name} · ${post.title || 'Post'}` };
              })}
              variant="compact"
              theme="paper"
            />
            <input
              autoFocus
              type="text"
              value={customTask}
              onChange={(e) => setCustomTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { addCustomTask(); setShowAddTask(false); }
                if (e.key === 'Escape') { setShowAddTask(false); setCustomTask(''); }
              }}
              placeholder="Neue Aufgabe…"
              style={{
                flex: 1,
                padding: '8px 10px',
                background: 'transparent',
                border: '1px solid rgba(172,142,102,0.4)',
                borderRadius: 4,
                boxShadow: 'none',
                color: '#333',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 10,
              }}
            />
            <button
              onClick={() => { addCustomTask(); setShowAddTask(false); }}
              style={{
                padding: '8px 14px',
                background: '#1a1a1a',
                border: 'none',
                borderRadius: 4,
                color: '#d0cbb8',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >+</button>
          </div>
        )}

      {/* Checklist */}
      <div style={{ marginBottom: '16px' }}>
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
                            backgroundColor: isCompleted ? '#1a1a1a' : '#d0cbb8',
                            color: isCompleted ? '#d0cbb8' : 'transparent',
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
                              boxShadow: 'none',
                             
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
                      fontSize: '10px',
                      color: activeTab === tab.id ? '#d0cbb8' : '#777',
                      fontWeight: activeTab === tab.id ? 'normal' : 'normal',
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
                      fontSize: '10px',
                      color: '#d0cbb8',
                      
                      transition: 'all 0.2s',
                    }}
                    title={activeTab === 'kalender' ? 'Kalender exportieren (ICS)' : 'Export öffnen'}
                  >
                    <FontAwesomeIcon icon={faDownload} />
                    Export
                  </button>
                )}
                {activeTab !== 'übersicht' && (
                  <>
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
                        fontSize: '10px', 
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
                        fontSize: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '4px',
                        color: calendarStatusList === 'draft' ? '#d0cbb8' : '#999', 
                        }}>
                        {draftCount} Entwürfe
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeTab === 'planen' && renderPlanenContent()}
            {activeTab === 'kalender' && renderKalenderContent()}
            {activeTab === 'checklist' && renderChecklistContent()}
            {activeTab === 'übersicht' && renderÜbersichtContent()}
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
        showCloseButton={false}
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
              width: '100%', padding: '10px 12px', 
              backgroundColor: 'transparent',
              border: '1px solid #3A3A3A', borderRadius: '6px', color: '#1a1a1a',
              fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px',
              outline: 'none', boxSizing: 'border-box', 
              boxShadow: 'none',
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
              outline: 'none', boxSizing: 'border-box', boxShadow: 'none',
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
               boxShadow: 'none',
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
                  style={{ background: 'transparent', 
                     boxShadow: 'none',
                  border: 'none', color: '#555', cursor: 'pointer', fontSize: 12, padding: '0 2px' }}>×</button>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', 
              padding: '18px 10px', boxShadow: 'none', }}>
              <FontAwesomeIcon icon={faImage} style={{ 
                fontSize: '9px', color: isEditImageDragActive ? '#AC8E66' : '#1a1a1a', 
                flexShrink: 0 }} />
              <input
                type="text"
                value={editImageUrl}
                onChange={(e) => setEditImageUrl(e.target.value)}
                placeholder={isEditImageDragActive ? 'Bild hier ablegen…' : 'Titelbild URL — oder Bild hierher ziehen'}
                style={{
                  flex: 1, padding: '10px', 
                  backgroundColor: 'transparent', 
             
                  color: editImageUrl ? '#e5e5e5' : '#555',
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', 
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Datum + Uhrzeit */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FontAwesomeIcon icon={faCalendarDays} 
                style={{ fontSize: '9px' }} /> Datum
              </label>
              <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                style={{ 
                  padding: '8px 10px', 
                  backgroundColor: 'transparent', 
                  border: '1px solid #3A3A3A', 
                   boxShadow: 'none',
                  borderRadius: '6px', color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ 
              display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FontAwesomeIcon icon={faClock} style={{ fontSize: '9px' }} /> Uhrzeit
              </label>
              <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)}
                style={{ padding: '8px 10px',  boxShadow: 'none',
                backgroundColor: 'transparent', border: '1px solid #3A3A3A', borderRadius: '6px', color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
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
              showLineNumbers={true}
              showCharCount={true}
              title={editTitle || undefined}
              subtitle={editSubtitle || undefined}
              showHeader={true}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
            <button
              className="zen-planner-btn"
              type="button"
              onClick={() => setEditingPost(null)}
              style={{
                padding: '9px 12px',
                backgroundColor: 'transparent',
                border: '1px solid #777',
                borderRadius: '8px',
                color: '#555',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              Abbrechen
            </button>
            <button
              className="zen-planner-btn"
              type="button"
              onClick={saveInlineEdit}
              style={{
                padding: '9px 12px',
                backgroundColor: 'transparent',
                border: '1px solid #777',
                borderRadius: '8px',
                color: '#555',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              Speichern
            </button>
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
            <button
              className="zen-planner-btn"
              type="button"
              onClick={() => setReschedulePost(null)}
              style={{
                padding: '9px 12px',
                backgroundColor: 'transparent',
                border: '1px solid #777',
                borderRadius: '8px',
                color: '#555',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={() => {
                if (!reschedulePost) return;
                upsertPostSchedule(reschedulePost.id, rescheduleDate, rescheduleTime);
                setReschedulePost(null);
              }}
              style={{
                padding: '9px 12px',
                backgroundColor: 'transparent',
                border: '1px solid #777',
                borderRadius: '8px',
                color: '#555',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              Speichern
            </button>
          </div>
        </div>
      </ZenModal>
    </>
  );
}
