import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import type { DocStudioStep } from '../types';
import { DocStudioStepper } from './DocStudioStepper';

export function DocStudioHeader({ step, onBack }: { step: DocStudioStep; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
      <button
        className="flex items-center gap-2 text-[12px] font-mono text-[#AC8E66]"
        onClick={onBack}
        style={{
          border: '1px solid #3A3A3A',
          borderRadius: '8px',
          padding: '8px 12px',
          background: '#1A1A1A',
        }}
      >
        <FontAwesomeIcon icon={faArrowLeft} />
        Zurück
      </button>
      <DocStudioStepper step={step} />
    </div>
  );
}
