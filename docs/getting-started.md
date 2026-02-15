# Erste Schritte

Dieser Guide fuehrt dich in 3 Schritten zum ersten transformierten Inhalt.

## Vorbereitung

- Desktop-App starten oder [Web-Version](https://zenpost.denisbitter.de) oeffnen
- Einen KI-Provider auswaehlen
- Einen kurzen Beispieltext bereithalten

## Schritt 1: KI-Provider waehlen

Oeffne die **Einstellungen** (Zahnrad-Icon) und waehle im Tab **AI Einstellungen** deinen Provider.

| Provider | Typ | API-Key | Empfehlung |
|----------|-----|---------|------------|
| **Ollama** | Lokal | Nein | Volle Kontrolle, kostenlos, nur Desktop |
| **OpenAI** | Cloud | Ja | Schnell eingerichtet, gute Qualitaet |
| **Anthropic** | Cloud | Ja | Starke Textqualitaet (Claude) |
| **Auto** | Cloud | Ja | Automatische Modellwahl je nach Inhalt |
| **Custom** | Beliebig | Optional | Eigener API-Endpoint |

**Lokal (Ollama):** Keine Daten verlassen deinen Rechner. Erfordert Ollama-Installation — siehe [Ollama Setup](ai/ollama.md).

**Cloud:** API-Key eingeben, Modell waehlen, fertig. Kosten pro Anfrage beim jeweiligen Anbieter.

## Schritt 2: Testlauf

1. Im Hauptmenue **Inhalte transformieren** waehlen
2. Text eingeben oder Datei hochladen, z.B.:

```
ZenPost Studio ist ein KI-gestuetzter Content-Transformer.
Die App konvertiert Texte fuer verschiedene Social-Media-Plattformen
und unterstuetzt dabei sowohl lokale als auch Cloud-basierte KI-Modelle.
```

3. **Plattform waehlen** — z.B. LinkedIn Post
4. **Stil konfigurieren:**
   - Tonalitaet: Professional
   - Laenge: Medium (3-5 Absaetze)
   - Zielgruppe: Intermediate
   - Sprache: Deutsch
5. **Transformieren** klicken

Das Ergebnis ist ein plattformgerechter Text mit passender Struktur, Hashtags und Call-to-Action.

## Schritt 3: Ergebnis nutzen

Nach der Transformation hast du mehrere Optionen:

- **Kopieren** — Text in die Zwischenablage
- **Download** — Als Datei speichern
- **Bearbeiten** — Inline-Editing direkt im Ergebnis
- **Posten** — Direkt auf der Plattform veroeffentlichen (API-Key erforderlich)
- **Zurueck** — Ergebnis im Editor weiterbearbeiten

## Wenn etwas nicht klappt

| Problem | Loesung |
|---------|---------|
| Kein Ergebnis | KI-Provider in Einstellungen pruefen |
| Ollama nicht erreichbar | `ollama serve` im Terminal starten |
| CORS-Fehler (Web) | Ollama mit `OLLAMA_ORIGINS` starten — siehe [CORS-Anleitung](ai/ollama.md) |
| API-Key ungueltig | Key im Provider-Dashboard pruefen |
| Ergebnis zu kurz/lang | Laenge-Option in Schritt 3 anpassen |

Detaillierte Hilfe: [KI-Fehlerbehebung](help/ai.md) · [Allgemeine Probleme](help/general.md)
