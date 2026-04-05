import { useState, useEffect, useRef } from 'react';
import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { isTauri } from '@tauri-apps/api/core';
import {
  initializePublishingProject,
} from '../../../../../services/publishingService';
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

  // ── Load planner_posts.json ─────────────────────────────────────────────────
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
        const savedSchedules =
          parsed.schedules && typeof parsed.schedules === 'object' ? parsed.schedules : {};
        const savedChecklist = Array.isArray(parsed.checklistItems) ? parsed.checklistItems : [];

        const nextPlanningPosts: PlannerPost[] = [
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
  }, [isOpen, plannerStoragePath, plannerProjectPath, initialDate, initialSchedules, posts, scheduledPosts]);

  // ── Autosave planner_posts.json (debounced 500 ms) ─────────────────────────
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
