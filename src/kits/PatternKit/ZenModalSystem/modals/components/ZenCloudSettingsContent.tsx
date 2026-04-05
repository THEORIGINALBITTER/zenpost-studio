import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faSpinner, faTriangleExclamation, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { faGoogle as faGoogleBrand, faApple } from '@fortawesome/free-brands-svg-icons';
import { useOpenExternal } from '../../../../../hooks/useOpenExternal';
import {
  loadZenStudioSettings,
  patchZenStudioSettings,
  type ZenStudioSettings,
} from '../../../../../services/zenStudioSettingsService';
import { ZenDropdown } from '../../components/ZenDropdown';

const DEFAULT_BASE_URL = 'https://denisbitter.de/stage02/api';
const gold = '#AC8E66';
const fontMono = 'IBM Plex Mono, monospace';

const SectionLabel = ({ children }: { children: string }) => (
  <div style={{
    fontFamily: fontMono,
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.12em',
    color: '#1a1a1a',
    textTransform: 'uppercase' as const,
    marginBottom: 14,
  }}>
    {children}
  </div>
);

const Divider = () => (
  <div style={{ borderTop: '1px solid rgba(172,142,102,0.25)', margin: '4px 0' }} />
);

const FieldLabel = ({ children }: { children: string }) => (
  <div style={{ fontFamily: fontMono, fontSize: 10, color: '#555', marginBottom: 6 }}>
    {children}
  </div>
);

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid rgba(172,142,102,0.4)',
  borderRadius: 8,
  padding: '10px 12px',
  fontFamily: fontMono,
  boxShadow: 'none',
  fontSize: 11,
  color: '#1a1a1a',
  backgroundColor: 'transparent',
  outline: 'none',
  boxSizing: 'border-box',
};

const primaryBtn: React.CSSProperties = {
 border: `1px solid rgba(172,142,102,0.4)`,
  borderRadius: 6,
  padding: '9px 20px',
  fontFamily: fontMono,
  fontSize: 11,
  fontWeight: 600,
  color: '#1a1a1a',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  letterSpacing: '0.05em',

  boxShadow: 'none',

};

const ghostBtn: React.CSSProperties = {
  border: `1px solid rgba(172,142,102,0.4)`,
  borderRadius: 6,
  padding: '9px 16px',
  fontFamily: fontMono,
  fontSize: 11,
  color: '#444',
  backgroundColor: 'transparent',
  cursor: 'pointer',
    boxShadow: 'none',
};

const ssoBtn: React.CSSProperties = {
  ...ghostBtn,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 18px',
};

