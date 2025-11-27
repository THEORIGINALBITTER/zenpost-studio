# Social Media API Integration (Optional)

ZenPost Studio bietet **optionale** Unterstützung für direktes Posten auf verschiedene Social Media Plattformen über deren APIs.

> **Hinweis:** Die API-Integration ist vollständig optional! Du kannst die App auch ohne API-Konfiguration nutzen und den transformierten Content einfach kopieren und manuell posten.

## Unterstützte Plattformen

- ✅ **Twitter** - Tweets und Threads
- ✅ **Reddit** - Subreddit Posts
- ✅ **LinkedIn** - Professional Posts
- ✅ **dev.to** - Developer Articles
- ✅ **Medium** - Blog Posts
- ✅ **GitHub** - Discussions

## Architektur

### Service Layer

Die Social Media Integration basiert auf einem zentralen Service Layer:

**Datei:** `src/services/socialMediaService.ts`

Dieser Service bietet:
- Einheitliche API für alle Plattformen
- Credential-Verwaltung via LocalStorage
- Validierung von API-Konfigurationen
- Fehlerbehandlung und Rückgabewerte

### UI-Komponenten

**Settings Modal:** `src/kits/PatternKit/ZenModalSystem/modals/ZenSocialMediaSettingsModal.tsx`
- Multi-Tab Interface für jede Plattform
- Sichere Credential-Eingabe
- Visuelles Feedback für konfigurierte Plattformen

**Transform Result Screen:** `src/screens/transform-steps/Step4TransformResult.tsx`
- Integration des Post-Buttons
- Status-Anzeige für erfolgreiche/fehlgeschlagene Posts
- Link zum geposteten Content

## API-Credentials einrichten

### 1. Twitter API

