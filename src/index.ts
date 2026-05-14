import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchGoogleCalendarEvents } from './google-calendar.js';
import { fetchIcsCalendarEvents } from './ics-calendar.js';
import { calculateAvailability } from './availability.js';
import { generateHtml } from './generate-html.js';
import type { CalendarEvent } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DAYS_TO_FETCH = 30;

async function main(): Promise<void> {
  console.log('Fetching calendar events...');

  const timeMin = new Date();
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + DAYS_TO_FETCH);

  const allEvents: CalendarEvent[] = [];

  // Fetch Google Calendar events
  const googleServiceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const googleCalendarId1 = process.env.GOOGLE_CALENDAR_ID_1;
  const googleCalendarId2 = process.env.GOOGLE_CALENDAR_ID_2;

  if (googleServiceAccount && (googleCalendarId1 || googleCalendarId2)) {
    const calendarIds = [googleCalendarId1, googleCalendarId2].filter(Boolean) as string[];
    console.log(`Fetching events from ${calendarIds.length} Google Calendar(s)...`);

    try {
      const googleEvents = await fetchGoogleCalendarEvents(
        googleServiceAccount,
        calendarIds,
        timeMin,
        timeMax
      );
      console.log(`Found ${googleEvents.length} Google Calendar events`);
      allEvents.push(...googleEvents);
    } catch (error) {
      console.error('Failed to fetch Google Calendar events:', error);
    }
  } else {
    console.log('Skipping Google Calendar (missing credentials or calendar IDs)');
  }

  // Fetch events from generic ICS feed URLs (e.g. Outlook/M365 published calendars)
  const icsUrl1 = process.env.ICS_URL_1;
  const icsUrl2 = process.env.ICS_URL_2;
  const icsUrls = [icsUrl1, icsUrl2].filter(Boolean) as string[];

  if (icsUrls.length > 0) {
    console.log(`Fetching events from ${icsUrls.length} ICS feed(s)...`);

    try {
      const icsEvents = await fetchIcsCalendarEvents(icsUrls, timeMin, timeMax);
      console.log(icsEvents);
      console.log(`Found ${icsEvents.length} ICS events`);
      allEvents.push(...icsEvents);
    } catch (error) {
      console.error('Failed to fetch ICS events:', error);
    }
  } else {
    console.log('Skipping ICS feeds (no ICS URL configured)');
  }

  console.log(`Total events: ${allEvents.length}`);

  // Calculate availability
  console.log('Calculating availability...');
  const availability = calculateAvailability(allEvents, DAYS_TO_FETCH);

  // Generate HTML
  console.log('Generating HTML...');
  const html = generateHtml(availability);

  // Write output
  const publicDir = join(__dirname, '..', 'public');
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }

  const outputPath = join(publicDir, 'index.html');
  writeFileSync(outputPath, html, 'utf-8');
  console.log(`Written to ${outputPath}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
