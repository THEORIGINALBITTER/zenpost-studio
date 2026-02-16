import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBook,
  faFileLines,
  faHandshake,
  faDatabase,
  faRotateLeft,
  faX,
  faCheck,
  faEdit,
  faBug,
  faLayerGroup,
  faFile,
} from '@fortawesome/free-solid-svg-icons';
import { ZenRoughButton } from '../../../kits/PatternKit/ZenModalSystem';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { DocInputFields, DocTemplate, ProjectInfo } from '../types';

const templates: Array<{
  id: DocTemplate;
  title: string;
  description: string;
  icon: IconDefinition;
}> = [
  { id: 'readme', title: 'README', description: 'Projektübersicht & Setup', icon: faBook },
  { id: 'changelog', title: 'Changelog', description: 'Versionsverlauf', icon: faRotateLeft },
  { id: 'api-docs', title: 'API Docs', description: 'API Schnittstellen', icon: faFileLines },
  { id: 'contributing', title: 'Contributing', description: 'Contrib Guidelines', icon: faHandshake },
  { id: 'data-room', title: 'Data Room', description: 'Investor Suite', icon: faDatabase },
  { id: 'bug', title: 'Bug Report', description: 'Bug-Report Vorlage', icon: faBug },
];

type StepPanel = 'fields' | 'templates';

