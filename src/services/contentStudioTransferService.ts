import { isTauri } from '@tauri-apps/api/core';
import { exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import {
  canUploadToZenCloud,
  canUploadToZenCloudProject,
  deleteCloudDocument,
  downloadCloudDocumentText,
  uploadCloudDocument,
  uploadCloudDocumentToProject,
} from './cloudStorageService';
import {
  loadZenStudioSettings,
  type BlogConfig,
  type ServerConfig,
} from './zenStudioSettingsService';
import { phpBlogUpload } from './phpBlogService';

export type ContentStudioTransferSource = 'local' | 'web' | 'cloud' | 'zennote' | 'server';
export type ContentStudioTransferTarget = 'local' | 'cloud' | 'zennote' | 'server';

export type ContentStudioTransferItem =
  | {
      source: 'local';
      fileName: string;
      path: string;
    }
  | {
      source: 'web';
      fileName: string;
      content: string;
    }
  | {
      source: 'cloud' | 'zennote';
      fileName: string;
      docId: number;
    }
  | {
      source: 'server';
      fileName: string;
      content?: string | null;
      slug: string;
    };

export type ContentStudioTransferContext = {
  localDirectoryPath?: string | null;
  deleteSourceAfterTransfer?: boolean;
};

export type ContentStudioTransferPreview = {
  target: ContentStudioTransferTarget;
  label: string;
  description: string;
};

export type ContentStudioTransferExecutionTarget =
  | {
      key: string;
      target: 'local';
      label: string;
      description: string;
      localDirectoryPath?: string;
    }
  | {
      key: string;
      target: 'cloud' | 'zennote';
      label: string;
      description: string;
      cloudProjectId: number;
      cloudProjectName?: string;
    }
  | {
      key: string;
      target: 'server';
      label: string;
      description: string;
      serverName?: string;
      serverConfig?: ServerConfig;
      blogConfig?: BlogConfig;
      transferMode?: 'server-api' | 'blog-php';
    };

export type ContentStudioTransferResult =
  | {
      success: true;
      target: ContentStudioTransferTarget;
      fileName: string;
      localPath?: string;
      cloudDocId?: number;
      cloudUrl?: string;
      deletedSource?: boolean;
    }
  | {
      success: false;
      target: ContentStudioTransferTarget;
      error: string;
    };

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'avif', 'bmp']);

export const isTransferItemImage = (fileName: string): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.has(extension);
};

const ensureMarkdownFileName = (fileName: string, mode: 'cloud' | 'zennote'): string => {
  const trimmed = fileName.trim() || 'untitled';
  const withoutZenNote = trimmed.replace(/\.zennote$/i, '');
  const withoutMarkdown = withoutZenNote.replace(/\.md$/i, '');
  return mode === 'zennote' ? `${withoutMarkdown}.zennote` : `${withoutMarkdown}.md`;
};

const resolveLocalTargetPath = (directoryPath: string, fileName: string): string =>
  `${directoryPath.replace(/\/+$/, '')}/${fileName}`;

const requireDesktopLocalTarget = (
  context: ContentStudioTransferContext,
  target?: Extract<ContentStudioTransferExecutionTarget, { target: 'local' }>,
): string => {
  if (!isTauri()) {
    throw new Error('Lokale Transfers sind nur in der Desktop App verfügbar.');
  }
  const localDirectoryPath = target?.localDirectoryPath?.trim() || context.localDirectoryPath?.trim();
  if (!localDirectoryPath) {
    throw new Error('Kein lokaler Zielordner angegeben.');
  }
  return localDirectoryPath;
};

const sanitizeServerSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\.zennote$/i, '')
    .replace(/\.md$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `entwurf-${Date.now()}`;

const makeServerTitle = (fileName: string): string => {
  const stem = fileName.replace(/\.zennote$/i, '').replace(/\.md$/i, '').trim();
  if (!stem) return 'Entwurf';
  return stem
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const canTransferToServer = (): boolean => {
  const settings = loadZenStudioSettings();
  return !!(settings.contentServerApiUrl?.trim() && settings.contentServerApiEndpoint?.trim());
};

export const isTransferToServerAvailable = (): boolean => {
  const settings = loadZenStudioSettings();
  const hasLegacyServer = !!(settings.contentServerApiUrl?.trim() && settings.contentServerApiEndpoint?.trim());
  const hasNamedServer = (settings.servers ?? []).some((server) => !!server.contentServerApiUrl?.trim());
  const hasBlogPhpApi = (settings.blogs ?? []).some((blog) => !!blog.phpApiUrl?.trim());
  return hasLegacyServer || hasNamedServer || hasBlogPhpApi;
};

export const supportsCloudTransfer = (): boolean => canUploadToZenCloud();

const blocksToMarkdownForTransfer = (blocks: Array<{ type: string; data: Record<string, unknown> }>, title?: string): string => {
  const lines: string[] = [];
  const hasH1 = blocks.some((block) => block.type === 'header' && (typeof block.data.level === 'number' ? block.data.level : 2) === 1);

  if (title && !hasH1) {
    lines.push(`# ${title}`, '');
  }

  for (const block of blocks) {
    switch (block.type) {
      case 'header': {
        const level = typeof block.data.level === 'number' ? block.data.level : 2;
        lines.push(`${'#'.repeat(Math.max(1, Math.min(level, 6)))} ${String(block.data.text ?? '')}`);
        break;
      }
      case 'paragraph': {
        const text = String(block.data.text ?? '').trim();
        if (text) lines.push(text);
        break;
      }
      case 'list': {
        const style = String(block.data.style ?? 'unordered');
        const items = Array.isArray(block.data.items) ? block.data.items : [];
        items.forEach((item, index) => {
          const marker = style === 'ordered' ? `${index + 1}.` : '-';
          lines.push(`${marker} ${String(item ?? '')}`);
        });
        break;
      }
      case 'quote': {
        const text = String(block.data.text ?? '').trim();
        if (text) lines.push(`> ${text}`);
        break;
      }
      case 'code': {
        const code = String(block.data.code ?? '');
        if (code.trim()) lines.push(`\`\`\`\n${code}\n\`\`\``);
        break;
      }
      case 'delimiter': {
        lines.push('***');
        break;
      }
      case 'image': {
        const fileObj = block.data.file as Record<string, unknown> | undefined;
        const url = String(block.data.src ?? fileObj?.url ?? block.data.url ?? '');
        const alt = String(block.data.alt ?? block.data.caption ?? '');
        if (url) lines.push(`![${alt}](${url})`);
        break;
      }
      default: {
        const text = String(block.data.text ?? '').trim();
        if (text) lines.push(text);
      }
    }
    if (lines.length > 0 && lines[lines.length - 1] !== '') {
      lines.push('');
    }
  }

  return lines.join('\n').trim();
};

const fetchServerTransferContent = async (slug: string): Promise<{ content: string; fileName: string }> => {
  const settings = loadZenStudioSettings();
  let base = (settings.contentServerApiUrl ?? '').trim();
  if (!base) {
    throw new Error('Keine Server-API konfiguriert.');
  }
  if (!/^https?:\/\//i.test(base)) {
    base = `https://${base}`;
  }

  const endpoint = (settings.contentServerListEndpoint ?? '/articles.php').trim();
  const listUrl = /^https?:\/\//i.test(endpoint)
    ? endpoint
    : `${base.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;

  const headers: Record<string, string> = {};
  if (settings.contentServerApiKey) {
    headers.Authorization = `Bearer ${settings.contentServerApiKey}`;
  }

  const response = await fetch(`${listUrl}?slug=${encodeURIComponent(slug)}`, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Server-Artikel konnte nicht geladen werden (HTTP ${response.status}).`);
  }

  const data = await response.json() as {
    success?: boolean;
    title?: string;
    markdown?: string;
    blocks?: Array<{ type: string; data: Record<string, unknown> }>;
  };

  if (data.success === false) {
    throw new Error('Server-Artikel konnte nicht geladen werden.');
  }

  const blocks = Array.isArray(data.blocks) ? data.blocks : [];
  const content = data.markdown?.trim()
    ? data.markdown.trim()
    : blocksToMarkdownForTransfer(blocks, data.title);

  if (!content.trim()) {
    throw new Error('Server-Artikel enthält keinen übertragbaren Inhalt.');
  }

  return {
    content,
    fileName: `${slug}.md`,
  };
};

