# Documentation Modernization Design

**Date**: 2026-03-11
**Status**: Completed

## Goal

Align all project documentation to the new version scheme (v0.x → v1 → v2 → v3) and fix inconsistencies across documents.

## Version Scheme

| Version | Scope |
|---------|-------|
| v0.x | Current prototype (board dashboard, editors, agent selector) |
| v1 | Dashboard consolidation + design polish + AI summary (CLI pipe) + marketplace (skills.sh) |
| v2 | AI Guide chat (OAuth/streaming) + Workflow Recipes + improvement suggestions |
| v3 | Multi-agent expansion (Cursor, Kiro, Windsurf) + sync |

## Document Roles

| Document | Role |
|----------|------|
| README.md | Project intro + current features + quick start |
| FEATURES.md | Product philosophy + core values + roadmap (what & why) |
| WORK.md | Execution tracking (Shipped / Next Up / Blocked) |
| ARCHITECTURE.md | Technical design (how) |
| CLAUDE.md | Development guide (for developers/AI) |

## Changes

### CLAUDE.md
- Remove "현재 상태: v1 완료, v2 진행 중" → replace with "상세 일정은 docs/WORK.md 참조"
- Rewrite Current Priority section with v1 goals
- Remove completed design doc from Key Documents
- (Already done: remove pages/ line, remove files route comment)

### WORK.md
- Replace "UI 전면 재설계" with specific items: panel consolidation, design polish, sidebar cleanup, legacy code removal
- Add "Files 패널 통합 (2026-03-10)" to Shipped
- Restructure Next Up to v1 scheme

### FEATURES.md
- Rewrite roadmap: v0.x ✅ → v1 (in progress) → v2 → v3

### ARCHITECTURE.md
- Section 5: "v2" → "v1" for AIService + MarketplaceService
- Mark ReleaseService as v2

### README.md
- Remove features marked as 예정
- Keep only currently working features

### EDITOR-GUIDE.md
- Delete files-editor section (lines 567-591)

### docs/plans/
- Keep as-is (archive later)
