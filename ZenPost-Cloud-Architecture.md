# ZenPost Studio · Cloud & Sync Architektur

> Interne Planung · Stand März 2026

---

## Vision

ZenPost Studio ist eine Desktop-App — und wird es bleiben.
Die Web-Version ist eine Ergänzung: gleiche Kraft, überall erreichbar.
Deine Daten gehören dir. Nicht uns.

---

## Das Problem

Browser-Apps können keine Dateien auf dem eigenen Rechner speichern.
Eine Web-Version ohne Server bedeutet: Daten weg beim Tab schließen.
Ein Server mit Lesezugriff bedeutet: Daten beim Anbieter — das wollen wir nicht.

---

## Die Lösung: Zero-Knowledge Sync

**Wir hosten den Server. Wir können deine Daten nicht lesen.**

Das ist kein Marketingversprechen — es ist technisch erzwungen.

```
Dein Passwort
     ↓
Schlüssel wird abgeleitet (PBKDF2 · nur in deinem Browser)
     ↓
Dein Text wird verschlüsselt (AES-256-GCM · im Browser)
     ↓
Server speichert unlesbaren Ciphertext
     ↓
Nur du kannst entschlüsseln — mit deinem Passwort
```

Selbst wenn jemand unsere Datenbank stiehlt:
Er sieht nur `xK92mP3#Lq...` — niemals deinen Artikel.

---

## Technologie

| Schicht | Technologie | Warum |
|---|---|---|
| Verschlüsselung | Web Crypto API (AES-256-GCM) | Im Browser eingebaut, kein Extra-Package |
| Schlüsselableitung | PBKDF2 (100.000 Iterationen) | Passwort → sicherer Key |
| Transport | HTTPS | Verbindung zum Server verschlüsselt |
| Server | PHP + MySQL | Einfach, weit verbreitet, selbst hostbar |
| Auth | API-Key pro User | Kein Session-Chaos |

---

## Was gespeichert wird

```sql
zen_users
  id · username · email · password_hash · api_key · created_at · last_login

zen_documents
  id · user_id · title_encrypted · content_encrypted · platform · updated_at

zen_autosaves
  id · user_id · doc_key · content_encrypted · created_at

zen_settings
  id · user_id · key · value_encrypted · updated_at

zen_images
  id · user_id · filename · url · size_bytes · created_at
```

Alles was inhaltlich ist: verschlüsselt.
Metadaten (Zeitstempel, Plattform): nicht verschlüsselt — für Sync nötig.

---

## User Flow

### Registrierung
1. Name, E-Mail, Passwort eingeben
2. Browser leitet Schlüssel ab (PBKDF2) — verlässt den Browser nie
3. Passwort-Hash geht zum Server (bcrypt)
4. API-Key wird generiert und zurückgegeben
5. ZenPost speichert API-Key lokal

### Tägliche Nutzung
1. Einloggen → Schlüssel wird neu abgeleitet
2. Dokumente laden → im Browser entschlüsseln → sichtbar
3. Schreiben → Autosave alle X Sekunden → verschlüsselt zum Server
4. Bilder droppen → auf Server hochladen → URL im Dokument

### Passwort vergessen
> Hier ist die ehrliche Wahrheit: **Wir können das Passwort nicht zurücksetzen.**
> Weil wir den Schlüssel nicht haben. Die Daten bleiben verschlüsselt.
> Recovery Key beim Registrieren ausdrucken — einzige Option.

---

## Was wir NICHT speichern

- Klartext-Inhalte
- Passwörter (nur Hash)
- Verschlüsselungsschlüssel
- Browserdaten / Tracking

---

## Für den User (Marketingtext)

> **Deine Texte gehören dir — wirklich.**
>
> ZenPost Cloud verschlüsselt alles in deinem Browser,
> bevor ein einziges Byte unseren Server erreicht.
> Wir sehen nur unlesbaren Code — niemals deinen Inhalt.
> Nicht weil wir es versprechen. Sondern weil es technisch unmöglich ist.

---

## Test Stage Plan

### Phase 1 · Fundament (intern)
- [ ] PHP Connector aufbauen (`zenpost-api.php`)
- [ ] SQL Schema anlegen und testen
- [ ] Web Crypto Modul in ZenPost integrieren
- [ ] Registrierung + Login im Browser
- [ ] Dokument speichern + laden (verschlüsselt)

### Phase 2 · Closed Beta
- [ ] 5–10 Tester einladen (bekannte User)
- [ ] Feedback zu UX: Registrierung, Sync-Verhalten
- [ ] Monitoring: Fehler, Performance, DB-Last
- [ ] Recovery Key Flow testen

### Phase 3 · Public Beta
- [ ] Server-Skalierung prüfen
- [ ] Datenschutzerklärung anpassen (Zero-Knowledge explizit)
- [ ] Pricing entscheiden (Free Tier? Storage-Limit?)
- [ ] Onboarding-Flow polieren

