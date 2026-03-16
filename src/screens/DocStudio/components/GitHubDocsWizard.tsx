/**
 * GitHubDocsWizard
 * Step-by-step wizard for pushing Doc Studio markdown files to a GitHub repository.
 * Paper-themed, self-contained — loads/saves GitHub config from socialMediaService.
 */

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCheck,
  faCircleExclamation,
  faCloudArrowUp,
  faGear,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import {
  loadSocialConfig,
  saveSocialConfig,
  isPlatformConfigured,
} from '../../../services/socialMediaService';
import type { DocsPushSummary, GeneratedTemplate } from '../../../services/githubDocsService';

// ─── Styles ──────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

interface GitHubDocsWizardProps {
  projectPath: string | null;
  fileCount: number;
  onBack: () => void;
  onPush: () => Promise<DocsPushSummary>;
  onOpenSettings: () => void;
  generatedTemplates?: GeneratedTemplate[];
  onPushTemplates?: (templates: GeneratedTemplate[]) => Promise<DocsPushSummary>;
}

export function GitHubDocsWizard({
  projectPath,
  fileCount,
  onBack,
  onPush,
  onOpenSettings,
  generatedTemplates = [],
  onPushTemplates,
}: GitHubDocsWizardProps) {
  const [config, setConfig] = useState(() => loadSocialConfig());
  const [docsRepo, setDocsRepo] = useState(() => loadSocialConfig().github?.docsRepo ?? '');
  const [docsBranch, setDocsBranch] = useState(() => loadSocialConfig().github?.docsBranch ?? '');
  const [docsPath, setDocsPath] = useState(() => loadSocialConfig().github?.docsPath ?? '');
  const [saved, setSaved] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<DocsPushSummary | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const [templatePushing, setTemplatePushing] = useState(false);
  const [templatePushResult, setTemplatePushResult] = useState<DocsPushSummary | null>(null);
  const [templatePushError, setTemplatePushError] = useState<string | null>(null);
  const [selectedTemplateNames, setSelectedTemplateNames] = useState<Set<string>>(
    () => new Set(generatedTemplates.filter((t) => t.name !== 'DATA_ROOM.md').map((t) => t.name)),
  );

  const isGitHubConfigured = isPlatformConfigured('github', config);
  const hasRepo = !!docsRepo.trim();

  // Reload config when settings change (e.g. user comes back from settings)
  useEffect(() => {
    const fresh = loadSocialConfig();
    setConfig(fresh);
    if (!docsRepo) setDocsRepo(fresh.github?.docsRepo ?? '');
    if (!docsBranch) setDocsBranch(fresh.github?.docsBranch ?? '');
    if (!docsPath) setDocsPath(fresh.github?.docsPath ?? '');
  }, []);

  const handleSaveConfig = () => {
    const current = loadSocialConfig();
    saveSocialConfig({
      ...current,
      github: {
        ...current.github,
        accessToken: current.github?.accessToken ?? '',
        username: current.github?.username ?? '',
        docsRepo: docsRepo.trim(),
        docsBranch: docsBranch.trim() || 'main',
        docsPath: docsPath.trim(),
      },
    });
    setConfig(loadSocialConfig());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePush = async () => {
    setPushing(true);
    setPushResult(null);
    setPushError(null);
    try {
      const summary = await onPush();
      setPushResult(summary);
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Push fehlgeschlagen');
    } finally {
      setPushing(false);
    }
  };

  const handlePushTemplates = async () => {
    if (!onPushTemplates) return;
    const toPush = generatedTemplates.filter((t) => selectedTemplateNames.has(t.name));
    if (toPush.length === 0) return;
    setTemplatePushing(true);
    setTemplatePushResult(null);
    setTemplatePushError(null);
    try {
      const summary = await onPushTemplates(toPush);
      setTemplatePushResult(summary);
    } catch (err) {
      setTemplatePushError(err instanceof Error ? err.message : 'Push fehlgeschlagen');
    } finally {
      setTemplatePushing(false);
    }
  };

  const projectName = projectPath?.split(/[\\/]/).filter(Boolean).pop() ?? 'Projekt';

  return (
    <div style={card}>
      <div style={{ padding: '20px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <button onClick={onBack} style={ghostBtn}>
            <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '10px' }} />
            Zurück
          </button>
          <FontAwesomeIcon icon={faGithub} style={{ fontSize: '18px', color: '#1a1a1a' }} />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px', color: '#1a1a1a', fontWeight: 600 }}>
            Docs → GitHub
          </span>
        </div>

        {/* Step 1: GitHub konfiguriert? */}
        <div style={stepTitle}>1. GitHub Access Token</div>
        {isGitHubConfigured ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <FontAwesomeIcon icon={faCheck} style={{ color: '#2d7a3a', fontSize: '13px' }} />
            <span style={{ ...hint, color: '#2d7a3a' }}>
              Token konfiguriert für <strong>{config.github?.username}</strong>
            </span>
          </div>
        ) : (
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
              <FontAwesomeIcon icon={faCircleExclamation} style={{ color: '#b45309', fontSize: '13px', marginTop: '2px' }} />
              <span style={{ ...hint, color: '#b45309' }}>
                Kein GitHub Access Token gefunden. Token unter{' '}
                <a href="https://github.com/settings/personal-access-tokens" target="_blank" rel="noreferrer" style={{ color: '#b45309' }}>
                  github.com/settings/personal-access-tokens
                </a>{' '}
                erstellen mit <strong>Contents: Read & Write</strong> Berechtigung.
              </span>
            </div>
            <button onClick={onOpenSettings} style={primaryBtn}>
              <FontAwesomeIcon icon={faGear} style={{ fontSize: '11px' }} />
              Einstellungen öffnen
            </button>
          </div>
        )}

        <div style={divider} />

        {/* Step 2: Repository-Konfiguration */}
        <div style={stepTitle}>2. Repository konfigurieren</div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ ...hint, display: 'block', marginBottom: '5px' }}>Repository Name</label>
          <input
            style={inputStyle}
            value={docsRepo}
            onChange={(e) => setDocsRepo(e.target.value)}
            placeholder={`${config.github?.username ?? 'username'}/my-docs`}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label style={{ ...hint, display: 'block', marginBottom: '5px' }}>Branch</label>
            <input
              style={inputStyle}
              value={docsBranch}
              onChange={(e) => setDocsBranch(e.target.value)}
              placeholder="main"
            />
          </div>
          <div>
            <label style={{ ...hint, display: 'block', marginBottom: '5px' }}>Zielordner im Repo</label>
            <input
              style={inputStyle}
              value={docsPath}
              onChange={(e) => setDocsPath(e.target.value)}
              placeholder="docs/"
            />
          </div>
        </div>

        <div style={{ marginBottom: '4px' }}>
          <button
            onClick={handleSaveConfig}
            style={{ ...primaryBtn, opacity: hasRepo ? 1 : 0.5 }}
            disabled={!hasRepo}
          >
            {saved ? (
              <>
                <FontAwesomeIcon icon={faCheck} style={{ fontSize: '11px' }} />
                Gespeichert
              </>
            ) : (
              'Konfiguration speichern'
            )}
          </button>
        </div>

        {hasRepo && (
          <p style={hint}>
            Dateien werden gepusht nach:{' '}
            <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 4px', borderRadius: '3px' }}>
              {config.github?.username}/{docsRepo}/{docsPath || ''}
            </code>
          </p>
        )}

        <div style={divider} />

        {/* Step 3: Push */}
        <div style={stepTitle}>3. Docs pushen</div>

        <div style={{ marginBottom: '12px' }}>
          <span style={hint}>
            Projekt: <strong>{projectName}</strong> · {fileCount} Markdown-Datei{fileCount !== 1 ? 'en' : ''} gefunden
          </span>
        </div>

        <button
          onClick={handlePush}
          disabled={!isGitHubConfigured || !hasRepo || pushing}
          style={{
            ...primaryBtn,
            opacity: isGitHubConfigured && hasRepo && !pushing ? 1 : 0.45,
            background: isGitHubConfigured && hasRepo ? '#1a1a1a' : '#555',
          }}
        >
          {pushing ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '11px' }} />
              Wird gepusht…
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faCloudArrowUp} style={{ fontSize: '11px' }} />
              Jetzt pushen
            </>
          )}
        </button>

        {/* Results */}
        {pushResult && (
          <div
            style={{
              marginTop: '14px',
              padding: '12px 14px',
              borderRadius: '8px',
              background: pushResult.failed === 0 ? 'rgba(45,122,58,0.1)' : 'rgba(180,83,9,0.1)',
              border: `1px solid ${pushResult.failed === 0 ? 'rgba(45,122,58,0.3)' : 'rgba(180,83,9,0.3)'}`,
            }}
          >
            <div style={{ ...hint, color: pushResult.failed === 0 ? '#2d7a3a' : '#b45309', marginBottom: '6px', fontWeight: 700 }}>
              {pushResult.failed === 0
                ? `✓ ${pushResult.pushed} Datei${pushResult.pushed !== 1 ? 'en' : ''} erfolgreich gepusht`
                : `${pushResult.pushed} gepusht · ${pushResult.failed} fehlgeschlagen`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '120px', overflowY: 'auto' }}>
              {pushResult.results.map((r) => (
                <div key={r.file} style={{ ...hint, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {r.success ? (
                    <FontAwesomeIcon icon={faCheck} style={{ color: '#2d7a3a', fontSize: '10px' }} />
                  ) : (
                    <FontAwesomeIcon icon={faCircleExclamation} style={{ color: '#b45309', fontSize: '10px' }} />
                  )}
                  <span style={{ flex: 1 }}>{r.file}</span>
                  {r.success && r.url && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#2d7a3a', fontSize: '10px' }}
                    >
                      GitHub ↗
                    </a>
                  )}
                  {!r.success && <span style={{ color: '#b45309' }}>{r.error}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {pushError && (
          <div
            style={{
              marginTop: '14px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(180,83,9,0.1)',
              border: '1px solid rgba(180,83,9,0.3)',
              ...hint,
              color: '#b45309',
            }}
          >
            {pushError}
          </div>
        )}

        {/* Templates section — only when templates are available */}
        {generatedTemplates.length > 0 && onPushTemplates && (
          <>
            <div style={divider} />

            <div style={stepTitle}>4. Templates pushen</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              {generatedTemplates.map((tpl) => {
                const isDataRoom = tpl.name === 'DATA_ROOM.md';
                const checked = selectedTemplateNames.has(tpl.name);
                return (
                  <label
                    key={tpl.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: `1px solid ${checked ? 'rgba(172,142,102,0.4)' : 'rgba(172,142,102,0.15)'}`,
                      background: checked ? 'rgba(172,142,102,0.07)' : 'transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedTemplateNames((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(tpl.name);
                          else next.delete(tpl.name);
                          return next;
                        });
                        setTemplatePushResult(null);
                      }}
                      style={{ accentColor: '#AC8E66', cursor: 'pointer' }}
                    />
                    <span style={{ ...hint, color: checked ? '#3a2a10' : '#8a7a62', flex: 1 }}>
                      {tpl.label}
                      <span style={{ opacity: 0.6 }}> → {tpl.name}</span>
                    </span>
                    {isDataRoom && (
                      <span style={{
                        ...hint,
                        fontSize: '9px',
                        color: '#b45309',
                        background: 'rgba(180,83,9,0.08)',
                        border: '1px solid rgba(180,83,9,0.2)',
                        borderRadius: '3px',
                        padding: '1px 5px',
                      }}>
                        vertraulich
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            {(() => {
              const count = selectedTemplateNames.size;
              const canPush = isGitHubConfigured && hasRepo && !templatePushing && count > 0;
              return (
                <button
                  onClick={handlePushTemplates}
                  disabled={!canPush}
                  style={{ ...primaryBtn, opacity: canPush ? 1 : 0.45 }}
                >
                  {templatePushing ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '11px' }} />
                      Wird gepusht…
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCloudArrowUp} style={{ fontSize: '11px' }} />
                      Templates pushen {count > 0 ? `(${count})` : ''}
                    </>
                  )}
                </button>
              );
            })()}

            {templatePushResult && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: templatePushResult.failed === 0 ? 'rgba(45,122,58,0.1)' : 'rgba(180,83,9,0.1)',
                  border: `1px solid ${templatePushResult.failed === 0 ? 'rgba(45,122,58,0.3)' : 'rgba(180,83,9,0.3)'}`,
                }}
              >
                <div style={{ ...hint, color: templatePushResult.failed === 0 ? '#2d7a3a' : '#b45309', marginBottom: '6px', fontWeight: 700 }}>
                  {templatePushResult.failed === 0
                    ? `✓ ${templatePushResult.pushed} Template${templatePushResult.pushed !== 1 ? 's' : ''} erfolgreich gepusht`
                    : `${templatePushResult.pushed} gepusht · ${templatePushResult.failed} fehlgeschlagen`}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '120px', overflowY: 'auto' }}>
                  {templatePushResult.results.map((r) => (
                    <div key={r.file} style={{ ...hint, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {r.success ? (
                        <FontAwesomeIcon icon={faCheck} style={{ color: '#2d7a3a', fontSize: '10px' }} />
                      ) : (
                        <FontAwesomeIcon icon={faCircleExclamation} style={{ color: '#b45309', fontSize: '10px' }} />
                      )}
                      <span style={{ flex: 1 }}>{r.file}</span>
                      {r.success && r.url && (
                        <a href={r.url} target="_blank" rel="noreferrer" style={{ color: '#2d7a3a', fontSize: '10px' }}>
                          GitHub ↗
                        </a>
                      )}
                      {!r.success && <span style={{ color: '#b45309' }}>{r.error}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {templatePushError && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(180,83,9,0.1)',
                  border: '1px solid rgba(180,83,9,0.3)',
                  ...hint,
                  color: '#b45309',
                }}
              >
                {templatePushError}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
