import { useEffect, useRef, type MouseEvent } from 'react';

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
} from '@fortawesome/free-solid-svg-icons';
import { ZenRoughButton, ZenDropdown } from '../../../kits/PatternKit/ZenModalSystem';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { DocTemplate, ProjectInfo } from '../types';
import type { TargetLanguage } from '../../../services/aiService';

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

export function StepChooseTemplates({
  projectInfo,
  selected,
  onChange,
  tone,
  length,
  audience,
  targetLanguage,
  onToneChange,
  onLengthChange,
  onAudienceChange,
  onLanguageChange,
  onGenerate,
  scrollToTemplates = false,
}: {
  projectInfo: ProjectInfo | null;
  selected: DocTemplate[];
  onChange: (templates: DocTemplate[]) => void;
  tone: 'professional' | 'casual' | 'technical' | 'enthusiastic';
  length: 'short' | 'medium' | 'long';
  audience: 'beginner' | 'intermediate' | 'expert';
  targetLanguage: TargetLanguage;
  onToneChange: (value: any) => void;
  onLengthChange: (value: any) => void;
  onAudienceChange: (value: any) => void;
  onLanguageChange: (value: TargetLanguage) => void;
  onGenerate: (template: DocTemplate) => void;
  scrollToTemplates?: boolean;
}) {
  const templateSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollToTemplates && templateSectionRef.current) {
      templateSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [scrollToTemplates]);
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

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '50px',
        maxWidth: '1152px',
        margin: '0 auto',
      }}
    >
      {projectInfo && (
        <div
          style={{
         
            backgroundColor: 'transparent',
            borderRadius: '8px',
            border: '0.5px solid #AC8E66',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontWeight: 'normal', margin: 0, fontFamily: 'monospace', fontSize: '16px', color: '#AC8E66' }}>
              Projekt-Daten:
            </h3>
            
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.8', color: '#e5e5e5' }}>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '8px' }}>
              <div>
                <span style={{ color: '#777' }}>Name:</span>{' '}
                <span style={{ fontWeight: 'normal' }}>{projectInfo.name}</span>
              </div>
              <div>
                <span style={{ color: '#777' }}>Version:</span>{' '}
                <span style={{ fontWeight: 'normal' }}>{projectInfo.version}</span>
              </div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#777' }}>Beschreibung:</span>{' '}
              <span>{projectInfo.description}</span>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#777' }}>Dateitypen:</span>{' '}
              <span>{projectInfo.fileTypes.slice(0, 10).join(', ')}</span>
            </div>
            <div>
              <span style={{ color: '#777' }}>Features:</span>{' '}
      <span className="inline-flex items-center gap-2 text-[12px]">
  {projectInfo.hasTests ? (
    <>
      <FontAwesomeIcon
        icon={faCheck}
        style={{ fontSize: '10px', marginTop: '-2px', color: '#4ade80' }}
      />
      <span>Tests</span>
    </>
  ) : (
    <>
      <FontAwesomeIcon
        icon={faX}
        style={{ fontSize: '9px', marginTop: '-2px',  color: '#AC8E66'  }}
      />
      <span>Keine Tests</span>
    </>
  )}

  <span className="mx-1">•</span>

  {projectInfo.hasApi ? (
    <>
      <FontAwesomeIcon
        icon={faCheck}
        style={{ fontSize: '9px', marginTop: '-2px',  color: '#AC8E66'  }}
      />
      <span>API</span>
    </>
  ) : (
    <>
      <FontAwesomeIcon
        icon={faX}
        style={{ fontSize: '9px', marginTop: '-2px',  color: '#AC8E66'  }}
      />
      <span>Keine API</span>
    </>
  )}
</span>

            </div>
          </div>
        </div>
      )}

      <div
        style={{
          backgroundColor: 'transparent',
          borderRadius: '8px',
          border: '0.5px solid #AC8E66',
          padding: '24px',
        }}
      >
        <h3
          style={{
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#AC8E66',
            marginBottom: '16px',
            textAlign: 'center',
            fontWeight: 'normal'
          }}
        >
          Step01: <span className="text-[#dbd9d5]">Stil-Optionen deiner KI Transformation</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <ZenDropdown
            label="Tonalität:"
            value={tone}
            onChange={(value) => onToneChange(value as any)}
            options={[
              { value: 'professional', label: 'Professional' },
              { value: 'casual', label: 'Casual' },
              { value: 'technical', label: 'Technical' },
              { value: 'enthusiastic', label: 'Enthusiastic' },
            ]}
            fullWidth
            variant="compact"
            labelSize="11px"
          />
          <ZenDropdown
            label="Länge:"
            value={length}
            onChange={(value) => onLengthChange(value as any)}
            options={[
              { value: 'short', label: 'Kurz (1-2 Absätze)' },
              { value: 'medium', label: 'Mittel (3-5 Absätze)' },
              { value: 'long', label: 'Lang (Artikel)' },
            ]}
            fullWidth
            variant="compact"
            labelSize="11px"
          />
          <ZenDropdown
            label="Zielgruppe:"
            value={audience}
            onChange={(value) => onAudienceChange(value as any)}
            options={[
              { value: 'beginner', label: 'Anfänger' },
              { value: 'intermediate', label: 'Intermediate' },
              { value: 'expert', label: 'Experten' },
            ]}
            fullWidth
            variant="compact"
            labelSize="11px"
          />
          <ZenDropdown
            label="Sprache:"
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
            labelSize="11px"
          />
        </div>
      </div>

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
          Step02: <span className="text-[#dbd9d5]  font-mono">Dokumentationstyp wählen</span>
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
                  backgroundColor: isSelected ? 'transparent' : 'transparent',
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

        <div
          style={{
            marginTop: '24px',
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <ZenRoughButton
            label={selected.length === templates.length ? 'Alle abwählen' : 'Alle auswählen'}
            icon="✓"
            onClick={toggleAll}
            variant="default"
            size="small"
            width={190}
            height={42}
          />
          <ZenRoughButton
            label={`${selected.length} ${selected.length === 1 ? 'Template' : 'Templates'} generieren`}
            icon=""
            onClick={generateSelection}
            variant="default"
            size="small"
            width={220}
            height={42}
            disabled={selected.length === 0}
          />
          <ZenRoughButton
            label="Entwurf starten"
            icon={<FontAwesomeIcon icon={faEdit} />}
            onClick={() => onGenerate('draft' as DocTemplate)}
            variant="default"
            size="small"
            width={180}
            height={42}
          />
        </div>
      </div>
    </div>
  );
}
