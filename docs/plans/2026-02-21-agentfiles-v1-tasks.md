# agentfiles v1 개발 작업 리스트

> 문서 검토(PRD + 설계) 결과를 반영한 개발 순서별 태스크

---

## 문서 검토 요약

PRD.md와 설계 문서를 교차 검토한 결과, **근본적 재설계 없이 개발 착수 가능**합니다.

### 심각 이슈 3건 (개발 시 반영)

| 이슈 | 해결 방향 |
|------|----------|
| 파일 에디터 UI 스펙 부재 | v1은 textarea + 수동 저장. CodeMirror는 v1.1에서 고려 |
| 에러 처리 전략 부재 | 공통 에러 응답 규격 `{ error, code }` + CLI 실패 메시지 |
| Claude CLI 의존성 검증 누락 | 서버 시작 시 `claude --version` 체크, 없으면 읽기 전용 모드 |

### 주요 보완 사항 (개발 단계별 반영)

- 데이터 모델: `ClaudeMd.content`, `McpServer.type` 필드 추가
- Plugin scope 타입 통일 (`user` → `global` 매핑)
- MCP 수정: remove → add 전략
- 인증 미들웨어 별도 파일 분리
- URL 토큰 → localStorage 저장 후 `history.replaceState`로 제거
- 개발 포트 전략: Hono 서버 3001, Vite dev 4321 (프록시)

---

## Phase 1: 프로젝트 초기화

**목표:** 빈 프로젝트에서 `pnpm dev`로 서버+클라이언트가 뜨는 상태까지

### 1-1. 패키지 설정

- [x]`package.json` 생성
  - name: `agentfiles`
  - bin: `{ "agentfiles": "./dist/cli.js" }`
  - scripts: `dev`, `build`, `test`, `lint`
  - type: `module`
- [x]`pnpm install` 핵심 의존성

**런타임 의존성:**
```
hono, @hono/node-server
react, react-dom
@tanstack/react-router, @tanstack/react-query
gray-matter
open (브라우저 열기)
```

**개발 의존성:**
```
typescript, @types/react, @types/react-dom, @types/node
vite, @vitejs/plugin-react
tsx (서버 dev), tsup (서버 빌드)
vitest
@biomejs/biome
tailwindcss (v4), @tailwindcss/vite
lucide-react
```

### 1-2. 설정 파일

- [x]`tsconfig.json` — strict, paths(`@server/*`, `@web/*`, `@shared/*`)
- [x]`vite.config.ts` — React plugin, 프록시(`/api` → `localhost:3001`), build output(`dist/web`)
- [x]`tsup.config.ts` — entry: `src/server/index.ts` + `bin/cli.ts`, format: esm, outDir: `dist`
- [x]`biome.json` — formatter + linter 규칙
- [x]`.gitignore` 보완 — `dist/`, `node_modules/`

### 1-3. 디렉토리 구조

```
src/
  server/
    index.ts              (빈 Hono 앱 + hello world)
    router.ts
    config.ts
    middleware/
      auth.ts
    services/
    routes/
  web/
    main.tsx              (빈 React 앱)
    App.tsx
    hooks/
    pages/
    components/
      ui/
    lib/
  shared/
    types.ts
bin/
  cli.ts
tests/
  server/
  e2e/
```

### 완료 기준
- `pnpm dev` 실행 시 Hono 서버(3001)와 Vite(4321) 동시 기동
- `localhost:4321`에서 React 앱 표시
- `localhost:3001/api/health`에서 `{ ok: true }` 응답
- `pnpm lint` 통과
- `pnpm build` 성공

---

## Phase 2: 공유 타입 정의

**목표:** 서버-클라이언트 간 공유 타입 확정

### 2-1. `src/shared/types.ts`

- [x]`Scope = 'global' | 'project'`
- [x]`ClaudeMd` — scope, path, content, size, lastModified(string ISO)
- [x]`Plugin` — id, name, marketplace, scope(`user`|`project`), version, enabled 등
- [x]`McpServer` — name, scope, type(`stdio`|`sse`|`streamable-http`), command?, args?, url?, env?, disabled?
- [x]`AgentFile` — name, scope, path, namespace?, frontmatter?, size, lastModified, type(`agent`|`command`|`skill`), isSymlink?, symlinkTarget?
- [x]`Overview` — claudeMd, plugins, mcpServers, agents, commands, skills 카운트 + conflictCount
- [x]`ApiError` — `{ error: string; code?: string }`

