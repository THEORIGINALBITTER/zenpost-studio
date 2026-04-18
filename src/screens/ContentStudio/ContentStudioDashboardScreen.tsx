import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faClock,
  faFileLines,
  faFolderOpen,
  faGlobe,
  faPlus,
  faPenNib,
  faCloud,
  faTrash,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { isWebProjectPath, getWebProjectName, getWebProjectType } from '../../services/webProjectService';
import { isCloudProjectPath, getCloudProjectName } from '../../services/cloudProjectService';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { isTauri } from '@tauri-apps/api/core';
import { readTextFile, writeTextFile, exists, readDir, remove } from '@tauri-apps/plugin-fs';
import { ftpUpload } from '../../services/ftpService';
import { phpBlogManifestUpdate } from '../../services/phpBlogService';
import { join } from '@tauri-apps/api/path';
import { openAppSettings } from '../../services/appShellBridgeService';
import { loadZenStudioSettings, type BlogConfig } from '../../services/zenStudioSettingsService';
import { subscribeToCloudSessionSync } from '../../services/cloudSessionSyncService';

type DashboardDocument = {
  id: string;
  name: string;
  path?: string;
  projectPath?: string;
  subtitle?: string;
  updatedAt?: number;
};

type ContentStudioDashboardScreenProps = {
  projectPath: string | null;
  recentProjectPaths: string[];
  documents: DashboardDocument[];
  showServerTab?: boolean;
  onSelectProjectPath: (path: string) => void;
  onPickProject: () => void;
  onOpenDashboardDocument?: (doc: DashboardDocument) => void;
  onStartWriting: () => void;
  onOpenDocuments: (path?: string) => void;
  onOpenPlanner: () => void;
  onOpenCalendar: () => void;
  serverArticles?: unknown[];
  serverArticlesLoading?: boolean;
  serverError?: string | null;
  serverName?: string;
  serverLocalCachePath?: string | null;
  onOpenServerArticle?: (slug: string) => void;
  onDeleteServerArticle?: (slug: string) => Promise<void>;
  onOpenApiSettings?: () => void;
  onRemoveProject?: (path: string) => void;
  onDeleteDocument?: (doc: DashboardDocument) => Promise<void>;
  blogs?: BlogConfig[];
  onStartWritingToBlog?: (blog: BlogConfig) => void;
  onOpenBlogPost?: (filePath: string, blog: BlogConfig) => void;
  onActiveContextChange?: (path: string | null) => void;
};

const ActionTile = ({
  title,
  description,
  actionLabel = 'Öffnen →',
  icon,
  onClick,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  icon: any;
  onClick: () => void;
}) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: '16px',
        border: `0.5px solid ${hovered ? '#AC8E66' : 'rgba(172,142,102,0.22)'}`,
        background: hovered
          ? 'linear-gradient(160deg, #EAE0CF 0%, #DDD3C0 100%)'
          : 'linear-gradient(160deg, #EDE6D8 0%, #E5DDD0 100%)',
        color: '#2a2318',
        textAlign: 'left',
        padding: '14px 14px',
        minHeight: '92px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        boxShadow: hovered
          ? 'inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.07), 0 6px 20px rgba(0,0,0,0.22)'
          : 'inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.12)',
        transition: 'border-color 0.2s ease, background 0.25s ease, box-shadow 0.25s ease',
      }}
    >
      <FontAwesomeIcon icon={icon} style={{ color: '#8A6F4A', marginTop: '2px', flexShrink: 0 }} />
      <div style={{ overflow: 'hidden' }}>
        {/* Title slot — slides up on hover */}
        <div style={{ position: 'relative', overflow: 'hidden', height: '18px', marginBottom: '5px' }}>
          <p style={{
            margin: 0, fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace',
            whiteSpace: 'nowrap', position: 'absolute', top: 0, left: 0,
            color: '#2a2318',
            transform: hovered ? 'translateY(-100%)' : 'translateY(0)',
            opacity: hovered ? 0 : 1,
            transition: 'transform 0.22s ease, opacity 0.18s ease',
          }}>
            {title}
          </p>
          <p style={{
            margin: 0, fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace',
            whiteSpace: 'nowrap', color: '#8A6F4A', position: 'absolute', top: 0, left: 0,
            transform: hovered ? 'translateY(0)' : 'translateY(100%)',
            opacity: hovered ? 1 : 0,
            transition: 'transform 0.22s ease, opacity 0.18s ease',
          }}>
            {actionLabel}
          </p>
        </div>
        {/* Description — fades slightly on hover */}
        <p style={{
          margin: 0, fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace',
          color: '#7a6a58',
          opacity: hovered ? 0.6 : 1,
          transition: 'opacity 0.2s ease',
        }}>
          {description}
        </p>
      </div>
    </button>
  );
};

