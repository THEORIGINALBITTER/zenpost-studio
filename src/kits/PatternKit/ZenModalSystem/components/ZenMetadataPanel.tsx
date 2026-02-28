import { ReactNode, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
  faHashtag,
  faLanguage,
  faAlignLeft,
} from "@fortawesome/free-solid-svg-icons";
import { ZenRoughButton } from "./ZenRoughButton";
import { ZenDropdown } from "./ZenDropdown";
import type { ProjectMetadata } from "../modals/ZenMetadataModal";

interface ZenMetadataPanelProps {
  metadata: ProjectMetadata;
  onSave: (metadata: ProjectMetadata) => void;
  showSaveButton?: boolean;
}

const typography = {
  sectionTitle: "13px",
  label: "12px",
  input: "13px",
  iconSize: "13px",
};

const FIELD_WIDTH = 400;

const FieldBlock = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      marginBottom: "16px",
      width: "100%",
      display: "flex",
      justifyContent: "center",
    }}
  >
    <div style={{ width: `${FIELD_WIDTH}px`, maxWidth: "90%" }}>{children}</div>
  </div>
);

type SectionHeaderProps = {
  icon: any;
  iconColor?: string;
  title: ReactNode;
  titleColor?: string;
  borderColor?: string;
};

// Header sitzt exakt auf derselben "Field-Achse" wie die Inputs (400px Box)
const SectionHeader = ({
  icon,
  iconColor = "#AC8E66",
  title,
  titleColor = "#AC8E66",
  borderColor = "#AC8E66",
}: SectionHeaderProps) => (
  <FieldBlock>
    <h3
      className="font-mono flex items-center"
      style={{
        fontSize: typography.sectionTitle,
        fontWeight: "normal",
        borderBottom: `1px solid ${borderColor}`,
        paddingBottom: "8px",
        marginBottom: "0px", // FieldBlock kümmert sich um Abstand
        gap: "8px",
        color: titleColor,
      }}
    >
      <FontAwesomeIcon
        icon={icon}
        style={{
          fontSize: typography.iconSize,
          color: iconColor,
        }}
      />
      {title}
    </h3>
  </FieldBlock>
);

