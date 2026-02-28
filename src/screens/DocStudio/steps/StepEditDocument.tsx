import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolderOpen, faGear, faMoon, faSpinner, faSun } from '@fortawesome/free-solid-svg-icons';
import { ZenMarkdownEditor } from '../../../kits/PatternKit/ZenMarkdownEditor';
import { ZenMarkdownPreview } from '../../../kits/PatternKit/ZenMarkdownPreview';
import { ZenOutlinePanel } from '../../../kits/PatternKit/ZenOutlinePanel';
import { ZenDropdown } from '../../../kits/PatternKit/ZenModalSystem';
import { TemplateHintBanner } from '../components/TemplateHintBanner';
import { defaultEditorSettings, type EditorSettings } from '../../../services/editorSettingsService';
import { buildDocGenerationPrompt, buildYamlFrontmatter, generateDocService } from '../services/docStudioService';
import type { TargetLanguage } from '../../../services/aiService';
import type { DocInputFields, DocTab, DocTemplate, ProjectInfo } from '../types';
import type { ProjectMetadata } from '../../../kits/PatternKit/ZenModalSystem/modals/ZenMetadataModal';
import { ZenThoughtLine } from '../../../components/ZenThoughtLine';
import { revealItemInDir } from '@tauri-apps/plugin-opener';



interface TemplateHint {
  message: string;
  detectedType?: string;
}

type LineDiffRow = {
  left: string;
  right: string;
  status: 'same' | 'added' | 'removed' | 'modified';
};

function levenshteinDistance(a: string, b: string): number {
  const n = a.length;
  const m = b.length;
  if (n === 0) return m;
  if (m === 0) return n;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 0; i <= n; i += 1) dp[i][0] = i;
  for (let j = 0; j <= m; j += 1) dp[0][j] = j;
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[n][m];
}

function lineSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
}

