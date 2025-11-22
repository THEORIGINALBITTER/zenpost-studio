import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons';

interface ZenSettingsNotificationProps {
  show: boolean;
  message?: string;
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
        right: '0',
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
          marginBottom: '4px',
        }}
      >
        <FontAwesomeIcon icon={faArrowUp} />
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
