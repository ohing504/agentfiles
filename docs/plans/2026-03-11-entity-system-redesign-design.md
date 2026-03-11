# Entity System Architecture Redesign

**Status:** Completed
**Date:** 2026-03-11

## Problem

7개 엔티티가 각각 별도 리스트/상세 패널을 보유하여 코드 중복 극심 (15+ 컴포넌트). 레거시 에디터 페이지가 대시보드와 기능 중복. `features/` 폴더 구조가 앱 규모 대비 과도.

## Solution

1. **Panel Primitives** — shadcn 스타일 compound components (`Panel`, `DetailPanel`)
2. **EntityConfig<T>** — 제네릭 설정 객체 (icon, actions, getKey, getLabel, groupBy, trailing, DetailContent)
3. **EntityListPanel / EntityDetailPanel** — config 기반 제네릭 렌더러
4. **엔티티별 DetailView** — 7개 전용 뷰 (`components/entity/`)
5. **레거시 병합** — 에디터 다이얼로그를 대시보드로 이동, 에디터 라우트 전체 제거
6. **Flat 구조** — `features/` 해체 → `components/board/`, `config/entities/`, `hooks/`, `server/`, `lib/`

### 엔티티별 특수 처리

| 엔티티 | 리스트 | 특수 처리 |
|--------|--------|----------|
| Skill, Agent, Memory | flat | 없음 |
| Hook | grouped | `groupBy: "event"` |
| MCP | flat + toggle | `trailing: Switch` |
| Plugin, File | tree | 별도 전용 렌더러 |
