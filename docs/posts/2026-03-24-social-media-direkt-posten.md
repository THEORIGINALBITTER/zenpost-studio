---
title: "Social Media – Direkt posten"
date: "2026-03-24"
tags: [devlog]
readingTime: 2
---

# Social Media – Direkt posten

ZenPost Studio kann Inhalte nach der Transformation direkt auf 6 Plattformen veroeffentlichen — ohne Browser-Umweg, direkt aus der App.

## Unterstuetzte Plattformen

| Plattform | Direkt posten | API-Key benoetigt | Besonderheit |
|-----------|:---:|---|---|
| **Twitter / X** | Ja | Bearer Token | Thread-Unterstuetzung |
| **Reddit** | Ja | Client ID + Secret + Username + Passwort | Subreddit waehlbar |
| **LinkedIn** | Ja | Access Token + Person ID | Max. 3000 Zeichen |
| **dev.to** | Ja | API Key | Wird als Entwurf gespeichert |
| **Medium** | Ja | Integration Token | Wird als Entwurf gespeichert |
| **GitHub Gist** | Ja | Personal Access Token | Erstellt oeffentlichen Gist |

## Einrichtung (einmalig)

### 1. Einstellungen oeffnen

Einstellungen → Tab **Social Media** → gewuenschte Plattform auswaehlen.

### 2. API-Key eintragen

Jede Plattform hat einen eigenen Tab mit Erklaerungen und direkten Links zur jeweiligen Developer-Seite.

**Twitter/X:**
- Bearer Token aus dem Twitter Developer Portal
- Erfordert Elevated Access fuer Posting-Rechte

**Reddit:**
- Client ID und Client Secret aus `reddit.com/prefs/apps`
- Reddit-Benutzername und Passwort (fuer OAuth-Passwortfluss)

**LinkedIn:**
- Access Token mit `w_member_social`-Berechtigung
- Person ID (wird automatisch ermittelt ueber "Detect Member ID"-Button)

**dev.to:**
- API Key aus `dev.to/settings/extensions`

**Medium:**
- Integration Token aus Medium-Profileinstellungen

**GitHub Gist:**
- Personal Access Token mit `gist`-Berechtigung

### 3. Status pruefen

Ein **goldener Punkt** neben dem Plattform-Tab zeigt: API-Key ist konfiguriert und bereit.

---

## Posten aus dem Ergebnis (Schritt 4)

1. Transformation abschliessen (Schritt 1–3)
2. In Schritt 4 den **Posten-Button** der gewuenschten Plattform klicken
3. Bei konfigurierter Plattform: Direkter Post ueber API
4. Bei nicht konfigurierter Plattform: Text wird kopiert + Plattform im Browser geoeffnet

**Waehrend des Postens:** Spinner-Animation auf dem Button

**Nach erfolgreichem Post:** Gruener Haken + Link zur veroeffentlichten URL wird geoeffnet

**Bei Fehler:** Roter Rahmen auf dem Button

---

## Plattform-Regeln (automatisch angewendet)

ZenPost wendet beim Posten automatisch plattformspezifische Regeln an:

| Plattform | Regel |
|-----------|-------|
| Twitter/X | Max. 280 Zeichen pro Tweet, mehrteilige Threads werden aufgeteilt |
| LinkedIn | Max. 3000 Zeichen, Ueberschuss wird abgeschnitten |
| dev.to | Wird als Entwurf gespeichert (`published: false`) |
| Medium | Wird als Entwurf gespeichert |
| GitHub Gist | Dateiname wird aus dem Titel generiert |
| Reddit | Titel (erste Zeile) + Body (Rest) werden getrennt |

---

## Datenschutz

- API-Keys werden ausschliesslich in `localStorage` gespeichert
- Keine Keys werden an ZenPost-Server uebertragen
- Posting-Requests gehen direkt von deiner App an die jeweilige Plattform-API
