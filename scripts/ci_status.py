"""Wait for GitHub Actions runs on a commit and print the result.

Usage: python3 scripts/ci_status.py [commit]   (default: HEAD)
Exit 0 if every run passed, 1 if any failed, 2 if timed out.
Uses the public GitHub API, so no login is needed.
"""
import json
import subprocess
import sys
import time
import urllib.request

API = "https://api.github.com/repos/bjb81/claude-projects"


def get(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)


def main():
    ref = sys.argv[1] if len(sys.argv) > 1 else "HEAD"
    sha = subprocess.check_output(["git", "rev-parse", ref], text=True).strip()
    for _ in range(60):
        runs = get(f"{API}/actions/runs?head_sha={sha}&per_page=20")["workflow_runs"]
        if runs and all(r["status"] == "completed" for r in runs):
            for r in runs:
                print(f"{r['name']}: {r['conclusion']}  {r['html_url']}")
            failed = [r for r in runs if r["conclusion"] != "success"]
            if not failed:
                print(f"CI PASSED for {sha[:7]}")
                return 0
            for r in failed:
                for job in get(f"{API}/actions/runs/{r['id']}/jobs")["jobs"]:
                    for step in job["steps"]:
                        if step["conclusion"] == "failure":
                            print(f"  failed step: {job['name']} > {step['name']}")
            print(f"CI FAILED for {sha[:7]}. Reproduce locally with: bash scripts/test.sh")
            return 1
        time.sleep(10)
    print(f"Timed out waiting for CI on {sha[:7]}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
