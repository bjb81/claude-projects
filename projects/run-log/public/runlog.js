// Pure run log logic: no DOM access, so Node can unit test every function.

export const STORAGE_KEY = 'runlog.v1';
export const NOTE_MAX = 280;

/** Seconds per mile, or null when distance is not positive. */
export function pacePerMile(seconds, distanceMi) {
  if (!(distanceMi > 0)) return null;
  return seconds / distanceMi;
}

/** 3954 -> "1:05:54", 1674 -> "27:54". */
export function formatDuration(totalSeconds) {
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** Seconds per mile -> "9:00". Rounds to the nearest second. */
export function formatPace(secPerMile) {
  if (secPerMile == null || !Number.isFinite(secPerMile)) return '';
  const s = Math.round(secPerMile);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Miles with up to 2 decimals, no trailing zeros: 3.10 -> "3.1". */
export function formatMiles(mi) {
  return String(Math.round(mi * 100) / 100);
}

/** Local date as YYYY-MM-DD. */
export function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Monday of the week containing `date`, as YYYY-MM-DD. */
export function weekStart(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - daysSinceMonday);
  return toIsoDate(d);
}

/** Sunday of the week containing `date`, as YYYY-MM-DD. */
export function weekEnd(date) {
  const [y, m, d] = weekStart(date).split('-').map(Number);
  return toIsoDate(new Date(y, m - 1, d + 6));
}

/** Totals for runs whose date is in [from, to] inclusive (YYYY-MM-DD strings compare correctly). */
export function summarize(runs, from, to) {
  const inRange = runs.filter((r) => r.date >= from && r.date <= to);
  const miles = inRange.reduce((sum, r) => sum + r.distanceMi, 0);
  const seconds = inRange.reduce((sum, r) => sum + r.seconds, 0);
  return { count: inRange.length, miles, seconds, pace: pacePerMile(seconds, miles) };
}

export function weekTotals(runs, today) {
  return summarize(runs, weekStart(today), weekEnd(today));
}

export function monthTotals(runs, today) {
  const prefix = toIsoDate(today).slice(0, 7);
  return summarize(runs, `${prefix}-01`, `${prefix}-31`);
}

/** Newest first; same day keeps the most recently added first. */
export function sortRuns(runs) {
  return [...runs].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
}

const isWholeInRange = (n, lo, hi) => Number.isInteger(n) && n >= lo && n <= hi;

/**
 * Check raw form values (strings) and build a run.
 * Returns { run, errors } where errors maps field name to a message.
 */
export function validateRun(input) {
  const errors = {};
  const date = String(input.date ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    errors.date = 'Pick the date of the run.';
  }

  const distText = String(input.distance ?? '').trim();
  const distanceMi = Number(distText);
  if (distText === '' || !Number.isFinite(distanceMi) || distanceMi <= 0 || distanceMi > 200) {
    errors.distance = 'Enter miles as a number more than 0, for example 3.1.';
  }

  const part = (v) => (String(v ?? '').trim() === '' ? 0 : Number(v));
  const h = part(input.hours);
  const m = part(input.minutes);
  const s = part(input.seconds);
  if (!isWholeInRange(h, 0, 99) || !isWholeInRange(m, 0, 59) || !isWholeInRange(s, 0, 59)) {
    errors.time = 'Enter whole numbers: hours, minutes 0 to 59, seconds 0 to 59.';
  } else if (h * 3600 + m * 60 + s === 0) {
    errors.time = 'Enter how long the run took.';
  }

  const hrText = String(input.avgHr ?? '').trim();
  let avgHr = null;
  if (hrText !== '') {
    avgHr = Number(hrText);
    if (!isWholeInRange(avgHr, 30, 250)) errors.avgHr = 'Heart rate must be a whole number from 30 to 250, or left blank.';
  }

  const note = String(input.note ?? '').trim();
  if (note.length > NOTE_MAX) errors.note = `Keep the note to ${NOTE_MAX} characters.`;

  if (Object.keys(errors).length) return { run: null, errors };
  return {
    run: { date, distanceMi: Math.round(distanceMi * 100) / 100, seconds: h * 3600 + m * 60 + s, avgHr, note },
    errors,
  };
}

/** Chart data: runs oldest first with x as index and y as pace in seconds per mile. */
export function chartPoints(runs) {
  return [...sortRuns(runs)].reverse().map((r, i) => ({ i, date: r.date, pace: pacePerMile(r.seconds, r.distanceMi), run: r }));
}

/** Quote a CSV cell when needed and block spreadsheet formula injection. */
export function csvCell(value) {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** All runs as CSV text, oldest first, with a header row. Uses CRLF line ends for Excel. */
export function toCsv(runs) {
  const header = ['date', 'distance_mi', 'time', 'pace_per_mi', 'avg_hr', 'note'];
  const rows = [...sortRuns(runs)].reverse().map((r) => [
    r.date,
    formatMiles(r.distanceMi),
    formatDuration(r.seconds),
    formatPace(pacePerMile(r.seconds, r.distanceMi)),
    r.avgHr ?? '',
    r.note ?? '',
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** Read runs from a Storage-like object. Bad or missing data gives an empty list. */
export function loadRuns(storage) {
  try {
    const data = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(data) ? data.filter((r) => r && typeof r.date === 'string' && r.distanceMi > 0 && r.seconds > 0) : [];
  } catch {
    return [];
  }
}

export function saveRuns(storage, runs) {
  storage.setItem(STORAGE_KEY, JSON.stringify(runs));
}
