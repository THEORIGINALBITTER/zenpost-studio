# Security Policy

ZenPost Studio supports both cloud and local AI providers.

---

## Reporting Vulnerabilities

If you discover a vulnerability, please contact:

denis@theoriginalbitter.de

Do not open public issues for security problems.

---

## Data Handling Philosophy

ZenPost Studio:

- Does not store user content on external servers (desktop version)
- Does not log AI prompts
- Does not track user behavior

Web version uses provider APIs according to user configuration.

---

## Local AI Mode

Desktop builds can operate fully offline using Ollama.

This ensures:

- Data sovereignty
- No external transmission
- Full control over content
