# Cloud-Provider

Cloud-Provider bieten schnellen Zugang zu leistungsstarken KI-Modellen. Funktioniert in Desktop und Web.

> Daten werden an den Provider gesendet. Kosten entstehen pro Anfrage.

## OpenAI

### API-Key erstellen

1. [platform.openai.com](https://platform.openai.com) oeffnen
2. Account erstellen oder einloggen
3. API Keys → Create new secret key
4. Key kopieren (wird nur einmal angezeigt)

### In ZenPost konfigurieren

1. Einstellungen → AI Einstellungen
2. Provider: **OpenAI**
3. API-Key einfuegen
4. Modell waehlen

### Modelle

| Modell | Staerke | Empfehlung |
| --- | --- | --- |
| gpt-4o | Bestes OpenAI-Modell | Hochwertige Texte, komplexe Aufgaben |
| gpt-4o-mini | Schnell, guenstig | Standard fuer die meisten Inhalte |
| gpt-4-turbo | Stark, groesserer Kontext | Lange Texte, detaillierte Artikel |
| gpt-3.5-turbo | Am guenstigsten | Einfache Transformationen |

## Anthropic (Claude)

### API-Key erstellen

1. [console.anthropic.com](https://console.anthropic.com) oeffnen
2. Account erstellen oder einloggen
3. API Keys → Create Key
4. Key kopieren

### In ZenPost konfigurieren

1. Einstellungen → AI Einstellungen
2. Provider: **Anthropic**
3. API-Key einfuegen
4. Modell waehlen

### Modelle

| Modell | Staerke | Empfehlung |
| --- | --- | --- |
| claude-3-5-sonnet | Beste Textqualitaet | Hochwertige Inhalte, nuancierte Texte |
| claude-3-opus | Staerkstes Modell | Komplexe Aufgaben, lange Artikel |
| claude-3-sonnet | Ausgewogen | Standard fuer die meisten Inhalte |
| claude-3-haiku | Schnell, kompakt | Kurze Texte, schnelle Antworten |

## Custom API

Fuer eigene oder selbst-gehostete Modelle.

### Konfiguration

1. Einstellungen → AI Einstellungen
2. Provider: **Custom**
3. Base URL: Dein API-Endpoint (z.B. `https://your-api.com`)
4. API-Key: Falls erforderlich

Der Endpoint muss das OpenAI-kompatible Chat-Completions-Format unterstuetzen:

```
POST /v1/chat/completions
```

## Auto-Modus

Der Auto-Modus waehlt automatisch den besten verfuegbaren Provider:

1. Analysiert den Input (Laenge, Komplexitaet, Fachsprache)
2. Prueft welche Provider konfiguriert sind (gueltige API-Keys)
3. Waehlt das optimale Modell:
   - Langer, kreativer Text → Claude Opus
   - Kurzer, technischer Text → GPT-4o-mini
   - Kein Cloud-Key vorhanden → Ollama (nur Desktop)

**Voraussetzung:** Mindestens ein Provider mit gueltigem API-Key.

## Hinweise

- **Kosten:** Jede Transformation verursacht einen API-Call. Preise beim jeweiligen Anbieter pruefen.
- **Rate Limits:** Bei vielen Anfragen in kurzer Zeit kann der Provider limitieren.
- **Datenschutz:** Inhalte werden an den Provider gesendet. Fuer sensible Daten: [Ollama (Lokal)](ai/ollama.md) nutzen.
- **Modellwahl:** Im Zweifel `gpt-4o-mini` oder `claude-3-5-sonnet` — beste Balance aus Qualitaet und Kosten.
