// Central service for Doc Studio per-project configuration management

const KEYS = {
  server: (p: string) => `zenpost_docs_server:${p}`,
  syncTs: (p: string) => `zenpost_docs_last_sync:${p}`,
  github: (p: string) => `zenpost_docs_github:${p}`,
  docsSite: (p: string) => `zenpost_docs_site:${p}`,
};

export interface DocStudioProjectSummary {
  projectPath: string;
  projectName: string;
  hasServer: boolean;
  hasGitHub: boolean;
  hasDocsSite: boolean;
  lastSync: Date | null;
}

function shortName(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path;
}

export function listDocStudioProjects(): DocStudioProjectSummary[] {
  const paths = new Set<string>();
  const prefixes = ['zenpost_docs_server:', 'zenpost_docs_last_sync:', 'zenpost_docs_github:', 'zenpost_docs_site:'];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) ?? '';
    for (const prefix of prefixes) {
      if (key.startsWith(prefix)) {
        paths.add(key.slice(prefix.length));
        break;
      }
    }
  }
  return Array.from(paths).map((p) => {
    const tsRaw = localStorage.getItem(KEYS.syncTs(p));
    return {
      projectPath: p,
      projectName: shortName(p),
      hasServer: !!localStorage.getItem(KEYS.server(p)),
      hasGitHub: !!localStorage.getItem(KEYS.github(p)),
      hasDocsSite: !!localStorage.getItem(KEYS.docsSite(p)),
      lastSync: tsRaw ? new Date(tsRaw) : null,
    };
  });
}

export function clearServerConfig(projectPath: string) {
  localStorage.removeItem(KEYS.server(projectPath));
  localStorage.removeItem(KEYS.syncTs(projectPath));
}

export function clearGitHubConfig(projectPath: string) {
  localStorage.removeItem(KEYS.github(projectPath));
}

export function clearDocsSiteConfig(projectPath: string) {
  localStorage.removeItem(KEYS.docsSite(projectPath));
}

export function clearAllDocStudioConfigs(projectPath: string) {
  clearServerConfig(projectPath);
  clearGitHubConfig(projectPath);
  clearDocsSiteConfig(projectPath);
}
