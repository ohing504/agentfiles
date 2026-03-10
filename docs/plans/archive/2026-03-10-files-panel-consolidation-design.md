# Files Panel Consolidation Design

**Date**: 2026-03-10
**Status**: Completed

## Goal

Remove the dedicated `/files` page and upgrade the dashboard Files panel with full-featured file viewing, consolidating into a single entry point.

## Decisions

| Decision | Choice | Status |
|----------|--------|--------|
| `/files` page | Remove entirely | Done |
| Dashboard detail panel | Upgrade with FileViewer + Edit dropdown | Done |
| Route handling | Delete route files (no redirect, 404) | Done |
| File tree component | Adopt `FileTree.tsx` from files-editor (ListItem/ListSubItem) | Done (already used) |
| `files-editor/` directory | Keep name as-is for now | Done |

## Changes (Completed)

### Deleted (7 files)

- ~~`src/routes/files/route.tsx`~~
- ~~`src/routes/global/files/route.tsx`~~
- ~~`src/routes/project/files/route.tsx`~~
- ~~`src/features/files-editor/components/FilesPage.tsx`~~
- ~~`src/features/files-editor/components/FilesPageContent.tsx`~~
- ~~`src/features/files-editor/components/FilesScopeTabs.tsx`~~
- ~~`src/features/files-editor/context/FilesContext.tsx`~~

### Modified (2 files)

- `FileDetailPanel.tsx` — `<pre>` replaced with FileViewer + Edit dropdown (VS Code/Cursor)
- `Sidebar.tsx` — `/files` navigation link and `FolderOpenIcon` import removed

### Preserved (reused by dashboard)

- `components/FileTree.tsx` — imported by dashboard FilesPanel
- `api/` — server functions and queries unchanged
- `services/` — scanner service unchanged
- `constants.ts` — icon/extension mappings unchanged
- `src/components/FileViewer.tsx` — shared viewer unchanged

## Data Flow (Current)

```text
Dashboard BoardLayout
  └─ FilesPanel (scope props)
      └─ FileTree (from files-editor)
          └─ useFileTreeQuery(scope)
  └─ Sheet detail panel
      └─ FileDetailPanel
          ├─ DetailPanelHeader + Edit dropdown (openInEditorFn)
          └─ FileViewer (Preview/Source, syntax highlight, copy)
              └─ useFileContentQuery(filePath)
```

## Verification

- typecheck: pass
- lint: pass (pre-existing warnings only)
- build: pass
- tests: 279/280 pass (1 pre-existing E2E failure unrelated)
