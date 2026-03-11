# CI/CD Pipeline Design

**Status**: Approved
**Date**: 2026-03-11

## Goal

GitHub Actions 기반 CI/CD 파이프라인 구축: PR 체크, release-please 자동 릴리즈, npm publish

## Architecture

```text
PR → ci.yml (lint/typecheck/test/build)
  ↓ merge
main → release.yml (release-please → Release PR 생성)
  ↓ Release PR merge
tag v* → publish.yml (build + npm publish + GitHub Release)
```

## Decisions

| 항목 | 선택 | 이유 |
|------|------|------|
| CI 범위 | CI + CD + Release | 전체 자동화 |
| 버전 관리 | release-please | Conventional Commits 기반, changelog 자동 생성 |
| 트리거 | PR + 태그 기반 | PR에서 CI, v* 태그에서 publish (안전) |
| npm 인증 | GitHub Secrets NPM_TOKEN | 기존 granular access token 활용 |

## Workflow Files

### 1. `.github/workflows/ci.yml`
- **트리거**: PR 생성/업데이트
- **작업**: pnpm install → lint → typecheck → test → build
- **환경**: Ubuntu latest, Node 20, pnpm

### 2. `.github/workflows/release.yml`
- **트리거**: main 브랜치 푸시
- **작업**: release-please action 실행
- **동작**: Conventional Commits 분석 → Release PR 자동 생성 (버전 범프 + CHANGELOG.md)

### 3. `.github/workflows/publish.yml`
- **트리거**: v* 태그 푸시 (release-please가 생성)
- **작업**: build → npm publish
- **인증**: `NPM_TOKEN` secret
- **출력**: npm 패키지 + GitHub Release

## Required Setup

1. GitHub Secrets에 `NPM_TOKEN` 등록
2. release-please 설정 (node, package.json 기반)
3. Branch protection 재활성화 (CI 완료 후)
