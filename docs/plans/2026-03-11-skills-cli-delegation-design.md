# Skills CLI Delegation Design

**Status**: Completed
**Date**: 2026-03-11

## Summary

Skill 삭제를 `fs.unlink` 직접 삭제에서 `skills` CLI(`npx skills remove`) 위임으로 전환. symlink + 원본 + 멀티 에이전트 메타데이터를 일괄 정리.

## Key Decisions

- `skills-cli-service.ts` 전용 서비스로 CLI 래핑 (향후 `add`, `check`, `update` 확장 대비)
- skill 타입만 CLI 분기, 나머지(agent, command)는 기존 `fs.unlink` 유지
- UI에서 "에이전트에서 제거" + "전체 삭제" 2가지 메뉴 제공
- 확인 다이얼로그에 각 삭제 범위 설명 표시

## Future Extensions

- `add`: 마켓플레이스 도입 시 또는 스코프 전환(global ↔ project) 시 도입
- `check`/`update`: 대시보드에 "업데이트 가능" 배지 표시
