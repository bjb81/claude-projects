// Browser tests for runs, totals, chart, and export: one or more per acceptance criterion in DESIGN.md.
// Weekly goal tests are in goal.spec.js. Shared setup is in helpers.js.
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { run, RUNS, seed, stored, useFixedClockAndNoConsoleErrors } from './helpers.js';

useFixedClockAndNoConsoleErrors();

test('AC1 add a run with every field', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Date')).toHaveValue('2026-11-18');
  await page.getByLabel('Distance (miles)').fill('3.1');
  await page.getByLabel('Minutes').fill('27');
  await page.getByLabel('Seconds').fill('54');
  await page.getByLabel('Average heart rate (bpm, optional)').fill('148');
  await page.getByLabel('Note (optional)').fill('Easy loop by the river');
  await page.getByRole('button', { name: 'Save run' }).click();

  await expect(page.locator('#status')).toHaveText('Run saved: 3.1 mi at 9:00 /mi.');
  const row = page.locator('.run');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Wed, Nov 18, 2026');
  await expect(row).toContainText('3.1 mi in 27:54, avg HR 148 bpm');
  await expect(row).toContainText('Easy loop by the river');
  await expect(page.getByLabel('Distance (miles)')).toHaveValue('');
  await expect(page.getByLabel('Date')).toHaveValue('2026-11-18');
});

test('AC2 shows pace for each run', async ({ page }) => {
  await seed(page, RUNS);
  await page.goto('/');
  await expect(page.locator('.run [data-pace]')).toHaveText(['9:30', '9:00', '9:12', '10:00', '9:30']);
});

test('AC3 bad input shows messages and saves nothing', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Date').fill('');
  await page.getByLabel('Distance (miles)').fill('0');
  await page.getByLabel('Average heart rate (bpm, optional)').fill('300');
  await page.getByRole('button', { name: 'Save run' }).click();

  await expect(page.locator('#date-error')).toHaveText('Pick the date of the run.');
  await expect(page.locator('#distance-error')).toContainText('more than 0');
  await expect(page.locator('#time-error')).toHaveText('Enter how long the run took.');
  await expect(page.locator('#avgHr-error')).toContainText('30 to 250');
  await expect(page.getByLabel('Distance (miles)')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.run')).toHaveCount(0);
  expect(await stored(page)).toEqual([]);

  // Minutes over 59 is caught, and fixing every field clears the messages.
  await page.getByLabel('Date').fill('2026-11-18');
  await page.getByLabel('Distance (miles)').fill('3');
  await page.getByLabel('Minutes').fill('75');
  await page.getByLabel('Average heart rate (bpm, optional)').fill('');
  await page.getByRole('button', { name: 'Save run' }).click();
  await expect(page.locator('#time-error')).toContainText('minutes 0 to 59');
  await expect(page.locator('#date-error')).toBeHidden();
  await page.getByLabel('Minutes').fill('30');
  await page.getByRole('button', { name: 'Save run' }).click();
  await expect(page.locator('#time-error')).toBeHidden();
  await expect(page.locator('.run')).toHaveCount(1);
});

test('AC4 and AC5 week and month totals', async ({ page }) => {
  await seed(page, [...RUNS, run('2026-11-23', 3, 1800)]); // next Monday is outside this week
  await page.goto('/');
  const week = page.locator('#week');
  await expect(week.locator('[data-range]')).toHaveText('Nov 16 to Nov 22');
  await expect(week.locator('[data-miles]')).toHaveText('7.1');
  await expect(week.locator('[data-count]')).toHaveText('2');
  await expect(week.locator('[data-time]')).toHaveText('1:05:54');
  await expect(week.locator('[data-pace]')).toHaveText('9:17 /mi');

  const month = page.locator('#month');
  await expect(month.locator('[data-range]')).toHaveText('November 2026');
  await expect(month.locator('[data-miles]')).toHaveText('28.2');
  await expect(month.locator('[data-count]')).toHaveText('5');
  await expect(month.locator('[data-time]')).toHaveText('4:26:24');
  await expect(month.locator('[data-pace]')).toHaveText('9:27 /mi');
});

test('AC6 chart draws one point per run in date order', async ({ page }) => {
  await seed(page, RUNS);
  await page.goto('/');
  const points = page.locator('#chart .pt');
  await expect(points).toHaveCount(5);
  const dates = await points.evaluateAll((els) => els.map((e) => e.dataset.date));
  expect(dates).toEqual(['2026-10-30', '2026-11-02', '2026-11-14', '2026-11-16', '2026-11-17']);
  const xs = await page.locator('#chart .dot').evaluateAll((els) => els.map((e) => Number(e.getAttribute('cx'))));
  expect(xs).toEqual([...xs].sort((a, b) => a - b));

  // Faster run (9:00) is drawn higher than the slower one (10:00).
  const ys = await page.locator('#chart .dot').evaluateAll((els) => els.map((e) => Number(e.getAttribute('cy'))));
  expect(ys[3]).toBeLessThan(ys[1]);

  await points.nth(3).focus();
  await expect(page.locator('#chart .tip')).toHaveText('Nov 16: 9:00 per mile, 3.1 miles');
});

