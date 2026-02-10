/**
 * API Documentation Template
 * REST API Schnittstellen-Dokumentation
 */

export const apiDocsTemplate = `# API Dokumentation

## Übersicht

Diese Dokumentation beschreibt die API-Endpunkte für [Projektname].

**Base URL:** \`https://api.example.com/v1\`

**Authentifizierung:** Bearer Token im Authorization Header

\`\`\`
Authorization: Bearer <your-api-token>
\`\`\`

---

## Endpunkte

### Ressourcen

#### GET /resources

Gibt eine Liste aller Ressourcen zurück.

**Query Parameter:**

| Parameter | Typ | Erforderlich | Beschreibung |
|-----------|-----|--------------|--------------|
| \`limit\` | \`number\` | Nein | Max. Anzahl (Standard: 20) |
| \`offset\` | \`number\` | Nein | Offset für Pagination |
| \`filter\` | \`string\` | Nein | Filter-Kriterium |

**Response:**

\`\`\`json
{
  "data": [
    {
      "id": "res_123",
      "name": "Beispiel Ressource",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
\`\`\`

---

#### GET /resources/:id

Gibt eine einzelne Ressource zurück.

**Path Parameter:**

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| \`id\` | \`string\` | Ressourcen-ID |

**Response:**

\`\`\`json
{
  "data": {
    "id": "res_123",
    "name": "Beispiel Ressource",
    "description": "Eine Beschreibung",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
\`\`\`

---

#### POST /resources

Erstellt eine neue Ressource.

**Request Body:**

\`\`\`json
{
  "name": "Neue Ressource",
  "description": "Beschreibung"
}
\`\`\`

**Response:** \`201 Created\`

\`\`\`json
{
  "data": {
    "id": "res_456",
    "name": "Neue Ressource",
    "description": "Beschreibung",
    "created_at": "2024-01-15T12:00:00Z"
  }
}
\`\`\`

---

#### PUT /resources/:id

Aktualisiert eine Ressource.

**Request Body:**

\`\`\`json
{
  "name": "Aktualisierter Name",
  "description": "Neue Beschreibung"
}
\`\`\`

**Response:** \`200 OK\`

---

#### DELETE /resources/:id

Löscht eine Ressource.

**Response:** \`204 No Content\`

---

## Fehler-Codes

| Code | Beschreibung |
|------|--------------|
| \`400\` | Bad Request - Ungültige Parameter |
| \`401\` | Unauthorized - Ungültiger API Token |
| \`403\` | Forbidden - Keine Berechtigung |
| \`404\` | Not Found - Ressource nicht gefunden |
| \`429\` | Too Many Requests - Rate Limit überschritten |
| \`500\` | Internal Server Error |

**Fehler Response Format:**

\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Name ist erforderlich",
    "details": [
      { "field": "name", "message": "Darf nicht leer sein" }
    ]
  }
}
\`\`\`

---

## Rate Limiting

- **Limit:** 1000 Requests pro Stunde
- **Header:** \`X-RateLimit-Remaining\`, \`X-RateLimit-Reset\`
`;
