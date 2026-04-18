export type ContentStudioAggregateItemSource = 'local' | 'web' | 'cloud' | 'zennote' | 'server';

export type ContentStudioAggregateItem =
  | {
      id: string;
      source: 'local';
      title: string;
      subtitle: string;
      searchPath: string;
      updatedAt?: number;
      payload: { path: string };
    }
  | {
      id: string;
      source: 'web';
      title: string;
      subtitle: string;
      searchPath: string;
      updatedAt?: number;
      payload: { content: string; fileName: string };
    }
  | {
      id: string;
      source: 'cloud' | 'zennote';
      title: string;
      subtitle: string;
      searchPath: string;
      updatedAt?: number;
      payload: { docId: number; fileName: string };
    }
  | {
      id: string;
      source: 'server';
      title: string;
      subtitle: string;
      searchPath: string;
      updatedAt?: number;
      payload: { slug: string };
    };

type LocalFile = {
  path: string;
  name: string;
  modifiedAt?: number;
};

type WebDocument = {
  id: string;
  name: string;
  content: string;
  updatedAt: number;
};

type CloudDocument = {
  id: number;
  fileName: string;
  createdAt: string;
};

export const matchesContentStudioSearch = (name: string, path: string, query: string): boolean => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  if (normalizedQuery.startsWith('*.')) {
    const extension = normalizedQuery.slice(1);
    return name.toLowerCase().endsWith(extension) || path.toLowerCase().endsWith(extension);
  }
  return name.toLowerCase().includes(normalizedQuery) || path.toLowerCase().includes(normalizedQuery);
};

export const buildContentStudioAggregateItems = ({
  localFiles,
  webDocuments,
  cloudDocuments,
  serverArticles,
}: {
  localFiles: LocalFile[];
  webDocuments: WebDocument[];
  cloudDocuments: CloudDocument[];
  serverArticles: unknown[];
}): ContentStudioAggregateItem[] => {
  const localItems: ContentStudioAggregateItem[] = localFiles.map((file) => ({
    id: `local:${file.path}`,
    source: 'local',
    title: file.name,
    subtitle: file.path,
    searchPath: file.path,
    updatedAt: file.modifiedAt,
    payload: { path: file.path },
  }));

  const webItems: ContentStudioAggregateItem[] = webDocuments.map((doc) => ({
    id: `web:${doc.id}`,
    source: 'web',
    title: doc.name,
    subtitle: 'Web-Dokument',
    searchPath: doc.name,
    updatedAt: doc.updatedAt,
    payload: { content: doc.content, fileName: doc.name },
  }));

  const cloudItems: ContentStudioAggregateItem[] = cloudDocuments
    .filter((doc) => !doc.fileName.endsWith('.json') && !doc.fileName.endsWith('.zennote'))
    .map((doc) => ({
      id: `cloud:${doc.id}`,
      source: 'cloud',
      title: doc.fileName,
      subtitle: 'Cloud-Dokument',
      searchPath: doc.fileName,
      updatedAt: Date.parse(doc.createdAt),
      payload: { docId: doc.id, fileName: doc.fileName },
    }));

  const zenNoteItems: ContentStudioAggregateItem[] = cloudDocuments
    .filter((doc) => doc.fileName.endsWith('.zennote'))
    .map((doc) => ({
      id: `zennote:${doc.id}`,
      source: 'zennote',
      title: doc.fileName,
      subtitle: 'ZenNote',
      searchPath: doc.fileName,
      updatedAt: Date.parse(doc.createdAt),
      payload: { docId: doc.id, fileName: doc.fileName },
    }));

  const serverItems: ContentStudioAggregateItem[] = (Array.isArray(serverArticles) ? serverArticles : []).map((raw, index) => {
    const slug = typeof raw === 'string' ? raw : ((raw as { slug?: string }).slug ?? '');
    const title = typeof raw === 'string' ? raw : ((raw as { title?: string }).title || slug);
    const date = typeof raw === 'string' ? undefined : ((raw as { date?: string }).date ?? undefined);
    return {
      id: `server:${slug || index}`,
      source: 'server',
      title,
      subtitle: date ? `Server-Artikel · ${date}` : 'Server-Artikel',
      searchPath: `${title} ${slug}`.trim(),
      updatedAt: date ? Date.parse(date) : undefined,
      payload: { slug },
    };
  });

  return [...localItems, ...webItems, ...cloudItems, ...zenNoteItems, ...serverItems];
};

export const sortContentStudioAggregateItems = (
  items: ContentStudioAggregateItem[],
  sortMode: 'name-asc' | 'name-desc' | 'date-desc' | 'date-asc'
): ContentStudioAggregateItem[] => {
  const sorted = [...items];
  if (sortMode.startsWith('name')) {
    sorted.sort((a, b) => {
      const comparison = a.title.localeCompare(b.title, 'de', { numeric: true, sensitivity: 'base' });
      return sortMode === 'name-asc' ? comparison : -comparison;
    });
    return sorted;
  }

  sorted.sort((a, b) => {
    const aTime = a.updatedAt ?? 0;
    const bTime = b.updatedAt ?? 0;
    const comparison = aTime - bTime;
    return sortMode === 'date-asc' ? comparison : -comparison;
  });
  return sorted;
};
