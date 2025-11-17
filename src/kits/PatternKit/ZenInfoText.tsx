// ./kits/PatternKit/ZenInfoText.tsx
interface ZenInfoTextProps {
  children: string;
}

export const ZenInfoText = ({ children }: ZenInfoTextProps) => {
  return (
    <p className="font-mono text-xs text-[#666666] text-center leading-relaxed max-w-md">
      {children}
    </p>
  );
};
