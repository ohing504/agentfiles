# CLI Update Checker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** StatusBar의 CLI 버전 표시에 npm registry 기반 최신 버전 체크를 추가하여, 업데이트 가능 시 amber 경고 + 클릭 복사 기능을 제공한다.

**Architecture:** 기존 `checkCliAvailable()` 서비스에 npm registry fetch를 병렬로 추가하고, `useCliStatus` 훅에 5분 폴링을 설정하며, `StatusBarCliVersion` 컴포넌트에서 조건부 UI를 렌더링한다.

**Tech Stack:** React 19, TanStack Query, Radix Tooltip (already in project), sonner (new - for toast), lucide-react

---

### Task 1: Add sonner toast library

**Files:**
- Modify: `package.json`
- Create: `src/components/ui/sonner.tsx`
- Modify: `src/routes/__root.tsx`

**Step 1: Install sonner**

Run: `pnpm add sonner`

**Step 2: Create sonner component wrapper**

Create `src/components/ui/sonner.tsx`:

```tsx
import { Toaster as Sonner } from "sonner"

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        className: "text-sm",
      }}
    />
  )
}
```

**Step 3: Add Toaster to root layout**

Modify `src/routes/__root.tsx` - add `<Toaster />` inside the body, after `</TooltipProvider>`:

```tsx
import { Toaster } from "@/components/ui/sonner"
// ... existing imports

// Inside RootComponent, after </TooltipProvider>:
<Toaster />
```

**Step 4: Verify dev server loads without errors**

Run: `pnpm typecheck`
Expected: No errors

**Step 5: Commit**

```text
feat(ui): add sonner toast library
```

---

### Task 2: Extend CliStatus type

**Files:**
- Modify: `src/shared/types.ts:87-91`

**Step 1: Add latestVersion field**

Change `CliStatus` interface from:

```ts
export interface CliStatus {
  available: boolean
  version?: string
  reason?: string
}
```

To:

```ts
export interface CliStatus {
  available: boolean
  version?: string
  latestVersion?: string
  reason?: string
}
```

**Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: PASS (latestVersion is optional, no breaking changes)

**Step 3: Commit**

```text
feat(types): add latestVersion to CliStatus
```

---

### Task 3: Add npm registry fetch to claude-cli service

**Files:**
- Modify: `src/services/claude-cli.ts:23-34`

**Step 1: Add fetchLatestVersion function**

Add after `execClaude` function (after line 21):

```ts
async function fetchLatestVersion(): Promise<string | undefined> {
  try {
    const res = await fetch(
      "https://registry.npmjs.org/@anthropic-ai/claude-code/latest",
    )
    if (!res.ok) return undefined
    const data = (await res.json()) as { version?: string }
    return data.version
  } catch {
    return undefined
  }
}
```

**Step 2: Modify checkCliAvailable to include latestVersion**

Change `checkCliAvailable` from:

```ts
export async function checkCliAvailable(): Promise<CliStatus> {
  try {
    const stdout = await execClaude(["--version"])
    return { available: true, version: stdout.trim() }
  } catch {
    return {
      available: false,
      reason:
        "Claude CLI not found. Install it with: npm install -g @anthropic-ai/claude-code",
    }
  }
}
```

To:

```ts
export async function checkCliAvailable(): Promise<CliStatus> {
  try {
    const [stdout, latestVersion] = await Promise.all([
      execClaude(["--version"]),
      fetchLatestVersion(),
    ])
    return { available: true, version: stdout.trim(), latestVersion }
  } catch {
    return {
      available: false,
      reason:
        "Claude CLI not found. Install it with: npm install -g @anthropic-ai/claude-code",
    }
  }
}
```

**Step 3: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: PASS

**Step 4: Commit**

```text
feat(service): fetch latest CLI version from npm registry
```

---

### Task 4: Add refetchInterval to useCliStatus hook

