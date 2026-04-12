/**
 * DocsServerWizard
 * Richtet FTP/SFTP-Sync für ein Doc Studio Projekt ein.
 * Paper-Theme, 3-Step Wizard.
 */

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCheck,
  faCircleExclamation,
  faServer,
  faArrowsRotate,
  faCloudArrowUp,
} from '@fortawesome/free-solid-svg-icons';
import { ftpUpload, type FtpConfig, type TransferProtocol } from '../../../services/ftpService';
import { readDir } from '@tauri-apps/plugin-fs';
import { join, appDataDir } from '@tauri-apps/api/path';
import { loadZenStudioSettings, saveZenStudioSettings, type BlogConfig } from '../../../services/zenStudioSettingsService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocsServerConfig {
  host: string;
  user: string;
  password: string;
  remotePath: string;
  protocol: TransferProtocol;
}

const STORAGE_KEY = (projectPath: string) =>
  `zenpost_docs_server:${projectPath}`;

export function loadDocsServerConfig(projectPath: string): DocsServerConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(projectPath));
    if (!raw) return null;
    return JSON.parse(raw) as DocsServerConfig;
  } catch {
    return null;
  }
}

function saveDocsServerConfig(projectPath: string, config: DocsServerConfig) {
  localStorage.setItem(STORAGE_KEY(projectPath), JSON.stringify(config));
}

const SYNC_TS_KEY = (projectPath: string) => `zenpost_docs_last_sync:${projectPath}`;

export function saveDocsSyncTimestamp(projectPath: string) {
  localStorage.setItem(SYNC_TS_KEY(projectPath), new Date().toISOString());
}

