// ./kits/PatternKit/ZenDropdown.tsx
import { useEffect, useRef } from "react";
import rough from "roughjs/bin/rough";

interface ZenDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label?: string;
  className?: string; // z.B. "max-w-[200px] items-center", "w-1/2 items-center"
  fullWidth?: boolean;
  variant?: 'default' | 'compact';
  labelSize?: string; // z.B. "text-sm", "text-base", "text-lg" oder direkt "14px", "16px"
}

export const ZenDropdown = ({
  value,
  onChange,
  options,
  label,
  className = "",
  fullWidth = false,
  variant = 'default',
  labelSize,
}: ZenDropdownProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const isCompact = variant === 'compact';

  // Dimensions based on variant
  const width = fullWidth ? 320 : 200;
  const height = isCompact ? 40 : 48;

  /** Zeichnet das abgerundete Rechteck mit gewünschter Farbe */
  const drawRect = (strokeColor: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rc = rough.canvas(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    // Rounded rectangle path
    const radius = 8;
    const x = 2;
    const y = 2;
    const w = width - 4;
    const h = height - 4;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.arcTo(x + w, y, x + w, y + radius, radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
    ctx.lineTo(x + radius, y + h);
    ctx.arcTo(x, y + h, x, y + h - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();

    // Use rough.js to draw the path
    rc.path(
      `M ${x + radius} ${y} L ${x + w - radius} ${y} Q ${x + w} ${y} ${x + w} ${y + radius} L ${x + w} ${y + h - radius} Q ${x + w} ${y + h} ${x + w - radius} ${y + h} L ${x + radius} ${y + h} Q ${x} ${y + h} ${x} ${y + h - radius} L ${x} ${y + radius} Q ${x} ${y} ${x + radius} ${y} Z`,
      {
        stroke: strokeColor,
        roughness: 0.5,
        strokeWidth: 1.2,
      }
    );
  };

  useEffect(() => {
    drawRect("#3a3a3a");
  }, [width, height]);

  /** Hover-Status */
  const handleMouseEnter = () => drawRect("#AC8E66");
  const handleMouseLeave = () => drawRect("#3a3a3a");

  // Helper function to determine label styling
  const getLabelStyle = () => {
    if (!labelSize) {
      return isCompact ? 'text-sm' : 'text-sm';
    }
    // If labelSize contains px, use it as inline style
    if (labelSize.includes('px')) {
      return '';
    }
    // Otherwise assume it's a Tailwind class
    return labelSize;
  };

  const getInlineLabelStyle = () => {
    if (labelSize?.includes('px')) {
      return { fontSize: labelSize };
    }
    return {};
  };

  return (
    <div className={`flex flex-col ${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label
          className={`text-[#999] font-mono ${getLabelStyle()} ${isCompact ? 'mb-2 block' : 'mb-3'} text-center`}
          style={getInlineLabelStyle()}
        >
          {label}
        </label>
      )}
      <div
        className="relative"
        style={{ width: fullWidth ? '100%' : width }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Canvas für rough.js Border */}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width: fullWidth ? '100%' : width, height }}
        />

        {/* Native Select Element */}
        <select
          ref={selectRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`relative bg-[#2A2A2A] text-[#e5e5e5] font-mono
            focus:outline-none cursor-pointer transition-colors
            appearance-none
            ${isCompact ? 'py-2 text-sm' : 'py-3 text-base'}
            ${fullWidth ? 'w-full' : ''}`}
          style={{
            width: fullWidth ? '100%' : width,
            height,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            borderRadius: '8px',
            textAlign: 'center',
            textAlignLast: 'center',
            paddingLeft: '0',
            paddingRight: '0',
          }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
