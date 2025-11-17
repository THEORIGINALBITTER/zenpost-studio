import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart } from "@fortawesome/free-solid-svg-icons";
import { useOpenExternal } from "../../hooks/useOpenExternal";

interface ZenFooterTextProps {
  text?: string;
  className?: string;
}

export const ZenFooterText = ({
  text = "Made with",
  className = "",
}: ZenFooterTextProps) => {
  const { openExternal } = useOpenExternal();

  return (
    <div className={`text-center ${className}`}>
      <p className="font-mono text-[9px] text-[#666] flex items-center justify-center gap-1">
        <span>{text}</span>
        <span className="ml-[2px]">
          <FontAwesomeIcon icon={faHeart} className="text-[#AC8E66] text-[10px]" />
        </span>
        <a
          onClick={() => openExternal("https://denisbitter.de")}
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
