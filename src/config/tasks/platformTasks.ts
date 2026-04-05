/**
 * Platform-specific publishing checklist tasks.
 * Each platform defines 3–5 concise, actionable steps.
 * Add / remove tasks here without touching the UI component.
 */

import type { SocialPlatform } from '../../types/scheduling';

export const PLATFORM_TASKS: Record<SocialPlatform, string[]> = {
  linkedin: [
    'Beitrag auf max. 3.000 Zeichen kürzen',
    'Hashtags hinzufügen (3–5 empfohlen)',
    'Bild oder Banner vorbereitet',
    'Optimalen Posting-Zeitpunkt gewählt',
  ],
  medium: [
    'Artikel-Titel und Untertitel finalisiert',
    'Cover-Bild hochgeladen',
    'Tags gesetzt (max. 5)',
    'Kanonische URL gesetzt (falls Crosspost)',
  ],
  reddit: [
    'Passendes Subreddit gewählt',
    'Titel optimiert (kein Clickbait)',
    'Flair ausgewählt',
    'Community-Regeln geprüft',
  ],
  devto: [
    'Tags gesetzt (max. 4)',
    'Cover-Bild gesetzt',
    'Kanonische URL gesetzt',
    'Als Draft gespeichert & Vorschau geprüft',
  ],
  github: [
    'Dateiendung korrekt gesetzt',
    'Gist als Public oder Secret gewählt',
    'Beschreibung hinzugefügt',
  ],
  twitter: [
    'Tweet auf max. 280 Zeichen kürzen',
    'Bild oder Video angehängt',
    'Hashtags eingefügt (max. 2)',
    'Thread-Format geprüft (falls nötig)',
  ],
  hashnode: [
    'Slug / URL-Pfad geprüft',
    'Tags gesetzt',
    'Cover-Bild hochgeladen',
    'Kanonische URL gesetzt (falls Crosspost)',
  ],
};
