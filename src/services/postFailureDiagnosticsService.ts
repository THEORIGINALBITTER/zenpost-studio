/**
 * Post-Fehlschlag-Diagnose — "Warum schlägt das Posten fehl?"
 *
 * Übersetzt rohe API-Fehlermeldungen (Twitter/Reddit/LinkedIn/dev.to/Medium/
 * GitHub) in eine wahrscheinliche Ursache + konkreten nächsten Schritt.
 * Deterministisches Pattern-Matching auf bekannte Fehlerklassen — kein LLM
 * nötig, die Muster sind über alle Plattformen hinweg ähnlich (Auth, Rate
 * Limit, Zeichenlimit, Berechtigung, Netzwerk).
 */

import type { SocialPlatform } from './socialMediaService';

export interface FailureDiagnosis {
  cause: string;
  suggestion: string;
}

export function diagnosePostFailure(platform: SocialPlatform, rawError: string): FailureDiagnosis | null {
  const msg = rawError.toLowerCase();

  if (/\b401\b/.test(msg) || msg.includes('unauthorized') || msg.includes('invalid token') || msg.includes('invalid_token') || (msg.includes('token') && msg.includes('expired'))) {
    return {
      cause: 'Der Zugangstoken ist abgelaufen oder ungültig.',
      suggestion: 'API-Zugangsdaten in den Einstellungen erneuern (neu verbinden/autorisieren).',
    };
  }

  if (/\b429\b/.test(msg) || msg.includes('rate limit') || msg.includes('too many requests')) {
    return {
      cause: `${platformLabel(platform)} hat gerade ein Rate-Limit erreicht.`,
      suggestion: 'Ein paar Minuten warten, dann erneut versuchen.',
    };
  }

  if (msg.includes('duplicate') || msg.includes('already exists') || msg.includes('already posted')) {
    return {
      cause: 'Dieser Inhalt wurde von der Plattform als Duplikat erkannt.',
      suggestion: `Prüfen, ob der Post nicht doch schon auf ${platformLabel(platform)} online ist, bevor erneut gesendet wird.`,
    };
  }

  if (msg.includes('too long') || msg.includes('character') && msg.includes('limit') || msg.includes('exceeds')) {
    return {
      cause: `Der Text überschreitet das Zeichenlimit von ${platformLabel(platform)}.`,
      suggestion: 'Text kürzen oder die automatische Formatierung/den Thread-Split nutzen.',
    };
  }

  if (/\b403\b/.test(msg) || msg.includes('forbidden') || msg.includes('permission') || msg.includes('scope')) {
    return {
      cause: `Fehlende Berechtigung für diese Aktion auf ${platformLabel(platform)}.`,
      suggestion: 'API-Zugriffsrechte/Scopes bei der Verbindung prüfen — evtl. neu autorisieren.',
    };
  }

  if (msg.includes('spam') || msg.includes('flagged')) {
    return {
      cause: `${platformLabel(platform)} hat den Beitrag vermutlich als Spam eingestuft.`,
      suggestion: 'Account-Reputation und Community-/Subreddit-Regeln prüfen.',
    };
  }

  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('timeout') || msg.includes('econnrefused')) {
    return {
      cause: 'Netzwerkproblem — die Anfrage ist nicht durchgekommen oder die Antwort nicht zurück.',
      suggestion: 'Internetverbindung prüfen. Vor einem erneuten Versuch checken, ob der Post trotzdem angekommen ist, um ein Duplikat zu vermeiden.',
    };
  }

  if (msg.includes('status unklar') || msg.includes('keine tweet-id') || msg.includes('keine post-id') || msg.includes('keine artikel-id') || msg.includes('keine discussion')) {
    return {
      cause: `${platformLabel(platform)} hat weder einen Fehler noch eine gültige Bestätigung zurückgegeben.`,
      suggestion: 'Auf der Plattform selbst nachschauen, ob der Post trotzdem angekommen ist, bevor erneut gesendet wird.',
    };
  }

  return null;
}

function platformLabel(platform: SocialPlatform): string {
  const labels: Record<SocialPlatform, string> = {
    twitter: 'Twitter/X',
    reddit: 'Reddit',
    linkedin: 'LinkedIn',
    devto: 'dev.to',
    medium: 'Medium',
    github: 'GitHub',
  };
  return labels[platform] ?? platform;
}
