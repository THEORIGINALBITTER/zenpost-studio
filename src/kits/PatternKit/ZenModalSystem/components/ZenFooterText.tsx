import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart } from "@fortawesome/free-solid-svg-icons";
import { Command } from '@tauri-apps/plugin-shell';

interface ZenFooterTextProps {
  text?: string;
  className?: string;
}

export const ZenFooterText = ({
  text = "Made with",
  className = "",
}: ZenFooterTextProps) => {
  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    console.log('[ZenFooterText] Attempting to open URL: https://denisbitter.de');

    try {
      // Detect platform
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const isWindows = navigator.platform.toLowerCase().includes('win');

      if (isMac) {
        // macOS: Use 'open' command
        await Command.create('open', ['https://denisbitter.de']).execute();
        console.log('[ZenFooterText] URL opened successfully via shell (macOS)');
      } else if (isWindows) {
        // Windows: Use 'explorer' command
        await Command.create('explorer', ['https://denisbitter.de']).execute();
        console.log('[ZenFooterText] URL opened successfully via shell (Windows)');
      } else {
        // Linux: Use 'xdg-open' command
        await Command.create('xdg-open', ['https://denisbitter.de']).execute();
        console.log('[ZenFooterText] URL opened successfully via shell (Linux)');
      }
    } catch (error) {
      console.error('[ZenFooterText] Failed to open URL via shell:', error);
      // Fallback: Versuche es mit window.open
      try {
        window.open("https://denisbitter.de", "_blank");
        console.log('[ZenFooterText] URL opened via window.open fallback');
      } catch (fallbackError) {
        console.error('[ZenFooterText] window.open also failed:', fallbackError);
      }
    }
  };

  return (
    <div
      className={`
        w-full
        
       
        ${className}
      `}
      style={{ padding: "10px 0" }}
    >
      <p className="font-mono text-[9px] text-[#666] flex items-center justify-center gap-1">
        <span>{text}</span>
        <span className="ml-[2px]">
          <FontAwesomeIcon icon={faHeart} className="text-[#AC8E66] text-[10px]" />
        </span>
        <a
          onClick={handleClick}
          href="https://denisbitter.de"
          className="ml-[4px] text-[#888] hover:text-[#AC8E66]
          transition-colors duration-200 underline decoration-transparent
          hover:decoration-[#AC8E66]/50 cursor-pointer select-none"
        >
          by Denis Bitter
        </a>
      </p>
    </div>
  );
};
