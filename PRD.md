# agentfiles PRD

> AI 에이전트 설정을 관리하고 공유하는 플랫폼

---

## 배경 및 문제 정의

### 현재 페인포인트

Claude Code를 포함한 AI 에이전트 도구들은 설정 파일 기반으로 동작한다. 그런데 이 설정들을 관리하는 GUI 도구가 존재하지 않는다.

구체적인 불편함:

- `~/.claude/CLAUDE.md` 편집하려면 매번 터미널에서 `vi` 직접 열어야 함
- 프로젝트별 `.claude/` vs 글로벌 `~/.claude/` 스코프 관계가 한눈에 안 보임
- skills, agents, commands를 설치/삭제하려면 CLI 명령어를 일일이 입력해야 함
- `npx skills add owner/repo --skill skill-name` 같은 명령어를 매번 기억해야 함
- VS Code 공식 마켓에서 설치한 MCP extension과 CLI로 직접 설치한 MCP가 중복될 때 파악이 어려움
- 프로젝트마다 같은 plugin을 재설치하거나, 글로벌로 두면 불필요한 프로젝트에도 적용됨
- 다른 사람의 에세이나 설정을 참고해서 내 설정을 개선하고 싶어도 복사-붙여넣기 외에 방법이 없음

### 시장 공백

| 도구 | 해결하는 것 | 해결 못 하는 것 |
|------|------------|----------------|
| skills.sh | skills 발견 및 CLI 설치 | GUI 관리, 다른 설정 타입, 설치 현황 확인 |
| Opcode (구 Claudia) | Claude Code 세션 실행 GUI | 설정 파일 편집/관리 |
| chezmoi, yadm 등 dotfiles 매니저 | dotfiles 머신 간 동기화 | AI 에이전트 전용 설정, GUI |
| Kiro IDE | spec-driven 개발 워크플로우 | 기존 에이전트 설정 관리 |

**결론:** "VS Code Extension 마켓플레이스 UX를 Claude 에이전트 설정에 그대로 가져오는 도구"는 현재 존재하지 않는다.

---

## 제품 개요

### 한 줄 정의

> agentfiles = AI 에이전트 설정 파일의 패키지 매니저 + 커뮤니티 플랫폼

### 핵심 가치

1. **Visibility** — 내 설정 파일들이 어디에 무엇이 있는지 한눈에 보인다
2. **Simplicity** — 설치/삭제/업데이트가 버튼 클릭 하나로 된다
3. **Community** — 다른 사람의 좋은 설정을 발견하고 가져올 수 있다

### 참조 모델

- **VS Code Extension Marketplace** — 설치/삭제/업데이트 UX
- **skills.sh** — 커뮤니티 레지스트리, 설치 수 기반 랭킹
- **Hugging Face** — 사용자가 자신의 설정을 공개하고 커뮤니티가 사용
- **dotfiles 생태계** — `.claude`도 결국 dotfiles의 일부라는 철학

---

## 대상 사용자

**Primary:** Claude Code를 매일 사용하는 개발자

- 터미널은 쓸 수 있지만 설정 관리에 시간 쓰기 싫은 사람
- 여러 프로젝트를 병렬로 관리하는 솔로 개발자
- 좋은 Claude 설정을 찾아 에세이나 레포를 뒤지는 사람

**Secondary:** AI 에이전트 설정을 팀과 공유하고 싶은 팀

---

## 로드맵

### v1 — 로컬 설정 관리 GUI

**목표:** 매일 쓰는 Claude 설정 관리 불편함 해결

**핵심 기능:**

```
1. 설정 파일 트리 뷰
   - ~/.claude/ 와 현재 프로젝트 .claude/ 동시 표시
   - 글로벌 vs 프로젝트 스코프 시각적 구분
   - 동일 이름 agent/command 충돌 시 경고 표시

2. 파일 편집
   - CLAUDE.md 클릭 → 즉시 에디터 열림 (vi 불필요)
   - agents/*.md, commands/*.md, skills/ 동일하게

3. MCP 관리
   - settings.json 파싱 → 현재 등록된 MCP 서버 목록 표시
   - 어느 스코프(글로벌/프로젝트)에 등록됐는지 표시
   - 중복 MCP 감지

4. skills/agents/commands 설치 현황
   - 현재 설치된 항목 목록
   - 글로벌/프로젝트별 구분
```

