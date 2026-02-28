import defaultZenThoughts from '../data/zenThoughts.json';
import { ZEN_STUDIO_SETTINGS_STORAGE_KEY } from '../constants/settingsKeys';

export interface ZenStudioSettings {
  showInGettingStarted: boolean;
  showInDocStudio: boolean;
  showInContentAIStudio: boolean;
  thoughts: string[];
  thoughtsFilePath: string | null;
}

export const defaultZenStudioSettings: ZenStudioSettings = {
  showInGettingStarted: true,
  showInDocStudio: false,
  showInContentAIStudio: false,
  thoughts: [...defaultZenThoughts],
  thoughtsFilePath: null,
};

export const loadZenStudioSettings = (): ZenStudioSettings => {
  if (typeof window === 'undefined') return { ...defaultZenStudioSettings };
  const raw = localStorage.getItem(ZEN_STUDIO_SETTINGS_STORAGE_KEY);
  if (!raw) return { ...defaultZenStudioSettings };
  try {
    const parsed = JSON.parse(raw) as Partial<ZenStudioSettings>;
    return {
      ...defaultZenStudioSettings,
      ...parsed,
      thoughts:
        Array.isArray(parsed.thoughts) && parsed.thoughts.length > 0
          ? parsed.thoughts.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          : [...defaultZenStudioSettings.thoughts],
      thoughtsFilePath: typeof parsed.thoughtsFilePath === 'string' && parsed.thoughtsFilePath.trim().length > 0
        ? parsed.thoughtsFilePath.trim()
        : null,
    };
  } catch {
    return { ...defaultZenStudioSettings };
  }
};

export const saveZenStudioSettings = (settings: ZenStudioSettings): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ZEN_STUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('zen-studio-settings-updated', { detail: settings }));
};

export const patchZenStudioSettings = (patch: Partial<ZenStudioSettings>): ZenStudioSettings => {
  const current = loadZenStudioSettings();
  const next: ZenStudioSettings = {
    ...current,
    ...patch,
    thoughts:
      Array.isArray(patch.thoughts) && patch.thoughts.length > 0
        ? patch.thoughts.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : current.thoughts,
    thoughtsFilePath:
      typeof patch.thoughtsFilePath === 'string'
        ? (patch.thoughtsFilePath.trim().length > 0 ? patch.thoughtsFilePath.trim() : null)
        : current.thoughtsFilePath,
  };
  saveZenStudioSettings(next);
  return next;
};

export const serializeZenThoughtsForEditor = (thoughts: string[]): string =>
  thoughts.map((line) => line.trim()).filter(Boolean).join('\n');

export const parseZenThoughtsFromEditor = (content: string): string[] => {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : [...defaultZenStudioSettings.thoughts];
};
