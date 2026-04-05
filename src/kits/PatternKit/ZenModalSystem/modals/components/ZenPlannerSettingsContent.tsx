import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faBell, faClock, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import {
  loadPlannerBannerConfig,
  savePlannerBannerConfig,
  type BannerMode,
  type PlannerBannerConfig,
} from '../../../../../services/plannerBannerConfig';
import { ZenDropdown } from '../../components/ZenDropdown';

const BEFORE_OPTIONS: { label: string; minutes: number }[] = [
  { label: '15 Minuten vorher', minutes: 15 },
  { label: '30 Minuten vorher', minutes: 30 },
  { label: '1 Stunde vorher', minutes: 60 },
  { label: '2 Stunden vorher', minutes: 120 },
  { label: '4 Stunden vorher', minutes: 240 },
  { label: '1 Tag vorher', minutes: 1440 },
];

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

function ModeCard({
  active,
  onSelect,
  icon,
  label,
  description,
}: {
  active: boolean;
  onSelect: () => void;
  icon: typeof faBell;
  label: string;
  description: string;
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        padding: '14px 16px',
        borderRadius: 8,
        background: active ? 'rgba(172,142,102,0.10)' : 'rgba(255,255,255,0.35)',
        border: active ? `1.5px solid rgba(172,142,102,0.55)` : '1.5px solid rgba(172,142,102,0.2)',
        cursor: 'pointer',
        transition: 'all 0.15s',
        userSelect: 'none',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 6,
        background: active ? 'rgba(172,142,102,0.18)' : 'rgba(172,142,102,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'background 0.15s',
      }}>
        <FontAwesomeIcon icon={icon} style={{ fontSize: 13, color: active ? gold : '#888' }} />
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: fontMono,
          fontSize: 11,
          fontWeight: 600,
          color: active ? '#1a1a1a' : '#444',
          marginBottom: 3,
        }}>
          {label}
        </div>
        <div style={{
          fontFamily: fontMono,
          fontSize: 10,
          color: '#777',
          lineHeight: 1.5,
        }}>
          {description}
        </div>
      </div>

      {/* Checkmark */}
      <div style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        border: active ? `1.5px solid ${gold}` : '1.5px solid #ccc',
        backgroundColor: active ? 'rgba(172,142,102,0.18)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 2,
        transition: 'all 0.15s',
      }}>
        {active && <FontAwesomeIcon icon={faCheck} style={{ fontSize: 8, color: gold }} />}
      </div>
    </div>
  );
}

export function ZenPlannerSettingsContent() {
  const [config, setConfig] = useState<PlannerBannerConfig>(() => loadPlannerBannerConfig());
  const [saved, setSaved] = useState(false);

  const update = (patch: Partial<PlannerBannerConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const handleSave = () => {
    savePlannerBannerConfig(config);
    window.dispatchEvent(new Event('zenpost:banner-config-changed'));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="w-full flex justify-center" style={{ padding: '32px 32px' }}>
      <div className="w-full max-w-[860px] rounded-[10px] bg-[#E8E1D2] border border-[#AC8E66]/60 overflow-hidden">

        {/* Header */}
        <div style={{
          padding: '20px 28px 16px',
          borderBottom: '1px solid rgba(172,142,102,0.3)',
          background: 'rgba(172,142,102,0.05)',
        }}>
          <div style={{ fontFamily: fontMono, fontSize: 9, letterSpacing: '0.12em', color: gold, textTransform: 'uppercase', marginBottom: 4 }}>
            Planner
          </div>
          <div style={{ fontFamily: fontMono, fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
            Publishing Banner
          </div>
          <div style={{ fontFamily: fontMono, fontSize: 10, color: '#777', marginTop: 3 }}>
            Wann sollen geplante Posts im Banner angezeigt werden?
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Mode Selection */}
          <div>
            <SectionLabel>Anzeigemodus</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ModeCard
                active={config.mode === 'due'}
                onSelect={() => update({ mode: 'due' as BannerMode })}
                icon={faClock}
                label="Nur bei Fälligkeit"
                description="Banner erscheint wenn der geplante Zeitpunkt erreicht oder überschritten wurde."
              />
              <ModeCard
                active={config.mode === 'before'}
                onSelect={() => update({ mode: 'before' as BannerMode })}
                icon={faBell}
                label="Vor dem Zeitpunkt"
                description="Banner erscheint X Minuten/Stunden vorher als Erinnerung."
              />
              <ModeCard
                active={config.mode === 'always'}
                onSelect={() => update({ mode: 'always' as BannerMode })}
                icon={faCalendarDays}
                label="Immer anzeigen"
                description="Alle geplanten Posts erscheinen sofort nach dem Einplanen im Banner."
              />
            </div>
          </div>

          {/* Erinnerungszeit — nur bei 'before' */}
          {config.mode === 'before' && (
            <>
              <Divider />
              <div>
                <SectionLabel>Erinnerungszeit</SectionLabel>
                <ZenDropdown
                  value={String(config.beforeMinutes)}
                  onChange={(val) => update({ beforeMinutes: Number(val) })}
                  options={BEFORE_OPTIONS.map((o) => ({ value: String(o.minutes), label: o.label }))}
                  theme="paper"
                  variant="input"
                />
              </div>
            </>
          )}

          <Divider />

          {/* Save */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleSave}
              style={{
                background: saved ? '#22c55e' : gold,
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '9px 22px',
                fontSize: 11,
                fontFamily: fontMono,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s',
                letterSpacing: '0.05em',
              }}
            >
              {saved ? '✓ Gespeichert' : 'Speichern'}
            </button>
            {saved && (
              <span style={{ fontFamily: fontMono, fontSize: 10, color: '#22c55e' }}>
                Einstellung aktiv
              </span>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
