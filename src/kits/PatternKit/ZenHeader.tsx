// ./kits/PatternKit/ZenHeader.tsx
import { ZenBackButton } from "../DesignKit/ZenBackButton";
import { ZenHomeButton } from "../DesignKit/ZenHomeButton";
import { ZenSettingsNotification } from "./ZenSettingsNotification";
import { ZenInfoButton } from "../DesignKit/ZenInfoButton";
import { faCog } from "@fortawesome/free-solid-svg-icons";

interface ZenHeaderProps {
  leftText?: React.ReactNode;
  rightText?: React.ReactNode;
  rightAddon?: React.ReactNode;
  onBack?: () => void;
  onHome?: () => void;  
  onSettings?: () => void;
  onInfo?: () => void;
  onHelp?: () => void;

  showSettingsNotification?: boolean;
  showInfoNotification?: boolean;
  onDismissNotification?: () => void;
  studioBar?: React.ReactNode;
}

export const ZenHeader = ({
  leftText = "ZenPost Markdown → JSON Editor",
  rightText = "Step 0/5 · JSON Format oder Markdown",
  rightAddon,
  onBack,
  onHome,
  onSettings,
  onInfo,
 
  showSettingsNotification = false,

  showInfoNotification: _showInfoNotification = false,
  onDismissNotification,
  studioBar,
}: ZenHeaderProps) => {

  return (
    <div className="w-full py-[0px] border-b border-[#AC8E66] relative bg-[#151515]">
      <div className="flex justify-between items-center max-w-6xl mx-auto px-[4vw]">

        {/* LEFT */}
        <div className="flex items-center gap-3">
          {onBack && <ZenBackButton onClick={onBack} size="sm" />}
          <p className="font-mono text-[10px] tracking-tight text-[#d0cbb8]">
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
        <div className="flex items-center gap-3 min-w-0">
          <p className="font-mono text-[10px] text-[#d0cbb8] tracking-tight mr-[10px]
          text-right max-w-[50vw] truncate">
            {rightText}
          </p>
          <div className="flex items-center gap-3 flex-shrink-0">
            {rightAddon}
            {onSettings && (
              <div style={{ position: "relative" }}>
                <ZenInfoButton
                  onClick={onSettings}
                  size="sm"
                  icon={faCog}
                  ariaLabel="Settings"
                />
                <ZenSettingsNotification
                  show={showSettingsNotification}
                  onDismiss={onDismissNotification}
                />
              </div>
            )}
            {onInfo && (
              <div style={{ position: "relative" }}>
                <ZenInfoButton onClick={onInfo} size="sm" />
              </div>
            )}
           
          </div>
        </div>

      </div>
      {studioBar && (
        <div className="max-w-6xl mx-auto px-[4vw] pt-2">
          {studioBar}
        </div>
      )}
    </div>
  );
};
