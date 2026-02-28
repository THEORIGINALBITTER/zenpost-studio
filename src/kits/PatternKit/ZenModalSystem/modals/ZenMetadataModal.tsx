import { useState, useEffect } from 'react';
import { ZenModal } from '../components/ZenModal';
import { ZenModalFooter } from '../components/ZenModalFooter';
import { ZenRoughButton } from '../components/ZenRoughButton';
import { ZenDropdown } from '../components/ZenDropdown';
import { getModalPreset } from '../config/ZenModalConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faEnvelope,
  faBuilding,
  faFileContract,
  faCalendar,
  faGlobe,
  faCodeBranch,
  faBook,
  faSave,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Extrahiert Metadaten aus Markdown-Frontmatter oder Dokument-Header
 * Beispiel:
 * ---
 * title: My Article
 * author: John Doe
 * tags: react, typescript
 * ---
 */
export function extractMetadataFromContent(content: string): Partial<ProjectMetadata> {
  const metadata: Partial<ProjectMetadata> = {};

  // YAML Frontmatter Pattern
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const lines = frontmatter.split('\n');

    lines.forEach(line => {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        metadata[key] = value.trim();
      }
    });
  }

  return metadata;
}

export interface ProjectMetadata {
  // Standard-Felder (immer vorhanden)
  authorName: string;
  authorEmail: string;
  companyName: string;
  license: string;
  year: string;
  website: string;
  repository: string;
  contributingUrl: string;

  // SEO-Felder
  description: string;
  keywords: string;
  lang: string;

  // Dynamische Felder aus Dokument
  [key: string]: string;
}

interface ZenMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: ProjectMetadata;
  onSave: (metadata: ProjectMetadata) => void;
}

const defaultMetadata: ProjectMetadata = {
  authorName: '',
  authorEmail: '',
  companyName: '',
  license: 'MIT',
  year: new Date().getFullYear().toString(),
  website: '',
  repository: '',
  contributingUrl: '',
  description: '',
  keywords: '',
  lang: 'de',
};

// Typography-Konfiguration (außerhalb der Komponente)
const typography = {
  sectionTitle: '15px',
  label: '12px',
  input: '13px',
  iconSize: '13px',
};