const readTransferItemContent = async (item: ContentStudioTransferItem): Promise<{ content: string; fileName: string }> => {
  if (item.source === 'local') {
    return {
      content: await readTextFile(item.path),
      fileName: item.fileName,
    };
  }

  if (item.source === 'web') {
    return {
      content: item.content,
      fileName: item.fileName,
    };
  }

  if (item.source === 'cloud' || item.source === 'zennote') {
    const content = await downloadCloudDocumentText(item.docId);
    if (!content) throw new Error('Cloud-Dokument konnte nicht geladen werden.');
    return {
      content,
      fileName: item.fileName,
    };
  }

  if (item.source === 'server') {
    if (!item.content?.trim()) {
      return fetchServerTransferContent(item.slug);
    }
    return {
      content: item.content,
      fileName: item.fileName,
    };
  }

  throw new Error('Unbekannte Transferquelle.');
};

const writeLocalTransferFile = async (directoryPath: string, fileName: string, content: string): Promise<string> => {
  if (!(await exists(directoryPath))) {
    await mkdir(directoryPath, { recursive: true });
  }
  const targetPath = resolveLocalTargetPath(directoryPath, fileName);
  await writeTextFile(targetPath, content);
  return targetPath;
};

const uploadTransferFileToCloud = async (
  fileName: string,
  content: string,
  cloudProjectId?: number,
): Promise<{ id: number; url: string; fileName: string }> => {
  if (!canUploadToZenCloudProject(cloudProjectId)) {
    throw new Error('ZenCloud ist nicht bereit für Uploads.');
  }
  const file = new File([content], fileName, { type: 'text/markdown' });
  const uploaded = typeof cloudProjectId === 'number' && cloudProjectId > 0
    ? await uploadCloudDocumentToProject(file, cloudProjectId)
    : await uploadCloudDocument(file);
  if (!uploaded) {
    throw new Error('Upload nach ZenCloud fehlgeschlagen.');
  }
  return {
    id: uploaded.id,
    url: uploaded.url,
    fileName,
  };
};

const resolveServerTransferConfig = (
  target?: Extract<ContentStudioTransferExecutionTarget, { target: 'server' }>,
): { apiBaseUrl: string; apiKey: string | null; endpoint: string; transferMode: 'server-api' | 'blog-php' } => {
  if (target?.blogConfig?.phpApiUrl?.trim()) {
    return {
      apiBaseUrl: target.blogConfig.phpApiUrl.trim(),
      apiKey: target.blogConfig.phpApiKey?.trim() || null,
      endpoint: '',
      transferMode: 'blog-php',
    };
  }

  if (target?.serverConfig?.contentServerApiUrl?.trim()) {
    return {
      apiBaseUrl: target.serverConfig.contentServerApiUrl.trim(),
      apiKey: target.serverConfig.contentServerApiKey?.trim() || null,
      endpoint: target.serverConfig.contentServerApiEndpoint.trim() || '/save_articles.php',
      transferMode: 'server-api',
    };
  }

  const settings = loadZenStudioSettings();
  let apiBaseUrl = (settings.contentServerApiUrl ?? '').trim();
  if (!apiBaseUrl) {
    const activeServer = settings.servers?.[settings.activeServerIndex ?? 0];
    apiBaseUrl = activeServer?.contentServerApiUrl?.trim() ?? '';
    if (apiBaseUrl) {
      return {
        apiBaseUrl,
        apiKey: activeServer?.contentServerApiKey?.trim() || null,
        endpoint: activeServer?.contentServerApiEndpoint?.trim() || '/save_articles.php',
        transferMode: 'server-api',
      };
    }
    throw new Error('Keine Server-API konfiguriert.');
  }

  return {
    apiBaseUrl,
    apiKey: settings.contentServerApiKey?.trim() || null,
    endpoint: (settings.contentServerApiEndpoint ?? '').trim() || '/save_articles.php',
    transferMode: 'server-api',
  };
};