const InputField = ({
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  icon: any;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) => {
  const isEmail = type === "email";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = !isEmail || !value || emailRegex.test(value);
  const showError = isEmail && value && !isValidEmail;

  return (
    <FieldBlock>
      <label
        className="font-mono text-[#999] flex items-center"
        style={{
          fontSize: typography.label,
          marginBottom: "8px",
          gap: "6px",
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
          width: "100%",
          padding: "10px 12px",
          border: showError ? "1px solid #ef4444" : "1px solid #3A3A3A",
          borderRadius: "6px",
          fontSize: typography.input,
          transition: "border-color 0.2s",
        }}
      />

      {showError && (
        <div
          style={{
            fontSize: "10px",
            color: "#ef4444",
            marginTop: "4px",
            fontFamily: "monospace",
          }}
        >
          Bitte gib eine gueltige E-Mail-Adresse ein
        </div>
      )}
    </FieldBlock>
  );
};

export const ZenMetadataPanel = ({
  metadata,
  onSave,
  showSaveButton = true,
}: ZenMetadataPanelProps) => {
  const [formData, setFormData] = useState<ProjectMetadata>(metadata);

  useEffect(() => {
    setFormData(metadata);
  }, [metadata]);

  const handleChange = (field: keyof ProjectMetadata, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const standardFields = [
    "authorName",
    "authorEmail",
    "companyName",
    "license",
    "year",
    "website",
    "repository",
    "contributingUrl",
    "description",
    "keywords",
    "lang",
  ];

  const dynamicFields = Object.keys(formData).filter(
    (key) => !standardFields.includes(key)
  );

  return (
    <div className="flex flex-col">
      <div
        className="zen-scrollbar"
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "12px 8px 24px",
          maxHeight: "55vh",
        }}
      >
        {/* Autor */}
        <div style={{ marginBottom: "32px" }}>
          <SectionHeader
            icon="null"
            iconColor="#555"
            title="Projekt Informationen"
            titleColor="#555"
            borderColor="#AC8E66"
          />

          <InputField
            label="Name"
            icon={faUser}
            value={formData.authorName}
            onChange={(value) => handleChange("authorName", value)}
            placeholder="Max Mustermann"
          />

          <InputField
            label="E-Mail"
            icon={faEnvelope}
            value={formData.authorEmail}
            onChange={(value) => handleChange("authorEmail", value)}
            placeholder="max@example.com"
            type="email"
          />
        </div>

        {/* SEO & Sprache */}
        <div style={{ marginBottom: "32px" }}>
          <SectionHeader
            icon={faHashtag}
            title="SEO & Sprache"
            titleColor="#555"
            borderColor="#AC8E66"
          />

          {/* Description – Textarea */}
          <FieldBlock>
            <label
              className="font-mono text-[#999] flex items-center"
              style={{ fontSize: typography.label, marginBottom: "8px", gap: "6px" }}
            >
              <FontAwesomeIcon icon={faAlignLeft} className="text-[#AC8E66]" style={{ fontSize: typography.iconSize }} />
              Beschreibung
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Kurzbeschreibung des Projekts für SEO und Suchmaschinen…"
              rows={3}
              className="font-mono"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#151515",
                border: "1px solid rgba(172,142,102,0.4)",
                borderRadius: "6px",
                color: "#EDE6D8",
                fontSize: typography.input,
                resize: "vertical",
                outline: "none",
                fontFamily: "IBM Plex Mono, monospace",
                boxSizing: "border-box",
              }}
            />
          </FieldBlock>

          {/* Keywords */}
          <FieldBlock>
            <label
              className="font-mono text-[#999] flex items-center"
              style={{ fontSize: typography.label, marginBottom: "8px", gap: "6px" }}
            >
              <FontAwesomeIcon icon={faHashtag} className="text-[#AC8E66]" style={{ fontSize: typography.iconSize }} />
              Keywords
            </label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => handleChange("keywords", e.target.value)}
              placeholder="dokumentation, readme, typescript, react"
              className="font-mono"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#151515",
                border: "1px solid rgba(172,142,102,0.4)",
                borderRadius: "6px",
                color: "#EDE6D8",
                fontSize: typography.input,
                outline: "none",
                fontFamily: "IBM Plex Mono, monospace",
                boxSizing: "border-box",
              }}
            />
          </FieldBlock>

          {/* Sprache */}
          <FieldBlock>
            <label
              className="font-mono text-[#999] flex items-center"
              style={{ fontSize: typography.label, marginBottom: "8px", gap: "6px" }}
            >
              <FontAwesomeIcon icon={faLanguage} className="text-[#AC8E66]" style={{ fontSize: typography.iconSize }} />
              Sprache
            </label>
            <div style={{ width: "100%" }}>
              <ZenDropdown
                value={formData.lang}
                onChange={(value) => handleChange("lang", value)}
                options={[
                  { value: "de", label: "Deutsch (de)" },
                  { value: "en", label: "English (en)" },
                  { value: "fr", label: "Français (fr)" },
                  { value: "es", label: "Español (es)" },
                  { value: "it", label: "Italiano (it)" },
                  { value: "pt", label: "Português (pt)" },
                ]}
                variant="compact"
              />
            </div>
          </FieldBlock>
        </div>

        {/* Unternehmen & Lizenz */}
        <div style={{ marginBottom: "32px" }}>
          <SectionHeader
            icon={faBuilding}
            title="Unternehmen, Studio, Developer & Lizenz"
            titleColor="#555"
            borderColor="#AC8E66"
          />

          <InputField
            label="Firmenname & Developer"
            icon={faBuilding}
            value={formData.companyName}
            onChange={(value) => handleChange("companyName", value)}
            placeholder="Meine Firma GmbH & Developer Name"
          />

          {/* Lizenz: exakt gleiche Field-Box wie Inputs */}
          <FieldBlock>
            <label
              className="font-mono text-[#999] flex items-center"
              style={{
                fontSize: typography.label,
                marginBottom: "8px",
                gap: "6px",
              }}
            >
              <FontAwesomeIcon
                icon={faFileContract}
                className="text-[#AC8E66]"
                style={{ fontSize: typography.iconSize }}
              />
              Lizenz
            </label>

            <div style={{ width: "100%" }}>
              <ZenDropdown
                value={formData.license}
                onChange={(value) => handleChange("license", value)}
                options={[
                  { value: "MIT", label: "MIT" },
                  { value: "Apache-2.0", label: "Apache 2.0" },
                  { value: "GPL-3.0", label: "GPL 3.0" },
                  { value: "BSD-3-Clause", label: "BSD 3-Clause" },
                  { value: "ISC", label: "ISC" },
                  { value: "Proprietary", label: "Proprietary" },
                ]}
                variant="compact"
              />
            </div>
          </FieldBlock>

          <InputField
            label="Jahr"
            icon={faCalendar}
            value={formData.year}
            onChange={(value) => handleChange("year", value)}
            placeholder="2024"
          />
        </div>

        {/* Links */}
        <div style={{ marginBottom: "16px" }}>
          <SectionHeader
            icon={faGlobe}
            title="Links & URLs"
            titleColor="#555"
            borderColor="#AC8E66"
          />

          <InputField
            label="Website"
            icon={faGlobe}
            value={formData.website}
            onChange={(value) => handleChange("website", value)}
            placeholder="https://example.com"
            type="url"
          />

          <InputField
            label="Repository URL"
            icon={faCodeBranch}
            value={formData.repository}
            onChange={(value) => handleChange("repository", value)}
            placeholder="https://github.com/username/repo"
            type="url"
          />

          <InputField
            label="Contributing Guide URL"
            icon={faBook}
            value={formData.contributingUrl}
            onChange={(value) => handleChange("contributingUrl", value)}
            placeholder="https://github.com/username/repo/blob/main/CONTRIBUTING.md"
            type="url"
          />
        </div>

        {/* Dynamische Felder */}
        {dynamicFields.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <SectionHeader
              icon={faBook}
              title="Dokument-Metadaten"
              titleColor="#555"
              borderColor="#AC8E66"
            />

            {dynamicFields.map((fieldKey) => (
              <InputField
                key={fieldKey}
                label={
                  fieldKey
                    .charAt(0)
                    .toUpperCase() +
                  fieldKey
                    .slice(1)
                    .replace(/([A-Z])/g, " $1")
                }
                icon={faBook}
                value={(formData as any)[fieldKey] ?? ""}
                onChange={(value) =>
                  handleChange(fieldKey as keyof ProjectMetadata, value)
                }
                placeholder={`Enter ${fieldKey}`}
              />
            ))}
          </div>
        )}
      </div>

      {showSaveButton && (
        <div className="pt-2">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ZenRoughButton
              label="Speichern"
              icon={<FontAwesomeIcon icon={faSave} className="text-[#AC8E66]" />}
              onClick={() => onSave(formData)}
              variant="default"
            />
          </div>
        </div>
      )}
    </div>
  );
};
