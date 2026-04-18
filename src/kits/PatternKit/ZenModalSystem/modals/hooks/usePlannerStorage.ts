import { useState, useEffect, useRef } from 'react';
import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { isTauri } from '@tauri-apps/api/core';
import {
  initializePublishingProject,
} from '../../../../../services/publishingService';
import {
  isCloudPlannerAvailable,
  loadPlannerFromCloud,
  savePlannerToCloud,
} from '../../../../../services/cloudPlannerService';
import { subscribeToCloudPlannerSync } from '../../../../../services/cloudPlannerSyncService';
import { subscribeToCloudSessionSync } from '../../../../../services/cloudSessionSyncService';
import { isCloudProjectPath } from '../../../../../services/cloudProjectService';
import type { ScheduledPost, SocialPlatform } from '../../../../../types/scheduling';
import type { ChecklistItem } from '../../../../../utils/checklistStorage';
import type { PlannerPost, PlannerStorage, PostSchedule, ScheduleMap } from '../plannerTypes';
import { buildStableContentId, buildScheduleMap, resolvePlannerStorageInfo } from '../plannerUtils';
import type { PlannerBootstrapState } from '../../../../../services/plannerBootstrapService';

interface UsePlannerStorageOptions {
  isOpen: boolean;
  projectPath?: string | null;
  /** Raw posts from editor props — used to rebuild schedule map on load */
  posts: Array<{
    platform: SocialPlatform;
    title: string;
    subtitle?: string;
    content: string;
    characterCount: number;
    wordCount: number;
  }>;
  scheduledPosts: ScheduledPost[];
  initialDate: string;
  initialSchedules?: Partial<Record<SocialPlatform, PostSchedule>>;
  bootstrapState?: PlannerBootstrapState | null;
}

export interface UsePlannerStorageReturn {
  plannerLoaded: boolean;
  plannerStoragePath: string | null;
  plannerProjectPath: string | null;
  manualPosts: PlannerPost[];
  setManualPosts: React.Dispatch<React.SetStateAction<PlannerPost[]>>;
  schedules: ScheduleMap;
  setSchedules: React.Dispatch<React.SetStateAction<ScheduleMap>>;
  checklistItems: ChecklistItem[];
  setChecklistItems: React.Dispatch<React.SetStateAction<ChecklistItem[]>>;
}

