/**
 * GitHub Docs Service
 * Pushes local markdown files to a GitHub repository via the Contents API.
 */

import type { GitHubConfig } from './socialMediaService';

export interface DocFile {
  name: string;    // relative path e.g. "workflows/file-converter.md"
  content: string; // raw text content
}

export interface GeneratedTemplate {
  name: string;    // filename e.g. "README.md"
  label: string;   // display label e.g. "README"
  content: string;
}

export interface DocPushResult {
  file: string;
  success: boolean;
  url?: string;
  error?: string;
  skipped?: boolean;
}

export interface DocsPushSummary {
  results: DocPushResult[];
  pushed: number;
  skipped: number;
  failed: number;
}

// ─── Auth header ──────────────────────────────────────────────────────────────
// "Bearer" works for both Classic PATs and Fine-Grained PATs.
// "token" only works for Classic PATs — DO NOT use for FGPAT.

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function buildRepoPath(config: GitHubConfig, fileName: string): string {
  const folder = (config.docsPath ?? '').replace(/\/?$/, '/').replace(/^\//, '');
  return `${folder}${fileName}`;
}

/** Verify repo is accessible and token has write access.
 *  Throws a descriptive error if not. */
async function verifyRepoAccess(owner: string, repo: string, token: string): Promise<void> {
  // 1. Check repo exists and token can read it
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: authHeader(token),
  });

  if (repoRes.status === 401) {
    throw new Error(
      'GitHub Token ungültig oder abgelaufen. Bitte neues Token unter github.com/settings/tokens erstellen.',
    );
  }
  if (repoRes.status === 403) {
    throw new Error(
      'Token hat keine Leseberechtigung für dieses Repository. Benötigt: Contents → Read & Write.',
    );
  }
  if (repoRes.status === 404) {
    throw new Error(
      `Repository "${owner}/${repo}" nicht gefunden. Bitte Repository-Name und Username prüfen.`,
    );
  }
  if (!repoRes.ok) {
    throw new Error(`GitHub API Fehler: HTTP ${repoRes.status}`);
  }

  // 2. Quick write-permission test: try to get repo permissions from API response
  const repoData = await repoRes.json() as { permissions?: { push?: boolean }; private?: boolean };
  if (repoData.permissions && repoData.permissions.push === false) {
    throw new Error(
      'Token hat keine Schreibberechtigung für dieses Repository. Benötigt: Contents → Read & Write.',
    );
  }
}

/** Get current file SHA (null = file doesn't exist yet).
 *  Throws on auth/permission errors — only returns null for genuine 404. */
async function getFileSha(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token: string,
): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`,
    { headers: authHeader(token) },
  );

  if (res.status === 404) return null; // File doesn't exist yet — will be created
  if (res.status === 401) throw new Error('Token ungültig (401)');
  if (res.status === 403) throw new Error('Keine Schreibberechtigung (403) — Contents: Read & Write benötigt');
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(`SHA-Abfrage fehlgeschlagen: ${body.message ?? `HTTP ${res.status}`}`);
  }

  const data = await res.json() as { sha: string };
  return data.sha;
}

/** Push a single file — creates or updates */
async function pushFile(
  config: GitHubConfig,
  repo: string,
  branch: string,
  repoPath: string,
  content: string,
  sha: string | null,
  commitMessage: string,
): Promise<{ url: string }> {
  const body: Record<string, unknown> = {
    message: commitMessage,
    content: toBase64(content),
    branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(
    `https://api.github.com/repos/${config.username}/${repo}/contents/${encodeURI(repoPath)}`,
    {
      method: 'PUT',
      headers: {
        ...authHeader(config.accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    const msg = err.message ?? `HTTP ${res.status}`;

    if (res.status === 401) throw new Error(`Token ungültig oder abgelaufen (401)`);
    if (res.status === 403) throw new Error(`Keine Schreibberechtigung — Contents: Read & Write benötigt (403)`);
    if (res.status === 404) throw new Error(`Pfad nicht gefunden: ${repoPath} — Username/Repo prüfen (404)`);
    if (res.status === 422) throw new Error(`Validierungsfehler: ${msg} (422)`);
    throw new Error(`${msg} (${res.status})`);
  }

  const data = await res.json() as { content: { html_url: string } };
  return { url: data.content.html_url };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function pushDocsToGitHub(
  files: DocFile[],
  config: GitHubConfig,
  onProgress?: (current: number, total: number, fileName: string) => void,
): Promise<DocsPushSummary> {
  const repo = config.docsRepo?.trim();
  const branch = config.docsBranch?.trim() || 'main';

  if (!repo) throw new Error('Kein Docs-Repository konfiguriert (Einstellungen → Social Media → GitHub)');
  if (!config.accessToken) throw new Error('GitHub Access Token fehlt');
  if (!config.username) throw new Error('GitHub Username fehlt');

  // Pre-flight: verify repo access before pushing any file
  await verifyRepoAccess(config.username, repo, config.accessToken);

  const results: DocPushResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, files.length, file.name);

    const repoPath = buildRepoPath(config, file.name);

    try {
      const sha = await getFileSha(config.username, repo, repoPath, branch, config.accessToken);
      const { url } = await pushFile(
        config,
        repo,
        branch,
        repoPath,
        file.content,
        sha,
        sha ? `docs: update ${file.name}` : `docs: add ${file.name}`,
      );
      results.push({ file: file.name, success: true, url });
    } catch (err) {
      results.push({
        file: file.name,
        success: false,
        error: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
    }
  }

  return {
    results,
    pushed: results.filter((r) => r.success).length,
    skipped: results.filter((r) => r.skipped).length,
    failed: results.filter((r) => !r.success && !r.skipped).length,
  };
}
