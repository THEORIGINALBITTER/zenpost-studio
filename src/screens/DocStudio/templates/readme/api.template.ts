/**
 * README Template für Backend/API-Projekte
 * Fokus: Endpoints, Authentifizierung, Deployment, Rate Limits
 */

export const apiTemplate = `# [API-Name]

> [Kurze Beschreibung der API und ihres Zwecks]

**Base URL:** \`https://api.example.com/v1\`

## Schnellstart

\`\`\`bash
# Repository klonen
git clone https://github.com/[user]/[repo].git
cd [repo]

# Dependencies installieren
npm install

# Datenbank-Migration
npm run db:migrate

# Server starten
npm run dev
\`\`\`

Der Server läuft auf \`http://127.0.0.1:3000\`.

## Authentifizierung

Die API verwendet Bearer-Token-Authentifizierung:

\`\`\`bash
curl -H "Authorization: Bearer YOUR_API_TOKEN" \\
     https://api.example.com/v1/resource
\`\`\`

### Token anfordern

\`\`\`bash
POST /auth/token
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
\`\`\`

## API-Endpunkte

### Übersicht

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| \`GET\` | \`/resources\` | Liste aller Ressourcen |
| \`GET\` | \`/resources/:id\` | Einzelne Ressource |
| \`POST\` | \`/resources\` | Neue Ressource erstellen |
| \`PUT\` | \`/resources/:id\` | Ressource aktualisieren |
| \`DELETE\` | \`/resources/:id\` | Ressource löschen |

### GET /resources

Gibt eine paginierte Liste zurück.

**Query-Parameter:**

| Parameter | Typ | Standard | Beschreibung |
|-----------|-----|----------|--------------|
| \`page\` | \`number\` | \`1\` | Seitennummer |
| \`limit\` | \`number\` | \`20\` | Einträge pro Seite |
| \`sort\` | \`string\` | \`created_at\` | Sortierfeld |

**Response:**

\`\`\`json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
\`\`\`

### POST /resources

Erstellt eine neue Ressource.

**Request:**

\`\`\`json
{
  "name": "Beispiel",
  "description": "Beschreibung"
}
\`\`\`

**Response:** \`201 Created\`

## Fehlerbehandlung

| Status | Code | Beschreibung |
|--------|------|--------------|
| 400 | \`VALIDATION_ERROR\` | Ungültige Eingabedaten |
| 401 | \`UNAUTHORIZED\` | Fehlende/ungültige Authentifizierung |
| 403 | \`FORBIDDEN\` | Keine Berechtigung |
| 404 | \`NOT_FOUND\` | Ressource nicht gefunden |
| 429 | \`RATE_LIMITED\` | Zu viele Anfragen |
| 500 | \`INTERNAL_ERROR\` | Serverfehler |

**Fehler-Response:**

\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Name ist erforderlich",
    "details": [...]
  }
}
\`\`\`

## Rate Limiting

- **Limit:** 1000 Requests/Stunde
- **Headers:** \`X-RateLimit-Limit\`, \`X-RateLimit-Remaining\`, \`X-RateLimit-Reset\`

## Umgebungsvariablen

\`\`\`env
PORT=3000
DATABASE_URL=postgres://...
JWT_SECRET=your-secret
REDIS_URL=redis://...
\`\`\`

## Projektstruktur

\`\`\`
src/
├── controllers/    # Request-Handler
├── routes/         # API-Routes
├── middleware/     # Auth, Validation, etc.
├── models/         # Datenbank-Modelle
├── services/       # Business-Logik
└── utils/          # Hilfsfunktionen
\`\`\`

## Tests

\`\`\`bash
# Alle Tests
npm test

# Mit Coverage
npm run test:coverage

# E2E-Tests
npm run test:e2e
\`\`\`

## Deployment

### Docker

\`\`\`bash
docker build -t [api-name] .
docker run -p 3000:3000 --env-file .env [api-name]
\`\`\`

### Docker Compose

\`\`\`bash
docker-compose up -d
\`\`\`

## Health Check

\`\`\`
GET /health
\`\`\`

Response: \`{ "status": "ok", "version": "1.0.0" }\`

## Lizenz

[MIT](LICENSE) © [Autor/Organisation]
`;
