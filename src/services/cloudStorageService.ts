import { isTauri, invoke } from '@tauri-apps/api/core';
import { loadZenStudioSettings } from './zenStudioSettingsService';

const DEFAULT_BASE_URL = 'https://denisbitter.de/stage02/api';

export interface CloudUploadResult {
  id: number;
  url: string;
}

export interface CloudDocumentInfo {
  id: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

const getCloudBaseUrl = (): { baseUrl: string | null; token: string | null } => {
  const settings = loadZenStudioSettings();
  const token = settings.cloudAuthToken;
  const baseUrl = (settings.cloudApiBaseUrl ?? DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  return { baseUrl: baseUrl || null, token: token || null };
};

export const canUploadToZenCloud = (): boolean => {
  const settings = loadZenStudioSettings();
  const { baseUrl, token } = getCloudBaseUrl();
  return !!(baseUrl && token && settings.cloudProjectId);
};

// Tauri-aware GET: uses invoke('http_fetch') in desktop (bypasses CORS), browser fetch in web
const cloudGet = async (url: string, token: string): Promise<{ ok: boolean; text: string }> => {
  if (isTauri()) {
    try {
      const res = await invoke<{ status: number; body: string }>('http_fetch', {
        request: { url, method: 'GET', headers: { 'X-Auth-Token': token }, body: null },
      });
      return { ok: res.status >= 200 && res.status < 300, text: res.body };
    } catch {
      return { ok: false, text: '' };
    }
  }
  try {
    const res = await fetch(url, { headers: { 'X-Auth-Token': token } });
    const text = await res.text().catch(() => '');
    return { ok: res.ok, text };
  } catch {
    return { ok: false, text: '' };
  }
};

export const uploadCloudDocument = async (file: File): Promise<CloudUploadResult | null> => {
  const settings = loadZenStudioSettings();
  const projectId = settings.cloudProjectId;
  const { baseUrl, token } = getCloudBaseUrl();
  if (!baseUrl || !token || !projectId) return null;

  const form = new FormData();
  form.append('projectId', String(projectId));
  form.append('file', file);

  // FormData/multipart only works with browser fetch — Tauri's http_fetch handles string bodies only.
  // CSP is null in tauri.conf.json so browser fetch can reach external URLs from the WebView.
  const res = await fetch(`${baseUrl}/documents_upload.php`, {
    method: 'POST',
    headers: { 'X-Auth-Token': token },
    body: form,
  });

  if (!res.ok) return null;
  const json = await res.json().catch(() => null) as { success?: boolean; id?: number };
  if (!json || !json.success || !json.id) return null;

  // image_download.php akzeptiert Token als URL-Parameter → <img src> kann es direkt laden
  return { id: json.id, url: `${baseUrl}/image_download.php?id=${json.id}&token=${encodeURIComponent(token)}` };
};

export const uploadCloudImageDataUrl = async (
  dataUrl: string,
  fileName = 'image.jpg',
): Promise<CloudUploadResult | null> => {
  if (!/^data:image\//i.test(dataUrl)) return null;
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
    return await uploadCloudDocument(file);
  } catch {
    return null;
  }
};

export const updateCloudDocument = async (id: number, file: File): Promise<boolean> => {
  const { baseUrl, token } = getCloudBaseUrl();
  if (!baseUrl || !token) return false;

  const form = new FormData();
  form.append('id', String(id));
  form.append('file', file);

  const res = await fetch(`${baseUrl}/documents_update.php`, {
    method: 'POST',
    headers: { 'X-Auth-Token': token },
    body: form,
  });

  if (!res.ok) return false;
  const json = await res.json().catch(() => null) as { success?: boolean };
  return !!(json?.success);
};

export const listCloudDocuments = async (projectId: number): Promise<CloudDocumentInfo[] | null> => {
  const { baseUrl, token } = getCloudBaseUrl();
  if (!baseUrl || !token || !projectId) return null;

  const { ok, text } = await cloudGet(`${baseUrl}/documents_list.php?projectId=${projectId}`, token);
  if (!ok) return null;

  const json = JSON.parse(text || '{}') as { success?: boolean; documents?: Array<{ id: number; file_name: string; mime_type: string; size_bytes: number; created_at: string }> };
  if (!json || !json.success || !Array.isArray(json.documents)) return null;
  return json.documents.map((d) => ({
    id: d.id,
    fileName: d.file_name,
    mimeType: d.mime_type,
    sizeBytes: d.size_bytes,
    createdAt: d.created_at,
  }));
};

export const deleteCloudDocument = async (docId: number): Promise<boolean> => {
  const { baseUrl, token } = getCloudBaseUrl();
  if (!baseUrl || !token || !docId) return false;

  try {
    if (isTauri()) {
      const res = await invoke<{ status: number; body: string }>('http_fetch', {
        request: {
          url: `${baseUrl}/documents_delete.php`,
          method: 'POST',
          headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: docId }),
        },
      });
      return res.status >= 200 && res.status < 300;
    }
    const res = await fetch(`${baseUrl}/documents_delete.php`, {
      method: 'POST',
      headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: docId }),
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const downloadCloudDocumentText = async (docId: number): Promise<string | null> => {
  const { baseUrl, token } = getCloudBaseUrl();
  if (!baseUrl || !token || !docId) return null;

  const { ok, text } = await cloudGet(`${baseUrl}/documents_download.php?id=${docId}`, token);
  if (!ok) return null;
  // Accept all content — cloud docs are always user-uploaded text/markdown files
  return text || null;
};