export function StepChooseTemplates({
  projectInfo,
  selected,
  onChange,
  inputFields,
  onInputFieldsChange,
  onGenerate,
  scrollToTemplates = false,
  showReturnToEditor = false,
  onReturnToEditor,
  returnToEditorLabel,
}: {
  projectInfo: ProjectInfo | null;
  selected: DocTemplate[];
  onChange: (templates: DocTemplate[]) => void;
  inputFields: DocInputFields;
  onInputFieldsChange: (fields: DocInputFields) => void;
  onGenerate: (template: DocTemplate) => void;
  scrollToTemplates?: boolean;
  showReturnToEditor?: boolean;
  onReturnToEditor?: () => void;
  returnToEditorLabel?: string;
}) {
  const templateSectionRef = useRef<HTMLDivElement>(null);
  const [activePanel, setActivePanel] = useState<StepPanel>('fields');

  useEffect(() => {
    if (!scrollToTemplates) return;
    setActivePanel('templates');
  }, [scrollToTemplates]);

  useEffect(() => {
    if (!scrollToTemplates || activePanel !== 'templates') return;
    templateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [scrollToTemplates, activePanel]);

  const relevanceScore = useMemo(() => {
    if (!projectInfo) return 0;
    let score = 0;
    if (projectInfo.description?.trim()) score += 1;
    if (projectInfo.dependencies.length >= 3) score += 1;
    if (projectInfo.fileTypes.length >= 3) score += 1;
    if (projectInfo.hasApi) score += 1;
    if (projectInfo.hasTests) score += 1;
    return score;
  }, [projectInfo]);

  const hasRelevantData = relevanceScore >= 2;

  const requiredFields: Array<keyof DocInputFields> = [
    'productName',
    'productSummary',
    'setupSteps',
    'usageExamples',
  ];

  const filledRequired = requiredFields.filter((key) => inputFields[key].trim().length > 0).length;
  const isFieldSetReady = filledRequired === requiredFields.length;
  const enrichedFieldCount = Object.values(inputFields).filter((value) => value.trim().length > 0).length;

  const headerSummary = useMemo(() => {
    const mergedName = inputFields.productName.trim() || projectInfo?.name || '-';
    const mergedDescription = inputFields.productSummary.trim() || projectInfo?.description || 'No description available';
    const mergedUseCase = inputFields.problemSolved.trim() || '-';
    const mergedVersion = projectInfo?.version || '-';
    const mergedFileTypes = projectInfo?.fileTypes.slice(0, 10).join(', ') || '-';
    return {
      mergedName,
      mergedDescription,
      mergedUseCase,
      mergedVersion,
      mergedFileTypes,
    };
  }, [
    inputFields.problemSolved,
    inputFields.productName,
    inputFields.productSummary,
    projectInfo?.description,
    projectInfo?.fileTypes,
    projectInfo?.name,
    projectInfo?.version,
  ]);

  const getSourceLabel = (mode: 'scan' | 'manual' | 'mixed' | 'empty') => {
    if (mode === 'manual') return { text: 'Manuell', color: '#d4af78', border: '#AC8E66' };
    if (mode === 'scan') return { text: 'Scan', color: '#7fb1ff', border: '#4f78b8' };
    if (mode === 'mixed') return { text: 'Gemischt', color: '#8bdba7', border: '#3f8c5d' };
    return { text: 'Leer', color: '#9a9a9a', border: '#4a4a4a' };
  };

  const sourceMode = {
    name: inputFields.productName.trim() ? 'manual' : projectInfo?.name ? 'scan' : 'empty',
    description: inputFields.productSummary.trim() ? 'manual' : projectInfo?.description ? 'scan' : 'empty',
    useCase: inputFields.problemSolved.trim() ? 'manual' : 'empty',
    version: projectInfo?.version ? 'scan' : 'empty',
    fileTypes: projectInfo?.fileTypes?.length ? 'scan' : 'empty',
    features:
      inputFields.testingNotes.trim() || inputFields.apiEndpoints.trim()
        ? projectInfo
          ? 'mixed'
          : 'manual'
        : projectInfo
          ? 'scan'
          : 'empty',
  } as const;

  const toggleTemplate = (id: DocTemplate, _event?: MouseEvent) => {
    const isSelected = selected.includes(id);
    onChange(isSelected ? selected.filter((item) => item !== id) : [...selected, id]);
  };

  const toggleAll = () => {
    if (selected.length === templates.length) {
      onChange([]);
      return;
    }
    onChange(templates.map((template) => template.id));
  };

  const generateSelection = () => {
    if (!selected.length) return;
    onGenerate(selected[0]);
  };

  const setField = (key: keyof DocInputFields, value: string) => {
    onInputFieldsChange({
      ...inputFields,
      [key]: value,
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '24px',
        maxWidth: '1152px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          backgroundColor: 'transparent',
          borderRadius: '8px',
          border: '0.5px solid #AC8E66',
          padding: '16px',
        }}
      >
        <h3 style={{ fontWeight: 'normal', margin: 0, marginBottom: '12px', fontFamily: 'monospace', fontSize: '16px', color: '#AC8E66' }}>
          Projekt-Daten
        </h3>
        <div style={{ fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.8', color: '#e5e5e5' }}>
          <div style={{ display: 'flex', gap: '24px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ color: '#777' }}>Name:</span>{' '}
              <span>{headerSummary.mergedName}</span>
              <span
                style={{
                  marginLeft: '8px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  border: `1px solid ${getSourceLabel(sourceMode.name).border}`,
                  color: getSourceLabel(sourceMode.name).color,
                  fontSize: '9px',
                }}
              >
                {getSourceLabel(sourceMode.name).text}
              </span>
            </div>
            <div>
              <span style={{ color: '#777' }}>Version:</span>{' '}
              <span>{headerSummary.mergedVersion}</span>
              <span
                style={{
                  marginLeft: '8px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  border: `1px solid ${getSourceLabel(sourceMode.version).border}`,
                  color: getSourceLabel(sourceMode.version).color,
                  fontSize: '9px',
                }}
              >
                {getSourceLabel(sourceMode.version).text}
              </span>
            </div>
            <div>
              <span style={{ color: '#777' }}>Felder ergänzt:</span>{' '}
              <span>{enrichedFieldCount}</span>
            </div>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: '#777' }}>Beschreibung:</span>{' '}
            <span>{headerSummary.mergedDescription}</span>
            <span
              style={{
                marginLeft: '8px',
                padding: '1px 6px',
                borderRadius: '10px',
                border: `1px solid ${getSourceLabel(sourceMode.description).border}`,
                color: getSourceLabel(sourceMode.description).color,
                fontSize: '9px',
              }}
            >
              {getSourceLabel(sourceMode.description).text}
            </span>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: '#777' }}>Use Case:</span>{' '}
            <span>{headerSummary.mergedUseCase}</span>
            <span
              style={{
                marginLeft: '8px',
                padding: '1px 6px',
                borderRadius: '10px',
                border: `1px solid ${getSourceLabel(sourceMode.useCase).border}`,
                color: getSourceLabel(sourceMode.useCase).color,
                fontSize: '9px',
              }}
            >
              {getSourceLabel(sourceMode.useCase).text}
            </span>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: '#777' }}>Dateitypen:</span>{' '}
            <span>{headerSummary.mergedFileTypes}</span>
            <span
              style={{
                marginLeft: '8px',
                padding: '1px 6px',
                borderRadius: '10px',
                border: `1px solid ${getSourceLabel(sourceMode.fileTypes).border}`,
                color: getSourceLabel(sourceMode.fileTypes).color,
                fontSize: '9px',
              }}
            >
              {getSourceLabel(sourceMode.fileTypes).text}
            </span>
          </div>
          <div>
            <span style={{ color: '#777' }}>Features:</span>{' '}
            <span className="inline-flex items-center gap-2 text-[12px]">
              {projectInfo?.hasTests ? (
                <>
                  <FontAwesomeIcon icon={faCheck} style={{ fontSize: '10px', marginTop: '-2px', color: '#4ade80' }} />
                  <span>Tests</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faX} style={{ fontSize: '9px', marginTop: '-2px', color: '#AC8E66' }} />
                  <span>Keine Tests</span>
                </>
              )}
              <span className="mx-1">•</span>
              {projectInfo?.hasApi ? (
                <>
                  <FontAwesomeIcon icon={faCheck} style={{ fontSize: '9px', marginTop: '-2px', color: '#AC8E66' }} />
                  <span>API</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faX} style={{ fontSize: '9px', marginTop: '-2px', color: '#AC8E66' }} />
                  <span>Keine API</span>
                </>
              )}
            </span>
            <span
              style={{
                marginLeft: '8px',
                padding: '1px 6px',
                borderRadius: '10px',
                border: `1px solid ${getSourceLabel(sourceMode.features).border}`,
                color: getSourceLabel(sourceMode.features).color,
                fontSize: '9px',
              }}
            >
              {getSourceLabel(sourceMode.features).text}
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderBottom: '0.5px solid #3A3A3A',
          paddingBottom: '0px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActivePanel('fields')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px 8px 0 0',
              border: activePanel === 'fields' ? '1px solid #AC8E66' : '1px solid #3A3A3A',
              background: 'transparent',
              color: activePanel === 'fields' ? '#e5e5e5' : '#999',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FontAwesomeIcon icon={faLayerGroup} /> Datenfelder
          </button>
          <button
            onClick={() => setActivePanel('templates')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px 8px 0 0',
              border: activePanel === 'templates' ? '1px solid #AC8E66' : '1px solid #3A3A3A',
              background: 'transparent',
              color: activePanel === 'templates' ? '#e5e5e5' : '#999',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FontAwesomeIcon icon={faFile} /> Templates
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {showReturnToEditor && onReturnToEditor && (
            <button
              onClick={onReturnToEditor}
              style={{
                padding: '8px 12px',
                borderRadius: '8px 8px 0 0',
                border: '1px solid #AC8E66',
                background: 'transparent',
                color: '#e5e5e5',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FontAwesomeIcon icon={faEdit} /> {returnToEditorLabel ?? 'Zurück zum Dokument'}
            </button>
          )}
          {activePanel === 'templates' && (
            <button
              onClick={toggleAll}
              style={{
                padding: '8px 12px',
                borderRadius: '8px 8px 0 0',
                border: '1px solid #3A3A3A',
                background: 'transparent',
                color: '#999',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FontAwesomeIcon icon={faCheck} /> {selected.length === templates.length ? 'Alle abwählen' : 'Alle auswählen'}
            </button>
          )}
          {activePanel === 'templates' && (
            <button
              onClick={generateSelection}
              disabled={selected.length === 0}
              style={{
                padding: '8px 12px',
                borderRadius: '8px 8px 0 0',
                border: selected.length === 0 ? '1px solid #2c2c2c' : '1px solid #AC8E66',
                background: 'transparent',
                color: selected.length === 0 ? '#666' : '#e5e5e5',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
                cursor: selected.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {selected.length} {selected.length === 1 ? 'Template generieren' : 'Templates generieren'}
            </button>
          )}
          {activePanel === 'templates' && selected.length === 0 && (
            <button
              onClick={() => onGenerate('draft' as DocTemplate)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px 8px 0 0',
                border: '1px solid #3A3A3A',
                background: 'transparent',
                color: '#999',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FontAwesomeIcon icon={faEdit} /> Entwurf starten
            </button>
          )}
        </div>
      </div>

      {activePanel === 'fields' && (
        <div
          style={{
            backgroundColor: 'transparent',
            borderRadius: '8px',
            border: '0.5px solid #AC8E66',
            padding: '24px',
          }}
        >
          <h3 style={{ marginBottom: '8px', textAlign: 'center', fontFamily: 'monospace', fontSize: '16px', color: '#AC8E66' }}>
            Step01: <span className="text-[#dbd9d5]">Relevante Daten sammeln</span>
          </h3>
          <p className="font-mono text-[11px] text-[#999] text-center mb-[16px]">
            Datenfeldern: {filledRequired}/{requiredFields.length} ausgefüllt. Diese Felder nutzt Step 4 für KI-gestützte Dokumente.
          </p>

          {!hasRelevantData && (
            <div
              style={{
                marginBottom: '16px',
                borderRadius: '8px',
                border: '1px solid rgba(172, 142, 102, 0.5)',
                padding: '12px',
                background: 'rgba(172, 142, 102, 0.08)',
              }}
            >
              <p className="font-mono text-[11px] text-[#e5e5e5] mb-[6px]">
                Hard Scan hat nur wenige relevante Daten gefunden.
              </p>
              <p className="font-mono text-[10px] text-[#b9b9b9]">
                In Step 4 wird automatisch Template-Modus vorgeschlagen. Mit den Feldern hier kann Ollama dann gezielt helfen.
              </p>
            </div>
          )}

          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <label className="font-mono text-[10px] text-[#AC8E66]">
              Produkt-/Projektname *
              <input
                value={inputFields.productName}
                onChange={(event) => setField('productName', event.target.value)}
                className="mt-[6px] w-3/4 rounded-[8px] border border-[#3A3A3A] bg-[#151515] px-[10px] py-[8px] text-[11px] text-[#e5e5e5]"
              />
            </label>
            <label className="font-mono text-[10px] text-[#AC8E66]">
              Problem / Use Case
              <input
                value={inputFields.problemSolved}
                onChange={(event) => setField('problemSolved', event.target.value)}
                className="mt-[6px] w-full rounded-[8px] border border-[#3A3A3A] bg-[#151515] px-[10px] py-[8px] text-[11px] text-[#e5e5e5]"
              />
            </label>
          </div>

          <div style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
            <label className="font-mono text-[10px] text-[#AC8E66]">
              Kurzbeschreibung *
              <textarea
                value={inputFields.productSummary}
                onChange={(event) => setField('productSummary', event.target.value)}
                rows={3}
                className="mt-[6px] w-full rounded-[8px] border border-[#3A3A3A] bg-[#151515] px-[10px] py-[8px] text-[11px] text-[#e5e5e5]"
              />
            </label>
            <label className="font-mono text-[10px] text-[#AC8E66]">
              Setup / Installation *
              <textarea
                value={inputFields.setupSteps}
                onChange={(event) => setField('setupSteps', event.target.value)}
                rows={3}
                className="mt-[6px] w-full rounded-[8px] border border-[#3A3A3A] bg-[#151515] px-[10px] py-[8px] text-[11px] text-[#e5e5e5]"
              />
            </label>
            <label className="font-mono text-[10px] text-[#AC8E66]">
              Usage Beispiele *
              <textarea
                value={inputFields.usageExamples}
                onChange={(event) => setField('usageExamples', event.target.value)}
                rows={3}
                className="mt-[6px] w-full rounded-[8px] border border-[#3A3A3A] bg-[#151515] px-[10px] py-[8px] text-[11px] text-[#e5e5e5]"
              />
            </label>
            <label className="font-mono text-[10px] text-[#AC8E66]">
              API Endpoints / Integrationen
              <textarea
                value={inputFields.apiEndpoints}
                onChange={(event) => setField('apiEndpoints', event.target.value)}
                rows={2}
                className="mt-[6px] w-full rounded-[8px] border border-[#3A3A3A] bg-[#151515] px-[10px] py-[8px] text-[11px] text-[#e5e5e5]"
              />
            </label>
            <label className="font-mono text-[10px] text-[#AC8E66]">
              Testing / Qualität
              <textarea
                value={inputFields.testingNotes}
                onChange={(event) => setField('testingNotes', event.target.value)}
                rows={2}
                className="mt-[6px] w-full rounded-[8px] border border-[#3A3A3A] bg-[#151515] px-[10px] py-[8px] text-[11px] text-[#e5e5e5]"
              />
            </label>
            <label className="font-mono text-[10px] text-[#AC8E66]">
              FAQ / Hinweise
              <textarea
                value={inputFields.faq}
                onChange={(event) => setField('faq', event.target.value)}
                rows={2}
                className="mt-[6px] w-full rounded-[8px] border border-[#3A3A3A] bg-[#151515] px-[10px] py-[8px] text-[11px] text-[#e5e5e5]"
              />
            </label>
            <label className="font-mono text-[10px] text-[#AC8E66]">
              Links (Repo, Docs, Website)
              <textarea
                value={inputFields.links}
                onChange={(event) => setField('links', event.target.value)}
                rows={2}
                className="mt-[6px] w-full rounded-[8px] border border-[#3A3A3A] bg-[#151515] px-[10px] py-[8px] text-[11px] text-[#e5e5e5]"
              />
            </label>
          </div>

          <div className="mt-[16px] flex justify-end">
            <ZenRoughButton
              label={isFieldSetReady ? 'Weiter zu Templates' : 'Datenfeldern ergänzen'}
              icon="→"
              onClick={() => setActivePanel('templates')}
              variant="default"
            />
          </div>
        </div>
      )}

      {activePanel === 'templates' && (
        <div
          ref={templateSectionRef}
          style={{
            backgroundColor: 'transparent',
            borderRadius: '8px',
            border: '0.5px solid #AC8E66',
            padding: '24px',
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#AC8E66',
            fontWeight: 'normal',
          }}
        >
          <h3 style={{ marginBottom: '24px', textAlign: 'center', fontFamily: 'monospace', fontSize: '16px', color: '#AC8E66' }}>
            Step02: <span className="text-[#dbd9d5] font-mono">Dokumentationstyp wählen</span>
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center', marginTop: '24px' }}>
            {templates.map((template) => {
              const isSelected = selected.includes(template.id);
              return (
                <div
                  key={template.id}
                  style={{
                    position: 'relative',
                    padding: '24px',
                    borderRadius: '8px',
                    border: `1px solid ${isSelected ? '#AC8E66' : '#3a3a3a'}`,
                    backgroundColor: 'transparent',
                    flex: '1 1 200px',
                    minWidth: '200px',
                    maxWidth: '250px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                  }}
                  onClick={(event) => toggleTemplate(template.id, event)}
                >
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                    <FontAwesomeIcon
                      icon={template.icon}
                      style={{
                        fontSize: '36px',
                        color: isSelected ? '#AC8E66' : '#777',
                        opacity: isSelected ? 1 : 0.7,
                      }}
                    />
                  </div>
                  <h4 style={{ fontFamily: 'monospace', fontSize: '12px', marginBottom: '8px', color: isSelected ? '#e5e5e5' : '#999' }}>
                    {template.title}
                  </h4>
                  <p style={{ color: '#777', fontFamily: 'monospace', fontSize: '10px', lineHeight: '1.6' }}>
                    {template.description}
                  </p>
                  {isSelected && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: '#AC8E66', borderRadius: '50%' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
}
