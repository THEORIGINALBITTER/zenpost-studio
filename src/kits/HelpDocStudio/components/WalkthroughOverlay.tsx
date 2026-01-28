import { useState, useEffect } from 'react';
import { LottiePlayer } from './LottiePlayer';
import { StepController } from './StepController';
import { WalkthroughStep } from '../config/walkthroughSteps';

interface WalkthroughOverlayProps {
  steps: WalkthroughStep[];
  onComplete?: () => void;
  autoStart?: boolean;
}

/**
 * Haupt-Komponente für den interaktiven Walkthrough
 * Zeigt Animation, Beschreibung und Steuerung
 */
export const WalkthroughOverlay = ({
  steps,
  onComplete,
  autoStart = false,
}: WalkthroughOverlayProps) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoStart);
  const [hasCompleted, setHasCompleted] = useState(false);

  const currentStep = steps[currentStepIndex];

  // Auto-advance to next step
  useEffect(() => {
    if (!isPlaying || !currentStep.duration || hasCompleted) return;

    const timer = setTimeout(() => {
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        setIsPlaying(false);
        setHasCompleted(true);
        if (onComplete) {
          onComplete();
        }
      }
    }, currentStep.duration);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, currentStep.duration, steps.length, hasCompleted, onComplete]);

  const handlePlay = () => {
    setIsPlaying(true);
    setHasCompleted(false);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setIsPlaying(true);
    setHasCompleted(false);
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      setIsPlaying(false);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      setIsPlaying(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
      }}
    >
      {/* Animation Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          gap: '24px',
          minHeight: '400px',
        }}
      >
        {/* Lottie Animation */}
        <div
          style={{
            width: '100%',
            maxWidth: '500px',
            height: '300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {currentStep.animationData ? (
            <LottiePlayer
              animationData={currentStep.animationData}
              loop={true}
              autoplay={isPlaying}
              speed={1}
            />
          ) : (
            // Placeholder wenn keine Animation vorhanden
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#0A0A0A',
                border: '2px dashed #3A3A3A',
                borderRadius: '12px',
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#666',
                textAlign: 'center',
                padding: '20px',
              }}
            >
              <div>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                  {currentStepIndex === 0 && '🎬'}
                  {currentStepIndex === 1 && '📝'}
                  {currentStepIndex === 2 && '🤖'}
                  {currentStepIndex === 3 && '✨'}
                  {currentStepIndex === 4 && '💾'}
                </div>
                <div>Animation Placeholder</div>
                <div style={{ fontSize: '11px', color: '#444', marginTop: '8px' }}>
                  Lottie-Animation wird hier angezeigt
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step Content */}
        <div
          style={{
            textAlign: 'center',
            maxWidth: '600px',
          }}
        >
          {/* Title */}
          <h3
            style={{
              fontFamily: 'monospace',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#AC8E66',
              marginBottom: '12px',
            }}
          >
            {currentStep.title}
          </h3>

          {/* Description */}
          <p
            style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#ccc',
              lineHeight: '1.6',
              marginBottom: '16px',
            }}
          >
            {currentStep.description}
          </p>

          {/* Tip */}
          {currentStep.tip && (
            <div
              style={{
                display: 'inline-block',
                backgroundColor: '#0A0A0A',
                border: '1px solid #3A3A3A',
                borderRadius: '8px',
                padding: '12px 16px',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#999',
                lineHeight: '1.5',
              }}
            >
              💡 Tipp: {currentStep.tip}
            </div>
          )}
        </div>

        {/* Completion Message */}
        {hasCompleted && (
          <div
            style={{
              backgroundColor: '#0A0A0A',
              border: '2px solid #AC8E66',
              borderRadius: '12px',
              padding: '16px 24px',
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#AC8E66',
              textAlign: 'center',
            }}
          >
            ✓ Tutorial abgeschlossen! Du kannst jetzt loslegen.
          </div>
        )}
      </div>

      {/* Step Controller */}
      <StepController
        currentStep={currentStepIndex}
        totalSteps={steps.length}
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onPause={handlePause}
        onRestart={handleRestart}
        onNext={handleNext}
        onPrevious={handlePrevious}
        step={currentStep}
      />
    </div>
  );
};
