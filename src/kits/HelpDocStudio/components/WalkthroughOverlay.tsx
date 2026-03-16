import { useState, useEffect } from 'react';

export interface WalkthroughStep {
  title: string;
  description: string;
  icon?: string;
}

interface WalkthroughOverlayProps {
  steps: WalkthroughStep[];
  onComplete: () => void;
  autoStart?: boolean;
}

export const WalkthroughOverlay = ({ steps, onComplete, autoStart: _autoStart }: WalkthroughOverlayProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [steps]);

  if (!steps || steps.length === 0) {
    onComplete();
    return null;
  }

  const step = steps[currentIndex];
  const isLast = currentIndex === steps.length - 1;
  const progress = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '32px',
        fontFamily: 'IBM Plex Mono, monospace',
        gap: '24px',
        overflow: 'hidden',
      }}
    >
      {/* Progress bar */}
      <div style={{ height: '2px', background: '#2a2a2a', borderRadius: '1px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: '#AC8E66',
            borderRadius: '1px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Step counter */}
      <div style={{ fontSize: '9px', color: '#AC8E66', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
        Schritt {currentIndex + 1} von {steps.length}
      </div>

      {/* Icon */}
      {step.icon && (
        <div style={{ fontSize: '40px', textAlign: 'center', lineHeight: 1 }}>
          {step.icon}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'center' }}>
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 300,
            color: '#E8E8E8',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {step.title}
        </h2>
        <p
          style={{
            fontSize: '12px',
            color: '#9A9A9A',
            margin: 0,
            lineHeight: 1.7,
            fontWeight: 300,
          }}
        >
          {step.description}
        </p>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '0.5px solid #2a2a2a' }}>
        <button
          onClick={() => currentIndex > 0 ? setCurrentIndex(i => i - 1) : onComplete()}
          style={{
            background: 'none',
            border: '0.5px solid #3a3a3a',
            borderRadius: '6px',
            padding: '8px 14px',
            color: '#777',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '10px',
            cursor: 'pointer',
          }}
        >
          {currentIndex > 0 ? '← Zurück' : 'Abbrechen'}
        </button>

        <button
          onClick={() => isLast ? onComplete() : setCurrentIndex(i => i + 1)}
          style={{
            background: '#AC8E66',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 18px',
            color: '#fff',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '10px',
            cursor: 'pointer',
          }}
        >
          {isLast ? 'Fertig' : 'Weiter →'}
        </button>
      </div>
    </div>
  );
};
