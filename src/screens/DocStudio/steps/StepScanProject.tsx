import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { ZenRoughButton } from '../../../kits/PatternKit/ZenModalSystem';
import { scanProjectService } from '../services/docStudioService';
import type { ProjectInfo } from '../types';
import type { ScanSummary, ScanArtifacts } from '../../../services/projectScanService';

export function StepScanProject({
  projectPath,
  onScanComplete,
}: {
  projectPath: string;
  onScanComplete: (summary: ScanSummary, artifacts: ScanArtifacts, info: ProjectInfo) => void;
}) {
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const result = await scanProjectService(projectPath, true);
      const summary = result.summary;
      const info: ProjectInfo = {
        name: summary.project.name,
        description: summary.project.description,
        version: summary.project.version,
        dependencies: summary.dependencies.top,
        fileTypes: summary.fileTypes,
        hasTests: summary.structure.hasTests,
        hasApi: summary.projectType.includes('php-api'),
      };
      onScanComplete(summary, result, info);
    } catch (error) {
      console.error('[DocStudio] Scan failed', error);
      alert('Scan fehlgeschlagen. Bitte prüfe den Projektordner.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="flex items-center justify-center mt-[50px] mb-[24px] px-[12px] pt-[50px]">
      <div className="w-full max-w-[840px] rounded-[16px] border-[0.5px] border-[#AC8E66]  p-[20px]">
        <h2 className="font-mono text-[14px] text-[#dbd9d5] mb-[10px] px-[10px] flex items-center gap-2">
          <FontAwesomeIcon icon={faSearch} className="text-[#AC8E66] px-[23px]" />
          Project Analysis
        </h2>
        <p className="font-mono text-[11px] text-[#777] mb-[12px] px-[30px]">
          Scan erfasst nur harte Fakten und legt Reports in `zenstudio/analysis` ab.
        </p>

        <div className="rounded-[10px] border-[0.5px] border-[#2A2A2A] bg-[#151515] p-[24px] text-left mb-6">
          <p className="font-mono text-[10px] text-[#777] mb-1">Projektpfad</p>
          <p className="font-mono text-[11px] text-[#AC8E66] break-all">{projectPath}</p>
        </div>

        <div 
        style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', paddingTop: '30px' }}
        className="flex  ">
          <ZenRoughButton
            label={isScanning ? 'Scanning...' : 'Projekt analysieren'}
            icon={<FontAwesomeIcon icon={isScanning ? faSearch : faCheckCircle} />}
            onClick={handleScan}
            variant="default"
          />
        </div>
      </div>
    </div>
  );
}
