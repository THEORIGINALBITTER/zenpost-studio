import { isTauri } from '@tauri-apps/api/core';
import type { ScheduledPost } from '../types/scheduling';
import { isCloudLoggedIn, loadScheduleFromCloud } from './cloudScheduleService';
import { loadPlannerFromCloud } from './cloudPlannerService';
import { initializePublishingProject, loadSchedule } from './publishingService';
import type { PlannerStorage } from '../kits/PatternKit/ZenModalSystem/modals/plannerTypes';

export type PlannerBootstrapSource = 'cloud' | 'local' | 'empty';

export type PlannerBootstrapState = {
  posts: ScheduledPost[];
  planner: PlannerStorage | null;
  source: PlannerBootstrapSource;
};

export async function loadPlannerBootstrapState(projectPath?: string | null): Promise<PlannerBootstrapState> {
  if (isCloudLoggedIn()) {
    try {
      const [posts, planner] = await Promise.all([
        loadScheduleFromCloud(),
        loadPlannerFromCloud(),
      ]);
      if (posts || planner) {
        return {
          posts: posts ?? [],
          planner: planner ?? null,
          source: 'cloud',
        };
      }
    } catch (error) {
      console.error('[PlannerBootstrap] Failed to load cloud planner state:', error);
    }
  }

  if (isTauri() && projectPath) {
    try {
      await initializePublishingProject(projectPath);
      const project = await loadSchedule(projectPath);
      return { posts: project.posts, planner: null, source: 'local' };
    } catch (error) {
      console.error('[PlannerBootstrap] Failed to load local schedule:', error);
    }
  }

  return { posts: [], planner: null, source: 'empty' };
}
