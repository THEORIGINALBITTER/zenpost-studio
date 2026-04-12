import { ZenModal } from '../components/ZenModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKeyboard } from '@fortawesome/free-solid-svg-icons';

interface ZenShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl';

const SHORTCUTS: Array<{ group: string; items: Array<{ keys: string[]; label: string }> }> = [
  {
    group: 'Editor',
    items: [
      { keys: [mod, 'Z'],    label: 'ZenEngine Undo' },
      { keys: [mod, 'S'],    label: 'Speichern' },
      { keys: ['+'],         label: 'Block-Menü öffnen' },
      { keys: ['?'],         label: 'Shortcuts anzeigen' },
    ],
  },
  {
    group: 'Suchen & Ersetzen',
    items: [
      { keys: [mod, 'F'],    label: 'Suchen öffnen' },
      { keys: ['Enter'],     label: 'Nächster Treffer' },
      { keys: ['⇧', 'Enter'], label: 'Vorheriger Treffer' },
      { keys: ['Tab'],       label: 'Zu Ersetzen wechseln' },
      { keys: ['Esc'],       label: 'Suche schließen' },
    ],
  },
  {
    group: 'ZenEngine',
    items: [
      { keys: ['Klick auf Chip'],  label: 'Vorschlag annehmen (✓)' },
      { keys: ['×'],               label: 'Einmal ignorieren' },
      { keys: ['–'],               label: 'Dauerhaft stumm schalten' },
    ],
  },
];

export function ZenShortcutsModal({ isOpen, onClose }: ZenShortcutsModalProps) {
  const mono: React.CSSProperties = { fontFamily: 'IBM Plex Mono, monospace' };
  const gold = '#AC8E66';
  const border = 'rgba(172,142,102,0.2)';

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      theme="paper"
      zIndex={20000}
      title="Keyboard Shortcuts"
      subtitle={
        <span style={{ ...mono, fontSize: 11, color: gold, opacity: 0.8 }}>
          <FontAwesomeIcon icon={faKeyboard} style={{ marginRight: 6 }} />
          ZenPost Studio
        </span>
      }
    >
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {SHORTCUTS.map((group) => (
          <div key={group.group}>
            <p style={{ ...mono, fontSize: 9, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
              {group.group}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {group.items.map((item, i) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: i < group.items.length - 1 ? `1px solid ${border}` : 'none',
                  }}
                >
                  <span style={{ ...mono, fontSize: 10, color: '#555' }}>{item.label}</span>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {item.keys.map((key, ki) => (
                      <span key={ki}>
                        {key.length > 3 ? (
                          <span style={{ ...mono, fontSize: 9, color: '#888' }}>{key}</span>
                        ) : (
                          <kbd style={{
                            ...mono,
                            fontSize: 9,
                            background: 'rgba(172,142,102,0.1)',
                            border: `1px solid rgba(172,142,102,0.35)`,
                            borderRadius: 4,
                            padding: '1px 6px',
                            color: gold,
                            lineHeight: 1.6,
                          }}>
                            {key}
                          </kbd>
                        )}
                        {ki < item.keys.length - 1 && (
                          <span style={{ ...mono, fontSize: 9, color: '#bbb', margin: '0 1px' }}> + </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ZenModal>
  );
}
