# Open Source Launch Prep — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prepare agentfiles repo for public open-source launch with polished English README, Korean README, GitHub meta, and community files.

**Architecture:** Documentation and config changes only. No code changes. English README as main, README.ko.md as separate file. Minimal .github/ setup for solo project.

**Tech Stack:** Markdown, GitHub issue templates (YAML), package.json

---

### Task 1: Update package.json metadata

**Files:**
- Modify: `package.json`

**Step 1: Add repository, homepage, bugs, author fields**

Add these fields to package.json:

```json
{
  "author": "Youngsup Oh",
  "homepage": "https://github.com/ohing504/agentfiles#readme",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/ohing504/agentfiles.git"
  },
  "bugs": {
    "url": "https://github.com/ohing504/agentfiles/issues"
  }
}
```

**Step 2: Verify**

Run: `node -e "const p=require('./package.json'); console.log(p.author, p.homepage, p.repository.url, p.bugs.url)"`
Expected: All four fields printed correctly.

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add author, homepage, repository, bugs to package.json"
```

---

### Task 2: Update LICENSE author

**Files:**
- Modify: `LICENSE`

**Step 1: Change copyright holder**

Change:
```text
Copyright (c) 2026 agentfiles contributors
```

To:
```text
Copyright (c) 2026 Youngsup Oh
```

**Step 2: Commit**

```bash
git add LICENSE
git commit -m "chore: update LICENSE copyright holder"
```

---

### Task 3: Write English README.md

**Files:**
- Modify: `README.md` (full rewrite)

**Step 1: Write the new README**

Structure:
1. Title + one-line description
2. Badges: MIT License, npm version, Node >= 20
3. What is agentfiles? (3-4 sentences — what it does and why)
4. Features (bullet list of current v1 features)
5. Quick Start (`npx agentfiles`)
6. Tech Stack (concise list)
7. Development (install, dev, build, test, lint commands)
8. License (MIT + link)
9. Footer: link to README.ko.md

Badge markdown references:
```markdown
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/agentfiles.svg)](https://www.npmjs.com/package/agentfiles)
[![Node.js >= 20](https://img.shields.io/badge/Node.js-%3E%3D20-green.svg)](https://nodejs.org/)
```

Key writing guidelines:
- Keep it scannable — someone should understand the project in 10 seconds
- Lead with the user benefit, not the tech
- English only, concise, no emojis
- Reference the design doc for the "What & Why" messaging:
  - AI agent tools (Claude Code, etc.) use config files spread across multiple locations
  - agentfiles provides a local GUI to discover, understand, and manage them
  - `npx agentfiles` — zero install, opens in browser

**Step 2: Review the README renders correctly**

Run: `head -50 README.md` to verify structure looks right.

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README in English for open-source launch"
```

---

### Task 4: Create README.ko.md

**Files:**
- Create: `README.ko.md`

**Step 1: Write Korean README**

- Same structure as English README
- Based on the current Korean README content but restructured to match English version
- Add header note: `[English](README.md) | **한국어**`
- English README should have: `**English** | [한국어](README.ko.md)`

**Step 2: Update English README header**

Add language switcher line at the top of `README.md` (after title, before badges).

**Step 3: Commit**

```bash
git add README.ko.md README.md
git commit -m "docs: add Korean README and language switcher links"
```

---

### Task 5: Create GitHub issue templates

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug_report.md`
- Create: `.github/ISSUE_TEMPLATE/feature_request.md`

**Step 1: Create bug report template**

```markdown
---
name: Bug Report
about: Report a bug to help us improve
title: '[Bug] '
labels: bug
---

## Description

A clear description of the bug.

## Steps to Reproduce

1. Run `npx agentfiles`
2. Navigate to ...
3. Click on ...

## Expected Behavior

What should happen.

## Actual Behavior

What actually happens.

## Environment

- OS: [e.g., macOS 15, Ubuntu 24.04]
- Node.js: [e.g., 20.x]
- Browser: [e.g., Chrome 131]
```

**Step 2: Create feature request template**

```markdown
---
name: Feature Request
about: Suggest a new feature or improvement
title: '[Feature] '
labels: enhancement
---

## Problem

What problem does this solve?

## Proposed Solution

How should it work?

## Alternatives Considered

Any other approaches you've thought about.
```

**Step 3: Verify directory structure**

Run: `find .github -type f`
Expected:
```text
.github/ISSUE_TEMPLATE/bug_report.md
.github/ISSUE_TEMPLATE/feature_request.md
```

**Step 4: Commit**

```bash
git add .github/
git commit -m "chore: add GitHub issue templates for bug reports and feature requests"
```

---

### Task 6: Final review and verification

**Step 1: Verify all files are committed**

Run: `git status`
Expected: clean working tree.

**Step 2: Review file list**

Run: `git log --oneline -5`
Verify 5 commits from this plan are present.

**Step 3: Spot-check README renders**

Run: `cat README.md | head -30` — verify badges, title, language switcher.
Run: `cat README.ko.md | head -30` — verify matches English structure.

**Step 4: Run quality checks**

```bash
pnpm lint && pnpm typecheck
```

Expected: both pass (no code changes, but verify nothing broke).

---

## Post-Implementation (manual, when ready to go public)

These steps are for when v2 features are ready:

1. GitHub → Settings → Change visibility → Public
2. Set repo description: "Discover, understand, and cultivate your AI agent workflows"
3. Add topics: `claude-code`, `ai-agent`, `mcp`, `developer-tools`, `workflow`
4. (Optional) Add screenshots to `docs/screenshots/` and update READMEs
