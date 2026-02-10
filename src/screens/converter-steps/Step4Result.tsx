// ./screens/converter-steps/Step4Result.tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { ZenSubtitle } from '../../kits/PatternKit/ZenSubtitle';
import { ZenRoughButton } from '../../kits/PatternKit/ZenModalSystem';
import { SupportedFormat } from '../../utils/fileConverter';

interface Step4ResultProps {
  toFormat: SupportedFormat;
  outputContent: string;
  onDownload: () => void;
  onStartOver: () => void;
  onOpenInContentStudio?: () => void;
  showOpenInContentStudio?: boolean;
}

export const Step4Result = ({
  toFormat,
  outputContent,
  onDownload,
  onStartOver,
  onOpenInContentStudio,
  showOpenInContentStudio = false,
}: Step4ResultProps) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
      <h2 className="font-mono text-3xl text-[#e5e5e5] font-normal">
        Schritt 4: Fertig!
      </h2>
      <ZenSubtitle className="text-center max-w-md">
        Deine Konvertierung ist abgeschlossen
      </ZenSubtitle>

      {/* Result Preview */}
      <div className="w-3/4 max-w-2xl mt-6">
        <label className="text-[#999] text-sm mb-[5px] font-mono block">
          Ergebnis ({toFormat.toUpperCase()}):
        </label>
        <textarea
          value={outputContent}
          readOnly
          className="w-full h-[256px] bg-[#2A2A2A] text-[#e5e5e5] border border-[#AC8E66] rounded font-mono text-sm resize-none focus:outline-none zen-scrollbar"
          style={{ padding: '5px' }}
        />
      </div>

      {/* Download Button */}
      {toFormat !== 'pdf' && (
        <div className="mt-[20px]">
          <ZenRoughButton
            label="Herunterladen"
            icon={<FontAwesomeIcon icon={faDownload} className="text-[#AC8E66]" />}
            onClick={onDownload}
          />
        </div>
      )}

      {/* Start Over */}
      <div className="mt-6">
        <ZenRoughButton
          label="Neue Konvertierung starten"
          onClick={onStartOver}
        />
      </div>

      {showOpenInContentStudio && (
        <div className="mt-2">
          <ZenRoughButton
            label="Im Content AI Studio veröffentlichen"
            onClick={onOpenInContentStudio}
          />
        </div>
      )}
    </div>
  );
};