### 완료 기준
- 타입 정의 완료, `pnpm build` 시 타입 체크 통과

---

## Phase 3: 서버 코어

**목표:** 인증 미들웨어 포함한 Hono 서버 기본 골격

### 3-1. `src/server/config.ts`
- [x]서버 포트 (기본 3001, 프로덕션 4321)
- [x]글로벌 경로: `~/.claude/`
- [x]토큰 생성: `crypto.randomUUID()`
- [x]CLI 경로 탐색 로직

### 3-2. `src/server/middleware/auth.ts`
- [x]Bearer 토큰 검증
- [x]`/api/health` 등 공개 엔드포인트 화이트리스트
- [x]인증 실패 시 `401 { error: "Unauthorized" }`

### 3-3. `src/server/index.ts`
- [x]Hono 앱 생성
- [x]auth 미들웨어 등록
- [x]라우터 마운트
- [x]`@hono/node-server`로 서버 시작
- [x]프로덕션 모드: `dist/web/` 정적 파일 서빙

### 3-4. `src/server/router.ts`
- [x]각 라우트 파일 통합
- [x]RPC 타입 export (`AppType`)

### 완료 기준
- 토큰 없이 API 호출 → 401
- 올바른 토큰으로 API 호출 → 200
- `pnpm test` 통과 (auth 미들웨어 테스트)

---

## Phase 4: ConfigService (읽기)

**목표:** 파일시스템에서 모든 설정 데이터를 읽어오는 서비스

### 4-1. `src/server/services/config-service.ts`

- [x]`getClaudeMd(scope)` — CLAUDE.md 읽기 (메타 + 내용)
  - 파일 없으면 null 반환
- [x]`scanMdDir(basePath, type)` — agents/, commands/, skills/ 스캔
  - 재귀 탐색 (네임스페이스 폴더 대응)
  - gray-matter로 frontmatter 파싱
  - symlink 감지 (`fs.lstat`)
- [x]`getPlugins()` — `~/.claude/plugins/installed_plugins.json` 파싱
  - 파일 없으면 빈 배열
- [x]`getMcpServers()` — settings.json에서 MCP 서버 추출
  - stdio / sse / streamable-http 타입 구분
  - 글로벌 + 프로젝트 양쪽 스캔
- [x]`getOverview()` — 위 함수들 조합하여 대시보드 데이터 집계
  - conflictCount: 글로벌 ↔ 프로젝트 동일 이름 항목 수

### 4-2. 테스트

- [x]`tests/server/services/config-service.test.ts`
  - 모의 파일 구조(tmp 디렉토리)로 각 함수 단위 테스트
  - 파일 없는 경우, frontmatter 없는 md, 빈 디렉토리 등 엣지 케이스

### 완료 기준
- 실제 `~/.claude/` 구조를 정확히 파싱
- 모든 테스트 통과
- 글로벌/프로젝트 양쪽 스코프 정상 동작

---

## Phase 5: FileWriter + ClaudeCli (쓰기)

**목표:** 마크다운 직접 편집 + CLI 위임 쓰기 서비스

### 5-1. `src/server/services/file-writer.ts`

- [x]`writeMarkdown(path, content)` — 마크다운 파일 저장
  - 디렉토리 없으면 자동 생성 (`mkdir -p`)
- [x]`createFile(basePath, name, content, scope)` — 새 agent/command/skill 생성
- [x]`deleteFile(path)` — 파일 삭제
- [x]`renameFile(oldPath, newPath)` — 파일 이름 변경

### 5-2. `src/server/services/claude-cli.ts`

- [x]`checkCliAvailable()` — `claude --version` 실행
  - 없으면 `{ available: false, reason: "..." }` 반환
- [x]`mcpAdd(name, command, args, env, scope)` — `claude mcp add` 위임
  - scope에 따라 `-s user` 또는 `-s project` 플래그
