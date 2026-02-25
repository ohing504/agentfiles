# Plugins Feature Code Review

> Date: 2026-02-26
> Reviewers: Code Reviewer (security/quality) + Quality Reviewer (React patterns/performance)
> Scope: `src/features/plugins-editor/`, `src/services/plugin-service.ts`, `src/routes/plugins/`

## Overall Assessment

| Area | Rating |
|------|--------|
| Architecture / Folder Structure | Excellent - Feature-based colocation, 3-panel layout, clean SoC |
| Type Safety | Excellent - `keyof PluginComponents`, `tsc --noEmit` passes |
| Tests | Good - 31 tests in plugin-service with edge case coverage |
| Context / State Management | Good - Proper useMemo/useCallback discipline |
| i18n | Partial - Some components use `m.plugin_*()`, others hardcoded |

**Total Issues: 18** (Critical 1 / High 5 / Medium 7 / Low 5)

## Positive Observations

1. Feature-based module structure with co-located components/api/context/types
2. Context memoization discipline - `useMemo`/`useCallback` correctly applied
3. Query key factory follows TkDodo pattern with hierarchical keys
4. TypeScript `keyof PluginComponents` for compile-time safety
5. Confirmation dialog for destructive actions (uninstall)
6. Service layer thoroughly tested (31 cases including edge cases)

---

## P0 - Immediate Fix (Critical/High)

### 1. Dead code: `getPluginComponentsFn` with no path validation
- **Severity**: Critical (Security)
- **File**: `plugins.functions.ts:18-22`
- **Adopt**: YES (delete)
- **Description**: Unused server function that accepts arbitrary `installPath` without validation. Never imported anywhere but exposed as server endpoint in TanStack Start.
- **Fix**: Remove entirely
- **Benefit**: Eliminates attack surface, removes dead code

### 2. `getPluginsFn` missing `projectPath` validation
- **Severity**: High (Security)
- **File**: `plugins.functions.ts:12-16`
- **Adopt**: YES
- **Description**: Other server functions use `validateProjectPath()` but this one passes `projectPath` directly to `getPlugins()`.
- **Fix**: Add `validateProjectPath()` when `projectPath` is provided
- **Benefit**: Consistent input validation across all server functions

### 3. Hooks item ID mismatch (functional bug)
- **Severity**: High (Bug)
- **Files**: `PluginOverview.tsx:47-56` vs `PluginComponentDetail.tsx:41-89`
- **Adopt**: YES
- **Description**: Overview uses `eventName` as ID, but Detail expects `${event}-${gi}-${hi}` format. Clicking hook badge in overview never shows detail.
- **Fix**: Use `${event}-0-0` format in overview to match first hook entry
- **Benefit**: Fixes broken hook navigation

---

## P1 - Soon (Medium - High Value)

### 4. Feature-level ErrorBoundary missing
- **Severity**: High
- **File**: `PluginsPage.tsx`
- **Adopt**: YES
- **Description**: Only app-level ErrorBoundary exists. Plugin render error crashes entire app.
- **Fix**: Wrap `PluginsPageInner` in feature-level ErrorBoundary
- **Benefit**: Fault isolation, users can navigate away from broken plugin

### 5. Stale selection state after uninstall
- **Severity**: High
- **File**: `PluginsContext.tsx:74-77`
- **Adopt**: YES
- **Description**: Race between query invalidation and `setSelectedPluginId(null)` after uninstall causes UI flicker.
- **Fix**: Add `useEffect` to auto-clear selection when plugin disappears from data
- **Benefit**: Self-healing state, no UI flicker

### 6. Toggle/Uninstall missing error toast
- **Severity**: Medium
- **Files**: `PluginActionBar.tsx:73-83, 136-138`
- **Adopt**: YES
- **Description**: Update button has `toast.error()` but toggle and uninstall silently swallow errors.
- **Fix**: Add `onError` callback with `toast.error()`
- **Benefit**: User feedback on failure

### 7. `PluginListItem` not memoized
- **Severity**: Medium (Performance)
- **File**: `PluginListItem.tsx`
- **Adopt**: YES
- **Description**: Every context change re-renders all list items. Props are stable for `React.memo`.
- **Fix**: Wrap with `React.memo`
- **Benefit**: Only 2 items re-render on selection change instead of N

### 8. Duplicate item-extraction logic (DRY violation)
- **Severity**: Medium
- **Files**: `PluginOverview.tsx:23-64` vs `PluginComponentList.tsx:24-81`
- **Adopt**: YES
- **Description**: Nearly identical switch-case logic for extracting items from PluginComponents.
- **Fix**: Extract shared `getComponentItems()` utility, overview uses simplified view
- **Benefit**: Single source of truth, eliminates ID mismatch class of bugs

### 9. Missing accessible labels
- **Severity**: Medium (Accessibility)
- **Files**: `PluginActionBar.tsx:87-89`, `PluginOverview.tsx:110-114`, `PluginsPage.tsx:154-159`
- **Adopt**: YES
- **Description**: Icon-only buttons, search input, component section buttons lack `aria-label`.
- **Fix**: Add `aria-label` attributes
- **Benefit**: WCAG 2.1 AA compliance

### 10. Mutations in monolithic Context cause cascade re-renders
- **Severity**: Medium (Performance)
- **File**: `PluginsContext.tsx:122-154`
- **Adopt**: REVIEW THEN ADOPT
- **Description**: Mutations bundled in single context cause all consumers to re-render on isPending changes. Only `PluginActionBar` uses mutations.
- **Fix**: Move mutation calls directly to `PluginActionBar` instead of hoisting to context
- **Benefit**: Fewer unnecessary re-renders

---

## P2 - Planned (Medium - Normal Value)

### 11. i18n incomplete (hardcoded English strings)
- **Severity**: Medium
- **Files**: `PluginsPage.tsx`, `PluginActionBar.tsx`, `PluginComponentDetail.tsx`, `PluginComponentList.tsx`
- **Adopt**: YES
- **Description**: Many strings hardcoded in English instead of using `m.plugin_*()`.
- **Fix**: Replace with paraglide message calls
- **Benefit**: Full Korean/English language switching

### 12. `vscode://` URI hardcoded
- **Severity**: Medium
- **File**: `PluginActionBar.tsx:94-98`
- **Adopt**: DEFER
- **Description**: Edit button assumes VS Code. Most users likely use VS Code/Cursor currently.
- **Benefit**: Editor neutrality (future)

### 13. Search input not debounced
- **Severity**: Medium
- **File**: `PluginsPage.tsx:154-159`
- **Adopt**: DEFER
- **Description**: Plugin list realistically ~tens of items. No performance issue currently.
- **Benefit**: Preparation for large lists (not needed now)

---

## P3 - Optional (Low)

### 14. `pluginKeys` not in centralized `queryKeys`
- **Adopt**: YES
- **Benefit**: Consistent query key management

### 15. `SCOPE_ORDER/SCOPE_LABELS` in context file instead of constants
- **Adopt**: YES
- **Benefit**: Better file organization

### 16. `PluginComponentDetail` high cyclomatic complexity
- **Adopt**: OPTIONAL
- **Benefit**: Testability, readability

### 17. `getMarketplaces()` has no tests
- **Adopt**: YES
- **Benefit**: Complete test coverage

### 18. `AgentFileDetail` shows synthetic markdown instead of real file content
- **Adopt**: OPTIONAL
- **Benefit**: UX honesty
