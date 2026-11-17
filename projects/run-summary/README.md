# Run Summary

A small Windows tool that reads the CSV file the Run Log app exports and prints a summary: for each week, your miles, number of runs, average pace, and average heart rate, plus your longest run and fastest pace overall.

Code: https://github.com/bjb81/claude-projects/tree/main/projects/run-summary

## Example

```
Run summary for run-log-2026-11-17.csv (5 runs)

Week of         Runs    Miles    Avg pace   Avg HR
Mon 2026-11-02     3    15.30    8:53 /mi      148
Mon 2026-11-09     2    15.00    8:50 /mi      155

Longest run:  10 mi on 2026-11-15 (1:32:30)
Fastest pace: 8:00 /mi on 2026-11-10 (5 mi)
```

## One time setup on your Windows PC

| Step | What to do |
|---|---|
| 1 | Install Python 3.12 or newer from https://www.python.org/downloads/ (tick "Add python.exe to PATH" on the first screen). Skip if `py --version` already works. |
| 2 | Download the tool: open https://raw.githubusercontent.com/bjb81/claude-projects/main/projects/run-summary/src/run_summary.py, press Ctrl+S, and save it as `run_summary.py` in your Documents folder. |

Nothing else needs installing. The tool uses only what comes with Python.

## How to use it

| Step | What to do |
|---|---|
| 1 | In the Run Log app, tap Export CSV. The browser saves `run-log-YYYY-MM-DD.csv` to your Downloads folder. |
| 2 | Open Command Prompt (press the Windows key, type `cmd`, press Enter). |
| 3 | Type `cd Documents` and press Enter, then `py run_summary.py` and press Enter. |
| 4 | Read the summary. To use a different file, add its path: `py run_summary.py "C:\Users\you\Desktop\my runs.csv"` |

With no file named, the tool picks the newest `run-log-*.csv` in your Downloads folder.

## Good to know

| Topic | Detail |
|---|---|
| Weeks | Monday to Sunday, the same as the Run Log app. Only weeks with runs are listed, oldest first. |
| Average pace | Total time divided by total miles for the week, the same as the app. |
| Average heart rate | Mean of the runs in that week that have a heart rate. `-` means no run that week had one. |
| Fastest pace | The single run with the lowest minutes per mile. |
| Bad rows | Rows it cannot read are skipped and listed at the bottom by line number; the rest still count. |
| Excel | If you open the CSV in Excel and save it, it still works (dates like 11/17/2026 are fine). Excel can sometimes rewrite run times; if numbers look wrong, export a fresh copy from the app. |
| Privacy | The tool only reads the file. Nothing is sent anywhere. |

## For developers

| Task | Command (from the repo root) |
|---|---|
| Run the tests | `bash scripts/test.sh run-summary` |
| Run the tool from the repo on Windows | `py projects\run-summary\src\run_summary.py path\to\file.csv` |
| Install test tools on Windows | `py -m pip install -r projects\run-summary\requirements.txt`, then `py -m pytest` inside `projects\run-summary` |

The test file `tests/fixtures/run-log-export.csv` was produced by the Run Log app's own `toCsv()` function, so the tests check the real export format. See `DESIGN.md` for acceptance criteria and which test covers each.
