# Rebranding: agentfiles → claude-code-studio (ccs)

> **Goal:** 프로젝트명을 `agentfiles`에서 `claude-code-studio`로 변경.
> 실행: `npx claude-code-studio`
> npm 가용성: **확인 완료** (2026-02-22)

---

## 리브랜딩 사유

- "agentfiles"는 AI 에이전트 설정 파일 관리라는 기능을 직관적으로 전달하지 못함
- "claude-code-studio"는 Claude Code 설정을 관리하는 스튜디오라는 정체성을 명확히 표현
- "studio"는 GUI 기반 관리 도구라는 인상을 줌

### npm 이름 조사 결과

| 패키지명 | 상태 |
|----------|------|
| `claude-code-studio` | **사용 가능** |
| `claude-code-manager` | 사용 중 (markshawn, 유사 도구) |
| `claude-code-config` | 사용 중 (중국어 config 도구) |
| `ccm` | 사용 중 (cyclomatic complexity) |
| `ccs` | 사용 중 (0.0.1, 12년 전, 비활성) |

---

## Checklist

### 1. Package & CLI
- [ ] `package.json`: name → `claude-code-studio`
- [ ] `package.json`: bin → `claude-code-studio`
- [ ] `package.json`: description 업데이트
- [ ] `package.json`: repository, homepage URL 업데이트

### 2. 코드 내 참조 변경
- [ ] `bin/cli.ts`: 앱 제목, 로그 메시지 내 "agentfiles" → "claude-code-studio"
- [ ] `bin/cli.ts`: 환경변수 `AGENTFILES_TOKEN` → `CCS_TOKEN`
- [ ] `src/server/middleware/auth.ts`: 토큰 환경변수 참조 변경
- [ ] `src/components/`: UI 내 "agentfiles" 텍스트 변경
- [ ] `src/routes/`: 페이지 타이틀 등 변경
- [ ] i18n 메시지 (`messages/en.json`, `messages/ko.json`) 업데이트

### 3. 설정 & 빌드
- [ ] `app.config.ts`: 앱 이름 변경
- [ ] `scripts/build-cli.mjs`: 출력 파일명 검토
- [ ] GitHub 리포지토리 이름 변경 (agentfiles → claude-code-studio)

### 4. 문서
- [ ] `README.md`: 프로젝트명, 설치 명령어, 설명 전체 업데이트
- [ ] `CLAUDE.md` (루트): Project Overview 업데이트
- [ ] `.claude/CLAUDE.md`: 관련 참조 업데이트
- [ ] `docs/FEATURES.md`: 제품명 변경
- [ ] `docs/ARCHITECTURE.md`: 제품명 변경
- [ ] `LICENSE`: 저작자/프로젝트명 확인

### 5. 테스트 & 검증
- [ ] 테스트 코드 내 "agentfiles" 참조 업데이트
- [ ] `pnpm test` 전체 통과 확인
- [ ] `pnpm build` 빌드 성공 확인
- [ ] `npx claude-code-studio` 실행 테스트
- [ ] 환경변수 `CCS_TOKEN` 동작 확인

### 6. 배포
- [ ] npm publish (`claude-code-studio`)
- [ ] 이전 패키지 `agentfiles`에 deprecation 메시지 추가
- [ ] GitHub 리포지토리 리다이렉트 확인
