"""Print a weekly summary of a Run Log CSV export.

Usage (Windows):  py src\\run_summary.py [path\\to\\run-log-YYYY-MM-DD.csv]
With no path, the newest run-log-*.csv in your Downloads folder is used.

The CSV format comes from toCsv() in projects/run-log/public/runlog.js:
header date,distance_mi,time,pace_per_mi,avg_hr,note; CRLF line ends.
"""
from __future__ import annotations

import argparse
import csv
import io
import sys
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path

REQUIRED_COLUMNS = ("date", "distance_mi", "time", "avg_hr")


class RunLogError(Exception):
    """A problem the user can fix, shown as a plain message."""


@dataclass(frozen=True)
class Run:
    day: date
    miles: float
    seconds: int
    avg_hr: int | None

    @property
    def pace(self) -> float:
        """Seconds per mile."""
        return self.seconds / self.miles


@dataclass(frozen=True)
class Week:
    start: date  # Monday
    runs: int
    miles: float
    seconds: int
    avg_hr: float | None

    @property
    def pace(self) -> float:
        return self.seconds / self.miles


def parse_date(text: str) -> date:
    """YYYY-MM-DD from the app, or M/D/YYYY if Excel re-saved the file."""
    text = text.strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            pass
    raise ValueError(f"date '{text}' is not like 2026-11-17")


def parse_duration(text: str) -> int:
    """'27:54' or '1:05:54' -> seconds."""
    parts = text.strip().split(":")
    if len(parts) not in (2, 3) or not all(p.isdigit() for p in parts):
        raise ValueError(f"time '{text}' is not like 27:54 or 1:05:54")
    seconds = 0
    for p in parts:
        seconds = seconds * 60 + int(p)
    if seconds <= 0:
        raise ValueError("time is zero")
    return seconds


def parse_row(row: dict[str, str]) -> Run:
    day = parse_date(row["date"] or "")
    try:
        miles = float(row["distance_mi"])
    except (TypeError, ValueError):
        raise ValueError(f"miles '{row['distance_mi']}' is not a number") from None
    if miles <= 0:
        raise ValueError("miles must be more than 0")
    seconds = parse_duration(row["time"] or "")
    hr_text = (row["avg_hr"] or "").strip()
    avg_hr = None
    if hr_text:
        try:
            avg_hr = int(float(hr_text))
        except ValueError:
            raise ValueError(f"heart rate '{hr_text}' is not a number") from None
    return Run(day, miles, seconds, avg_hr)


def parse_runs(text: str) -> tuple[list[Run], list[str]]:
    """Return (runs, problems). Problems name the CSV line of each skipped row."""
    text = text.lstrip("﻿")  # Excel adds a byte order mark when it saves
    reader = csv.DictReader(io.StringIO(text, newline=""))  # keeps notes with line breaks whole
    header = [h.strip() for h in (reader.fieldnames or [])]
    reader.fieldnames = header
    missing = [c for c in REQUIRED_COLUMNS if c not in header]
    if missing:
        raise RunLogError(
            "This does not look like a Run Log export. "
            f"Missing column(s): {', '.join(missing)}. Use Export CSV in the Run Log app."
        )
    runs, problems = [], []
    for row in reader:
        line_no = reader.line_num  # last physical line of this row
        if not any((v or "").strip() for v in row.values() if isinstance(v, str)):
            continue  # blank line
        try:
            runs.append(parse_row(row))
        except ValueError as err:
            problems.append(f"line {line_no}: {err}")
    return runs, problems


def week_start(day: date) -> date:
    """Monday of the week containing day."""
    return day - timedelta(days=day.weekday())


def weekly_summary(runs: list[Run]) -> list[Week]:
    """One Week per Monday to Sunday week that has runs, oldest first."""
    groups: dict[date, list[Run]] = {}
    for run in runs:
        groups.setdefault(week_start(run.day), []).append(run)
    weeks = []
    for start in sorted(groups):
        group = groups[start]
        hrs = [r.avg_hr for r in group if r.avg_hr is not None]
        weeks.append(
            Week(
                start=start,
                runs=len(group),
                miles=sum(r.miles for r in group),
                seconds=sum(r.seconds for r in group),
                avg_hr=sum(hrs) / len(hrs) if hrs else None,
            )
        )
    return weeks