export function loadDocsSyncTimestamp(projectPath: string): Date | null {
  const raw = localStorage.getItem(SYNC_TS_KEY(projectPath));
  if (!raw) return null;
  try { return new Date(raw); } catch { return null; }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

const label: React.CSSProperties = {
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10px',
  color: '#7a6a52',
  marginBottom: '4px',
  display: 'block',
};

// ─── Helper: upload all files in a directory via FTP ─────────────────────────

export async function syncDirectoryToFtp(
  localDir: string,
  ftpConfig: FtpConfig,
  onProgress?: (msg: string) => void,
): Promise<{ uploaded: number; errors: string[] }> {
  const errors: string[] = [];
  let uploaded = 0;

  async function uploadDir(dir: string, remoteBase: string) {
    const entries = await readDir(dir);
    for (const entry of entries) {
      const localPath = await join(dir, entry.name);
      if (entry.isDirectory) {
        await uploadDir(localPath, `${remoteBase}${entry.name}/`);
      } else {
        onProgress?.(`↑ ${entry.name}`);
        const err = await ftpUpload(localPath, entry.name, {
          ...ftpConfig,
          remotePath: remoteBase,
        });
        if (err) errors.push(`${entry.name}: ${err}`);
        else uploaded++;
      }
    }
  }

  await uploadDir(localDir, ftpConfig.remotePath.endsWith('/') ? ftpConfig.remotePath : ftpConfig.remotePath + '/');
  return { uploaded, errors };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface DocsServerWizardProps {
  projectPath: string;
  projectName: string;
  onBack: () => void;
  onConfigSaved: (config: DocsServerConfig) => void;
}

type WizardStep = 'question' | 'setup' | 'syncing' | 'done';

// BlogConfigs mit FTP-Daten als mögliche Import-Quellen
function getFtpBlogSources(): BlogConfig[] {
  return (loadZenStudioSettings().blogs ?? []).filter(
    (b) => b.ftpHost && b.ftpUser && b.ftpPassword,
  );
}

// Speichert oder aktualisiert einen BlogConfig-Eintrag für dieses Docs-Projekt
function saveAsBlogConfig(projectPath: string, projectName: string, config: DocsServerConfig) {
  const settings = loadZenStudioSettings();
  const blogs = settings.blogs ?? [];
  const existing = blogs.find((b) => b.path === projectPath);
  if (existing) {
    saveZenStudioSettings({
      ...settings,
      blogs: blogs.map((b) => b.path === projectPath ? {
        ...b,
        siteType: 'docs' as const,
        deployType: 'ftp' as const,
        ftpHost: config.host,
        ftpUser: config.user,
        ftpPassword: config.password,
        ftpRemotePath: config.remotePath,
        ftpProtocol: config.protocol,
      } : b),
    });
  } else {
    saveZenStudioSettings({
      ...settings,
      blogs: [...blogs, {
        id: `docs-${Date.now()}`,
        name: projectName,
        path: projectPath,
        siteType: 'docs' as const,
        deployType: 'ftp' as const,
        ftpHost: config.host,
        ftpUser: config.user,
        ftpPassword: config.password,
        ftpRemotePath: config.remotePath,
        ftpProtocol: config.protocol,
      }],
    });
  }
}

export function DocsServerWizard({
  projectPath,
  projectName,
  onBack,
  onConfigSaved,
}: DocsServerWizardProps) {
  const existing = loadDocsServerConfig(projectPath);
  const ftpSources = getFtpBlogSources();

  const [step, setStep] = useState<WizardStep>(existing ? 'setup' : 'question');
  const [hasExisting, setHasExisting] = useState(false);
  const [protocol, setProtocol] = useState<TransferProtocol>(existing?.protocol ?? 'sftp');
  const [host, setHost] = useState(existing?.host ?? '');
  const [user, setUser] = useState(existing?.user ?? '');
  const [password, setPassword] = useState(existing?.password ?? '');
  const [remotePath, setRemotePath] = useState(existing?.remotePath ?? '/');
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [syncResult, setSyncResult] = useState<{ uploaded: number; errors: string[] } | null>(null);

  const ftpConfig: FtpConfig = { host, user, password, remotePath, protocol };
  const isConfigComplete = host.trim() && user.trim() && password.trim() && remotePath.trim();

  const handleTestConnection = async () => {
    if (!isConfigComplete) return;
    setTestState('testing');
    setTestMsg('');
    try {
      const { writeTextFile, remove } = await import('@tauri-apps/plugin-fs');
      const testFileName = `zen-ftp-test-${Date.now()}.txt`;
      // use appDataDir — explicitly in Tauri FS scope ($APPDATA/**)
      const appData = await appDataDir();
      const localTestPath = await join(appData, testFileName);
      try {
        await writeTextFile(localTestPath, `ZenPost FTP Test – ${new Date().toISOString()}`);
      } catch (e) {
        setTestState('error');
        setTestMsg(`Lokale Testdatei: ${e instanceof Error ? e.message : String(e)}`.slice(0, 120));
        return;
      }
      const uploadErr = await ftpUpload(localTestPath, testFileName, ftpConfig);
      await remove(localTestPath).catch(() => {});
      if (uploadErr) {
        setTestState('error');
        setTestMsg(uploadErr.slice(0, 120));
      } else {
        setTestState('ok');
        setTestMsg('Verbindung erfolgreich!');
      }
    } catch (e) {
      setTestState('error');
      const msg = e instanceof Error
        ? e.message
        : typeof e === 'string'
          ? e
          : (typeof e === 'object' && e !== null)
            ? (JSON.stringify(e) || 'Objekt-Fehler')
            : 'Unbekannter Fehler';
      setTestMsg(msg.slice(0, 120));
    }
  };

  const handleSave = async (withSync = false) => {
    const config: DocsServerConfig = { host, user, password, remotePath, protocol };
    saveDocsServerConfig(projectPath, config);
    onConfigSaved(config);

    if (withSync) {
      setStep('syncing');
      setSyncLog([]);
      setSyncResult(null);
      const result = await syncDirectoryToFtp(projectPath, ftpConfig, (msg) =>
        setSyncLog((prev) => [...prev.slice(-20), msg]),
      );
      setSyncResult(result);
      setStep('done');
    } else {
      setStep('done');
    }
  };

  // ── Step: Question ──────────────────────────────────────────────────────────
  if (step === 'question') {
    return (
      <div style={card}>
        <div style={{ padding: '20px 24px', background: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FontAwesomeIcon icon={faServer} style={{ color: '#AC8E66', fontSize: '16px' }} />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: '#E8E1D2' }}>
            Docs → Server
          </span>
        </div>
        <div style={{ padding: '24px' }}>
          <p style={{ ...stepTitle }}>EINRICHTUNG</p>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: '#1a1a1a', marginBottom: '8px' }}>
            Hast du bereits eine Docs-Site auf dem Server?
          </p>
          <p style={{ ...hint, marginBottom: '20px' }}>
            Projekt: <strong>{projectName}</strong>
          </p>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              style={{ ...primaryBtn, flex: 1, justifyContent: 'center' }}
              onClick={() => { setHasExisting(true); setStep('setup'); }}
            >
              <FontAwesomeIcon icon={faCheck} /> Ja, Sync einrichten
            </button>
            <button
              style={{ ...ghostBtn, flex: 1, justifyContent: 'center' }}
              onClick={() => { setHasExisting(false); setStep('setup'); }}
            >
              Nein, neu aufsetzen
            </button>
          </div>
          <div style={divider} />
          <button style={{ ...ghostBtn, fontSize: '10px' }} onClick={onBack}>
            <FontAwesomeIcon icon={faArrowLeft} /> Zurück
          </button>
        </div>
      </div>
    );
  }

  // ── Step: Setup ─────────────────────────────────────────────────────────────
  if (step === 'setup') {
    return (
      <div style={card}>
        <div style={{ padding: '20px 24px', background: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FontAwesomeIcon icon={faServer} style={{ color: '#AC8E66', fontSize: '16px' }} />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: '#E8E1D2' }}>
            {hasExisting ? 'Sync einrichten' : 'Server-Verbindung einrichten'}
          </span>
        </div>
        <div style={{ padding: '24px' }}>
          <p style={stepTitle}>FTP / SFTP ZUGANGSDATEN</p>

          {/* Import aus bestehender BlogConfig */}
          {ftpSources.length > 0 && (
            <div style={{ marginBottom: '16px', padding: '10px 12px', borderRadius: '6px', background: 'rgba(172,142,102,0.1)', border: '1px solid rgba(172,142,102,0.3)' }}>
              <span style={{ ...label, marginBottom: '6px' }}>Aus Einstellungen übernehmen</span>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                defaultValue=""
                onChange={(e) => {
                  const src = ftpSources.find((b) => b.id === e.target.value);
                  if (!src) return;
                  setHost(src.ftpHost ?? '');
                  setUser(src.ftpUser ?? '');
                  setPassword(src.ftpPassword ?? '');
                  setRemotePath(src.ftpRemotePath ?? '/');
                  setProtocol(src.ftpProtocol ?? 'sftp');
                  setTestState('idle');
                }}
              >
                <option value="" disabled>Blog wählen…</option>
                {ftpSources.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.ftpHost})</option>
                ))}
              </select>
            </div>
          )}

          {/* Protocol selector */}
          <span style={label}>Protokoll</span>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            {(['ftp', 'ftps', 'sftp'] as TransferProtocol[]).map((p) => (
              <button
                key={p}
                onClick={() => setProtocol(p)}
                style={{
                  padding: '4px 10px', borderRadius: '4px', cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px',
                  border: `1px solid ${protocol === p ? '#AC8E66' : '#bfb6a5'}`,
                  background: protocol === p ? 'rgba(172,142,102,0.15)' : 'transparent',
                  color: protocol === p ? '#AC8E66' : '#7a6a52',
                }}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Host */}
          <span style={label}>Server / Host</span>
          <input
            style={{ ...inputStyle, marginBottom: '10px' }}
            placeholder="z.B. access-12345.webspace-host.com"
            value={host}
            onChange={(e) => { setHost(e.target.value); setTestState('idle'); }}
          />

          {/* User */}
          <span style={label}>Benutzername</span>
          <input
            style={{ ...inputStyle, marginBottom: '10px' }}
            placeholder="z.B. a2413730"
            value={user}
            onChange={(e) => { setUser(e.target.value); setTestState('idle'); }}
          />

          {/* Password */}
          <span style={label}>Passwort</span>
          <input
            type="password"
            style={{ ...inputStyle, marginBottom: '10px' }}
            placeholder="••••••••"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setTestState('idle'); }}
          />

          {/* Remote path */}
          <span style={label}>Remote-Pfad (Zielordner auf dem Server)</span>
          <input
            style={{ ...inputStyle, marginBottom: '16px' }}
            placeholder="z.B. /zenpostdocs"
            value={remotePath}
            onChange={(e) => { setRemotePath(e.target.value); setTestState('idle'); }}
          />

          {/* Test connection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <button
              style={{ ...ghostBtn, opacity: isConfigComplete ? 1 : 0.5 }}
              disabled={!isConfigComplete || testState === 'testing'}
              onClick={handleTestConnection}
            >
              <FontAwesomeIcon icon={faArrowsRotate} spin={testState === 'testing'} />
              {testState === 'testing' ? 'Teste…' : 'Verbindung testen'}
            </button>
            {testState === 'ok' && (
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#4caf50', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FontAwesomeIcon icon={faCheck} /> {testMsg}
              </span>
            )}
            {testState === 'error' && (
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#c8503c', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FontAwesomeIcon icon={faCircleExclamation} /> {testMsg}
              </span>
            )}
          </div>

          <div style={divider} />

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
            <button style={{ ...ghostBtn, fontSize: '10px' }} onClick={() => setStep('question')}>
              <FontAwesomeIcon icon={faArrowLeft} /> Zurück
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={{ ...ghostBtn, opacity: isConfigComplete ? 1 : 0.5 }}
                disabled={!isConfigComplete}
                onClick={() => handleSave(false)}
              >
                Nur speichern
              </button>
              <button
                style={{ ...primaryBtn, opacity: isConfigComplete ? 1 : 0.5 }}
                disabled={!isConfigComplete}
                onClick={() => handleSave(true)}
              >
                <FontAwesomeIcon icon={faCloudArrowUp} />
                {hasExisting ? 'Sync starten' : 'Hochladen & fertig'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Syncing ───────────────────────────────────────────────────────────
  if (step === 'syncing') {
    return (
      <div style={card}>
        <div style={{ padding: '20px 24px', background: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FontAwesomeIcon icon={faCloudArrowUp} style={{ color: '#AC8E66', fontSize: '16px' }} />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: '#E8E1D2' }}>
            Hochladen…
          </span>
        </div>
        <div style={{ padding: '24px' }}>
          <p style={stepTitle}>FTP SYNC LÄUFT</p>
          <div style={{
            background: '#1a1a1a', borderRadius: '6px', padding: '10px 12px',
            fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#AC8E66',
            maxHeight: '160px', overflowY: 'auto', lineHeight: 1.8,
          }}>
            {syncLog.length === 0
              ? <span style={{ color: '#555' }}>Starte Upload…</span>
              : syncLog.map((line, i) => <div key={i}>{line}</div>)
            }
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Done ──────────────────────────────────────────────────────────────
  return (
    <div style={card}>
      <div style={{ padding: '20px 24px', background: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <FontAwesomeIcon icon={faCheck} style={{ color: '#4caf50', fontSize: '16px' }} />
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: '#E8E1D2' }}>
          Server-Sync eingerichtet
        </span>
      </div>
      <div style={{ padding: '24px' }}>
        {syncResult ? (
          <>
            <p style={stepTitle}>SYNC ABGESCHLOSSEN</p>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: '#1a1a1a', marginBottom: '8px' }}>
              <FontAwesomeIcon icon={faCheck} style={{ color: '#4caf50', marginRight: '8px' }} />
              {syncResult.uploaded} Dateien hochgeladen
            </p>
            {syncResult.errors.length > 0 && (
              <div style={{ background: 'rgba(200,80,60,0.08)', border: '1px solid rgba(200,80,60,0.3)', borderRadius: '6px', padding: '8px 12px', marginBottom: '12px' }}>
                {syncResult.errors.map((e, i) => (
                  <div key={i} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#c8503c' }}>{e}</div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: '#1a1a1a', marginBottom: '8px' }}>
            <FontAwesomeIcon icon={faCheck} style={{ color: '#4caf50', marginRight: '8px' }} />
            Konfiguration gespeichert.
          </p>
        )}
        <p style={{ ...hint, marginBottom: '16px' }}>
          Ab jetzt wird beim Speichern in Doc Studio automatisch auf den Server synchronisiert.
        </p>

        {/* In Media Transformat speichern */}
        {(() => {
          const savedConfig = loadDocsServerConfig(projectPath);
          if (!savedConfig) return null;
          const alreadyInSettings = (loadZenStudioSettings().blogs ?? []).some((b) => b.path === projectPath);
          return (
            <SaveToMediaTransformatButton
              projectPath={projectPath}
              projectName={projectName}
              config={savedConfig}
              alreadyExists={alreadyInSettings}
            />
          );
        })()}

        <div style={divider} />
        <button style={primaryBtn} onClick={onBack}>
          <FontAwesomeIcon icon={faCheck} /> Fertig
        </button>
      </div>
    </div>
  );
}