export function ContentStudioDashboardScreen({
  projectPath,
  recentProjectPaths,
  documents,
  showServerTab = false,
  onSelectProjectPath,
  onPickProject,
  onOpenDashboardDocument,
  onStartWriting,
  onOpenDocuments,
  onOpenPlanner,
  onOpenCalendar,
  serverArticles,
  serverArticlesLoading,
  serverError,
  serverName,
  serverLocalCachePath,
  onOpenServerArticle,
  onDeleteServerArticle,
  onOpenApiSettings,
  onRemoveProject,
  blogs = [],
  onStartWritingToBlog,
  onOpenBlogPost,
  onActiveContextChange,
  onDeleteDocument,
}: ContentStudioDashboardScreenProps) {
  const [cloudSettings, setCloudSettings] = useState(() => loadZenStudioSettings());
  const blogPaths = new Set(blogs.map((b) => b.path));
  const visibleRecentProjects = recentProjectPaths.filter((p) => !blogPaths.has(p)).slice(0, 6);
  const stableOrderRef = useRef<string[]>([]);
  const seen = new Set(stableOrderRef.current);
  const newPaths = visibleRecentProjects.filter((p) => !seen.has(p));
  if (newPaths.length > 0) {
    stableOrderRef.current = [...stableOrderRef.current, ...newPaths];
  }
  stableOrderRef.current = stableOrderRef.current.filter((p) => visibleRecentProjects.includes(p));
  const allProjects = stableOrderRef.current;
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string | 'server'>('');
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [blogPosts, setBlogPosts] = useState<Array<{ slug: string; title: string; date?: string; synced: boolean; localPath?: string; localFileName?: string }>>([]);
  const [blogPostsLoading, setBlogPostsLoading] = useState(false);
  const [confirmingDeleteSlug, setConfirmingDeleteSlug] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [deleteToast, setDeleteToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const hasServerCachePath = !!(serverLocalCachePath && serverLocalCachePath.trim().length > 0);

  const handleDelete = (slug: string) => {
    if (!onDeleteServerArticle) return;
    setDeletingSlug(slug);
    onDeleteServerArticle(slug)
      .then(() => {
        setDeleteToast({ msg: 'Artikel erfolgreich gelöscht', ok: true });
        setTimeout(() => setDeleteToast(null), 3000);
      })
      .catch((e: unknown) => {
        setDeleteToast({ msg: e instanceof Error ? e.message : 'Löschen fehlgeschlagen', ok: false });
        setTimeout(() => setDeleteToast(null), 4000);
      })
      .finally(() => { setDeletingSlug(null); setConfirmingDeleteSlug(null); });
  };
  const [cardHovered, setCardHovered] = useState(false);
  const [hoveredDocId, setHoveredDocId] = useState<string | null>(null);
  const [hoveredProjectDocId, setHoveredProjectDocId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [hoveredArticleSlug, setHoveredArticleSlug] = useState<string | null>(null);

  const normalizeBlogPostStem = (value: string) => value
    .replace(/\.md$/i, '')
    .toLowerCase()
    .replace(/[äöüß]/g, (char: string) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[char] ?? char))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const readLocalTitle = async (filePath: string, slug: string): Promise<string> => {
    try {
      const content = await readTextFile(filePath);
      const lines = content.split('\n');
      if (lines[0]?.trim() === '---') {
        for (let i = 1; i < Math.min(lines.length, 20); i++) {
          if (lines[i]?.trim() === '---') break;
          const m = lines[i]?.match(/^title:\s*["']?(.+?)["']?\s*$/);
          if (m) return m[1];
        }
      }
      for (const line of lines.slice(0, 10)) {
        const m = line?.match(/^#+\s+(.+)$/);
        if (m) return m[1];
      }
    } catch { /* use slug */ }
    return slug;
  };

  const resolveLocalBlogPostPath = async (blogPath: string, post: { slug: string; title: string; localFileName?: string }) => {
    const postsDir = await join(blogPath, 'posts');
    const fallbackPath = await join(postsDir, `${post.slug}.md`);
    if (!(await exists(postsDir))) return fallbackPath;

    const entries = await readDir(postsDir);
    const normalizedSlug = normalizeBlogPostStem(post.slug);
    const normalizedTitle = normalizeBlogPostStem(post.title);
    const mdEntries = entries.filter((entry) => entry.name?.endsWith('.md'));

    const exactMatch = mdEntries.find((entry) => entry.name?.replace(/\.md$/i, '') === post.slug);
    if (exactMatch?.name) return join(postsDir, exactMatch.name);

    if (post.localFileName) {
      const explicitMatch = mdEntries.find((entry) => entry.name === post.localFileName);
      if (explicitMatch?.name) return join(postsDir, explicitMatch.name);
    }

    const normalizedMatch = mdEntries.find((entry) => {
      const normalizedEntry = normalizeBlogPostStem(entry.name ?? '');
      return normalizedEntry === normalizedSlug || normalizedEntry === normalizedTitle;
    });
    if (normalizedMatch?.name) return join(postsDir, normalizedMatch.name);

    for (const entry of mdEntries) {
      if (!entry.name) continue;
      const candidatePath = await join(postsDir, entry.name);
      const candidateTitle = await readLocalTitle(candidatePath, post.slug);
      if (candidateTitle.trim() === post.title.trim()) return candidatePath;
    }

    return fallbackPath;
  };

  // Load blog manifest when a blog tab is selected
  useEffect(() => {
    if (!selectedTab.startsWith('blog:')) { setBlogPosts([]); return; }
    const blogId = selectedTab.slice(5);
    const blog = blogs.find((b) => b.id === blogId);
    if (!blog) { setBlogPosts([]); return; }
    setBlogPostsLoading(true);

    const parsePosts = (raw: unknown) => {
      const posts = Array.isArray((raw as Record<string, unknown>)?.posts)
        ? (raw as { posts: Record<string, unknown>[] }).posts : [];
      return posts.map((p) => ({
        slug: String(p.slug ?? ''),
        title: String(p.title ?? p.slug ?? ''),
        date: p.date ? String(p.date) : undefined,
        localFileName: typeof p.localFileName === 'string' ? p.localFileName : undefined,
        synced: true as const,
      }));
    };

    (async () => {
      try {
        let serverPosts: Array<{ slug: string; title: string; date?: string; synced: true }> = [];

        // PHP-API blogs: fetch manifest from PHP endpoint
        if (blog.deployType === 'php-api' && blog.phpApiUrl) {
          const res = await fetch(blog.phpApiUrl, { method: 'GET' });
          if (res.ok) serverPosts = parsePosts(await res.json());
        }
        // Any blog with a siteUrl: fetch manifest.json from the public site
        if (serverPosts.length === 0 && blog.siteUrl) {
          try {
            const base = blog.siteUrl.startsWith('http') ? blog.siteUrl : 'https://' + blog.siteUrl;
            const res = await fetch(base.replace(/\/$/, '') + '/manifest.json?t=' + Date.now());
            if (res.ok) serverPosts = parsePosts(await res.json());
          } catch { /* fall through */ }
        }

        // Load local manifest and merge: local data overrides server data for matching slugs
        // (local manifest is updated on every save, so it reflects unsaved-to-server changes)
        let localManifestPosts: Array<{ slug: string; title: string; date?: string; synced: true }> = [];
        if (isTauri() && blog.path) {
          try {
            const manifestPath = await join(blog.path, 'manifest.json');
            if (await exists(manifestPath)) localManifestPosts = parsePosts(JSON.parse(await readTextFile(manifestPath)));
          } catch { /* non-fatal */ }
        }
        if (serverPosts.length === 0) {
          serverPosts = localManifestPosts;
        } else if (localManifestPosts.length > 0) {
          // Merge: for slugs in both, prefer local manifest data (title/date up-to-date after local save)
          const localBySlug = new Map(localManifestPosts.map((p) => [p.slug, p]));
          serverPosts = serverPosts.map((sp) => localBySlug.get(sp.slug) ?? sp);
          // Add local-manifest-only entries that server doesn't know about yet
          const serverSlugsSet = new Set(serverPosts.map((p) => p.slug));
          for (const lp of localManifestPosts) {
            if (!serverSlugsSet.has(lp.slug)) serverPosts.push(lp);
          }
        }

        // Scan local posts folder for unsynced files not in any manifest (Tauri only)
        const localOnlyPosts: Array<{ slug: string; title: string; synced: false; localPath: string }> = [];
        if (isTauri() && blog.path) {
          const sanitize = (name: string) => name.replace(/\.md$/i, '').toLowerCase()
            .replace(/[äöüß]/g, (c: string) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c] ?? c))
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const knownSlugs = new Set([
            ...serverPosts.map((p) => p.slug),
            ...localManifestPosts.map((p) => p.slug),
          ]);
          const postsDir = await join(blog.path, 'posts');
          if (await exists(postsDir)) {
            const entries = await readDir(postsDir);
            for (const entry of entries) {
              if (!entry.name?.endsWith('.md')) continue;
              const slug = sanitize(entry.name);
              if (knownSlugs.has(slug)) continue;
              const fp = await join(postsDir, entry.name);
              const title = await readLocalTitle(fp, slug);
              localOnlyPosts.push({ slug, title, synced: false, localPath: fp });
            }
          }
        }

        setBlogPosts([...serverPosts, ...localOnlyPosts]);
      } catch { setBlogPosts([]); }
      finally { setBlogPostsLoading(false); }
    })();
  }, [selectedTab, blogs]);

  const activeProjectPath = selectedPath ?? projectPath ?? allProjects[0] ?? null;

  // Notify parent whenever the active context path changes
  useEffect(() => {
    if (!onActiveContextChange) return;
    if (selectedTab === 'server') {
      onActiveContextChange(serverLocalCachePath ?? null);
    } else if (selectedTab.startsWith('blog:')) {
      const blogId = selectedTab.slice(5);
      const blog = blogs.find((b) => b.id === blogId);
      onActiveContextChange(blog?.path ?? null);
    } else {
      onActiveContextChange(activeProjectPath);
    }
  }, [selectedTab, serverLocalCachePath, blogs, activeProjectPath, onActiveContextChange]);

  useEffect(() => {
    const syncFromStorage = () => setCloudSettings(loadZenStudioSettings());
    const handler = (event: Event) => {
      const next = (event as CustomEvent<ReturnType<typeof loadZenStudioSettings>>).detail;
      setCloudSettings(next ?? loadZenStudioSettings());
    };
    window.addEventListener('zen-studio-settings-updated', handler);
    const unsubscribe = subscribeToCloudSessionSync(() => {
      syncFromStorage();
    }, { intervalMs: 1000 });
    return () => {
      window.removeEventListener('zen-studio-settings-updated', handler);
      unsubscribe();
    };
  }, []);

  const activeProjectName = activeProjectPath
    ? (isCloudProjectPath(activeProjectPath)
        ? (cloudSettings.cloudProjectName ?? getCloudProjectName(activeProjectPath) ?? 'Cloud-Projekt')
        : isWebProjectPath(activeProjectPath)
          ? (getWebProjectName(activeProjectPath) ?? 'Web-Projekt')
          : activeProjectPath.split(/[\\/]/).filter(Boolean).pop() ?? 'Projekt')
    : 'Projekt';
  const activeProjectIsWeb = activeProjectPath ? isWebProjectPath(activeProjectPath) : false;
  const activeProjectIsCloud = activeProjectPath ? isCloudProjectPath(activeProjectPath) : false;
  const activeProjectWebType = activeProjectPath ? getWebProjectType(activeProjectPath) : null;
  const cloudLoggedIn = !!cloudSettings.cloudAuthToken && !!cloudSettings.cloudProjectId;
  const showWebWarning = !cloudLoggedIn;

  useEffect(() => {
    if ((!cloudLoggedIn || !showServerTab) && selectedTab === 'server') {
      setSelectedTab('');
    }
  }, [cloudLoggedIn, selectedTab, showServerTab]);

  const recent = documents
    .slice()
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    .slice(0, 8);
  const projectDocs = recent.filter((doc) => activeProjectPath && doc.projectPath === activeProjectPath);
  const hasDocs = projectDocs.length > 0;

  return (
    <div className="flex items-center bg-[#1a1a1a] justify-center mt-[50px] mb-[24px] px-[12px]">
      <div
        style={{
          width: '100%',
          maxWidth: '1020px',
          borderRadius: '14px',
          border: '0.5px solid #2F2F2F',
          background: '#e8e3d8',
          padding: 'clamp(18px, 4vw, 40px)',
          textAlign: 'left',
        }}
      >
          {showWebWarning && (
          <div
            style={{
              marginBottom: '16px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(172,142,102,0.4)',
              background: '#d0cbb8',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <span style={{ color: '#1a1a1a' }}>
              Nicht bei ZenCloud eingeloggt — Daten werden lokal gespeichert.
            </span>
            <button
              className="zen-gold-btn"
              onClick={() => openAppSettings('cloud')}
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Anmelden
            </button>
          </div>
        )}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <FontAwesomeIcon icon={faPenNib} style={{ fontSize: '24px', color: '#AC8E66' }} />
          <h2
            style={{
              fontSize: '18px',
             
              color: '#AC8E66',
              margin: 0,
              fontFamily: 'IBM Plex Mono, monospace',
              letterSpacing: '0.3px',
            }}
          >
            Content AI Studio starten
          </h2>
        </div>
      

        <p
          style={{
            color: '#252525',
            marginBottom: '24px',
            maxWidth: '760px',
            fontSize: '11px',
            fontFamily: 'monospace',
        
          }}
        >
          Schreibe einmal, veröffentliche mehrfach. Starte direkt im Editor, plane Posts oder lade vorhandene Dokumente.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '18px',
            marginBottom: '20px',
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'stretch', position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                paddingTop: '12px',
                marginRight: '-1px',
                position: 'relative',
                zIndex: 5,
              }}
            >
              {allProjects.map((path) => {
                const isCloud = isCloudProjectPath(path);
                const isWeb = isWebProjectPath(path);
                const tabName = isCloud
                  ? (getCloudProjectName(path) ?? 'Cloud')
                  : isWeb
                  ? (getWebProjectName(path) ?? 'Web')
                  : (path.split(/[\\/]/).filter(Boolean).pop() || path);
                const tabLabel = tabName.length > 6 ? tabName.slice(0, 5) + '…' : tabName;
                const isActive = selectedTab !== 'server' && !selectedTab.startsWith('blog:') && path === activeProjectPath;
                const isHovered = hoveredTab === path;
                return (
                  <div
                    key={path}
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setHoveredTab(path)}
                    onMouseLeave={() => setHoveredTab(null)}
                  >
                    <button
                      onClick={() => {
                        setSelectedTab('');
                        setSelectedPath(path);
                        onSelectProjectPath(path);
                      }}
                      title={isCloud ? `Cloud: ${tabName}` : isWeb ? `Web: ${tabName}` : path}
                      onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = '#2a2a2a'; e.currentTarget.style.transform = 'translateX(-3px)'; } }}
                      onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.transform = 'translateX(0)'; } }}
                      style={{
                        width: '35px',
                        height: '80px',
                        borderRadius: '10px 0 0 10px',
                        borderTop: isActive ? `1px solid ${isCloud ? '#AC8E66' : '#b8b0a0'}` : '0.5px solid #3A3A3A',
                        borderLeft: isActive ? `1px solid ${isCloud ? '#AC8E66' : '#b8b0a0'}` : '0.5px solid #3A3A3A',
                        borderBottom: isActive ? `1px solid ${isCloud ? '#AC8E66' : '#b8b0a0'}` : '0.5px solid #3A3A3A',
                        borderRight: 'none',
                        background: isActive ? '#e1d8c6' : '#1a1a1a',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: 0,
                        transition: 'background 0.2s, transform 0.15s ease',
                        position: 'relative',
                        zIndex: isActive ? 20 : 10,
                      }}
                    >
                      {isCloud && (
                        <FontAwesomeIcon
                          icon={faCloud}
                          style={{ fontSize: '8px', color: isActive ? '#AC8E66' : '#e8e3d8' }}
                        />
                      )}
                      <span
                        style={{
                          writingMode: 'vertical-rl',
                          textOrientation: 'mixed',
                          transform: 'rotate(180deg)',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '9px',
                          color: isActive ? '#3e362c' : '#e8e3d8',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          maxHeight: isCloud ? '55px' : '70px',
                          letterSpacing: '0.3px',
                        }}
                      >
                        {tabLabel}
                      </span>
                    </button>
                    {/* Remove button — appears on hover */}
                    {isHovered && onRemoveProject && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveProject(path);
                        }}
                        title={`"${tabName}" entfernen`}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: '#B3261E',
                          border: 'none',
                          color: '#fff',
                          fontSize: '10px',
                          lineHeight: '18px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          zIndex: 30,
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
              {onOpenServerArticle && cloudLoggedIn && showServerTab && (
                <button
                  onClick={() => setSelectedTab('server')}
                  title={serverName ? `Server Artikel · ${serverName}` : 'Server Artikel'}
                  style={{
                    width: '36px',
                    height: '80px',
                    borderRadius: '10px 0 0 10px',
                    borderTop: selectedTab === 'server' ? '1px solid #b8b0a0' : '0.5px solid #3A3A3A',
                    borderLeft: selectedTab === 'server' ? '1px solid #b8b0a0' : '0.5px solid #3A3A3A',
                    borderBottom: selectedTab === 'server' ? '1px solid #b8b0a0' : '0.5px solid #3A3A3A',
                    borderRight: 'none',
                    background: selectedTab === 'server' ? '#d0cbb8' : '#1a1a1a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    transition: 'background 0.2s',
                    position: 'relative',
                    zIndex: selectedTab === 'server' ? 20 : 10,
                  }}
                  onMouseEnter={(event) => {
                    if (selectedTab !== 'server') event.currentTarget.style.background = '#2a2a2a';
                  }}
                  onMouseLeave={(event) => {
                    if (selectedTab !== 'server') event.currentTarget.style.background = '#1a1a1a';
                  }}
                >
                  <span
                    style={{
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed',
                      transform: 'rotate(180deg)',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '9px',
                      color: selectedTab === 'server' ? '#1a1a1a' : '#d0cbb8',
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.3px',
                    }}
                  >
                    Server
                  </span>
                </button>
              )}
              {blogs.map((blog) => {
                const tabLabel = blog.name.length > 6 ? blog.name.slice(0, 5) + '…' : blog.name;
                const isActive = selectedTab === `blog:${blog.id}`;
                return (
                  <button
                    key={`blog:${blog.id}`}
                    onClick={() => {
                      setSelectedTab(`blog:${blog.id}`);
                      setCardHovered(false);
                    }}
                    title={blog.siteUrl ?? blog.path}
                    style={{
                      width: '36px',
                      height: '80px',
                      borderRadius: '10px 0 0 10px',
                      borderTop: isActive ? '1px solid #b8b0a0' : '0.5px solid #3A3A3A',
                      borderLeft: isActive ? '1px solid #b8b0a0' : '0.5px solid #3A3A3A',
                      borderBottom: isActive ? '1px solid #b8b0a0' : '0.5px solid #3A3A3A',
                      borderRight: 'none',
                      background: isActive ? '#d0cbb8' : '#1a1a1a',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: 0,
                      transition: 'background 0.2s',
                      position: 'relative',
                      zIndex: isActive ? 20 : 10,
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#2a2a2a'; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = '#1a1a1a'; }}
                  >
                    <FontAwesomeIcon icon={faGlobe} style={{ fontSize: '9px', color: isActive ? '#1a1a1a' : '#e8e3d8' }} />
                    <span
                      style={{
                        writingMode: 'vertical-rl',
                        textOrientation: 'mixed',
                        transform: 'rotate(180deg)',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '9px',
                        color: isActive ? '#1a1a1a' : '#d0cbb8',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        maxHeight: '60px',
                        letterSpacing: '0.3px',
                      }}
                    >
                      {tabLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              style={{ position: 'relative', width: '300px', minHeight: '0', maxHeight: '340px', zIndex: 15, display: 'flex', flexDirection: 'column' }}
              onMouseEnter={() => selectedTab !== 'server' && !selectedTab.startsWith('blog:') && hasDocs && setCardHovered(true)}
              onMouseLeave={() => setCardHovered(false)}
            >
              {selectedTab.startsWith('blog:') ? (() => {
                const blogId = selectedTab.slice(5);
                const activeBlog = blogs.find((b) => b.id === blogId);
                return (
                  <div
                    style={{
                      width: '100%',
                      flex: 1,
                      minHeight: 0,
                      borderRadius: '0 12px 12px 0',
                      padding: '14px 16px',
                      borderTop: '1px solid #b8b0a0',
                      borderRight: '1px solid #b8b0a0',
                      borderBottom: '1px solid #b8b0a0',
                      borderLeft: 'none',
                      background: 'linear-gradient(180deg, #EDE6D8 0%, #E7DFD0 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '4px 4px 20px rgba(0,0,0,0.25)',
                    }}
                  >
                    <p style={{ fontSize: '9px', color: '#7a7060', fontFamily: 'IBM Plex Mono, monospace', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0 }}>
                      Blog · {activeBlog?.name ?? ''}
                      {blogPostsLoading && <span style={{ color: '#AC8E66', marginLeft: '6px' }}>Lädt…</span>}
                    </p>
                    {activeBlog?.siteUrl && (
                      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#3e362c', marginBottom: '8px', flexShrink: 0 }}>
                      {activeBlog.siteUrl}
                      </div>
                    )}
                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {!blogPostsLoading && blogPosts.length === 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '10px', padding: '16px 0' }}>
                          <p style={{ fontSize: '9px', color: '#7a7060', fontFamily: 'IBM Plex Mono, monospace', margin: 0, textAlign: 'center' }}>
                            Noch keine Posts vorhanden.
                          </p>
                          {activeBlog && onStartWritingToBlog && (
                            <button
                              onClick={() => onStartWritingToBlog(activeBlog)}
                              style={{
                                padding: '8px 14px',
                                border: '1px solid rgba(172,142,102,0.6)',
                                borderRadius: '6px',
                                background: '#AC8E66',
                                color: '#fff',
                                fontFamily: 'IBM Plex Mono, monospace',
                                fontSize: '9px',
                                cursor: 'pointer',
                              }}
                            >
                              Ersten Post schreiben
                            </button>
                          )}
                        </div>
                      )}
                      {blogPosts.map((post) => (
                        <div
                          key={post.slug}
                          style={{
                            borderRadius: '6px',
                            border: post.synced ? '0.5px solid rgba(102, 186, 122,1)' : '0.5px solid rgba(180,60,60,1)',
                            background: post.synced ? 'rgba(21, 21, 21, 0.08)' : 'rgba(255,240,240,0.5)',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <div
                            title={post.synced ? 'Synchronisiert' : 'Nur lokal – noch nicht hochgeladen'}
                            style={{ flexShrink: 0, paddingLeft: '8px', display: 'flex', alignItems: 'center' }}
                          >
                            <span style={{
                              width: '6px', height: '6px', borderRadius: '50%',
                              background: post.synced ? '#4caf50' : '#e05252',
                              display: 'inline-block', flexShrink: 0,
                            }} />
                          </div>
                          <div
                            onClick={async () => {
                              if (!activeBlog || !isTauri()) return;
                              if (!activeBlog.path) {
                                alert('Bitte zuerst einen lokalen Ordner für diesen Blog in den Einstellungen angeben.');
                                return;
                              }
                              // Local-only posts: open directly
                              if (!post.synced && 'localPath' in post && post.localPath) {
                                onOpenBlogPost?.(post.localPath, activeBlog);
                                return;
                              }
                              const fp = await resolveLocalBlogPostPath(activeBlog.path, post);
                              // If local file missing, fetch from server and save locally
                              if (!(await exists(fp))) {
                                try {
                                  const base = activeBlog.siteUrl
                                    ? (activeBlog.siteUrl.startsWith('http') ? activeBlog.siteUrl : 'https://' + activeBlog.siteUrl)
                                    : null;
                                  const postUrl = base ? `${base.replace(/\/$/, '')}/posts/${post.slug}.md?t=${Date.now()}` : null;
                                  if (postUrl) {
                                    const res = await fetch(postUrl);
                                    if (res.ok) {
                                      const mdContent = await res.text();
                                      const { mkdir: mkdirFs } = await import('@tauri-apps/plugin-fs');
                                      await mkdirFs(await join(activeBlog.path, 'posts'), { recursive: true }).catch(() => {});
                                      await writeTextFile(fp, mdContent);
                                    }
                                  }
                                } catch { /* open anyway, editor will handle missing file */ }
                              }
                              onOpenBlogPost?.(fp, activeBlog);
                            }}
                            style={{ flex: 1, minWidth: 0, padding: '7px 8px', cursor: 'pointer' }}
                          >
                            <p style={{ margin: 0, fontSize: '10px', color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {post.title}
                            </p>
                          </div>
                          <button
                            onClick={async () => {
                              if (!activeBlog) return;
                              // First click: ask for confirmation
                              if (confirmingDeleteSlug !== post.slug) {
                                setConfirmingDeleteSlug(post.slug);
                                setTimeout(() => setConfirmingDeleteSlug((s) => s === post.slug ? null : s), 3000);
                                return;
                              }
                              // Second click: actually delete
                              setConfirmingDeleteSlug(null);
                              setBlogPosts(blogPosts.filter((p) => p.slug !== post.slug));
                              try {
                                // Delete the .md file from disk
                                const filePath = ('localPath' in post && post.localPath)
                                  ? post.localPath
                                  : await join(activeBlog.path, 'posts', `${post.slug}.md`);
                                if (await exists(filePath)) await remove(filePath);
                                // Remove from local manifest.json
                                const manifestPath = await join(activeBlog.path, 'manifest.json');
                                let updatedManifest: { posts?: Array<{ slug: string }> } | null = null;
                                if (await exists(manifestPath)) {
                                  const manifest = JSON.parse(await readTextFile(manifestPath)) as { posts?: Array<{ slug: string }> };
                                  manifest.posts = (manifest.posts ?? []).filter((p) => p.slug !== post.slug);
                                  await writeTextFile(manifestPath, JSON.stringify(manifest, null, 2));
                                  updatedManifest = manifest;
                                }

                                // Sync manifest to server
                                if (updatedManifest) {
                                  if (activeBlog.deployType === 'ftp' && activeBlog.ftpHost && activeBlog.ftpUser && activeBlog.ftpPassword) {
                                    const blogRoot = (activeBlog.ftpRemotePath ?? '/public_html/blog').replace(/\/$/, '');
                                    await ftpUpload(manifestPath, 'manifest.json', {
                                      host: activeBlog.ftpHost,
                                      user: activeBlog.ftpUser,
                                      password: activeBlog.ftpPassword,
                                      remotePath: blogRoot + '/',
                                      protocol: activeBlog.ftpProtocol ?? 'ftp',
                                    }).catch(() => {}); // non-fatal
                                  } else if (activeBlog.deployType === 'php-api' && activeBlog.phpApiUrl && activeBlog.phpApiKey) {
                                    await phpBlogManifestUpdate(
                                      updatedManifest,
                                      { apiUrl: activeBlog.phpApiUrl, apiKey: activeBlog.phpApiKey },
                                    ).catch(() => {}); // non-fatal
                                  }
                                }

                                setDeleteToast({ msg: 'Gelöscht', ok: true });
                                setTimeout(() => setDeleteToast(null), 2500);
                              } catch (e) {
                                setDeleteToast({ msg: `Fehler: ${e instanceof Error ? e.message : String(e)}`, ok: false });
                                setTimeout(() => setDeleteToast(null), 4000);
                              }
                            }}
                            style={{
                              flexShrink: 0, padding: '4px 8px', marginRight: '4px',
                              border: 'none', background: 'transparent',
                              color: confirmingDeleteSlug === post.slug ? '#e05252' : '#8a7a6a',
                              fontFamily: 'IBM Plex Mono, monospace',
                              fontSize: '10px', cursor: 'pointer',
                            }}
                          >
                            {confirmingDeleteSlug === post.slug ? 'Löschen?' : '×'}
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, paddingTop: '6px' }}>
                      {activeBlog?.path ? (
                        <button
                          title="Im Finder öffnen"
                          onClick={() => revealItemInDir(activeBlog.path)}
                          style={{
                            background: 'none', border: 'none', padding: '5px 4px', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px',
                            color: '#1a1a1a', opacity: 0.7, borderRadius: '4px',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(172,142,102,0.12)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.background = 'none'; }}
                        >
                          <FontAwesomeIcon icon={faFolderOpen} style={{ fontSize: '9px' }} />
                          Im Finder lokal
                        </button>
                      ) : <span />}
                      <div style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', display: 'flex', gap: '8px' }}>
                        <span style={{ color: '#3a873d', opacity: 1 }}>
                          ● {blogPosts.filter((p) => p.synced).length} Server on
                        </span>
                        {blogPosts.some((p) => !p.synced) && (
                          <span style={{ color: '#e05252', opacity: 0.9 }}>
                            ● {blogPosts.filter((p) => !p.synced).length} Lokal off
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })() : selectedTab === 'server' ? (
                <div
                  style={{
                    width: '100%',
                    height: '320px',
                    borderRadius: '0 12px 12px 0',
                    padding: '14px 16px',
                    borderTop: '1px solid #b8b0a0',
                    borderRight: '1px solid #b8b0a0',
                    borderBottom: '1px solid #b8b0a0',
                    borderLeft: 'none',
                    background: 'linear-gradient(180deg, #EDE6D8 0%, #E7DFD0 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '4px 4px 20px rgba(0,0,0,0.25)',
                  }}
                >
                  <p style={{ fontSize: '9px', color: '#7a7060', fontFamily: 'IBM Plex Mono, monospace', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0 }}>
                    Server Artikel{serverName ? ` · ${serverName}` : ''}
                    {serverArticlesLoading && <span style={{ color: '#AC8E66', marginLeft: '6px' }}>Lädt…</span>}
                  </p>
                  <div
                    style={{
                      margin: '0 0 8px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexWrap: 'wrap',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: hasServerCachePath ? '#1F8A41' : '#B3261E',
                        boxShadow: hasServerCachePath
                          ? '0 0 0 2px rgba(31,138,65,0.18)'
                          : '0 0 0 2px rgba(179,38,30,0.18)',
                      }}
                    />
                    <span
                      title={hasServerCachePath ? (serverLocalCachePath ?? '') : 'Nicht gesetzt'}
                      style={{
                        fontSize: '8px',
                        color: hasServerCachePath ? '#5f6f5f' : '#8f1d16',
                        fontFamily: 'IBM Plex Mono, monospace',
                        maxWidth: '208px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {hasServerCachePath
                        ? `Lokaler Cache Pfad: ${serverLocalCachePath}`
                        : 'Lokaler Cache fehlt'}
                    </span>
                    {!hasServerCachePath && (
                      <button
                        onClick={() => onOpenApiSettings?.()}
                        style={{
                          border: '0.5px solid rgba(179,38,30,0.45)',
                          borderRadius: '6px',
                          background: 'rgba(179,38,30,0.08)',
                          color: '#8f1d16',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '8px',
                          padding: '3px 7px',
                          cursor: onOpenApiSettings ? 'pointer' : 'not-allowed',
                          opacity: onOpenApiSettings ? 1 : 0.6,
                          whiteSpace: 'nowrap',
                        }}
                        disabled={!onOpenApiSettings}
                      >
                        API öffnen
                      </button>
                    )}
                  </div>
                  {serverError && (
                    <div
                      style={{
                        borderRadius: '6px',
                        border: '0.5px solid rgba(179,38,30,0.35)',
                        background: 'rgba(179,38,30,0.06)',
                        padding: '8px',
                        marginBottom: '8px',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontSize: '9px', color: '#8f1d16', fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1.4 }}>
                        {serverError}
                      </span>
                      <button
                        onClick={() => onOpenApiSettings?.()}
                        style={{
                          border: '0.5px solid rgba(179,38,30,0.45)',
                          borderRadius: '6px',
                          background: 'rgba(179,38,30,0.08)',
                          color: '#8f1d16',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '8px',
                          padding: '4px 8px',
                          cursor: onOpenApiSettings ? 'pointer' : 'not-allowed',
                          opacity: onOpenApiSettings ? 1 : 0.6,
                          whiteSpace: 'nowrap',
                        }}
                        disabled={!onOpenApiSettings}
                      >
                        API jetzt öffnen
                      </button>
                    </div>
                  )}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {(!serverArticles || serverArticles.length === 0) && !serverArticlesLoading && (
                      <p style={{ fontSize: '9px', color: '#7a7060', fontFamily: 'IBM Plex Mono, monospace', margin: 0 }}>
                        Keine Artikel gefunden.
                      </p>
                    )}
                    {serverArticles && serverArticles.map((raw, i) => {
                      const slug = typeof raw === 'string' ? raw : ((raw as { slug?: string }).slug ?? '');
                      const title = typeof raw === 'string' ? raw : ((raw as { title?: string }).title || slug);
                      const isConfirming = confirmingDeleteSlug === slug;
                      const isDeleting = deletingSlug === slug;
                      return (
                        <div
                          key={slug || i}
                          style={{
                            borderRadius: '6px',
                            border: '0.5px solid rgba(172, 142, 102, 0.3)',
                            background: '#d0cbb82',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <div
                            onClick={() => onOpenServerArticle?.(slug)}
                            style={{ flex: 1, minWidth: 0, padding: '8px 10px', cursor: 'pointer' }}
                          >
                            <p style={{ margin: 0, fontSize: '10px', color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {title}
                            </p>
                          </div>
                          {onDeleteServerArticle && (
                            <button
                              disabled={isDeleting}
                              onClick={() => {
                                if (isConfirming) {
                                  handleDelete(slug);
                                } else {
                                  setConfirmingDeleteSlug(slug);
                                  setTimeout(() => setConfirmingDeleteSlug((s) => s === slug ? null : s), 3000);
                                }
                              }}
                              style={{
                                flexShrink: 0,
                                padding: '4px 8px',
                                marginRight: '6px',
                                border: isConfirming ? '0.5px solid rgba(180,30,30,0.4)' : 'none',
                                borderRadius: '4px',
                                background: isConfirming ? 'rgba(180,30,30,0.08)' : 'transparent',
                                color: isConfirming ? '#B3261E' : '#8a7a6a',
                                fontFamily: 'IBM Plex Mono, monospace',
                                fontSize: '9px',
                                cursor: isDeleting ? 'default' : 'pointer',
                              }}
                            >
                              {isDeleting ? '…' : isConfirming ? 'Löschen?' : '×'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, paddingTop: '6px' }}>
                    {hasServerCachePath && serverLocalCachePath ? (
                      <button
                        title="Im Finder öffnen"
                        onClick={(e) => { e.stopPropagation(); revealItemInDir(serverLocalCachePath); }}
                        style={{
                          background: 'none', border: 'none', padding: '5px 7px', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px',
                          color: '#1a1a1a', opacity: 0.7, borderRadius: '1px',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(172,142,102,0.12)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.background = 'none'; }}
                      >
                        <FontAwesomeIcon icon={faFolderOpen} style={{ fontSize: '9px' }} />
                        Im Finder 
                      </button>
                    ) : <span />}
                    <div style={{ fontSize: '9px', color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', opacity: 0.7 }}>
                      Klicken zum Öffnen →
                    </div>
                  </div>
                </div>
              ) : (
              <>
              <button
                onClick={() => activeProjectPath && onSelectProjectPath(activeProjectPath)}
                disabled={!activeProjectPath}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  minHeight: '320px',
                  borderRadius: '0 12px 12px 0',
                  padding: '18px 18px',
                  textAlign: 'left',
                  borderTop: '1px solid #b8b0a0',
                  borderRight: '1px solid #b8b0a0',
                  borderBottom: '1px solid #b8b0a0',
                  borderLeft: 'none',
                  background: '#e8e3d8',
                  cursor: activeProjectPath ? 'pointer' : 'not-allowed',
                  opacity: activeProjectPath ? 1 : 0.6,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  gap: '16px',
                  boxShadow: '4px 4px 20px rgba(0,0,0,0.25)',
                  transition: 'opacity 0.2s',
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: '9px',
                      color: '#3e362c',
                      fontFamily: 'IBM Plex Mono, monospace',
                      margin: '0 0 2px 0',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}
                  >
                    Aktuelles Projekt
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <FontAwesomeIcon
                      icon={activeProjectIsCloud ? faCloud : activeProjectIsWeb ? faGlobe : faFolderOpen}
                      style={{ color: '#3e362c', fontSize: '16px' }}
                    />
                    <span
                      style={{
                        fontSize: '15px',
                        color: '#1a1a1a',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontWeight: '500',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {activeProjectName}
                    </span>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid rgba(172, 142, 102, 0.3)', paddingTop: '12px', flex: 1 }}>
                  <p
                    style={{
                      fontSize: '10px',
                      color: '#5a5040',
                      fontFamily: 'IBM Plex Mono, monospace',
                      margin: 0,
                      lineHeight: 1.5,
                      wordBreak: 'break-all',
                    }}
                  >
                    {activeProjectIsCloud
                      ? `Cloud-Projekt (${activeProjectName})`
                      : activeProjectIsWeb
                        ? (activeProjectWebType === 'directory' ? 'Ordner-Projekt (Browser)' : 'Virtuelles Projekt (Browser)')
                        : (activeProjectPath || 'Noch kein Projekt ausgewählt')}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {activeProjectPath && !activeProjectIsWeb && !activeProjectIsCloud ? (
                    <button
                      title="Im Finder öffnen"
                      onClick={(e) => { e.stopPropagation(); revealItemInDir(activeProjectPath); }}
                      style={{
                        background: 'none', border: 'none', padding: '2px 4px', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px',
                        color: '#1a1a1a', opacity: 0.7, borderRadius: '4px',
                      }}
                      onMouseEnter={(e) => { e.stopPropagation(); e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(172,142,102,0.12)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.background = 'none'; }}
                    >
                      <FontAwesomeIcon icon={faFolderOpen} style={{ fontSize: '9px' }} />
                      Im Finder
                    </button>
                  ) : <span />}
                  <div style={{ fontSize: '9px', color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', opacity: 0.7 }}>
                    Klicken zum Öffnen →
                  </div>
                </div>
              </button>

              {cardHovered && hasDocs && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: '0 12px 12px 0',
                    background: 'linear-gradient(180deg, #EDE6D8 0%, #E7DFD0 100%)',
                    border: '1px solid #b8b0a0',
                    borderLeft: 'none',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    overflow: 'hidden',
                    zIndex: 25,
                  }}
                >
                  <p
                    style={{
                      fontSize: '10px',
                      color: '#7a7060',
                      fontFamily: 'IBM Plex Mono, monospace',
                      margin: '0 0 4px 0',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}
                  >
                    Projekt Dokumente
                  </p>
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {projectDocs.map((doc) => (
                      <div
                        key={doc.id}
                        onMouseEnter={() => setHoveredProjectDocId(doc.id)}
                        onMouseLeave={() => setHoveredProjectDocId(null)}
                        style={{
                          position: 'relative',
                          borderRadius: '6px',
                          border: `0.5px solid ${hoveredProjectDocId === doc.id ? 'rgba(172,142,102,0.6)' : 'rgba(172, 142, 102, 0.3)'}`,
                          background: hoveredProjectDocId === doc.id ? 'rgba(172,142,102,0.08)' : 'transparent',
                          padding: '8px 32px 8px 10px',
                          cursor: 'pointer',
                          transition: 'border-color 0.15s, background 0.15s',
                        }}
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenDashboardDocument?.(doc);
                        }}
                      >
                        <p style={{ margin: 0, fontSize: '10px', color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.name}
                        </p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '8px', color: '#7a7060', fontFamily: 'IBM Plex Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.path ? doc.path.split(/[\\/]/).slice(-2).join('/') : (doc.subtitle || 'Dokument')}
                        </p>
                        {(hoveredProjectDocId === doc.id || deletingDocId === doc.id) && onDeleteDocument && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setDeletingDocId(doc.id);
                              await onDeleteDocument(doc);
                              setDeletingDocId(null);
                            }}
                            title="Dokument löschen"
                            style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#b55', fontSize: 11, padding: '4px 5px' }}
                          >
                            {deletingDocId === doc.id ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faTrash} />}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                    {activeProjectPath && !activeProjectIsWeb && !activeProjectIsCloud ? (
                      <button
                        title="Im Finder öffnen"
                        onClick={(e) => { e.stopPropagation(); revealItemInDir(activeProjectPath); }}
                        style={{
                          background: 'none', border: 'none', padding: '2px 4px', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px',
                          color: '#1a1a1a', opacity: 0.7, borderRadius: '4px',
                        }}
                        onMouseEnter={(e) => { e.stopPropagation(); e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(172,142,102,0.12)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.background = 'none'; }}
                      >
                        <FontAwesomeIcon icon={faFolderOpen} style={{ fontSize: '9px' }} />
                        Im Finder
                      </button>
                    ) : <span />}
                    <div style={{ fontSize: '9px', color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', opacity: 0.7 }}>
                      Klicken zum Öffnen →
                    </div>
                  </div>
                </div>
              )}
              </>
              )}
            </div>


            <button
              onClick={onPickProject}
              style={{
                width: '36px',
                height: '40px',
                borderRadius: '0 10px 10px 0',
                borderTop: '1px dashed #AC8E66',
                borderRight: '1px dashed #AC8E66',
                borderBottom: '1px dashed #AC8E66',
                borderLeft: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                alignSelf: 'flex-start',
                marginLeft: '-1px',
                marginTop: '12px',
              }}
            >
              <FontAwesomeIcon icon={faPlus} style={{ color: '#AC8E66', fontSize: '12px' }} />
            </button>
          </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '12px',
              }}
            >
              <div style={{ gridColumn: '1 / -1', height: '30px', visibility: 'hidden' }} aria-hidden="true">
                Projekt wählen
              </div>
              <ActionTile
                title="Schreiben"
                description="Im Editor starten und Content vorbereiten"
                actionLabel="Schreiben starten →"
                icon={faFileLines}
                onClick={() => {
                  // If a blog tab is active, write into that blog
                  if (selectedTab.startsWith('blog:') && onStartWritingToBlog) {
                    const blogId = selectedTab.slice(5);
                    const activeBlog = blogs.find((b) => b.id === blogId);
                    if (activeBlog) { onStartWritingToBlog(activeBlog); return; }
                  }
                  onStartWriting();
                }}
              />
              <ActionTile
                title="Projekt + Dokumente"
                description="Dateien laden, suchen und per Drag & Drop importieren"
                actionLabel="Projektmappe öffnen →"
                icon={faFolderOpen}
                onClick={() => {
                  if (selectedTab === 'server' && serverLocalCachePath) {
                    onOpenDocuments(serverLocalCachePath);
                  } else if (selectedTab.startsWith('blog:')) {
                    const blogId = selectedTab.slice(5);
                    const activeBlog = blogs.find((b) => b.id === blogId);
                    if (activeBlog?.path) { onOpenDocuments(activeBlog.path); return; }
                    onOpenDocuments();
                  } else {
                    onOpenDocuments(activeProjectPath ?? undefined);
                  }
                }}
              />
            <ActionTile
              title="Planen"
              description="Beiträge strukturieren und in den Planer übernehmen"
              actionLabel="Planer öffnen →"
              icon={faClock}
              onClick={onOpenPlanner}
            />
            <ActionTile
              title="Kalender"
              description="Veröffentlichungen im Kalender verwalten"
              actionLabel="Kalender öffnen →"
              icon={faCalendarDays}
              onClick={onOpenCalendar}
            />
          </div>
        </div>

        <div>
          <p style={{ 
            paddingTop: '20px',
            margin: '0 0 10px 0', 
            fontSize: '12px', 
            color: '#3e362c', 
            fontFamily: 'IBM Plex Mono, monospace' 
            }}
            >
            Letzte Dokumente
          </p>
          {recent.length === 0 ? (
            <div
              style={{
                borderRadius: '8px',
                border: '0.5px solid #2F2F2F',
                padding: '12px',
                color: '#3e362c',
               
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
              }}
            >
              Noch keine letzten Dokumente.
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px', maxHeight: '240px', 
              overflowY: 'auto',
              
              paddingRight: '4px' }}>
              {recent.map((doc) => (
                <div
                  key={doc.id}
                  onMouseEnter={() => setHoveredDocId(doc.id)}
                  onMouseLeave={() => setHoveredDocId(null)}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <button
                    onClick={() => { onOpenDashboardDocument?.(doc); }}
                    style={{
                      flex: 1,
                      borderRadius: '5px',
                      border: hoveredDocId === doc.id ? '1px solid #AC8E66' : '0.5px solid #3A3A3A',
                      background: hoveredDocId === doc.id ? 'rgba(205,195,176,0.12)' : 'rgba(255,255,255,0.01)',
                      padding: '10px 12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                       
                      gap: '12px',
                      transform: hoveredDocId === doc.id ? 'translateX(2px)' : 'translateX(0)',
                      transition: 'transform 0.15s ease, border-color 0.15s ease, background 0.15s ease',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ 
                        color: '#3e362c', 
                        fontFamily: 'IBM Plex Mono, monospace', 
                        fontSize: '11px', overflow: 'hidden', 
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.name}
                      </div>
                      <div style={{ 
                        color: '#888', 
                        fontFamily: 'IBM Plex Mono, monospace', 
                        fontSize: '9px', overflow: 'hidden', 
                        padding: '10px',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.subtitle || 'Dokument öffnen'}
                      </div>
                    </div>
                    <div style={{ color: '#3e362c', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', flexShrink: 0 }}>
                      {doc.updatedAt
                        ? new Date(doc.updatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : '—'}
                    </div>
                  </button>
                  {(hoveredDocId === doc.id || deletingDocId === doc.id) && onDeleteDocument && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setDeletingDocId(doc.id);
                        await onDeleteDocument(doc);
                        setDeletingDocId(null);
                      }}
                      title="Dokument löschen"
                      style={{ background: 'transparent', border: '0.5px solid #3a3a3a', borderRadius: 5, cursor: 'pointer', color: '#c06060', fontSize: 11, padding: '9px 10px', flexShrink: 0, transition: 'color 0.15s' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#e07070'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#c06060'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#c06060'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#3a3a3a'; }}
                    >
                      {deletingDocId === doc.id ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faTrash} />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {onOpenServerArticle && cloudLoggedIn && showServerTab && (serverArticles === undefined || serverArticles !== null) && (
          <div style={{ marginTop: '24px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#3e362c', fontFamily: 'IBM Plex Mono, monospace' }}>
              Server Artikel{serverName ? ` · ${serverName}` : ''}
              {serverArticlesLoading && <span style={{ color: '#666', marginLeft: '8px' }}>Lädt…</span>}
            </p>
            <div
              style={{
                margin: '-4px 0 10px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: hasServerCachePath ? '#1F8A41' : '#B3261E',
                  boxShadow: hasServerCachePath
                    ? '0 0 0 2px rgba(31,138,65,0.14)'
                    : '0 0 0 2px rgba(179,38,30,0.14)',
                }}
              />
              <span
                title={hasServerCachePath ? (serverLocalCachePath ?? '') : 'Nicht gesetzt'}
                style={{
                  fontSize: '12px',
                  color: hasServerCachePath ? '#1F8A41' : '#cf6679',
                  fontFamily: 'IBM Plex Mono, monospace',
                  maxWidth: '620px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {hasServerCachePath
                  ? `Lokaler Cache: ${serverLocalCachePath}`
                  : 'Lokaler Cache fehlt – bitte in API-Einstellungen setzen.'}
              </span>
              {!hasServerCachePath && (
                <button
                  onClick={() => onOpenApiSettings?.()}
                  style={{
                    border: '0.5px solid rgba(179,38,30,0.45)',
                    borderRadius: '4px',
                    background: 'rgba(179,38,30,0.08)',
                    color: '#cf6679',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '9px',
                    padding: '4px 8px',
                    cursor: onOpenApiSettings ? 'pointer' : 'not-allowed',
                    opacity: onOpenApiSettings ? 1 : 0.6,
                  }}
                  disabled={!onOpenApiSettings}
                >
                  API öffnen
                </button>
              )}
            </div>
            {serverError && (
              <div
                style={{
                  borderRadius: '10px',
                  border: '0.5px solid rgba(179,38,30,0.35)',
                  background: 'rgba(179,38,30,0.06)',
                  padding: '12px',
                  color: '#cf6679',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  flexWrap: 'wrap',
                  marginBottom: '8px',
                }}
              >
                <span>{serverError}</span>
                <button
                  onClick={() => onOpenApiSettings?.()}
                  style={{
                    border: '0.5px solid rgba(179,38,30,0.45)',
                    borderRadius: '8px',
                    background: 'rgba(179,38,30,0.08)',
                    color: '#cf6679',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '9px',
                    padding: '5px 9px',
                    cursor: onOpenApiSettings ? 'pointer' : 'not-allowed',
                    opacity: onOpenApiSettings ? 1 : 0.6,
                  }}
                  disabled={!onOpenApiSettings}
                >
                  API jetzt öffnen
                </button>
              </div>
            )}
            {!serverArticles && !serverArticlesLoading && !serverError && (
              <div style={{ 
              borderRadius: '5px', 
              border: '0.5px solid #2F2F2F', 
              padding: '12px', 
              color: '#7E7E7E', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px' }}>
                Keine Server-URL konfiguriert.
              </div>
            )}
            {serverArticles && serverArticles.length === 0 && !serverArticlesLoading && (
              <div style={{ borderRadius: '10px', border: '0.5px solid #2F2F2F', padding: '12px', color: '#7E7E7E', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px' }}>
                Keine Artikel gefunden.
              </div>
            )}
            {serverArticles && serverArticles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {serverArticles.map((raw, i) => {
                  const slug = typeof raw === 'string' ? raw : ((raw as { slug?: string }).slug ?? '');
                  const title = typeof raw === 'string' ? raw : ((raw as { title?: string }).title || slug);
                  const date = typeof raw === 'string' ? '' : ((raw as { date?: string }).date ?? '');
                  const isConfirming = confirmingDeleteSlug === slug;
                  const isDeleting = deletingSlug === slug;
                  return (
                    <div
                      key={slug || i}
                      onMouseEnter={() => setHoveredArticleSlug(slug || String(i))}
                      onMouseLeave={() => setHoveredArticleSlug(null)}
                      style={{
                        borderRadius: '5px',
                         padding: '5px 5px 0 0',
                        border: hoveredArticleSlug === (slug || String(i)) ? '1px solid #4caf50' : '0.5px solid #3A3A3A',
                        background: hoveredArticleSlug === (slug || String(i)) ? 'rgba(205,195,176,0.12)' : 'rgba(255,255,255,0.01)',
                        display: 'flex',
                        alignItems: 'center',
                        transform: hoveredArticleSlug === (slug || String(i)) ? 'translateX(5px)' : 'translateX(0)',
                        transition: 'transform 0.15s ease, border-color 0.15s ease, background 0.15s ease',
                      }}
                    >
                      <button
                        onClick={() => onOpenServerArticle(slug)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          padding: '10px 12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          background: 'transparent',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#3e362c', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {title}
                          </div>
                          {title !== slug && slug && (
                            <div style={{ color: '#d0cbb8', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px' }}>
                              {slug}
                            </div>
                          )}
                        </div>
                        <div style={{ color: '#7E7E7E', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', flexShrink: 0 }}>
                          {date || '—'}
                        </div>
                      </button>
                      {onDeleteServerArticle && (
                        <button
                          disabled={isDeleting}
                          onClick={() => {
                            if (isConfirming) {
                              setDeletingSlug(slug);
                              void onDeleteServerArticle(slug).finally(() => { setDeletingSlug(null); setConfirmingDeleteSlug(null); });
                            } else {
                              setConfirmingDeleteSlug(slug);
                              setTimeout(() => setConfirmingDeleteSlug((s) => s === slug ? null : s), 3000);
                            }
                          }}
                          style={{
                            flexShrink: 0,
                            padding: '6px 12px',
                            marginRight: '8px',
                            border: isConfirming ? '0.5px solid rgba(180,30,30,0.4)' : '0.5px solid #3A3A3A',
                            borderRadius: '6px',
                            background: isConfirming ? 'rgba(180,30,30,0.1)' : 'transparent',
                            color: isConfirming ? '#cf6679' : '#666',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '10px',
                            cursor: isDeleting ? 'default' : 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isDeleting ? '…' : isConfirming ? 'Löschen?' : '×'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {deleteToast && (
              <div style={{
                marginTop: '10px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: deleteToast.ok ? 'rgba(31,111,63,0.12)' : 'rgba(180,30,30,0.1)',
                border: `0.5px solid ${deleteToast.ok ? 'rgba(31,138,65,0.4)' : 'rgba(180,30,30,0.4)'}`,
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '10px',
                color: deleteToast.ok ? '#1F6F3F' : '#B3261E',
              }}>
                {deleteToast.msg}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