1. Besuche [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Erstelle eine neue App
3. Generiere folgende Credentials:
   - API Key
   - API Secret
   - Access Token
   - Access Token Secret
   - Bearer Token (optional, für erweiterte Features)

**Erforderliche Permissions:**
- Read and Write
- Tweet and Retweet

### 2. Reddit API

1. Besuche [Reddit App Preferences](https://www.reddit.com/prefs/apps)
2. Klicke "Create App" oder "Create Another App"
3. Wähle "script" als App-Typ
4. Notiere dir:
   - Client ID (unter dem App-Namen)
   - Client Secret
   - Dein Reddit Username
   - Dein Reddit Passwort

**User Agent Format:** `ZenPostStudio/1.0`

### 3. LinkedIn API

1. Besuche [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Erstelle eine neue App
3. Generiere:
   - Client ID
   - Client Secret
   - Access Token (via OAuth 2.0 Flow)

**Erforderliche Scopes:**
- `w_member_social` - Post creation
- `r_basicprofile` - User info

### 4. dev.to API

1. Besuche [dev.to Settings](https://dev.to/settings/extensions)
2. Generiere einen neuen API Key
3. Kopiere den Key (wird nur einmal angezeigt!)

**Permissions:**
- Artikel erstellen und bearbeiten

### 5. Medium API

1. Besuche [Medium Settings](https://medium.com/me/settings/security)
2. Scrolle zu "Integration tokens"
3. Generiere einen neuen Token
4. Gib dem Token einen beschreibenden Namen

**Permissions:**
- Publish posts

### 6. GitHub API

1. Besuche [GitHub Tokens](https://github.com/settings/tokens)
2. Klicke "Generate new token (classic)"
3. Wähle folgende Scopes:
   - `repo` - Full control of repositories
   - `write:discussion` - Write discussions

**Hinweis:** Personal Access Tokens haben ein Ablaufdatum!

## Verwendung

### Option 1: Ohne API-Integration (Empfohlen für den Start)

1. Transformiere deinen Content für eine Plattform
2. Überprüfe das Ergebnis
3. Klicke "Kopieren" oder "Herunterladen"
4. Füge den Content manuell auf der Zielplattform ein

**Vorteile:**

- Keine API-Konfiguration erforderlich
- Keine Sicherheitsbedenken
- Volle Kontrolle über den Post
- Funktioniert sofort

### Option 2: Mit API-Integration (Optional)

#### 1. API-Credentials konfigurieren

1. Öffne die App
2. Nach einer Transformation klicke auf "API konfigurieren (optional)"
3. Wähle die Plattform aus den Tabs
4. Trage deine Credentials ein
5. Klicke "Save Settings"

#### 2. Content direkt posten

1. Transformiere deinen Content für eine Plattform
2. Überprüfe das Ergebnis
3. Klicke "Direkt posten"
4. Der Post wird erstellt und automatisch geöffnet

#### 3. Status überprüfen

Nach dem Posten siehst du:

- ✅ **Erfolg:** Grüne Box mit Link zum Post
- ❌ **Fehler:** Rote Box mit Fehlermeldung

## API-Funktionen im Detail

### Twitter

**Features:**
- Single Tweets (bis 280 Zeichen)
- Thread-Support (automatische Aufteilung)
- Media-Attachments (geplant)

**Content-Format:**
```typescript
{
  text: "Erster Tweet",
  thread: ["Zweiter Tweet", "Dritter Tweet"]
}
```

### Reddit

**Features:**
- Self-Posts mit Markdown
- Titel-Extraktion aus Content
- Subreddit-Auswahl

**Content-Format:**
```typescript
{
  subreddit: "webdev",
  title: "Mein Post Titel",
  text: "Post Inhalt in Markdown"
}
```

**Hinweis:** Aktuell ist das Subreddit hardcoded als "test". Für produktive Nutzung sollte dies konfigurierbar sein.

### LinkedIn

**Features:**
- Public, Connections oder Private Posts
- Rich Text Formatting
- Link Previews

**Content-Format:**
```typescript
{
  text: "Mein LinkedIn Post",
  visibility: "PUBLIC" | "CONNECTIONS" | "LOGGED_IN"
}
```

### dev.to

**Features:**
- Draft oder Published
- Tags und Series Support
- Canonical URL
- Markdown Support

**Content-Format:**
```typescript
{
  title: "Artikel Titel",
  body_markdown: "## Artikel Inhalt\n...",
  published: false,
  tags: ["webdev", "typescript"]
}
```

### Medium

**Features:**
- Draft, Public oder Unlisted
- Markdown oder HTML
- Tags Support
- Canonical URL

**Content-Format:**
```typescript
{
  title: "Post Titel",
  content: "Post Inhalt",
  contentFormat: "markdown",
  publishStatus: "draft"
}
```

### GitHub Discussions

**Features:**
- Repository Discussions
- Category Support
- Markdown mit Code-Blocks
- Mentions und Links

**Content-Format:**
```typescript
{
  owner: "username",
  repo: "repository",
  title: "Discussion Titel",
  body: "Discussion Inhalt",
  categoryId: "DIC_kwDOA..." // GraphQL ID
}
```

**Hinweis:** Die Category ID muss manuell aus der Repository-Konfiguration ermittelt werden.

## Sicherheitshinweise

⚠️ **WICHTIG:**

1. **LocalStorage ist NICHT sicher für Production:**
   - Credentials sind im Klartext im Browser
   - Zugriff über DevTools möglich
   - Keine Verschlüsselung

2. **Für Production empfohlen:**
   - Backend-Server mit sicherer Token-Speicherung
   - OAuth 2.0 Flow mit Token Refresh
   - Verschlüsselte Datenbank
   - Token-Rotation und Ablauf

3. **Best Practices:**
   - Verwende API-Keys nur in Entwicklung
   - Teile niemals deine Credentials
   - Rotiere Tokens regelmäßig
   - Überwache API-Nutzung

## Rate Limits

Jede Plattform hat unterschiedliche Rate Limits:

| Plattform | Rate Limit | Zeitfenster |
|-----------|------------|-------------|
| Twitter | 300 Tweets | 3 Stunden |
| Reddit | 60 Requests | 1 Minute |
| LinkedIn | 100 Posts | 1 Tag |
| dev.to | 30 Artikel | 30 Sekunden |
| Medium | 5 Posts | Unbekannt |
| GitHub | 5000 Requests | 1 Stunde |

**Hinweis:** Diese Limits können sich ändern. Prüfe die offizielle Dokumentation.

## Fehlerbehandlung

### Häufige Fehler

**401 Unauthorized:**
- Credentials sind ungültig
- Token ist abgelaufen
- Scope/Permissions fehlen

**429 Too Many Requests:**
- Rate Limit erreicht
- Warte und versuche es erneut

**403 Forbidden:**
- Fehlende Berechtigungen
- App nicht autorisiert

**400 Bad Request:**
- Ungültiges Content-Format
- Erforderliche Felder fehlen
- Zeichenlimit überschritten

### Debugging

1. **Console Logs prüfen:**
   ```javascript
   // In Browser DevTools > Console
   // Errors werden automatisch geloggt
   ```

2. **Network Tab prüfen:**
   - API-Requests inspizieren
   - Status Codes überprüfen
   - Response Bodies lesen

3. **Credentials validieren:**
   - Settings Modal öffnen
   - Alle Felder prüfen
   - Neu eingeben falls nötig

## Erweiterung für weitere Plattformen

### Neue Plattform hinzufügen

1. **Service erweitern** (`socialMediaService.ts`):
   ```typescript
   export interface NewPlatformConfig {
     apiKey: string;
     // ... weitere Felder
   }

   export async function postToNewPlatform(
     content: NewPlatformPostOptions,
     config: NewPlatformConfig
   ): Promise<PostResult> {
     // Implementation
   }
   ```

2. **Settings Modal erweitern** (`ZenSocialMediaSettingsModal.tsx`):
   - Neuen Tab hinzufügen
   - Config-Update-Funktion implementieren
   - Validierung hinzufügen

3. **Platform Mapping aktualisieren** (`Step4TransformResult.tsx`):
   ```typescript
   const platformMapping: Record<ContentPlatform, SocialPlatform | null> = {
     // ... bestehende Mappings
     'new-platform': 'newplatform',
   };
   ```

## Roadmap

### Geplante Features

- [ ] **OAuth 2.0 Flow**
  - Sichere Authentifizierung ohne manuelle Credential-Eingabe
  - Automatisches Token Refresh

- [ ] **Media Upload**
  - Bilder für Twitter, LinkedIn, Reddit
  - Videos für YouTube

- [ ] **Scheduling**
  - Posts für später planen
  - Best-Time-to-Post Vorschläge

- [ ] **Analytics**
  - Post-Performance tracking
  - Engagement-Metriken

- [ ] **Multi-Platform Posting**
  - Gleichzeitig auf mehreren Plattformen posten
  - Platform-spezifische Anpassungen

- [ ] **Instagram Integration**
  - Instagram Graph API
  - Story und Feed Posts

## Support & Troubleshooting

### Logs aktivieren

Setze in der Console:
```javascript
localStorage.setItem('debug', 'true');
```

### Community Support

- GitHub Issues: [Repository Issues](https://github.com/denisbitter/zenpost-studio/issues)
- Discord: Coming soon
- Email: saghallo@theoriginalbitter.de

## Lizenz

Die Social Media Integration ist Teil von ZenPost Studio und unterliegt der gleichen Lizenz wie das Hauptprojekt.

---

**Last Updated:** November 2025
**Version:** 1.0.0
