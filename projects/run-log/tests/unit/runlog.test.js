import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pacePerMile, formatPace, formatDuration, formatMiles, weekStart, weekEnd, weekTotals, monthTotals,
  sortRuns, validateRun, chartPoints, csvCell, toCsv, loadRuns, saveRuns, STORAGE_KEY,
  validateGoal, goalProgress, loadGoal, saveGoal, GOAL_KEY,
} from '../../public/runlog.js';

// Wednesday 18 November 2026, local time. Week is Mon 16 to Sun 22.
const TODAY = new Date(2026, 10, 18, 10, 0);
const run = (date, distanceMi, seconds, extra = {}) => ({ id: date + distanceMi, date, distanceMi, seconds, avgHr: null, note: '', ...extra });
const RUNS = [
  run('2026-10-30', 6, 3420), // last month
  run('2026-11-02', 5, 3000), // this month, earlier week
  run('2026-11-14', 13.1, 7230), // Saturday of last week
  run('2026-11-16', 3.1, 1674), // Monday this week
  run('2026-11-17', 4, 2280), // Tuesday this week
  run('2026-11-23', 3, 1800), // next Monday: not this week
];

test('AC2 pacePerMile and formatPace: 3.1 mi in 27:54 is 9:00 /mi', () => {
  assert.equal(formatPace(pacePerMile(1674, 3.1)), '9:00');
  assert.equal(formatPace(pacePerMile(7230, 13.1)), '9:12');
  assert.equal(pacePerMile(100, 0), null);
  assert.equal(formatPace(null), '');
});

test('formatDuration shows h:mm:ss only when there are hours', () => {
  assert.equal(formatDuration(1674), '27:54');
  assert.equal(formatDuration(3954), '1:05:54');
  assert.equal(formatDuration(0), '0:00');
});

test('formatMiles trims trailing zeros', () => {
  assert.equal(formatMiles(3.1), '3.1');
  assert.equal(formatMiles(7.1000000001), '7.1');
  assert.equal(formatMiles(25.2), '25.2');
});

test('AC4 weekStart is Monday and weekEnd is Sunday', () => {
  assert.equal(weekStart(TODAY), '2026-11-16');
  assert.equal(weekEnd(TODAY), '2026-11-22');
  assert.equal(weekStart(new Date(2026, 10, 22)), '2026-11-16'); // Sunday stays in the same week
  assert.equal(weekStart(new Date(2026, 10, 16)), '2026-11-16');
  assert.equal(weekStart(new Date(2026, 11, 2)), '2026-11-30'); // crosses a month boundary
});

test('AC4 summarize this week counts only Monday to Sunday', () => {
  const w = weekTotals(RUNS, TODAY);
  assert.equal(w.count, 2);
  assert.equal(formatMiles(w.miles), '7.1');
  assert.equal(formatDuration(w.seconds), '1:05:54');
  assert.equal(formatPace(w.pace), '9:17');
});

test('AC5 summarize this month counts only the calendar month', () => {
  const m = monthTotals(RUNS.filter((r) => r.date !== '2026-11-23'), TODAY);
  assert.equal(m.count, 4);
  assert.equal(formatMiles(m.miles), '25.2');
  assert.equal(formatDuration(m.seconds), '3:56:24');
  assert.equal(formatPace(m.pace), '9:23');
});

test('AC12 totals with no runs have no pace', () => {
  const w = weekTotals([], TODAY);
  assert.deepEqual(w, { count: 0, miles: 0, seconds: 0, pace: null });
});

test('sortRuns puts newest first and does not change the input', () => {
  const copy = [...RUNS];
  assert.equal(sortRuns(RUNS)[0].date, '2026-11-23');
  assert.deepEqual(RUNS, copy);
});

test('AC1 validateRun accepts a full valid run', () => {
  const { run: r, errors } = validateRun({ date: '2026-11-17', distance: '3.1', hours: '', minutes: '27', seconds: '54', avgHr: '148', note: '  Easy loop  ' });
  assert.deepEqual(errors, {});
  assert.deepEqual(r, { date: '2026-11-17', distanceMi: 3.1, seconds: 1674, avgHr: 148, note: 'Easy loop' });
});

test('AC1 validateRun allows blank heart rate and note', () => {
  const { run: r } = validateRun({ date: '2026-11-17', distance: '10', hours: '1', minutes: '30', seconds: '' });
  assert.equal(r.seconds, 5400);
  assert.equal(r.avgHr, null);
  assert.equal(r.note, '');
});

test('AC3 validateRun rejects missing date, bad miles, bad time, and bad heart rate', () => {
  const bad = { date: '', distance: '0', hours: '', minutes: '', seconds: '', avgHr: '300', note: 'x'.repeat(281) };
  const { run: r, errors } = validateRun(bad);
  assert.equal(r, null);
  assert.deepEqual(Object.keys(errors).sort(), ['avgHr', 'date', 'distance', 'note', 'time']);
  assert.match(errors.time, /how long/);
});

