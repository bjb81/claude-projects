# Claude projects

Websites, web apps, and Python tools designed, coded, tested, and published by Claude.

**Live projects:** https://bjb81.github.io/claude-projects/

## How to start a new project

1. Go to [claude.ai/code](https://claude.ai/code) (or the Code tab in the Claude desktop or phone app).
2. Pick the `bjb81/claude-projects` repository.
3. Describe what you want in plain English, for example: "Build me a tip calculator I can use on my phone."

Claude follows the workflow in [CLAUDE.md](CLAUDE.md): design, build, test, review, publish, and report back with a live link.

## How to change a project

Same steps, and say which project: "In run-log, add a weekly mileage goal."

## What is in this repo

| Path | What it is |
|---|---|
| `projects/<name>/` | One folder per project, each with a DESIGN.md, README.md, and tests |
| `CLAUDE.md` | The instructions Claude follows every session |
| `.claude/skills/` | Skills: build-project (the workflow), frontend-design, webapp-testing |
| `.claude/settings.json` | Permissions and the setup step that runs when a session starts |
| `scripts/` | Test, setup, local server, and site build scripts |
| `.github/workflows/` | Runs every test on GitHub and publishes static projects to GitHub Pages |

## Run the tests yourself

```
bash scripts/test.sh
```
