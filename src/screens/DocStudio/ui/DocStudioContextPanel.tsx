import type { ProjectMetadata } from '../../../kits/PatternKit/ZenModalSystem';
import type { ScanSummary } from '../../../services/projectScanService';

export function DocStudioContextPanel({
  projectPath,
  scanSummary,
  metadata,
}: {
  projectPath: string | null;
  scanSummary: ScanSummary | null;
  metadata: ProjectMetadata;
}) {
  return (
    <div className="flex flex-col gap-4 font-mono text-[11px]">
      <div className="rounded-[10px] border border-[#2A2A2A] bg-[#151515] p-3">
        <p className="text-[#777] mb-1">Projektpfad</p>
        <p className="text-[#AC8E66] break-all">{projectPath || 'Kein Projekt gewählt'}</p>
      </div>

      <div className="rounded-[10px] border border-[#2A2A2A] bg-[#151515] p-3">
        <p className="text-[#777] mb-1">Scan Status</p>
        <p className="text-[#e5e5e5]">
          {scanSummary ? 'Analyse vorhanden' : 'Noch nicht analysiert'}
        </p>
        {scanSummary && (
          <p className="text-[#777] mt-2">Detected: {scanSummary.projectType.join(', ') || 'n/a'}</p>
        )}
      </div>

      <div className="rounded-[10px] border border-[#2A2A2A] bg-[#151515] p-3">
        <p className="text-[#777] mb-1">Metadaten</p>
        <p className="text-[#e5e5e5]">{metadata.authorName || 'Autor fehlt'}</p>
        <p className="text-[#777]">{metadata.companyName || 'Firma fehlt'}</p>
        <p className="text-[#777]">{metadata.license || 'Lizenz fehlt'}</p>
      </div>
    </div>
  );
}