const uploadTransferFileToServer = async (
  fileName: string,
  content: string,
  target?: Extract<ContentStudioTransferExecutionTarget, { target: 'server' }>,
): Promise<{ slug: string; fileName: string }> => {
  const serverTarget = resolveServerTransferConfig(target);
  const slug = sanitizeServerSlug(fileName);
  if (serverTarget.transferMode === 'blog-php') {
    if (!serverTarget.apiBaseUrl?.trim() || !serverTarget.apiKey?.trim()) {
      throw new Error('Blog-PHP-Ziel ist nicht vollständig konfiguriert.');
    }
    const phpErr = await phpBlogUpload(
      { filename: `${slug}.md`, content },
      { apiUrl: serverTarget.apiBaseUrl.trim(), apiKey: serverTarget.apiKey.trim() }
    );
    if (phpErr) {
      throw new Error(phpErr);
    }
    return {
      slug,
      fileName: `${slug}.md`,
    };
  }

  let apiBaseUrl = serverTarget.apiBaseUrl.trim();
  if (!/^https?:\/\//i.test(apiBaseUrl)) {
    apiBaseUrl = `https://${apiBaseUrl}`;
  }

  const endpoint = serverTarget.endpoint.trim() || '/save_articles.php';
  const targetUrl = /^https?:\/\//i.test(endpoint)
    ? endpoint
    : `${apiBaseUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;

  const title = makeServerTitle(fileName);
  const payload = {
    slug,
    title,
    subtitle: '',
    date: new Date().toISOString().slice(0, 10),
    image: '',
    imageUrl: '',
    markdown: content,
    content,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (serverTarget.apiKey?.trim()) {
    headers.Authorization = `Bearer ${serverTarget.apiKey.trim()}`;
  }

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Server-Transfer fehlgeschlagen (HTTP ${response.status}).`);
  }

  return {
    slug,
    fileName: `${slug}.md`,
  };
};

export const listContentStudioTransferTargets = (
  item: ContentStudioTransferItem,
  context: ContentStudioTransferContext = {}
): ContentStudioTransferPreview[] => {
  const localDirectoryReady = !!context.localDirectoryPath?.trim() && isTauri();
  const cloudReady = canUploadToZenCloud();
  const isImageFile = isTransferItemImage(item.fileName);
  const targets: ContentStudioTransferPreview[] = [];

  if (item.source !== 'local' && localDirectoryReady) {
    targets.push({
      target: 'local',
      label: 'Lokal sichern',
      description: 'Als Markdown im lokalen Projektordner speichern.',
    });
  }

  if (item.source !== 'cloud' && item.source !== 'zennote' && cloudReady) {
    targets.push({
      target: 'cloud',
      label: 'Nach Cloud verschieben',
      description: 'Als Cloud-Dokument in ZenCloud anlegen.',
    });
    if (!isImageFile) {
      targets.push({
        target: 'zennote',
        label: 'Als ZenNote anlegen',
        description: 'Als ZenNote-Dokument in ZenCloud anlegen.',
      });
    }
  }

  if (item.source === 'cloud' && cloudReady && !isImageFile) {
    targets.push({
      target: 'zennote',
      label: 'Zu ZenNote verschieben',
      description: 'Cloud-Dokument als ZenNote speichern.',
    });
  }

  if (item.source === 'zennote' && cloudReady) {
    targets.push({
      target: 'cloud',
      label: 'Zu Cloud verschieben',
      description: 'ZenNote als normales Cloud-Dokument speichern.',
    });
  }

  if (item.source !== 'server' && canTransferToServer()) {
    targets.push({
      target: 'server',
      label: 'Auf Server verschieben',
      description: 'Als Artikel über die Server API übertragen.',
    });
  }

  return targets;
};

