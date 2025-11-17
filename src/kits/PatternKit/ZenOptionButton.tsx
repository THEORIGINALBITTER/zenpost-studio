// ./kits/PatternKit/ZenOptionButton.tsx
interface ZenOptionButtonProps {
  label: string;
  icon?: string;
  variant?: "outlined" | "filled";
  onClick?: () => void;
}

export const ZenOptionButton = ({
  label,
  icon,
  variant = "outlined",
  onClick,
}: ZenOptionButtonProps) => {
  const baseClasses =
    "px-6 py-3 rounded-lg font-mono text-sm transition-all duration-200 flex items-center justify-center gap-2 min-w-[280px]";

  const variantClasses = {
    outlined:
      "border border-[#3a3a3a] bg-transparent text-[#e5e5e5] hover:border-[#555555] hover:bg-[#1f1f1f]",
    filled:
      "border-2 border-[#AC8E66] bg-[#AC8E66]/10 text-[#AC8E66] hover:bg-[#AC8E66]/20",
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {icon && <span className="text-lg">{icon}</span>}
      <span>{label}</span>
    </button>
  );
};
