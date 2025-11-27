import { ZenModal } from '../components/ZenModal';
import { ZenRoughButton } from '../components/ZenRoughButton';

interface ZenSaveConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToMenu: () => void;
  onNewDocument: () => void;
  fileName?: string;
}

export function ZenSaveConfirmationModal({
  isOpen,
  onClose,
  onBackToMenu,
  onNewDocument,
  fileName = 'Dokumentation',
}: ZenSaveConfirmationModalProps) {
  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      title="✅ Erfolgreich gespeichert"
      size="medium"
    >
      <div
        style={{
          padding: '32px',
          textAlign: 'center',
        }}
      >
        {/* Success Icon */}
        <div
          style={{
            fontSize: '64px',
            marginBottom: '24px',
          }}
        >
          🎉
        </div>

        {/* Message */}
        <h3
          style={{
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#e5e5e5',
            marginBottom: '8px',
          }}
        >
          Dokumentation erfolgreich gespeichert!
        </h3>

        <p
          style={{
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#999',
            marginBottom: '32px',
          }}
        >
          {fileName} wurde in deinem Projekt-Ordner gespeichert.
        </p>

        {/* Info Box */}
        <div
          style={{
            marginBottom: '32px',
            padding: '16px',
            backgroundColor: '#1A1A1A',
            borderRadius: '8px',
            border: '1px solid #3A3A3A',
          }}
        >
          <p
            style={{
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#777',
              lineHeight: '1.6',
            }}
          >
            💡 Du kannst jetzt ein weiteres Dokument erstellen oder zurück zum Hauptmenü gehen.
          </p>
        </div>

        {/* Buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            alignItems: 'center',
          }}
        >
          <ZenRoughButton
            label="Weiteres Dokument erstellen"
            icon="📝"
            onClick={onNewDocument}
            variant="active"
          />
          <ZenRoughButton
            label="Zurück zum Hauptmenü"
            icon="🏠"
            onClick={onBackToMenu}
            variant="default"
          />
        </div>
      </div>
    </ZenModal>
  );
}