**Files:**
- Modify: `src/hooks/use-config.ts:239-249`

**Step 1: Add 5-minute polling**

Change `useCliStatus` from:

```ts
export function useCliStatus() {
  return useQuery({
    queryKey: queryKeys.cliStatus.all,
    queryFn: async () => {
      const { getCliStatusFn } = await import("@/server/cli-status")
      return getCliStatusFn()
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })
}
```

To:

```ts
export function useCliStatus() {
  return useQuery({
    queryKey: queryKeys.cliStatus.all,
    queryFn: async () => {
      const { getCliStatusFn } = await import("@/server/cli-status")
      return getCliStatusFn()
    },
    staleTime: 60_000,
    refetchInterval: 300_000,
    refetchOnWindowFocus: true,
  })
}
```

**Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```text
feat(hooks): add 5-minute polling to useCliStatus
```

---

### Task 5: Update StatusBarCliVersion UI

**Files:**
- Modify: `src/components/StatusBar.tsx`

**Step 1: Update imports**

Change line 1 from:

```tsx
import { Check, CheckCircle2, FolderOpen, XCircle } from "lucide-react"
```

To:

```tsx
import { ArrowUpCircle, Check, CheckCircle2, FolderOpen, XCircle } from "lucide-react"
```

Add new imports after existing imports:

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
```

**Step 2: Add version extraction helper**

Add before `StatusBarCliVersion` function:

```ts
/** Extract semver from "2.1.50 (Claude Code)" → "2.1.50" */
function extractVersion(raw: string): string {
  return raw.replace(/\s*\(.*\)$/, "")
}
```

**Step 3: Rewrite StatusBarCliVersion component**

Replace the entire `StatusBarCliVersion` function (lines 55-71) with:

```tsx
function StatusBarCliVersion() {
  const { data: cliStatus, isLoading } = useCliStatus()

  if (isLoading || !cliStatus) return null

  if (!cliStatus.available) {
    return (
      <div className="flex items-center gap-1 px-2 text-xs">
        <XCircle className="size-3 text-destructive" />
        <span>CLI unavailable</span>
      </div>
    )
  }

  const current = extractVersion(cliStatus.version ?? "")
  const latest = cliStatus.latestVersion
  const hasUpdate = latest && current !== latest

  const handleClick = () => {
    if (!hasUpdate) return
    navigator.clipboard.writeText("claude update")
    toast.success("Copied 'claude update' to clipboard")
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          className={`flex items-center gap-1 px-2 text-xs ${
            hasUpdate
              ? "text-amber-500 hover:bg-accent/50 rounded-sm py-0.5 cursor-pointer"
              : ""
          }`}
          disabled={!hasUpdate}
        >
          {hasUpdate ? (
            <>
              <ArrowUpCircle className="size-3 text-amber-500" />
              <span>
                Claude CLI {current} → {latest}
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3 text-green-500" />
              <span>Claude CLI {current || cliStatus.version}</span>
            </>
          )}
        </button>
      </TooltipTrigger>
      {(hasUpdate || latest) && (
        <TooltipContent side="top">
          {hasUpdate
            ? "Click to copy update command"
            : "You're up to date"}
        </TooltipContent>
      )}
    </Tooltip>
  )
}
```

**Step 4: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: PASS

**Step 5: Verify build passes**

Run: `pnpm build`
Expected: PASS

**Step 6: Commit**

```sql
feat(statusbar): show CLI update availability with click-to-copy
```

---

### Task 6: Manual verification

**Step 1: Start dev server and verify UI**

Open browser at localhost:3000, check:
- StatusBar bottom-right shows CLI version with green check
- Tooltip shows "You're up to date" on hover (if versions match)
- After 5 minutes, version re-checks (or manually trigger by refocusing window)

**Step 2: Run full quality checks**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Expected: All pass

**Step 3: Final commit if any lint fixes needed**

```text
chore: fix lint issues
```
