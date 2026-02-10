// ./screens/converter-steps/Step1FormatSelection.tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { ZenSubtitle } from '../../kits/PatternKit/ZenSubtitle';
import { ZenDropdown, ZenRoughButton } from '../../kits/PatternKit/ZenModalSystem';
import { SupportedFormat } from '../../utils/fileConverter';

interface FormatOption {
  value: SupportedFormat;
  label: string;
}

interface Step1FormatSelectionProps {
  fromFormat: SupportedFormat;
  toFormat: SupportedFormat;
  formatOptions: FormatOption[];
  onFromFormatChange: (format: SupportedFormat) => void;
  onToFormatChange: (format: SupportedFormat) => void;
  onNext: () => void;
}

export const Step1FormatSelection = ({
  fromFormat,
  toFormat,
  formatOptions,
  onFromFormatChange,
  onToFormatChange,
  onNext,
}: Step1FormatSelectionProps) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
            {/* Subtitle */}
        <div className="mt[20px]">
          <ZenSubtitle className="text-center max-w-md mb-[20px]">
            Wähle das Quell- und Zielformat für die Konvertierung
          </ZenSubtitle>
        </div>
      <div className="flex flex-col items-center">
        {/* Title */}
        <div className="mb-4">
     <h2 className="font-mono text-3xl font-normal">
  <span style={{ color: '#AC8E66' }}>Step01:</span>
  <span className="text-[#e5e5e5]"> Format wählen</span>
</h2>
        </div>

  

        {/* From Format */}
        <div className="mb-32">
          <ZenDropdown
            label="Von Format:"
             className='text-[10px]'
            value={fromFormat}
            onChange={(value) => onFromFormatChange(value as SupportedFormat)}
            options={formatOptions.map((opt) => ({
              value: opt.value,
              label: opt.label,
            }))}
          />
        </div>


    
    <div className='py-90'>
        {/* Arrow Down */}
        <div className="text-[#AC8E66]  mt-[20px]">
          <FontAwesomeIcon icon={faArrowRight} size="1x" rotation={90} targetY={100} />
        </div>
        </div>



        {/* To Format */}
        <div className="mt-0 mb-40 text-purple-400 ">
          <ZenDropdown
            label="Nach Format:"
            className='text-[10px]'
            value={toFormat}
            onChange={(value) => onToFormatChange(value as SupportedFormat)}
            options={formatOptions.map((opt) => ({
              value: opt.value,
              label: opt.label,
            }))}
          />
        </div>



        {/* Info Text */}
        <div className="text-[9px] leading-relaxed max-w-md text-center text-[#777] mb-6">
          CODE (AI) nutzt AI für intelligente Konvertierungen
        </div>

        {/* Weiter Button */}
        <div className="mt-6"
    style={{paddingTop: "15px"}}
        >
          <ZenRoughButton
            label="Weiter zum Inhalt"
            icon={<FontAwesomeIcon icon={faArrowRight} className="text-[#AC8E66]" />}
            onClick={onNext}
            variant="default"
          />
        </div>
      </div>

    </div>

  );
};
