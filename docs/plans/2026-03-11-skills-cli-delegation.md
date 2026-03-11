# Skills CLI Delegation — Implementation Summary

**Status**: Completed
**Date**: 2026-03-11

## Changed Files

| File | Change |
|---|---|
| `src/services/skills-cli-service.ts` | New — `removeSkill()` CLI 래퍼 |
| `src/server/items.ts` | skill 타입 분기 + `agent` 파라미터 |
| `src/lib/entity-actions.ts` | `remove-from-agent` 액션 추가, 메뉴 순서 조정 |
| `src/components/ui/entity-action-menu.tsx` | 확인 다이얼로그 통합, stopPropagation |
| `src/features/dashboard/hooks/use-entity-action-handler.ts` | toast.promise, 타겟 invalidation, i18n |
| `src/features/skills-editor/api/skills.queries.ts` | `agent?` 파라미터 추가 |
| `messages/{en,ko}/common.json` | 삭제/제거 관련 i18n 메시지 |
