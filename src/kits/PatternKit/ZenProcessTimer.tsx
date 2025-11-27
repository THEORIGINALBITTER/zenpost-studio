import { useEffect, useState } from 'react';

interface ZenProcessTimerProps {
  message?: string;
  subMessage?: string;
}

export function ZenProcessTimer({
  message = 'Verarbeitung läuft...',
  subMessage = 'Bitte warten Sie einen Moment'
}: ZenProcessTimerProps) {
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState('');

  // Animated progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95; // Cap at 95% until actually done
        return prev + Math.random() * 3;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
      }}
    >
      {/* Spinning Circle Animation */}
      <div
        style={{
          width: '80px',
          height: '80px',
          border: '6px solid #2A2A2A',
          borderTop: '6px solid #AC8E66',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '32px',
        }}
      />

      {/* Message */}
      <h3
        style={{
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#e5e5e5',
          marginBottom: '8px',
          textAlign: 'center',
        }}
      >
        {message}{dots}
      </h3>

      {/* Sub Message */}
      <p
        style={{
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#999',
          marginBottom: '32px',
          textAlign: 'center',
        }}
      >
        {subMessage}
      </p>

      {/* Progress Bar Container */}
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          height: '8px',
          backgroundColor: '#2A2A2A',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '12px',
        }}
      >
        {/* Progress Bar Fill */}
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: '#AC8E66',
            transition: 'width 0.3s ease',
            borderRadius: '4px',
          }}
        />
      </div>

      {/* Progress Percentage */}
      <p
        style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#777',
        }}
      >
        {Math.round(progress)}%
      </p>
    </div>
  );
}