- [x]`mcpRemove(name, scope)` — `claude mcp remove` 위임
- [x]`pluginToggle(id, enable)` — `claude plugin enable/disable` 위임
- [x]공통 에러 핸들링
  - child_process spawn + 타임아웃 30초
  - stderr 캡처 → 에러 메시지 파싱
  - exit code 비정상 → `{ error, code }` 반환

### 5-3. 테스트

- [x]file-writer 단위 테스트 (tmp 디렉토리)
- [x]claude-cli 단위 테스트 (mock child_process)

### 완료 기준
- 마크다운 파일 CRUD 정상 동작
- CLI 미설치 환경에서 graceful 에러 반환
- 모든 테스트 통과

---

## Phase 6: 서버 라우트

**목표:** 모든 REST API 엔드포인트 구현

### 6-1. `src/server/routes/overview.ts`
- [x]`GET /api/overview` → `configService.getOverview()`

### 6-2. `src/server/routes/claude-md.ts`
- [x]`GET /api/claude-md/:scope` → 메타 + 내용
- [x]`PUT /api/claude-md/:scope` → `fileWriter.writeMarkdown()`

### 6-3. `src/server/routes/plugins.ts`
- [x]`GET /api/plugins` → 전체 플러그인 목록
- [x]`GET /api/plugins/:id` → 개별 플러그인 상세
- [x]`PATCH /api/plugins/:id` → enable/disable (CLI 위임)

### 6-4. `src/server/routes/mcp.ts`
- [x]`GET /api/mcp` → MCP 서버 목록
- [x]`POST /api/mcp` → MCP 추가 (CLI 위임)
- [x]`DELETE /api/mcp/:name` → MCP 제거 (CLI 위임)

### 6-5. `src/server/routes/agents.ts`
- [x]`GET /api/agents` → 목록 (글로벌 + 프로젝트)
- [x]`GET /api/agents/:name` → 상세 + 내용
- [x]`POST /api/agents` → 생성
- [x]`PUT /api/agents/:name` → 수정
- [x]`DELETE /api/agents/:name?scope=` → 삭제

### 6-6. `src/server/routes/commands.ts`
- [x]동일 CRUD 패턴 (agents와 동일 구조)

### 6-7. `src/server/routes/skills.ts`
- [x]동일 CRUD 패턴 + symlink 정보 포함

### 6-8. CLI 상태 엔드포인트
- [x]`GET /api/cli-status` → Claude CLI 설치 여부 + 버전

### 완료 기준
- curl/httpie로 모든 API 엔드포인트 동작 확인
- 에러 응답이 `{ error, code }` 규격 준수
- CLI 미설치 시 MCP/Plugin 관련 API가 적절한 에러 반환

---

## Phase 7: 프론트엔드 코어

**목표:** 레이아웃, 라우팅, UI 기반 컴포넌트 셋업

### 7-1. 기본 설정
- [x]`src/web/main.tsx` — React 진입점, QueryClientProvider
- [x]`src/web/App.tsx` — TanStack Router 설정
- [x]Tailwind CSS v4 설정
- [x]shadcn/ui 초기화 — Button, Card, Badge, Input, Dialog, Tabs, Textarea

### 7-2. 레이아웃
- [x]`src/web/components/Layout.tsx` — 사이드바 + 메인 콘텐츠 영역
- [x]`src/web/components/Sidebar.tsx`
  - 카테고리: CLAUDE.md, Plugins, MCP Servers, Agents, Commands, Skills
  - 존재하는 카테고리만 표시 (빈 폴더 숨김)
  - 상단 [+ New] 버튼 → 생성 다이얼로그

### 7-3. 공통 컴포넌트
- [x]`src/web/components/ScopeBadge.tsx` — Global/Project 표시 + 충돌 경고
- [x]`src/web/components/FileTree.tsx` — 트리 형태 파일 목록 (네임스페이스 폴더 대응)

### 7-4. 인증 유틸
- [x]`src/web/lib/auth.ts`
  - URL에서 `?token=` 파싱
  - localStorage에 저장
  - `history.replaceState`로 URL에서 토큰 제거
  - API 호출 시 `Authorization: Bearer` 헤더 자동 첨부

### 완료 기준
- `pnpm dev`로 사이드바 + 빈 페이지 표시
- 라우트 전환 동작
- 토큰 인증 흐름 동작