// InputField-Komponente (außerhalb der Hauptkomponente definiert!)
const InputField = ({
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  icon: any;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) => {
  // Email-Validierung
  const isEmail = type === 'email';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = !isEmail || !value || emailRegex.test(value);
  const showError = isEmail && value && !isValidEmail;

  return (
    <div style={{ marginBottom: '16px', width: '100%', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '400px', maxWidth: '90%' }}>
        <label
          className="font-mono text-[#999] flex items-center"
          style={{
            fontSize: typography.label,
            marginBottom: '8px',
            gap: '6px',
          }}
        >
          <FontAwesomeIcon
            icon={icon}
            className="text-[#AC8E66]"
            style={{ fontSize: typography.iconSize }}
          />
          {label}
        </label>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="font-mono text-[#e5e5e5] bg-[#2A2A2A] focus:border-[#AC8E66] focus:outline-none"
          autoComplete="off"
          style={{
            width: '100%',
            padding: '10px 12px',
            border: showError ? '1px solid #ef4444' : '1px solid #3A3A3A',
            borderRadius: '6px',
            fontSize: typography.input,
            transition: 'border-color 0.2s',
          }}
        />
        {showError && (
          <div
            style={{
              fontSize: '10px',
              color: '#ef4444',
              marginTop: '4px',
              fontFamily: 'monospace',
            }}
          >
            Bitte gib eine gültige E-Mail-Adresse ein
          </div>
        )}
      </div>
    </div>
  );
};

// Section Header Component (außerhalb der Hauptkomponente)
const SectionHeader = ({ icon, title }: { icon: any; title: string }) => (
  <h3
    className="font-mono text-[#AC8E66] flex items-center"
    style={{
      fontSize: typography.sectionTitle,
      fontWeight: 'bold',
      borderBottom: '1px solid #AC8E66',
      paddingBottom: '8px',
      marginBottom: '16px',
      gap: '8px',
    }}
  >
    <FontAwesomeIcon
      icon={icon}
      style={{ fontSize: typography.iconSize }}
    />
    {title}
  </h3>
);

export function ZenMetadataModal({ isOpen, onClose, metadata, onSave }: ZenMetadataModalProps) {
  const [formData, setFormData] = useState<ProjectMetadata>(metadata || defaultMetadata);
  const modalPreset = getModalPreset('metadata');

  useEffect(() => {
    if (isOpen) {
      setFormData(metadata || defaultMetadata);
    }
  }, [isOpen]);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleChange = (field: keyof ProjectMetadata, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Standard-Felder (immer gleich)
  const standardFields = [
    'authorName',
    'authorEmail',
    'companyName',
    'license',
    'year',
    'website',
    'repository',
    'contributingUrl',
  ];

  // Dynamische Felder aus dem Dokument extrahieren
  const dynamicFields = Object.keys(formData).filter(
    (key) => !standardFields.includes(key)
  );

  if (!isOpen) return null;

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalPreset.title}
      subtitle={modalPreset.subtitle}
      showCloseButton={true}
    >
      <div
        className="bg-[#1A1A1A] rounded-lg flex flex-col"
        style={{
          width: modalPreset.minWidth,
          maxWidth: modalPreset.maxWidth,
          minHeight: modalPreset.minHeight,
          maxHeight: modalPreset.maxHeight,
          overflow: 'hidden',
        }}
      >
        {/* Scrollable Content */}
        <div
          className="zen-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            maxHeight: "70vh",
            overflowX: 'hidden',
            padding: '20px 28px',
          }}
        >
          {/* Author Information */}
          <div style={{ marginBottom: '32px' }}>
            <SectionHeader icon={faUser} title="Autor --Informationen" />
            <InputField
              label="Name"
              icon={faUser}
              value={formData.authorName}
              onChange={(value) => handleChange('authorName', value)}
              placeholder="Max Mustermann"
            />
            <InputField
              label="E-Mail"
              icon={faEnvelope}
              value={formData.authorEmail}
              onChange={(value) => handleChange('authorEmail', value)}
              placeholder="max@example.com"
              type="email"
            />
          </div>

          {/* Company & Legal */}
          <div style={{ marginBottom: '32px' }}>
            <SectionHeader icon={faBuilding} title="Unternehmen & Lizenz" />
            <InputField
              label="Firmenname"
              icon={faBuilding}
              value={formData.companyName}
              onChange={(value) => handleChange('companyName', value)}
              placeholder="Meine Firma GmbH"
            />
            <div style={{ marginBottom: '16px' }}>
              <label
                className="font-mono text-[#999] flex items-center"
                style={{
                  fontSize: typography.label,
                  marginBottom: '8px',
                  gap: '6px',
                }}
              >
                <FontAwesomeIcon
                  icon={faFileContract}
                  className="text-[#AC8E66]"
                  style={{ fontSize: typography.iconSize }}
                />
                Lizenz
              </label>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                <ZenDropdown
                  value={formData.license}
                  onChange={(value) => handleChange('license', value)}
                  options={[
                    { value: 'MIT', label: 'MIT' },
                    { value: 'Apache-2.0', label: 'Apache 2.0' },
                    { value: 'GPL-3.0', label: 'GPL 3.0' },
                    { value: 'BSD-3-Clause', label: 'BSD 3-Clause' },
                    { value: 'ISC', label: 'ISC' },
                    { value: 'Proprietary', label: 'Proprietary' },
                  ]}
                  variant="compact"
                />
              </div>
            </div>
            <InputField
              label="Jahr"
              icon={faCalendar}
              value={formData.year}
              onChange={(value) => handleChange('year', value)}
              placeholder="2024"
            />
          </div>

          {/* Links & URLs */}
          <div style={{ marginBottom: '16px' }}>
            <SectionHeader icon={faGlobe} title="Links & URLs" />
            <InputField
              label="Website"
              icon={faGlobe}
              value={formData.website}
              onChange={(value) => handleChange('website', value)}
              placeholder="https://example.com"
              type="url"
            />
            <InputField
              label="Repository URL"
              icon={faCodeBranch}
              value={formData.repository}
              onChange={(value) => handleChange('repository', value)}
              placeholder="https://github.com/username/repo"
              type="url"
            />
            <InputField
              label="Contributing Guide URL"
              icon={faBook}
              value={formData.contributingUrl}
              onChange={(value) => handleChange('contributingUrl', value)}
              placeholder="https://github.com/username/repo/blob/main/CONTRIBUTING.md"
              type="url"
            />
          </div>

          {/* Dynamische Felder aus Dokument */}
          {dynamicFields.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <SectionHeader icon={faBook} title="Dokument-Metadaten" />
              {dynamicFields.map((fieldKey) => (
                <InputField
                  key={fieldKey}
                  label={fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1).replace(/([A-Z])/g, ' $1')}
                  icon={faBook}
                  value={formData[fieldKey]}
                  onChange={(value) => handleChange(fieldKey as keyof ProjectMetadata, value)}
                  placeholder={`Enter ${fieldKey}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <ZenModalFooter>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 12,
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              flexWrap: 'wrap',
            }}
          >
          
            <ZenRoughButton
              label="Speichern"
              icon={<FontAwesomeIcon icon={faSave} className="text-[#AC8E66]" />}
              onClick={handleSave}
              variant="default"
            />
          </div>
        </ZenModalFooter>
      </div>
    </ZenModal>
  );

}
