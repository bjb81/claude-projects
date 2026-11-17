# Run Summary design

## Request and assumptions

Request, in Brad's words: "Make me a Python tool that reads the CSV file my Run Log app exports and prints a weekly summary: miles, number of runs, average pace, and average heart rate for each week, plus my longest run and fastest pace overall. I'll run it on my Windows PC."

* Read the CSV that the Run Log app's Export CSV button saves (`run-log-YYYY-MM-DD.csv`).
* Print one line per week: week, runs, miles, average pace, average heart rate.
* Print the longest run and the fastest pace across all runs.
* Run on Windows from Command Prompt or PowerShell with `py`.

| Assumption | Why |
|---|---|
| Weeks run Monday to Sunday | Matches the Run Log app's "this week" panel. |
| Weekly average pace is total time divided by total miles | Matches the Run Log app, so the numbers agree. |
| Weekly average heart rate is the plain mean of runs that have one, rounded to a whole bpm. Weeks with no heart rate show `-` | Heart rate is optional in the app. |
| Pace is worked out from the `time` and `distance_mi` columns, not read from `pace_per_mi` | Avoids rounding twice and still works if that column is blank. |
| Fastest pace means the single run with the lowest minutes per mile | The plain reading of "fastest pace overall". |
| Only weeks with at least one run are listed, oldest first | A long gap would otherwise print many empty lines. |
| With no file named, the tool uses the newest `run-log-*.csv` in the Downloads folder | That is where the browser saves the export, so Brad can type one short command. |
| Standard library only, no installs | Nothing extra to set up on the PC. |

## Goal

Turn a Run Log CSV export into a readable weekly summary in one command.

## Features

1. Read the Run Log CSV (header `date,distance_mi,time,pace_per_mi,avg_hr,note`, CRLF line ends, quoted notes).
2. Weekly table: week starting date, runs, miles, average pace, average heart rate.
3. Overall: longest run (miles, date, time) and fastest pace (pace, date, miles).
4. Find the newest export in Downloads when no file is named.
5. Clear messages for a missing file, a file that is not a Run Log export, or bad rows (bad rows are skipped and listed, the rest still count).

## Screens

Text output in the terminal only.

```
Run summary for run-log-2026-11-17.csv (5 runs)

Week of       Runs   Miles   Avg pace   Avg HR
Mon 2026-11-02   2    9.10    8:47 /mi     148
...
Longest run:  10 mi on 2026-11-15 (1:32:30)
Fastest pace: 8:00 /mi on 2026-11-10 (5 mi)
```

## Data

| Field | Type | Source |
|---|---|---|
| date | date | `date` column, `YYYY-MM-DD` (also accepts `M/D/YYYY` in case Excel re-saved the file) |
| miles | float | `distance_mi` column, more than 0 |
| seconds | int | `time` column, `m:ss` or `h:mm:ss` |
| avg_hr | int or None | `avg_hr` column, blank allowed |

Nothing is stored. The tool only reads the file.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC1 | Reads a file in the exact format the Run Log app exports (header, CRLF, quoted notes with commas, blank heart rate, notes starting with `'`). |
| AC2 | Groups runs into Monday to Sunday weeks and prints one row per week, oldest first, with runs and miles. |
| AC3 | Weekly average pace is total time divided by total miles, shown as `m:ss /mi`. |
| AC4 | Weekly average heart rate is the mean of runs that have one, rounded; a week with none shows `-`. |
| AC5 | Prints the longest run (miles, date, time) and the fastest pace (pace, date, miles) across all runs. |
| AC6 | With no file named, uses the newest `run-log-*.csv` in Downloads, and says plainly when none is found. |
| AC7 | A missing file, a non Run Log file, or an empty export prints a clear message and exits with code 1, with no Python error dump. Bad rows are skipped and listed by line number. |

## Test plan

All tests are `pytest` in `tests/test_run_summary.py`. Test names start with the AC they cover.

| AC | Tests |
|---|---|
| AC1 | `test_ac1_reads_exact_run_log_export`, `test_ac1_accepts_excel_bom_and_us_dates` |
| AC2 | `test_ac2_groups_monday_to_sunday`, `test_ac2_report_lists_weeks_oldest_first` |
| AC3 | `test_ac3_weekly_pace_is_total_time_over_total_miles`, `test_ac3_format_pace` |
| AC4 | `test_ac4_heart_rate_mean_skips_blanks`, `test_ac4_week_without_heart_rate_shows_dash` |
| AC5 | `test_ac5_longest_and_fastest` |
| AC6 | `test_ac6_finds_newest_export_in_downloads`, `test_ac6_no_export_in_downloads` |
| AC7 | `test_ac7_missing_file`, `test_ac7_not_a_run_log_file`, `test_ac7_empty_export`, `test_ac7_bad_rows_skipped_and_listed` |

## Tech choices

| Choice | Why |
|---|---|
| Python 3.12+, standard library only (`csv`, `datetime`, `pathlib`, `argparse`) | No installs on the PC. |
| Pure functions (`parse_runs`, `weekly_summary`, `overall_bests`, `format_report`) separate from `main` | Easy to unit test. |
| `pytest.ini` sets `pythonpath = src` | Tests import the module without path hacks. |
| Downloads folder passed in as an argument to `find_latest_export` | Tests use a temporary folder, never the real one. |
