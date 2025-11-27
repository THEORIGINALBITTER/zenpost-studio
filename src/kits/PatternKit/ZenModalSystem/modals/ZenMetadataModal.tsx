import { useState, useEffect } from 'react';
import { ZenModal } from '../components/ZenModal';
import { ZenModalHeader } from '../components/ZenModalHeader';
import { ZenModalFooter } from '../components/ZenModalFooter';
import { ZenRoughButton } from '../components/ZenRoughButton';
import { getModalPreset } from '../config/ZenModalConfig';

export interface ProjectMetadata {
  authorName: string;
  authorEmail: string;
  companyName: string;
  license: string;
  year: string;
  website: string;
  repository: string;
  contributingUrl: string;
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
};

export function ZenMetadataModal({ isOpen, onClose, metadata, onSave }: ZenMetadataModalProps) {
  const [formData, setFormData] = useState<ProjectMetadata>(metadata || defaultMetadata);
  const modalPreset = getModalPreset('metadata');

  useEffect(() => {
    if (isOpen) {
      setFormData(metadata || defaultMetadata);
    }
  }, [isOpen, metadata]);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleChange = (field: keyof ProjectMetadata, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <ZenModal isOpen={isOpen} onClose={onClose} showCloseButton={false}>
      <div className="bg-[#1A1A1A] rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      style={{paddingTop: "100px"}}
      >
        <ZenModalHeader
          title={modalPreset.title}
          subtitle={modalPreset.subtitle}
          titleColor={modalPreset.titleColor}
          subtitleColor={modalPreset.subtitleColor}
          titleSize={modalPreset.titleSize}
          subtitleSize={modalPreset.subtitleSize}
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Author Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#AC8E66] border-b border-[#AC8E66] pb-2">
              👤 Autor-Informationen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#999] mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.authorName}
                  onChange={(e) => handleChange('authorName', e.target.value)}
                  placeholder="Max Mustermann"
                  className="w-full px-4 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] rounded text-[#e5e5e5] focus:border-[#AC8E66] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#999] mb-2">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={formData.authorEmail}
                  onChange={(e) => handleChange('authorEmail', e.target.value)}
                  placeholder="max@example.com"
                  className="w-full px-4 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] rounded text-[#e5e5e5] focus:border-[#AC8E66] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Company & Legal */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#AC8E66] border-b border-[#AC8E66] pb-2">
              🏢 Unternehmen & Lizenz
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#999] mb-2">
                  Firmenname
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="Meine Firma GmbH"
                  className="w-full px-4 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] rounded text-[#e5e5e5] focus:border-[#AC8E66] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#999] mb-2">
                  Lizenz
                </label>
                <select
                  value={formData.license}
                  onChange={(e) => handleChange('license', e.target.value)}
                  className="w-full px-4 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] rounded text-[#e5e5e5] focus:border-[#AC8E66] focus:outline-none"
                >
                  <option value="MIT">MIT</option>
                  <option value="Apache-2.0">Apache 2.0</option>
                  <option value="GPL-3.0">GPL 3.0</option>
                  <option value="BSD-3-Clause">BSD 3-Clause</option>
                  <option value="ISC">ISC</option>
                  <option value="Proprietary">Proprietary</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#999] mb-2">
                  Jahr
                </label>
                <input
                  type="text"
                  value={formData.year}
                  onChange={(e) => handleChange('year', e.target.value)}
                  placeholder="2024"
                  className="w-full px-4 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] rounded text-[#e5e5e5] focus:border-[#AC8E66] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Links & URLs */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#AC8E66] border-b border-[#AC8E66] pb-2">
              🔗 Links & URLs
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#999] mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] rounded text-[#e5e5e5] focus:border-[#AC8E66] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#999] mb-2">
                  Repository URL
                </label>
                <input
                  type="url"
                  value={formData.repository}
                  onChange={(e) => handleChange('repository', e.target.value)}
                  placeholder="https://github.com/username/repo"
                  className="w-full px-4 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] rounded text-[#e5e5e5] focus:border-[#AC8E66] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#999] mb-2">
                  Contributing Guide URL
                </label>
                <input
                  type="url"
                  value={formData.contributingUrl}
                  onChange={(e) => handleChange('contributingUrl', e.target.value)}
                  placeholder="https://github.com/username/repo/blob/main/CONTRIBUTING.md"
                  className="w-full px-4 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] rounded text-[#e5e5e5] focus:border-[#AC8E66] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

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
              label="Abbrechen"
              onClick={onClose}
            />
            <ZenRoughButton
              label="💾 Speichern"
              onClick={handleSave}
              variant="active"
            />
          </div>
        </ZenModalFooter>
      </div>
    </ZenModal>
  );
}
