import { useState } from 'react';
import { ZenModal } from '../components/ZenModal';
import { ZenRoughButton } from '../components/ZenRoughButton';

interface ZenGeneratingModalProps {
  isOpen: boolean;
  templateName?: string;
  onClose?: () => void;
}

const mono = 'IBM Plex Mono, monospace';

export function ZenGeneratingModal({ isOpen, templateName, onClose }: ZenGeneratingModalProps) {
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);

  const handleRequestClose = () => {
    if (!onClose) return;
    setShowAbortConfirm(true);
  };

  const handleAbortConfirm = () => {
    setShowAbortConfirm(false);
    onClose?.();
  };

  return (
    <>
      <ZenModal
        isOpen={isOpen}
        onClose={handleRequestClose}
        showCloseButton={true}
        size="sm"
      >
        {/* Dark preloader panel */}
        <div
          style={{
            background: 'linear-gradient(0deg, #0b0b0b 0%, #171717 100%)',
            borderRadius: '0 0 12px 12px',
            padding: '52px 32px 44px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 28,
          }}
        >
          {/* Doc stack — identical to HTML preloader, scaled up a bit */}
          <div className="zgen-doc-stack">
            <div className="zgen-doc zgen-doc-back" />
            <div className="zgen-doc zgen-doc-mid" />
            <div className="zgen-doc zgen-doc-front">
              <div className="zgen-doc-line" />
              <div className="zgen-doc-line" />
              <div className="zgen-doc-line" />
              <div className="zgen-doc-line" />
            </div>
          </div>

          {/* Text */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                fontFamily: mono,
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.12em',
                color: '#AC8E66',
                textTransform: 'uppercase',
              }}
            >
              ZenPost Studio
            </div>
            <div
              style={{
                fontFamily: mono,
                fontSize: 9,
                letterSpacing: '0.08em',
                color: 'rgba(172,142,102,0.45)',
              }}
            >
              {templateName ? `Erstelle ${templateName} …` : 'Generiere Inhalt …'}
            </div>
          </div>
        </div>

        <style>{`
          /* ── Doc stack ── */
          .zgen-doc-stack {
            position: relative;
            width: 60px;
            height: 74px;
            animation: zgen-float 3.2s ease-in-out infinite;
          }
          .zgen-doc {
            position: absolute;
            width: 52px;
            height: 66px;
            background: #ede6d8;
            border-radius: 3px 11px 3px 3px;
          }
          .zgen-doc-back  { transform: rotate(-9deg) translate(-5px, 5px); opacity: 0.22; }
          .zgen-doc-mid   { transform: rotate(-4deg) translate(-2px, 2px); opacity: 0.48; }
          .zgen-doc-front {
            transform: rotate(0deg);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding: 16px 9px 9px 9px;
          }
          /* folded corner */
          .zgen-doc-front::before {
            content: '';
            position: absolute;
            top: 0; right: 0;
            width: 13px; height: 13px;
            background: linear-gradient(225deg, #171717 50%, rgba(172,142,102,0.25) 50%);
          }
          .zgen-doc-line {
            height: 2px;
            border-radius: 1px;
            background: #ac8e66;
            transform-origin: left center;
            animation: zgen-write 2s ease-in-out infinite;
          }
          .zgen-doc-line:nth-child(1) { width: 78%;  animation-delay: 0s;     }
          .zgen-doc-line:nth-child(2) { width: 100%; animation-delay: 0.28s;  }
          .zgen-doc-line:nth-child(3) { width: 62%;  animation-delay: 0.56s;  }
          .zgen-doc-line:nth-child(4) { width: 88%;  animation-delay: 0.84s;  }

          @keyframes zgen-write {
            0%        { transform: scaleX(0); opacity: 0; }
            12%       { transform: scaleX(1); opacity: 1; }
            72%       { transform: scaleX(1); opacity: 1; }
            88%, 100% { transform: scaleX(0); opacity: 0; }
          }
          @keyframes zgen-float {
            0%, 100% { transform: translateY(0px);  }
            50%      { transform: translateY(-8px); }
          }
        `}</style>
      </ZenModal>

      {/* Abort confirm */}
      <ZenModal
        isOpen={showAbortConfirm}
        onClose={() => setShowAbortConfirm(false)}
        title="Achtung"
        subtitle="Bist du sicher, die KI Transform abzubrechen?"
        size="md"
        showCloseButton={true}
      >
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontFamily: mono, fontSize: 12, color: '#777' }}>
            Der aktuelle Vorgang wird abgebrochen. Bereits generierter Output geht verloren.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <ZenRoughButton
              label="Weiter warten"
              onClick={() => setShowAbortConfirm(false)}
              size="small"
            />
            <ZenRoughButton
              label="Ja, abbrechen"
              onClick={handleAbortConfirm}
              size="small"
              variant="default"
            />
          </div>
        </div>
      </ZenModal>
    </>
  );
}
