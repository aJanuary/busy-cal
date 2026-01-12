import { google } from 'googleapis';
import type { CalendarEvent } from './types.js';

export async function fetchGoogleCalendarEvents(
  serviceAccountJson: string,
  calendarIds: string[],
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEvent[]> {
  const credentials = JSON.parse(serviceAccountJson);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });

  const calendar = google.calendar({ version: 'v3', auth });
  const events: CalendarEvent[] = [];

  for (const calendarId of calendarIds) {
    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    for (const event of response.data.items || []) {
      if (!event.start || !event.end) {
        continue;
      }

      // Skip events marked as "free" (transparent)
      // "opaque" or undefined means busy
      if (event.transparency === 'transparent') {
        continue;
      }

      const isAllDay = !event.start.dateTime;
      const start = isAllDay
        ? new Date(event.start.date + 'T00:00:00')
        : new Date(event.start.dateTime!);
      const end = isAllDay
        ? new Date(event.end.date + 'T00:00:00')
        : new Date(event.end.dateTime!);

      events.push({ start, end });
    }
  }

  return events;
}