test('AC6 chart empty state with fewer than two runs', async ({ page }) => {
  await seed(page, [RUNS[0]]);
  await page.goto('/');
  await expect(page.locator('#chart')).toContainText('Add one more to see your trend.');
  await expect(page.locator('#chart svg')).toHaveCount(0);
});

test('AC7 export downloads a CSV of all runs', async ({ page }) => {
  await seed(page, [run('2026-11-16', 3.1, 1674, { avgHr: 141, note: 'Hills, "hard" one\nsecond line' }), run('2026-11-02', 5, 3000)]);
  await page.goto('/');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('run-log-2026-11-18.csv');
  const text = await readFile(await download.path(), 'utf8');
  expect(text).toBe(
    'date,distance_mi,time,pace_per_mi,avg_hr,note\r\n' +
    '2026-11-02,5,50:00,10:00,,\r\n' +
    '2026-11-16,3.1,27:54,9:00,141,"Hills, ""hard"" one\nsecond line"\r\n');
});

test('AC8 runs survive a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Distance (miles)').fill('6.2');
  await page.getByLabel('Hours').fill('1');
  await page.getByLabel('Minutes').fill('0');
  await page.getByLabel('Seconds').fill('0');
  await page.getByRole('button', { name: 'Save run' }).click();
  await expect(page.locator('.run')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.run')).toHaveCount(1);
  await expect(page.locator('.run')).toContainText('6.2 mi in 1:00:00');
  await expect(page.locator('.run [data-pace]')).toHaveText('9:41');
});

test('AC9 delete a run updates list, totals, and chart', async ({ page }) => {
  await seed(page, RUNS);
  await page.goto('/');
  // Cancel first: nothing changes.
  page.once('dialog', (d) => d.dismiss());
  await page.getByRole('button', { name: 'Delete run on Tue, Nov 17, 2026' }).click();
  await expect(page.locator('.run')).toHaveCount(5);

  page.once('dialog', (d) => { expect(d.message()).toContain('Delete the 4 mile run'); d.accept(); });
  await page.getByRole('button', { name: 'Delete run on Tue, Nov 17, 2026' }).click();
  await expect(page.locator('.run')).toHaveCount(4);
  await expect(page.locator('#week [data-miles]')).toHaveText('3.1');
  await expect(page.locator('#week [data-count]')).toHaveText('1');
  await expect(page.locator('#chart .pt')).toHaveCount(4);
  expect((await stored(page)).length).toBe(4);
});

test('AC10 phone layout has no sideways scroll and big tap targets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, RUNS.map((r) => ({ ...r, note: r.note || 'A very long note without spaces: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' })));
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  // Check every visible control, then open the goal form and check its controls too.
  const tooSmall = () => page.locator('button:visible, input:visible, textarea:visible').evaluateAll((els) =>
    els.map((e) => ({ id: e.id || e.className || e.textContent, h: e.getBoundingClientRect().height, w: e.getBoundingClientRect().width }))
      .filter((b) => b.h < 44 || b.w < 44));
  expect(await tooSmall()).toEqual([]);
  await page.getByRole('button', { name: 'Set a weekly goal' }).click();
  await expect(page.getByRole('button', { name: 'Save goal' })).toBeVisible();
  expect(await tooSmall()).toEqual([]);
  await page.getByLabel('Weekly goal (miles)').fill('20');
  await page.getByRole('button', { name: 'Save goal' }).click();
  await expect(page.locator('#goal-progress')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  expect(await tooSmall()).toEqual([]);
  const hit = await page.locator('#chart .hit').first().boundingBox();
  expect(hit.height).toBeGreaterThanOrEqual(44);
});

test('AC11 note with HTML shows as plain text', async ({ page }) => {
  await page.goto('/');
  const evil = '<img src=x onerror="window.__xss=1"><b>bold</b>';
  await page.getByLabel('Distance (miles)').fill('2');
  await page.getByLabel('Minutes').fill('20');
  await page.getByLabel('Note (optional)').fill(evil);
  await page.getByRole('button', { name: 'Save run' }).click();
  await expect(page.locator('.run-note')).toHaveText(evil);
  await expect(page.locator('.run img, .run b')).toHaveCount(0);
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
});

test('AC12 empty state', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#empty')).toHaveText('No runs yet. Add your first run with the form.');
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  await expect(page.locator('#week [data-miles]')).toHaveText('0');
  await expect(page.locator('#week [data-pace]')).toHaveText('none');
  await expect(page.locator('#chart')).toContainText('once you log two runs');
});
