# Lokale KI (Ollama)

Ollama stellt KI-Modelle lokal auf deinem Rechner bereit. Keine Daten verlassen dein System, keine API-Keys noetig, keine Kosten.

> Nur in der Desktop-Version verfuegbar. Im Web kann der Browser aus Sicherheitsgruenden nicht auf lokale Dienste zugreifen.

## Installation

### macOS

```bash
brew install ollama
```

Oder: Installer von [ollama.com](https://ollama.com) herunterladen.

### Windows

Installer von [ollama.com](https://ollama.com) herunterladen und ausfuehren.

### Linux

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

## Modell herunterladen

```bash
ollama pull llama3.1
```

**Empfohlene Modelle:**

| Modell | Groesse | Staerke | Empfehlung |
| --- | --- | --- | --- |
| llama3.2 | 3B | Schnell, kompakt | Kurze Texte, schwache Hardware |
| llama3.1 | 8B | Ausgewogen | Standard-Empfehlung |
| mistral | 7B | Gute Textqualitaet | Europaeische Sprachen |
| mixtral | 47B | Stark, aber langsam | Beste lokale Qualitaet |
| codellama | 7B | Code-Analyse | Code → README Konvertierung |
| qwen2.5-coder | 7B | Code + Text | Technische Inhalte |

Weitere Modelle: `ollama list` zeigt installierte Modelle, `ollama pull <name>` laedt neue.

## Server starten

### macOS / Linux

```bash
OLLAMA_ORIGINS="https://zenpost.denisbitter.de" ollama serve
```

### Windows (PowerShell)

```powershell
$env:OLLAMA_ORIGINS="https://zenpost.denisbitter.de"; ollama serve
```

### Desktop-App (Tauri)

Im Desktop-Modus wird CORS automatisch ueber Tauri geroutet. Du kannst Ollama einfach normal starten:

```bash
ollama serve
```

`OLLAMA_ORIGINS` ist nur noetig, wenn du die Web-Version mit lokaler KI nutzen willst.

## In ZenPost konfigurieren

1. Einstellungen oeffnen (Zahnrad-Icon)
2. Tab **AI Einstellungen**
3. Provider: **Ollama**
4. Base URL: `http://127.0.0.1:11434` (Standard, meist nicht aendern)
5. Modell auswaehlen

Wenn Ollama erreichbar ist, erscheint ein gruener Status-Indikator.

## Verbindung pruefen

Im Browser oder Terminal:

```bash
curl http://127.0.0.1:11434/api/tags
```

Wenn JSON mit einer Modell-Liste zurueckkommt, laeuft der Server korrekt.

## Haeufige Fehler

### CORS blockiert (Web-Version)

**Symptom:** Request an `http://127.0.0.1:11434` wird geblockt.

**Loesung:** Ollama mit der korrekten Origin starten:

```bash
OLLAMA_ORIGINS="https://zenpost.denisbitter.de" ollama serve
```

Die Domain muss **exakt** passen — kein Slash am Ende, keine Abweichung.

### Verbindung verweigert

**Symptom:** `ERR_CONNECTION_REFUSED`

**Loesungen:**

- Ollama-Server starten: `ollama serve`
- Port pruefen: Standard ist `11434`
- Firewall-Einstellungen pruefen

### Kein Modell geladen

**Symptom:** API gibt leere Liste zurueck.

**Loesung:**

```bash
ollama pull llama3.1
ollama list
```

### Langsame Antworten

**Ursache:** Modell zu gross fuer die Hardware.

**Loesung:** Kleineres Modell verwenden (z.B. `llama3.2` statt `mixtral`). GPU-Beschleunigung aktivieren falls verfuegbar.
