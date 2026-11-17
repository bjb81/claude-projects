---
name: build-project
description: Design, code, test, and publish a new project (website, web app, or Python tool) in this workspace from a plain English request, or make a change to an existing one. Use for any request like "build me", "make an app", "create a site", "write a script", or "change/fix <project>".
---

# Build project

Follow every step. The goal is a finished, tested, published project that Brad can use without touching code.

## 0. Orient

1. Read `CLAUDE.md` if you have not this session.
2. Run `ls projects/` to see existing projects. If the request is a change to an existing project, read its `DESIGN.md` and `README.md` first, then skip to step 3 and update the design doc as you go.
3. Pick a short lowercase slug with hyphens (example: `run-log`).
4. Create a working branch before changing files: `git checkout -b claude/<slug>` (skip if the session already put you on a `claude/...` branch).

## 1. Understand

Write down, in `projects/<slug>/DESIGN.md` under "Request and assumptions":

* The request in 3 to 5 bullets
* Who uses it and on what device (assume Brad, on phone and Windows PC, unless told otherwise)
* Assumptions you made

Ask Brad only if a wrong guess would mean rebuilding (for example, shared data between users vs one person's data). Otherwise proceed.

## 2. Design

Pick the type using the table in `CLAUDE.md` (default `static`). Then complete `DESIGN.md` with these sections:

| Section | Contents |
|---|---|
| Goal | One sentence |
| Features | Numbered list, smallest version that is genuinely useful |
| Screens | Each screen, what is on it, main action |
| Data | Every field, type, where it is stored |
| Acceptance criteria | `AC1`, `AC2` ... one testable sentence each |
| Test plan | Which test covers each AC |
| Tech choices | Stack and why, in one line each |

For any UI, read `.claude/skills/frontend-design/SKILL.md` and choose a clear visual direction (palette, type, spacing) before coding. Note it in `DESIGN.md`.

## 3. Build

* Static template: `public/index.html`, `public/styles.css`, `public/app.js` (UI), and a pure logic module such as `public/<name>.js` with exported functions and no DOM access, so Node can unit test it.
* Python template: `src/<name>.py`, `tests/test_<name>.py`, `requirements.txt`, README with Windows run steps (`py -m pip install -r requirements.txt`, `py src\<name>.py`).
* Keep files small. Escape user text before showing it (use `textContent`, never `innerHTML` with user data).

## 4. Test

Web `package.json`:

```json
{
  "private": true,
  "type": "module",
  "scripts": {
    "test": "npm run test:unit && npm run test:e2e",
    "test:unit": "node --test \"tests/unit/*.test.js\"",
    "test:e2e": "playwright test"
  },
  "devDependencies": { "@playwright/test": "^1.50.0" }
}
```

Web `playwright.config.js`:

```js
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:PORT' },
  webServer: { command: 'node ../../scripts/serve.mjs public PORT', port: PORT, reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'phone', use: { ...devices['Pixel 7'], channel: 'chrome' } }
  ]
});
```

Replace `PORT` with a port unique to this project: run `bash scripts/next-port.sh` and use the number it prints.

Then:

1. `cd projects/<slug> && npm install` (commit `package-lock.json`).
2. `bash scripts/test.sh <slug>` from the repo root. Fix code until everything passes. Do not weaken a test to make it pass unless the test itself is wrong; say so if you change one.
3. Take screenshots: `node scripts/screenshot.mjs <slug>` saves desktop and phone images of the home page to `/tmp/shots/<slug>/`. Pass extra page paths as more arguments if the app has several pages. Open every image with the Read tool and fix anything that looks broken, cramped, or plain. For screens that need clicks first, write a short Playwright script in `/tmp` that uses `channel: 'chrome'`.
4. Check the browser console has no errors during tests.

## 5. Review

Run the review checklist in `CLAUDE.md`. Fix findings, then rerun step 4.

## 6. Publish

1. Write `project.json` and `README.md` (what it does, how to use it, live link, how to run tests).
2. `git add -A && git commit -m "<slug>: <what changed>"`.
3. Push your branch, then merge into `main`: `git checkout main && git pull && git merge --no-ff <branch> && git push origin main`. If the push to `main` is refused, open a pull request instead and give Brad the link and the one click needed.
4. Wait about 2 minutes, then confirm `https://bjb81.github.io/claude-projects/<slug>/` loads (fetch it). If GitHub Actions failed, read the log with the GitHub tools available, fix, and push again.

## 7. Report to Brad

Use this table, then one line of next ideas:

| Item | Detail |
|---|---|
| What it is | One sentence |
| Live link | URL |
| How to use | 2 to 4 short steps |
| Tests | Number passed, what they cover |
| Limits | Anything not done or assumed |
