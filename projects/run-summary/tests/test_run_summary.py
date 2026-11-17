"""Tests for run_summary. Each test name starts with the acceptance criterion it covers."""
import os
from datetime import date
from pathlib import Path

import pytest

import run_summary as rs

FIXTURE = Path(__file__).parent / "fixtures" / "run-log-export.csv"
HEADER = "date,distance_mi,time,pace_per_mi,avg_hr,note\r\n"


def runs_from(text):
    runs, problems = rs.parse_runs(text)
    assert problems == []
    return runs


# AC1: exact Run Log export format (fixture was made by the app's own toCsv())

def test_ac1_reads_exact_run_log_export():
    runs, problems = rs.parse_runs(FIXTURE.read_text(encoding="utf-8"))
    assert problems == []
    assert len(runs) == 5
    assert runs[0] == rs.Run(date(2026, 11, 2), 4.1, 2160, 150)
    assert runs[1].avg_hr is None  # blank heart rate
    assert runs[4] == rs.Run(date(2026, 11, 15), 10.0, 5550, 148)  # h:mm:ss and multi line note


def test_ac1_accepts_excel_bom_and_us_dates():
    text = "﻿" + HEADER + "11/17/2026,3.1,27:54,9:00,140,\r\n"
    assert runs_from(text) == [rs.Run(date(2026, 11, 17), 3.1, 1674, 140)]


# AC2: Monday to Sunday weeks, oldest first

def test_ac2_groups_monday_to_sunday():
    weeks = rs.weekly_summary(runs_from(FIXTURE.read_text(encoding="utf-8")))
    assert [w.start for w in weeks] == [date(2026, 11, 2), date(2026, 11, 9)]
    assert [w.runs for w in weeks] == [3, 2]  # Sunday 11-08 stays in the week of 11-02
    assert weeks[0].miles == pytest.approx(15.3)
    assert weeks[1].miles == pytest.approx(15.0)


def test_ac2_report_lists_weeks_oldest_first():
    text = HEADER + "2026-11-16,3,30:00,10:00,,\r\n2026-11-01,3,30:00,10:00,,\r\n"
    report = rs.format_report(runs_from(text), "x.csv")
    first = report.index("Mon 2026-10-26")  # Sunday 11-01 belongs to the week of Monday 10-26
    second = report.index("Mon 2026-11-16")
    assert first < second


# AC3: weekly pace = total time / total miles

def test_ac3_weekly_pace_is_total_time_over_total_miles():
    weeks = rs.weekly_summary(runs_from(FIXTURE.read_text(encoding="utf-8")))
    assert rs.format_pace(weeks[0].pace) == "8:53 /mi"  # 8148 s / 15.3 mi
    assert rs.format_pace(weeks[1].pace) == "8:50 /mi"  # 7950 s / 15 mi


def test_ac3_format_pace():
    assert rs.format_pace(540) == "9:00 /mi"
    assert rs.format_pace(532.5) == "8:53 /mi"  # half rounds up, same as the app
    assert rs.format_pace(599.6) == "10:00 /mi"


# AC4: heart rate mean of runs that have one

def test_ac4_heart_rate_mean_skips_blanks():
    weeks = rs.weekly_summary(runs_from(FIXTURE.read_text(encoding="utf-8")))
    assert weeks[0].avg_hr == pytest.approx(147.5)  # 150 and 145; the blank run is ignored
    report = rs.format_report(runs_from(FIXTURE.read_text(encoding="utf-8")), "f.csv")
    row = next(l for l in report.splitlines() if l.startswith("Mon 2026-11-02"))
    assert row.split() == ["Mon", "2026-11-02", "3", "15.30", "8:53", "/mi", "148"]


def test_ac4_week_without_heart_rate_shows_dash():
    report = rs.format_report(runs_from(HEADER + "2026-11-17,3,30:00,10:00,,\r\n"), "x.csv")
    row = next(l for l in report.splitlines() if l.startswith("Mon 2026-11-16"))
    assert row.split()[-1] == "-"


# AC5: longest run and fastest pace overall

def test_ac5_longest_and_fastest():
    out = rs.summarize_file(FIXTURE)
    assert "Longest run:  10 mi on 2026-11-15 (1:32:30)" in out
    assert "Fastest pace: 8:00 /mi on 2026-11-10 (5 mi)" in out


# AC6: newest export in Downloads

def test_ac6_finds_newest_export_in_downloads(tmp_path, capsys):
    old = tmp_path / "run-log-2026-11-01.csv"
    old.write_text(HEADER + "2026-11-01,1,10:00,10:00,,\r\n", encoding="utf-8")
    new = tmp_path / "run-log-2026-11-17 (1).csv"
    new.write_bytes(FIXTURE.read_bytes())
    (tmp_path / "other.csv").write_text("a,b\r\n", encoding="utf-8")
    os.utime(old, (1_000_000, 1_000_000))
    os.utime(new, (2_000_000, 2_000_000))
    assert rs.main([], downloads=tmp_path) == 0
    out = capsys.readouterr().out
    assert "run-log-2026-11-17 (1).csv (5 runs)" in out


def test_ac6_no_export_in_downloads(tmp_path, capsys):
    assert rs.main([], downloads=tmp_path) == 1
    assert "No Run Log export found" in capsys.readouterr().err


# AC7: clear errors

def test_ac7_missing_file(tmp_path, capsys):
    assert rs.main([str(tmp_path / "nope.csv")]) == 1
    assert "File not found" in capsys.readouterr().err


def test_ac7_not_a_run_log_file(tmp_path, capsys):
    f = tmp_path / "bank.csv"
    f.write_text("Date,Amount\r\n2026-11-01,5\r\n", encoding="utf-8")
    assert rs.main([str(f)]) == 1
    err = capsys.readouterr().err
    assert "does not look like a Run Log export" in err
    assert "Traceback" not in err


def test_ac7_empty_export(tmp_path, capsys):
    f = tmp_path / "run-log-2026-11-17.csv"
    f.write_text(HEADER, encoding="utf-8")
    assert rs.main([str(f)]) == 1
    assert "No runs found" in capsys.readouterr().err


def test_ac7_bad_rows_skipped_and_listed(tmp_path, capsys):
    f = tmp_path / "run-log.csv"
    f.write_text(HEADER + "2026-11-17,3,30:00,10:00,,\r\nnot a date,3,30:00,,,\r\n2026-11-18,abc,30:00,,,\r\n", encoding="utf-8")
    assert rs.main([str(f)]) == 0
    out = capsys.readouterr().out
    assert "(1 run)" in out
    assert "Skipped 2 row(s)" in out
    assert "line 3: date 'not a date'" in out
    assert "line 4: miles 'abc' is not a number" in out
