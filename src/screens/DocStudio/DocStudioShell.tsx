import type { ReactNode } from 'react';
import { ZenFooterText } from '../../kits/PatternKit/ZenModalSystem';

export function DocStudioShell({
  children,
  modals,
  noPadding,
}: {
  children: ReactNode;
  modals?: ReactNode;
  noPadding?: boolean;
}) {
  // Match the overall layout used by Content AI Studio: full-height column + footer.
  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-[#e5e5e5] overflow-hidden">
      <div className={`flex-1 overflow-y-auto${noPadding ? '' : ' p-3 sm:p-6'}`}>{children}</div>
      {!noPadding && (
        <div className="relative border-t border-[#AC8E66] py-3">
          <ZenFooterText />
        </div>
      )}
      {modals}
    </div>
  );
}
