export type ImageMeta = {
  title: string;
  altText: string;
  caption: string;
  tags: string[];
  updatedAt: number;
};

type ImageMetaPatch = Partial<Omit<ImageMeta, 'updatedAt'>> & { updatedAt?: number };

const STORAGE_KEY = 'zenpost_image_meta_v1';
const MAX_URL_KEY_LENGTH = 420;

const EMPTY_META: Omit<ImageMeta, 'updatedAt'> = {
  title: '',
  altText: '',
  caption: '',
  tags: [],
};

type LoadParams = {
  cloudDocId?: number | null;
  projectId?: number | null;
  url?: string | null;
  fileName?: string | null;
};

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const normalizeTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map((entry) => normalizeWhitespace(String(entry ?? '')))
    .filter(Boolean)
    .map((entry) => entry.toLowerCase());
  return Array.from(new Set(normalized));
};

const normalizeMeta = (meta?: Partial<ImageMeta> | null): ImageMeta => ({
  title: normalizeWhitespace(String(meta?.title ?? '')),
  altText: normalizeWhitespace(String(meta?.altText ?? '')),
  caption: normalizeWhitespace(String(meta?.caption ?? '')),
  tags: normalizeTags(meta?.tags),
  updatedAt: typeof meta?.updatedAt === 'number' && Number.isFinite(meta.updatedAt) ? meta.updatedAt : Date.now(),
});

const safeJsonParse = (raw: string | null): Record<string, ImageMeta> => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, Partial<ImageMeta>>;
    if (!parsed || typeof parsed !== 'object') return {};
    const entries = Object.entries(parsed);
    const normalized: Record<string, ImageMeta> = {};
    for (const [key, value] of entries) {
      if (!key || typeof key !== 'string') continue;
      normalized[key] = normalizeMeta(value);
    }
    return normalized;
  } catch {
    return {};
  }
};

const loadStore = (): Record<string, ImageMeta> => {
  if (typeof window === 'undefined') return {};
  return safeJsonParse(window.localStorage.getItem(STORAGE_KEY));
};

const saveStore = (store: Record<string, ImageMeta>): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

const toSlug = (value: string): string =>
  normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeUrl = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^blob:/i.test(trimmed) || /^data:/i.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    url.hash = '';
    return url.toString();
  } catch {
    return trimmed;
  }
};

const createCloudKey = (docId: number, projectId?: number | null) =>
  `cloud:${projectId && projectId > 0 ? projectId : 0}:${docId}`;

const createUrlKey = (url: string) => {
  const normalized = normalizeUrl(url);
  if (!normalized) return '';
  const reduced = normalized.length > MAX_URL_KEY_LENGTH ? normalized.slice(0, MAX_URL_KEY_LENGTH) : normalized;
  return `url:${reduced}`;
};

const createFileKey = (fileName: string) => {
  const slug = toSlug(fileName.replace(/\.[^.]+$/, ''));
  return slug ? `file:${slug}` : '';
};

const buildCandidateKeys = (params: LoadParams): string[] => {
  const keys: string[] = [];
  if (typeof params.cloudDocId === 'number' && params.cloudDocId > 0) {
    keys.push(createCloudKey(params.cloudDocId, params.projectId));
  }
  if (params.url) {
    const byUrl = createUrlKey(params.url);
    if (byUrl) keys.push(byUrl);
  }
  if (params.fileName) {
    const byFile = createFileKey(params.fileName);
    if (byFile) keys.push(byFile);
  }
  return Array.from(new Set(keys));
};

const choosePrimaryKey = (params: LoadParams): string | null => {
  const keys = buildCandidateKeys(params);
  if (keys.length === 0) return null;
  const cloudKey = keys.find((key) => key.startsWith('cloud:'));
  return cloudKey ?? keys[0];
};

export function loadImageMeta(params: LoadParams): ImageMeta | null {
  const keys = buildCandidateKeys(params);
  if (keys.length === 0) return null;
  const store = loadStore();
  for (const key of keys) {
    const hit = store[key];
    if (hit) return normalizeMeta(hit);
  }
  return null;
}

export function saveImageMeta(params: LoadParams, patch: ImageMetaPatch): ImageMeta {
  const primaryKey = choosePrimaryKey(params);
  if (!primaryKey) {
    return normalizeMeta(patch);
  }
  const store = loadStore();
  const current = store[primaryKey] ?? normalizeMeta(undefined);
  const next = normalizeMeta({ ...current, ...patch, updatedAt: Date.now() });
  const keys = buildCandidateKeys(params);
  for (const key of keys) {
    store[key] = next;
  }
  saveStore(store);
  return next;
}

export function buildInitialImageMeta(fileName?: string | null): Pick<ImageMeta, 'title' | 'altText' | 'caption' | 'tags'> {
  const stem = normalizeWhitespace(String(fileName ?? '').replace(/\.[^.]+$/, ''));
  if (!stem) return { ...EMPTY_META };
  return {
    title: stem,
    altText: stem,
    caption: '',
    tags: [],
  };
}

export function resolveImageMeta(
  params: LoadParams,
): Pick<ImageMeta, 'title' | 'altText' | 'caption' | 'tags'> {
  const existing = loadImageMeta(params);
  if (existing) {
    return {
      title: existing.title,
      altText: existing.altText,
      caption: existing.caption,
      tags: existing.tags,
    };
  }
  return buildInitialImageMeta(params.fileName);
}