export function usePlannerStorage({
  isOpen,
  projectPath,
  posts,
  scheduledPosts,
  initialDate,
  initialSchedules,
  bootstrapState,
}: UsePlannerStorageOptions): UsePlannerStorageReturn {
  const [plannerStoragePath, setPlannerStoragePath] = useState<string | null>(null);
  const [plannerProjectPath, setPlannerProjectPath] = useState<string | null>(null);
  const [plannerLoaded, setPlannerLoaded] = useState(false);
  const [manualPosts, setManualPosts] = useState<PlannerPost[]>([]);
  const [schedules, setSchedules] = useState<ScheduleMap>({});
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [cloudSessionRevision, setCloudSessionRevision] = useState(0);
  const lastLoadedPathRef = useRef<string | null>(null);

  const reconcileSchedules = (
    nextManualPosts: PlannerPost[],
    incomingSchedules: ScheduleMap,
  ): ScheduleMap => {
    const nextPlanningPosts = buildPlanningPosts(posts, scheduledPosts, nextManualPosts);
    const baseSchedules = buildScheduleMap(nextPlanningPosts, initialDate, initialSchedules);
    const mergedSchedules: ScheduleMap = {
      ...baseSchedules,
      ...incomingSchedules,
    };

    scheduledPosts.forEach((post) => {
      let dateStr = '';
      if (post.scheduledDate) {
        const value = post.scheduledDate;
        dateStr = value instanceof Date ? value.toISOString().split('T')[0] : String(value).split('T')[0];
      }
      if (dateStr || post.scheduledTime) {
        mergedSchedules[post.id] = {
          date: dateStr,
          time: post.scheduledTime ?? '',
        };
      }
    });

    return mergedSchedules;
  };

  // ── Resolve storage paths when modal opens ──────────────────────────────────
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
    void resolveInfo();
  }, [isOpen, projectPath]);

  // ── Load planner_posts.json (lokal) + optional Cloud-Sync ──────────────────
  useEffect(() => {
    if (!isOpen) return;

    if (!isTauri()) {
      // Use a fingerprint that changes when bootstrapState arrives with real data,
      // so that reconcileSchedules runs again with the correct scheduledPosts.
      const bootstrapFingerprint = bootstrapState?.planner?.updatedAt
        ?? (bootstrapState?.posts && bootstrapState.posts.length > 0 ? `posts:${bootstrapState.posts.length}` : null)
        ?? 'null';
      const browserLoadKey = `browser:${projectPath ?? 'default'}:${bootstrapFingerprint}`;
      if (lastLoadedPathRef.current === browserLoadKey) return;
      lastLoadedPathRef.current = browserLoadKey;
      setPlannerLoaded(false);

      if (bootstrapState?.planner) {
        setManualPosts(bootstrapState.planner.manualPosts);
        setChecklistItems(bootstrapState.planner.checklistItems);
        setSchedules(reconcileSchedules(bootstrapState.planner.manualPosts, bootstrapState.planner.schedules));
        setPlannerLoaded(true);
        return;
      }

      // bootstrapState has posts but no planner (schedule-only cloud data)
      if (bootstrapState?.posts && bootstrapState.posts.length > 0) {
        // scheduledPosts are now in closure — reconcile with empty manualPosts
        setSchedules(reconcileSchedules([], {}));
        setPlannerLoaded(true);
        return;
      }

      // Browser mode: try cloud only (bootstrapState not yet available)
      if (!isCloudPlannerAvailable()) {
        setPlannerLoaded(true);
        return;
      }
      const loadFromCloud = async () => {
        try {
          const cloud = await loadPlannerFromCloud();
          if (cloud) {
            setManualPosts(cloud.manualPosts);
            setChecklistItems(cloud.checklistItems);
            setSchedules(reconcileSchedules(cloud.manualPosts, cloud.schedules));
          }
        } catch (error) {
          console.error('[Planner] Failed to load planner from cloud (browser mode)', error);
        } finally {
          setPlannerLoaded(true);
        }
      };
      void loadFromCloud();
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

        // ── 1. Load local file ──────────────────────────────────────────────
        let localData: Partial<PlannerStorage> = {};
        const fileExists = await exists(plannerStoragePath);
        if (fileExists) {
          const raw = await readTextFile(plannerStoragePath);
          localData = JSON.parse(raw) as Partial<PlannerStorage>;
        }

        // ── 2. Merge with cloud if available ────────────────────────────────
        let cloudData: Partial<PlannerStorage> | null = null;
        if (isCloudPlannerAvailable()) {
          try {
            cloudData = await loadPlannerFromCloud();
          } catch (error) {
            console.warn('[Planner] Cloud load failed, using local data only', error);
          }
        }

        // Cloud wins for manualPosts + checklistItems if more recent
        const useCloud =
          cloudData !== null &&
          cloudData.updatedAt &&
          localData.updatedAt &&
          cloudData.updatedAt > localData.updatedAt;

        const savedManualPosts = Array.isArray(
          useCloud ? cloudData?.manualPosts : localData.manualPosts,
        )
          ? (useCloud ? cloudData!.manualPosts : localData.manualPosts)!
          : [];

        const savedChecklist = Array.isArray(
          useCloud ? cloudData?.checklistItems : localData.checklistItems,
        )
          ? (useCloud ? cloudData!.checklistItems : localData.checklistItems)!
          : [];

        // Schedules: merge local + cloud (most recent per-post wins)
        const localSchedules =
          localData.schedules && typeof localData.schedules === 'object'
            ? localData.schedules
            : {};
        const cloudSchedules =
          cloudData?.schedules && typeof cloudData.schedules === 'object'
            ? cloudData.schedules
            : {};
        const savedSchedules = { ...localSchedules, ...cloudSchedules };

        setManualPosts(savedManualPosts);
        setChecklistItems(savedChecklist);
        setSchedules(reconcileSchedules(savedManualPosts, savedSchedules));
      } catch (error) {
        console.error('[Planner] Failed to load planner storage', error);
      } finally {
        setPlannerLoaded(true);
      }
    };

    void loadPlannerData();
  }, [isOpen, plannerStoragePath, plannerProjectPath, initialDate, initialSchedules, posts, scheduledPosts, bootstrapState, cloudSessionRevision]);

  // ── Autosave: lokal + cloud (debounced 500 ms) ─────────────────────────────
  useEffect(() => {
    if (!isOpen || !plannerLoaded) return;

    const timeout = setTimeout(async () => {
      const payload: PlannerStorage = {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        manualPosts,
        schedules,
        checklistItems,
      };

      // Local save (Tauri only)
      if (isTauri() && plannerStoragePath && plannerProjectPath) {
        try {
          await initializePublishingProject(plannerProjectPath);
          await writeTextFile(plannerStoragePath, JSON.stringify(payload, null, 2));
        } catch (error) {
          console.error('[Planner] Failed to autosave planner storage (local)', error);
        }
      }

      // Cloud save (if logged in)
      if (isCloudPlannerAvailable()) {
        try {
          await savePlannerToCloud(manualPosts, schedules, checklistItems);
        } catch (error) {
          console.error('[Planner] Failed to autosave planner storage (cloud)', error);
        }
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [isOpen, plannerLoaded, plannerStoragePath, plannerProjectPath, manualPosts, schedules, checklistItems]);

  useEffect(() => {
    if (!isOpen || !plannerLoaded || !isCloudPlannerAvailable()) return;

    return subscribeToCloudPlannerSync(({ planner }) => {
      setManualPosts(planner.manualPosts);
      setChecklistItems(planner.checklistItems);
      setSchedules(reconcileSchedules(planner.manualPosts, planner.schedules));
    });
  }, [isOpen, plannerLoaded, posts, scheduledPosts, initialDate, initialSchedules]);

  useEffect(() => {
    if (!isOpen || !projectPath || !isCloudProjectPath(projectPath)) return;

    return subscribeToCloudSessionSync(({ reason, current }) => {
      if (reason === 'logout' || !current.authToken || !current.projectId) {
        lastLoadedPathRef.current = null;
        setManualPosts([]);
        setSchedules({});
        setChecklistItems([]);
        setPlannerLoaded(true);
        setCloudSessionRevision(prev => prev + 1);
        return;
      }

      if (reason === 'login' || reason === 'project-change') {
        lastLoadedPathRef.current = null;
        setCloudSessionRevision(prev => prev + 1);
      }
    }, { intervalMs: 5000 });
  }, [isOpen, projectPath]);

  return {
    plannerLoaded,
    plannerStoragePath,
    plannerProjectPath,
    manualPosts,
    setManualPosts,
    schedules,
    setSchedules,
    checklistItems,
    setChecklistItems,
  };
}

// ── Helper ─────────────────────────────────────────────────────────────────────
function buildPlanningPosts(
  posts: UsePlannerStorageOptions['posts'],
  scheduledPosts: ScheduledPost[],
  savedManualPosts: PlannerPost[],
): PlannerPost[] {
  return [
    ...posts.map((post) => {
      const existingId =
        scheduledPosts.find(
          (p) => p.platform === post.platform && p.content === post.content,
        )?.id ?? null;
      const id = existingId ?? buildStableContentId(post.platform, post.content, post.title);
      return { ...post, id, source: 'content' as const };
    }),
    ...savedManualPosts,
  ];
}
