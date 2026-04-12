import {
  downloadCloudDocumentText,
  listCloudDocuments,
  updateCloudDocument,
  uploadCloudDocument,
  type CloudDocumentInfo,
} from './cloudStorageService';

export const ZEN_NOTE_CLOUD_META_FILE = '__zen_note_meta__.json';
export const ZEN_NOTE_CLOUD_META_MIME = 'application/vnd.zenpost.zennote-meta+json';

export type ZenNoteCloudMeta = {
  version: 1;
  updatedAt: string;
  customTags: string[];
  tagColors: Record<string, string>;
  folderColors: Record<string, string>;
};

export type ZenNoteCloudMetaLoadResult = {
  docId: number | null;
  meta: ZenNoteCloudMeta | null;
};

function normalizeStringArray(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function normalizeColorMap(input: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [key.trim(), value.trim()])
      .filter(([key, value]) => key && value),
  );
}

export function createZenNoteCloudMeta(input?: Partial<ZenNoteCloudMeta>): ZenNoteCloudMeta {
  return {
    version: 1,
    updatedAt: input?.updatedAt ?? new Date().toISOString(),
    customTags: normalizeStringArray(input?.customTags ?? []),
    tagColors: normalizeColorMap(input?.tagColors ?? {}),
    folderColors: normalizeColorMap(input?.folderColors ?? {}),
  };
}

export function findZenNoteCloudMetaDocument(docs: CloudDocumentInfo[]): CloudDocumentInfo | null {
  return docs.find((doc) => doc.fileName === ZEN_NOTE_CLOUD_META_FILE) ?? null;
}

export async function loadZenNoteCloudMetaFromDocs(docs: CloudDocumentInfo[]): Promise<ZenNoteCloudMetaLoadResult> {
  const metaDoc = findZenNoteCloudMetaDocument(docs);
  if (!metaDoc) return { docId: null, meta: null };

  const raw = await downloadCloudDocumentText(metaDoc.id);
  if (!raw) return { docId: metaDoc.id, meta: null };

  try {
    const parsed = JSON.parse(raw) as Partial<ZenNoteCloudMeta>;
    return {
      docId: metaDoc.id,
      meta: createZenNoteCloudMeta(parsed),
    };
  } catch {
    return { docId: metaDoc.id, meta: null };
  }
}

export async function loadZenNoteCloudMeta(projectId: number): Promise<ZenNoteCloudMetaLoadResult> {
  const docs = await listCloudDocuments(projectId);
  if (!docs) return { docId: null, meta: null };
  return loadZenNoteCloudMetaFromDocs(docs);
}

export function mergeZenNoteCloudMeta(
  cloudMeta: ZenNoteCloudMeta | null,
  localMeta: Partial<ZenNoteCloudMeta>,
): ZenNoteCloudMeta {
  const localNormalized = createZenNoteCloudMeta(localMeta);
  if (!cloudMeta) return localNormalized;

  return createZenNoteCloudMeta({
    updatedAt: new Date().toISOString(),
    customTags: [...cloudMeta.customTags, ...localNormalized.customTags],
    tagColors: { ...cloudMeta.tagColors, ...localNormalized.tagColors },
    folderColors: { ...cloudMeta.folderColors, ...localNormalized.folderColors },
  });
}

export function isSameZenNoteCloudMeta(a: ZenNoteCloudMeta | null, b: ZenNoteCloudMeta | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return JSON.stringify({
    customTags: a.customTags,
    tagColors: a.tagColors,
    folderColors: a.folderColors,
  }) === JSON.stringify({
    customTags: b.customTags,
    tagColors: b.tagColors,
    folderColors: b.folderColors,
  });
}

export async function saveZenNoteCloudMeta(meta: ZenNoteCloudMeta, existingDocId: number | null): Promise<number | null> {
  const payload = JSON.stringify(createZenNoteCloudMeta(meta), null, 2);
  const file = new File([payload], ZEN_NOTE_CLOUD_META_FILE, { type: ZEN_NOTE_CLOUD_META_MIME });

  if (existingDocId) {
    const ok = await updateCloudDocument(existingDocId, file);
    return ok ? existingDocId : null;
  }

  const uploaded = await uploadCloudDocument(file);
  return uploaded?.id ?? null;
}
