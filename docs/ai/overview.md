# KI – Uebersicht

ZenPost Studio unterstuetzt 5 KI-Provider: lokal (Ollama), Cloud (OpenAI, Anthropic) oder einen eigenen Endpoint (Custom API). Der Auto-Modus waehlt automatisch das beste Modell.

## Lokal vs Cloud

| Kriterium | Lokal (Ollama) | Cloud (OpenAI/Anthropic) |
| --- | --- | --- |
| Datenschutz | Keine Daten verlassen den Rechner | Daten gehen an Provider |
| Kosten | Kostenlos | Pro Anfrage |
| Offline | Ja | Nein |
| Geschwindigkeit | Abhaengig von Hardware | Schnell (Server-GPU) |
| Modellqualitaet | Gut (Llama, Mistral) | Sehr gut (GPT-4, Claude) |
| Setup | Ollama installieren + Modell laden | API-Key eingeben |
| Plattform | Nur Desktop | Desktop + Web |

**Entscheidungshilfe:**
- Datenschutz kritisch → **Lokal**
- Schnellster Einstieg → **Cloud**
- Beste Qualitaet → **Cloud** (GPT-4o, Claude Opus)
- Kostenlos → **Lokal**
- Web-Version → **Cloud** (lokale KI im Web nicht moeglich)

## Provider & Modelle

| Provider | Typ | Modelle | API-Key |
| --- | --- | --- | --- |
| **Auto** | Automatisch | Waehlt das beste verfuegbare Modell | Je nach Auswahl |
| **OpenAI** | Cloud | gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo | Ja |
| **Anthropic** | Cloud | claude-3-5-sonnet, claude-3-opus, claude-3-sonnet, claude-3-haiku | Ja |
| **Ollama** | Lokal | llama3.2, llama3.1, mistral, mixtral, codellama, qwen2.5-coder | Nein |
| **Custom** | Beliebig | Benutzerdefiniert | Optional |

## Auto-Modus

Der Auto-Modus analysiert den Input und waehlt automatisch das passende Modell:

- **Langer + kreativer Text** → Claude Opus (beste Textqualitaet)
- **Kurzer + technischer Text** → GPT-4o-mini (schnell und praezise)
- **Code-Inhalte** → Modell mit Code-Staerke
- **Kein Cloud-Provider konfiguriert** → Fallback auf Ollama (Desktop)

Voraussetzung: Mindestens ein Provider mit gueltigem API-Key oder Ollama lokal verfuegbar.

## Temperature (Stil)

Der Temperature-Slider (0.0 – 1.0) steuert die Kreativitaet der KI:

| Wert | Verhalten | Empfehlung |
| --- | --- | --- |
| 0.0 – 0.2 | Praezise, deterministisch | Technische Texte, Fakten |
| 0.3 – 0.5 | Ausgewogen | Standard, die meisten Inhalte |
| 0.6 – 0.8 | Kreativ, variabel | Storytelling, Marketing |
| 0.9 – 1.0 | Maximal kreativ | Brainstorming, experimentell |

**Standard:** 0.3 (ausgewogen)

## Einrichtung

- [Ollama (Lokal)](ai/ollama.md) — Schritt-fuer-Schritt Anleitung
- [Cloud-Provider](ai/cloud.md) — OpenAI, Anthropic, Custom API
