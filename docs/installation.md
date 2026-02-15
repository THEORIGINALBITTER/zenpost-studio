# Installation

## Desktop

Empfohlen fuer lokale KI (Ollama) und volles Feature-Set.

1. Installer herunterladen: [GitHub Releases](https://github.com/theoriginalbitter/zenpost-studio/releases)
2. Installieren und App starten
3. In den Einstellungen den KI-Provider setzen

**Systemanforderungen:**

| OS | Version | Hinweis |
| --- | --- | --- |
| macOS | 11+ (Big Sur) | Intel und Apple Silicon |
| Windows | 10+ | 64-bit |
| Linux | Ubuntu 20.04+ | AppImage oder .deb |

Fuer lokale KI zusaetzlich: [Ollama installieren](ai/ollama.md)

## Web

Kein Download noetig. Laeuft direkt im Browser.

1. [zenpost.denisbitter.de](https://zenpost.denisbitter.de) oeffnen
2. KI-Provider konfigurieren (Einstellungen → AI Einstellungen)

**Einschraenkungen im Web:**

- Lokale KI (Ollama) ist **nicht verfuegbar** — der Browser kann aus Sicherheitsgruenden nicht auf lokale Dienste zugreifen
- Datei-Export nutzt den Browser-Download statt nativer Dialoge
- Projekt-Ordner nicht verfuegbar (kein Dateisystem-Zugriff)

## KI-Provider einrichten

### Lokale KI (Ollama) — nur Desktop

1. Ollama installieren: [ollama.com](https://ollama.com)
2. Modell herunterladen: `ollama pull llama3.1`
3. Server starten: `ollama serve`
4. In ZenPost: Einstellungen → AI → Provider: **Ollama**
5. Base URL: `http://127.0.0.1:11434` (Standard)

Detaillierte Anleitung: [Ollama Setup](ai/ollama.md)

### Cloud-KI

1. API-Key beim Anbieter erstellen
2. In ZenPost: Einstellungen → AI → Provider waehlen
3. API-Key eingeben
4. Modell auswaehlen

**Verfuegbare Modelle:**

| Provider | Modelle |
| --- | --- |
| OpenAI | gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo |
| Anthropic | claude-3-5-sonnet, claude-3-opus, claude-3-sonnet, claude-3-haiku |
| Ollama | llama3.2, llama3.1, mistral, mixtral, codellama, qwen2.5-coder |

Detaillierte Anleitung: [Cloud-Provider](ai/cloud.md)
