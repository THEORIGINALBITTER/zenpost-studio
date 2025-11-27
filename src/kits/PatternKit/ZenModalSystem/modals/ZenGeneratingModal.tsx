import { ZenModal } from '../components/ZenModal';
import { ZenProcessTimer } from '../../ZenProcessTimer';

interface ZenGeneratingModalProps {
  isOpen: boolean;
  templateName?: string;
}

export function ZenGeneratingModal({ isOpen, templateName }: ZenGeneratingModalProps) {
  return (
    <ZenModal
      isOpen={isOpen}
      onClose={() => {}} // Can't close while generating
      title="🤖 Dokumentation wird generiert"
      size="medium"
    >
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <ZenProcessTimer
          message="Generiere Dokumentation mit KI"
          subMessage={templateName ? `Erstelle ${templateName}... Das kann einen Moment dauern.` : 'Das kann einen Moment dauern.'}
        />

        <div
          style={{
            marginTop: '24px',
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
            💡 Tipp: Je detaillierter deine Projektstruktur, desto besser wird die generierte Dokumentation
          </p>
        </div>
      </div>
    </ZenModal>
  );
}
