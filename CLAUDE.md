# Claude projects workspace

This repository holds every project Brad Bell asks Claude to build. Each project lives in its own folder under `projects/`. Read this whole file before doing any work.

## Who you are working for

* Brad is a product leader, not a trained developer. He describes what he wants in plain English and expects a finished, tested, published result.
* Do the work end to end without asking him technical questions. Make sensible technical choices yourself and note them in the project's `DESIGN.md`.
* Ask Brad a question only when the answer changes what gets built (who it is for, what it must do, what data it holds) and you cannot make a reasonable assumption. Ask once, with options, then proceed.
* Skills such as `frontend-design` may suggest confirming choices with the client. For Brad, make the design choice yourself and record it in `DESIGN.md`, unless it changes what gets built.
* When you report back, use short tables and plain words. No jargon without a one line explanation. No dashes as punctuation.

## The standard workflow (follow for every new project)

Use the `build-project` skill in `.claude/skills/build-project/SKILL.md`. In short:

| Step | What you do | Done when |
|---|---|---|
| 1. Understand | Restate the request in 3 to 5 bullets. List assumptions. | Assumptions written in `DESIGN.md` |
| 2. Design | Write `projects/<slug>/DESIGN.md`: goal, users, features, screens, data, acceptance criteria, test plan. For any UI, read `.claude/skills/frontend-design/SKILL.md` first. | Every feature has an acceptance criterion |
| 3. Build | Create the project from the matching template below. Small files, clear names, comments for anything not obvious. | App runs locally |
| 4. Test | Unit tests for logic, end to end browser tests for every acceptance criterion. Run `bash scripts/test.sh <slug>`. Fix until 100% pass. Take screenshots of the main screens (desktop and phone width) and look at them. | All tests pass, screenshots look right |
| 5. Review | Run the review checklist below. Fix what it finds. Rerun tests. | Checklist clean |
| 6. Publish | Write `projects/<slug>/project.json`, update the project README, commit, push, and merge to `main` (see Publishing). Run `python3 scripts/ci_status.py` to confirm GitHub's tests passed. | See "Done means" below |
| 7. Report | Tell Brad: what was built, live link, how to use it, test results, known limits, ideas for next. | Report sent |

Never skip step 4. Never report success while a test fails. If something cannot be done (blocked site, missing account, paid service), say so plainly and say exactly what Brad needs to click.

## Project types and templates

| Type | Use for | Stack | Published to |
|---|---|---|---|
| `static` | Websites, tools, and apps whose data can live in the browser (localStorage) | Plain HTML, CSS, and JavaScript modules. No framework unless the app truly needs one. | GitHub Pages: `https://bjb81.github.io/claude-projects/<slug>/` |
| `python` | Scripts, data processing, file tools, automations | Python 3.12+, standard library first, `requirements.txt` for anything else, `pytest` for tests | The repo itself, with a README that says how to run it on Windows |
| `vercel` | Web apps that need a server, logins, a shared database, or secret API keys | Next.js or Vercel serverless functions, database from the Vercel Marketplace (Neon Postgres) | Vercel. First deploy needs Brad to import the project once (see Publishing) |

Default to `static` when in doubt. It is free, needs no accounts, and publishes automatically.

### Folder layout for every project

```
projects/<slug>/
  project.json      name, type, description, publish folder
  DESIGN.md         the design from step 2
  README.md         what it is, how to use it, how to run tests
  public/           (static) files that get published
  src/ or app/      (python or vercel) source code
  tests/            unit and browser tests
  package.json      (web) test scripts and dev dependencies
```

`project.json` example:

```json
{
  "name": "Run Log",
  "slug": "run-log",
  "type": "static",
  "description": "Log runs and see pace trends",
  "publish": "public"
}
```

`publish` is the folder copied to GitHub Pages (static only). Python projects use `"publish": "src"`. Vercel projects add `"url"` with the live Vercel address once Brad has imported them. Every project, of every type, is listed on the hub page.

### Done means

| Type | Done when |
|---|---|
| `static` | `ci_status.py` passes and prints `Pages deployment: success`. Cloud sessions usually cannot open github.io, so this deployment check stands in for opening the page; if you can open it, confirm it loads with no console errors |
| `python` | `ci_status.py` passes and the README has a direct download link for the script (`https://raw.githubusercontent.com/bjb81/claude-projects/main/projects/<slug>/src/<file>.py`) plus Windows run steps (`py <file>.py`) |
| `vercel` | `ci_status.py` passes and either the Vercel URL loads, or (first deploy) Brad has the exact import steps |

## Testing rules

