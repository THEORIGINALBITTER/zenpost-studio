// ./screens/converter-steps/Step3Convert.tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { ZenSubtitle } from '../../kits/PatternKit/ZenSubtitle';
import { ZenRoughButton } from '../../kits/PatternKit/ZenModalSystem';
import { SupportedFormat } from '../../utils/fileConverter';

interface Step3ConvertProps {
  fromFormat: SupportedFormat;
  toFormats: SupportedFormat[];
  inputContent: string;
  error: string | null;
  isConverting: boolean;
  onConvert: () => void;
  onBack: () => void;
}

export const Step3Convert = ({
  fromFormat,
  toFormats,
  inputContent,
  error,
  isConverting,
  onConvert,
  onBack,
}: Step3ConvertProps) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-[24px] px-[12px] py-[12px]">
      <h2 className="font-mono text-3xl text-[#e5e5e5] font-normal">
        Schritt 2: Konvertierung
      </h2>

      <ZenSubtitle className="text-center max-w-md">
        {`${fromFormat.toUpperCase()} → ${toFormats.map((f) => f.toUpperCase()).join(', ')}`}
      </ZenSubtitle>

      {/* Preview */}
      <div className="w-1/2 h-[200px] max-w-2xl flex flex-col">
        <label className="text-[#999] text-[12px] mb-2 font-mono block">
          Vorschau ({fromFormat.toUpperCase()}):
        </label>
        <div className="bg-[#2A2A2A] text-[#e5e5e5] border border-[#555] rounded p-[16px] font-mono text-sm h-[164px] overflow-auto">
          {inputContent.slice(0, 200)}
          {inputContent.length > 200 && '...'}
        </div>
      </div>

      {error && (
        <div className="w-full max-w-2xl p-[12px] bg-red-900/20 border border-red-500/50 rounded text-red-300 text-sm font-mono">
          {error}
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-col md:flex-row gap-[16px] mt-[24px]">
        {isConverting ? (
          <div className="text-[#AC8E66] font-mono text-lg">
            Konvertiere...
          </div>
        ) : (
          <ZenRoughButton
            label="Jetzt konvertieren"
            icon={<FontAwesomeIcon icon={faArrowRight} className="text-[#AC8E66]" />}
            onClick={onConvert}
          />
        )}

        <ZenRoughButton
          label="Zurück zum Inhalt"
          icon={
            <FontAwesomeIcon
              icon={faArrowRight}
              className="text-[#AC8E66] rotate-[180deg]"
            />
          }
          onClick={onBack}
         
        />
      </div>
    </div>
  );
};
