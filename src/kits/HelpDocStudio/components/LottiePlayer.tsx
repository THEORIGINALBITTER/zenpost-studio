import { useEffect, useRef } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';

interface LottiePlayerProps {
  animationData: object | null;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  width?: string | number;
  height?: string | number;
  onComplete?: () => void;
  style?: React.CSSProperties;
}

/**
 * Wrapper-Komponente für Lottie-Animationen
 * Bietet einfache Steuerung und Konfiguration
 */
export const LottiePlayer = ({
  animationData,
  loop = true,
  autoplay = true,
  speed = 1,
  width = '100%',
  height = '100%',
  onComplete,
  style = {},
}: LottiePlayerProps) => {
  const lottieRef = useRef<LottieRefCurrentProps | null>(null);

  useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(speed);
    }
  }, [speed]);

  if (!animationData) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontFamily: 'monospace',
          fontSize: '12px',
          ...style,
        }}
      >
        Animation lädt...
      </div>
    );
  }

  return (
    <div style={{ width, height, ...style }}>
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
        onComplete={onComplete}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
