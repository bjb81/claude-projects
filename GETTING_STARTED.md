# Getting started

Your setup for having Claude design, code, test, and publish projects.

## Start a project

1. Open [claude.ai/code](https://claude.ai/code), or the **Code** tab in the Claude desktop or phone app.
2. Select the repository `bjb81/claude-projects`.
3. Paste a prompt from the next section and send it.
4. Wait for the report. It has the live link, how to use it, and the test results.

## Prompts to copy

New website or app:

```
Build me <what it is>. It is for <who> to <do what>. It must <key features>. It should work well on my phone.
```

New Python tool:

```
Make me a Python tool that <does what> with <which files or data>. I'll run it on my Windows PC.
```

Change an existing project:

```
In <project name>, <change you want>. Keep everything else working.
```

Something is broken:

```
In <project name>, <what you did>, I expected <what should happen>, but <what happened>. Find the cause, fix it, add a test so it stays fixed, and publish.
```

App that needs logins, shared data, or secret keys:

```
Build me <what it is> as a Vercel project. Users need to <log in / share data>. Tell me exactly what I need to click on Vercel.
```

## What Claude does on its own

| Step | What happens |
|---|---|
| Design | Writes DESIGN.md with features, screens, data, and acceptance criteria |
| Build | Writes the code using the project templates |
| Test | Writes unit and browser tests for every criterion, on desktop and phone, and runs them until they pass |
| Review | Checks phone layout, accessibility, errors, and security, and looks at screenshots |
| Publish | Commits, merges to main, waits for GitHub's tests, and confirms the live page |
| Report | Sends you a short table with the link and results |

## What still needs you

| When | What you do | Why |
|---|---|---|
| First Vercel project | Sign in at vercel.com with GitHub, import the repo, set Root Directory to `projects/<name>`, click Deploy | Claude cannot create accounts for you |
| An app needs a secret key (API key, password) | Add it where Claude tells you (claude.ai/code environment secrets, GitHub secrets, or Vercel settings) | Secrets must never be in this public repo |
| Anything that costs money | Approve and pay yourself | Claude never buys or signs up for you |
| Claude asks you to check a live page | Open the link once and confirm it looks right | Cloud sessions usually cannot open github.io; Claude confirms the publish through GitHub instead |
| Claude says a pull request needs merging | Click **Merge** on the link it gives you | Only if a direct publish is ever blocked |

## Where things are

| Item | Link |
|---|---|
| All live projects | https://bjb81.github.io/claude-projects/ |
| The code | https://github.com/bjb81/claude-projects |
| Test and publish runs | https://github.com/bjb81/claude-projects/actions |
| Start a session | https://claude.ai/code |

## Good to know

| Topic | Detail |
|---|---|
| Public repo | Everything in this repo is visible to anyone. Do not ask Claude to put private data (health records, finances, family details) in a project's code or test files. |
| Browser data | Static apps such as Run Log store data in the browser on each device. Your phone and PC keep separate copies, and clearing browser data erases it. Use Export to keep a backup. |
| Usage limits | Large builds use a lot of your plan's usage. If you hit a limit, the session pauses; continue it later. |
| Phase 2: your PC | When you want Claude working on files on your PC, ask: "Set up Claude Code on my Windows PC for the claude-projects repo." Claude installs Git, Node, Python, VS Code, and Claude Code and clones the repo. |
