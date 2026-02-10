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
      className={`border-t border-[#AC8E66] bg-[#151515]  ${className}`}
      style={{ paddingTop: 10, marginTop: 20, ...style }}
    >
      {children}
      {showFooterText && <ZenFooterText />}
    </div>
  );
};
