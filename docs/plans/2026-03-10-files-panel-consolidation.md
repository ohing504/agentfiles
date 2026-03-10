# Files Panel Consolidation Implementation Plan

**Status**: Completed (2026-03-10)

**Goal:** Remove the dedicated `/files` page and upgrade the dashboard Files panel with FileViewer + Edit dropdown, consolidating into a single entry point.

**Design:** `docs/plans/2026-03-10-files-panel-consolidation-design.md`

## Summary of Changes

| Action | File | Notes |
|--------|------|-------|
| Modify | `FileDetailPanel.tsx` | `<pre>` → FileViewer + Edit dropdown |
| Modify | `Sidebar.tsx` | Remove `/files` link |
| Delete | `src/routes/files/route.tsx` | Route |
| Delete | `src/routes/global/files/route.tsx` | Redirect route |
| Delete | `src/routes/project/files/route.tsx` | Redirect route |
| Delete | `FilesPage.tsx` | Page wrapper |
| Delete | `FilesPageContent.tsx` | Page layout |
| Delete | `FilesScopeTabs.tsx` | Scope tabs |
| Delete | `FilesContext.tsx` | Page state context |

**Preserved (reused by dashboard):**
- `FileTree.tsx` — already imported by `FilesPanel.tsx`
- `files.functions.ts`, `files.queries.ts` — server functions & React Query hooks
- `files-scanner.service.ts` — file scanning service
- `constants.ts` — extension icons, known items
- `FileViewer.tsx` — shared viewer component
