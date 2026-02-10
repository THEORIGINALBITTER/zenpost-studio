import { ZenModal } from '../components/ZenModal';
import { ZenRoughButton } from '../components/ZenRoughButton';

interface ZenBootstrapModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectPath: string;
}

export function ZenBootstrapModal({ isOpen, onClose, defaultProjectPath }: ZenBootstrapModalProps) {
  return (
    <ZenModal isOpen={isOpen} onClose={onClose} size="md">
      <div
        style={{
          padding: '28px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '40px', marginBottom: '14px' }}>✅</div>
        <h3
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '16px',
            color: '#e5e5e5',
            marginBottom: '8px',
          }}
        >
          ZenStudio wurde vorbereitet
        </h3>
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            color: '#999',
            marginBottom: '18px',
          }}
        >
          Wir haben einen Standard-Projektordner erstellt, damit der Planner immer Daten speichern kann.
        </p>
        <div
          style={{
            padding: '12px',
            backgroundColor: '#1A1A1A',
            borderRadius: '8px',
            border: '1px solid #3A3A3A',
            marginBottom: '20px',
            wordBreak: 'break-all',
          }}
        >
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#AC8E66' }}>
            {defaultProjectPath}
          </div>
        </div>
        <ZenRoughButton label="Verstanden" onClick={onClose} variant="default" />
      </div>
    </ZenModal>
  );
}
