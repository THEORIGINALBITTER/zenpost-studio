import { WalkthroughOverlay } from './WalkthroughOverlay';
import type { WalkthroughStep } from './WalkthroughOverlay';

const APP_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    title: 'Willkommen bei ZenPost Studio',
    description: '1× schreiben. 9× transformieren. Lokal, schnell, deine KI.',
    icon: '◆',
  },
  {
    title: 'Content AI Studio',
    description: 'Transformiere einen Text in Posts, Threads, Newsletter und mehr. Wähle Plattform, Ton und Länge — alles mit einem Klick.',
    icon: '✦',
  },
  {
    title: 'Doc Studio',
    description: 'Generiere README, Changelog, API-Docs und mehr direkt aus deinem Projekt. Scan → Template → Fertig.',
    icon: '📄',
  },
  {
    title: 'ZenEngine',
    description: 'Dein persönliches Regelwerk für konsistentes Schreiben. Definiere Stilregeln und Autocorrect — alles lokal.',
    icon: '⚙',
  },
  {
    title: 'Mobile Inbox',
    description: 'Halte Ideen unterwegs via iPhone-App fest und bearbeite sie hier weiter.',
    icon: '📱',
  },
  {
    title: 'Los geht\'s',
    description: 'Du bist bereit. Öffne ein Projekt, schreibe deinen ersten Text oder starte mit dem Content AI Studio.',
    icon: '🚀',
  },
];

interface WalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoStart?: boolean;
}

export const WalkthroughModal = ({ isOpen, onClose, autoStart: _autoStart }: WalkthroughModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '80vh',
          background: '#161616',
          border: '0.5px solid #2a2a2a',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}
      >
        <WalkthroughOverlay
          steps={APP_WALKTHROUGH_STEPS}
          onComplete={onClose}
          autoStart={true}
        />
      </div>
    </div>
  );
};
