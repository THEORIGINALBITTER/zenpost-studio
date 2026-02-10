import { useId, useMemo } from "react";

interface ZenSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;

  minLabel?: string;
  maxLabel?: string;

  showValue?: boolean;
  valueFormatter?: (value: number) => string;

  className?: string;

  labelSize?: string;
  labelColor?: string;

  disabled?: boolean;
  widthClassName?: string; // z.B. "max-w-[300px]" oder "max-w-[420px]"
}

export const ZenSlider = ({
  label,
  value,
  min,
  max,
  step = 0.1,
  onChange,
  minLabel,
  maxLabel,
  showValue = true,
  valueFormatter = (v) => v.toFixed(1),
  className = "",
  labelSize = "11px",
  labelColor = "#999",
  disabled = false,
  widthClassName = "max-w-[300px]",
}: ZenSliderProps) => {
  const id = useId();

  const pct = useMemo(() => {
    if (max === min) return 0;
    const clamped = Math.min(max, Math.max(min, value));
    return ((clamped - min) / (max - min)) * 100;
  }, [value, min, max]);

  return (
    <div className={`flex flex-col items-center w-full ${className}`}>
      <div className={`w-full ${widthClassName}`}>
        <label
          htmlFor={id}
          className="block font-mono text-center mb-2 select-none"
          style={{ color: labelColor, fontSize: labelSize }}
        >
          {label}
          {showValue ? `: ${valueFormatter(value)}` : ""}
        </label>

        <input
          id={id}
          className="zen-slider"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={label}
          onChange={(e) => onChange(e.currentTarget.valueAsNumber)}
          style={{
            // Track fill (gold progress)
            ["--zen-pct" as any]: `${pct}%`,
          }}
        />

        {(minLabel || maxLabel) && (
          <div className="flex justify-between text-[#777] text-[11px] mt-1 font-mono">
            <span>{minLabel ?? ""}</span>
            <span>{maxLabel ?? ""}</span>
          </div>
        )}
      </div>
    </div>
  );
};
