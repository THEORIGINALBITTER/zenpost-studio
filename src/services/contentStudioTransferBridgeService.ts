import { getCloudProjects } from './cloudProjectService';
import {
  loadZenStudioSettings,
} from './zenStudioSettingsService';
import type {
  ContentStudioTransferContext,
  ContentStudioTransferExecutionTarget,
  ContentStudioTransferItem,
} from './contentStudioTransferService';
import { isTransferItemImage, isTransferToServerAvailable, supportsCloudTransfer } from './contentStudioTransferService';

const uniqueByKey = <T extends { key: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.key)) return false;
    seen.add(item.key);
    return true;
  });
};

const resolveBlogPostsDirectory = (blogPath: string): string => {
  const normalizedPath = blogPath.trim().replace(/[\\/]+$/, '');
  if (!normalizedPath) return normalizedPath;
  return /[\\/]posts$/i.test(normalizedPath) ? normalizedPath : `${normalizedPath}/posts`;
};

const getPathTail = (path: string, depth = 2): string => {
  const normalizedPath = path.trim().replace(/[\\/]+$/, '');
  if (!normalizedPath) return '';
  const parts = normalizedPath.split(/[\\/]/).filter(Boolean);
  return parts.slice(-depth).join('/');
};

const getResolvedCloudProjects = (): Array<{ id: number; name: string }> => {
  const settings = loadZenStudioSettings();
  const projects = getCloudProjects()
    .filter((project) => typeof project.id === 'number' && project.id > 0)
    .map((project) => ({
      id: project.id,
      name: project.name?.trim() || `Projekt ${project.id}`,
    }));

  if (settings.cloudProjectId) {
    projects.unshift({
      id: settings.cloudProjectId,
      name: settings.cloudProjectName?.trim() || `Projekt ${settings.cloudProjectId}`,
    });
  }

  return uniqueByKey(projects.map((project) => ({
    key: `cloud-project:${project.id}`,
    ...project,
  }))).map(({ id, name }) => ({ id, name }));
};

const getConfiguredServerTargets = (): ContentStudioTransferExecutionTarget[] => {
  const settings = loadZenStudioSettings();

  const servers = (settings.servers ?? [])
    .map((server, index) => ({ server, index }))
    .flatMap(({ server, index }) => {
      const targets: ContentStudioTransferExecutionTarget[] = [];
      if (server.contentServerLocalCachePath?.trim()) {
        const cachePath = server.contentServerLocalCachePath.trim();
        targets.push({
          key: `server-local:${index}`,
          target: 'local',
          label: `In ${server.name} lokal speichern`,
          description: `Als Markdown im Server-Cache ablegen · ${getPathTail(cachePath)}`,
          localDirectoryPath: cachePath,
        });
      }
      if (server.contentServerApiUrl?.trim()) {
        targets.push({
          key: `server-online:${index}`,
          target: 'server',
          label: `An ${server.name} online senden`,
          description: 'Als Artikel direkt über die Server API übertragen.',
          serverName: server.name,
          serverConfig: server,
          transferMode: 'server-api',
        });
      }
      return targets;
    });

  const blogs = (settings.blogs ?? [])
    .flatMap((blog) => {
      const targets: ContentStudioTransferExecutionTarget[] = [];
      if (blog.path?.trim()) {
        const postsDirectoryPath = resolveBlogPostsDirectory(blog.path);
        targets.push({
          key: `blog-local:${blog.id}`,
          target: 'local',
          label: `In ${blog.name} lokal speichern`,
          description: `Als Markdown direkt im posts-Ordner ablegen · ${getPathTail(postsDirectoryPath)}`,
          localDirectoryPath: postsDirectoryPath,
        });
      }
      if (blog.phpApiUrl?.trim()) {
        targets.push({
          key: `blog-online:${blog.id}`,
          target: 'server',
          label: `In ${blog.name} online hochladen`,
          description: 'Über zenpost-upload.php direkt ins Blog senden.',
          serverName: blog.name,
          blogConfig: blog,
          transferMode: 'blog-php',
        });
      }
      return targets;
    });

  return [...servers, ...blogs];
};

export const listResolvedContentStudioTransferTargets = (
  item: ContentStudioTransferItem,
  context: ContentStudioTransferContext = {},
): ContentStudioTransferExecutionTarget[] => {
  const localDirectoryReady = !!context.localDirectoryPath?.trim();
  const imageFile = isTransferItemImage(item.fileName);
  const targets: ContentStudioTransferExecutionTarget[] = [];
  const settings = loadZenStudioSettings();
  const sourceCloudProjectId = settings.cloudProjectId ?? null;

  if (item.source !== 'local' && localDirectoryReady) {
    const localDirectoryPath = context.localDirectoryPath!.trim();
    targets.push({
      key: 'local:current',
      target: 'local',
      label: 'Im aktuellen Projekt lokal speichern',
      description: `Als Markdown im aktuellen Projektordner ablegen · ${getPathTail(localDirectoryPath)}`,
      localDirectoryPath,
    });
  }

  if (supportsCloudTransfer()) {
    for (const project of getResolvedCloudProjects()) {
      if (!(item.source === 'cloud' && sourceCloudProjectId === project.id)) {
        targets.push({
          key: `cloud:${project.id}`,
          target: 'cloud',
          label: `In ${project.name} verschieben`,
          description: 'Als Cloud-Dokument in dieses ZenCloud-Projekt speichern.',
          cloudProjectId: project.id,
          cloudProjectName: project.name,
        });
      }

      if (!imageFile && !(item.source === 'zennote' && sourceCloudProjectId === project.id)) {
        targets.push({
          key: `zennote:${project.id}`,
          target: 'zennote',
          label: `Als ZenNote in ${project.name}`,
          description: 'Als ZenNote-Dokument in dieses ZenCloud-Projekt speichern.',
          cloudProjectId: project.id,
          cloudProjectName: project.name,
        });
      }
    }
  }

  if (isTransferToServerAvailable()) {
    targets.push(...getConfiguredServerTargets());
  }

  return targets;
};
