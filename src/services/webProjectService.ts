/**
 * Web Project Service — Hybrid folder picker + virtual projects for browser mode.
 * - Real folders: File System Access API (showDirectoryPicker) → handle stored in IndexedDB
 * - Virtual projects: metadata only in localStorage, user adds docs via drag & drop
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WebProject {
  id: string;
  name: string;
  type: 'directory' | 'virtual';
  createdAt: number;
  updatedAt: number;
}

export interface WebProjectFile {
  name: string;
  path: string;
  content: string;
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const LS_KEY = 'zenpost_web_projects_v1';
const IDB_DB = 'zenpost_web_v1';
const IDB_STORE = 'dir_handles';

// ─── Path encoding ────────────────────────────────────────────────────────────

/** Encode a web project as a pseudo-path understood by the dashboard */
export function encodeWebProjectPath(id: string): string {
  return `@web:${id}`;
}

/** Extract the project ID from a web project path */
export function decodeWebProjectId(path: string): string | null {
  if (!path.startsWith('@web:')) return null;
  return path.slice(5);
}

export function isWebProjectPath(path: string): boolean {
  return path.startsWith('@web:');
}

/** Get the display name for a web project path (looks up localStorage) */
export function getWebProjectName(path: string): string | null {
  const id = decodeWebProjectId(path);
  if (!id) return null;
  return getWebProjects().find((p) => p.id === id)?.name ?? null;
}

export function getWebProjectType(path: string): WebProject['type'] | null {
  const id = decodeWebProjectId(path);
  if (!id) return null;
  return getWebProjects().find((p) => p.id === id)?.type ?? null;
}

// ─── localStorage CRUD ────────────────────────────────────────────────────────

export function getWebProjects(): WebProject[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWebProject(project: WebProject): void {
  const projects = getWebProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.unshift(project);
  }
  localStorage.setItem(LS_KEY, JSON.stringify(projects));
}

export function deleteWebProject(id: string): void {
  const projects = getWebProjects().filter((p) => p.id !== id);
  localStorage.setItem(LS_KEY, JSON.stringify(projects));
  void deleteDirectoryHandle(id);
}

// ─── ID generation ────────────────────────────────────────────────────────────

function generateId(): string {
  return `wp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Virtual Project ──────────────────────────────────────────────────────────

export function createVirtualProject(name: string): WebProject {
  const project: WebProject = {
    id: generateId(),
    name: name.trim() || 'Mein Projekt',
    type: 'virtual',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveWebProject(project);
  return project;
}

// ─── Directory Picker ─────────────────────────────────────────────────────────

export function canUseDirectoryPicker(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function';
}

/**
 * Opens the browser directory picker, stores the handle in IndexedDB, and
 * saves the project metadata in localStorage.
 * Returns null if the user cancels.
 */
export async function openDirectoryProject(): Promise<WebProject | null> {
  if (!canUseDirectoryPicker()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle = await (window as any).showDirectoryPicker({ mode: 'read' });
    const project: WebProject = {
      id: generateId(),
      name: handle.name as string,
      type: 'directory',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveWebProject(project);
    await storeDirectoryHandle(project.id, handle);
    return project;
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === 'AbortError') return null;
    throw err;
  }
}

// ─── IndexedDB — FileSystemDirectoryHandle storage ───────────────────────────

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function storeDirectoryHandle(
  id: string,
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDirectoryHandle(
  id: string,
): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(id);
      req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function deleteDirectoryHandle(id: string): Promise<void> {
  try {
    const db = await openIDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

// ─── Read files from directory handle ────────────────────────────────────────

/** Recursively reads .md and .txt files from a FileSystemDirectoryHandle (max depth 3) */
export async function readMarkdownFiles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handle: any,
  prefix = '',
  depth = 0,
): Promise<WebProjectFile[]> {
  if (depth > 3) return [];
  const results: WebProjectFile[] = [];
  for await (const entry of handle.values()) {
    const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === 'file' && /\.(md|txt)$/i.test(entry.name)) {
      try {
        const file = await entry.getFile();
        const content = await file.text();
        results.push({ name: entry.name, path: entryPath, content });
      } catch {
        /* skip unreadable files */
      }
    } else if (entry.kind === 'directory' && depth < 2) {
      const sub = await readMarkdownFiles(entry, entryPath, depth + 1);
      results.push(...sub);
    }
  }
  return results;
}
