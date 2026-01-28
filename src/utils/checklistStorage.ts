import { isTauri } from '@tauri-apps/api/core';
import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { getPublishingPaths, initializePublishingProject } from '../services/publishingService';

export type ChecklistItem = {
  id: string;
  text: string;
  completed: boolean;
  source: 'default' | 'custom';
};

type ChecklistPayload = {
  items: ChecklistItem[];
  updatedAt: string;
};

const buildDefaultChecklist = (defaultTasks: string[]): ChecklistItem[] =>
  defaultTasks.map((task, index) => ({
    id: `task-${index}`,
    text: task,
    completed: false,
    source: 'default',
  }));

const mergeDefaults = (items: ChecklistItem[], defaultTasks: string[]): ChecklistItem[] => {
  const existingTexts = new Set(items.map(item => item.text));
  const defaults = buildDefaultChecklist(defaultTasks).filter(item => !existingTexts.has(item.text));
  return [...items, ...defaults];
};

const storageKey = (projectPath?: string | null) =>
  `zenpost_checklist_${projectPath ?? 'default'}`;

const normalizeItems = (items: unknown): ChecklistItem[] => {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is ChecklistItem => !!item && typeof item.text === 'string')
    .map(item => ({
      id: typeof item.id === 'string' ? item.id : `custom-${Date.now()}`,
      text: item.text,
      completed: !!item.completed,
      source: item.source === 'default' ? 'default' : 'custom',
    }));
};

export async function loadChecklist(
  defaultTasks: string[],
  projectPath?: string | null,
): Promise<ChecklistItem[]> {
  if (isTauri() && projectPath) {
    try {
      await initializePublishingProject(projectPath);
      const { root: publishingRoot } = getPublishingPaths(projectPath);
      const checklistPath = `${publishingRoot}/checklist.json`;
      if (!(await exists(checklistPath))) {
        return buildDefaultChecklist(defaultTasks);
      }
      const raw = await readTextFile(checklistPath);
      const data = JSON.parse(raw) as ChecklistPayload;
      const items = normalizeItems(data?.items);
      return mergeDefaults(items, defaultTasks);
    } catch {
      return buildDefaultChecklist(defaultTasks);
    }
  }

  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem(storageKey(projectPath));
    if (!raw) return buildDefaultChecklist(defaultTasks);
    try {
      const data = JSON.parse(raw) as ChecklistPayload;
      const items = normalizeItems(data?.items);
      return mergeDefaults(items, defaultTasks);
    } catch {
      return buildDefaultChecklist(defaultTasks);
    }
  }

  return buildDefaultChecklist(defaultTasks);
}

export async function saveChecklist(
  items: ChecklistItem[],
  projectPath?: string | null,
): Promise<void> {
  const payload: ChecklistPayload = {
    items,
    updatedAt: new Date().toISOString(),
  };

  if (isTauri() && projectPath) {
    await initializePublishingProject(projectPath);
    const { root: publishingRoot } = getPublishingPaths(projectPath);
    const checklistPath = `${publishingRoot}/checklist.json`;
    await writeTextFile(checklistPath, JSON.stringify(payload, null, 2));
    return;
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(storageKey(projectPath), JSON.stringify(payload));
  }
}

export const formatChecklistAsMarkdown = (items: ChecklistItem[], title = 'Checklist') => {
  const lines = items.map(item => `- [${item.completed ? 'x' : ' '}] ${item.text}`);
  return `# ${title}\n\n${lines.join('\n')}\n`;
};

export const formatChecklistAsCsv = (items: ChecklistItem[]) => {
  const lines = items.map(item => `${item.completed ? 'done' : 'open'},\"${item.text.replace(/\"/g, '\"\"')}\"`);
  return `status,task\n${lines.join('\n')}\n`;
};