export const ZenCloudSettingsContent = () => {
  const { openExternal } = useOpenExternal();
  const [settings, setSettings] = useState<ZenStudioSettings>(() => loadZenStudioSettings());
  const [email, setEmail] = useState(settings.cloudUserEmail ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<'success' | 'error' | 'info' | null>(null);
  const ssoPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [availableProjects, setAvailableProjects] = useState<Array<{ id: number; name: string }>>([]);
  const [deletingProject, setDeletingProject] = useState(false);
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState<number | null>(null);

  const baseUrl = useMemo(() => {
    const raw = settings.cloudApiBaseUrl ?? DEFAULT_BASE_URL;
    return raw.trim().replace(/\/+$/, '');
  }, [settings.cloudApiBaseUrl]);

  const setResult = (msg: string, kind: 'success' | 'error' | 'info') => {
    setStatusMsg(msg);
    setStatusKind(kind);
  };

  const update = (patch: Partial<ZenStudioSettings>) => {
    const next = patchZenStudioSettings(patch);
    setSettings(next);
    return next;
  };

  const loadUserProjects = useCallback(async (token: string) => {
    try {
      const url = `${baseUrl}/projects_list.php`;
      const res = isTauri()
        ? await invoke<{ status: number; body: string }>('http_fetch', { request: { url, method: 'GET', headers: { 'X-Auth-Token': token }, body: null } })
        : await fetch(url, { headers: { 'X-Auth-Token': token } }).then(async (r) => ({ status: r.status, body: await r.text() }));
      const body = 'body' in res ? res.body : '';
      if (res.status >= 200 && res.status < 300) {
        const json = JSON.parse(body || '{}') as { success?: boolean; projects?: Array<{ id: number; name: string }> };
        if (json.success && Array.isArray(json.projects)) {
          setAvailableProjects(json.projects);
        }
      }
    } catch { /* non-fatal */ }
  }, [baseUrl]);

  const autoSeedProject = useCallback(async (token: string) => {
    try {
      const seedUrl = `${baseUrl}/projects_seed.php`;
      const res = isTauri()
        ? await invoke<{ status: number; body: string }>('http_fetch', { request: { url: seedUrl, method: 'POST', headers: { 'X-Auth-Token': token }, body: null } })
        : await fetch(seedUrl, { method: 'POST', headers: { 'X-Auth-Token': token } }).then(async (r) => ({ status: r.status, body: await r.text() }));
      const body = 'body' in res ? res.body : '';
      if (res.status >= 200 && res.status < 300) {
        const json = JSON.parse(body || '{}') as { success?: boolean; project?: { id?: number; name?: string } };
        if (json.success && json.project?.id) {
          patchZenStudioSettings({ cloudProjectId: json.project.id, cloudProjectName: json.project.name ?? null });
          setSettings(loadZenStudioSettings());
          setResult(`Eingeloggt · Projekt: ${json.project.name ?? 'Projekt'}`, 'success');
          window.dispatchEvent(new CustomEvent('zenpost:cloud-login', {
            detail: { projectId: json.project.id, projectName: json.project.name ?? 'Projekt' },
          }));
        }
      }
    } catch { /* non-fatal */ }
    await loadUserProjects(token);
  }, [baseUrl, loadUserProjects]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string; token?: string; email?: string } | null;
      if (!data || data.type !== 'zenpost-sso' || !data.token) return;
      const next = patchZenStudioSettings({ cloudAuthToken: data.token, cloudUserEmail: data.email ?? null });
      setSettings(next);
      if (data.email) setEmail(data.email);
      setResult('SSO Login erfolgreich. Projekt wird gesucht…', 'success');
      void autoSeedProject(data.token);
    };
    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
      if (ssoPollingRef.current) {
        clearInterval(ssoPollingRef.current);
        ssoPollingRef.current = null;
      }
    };
  }, [autoSeedProject]);

  useEffect(() => {
    const hash = window.location.hash || '';
    const match = hash.match(/zenpost_sso_token=([^&]+)/);
    if (!match) return;
    const token = decodeURIComponent(match[1] ?? '').trim();
    if (!token) return;
    const emailMatch = hash.match(/email=([^&]+)/);
    const emailFromHash = emailMatch ? decodeURIComponent(emailMatch[1] ?? '').trim() : null;
    const next = patchZenStudioSettings({ cloudAuthToken: token, cloudUserEmail: emailFromHash || null });
    setSettings(next);
    if (emailFromHash) setEmail(emailFromHash);
    setResult('SSO Login erfolgreich. Projekt wird gesucht…', 'success');
    history.replaceState(null, '', window.location.pathname + window.location.search);
    void autoSeedProject(token);
  }, [autoSeedProject]);

  useEffect(() => {
    const token = settings.cloudAuthToken;
    if (token) void loadUserProjects(token);
  }, [loadUserProjects, settings.cloudAuthToken]);

  const zenFetch = async (url: string, method: string, headers: Record<string, string>, body?: string) => {
    if (isTauri()) {
      const res = await invoke<{ status: number; body: string }>('http_fetch', {
        request: { url, method, headers, body: body ?? null },
      });
      return { status: res.status, text: res.body };
    }
    const res = await fetch(url, { method, headers, ...(body ? { body } : {}) });
    const text = await res.text().catch(() => '');
    return { status: res.status, text };
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setResult('Bitte E-Mail und Passwort eingeben.', 'error'); return; }
    setLoading(true); setStatusMsg(null); setStatusKind(null);
    try {
      const { status, text } = await zenFetch(`${baseUrl}/login_api.php`, 'POST', { 'Content-Type': 'application/json' }, JSON.stringify({ email: email.trim(), password }));
      if (status < 200 || status >= 300) { setResult(`Login fehlgeschlagen (${status})`, 'error'); return; }
      const json = JSON.parse(text || '{}') as { success?: boolean; token?: string };
      if (!json.success || !json.token) { setResult('Login fehlgeschlagen: ungültige Antwort.', 'error'); return; }
      const next = update({ cloudAuthToken: json.token, cloudUserEmail: email.trim() });
      setPassword('');
      setResult('Login erfolgreich. Projekt wird gesucht…', 'success');
      try {
        const { status: s, text: t } = await zenFetch(`${baseUrl}/projects_seed.php`, 'POST', { 'X-Auth-Token': json.token });
        if (s >= 200 && s < 300) {
          const seed = JSON.parse(t || '{}') as { success?: boolean; project?: { id?: number; name?: string } };
          if (seed.success && seed.project?.id) {
            update({ cloudProjectId: seed.project.id, cloudProjectName: seed.project.name ?? null });
            setResult(`Eingeloggt · Projekt: ${seed.project.name ?? 'Projekt'}`, 'success');
            window.dispatchEvent(new CustomEvent('zenpost:cloud-login', { detail: { projectId: seed.project.id, projectName: seed.project.name ?? 'Projekt' } }));
          }
        }
      } catch { /* non-fatal */ }
      setSettings(next);
    } catch (err) {
      setResult(`Login Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`, 'error');
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) { setResult('Bitte E-Mail und Passwort eingeben.', 'error'); return; }
    setLoading(true); setStatusMsg(null); setStatusKind(null);
    try {
      const { status, text } = await zenFetch(`${baseUrl}/register_api.php`, 'POST', { 'Content-Type': 'application/json' }, JSON.stringify({ email: email.trim(), password }));
      if (status < 200 || status >= 300) { setResult(`Registrierung fehlgeschlagen (${status})`, 'error'); return; }
      const json = JSON.parse(text || '{}') as { success?: boolean; token?: string };
      if (!json.success || !json.token) { setResult('Registrierung fehlgeschlagen.', 'error'); return; }
      update({ cloudAuthToken: json.token, cloudUserEmail: email.trim() });
      setPassword('');
      setResult('Registrierung erfolgreich.', 'success');
    } catch (err) {
      setResult(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`, 'error');
    } finally { setLoading(false); }
  };

  const handleLogout = () => {
    update({ cloudAuthToken: null, cloudUserEmail: null, cloudProjectId: null, cloudProjectName: null });
    setEmail('');
    setPassword('');
    setAvailableProjects([]);
    setResult('Logout erfolgreich.', 'info');
  };

  const startSsoPolling = useCallback((sessionKey: string) => {
    if (ssoPollingRef.current) clearInterval(ssoPollingRef.current);
    let attempts = 0;
    ssoPollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 150) {
        clearInterval(ssoPollingRef.current!);
        ssoPollingRef.current = null;
        setResult('SSO Timeout. Bitte erneut versuchen.', 'error');
        return;
      }
      try {
        const res = await fetch(`${baseUrl}/oauth_poll_session.php?session_key=${encodeURIComponent(sessionKey)}`);
        const json = await res.json() as { success?: boolean; token?: string; email?: string };
        if (json.success && json.token) {
          clearInterval(ssoPollingRef.current!);
          ssoPollingRef.current = null;
          const next = patchZenStudioSettings({ cloudAuthToken: json.token, cloudUserEmail: json.email ?? null });
          setSettings(next);
          if (json.email) setEmail(json.email);
          setResult('SSO Login erfolgreich. Projekt wird gesucht…', 'success');
          void autoSeedProject(json.token);
        }
      } catch { /* ignore */ }
    }, 2000);
  }, [baseUrl, autoSeedProject]);

  const handleSso = (provider: 'google' | 'apple') => {
    if (!baseUrl) { setResult('API Base URL fehlt.', 'error'); return; }
    if (isTauri()) {
      const sessionKey = crypto.randomUUID();
      void openExternal(`${baseUrl}/oauth_${provider}_start.php?session_key=${encodeURIComponent(sessionKey)}`);
      setResult('SSO im Browser geöffnet. Warte auf Anmeldung…', 'info');
      startSsoPolling(sessionKey);
    } else {
      window.open(`${baseUrl}/oauth_${provider}_start.php?return_url=${encodeURIComponent(window.location.origin)}`, '_blank', 'noopener,noreferrer');
      setResult('SSO im Browser geöffnet.', 'info');
    }
  };

  const handleSelectProject = (projectId: number) => {
    const project = availableProjects.find((p) => p.id === projectId);
    if (!project) return;
    patchZenStudioSettings({ cloudProjectId: project.id, cloudProjectName: project.name });
    setSettings(loadZenStudioSettings());
    window.dispatchEvent(new CustomEvent('zenpost:cloud-login', { detail: { projectId: project.id, projectName: project.name } }));
    setResult(`Projekt gewechselt: ${project.name}`, 'success');
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!settings.cloudAuthToken) return;
    setDeletingProject(true); setConfirmDeleteProjectId(null);
    try {
      const { status } = await zenFetch(`${baseUrl}/projects_delete.php`, 'POST', { 'Content-Type': 'application/json', 'X-Auth-Token': settings.cloudAuthToken }, JSON.stringify({ id: projectId }));
      if (status >= 200 && status < 300) {
        setAvailableProjects((prev) => prev.filter((p) => p.id !== projectId));
        const remaining = availableProjects.filter((p) => p.id !== projectId);
        if (settings.cloudProjectId === projectId) {
          const next = remaining[0] ?? null;
          patchZenStudioSettings({ cloudProjectId: next?.id ?? null, cloudProjectName: next?.name ?? null });
          setSettings(loadZenStudioSettings());
        }
        setResult(`Projekt #${projectId} gelöscht.`, 'success');
      } else {
        setResult(`Löschen fehlgeschlagen (${status})`, 'error');
      }
    } catch (err) {
      setResult(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`, 'error');
    } finally { setDeletingProject(false); }
  };

  const isLoggedIn = !!settings.cloudAuthToken;

  return (
    <div className="w-full flex justify-center" style={{ padding: '32px 32px' }}>
      <div className="w-full max-w-[860px] rounded-[10px] bg-[#E8E1D2] border border-[#AC8E66]/60 overflow-hidden">

        {/* Header */}
        <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid rgba(172,142,102,0.3)', background: 'rgba(172,142,102,0.05)' }}>
          <div style={{ fontFamily: fontMono, fontSize: 9, letterSpacing: '0.12em', color: gold, textTransform: 'uppercase', marginBottom: 4 }}>
            ZenCloud
          </div>
          <div style={{ fontFamily: fontMono, fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
            {isLoggedIn ? `Eingeloggt als ${settings.cloudUserEmail ?? 'User'}` : 'Anmelden'}
          </div>
          <div style={{ fontFamily: fontMono, fontSize: 10, color: '#777', marginTop: 3 }}>
            {isLoggedIn ? `Aktives Projekt: ${settings.cloudProjectName ?? `#${settings.cloudProjectId}`}` : 'Mit ZenCloud verbinden für Cloud-Sync'}
          </div>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Status */}
          {statusMsg && (
            <div style={{
              fontFamily: fontMono,
              fontSize: 10,
              color: statusKind === 'error' ? '#B3261E' : statusKind === 'success' ? '#1F8A41' : '#555',
              background: statusKind === 'error' ? 'rgba(179,38,30,0.06)' : statusKind === 'success' ? 'rgba(31,138,65,0.06)' : 'rgba(172,142,102,0.06)',
              border: `1px solid ${statusKind === 'error' ? 'rgba(179,38,30,0.25)' : statusKind === 'success' ? 'rgba(31,138,65,0.25)' : 'rgba(172,142,102,0.25)'}`,
              borderRadius: 6,
              padding: '10px 14px',
            }}>
              {statusMsg}
            </div>
          )}

          {/* Login-Form */}
          {!isLoggedIn && (
            <>
              <div>
                <SectionLabel>E-Mail & Passwort</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <FieldLabel>E-Mail</FieldLabel>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
                  </div>
                  <div>
                    <FieldLabel>Passwort</FieldLabel>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} placeholder="••••••••" style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    <button onClick={handleLogin} disabled={loading} style={primaryBtn}>
                      {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Login'}
                    </button>
                    <button onClick={handleRegister} disabled={loading} style={ghostBtn}>Konto erstellen</button>
                  </div>
                </div>
              </div>

              <Divider />

              <div>
                <SectionLabel>Oder anmelden mit</SectionLabel>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => handleSso('google')} style={ssoBtn}>
                    <FontAwesomeIcon icon={faGoogleBrand} style={{ fontSize: 12 }} />
                    Google
                  </button>
                  <button type="button" onClick={() => handleSso('apple')} style={ssoBtn}>
                    <FontAwesomeIcon icon={faApple} style={{ fontSize: 12 }} />
                    Apple
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Eingeloggt */}
          {isLoggedIn && (
            <>
              <div>
                <SectionLabel>Aktives Projekt</SectionLabel>
                {availableProjects.length > 0 ? (
                  <ZenDropdown
                    value={String(settings.cloudProjectId ?? '')}
                    onChange={(val: string) => {
                      if (val === '__delete__') { setConfirmDeleteProjectId(settings.cloudProjectId ?? null); return; }
                      handleSelectProject(Number(val));
                    }}
                    options={[
                      ...availableProjects.map((p) => ({ value: String(p.id), label: `${p.name}` })),
                      { value: '__delete__', label: '— Aktives Projekt löschen' },
                    ]}
                    theme="paper"
                    variant="input"
                    placeholder="Projekt wählen…"
                  />
                ) : (
                  <div style={{ fontFamily: fontMono, fontSize: 11, color: '#555', border: '1px solid rgba(172,142,102,0.3)', borderRadius: 8, padding: '10px 12px', background: 'rgba(255,255,255,0.35)' }}>
                    {settings.cloudProjectId ? `${settings.cloudProjectName ?? 'Projekt'} (#${settings.cloudProjectId})` : 'Kein Projekt gesetzt'}
                  </div>
                )}
              </div>

              <Divider />

              <div>
                <button
                  onClick={handleLogout}
                  disabled={loading}
                  style={{ ...ghostBtn, color: '#B3261E', borderColor: 'rgba(179,38,30,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <FontAwesomeIcon icon={faRightFromBracket} style={{ fontSize: 11 }} />
                  Logout
                </button>
              </div>
            </>
          )}

          {/* Projekt löschen Bestätigung */}
          {confirmDeleteProjectId !== null && (
            <div style={{ border: '1px solid rgba(179,38,30,0.4)', borderRadius: 8, background: 'rgba(179,38,30,0.05)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, fontFamily: fontMono, fontSize: 10, color: '#8f1d16' }}>
              <FontAwesomeIcon icon={faTriangleExclamation} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>
                Projekt <strong>#{confirmDeleteProjectId}</strong> wirklich löschen?<br />
                <span style={{ color: '#b55', fontSize: 9 }}>Alle Dokumente werden unwiderruflich gelöscht.</span>
              </span>
              <button onClick={() => { void handleDeleteProject(confirmDeleteProjectId); }} disabled={deletingProject}
                style={{ background: '#B3261E', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '6px 14px', fontFamily: fontMono, fontSize: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                {deletingProject ? <FontAwesomeIcon icon={faSpinner} spin /> : <><FontAwesomeIcon icon={faTrash} /> Löschen</>}
              </button>
              <button onClick={() => setConfirmDeleteProjectId(null)} disabled={deletingProject}
                style={{ background: 'transparent', border: '1px solid rgba(172,142,102,0.4)', borderRadius: 6, color: '#555', cursor: 'pointer', padding: '6px 12px', fontFamily: fontMono, fontSize: 10 }}>
                Abbrechen
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