---

## Phase 8: 프론트엔드 데이터 레이어

**목표:** TanStack Start Server Functions + TanStack Query로 서버 데이터 연결

### 8-1. `src/hooks/use-config.ts`

- [ ] Server Functions (`createServerFn`) 직접 호출 (Hono RPC 대신)
- [ ] `useOverview()` — `getOverviewFn()` 호출, 대시보드 데이터
- [ ] `useClaudeMd(scope)` — `getClaudeMdFn()` + `saveClaudeMdFn()` mutation
- [ ] `usePlugins()` — `getPluginsFn()` + `togglePluginFn()` mutation
- [ ] `useMcpServers()` — `getMcpServersFn()` + add/remove mutation
- [ ] `useAgentFiles(type)` — `getItemsFn()` + CRUD mutation (`saveItemFn`, `deleteItemFn`)
- [ ] `useCliStatus()` — `getCliStatusFn()` 호출
- [ ] 공통 Query 옵션: `refetchOnWindowFocus: true`, `refetchInterval: 5000`

### 완료 기준
- React DevTools에서 Query 캐시 확인
- Server Functions 통해 서버 데이터가 프론트엔드에 정상 표시
- 서버 재시작 없이 파일 변경 시 5초 내 UI 반영

---

## Phase 9: 프론트엔드 페이지

**목표:** 모든 UI 페이지 구현

### 9-1. Dashboard (`/`)
- [ ] 카운트 카드: Plugins, MCP Servers, Agents, Commands, Skills
- [ ] 각 카드에 글로벌/프로젝트 수 표시
- [ ] 충돌 수 경고 badge
- [ ] CLI 상태 표시 (설치됨/미설치)
- [ ] 각 카드 클릭 → 해당 목록 페이지 이동

### 9-2. CLAUDE.md Editor (`/claude-md?scope=global`)
- [ ] 스코프 전환 탭 (Global / Project)
- [ ] textarea 기반 마크다운 편집
- [ ] 저장 버튼 (수동 저장)
- [ ] 파일 메타 표시 (크기, 수정일)
- [ ] 파일 미존재 시 생성 안내

### 9-3. Plugin 관련 페이지
- [ ] `PluginList.tsx` (`/plugins`) — 목록 + ScopeBadge + enable/disable 토글
- [ ] `PluginDetail.tsx` (`/plugins/:id`) — 상세 정보 (버전, 경로, 포함 skills)

### 9-4. MCP 관련 페이지
- [ ] `McpList.tsx` (`/mcp`) — 목록 + ScopeBadge + 타입 표시
- [ ] `McpDetail.tsx` (`/mcp/:name`) — command, args, env 표시
- [ ] MCP 추가 폼: name, command, args(배열), env(key-value), scope 선택

### 9-5. Agents 페이지
- [ ] `AgentList.tsx` (`/agents`) — 글로벌+프로젝트 통합, ScopeBadge 구분
- [ ] `AgentDetail.tsx` (`/agents/:name`) — frontmatter + 내용 편집

### 9-6. Commands 페이지
- [ ] `CommandList.tsx` (`/commands`) — 동일 패턴
- [ ] `CommandDetail.tsx` (`/commands/:name`) — 네임스페이스 표시 포함

### 9-7. Skills 페이지
- [ ] `SkillList.tsx` (`/skills`) — symlink 여부 표시
- [ ] `SkillDetail.tsx` (`/skills/:name`) — symlinkTarget 표시

### 완료 기준
- 모든 페이지에서 CRUD 동작 확인
- ScopeBadge가 글로벌/프로젝트 정확히 구분
- 충돌 항목에 경고 badge 표시
- CLI 미설치 시 MCP/Plugin 수정 버튼 비활성화

---

## Phase 10: CLI 진입점

**목표:** `npx agentfiles`로 완전한 로컬 앱 실행

### 10-1. `bin/cli.ts`

- [ ] shebang: `#!/usr/bin/env node`
- [ ] 현재 디렉토리에서 `.claude/` 탐지
  - 없으면 글로벌 전용 모드 (projectPath = null)
  - `--project <path>` 옵션으로 수동 지정 가능