def overall_bests(runs: list[Run]) -> tuple[Run, Run]:
    """(longest run, fastest pace run). Ties go to the earlier run."""
    ordered = sorted(runs, key=lambda r: r.day)
    longest = max(ordered, key=lambda r: r.miles)
    fastest = min(ordered, key=lambda r: r.pace)
    return longest, fastest


def format_pace(sec_per_mile: float) -> str:
    """532.4 -> '8:52 /mi'. Rounds to the nearest second, like the app."""
    s = int(sec_per_mile + 0.5)  # half rounds up, as JavaScript Math.round does in the app
    return f"{s // 60}:{s % 60:02d} /mi"


def format_duration(seconds: int) -> str:
    h, rest = divmod(seconds, 3600)
    m, s = divmod(rest, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def format_miles(miles: float) -> str:
    """Up to 2 decimals, no trailing zeros, like the app: 3.10 -> '3.1'."""
    return f"{round(miles, 2):.2f}".rstrip("0").rstrip(".")


def format_report(runs: list[Run], source_name: str, problems: list[str] | None = None) -> str:
    weeks = weekly_summary(runs)
    longest, fastest = overall_bests(runs)
    lines = [f"Run summary for {source_name} ({len(runs)} run{'s' if len(runs) != 1 else ''})", ""]
    lines.append(f"{'Week of':<15}{'Runs':>5}{'Miles':>9}{'Avg pace':>12}{'Avg HR':>9}")
    for w in weeks:
        hr = "-" if w.avg_hr is None else str(int(w.avg_hr + 0.5))
        label = w.start.strftime("Mon %Y-%m-%d")
        lines.append(f"{label:<15}{w.runs:>5}{w.miles:>9.2f}{format_pace(w.pace):>12}{hr:>9}")
    lines.append("")
    lines.append(
        f"Longest run:  {format_miles(longest.miles)} mi on {longest.day.isoformat()} "
        f"({format_duration(longest.seconds)})"
    )
    lines.append(
        f"Fastest pace: {format_pace(fastest.pace)} on {fastest.day.isoformat()} "
        f"({format_miles(fastest.miles)} mi)"
    )
    if problems:
        lines.append("")
        lines.append(f"Skipped {len(problems)} row(s) that could not be read:")
        lines.extend(f"  {p}" for p in problems)
    return "\n".join(lines)


def default_downloads() -> Path:
    return Path.home() / "Downloads"


def find_latest_export(folder: Path) -> Path:
    """Newest run-log-*.csv in folder by file time (covers 'run-log-... (1).csv' copies too)."""
    files = sorted(folder.glob("run-log-*.csv"), key=lambda p: p.stat().st_mtime)
    if not files:
        raise RunLogError(
            f"No Run Log export found in {folder}. "
            "Tap Export CSV in the Run Log app, or give the file path: py src\\run_summary.py path\\to\\file.csv"
        )
    return files[-1]


def summarize_file(path: Path) -> str:
    if not path.is_file():
        raise RunLogError(f"File not found: {path}")
    try:
        text = path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        raise RunLogError(f"{path.name} is not a text CSV file. Use Export CSV in the Run Log app.") from None
    runs, problems = parse_runs(text)
    if not runs:
        detail = f" ({len(problems)} row(s) could not be read)" if problems else ""
        raise RunLogError(f"No runs found in {path.name}{detail}. Log some runs and export again.")
    return format_report(runs, path.name, problems)


def main(argv: list[str] | None = None, downloads: Path | None = None) -> int:
    parser = argparse.ArgumentParser(description="Weekly summary of a Run Log CSV export.")
    parser.add_argument("csv", nargs="?", help="Path to the CSV. Default: newest run-log-*.csv in Downloads.")
    args = parser.parse_args(argv)
    try:
        path = Path(args.csv) if args.csv else find_latest_export(downloads or default_downloads())
        print(summarize_file(path))
    except RunLogError as err:
        print(f"Problem: {err}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
