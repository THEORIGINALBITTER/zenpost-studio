// ./kits/PatternKit/ZenCard.tsx
import RoughBorder from "../DesignKit/RoughBorder";

interface ZenCardProps {
  label: string;
  icon?: string;
  onClick?: () => void;
}

export const ZenCard = ({ label, icon = "📁", onClick }: ZenCardProps) => {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer hover:scale-[1.02] transition-transform"
    >
      <RoughBorder width={160} height={140} goldTone>
        <div className="flex flex-col items-center justify-center h-full select-none font-mono text-black">
          <span className="text-3xl mb-2">{icon}</span>
          <span className="text-base">{label}</span>
        </div>
      </RoughBorder>
    </div>
  );
};