- [ ] Claude CLI 존재 여부 확인
  - 없으면 경고 메시지 출력 + 읽기 전용 모드 알림
- [ ] 랜덤 토큰 생성 (`crypto.randomUUID()`)
- [ ] Vinxi/Nitro 서버 시작 (`127.0.0.1:3000`)
  - 포트 충돌 시 3001, 3002... 순차 탐색
- [ ] `open` 패키지로 브라우저 열기 (`http://127.0.0.1:4321?token=xxx`)
- [ ] 터미널에 접속 URL 출력
- [ ] `Ctrl+C` → graceful shutdown (서버 종료)

### 완료 기준
- `npx agentfiles` 실행 → 브라우저 자동 열림
- 토큰 인증 정상 동작
- 포트 충돌 시 자동 대체
- `Ctrl+C`로 깔끔하게 종료

---

## Phase 11: 빌드 설정

**목표:** 프로덕션 빌드 및 npm 배포 준비

### 11-1. 빌드 파이프라인

- [ ] `pnpm build` 스크립트:
  1. `tsup` — 서버 코드 번들 → `dist/server/index.js` + `dist/cli.js`
  2. `vite build` — 클라이언트 번들 → `dist/web/`
- [ ] Vinxi/Nitro: 프로덕션 모드에서 정적 파일 서빙 (빌트인)

### 11-2. package.json 배포 설정

- [ ] `bin`: `{ "agentfiles": "./dist/cli.js" }`
- [ ] `files`: `["dist/"]`
- [ ] `prepublishOnly`: `pnpm build`

### 완료 기준
- `pnpm build && node dist/cli.js` 로 프로덕션 모드 동작
- 번들 사이즈 합리적 (서버 < 1MB, 클라이언트 < 2MB)

---

## Phase 12: 테스트 보강

**목표:** 핵심 기능의 테스트 커버리지 확보

### 12-1. 서버 단위 테스트
- [x] config-service 전체 함수 (Phase 4에서 작성)
- [x] file-writer 전체 함수 (Phase 5에서 작성)
- [x] claude-cli mock 테스트 (Phase 5에서 작성)
- [x] auth 미들웨어 테스트 (Phase 3에서 작성)

### 12-2. API 통합 테스트
- [ ] 각 라우트 엔드포인트 요청-응답 검증
- [ ] 에러 케이스 (잘못된 scope, 존재하지 않는 파일 등)

### 12-3. E2E 테스트
- [ ] 서버 시작 → API 호출 → 파일 생성/수정/삭제 → 확인
- [ ] 실제 `~/.claude/` 환경에서 수동 통합 테스트

### 완료 기준
- `pnpm test` 전체 통과
- 핵심 서비스 커버리지 80% 이상

---

## Phase 13: 마무리

**목표:** 오픈소스 공개 준비

- [ ] README.md — 설치 방법, 사용법, 스크린샷
- [ ] .gitignore 보완
- [ ] LICENSE 파일
- [ ] CONTRIBUTING.md (선택)
- [ ] npm 퍼블리시 테스트 (`npm pack` → 확인)
- [ ] GitHub repo 설정 (description, topics, homepage)

---

## 의존성 그래프

```
Phase 1 (초기화)
  └─ Phase 2 (타입)
       ├─ Phase 3 (서버 코어)
       │    ├─ Phase 4 (ConfigService)
       │    │    └─ Phase 6 (라우트) ──┐
       │    └─ Phase 5 (FileWriter+CLI)─┘
       │                                 │
       └─ Phase 7 (프론트엔드 코어)       │
            └─ Phase 8 (데이터 레이어) ───┘
                 └─ Phase 9 (페이지)
                      └─ Phase 10 (CLI 진입점)
                           └─ Phase 11 (빌드)
                                └─ Phase 12 (테스트)
                                     └─ Phase 13 (마무리)
```

**병렬 가능 구간:**
- Phase 4 + 5: 읽기/쓰기 서비스를 동시 개발 가능
- Phase 6 + 7: 서버 라우트와 프론트엔드 코어를 동시 개발 가능

---

*이 문서는 2026-02-21 팀 검토 세션에서 작성됨*
*검토자: analyst (PRD), architect (설계 문서)*
