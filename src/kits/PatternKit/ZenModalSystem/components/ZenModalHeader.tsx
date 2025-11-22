import { ZenCloseButton } from '../../../DesignKit/ZenCloseButton';
import { ZenSaveButton } from '../../../DesignKit/ZenSaveButton';
import { ModalHeaderConfig } from '../config/ZenModalConfig';

interface ZenModalHeaderProps extends ModalHeaderConfig {
  onClose: () => void;
  onSave?: () => void;
}

export const ZenModalHeader = ({
  title,
  subtitle,
  onClose,
  onSave,
  titleColor = '#AC8E66',
  subtitleColor = '#ccc',
  titleSize = '24px',
  subtitleSize = '13px',
}: ZenModalHeaderProps) => {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60px'
    }}>
      {/* Close Button oben links - absolute */}
      <div style={{
        position: 'absolute',
        left: '10px',
        top: '10px'
      }}>
        <ZenCloseButton onClick={onClose} />
      </div>

        {/* Save Button oben rechts - absolute */}
      {onSave && (
        <div style={{
          position: 'fixed',
          right: '10px',
          top: '10px'
        }}>
          <ZenSaveButton onClick={onSave} />
        </div>
      )}

      {/* Header Content - zentriert */}
      <div  style={{ textAlign: 'center' }}>
        <h2
          className="font-mono"
          style={{
            color: titleColor,
            fontSize: titleSize,
            marginBottom: '10px'
          }}
        >
          {title}
        </h2>
        {subtitle && (
          typeof subtitle === 'string' ? (
            <p
              className="font-mono"
              style={{
                color: subtitleColor,
                fontSize: subtitleSize,
                margin: 0
              }}
            >
              {subtitle}
            </p>
          ) : (
            <div style={{
              color: subtitleColor,
              fontSize: subtitleSize
            }}>
              {subtitle}
            </div>
          )
        )}
      </div>

    
    </div>
  );
};
