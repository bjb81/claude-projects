# Run Log: design

## Request and assumptions

The request:

* Enter runs with date, distance in miles, time, average heart rate, and a note.
* See the pace for each run.
* See totals for this week and this month.
* See a chart of pace over time.
* Work well on a phone, and export runs to a CSV file.

Who and where: Brad, on his phone right after a run, and on his Windows PC. One person's data only.

Assumptions:

| Topic | Assumption |
|---|---|
| Storage | Runs live in the browser (localStorage) on each device. No account, no sync between phone and PC. The CSV export is the backup. |
| Week | A week runs Monday to Sunday (the usual training week). |
| Month | The calendar month that contains today. |
| Time entry | Three boxes: hours, minutes, seconds. Easier on a phone keypad than typing colons. |
| Heart rate | Optional, since not every run has a watch. When given it must be 30 to 250 bpm. |
| Note | Optional, up to 280 characters. |
| Distance | More than 0 and at most 200 miles, up to 2 decimals. |
| Pace | Minutes per mile, rounded to the nearest second. Total pace = total time divided by total miles. |
| Editing | Delete a run and add it again. An edit button is a next idea, not in this version. |

## Goal

Log runs in a few taps and see pace, weekly and monthly totals, and the pace trend at a glance.

## Features

1. Add a run: date (defaults to today), miles, time, average heart rate, note.
2. Run list, newest first, showing date, miles, time, pace, heart rate, and note.
3. Delete a run (asks to confirm).
4. Totals for this week and this month: runs, miles, time, average pace.
5. Pace trend chart: one point per run in date order, faster pace higher. Hover or tap a point for its details.
6. Export all runs to a CSV file.
7. Runs are saved in the browser and survive a reload.

## Screens

One page, top to bottom (phone) or two columns (desktop).

| Area | What is on it | Main action |
|---|---|---|
| Header | App name, Export CSV button | Export |
| Totals | This week panel (hi vis yellow) and this month panel | Read |
| Add a run | Form with date, miles, time (h, m, s), heart rate, note | Save run |
| Pace trend | SVG line chart | Hover or tap points |
| Runs | List of runs, each with a Delete button | Delete |

Empty states: the list says "No runs yet. Add your first run above." The chart says it needs two runs to draw a trend.

## Data

Stored in localStorage under the key `runlog.v1` as a JSON array.

| Field | Type | Notes |
|---|---|---|
| id | string | Random id made when the run is saved |
| date | string | `YYYY-MM-DD`, local date |
| distanceMi | number | Miles, more than 0, at most 200 |
| seconds | integer | Total run time in seconds |
| avgHr | integer or null | Average heart rate, 30 to 250 |
| note | string | Up to 280 characters, shown as plain text |

CSV columns: `date, distance_mi, time, pace_per_mi, avg_hr, note`.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC1 | Filling in the form and pressing Save run adds the run to the list with its date, miles, time, heart rate, and note. |
| AC2 | Each run shows its pace in min/mi (3.1 mi in 27:54 shows 9:00 /mi). |
| AC3 | Bad input (no date, miles 0 or blank, time 0, minutes or seconds over 59, heart rate outside 30 to 250) shows a clear message next to the field and saves nothing. |
| AC4 | This week totals count only runs from Monday of this week through Sunday, and show runs, miles, time, and average pace. |
| AC5 | This month totals count only runs in the current calendar month, with the same four figures. |
| AC6 | The pace chart draws one point per run in date order, and shows a friendly message when there are fewer than 2 runs. |
| AC7 | Export CSV downloads `run-log-YYYY-MM-DD.csv` with a header row and one row per run; notes with commas, quotes, or line breaks survive intact. |
| AC8 | Runs are still there after reloading the page. |
| AC9 | Deleting a run (after confirming) removes it and updates totals and chart. |
| AC10 | At 390 px wide nothing scrolls sideways and every button and input is at least 44 px tall. |
| AC11 | A note containing HTML is shown as plain text, never run as HTML. |
| AC12 | With no runs, the list and totals show friendly empty states and the Export button is disabled. |
| AC13 | No errors appear in the browser console while using the app. |

