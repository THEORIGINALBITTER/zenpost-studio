/**
 * Google Calendar Export Utility (.ics format)
 * @author Denis Bitter <contact@denisbitter.de>
 */

import type { ScheduledPost, SocialPlatform } from '../types/scheduling';

const PLATFORM_NAMES: Record<SocialPlatform, string> = {
  linkedin: 'LinkedIn',
  reddit: 'Reddit',
  github: 'GitHub',
  devto: 'Dev.to',
  medium: 'Medium',
  hashnode: 'Hashnode',
};

/**
 * Format date for iCalendar format (YYYYMMDDTHHmmss)
 */
const formatICalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
};

/**
 * Escape special characters for iCalendar text fields
 */
const escapeICalText = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

/**
 * Create a scheduled date from date and time strings
 */
const createScheduledDate = (dateStr: string, timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(dateStr);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

/**
 * Generate a unique UID for the calendar event
 */
const generateUID = (post: ScheduledPost): string => {
  return `${post.id}@zenpost.studio`;
};

/**
 * Create an iCalendar event from a scheduled post
 */
const createCalendarEvent = (post: ScheduledPost): string => {
  if (!post.scheduledDate || !post.scheduledTime || post.status !== 'scheduled') {
    return '';
  }

  const startDate = createScheduledDate(
    post.scheduledDate.toISOString().split('T')[0],
    post.scheduledTime
  );

  // Event lasts 30 minutes
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

  const now = new Date();
  const platformName = PLATFORM_NAMES[post.platform];

  // Truncate title if it's too long
  const title = post.title.length > 100 ? post.title.substring(0, 97) + '...' : post.title;

  const description = `Post auf ${platformName} veröffentlichen\n\n` +
    `Titel: ${post.title}\n` +
    `Plattform: ${platformName}\n` +
    `Zeichen: ${post.characterCount}\n` +
    `Wörter: ${post.wordCount}\n\n` +
    `Erstellt mit ZenPost Studio`;

  return [
    'BEGIN:VEVENT',
    `UID:${generateUID(post)}`,
    `DTSTAMP:${formatICalDate(now)}`,
    `DTSTART:${formatICalDate(startDate)}`,
    `DTEND:${formatICalDate(endDate)}`,
    `SUMMARY:${escapeICalText(`📱 ${platformName}: ${title}`)}`,
    `DESCRIPTION:${escapeICalText(description)}`,
    `STATUS:CONFIRMED`,
    `TRANSP:OPAQUE`,
    `CATEGORIES:ZenPost,Social Media,${platformName}`,
    `BEGIN:VALARM`,
    `TRIGGER:-PT15M`,
    `ACTION:DISPLAY`,
    `DESCRIPTION:In 15 Minuten: ${escapeICalText(title)}`,
    `END:VALARM`,
    'END:VEVENT',
  ].join('\r\n');
};

/**
 * Generate complete .ics file content
 */
export const generateICSFile = (scheduledPosts: ScheduledPost[]): string => {
  const events = scheduledPosts
    .filter(post => post.status === 'scheduled' && post.scheduledDate && post.scheduledTime)
    .map(post => createCalendarEvent(post))
    .filter(event => event !== '')
    .join('\r\n');

  if (!events) {
    throw new Error('Keine geplanten Posts zum Exportieren gefunden');
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ZenPost Studio//Content Calendar//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:ZenPost Studio - Content Calendar',
    'X-WR-TIMEZONE:Europe/Berlin',
    'X-WR-CALDESC:Geplante Social Media Posts aus ZenPost Studio',
    events,
    'END:VCALENDAR',
  ].join('\r\n');
};

/**
 * Download .ics file
 */
export const downloadICSFile = (scheduledPosts: ScheduledPost[], filename: string = 'zenpost-calendar.ics'): void => {
  try {
    const icsContent = generateICSFile(scheduledPosts);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating ICS file:', error);
    throw error;
  }
};

/**
 * Get statistics about scheduled posts
 */
export const getScheduleStats = (scheduledPosts: ScheduledPost[]) => {
  const scheduled = scheduledPosts.filter(p => p.status === 'scheduled');
  const drafts = scheduledPosts.filter(p => p.status === 'draft');

  const platformCounts: Record<SocialPlatform, number> = {
    linkedin: 0,
    reddit: 0,
    github: 0,
    devto: 0,
    medium: 0,
    hashnode: 0,
  };

  scheduled.forEach(post => {
    platformCounts[post.platform]++;
  });

  return {
    total: scheduledPosts.length,
    scheduled: scheduled.length,
    drafts: drafts.length,
    platformCounts,
    canExport: scheduled.length > 0,
  };
};
