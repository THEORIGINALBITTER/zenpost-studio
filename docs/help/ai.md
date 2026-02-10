# KI-Fehlerbehebung

## CORS-Fehler im Web

Symptom

- Anfrage an `http://127.0.0.1:11434` wird blockiert
- Fehlermeldung im Browser: access control checks

Loesung

- Ollama mit `OLLAMA_ORIGINS` starten
- Domain muss exakt passen

Beispiel

```bash
OLLAMA_ORIGINS="https://zenpost.denisbitter.de" ollama serve
```

## Verbindung verweigert

Symptom

- `ERR_CONNECTION_REFUSED`

Loesung

- Ollama starten
- Port pruefen

## Kein Modell geladen

Symptom

- API liefert leere Liste

Loesung

- `ollama pull llama3.1`
- Danach erneut pruefen

## Cloud-Provider Fehler

Symptom

- 401 oder 403

Loesung

- API-Key pruefen
- Modellname pruefen
