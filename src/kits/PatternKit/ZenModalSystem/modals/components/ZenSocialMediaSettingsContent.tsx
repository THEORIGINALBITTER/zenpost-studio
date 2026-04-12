import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTwitter,
  faReddit,
  faLinkedin,
  faDev,
  faMedium,
  faGithub,
} from '@fortawesome/free-brands-svg-icons';
import { faEye, faEyeSlash, faGlobe, faFolderOpen, faPlus, faTrash, faArrowRight, faCheck, faArrowsRotate, faPen, faTriangleExclamation, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { isTauri } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { readDir, readTextFile, writeTextFile, exists, mkdir, remove } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { loadZenStudioSettings, saveZenStudioSettings, exportZenStudioSettingsAsFile, importZenStudioSettingsFromFile, type BlogConfig } from '../../../../../services/zenStudioSettingsService';
import { ftpUpload } from '../../../../../services/ftpService';
import { getPhpUploadScript, getHtaccessContent } from '../../../../../services/phpBlogService';
import {
  loadSocialConfig,
  saveSocialConfig,
  SocialMediaConfig,
  validateTwitterConfig,
  validateRedditConfig,
  validateLinkedInConfig,
  validateDevToConfig,
  validateMediumConfig,
  validateGitHubConfig,
} from '../../../../../services/socialMediaService';
import { ZenInfoBox } from '../../components/ZenInfoBox';

type TabType = 'twitter' | 'reddit' | 'linkedin' | 'devto' | 'medium' | 'github' | 'blog';

interface ZenSocialMediaSettingsContentProps {
  initialTab?: TabType;
  showMissingConfigHint?: boolean;
  missingPlatformLabel?: string;
}

// Reusable Input Field Component (keep outside to avoid remount on each render)
const InputField = ({
  type,
  value,
  onChange,
  placeholder,
  allowReveal = false,
}: {
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  allowReveal?: boolean;
}) => {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';
  const canReveal = allowReveal || isPassword;
  const inputType = canReveal ? (reveal ? 'text' : 'password') : type;

  return (
    <div style={{ position: 'relative' }}>
      {canReveal && (
        <button
          type="button"
          onClick={() => setReveal((prev) => !prev)}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            color: reveal ? '#AC8E66' : '#1a1a1a',
            cursor: 'pointer',
            padding: 0,
            boxShadow: 'none'
          }}
          aria-label={reveal ? 'Inhalt verbergen' : 'Inhalt anzeigen'}
        >
          <FontAwesomeIcon icon={reveal ? faEyeSlash : faEye} />
        </button>
      )}
      <input
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '14px 16px',
          paddingRight: canReveal ? 34 : 16,
          border: '1px solid #1a1a1a',
          borderRadius: '8px',
          backgroundColor: 'transparent',
          boxShadow: 'none',
          fontSize: '9px',
          transition: 'border-color 0.2s',
          boxSizing: 'border-box',
          fontFamily: 'IBM Plex Mono, monospace',
          color: '#1a1a1a',
          outline: 'none',
        }}
      />
    </div>
  );
};

