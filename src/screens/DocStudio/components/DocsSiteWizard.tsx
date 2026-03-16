/**
 * DocsSiteWizard
 * Generates a self-contained GitHub Pages documentation site.
 * Paper-themed, 3-step wizard.
 */

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCheck,
  faCircleExclamation,
  faCloudArrowUp,
  faDownload,
  faGear,
  faGlobe,
  faRobot,
  faSpinner,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import { buildPages, type DocsSiteConfig } from '../../../services/docsSiteService';
import type { DocsPushSummary } from '../../../services/githubDocsService';
import { loadAIConfig, universalFetch } from '../../../services/aiService';

// ─── Styles (same constants as GitHubDocsWizard) ─────────────────────────────

const card: React.CSSProperties = {
  width: '100%',
  borderRadius: '10px',
  backgroundColor: '#E8E1D2',
  border: '1px solid rgba(172,142,102,0.6)',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  overflow: 'hidden',
};

const stepTitle: React.CSSProperties = {
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '11px',
  color: '#7a6a52',
  marginBottom: '10px',
  letterSpacing: '0.5px',
  textTransform: 'uppercase' as const,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #bfb6a5',
  background: 'rgba(255,255,255,0.6)',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '12px',
  color: '#1a1a1a',
  boxSizing: 'border-box' as const,
  outline: 'none',
};

const primaryBtn: React.CSSProperties = {
  background: '#1a1a1a',
  color: '#E8E1D2',
  border: 'none',
  borderRadius: '6px',
  padding: '8px 18px',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '12px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
};

const ghostBtn: React.CSSProperties = {
  background: 'transparent',
  color: '#7a6a52',
  border: '1px solid #bfb6a5',
  borderRadius: '6px',
  padding: '7px 14px',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '11px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
};

const hint: React.CSSProperties = {
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10px',
  color: '#8a7a62',
  lineHeight: 1.6,
};

const divider: React.CSSProperties = {
  borderTop: '1px solid rgba(172,142,102,0.25)',
  margin: '16px 0',
};

// ─── Color presets ────────────────────────────────────────────────────────────

