import { useState, useEffect } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { ZenDropdown } from "../../components/ZenDropdown";
import { ZenInfoBox } from "../../components/ZenInfoBox";
import { ZenSlider } from "../../components/ZenSlider";
import { ZenRoughButton } from "../../components/ZenRoughButton";
import { AI_TEMPERATURE_INFO, getProviderInfo } from "../../config/ZenModalConfig";
import {
  loadAIConfig,
  saveAIConfig,
  getAvailableProviders,
  getModelsForProvider,
  type AIConfig,
  type AIProvider,
} from "../../../../../services/aiService";

const isDesktop = isTauri();

interface ZenAISettingsContentProps {
  onSwitchTab?: (tab: string) => void;
}

export const ZenAISettingsContent = ({ onSwitchTab }: ZenAISettingsContentProps) => {
  const [aiConfig, setAiConfig] = useState<AIConfig>(loadAIConfig());
  const [ollamaStatus, setOllamaStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");

  // Auto-save on changes
  useEffect(() => {
    saveAIConfig(aiConfig);
  }, [aiConfig]);

  // Check Ollama reachability when provider is ollama (Desktop only)
  useEffect(() => {
    if (aiConfig.provider !== "ollama") {
      setOllamaStatus("idle");
      return;
    }
    // Im Web-Modus: kein Verbindungstest, nur Info anzeigen
    if (!isDesktop) {
      setOllamaStatus("idle");
      return;
    }
    const baseUrl = (aiConfig.baseUrl || "http://127.0.0.1:11434").replace(/\/$/, "");
    const url = `${baseUrl}/api/tags`;
    let cancelled = false;

    const check = async () => {
      setOllamaStatus("checking");
      try {
        const result = await invoke<{ status: number; body: string }>("http_fetch", {
          request: { url, method: "GET", headers: { "Content-Type": "application/json" }, body: null },
        });
        if (!cancelled) setOllamaStatus(result.status >= 200 && result.status < 300 ? "ok" : "error");
      } catch {
        if (!cancelled) setOllamaStatus("error");
      }
    };

    check();
    return () => { cancelled = true; };
  }, [aiConfig.provider, aiConfig.baseUrl]);

  // Im Web-Modus: Ollama aus der Provider-Liste entfernen
  const availableProviders = getAvailableProviders().filter(
    (p) => isDesktop || p.value !== "ollama"
  );
  const availableModels = getModelsForProvider(aiConfig.provider);

return (
  <div className="w-full flex justify-center" style={{ padding: "32px 32px" }}>
    {/* Paper Panel */}
    <div
      className="w-full max-w-[860px] bg-[#E8E1D2] border border-[#AC8E66]/60 shadow-2xl overflow-hidden"
      style={{ borderRadius: 10 }}
    >
      {/* Paper Header */}
      <div className="border-b border-[#AC8E66]/35" style={{ padding: "16px 10px" }}>
        <div className="font-mono text-[12px] text-[#555] text-center tracking-wide">
          AI Einstellungen
        </div>
        <div className="font-mono text-[10px] text-[#777] text-center" style={{ marginTop: 4 }}>
          Provider · Modell · Verbindung · Stil
        </div>
      </div>

      {/* Paper Body */}
      <div style={{ padding: "32px 32px" }}>
        <div className="mx-auto w-full max-w-[520px] flex flex-col" style={{ gap: 40 }}>

          {/* ====== SECTION: Provider/Model ====== */}
          <div className="flex flex-col pt-[19px]" style={{ gap: 24 }}>
            {/* kleine Section-Überschrift */}
            <div className="font-mono text-[10px] text-[#555] tracking-wide text-center">
              KONFIGURATION
            </div>

            <ZenDropdown
              label="AI-Provider:"
              labelSize="11px"
              value={aiConfig.provider}
              onChange={(value) => setAiConfig({ ...aiConfig, provider: value as AIProvider })}
              options={availableProviders.map((p) => ({ value: p.value, label: p.label }))}
              fullWidth
              variant="compact"
            />

            {availableModels.length > 0 && (
              <ZenDropdown
                label="Modell:"
                labelSize="11px"
                value={aiConfig.model || ""}
                onChange={(value) => setAiConfig({ ...aiConfig, model: value })}
                options={availableModels.map((m) => ({ value: m, label: m }))}
                fullWidth
                variant="compact"
              />
            )}

            {/* API Key */}
            {availableProviders.find((p) => p.value === aiConfig.provider)?.requiresApiKey && (
              <div className="w-full">
                <label
                  className="block font-mono text-[11px] text-[#6b5a3e] text-center"
                  style={{ marginBottom: 8 }}
                >
                  API-Key
                </label>
                <input
                  type="password"
                  value={aiConfig.apiKey || ""}
                  onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full bg-transparent border border-[#AC8E66]/70 rounded-lg font-mono text-[10px] text-[#3a3a3a] text-center focus:outline-none focus:border-[#AC8E66] placeholder:text-[#7a6a52]/70"
                  style={{ padding: "8px 16px" }}
                />
                <div
                  className="font-mono text-[10px] text-[#7a6a52] text-center"
                  style={{ marginTop: 8 }}
                >
                  Wird lokal gespeichert (LocalStorage)
                </div>
              </div>
            )}

            {/* Base URL */}
            {(aiConfig.provider === "ollama" || aiConfig.provider === "custom") && (
              <div className="w-full">
                <label
                  className="block font-mono text-[11px] text-[#6b5a3e] text-center"
                  style={{ marginBottom: 8 }}
                >
                  Base URL
                </label>
                <input
                  type="text"
                  value={aiConfig.baseUrl || ""}
                  onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                  placeholder={
                    aiConfig.provider === "ollama"
                      ? "http://127.0.0.1:11434"
                      : "https://your-api.com"
                  }
                  className="w-full bg-transparent border border-[#AC8E66]/70 rounded-lg font-mono text-[10px] text-[#3a3a3a] text-center focus:outline-none focus:border-[#AC8E66] placeholder:text-[#7a6a52]/70"
                  style={{ padding: "8px 16px" }}
                />
              </div>
            )}
          </div>

          {/* Web-Modus: Info-Box wenn Ollama noch ausgewählt ist (z.B. alte Config) */}
          {aiConfig.provider === "ollama" && !isDesktop && (
            <div
              className="flex flex-col items-center font-mono text-[10px]"
              style={{
                gap: 14,
                padding: "16px 20px",
                borderRadius: 10,
                background: "rgba(172,142,102,0.08)",
                border: "1px solid rgba(172,142,102,0.25)",
                color: "#6b5a3e",
              }}
            >
              <div className="text-center leading-relaxed">
                Lokale KI ist in der Web-Version aus Sicherheitsgründen nicht möglich.
                <br />
                Bitte <strong style={{ color: "#AC8E66" }}>ZenPost Studio (Desktop)</strong> nutzen
                oder einen Cloud-Provider wählen.
              </div>
              <ZenRoughButton
                label="Cloud-Provider wählen"
                size="small"
                onClick={() => setAiConfig({ ...aiConfig, provider: "auto", model: "" })}
                width={220}
                height={40}
              />
            </div>
          )}

          {/* Desktop: Ollama not reachable hint */}
          {aiConfig.provider === "ollama" && isDesktop && ollamaStatus === "error" && (
            <div
              className="flex flex-col items-center font-mono text-[10px]"
              style={{
                gap: 14,
                padding: "16px 20px",
                borderRadius: 10,
                background: "rgba(180,60,60,0.06)",
                border: "1px solid rgba(180,60,60,0.18)",
                color: "#8b3a3a",
              }}
            >
              <div className="text-center leading-relaxed">
                Ollama ist nicht erreichbar. Bitte stelle sicher, dass Ollama installiert ist und der Server
                läuft. Im Tab <strong style={{ color: "#AC8E66" }}>Lokale KI</strong> findest du eine
                Schritt-für-Schritt-Anleitung.
              </div>
              {onSwitchTab && (
                <ZenRoughButton
                  label="Lokale KI einrichten"
                  size="small"
                  onClick={() => onSwitchTab("localai")}
                  width={220}
                  height={40}
                />
              )}
            </div>
          )}

          {/* Desktop: Ollama OK hint */}
          {aiConfig.provider === "ollama" && isDesktop && ollamaStatus === "ok" && (
            <div
              className="flex items-center justify-center font-mono text-[10px]"
              style={{
                gap: 8,
                padding: "10px 16px",
                borderRadius: 10,
                background: "rgba(76,140,74,0.1)",
                border: "1px solid rgba(76,140,74,0.22)",
                color: "#3a6e38",
              }}
            >
              <span
                className="rounded-full"
                style={{ width: 7, height: 7, flexShrink: 0, background: "#4c8c4a" }}
              />
              Ollama ist erreichbar und einsatzbereit
            </div>
          )}

          {/* Paper Divider */}
          <div className="border-t border-[#AC8E66]/30" />

          {/* ====== SECTION: Stil ====== */}
          <div className="flex flex-col" style={{ gap: 20 }}>
            <div className="font-mono text-[10px] text-[#7a6a52] tracking-wide text-center">
              STIL
            </div>

            <ZenSlider
              label="Stil wählen"
              min={0}
              max={1}
              step={0.1}
              value={aiConfig.temperature || 0.0}
              onChange={(value) => setAiConfig({ ...aiConfig, temperature: value })}
              minLabel="Präzise (0.0)"
              maxLabel="Kreativ (1.0)"
              valueFormatter={(v) => v.toFixed(1)}
            />

            <div style={{ marginTop: 8 }}>
              <ZenInfoBox {...AI_TEMPERATURE_INFO} />
            </div>
          </div>

          {/* Provider Info */}
          {getProviderInfo(aiConfig.provider) && (
            <div style={{ marginTop: 8 }}>
              <ZenInfoBox {...getProviderInfo(aiConfig.provider)!} />
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

};
