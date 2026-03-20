import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faEnvelope,
  faArrowRight,
  faArrowLeft,
  faEye,
  faEyeSlash,
  faCircleCheck,
  faRotate,
  faTriangleExclamation,
  faDownload,
  faDice,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import {
  loadZenStudioSettings,
  patchZenStudioSettings,
  defaultNewsletterConfig,
  defaultPhpGenConfig,
  type NewsletterConfig,
  type NewsletterProvider,
  type NewsletterPhpGenConfig,
} from '../../../../../services/zenStudioSettingsService';
import {
  generateAndDownloadPhpBackend,
  deriveNotifyEndpoint,
} from '../../../../../utils/newsletterPhpGenerator';

// ── Design tokens ──────────────────────────────────────────
const paper   = '#E8E1D2';
const gold    = '#AC8E66';
const goldDim = 'rgba(172,142,102,0.45)';
const mono    = 'IBM Plex Mono, monospace';
const sans    = 'IBM Plex Sans, sans-serif';

// ── Provider definitions ────────────────────────────────────
interface ProviderDef {
  id: NewsletterProvider;
  label: string;
  description: string;
  fields: ('apiUrl' | 'apiKey' | 'audienceId')[];
  fieldLabels: Partial<Record<'apiUrl' | 'apiKey' | 'audienceId', string>>;
  fieldPlaceholders: Partial<Record<'apiUrl' | 'apiKey' | 'audienceId', string>>;
  docsUrl?: string;
}

const PROVIDERS: ProviderDef[] = [
  {
    id: 'php-generator' as NewsletterProvider,
    label: 'PHP Backend generieren',
    description: 'ZenPost Studio erstellt dein komplettes Newsletter-Backend als ZIP. Einfach hochladen — fertig.',
    fields: [],
    fieldLabels: {},
    fieldPlaceholders: {},
  } as unknown as ProviderDef,
  {
    id: 'custom-api',
    label: 'Eigenes System (bereits vorhanden)',
    description: 'Du hast bereits einen newsletter-notify.php Endpoint — trage die URL ein.',
    fields: ['apiUrl', 'apiKey'],
    fieldLabels: { apiUrl: 'Endpoint URL', apiKey: 'API Key' },
    fieldPlaceholders: {
      apiUrl: 'https://deinserver.de/api/newsletter-notify.php',
      apiKey: 'dein-api-key',
    },
  },
  {
    id: 'mailchimp',
    label: 'Mailchimp',
    description: 'Sendet neue Posts als Campaign-Draft an deine Mailchimp Audience.',
    fields: ['apiKey', 'audienceId'],
    fieldLabels: { apiKey: 'API Key', audienceId: 'Audience ID' },
    fieldPlaceholders: { apiKey: 'abc123-us1', audienceId: 'a1b2c3d4e5' },
    docsUrl: 'https://mailchimp.com/help/about-api-keys/',
  },
  {
    id: 'beehiiv',
    label: 'Beehiiv',
    description: 'Erstellt automatisch einen neuen Post-Draft in deiner Beehiiv-Publication.',
    fields: ['apiKey', 'audienceId'],
    fieldLabels: { apiKey: 'API Key', audienceId: 'Publication ID' },
    fieldPlaceholders: { apiKey: 'your_beehiiv_api_key', audienceId: 'pub_xxxxxxxxxx' },
    docsUrl: 'https://developers.beehiiv.com/',
  },
  {
    id: 'buttondown',
    label: 'Buttondown',
    description: 'Schickt den Post als Draft-Email an deine Buttondown-Subscriber.',
    fields: ['apiKey'],
    fieldLabels: { apiKey: 'API Key' },
    fieldPlaceholders: { apiKey: 'your-buttondown-api-key' },
    docsUrl: 'https://buttondown.com/api/emails',
  },
];

