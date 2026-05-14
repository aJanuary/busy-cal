import type { CalendarEvent, DaySummary, TimeSlot } from "./types.js";

const UK_TIMEZONE = "Europe/London";

function isWeekend(date: Date): boolean {
  const ukString = date.toLocaleString("en-GB", { timeZone: UK_TIMEZONE });
  const [datePart] = ukString.split(", ");
  const [day, month, year] = datePart.split("/").map(Number);
  const ukDate = new Date(year, month - 1, day);
  return ukDate.getDay() === 0 || ukDate.getDay() === 6;
}

function eventsOverlap(
  event: CalendarEvent,
  slotStart: Date,
  slotEnd: Date
): boolean {
  return event.start < slotEnd && event.end > slotStart;
}

function getBaseSlots(dayStart: Date): TimeSlot[] {
  const year = dayStart.getFullYear();
  const month = dayStart.getMonth();
  const day = dayStart.getDate();
  const weekend = isWeekend(dayStart);

  const slots: TimeSlot[] = [];

  // Asleep
  // 11pm previous day to 8am: not available (we handle this as 0am-8am for current day)
  slots.push({
    start: new Date(year, month, day, 0, 0),
    end: new Date(year, month, day, 8, 0),
    status: "not-available",
  });

  // Waking up
  // 8am-10am: potentially available (every day)
  slots.push({
    start: new Date(year, month, day, 8, 0),
    end: new Date(year, month, day, 10, 0),
    status: "potentially-available",
  });

  if (weekend) {
    // Available all day on weekends
    // Weekends: 10am-9pm available (calendar events can override)
    slots.push({
      start: new Date(year, month, day, 10, 0),
      end: new Date(year, month, day, 21, 0),
      status: "available",
    });
  } else {
    // Working in the morning.
    // Less likely to have unskipable meetings in the morning.
    // Wednesdays: 10am-12pm potentially available, 12pm-6pm available
    slots.push({
      start: new Date(year, month, day, 10, 0),
      end: new Date(year, month, day, 13, 0),
      status: "potentially-available",
    });

    const isWednesday = dayStart.getDay() === 3;

    if (isWednesday) {
      // Not working Wednesday afternoons
      slots.push({
        start: new Date(year, month, day, 13, 0),
        end: new Date(year, month, day, 18, 0),
        status: "available",
      });
    } else {
      // Likely to have meetings in the afternoon on other weekdays
      // 1pm-4:30pm: not available (core working hours)
      slots.push({
        start: new Date(year, month, day, 13, 0),
        end: new Date(year, month, day, 16, 30),
        status: "not-available",
      });
      // Can skip meetings in this timeslot if necessary
      // 4:30pm-6pm: potentially available
      slots.push({
        start: new Date(year, month, day, 16, 30),
        end: new Date(year, month, day, 18, 0),
        status: "potentially-available",
      });
    }
    const isThursday = dayStart.getDay() === 4;

    // Available in the evening
    // 6pm-9pm: available (calendar events can override)
    // Thursday evenings are only potentially available
    slots.push({
      start: new Date(year, month, day, 18, 0),
      end: new Date(year, month, day, 21, 0),
      status: isThursday ? "potentially-available" : "available",
    });
  }

  // Evening wind-down
  // 9pm-11pm: potentially available (every day)
  slots.push({
    start: new Date(year, month, day, 21, 0),
    end: new Date(year, month, day, 23, 0),
    status: "potentially-available",
  });

  // Asleep
  // 11pm-midnight: not available
  slots.push({
    start: new Date(year, month, day, 23, 0),
    end: new Date(year, month, day + 1, 0, 0),
    status: "not-available",
  });

  return slots;
}

function applyEventsToSlots(
  slots: TimeSlot[],
  events: CalendarEvent[]
): TimeSlot[] {
  const result: TimeSlot[] = [];

  for (const slot of slots) {
    // Skip "not-available" slots - they can't be changed by events
    if (slot.status === "not-available") {
      result.push(slot);
      continue;
    }

    // Check for overlapping events
    const overlappingEvents = events.filter((e) =>
      eventsOverlap(e, slot.start, slot.end)
    );

    if (overlappingEvents.length === 0) {
      result.push(slot);
      continue;
    }

    // Split the slot based on events - any event makes that time "not-available"
    const splitSlots = splitSlotByEvents(slot, overlappingEvents);
    result.push(...splitSlots);
  }

  return mergeAdjacentSlots(result);
}

function splitSlotByEvents(
  slot: TimeSlot,
  events: CalendarEvent[]
): TimeSlot[] {
  // Collect all time boundaries
  const boundaries = new Set<number>();
  boundaries.add(slot.start.getTime());
  boundaries.add(slot.end.getTime());

  for (const event of events) {
    const eventStart = Math.max(event.start.getTime(), slot.start.getTime());
    const eventEnd = Math.min(event.end.getTime(), slot.end.getTime());
    if (eventStart < eventEnd) {
      boundaries.add(eventStart);
      boundaries.add(eventEnd);
    }
  }

  const sortedTimes = Array.from(boundaries).sort((a, b) => a - b);
  const result: TimeSlot[] = [];

  for (let i = 0; i < sortedTimes.length - 1; i++) {
    const segmentStart = sortedTimes[i];
    const segmentEnd = sortedTimes[i + 1];

    // Check if any event covers this segment
    const hasEvent = events.some((e) => {
      const eventStart = e.start.getTime();
      const eventEnd = e.end.getTime();
      return eventStart <= segmentStart && eventEnd >= segmentEnd;
    });

    result.push({
      start: new Date(segmentStart),
      end: new Date(segmentEnd),
      status: hasEvent ? "not-available" : slot.status,
    });
  }

  return result;
}

function mergeAdjacentSlots(slots: TimeSlot[]): TimeSlot[] {
  if (slots.length === 0) {
    return [];
  }

  const result: TimeSlot[] = [{ ...slots[0] }];

  for (let i = 1; i < slots.length; i++) {
    const prev = result[result.length - 1];
    const curr = slots[i];

    if (
      prev.end.getTime() === curr.start.getTime() &&
      prev.status === curr.status
    ) {
      prev.end = curr.end;
    } else {
      result.push({ ...curr });
    }
  }

  return result;
}

export function calculateAvailability(
  events: CalendarEvent[],
  days: number
): DaySummary[] {
  const summaries: DaySummary[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const dayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + i
    );
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const dayEvents = events.filter((e) => eventsOverlap(e, dayStart, dayEnd));
    const baseSlots = getBaseSlots(dayStart);
    const slots = applyEventsToSlots(baseSlots, dayEvents);

    summaries.push({
      date: dayStart,
      slots,
    });
  }

  return summaries;
}
