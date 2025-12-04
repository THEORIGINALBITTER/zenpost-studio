// ./kits/PatternKit/ZenHeader.tsx
import { ZenBackButton } from "../DesignKit/ZenBackButton";
import { ZenHomeButton } from "../DesignKit/ZenHomeButton";
import { ZenSettingsButton } from "../DesignKit/ZenSettingsButton";
import { ZenSettingsNotification } from "./ZenSettingsNotification";

interface ZenHeaderProps {
  leftText?: React.ReactNode;
  rightText?: React.ReactNode;
  onBack?: () => void;
  onHome?: () => void;  
  onSettings?: () => void;
  showSettingsNotification?: boolean;
  onDismissNotification?: () => void;
}

export const ZenHeader = ({
  leftText = "ZenPost Markdown → JSON Editor",
  rightText = "Step 0/5 · JSON Format oder Markdown",
  onBack,
  onHome,
  onSettings,
  showSettingsNotification = false,
  onDismissNotification,
}: ZenHeaderProps) => {

  return (
    <div className="w-full bg-transparent py-4 border-b border-[#AC8E66] relative">
      <div className="flex justify-between items-center max-w-6xl mx-auto px-[4vw]">

        {/* LEFT */}
        <div className="flex items-center gap-3">
          {onBack && <ZenBackButton onClick={onBack} size="sm" />}
          <p className="font-mono text-[9px] tracking-tight text-[#777]">
            {leftText}
          </p>
        </div>

        {/* CENTER (Home Button) */}
        {onHome && (
          <div className="absolute left-1/2 -translate-x-1/2">
            <ZenHomeButton onClick={onHome} size="sm" />
          </div>
        )}

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          <p className="font-mono text-[9px] text-[#777] tracking-tight text-right">
            {rightText}
          </p>

          {onSettings && (
            <div style={{ position: "relative" }}>
              <ZenSettingsButton onClick={onSettings} size="sm" />
              <ZenSettingsNotification
                show={showSettingsNotification}
                onDismiss={onDismissNotification}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
