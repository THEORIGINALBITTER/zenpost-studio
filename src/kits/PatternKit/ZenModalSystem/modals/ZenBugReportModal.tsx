import { ZenModal } from "../components/ZenModal";
import { ZenModalFooter } from "../components/ZenModalFooter";
import { ZenRoughButton } from "../components/ZenRoughButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { getModalPreset } from "../config/ZenModalConfig";

interface ZenBugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInDocStudio?: () => void;
}

export const ZenBugReportModal = ({ isOpen, onClose, onOpenInDocStudio }: ZenBugReportModalProps) => {
  const modalPreset = getModalPreset("bug-report");
  const issueBody = [
    "## Bereich",
    "- [ ] Content AI",
    "- [ ] DocStudio",
    "- [ ] Beides",
    "",
    "## Kurzbeschreibung",
    "",
    "## Schritte zur Reproduktion",
    "1.",
    "2.",
    "3.",
    "",
    "## Erwartetes Verhalten",
    "",
    "## Tatsächliches Verhalten",
    "",
    "## Screenshots (falls relevant)",
    "",
    "## Umgebung",
    "- OS:",
    "- App-Version:",
    "- Weitere Details:",
  ].join("\n");
  const issueUrl = `https://github.com/THEORIGINALBITTER/zenpost-studio/issues/new?title=${encodeURIComponent("Bug: ")}&labels=${encodeURIComponent("bug,triage")}&body=${encodeURIComponent(issueBody)}`;

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalPreset.title}
      subtitle={modalPreset.subtitle}
      headerAlign="center"
    >
      <div
        className="relative flex flex-col"
        style={{ minHeight: modalPreset.minHeight }}
      >
        <div className="flex-1 flex flex-col gap-4 p-[12px] overflow-y-auto">
          <div className="font-mono text-[12px] text-[#dbd9d5]">
            <div className="text-[#AC8E66] mb-2">Bugs melden</div>
            <div className="flex flex-col text-[#555] gap-2 mt-[10px]">
              <div>1. Prüfe zuerst, ob der Bug bereits gemeldet wurde.</div>
              <div>2. Erstelle ein neues Issue mit:</div>
              <div className="pl-4 text-[#555]">
                <div>- Klare Beschreibung des Problems</div>
                <div>- Schritte zur Reproduktion</div>
                <div>- Erwartetes vs. tatsächliches Verhalten</div>
                <div>- Screenshots (falls relevant)</div>
                <div>- Umgebungsdetails (OS, Browser, Version)</div>
              </div>
            </div>
          </div>

          <div className="pt-[10px]">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            
              <ZenRoughButton label="Verstanden" onClick={() => (onOpenInDocStudio ?? onClose)()} size="small" />
            
              <ZenRoughButton
                label="Issue auf GitHub öffnen"
                icon={<FontAwesomeIcon icon={faGithub} className="text-[#AC8E66]" />}
                href={issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
              />
            </div>
          </div>
        </div>

        <ZenModalFooter />
      </div>
    </ZenModal>
  );
};
