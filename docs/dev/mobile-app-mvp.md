# Mobile App MVP (ZenPost Companion)

Diese Spezifikation definiert die erste mobile Version als **Capture + Review + Publish Companion** und nicht als vollstaendige Desktop-Kopie.

## Zielbild

- Mobile ist fuer schnelle Erfassung, Review und Freigabe.
- Desktop/Web bleiben fuer tiefe Bearbeitung, grosse Exporte und Projekt-Scan.
- Offline-Eingaben auf Mobile duerfen nie verloren gehen.

## Produktumfang V1 (MVP)

### Kernfunktionen

1. Quick Capture
2. Inbox mit Status-Workflow
3. KI-Micro-Transforms
4. Review & Approve
5. Planner (mobil)
6. Publish Light
7. Zuverlaessige Sync + Offline Queue

### Nicht in V1

1. Voller Doc-Studio-Editor
2. Projektordner-Scan auf Geraet
3. Komplexes Multi-Tab Editing
4. Vollautomatisches API-Posting auf alle Plattformen

## Screen Set (MVP)

1. `Splash + Session Check`
- Kurzstart, Token/Session validieren, Offline-Fallback.

2. `Inbox`
- Liste aller Items (Idee, Entwurf, Review, Geplant, Veroeffentlicht).
- Filter nach Status/Plattform/Projekt.

3. `Quick Capture`
- Text, Voice-to-Text, Paste, Bild/Screenshot Import.
- Ein-Klick Speichern in Inbox.

4. `Draft Detail`
- Basiseditor (Titel, Inhalt, Tags, Plattform-Ziel).
- Aktionen: "Mit KI umschreiben", "In Review", "Planen".

5. `AI Transform Sheet`
- Presets: LinkedIn, X, Instagram, Blog Teaser.
- Ton: professionell/locker/technisch.
- Ergebnis als neue Draft-Version speichern.

6. `Review Queue`
- Vom Desktop erzeugte Entwuerfe auf Mobile pruefen.
- Aktionen: Approve, Kommentar, Zurueck an Bearbeitung.

7. `Planner`
- Tages/Wochenansicht.
- Slot verschieben, Datum/Zeit setzen, Reminder aktivieren.

8. `Publish Sheet`
- Copy-to-clipboard.
- Deeplinks zu Ziel-Apps (z. B. LinkedIn, X, Instagram).
- Statuswechsel zu `published` (manuell bestaetigt).

9. `Notifications & Reminders`
- Geplante Slots, ueberfaellige Reviews, Sync-Fehler.

10. `Settings`
- Account, Sync-Status, Sprache, Datenschutzhinweise, Cache leeren.

## Statusmodell

```txt
idea -> draft -> in_review -> approved -> scheduled -> published
```

- `rejected` und `archived` als Nebenstatus.
- Jeder Statuswechsel wird als Event gespeichert (Audit + Sync).

## Datenmodell (V1)

### `Idea`

```ts
type Idea = {
  id: string;
  projectId?: string;
  title?: string;
  rawInput: string;
  source: "text" | "voice" | "image" | "paste";
  tags: string[];
  createdAt: string;
  updatedAt: string;
  syncState: "local" | "pending" | "synced" | "error";
};
```

### `PostDraft`

```ts
type PostDraft = {
  id: string;
  projectId?: string;
  fromIdeaId?: string;
  title: string;
  body: string;
  platformTargets: Array<"linkedin" | "x" | "instagram" | "facebook" | "blog">;
  tone?: "professional" | "friendly" | "technical" | "casual";
  status: "draft" | "in_review" | "approved" | "scheduled" | "published" | "rejected" | "archived";
  version: number;
  createdAt: string;
  updatedAt: string;
  syncState: "local" | "pending" | "synced" | "error";
};
```

### `ReviewItem`

```ts
type ReviewItem = {
  id: string;
  draftId: string;
  requestedBy?: string;
  comment?: string;
  decision?: "approve" | "reject";
  decidedAt?: string;
  createdAt: string;
  updatedAt: string;
};
```

### `ScheduleItem`

```ts
type ScheduleItem = {
  id: string;
  draftId: string;
  plannedFor: string; // ISO datetime
  timezone: string;
  reminderMinutesBefore?: number;
  status: "scheduled" | "sent" | "missed" | "canceled";
  createdAt: string;
  updatedAt: string;
};
```

### `SyncEvent`

```ts
type SyncEvent = {
  id: string;
  entity: "idea" | "draft" | "review" | "schedule";
  entityId: string;
  action: "create" | "update" | "delete" | "status_change";
  payload: string; // JSON serialized diff
  createdAt: string;
  retryCount: number;
  lastError?: string;
};
```

## UX-Leitlinien

1. Maximal 2 Taps bis "Idee gespeichert".
2. Bottom-Navigation mit 4 Hauptpunkten: Inbox, Capture, Planner, Settings.
3. Touch Targets mindestens 44px.
4. Klarer Offline-Indikator mit Sync-Warteschlange.
5. Keine ueberladenen Formulare auf kleinen Screens.

## Technische Leitplanken

1. Stack: React Native + Expo + TypeScript.
2. Lokal: SQLite (oder Expo SQLite) fuer robuste Offline-Daten.
3. Sync: Event-Queue mit Retry/Backoff.
4. Shared Domain-Modelle mit Web/Desktop (gleiche TypeScript-Typen).
5. Auth: Token-basiert, sicher im Keychain/Keystore speichern.

## Delivery Plan

### Phase 1 (Woche 1-2)

1. Projektsetup, Navigation, lokale DB, Auth-Bootstrap.
2. Inbox + Quick Capture (Text/Paste), Basis-Sync.

### Phase 2 (Woche 3-4)

1. Draft Detail + AI Transform Sheet.
2. Review Queue + Statuswechsel-Flow.

### Phase 3 (Woche 5-6)

1. Planner + Reminder + Publish Light.
2. Stabilitaet, Telemetrie, Offline-Hardening.

### Phase 4 (Woche 7-8)

1. QA, Beta-Rollout, Crash/Sync-Monitoring.
2. KPI-Auswertung und Scope fuer V2.

## KPI fuer MVP

1. Capture-to-Saved < 10 Sekunden.
2. Sync-Erfolgsrate > 99%.
3. Absturzfreie Sessions > 99.5%.
4. Anteil geplanter Posts mit Reminder-Nutzung > 30%.

## Offene Entscheidungen

1. Native Social APIs in V1 oder strikt "Publish Light"?
2. Ein Projekt pro Nutzer oder Multi-Projekt bereits im MVP?
3. Review-Kommentare threaded oder nur ein einzelner Kommentar?
