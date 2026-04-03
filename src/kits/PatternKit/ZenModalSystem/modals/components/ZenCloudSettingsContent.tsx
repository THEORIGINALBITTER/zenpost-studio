import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faSpinner, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { useOpenExternal } from '../../../../../hooks/useOpenExternal';
import {
  loadZenStudioSettings,
  patchZenStudioSettings,
  type ZenStudioSettings,
} from '../../../../../services/zenStudioSettingsService';
import { ZenDropdown } from '../../components/ZenDropdown';

const DEFAULT_BASE_URL = 'https://denisbitter.de/stage02/api';

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

  // Beim Öffnen der Settings: wenn bereits eingeloggt, Projektliste sofort laden
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
    if (!baseUrl) {
      setResult('API Base URL fehlt.', 'error');
      return;
    }
    if (!email.trim() || !password.trim()) {
      setResult('Bitte E-Mail und Passwort eingeben.', 'error');
      return;
    }
    setLoading(true);
    setStatusMsg(null);
    setStatusKind(null);
    try {
      const url = `${baseUrl}/login_api.php`;
      const body = JSON.stringify({ email: email.trim(), password: password });
      const { status, text } = await zenFetch(url, 'POST', { 'Content-Type': 'application/json' }, body);
      if (status < 200 || status >= 300) {
        setResult(`Login fehlgeschlagen (${status})`, 'error');
        return;
      }
      const json = JSON.parse(text || '{}') as { success?: boolean; token?: string };
      if (!json.success || !json.token) {
        setResult('Login fehlgeschlagen: ungültige Antwort.', 'error');
        return;
      }
      const next = update({ cloudAuthToken: json.token, cloudUserEmail: email.trim() });
      setPassword('');
      setResult('Login erfolgreich. Projekt wird gesucht…', 'success');
      // Auto-seed: Projekt anlegen/finden direkt nach Login
      try {
        const seedUrl = `${baseUrl}/projects_seed.php`;
        const { status: seedStatus, text: seedText } = await zenFetch(seedUrl, 'POST', { 'X-Auth-Token': json.token });
        if (seedStatus >= 200 && seedStatus < 300) {
          const seedJson = JSON.parse(seedText || '{}') as { success?: boolean; project?: { id?: number; name?: string } };
          if (seedJson.success && seedJson.project?.id) {
            update({ cloudProjectId: seedJson.project.id, cloudProjectName: seedJson.project.name ?? null });
            setResult(`Eingeloggt · Projekt: ${seedJson.project.name ?? 'Projekt'}`, 'success');
            window.dispatchEvent(new CustomEvent('zenpost:cloud-login', {
              detail: { projectId: seedJson.project.id, projectName: seedJson.project.name ?? 'Projekt' },
            }));
          } else {
            setResult('Login erfolgreich. Kein Projekt gefunden — bitte manuell anlegen.', 'success');
          }
        } else {
          setResult('Login erfolgreich.', 'success');
        }
      } catch {
        setResult('Login erfolgreich.', 'success');
      }
      // Mark settings as refreshed for dependent components
      setSettings(next);
    } catch (err) {
      setResult(`Login Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!baseUrl) {
      setResult('API Base URL fehlt.', 'error');
      return;
    }
    if (!email.trim() || !password.trim()) {
      setResult('Bitte E-Mail und Passwort eingeben.', 'error');
      return;
    }
    setLoading(true);
    setStatusMsg(null);
    setStatusKind(null);
    try {
      const url = `${baseUrl}/register_api.php`;
      const body = JSON.stringify({ email: email.trim(), password: password });
      const { status, text } = await zenFetch(url, 'POST', { 'Content-Type': 'application/json' }, body);
      if (status < 200 || status >= 300) {
        setResult(`Registrierung fehlgeschlagen (${status})`, 'error');
        return;
      }
      const json = JSON.parse(text || '{}') as { success?: boolean; token?: string };
      if (!json.success || !json.token) {
        setResult('Registrierung fehlgeschlagen: ungültige Antwort.', 'error');
        return;
      }
      update({ cloudAuthToken: json.token, cloudUserEmail: email.trim() });
      setPassword('');
      setResult('Registrierung erfolgreich.', 'success');
    } catch (err) {
      setResult(`Registrierung Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedProject = async () => {
    if (!baseUrl) {
      setResult('API Base URL fehlt.', 'error');
      return;
    }
    if (!settings.cloudAuthToken) {
      setResult('Bitte zuerst einloggen.', 'error');
      return;
    }
    setLoading(true);
    setStatusMsg(null);
    setStatusKind(null);
    try {
      const url = `${baseUrl}/projects_seed.php`;
      const { status, text } = await zenFetch(url, 'POST', { 'X-Auth-Token': settings.cloudAuthToken });
      if (status < 200 || status >= 300) {
        setResult(`Seed fehlgeschlagen (${status})`, 'error');
        return;
      }
      const json = JSON.parse(text || '{}') as { success?: boolean; project?: { id?: number; name?: string } };
      if (!json.success || !json.project?.id) {
        setResult('Seed fehlgeschlagen: ungültige Antwort.', 'error');
        return;
      }
      update({
        cloudProjectId: json.project.id,
        cloudProjectName: json.project.name ?? null,
      });
      setResult(`Projekt gesetzt: ${json.project.name ?? 'Projekt'}`, 'success');
    } catch (err) {
      setResult(`Seed Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    update({ cloudAuthToken: null, cloudUserEmail: null, cloudProjectId: null, cloudProjectName: null });
    setPassword('');
    setResult('Logout erfolgreich.', 'info');
  };

  const startSsoPolling = useCallback((sessionKey: string) => {
    if (ssoPollingRef.current) clearInterval(ssoPollingRef.current);
    let attempts = 0;
    const maxAttempts = 150; // 5 Minuten bei 2s Intervall
    ssoPollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(ssoPollingRef.current!);
        ssoPollingRef.current = null;
        setResult('SSO Timeout. Bitte erneut versuchen.', 'error');
        return;
      }
      try {
        const pollUrl = `${baseUrl}/oauth_poll_session.php?session_key=${encodeURIComponent(sessionKey)}`;
        const res = await fetch(pollUrl);
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
      } catch { /* Netzwerkfehler ignorieren, weiter pollen */ }
    }, 2000);
  }, [baseUrl, autoSeedProject]);

  const handleSelectProject = (projectId: number) => {
    const project = availableProjects.find((p) => p.id === projectId);
    if (!project) return;
    patchZenStudioSettings({ cloudProjectId: project.id, cloudProjectName: project.name });
    setSettings(loadZenStudioSettings());
    window.dispatchEvent(new CustomEvent('zenpost:cloud-login', {
      detail: { projectId: project.id, projectName: project.name },
    }));
    setResult(`Projekt gewechselt: ${project.name}`, 'success');
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!settings.cloudAuthToken) return;
    setDeletingProject(true);
    setConfirmDeleteProjectId(null);
    try {
      const url = `${baseUrl}/projects_delete.php`;
      const body = JSON.stringify({ id: projectId });
      const { status } = await zenFetch(url, 'POST', {
        'Content-Type': 'application/json',
        'X-Auth-Token': settings.cloudAuthToken,
      }, body);
      if (status >= 200 && status < 300) {
        // Aus Liste + Settings entfernen
        setAvailableProjects((prev) => prev.filter((p) => p.id !== projectId));
        const remaining = availableProjects.filter((p) => p.id !== projectId);
        if (settings.cloudProjectId === projectId) {
          const next = remaining[0] ?? null;
          patchZenStudioSettings({
            cloudProjectId: next?.id ?? null,
            cloudProjectName: next?.name ?? null,
          });
          setSettings(loadZenStudioSettings());
        }
        setResult(`Projekt #${projectId} gelöscht.`, 'success');
      } else {
        setResult(`Löschen fehlgeschlagen (${status})`, 'error');
      }
    } catch (err) {
      setResult(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`, 'error');
    } finally {
      setDeletingProject(false);
    }
  };

  const handleSso = (provider: 'google' | 'apple') => {
    if (!baseUrl) {
      setResult('API Base URL fehlt.', 'error');
      return;
    }
    if (isTauri()) {
      // Desktop: session_key + polling — kein window.opener verfügbar
      const sessionKey = crypto.randomUUID();
      const url = `${baseUrl}/oauth_${provider}_start.php?session_key=${encodeURIComponent(sessionKey)}`;
      void openExternal(url);
      setResult('SSO im Browser geöffnet. Warte auf Anmeldung…', 'info');
      startSsoPolling(sessionKey);
    } else {
      // Web: Popup + postMessage (bestehender Flow)
      const returnUrl = window.location.origin;
      const url = `${baseUrl}/oauth_${provider}_start.php?return_url=${encodeURIComponent(returnUrl)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      setResult('SSO im Browser geöffnet.', 'info');
    }
  };

  const isLoggedIn = !!settings.cloudAuthToken;

  return (
    <div className="w-full flex justify-center" style={{ padding: '32px 32px' }}>
      <div className="w-full max-w-[860px] rounded-[10px] bg-[#E8E1D2] border border-[#1a1a1a]/60 shadow-2xl overflow-hidden">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '24px 32px' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#555' }}>
            Zen Post Login
          </div>

          {!isLoggedIn && (
            <>
              <div style={rowStyle}>
                <label style={labelStyle}>E-Mail</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>

              <div style={rowStyle}>
                <label style={labelStyle}>Passwort</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={handleLogin} disabled={loading} style={primaryBtn}>Login</button>
                <button onClick={handleRegister} disabled={loading} style={ghostBtn}>Konto erstellen</button>
                <button onClick={handleSeedProject} disabled={loading} style={ghostBtn}>Projekt anlegen/finden</button>
              </div>

              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#666' }}>
                Oder anmelden mit:
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => handleSso('google')} style={ghostBtn}>Google</button>
                <button type="button" onClick={() => handleSso('apple')} style={ghostBtn}>Apple</button>
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#888' }}>
                SSO benötigt Provider-Keys im Backend.
              </div>
            </>
          )}

          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#666' }}>
            Status:
          </div>
          <div style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            color: statusKind === 'error' ? '#B3261E' : statusKind === 'success' ? '#1F8A41' : '#1a1a1a',
            border: '1px solid #3A3A3A',
            borderRadius: '8px',
            padding: '10px 12px',
            backgroundColor: 'rgba(255,255,255,0.35)'
          }}>
            {statusMsg ?? (isLoggedIn ? `Eingeloggt als ${settings.cloudUserEmail ?? 'User'}` : 'Nicht eingeloggt')}
          </div>

          {isLoggedIn && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleLogout} disabled={loading} style={ghostDangerBtn}>Logout</button>
            </div>
          )}

          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#666' }}>
            Aktives Projekt:
          </div>
          {availableProjects.length > 0 ? (
            <ZenDropdown
              value={String(settings.cloudProjectId ?? '')}
              onChange={(val: string) => {
                if (val === '__delete__') {
                  setConfirmDeleteProjectId(settings.cloudProjectId ?? null);
                  return;
                }
                handleSelectProject(Number(val));
              }}
              options={[
                ...availableProjects.map((p) => ({ value: String(p.id), label: `#${p.id} — ${p.name}` })),
                { value: '__delete__', label: '— Aktives Projekt löschen' },
              ]}
              theme="paper"
              variant="input"
              placeholder="Projekt wählen…"
            />
          ) : (
            <div style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              color: '#151515',
              border: '1px solid #3A3A3A',
              borderRadius: '8px',
              padding: '10px 12px',
              backgroundColor: 'rgba(255,255,255,0.35)'
            }}>
              {settings.cloudProjectId
                ? `#${settings.cloudProjectId} — ${settings.cloudProjectName ?? 'Projekt'}`
                : 'Kein Projekt gesetzt'}
            </div>
          )}

          {/* Inline-Bestätigung für Projekt löschen */}
          {confirmDeleteProjectId !== null && (
            <div style={{
              border: '1px solid rgba(179,38,30,0.45)',
              borderRadius: 8,
              background: 'rgba(179,38,30,0.06)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 10,
              color: '#8f1d16',
            }}>
              <FontAwesomeIcon icon={faTriangleExclamation} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>
                Projekt <strong>#{confirmDeleteProjectId}</strong> wirklich löschen?<br />
                <span style={{ color: '#b55', fontSize: 9 }}>Alle Dokumente dieses Projekts werden unwiderruflich gelöscht.</span>
              </span>
              <button
                onClick={() => { void handleDeleteProject(confirmDeleteProjectId); }}
                disabled={deletingProject}
                style={{ background: '#B3261E', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '5px 12px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {deletingProject
                  ? <FontAwesomeIcon icon={faSpinner} spin />
                  : <><FontAwesomeIcon icon={faTrash} /> Löschen</>}
              </button>
              <button
                onClick={() => setConfirmDeleteProjectId(null)}
                disabled={deletingProject}
                style={{ background: 'transparent', border: '1px solid #aaa', borderRadius: 6, color: '#555', cursor: 'pointer', padding: '5px 10px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10 }}
              >
                Abbrechen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10px',
  color: '#555',
};

const inputStyle: React.CSSProperties = {
  border: '1px solid #3A3A3A',
  borderRadius: '8px',
  padding: '10px 12px',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '11px',
  color: '#1a1a1a',
  backgroundColor: 'rgba(255,255,255,0.6)',
};

const primaryBtn: React.CSSProperties = {
  border: '1px solid #3A3A3A',
  borderRadius: '8px',
  padding: '10px 14px',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10px',
  color: '#1a1a1a',
  backgroundColor: '#d0cbb8',
  cursor: 'pointer',
};

const ghostBtn: React.CSSProperties = {
  border: '1px solid #3A3A3A',
  borderRadius: '8px',
  padding: '10px 14px',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10px',
  color: '#1a1a1a',
  backgroundColor: 'transparent',
  cursor: 'pointer',
};

const ghostDangerBtn: React.CSSProperties = {
  ...ghostBtn,
  color: '#B3261E',
};
