// ./kits/PatternKit/ZenSubtitleDark.tsx
import { ReactNode } from 'react';

interface ZenSubtitleProps {
  children: ReactNode;
  className?: string;
}
export const ZenSubtitleDark = ({ children, className = "" }: ZenSubtitleProps) => {
  return (
    <p className={`font-mono text-[11px] text-[#1a1a1a] 
    tracking-wider 
    leading-relaxed ${className}`}>
      {children}
      <span></span>
    </p>
    
  );
};
