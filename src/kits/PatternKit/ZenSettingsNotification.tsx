import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons';

interface ZenSettingsNotificationProps {
  show: boolean;
  message?: string;
  onDismiss?: () => void;
}

export const ZenSettingsNotification = ({
  show,
  message = 'Bitte hier prüfen',
}: ZenSettingsNotificationProps) => {
  if (!show) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        right: '-20px',
        marginTop: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      {/* Animated Arrow */}
      <div
        className="animate-bounce"
        style={{
          color: '#AC8E66',
          fontSize: '24px',
          marginBottom: '20px',
          
        }}
      >
        <FontAwesomeIcon icon={faArrowUp} 
            style={{
      position: 'absolute',
      
      right: '28px', // Abstand von rechts
      fontSize: '20px', // Größe ändern
      color: '#AC8E66',
    }}
        />
      </div>

      {/* Toast Message */}
      <div
        style={{
          background: '#2A2A2A',
          border: '1px solid #AC8E66',
          borderRadius: '8px',
          padding: '8px 16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap',
          
        }}
      >
        <p
          className="font-mono text-[11px] text-[#AC8E66]"
          style={{ margin: 0 }}
        >
          {message}
        </p>
      </div>
    </div>
  );
};