**범위 밖 (v1에서 제외):**
- 커뮤니티 레지스트리 연동
- 클라우드 동기화
- 채팅 패널 (공식 extension이 이미 해줌)

---

### v2 — 커뮤니티 레지스트리 연동

**목표:** skills.sh, GitHub의 좋은 설정들을 GUI에서 발견하고 원클릭 설치

**핵심 기능:**

```
1. skills.sh API 연동
   - 인기 skills 브라우징
   - 설치/삭제 버튼 (npx 명령어 자동 실행)
   - 이미 설치된 것 배지 표시
   - 업데이트 알림

2. GitHub 레포 기반 설정 임포트
   - GitHub URL 입력 → 해당 레포의 CLAUDE.md, agents 등 미리보기
   - 선택적 머지 (전체 덮어쓰기 아닌 원하는 부분만 가져오기)

3. 설정 스코프 선택
   - 글로벌 설치 vs 현재 프로젝트 설치 선택
```

---

### v3 — 클라우드 동기화 + 퍼블릭 레지스트리

**목표:** Hugging Face처럼 자신의 설정을 올리고 커뮤니티가 사용하는 생태계

**핵심 기능:**

```
1. 클라우드 동기화
   - 여러 머신 간 ~/.claude/ 동기화
   - Git 기반 버전 관리

2. 퍼블릭 레지스트리 (웹앱)
   - 사용자가 자신의 설정 패키지 공개
   - 설치 수, 스타 기반 랭킹
   - 에세이/블로그 링크 연결 (설정의 철학과 맥락 공유)

3. 원클릭 설치
   - agentfiles install oyyoung/claude-setup
   - 또는 웹에서 "Install" 버튼
```

---

### v4 — 멀티 에이전트 지원

**목표:** Claude 외 Cursor, Kiro, Windsurf 등으로 확장

**핵심 기능:**

```
- Cursor: .cursorrules 관리
- Kiro: .kiro/steering 관리
- Windsurf: .windsurf 관리
- 에이전트별 설정 포맷 변환 (예: CLAUDE.md → .cursorrules 자동 변환)
```

**참조:** skills.sh가 멀티 에이전트 지원할 때 symlink/hard copy 방식으로 각각에 맞게 배포하는 방식 참고

---

## 철학

### dotfiles와의 관계

`~/.claude`는 결국 dotfiles의 일부다. 기존 dotfiles 생태계(chezmoi, yadm 등)는 "머신 간 동기화"에 집중했고 GUI가 없다. agentfiles는 "AI 에이전트 설정"이라는 특수성에 집중하고, GUI를 first-class로 제공한다.

### 설계 우선 철학과의 정합성

이 프로젝트 자체가 "AI 시대의 개발자는 설계에 더 많은 시간을 투자한다"는 철학을 담는다. agentfiles는 개발자가 자신의 AI 환경을 설계하고 다듬는 데 집중할 수 있도록, 관리의 번잡함을 없애주는 도구다.

---

## 개발 전략

### 자체 사용 우선 (dogfooding)

- 오영님 본인의 페인포인트 해결이 v1의 유일한 목표
- 매일 직접 쓰면서 불편한 점 → 바로 개선
- 어느 정도 완성도가 되면 오픈소스 공개

### 점진적 확장

- v1을 쓰면서 v2 기능의 우선순위가 자연스럽게 결정됨
- 커뮤니티 레지스트리는 로컬 관리가 충분히 안정된 후에

### 이름 선점

- `agentfiles` — dotfiles에서 직접 영감. agent + files 조합으로 직관적
- 도메인, GitHub organization, npm 패키지명 확보 필요

---

## 경쟁 전략

Claude Code가 자체적으로 설정 관리 GUI를 추가할 가능성이 있다. 그때 그 솔루션이 충분히 좋다면 이 프로젝트를 archive하면 된다. 공식 솔루션이 나오기 전까지, 또는 공식 솔루션이 부족한 영역에서 가치를 제공하는 것이 이 프로젝트의 전략이다.

---

*이 문서는 2026년 2월 Claude와의 대화를 기반으로 작성됨*
*참조 대화: AI IDE 생태계 비교, dotfiles 관리 도구 분석, skills.sh 레퍼런스 분석*
