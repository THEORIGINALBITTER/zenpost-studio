import { loadZenStudioSettings } from './zenStudioSettingsService';

export interface CloudProject {
  id: number;
  name: string;
  updatedAt?: number;
}

const LS_KEY = 'zenpost_cloud_projects_v1';
const DEFAULT_BASE_URL = 'https://denisbitter.de/stage02/api';

export const encodeCloudProjectPath = (id: number): string => `@cloud:${id}`;

export const isCloudProjectPath = (path: string): boolean => path.startsWith('@cloud:');

export const decodeCloudProjectId = (path: string): number | null => {
  if (!isCloudProjectPath(path)) return null;
  const raw = path.slice(7);
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
};

export const getCloudProjects = (): CloudProject[] => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveCloudProject = (project: CloudProject): void => {
  const existing = getCloudProjects();
  const idx = existing.findIndex((p) => p.id === project.id);
  if (idx >= 0) existing[idx] = { ...existing[idx], ...project };
  else existing.unshift(project);
  localStorage.setItem(LS_KEY, JSON.stringify(existing.slice(0, 50)));
};

export const getCloudProjectName = (path: string): string | null => {
  const id = decodeCloudProjectId(path);
  if (!id) return null;
  return getCloudProjects().find((p) => p.id === id)?.name ?? null;
};

const getAuth = (): { baseUrl: string | null; token: string | null } => {
  const settings = loadZenStudioSettings();
  const baseUrl = (settings.cloudApiBaseUrl ?? DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  return { baseUrl: baseUrl || null, token: settings.cloudAuthToken ?? null };
};

export const seedCloudProject = async (): Promise<CloudProject | null> => {
  const { baseUrl, token } = getAuth();
  if (!baseUrl || !token) return null;
  const res = await fetch(`${baseUrl}/projects_seed.php`, {
    method: 'POST',
    headers: { 'X-Auth-Token': token },
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null) as { success?: boolean; project?: { id?: number; name?: string } };
  if (!json?.success || !json.project?.id) return null;
  const proj = { id: json.project.id, name: json.project.name ?? 'Projekt' };
  saveCloudProject(proj);
  return proj;
};

export const createCloudProject = async (name: string): Promise<CloudProject | null> => {
  const { baseUrl, token } = getAuth();
  if (!baseUrl || !token) return null;
  const res = await fetch(`${baseUrl}/projects_create.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null) as { success?: boolean; id?: number; name?: string };
  if (!json?.success || !json.id) return null;
  const proj = { id: json.id, name: json.name ?? name };
  saveCloudProject(proj);
  return proj;
};
