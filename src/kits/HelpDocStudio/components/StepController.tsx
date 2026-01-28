import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faRotateRight, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { WalkthroughStep } from '../config/walkthroughSteps';

interface StepControllerProps {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onNext: () => void;
  onPrevious: () => void;
  step: WalkthroughStep;
}

/**
 * Steuerungs-Komponente für den Walkthrough
 * Zeigt Step-Indicator und Play/Pause/Navigation Controls
 */
export const StepController = ({
  currentStep,
  totalSteps,
  isPlaying,
  onPlay,
  onPause,
  onRestart,
  onNext,
  onPrevious,
  step,
}: StepControllerProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isPlaying || !step.duration) {
      setProgress(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / step.duration!) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, step.duration, currentStep]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        padding: '20px',
        backgroundColor: '#1A1A1A',
        borderTop: '1px solid #3A3A3A',
      }}
    >
      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '3px',
          backgroundColor: '#3A3A3A',
          borderRadius: '3px',
          marginBottom: '16px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            backgroundColor: '#AC8E66',
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      {/* Step Info & Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        {/* Step Indicator */}
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#AC8E66',
            fontWeight: 'bold',
          }}
        >
          Schritt {currentStep + 1} / {totalSteps}
        </div>

        {/* Control Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          {/* Previous */}
          <button
            onClick={onPrevious}
            disabled={currentStep === 0}
            style={{
              background: 'none',
              border: '1px solid #3A3A3A',
              borderRadius: '6px',
              padding: '8px 12px',
              color: currentStep === 0 ? '#3A3A3A' : '#AC8E66',
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              fontSize: '14px',
            }}
            onMouseEnter={(e) => {
              if (currentStep !== 0) {
                e.currentTarget.style.backgroundColor = '#2A2A2A';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>

          {/* Play/Pause */}
          <button
            onClick={isPlaying ? onPause : onPlay}
            style={{
              background: 'none',
              border: '1px solid #AC8E66',
              borderRadius: '6px',
              padding: '8px 16px',
              color: '#AC8E66',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#AC8E66';
              e.currentTarget.style.color = '#1A1A1A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#AC8E66';
            }}
          >
            <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
          </button>

          {/* Next */}
          <button
            onClick={onNext}
            disabled={currentStep === totalSteps - 1}
            style={{
              background: 'none',
              border: '1px solid #3A3A3A',
              borderRadius: '6px',
              padding: '8px 12px',
              color: currentStep === totalSteps - 1 ? '#3A3A3A' : '#AC8E66',
              cursor: currentStep === totalSteps - 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              fontSize: '14px',
            }}
            onMouseEnter={(e) => {
              if (currentStep !== totalSteps - 1) {
                e.currentTarget.style.backgroundColor = '#2A2A2A';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>

          {/* Restart */}
          <button
            onClick={onRestart}
            style={{
              background: 'none',
              border: '1px solid #3A3A3A',
              borderRadius: '6px',
              padding: '8px 12px',
              color: '#999',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '14px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2A2A2A';
              e.currentTarget.style.color = '#AC8E66';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#999';
            }}
          >
            <FontAwesomeIcon icon={faRotateRight} />
          </button>
        </div>
      </div>
    </div>
  );
};
