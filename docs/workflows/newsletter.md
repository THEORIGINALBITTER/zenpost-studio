# Newsletter

ZenPost Studio integriert einen einfachen Newsletter-Workflow fuer selbst gehostete Mailing-Listen — ohne externen Dienst, direkt ueber deinen eigenen Webserver.

## Wie funktioniert es?

Du hostest 4 PHP-Skripte auf deinem Server. ZenPost Studio kommuniziert mit diesen Skripten zum Verwalten von Abonnenten und zum Versand von Benachrichtigungen.

**Datenfluss:**

```
ZenPost Studio → zenpost-upload.php → Server speichert Post
                                     ↓
                              newsletter-notify.php → E-Mail an alle Abonnenten
```

---

## Server-Einrichtung

### 1. PHP-Paket herunterladen

Einstellungen → Newsletter → **PHP Paket herunterladen**

Das Paket enthaelt:

| Datei | Funktion |
|-------|----------|
| `newsletter-subscribe.php` | Abonnenten eintragen (Double Opt-in) |
| `newsletter-unsubscribe.php` | Abonnenten austragen |
| `newsletter-confirm.php` | Bestaetigung nach Opt-in |
| `newsletter-notify.php` | Benachrichtigung bei neuem Post |

### 2. Dateien hochladen

Lade alle 4 Dateien in dein Blog-Verzeichnis hoch:

```
/zenpostapp/
  newsletter-subscribe.php
  newsletter-unsubscribe.php
  newsletter-confirm.php
  newsletter-notify.php
```

### 3. API-URL eintragen

Einstellungen → Newsletter → URL zu `newsletter-subscribe.php` eintragen:

```
https://meinserver.de/zenpostapp/newsletter-subscribe.php
```

### 4. SMTP konfigurieren (im PHP-Skript)

Oeffne `newsletter-notify.php` und trage deine SMTP-Daten ein:

```php
$smtp_host = 'smtp.meinserver.de';
$smtp_user = 'newsletter@meinserver.de';
$smtp_pass = 'meinPasswort';
$smtp_port = 587;
```

---

## Abonnenten-Verwaltung

Abonnenten werden in einer einfachen Textdatei (`subscribers.txt`) auf dem Server gespeichert — keine Datenbank benoetigt.

**Double Opt-in Ablauf:**

1. Besucher traegt E-Mail auf deiner Blog-Seite ein
2. `subscribe.php` speichert unbestaetigt + schickt Bestaetigungs-Mail
3. Besucher klickt Bestaetigung → `confirm.php` aktiviert Abonnement
4. Bei neuem Post: `notify.php` sendet E-Mail an alle aktiven Abonnenten

---

## Benachrichtigung ausloesen

Nach einem Server-Upload (Artikel auf Blog speichern) kann ZenPost Studio automatisch eine Newsletter-Benachrichtigung versenden:

Einstellungen → Newsletter → **"Newsletter bei Upload senden"** aktivieren

---

## Datenschutz & DSGVO

- E-Mail-Adressen werden ausschliesslich auf deinem Server gespeichert
- Double Opt-in ist standardmaessig aktiv (DSGVO-konform)
- Kein Drittanbieter — keine Daten verlassen deinen Server
- Abmelde-Link wird in jede E-Mail automatisch eingefuegt

---

## Fehlerbehebung

| Problem | Loesung |
|---------|---------|
| Keine Bestaetigunsmail | SMTP-Daten in `notify.php` pruefen |
| Subscribe schlaegt fehl | URL in Einstellungen pruefen, PHP-Fehlerlog ansehen |
| E-Mails landen im Spam | SPF/DKIM-Eintrag fuer deine Domain setzen |
| `subscribers.txt` nicht beschreibbar | Serverrechte pruefen (chmod 644) |
