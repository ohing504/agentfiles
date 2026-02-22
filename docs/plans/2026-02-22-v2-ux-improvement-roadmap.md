# v2 UX Improvement Roadmap

> **Background:** Tauri 2 도입을 검토했으나, npx 배포 모델 유지가 프로젝트 핵심 가치이므로 보류.
> 현재 아키텍처(TanStack Start + Chrome --app) 내에서 UX를 대폭 개선하는 방향으로 결정.

---

## Phase 1: UI/UX Enhancement

### 1.1 Custom Titlebar
- [ ] 커스텀 타이틀바 컴포넌트 (`components/Titlebar.tsx`)
- [ ] 앱 로고 + "agentfiles" 제목
- [ ] 현재 버전 표시 (package.json에서 읽기)
- [ ] 설정 버튼 (Settings 페이지 이동)
- [ ] Chrome `--app` 모드에서 자연스럽게 동작하도록 처리

### 1.2 Theme System (Dark/Light)
- [ ] 다크/라이트 테마 토글
- [ ] `prefers-color-scheme` 시스템 설정 연동
- [ ] 테마 상태 localStorage 저장
- [ ] shadcn/ui 컴포넌트 테마 대응 확인
- [ ] Tailwind CSS v4 dark mode 설정

### 1.3 Page Transition Animation
- [ ] 페이지 전환 시 fade/slide 애니메이션
- [ ] TanStack Router의 `pendingComponent` 활용
- [ ] CSS transition 또는 Framer Motion 검토
- [ ] 사이드바 active 상태 전환 애니메이션

### 1.4 Toast Notification System
- [ ] Toast 컴포넌트 도입 (shadcn/ui sonner 또는 toast)
- [ ] 성공/실패/경고 알림 표시
- [ ] CRUD 작업 결과 피드백 (저장 완료, 삭제 완료 등)
- [ ] 에러 핸들링 통합

### 1.5 Keyboard Shortcuts
- [ ] `Cmd+K` 커맨드 팔레트 (Command Palette)
- [ ] 페이지 네비게이션 단축키 (1-4 숫자키 등)
- [ ] `Cmd+S` 에디터 저장
- [ ] `Escape` 다이얼로그 닫기
- [ ] 단축키 도움말 표시 (`?` 키)

---

## Phase 2: Performance Optimization

### 2.1 Startup Speed
- [ ] 서버 시작과 Chrome 실행 병렬화 (현재 순차적)
- [ ] Loading skeleton UI (서버 준비 전 표시)
- [ ] Health check polling 최적화
- [ ] Preload hints 추가

### 2.2 Data Loading
- [ ] React Query staleTime/gcTime 튜닝
- [ ] Optimistic updates (저장 시 즉시 UI 반영)
- [ ] Suspense boundaries 적용
- [ ] 불필요한 refetch 제거

### 2.3 Real-time Push (polling 대체)
- [ ] `fs.watch` 기반 파일 변경 감지
- [ ] SSE(Server-Sent Events) 엔드포인트 추가
- [ ] 파일 변경 시 실시간 UI 업데이트
- [ ] polling interval 제거 또는 대폭 확대

---

## Phase 3: PWA + Auto-update

### 3.1 PWA Support
- [ ] `manifest.json` 작성 (name, icons, display: standalone)
- [ ] Service Worker 등록 (정적 자산 캐싱)
- [ ] 오프라인 fallback 페이지
- [ ] "앱으로 설치" 안내 배너

### 3.2 Auto-update System
- [ ] CLI 시작 시 npm registry 최신 버전 체크
- [ ] 업데이트 가능 시 UI 배너 표시
- [ ] `npx agentfiles@latest` 안내 또는 자동 실행
- [ ] 버전 변경 로그 표시

---

## Deferred: Tauri 2 Native App

> 현 시점에서는 보류. Phase 1-3 완료 후 재평가.

**보류 사유:**
- npx 배포 모델 포기 필요 (프로젝트 핵심 가치)
- Server Functions 25개를 Rust Commands로 재작성 비용
- 크로스 플랫폼 빌드 CI/CD 복잡도 증가
- 파일 기반 설정이라 SQLite 등 Tauri 데이터 레이어 장점 없음

**재평가 조건:**
- 네이티브 기능(시스템 트레이, 글로벌 핫키)이 필수가 되는 경우
- Chrome 의존성 제거가 필요해지는 경우
- 이중 배포(npx lite + Tauri full) 전략으로 점진적 도입 가능

---

## Design Note: 멀티 도구 확장성

> 현재는 Claude Code (`~/.claude/`) 타겟팅이지만, 다른 AI 코딩 도구로의 확장 가능성을 열어둘 것.

**알려진 설정 디렉토리:**
- Claude Code: `~/.claude/`
- Gemini (Antigravity): `~/.gemini/`
- Cursor: `~/.cursor/`
- Codex: `~/.codex/`

**설계 원칙:**
- 경로, 설정 구조를 특정 도구에 하드코딩하지 않기
- ConfigService 등에서 도구별 어댑터 패턴 고려
- 지금 당장 추상화할 필요는 없지만, 종속적 설계는 피할 것
