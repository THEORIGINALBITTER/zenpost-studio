import type { ReactNode } from 'react';
import { ZenFooterText } from '../../kits/PatternKit/ZenModalSystem';

export function DocStudioShell({
  children,
  modals,
}: {
  children: ReactNode;
  modals?: ReactNode;
}) {
  // Match the overall layout used by Content AI Studio: full-height column + footer.
  return (
    <div className="flex flex-col h-screen bg-[transparent] text-[#e5e5e5] overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
      <div className="relative border-t border-[#AC8E66] py-3">
        <ZenFooterText />
      </div>
      {modals}
    </div>
  );
}
