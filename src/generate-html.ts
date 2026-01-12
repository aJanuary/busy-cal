import type { DaySummary, TimeSlot, AvailabilityStatus } from './types.js';

interface SlotData {
  start: string;
  end: string;
  status: AvailabilityStatus;
}

function slotsToData(summaries: DaySummary[]): SlotData[] {
  const slots: SlotData[] = [];
  for (const day of summaries) {
    for (const slot of day.slots) {
      slots.push({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        status: slot.status,
      });
    }
  }
  return slots;
}

export function generateHtml(summaries: DaySummary[]): string {
  const slotsData = JSON.stringify(slotsToData(summaries));
  const lastUpdatedIso = new Date().toISOString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Availability</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      padding: 2rem;
      line-height: 1.5;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
    }

    header {
      margin-bottom: 2rem;
    }

    h1 {
      font-size: 1.875rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .updated {
      color: #64748b;
      font-size: 0.875rem;
    }

    .settings {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .setting {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .setting label {
      font-size: 0.875rem;
      color: #64748b;
    }

    .setting select {
      padding: 0.375rem 0.5rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      background: white;
    }

    .toggle-group {
      display: flex;
      border: 1px solid #cbd5e1;
      border-radius: 0.25rem;
      overflow: hidden;
    }

    .toggle-group button {
      padding: 0.375rem 0.75rem;
      border: none;
      background: white;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background-color 0.15s;
    }

    .toggle-group button:not(:last-child) {
      border-right: 1px solid #cbd5e1;
    }

    .toggle-group button.active {
      background: #3b82f6;
      color: white;
    }

    .toggle-group button:hover:not(.active) {
      background: #f1f5f9;
    }

    .days {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .day {
      background: white;
      border-radius: 0.5rem;
      padding: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .day.weekend {
      background: #f1f5f9;
    }

    .day h3 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
      color: #334155;
    }

    .summary-bar {
      display: flex;
      height: 1.5rem;
      border-radius: 0.25rem;
      overflow: hidden;
      margin-bottom: 0.75rem;
    }

    .summary-segment {
      height: 100%;
      cursor: pointer;
      box-sizing: border-box;
    }

    .summary-segment.highlighted {
      box-shadow: inset 0 0 0 2px #1d4ed8;
    }

    .slot {
      cursor: pointer;
    }

    .slot.highlighted {
      box-shadow: 0 0 0 2px #38bdf8;
    }

    .slots {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .slot {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
    }

    .time {
      font-family: ui-monospace, monospace;
      color: #475569;
    }

    .status {
      font-weight: 500;
    }

    @media (max-width: 640px) {
      body {
        padding: 1rem;
      }

      .settings {
        flex-direction: column;
        align-items: flex-start;
      }

      .slot {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Availability</h1>
      <p class="updated">Last updated: <span id="last-updated"></span></p>
      <div class="settings">
        <div class="setting">
          <label for="timezone">Timezone:</label>
          <select id="timezone"></select>
        </div>
        <div class="setting">
          <label>Time format:</label>
          <div class="toggle-group">
            <button id="format-12" type="button">12h</button>
            <button id="format-24" type="button">24h</button>
          </div>
        </div>
      </div>
    </header>

    <div id="days" class="days"></div>
  </div>

  <script>
    (function() {
      const SLOTS_DATA = ${slotsData};
      const LAST_UPDATED_ISO = '${lastUpdatedIso}';
      const DEFAULT_TIMEZONE = 'Europe/London';
      const DEFAULT_HOUR12 = false;

      const STATUS_COLORS = {
        'available': '#22c55e',
        'not-available': '#ef4444',
        'potentially-available': '#f59e0b'
      };

      const STATUS_LABELS = {
        'available': 'Available',
        'not-available': 'Not available',
        'potentially-available': 'Can be available if necessary'
      };

      const TIMEZONES = [
        { group: 'Europe', zones: ['Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Amsterdam', 'Europe/Rome', 'Europe/Madrid', 'Europe/Stockholm', 'Europe/Warsaw', 'Europe/Athens', 'Europe/Moscow'] },
        { group: 'Americas', zones: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Toronto', 'America/Vancouver', 'America/Sao_Paulo', 'America/Mexico_City'] },
        { group: 'Asia/Pacific', zones: ['Asia/Tokyo', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore', 'Asia/Seoul', 'Asia/Dubai', 'Asia/Kolkata', 'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland'] },
        { group: 'Other', zones: ['UTC'] }
      ];

      function detectHour12Preference() {
        try {
          const formatted = new Date().toLocaleTimeString(navigator.language);
          return /AM|PM/i.test(formatted);
        } catch {
          return DEFAULT_HOUR12;
        }
      }

      function detectTimezone() {
        try {
          return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
        } catch {
          return DEFAULT_TIMEZONE;
        }
      }

      function getAllZones() {
        const all = [];
        TIMEZONES.forEach(g => all.push(...g.zones));
        return all;
      }

      function populateTimezoneSelect(select, currentZone) {
        select.innerHTML = '';
        const allZones = getAllZones();

        if (currentZone && !allZones.includes(currentZone)) {
          const opt = document.createElement('option');
          opt.value = currentZone;
          opt.textContent = currentZone.replace(/_/g, ' ');
          select.appendChild(opt);
        }

        TIMEZONES.forEach(group => {
          const optgroup = document.createElement('optgroup');
          optgroup.label = group.group;
          group.zones.forEach(zone => {
            const opt = document.createElement('option');
            opt.value = zone;
            opt.textContent = zone.replace(/_/g, ' ').replace(/^.*\\//, '');
            optgroup.appendChild(opt);
          });
          select.appendChild(optgroup);
        });

        select.value = currentZone;
      }

      function getDateKey(isoString, timezone) {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-CA', { timeZone: timezone });
      }

      function getDayOfWeek(dateKey, timezone) {
        const date = new Date(dateKey + 'T12:00:00');
        return date.toLocaleDateString('en-GB', { timeZone: timezone, weekday: 'short' });
      }

      function isWeekend(dateKey) {
        const date = new Date(dateKey + 'T12:00:00');
        const day = date.getDay();
        return day === 0 || day === 6;
      }

      function formatTime(isoString, timezone, hour12) {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-GB', {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: hour12
        });
      }

      function formatDate(dateKey, timezone) {
        const date = new Date(dateKey + 'T12:00:00');
        return date.toLocaleDateString('en-GB', {
          timeZone: timezone,
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        });
      }

      function getSlotDurationMs(startIso, endIso) {
        return new Date(endIso).getTime() - new Date(startIso).getTime();
      }

      function formatDateTime(isoString, timezone, hour12) {
        const date = new Date(isoString);
        return date.toLocaleString('en-GB', {
          timeZone: timezone,
          dateStyle: 'full',
          timeStyle: 'short',
          hour12: hour12
        });
      }

      function getMidnightUtc(dateKey, timezone) {
        // Find the UTC time that corresponds to 00:00 on dateKey in the given timezone
        // Try hour offsets from -14 to +14 (covers all timezone offsets)
        for (let hourOffset = -14; hourOffset <= 14; hourOffset++) {
          const testDate = new Date(dateKey + 'T00:00:00Z');
          testDate.setUTCHours(testDate.getUTCHours() + hourOffset);

          const localDateStr = testDate.toLocaleDateString('en-CA', { timeZone: timezone });
          const localTimeStr = testDate.toLocaleTimeString('en-GB', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });

          if (localDateStr === dateKey && localTimeStr === '00:00') {
            return testDate.toISOString();
          }
        }
        // Fallback (shouldn't happen)
        return new Date(dateKey + 'T00:00:00Z').toISOString();
      }

      function getNextDay(dateKey) {
        const date = new Date(dateKey + 'T12:00:00Z');
        date.setUTCDate(date.getUTCDate() + 1);
        return date.toISOString().slice(0, 10);
      }

      function groupSlotsByDay(slots, timezone) {
        const days = new Map();

        for (const slot of slots) {
          const startKey = getDateKey(slot.start, timezone);
          const endKey = getDateKey(slot.end, timezone);

          if (startKey === endKey) {
            if (!days.has(startKey)) {
              days.set(startKey, []);
            }
            days.get(startKey).push(slot);
          } else {
            // Slot spans one or more midnights - split at each day boundary
            let currentStart = slot.start;
            let currentDayKey = startKey;

            while (currentDayKey !== endKey) {
              const nextDayKey = getNextDay(currentDayKey);
              const midnightIso = getMidnightUtc(nextDayKey, timezone);

              if (!days.has(currentDayKey)) {
                days.set(currentDayKey, []);
              }
              days.get(currentDayKey).push({
                start: currentStart,
                end: midnightIso,
                status: slot.status
              });

              currentStart = midnightIso;
              currentDayKey = nextDayKey;
            }

            // Add the final segment
            if (!days.has(endKey)) {
              days.set(endKey, []);
            }
            days.get(endKey).push({
              start: currentStart,
              end: slot.end,
              status: slot.status
            });
          }
        }

        // Sort days and slots within each day
        const sortedDays = Array.from(days.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        return sortedDays.map(([dateKey, daySlots]) => ({
          dateKey,
          slots: daySlots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        }));
      }

      function mergeAdjacentSlots(slots) {
        if (slots.length === 0) {
          return [];
        }

        // Filter out zero-duration slots (compare by timestamp, not string)
        const nonEmpty = slots.filter(s => new Date(s.start).getTime() !== new Date(s.end).getTime());
        if (nonEmpty.length === 0) {
          return [];
        }

        const result = [{ ...nonEmpty[0] }];

        for (let i = 1; i < nonEmpty.length; i++) {
          const prev = result[result.length - 1];
          const curr = nonEmpty[i];

          if (prev.end === curr.start && prev.status === curr.status) {
            prev.end = curr.end;
          } else {
            result.push({ ...curr });
          }
        }

        return result;
      }

      function render(timezone, hour12) {
        // Update last updated
        document.getElementById('last-updated').textContent = formatDateTime(LAST_UPDATED_ISO, timezone, hour12);

        // Group slots by day in the selected timezone
        const days = groupSlotsByDay(SLOTS_DATA, timezone);

        const daysContainer = document.getElementById('days');
        daysContainer.innerHTML = '';

        for (const day of days) {
          const mergedSlots = mergeAdjacentSlots(day.slots);
          if (mergedSlots.length === 0) {
            continue;
          }
          const weekend = isWeekend(day.dateKey);

          const dayEl = document.createElement('div');
          dayEl.className = weekend ? 'day weekend' : 'day';

          const header = document.createElement('h3');
          header.textContent = formatDate(day.dateKey, timezone);
          dayEl.appendChild(header);

          // Build list of visible slots and calculate total duration
          const visibleSlots = [];
          let totalDurationMs = 0;

          for (const slot of mergedSlots) {
            const startTimeStr = formatTime(slot.start, timezone, hour12);
            const endTimeStr = formatTime(slot.end, timezone, hour12);

            // Skip slots that display as same start/end time
            if (startTimeStr === endTimeStr) {
              continue;
            }

            const durationMs = getSlotDurationMs(slot.start, slot.end);
            totalDurationMs += durationMs;
            visibleSlots.push({ ...slot, startTimeStr, endTimeStr, durationMs });
          }

          // If no visible slots, create a full day "Not available" slot
          if (visibleSlots.length === 0) {
            const midnightStart = getMidnightUtc(day.dateKey, timezone);
            const nextDayKey = getNextDay(day.dateKey);
            const midnightEnd = getMidnightUtc(nextDayKey, timezone);
            const durationMs = getSlotDurationMs(midnightStart, midnightEnd);
            totalDurationMs = durationMs;
            visibleSlots.push({
              start: midnightStart,
              end: midnightEnd,
              status: 'not-available',
              startTimeStr: formatTime(midnightStart, timezone, hour12),
              endTimeStr: formatTime(midnightEnd, timezone, hour12),
              durationMs
            });
          }

          // Create summary bar
          const summaryBar = document.createElement('div');
          summaryBar.className = 'summary-bar';

          const segments = [];
          const slotElements = [];

          visibleSlots.forEach((slot, index) => {
            const percentage = (slot.durationMs / totalDurationMs) * 100;
            const segment = document.createElement('div');
            segment.className = 'summary-segment';
            segment.style.width = percentage + '%';
            segment.style.backgroundColor = STATUS_COLORS[slot.status];
            segment.dataset.slotIndex = index;
            summaryBar.appendChild(segment);
            segments.push(segment);
          });

          dayEl.appendChild(summaryBar);

          // Create slots list
          const slotsContainer = document.createElement('div');
          slotsContainer.className = 'slots';

          visibleSlots.forEach((slot, index) => {
            const color = STATUS_COLORS[slot.status];
            const label = STATUS_LABELS[slot.status];

            const slotEl = document.createElement('div');
            slotEl.className = 'slot';
            slotEl.style.backgroundColor = color + '20';
            slotEl.style.borderLeft = '4px solid ' + color;
            slotEl.dataset.slotIndex = index;

            const timeEl = document.createElement('span');
            timeEl.className = 'time';
            timeEl.textContent = slot.startTimeStr + ' - ' + slot.endTimeStr;
            slotEl.appendChild(timeEl);

            const statusEl = document.createElement('span');
            statusEl.className = 'status';
            statusEl.style.color = color;
            statusEl.textContent = label;
            slotEl.appendChild(statusEl);

            slotsContainer.appendChild(slotEl);
            slotElements.push(slotEl);
          });

          // Add hover interactions
          function highlightSlot(index) {
            segments[index].classList.add('highlighted');
            slotElements[index].classList.add('highlighted');
          }

          function clearHighlight(index) {
            segments[index].classList.remove('highlighted');
            slotElements[index].classList.remove('highlighted');
          }

          segments.forEach((segment, index) => {
            segment.addEventListener('mouseenter', () => highlightSlot(index));
            segment.addEventListener('mouseleave', () => clearHighlight(index));
          });

          slotElements.forEach((slotEl, index) => {
            slotEl.addEventListener('mouseenter', () => highlightSlot(index));
            slotEl.addEventListener('mouseleave', () => clearHighlight(index));
          });

          dayEl.appendChild(slotsContainer);
          daysContainer.appendChild(dayEl);
        }
      }

      function savePreferences(timezone, hour12) {
        try {
          localStorage.setItem('availability-timezone', timezone);
          localStorage.setItem('availability-hour12', hour12 ? 'true' : 'false');
        } catch {}
      }

      function loadPreferences() {
        let timezone = DEFAULT_TIMEZONE;
        let hour12 = DEFAULT_HOUR12;

        try {
          const savedTz = localStorage.getItem('availability-timezone');
          const savedHour12 = localStorage.getItem('availability-hour12');

          if (savedTz) {
            timezone = savedTz;
          } else {
            timezone = detectTimezone();
          }

          if (savedHour12 !== null) {
            hour12 = savedHour12 === 'true';
          } else {
            hour12 = detectHour12Preference();
          }
        } catch {
          timezone = detectTimezone();
          hour12 = detectHour12Preference();
        }

        return { timezone, hour12 };
      }

      // Initialize
      const prefs = loadPreferences();
      let currentTimezone = prefs.timezone;
      let currentHour12 = prefs.hour12;

      const timezoneSelect = document.getElementById('timezone');
      const format12Btn = document.getElementById('format-12');
      const format24Btn = document.getElementById('format-24');

      populateTimezoneSelect(timezoneSelect, currentTimezone);

      function updateFormatButtons() {
        format12Btn.classList.toggle('active', currentHour12);
        format24Btn.classList.toggle('active', !currentHour12);
      }

      updateFormatButtons();
      render(currentTimezone, currentHour12);

      timezoneSelect.addEventListener('change', function() {
        currentTimezone = this.value;
        savePreferences(currentTimezone, currentHour12);
        render(currentTimezone, currentHour12);
      });

      format12Btn.addEventListener('click', function() {
        currentHour12 = true;
        updateFormatButtons();
        savePreferences(currentTimezone, currentHour12);
        render(currentTimezone, currentHour12);
      });

      format24Btn.addEventListener('click', function() {
        currentHour12 = false;
        updateFormatButtons();
        savePreferences(currentTimezone, currentHour12);
        render(currentTimezone, currentHour12);
      });
    })();
  </script>
</body>
</html>`;
}