test('AC3 validateRun rejects minutes or seconds over 59, decimals in time, and distance over 200', () => {
  assert.ok(validateRun({ date: '2026-11-17', distance: '3', minutes: '60', seconds: '0' }).errors.time);
  assert.ok(validateRun({ date: '2026-11-17', distance: '3', minutes: '20', seconds: '75' }).errors.time);
  assert.ok(validateRun({ date: '2026-11-17', distance: '3', minutes: '20.5', seconds: '0' }).errors.time);
  assert.ok(validateRun({ date: '2026-11-17', distance: '201', minutes: '20' }).errors.distance);
  assert.ok(validateRun({ date: '2026-11-17', distance: 'abc', minutes: '20' }).errors.distance);
  assert.ok(validateRun({ date: '2026-11-17', distance: '3', minutes: '20', avgHr: '20' }).errors.avgHr);
  assert.ok(validateRun({ date: 'not-a-date', distance: '3', minutes: '20' }).errors.date);
});

test('AC6 chartPoints are oldest first with pace in seconds per mile', () => {
  const pts = chartPoints(RUNS);
  assert.deepEqual(pts.map((p) => p.date), RUNS.map((r) => r.date));
  assert.equal(Math.round(pts[3].pace), 540);
});

test('AC7 csvCell quotes commas, quotes, and line breaks, and blocks formulas', () => {
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell('hills, wind'), '"hills, wind"');
  assert.equal(csvCell('said "go"'), '"said ""go"""');
  assert.equal(csvCell('a\nb'), '"a\nb"');
  assert.equal(csvCell('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(csvCell(null), '');
});

test('AC7 toCsv has a header and one row per run, oldest first', () => {
  const csv = toCsv([run('2026-11-16', 3.1, 1674, { avgHr: 148, note: 'hills, wind' }), run('2026-11-02', 5, 3000)]);
  assert.equal(csv,
    'date,distance_mi,time,pace_per_mi,avg_hr,note\r\n' +
    '2026-11-02,5,50:00,10:00,,\r\n' +
    '2026-11-16,3.1,27:54,9:00,148,"hills, wind"\r\n');
});

test('AC8 loadRuns and saveRuns round trip, and bad data loads as empty', () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  assert.deepEqual(loadRuns(storage), []);
  saveRuns(storage, RUNS);
  assert.deepEqual(loadRuns(storage), RUNS);
  store.set(STORAGE_KEY, '{not json');
  assert.deepEqual(loadRuns(storage), []);
  store.set(STORAGE_KEY, JSON.stringify([{ date: '2026-11-01', distanceMi: -1, seconds: 10 }, null]));
  assert.deepEqual(loadRuns(storage), []);
});

test('AC14 goalProgress: 7.1 of 20 miles is 35% with 12.9 to go', () => {
  const w = weekTotals(RUNS, TODAY);
  const p = goalProgress(w.miles, 20);
  assert.equal(p.percent, 35);
  assert.ok(Math.abs(p.fill - 0.355) < 1e-9);
  assert.equal(p.remaining, 12.9);
  assert.equal(p.met, false);
  assert.deepEqual(goalProgress(0, 20), { percent: 0, fill: 0, remaining: 20, met: false });
});

test('AC15 validateGoal accepts 1 to 500 miles and rejects anything else', () => {
  assert.deepEqual(validateGoal(' 20 '), { goal: 20, error: null });
  assert.deepEqual(validateGoal('12.345'), { goal: 12.35, error: null });
  assert.equal(validateGoal('1').goal, 1);
  assert.equal(validateGoal('500').goal, 500);
  for (const bad of ['', '0', '0.5', '-5', '501', 'abc', 'Infinity', null, undefined]) {
    const r = validateGoal(bad);
    assert.equal(r.goal, null, `rejects ${bad}`);
    assert.match(r.error, /from 1 to 500 miles/);
  }
});

test('AC16 loadGoal and saveGoal round trip, remove, and ignore bad data', () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  assert.equal(loadGoal(storage), null);
  saveGoal(storage, 25.5);
  assert.equal(loadGoal(storage), 25.5);
  saveGoal(storage, null);
  assert.equal(store.has(GOAL_KEY), false);
  assert.equal(loadGoal(storage), null);
  for (const bad of ['{oops', '"20"', '0', '9999']) {
    store.set(GOAL_KEY, bad);
    assert.equal(loadGoal(storage), null, `ignores ${bad}`);
  }
});

test('AC17 goalProgress at or past the goal is met, full, and never negative', () => {
  assert.deepEqual(goalProgress(20, 20), { percent: 100, fill: 1, remaining: 0, met: true });
  const over = goalProgress(25, 20);
  assert.equal(over.percent, 125);
  assert.equal(over.fill, 1);
  assert.equal(over.remaining, 0);
  assert.equal(over.met, true);
  // Just short of the goal never rounds up to 100% or met.
  const close = goalProgress(19.95, 20);
  assert.equal(close.percent, 99);
  assert.equal(close.met, false);
  assert.equal(close.remaining, 0.05);
  // Floating point sums that land on the goal count as met.
  assert.equal(goalProgress(0.1 + 0.2 + 2.7, 3).met, true);
});