export const transferContentStudioItem = async (
  item: ContentStudioTransferItem,
  target: ContentStudioTransferTarget | ContentStudioTransferExecutionTarget,
  context: ContentStudioTransferContext = {}
): Promise<ContentStudioTransferResult> => {
  try {
    const resolvedTarget: ContentStudioTransferExecutionTarget =
      typeof target === 'string'
        ? {
            key: target,
            target,
            label: target,
            description: '',
          } as ContentStudioTransferExecutionTarget
        : target;

    if (resolvedTarget.target === 'zennote' && isTransferItemImage(item.fileName)) {
      return {
        success: false,
        target: resolvedTarget.target,
        error: 'Bilder dürfen nicht als ZenNote übertragen werden.',
      };
    }

    const { content, fileName } = await readTransferItemContent(item);

    if (resolvedTarget.target === 'local') {
      const localDirectoryPath = requireDesktopLocalTarget(context, resolvedTarget);
      const normalizedFileName = ensureMarkdownFileName(fileName, 'cloud');
      const localPath = await writeLocalTransferFile(localDirectoryPath, normalizedFileName, content);
      let deletedSource = false;
      if (context.deleteSourceAfterTransfer && (item.source === 'cloud' || item.source === 'zennote')) {
        deletedSource = await deleteCloudDocument(item.docId);
      }
      return {
        success: true,
        target: resolvedTarget.target,
        fileName: normalizedFileName,
        localPath,
        deletedSource,
      };
    }

    if (resolvedTarget.target === 'cloud') {
      const normalizedFileName = ensureMarkdownFileName(fileName, 'cloud');
      const uploaded = await uploadTransferFileToCloud(normalizedFileName, content, resolvedTarget.cloudProjectId);
      let deletedSource = false;
      if (context.deleteSourceAfterTransfer && item.source === 'zennote') {
        deletedSource = await deleteCloudDocument(item.docId);
      }
      return {
        success: true,
        target: resolvedTarget.target,
        fileName: uploaded.fileName,
        cloudDocId: uploaded.id,
        cloudUrl: uploaded.url,
        deletedSource,
      };
    }

    if (resolvedTarget.target === 'zennote') {
      const normalizedFileName = ensureMarkdownFileName(fileName, 'zennote');
      const uploaded = await uploadTransferFileToCloud(normalizedFileName, content, resolvedTarget.cloudProjectId);
      let deletedSource = false;
      if (context.deleteSourceAfterTransfer && item.source === 'cloud') {
        deletedSource = await deleteCloudDocument(item.docId);
      }
      return {
        success: true,
        target: resolvedTarget.target,
        fileName: uploaded.fileName,
        cloudDocId: uploaded.id,
        cloudUrl: uploaded.url,
        deletedSource,
      };
    }

    if (resolvedTarget.target === 'server') {
      const uploaded = await uploadTransferFileToServer(fileName, content, resolvedTarget);
      return {
        success: true,
        target: resolvedTarget.target,
        fileName: uploaded.fileName,
      };
    }

    return {
      success: false,
      target: resolvedTarget.target,
      error: 'Dieses Ziel wird noch nicht unterstützt.',
    };
  } catch (error) {
    return {
      success: false,
      target: typeof target === 'string' ? target : target.target,
      error: error instanceof Error ? error.message : 'Transfer fehlgeschlagen.',
    };
  }
};
