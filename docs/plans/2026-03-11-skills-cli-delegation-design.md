# Skills CLI Delegation Design

**Status**: Approved
**Date**: 2026-03-11

## Summary

Skill 삭제 동작을 `fs.unlink` 직접 삭제에서 `skills` CLI(`npx skills remove`) 위임으로 전환한다. symlink + 원본 + 멀티 에이전트 메타데이터를 일괄 정리하여 관리 포인트를 줄인다.

## Background

- 현재: `deleteItemFn` → `file-writer.ts` → `fs.unlink(filePath)` 직접 삭제
- 문제: `~/.claude/skills/`의 스킬 대부분이 `~/.agents/skills/`로의 symlink → `fs.unlink`은 symlink만 삭제, 원본과 다른 에이전트의 참조는 남음
- skills CLI(`npx skills remove`)는 경로 기반으로 동작하여 직접 생성 파일도 처리 가능 (테스트 확인 완료)

## Design

### 1. skills-cli-service.ts (신규)

```typescript
// src/services/skills-cli-service.ts

interface SkillsRemoveOptions {
  name: string
  scope: "user" | "project"    // user → --global, project → cwd
  agent?: string               // 특정 에이전트만 제거 시
  projectPath?: string         // project scope 시 cwd
}

interface SkillsCliResult {
  success: boolean
  output: string
}

export async function removeSkill(options: SkillsRemoveOptions): Promise<SkillsCliResult>
```

- `-y` 항상 첨부 (비대화형)
- scope `user` → `--global` 플래그, `project` → `projectPath`를 cwd로
- agent 지정 시 `--agent <name>`, 미지정 시 전체 에이전트 제거
- `claude-cli.ts`의 기존 spawn 패턴 참고

### 2. deleteItemFn 변경

```typescript
// src/server/items.ts
handler: async ({ data }) => {
  if (data.type === "skill") {
    const result = await removeSkill({ ... })
    if (!result.success) throw new Error(result.output)
    return { success: true }
  }
  // 기존 fs.unlink 유지 (agent, hook 등)
  await deleteFile(filePath)
  return { success: true }
}
```

- input validator에 `agent?: string` 추가
- skill 타입만 CLI 분기, 나머지 타입은 기존 동작 유지

### 3. UI 삭제 메뉴 분리

`entity-actions.ts`에서 skill 타입의 삭제 액션을 2개로 분리:

1. **"Delete"** — 전체 에이전트에서 제거
2. **"Remove from \<agent\>"** — 특정 에이전트에서만 제거

## File Changes

| File | Change |
|---|---|
| `src/services/skills-cli-service.ts` | **New** — `removeSkill()` |
| `src/server/items.ts` | skill 분기 추가, input에 `agent?` 추가 |
| `src/lib/entity-actions.ts` | skill 삭제 메뉴 2개로 분리 |
| `src/services/file-writer.ts` | 변경 없음 |

## Future Extensions

- `add`: 마켓플레이스 도입 시 또는 스코프 전환(global ↔ project) 시 도입
- `check`/`update`: 대시보드에 "업데이트 가능" 배지 표시 (다음 작업)
