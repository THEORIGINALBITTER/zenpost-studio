const LAST_PROJECT_PATH_KEY = 'zenpost_last_project_path';
const RECENT_PROJECT_PATHS_KEY = 'zenpost_recent_project_paths';
const DEFAULT_LIMIT = 8;

function lastKey(ns?: string) {
  return ns ? `zenpost_${ns}_last_project_path` : LAST_PROJECT_PATH_KEY;
}
function recentKey(ns?: string) {
  return ns ? `zenpost_${ns}_recent_project_paths` : RECENT_PROJECT_PATHS_KEY;
}

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

export const getLastProjectPath = (ns?: string): string | null => {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem(lastKey(ns));
  return value ? normalizePath(value) : null;
};

export const getRecentProjectPaths = (limit = DEFAULT_LIMIT, ns?: string): string[] => {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(recentKey(ns));
  if (!raw) {
    const last = getLastProjectPath(ns);
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

export const rememberProjectPath = (path: string, limit = DEFAULT_LIMIT, ns?: string) => {
  if (typeof window === 'undefined') return;
  const normalized = normalizePath(path);
  if (!normalized) return;

  localStorage.setItem(lastKey(ns), normalized);
  const history = getRecentProjectPaths(limit, ns);
  const next = uniquePaths([normalized, ...history]).slice(0, limit);
  localStorage.setItem(recentKey(ns), JSON.stringify(next));
};

export const removeProjectPath = (path: string, ns?: string) => {
  if (typeof window === 'undefined') return;
  const normalized = normalizePath(path);
  const history = getRecentProjectPaths(DEFAULT_LIMIT, ns);
  const next = history.filter((p) => p !== normalized);
  localStorage.setItem(recentKey(ns), JSON.stringify(next));
  if (localStorage.getItem(lastKey(ns)) === normalized) {
    localStorage.setItem(lastKey(ns), next[0] ?? '');
  }
};
