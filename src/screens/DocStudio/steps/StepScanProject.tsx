import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
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
  const [scanError, setScanError] = useState<string | null>(null);

  const handleScan = async () => {
    setIsScanning(true);
    setScanError(null);
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
      setScanError('Scan fehlgeschlagen. Bitte prüfe den Projektordner.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="flex items-center justify-center mt-[30px] sm:mt-[50px] mb-[24px] px-[12px] pt-[20px] sm:pt-[50px]">
      <div className="w-full max-w-[840px] rounded-[16px] border-[0.5px] border-[#AC8E66]  p-[20px]">
        <p className="font-mono text-[14px] text-[#dbd9d5] mb-[10px] px-[50px] flex items-center gap-2">
  
          <span>Project Analysis</span>
        </p>
        <p className="font-mono text-[11px] text-[#777] mb-[12px] px-[50px] leading-relaxed">
          Scan erfasst nur harte Fakten und legt Reports in `zenstudio/analysis` ab.
        </p>

        <div className="rounded-[10px] border-[0.5px] border-[#2A2A2A]  p-[24px] text-left mb-6">
          <p className="font-mono text-[10px] text-[#777] mb-1">Projektpfad</p>
          <p className="font-mono text-[11px] text-[#AC8E66] break-all">{projectPath}</p>
        </div>

        {scanError && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            margin: '0 0 16px 0',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '0.5px solid #5a2a2a',
            background: '#1e0f0f',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            color: '#e07070',
          }}>
            <span>{scanError}</span>
            <button
              onClick={() => setScanError(null)}
              style={{ background: 'none', border: 'none', color: '#e07070', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0, flexShrink: 0 }}
            >×</button>
          </div>
        )}
        <div
        style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', paddingTop: '30px' }}
        className="flex  ">
          <ZenRoughButton
            label={isScanning ? 'Scanning...' : 'Projekt analysieren'}
            icon={<FontAwesomeIcon icon={isScanning ? faSearch : faSearch} />}
            onClick={handleScan}
            variant="default"
          />
        </div>
      </div>
    </div>
  );
}
