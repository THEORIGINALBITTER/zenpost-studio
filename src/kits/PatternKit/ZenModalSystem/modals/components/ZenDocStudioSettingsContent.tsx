import { useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faServer, faCodeBranch, faGlobe, faTrash, faRotateRight, faLinkSlash } from '@fortawesome/free-solid-svg-icons';
import {
  listDocStudioProjects,
  clearServerConfig,
  clearGitHubConfig,
  clearDocsSiteConfig,
  clearAllDocStudioConfigs,
  type DocStudioProjectSummary,
} from '../../../../../services/docStudioService';

const gold = '#AC8E66';
const fontMono = 'IBM Plex Mono, monospace';

const SectionLabel = ({ children }: { children: string }) => (
  <div style={{ fontFamily: fontMono, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', color: '#1a1a1a', textTransform: 'uppercase' as const, marginBottom: 14 }}>
    {children}
  </div>
);

const Badge = ({ label, color, icon }: { label: string; color: string; icon: typeof faServer }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, color, background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 4, padding: '2px 7px', fontFamily: fontMono }}>
    <FontAwesomeIcon icon={icon} style={{ fontSize: 8 }} />
    {label}
  </span>
);

const ghostBtn: React.CSSProperties = {
  border: '1px solid rgba(172,142,102,0.4)', borderRadius: 6, padding: '5px 10px',
  fontFamily: fontMono, fontSize: 10, color: '#444', background: 'transparent', cursor: 'pointer',
};

const dangerBtn: React.CSSProperties = {
  border: '1px solid rgba(179,38,30,0.35)', borderRadius: 6, padding: '5px 10px',
  fontFamily: fontMono, fontSize: 10, color: '#B3261E', background: 'transparent', cursor: 'pointer',
};

export const ZenDocStudioSettingsContent = () => {
  const [projects, setProjects] = useState<DocStudioProjectSummary[]>(() => listDocStudioProjects());

  const refresh = useCallback(() => setProjects(listDocStudioProjects()), []);

  const handleClearServer = (p: DocStudioProjectSummary) => {
    clearServerConfig(p.projectPath);
    refresh();
  };
  const handleClearGitHub = (p: DocStudioProjectSummary) => {
    clearGitHubConfig(p.projectPath);
    refresh();
  };
  const handleClearDocsSite = (p: DocStudioProjectSummary) => {
    clearDocsSiteConfig(p.projectPath);
    refresh();
  };
  const handleClearAll = (p: DocStudioProjectSummary) => {
    clearAllDocStudioConfigs(p.projectPath);
    refresh();
  };

  return (
    <div className="w-full flex justify-center" style={{ padding: '32px 32px' }}>
      <div className="w-full max-w-[860px]" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div className="rounded-[10px] bg-[#E8E1D2] border border-[#AC8E66]/60 overflow-hidden">
          <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid rgba(172,142,102,0.3)', background: 'rgba(172,142,102,0.05)' }}>
            <div style={{ fontFamily: fontMono, fontSize: 9, letterSpacing: '0.12em', color: gold, textTransform: 'uppercase', marginBottom: 4 }}>Doc Studio</div>
            <div style={{ fontFamily: fontMono, fontSize: 13, color: '#1a1a1a' }}>Projekt-Verbindungen verwalten</div>
            <div style={{ fontFamily: fontMono, fontSize: 10, color: '#777', marginTop: 3 }}>
              Server, GitHub und Docs-Site Konfigurationen je Projekt
            </div>
          </div>

          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <SectionLabel>Konfigurierte Projekte</SectionLabel>
              <button onClick={refresh} style={ghostBtn} title="Aktualisieren">
                <FontAwesomeIcon icon={faRotateRight} style={{ fontSize: 10, marginRight: 5 }} />
                Aktualisieren
              </button>
            </div>

            {projects.length === 0 ? (
              <div style={{ fontFamily: fontMono, fontSize: 11, color: '#252525', padding: '16px 0' }}>
                Keine Doc Studio Konfigurationen gefunden.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {projects.map((p) => (
                  <div key={p.projectPath} style={{ background: '#d2cabd', border: '0.5px solid rgba(172,142,102,0.3)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Project name + badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: fontMono, fontSize: 12, color: '#1a1a1a', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.projectName}
                      </span>
                      {p.hasServer && <Badge label="Server/FTP" color="#1F8A41" icon={faServer} />}
                      {p.hasGitHub && <Badge label="GitHub" color="#555" icon={faCodeBranch} />}
                      {p.hasDocsSite && <Badge label="Docs-Site" color={gold} icon={faGlobe} />}
                    </div>

                    {/* Path */}
                    <div style={{ fontFamily: fontMono, fontSize: 9, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.projectPath}
                    </div>

                    {p.lastSync && (
                      <div style={{ fontFamily: fontMono, fontSize: 9, color: '#1F8A41' }}>
                        Letzter Sync: {p.lastSync.toLocaleString('de-DE')}
                      </div>
                    )}

                    {/* Actions per connection */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '0.5px solid rgba(172,142,102,0.2)', paddingTop: 10 }}>
                      {p.hasServer && (
                        <button onClick={() => handleClearServer(p)} style={dangerBtn} title="Server/FTP-Verbindung trennen">
                          <FontAwesomeIcon icon={faLinkSlash} style={{ fontSize: 9, marginRight: 4 }} />
                          Server trennen
                        </button>
                      )}
                      {p.hasGitHub && (
                        <button onClick={() => handleClearGitHub(p)} style={dangerBtn} title="GitHub-Verbindung trennen">
                          <FontAwesomeIcon icon={faLinkSlash} style={{ fontSize: 9, marginRight: 4 }} />
                          GitHub trennen
                        </button>
                      )}
                      {p.hasDocsSite && (
                        <button onClick={() => handleClearDocsSite(p)} style={dangerBtn} title="Docs-Site-Konfiguration löschen">
                          <FontAwesomeIcon icon={faLinkSlash} style={{ fontSize: 9, marginRight: 4 }} />
                          Docs-Site trennen
                        </button>
                      )}
                      {(p.hasServer || p.hasGitHub || p.hasDocsSite) && (
                        <button onClick={() => handleClearAll(p)} style={{ ...dangerBtn, marginLeft: 'auto', borderColor: 'rgba(179,38,30,0.6)', fontWeight: 600 }}>
                          <FontAwesomeIcon icon={faTrash} style={{ fontSize: 9, marginRight: 4 }} />
                          Alle trennen
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