// ─── Hilfs-Komponente: In Media Transformat speichern ─────────────────────────

function SaveToMediaTransformatButton({
  projectPath, projectName, config, alreadyExists,
}: {
  projectPath: string;
  projectName: string;
  config: DocsServerConfig;
  alreadyExists: boolean;
}) {
  const [done, setDone] = useState(false);
  if (done) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 0', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#4caf50' }}>
        <FontAwesomeIcon icon={faCheck} /> In Media Transformat gespeichert
      </div>
    );
  }
  return (
    <div style={{ padding: '10px 12px', borderRadius: '6px', background: 'rgba(172,142,102,0.08)', border: '1px solid rgba(172,142,102,0.25)', marginBottom: '4px' }}>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#7a6a52', marginBottom: '8px', lineHeight: 1.5 }}>
        {alreadyExists
          ? 'Dieses Projekt ist bereits in Media Transformat. FTP-Daten aktualisieren?'
          : 'Konfiguration auch in Media Transformat speichern, um sie zentral zu verwalten?'}
      </div>
      <button
        style={{ ...ghostBtn, fontSize: '10px' }}
        onClick={() => { saveAsBlogConfig(projectPath, projectName, config); setDone(true); }}
      >
        <FontAwesomeIcon icon={faServer} />
        {alreadyExists ? 'In Media Transformat aktualisieren' : 'In Media Transformat speichern'}
      </button>
    </div>
  );
}
