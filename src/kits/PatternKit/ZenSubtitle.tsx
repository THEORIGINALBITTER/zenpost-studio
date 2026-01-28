// ./kits/PatternKit/ZenSubtitle.tsx
import { ReactNode } from 'react';

interface ZenSubtitleProps {
  children: ReactNode;
  className?: string;
}
export const ZenSubtitle = ({ children, className = "" }: ZenSubtitleProps) => {
  return (
    <p className={`font-mono text-[11px] text-[#fef3c7 ] tracking-wider leading-relaxed ${className}`}>
      {children}
      <span></span>
    </p>
    
  );
};
