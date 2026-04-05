/**
 * Planner Banner Config
 * Controls when scheduled posts appear in the ZenPublishingBanner.
 */

export type BannerMode = 'always' | 'before' | 'due';

export interface PlannerBannerConfig {
  mode: BannerMode;
  /** Minutes before scheduled time to show the banner (only used when mode === 'before') */
  beforeMinutes: number;
}

const KEY = 'zenpost_planner_banner_config';
const DEFAULT: PlannerBannerConfig = { mode: 'due', beforeMinutes: 60 };

export function loadPlannerBannerConfig(): PlannerBannerConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) } as PlannerBannerConfig;
  } catch {
    return { ...DEFAULT };
  }
}

export function savePlannerBannerConfig(config: PlannerBannerConfig): void {
  localStorage.setItem(KEY, JSON.stringify(config));
}
