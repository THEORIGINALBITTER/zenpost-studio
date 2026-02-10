# Lokale KI (Ollama)

Ollama stellt die KI lokal auf deinem Rechner bereit. Die App greift ueber `http://127.0.0.1:11434` darauf zu.

## Installation

1. Ollama installieren
2. Modell laden: `ollama pull llama3.1`
3. Server starten

## Server starten

macOS und Linux:

```bash
OLLAMA_ORIGINS="https://zenpost.denisbitter.de" ollama serve
```

Windows PowerShell:

```powershell
$env:OLLAMA_ORIGINS="https://zenpost.denisbitter.de"; ollama serve
```

## Pruefen

- `http://127.0.0.1:11434/api/tags` aufrufen
- Wenn JSON kommt, laeuft der Server

## Typische Fehler

CORS blockiert

- Origin fehlt in `OLLAMA_ORIGINS`
- Domain muss exakt passen

Verbindung verweigert

- Ollama laeuft nicht
- Falscher Port
