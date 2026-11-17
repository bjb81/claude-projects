// Shared setup for the browser tests. The clock is fixed to Wednesday 18 November 2026
// (week Mon 16 to Sun 22), and any console error fails the test (AC13).
import { test, expect } from '@playwright/test';

export const KEY = 'runlog.v1';
export const NOW = new Date('2026-11-18T10:00:00');
export const run = (date, distanceMi, seconds, extra = {}) => ({ id: `${date}-${distanceMi}`, date, distanceMi, seconds, avgHr: null, note: '', ...extra });
export const RUNS = [
  run('2026-11-17', 4, 2280, { avgHr: 152, note: 'Tempo, windy' }),
  run('2026-11-16', 3.1, 1674, { avgHr: 141 }),
  run('2026-11-14', 13.1, 7230, { note: 'Long run' }),
  run('2026-11-02', 5, 3000),
  run('2026-10-30', 6, 3420),
];

/** Put runs in storage before the app loads (only once, so reloads keep later changes). */
export async function seed(page, runs) {
  await page.addInitScript(([key, data]) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem(key, data);
      sessionStorage.setItem('seeded', '1');
    }
  }, [KEY, JSON.stringify(runs)]);
}

export const stored = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]'), KEY);

/** AC13: call once per spec file. Fixes the clock and fails a test on any console or page error. */
export function useFixedClockAndNoConsoleErrors() {
  let consoleErrors;
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push(err.message));
    await page.clock.setFixedTime(NOW);
  });
  test.afterEach(() => {
    expect(consoleErrors, 'AC13 no console errors').toEqual([]);
  });
}
