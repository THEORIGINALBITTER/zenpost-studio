import { ReactNode } from 'react';
import { ZenFooterText } from './ZenFooterText';

interface ZenModalFooterProps {
  children?: ReactNode;
  showFooterText?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const ZenModalFooter = ({
  children,
  showFooterText = true,
  className = '',
  style = {},
}: ZenModalFooterProps) => {
  return (
    <div
      className={`border-t border-[#AC8E66] py-3 px-4 relative z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] ${className}`}
      style={{ paddingTop: 10, marginTop: 20, ...style }}
    >
      {children}
      {showFooterText && <ZenFooterText />}
    </div>
  );
};
