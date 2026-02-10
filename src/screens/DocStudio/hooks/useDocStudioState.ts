import { useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import type { ProjectMetadata } from '../../../kits/PatternKit/ZenModalSystem';
import type { DocStudioRuntime, DocStudioStep, DocTemplate, ProjectInfo, DocTab } from '../types';
import type { TargetLanguage } from '../../../services/aiService';
import type { ScanSummary, ScanArtifacts } from '../../../services/projectScanService';

type DocStudioInitialState = Partial<{
  step: DocStudioStep;
  projectPath: string | null;
  projectInfo: ProjectInfo | null;
  metadata: ProjectMetadata;
  generatedContent: string;
  activeTabId: string | null;
  openFileTabs: DocTab[];
  tabContents: Record<string, string>;
  dirtyTabs: Record<string, boolean>;
  selectedTemplates: DocTemplate[];
  scanSummary: ScanSummary | null;
  scanArtifacts: ScanArtifacts | null;
  tone: 'professional' | 'casual' | 'technical' | 'enthusiastic';
  length: 'short' | 'medium' | 'long';
  audience: 'beginner' | 'intermediate' | 'expert';
  targetLanguage: TargetLanguage;
}>;

export function useDocStudioState(initial?: DocStudioInitialState) {
  const [step, setStep] = useState<DocStudioStep>(initial?.step ?? 'project');
  const [projectPath, setProjectPath] = useState<string | null>(initial?.projectPath ?? null);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(initial?.projectInfo ?? null);
  const [scanSummary, setScanSummary] = useState<ScanSummary | null>(initial?.scanSummary ?? null);
  const [scanArtifacts, setScanArtifacts] = useState<ScanArtifacts | null>(initial?.scanArtifacts ?? null);
  const [metadata, setMetadata] = useState<ProjectMetadata>(
    initial?.metadata ?? {
      authorName: '',
      authorEmail: '',
      companyName: '',
      license: 'MIT',
      year: new Date().getFullYear().toString(),
      website: '',
      repository: '',
      contributingUrl: '',
    }
  );

  const [selectedTemplates, setSelectedTemplates] = useState<DocTemplate[]>(initial?.selectedTemplates ?? []);
  const [generatedContent, setGeneratedContent] = useState(initial?.generatedContent ?? '');
  const [activeTabId, setActiveTabId] = useState<string | null>(initial?.activeTabId ?? null);
  const [openFileTabs, setOpenFileTabs] = useState<DocTab[]>(initial?.openFileTabs ?? []);
  const [tabContents, setTabContents] = useState<Record<string, string>>(initial?.tabContents ?? {});
  const [dirtyTabs, setDirtyTabs] = useState<Record<string, boolean>>(initial?.dirtyTabs ?? {});
  const [tone, setTone] = useState<'professional' | 'casual' | 'technical' | 'enthusiastic'>(initial?.tone ?? 'professional');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>(initial?.length ?? 'medium');
  const [audience, setAudience] = useState<'beginner' | 'intermediate' | 'expert'>(initial?.audience ?? 'intermediate');
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>(initial?.targetLanguage ?? 'deutsch');

  const runtime: DocStudioRuntime = isTauri() ? 'tauri' : 'web';

  return {
    step,
    projectPath,
    projectInfo,
    scanSummary,
    scanArtifacts,
    metadata,
    selectedTemplates,
    generatedContent,
    activeTabId,
    openFileTabs,
    tabContents,
    dirtyTabs,
    tone,
    length,
    audience,
    targetLanguage,
    runtime,

    setStep,
    setProjectPath,
    setProjectInfo,
    setScanSummary,
    setScanArtifacts,
    setMetadata,
    setSelectedTemplates,
    setGeneratedContent,
    setActiveTabId,
    setOpenFileTabs,
    setTabContents,
    setDirtyTabs,
    setTone,
    setLength,
    setAudience,
    setTargetLanguage,
  };
}