export function StepEditDocument({
  tabs,
  activeTabId,
  contents,
  showPreview,
  dirtyMap,
  activeTemplate,
  hasRelevantScanData,
  projectInfo,
  inputFields,
  tone,
  length,
  audience,
  targetLanguage,
  onToneChange,
  onLengthChange,
  onAudienceChange,
  onLanguageChange,
  templateHint,
  onTabChange,
  onCloseTab,
  onContentChange,
  onDismissHint,
  onOpenRequiredFields,
  comparisonBaseContent,
  comparisonBaseLabel,
  comparisonBaseOptions,
  comparisonBaseSelection,
  onComparisonBaseChange,
  onAdoptCurrentAsComparisonBase,
  autosaveStatusText,
  projectPath,
  zenThoughts = [],
  showZenThoughtInHeader = false,
  onOpenEditorSettings,
  metadata,
}: {
  tabs: DocTab[];
  activeTabId: string;
  contents: Record<string, string>;
  showPreview: boolean;
  dirtyMap: Record<string, boolean>;
  activeTemplate: DocTemplate | null;
  hasRelevantScanData: boolean;
  projectInfo: ProjectInfo | null;
  inputFields: DocInputFields;
  tone: 'professional' | 'casual' | 'technical' | 'enthusiastic';
  length: 'short' | 'medium' | 'long';
  audience: 'beginner' | 'intermediate' | 'expert';
  targetLanguage: TargetLanguage;
  onToneChange: (value: 'professional' | 'casual' | 'technical' | 'enthusiastic') => void;
  onLengthChange: (value: 'short' | 'medium' | 'long') => void;
  onAudienceChange: (value: 'beginner' | 'intermediate' | 'expert') => void;
  onLanguageChange: (value: TargetLanguage) => void;
  templateHint?: TemplateHint | null;
  onTabChange: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onContentChange: (tabId: string, value: string) => void;
  onDismissHint?: () => void;
  onOpenRequiredFields?: () => void;
  comparisonBaseContent?: string;
  comparisonBaseLabel?: string;
  comparisonBaseOptions?: Array<{ id: string; label: string }>;
  comparisonBaseSelection?: string;
  onComparisonBaseChange?: (value: string) => void;
  onAdoptCurrentAsComparisonBase?: () => void;
  autosaveStatusText?: string | null;
  projectPath?: string | null;
  zenThoughts?: string[];
  showZenThoughtInHeader?: boolean;
  onOpenEditorSettings?: () => void;
  metadata?: ProjectMetadata;
}) {
  const activeContent = contents[activeTabId] ?? '';
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(() => {
    if (typeof window === 'undefined') return { ...defaultEditorSettings };
    const raw = localStorage.getItem('zenpost_editor_settings');
    if (!raw) return { ...defaultEditorSettings };
    try {
      return { ...defaultEditorSettings, ...JSON.parse(raw) };
    } catch {
      return { ...defaultEditorSettings };
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<EditorSettings>).detail;
      if (detail) setEditorSettings(detail);
    };
    window.addEventListener('zen-editor-settings-updated', handler);
    return () => window.removeEventListener('zen-editor-settings-updated', handler);
  }, []);

  const updateEditorTheme = (nextTheme: 'dark' | 'light') => {
    if (typeof window === 'undefined') return;
    const nextSettings = {
      ...defaultEditorSettings,
      ...editorSettings,
      theme: nextTheme,
    };
    localStorage.setItem('zenpost_editor_settings', JSON.stringify(nextSettings));
    window.dispatchEvent(
      new CustomEvent('zen-editor-settings-updated', { detail: nextSettings })
    );
    setEditorSettings(nextSettings);
  };

  const toggleOutlinePanel = () => {
    setShowOutline((prev) => {
      const next = !prev;
      if (next) {
        setShowTemplateAiPanel(false);
        setShowComparison(false);
      }
      return next;
    });
  };

  const toggleTemplateAiPanel = () => {
    setShowTemplateAiPanel((prev) => {
      const next = !prev;
      if (next) {
        setShowOutline(false);
        setShowComparison(false);
      }
      return next;
    });
  };

  const toggleComparisonPanel = () => {
    if (!canUseComparison) return;
    setShowComparison((prev) => {
      const next = !prev;
      if (next) {
        setShowOutline(false);
        setShowTemplateAiPanel(false);
      }
      return next;
    });
  };

  const themeStyles = {
    dark: {
      panelBg: '#151515',
      border: '#AC8E66',
      shadow: '0 6px 16px rgba(0,0,0,0.35), inset 0 0 24px rgba(0,0,0,0.45)',
      text: '#e5e5e5',
    },
    light: {
      panelBg: '#151515',
      shadow: '0 6px 16px rgba(0,0,0,0.35), inset 0 0 24px rgba(0,0,0,0.25)',
      border: '#AC8E66',
      text: '#1a1a1a',
    },
  };

  const colors = themeStyles[editorSettings.theme];
  const activeTabMeta = tabs.find((tab) => tab.id === activeTabId);
  const fullPathLabel = activeTabMeta?.kind === 'file' && activeTabMeta.filePath
    ? activeTabMeta.filePath
    : projectPath
      ? `${projectPath}/${activeTabMeta?.title ?? 'Dokument'}`
      : activeTabMeta?.title ?? 'Dokument';
  const compactPathLabel = (() => {
    if (!fullPathLabel.includes('/')) return fullPathLabel;
    const segments = fullPathLabel.split('/').filter(Boolean);
    if (segments.length <= 5) return fullPathLabel;
    const root = fullPathLabel.startsWith('/') ? '/' : '';
    const head = segments.slice(0, 4).join('/');
    const fileName = segments[segments.length - 1];
    return `${root}${head}/.../${fileName}`;
  })();
  const [showOutline, setShowOutline] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showTemplateAiPanel, setShowTemplateAiPanel] = useState(false);
  const [showAiOptions, setShowAiOptions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewTranslating, setIsPreviewTranslating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [outlineFocusRequest, setOutlineFocusRequest] = useState<{ line: number; token: number } | null>(null);
  const [activeCursorLine, setActiveCursorLine] = useState(0);
  const requiredAiFields: Array<keyof DocInputFields> = [
    'productName',
    'productSummary',
    'setupSteps',
    'usageExamples',
  ];
  const filledAiFields = requiredAiFields.filter((key) => inputFields[key].trim().length > 0).length;
  const canRunAiGeneration = filledAiFields >= requiredAiFields.length;
  const canToggleAiOptions = canRunAiGeneration && !isGenerating;
  const isInitialGeneration = !dirtyMap[activeTabId];
  const canUseComparison = (comparisonBaseOptions?.length ?? 0) > 0;
  const templateTabTop = showTemplateAiPanel ? 235 : 197;
  const compareTabTop = templateTabTop + 102 + (showComparison ? 0 : 8);
  const comparisonRows = useMemo<LineDiffRow[]>(() => {
    if (comparisonBaseContent === undefined) return [];
    const leftLines = comparisonBaseContent.split('\n');
    const rightLines = activeContent.split('\n');
    const n = leftLines.length;
    const m = rightLines.length;
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

    for (let i = n - 1; i >= 0; i -= 1) {
      for (let j = m - 1; j >= 0; j -= 1) {
        dp[i][j] = leftLines[i] === rightLines[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }

    const rows: LineDiffRow[] = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (leftLines[i] === rightLines[j]) {
        rows.push({ left: leftLines[i], right: rightLines[j], status: 'same' });
        i += 1;
        j += 1;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        rows.push({ left: leftLines[i], right: '', status: 'removed' });
        i += 1;
      } else {
        rows.push({ left: '', right: rightLines[j], status: 'added' });
        j += 1;
      }
    }
    while (i < n) {
      rows.push({ left: leftLines[i], right: '', status: 'removed' });
      i += 1;
    }
    while (j < m) {
      rows.push({ left: '', right: rightLines[j], status: 'added' });
      j += 1;
    }
    const mergedRows: LineDiffRow[] = [];
    let idx = 0;
    while (idx < rows.length) {
      const current = rows[idx];
      const next = rows[idx + 1];
      if (
        current?.status === 'removed' &&
        next?.status === 'added' &&
        current.left.trim().length > 0 &&
        next.right.trim().length > 0 &&
        lineSimilarity(current.left, next.right) >= 0.7
      ) {
        mergedRows.push({ left: current.left, right: next.right, status: 'modified' });
        idx += 2;
        continue;
      }
      mergedRows.push(current);
      idx += 1;
    }

    return mergedRows;
  }, [comparisonBaseContent, activeContent]);
  const translatorTargetLabel = (() => {
    const labels: Partial<Record<TargetLanguage, string>> = {
      deutsch: 'Deutsch',
      english: 'English',
      español: 'Español',
      français: 'Français',
      italiano: 'Italiano',
      português: 'Português',
      russisch: 'Russisch',
      中文: '中文',
      日本語: '日本語',
      한국어: '한국어',
    };
    return labels[targetLanguage] ?? targetLanguage;
  })();

  useEffect(() => {
    if (!showPreview) setIsPreviewTranslating(false);
  }, [showPreview]);

  useEffect(() => {
    if (showPreview && showOutline) {
      setShowOutline(false);
    }
  }, [showPreview, showOutline]);

  useEffect(() => {
    if (!canToggleAiOptions && showAiOptions) {
      setShowAiOptions(false);
    }
  }, [canToggleAiOptions, showAiOptions]);

  useEffect(() => {
    if (isGenerating || generateError) {
      setShowOutline(false);
      setShowComparison(false);
      setShowTemplateAiPanel(true);
    }
  }, [isGenerating, generateError]);

  useEffect(() => {
    if (!canUseComparison && showComparison) {
      setShowComparison(false);
    }
  }, [canUseComparison, showComparison]);

  const outlineItems = useMemo(() => {
    const lines = activeContent.split('\n');
    const items: Array<{ level: number; text: string; line: number }> = [];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        items.push({ level: match[1].length, text: match[2].trim(), line: index });
      }
    }
    return items;
  }, [activeContent]);

  const activeOutlineLine =
    outlineItems
      .filter((item) => item.line <= activeCursorLine)
      .map((item) => item.line)
      .pop() ?? outlineItems[0]?.line ?? -1;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowOutline(false);
      }
      if (!showPreview && event.shiftKey && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        toggleOutlinePanel();
        return;
      }
      const isCloseTabShortcut =
        (event.metaKey || event.ctrlKey) &&
        (event.key.toLowerCase() === 'w' || event.code === 'KeyW');
      if (isCloseTabShortcut) {
        event.preventDefault();
        event.stopPropagation();
        if (activeTabId) onCloseTab(activeTabId);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [activeTabId, onCloseTab, showPreview, canUseComparison]);

  const insertHeading = (level: number) => {
    const prefix = `${'#'.repeat(level)} `;
    const trimmed = activeContent.replace(/\s*$/, '');
    const next = trimmed ? `${trimmed}\n\n${prefix}` : `${prefix}`;
    onContentChange(activeTabId, next);
  };

  const runGenerateFromFields = async () => {
    setGenerateError(null);
    setIsGenerating(true);
    try {
      const prompt = buildDocGenerationPrompt({
        template: activeTemplate,
        projectInfo,
        inputFields,
        tone,
        length,
        audience,
        targetLanguage,
        existingTemplateContent: activeContent,
        metadata,
      });
      let next = await generateDocService(prompt);
      if (metadata && !next.trimStart().startsWith('---')) {
        const TEMPLATE_TITLES: Record<string, string> = {
          'readme': 'README',
          'changelog': 'CHANGELOG',
          'api-docs': 'API Dokumentation',
          'contributing': 'Contributing Guide',
          'data-room': 'Data Room',
          'bug': 'Bug Report',
          'draft': 'Entwurf',
        };
        const templateLabel = TEMPLATE_TITLES[activeTemplate ?? ''] ?? activeTemplate ?? 'Dokument';
        const title = projectInfo?.name ? `${templateLabel} – ${projectInfo.name}` : templateLabel;
        next = buildYamlFrontmatter(title, metadata) + next;
      }
      onContentChange(activeTabId, next);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generierung fehlgeschlagen';
      setGenerateError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const themeSwitcher = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 8px',
        backgroundColor: '#0A0A0A',
        border: '1px solid #AC8E66',
        borderRadius: '6px',
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '10px',
        color: '#e5e5e5',
        boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
        whiteSpace: 'nowrap',
      }}
    >
      <button
        onClick={() => updateEditorTheme('dark')}
        style={{
          padding: '4px 10px',
          borderRadius: '4px',
          border: editorSettings.theme === 'dark' ? '1px solid #AC8E66' : '1px solid #3A3A3A',
          backgroundColor: editorSettings.theme === 'dark' ? '#1a1a1a' : 'transparent',
          color: '#e5e5e5',
          cursor: 'pointer',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '9px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <FontAwesomeIcon
          icon={faMoon}
          style={{ color: editorSettings.theme === 'dark' ? '#AC8E66' : '#777' }}
        />
        Dark
      </button>
      <button
        onClick={() => updateEditorTheme('light')}
        style={{
          padding: '3px 10px',
          borderRadius: '4px',
          border: editorSettings.theme === 'light' ? '1px solid #AC8E66' : '1px solid #3A3A3A',
          backgroundColor: editorSettings.theme === 'light' ? '#D9D4C5' : 'transparent',
          color: editorSettings.theme === 'light' ? '#1a1a1a' : '#e5e5e5',
          cursor: 'pointer',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '9px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <FontAwesomeIcon
          icon={faSun}
          style={{ color: editorSettings.theme === 'light' ? '#AC8E66' : '#aaa' }}
        />
        Light
      </button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col items-center bg-[#121212] px-[24px]">
      <div
        className={showPreview ? 'w-[92%] max-w-[1400px]' : 'w-[75%] max-w-[1024px]'}
        style={{
          transform: showOutline ? 'translateX(120px)' : 'translateX(0)',
          transition: 'transform 260ms ease, width 260ms ease, max-width 260ms ease',
        }}
      >
        {/* Document Title Header */}
        <div
          className="mb-[10px] ml-[10px]"
          style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}
        >
          <ZenThoughtLine
            thoughts={zenThoughts}
            visible={showZenThoughtInHeader}
            containerStyle={{
              position: 'absolute',
              top: '10px',
              left: 0,
              marginTop: 0,
              paddingLeft: 0,
            }}
          />
          <p
            className="font-mono fontWeight-[200] text-[10px] text-[#888]"
            title={fullPathLabel}
            style={{
              margin: 0,
              marginTop: '30px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flex: 1,
            }}
          >
            <FontAwesomeIcon
              icon={faFolderOpen}
              style={{ color: '#AC8E66', fontSize: '10px', flexShrink: 0, cursor: projectPath ? 'pointer' : 'default', transition: 'all 0.2s' }}
              onClick={() => projectPath && revealItemInDir(projectPath)}
              onMouseEnter={(e) => { if (projectPath) e.currentTarget.style.transform = 'scale(1.5)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            />
            {compactPathLabel}
          </p>
          {autosaveStatusText ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '25px', marginRight: '15px' }}>
              <button
                onClick={onOpenEditorSettings}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                style={{
                  border: '1px solid #3A3A3A',
                  borderRadius: '999px',
                  background: 'transparent',
                  color: '#AC8E66',
                  width: '18px',
                  height: '18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'transform 0.2s ease',
                }}
                title="Editor-Einstellungen öffnen"
              >
                <FontAwesomeIcon icon={faGear} style={{ fontSize: '9px' }} />
              </button>
              <span className="font-mono text-[10px] text-[#AC8E66]" style={{ whiteSpace: 'nowrap' }}>
                {autosaveStatusText}
              </span>
            </div>
          ) : null}
        </div>

        {showTemplateAiPanel ? (
          <div
            style={{
              border: '1px solid rgba(172, 142, 102, 0.35)',
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '12px',
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div className="font-mono text-[10px] text-[#c8b08b]">
              {hasRelevantScanData
                ? 'Template-Modus: Scan-Daten vorhanden. Du kannst mit KI aus Datenfeldern nachschärfen.'
                : 'Template-Modus: Wenig Scan-Daten gefunden. KI kann aus deinen Datenfeldern ein vollständiges Dokument erzeugen.'}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => void runGenerateFromFields()}
                disabled={isGenerating || !canRunAiGeneration}
                style={{
                  padding: '8px 12px',
                  border: isGenerating || !canRunAiGeneration ? '1px solid #3A3A3A' : '1px solid #AC8E66',
                  borderRadius: '8px',
                  background: isGenerating || !canRunAiGeneration ? '#1f1f1f' : 'transparent',
                  color: isGenerating || !canRunAiGeneration ? '#8b8b8b' : '#e5e5e5',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '10px',
                  cursor: isGenerating || !canRunAiGeneration ? 'not-allowed' : 'pointer',
                }}
                title={
                  canRunAiGeneration
                    ? undefined
                    : `Bitte Datenfelder ausfüllen (${filledAiFields}/${requiredAiFields.length}).`
                }
              >
                {isGenerating ? 'Generiere...' : isInitialGeneration ? 'KI Erstgenerierung' : 'KI Neu generieren'}
              </button>
              <button
                onClick={() => setShowAiOptions((prev) => !prev)}
                disabled={!canToggleAiOptions}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #3A3A3A',
                  borderRadius: '8px',
                  background: canToggleAiOptions ? 'transparent' : '#1f1f1f',
                  color: canToggleAiOptions ? '#bbb' : '#747474',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '10px',
                  cursor: canToggleAiOptions ? 'pointer' : 'not-allowed',
                }}
                title={
                  canToggleAiOptions
                    ? undefined
                    : `Erst Datenfelder ausfüllen (${filledAiFields}/${requiredAiFields.length}), dann KI-Optionen.`
                }
              >
                {showAiOptions ? 'KI-Optionen ausblenden' : 'KI-Optionen anzeigen'}
              </button>
            </div>
            {isPreviewTranslating ? (
              <div
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  alignSelf: 'stretch',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  border: '1px solid #3A3328',
                  borderRadius: '8px',
                  background: '#AC8E66',
                }}
              >
                <FontAwesomeIcon icon={faSpinner} style={{ color: '#151515', fontSize: '12px' }} spin />
                <span className="font-mono text-[10px] text-[#151515] tracking-[0.3px]">
                  AI verarbeitet Translator-Übersetzung nach {translatorTargetLabel}...
                </span>
              </div>
            ) : null}
            {showAiOptions && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                <ZenDropdown
                  label="Ton"
                  value={tone}
                  onChange={(value) => onToneChange(value as 'professional' | 'casual' | 'technical' | 'enthusiastic')}
                  options={[
                    { value: 'professional', label: 'Professional' },
                    { value: 'casual', label: 'Casual' },
                    { value: 'technical', label: 'Technical' },
                    { value: 'enthusiastic', label: 'Enthusiastic' },
                  ]}
                  fullWidth
                  variant="compact"
                  labelSize="9px"
                />
                <ZenDropdown
                  label="Länge"
                  value={length}
                  onChange={(value) => onLengthChange(value as 'short' | 'medium' | 'long')}
                  options={[
                    { value: 'short', label: 'Kurz' },
                    { value: 'medium', label: 'Mittel' },
                    { value: 'long', label: 'Lang' },
                  ]}
                  fullWidth
                  variant="compact"
                  labelSize="9px"
                />
                <ZenDropdown
                  label="Zielgruppe"
                  value={audience}
                  onChange={(value) => onAudienceChange(value as 'beginner' | 'intermediate' | 'expert')}
                  options={[
                    { value: 'beginner', label: 'Anfänger' },
                    { value: 'intermediate', label: 'Intermediate' },
                    { value: 'expert', label: 'Experten' },
                  ]}
                  fullWidth
                  variant="compact"
                  labelSize="9px"
                />
                <ZenDropdown
                  label="Sprache"
                  value={targetLanguage}
                  onChange={(value) => onLanguageChange(value as TargetLanguage)}
                  options={[
                    { value: 'deutsch', label: 'Deutsch' },
                    { value: 'english', label: 'English' },
                    { value: 'español', label: 'Español' },
                    { value: 'français', label: 'Français' },
                    { value: 'italiano', label: 'Italiano' },
                    { value: 'português', label: 'Português' },
                    { value: '中文', label: '中文' },
                    { value: '日本語', label: '日本語' },
                    { value: '한국어', label: '한국어' },
                  ]}
                  fullWidth
                  variant="compact"
                  labelSize="9px"
                />
              </div>
            )}
            {!canRunAiGeneration ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <div className="font-mono text-[10px] text-[#c7a46d]">
                  Für KI-Generierung fehlen wichtige Datenfelder ({filledAiFields}/{requiredAiFields.length}): Produktname, Kurzbeschreibung, Setup, Usage.
                </div>
                {onOpenRequiredFields ? (
                  <button
                    onClick={onOpenRequiredFields}
                    style={{
                      padding: '10px 10px',
                      border: '1px solid #AC8E66',
                      borderRadius: '8px',
                      background: 'rgba(172, 142, 102, 0.08)',
                      color: '#e5e5e5',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    Datenfelder ausfüllen
                  </button>
                ) : null}
              </div>
            ) : null}
            {generateError ? <div className="font-mono text-[10px] text-[#ff7b7b]">{generateError}</div> : null}
          </div>
        ) : null}

        {/* Template Hint Banner */}
        {templateHint && onDismissHint && (
          <TemplateHintBanner
            message={templateHint.message}
            detectedType={templateHint.detectedType}
            onDismiss={onDismissHint}
          />
        )}

        <div>
          {/* Tab Bar - always show when tabs exist */}
          {tabs.length > 0 && (
            <div className="w-full" style={{ marginBottom: '-19px' }}>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '4px',
                  backgroundColor: 'transparent',
                  borderRadius: '12px 12px 0 0',
                  borderBottom: 'none',
                  flexWrap: 'wrap',
                }}
              >

             
                {tabs.map((tab) => {
                  const isActive = tab.id === activeTabId;
                  const isDirty = !!dirtyMap[tab.id];
                  return (
                 
                    <button
                      key={tab.id}
                      onClick={() => onTabChange(tab.id)}
                      style={{
                        marginBottom: '12px',
                        flex: '1 1 140px',
                        padding: '10px 16px',
                        backgroundColor: 'transparent',
                        border: isActive ? '1px solid #AC8E66' : '1px dotted #3A3A3A',
                        borderRadius: '8px 8px 0px 0px',
                        borderBottom: 'none',
                        cursor: 'pointer',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: isActive ? '9px' : '10px',
                        fontWeight: isActive ? '200' : '400',
                        color: isActive ? '#e5e5e5' : '#999',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      {isDirty ? <span style={{ color: isActive ? '#e5e5e5' : '#AC8E66' }}>•</span> : null}
                      <span>{tab.title}</span>
                      <span
                        onClick={(event) => {
                          event.stopPropagation();
                          onCloseTab(tab.id);
                        }}
                        style={{
                          marginLeft: '6px',
                          fontSize: '12px',
                          color: isActive ? '#e5e5e5' : '#777',
                          opacity: 0.8,
                        }}
                      >
                        ×
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Editor */}
          <div className="mb-[16px] w-full" style={{ position: 'relative', isolation: 'isolate' }}>
            {showComparison && comparisonBaseContent !== undefined ? (
              <div
                style={{
                  marginBottom: '12px',
                  padding: '10px',
                  border: '0.5px solid #3a3a3a',
                  borderRadius: '10px',
                  backgroundColor: '#101010',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <div className="font-mono text-[10px] text-[#AC8E66]">
                    Vorher: {comparisonBaseLabel || 'Basis'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {(comparisonBaseOptions?.length ?? 0) > 1 ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: '1px solid #3A3A3A',
                          borderRadius: '8px',
                          padding: '3px 8px',
                        }}
                      >
                        <span className="font-mono text-[9px] text-[#999]">Basis</span>
                        <ZenDropdown
                          value={comparisonBaseSelection ?? comparisonBaseOptions?.[0]?.id ?? ''}
                          onChange={(value) => onComparisonBaseChange?.(value)}
                          options={(comparisonBaseOptions ?? []).map((option) => ({
                            value: option.id,
                            label: option.label,
                          }))}
                          variant="compact"
                          className="w-[220px]"
                        />
                      </div>
                    ) : null}
                    <div className="font-mono text-[10px] text-[#777]">
                      Zeichen Δ {activeContent.length - comparisonBaseContent.length}
                    </div>
                    {onAdoptCurrentAsComparisonBase ? (
                      <button
                        onClick={onAdoptCurrentAsComparisonBase}
                        className="font-mono text-[9px] px-2 py-1 rounded border border-[#AC8E66] text-[#AC8E66] hover:bg-[#AC8E66]/10 transition-colors"
                        title="Aktuelle Version als neue Vergleichs-Basis übernehmen"
                      >
                        Änderungen übernehmen
                      </button>
                    ) : null}
                  </div>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    maxHeight: '260px',
                    overflow: 'auto',
                  }}
                >
                  <div style={{ border: '0.5px solid #3a3a3a', borderRadius: '8px', overflow: 'hidden' }}>
                    {comparisonRows.map((row, index) => (
                      <div
                        key={`left-${index}`}
                        style={{
                          padding: '3px 8px',
                          minHeight: '18px',
                          borderBottom: '0.5px solid #202020',
                          backgroundColor:
                            row.status === 'removed'
                              ? 'rgba(239,68,68,0.12)'
                              : row.status === 'modified'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : '#171717',
                          color:
                            row.status === 'removed'
                              ? '#fca5a5'
                              : row.status === 'modified'
                                ? '#fcd34d'
                                : '#888',
                        }}
                        className="font-mono text-[10px] whitespace-pre-wrap break-words"
                      >
                        {row.left || ' '}
                      </div>
                    ))}
                  </div>
                  <div style={{ border: '0.5px solid #AC8E66', borderRadius: '8px', overflow: 'hidden' }}>
                    {comparisonRows.map((row, index) => (
                      <div
                        key={`right-${index}`}
                        style={{
                          padding: '3px 8px',
                          minHeight: '18px',
                          borderBottom: '0.5px solid #202020',
                          backgroundColor:
                            row.status === 'added'
                              ? 'rgba(34,197,94,0.12)'
                              : row.status === 'modified'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : '#171717',
                          color:
                            row.status === 'added'
                              ? '#86efac'
                              : row.status === 'modified'
                                ? '#fcd34d'
                                : '#d9d4c5',
                        }}
                        className="font-mono text-[10px] whitespace-pre-wrap break-words"
                      >
                        {row.right || ' '}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
            {!showPreview && (
              <button
                onClick={toggleTemplateAiPanel}
                className="lg:flex"
                style={{
                  position: 'absolute',
                  left: '-32px',
                  top: `${templateTabTop}px`,
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'left top',
                  padding: '10px 10px',
                  backgroundColor: showTemplateAiPanel ? '#d0cbb8' : '#121212',
                  border: '1px solid #AC8E66',
                  borderRadius: '8px 8px 0px 0px',
                  cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '10px',
                  color: showTemplateAiPanel ? '#1a1a1a' : '#D9D4C5',
                  letterSpacing: '0.03em',
                  zIndex: 1,
                }}
                title={showTemplateAiPanel ? 'Template-AI ausblenden' : 'Template-AI anzeigen'}
              >
                {showTemplateAiPanel ? `Template-AI (${filledAiFields}/${requiredAiFields.length})` : 'Template-AI'}
              </button>
            )}
            {!showPreview && (
              <button
                onClick={toggleComparisonPanel}
                disabled={!canUseComparison}
                className="lg:flex"
                style={{
                  position: 'absolute',
                  left: '-32px',
                  top: `${compareTabTop}px`,
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'left top',
                  padding: '10px 10px',
                  backgroundColor: !canUseComparison ? '#0f0f0f' : showComparison ? '#d0cbb8' : '#121212',
                  border: !canUseComparison ? '1px solid #3A3A3A' : '1px solid #AC8E66',
                  borderRadius: '8px 8px 0px 0px',
                  cursor: !canUseComparison ? 'not-allowed' : 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '10px',
                  color: !canUseComparison ? '#5c5c5c' : showComparison ? '#1a1a1a' : '#D9D4C5',
                  letterSpacing: '0.03em',
                  zIndex: 1,
                }}
                title={!canUseComparison ? 'Keine Vergleichsbasis verfügbar.' : `Vergleich ${showComparison ? 'ausblenden' : 'anzeigen'}`}
              >
                Vergleich {showComparison ? 'an' : 'aus'}
              </button>
            )}
            {!showPreview && (
              <ZenOutlinePanel
                isOpen={showOutline}
                items={outlineItems}
                activeLine={activeOutlineLine}
                onToggle={toggleOutlinePanel}
                onInsertHeading={insertHeading}
                onSelectLine={(line) => {
                  setActiveCursorLine(line);
                  setOutlineFocusRequest({ line, token: Date.now() });
                }}
              />
            )}

            <div
              className="relative z-[40] p-[10px]"
              style={{
                borderRadius: tabs.length > 0 ? '8px 8px 12px 12px' : '12px',
                border: `0.5px solid ${colors.border}`,
                background: colors.panelBg,
                boxShadow: colors.shadow,
                borderTop: tabs.length > 0 ? '1px solid #AC8E66' : `1px solid ${colors.border}`,
                backgroundColor: colors.panelBg,
              
              }}
            >
              {showPreview ? (
                <ZenMarkdownPreview
                  content={activeContent}
                  height="580px"
                  onContentChange={(value) => onContentChange(activeTabId, value)}
                  collapseControlsByDefault
                  translationStatusStyle="ai"
                  previewToolbarMode="sticky"
                  showInternalTranslationStatus={false}
                  onTranslationStateChange={setIsPreviewTranslating}
                  marginTop={editorSettings.marginTop}
                  marginBottom={editorSettings.marginBottom}
                  marginLeft={editorSettings.marginLeft}
                  marginRight={editorSettings.marginRight}
                />
              ) : (
                <ZenMarkdownEditor
                  value={activeContent}
                  onChange={(value) => onContentChange(activeTabId, value)}
                  placeholder="Deine Dokumentation..."
                  showPreview={false}
                  showLineNumbers={true}
                  showHeader={true}
                  theme={editorSettings.theme}
                  focusLineRequest={outlineFocusRequest}
                  onActiveLineChange={setActiveCursorLine}
                />
              )}
            </div>

            {/* Docked Label + Theme Toggle */}
            {!showPreview && (
              <div
                style={{
                  position: 'absolute',
                  left: '100%',
                  top: '0px',
                  transform: 'translatex(10%) rotate(90deg)',
                  transformOrigin: 'left center',
                  zIndex: 1,
                }}
              >
                {themeSwitcher}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
