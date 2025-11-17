// ./kits/PatternKit/ZenSubtitle.tsx
interface ZenSubtitleProps {
  children: string;
  className?: string;
}
export const ZenSubtitle = ({ children, className = "" }: ZenSubtitleProps) => {
  return (
    <p className={`font-mono text-[11px] text-[#888888]/90 tracking-wider leading-relaxed ${className}`}>
      {children}
    </p>
  );
};