* Web projects: `npm test` must run unit tests (Node's built in `node --test`) and browser tests (`@playwright/test`).
* Playwright must use the installed Chrome: set `use: { channel: 'chrome' }` in `playwright.config.js`. Do not run `npx playwright install`; its download site is blocked in cloud sessions, and Chrome is already installed here and on GitHub's servers.
* Serve static files in tests with `node ../../scripts/serve.mjs <folder> <port>` from the project folder (no extra packages).
* Anything that depends on today's date (this week, streaks, due dates) must be tested with a fixed date: `page.clock.setFixedTime(...)` in Playwright and a date argument in unit tests. Never let a test depend on the real clock.
* Each web project uses its own test port, recorded in its `playwright.config.js`. Get a free one with `bash scripts/next-port.sh`.
* The `webapp-testing` skill shows Python Playwright examples. In this repo, launch the browser with `channel='chrome'` (Python) or `channel: 'chrome'` (JavaScript); never call `playwright install`.
* Tests that measure layout (tap targets, overflow) must check visible elements only; hidden controls measure 0 px.
* Every acceptance criterion in `DESIGN.md` maps to at least one test. Name tests after the criterion.
* Python projects: `pytest` with tests in `tests/`.
* `bash scripts/test.sh` runs every project's tests. `bash scripts/test.sh <slug>` runs one.
* GitHub runs the same script on every push: `ci.yml` on branches, `pages.yml` on `main` (tests first, then publish; a failed test stops publishing). Both install only Node, Python, and pytest; `test.sh` installs each project's own dependencies. A red run means the work is not done.
* Check GitHub's results with `python3 scripts/ci_status.py` (waits for the runs on your latest commit and names any failed step). Logs need a GitHub login, so reproduce failures locally with `bash scripts/test.sh`.
* Python projects: tests import from `src/` through a `pytest.ini` containing `[pytest]` and `pythonpath = src`. Prefer the standard library; add `requirements.txt` only for real dependencies (pytest is always available). Skip the browser, screenshot, and `package.json` steps.

## Review checklist (step 5)

| Area | Check |
|---|---|
| Works | Every acceptance criterion passes in a browser test |
| Phone (web) | Layout works at 390 px wide, tap targets at least 44 px |
| Accessibility (web) | Labels on every input, keyboard usable, color contrast readable |
| Errors | Bad input shows a clear message, nothing crashes, empty states are friendly |
| Data | Nothing is lost on reload when it should persist; export exists when data matters |
| Security | No secrets in code or commits; `.env` is ignored; user input is never inserted as raw HTML |
| Code | No dead code, no console errors, source and test files under about 300 lines each (split test files by feature, with shared setup in `tests/e2e/helpers.js`) |
| Docs | README explains use in plain English |
| Python | Runs on Windows with `py`; paths use `pathlib`; bad input prints a clear message and exits with code 1, never a traceback |

## Publishing

* Pushes to `main` publish every `static` project automatically through `.github/workflows/pages.yml`, after tests pass. The hub page at `https://bjb81.github.io/claude-projects/` lists all projects.
* In a cloud session you usually work on a `claude/...` branch. When the work is finished and tests pass, push the branch, then merge it into `main` and push `main`. If pushing to `main` is refused, open a pull request and tell Brad the one click needed to merge it.
* After the Pages workflow finishes (about 1 to 2 minutes), open the live URL and confirm it loads.
* `vercel` projects: the first time, Brad imports the repo at vercel.com/new, sets Root Directory to `projects/<slug>`, and clicks Deploy. After that, every push to `main` redeploys. Write those exact steps in your report.

## Secrets and accounts

* Never put passwords, API keys, or tokens in any file in this repo. The repo is public.
* Put example names in `.env.example`. Real values go in the cloud environment's network secrets (claude.ai/code environment settings), in GitHub repo secrets, or in Vercel project settings. Tell Brad which one and the exact name to use.
* Never sign up for services, buy anything, or accept terms on Brad's behalf. Tell him what to click.

## Commands

| Task | Command |
|---|---|
| Install everything | `bash scripts/setup.sh` |
| Test everything | `bash scripts/test.sh` |
| Test one project | `bash scripts/test.sh <slug>` |
| Build the Pages site locally | `python3 scripts/build_site.py` (output in `_site/`) |
| Serve a folder | `node scripts/serve.mjs projects/<slug>/public <port>` |
| Screenshot a project | `node scripts/screenshot.mjs <slug>` |
| Next free test port | `bash scripts/next-port.sh` |
| GitHub test results for HEAD | `python3 scripts/ci_status.py` |