// ── Input field ─────────────────────────────────────────────
const InputField = ({
  label, value, onChange, placeholder, secret = false, hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secret?: boolean;
  hint?: string;
}) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: mono, fontSize: 9, color: gold, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type={secret && !show ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'transparent', border: `1px solid ${gold}`,
            borderRadius: 6, padding: secret ? '7px 36px 7px 12px' : '7px 12px',
            fontFamily: mono, fontSize: 11, color: '#1a1a1a',
            outline: 'none',
          }}
        />
        {secret && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: gold, padding: 0 }}
          >
            <FontAwesomeIcon icon={show ? faEyeSlash : faEye} style={{ fontSize: 11 }} />
          </button>
        )}
      </div>
      {hint && <div style={{ fontFamily: mono, fontSize: 9, color: '#888', marginTop: 4 }}>{hint}</div>}
    </div>
  );
};

// ── Main component ──────────────────────────────────────────
export const ZenNewsletterSettingsContent = () => {
  const [settings, setSettings]     = useState(() => loadZenStudioSettings());
  const [testing, setTesting]       = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genDone, setGenDone]       = useState(false);
  const [backHover, setBackHover]   = useState(false);

  const nl: NewsletterConfig = settings.newsletter ?? { ...defaultNewsletterConfig };
  const step = nl.wizardStep ?? 0;

  const patch = (partial: Partial<NewsletterConfig>) => {
    const next = patchZenStudioSettings({ newsletter: { ...nl, ...partial } });
    setSettings(next);
    setTestResult(null);
  };

  const patchGen = (partial: Partial<NewsletterPhpGenConfig>) => {
    patch({ phpGen: { ...(nl.phpGen ?? defaultPhpGenConfig), ...partial } });
  };

  const selectedProvider = PROVIDERS.find(p => p.id === nl.provider);

  // ── Step 0: Choose provider ─────────────────────────────
  const renderStep0 = () => (
    <div>
      <div style={{ fontFamily: mono, fontSize: 10, color: gold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
        Wähle dein Newsletter-System
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {PROVIDERS.map(p => {
          const selected = nl.provider === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => patch({ provider: p.id })}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                background: selected ? 'rgba(172,142,102,0.12)' : 'rgba(172,142,102,0.04)',
                border: `1px solid ${selected ? gold : goldDim}`,
                borderRadius: 8, padding: '14px 16px',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                border: `1.5px solid ${selected ? gold : goldDim}`,
                background: selected ? gold : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {selected && <FontAwesomeIcon icon={faCheck} style={{ fontSize: 8, color: '#fff' }} />}
              </div>
              <div>
                <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>{p.label}</div>
                <div style={{ fontFamily: sans, fontSize: 11, color: '#555', lineHeight: 1.5 }}>{p.description}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          disabled={nl.provider === 'none'}
          onClick={() => patch({ wizardStep: 1 })}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: nl.provider === 'none' ? '#ccc' : gold,
            color: '#fff', border: 'none', borderRadius: 6,
            padding: '9px 20px', fontFamily: mono, fontSize: 11,
            cursor: nl.provider === 'none' ? 'not-allowed' : 'pointer',
          }}
        >
          Weiter <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: 10 }} />
        </button>
      </div>
    </div>
  );

  // ── Step 1b: PHP Generator ────────────────────────────────
  const renderStepGen = () => {
    const g: NewsletterPhpGenConfig = nl.phpGen ?? { ...defaultPhpGenConfig };
    const isSmtp = g.emailMethod === 'smtp';

    const storage = g.storageMethod ?? 'mysql';
    const dbValid = storage !== 'mysql' ||
      (g.dbHost.trim() !== '' && g.dbName.trim() !== '' && g.dbUser.trim() !== '');

    const canGenerate =
      g.fromEmail.trim() !== '' &&
      g.fromName.trim() !== '' &&
      g.siteUrl.trim() !== '' &&
      g.apiBaseUrl.trim() !== '' &&
      g.apiKey.trim() !== '' &&
      dbValid &&
      (!isSmtp || (g.smtpHost.trim() !== '' && g.smtpUser.trim() !== '' && g.smtpPass.trim() !== ''));

    const handleGenerate = async () => {
      setGenerating(true);
      setGenDone(false);
      try {
        await generateAndDownloadPhpBackend(g);
        const notifyUrl = deriveNotifyEndpoint(g);
        patch({ apiUrl: notifyUrl, apiKey: g.apiKey, wizardStep: 2, enabled: true });
        setGenDone(true);
      } catch {
        // generation error — keep on step 1
      } finally {
        setGenerating(false);
      }
    };

    const randomKey = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      return Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    const sectionLabel = (label: string) => (
      <div style={{ fontFamily: mono, fontSize: 9, color: gold, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 1, background: `${gold}33` }} />
        {label}
        <div style={{ flex: 1, height: 1, background: `${gold}33` }} />
      </div>
    );

    return (
      <div>
        <button type="button"
          onClick={() => patch({ wizardStep: 0 })}
          onMouseEnter={() => setBackHover(true)}
          onMouseLeave={() => setBackHover(false)}
          style={{ display: 'flex',
            alignItems: 'center',
            gap: 6, background: 'none', border: 'none', cursor: 'pointer',
            color: gold, fontFamily: mono, fontSize: 10, marginBottom: 20, padding: 10,
            transform: backHover ? 'translateX(-3px)' : 'translateX(0)', opacity: backHover ? 0.8 : 1,
          }}
        >
          <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: 9 }} /> Zurück
        </button>



        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <FontAwesomeIcon icon={faWandMagicSparkles} style={{ color: gold, fontSize: 13 }} />
          <span style={{ fontFamily: mono, fontSize: 12, color: '#1a1a1a' }}>PHP Backend generieren</span>
          <span style={{ background: gold, color: '#fff', fontFamily: mono, fontSize: 8, padding: '2px 7px', borderRadius: 10, letterSpacing: 0.5 }}>STARTER</span>
        </div>
        <div style={{ fontFamily: sans, fontSize: 11, color: '#666', lineHeight: 1.6, marginBottom: 22 }}>
          Fülle die Felder aus — ZenPost Studio erstellt dein komplettes Newsletter-Backend als ZIP-Datei.
          Einfach hochladen, SQL ausführen, fertig.
        </div>

        {/* ── E-Mail Versand ── */}
        {sectionLabel('E-Mail Versand')}

        {/* Method Toggle */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: gold, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 6 }}>
            E-Mail Methode
          </div>
          <div style={{ display: 'flex', gap: 0, border: `1px solid ${goldDim}`, borderRadius: 6, overflow: 'hidden' }}>
            {([['php-mail', 'IONOS / Shared Hosting'], ['smtp', 'SMTP (andere Anbieter)']] as const).map(([val, label]) => {
              const active = g.emailMethod === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => patchGen({ emailMethod: val })}
                  style={{
                    flex: 1, padding: '8px 12px', fontFamily: mono, fontSize: 10,
                    background: active ? 'rgba(172,142,102,0.15)' : 'transparent',
                    color: active ? gold : '#888', border: 'none', cursor: 'pointer',
                    borderRight: val === 'php-mail' ? `1px solid ${goldDim}` : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {active && <FontAwesomeIcon icon={faCheck} style={{ fontSize: 8, marginRight: 5 }} />}
                  {label}
                </button>
              );
            })}
          </div>
          {g.emailMethod === 'php-mail' && (
            <div style={{ fontFamily: mono, fontSize: 9, color: '#888', marginTop: 5, lineHeight: 1.5 }}>
              Nutzt PHP's eingebautes <code>mail()</code> — funktioniert direkt auf IONOS/Shared Hosting ohne Konfiguration.
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <InputField label="Absender E-Mail" value={g.fromEmail} onChange={v => patchGen({ fromEmail: v })} placeholder="newsletter@meinblog.de" />
          <InputField label="Absendername" value={g.fromName} onChange={v => patchGen({ fromName: v })} placeholder="Max Mustermann · Blog" />
        </div>

        {isSmtp && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0 16px' }}>
              <InputField label="SMTP Host" value={g.smtpHost} onChange={v => patchGen({ smtpHost: v })} placeholder="smtp.ionos.de" />
              <InputField label="SMTP Port" value={g.smtpPort} onChange={v => patchGen({ smtpPort: v })} placeholder="587" />
            </div>
            <InputField label="SMTP Benutzer" value={g.smtpUser} onChange={v => patchGen({ smtpUser: v })} placeholder="user@meinblog.de" />
            <InputField label="SMTP Passwort" value={g.smtpPass} onChange={v => patchGen({ smtpPass: v })} secret />
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: gold, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 6 }}>Verschlüsselung</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['tls', 'ssl'] as const).map(enc => (
                  <button key={enc} type="button" onClick={() => patchGen({ smtpEncryption: enc })}
                    style={{ padding: '5px 14px', fontFamily: mono, fontSize: 10, borderRadius: 5, cursor: 'pointer', transition: 'all 0.15s',
                      background: g.smtpEncryption === enc ? 'rgba(172,142,102,0.15)' : 'transparent',
                      border: `1px solid ${g.smtpEncryption === enc ? gold : goldDim}`,
                      color: g.smtpEncryption === enc ? gold : '#888' }}>
                    {enc.toUpperCase()} {enc === 'tls' ? '(587)' : '(465)'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Datenspeicher ── */}
        {sectionLabel('Datenspeicher')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {([
            { id: 'json',   label: 'JSON-Datei',   badge: 'EINFACH',   desc: 'Kein Setup, keine Datenbank — Subscriber in einer Textdatei. Perfekt für Einsteiger.' },
            { id: 'sqlite', label: 'SQLite',        badge: 'SMART',     desc: 'Eine einzelne Datei auf dem Server — schneller als JSON, kein Datenbankserver nötig.' },
            { id: 'mysql',  label: 'MySQL/MariaDB', badge: 'KLASSISCH', desc: 'Klassische Datenbank — benötigt DB-Server, Tabelle wird mit setup.sql angelegt.' },
          ] as const).map(({ id, label, badge, desc }) => {
            const active = (g.storageMethod ?? 'mysql') === id;
            return (
              <button key={id} type="button" onClick={() => patchGen({ storageMethod: id })}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  background: active ? 'rgba(172,142,102,0.1)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${active ? gold : goldDim}`,
                  borderRadius: 8, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                  border: `1.5px solid ${active ? gold : goldDim}`,
                  background: active ? gold : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {active && <FontAwesomeIcon icon={faCheck} style={{ fontSize: 7, color: '#fff' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontFamily: mono, fontSize: 11, color: '#1a1a1a' }}>{label}</span>
                    <span style={{
                      background: active ? gold : 'rgba(172,142,102,0.2)',
                      color: active ? '#fff' : gold,
                      fontFamily: mono, fontSize: 7, padding: '2px 6px', borderRadius: 8, letterSpacing: 0.5,
                    }}>{badge}</span>
                  </div>
                  <div style={{ fontFamily: sans, fontSize: 10, color: '#777', lineHeight: 1.5 }}>{desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* MySQL fields */}
        {(g.storageMethod ?? 'mysql') === 'mysql' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <InputField label="DB Host" value={g.dbHost} onChange={v => patchGen({ dbHost: v })} placeholder="localhost" />
            <InputField label="DB Name" value={g.dbName} onChange={v => patchGen({ dbName: v })} placeholder="mein_blog_db" />
            <InputField label="DB Benutzer" value={g.dbUser} onChange={v => patchGen({ dbUser: v })} placeholder="db_user" />
            <InputField label="DB Passwort" value={g.dbPass} onChange={v => patchGen({ dbPass: v })} placeholder="••••••••" secret />
          </div>
        )}

        {/* SQLite path */}
        {(g.storageMethod) === 'sqlite' && (
          <InputField label="SQLite Dateipfad (relativ zum API-Ordner)" value={g.sqlitePath ?? '../data/subscribers.sqlite'} onChange={v => patchGen({ sqlitePath: v })} placeholder="../data/subscribers.sqlite"
            hint="Tipp: Einen Ordner höher als den öffentlichen Webordner wählen (z.B. ../data/)." />
        )}

        {/* JSON info */}
        {(g.storageMethod) === 'json' && (
          <div style={{ background: 'rgba(172,142,102,0.07)', border: `1px solid ${goldDim}`, borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontFamily: mono, fontSize: 10, color: '#666', lineHeight: 1.6 }}>
            ◆ <strong>subscribers.json</strong> wird automatisch im API-Ordner erstellt.<br/>
            Kein Setup nötig — einfach Dateien hochladen und fertig.
          </div>
        )}

        {/* ── URLs & Sicherheit ── */}
        {sectionLabel('URLs & Sicherheit')}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: gold, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 6 }}>API Key</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <InputField label="" value={g.apiKey} onChange={v => patchGen({ apiKey: v })} placeholder="mein-geheimer-key" secret />
            </div>
            <button
              type="button"
              onClick={() => patchGen({ apiKey: randomKey() })}
              title="Zufälligen Key generieren"
              style={{ height: 32, padding: '0 12px', background: 'transparent', border: `1px solid ${goldDim}`, borderRadius: 6, color: gold, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: mono, fontSize: 9, display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <FontAwesomeIcon icon={faDice} style={{ fontSize: 10 }} /> generieren
            </button>
          </div>
          {/* Blog-PHP Key Hinweis */}
          {(() => {
            const blogKey = settings.blogs.find(b => b.phpApiKey)?.phpApiKey;
            if (!blogKey) return null;
            return (
              <div style={{ marginTop: 7, fontFamily: mono, fontSize: 9, color: '#888', lineHeight: 1.6 }}>
                Empfohlen: denselben Key wie dein Blog-PHP verwenden — beide Endpunkte werden von ZenPost Studio aufgerufen.{' '}
                <button
                  type="button"
                  onClick={() => patchGen({ apiKey: blogKey })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: gold, fontFamily: mono, fontSize: 9, padding: 0, textDecoration: 'underline' }}
                >
                  Blog-Key übernehmen →
                </button>
              </div>
            );
          })()}
        </div>

        <InputField label="Blog URL (für CORS)" value={g.siteUrl} onChange={v => patchGen({ siteUrl: v })} placeholder="https://meinblog.de"
          hint="Die Hauptadresse deines Blogs — wird für CORS-Freigabe benötigt." />
        <InputField label="API-Verzeichnis URL" value={g.apiBaseUrl} onChange={v => patchGen({ apiBaseUrl: v })} placeholder="https://meinblog.de/api"
          hint="URL-Pfad wo die PHP-Dateien hochgeladen werden (kein abschließendes /)." />

        {/* ── Download Button ── */}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontFamily: sans, fontSize: 10, color: '#888', lineHeight: 1.5, maxWidth: 340 }}>
            ZIP enthält alle PHP-Dateien, setup.sql und eine Schritt-für-Schritt Anleitung.
          </div>
          <button
            type="button"
            disabled={!canGenerate || generating}
            onClick={handleGenerate}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
              background: !canGenerate || generating ? '#1a1a1a' : gold,
              color: '#fff', border: 'none', borderRadius: 6,
              padding: '10px 22px', fontFamily: mono, fontSize: 11,
              cursor: !canGenerate || generating ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <FontAwesomeIcon icon={generating ? faRotate : faDownload} spin={generating} style={{ fontSize: 11,  }} />
            {generating ? 'Generiere…' : genDone ? 'Erneut herunterladen' : 'PHP Backend herunterladen'}
          </button>
        </div>

        {genDone && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontFamily: mono, fontSize: 10, color: '#4a7c59' }}>
            <FontAwesomeIcon icon={faCircleCheck} style={{ fontSize: 11 }} />
            ZIP heruntergeladen. Weiterleitung zu Schritt 2…
          </div>
        )}
      </div>
    );
  };

  // ── Step 1: Configure ────────────────────────────────────
  const handleTest = async () => {
    if (!selectedProvider || !nl.apiUrl) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(nl.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': nl.apiKey },
        body: JSON.stringify({ ping: true }),
      });
      setTestResult(res.ok || res.status === 400
        ? { ok: true, msg: 'Verbindung erfolgreich.' }
        : { ok: false, msg: `Server antwortete mit ${res.status}.` }
      );
    } catch {
      setTestResult({ ok: false, msg: 'Endpoint nicht erreichbar.' });
    } finally {
      setTesting(false);
    }
  };

  const canFinish = nl.apiKey.trim().length > 0 &&
    (selectedProvider?.fields.includes('apiUrl') ? nl.apiUrl.trim().length > 0 : true) &&
    (selectedProvider?.fields.includes('audienceId') ? nl.audienceId.trim().length > 0 : true);

  const renderStep1 = () => {
    if (nl.provider === 'php-generator') return renderStepGen();
    return (
    <div>
      <button
        type="button"
        onClick={() => patch({ wizardStep: 0 })}
        style={{ display: 'flex', 
          alignItems: 'center', 
          gap: 6, 
          background: 'none', 
          border: 'none', cursor: 'pointer', 
          color: gold, 
          fontFamily: mono, 
          fontSize: 10, 
          marginBottom: 20, 
          padding: 0 
        }}
      >
        <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: 9 }} /> Zurück
      </button>

      <div style={{ fontFamily: mono, fontSize: 10, color: gold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
        {selectedProvider?.label} konfigurieren
      </div>
      <div style={{ fontFamily: sans, fontSize: 11, color: '#666', marginBottom: 20, lineHeight: 1.5 }}>
        {selectedProvider?.description}
        {selectedProvider?.docsUrl && (
          <> · <a href={selectedProvider.docsUrl} target="_blank" rel="noopener" style={{ color: gold }}>Docs ↗</a></>
        )}
      </div>

      {selectedProvider?.fields.includes('apiUrl') && (
        <InputField
          label={selectedProvider.fieldLabels.apiUrl ?? 'Endpoint URL'}
          value={nl.apiUrl}
          onChange={v => patch({ apiUrl: v })}
          placeholder={selectedProvider.fieldPlaceholders.apiUrl}
          hint="Der Endpoint der die Benachrichtigung empfängt."
        />
      )}
      {selectedProvider?.fields.includes('apiKey') && (
        <InputField
          label={selectedProvider.fieldLabels.apiKey ?? 'API Key'}
          value={nl.apiKey}
          onChange={v => patch({ apiKey: v })}
          placeholder={selectedProvider.fieldPlaceholders.apiKey}
          secret
        />
      )}
      {selectedProvider?.fields.includes('audienceId') && (
        <InputField
          label={selectedProvider.fieldLabels.audienceId ?? 'Audience / List ID'}
          value={nl.audienceId}
          onChange={v => patch({ audienceId: v })}
          placeholder={selectedProvider.fieldPlaceholders.audienceId}
        />
      )}

      {/* Test connection — only for custom-api */}
      {nl.provider === 'custom-api' && (
        <div style={{ marginBottom: 20 }}>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !nl.apiUrl}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'transparent', border: `1px solid ${goldDim}`,
              borderRadius: 6, padding: '7px 16px',
              fontFamily: mono, fontSize: 10, color: gold,
              cursor: testing || !nl.apiUrl ? 'not-allowed' : 'pointer',
            }}
          >
            <FontAwesomeIcon icon={faRotate} spin={testing} style={{ fontSize: 10 }} />
            {testing ? 'Teste…' : 'Verbindung testen'}
          </button>
          {testResult && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontFamily: mono, fontSize: 10, color: testResult.ok ? '#4a7c59' : '#c0635a' }}>
              <FontAwesomeIcon icon={testResult.ok ? faCircleCheck : faTriangleExclamation} style={{ fontSize: 11 }} />
              {testResult.msg}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          disabled={!canFinish}
          onClick={() => patch({ wizardStep: 2, enabled: true })}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: !canFinish ? '#ccc' : gold,
            color: '#fff', border: 'none', borderRadius: 6,
            padding: '9px 20px', fontFamily: mono, fontSize: 11,
            cursor: !canFinish ? 'not-allowed' : 'pointer',
          }}
        >
          Fertig <FontAwesomeIcon icon={faCheck} style={{ fontSize: 10 }} />
        </button>
      </div>
    </div>
  );
  };

  // ── Step 2: Done ─────────────────────────────────────────
  const renderStep2 = () => {
    const isPhpGen = nl.provider === 'php-generator';
    return (
    <div style={{ textAlign: 'center', padding: '32px 0' }}>
      <FontAwesomeIcon icon={faCircleCheck} style={{ fontSize: 36, color: gold, marginBottom: 16 }} />
      <div style={{ fontFamily: mono, fontSize: 14, fontWeight: 400, color: '#1a1a1a', marginBottom: 8 }}>
        Newsletter aktiv
      </div>
      {isPhpGen ? (
        <div>
          <div style={{ fontFamily: sans, fontSize: 12, color: '#666', lineHeight: 1.6, marginBottom: 8 }}>
            PHP Backend verbunden.
          </div>
          <div style={{ fontFamily: mono, fontSize: 10, color: '#888', background: 'rgba(0,0,0,0.05)', borderRadius: 6, padding: '8px 14px', display: 'inline-block', marginBottom: 16, wordBreak: 'break-all' }}>
            {nl.apiUrl}
          </div>
        </div>
      ) : (
        <div style={{ fontFamily: sans, fontSize: 12, color: '#666', lineHeight: 1.6, marginBottom: 8 }}>
          <strong style={{ fontFamily: mono }}>{selectedProvider?.label}</strong> ist verbunden.
        </div>
      )}
      <div style={{ fontFamily: sans, fontSize: 11, color: '#888', lineHeight: 1.6, marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
        Beim nächsten Publish-Vorgang werden alle bestätigten Subscriber automatisch benachrichtigt.
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        {isPhpGen && (
          <button
            type="button"
            onClick={async () => {
              const g = nl.phpGen ?? defaultPhpGenConfig;
              setGenerating(true);
              try { await generateAndDownloadPhpBackend(g); } finally { setGenerating(false); }
            }}
            disabled={generating}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${goldDim}`, borderRadius: 6, padding: '7px 16px', fontFamily: mono, fontSize: 10, color: gold, cursor: 'pointer' }}
          >
            <FontAwesomeIcon icon={generating ? faRotate : faDownload} spin={generating} style={{ fontSize: 9 }} />
            ZIP erneut herunterladen
          </button>
        )}
        <button
          type="button"
          onClick={() => patch({ wizardStep: 1 })}
          style={{ background: 'transparent', border: `1px solid ${goldDim}`, borderRadius: 6, padding: '7px 16px', fontFamily: mono, fontSize: 10, color: gold, cursor: 'pointer' }}
        >
          Einstellungen ändern
        </button>
        <button
          type="button"
          onClick={() => patch({ ...defaultNewsletterConfig })}
          style={{ background: 'transparent', border: `1px solid rgba(192,99,90,0.4)`, borderRadius: 6, padding: '7px 16px', fontFamily: mono, fontSize: 10, color: '#c0635a', cursor: 'pointer' }}
        >
          Verbindung trennen
        </button>
      </div>
    </div>
  );
  };

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="w-full flex justify-center" style={{ padding: '32px 32px' }}>
      <div className="w-full max-w-[860px] rounded-[10px] shadow-2xl" style={{ background: paper, border: `1px solid ${goldDim}` }}>

        {/* Header */}
        <div style={{ borderBottom: `1px solid ${goldDim}`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FontAwesomeIcon icon={faEnvelope} style={{ color: gold, fontSize: 13 }} />
            <span style={{ fontFamily: mono, fontSize: 12, color: '#1a1a1a' }}>Newsletter</span>
          </div>
          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {['Provider', 'Konfiguration', 'Aktiv'].map((label, i) => (
              <React.Fragment key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: step > i ? gold : step === i ? 'rgba(172,142,102,0.2)' : 'transparent',
                    border: `1px solid ${step >= i ? gold : goldDim}`,
                    fontFamily: mono, fontSize: 8, color: step > i ? '#fff' : step === i ? gold : '#aaa',
                  }}>
                    {step > i ? <FontAwesomeIcon icon={faCheck} style={{ fontSize: 7 }} /> : i + 1}
                  </div>
                  <span style={{ fontFamily: mono, fontSize: 8, color: step === i ? gold : '#aaa' }}>{label}</span>
                </div>
                {i < 2 && <div style={{ width: 16, height: 1, background: step > i ? gold : goldDim }} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
        </div>
      </div>
    </div>
  );
};
