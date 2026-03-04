# References

> 경쟁 프로젝트, 참조 모델, 영감을 준 글 모음

---

## 관련 프로젝트

### GUI / 설정 관리 도구

| 프로젝트 | 기술 | 초점 | 비고 |
|----------|------|------|------|
| [LovCode](https://github.com/MarkShawn2020/lovcode) | Tauri 2 | 채팅 히스토리, MCP 설정 | 구 claude-code-manager |
| [Opcode](https://opcode.sh) | Tauri 2 + React | 세션 관리, 에이전트 실행 | AGPL |
| [CodePilot](https://github.com/op7418/CodePilot) | Electron + Next.js | 채팅/코드/프로젝트 관리 | 풀 기능, 무거움 |
| [CloudCLI](https://github.com/siteboon/claudecodeui) | 웹 | 원격 세션 관리 | 로컬 설정 관리 아님 |

### 사용량 분석 도구

| 프로젝트 | 비고 |
|----------|------|
| [ccusage](https://ccusage.com) | npx 배포 모델 레퍼런스. 깔끔한 CLI UX |
| [better-ccusage](https://github.com/cobra91/better-ccusage) | 멀티 프로바이더 지원 |

### 차별점

| 항목 | LovCode / Opcode | agentfiles |
|------|-------------------|---------------------|
| 배포 | 네이티브 설치 | `npx agentfiles` |
| 초점 | 채팅/세션 관리 | 워크플로우 설계 + 이해 + 마켓플레이스 |
| AI 통합 | 없음 | AI 요약/번역/가이드 |
| 마켓플레이스 | 없음 | Skills + MCP + Plugins 통합 |

---

## 참조 모델

- **Homebrew** — 발견 + 설치 + 관리가 하나의 인터페이스에서 통합
- **Raycast Store** — 설치하면 바로 설명과 사용법이 보이는 UX
- **Obsidian Community Plugins** — 앱 안에서 커뮤니티 플러그인을 탐색하고 관리

---

## 영감

### 2026-03

**Boris Tane — [How I Use Claude Code](https://boristane.com/blog/how-i-use-claude-code/)**
- 9개월간 Claude Code 주력 사용 경험. 마크다운을 "공유 가변 상태"로 활용하며, 사람이 항상 운전석에 있어야 한다고 강조.
- 인사이트: 개발자 각자가 본인만의 워크플로우를 설계하고 다듬어야 한다. 본인이 이해하고 통제할 수 있는 워크플로우가 결국 강하다.

**박진형 — [Claude Code 세계 1위 개발자의 AI 워크플로우](https://yozm.wishket.com/magazine/detail/3630/)**
- "토큰을 많이 쓴다고 좋은 건 아니다." 빠른 피드백 루프가 핵심. 프레임워크보다 본인만의 규칙 체계가 중요.
- 인사이트: agentfiles가 단순 설정 관리자가 아니라 "워크플로우를 이해하고 가꾸는 도구"로 진화해야 한다는 방향성을 확인.

---

*새 항목 추가 시 해당 섹션에 같은 형식으로 추가*
