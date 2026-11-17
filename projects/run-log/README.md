# Run Log

A simple running log for your phone and PC. Enter each run and see your pace, this week's and this month's totals, and a chart of your pace over time. Export everything to a CSV file whenever you like.

Live link: https://bjb81.github.io/claude-projects/run-log/

## How to use it

| Step | What to do |
|---|---|
| 1 | Open the live link. On a phone, use your browser's Share or menu button and pick "Add to Home Screen" so it opens like an app. |
| 2 | Under "Add a run", check the date (it starts on today), enter miles and time (hours, minutes, seconds). Heart rate and note are optional. Tap Save run. |
| 3 | Read your totals at the top. The yellow panel is this week (Monday to Sunday); the white panel is this month. |
| 4 | To set a weekly mileage goal, tap "Set a weekly goal" on the yellow panel, enter miles (1 to 500), and tap Save goal. A bar shows how far along you are this week and how many miles are left. Tap "Change goal" to change or remove it. |
| 5 | The Pace trend chart shows one dot per run, oldest on the left. Higher means faster. Hover or tap a dot to see its date, pace, and miles. |
| 6 | Tap Export CSV to download all runs as `run-log-YYYY-MM-DD.csv`. It opens in Excel or Google Sheets. |

To fix a typo, delete the run (it asks first) and add it again.

## Good to know

| Topic | Detail |
|---|---|
| Where data lives | In the browser on each device. Your phone and your PC keep separate logs. Nothing is sent anywhere. |
| Backup | Export CSV now and then. Clearing your browser data erases the log. |
| Pace | Minutes per mile, rounded to the nearest second. Weekly and monthly pace is total time divided by total miles. |
| Weekly goal | One goal for every week, saved on each device like your runs. It is not part of the CSV export. |
| Limits | Distance up to 200 miles; heart rate 30 to 250 bpm; note up to 280 characters. |

## For developers

| Task | Command (from the repo root) |
|---|---|
| Run all tests | `bash scripts/test.sh run-log` |
| Preview locally | `node scripts/serve.mjs projects/run-log/public 4173`, then open http://localhost:4173 |

Files: `public/runlog.js` holds all calculations (no page code, unit tested in `tests/unit`). `public/app.js` wires up the page, `public/chart.js` draws the chart, `public/goal.js` runs the weekly goal bar and form. Browser tests in `tests/e2e` run on desktop Chrome and a Pixel 7 phone profile with the clock fixed to 18 November 2026. See `DESIGN.md` for acceptance criteria and the test for each.
