/**
 * API Documentation Template
 * Realistische REST API – Kursplattform / EdTech / LMS
 * Doc Studio Default (wenn kein Hard Scan gefunden wird)
 */

export const apiDocsTemplate = `# API Dokumentation

> Klar. Direkt. Implementierbar.  
> Keine Demo-Daten. Echte Strukturen.

---

## Quick Facts

**Projekt:** Course Platform API  
**Version:** v1  
**Base URL:** \`https://api.yourdomain.com/v1\`  
**Content-Type:** \`application/json\`  
**Zeitformat:** ISO 8601 UTC  
**Naming:** snake_case  

---

## Authentifizierung

**Typ:** Bearer Token (JWT)

\`\`\`
Authorization: Bearer <token>
\`\`\`

Token wird nach Login ausgegeben.

Beispiel:

\`\`\`bash
curl -H "Authorization: Bearer <token>" \\
https://api.yourdomain.com/v1/courses
\`\`\`

---

## Konventionen

- IDs: UUID oder prefixed string (z.B. \`course_123\`)
- Response Envelope: \`{ data, meta? }\`
- Fehlerformat: \`{ error }\`
- Pagination: offset + limit
- Jede Response enthält optional:
  - \`X-Request-Id\`
  - \`X-RateLimit-Remaining\`

---

## Standard-Schemas

### Course

\`\`\`json
{
  "id": "course_123",
  "title": "React Fundamentals",
  "slug": "react-fundamentals",
  "description": "Einführung in moderne React Patterns",
  "price": 199,
  "published": true,
  "created_at": "2026-02-01T10:00:00Z"
}
\`\`\`

---

### User

\`\`\`json
{
  "id": "user_88",
  "email": "max@example.com",
  "first_name": "Max",
  "last_name": "Mustermann",
  "role": "student",
  "created_at": "2026-02-01T09:12:00Z"
}
\`\`\`

---

### Error

\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "title is required",
    "details": [
      { "field": "title", "message": "cannot be empty" }
    ]
  }
}
\`\`\`

---

# Endpunkte

---

## Auth

### POST /auth/login

**Zweck:** Benutzer anmelden

**Request**

\`\`\`json
{
  "email": "max@example.com",
  "password": "••••••••"
}
\`\`\`

**Response**

\`\`\`json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
\`\`\`

---

## Courses

### GET /courses

**Zweck:** Liste aller Kurse

**Query Parameter**

| Parameter | Typ | Default |
|-----------|-----|----------|
| limit | number | 20 |
| offset | number | 0 |
| published | boolean | true |

**Request**

\`\`\`bash
curl -H "Authorization: Bearer <token>" \\
"https://api.yourdomain.com/v1/courses?limit=10"
\`\`\`

**Response**

\`\`\`json
{
  "data": [
    {
      "id": "course_123",
      "title": "React Fundamentals",
      "slug": "react-fundamentals",
      "price": 199
    }
  ],
  "meta": {
    "total": 42,
    "limit": 10,
    "offset": 0
  }
}
\`\`\`

---

### GET /courses/:id

**Zweck:** Einzelnen Kurs laden

**Response**

\`\`\`json
{
  "data": {
    "id": "course_123",
    "title": "React Fundamentals",
    "description": "Einführung...",
    "price": 199,
    "published": true
  }
}
\`\`\`

---

### POST /courses

**Zweck:** Kurs erstellen (Admin)

\`\`\`json
{
  "title": "Node.js Basics",
  "slug": "nodejs-basics",
  "price": 149
}
\`\`\`

**Response:** \`201 Created\`

---

### DELETE /courses/:id

**Response:** \`204 No Content\`

---

## Registrations

### POST /registrations

**Zweck:** Nutzer meldet sich für Kurs an

\`\`\`json
{
  "course_id": "course_123"
}
\`\`\`

**Response**

\`\`\`json
{
  "data": {
    "id": "reg_555",
    "course_id": "course_123",
    "user_id": "user_88",
    "created_at": "2026-02-01T11:00:00Z"
  }
}
\`\`\`

---

## Course Materials

### GET /registrations/:id/materials

**Zweck:** Kursmaterial für registrierten Nutzer

**Response**

\`\`\`json
{
  "data": {
    "teams_link": "https://teams.microsoft.com/...",
    "day_plan_json": { "days": [] }
  }
}
\`\`\`

---

# Fehler-Codes

| Code | Bedeutung |
|------|-----------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Rate Limit |
| 500 | Server Error |

---

# Rate Limiting

- 1000 Requests / Stunde
- Header:
  - X-RateLimit-Remaining
  - X-RateLimit-Reset

---

# Changelog

- v1: Initial release
`;
