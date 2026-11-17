// Browser tests for the weekly mileage goal (AC14 to AC19 in DESIGN.md).
import { test, expect } from '@playwright/test';
import { RUNS, seed, stored, useFixedClockAndNoConsoleErrors } from './helpers.js';

useFixedClockAndNoConsoleErrors();

// Weekly goal. This week (Mon 16 to Sun 22 Nov) has 7.1 miles in RUNS.
const goalBar = (page) => page.getByRole('progressbar', { name: 'Weekly goal progress' });
const fillWidth = (page) => page.locator('#goal-fill').evaluate((e) => e.style.width);

async function setGoal(page, miles) {
  await page.locator('#goal-edit').click();
  await page.getByLabel('Weekly goal (miles)').fill(String(miles));
  await page.getByRole('button', { name: 'Save goal' }).click();
}

test('AC14 set a weekly goal and see progress on the This week card', async ({ page }) => {
  await seed(page, RUNS);
  await page.goto('/');
  const week = page.locator('#week');
  await expect(goalBar(page)).toBeHidden();
  await week.getByRole('button', { name: 'Set a weekly goal' }).click();
  await expect(page.getByLabel('Weekly goal (miles)')).toBeFocused();
  await page.getByLabel('Weekly goal (miles)').fill('20');
  await page.getByRole('button', { name: 'Save goal' }).click();

  await expect(week.locator('#goal-status')).toHaveText('Weekly goal saved: 20 miles.');
  await expect(week.locator('#goal-text')).toHaveText('7.1 of 20 mi (35%)');
  await expect(week.locator('#goal-left')).toHaveText('12.9 mi to go');
  await expect(goalBar(page)).toHaveAttribute('aria-valuenow', '7.1');
  await expect(goalBar(page)).toHaveAttribute('aria-valuemax', '20');
  await expect(goalBar(page)).toHaveAttribute('aria-valuetext', '7.1 of 20 miles, 35%');
  expect(await fillWidth(page)).toBe('35.5%');
  await expect(page.getByLabel('Weekly goal (miles)')).toBeHidden();
  await expect(week.getByRole('button', { name: 'Change goal' })).toBeVisible();
});

test('AC15 bad goal shows a message and keeps the old goal', async ({ page }) => {
  await seed(page, RUNS);
  await page.goto('/');
  await page.getByRole('button', { name: 'Set a weekly goal' }).click();
  for (const bad of ['', '0', '-3', '501']) {
    await page.getByLabel('Weekly goal (miles)').fill(bad);
    await page.getByRole('button', { name: 'Save goal' }).click();
    await expect(page.locator('#goal-error')).toHaveText('Enter a goal from 1 to 500 miles, for example 20.');
    await expect(page.getByLabel('Weekly goal (miles)')).toHaveAttribute('aria-invalid', 'true');
  }
  await expect(goalBar(page)).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('runlog.goal.v1'))).toBeNull();

  // With a goal saved, a bad change keeps it; Cancel closes the form and clears the message.
  await page.getByLabel('Weekly goal (miles)').fill('20');
  await page.getByRole('button', { name: 'Save goal' }).click();
  await page.getByRole('button', { name: 'Change goal' }).click();
  await expect(page.getByLabel('Weekly goal (miles)')).toHaveValue('20');
  await page.getByLabel('Weekly goal (miles)').fill('900');
  await page.getByRole('button', { name: 'Save goal' }).click();
  await expect(page.locator('#goal-error')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('#goal-error')).toBeHidden();
  await expect(page.locator('#goal-text')).toHaveText('7.1 of 20 mi (35%)');
  expect(await page.evaluate(() => localStorage.getItem('runlog.goal.v1'))).toBe('20');
});

test('AC16 goal survives a reload, can be changed, and can be removed', async ({ page }) => {
  await seed(page, RUNS);
  await page.goto('/');
  await setGoal(page, 20);
  await page.reload();
  await expect(page.locator('#goal-text')).toHaveText('7.1 of 20 mi (35%)');

  await setGoal(page, 10);
  await expect(page.locator('#goal-text')).toHaveText('7.1 of 10 mi (71%)');
  await expect(page.locator('#goal-left')).toHaveText('2.9 mi to go');

  await page.getByRole('button', { name: 'Change goal' }).click();
  await page.getByRole('button', { name: 'Remove goal' }).click();
  await expect(page.locator('#goal-status')).toHaveText('Weekly goal removed.');
  await expect(goalBar(page)).toBeHidden();
  await expect(page.getByRole('button', { name: 'Set a weekly goal' })).toBeVisible();
  await page.reload();
  await expect(goalBar(page)).toBeHidden();
  // Runs are untouched by goal changes.
  expect((await stored(page)).length).toBe(5);
});

test('AC17 reaching the goal fills the bar and says goal met', async ({ page }) => {
  await seed(page, RUNS);
  await page.goto('/');
  await setGoal(page, 5);
  await expect(page.locator('#goal-text')).toHaveText('7.1 of 5 mi (142%)');
  await expect(page.locator('#goal-left')).toHaveText('Goal met');
  await expect(goalBar(page)).toHaveAttribute('aria-valuenow', '5');
  expect(await fillWidth(page)).toBe('100%');
  // The fill never spills past the bar.
  const [bar, fill] = await Promise.all([goalBar(page).boundingBox(), page.locator('#goal-fill').boundingBox()]);
  expect(fill.x + fill.width).toBeLessThanOrEqual(bar.x + bar.width + 0.5);
});

test('AC18 goal progress updates when runs are added or deleted', async ({ page }) => {
  await seed(page, RUNS);
  await page.goto('/');
  await setGoal(page, 10);
  await page.getByLabel('Distance (miles)').fill('2.9');
  await page.getByLabel('Minutes').fill('27');
  await page.getByRole('button', { name: 'Save run' }).click();
  await expect(page.locator('#goal-text')).toHaveText('10 of 10 mi (100%)');
  await expect(page.locator('#goal-left')).toHaveText('Goal met');

  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Delete run on Tue, Nov 17, 2026' }).click();
  await expect(page.locator('#goal-text')).toHaveText('6 of 10 mi (60%)');
  await expect(page.locator('#goal-left')).toHaveText('4 mi to go');
  // A run outside this week does not count toward the goal.
  await page.getByLabel('Date').fill('2026-11-10');
  await page.getByLabel('Distance (miles)').fill('8');
  await page.getByLabel('Hours').fill('1');
  await page.getByLabel('Minutes').fill('20');
  await page.getByRole('button', { name: 'Save run' }).click();
  await expect(page.locator('.run')).toHaveCount(6);
  await expect(page.locator('#goal-text')).toHaveText('6 of 10 mi (60%)');
});

test('AC19 goal form works from the keyboard and Escape closes it', async ({ page }) => {
  await seed(page, RUNS);
  await page.goto('/');
  await page.locator('#goal-edit').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Weekly goal (miles)')).toBeFocused();
  await page.keyboard.type('15');
  await page.keyboard.press('Enter');
  await expect(page.locator('#goal-text')).toHaveText('7.1 of 15 mi (47%)');
  await expect(page.locator('#goal-edit')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Weekly goal (miles)')).toBeHidden();
  await expect(page.locator('#goal-edit')).toBeFocused();
});
