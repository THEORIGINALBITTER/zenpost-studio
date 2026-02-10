import { useState, useEffect } from 'react';

import { ZenModal } from '../components/ZenModal';
import { ZenRoughButton } from '../components/ZenRoughButton';

interface ZenGeneratingModalProps {
  isOpen: boolean;
  templateName?: string;
  onClose?: () => void;
}

export function ZenGeneratingModal({ isOpen, templateName, onClose }: ZenGeneratingModalProps) {
  const [progress, setProgress] = useState(0);
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setShowAbortConfirm(false);
      return;
    }

    // Simulate progress (fake progress for visual feedback)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev; // Stop at 95% (never reach 100% until done)
        return prev + Math.random() * 3;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isOpen]);

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
        size='xl'
       
      >
        <div
          style={{
            padding: '48px 32px',
            textAlign: 'center',
            border: '#555'
          }}
        >
          {/* AI Spinner Animation */}
          <div
            style={{
              position: 'relative',
              width: '120px',
              height: '120px',
              marginLeft: 'auto',
              marginRight: 'auto',
              marginBottom: '32px',
            }}
          >
            {/* Outer Gear */}
            <div
              style={{
                position: 'absolute',
                top: '0',
                left: '0',
                width: '120px',
                height: '120px',
                border: '1px dotted #AC8E66',
                borderRadius: '50%',
                borderStyle: 'dashed',
                animation: 'spin-slow 4s linear infinite',
              }}
            />

            {/* Middle Gear */}
            <div
              style={{
                position: 'absolute',
                top: '15px',
                left: '15px',
                width: '90px',
                height: '90px',
                border: '3px solid #AC8E66',
                borderRadius: '50%',
                borderTopColor: 'transparent',
                borderRightColor: 'transparent',
                animation: 'spin-reverse 4s linear infinite',
              }}
            />

            {/* Inner Core - Pulsing with Progress */}
            <div
              style={{
                position: 'absolute',
                top: '35px',
                left: '35px',
                width: '50px',
                height: '50px',
                backgroundColor: '#AC8E66',
                borderRadius: '50%',
                animation: 'pulse 2s ease-in-out infinite',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#0A0A0A',
                fontFamily: 'monospace',
              }}
            >
              {Math.round(progress)}%
            </div>

            {/* Orbiting Dots */}
            <div
              style={{
                position: 'absolute',
                top: '0',
                left: '57px',
                width: '6px',
                height: '6px',
                backgroundColor: '#AC8E66',
                borderRadius: '50%',
                animation: 'orbit 3s linear infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '57px',
                right: '0',
                width: '6px',
                height: '6px',
                backgroundColor: '#AC8E66',
                borderRadius: '50%',
                animation: 'orbit 3s linear infinite 0.75s',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '0',
                left: '57px',
                width: '6px',
                height: '6px',
                backgroundColor: '#AC8E66',
                borderRadius: '50%',
                animation: 'orbit 3s linear infinite 1.5s',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '57px',
                left: '0',
                width: '6px',
                height: '6px',
                backgroundColor: '#AC8E66',
                borderRadius: '50%',
                
                animation: 'orbit 3s linear infinite 2.25s',
              }}
            />
          </div>

          {/* Message */}
          <p
            style={{
              fontFamily: 'monospace',
              fontSize: '16px',
              color: '#555',
              marginBottom: '8px',
              animation: 'fade-in-out 2s ease-in-out infinite',
            }}
          >
            Ich mache mich ans Werk...
          </p>

          <p
            style={{
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#999',
              marginBottom: '32px',
            }}
          >
            {templateName ? `Erstelle ${templateName}` : 'Generiere Dokumentation'}
          </p>

          {/* Progress Indicator */}
          <div
            style={{
              width: '100%',
              maxWidth: '300px',
              height: '4px',
              backgroundColor: '#1A1A1A',
              borderRadius: '2px',
              marginLeft: 'auto',
              marginRight: 'auto',
              marginBottom: '24px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: '40%',
                backgroundColor: '#AC8E66',
                borderRadius: '2px',
                animation: 'progress-slide 2s ease-in-out infinite',
              }}
            />
          </div>

          {/* CSS Animations */}
          <style>{`
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes spin-reverse {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
          }

          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.8;
            }
          }

          @keyframes orbit {
            0% { transform: rotate(0deg) translateX(60px) rotate(0deg); }
            100% { transform: rotate(360deg) translateX(60px) rotate(-360deg); }
          }

          @keyframes fade-in-out {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }

          @keyframes progress-slide {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(250%); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
        </div>
      </ZenModal>
      <ZenModal
        isOpen={showAbortConfirm}
        onClose={() => setShowAbortConfirm(false)}
        title="Achtung"
        subtitle="Bist du sicher, die KI Transform abzubrechen?"
        size="md"
        showCloseButton={true}
      >
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
              color: '#777',
            }}
          >
            Der aktuelle Vorgang wird abgebrochen. Bereits generierter Output geht verloren.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <ZenRoughButton
              label="Abbrechen"
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
