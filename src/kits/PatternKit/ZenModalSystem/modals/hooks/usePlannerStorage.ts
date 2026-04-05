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
import type { ScheduledPost, SocialPlatform } from '../../../../../types/scheduling';
import type { ChecklistItem } from '../../../../../utils/checklistStorage';
import type { PlannerPost, PlannerStorage, PostSchedule, ScheduleMap } from '../plannerTypes';
import { buildStableContentId, buildScheduleMap, resolvePlannerStorageInfo } from '../plannerUtils';

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
}: UsePlannerStorageOptions): UsePlannerStorageReturn {
  const [plannerStoragePath, setPlannerStoragePath] = useState<string | null>(null);
  const [plannerProjectPath, setPlannerProjectPath] = useState<string | null>(null);
  const [plannerLoaded, setPlannerLoaded] = useState(false);
  const [manualPosts, setManualPosts] = useState<PlannerPost[]>([]);
  const [schedules, setSchedules] = useState<ScheduleMap>({});
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const lastLoadedPathRef = useRef<string | null>(null);

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
      // Browser mode: try cloud only
      if (!isCloudPlannerAvailable()) {
        setPlannerLoaded(true);
        return;
      }
      const loadFromCloud = async () => {
        try {
          const cloud = await loadPlannerFromCloud();
          if (cloud) {
            const nextPlanningPosts = buildPlanningPosts(posts, scheduledPosts, cloud.manualPosts);
            const baseSchedules = buildScheduleMap(nextPlanningPosts, initialDate, initialSchedules);
            setManualPosts(cloud.manualPosts);
            setChecklistItems(cloud.checklistItems);
            setSchedules({ ...baseSchedules, ...cloud.schedules });
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

        const nextPlanningPosts = buildPlanningPosts(posts, scheduledPosts, savedManualPosts);
        const baseSchedules = buildScheduleMap(nextPlanningPosts, initialDate, initialSchedules);

        setManualPosts(savedManualPosts);
        setChecklistItems(savedChecklist);
        setSchedules({ ...baseSchedules, ...savedSchedules });
      } catch (error) {
        console.error('[Planner] Failed to load planner storage', error);
      } finally {
        setPlannerLoaded(true);
      }
    };

    void loadPlannerData();
  }, [isOpen, plannerStoragePath, plannerProjectPath, initialDate, initialSchedules, posts, scheduledPosts]);

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