### Phase 4 · Launch
- [ ] Stable Release
- [ ] Dokumentation für User
- [ ] Support-Kanal

---

## Entscheidungen ✓

| Thema | Entscheidung |
|---|---|
| **Pricing** | Free: 50 Dokumente · Paid: unbegrenzt |
| **Bild-Storage** | Verschlüsselt — sonst ist Zero-Knowledge unglaubwürdig |
| **Export** | Vollständiger ZIP-Export (DSGVO-konform) |
| **Desktop ↔ Web Sync** | Ja — Standard-Feature, größte technische Herausforderung |

---

## Pricing Modell

```
FREE
├── 50 Dokumente
├── Bilder bis 500 MB gesamt
├── Autosave (letzte 5 Versionen)
└── ZIP-Export immer inklusive

PRO (Paid)
├── Unbegrenzte Dokumente
├── Bilder bis 10 GB
├── Autosave (unbegrenzte History)
├── Desktop ↔ Web Sync
└── Prioritäts-Support
```

---

## Bild-Verschlüsselung

Bilder werden wie Dokumente behandelt — kein Sonderfall:

```
Bild droppen im Browser
        ↓
ArrayBuffer → AES-256-GCM verschlüsseln (im Browser)
        ↓
Encrypted Blob → Server speichert als Binärdatei
        ↓
Beim Laden: Server gibt Blob → Browser entschlüsselt → blob:// URL
```

Kein öffentlicher Bild-Link. Niemand kann Bilder ohne Account sehen.

---

## ZIP-Export (DSGVO)

User kann jederzeit alles exportieren:

```
ZIP enthält:
├── documents/
│   ├── artikel-1.md       ← entschlüsselt
│   ├── entwurf-2.md
│   └── ...
├── images/
│   ├── foto-1.jpg         ← entschlüsselt
│   └── ...
├── autosaves/
│   └── ...
└── settings.json
```

Entschlüsselung passiert im Browser — Server bekommt nie den Klartext.
Export = letzter Beweis dass die Daten wirklich dem User gehören.

---

## Desktop ↔ Web Sync · Die große Herausforderung

### Das Problem

```
Desktop App                    Web Browser
(Tauri · Dateisystem)    vs    (Cloud · verschlüsselt)

/Users/denis/projekt/          zen_documents (AES-256)
  artikel.md                   xK92mP3#Lq...
```

Zwei völlig verschiedene Speicher-Welten müssen synchron bleiben.

### Konflikt-Szenarien

```
1. Offline-Edit:
   Desktop editiert artikel.md ohne Internet
   Web editiert dasselbe Dokument parallel
   → Wer gewinnt? Merge? User fragen?

2. Neue Datei lokal:
   Desktop erstellt neue .md Datei im Ordner
   → Automatisch in Cloud hochladen?

3. Gelöschte Datei:
   Desktop löscht artikel.md
   → Auch in Cloud löschen? Oder als Backup behalten?
```

### Lösungsansatz: Last-Write-Wins + Conflict Copy

```
Jedes Dokument hat:
  updated_at (Timestamp)
  checksum   (MD5 des Inhalts)

Sync-Logik:
  lokal.updated_at > cloud.updated_at → lokal gewinnt → hochladen
  cloud.updated_at > lokal.updated_at → cloud gewinnt → runterladen
  beide geändert (conflict) → Conflict Copy anlegen, User entscheiden
```

### Sync in der Desktop-App

```
Desktop startet
    ↓
Cloud-Account verbunden? (API-Key in Einstellungen)
    ↓
Background Sync alle 60 Sekunden
    ↓
Änderungen → verschlüsseln → hochladen
Cloud-Änderungen → runterladen → entschlüsseln → Datei schreiben
```

---

## Nächste Schritte

### Phase 1 · Fundament (intern)
- [ ] PHP Connector aufbauen (`zenpost-api.php`)
- [ ] SQL Schema anlegen und testen
- [ ] Web Crypto Modul in ZenPost integrieren
- [ ] Registrierung + Login im Browser
- [ ] Dokument speichern + laden (verschlüsselt)
- [ ] Bild-Upload verschlüsselt
- [ ] ZIP-Export implementieren

### Phase 2 · Desktop Sync
- [ ] Sync-Service in Tauri (Background Worker)
- [ ] Conflict Detection + Resolution UI
- [ ] Offline-Queue (Änderungen puffern bis Online)

### Phase 3 · Closed Beta
- [ ] 5–10 Tester einladen
- [ ] Feedback: Registrierung, Sync-Verhalten, Konflikte
- [ ] Monitoring + Performance

### Phase 4 · Public Beta + Launch
- [ ] Datenschutzerklärung (Zero-Knowledge explizit)
- [ ] Onboarding-Flow
- [ ] Pricing aktivieren

---

*Erstellt mit ZenPost Studio · Nur für interne Nutzung*
