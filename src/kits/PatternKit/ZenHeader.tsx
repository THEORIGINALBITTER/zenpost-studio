// ./kits/PatternKit/ZenHeader.tsx
import { ZenBackButton } from "../DesignKit/ZenBackButton";

interface ZenHeaderProps {
  leftText?: string;
  rightText?: string;
  onBack?: () => void;
}

export const ZenHeader = ({
  leftText = "ZenPost Markdown → JSON Editor",
  rightText = "Step 0/5 · JSON Format oder Markdown",
  onBack,
}: ZenHeaderProps) => {
  return (
    <div className="w-full bg-transparent py-4">
      <div className="flex justify-between items-center max-w-6xl mx-auto px-[4vw]">
        <div className="flex items-center gap-3">
          {onBack && (
            <ZenBackButton onClick={onBack} size="sm" />
          )}
          <p className="font-mono text-[9px] text-[#777] tracking-tight">
            {leftText}
          </p>
        </div>
        <p className="font-mono text-[9px] text-[#777] tracking-tight text-right">
          {rightText}
        </p>
      </div>
    </div>
  );
};
