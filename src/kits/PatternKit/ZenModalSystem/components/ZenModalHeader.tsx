import { ZenCloseButton } from '../../../DesignKit/ZenCloseButton';
import { ZenSaveButton } from '../../../DesignKit/ZenSaveButton';
import { ModalHeaderConfig } from '../config/ZenModalConfig';

interface ZenModalHeaderProps extends ModalHeaderConfig {
  onClose?: () => void;
  onSave?: () => void;
}

export const ZenModalHeader = ({
  title,
  subtitle,
  subtitle2,              // <-- NEU
  onClose,
  onSave,
  titleColor = '#AC8E66',
  subtitleColor = '#ccc',
  subtitleColor2 = '#999', // <-- NEU
  titleSize = '24px',
  subtitleSize = '13px',
  subtitleSize2 = '12px',  // <-- NEU
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
      {/* Close Button oben links - nur wenn onClose übergeben wird */}
      {onClose && (
        <div style={{
          position: 'absolute',
          left: '10px',
          top: '10px'
        }}>
          <ZenCloseButton onClick={onClose} />
        </div>
      )}

      {/* Save Button oben rechts */}
      {onSave && (
        <div style={{
          position: 'fixed',
          right: '10px',
          top: '10px'
        }}>
          <ZenSaveButton onClick={onSave} />
        </div>
      )}

      {/* Header Content */}
      <div style={{ textAlign: 'center' }}>
        <h2
          className="font-mono"
          style={{
            color: titleColor,
            fontSize: titleSize,
            marginBottom: subtitle || subtitle2 ? '10px' : '0'
          }}
        >
          {title}
        </h2>

        {/* Subtitle 1 */}
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
              fontSize: subtitleSize,
              margin: 0
            }}>
              {subtitle}
            </div>
          )
        )}

        {/* Subtitle 2 (NEU) */}
        {subtitle2 && (
          typeof subtitle2 === 'string' ? (
            <p
              className="font-mono"
              style={{
                color: subtitleColor2,
                fontSize: subtitleSize2,
                margin: '2px 0 0 0'
              }}
            >
              {subtitle2}
            </p>
          ) : (
            <div
              style={{
                color: subtitleColor2,
                fontSize: subtitleSize2,
                marginTop: '2px'
              }}
            >
              {subtitle2}
            </div>
          )
        )}
      </div>

    </div>
  );
};