## Test plan

Unit tests (`tests/unit/runlog.test.js`, Node's `node --test`) cover the logic module. Browser tests (`tests/e2e/runlog.spec.js`, Playwright) run on desktop Chrome and a Pixel 7 phone profile. The browser clock is fixed to Wednesday 18 November 2026 so week and month totals are predictable.

| AC | Unit test | Browser test |
|---|---|---|
| AC1 | `validateRun accepts a full valid run` | `AC1 add a run with every field` |
| AC2 | `pacePerMile`, `formatPace` | `AC2 shows pace for each run` |
| AC3 | `validateRun rejects ...` | `AC3 bad input shows messages and saves nothing` |
| AC4 | `weekStart`, `summarize this week` | `AC4 and AC5 week and month totals` |
| AC5 | `summarize this month` | `AC4 and AC5 week and month totals` |
| AC6 | `chartPoints` | `AC6 chart draws one point per run in date order`, `AC6 chart empty state` |
| AC7 | `toCsv` | `AC7 export downloads a CSV of all runs` |
| AC8 | `loadRuns` and `saveRuns` round trip | `AC8 runs survive a reload` |
| AC9 | | `AC9 delete a run updates list, totals, and chart` |
| AC10 | | `AC10 phone layout has no sideways scroll and big tap targets` |
| AC11 | | `AC11 note with HTML shows as plain text` |
| AC12 | | `AC12 empty state` |
| AC13 | | Every browser test fails on any console error (shared hook) |

## Tech choices

| Choice | Why |
|---|---|
| Static site, plain HTML, CSS, JavaScript modules | Data lives on the device; free hosting on GitHub Pages; nothing to install. |
| localStorage | Simple, private, works offline. |
| Hand drawn SVG chart | One line chart does not justify a chart library. |
| Logic in `runlog.js` with no DOM access | Lets Node unit test every calculation. |
| System fonts only | No network fetch, fast on a phone, works offline. |

## Visual direction

Subject: a runner's training log, opened on a phone in the driveway after a morning run. The language comes from race day: bib numbers, hi vis running gear, painted lane lines.

| Token | Value | Role |
|---|---|---|
| Fog | `#EEF1F4` | Page background, a cool early morning gray |
| Ink | `#17202B` | Text and the header band |
| Slate | `#5A6675` | Secondary text |
| Hi vis | `#E4F249` | The this week panel only, with ink text on it |
| Lane blue | `#1F5FA8` | Chart line, buttons, focus ring (passes the dataviz chroma and 3:1 checks) |
| Paper | `#FFFFFF` | Panels |
| Alert | `#B42318` | Error messages, delete |

Type: a condensed, DIN like face for numbers, the way race bibs and splits look (`Bahnschrift` on Windows, `DIN Alternate` on iPhone and Mac, `Roboto Condensed` on Android, then `Arial Narrow`). Body text uses the system UI font. Numbers use tabular figures so columns line up.

Layout: single column on phones in the order totals, form, chart, list. On desktop the form sits in a left column and the chart and list on the right. Left aligned throughout.

```
phone                       desktop
+-----------------+         +----------------------------------+
| Run Log  [CSV]  |         | Run Log                 [Export] |
| [THIS WEEK    ] |         | [THIS WEEK hi vis] [THIS MONTH ] |
| [this month   ] |         | +--------+ +--------------------+|
| Add a run form  |         | | form   | | pace chart         ||
| Pace chart      |         | |        | | run list           ||
| Run list        |         | +--------+ +--------------------+|
+-----------------+         +----------------------------------+
```

Principle: spend the boldness on one thing, the hi vis this week panel with big bib style numbers. Everything else stays quiet: white panels, thin rules, one blue. No shadows stacked on cards, no all caps labels, no gradient washes.

Plan review: a first pass had a dark page with a neon green accent, which is one of the generic defaults. It was changed to a light fog page where the neon only appears on the one panel that matters most, so it reads as running gear rather than a theme.
