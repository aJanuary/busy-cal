import ical, { type VEvent } from "node-ical";
import type { CalendarEvent } from "./types.js";

export async function fetchIcsCalendarEvents(
  icsUrls: string[],
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];

  for (const url of icsUrls) {
    const data = await ical.async.fromURL(url);

    for (const component of Object.values(data)) {
      if (!component || component.type !== "VEVENT") {
        continue;
      }

      const vevent = component as VEvent;

      // Skip events marked as transparent (free)
      if (vevent.transparency === "TRANSPARENT") {
        continue;
      }

      // Skip cancelled events
      if (vevent.status === "CANCELLED") {
        continue;
      }

      const instances = ical.expandRecurringEvent(vevent, {
        from: timeMin,
        to: timeMax,
        expandOngoing: true,
      });

      for (const instance of instances) {
        if (instance.event.transparency === "TRANSPARENT") {
          continue;
        }
        if (instance.event.status === "CANCELLED") {
          continue;
        }
        events.push({
          start: new Date(instance.start),
          end: new Date(instance.end),
        });
      }
    }
  }

  return events;
}
