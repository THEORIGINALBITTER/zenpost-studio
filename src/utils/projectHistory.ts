const LAST_PROJECT_PATH_KEY = 'zenpost_last_project_path';
const RECENT_PROJECT_PATHS_KEY = 'zenpost_recent_project_paths';
const DEFAULT_LIMIT = 8;

const normalizePath = (path: string) => path.trim();

const uniquePaths = (paths: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const path of paths) {
    const normalized = normalizePath(path);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
};

export const getLastProjectPath = (): string | null => {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem(LAST_PROJECT_PATH_KEY);
  return value ? normalizePath(value) : null;
};

export const getRecentProjectPaths = (limit = DEFAULT_LIMIT): string[] => {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(RECENT_PROJECT_PATHS_KEY);
  if (!raw) {
    const last = getLastProjectPath();
    return last ? [last] : [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return uniquePaths(parsed.filter((value): value is string => typeof value === 'string')).slice(0, limit);
  } catch {
    return [];
  }
};

export const rememberProjectPath = (path: string, limit = DEFAULT_LIMIT) => {
  if (typeof window === 'undefined') return;
  const normalized = normalizePath(path);
  if (!normalized) return;

  localStorage.setItem(LAST_PROJECT_PATH_KEY, normalized);
  const history = getRecentProjectPaths(limit);
  const next = uniquePaths([normalized, ...history]).slice(0, limit);
  localStorage.setItem(RECENT_PROJECT_PATHS_KEY, JSON.stringify(next));
};

export const removeProjectPath = (path: string) => {
  if (typeof window === 'undefined') return;
  const normalized = normalizePath(path);
  const history = getRecentProjectPaths();
  const next = history.filter((p) => p !== normalized);
  localStorage.setItem(RECENT_PROJECT_PATHS_KEY, JSON.stringify(next));
  if (localStorage.getItem(LAST_PROJECT_PATH_KEY) === normalized) {
    localStorage.setItem(LAST_PROJECT_PATH_KEY, next[0] ?? '');
  }
};

