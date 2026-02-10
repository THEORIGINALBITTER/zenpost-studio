import type { DocStudioStep } from '../types';

const labels: Record<DocStudioStep, string> = {
  project: 'Projekt',
  scan: 'Analyse',
  templates: 'Templates',
  edit: 'Editor',
};

const order: DocStudioStep[] = ['project', 'scan', 'templates', 'edit'];

export function DocStudioStepper({ step }: { step: DocStudioStep }) {
  return (
    <div className="flex items-center gap-3 text-[11px] font-mono text-[#999]">
      {order.map((item, index) => {
        const isActive = step === item;
        return (
          <div key={item} className="flex items-center gap-2">
            <span
              style={{
                padding: '4px 8px',
                borderRadius: '999px',
                border: `1px solid ${isActive ? '#AC8E66' : '#3A3A3A'}`,
                color: isActive ? '#AC8E66' : '#777',
              }}
            >
              {index + 1}
            </span>
            <span style={{ color: isActive ? '#e5e5e5' : '#777' }}>{labels[item]}</span>
          </div>
        );
      })}
    </div>
  );
}
