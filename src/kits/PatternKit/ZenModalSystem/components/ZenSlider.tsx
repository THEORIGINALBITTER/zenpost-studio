interface ZenSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  minLabel?: string;
  maxLabel?: string;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
  labelSize?: string;
  labelColor?: string;
}

/**
 * ZenSlider - Wiederverwendbare Slider-Komponente im Zen-Design
 *
 * Features:
 * - Zen-Styling mit goldenen Akzenten
 * - Optional: Min/Max Labels
 * - Optional: Value Display
 * - Custom Value Formatter
 * - Vollständig konfigurierbar
 */
export const ZenSlider = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  minLabel,
  maxLabel,
  showValue = true,
  valueFormatter = (v) => v.toFixed(1),
  className = '',
  labelSize = '11px',
  labelColor = '#999',
}: ZenSliderProps) => {
  return (
    <div className={`flex flex-col items-center w-full ${className}`}>
      <style>{`
        .zen-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #AC8E66;
          cursor: pointer;
          border: 2px solid #D4AF78;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          transition: background 0.2s;
        }

        .zen-slider::-webkit-slider-thumb:hover {
          background: #D4AF78;
        }

        .zen-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #AC8E66;
          cursor: pointer;
          border: 2px solid #D4AF78;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          transition: background 0.2s;
        }

        .zen-slider::-moz-range-thumb:hover {
          background: #D4AF78;
        }
      `}</style>
      <div className="w-full max-w-[300px]">
        {/* Label mit Wert */}
        <label
          className="block font-mono text-center mb-2"
          style={{ color: labelColor, fontSize: labelSize }}
        >
          {label}
          {showValue && `: ${valueFormatter(value)}`}
        </label>

        {/* Slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            width: '100%',
            height: '8px',
            background: '#2A2A2A',
            borderRadius: '8px',
            outline: 'none',
            cursor: 'pointer',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            appearance: 'none',
            position: 'relative',
            zIndex: 1,
          }}
          className="zen-slider"
        />

        {/* Min/Max Labels */}
        {(minLabel || maxLabel) && (
          <div className="flex justify-between text-[#777] text-[11px] mt-1 font-mono">
            {minLabel && <span>{minLabel}</span>}
            {maxLabel && <span>{maxLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
