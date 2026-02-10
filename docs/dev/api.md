# API

Diese Referenz beschreibt die internen und externen Schnittstellen, die in der App genutzt werden.

## Lokale KI (Ollama)

- Base URL: `http://127.0.0.1:11434`
- Endpoint: `/api/tags`
- Zweck: Verfuegbare Modelle abfragen

## Cloud-Provider

- Provider-spezifische APIs
- Authentifizierung via API-Key
- Modelle in den Settings konfiguriert

## Hinweise

- Im Web sind CORS-Regeln relevant
- Im Desktop wird die HTTP-Schicht ueber Tauri geroutet
