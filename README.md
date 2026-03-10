# agentfiles

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)

A local GUI for discovering, understanding, and managing your AI agent workflows.

Run `npx agentfiles` to open a web-based dashboard on localhost that manages `~/.claude/`, `~/.codex/`, and project-level agent configs in one place.

**[한국어](README.ko.md)**

## Why

AI coding agents like Claude Code rely on config files — CLAUDE.md, Skills, Hooks, MCP servers, Plugins. You compose these to build your own dev workflow.

The problem:

1. **Hard to manage** — Config files are scattered across multiple paths. Global vs project scope relationships aren't visible at a glance.
2. **Hard to understand** — You install a Plugin or Skill, but figuring out what it actually does means reading long markdown files.
3. **Hard to discover** — Skills, MCP servers, and Plugins live in different places with no unified search.

agentfiles solves all three:

- **Visibility** — See all your config files and what they do at a glance
- **Management** — Manage Skills, MCP, Plugins, and Hooks from a GUI
- **Understanding** — AI explains your workflow in your preferred language (v1 planned)

## Features

- **Dashboard** — Board-style overview of all configs with scope grouping
- **CLAUDE.md Editor** — Edit global and project-scoped CLAUDE.md files
- **Hooks Editor** — 17 events, 3 hook types, built-in templates
- **Skills Manager** — Markdown preview/source toggle, frontmatter badges
- **Plugin Manager** — Enable/disable toggles
- **MCP Servers** — Add/remove/enable management
- **Settings** — Global/Project settings.json editor
- **i18n** — English/Korean (Paraglide)

## Quick Start

```bash
npx agentfiles
```

Opens automatically in Chrome app mode on localhost.

## Development

### Prerequisites

- Node.js 20+
- pnpm

### Setup

```bash
pnpm install
pnpm dev          # Dev server at localhost:3000
```

### Commands

```bash
pnpm build        # Production build
pnpm test         # Run tests
pnpm lint         # Biome lint
pnpm typecheck    # TypeScript type check
```

## Tech Stack

- **Framework**: TanStack Start (Vinxi/Nitro fullstack)
- **Frontend**: React 19, TanStack Query, shadcn/ui, Tailwind CSS v4
- **Backend**: Server Functions, Node.js
- **Language**: TypeScript (strict)
- **Testing**: Vitest
- **Linting**: Biome

## Architecture

```text
Browser (React SSR) → Server Functions → File System
                                       → Claude CLI (MCP/Plugin)
```

- **Read**: ConfigService parses markdown/JSON files directly
- **Write**: FileWriter saves markdown, delegates MCP/Plugin ops to Claude CLI
- **Data sync**: React Query polling

## Project Structure

```text
src/
  routes/          # File-based routing
  features/        # Feature modules (dashboard, hooks-editor, skills-editor, etc.)
  services/        # Server-side services (ConfigService, HooksService, etc.)
  server/          # Server Functions
  components/      # Shared UI components
  hooks/           # React hooks
  lib/             # Utilities
  shared/          # Shared types

messages/          # i18n messages (en/ko)
bin/               # CLI entry point
tests/             # Tests
```

## Security

- Binds to `127.0.0.1` only (localhost)
- Bearer token authentication
- No CORS (local app)
- Path traversal prevention

## License

MIT
