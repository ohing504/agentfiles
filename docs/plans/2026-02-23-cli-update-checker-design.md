# CLI Update Checker - Design

## Summary

StatusBar의 CLI 버전 표시에 npm registry 기반 최신 버전 체크를 추가하여, 업데이트 가능 시 amber 경고로 알려주고 클릭하면 `claude update` 명령어를 클립보드에 복사한다.

## Approach

기존 `useCliStatus` 훅과 `checkCliAvailable()` 서비스를 확장하여 `latestVersion` 필드를 추가한다. 별도 훅/서버 함수를 만들지 않고 기존 흐름에 통합한다.

## Changes

### 1. Type (`src/shared/types.ts`)

`CliStatus` 인터페이스에 `latestVersion` 필드 추가:

```ts
export interface CliStatus {
  available: boolean
  version?: string
  latestVersion?: string  // NEW
  reason?: string
}
```

### 2. Server Service (`src/services/claude-cli.ts`)

`fetchLatestVersion()` 함수 추가 - npm registry API 호출:

```ts
async function fetchLatestVersion(): Promise<string | undefined> {
  try {
    const res = await fetch('https://registry.npmjs.org/@anthropic-ai/claude-code/latest')
    if (!res.ok) return undefined
    const data = await res.json()
    return data.version
  } catch {
    return undefined
  }
}
```

`checkCliAvailable()`에서 `claude --version`과 `fetchLatestVersion()`을 `Promise.all`로 병렬 실행. 결과에 `latestVersion` 포함.

### 3. Hook (`src/hooks/use-config.ts`)

`useCliStatus()`에 `refetchInterval: 300_000` (5분) 추가하여 주기적 폴링.

### 4. UI (`src/components/StatusBar.tsx`)

#### 최신 버전일 때
- 초록색 `CheckCircle2` 아이콘 + "Claude CLI {version}"
- tooltip: "You're up to date"

#### 업데이트 가능할 때
- amber색 `ArrowUpCircle` 아이콘 + "Claude CLI {version} → {latestVersion}"
- tooltip: "Click to copy update command"
- 클릭 시: `claude update`를 클립보드에 복사 + sonner toast 알림

#### latestVersion 확인 실패 시
- 현재와 동일 (초록색 체크 + 버전만 표시, tooltip 없음)

### 5. Version Comparison

`claude --version` 출력이 `"2.1.50 (Claude Code)"` 형태이므로 버전 숫자만 추출 후 `latestVersion`과 단순 문자열 비교.

## Files to Modify

| File | Change |
|---|---|
| `src/shared/types.ts` | `latestVersion` field |
| `src/services/claude-cli.ts` | `fetchLatestVersion()`, modify `checkCliAvailable()` |
| `src/hooks/use-config.ts` | Add `refetchInterval: 300_000` |
| `src/components/StatusBar.tsx` | Update UI with conditional rendering, tooltip, click-to-copy |