const COLOR_PRESETS = ['#AC8E66', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b'];

// ─── Component ────────────────────────────────────────────────────────────────

interface DocsSiteWizardProps {
  projectPath: string | null;
  projectName: string;
  docFiles: Array<{ name: string; path: string }>;
  onBack: () => void;
  onSaveLocally: (config: DocsSiteConfig) => Promise<void>;
  onPushToGitHub?: (config: DocsSiteConfig) => Promise<DocsPushSummary>;
  onOpenSettings: () => void;
}

// Helper: derive slug from title
function toSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Doc Structure Templates ─────────────────────────────────────────────────

interface StructureTemplate {
  id: string;
  label: string;
  description: string;
  files: Array<{ relPath: string; title: string }>;
}

const STRUCTURE_TEMPLATES: StructureTemplate[] = [
  {
    id: 'open-source',
    label: 'Open Source',
    description: 'README, Guide, API, Changelog',
    files: [
      { relPath: 'docs/getting-started.md', title: 'Getting Started' },
      { relPath: 'docs/installation.md', title: 'Installation' },
      { relPath: 'docs/guide/usage.md', title: 'Usage' },
      { relPath: 'docs/guide/configuration.md', title: 'Configuration' },
      { relPath: 'docs/api/reference.md', title: 'API Reference' },
      { relPath: 'docs/contributing.md', title: 'Contributing' },
      { relPath: 'docs/changelog.md', title: 'Changelog' },
    ],
  },
  {
    id: 'api-docs',
    label: 'API Docs',
    description: 'Endpoints, Auth, Errors',
    files: [
      { relPath: 'docs/overview.md', title: 'Overview' },
      { relPath: 'docs/authentication.md', title: 'Authentication' },
      { relPath: 'docs/endpoints/users.md', title: 'Users' },
      { relPath: 'docs/endpoints/resources.md', title: 'Resources' },
      { relPath: 'docs/errors.md', title: 'Error Codes' },
      { relPath: 'docs/rate-limiting.md', title: 'Rate Limiting' },
      { relPath: 'docs/changelog.md', title: 'Changelog' },
    ],
  },
  {
    id: 'product',
    label: 'Produkt',
    description: 'Intro, Features, FAQ',
    files: [
      { relPath: 'docs/intro.md', title: 'Introduction' },
      { relPath: 'docs/guide/setup.md', title: 'Setup' },
      { relPath: 'docs/guide/features.md', title: 'Features' },
      { relPath: 'docs/guide/integrations.md', title: 'Integrations' },
      { relPath: 'docs/faq.md', title: 'FAQ' },
      { relPath: 'docs/changelog.md', title: 'Changelog' },
    ],
  },
  {
    id: 'sdk',
    label: 'SDK / Library',
    description: 'Quickstart, Reference, Examples',
    files: [
      { relPath: 'docs/quickstart.md', title: 'Quickstart' },
      { relPath: 'docs/reference/classes.md', title: 'Classes' },
      { relPath: 'docs/reference/methods.md', title: 'Methods' },
      { relPath: 'docs/reference/types.md', title: 'Types' },
      { relPath: 'docs/examples/basic.md', title: 'Basic Example' },
      { relPath: 'docs/examples/advanced.md', title: 'Advanced Example' },
      { relPath: 'docs/migration.md', title: 'Migration Guide' },
    ],
  },
];

// ─── Ollama helpers ───────────────────────────────────────────────────────────

/** Returns { model, baseUrl } from AI settings if provider is ollama and model is configured, else null */
async function checkOllamaAvailable(): Promise<{ model: string; baseUrl: string } | null> {
  try {
    const config = loadAIConfig();
    const baseUrl = (config.baseUrl?.replace(/\/$/, '') || 'http://127.0.0.1:11434');
    if (config.provider !== 'ollama') return null;
    const model = config.model?.trim();
    if (!model) return null;
    // Verify reachability
    const res = await universalFetch(`${baseUrl}/api/tags`);
    if (!res.ok) return null;
    return { model, baseUrl };
  } catch {
    return null;
  }
}

async function generateStructureWithOllama(
  model: string,
  projectName: string,
  description: string,
  baseUrl = 'http://127.0.0.1:11434',
): Promise<Array<{ relPath: string; title: string }>> {
  const prompt = `You are a technical documentation expert. Generate a docs folder structure for a project.

Project: "${projectName}"
Description: "${description}"

Return ONLY a JSON array, no explanation. Each item: {"relPath": "docs/path/file.md", "title": "Page Title"}
Rules:
- All paths start with "docs/"
- Use subfolders for grouped content (e.g. "docs/api/endpoints.md")
- 5-10 files total
- Titles in the same language as the description
- No index.md or README.md

JSON array:`;

  const res = await universalFetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = await res.json();
  const raw: string = data.response ?? '';

  // Extract JSON array from response
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Kein gültiges JSON in der Antwort');
  const parsed = JSON.parse(match[0]) as Array<{ relPath?: string; title?: string }>;
  return parsed
    .filter((p) => p.relPath && p.title && p.relPath.startsWith('docs/'))
    .map((p) => ({ relPath: p.relPath!, title: p.title! }));
}

export function DocsSiteWizard({
  projectPath,
  projectName: initialProjectName,
  docFiles,
  onBack,
  onSaveLocally,
  onPushToGitHub,
  onOpenSettings,
}: DocsSiteWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 — Branding
  const [projectName, setProjectName] = useState(initialProjectName || '');
  const [tagline, setTagline] = useState('');
  const [accentColor, setAccentColor] = useState('#AC8E66');
  const [githubPagesUrl, setGithubPagesUrl] = useState('');

  // Step 2 — only files inside docs/ folder, with relative paths
  const docsPrefix = projectPath ? `${projectPath}/docs/` : null;
  const docsFiles = docFiles
    .filter((f) => docsPrefix && f.path.startsWith(docsPrefix) && /\.(md|mdx)$/i.test(f.name))
    .map((f) => ({
      name: f.name,
      relPath: f.path.replace(projectPath ? `${projectPath}/` : '', ''),
      path: f.path,
    }));

  const [selectedRelPaths, setSelectedRelPaths] = useState<Set<string>>(
    () => new Set(docsFiles.map((f) => f.relPath)),
  );

  // New pages created by user (+) or from template/AI
  const [newPages, setNewPages] = useState<Array<{ title: string; relPath: string }>>([]);
  const [newPageInput, setNewPageInput] = useState('');
  const [newPageInputVisible, setNewPageInputVisible] = useState(false);

  // Template & Ollama
  const [ollamaModel, setOllamaModel] = useState<{ model: string; baseUrl: string } | null | 'checking'>('checking');
  const [ollamaPrompt, setOllamaPrompt] = useState('');
  const [ollamaLoading, setOllamaLoading] = useState(false);
  const [ollamaError, setOllamaError] = useState<string | null>(null);
  const [showOllamaInput, setShowOllamaInput] = useState(false);

  useEffect(() => {
    checkOllamaAvailable().then((model) => setOllamaModel(model));
  }, []);

  const applyStructure = (files: Array<{ relPath: string; title: string }>) => {
    const existingPaths = new Set([...docsFiles.map(f => f.relPath), ...newPages.map(p => p.relPath)]);
    const toAdd = files.filter((f) => !existingPaths.has(f.relPath));
    setNewPages((prev) => [...prev, ...toAdd]);
    setSelectedRelPaths((prev) => new Set([...prev, ...files.map(f => f.relPath)]));
  };

  const handleOllamaGenerate = async () => {
    if (!ollamaModel || ollamaModel === 'checking' || typeof ollamaModel !== 'object') return;
    setOllamaLoading(true);
    setOllamaError(null);
    try {
      const files = await generateStructureWithOllama(ollamaModel.model, projectName, ollamaPrompt, ollamaModel.baseUrl);
      applyStructure(files);
      setOllamaPrompt('');
      setShowOllamaInput(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setOllamaError(msg.toLowerCase().includes('abort') ? 'Zeitüberschreitung — Ollama antwortet zu langsam' : msg);
    } finally {
      setOllamaLoading(false);
    }
  };

  const addNewPage = () => {
    const title = newPageInput.trim();
    if (!title) return;
    const slug = toSlug(title);
    const relPath = `docs/${slug}.md`;
    if ([...docsFiles.map(f => f.relPath), ...newPages.map(p => p.relPath)].includes(relPath)) return;
    setNewPages((prev) => [...prev, { title, relPath }]);
    setSelectedRelPaths((prev) => new Set([...prev, relPath]));
    setNewPageInput('');
    setNewPageInputVisible(false);
  };

  // Step 3 — Generate
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<DocsPushSummary | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  const buildConfig = (): DocsSiteConfig => {
    const selectedExisting = docsFiles
      .filter((f) => selectedRelPaths.has(f.relPath))
      .map((f) => ({ name: f.name, relPath: f.relPath }));
    const selectedNew = newPages
      .filter((p) => selectedRelPaths.has(p.relPath))
      .map((p) => ({ name: `${toSlug(p.title)}.md`, relPath: p.relPath }));

    return {
      projectName: projectName.trim() || 'Docs',
      tagline: tagline.trim(),
      accentColor,
      githubPagesUrl: githubPagesUrl.trim(),
      pages: buildPages([...selectedExisting, ...selectedNew]),
      newPages: newPages.filter((p) => selectedRelPaths.has(p.relPath)),
    };
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveOk(false);
    setSaveError(null);
    try {
      await onSaveLocally(buildConfig());
      setSaveOk(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err) || 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const handlePush = async () => {
    if (!onPushToGitHub) return;
    setPushing(true);
    setPushResult(null);
    setPushError(null);
    try {
      const result = await onPushToGitHub(buildConfig());
      setPushResult(result);
    } catch (err) {
      setPushError(err instanceof Error ? err.message : String(err) || 'Push fehlgeschlagen');
    } finally {
      setPushing(false);
    }
  };

  const canProceedStep1 = projectName.trim().length > 0;
  const canProceedStep2 = selectedRelPaths.size > 0 || newPages.length > 0;

  return (
    <div style={card}>
      <div style={{ padding: '20px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <button onClick={onBack} style={ghostBtn}>
            <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '10px' }} />
            Zurück
          </button>
          <FontAwesomeIcon icon={faGlobe} style={{ fontSize: '18px', color: '#1a1a1a' }} />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px', color: '#1a1a1a', fontWeight: 600 }}>
            Docs-Website
          </span>
          {/* Step indicator */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
            {([1, 2, 3] as const).map((s) => (
              <div
                key={s}
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: step >= s ? '#1a1a1a' : 'rgba(0,0,0,0.1)',
                  color: step >= s ? '#E8E1D2' : '#8a7a62',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* ── Step 1: Branding ── */}
        {step === 1 && (
          <>
            <div style={stepTitle}>1. Branding</div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ ...hint, display: 'block', marginBottom: '5px' }}>Projektname</label>
              <input
                style={inputStyle}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Mein Projekt"
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ ...hint, display: 'block', marginBottom: '5px' }}>Tagline (optional)</label>
              <input
                style={inputStyle}
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Eine kurze Beschreibung deines Projekts"
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ ...hint, display: 'block', marginBottom: '8px' }}>Akzentfarbe</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAccentColor(c)}
                    title={c}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: c,
                      border: accentColor === c ? '2px solid #1a1a1a' : '2px solid transparent',
                      cursor: 'pointer',
                      padding: 0,
                      outline: 'none',
                      boxShadow: accentColor === c ? '0 0 0 2px #E8E1D2, 0 0 0 4px #1a1a1a' : 'none',
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  title="Eigene Farbe"
                  style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #bfb6a5', cursor: 'pointer', padding: '2px', background: 'none' }}
                />
                <span style={{ ...hint, color: '#5a4a30' }}>{accentColor}</span>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ ...hint, display: 'block', marginBottom: '5px' }}>GitHub Pages URL (optional)</label>
              <input
                style={inputStyle}
                value={githubPagesUrl}
                onChange={(e) => setGithubPagesUrl(e.target.value)}
                placeholder="https://username.github.io/mein-projekt"
              />
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              style={{ ...primaryBtn, opacity: canProceedStep1 ? 1 : 0.45 }}
            >
              Weiter →
            </button>
          </>
        )}

        {/* ── Step 2: Pages — tree view by folder ── */}
        {step === 2 && (() => {
          // Group existing files by section (subfolder under docs/)
          const getSection = (relPath: string) => {
            const parts = relPath.replace(/^docs\//, '').split('/');
            return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
          };
          const sectionLabel = (key: string) =>
            key ? key.split('/').map(s => s.replace(/^\d+[-_]/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(' / ') : 'docs/';

          const sections = new Map<string, typeof docsFiles>();
          for (const f of docsFiles) {
            const s = getSection(f.relPath);
            if (!sections.has(s)) sections.set(s, []);
            sections.get(s)!.push(f);
          }
          // Sort: root first, then alphabetical
          const sortedSections = [...sections.keys()].sort((a, b) => a === '' ? -1 : b === '' ? 1 : a.localeCompare(b));

          return (
            <>
              <div style={stepTitle}>2. Seiten auswählen</div>
              <div style={{ ...hint, marginBottom: '10px', color: '#5a4a30' }}>
                Dateien aus <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 5px', borderRadius: '3px' }}>docs/</code> — Unterordner werden als Sections gruppiert.
              </div>

              {/* ── Template presets ── */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ ...hint, fontSize: '9px', color: '#7a6a52', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
                  Vorlage wählen
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {STRUCTURE_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      title={tpl.description}
                      onClick={() => applyStructure(tpl.files)}
                      style={{
                        ...ghostBtn,
                        fontSize: '10px',
                        padding: '5px 10px',
                        display: 'flex', alignItems: 'center', gap: '5px',
                      }}
                    >
                      {tpl.label}
                    </button>
                  ))}

                  {/* Ollama KI-Button */}
                  {ollamaModel && ollamaModel !== 'checking' && typeof ollamaModel === 'object' && !showOllamaInput && (
                    <button
                      onClick={() => setShowOllamaInput(true)}
                      style={{
                        ...ghostBtn,
                        fontSize: '10px',
                        padding: '5px 10px',
                        borderColor: 'rgba(139,92,246,0.4)',
                        color: '#7c3aed',
                        display: 'flex', alignItems: 'center', gap: '5px',
                      }}
                    >
                      <FontAwesomeIcon icon={faRobot} style={{ fontSize: '9px' }} />
                      KI-Vorschlag
                    </button>
                  )}
                  {ollamaModel === 'checking' && (
                    <span style={{ ...hint, fontSize: '9px', color: '#b0a080', alignSelf: 'center' }}>
                      <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '4px' }} />
                      Ollama…
                    </span>
                  )}
                </div>

                {/* Ollama prompt input */}
                {showOllamaInput && ollamaModel && ollamaModel !== 'checking' && typeof ollamaModel === 'object' && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ ...hint, fontSize: '9px', color: '#7c3aed', marginBottom: '4px' }}>
                      <FontAwesomeIcon icon={faRobot} style={{ marginRight: '4px' }} />
                      {ollamaModel.model} — Beschreibe dein Projekt
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        style={{ ...inputStyle, flex: 1, fontSize: '11px', borderColor: 'rgba(139,92,246,0.3)' }}
                        value={ollamaPrompt}
                        onChange={(e) => setOllamaPrompt(e.target.value)}
                        placeholder="z.B. REST API für eine Fitness-App mit iOS SDK"
                        onKeyDown={(e) => { if (e.key === 'Enter' && ollamaPrompt.trim()) handleOllamaGenerate(); if (e.key === 'Escape') setShowOllamaInput(false); }}
                        autoFocus
                        disabled={ollamaLoading}
                      />
                      <button
                        onClick={handleOllamaGenerate}
                        disabled={!ollamaPrompt.trim() || ollamaLoading}
                        style={{
                          ...primaryBtn,
                          background: '#7c3aed',
                          opacity: ollamaPrompt.trim() && !ollamaLoading ? 1 : 0.45,
                          padding: '8px 12px',
                        }}
                      >
                        {ollamaLoading
                          ? <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '11px' }} />
                          : <FontAwesomeIcon icon={faWandMagicSparkles} style={{ fontSize: '11px' }} />}
                      </button>
                      <button onClick={() => { setShowOllamaInput(false); setOllamaError(null); }} style={ghostBtn}>×</button>
                    </div>
                    {ollamaError && (
                      <div style={{ ...hint, color: '#b45309', marginTop: '4px', fontSize: '10px' }}>
                        <FontAwesomeIcon icon={faCircleExclamation} style={{ marginRight: '4px' }} />
                        {ollamaError}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid rgba(172,142,102,0.2)', margin: '0 0 10px' }} />

              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                <button onClick={() => setSelectedRelPaths(new Set([...docsFiles.map(f => f.relPath), ...newPages.map(p => p.relPath)]))} style={ghostBtn}>Alle</button>
                <button onClick={() => setSelectedRelPaths(new Set())} style={ghostBtn}>Keine</button>
                <span style={{ ...hint, marginLeft: 'auto' }}>{selectedRelPaths.size} / {docsFiles.length + newPages.length}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '10px', maxHeight: '260px', overflowY: 'auto' }}>
                {docsFiles.length === 0 && newPages.length === 0 && (
                  <div style={{ ...hint, color: '#8a7a62', padding: '8px 0' }}>
                    Noch keine Dateien in <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 4px', borderRadius: '3px' }}>docs/</code>
                  </div>
                )}

                {/* Existing files grouped by section */}
                {sortedSections.map((sectionKey) => {
                  const files = sections.get(sectionKey)!;
                  const allChecked = files.every(f => selectedRelPaths.has(f.relPath));
                  const someChecked = files.some(f => selectedRelPaths.has(f.relPath));
                  return (
                    <div key={sectionKey}>
                      {/* Section header — click toggles all in section */}
                      <div
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '5px 8px', borderRadius: '5px',
                          background: 'rgba(172,142,102,0.08)',
                          cursor: 'pointer', marginBottom: '2px',
                        }}
                        onClick={() => setSelectedRelPaths(prev => {
                          const next = new Set(prev);
                          if (allChecked) files.forEach(f => next.delete(f.relPath));
                          else files.forEach(f => next.add(f.relPath));
                          return next;
                        })}
                      >
                        <FontAwesomeIcon icon={faGear} style={{ fontSize: '8px', color: '#AC8E66', opacity: 0.6 }} />
                        <span style={{ ...hint, fontSize: '9px', color: '#7a6a52', textTransform: 'uppercase', letterSpacing: '0.8px', flex: 1 }}>
                          {sectionLabel(sectionKey)}
                        </span>
                        <span style={{ ...hint, fontSize: '9px', color: allChecked ? '#AC8E66' : someChecked ? '#b8a080' : '#b0a090' }}>
                          {files.filter(f => selectedRelPaths.has(f.relPath)).length}/{files.length}
                        </span>
                      </div>
                      {/* Files in section */}
                      {files.map((f) => {
                        const checked = selectedRelPaths.has(f.relPath);
                        return (
                          <label key={f.relPath} style={{
                            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                            padding: '6px 8px 6px 22px', borderRadius: '5px', marginBottom: '1px',
                            border: `1px solid ${checked ? 'rgba(172,142,102,0.35)' : 'transparent'}`,
                            background: checked ? 'rgba(172,142,102,0.06)' : 'transparent',
                          }}>
                            <input type="checkbox" checked={checked}
                              onChange={(e) => setSelectedRelPaths(prev => { const n = new Set(prev); if (e.target.checked) n.add(f.relPath); else n.delete(f.relPath); return n; })}
                              style={{ accentColor: '#AC8E66', cursor: 'pointer', flexShrink: 0 }}
                            />
                            <span style={{ ...hint, color: checked ? '#3a2a10' : '#8a7a62', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {f.name.replace(/\.(md|mdx)$/i, '').replace(/^\d+[-_]/, '')}
                            </span>
                            <span style={{ ...hint, fontSize: '9px', color: '#b0a080', flexShrink: 0 }}>.md</span>
                          </label>
                        );
                      })}
                    </div>
                  );
                })}

                {/* New pages (flat, at bottom) */}
                {newPages.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', borderRadius: '5px', background: 'rgba(45,122,58,0.07)', marginBottom: '2px' }}>
                      <span style={{ ...hint, fontSize: '9px', color: '#2d7a3a', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Neue Seiten</span>
                    </div>
                    {newPages.map((p) => {
                      const checked = selectedRelPaths.has(p.relPath);
                      return (
                        <label key={p.relPath} style={{
                          display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                          padding: '6px 8px 6px 22px', borderRadius: '5px', marginBottom: '1px',
                          border: `1px solid ${checked ? 'rgba(45,122,58,0.3)' : 'transparent'}`,
                          background: checked ? 'rgba(45,122,58,0.06)' : 'transparent',
                        }}>
                          <input type="checkbox" checked={checked}
                            onChange={(e) => setSelectedRelPaths(prev => { const n = new Set(prev); if (e.target.checked) n.add(p.relPath); else n.delete(p.relPath); return n; })}
                            style={{ accentColor: '#2d7a3a', cursor: 'pointer', flexShrink: 0 }}
                          />
                          <span style={{ ...hint, color: checked ? '#1a5a22' : '#5a8a62', flex: 1 }}>{p.title}</span>
                          <span style={{ ...hint, fontSize: '9px', color: '#2d7a3a', background: 'rgba(45,122,58,0.1)', border: '1px solid rgba(45,122,58,0.2)', borderRadius: '3px', padding: '1px 5px' }}>neu</span>
                          <button onClick={(e) => { e.preventDefault(); setNewPages(prev => prev.filter(x => x.relPath !== p.relPath)); setSelectedRelPaths(prev => { const n = new Set(prev); n.delete(p.relPath); return n; }); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b45309', fontSize: '13px', lineHeight: 1, padding: '0 2px' }}>×</button>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add new page */}
              {newPageInputVisible ? (
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                  <input style={{ ...inputStyle, flex: 1 }} value={newPageInput} onChange={(e) => setNewPageInput(e.target.value)}
                    placeholder="Seitentitel z.B. Getting Started" autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') addNewPage(); if (e.key === 'Escape') { setNewPageInputVisible(false); setNewPageInput(''); } }}
                  />
                  <button onClick={addNewPage} disabled={!newPageInput.trim()} style={{ ...primaryBtn, opacity: newPageInput.trim() ? 1 : 0.45 }}>
                    <FontAwesomeIcon icon={faCheck} style={{ fontSize: '11px' }} />
                  </button>
                  <button onClick={() => { setNewPageInputVisible(false); setNewPageInput(''); }} style={ghostBtn}>×</button>
                </div>
              ) : (
                <button onClick={() => setNewPageInputVisible(true)} style={{ ...ghostBtn, marginBottom: '12px' }}>+ Neue Seite</button>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <button onClick={() => setStep(1)} style={ghostBtn}>
                  <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '10px' }} /> Zurück
                </button>
                <button onClick={() => setStep(3)} disabled={!canProceedStep2} style={{ ...primaryBtn, opacity: canProceedStep2 ? 1 : 0.45 }}>
                  Weiter →
                </button>
              </div>
            </>
          );
        })()}

        {/* ── Step 3: Generate & Deploy ── */}
        {step === 3 && (
          <>
            <div style={stepTitle}>3. Generieren & Deployen</div>

            {/* Summary */}
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(172,142,102,0.08)',
              border: '1px solid rgba(172,142,102,0.25)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
            }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
              <span style={{ ...hint, color: '#3a2a10', fontWeight: 700 }}>{projectName}</span>
              {tagline && <span style={{ ...hint, color: '#8a7a62' }}>{tagline}</span>}
              <span style={{ ...hint, marginLeft: 'auto' }}>{selectedRelPaths.size} Seite{selectedRelPaths.size !== 1 ? 'n' : ''}</span>
            </div>

            <p style={{ ...hint, marginBottom: '14px' }}>
              Generiert: <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 5px', borderRadius: '3px' }}>docs/index.html</code>{' '}
              + <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 5px', borderRadius: '3px' }}>docs/.nojekyll</code>
            </p>

            {/* Local save */}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ ...primaryBtn, opacity: saving ? 0.5 : 1 }}
            >
              {saving ? (
                <><FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '11px' }} />Wird gespeichert…</>
              ) : (
                <><FontAwesomeIcon icon={faDownload} style={{ fontSize: '11px' }} />Lokal speichern</>
              )}
            </button>

            {saveOk && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '7px', ...hint, color: '#2d7a3a' }}>
                <FontAwesomeIcon icon={faCheck} />
                Gespeichert unter <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 4px', borderRadius: '3px' }}>docs/index.html</code>
              </div>
            )}
            {saveError && (
              <div style={{ marginTop: '10px', ...hint, color: '#b45309' }}>
                <FontAwesomeIcon icon={faCircleExclamation} style={{ marginRight: '6px' }} />
                {saveError}
              </div>
            )}

            <div style={divider} />

            {/* GitHub Pages push */}
            {onPushToGitHub ? (
              <>
                <div style={{ ...hint, marginBottom: '10px' }}>
                  Direkt auf GitHub Pages pushen — stellt die Website unter{' '}
                  {githubPagesUrl
                    ? <strong>{githubPagesUrl}</strong>
                    : 'deiner GitHub Pages URL'
                  } bereit.
                </div>
                <button
                  onClick={handlePush}
                  disabled={pushing}
                  style={{ ...primaryBtn, opacity: pushing ? 0.5 : 1 }}
                >
                  {pushing ? (
                    <><FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '11px' }} />Wird gepusht…</>
                  ) : (
                    <><FontAwesomeIcon icon={faCloudArrowUp} style={{ fontSize: '11px' }} />GitHub Pages pushen</>
                  )}
                </button>

                {pushResult && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: pushResult.failed === 0 ? 'rgba(45,122,58,0.1)' : 'rgba(180,83,9,0.1)',
                    border: `1px solid ${pushResult.failed === 0 ? 'rgba(45,122,58,0.3)' : 'rgba(180,83,9,0.3)'}`,
                  }}>
                    <div style={{ ...hint, color: pushResult.failed === 0 ? '#2d7a3a' : '#b45309', fontWeight: 700, marginBottom: '6px' }}>
                      {pushResult.failed === 0
                        ? `✓ ${pushResult.pushed} Datei${pushResult.pushed !== 1 ? 'en' : ''} gepusht`
                        : `${pushResult.pushed} gepusht · ${pushResult.failed} fehlgeschlagen`}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {pushResult.results.map((r) => (
                        <div key={r.file} style={{ ...hint, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {r.success
                            ? <FontAwesomeIcon icon={faCheck} style={{ color: '#2d7a3a', fontSize: '10px' }} />
                            : <FontAwesomeIcon icon={faCircleExclamation} style={{ color: '#b45309', fontSize: '10px' }} />
                          }
                          <span style={{ flex: 1 }}>{r.file}</span>
                          {r.success && r.url && (
                            <a href={r.url} target="_blank" rel="noreferrer" style={{ color: '#2d7a3a', fontSize: '10px' }}>GitHub ↗</a>
                          )}
                          {!r.success && <span style={{ color: '#b45309' }}>{r.error}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {pushError && (
                  <div style={{ marginTop: '10px', ...hint, color: '#b45309' }}>
                    <FontAwesomeIcon icon={faCircleExclamation} style={{ marginRight: '6px' }} />
                    {pushError}
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FontAwesomeIcon icon={faCircleExclamation} style={{ color: '#b45309', fontSize: '13px' }} />
                <span style={{ ...hint, color: '#b45309' }}>
                  GitHub Token fehlt —{' '}
                </span>
                <button onClick={onOpenSettings} style={ghostBtn}>
                  <FontAwesomeIcon icon={faGear} style={{ fontSize: '11px' }} />
                  Einstellungen
                </button>
              </div>
            )}

            <div style={{ marginTop: '16px' }}>
              <button onClick={() => setStep(2)} style={ghostBtn}>
                <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '10px' }} />
                Zurück
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
