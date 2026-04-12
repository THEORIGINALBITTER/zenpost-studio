import {
  downloadCloudDocumentText,
  listCloudDocuments,
  updateCloudDocument,
  uploadCloudDocument,
  type CloudDocumentInfo,
} from './cloudStorageService';
import { loadZenStudioSettings } from './zenStudioSettingsService';

export const CLOUD_SYNC_PROBE_FILE = '__zenpost_cloud_sync_probe__.json';
export const CLOUD_SYNC_PROBE_MIME = 'application/vnd.zenpost.cloud-sync-probe+json';

export type CloudSyncProbe = {
  version: 1;
  updatedAt: string;
  writtenBy: 'web' | 'desktop' | 'unknown';
  projectId: number | null;
  projectName: string | null;
  note: string;
  payload: Record<string, unknown>;
};

export type CloudSyncProbeLoadResult = {
  docId: number | null;
  probe: CloudSyncProbe | null;
};

function getActiveCloudProject(): { projectId: number | null; projectName: string | null } {
  const settings = loadZenStudioSettings();
  return {
    projectId: settings.cloudProjectId ?? null,
    projectName: settings.cloudProjectName ?? null,
  };
}

function normalizeProbe(input?: Partial<CloudSyncProbe>): CloudSyncProbe {
  const { projectId, projectName } = getActiveCloudProject();
  return {
    version: 1,
    updatedAt: input?.updatedAt ?? new Date().toISOString(),
    writtenBy: input?.writtenBy ?? 'unknown',
    projectId: input?.projectId ?? projectId,
    projectName: input?.projectName ?? projectName,
    note: typeof input?.note === 'string' ? input.note : '',
    payload: input?.payload && typeof input.payload === 'object' ? input.payload : {},
  };
}

export function createCloudSyncProbe(input?: Partial<CloudSyncProbe>): CloudSyncProbe {
  return normalizeProbe(input);
}

export function findCloudSyncProbeDocument(docs: CloudDocumentInfo[]): CloudDocumentInfo | null {
  return docs.find((doc) => doc.fileName === CLOUD_SYNC_PROBE_FILE) ?? null;
}

export async function loadCloudSyncProbeFromDocs(docs: CloudDocumentInfo[]): Promise<CloudSyncProbeLoadResult> {
  const probeDoc = findCloudSyncProbeDocument(docs);
  if (!probeDoc) return { docId: null, probe: null };

  const raw = await downloadCloudDocumentText(probeDoc.id);
  if (!raw) return { docId: probeDoc.id, probe: null };

  try {
    const parsed = JSON.parse(raw) as Partial<CloudSyncProbe>;
    return {
      docId: probeDoc.id,
      probe: normalizeProbe(parsed),
    };
  } catch {
    return { docId: probeDoc.id, probe: null };
  }
}

export async function loadCloudSyncProbe(projectId?: number | null): Promise<CloudSyncProbeLoadResult> {
  const effectiveProjectId = projectId ?? getActiveCloudProject().projectId;
  if (!effectiveProjectId) return { docId: null, probe: null };

  const docs = await listCloudDocuments(effectiveProjectId);
  if (!docs) return { docId: null, probe: null };
  return loadCloudSyncProbeFromDocs(docs);
}

export async function saveCloudSyncProbe(
  probe: Partial<CloudSyncProbe>,
  existingDocId?: number | null,
): Promise<number | null> {
  const normalized = normalizeProbe(probe);
  const payload = JSON.stringify(normalized, null, 2);
  const file = new File([payload], CLOUD_SYNC_PROBE_FILE, { type: CLOUD_SYNC_PROBE_MIME });

  if (existingDocId) {
    const ok = await updateCloudDocument(existingDocId, file);
    return ok ? existingDocId : null;
  }

  const uploaded = await uploadCloudDocument(file);
  return uploaded?.id ?? null;
}

export async function writeCloudSyncProbe(
  input: {
    writtenBy: CloudSyncProbe['writtenBy'];
    note?: string;
    payload?: Record<string, unknown>;
  },
  options?: { existingDocId?: number | null; projectId?: number | null },
): Promise<CloudSyncProbeLoadResult> {
  const existing =
    typeof options?.existingDocId === 'number'
      ? { docId: options.existingDocId, probe: null as CloudSyncProbe | null }
      : await loadCloudSyncProbe(options?.projectId);

  const nextProbe = normalizeProbe({
    ...existing.probe,
    writtenBy: input.writtenBy,
    note: input.note ?? '',
    payload: input.payload ?? {},
    updatedAt: new Date().toISOString(),
  });

  const docId = await saveCloudSyncProbe(nextProbe, existing.docId);
  return {
    docId,
    probe: docId ? nextProbe : null,
  };
}
