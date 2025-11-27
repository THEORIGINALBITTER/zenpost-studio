import { useState, useEffect } from 'react';
import { ZenModal } from '../components/ZenModal';

interface ZenGeneratingModalProps {
  isOpen: boolean;
  templateName?: string;
}

export function ZenGeneratingModal({ isOpen, templateName }: ZenGeneratingModalProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
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
  return (
    <ZenModal
      isOpen={isOpen}
      onClose={() => {}} // Can't close while generating
      showCloseButton={false}
      size="md"
    >
      <div
        style={{
          padding: '48px 32px',
          textAlign: 'center',
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
              border: '3px solid #AC8E66',
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
              animation: 'spin-reverse 3s linear infinite',
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
        <h3
          style={{
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#e5e5e5',
            marginBottom: '8px',
            animation: 'fade-in-out 2s ease-in-out infinite',
          }}
        >
          Ich mache mich ans Werk...
        </h3>

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

        {/* Info Box */}
        <div
          style={{
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
            💡 Die KI analysiert deine Projektstruktur und erstellt maßgeschneiderte Dokumentation
          </p>
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
  );
}
