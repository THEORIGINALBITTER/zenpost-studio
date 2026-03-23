# API Referenz

Interne und externe Schnittstellen von ZenPost Studio.

---

## KI-Provider APIs

### Ollama (Lokal)

```
Base URL:  http://127.0.0.1:11434
```

| Endpoint | Methode | Zweck |
| --- | --- | --- |
| `/api/tags` | GET | Verfuegbare Modelle auflisten |
| `/api/generate` | POST | Text generieren (Streaming) |
| `/api/chat` | POST | Chat-Completion (Streaming) |

**Streaming:** Antworten kommen als newline-delimited JSON. ZenPost liest den Stream chunk-weise und zeigt Tokens in Echtzeit an.

**CORS (Web-Version):** Ollama muss mit gesetztem `OLLAMA_ORIGINS`-Header gestartet werden:

```bash
OLLAMA_ORIGINS=* ollama serve
```

---

### OpenAI

```
Base URL:  https://api.openai.com/v1
```

| Endpoint | Methode | Zweck |
| --- | --- | --- |
| `/chat/completions` | POST | Text generieren |
| `/models` | GET | Modelle auflisten |

**Auth:** `Authorization: Bearer <API_KEY>`

---

### Anthropic

```
Base URL:  https://api.anthropic.com/v1
```

| Endpoint | Methode | Zweck |
| --- | --- | --- |
| `/messages` | POST | Text generieren |

**Auth:** `x-api-key: <API_KEY>` + `anthropic-version: 2023-06-01`

---

### Custom API

Jeder OpenAI-kompatible Endpoint wird unterstuetzt. ZenPost sendet dieselbe Payload wie an OpenAI.

```
Base URL:  Konfigurierbar in Einstellungen → AI → Custom
```

---

## Server API (PHP Blog)

Der Blog-Server besteht aus 3 PHP-Endpunkten:

### zenpost-upload.php

Empfaengt und speichert einen Blog-Post inkl. Titelbild.

```
POST https://meinserver.de/zenpostapp/zenpost-upload.php
Content-Type: multipart/form-data

Felder:
  api_key      string   Geheimer Schluessel (in PHP konfiguriert)
  slug         string   URL-sicherer Dateiname (z.B. "tag-01-mein-artikel")
  title        string   Artikel-Titel
  content      string   Markdown-Inhalt
  meta         string   JSON mit date, tags, subtitle, readingTime
  cover_image  file     Titelbild (optional, JPG/PNG/WebP)
```

**Antwort:**

```json
{ "success": true, "slug": "tag-01-mein-artikel", "url": "https://..." }
```

---

### ping.php

Prueft ob der Server erreichbar und konfiguriert ist.

```
GET https://meinserver.de/zenpostapp/ping.php?api_key=<KEY>
```

**Antwort:**

```json
{ "success": true, "version": "1.0", "postsCount": 12 }
```

---

### manifest.json

Statische JSON-Datei, die bei jedem Upload aktualisiert wird. Wird von Blog-Apps und Dashboards gelesen.

```
GET https://meinserver.de/zenpostapp/manifest.json
```

**Format:**

```json
{
  "site": { "title": "...", "author": "...", "url": "..." },
  "posts": [
    {
      "slug": "tag-01",
      "title": "...",
      "date": "2026-03-23",
      "tags": ["devlog"],
      "coverImage": "https://...",
      "readingTime": 4
    }
  ]
}
```

---

## Social Media APIs

ZenPost posted direkt an die jeweiligen Plattform-APIs. Alle Requests gehen von der App (nicht ueber einen ZenPost-Server).

| Plattform | Endpoint | Auth |
| --- | --- | --- |
| Twitter/X | `https://api.twitter.com/2/tweets` | Bearer Token |
| Reddit | `https://oauth.reddit.com/api/submit` | OAuth2 (Password Flow) |
| LinkedIn | `https://api.linkedin.com/v2/ugcPosts` | Access Token |
| dev.to | `https://dev.to/api/articles` | API Key Header |
| Medium | `https://api.medium.com/v1/users/{id}/posts` | Integration Token |
| GitHub Gist | `https://api.github.com/gists` | Personal Access Token |

---

## Tauri IPC (Desktop)

Frontend kommuniziert mit dem Rust-Backend via `invoke()`:

```typescript
import { invoke } from '@tauri-apps/api/core';

// Beispiel: ZenEngine Vorschlag anfordern
const suggestion = await invoke('zenengine_suggest', { text: '...' });
```

Alle verfuegbaren Commands sind in `src-tauri/src/main.rs` registriert.
