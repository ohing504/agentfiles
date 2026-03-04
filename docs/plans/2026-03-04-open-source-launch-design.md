# Open Source Launch Prep Design

> Approach A: 문서 퍼스트 — v2 개발과 병행하며 문서/브랜딩 정비, v2 기능 준비 시 public 전환

## Context

- 현재 상태: v1 완료, v2 개발 중, GitHub repo private
- 목표: 오픈소스 공개 + 포트폴리오 활용
- 타겟: 글로벌 Claude Code 사용자 + 한국 AI 개발자
- 커뮤니티: 당분간 솔로 프로젝트

## Decisions

- **Git 히스토리**: 그대로 유지 (민감정보 없음 확인 완료)
- **README**: 영어 메인 + README.ko.md 분리
- **포트폴리오**: GitHub repo 자체가 포트폴리오 (별도 랜딩 없음)
- **커뮤니티 파일**: 최소 세팅 (issue template만)

---

## 1. README 리라이트

### README.md (영문 메인)

- Hero: 프로젝트명 + 한 줄 설명 + 배지 (license, version, node)
- 스크린샷 또는 데모 GIF 1장
- What & Why (3-4문장)
- Features bullet
- Quick Start (`npx agentfiles`)
- Tech Stack (간결)
- Development (최소 개발 가이드)
- License
- 하단에 README.ko.md 링크

### README.ko.md

- 현재 README.md 기반으로 정리
- 영문 README와 구조 동일

### 스크린샷

- `docs/screenshots/` 폴더에 대시보드 캡처 2-3장
- README에 인라인 이미지로 삽입

## 2. GitHub 메타 & 커뮤니티

### .github/ 구조

```text
.github/
  ISSUE_TEMPLATE/
    bug_report.md
    feature_request.md
```

### 포함하지 않는 것

- PR template, CODE_OF_CONDUCT, CONTRIBUTING.md, CI/CD — 솔로 프로젝트이므로 불필요

### GitHub repo 설정 (public 전환 시)

- Description: "Discover, understand, and cultivate your AI agent workflows"
- Topics: claude-code, ai-agent, mcp, developer-tools, workflow

## 3. 민감정보

스캔 완료, 이슈 없음:
- query-keys.ts: React Query 키 상수 (민감하지 않음)
- mcp-service.test.ts: mock 데이터 (실제 시크릿 아님)
- 커밋 히스토리에 .env 없음

## 4. 브랜딩

### package.json 보강

- `homepage`, `repository`, `bugs`: GitHub repo URL
- `author` 필드 추가

### LICENSE

- `agentfiles contributors` → 본인 이름으로 변경

### README 배지

- MIT License, npm version, Node.js >= 20

### 하지 않는 것

- 로고/아이콘, Social preview 이미지 — 나중에 필요 시 추가

---

## 작업 순서

| # | 작업 | 비고 |
|---|------|------|
| 1 | 스크린샷 촬영 | 대시보드, 에디터 2-3장 |
| 2 | README.md 영문 리라이트 | Hero + 스크린샷 + Features + Quick Start |
| 3 | README.ko.md 생성 | 영문과 구조 통일 |
| 4 | package.json 메타 보강 | homepage, repository, bugs, author |
| 5 | LICENSE 저자명 수정 | → 본인 이름 |
| 6 | .github/ 세팅 | issue template 2개 |
| 7 | 민감정보 최종 확인 | 이미 클리어 |

## 공개 시점

v2 핵심 기능 1-2개 완성 후:
- GitHub repo → public 전환
- Topics, Description 설정