export const ZenSocialMediaSettingsContent = ({
  initialTab,
  showMissingConfigHint = false,
  missingPlatformLabel,
}: ZenSocialMediaSettingsContentProps) => {
  const [config, setConfig] = useState<SocialMediaConfig>({});
  const [activeTab, setActiveTab] = useState<TabType>('twitter');
  const [linkedInWizardStep, setLinkedInWizardStep] = useState<1 | 2 | 3>(1);
  const [linkedInDetecting, setLinkedInDetecting] = useState(false);
  const [linkedInDetectMsg, setLinkedInDetectMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [blogs, setBlogs] = useState<BlogConfig[]>([]);
  const [scanningBlogId, setScanningBlogId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{ id: string; count: number } | null>(null);
  const [ftpTestState, setFtpTestState] = useState<Record<string, 'idle' | 'testing' | 'ok' | 'error'>>({});
  const [ftpTestMsg, setFtpTestMsg] = useState<Record<string, string>>({});
  const [phpTestState, setPhpTestState] = useState<Record<string, 'idle' | 'testing' | 'ok' | 'error'>>({});
  const [phpTestMsg, setPhpTestMsg] = useState<Record<string, string>>({});
  const [wizardStep, setWizardStep] = useState<'hidden' | 'name' | 'folder'>('hidden');
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);
  const [wizardName, setWizardName] = useState('');
  const [wizardTagline, setWizardTagline] = useState('');
  const [wizardAuthor, setWizardAuthor] = useState('');
  const [wizardPath, setWizardPath] = useState('');
  const [wizardSiteUrl, setWizardSiteUrl] = useState('');
  const [wizardSiteType, setWizardSiteType] = useState<'blog' | 'docs'>('blog');

  useEffect(() => {
    const loadedConfig = loadSocialConfig();
    setConfig(loadedConfig);
    setBlogs(loadZenStudioSettings().blogs ?? []);
    setIsHydrated(true);
    // Jump to step 3 if LinkedIn is already configured
    if (loadedConfig.linkedin?.accessToken && loadedConfig.linkedin?.personId) {
      setLinkedInWizardStep(3);
    }
  }, []);

  const handleDownloadPhpPackage = async (blog?: BlogConfig) => {
    const content = getPhpUploadScript(blog?.phpApiKey || undefined);
    const htaccess = getHtaccessContent();

    // Build ZIP with both files
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    zip.file('zenpost-upload.php', content);
    zip.file('.htaccess', htaccess);
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    if (isTauri()) {
      try {
        const { save: saveDialog } = await import('@tauri-apps/plugin-dialog');
        const { writeFile: writeTauri } = await import('@tauri-apps/plugin-fs');
        const filePath = await saveDialog({
          defaultPath: 'zenpost-php-paket.zip',
          filters: [{ name: 'ZIP', extensions: ['zip'] }],
          title: 'PHP Paket speichern',
        });
        if (filePath) {
          const buf = await zipBlob.arrayBuffer();
          await writeTauri(filePath, new Uint8Array(buf));
        }
      } catch (e) {
        console.error('[PHP Download]', e);
      }
    } else {
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zenpost-php-paket.zip';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleFtpTest = async (blog: BlogConfig) => {
    if (!blog.ftpHost || !blog.ftpUser || !blog.ftpPassword) return;
    setFtpTestState((p) => ({ ...p, [blog.id]: 'testing' }));
    setFtpTestMsg((p) => ({ ...p, [blog.id]: '' }));
    const setErr = (msg: string) => {
      setFtpTestState((p) => ({ ...p, [blog.id]: 'error' }));
      setFtpTestMsg((p) => ({ ...p, [blog.id]: msg }));
    };
    try {
      const testFileName = `zen-ftp-test-${Date.now()}.txt`;
      const postsDir = await join(blog.path, 'posts');
      if (!(await exists(postsDir))) await mkdir(postsDir, { recursive: true });
      const localPath = await join(postsDir, testFileName);

      try {
        await writeTextFile(localPath, `ZenPost FTP Test – ${new Date().toISOString()}`);
      } catch (e) {
        setErr(`Lokale Testdatei konnte nicht erstellt werden: ${e instanceof Error ? e.message : String(e)}`);
        return;
      }

      let uploadErr: string | null = null;
      try {
        uploadErr = await ftpUpload(localPath, testFileName, {
          host: blog.ftpHost,
          user: blog.ftpUser,
          password: blog.ftpPassword,
          remotePath: (blog.ftpRemotePath ?? '/public_html/blog').replace(/\/$/, '') + '/posts/',
          protocol: blog.ftpProtocol ?? 'ftp',
        });
      } catch (e) {
        await remove(localPath).catch(() => {});
        setErr(`FTP-Befehl fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
        return;
      }

      await remove(localPath).catch(() => {});
      if (uploadErr) {
        setErr(uploadErr);
      } else {
        setFtpTestState((p) => ({ ...p, [blog.id]: 'ok' }));
        setFtpTestMsg((p) => ({ ...p, [blog.id]: 'Verbindung erfolgreich!' }));
      }
    } catch (e) {
      const msg = e instanceof Error
        ? e.message
        : typeof e === 'string'
          ? e
          : (typeof e === 'object' && e !== null)
            ? (JSON.stringify(e) || 'Objekt-Fehler')
            : `Fehler: ${String(e)}`;
      console.error('[FTP Test]', e);
      setFtpTestState((p) => ({ ...p, [blog.id]: 'error' }));
      setFtpTestMsg((p) => ({ ...p, [blog.id]: msg }));
    }
  };

  const handlePhpTest = async (blog: BlogConfig) => {
    if (!blog.phpApiUrl || !blog.phpApiKey) return;
    setPhpTestState((p) => ({ ...p, [blog.id]: 'testing' }));
    setPhpTestMsg((p) => ({ ...p, [blog.id]: '' }));
    try {
      // GET zenpost-upload.php → returns manifest JSON (no auth needed)
      const response = await fetch(blog.phpApiUrl, { method: 'GET' });
      if (!response.ok) {
        setPhpTestState((p) => ({ ...p, [blog.id]: 'error' }));
        setPhpTestMsg((p) => ({ ...p, [blog.id]: `Server antwortete mit ${response.status}` }));
        return;
      }
      const json = await response.json() as { site?: unknown; posts?: unknown };
      if ('posts' in json) {
        const count = Array.isArray(json.posts) ? json.posts.length : 0;
        const info = count > 0 ? ` — ${count} Posts` : '';
        setPhpTestState((p) => ({ ...p, [blog.id]: 'ok' }));
        setPhpTestMsg((p) => ({ ...p, [blog.id]: `Server erreichbar${info}` }));
      } else {
        setPhpTestState((p) => ({ ...p, [blog.id]: 'error' }));
        setPhpTestMsg((p) => ({ ...p, [blog.id]: 'Unbekannte Server-Antwort' }));
      }
    } catch (e) {
      setPhpTestState((p) => ({ ...p, [blog.id]: 'error' }));
      setPhpTestMsg((p) => ({ ...p, [blog.id]: 'Endpoint nicht erreichbar' }));
    }
  };

  const saveBlogs = (updated: BlogConfig[]) => {
    setBlogs(updated);
    const settings = loadZenStudioSettings();
    saveZenStudioSettings({ ...settings, blogs: updated });
  };

  const handleDeleteBlog = (id: string) => {
    saveBlogs(blogs.filter((b) => b.id !== id));
  };

  const parseFrontmatter = (raw: string): Record<string, unknown> => {
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};
    const fm = match[1];
    const result: Record<string, unknown> = {};
    const str = (pattern: RegExp) => fm.match(pattern)?.[1] ?? undefined;
    const title = str(/^title:\s*"([^"]*)"$/m) ?? str(/^title:\s*'([^']*)'$/m) ?? str(/^title:\s*(.+)$/m);
    if (title) result.title = title.replace(/^["']|["']$/g, '');
    const subtitle = str(/^subtitle:\s*"([^"]*)"$/m) ?? str(/^subtitle:\s*(.+)$/m);
    if (subtitle) result.subtitle = subtitle.replace(/^["']|["']$/g, '');
    const date = str(/^date:\s*"([^"]*)"$/m) ?? str(/^date:\s*(.+)$/m);
    if (date) result.date = date.replace(/^["']|["']$/g, '');
    const cover = str(/^coverImage:\s*"([^"]*)"$/m) ?? str(/^coverImage:\s*(.+)$/m);
    if (cover) result.coverImage = cover.replace(/^["']|["']$/g, '');
    const rt = str(/^readingTime:\s*(\d+)$/m);
    if (rt) result.readingTime = parseInt(rt, 10);
    const tagsMatch = fm.match(/^tags:\s*\[([^\]]*)\]$/m);
    if (tagsMatch) result.tags = tagsMatch[1].split(',').map((t) => t.trim()).filter(Boolean);
    return result;
  };

  const handleScanBlogPosts = async (blog: BlogConfig) => {
    setScanningBlogId(blog.id);
    setScanResult(null);
    try {
      const postsDir = await join(blog.path, 'posts');
      if (!(await exists(postsDir))) { setScanResult({ id: blog.id, count: 0 }); return; }
      const entries = await readDir(postsDir);
      const mdFiles = entries.filter((e) => e.name?.endsWith('.md'));
      const scannedPosts: Record<string, unknown>[] = [];
      for (const file of mdFiles) {
        const slug = file.name!.replace(/\.md$/, '');
        const filePath = await join(postsDir, file.name!);
        try {
          const raw = await readTextFile(filePath);
          const fm = parseFrontmatter(raw);
          const wordCount = raw.replace(/^---[\s\S]*?---/, '').trim().split(/\s+/).length;
          scannedPosts.push({
            slug,
            title: fm.title ?? slug.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/-/g, ' '),
            ...(fm.subtitle ? { subtitle: fm.subtitle } : {}),
            date: fm.date ?? slug.slice(0, 10),
            tags: fm.tags ?? ['devlog'],
            readingTime: fm.readingTime ?? Math.max(1, Math.round(wordCount / 220)),
            ...(fm.coverImage ? { coverImage: fm.coverImage } : {}),
          });
        } catch { /* skip unreadable */ }
      }
      scannedPosts.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
      const manifestPath = await join(blog.path, 'manifest.json');
      let manifest: { site: Record<string, string>; posts: Array<Record<string, unknown>> } = {
        site: { title: blog.name, tagline: blog.tagline ?? '', author: blog.author ?? '', url: blog.siteUrl ?? '' },
        posts: [],
      };
      try { manifest = JSON.parse(await readTextFile(manifestPath)); } catch { /* new manifest */ }
      // Merge: scanned posts override by slug, preserve any extra fields
      const existing = new Map(manifest.posts.map((p) => [p.slug, p]));
      manifest.posts = scannedPosts.map((p) => ({ ...existing.get(p.slug as string), ...p }));
      await writeTextFile(manifestPath, JSON.stringify(manifest, null, 2));
      setScanResult({ id: blog.id, count: scannedPosts.length });
      setTimeout(() => setScanResult(null), 4000);
    } catch (err) {
      console.error('[Blog Scan]', err);
      setScanResult({ id: blog.id, count: -1 });
      setTimeout(() => setScanResult(null), 4000);
    } finally {
      setScanningBlogId(null);
    }
  };

  const handleWizardSelectFolder = async () => {
    if (!isTauri()) return;
    try {
      const selected = await openDialog({ directory: true, multiple: false });
      if (selected && typeof selected === 'string') setWizardPath(selected);
    } catch { /* cancelled */ }
  };

  const handleEditBlog = (blog: BlogConfig) => {
    setEditingBlogId(blog.id);
    setWizardName(blog.name);
    setWizardTagline(blog.tagline ?? '');
    setWizardAuthor(blog.author ?? '');
    setWizardPath(blog.path);
    setWizardSiteUrl(blog.siteUrl ?? '');
    setWizardSiteType(blog.siteType ?? 'blog');
    setWizardStep('name');
  };

  const resetWizard = () => {
    setWizardStep('hidden');
    setEditingBlogId(null);
    setWizardName('');
    setWizardTagline('');
    setWizardAuthor('');
    setWizardPath('');
    setWizardSiteUrl('');
    setWizardSiteType('blog');
  };

  const handleWizardSave = () => {
    if (!wizardName.trim() || !wizardPath.trim()) return;
    const blogPath = wizardPath.trim();
    const blogName = wizardName.trim();
    if (editingBlogId) {
      saveBlogs(blogs.map((b) => b.id === editingBlogId ? {
        ...b,
        name: blogName,
        tagline: wizardTagline.trim() || undefined,
        author: wizardAuthor.trim() || undefined,
        path: blogPath,
        siteUrl: wizardSiteUrl.trim() || undefined,
        siteType: wizardSiteType,
      } : b));
    } else {
      const newBlog = {
        id: `blog-${Date.now()}`,
        name: blogName,
        tagline: wizardTagline.trim() || undefined,
        author: wizardAuthor.trim() || undefined,
        path: blogPath,
        siteUrl: wizardSiteUrl.trim() || undefined,
        siteType: wizardSiteType,
      };
      saveBlogs([...blogs, newBlog]);
      // Auto-create posts/ folder + manifest.json for new blogs
      if (isTauri()) {
        (async () => {
          try {
            const postsDir = await join(blogPath, 'posts');
            if (!(await exists(postsDir))) await mkdir(postsDir, { recursive: true });
            const manifestPath = await join(blogPath, 'manifest.json');
            if (!(await exists(manifestPath))) {
              await writeTextFile(manifestPath, JSON.stringify({
                site: { title: blogName, tagline: wizardTagline.trim() || '', author: wizardAuthor.trim() || '', url: wizardSiteUrl.trim() || '' },
                posts: [],
              }, null, 2));
            }
          } catch { /* ignore — user can scan later */ }
        })();
      }
    }
    resetWizard();
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Auto-save on changes
  useEffect(() => {
    if (!isHydrated) return;
    saveSocialConfig(config);
  }, [config, isHydrated]);

  const updateTwitterConfig = (field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      twitter: {
        ...prev.twitter,
        apiKey: prev.twitter?.apiKey || '',
        apiSecret: prev.twitter?.apiSecret || '',
        accessToken: prev.twitter?.accessToken || '',
        accessTokenSecret: prev.twitter?.accessTokenSecret || '',
        [field]: value,
      },
    }));
  };

  const updateRedditConfig = (field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      reddit: {
        ...prev.reddit,
        clientId: prev.reddit?.clientId || '',
        clientSecret: prev.reddit?.clientSecret || '',
        username: prev.reddit?.username || '',
        password: prev.reddit?.password || '',
        userAgent: prev.reddit?.userAgent || 'ZenPostStudio/1.0',
        [field]: value,
      },
    }));
  };

  const updateLinkedInConfig = (field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      linkedin: {
        ...prev.linkedin,
        clientId: prev.linkedin?.clientId || '',
        clientSecret: prev.linkedin?.clientSecret || '',
        accessToken: prev.linkedin?.accessToken || '',
        [field]: value,
      },
    }));
  };

  const updateDevToConfig = (_field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      devto: {
        ...prev.devto,
        apiKey: value,
      },
    }));
  };

  const updateMediumConfig = (_field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      medium: {
        ...prev.medium,
        integrationToken: value,
      },
    }));
  };

  const updateGitHubConfig = (field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      github: {
        ...prev.github,
        accessToken: prev.github?.accessToken || '',
        username: prev.github?.username || '',
        docsRepo: prev.github?.docsRepo || '',
        docsBranch: prev.github?.docsBranch || '',
        docsPath: prev.github?.docsPath || '',
        [field]: value,
      },
    }));
  };

  const tabs = [
    { id: 'twitter' as TabType, label: 'Twitter', icon: faTwitter },
    { id: 'reddit' as TabType, label: 'Reddit', icon: faReddit },
    { id: 'linkedin' as TabType, label: 'LinkedIn', icon: faLinkedin },
    { id: 'devto' as TabType, label: 'dev.to', icon: faDev },
    { id: 'medium' as TabType, label: 'Medium', icon: faMedium },
    { id: 'github' as TabType, label: 'GitHub', icon: faGithub },
    { id: 'blog' as TabType, label: 'Blog', icon: faGlobe },
  ];

  const isConfigValid = (tab: TabType): boolean => {
    switch (tab) {
      case 'twitter':
        return config.twitter ? validateTwitterConfig(config.twitter) : false;
      case 'reddit':
        return config.reddit ? validateRedditConfig(config.reddit) : false;
      case 'linkedin':
        return config.linkedin ? validateLinkedInConfig(config.linkedin) : false;
      case 'devto':
        return config.devto ? validateDevToConfig(config.devto) : false;
      case 'medium':
        return config.medium ? validateMediumConfig(config.medium) : false;
      case 'github':
        return config.github ? validateGitHubConfig(config.github) : false;
      case 'blog':
        return blogs.length > 0;
      default:
        return false;
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '32px' }}>
    <div style={{ width: '100%', maxWidth: '860px', borderRadius: '10px', backgroundColor: '#E8E1D2', border: '1px solid rgba(172,142,102,0.6)',  overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid rgba(172,142,102,0.3)', background: 'rgba(172,142,102,0.05)' }}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.12em', color: '#AC8E66', textTransform: 'uppercase', marginBottom: 4 }}>
          Media Transformation
        </div>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 400, color: '#1a1a1a' }}>
          Social Media APIs
        </div>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#777', marginTop: 3 }}>
          API-Keys sind optional — ohne APIs wird Content kopiert und manuell gepostet.
        </div>
        {showMissingConfigHint && missingPlatformLabel && (
          <div style={{ marginTop: 10 }}>
            <ZenInfoBox type="warning" title="API fehlt" description={`${missingPlatformLabel} ist noch nicht konfiguriert. Bitte füge deine API-Credentials hinzu.`} />
          </div>
        )}
      </div>

    <div style={{ padding: '0 28px 24px', fontSize: '11px' }}>

      {/* Sub-Tabs */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px', 
        marginTop: '20px', 
        marginBottom: '20px', 
        borderBottom: '1px solid rgba(172,142,102,0.3)', 
        paddingBottom: '0' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 14px',
              fontSize: '10px',
              position: 'relative',
              background: activeTab === tab.id ? 'rgba(172,142,102,0.12)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #AC8E66' : '2px solid transparent',
              marginBottom: '-1px',
              cursor: 'pointer',
              color: activeTab === tab.id ? '#AC8E66' : '#888',
              fontFamily: 'IBM Plex Mono, monospace',
              transition: 'color 0.15s',
              borderRadius: '4px 4px 0 0',
            }}
          >
            <FontAwesomeIcon icon={tab.icon} style={{ marginRight: '6px', fontSize: 10 }} />
            {tab.label}
            {isConfigValid(tab.id) && (
              <span style={{ position: 'absolute', top: '5px', right: '5px', width: '5px', height: '5px', backgroundColor: '#AC8E66', borderRadius: '50%' }} />
            )}
          </button>
        ))}
      </div>

      {/* Twitter Config */}
      {activeTab === 'twitter' && (
        <div
          style={{
            maxWidth: '560px',
            margin: '0 auto',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <InputField
              type="password"
              value={config.twitter?.apiKey || ''}
              onChange={(value) => updateTwitterConfig('apiKey', value)}
              placeholder="API Key"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <InputField
              type="password"
              value={config.twitter?.apiSecret || ''}
              onChange={(value) => updateTwitterConfig('apiSecret', value)}
              placeholder="API Secret"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <InputField
              type="password"
              value={config.twitter?.accessToken || ''}
              onChange={(value) => updateTwitterConfig('accessToken', value)}
              placeholder="Access Token"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <InputField
              type="password"
              value={config.twitter?.accessTokenSecret || ''}
              onChange={(value) => updateTwitterConfig('accessTokenSecret', value)}
              placeholder="Access Token Secret"
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <InputField
              type="password"
              value={config.twitter?.bearerToken || ''}
              onChange={(value) => updateTwitterConfig('bearerToken', value)}
              placeholder="Bearer Token (optional)"
            />
          </div>
          <ZenInfoBox
            type="warning"
            title="API Credentials"
            description="Visit developer.twitter.com to create an app and get credentials"
            links={[
              {
                label: 'Twitter Developer Portal',
                url: 'https://developer.twitter.com/en/portal/dashboard',
              },
            ]}
          />
        </div>
      )}

      {/* Reddit Config */}
      {activeTab === 'reddit' && (
        <div
          style={{
            maxWidth: '560px',
            margin: '0 auto',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <InputField
              type="password"
              value={config.reddit?.clientId || ''}
              onChange={(value) => updateRedditConfig('clientId', value)}
              placeholder="Client ID"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <InputField
              type="password"
              value={config.reddit?.clientSecret || ''}
              onChange={(value) => updateRedditConfig('clientSecret', value)}
              placeholder="Client Secret"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <InputField
              type="text"
              value={config.reddit?.username || ''}
              onChange={(value) => updateRedditConfig('username', value)}
              placeholder="Username"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <InputField
              type="password"
              value={config.reddit?.password || ''}
              onChange={(value) => updateRedditConfig('password', value)}
              placeholder="Password"
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <InputField
              type="text"
              value={config.reddit?.userAgent || 'ZenPostStudio/1.0'}
              onChange={(value) => updateRedditConfig('userAgent', value)}
              placeholder="User Agent"
            />
          </div>
          <ZenInfoBox
            type="warning"
            title="API Credentials"
            description="Visit reddit.com/prefs/apps to create an app"
            links={[
              {
                label: 'Reddit Apps',
                url: 'https://www.reddit.com/prefs/apps',
              },
            ]}
          />
        </div>
      )}

      {/* LinkedIn Wizard */}
      {activeTab === 'linkedin' && (() => {
        const li = config.linkedin;

        const detectMemberId = async () => {
          setLinkedInDetecting(true);
          setLinkedInDetectMsg(null);
          try {
            const token = li?.accessToken || '';
            const httpFetch = isTauri()
              ? (await import('@tauri-apps/plugin-http')).fetch
              : window.fetch.bind(window);

            // Try /v2/me (r_liteprofile scope)
            const meRes = await httpFetch('https://api.linkedin.com/v2/me', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (meRes.ok) {
              const d = await meRes.json();
              if (d.id) {
                updateLinkedInConfig('personId', String(d.id));
                setLinkedInDetectMsg({ ok: true, text: `Member ID erkannt: ${d.id}` });
                setLinkedInWizardStep(3);
                setLinkedInDetecting(false);
                return;
              }
            }
            // Try /v2/userinfo (openid scope)
            const uiRes = await httpFetch('https://api.linkedin.com/v2/userinfo', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (uiRes.ok) {
              const d = await uiRes.json();
              if (d.sub) {
                updateLinkedInConfig('personId', String(d.sub));
                setLinkedInDetectMsg({ ok: true, text: `Member ID erkannt: ${d.sub}` });
                setLinkedInWizardStep(3);
                setLinkedInDetecting(false);
                return;
              }
            }
            setLinkedInDetectMsg({ ok: false, text: 'Automatisch nicht möglich — bitte manuell eintragen (siehe Anleitung unten).' });
          } catch {
            setLinkedInDetectMsg({ ok: false, text: 'Netzwerkfehler beim Erkennen.' });
          }
          setLinkedInDetecting(false);
        };

        // Step indicator style
        const stepDot = (n: 1 | 2 | 3) => ({
          width: 24, height: 24, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 600,
          background: linkedInWizardStep >= n ? '#AC8E66' : 'rgba(172,142,102,0.15)',
          color: linkedInWizardStep >= n ? '#151515' : '#666',
          flexShrink: 0,
        } as React.CSSProperties);

        return (
          <div style={{ maxWidth: '540px', margin: '0 auto' }}>

            {/* Step indicator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
              {([1, 2, 3] as const).map((n, i) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" onClick={() => setLinkedInWizardStep(n)} style={{ ...stepDot(n), cursor: 'pointer', border: 'none' }}>{n}</button>
                  {i < 2 && <div style={{ flex: 1, height: 1, width: 40, background: linkedInWizardStep > n ? '#AC8E66' : 'rgba(172,142,102,0.2)' }} />}
                </div>
              ))}
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#666', marginLeft: 8 }}>
                {linkedInWizardStep === 1 ? 'App & Token' : linkedInWizardStep === 2 ? 'Member ID erkennen' : 'Fertig'}
              </span>
            </div>

            {/* Step 1: App credentials + Token */}
            {linkedInWizardStep === 1 && (
              <div>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#999', marginBottom: 20, lineHeight: 1.6 }}>
                  Erstelle eine App auf dem LinkedIn Developer Portal und generiere dort einen Access Token mit dem Scope <span style={{ color: '#AC8E66' }}>w_member_social</span>.
                </p>
                <div style={{ marginBottom: 16 }}>
                  <InputField type="password" value={li?.clientId || ''} onChange={(v) => updateLinkedInConfig('clientId', v)} placeholder="Client ID" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <InputField type="password" value={li?.clientSecret || ''} onChange={(v) => updateLinkedInConfig('clientSecret', v)} placeholder="Client Secret" />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <InputField type="password" value={li?.accessToken || ''} onChange={(v) => updateLinkedInConfig('accessToken', v)} placeholder="Access Token" />
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noreferrer"
                    style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#AC8E66', textDecoration: 'none' }}>
                    → LinkedIn Developer Portal
                  </a>
                  <div style={{ flex: 1 }} />
                  <button type="button" disabled={!li?.accessToken}
                    onClick={() => { setLinkedInWizardStep(2); setLinkedInDetectMsg(null); }}
                    style={{
                      padding: '8px 18px', borderRadius: 8,
                      border: '1px solid rgba(172,142,102,0.5)', background: 'rgba(172,142,102,0.1)',
                      color: '#AC8E66', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
                      cursor: li?.accessToken ? 'pointer' : 'not-allowed', opacity: li?.accessToken ? 1 : 0.4,
                    }}>
                    Weiter →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Detect Member ID */}
            {linkedInWizardStep === 2 && (
              <div>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#999', marginBottom: 20, lineHeight: 1.6 }}>
                  ZenPost versucht deine LinkedIn Member ID automatisch zu erkennen. Diese ID ist nötig, um Posts in deinem Namen zu veröffentlichen.
                </p>
                <button type="button" disabled={linkedInDetecting}
                  onClick={detectMemberId}
                  style={{
                    width: '100%', padding: '12px', marginBottom: 16, borderRadius: 10,
                    border: '1px solid rgba(172,142,102,0.5)', background: 'rgba(172,142,102,0.08)',
                    color: '#AC8E66', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12,
                    cursor: linkedInDetecting ? 'wait' : 'pointer',
                  }}>
                  {linkedInDetecting ? 'Erkenne Member ID …' : '⟳  Member ID automatisch erkennen'}
                </button>

                {linkedInDetectMsg && (
                  <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8,
                    border: `1px solid ${linkedInDetectMsg.ok ? 'rgba(74,163,104,0.3)' : 'rgba(232,113,113,0.3)'}`,
                    background: linkedInDetectMsg.ok ? 'rgba(74,163,104,0.06)' : 'rgba(232,113,113,0.06)',
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
                    color: linkedInDetectMsg.ok ? '#4aa368' : '#e87171' }}>
                    {linkedInDetectMsg.text}
                  </div>
                )}

                {/* Manual fallback */}
                <div style={{ marginBottom: 8 }}>
                  <InputField type="text" value={li?.personId || ''}
                    onChange={(v) => { updateLinkedInConfig('personId', v); if (v) setLinkedInDetectMsg(null); }}
                    placeholder="Member ID manuell (nur Ziffern)" />
                </div>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#555', marginBottom: 24, lineHeight: 1.6 }}>
                  Manuell finden: LinkedIn öffnen → DevTools (F12) → Network → Seite laden → Request <span style={{ color: '#AC8E66' }}>voyager/api/me</span> → Response → <span style={{ color: '#AC8E66' }}>objectUrn</span> → Zahl dahinter.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => setLinkedInWizardStep(1)}
                    style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(172,142,102,0.2)',
                      background: 'transparent', color: '#666', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, cursor: 'pointer' }}>
                    ← Zurück
                  </button>
                  <div style={{ flex: 1 }} />
                  <button type="button" disabled={!li?.personId}
                    onClick={() => setLinkedInWizardStep(3)}
                    style={{ padding: '8px 18px', borderRadius: 8,
                      border: '1px solid rgba(172,142,102,0.5)', background: 'rgba(172,142,102,0.1)',
                      color: '#AC8E66', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
                      cursor: li?.personId ? 'pointer' : 'not-allowed', opacity: li?.personId ? 1 : 0.4 }}>
                    Weiter →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Done */}
            {linkedInWizardStep === 3 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>
                  <FontAwesomeIcon icon={faCheck} style={{ color: '#4aa368' }} />
                </div>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#4aa368', marginBottom: 8 }}>
                  LinkedIn verbunden
                </p>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#666', marginBottom: 24, lineHeight: 1.6 }}>
                  Member ID: <span style={{ color: '#AC8E66' }}>{li?.personId}</span><br />
                  Token läuft in ~2 Monaten ab — dann hier neu eintragen.
                </p>
                <button type="button" onClick={() => { setLinkedInWizardStep(1); setLinkedInDetectMsg(null); }}
                  style={{ padding: '8px 14px', 
                    borderRadius: 8, 
                    border: '1px solid rgba(172,142,102,0.2)',
                    background: 'transparent', 
                    boxShadow: 'none',
                    color: '#666', 
                    fontFamily: 'IBM Plex Mono, monospace', 
                    fontSize: 11, cursor: 'pointer' }}>
                  Neu konfigurieren
                </button>
              </div>
            )}

          </div>
        );
      })()}

      {/* dev.to Config */}
      {activeTab === 'devto' && (
        <div
          style={{
            maxWidth: '560px',
            margin: '0 auto',
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <InputField
              type="password"
              value={config.devto?.apiKey || ''}
              onChange={(value) => updateDevToConfig('apiKey', value)}
              placeholder="API Key"
            />
          </div>
          <ZenInfoBox
            type="warning"
            title="API Key"
            description="Visit dev.to/settings/extensions to generate API key"
            links={[
              {
                label: 'dev.to Extensions',
                url: 'https://dev.to/settings/extensions',
              },
            ]}
          />
        </div>
      )}

      {/* Medium Config */}
      {activeTab === 'medium' && (
        <div
          style={{
            maxWidth: '560px',
            margin: '0 auto',
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <InputField
              type="password"
              value={config.medium?.integrationToken || ''}
              onChange={(value) => updateMediumConfig('integrationToken', value)}
              placeholder="Integration Token"
            />
          </div>
          <ZenInfoBox
            type="warning"
            title="Integration Token"
            description="Visit medium.com/me/settings/security to generate token"
            links={[
              {
                label: 'Medium Security Settings',
                url: 'https://medium.com/me/settings/security',
              },
            ]}
          />
        </div>
      )}

      {/* GitHub Config */}
      {activeTab === 'github' && (
        <div
          style={{
            maxWidth: '560px',
            margin: '0 auto',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <InputField
              type="password"
              value={config.github?.accessToken || ''}
              onChange={(value) => updateGitHubConfig('accessToken', value)}
              placeholder="Personal Access Token"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <InputField
              type="text"
              value={config.github?.username || ''}
              onChange={(value) => updateGitHubConfig('username', value)}
              placeholder="GitHub Username"
              allowReveal
            />
          </div>

          <div
            style={{
              borderTop: '1px solid #2a2a2a',
              paddingTop: '20px',
              marginBottom: '16px',
            }}
          >
            <p style={{ margin: '0 0 14px 0', fontSize: '11px', color: '#AC8E66', fontFamily: 'IBM Plex Mono, monospace' }}>
              Docs Repository
            </p>
            <div style={{ marginBottom: '14px' }}>
              <InputField
                type="text"
                value={config.github?.docsRepo || ''}
                onChange={(value) => updateGitHubConfig('docsRepo', value)}
                placeholder="Repository (z.B. my-docs)"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <InputField
                type="text"
                value={config.github?.docsBranch || ''}
                onChange={(value) => updateGitHubConfig('docsBranch', value)}
                placeholder="Branch (Standard: main)"
              />
              <InputField
                type="text"
                value={config.github?.docsPath || ''}
                onChange={(value) => updateGitHubConfig('docsPath', value)}
                placeholder="Ordner (z.B. docs/)"
              />
            </div>
          </div>

          <ZenInfoBox
            type="warning"
            title="Fine-Grained Personal Access Token empfohlen"
            description="Fine-Grained PAT: github.com/settings/personal-access-tokens → Repository wählen → Contents: Read & Write aktivieren. Classic PAT: 'repo' Scope benötigt."
            links={[
              {
                label: 'Fine-Grained Token erstellen',
                url: 'https://github.com/settings/personal-access-tokens/new',
              },
            ]}
          />
        </div>
      )}
      {/* Blog Config */}
      {activeTab === 'blog' && (
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>

          {/* Blog List */}
          {blogs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {blogs.map((blog) => (
                <div
                  key={blog.id}
                  style={{
                    position: 'relative', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 14px', border: '1px solid rgba(172,142,102,0.4)',
                    borderRadius: '8px', backgroundColor: 'rgba(172,142,102,0.05)',
                  }}
                >
                  <FontAwesomeIcon icon={faGlobe} style={{ color: '#AC8E66', fontSize: '13px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#333', fontWeight: 500 }}>
                      {blog.name}
                    </div>
                    {blog.tagline && (
                      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#666', marginTop: '1px', fontStyle: 'italic' }}>
                        {blog.tagline}
                      </div>
                    )}
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#888', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {blog.path}
                    </div>
                    {blog.siteUrl && (
                      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', color: '#AC8E66', marginTop: '2px' }}>
                        {blog.siteUrl}
                      </div>
                    )}
                    {/* Deploy type selector */}
                    <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {(['none', 'git', 'ftp', 'php-api'] as const).filter((type) => !(type === 'php-api' && blog.siteType === 'docs')).map((type) => {
                        const labels = { none: 'Nur lokal', git: 'Git + Server', ftp: 'FTP/SFTP', 'php-api': 'PHP Upload' };
                        const current = blog.deployType ?? (blog.gitAutoPush ? 'git' : 'none');
                        const isActive = current === type;
                        return (
                          <button
                            key={type}
                            onClick={() => saveBlogs(blogs.map((b) => b.id === blog.id ? { ...b, deployType: type as BlogConfig['deployType'], gitAutoPush: type === 'git' } : b))}
                            style={{
                              padding: '3px 8px', border: `1px solid ${isActive ? '#AC8E66' : 'rgba(172,142,102,0.3)'}`,
                              borderRadius: '4px', background: isActive ? 'rgba(172,142,102,0.15)' : 'transparent',
                              cursor: 'pointer', 
                              fontFamily: 'IBM Plex Mono, monospace', 
                                boxShadow: 'none',
                              fontSize: '8px',
                              color: isActive ? '#AC8E66' : '#888',

                            }}
                          >
                            {labels[type]}
                          </button>
                        );
                      })}
                    </div>
                    {/* FTP fields */}
                    {(blog.deployType === 'ftp') && (
                      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {/* Protocol selector */}
                        <div style={{ display: 'flex', gap: '5px', marginBottom: '2px' }}>
                          {(['ftp', 'ftps', 'sftp'] as const).map((proto) => {
                            const isActive = (blog.ftpProtocol ?? 'ftp') === proto;
                            const labels = { ftp: 'FTP', ftps: 'FTPS', sftp: 'SFTP (SSH)' };
                            return (
                              <button
                                key={proto}
                                onClick={() => saveBlogs(blogs.map((b) => b.id === blog.id ? { ...b, ftpProtocol: proto } : b))}
                                style={{
                                  padding: '3px 8px', border: `1px solid ${isActive ? '#AC8E66' : 'rgba(172,142,102,0.3)'}`,
                                  borderRadius: '4px', background: isActive ? 'rgba(172,142,102,0.15)' : 'transparent',
                                  cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px',
                                  color: isActive ? '#AC8E66' : '#888',
                                }}
                              >
                                {labels[proto]}
                              </button>
                            );
                          })}
                        </div>
                        {[
                          { key: 'ftpHost', placeholder: (blog.ftpProtocol === 'sftp' ? 'SFTP Host (z.B. meinserver.de)' : 'FTP Host (z.B. meinserver.de)') },
                          { key: 'ftpUser', placeholder: 'FTP Benutzername' },
                          { key: 'ftpPassword', placeholder: 'FTP Passwort', isPassword: true },
                          { key: 'ftpRemotePath', placeholder: 'Blog Root auf Server (z.B. /public_html/blog oder /zenpostapp)' },
                        ].map(({ key, placeholder, isPassword }) => (
                          <input
                            key={key}
                            type={isPassword ? 'password' : 'text'}
                            value={(blog as unknown as Record<string, unknown>)[key] as string ?? ''}
                            onChange={(e) => saveBlogs(blogs.map((b) => b.id === blog.id ? { ...b, [key]: e.target.value } : b))}
                            placeholder={placeholder}
                            style={{
                              width: '100%', padding: '6px 10px', border: '1px solid rgba(172,142,102,0.4)',
                              borderRadius: '5px', background: 'transparent', fontSize: '9px', boxSizing: 'border-box',
                              fontFamily: 'IBM Plex Mono, monospace', color: '#333', outline: 'none',
                            }}
                          />
                        ))}
                        {/* FTP Test Button */}
                        {isTauri() && blog.ftpHost && blog.ftpUser && blog.ftpPassword && (
                          <div style={{ marginTop: '6px', display: 'flex', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => handleFtpTest(blog)}
                              disabled={ftpTestState[blog.id] === 'testing'}
                              style={{
                                padding: '4px 12px', border: '1px solid rgba(172,142,102,0.6)',
                                borderRadius: '5px', background: 'transparent', cursor: ftpTestState[blog.id] === 'testing' ? 'default' : 'pointer',
                                fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', color: '#AC8E66',
                                opacity: ftpTestState[blog.id] === 'testing' ? 0.6 : 1,
                              }}
                            >
                              <FontAwesomeIcon icon={faArrowsRotate} style={{ marginRight: '5px', animation: ftpTestState[blog.id] === 'testing' ? 'spin 1s linear infinite' : 'none' }} />
                              {ftpTestState[blog.id] === 'testing' ? 'Teste...' : 'FTP Verbindung testen'}
                            </button>
                            {ftpTestState[blog.id] === 'ok' && (
                              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', color: '#1F8A41' }}>
                                <FontAwesomeIcon icon={faCheck} style={{ marginRight: '4px' }} />
                                {ftpTestMsg[blog.id]}
                              </span>
                            )}
                            {ftpTestState[blog.id] === 'error' && (
                              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', color: '#B3261E', flex: 1 }}>
                                {ftpTestMsg[blog.id]}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Web-Hint: FTP/SFTP nur in Desktop */}
                    {!isTauri() && blog.deployType === 'ftp' && (
                      <div style={{ marginTop: '8px', padding: '8px 10px', borderRadius: '6px', background: 'rgba(172,142,102,0.08)', border: '1px solid rgba(172,142,102,0.3)' }}>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', color: '#AC8E66', fontWeight: 500, marginBottom: '4px' }}>
                          FTP/SFTP ist nur in der Desktop App verfügbar.
                        </div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', color: '#666', lineHeight: 1.5 }}>
                          Für die Web Version: Wechsle zu <strong>PHP Upload</strong> — lade einmalig ein PHP-Skript auf deinen Server, danach funktioniert der Upload auch im Browser.
                        </div>
                      </div>
                    )}
                    {/* PHP API fields */}
                    {blog.deployType === 'php-api' && (
                      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>

                        {/* Warning: nur für Post-basierte Blogs */}
                        {blog.siteType === 'docs' && (
                          <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(200,80,60,0.08)', border: '1px solid rgba(200,80,60,0.35)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <FontAwesomeIcon icon={faTriangleExclamation} style={{ color: '#c8503c', marginTop: '2px', flexShrink: 0 }} />
                            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#c8503c', lineHeight: 1.5 }}>
                              <strong>PHP Upload ist für Post-basierte Blogs.</strong><br />
                              Dieser Blog ist als <em>Docs-Site</em> markiert — PHP Upload erwartet <code>posts/*.md</code> + <code>manifest.json</code>. Für Docs-Sites verwende FTP/SFTP.
                            </div>
                          </div>
                        )}
                        {blog.siteType !== 'docs' && (
                          <div style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(172,142,102,0.05)', border: '1px solid rgba(172,142,102,0.2)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <FontAwesomeIcon icon={faCircleInfo} style={{ color: '#AC8E66', marginTop: '2px', flexShrink: 0, fontSize: '11px' }} />
                            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#6b6560', lineHeight: 1.5 }}>
                              PHP Upload ist für <strong style={{ color: '#AC8E66' }}>Post-basierte Blogs</strong> (MD-Artikel + manifest.json).<br />
                              Nicht geeignet für Docs-Sites oder statische HTML-Projekte — dafür FTP/SFTP verwenden.
                            </div>
                          </div>
                        )}

                        {/* Step-by-step instructions */}
                        <div style={{ padding: '10px 12px', borderRadius: '6px', background: 'rgba(172,142,102,0.07)', border: '1px solid rgba(172,142,102,0.25)' }}>
                          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: '#AC8E66', fontWeight: 600, marginBottom: '6px', letterSpacing: '0.05em' }}>
                            EINRICHTUNG — EINMALIG
                          </div>
                          {[
                            { step: '1', text: 'Wähle einen geheimen API Key (z.B. "meinKey123") und trage ihn unten ein.' },
                            { step: '2', text: 'Lade das PHP Paket herunter — 2 Dateien: zenpost-upload.php + .htaccess (Key ist eingetragen).' },
                            { step: '3', text: 'Lade BEIDE Dateien direkt in das Blog-Hauptverzeichnis hoch (z.B. /zenpostapp/). NICHT in Unterordner!' },
                            { step: '4', text: 'Trage die vollständige URL unten ein (z.B. https://meinserver.de/zenpostapp/zenpost-upload.php).' },
                            { step: '5', text: 'Fertig — "Auf Server speichern" lädt Posts + Titelbilder hoch. Bilder landen automatisch in _assets/ auf dem Server und werden als URL im manifest verlinkt.' },
                          ].map(({ step, text }) => (
                            <div key={step} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#1a1a1a', fontWeight: 700, flexShrink: 0, width: '12px' }}>{step}.</span>
                              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#1a1a1a', lineHeight: 1.5 }}>{text}</span>
                            </div>
                          ))}

                          {/* Titelbilder-Hinweis */}
                          <div style={{ marginTop: '10px', padding: '6px 8px', background: 'transparent', border: '1px solid rgba(172,142,102,0.3)', borderRadius: '4px' }}>
                            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#1a1a1a', fontWeight: 700, marginBottom: '3px' }}>TITELBILDER</div>
                            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#1a1a1a', lineHeight: 1.5 }}>
                              Bild per Drag &amp; Drop in die Post-Metadaten ziehen. Beim Upload auf den Server wird das Bild automatisch in <span style={{ color: '#AC8E66', }}>_assets/</span> gespeichert und die URL im manifest.json verlinkt — kein manuelles Hochladen nötig.
                            </div>
                          </div>
                        </div>

                        <input
                          type="password"
                          value={blog.phpApiKey ?? ''}
                          onChange={(e) => saveBlogs(blogs.map((b) => b.id === blog.id ? { ...b, phpApiKey: e.target.value } : b))}
                          placeholder="API Key (selbst gewählt — merke ihn dir)"
                          style={{ width: '100%', 
                            padding: '6px 10px', 
                              boxShadow: 'none',
                           
                            border: '1px solid rgba(172,142,102,0.4)', borderRadius: '5px', background: 'transparent', fontSize: '9px', boxSizing: 'border-box', fontFamily: 'IBM Plex Mono, monospace', color: '#333', outline: 'none' }}
                        />

                        <button
                          onClick={() => handleDownloadPhpPackage(blog)}
                          style={{ alignSelf: 'flex-start', 
                            padding: '5px 14px', 
                          
                            borderRadius: '5px', 
                            boxShadow: 'none',
                            border: '0.5px solid #1a1a1a',
                            background: 'transparent', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', color: '#1a1a1a', fontWeight: 600 }}
                        >
                          PHP Paket herunterladen
                        </button>

                        <input
                          type="text"
                          value={blog.phpApiUrl ?? ''}
                          onChange={(e) => saveBlogs(blogs.map((b) => b.id === blog.id ? { ...b, phpApiUrl: e.target.value } : b))}
                          placeholder="Upload URL (z.B. https://meinserver.de/zenpostapp/zenpost-upload.php)"
                          style={{ width: '100%', padding: '6px 10px', 
                            border: '1px solid rgba(172,142,102,0.4)', 
                              boxShadow: 'none',
                           
                            borderRadius: '5px', background: 'transparent', 
                            fontSize: '9px', boxSizing: 'border-box', 
                            fontFamily: 'IBM Plex Mono, monospace', color: '#333', outline: 'none' }}
                        />

                        {/* PHP Server testen */}
                        {blog.phpApiUrl && blog.phpApiKey && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',  }}>
                            <button
                              onClick={() => handlePhpTest(blog)}
                              disabled={phpTestState[blog.id] === 'testing'}
                              style={{
                                padding: '5px 12px',  boxShadow: 'none',
                            border: '0.5px solid #1a1a1a',
                                borderRadius: '5px', background: 'transparent',
                                cursor: phpTestState[blog.id] === 'testing' ? 'default' : 'pointer',
                                fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', color: '#1a1a1a', fontWeight: 600,
                                opacity: phpTestState[blog.id] === 'testing' ? 0.6 : 1,
                              }}
                            >
                              <FontAwesomeIcon icon={faArrowsRotate} style={{ marginRight: '5px', animation: phpTestState[blog.id] === 'testing' ? 'spin 1s linear infinite' : 'none' }} />
                              {phpTestState[blog.id] === 'testing' ? 'Teste…' : 'Server testen'}
                            </button>
                            {phpTestState[blog.id] === 'ok' && (
                              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', color: '#1F8A41', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FontAwesomeIcon icon={faCheck} />
                                {phpTestMsg[blog.id]}
                              </span>
                            )}
                            {phpTestState[blog.id] === 'error' && (
                              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', color: '#B3261E', flex: 1 }}>
                                {phpTestMsg[blog.id]}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Lokaler Ordner für Desktop — Posts werden hier gespeichert/geöffnet */}
                        {isTauri() && (
                          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <input
                              type="text"
                              value={blog.path ?? ''}
                              onChange={(e) => saveBlogs(blogs.map((b) => b.id === blog.id ? { ...b, path: e.target.value } : b))}
                              placeholder="Lokaler Ordner für Posts (z.B. /Users/.../Blog/zenpostAPP)"
                              style={{ flex: 1, 
                                padding: '6px 10px', 
                                  boxShadow: 'none',
                           
                                border: '1px solid rgba(172,142,102,0.4)', borderRadius: '5px', background: 'transparent', fontSize: '9px', boxSizing: 'border-box', fontFamily: 'IBM Plex Mono, monospace', color: '#333', outline: 'none' }}
                            />
                            <button
                              onClick={async () => {
                                try {
                                  const { open: openDialog } = await import('@tauri-apps/plugin-dialog');
                                  const selected = await openDialog({ directory: true, title: 'Lokalen Blog-Ordner wählen' });
                                  if (selected) saveBlogs(blogs.map((b) => b.id === blog.id ? { ...b, path: selected as string } : b));
                                } catch { /* ignore */ }
                              }}
                              style={{ padding: '6px 10px', 
                                border: '1px solid rgba(172,142,102,0.4)', 
                                  boxShadow: 'none',
                                borderRadius: '5px', background: 'transparent', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', color: '#1a1a1a', whiteSpace: 'nowrap' }}
                            >
                              Ordner wählen
                            </button>
                          </div>
                        )}

                        {blog.phpApiUrl && blog.phpApiKey && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', color: '#1F8A41' }}>
                            <FontAwesomeIcon icon={faCheck} />
                            {blog.path ? 'Konfiguriert — Web + Desktop App bereit' : 'Konfiguriert (Web) — Lokalen Ordner für Desktop-Bearbeitung angeben'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleEditBlog(blog)}
                    style={{
                      background: 'transparent', 
                      boxShadow: 'none',
                    border: '0.5px solid #1a1a1a',
                      cursor: 'pointer',
                      color: '#aaa', padding: '4px 6px', flexShrink: 0,
                    }}
                    title="Blog bearbeiten"
                  >
                    <FontAwesomeIcon icon={faPen} style={{ fontSize: '11px' }} />
                  </button>
                  {isTauri() && (
                    <button
                      onClick={() => handleScanBlogPosts(blog)}
                      disabled={scanningBlogId === blog.id}
                      style={{
                        background: 'transparent', 
                       boxShadow: 'none',
                    border: '0.5px solid #1a1a1a',
                        cursor: scanningBlogId === blog.id ? 'default' : 'pointer',
                        color: scanResult?.id === blog.id && scanResult.count >= 0 ? '#AC8E66' : '#aaa',
                        padding: '4px 6px', flexShrink: 0, opacity: scanningBlogId === blog.id ? 0.5 : 1,
                      }}
                      title="Bestehende Posts einlesen & manifest.json aufbauen"
                    >
                      <FontAwesomeIcon
                        icon={faArrowsRotate}
                        style={{ fontSize: '11px', animation: scanningBlogId === blog.id ? 'spin 1s linear infinite' : 'none' }}
                      />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteBlog(blog.id)}
                    style={{
                      background: 'transparent', 
                      
                      cursor: 'pointer',
                      border: '0.5px solid #1a1a1a',
                       boxShadow: 'none',
                      color: '#aaa', padding: '4px 6px', flexShrink: 0,
                    }}
                    title="Blog entfernen"
                  >
                    <FontAwesomeIcon icon={faTrash} style={{ fontSize: '11px' }} />
                  </button>
                  {scanResult?.id === blog.id && (
                    <div style={{ position: 'absolute', right: 0, bottom: '-20px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: scanResult.count >= 0 ? '#AC8E66' : '#e05c5c', whiteSpace: 'nowrap' }}>
                      {scanResult.count >= 0 ? `✓ ${scanResult.count} Posts importiert` : '✗ Scan fehlgeschlagen'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Wizard */}
          {wizardStep === 'hidden' && (
            <button
              onClick={() => setWizardStep('name')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                width: '100%', padding: '12px 14px',
                border: '1px dashed rgba(172,142,102,0.5)', borderRadius: '8px',
                background: 'transparent', cursor: 'pointer',
                color: '#AC8E66', 
                  boxShadow: 'none',
                fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px',
                marginBottom: '20px',
              }}
            >
              <FontAwesomeIcon icon={faPlus} />
              Blog hinzufügen
            </button>
          )}

          {/* Export / Import Config */}
          {wizardStep === null && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button
                onClick={exportZenStudioSettingsAsFile}
                style={{
                  flex: 1, padding: '9px 12px', border: '1px solid rgba(172,142,102,0.3)',
                  borderRadius: '6px', background: 'transparent', cursor: 'pointer',
                  color: '#888', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px',
                }}
              >
                ↓ Config exportieren
              </button>
              <label style={{
                flex: 1, padding: '9px 12px', border: '1px solid rgba(172,142,102,0.3)',
                borderRadius: '6px', background: 'transparent', cursor: 'pointer',
                color: '#888', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px',
                textAlign: 'center',
              }}>
                ↑ Config importieren
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      await importZenStudioSettingsFromFile(file);
                      setBlogs(loadZenStudioSettings().blogs ?? []);
                    } catch (err) {
                      console.error('Import fehlgeschlagen:', err);
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          )}

          {wizardStep === 'name' && (
            <div style={{ padding: '16px', border: '1px solid rgba(172,142,102,0.5)', borderRadius: '8px', marginBottom: '20px', backgroundColor: 'rgba(172,142,102,0.04)' }}>
              <p style={{ margin: '0 0 14px 0', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#1a1a1a' }}>
                {editingBlogId ? 'Bearbeiten — Blog-Identität' : 'Schritt 1 / 2 — Blog-Identität'}
              </p>
              {/* Site-Typ Auswahl */}
              <p style={{ margin: '0 0 6px 0', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>Typ *</p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                {(['blog', 'docs'] as const).map((t) => {
                  const isActive = wizardSiteType === t;
                  const label = t === 'blog' ? 'Blog / Posts' : 'Docs / Statische Site';
                  const desc = t === 'blog' ? 'MD-Artikel, manifest.json, PHP Upload möglich' : 'HTML-Build, Doku, Assets — nur FTP/Git';
                  return (
                    <button
                      key={t}
                      onClick={() => setWizardSiteType(t)}
                      style={{
                        flex: 1, 
                          boxShadow: 'none',
                        padding: '8px 10px', border: `1px solid ${isActive ? '#AC8E66' : 'rgba(172,142,102,0.3)'}`,
                        borderRadius: '6px', background: isActive ? 'rgba(172,142,102,0.12)' : 'transparent',
                        cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'left',
                      }}
                    >
                      <div style={{ fontSize: '10px',  
                          boxShadow: 'none',
                        color: isActive ? '#AC8E66' : '#555', fontWeight: 600, marginBottom: '3px' }}>{label}</div>
                      <div style={{ fontSize: '9px', color: '#888', lineHeight: 1.4 }}>{desc}</div>
                    </button>
                  );
                })}
              </div>
              {/* Name */}
              <p style={{ margin: '0 0 4px 0', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>Blog-Titel *</p>
              <input
                type="text"
                value={wizardName}
                onChange={(e) => setWizardName(e.target.value)}
                placeholder="z.B. Denis Bitter"
                autoFocus
                style={{
                  width: '100%', 
                  boxShadow: 'none',
                  padding: '9px 12px', border: '1px solid rgba(172,142,102,0.5)',
                  borderRadius: '6px', background: 'transparent', fontSize: '11px', boxSizing: 'border-box',
                  fontFamily: 'IBM Plex Mono, monospace', color: '#333', outline: 'none', marginBottom: '10px',
                }}
              />
              {/* Tagline */}
              <p style={{ margin: '0 0 4px 0', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>Tagline (optional)</p>
              <input
                type="text"
                value={wizardTagline}
                onChange={(e) => setWizardTagline(e.target.value)}
                placeholder="z.B. Building ZenPost Studio — in public"
                style={{
                  width: '100%', 
                    boxShadow: 'none',
                  padding: '9px 12px', border: '1px solid rgba(172,142,102,0.4)',
                  borderRadius: '6px', background: 'transparent', fontSize: '11px', boxSizing: 'border-box',
                  fontFamily: 'IBM Plex Mono, monospace', color: '#333', outline: 'none', marginBottom: '10px',
                }}
              />
              {/* Author */}
              <p style={{ margin: '0 0 4px 0', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>Autor (optional)</p>
              <input
                type="text"
                value={wizardAuthor}
                onChange={(e) => setWizardAuthor(e.target.value)}
                placeholder="z.B. Denis Bitter"
                onKeyDown={(e) => { if (e.key === 'Enter' && wizardName.trim()) setWizardStep('folder'); }}
                style={{
                  width: '100%', 
                    boxShadow: 'none',
                  padding: '9px 12px', border: '1px solid rgba(172,142,102,0.4)',
                  borderRadius: '6px', background: 'transparent', fontSize: '11px', boxSizing: 'border-box',
                  fontFamily: 'IBM Plex Mono, monospace', color: '#333', outline: 'none', marginBottom: '14px',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={resetWizard}
                  style={{ padding: '7px 12px', 
                      boxShadow: 'none',
                    border: '1px solid #ccc', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#777' }}
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => { if (wizardName.trim()) setWizardStep('folder'); }}
                  disabled={!wizardName.trim()}
                  style={{ display: 'flex', 
                    
                      boxShadow: 'none',
                    alignItems: 'center', gap: '6px', padding: '7px 14px', border: '1px solid rgba(172,142,102,0.6)', borderRadius: '6px', background: 'transparent', cursor: wizardName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#AC8E66', opacity: wizardName.trim() ? 1 : 0.4 }}
                >
                  Weiter <FontAwesomeIcon icon={faArrowRight} />
                </button>
              </div>
            </div>
          )}

          {wizardStep === 'folder' && (
            <div style={{ padding: '16px', border: '1px solid rgba(172,142,102,0.5)', borderRadius: '8px', marginBottom: '20px', backgroundColor: 'rgba(172,142,102,0.04)' }}>
              <p style={{ margin: '0 0 12px 0', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#AC8E66' }}>
                {editingBlogId ? `Bearbeiten — Ordner für „${wizardName}"` : `Schritt 2 / 2 — Ordner für „${wizardName}"`}
              </p>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#666', marginBottom: '12px', minHeight: '20px', wordBreak: 'break-all' }}>
                {wizardPath || 'Kein Ordner ausgewählt'}
              </div>
              {isTauri() ? (
                <button
                  onClick={handleWizardSelectFolder}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid rgba(172,142,102,0.5)', borderRadius: '6px', background: 'transparent', cursor: 'pointer', color: '#AC8E66', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', marginBottom: '12px' }}
                >
                  <FontAwesomeIcon icon={faFolderOpen} /> Ordner wählen
                </button>
              ) : (
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#999', marginBottom: '12px' }}>
                  Ordner-Auswahl nur in der Desktop-App verfügbar.
                </p>
              )}
              <div style={{ marginTop: '10px' }}>
                <p style={{ margin: '0 0 6px 0', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777' }}>
                  Website URL (optional)
                </p>
                <input
                  type="text"
                  value={wizardSiteUrl}
                  onChange={(e) => setWizardSiteUrl(e.target.value)}
                  placeholder="z.B. https://meinblog.de"
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid rgba(172,142,102,0.4)',
                    borderRadius: '6px', background: 'transparent', fontSize: '10px',
                    fontFamily: 'IBM Plex Mono, monospace', color: '#333', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  onClick={() => setWizardStep('name')}
                  style={{ padding: '7px 12px', border: '1px solid #ccc', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#777' }}
                >
                  ← Zurück
                </button>
                <button
                  onClick={handleWizardSave}
                  disabled={!wizardPath.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', border: '1px solid rgba(172,142,102,0.6)', borderRadius: '6px', background: wizardPath.trim() ? '#AC8E66' : 'transparent', cursor: wizardPath.trim() ? 'pointer' : 'not-allowed', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: wizardPath.trim() ? '#fff' : '#AC8E66', opacity: wizardPath.trim() ? 1 : 0.4 }}
                >
                  <FontAwesomeIcon icon={faCheck} /> Speichern
                </button>
              </div>
            </div>
          )}

          <ZenInfoBox
            type="info"
            title="Blog-Workflow"
            description="Content AI Studio → Export → Direkt veröffentlichen → Blog wählen. Der Post landet direkt im Ordner (posts/*.md + manifest.json)."
          />
        </div>
      )}
    </div>
    </div>
    </div>
  );
};
