import {
  createZenNoteCloudMeta,
  isSameZenNoteCloudMeta,
  loadZenNoteCloudMeta,
  saveZenNoteCloudMeta,
  type ZenNoteCloudMeta,
} from './zenNoteCloudMetaService';

const CUSTOM_TAGS_KEY = 'zenpost_zennote_custom_tags';
const TAG_COLORS_KEY = 'zenpost_zennote_tag_colors';
const FOLDER_COLORS_KEY = 'zenpost_zennote_folder_colors';

export type ZenNoteMetaState = {
  customTags: string[];
  tagColors: Record<string, string>;
  folderColors: Record<string, string>;
};

export type ZenNoteMetaSyncPayload = {
  docId: number | null;
  meta: ZenNoteCloudMeta;
};

function normalizeCustomTags(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function normalizeColorMap(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key.trim(), value.trim()])
      .filter(([key, value]) => key && value),
  );
}

export function loadLocalZenNoteMeta(): ZenNoteMetaState {
  let customTags: string[] = [];
  let tagColors: Record<string, string> = {};
  let folderColors: Record<string, string> = {};

  try {
    const raw = localStorage.getItem(CUSTOM_TAGS_KEY);
    if (raw) customTags = JSON.parse(raw) as string[];
  } catch { /* ignore */ }

  try {
    const raw = localStorage.getItem(TAG_COLORS_KEY);
    if (raw) tagColors = JSON.parse(raw) as Record<string, string>;
  } catch { /* ignore */ }

  try {
    const raw = localStorage.getItem(FOLDER_COLORS_KEY);
    if (raw) folderColors = JSON.parse(raw) as Record<string, string>;
  } catch { /* ignore */ }

  return {
    customTags: normalizeCustomTags(customTags),
    tagColors: normalizeColorMap(tagColors),
    folderColors: normalizeColorMap(folderColors),
  };
}

export function saveLocalZenNoteMeta(meta: ZenNoteMetaState): void {
  localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(normalizeCustomTags(meta.customTags)));
  localStorage.setItem(TAG_COLORS_KEY, JSON.stringify(normalizeColorMap(meta.tagColors)));
  localStorage.setItem(FOLDER_COLORS_KEY, JSON.stringify(normalizeColorMap(meta.folderColors)));
}

export function toZenNoteMetaState(meta: ZenNoteCloudMeta): ZenNoteMetaState {
  return {
    customTags: normalizeCustomTags(meta.customTags),
    tagColors: normalizeColorMap(meta.tagColors),
    folderColors: normalizeColorMap(meta.folderColors),
  };
}

export async function loadMergedZenNoteMeta(projectId: number): Promise<{ docId: number | null; meta: ZenNoteCloudMeta }> {
  const localMeta = createZenNoteCloudMeta(loadLocalZenNoteMeta());
  const { docId, meta: cloudMeta } = await loadZenNoteCloudMeta(projectId);
  const mergedMeta = createZenNoteCloudMeta({
    customTags: [...(cloudMeta?.customTags ?? []), ...localMeta.customTags],
    tagColors: { ...(cloudMeta?.tagColors ?? {}), ...localMeta.tagColors },
    folderColors: { ...(cloudMeta?.folderColors ?? {}), ...localMeta.folderColors },
  });

  saveLocalZenNoteMeta(toZenNoteMetaState(mergedMeta));

  if (!isSameZenNoteCloudMeta(cloudMeta, mergedMeta)) {
    const nextDocId = await saveZenNoteCloudMeta(mergedMeta, docId);
    return { docId: nextDocId, meta: mergedMeta };
  }

  return { docId, meta: mergedMeta };
}

export async function persistZenNoteMeta(
  meta: ZenNoteMetaState,
  existingDocId: number | null,
): Promise<number | null> {
  saveLocalZenNoteMeta(meta);
  const nextDocId = await saveZenNoteCloudMeta(createZenNoteCloudMeta(meta), existingDocId);
  return nextDocId;
}

export function subscribeToZenNoteMetaSync(
  projectId: number,
  listener: (payload: ZenNoteMetaSyncPayload) => void,
  options?: { intervalMs?: number },
): () => void {
  const intervalMs = options?.intervalMs ?? 15000;
  let lastSignature = '';
  let active = true;

  const poll = async () => {
    if (!active) return;
    const { docId, meta } = await loadZenNoteCloudMeta(projectId);
    if (!meta) return;
    const signature = JSON.stringify({
      customTags: meta.customTags,
      tagColors: meta.tagColors,
      folderColors: meta.folderColors,
    });
    if (signature === lastSignature) return;
    lastSignature = signature;
    saveLocalZenNoteMeta(toZenNoteMetaState(meta));
    listener({ docId, meta });
  };

  void poll();
  const intervalId = window.setInterval(() => { void poll(); }, intervalMs);
  const onFocus = () => { void poll(); };
  const onVisibility = () => {
    if (document.visibilityState === 'visible') void poll();
  };
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    active = false;
    window.clearInterval(intervalId);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
