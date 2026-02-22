# Related Projects

> Claude Code 생태계의 관련 프로젝트 정리. 경쟁 분석 및 차별화 참고용.

---

## GUI / 설정 관리 도구

### LovCode (구 claude-code-manager)
- **GitHub**: https://github.com/MarkShawn2020/lovcode
- **기술**: Tauri 2 데스크탑 앱
- **주요 기능**: 채팅 히스토리 뷰어, 커맨드 매니저, MCP 서버 설정
- **비고**: claude-code-manager에서 리브랜딩. 중국어 혼재, 채팅/세션 관리가 주된 초점. 일부 기능 미완성.

### Opcode
- **GitHub**: https://github.com/winfunc/opcode
- **웹사이트**: https://opcode.sh
- **기술**: Tauri 2 + React
- **주요 기능**: 세션 관리, 커스텀 에이전트 생성, 사용량 추적, 백그라운드 에이전트
- **라이선스**: AGPL
- **비고**: 기능이 많지만 세션/에이전트 실행 관리에 더 초점.

### CodePilot
- **GitHub**: https://github.com/op7418/CodePilot
- **기술**: Electron + Next.js
- **주요 기능**: 네이티브 데스크탑 GUI, 채팅/코드/프로젝트 관리
- **비고**: Electron 기반으로 무겁지만 풀 기능.

### CloudCLI (Claude Code UI)
- **GitHub**: https://github.com/siteboon/claudecodeui
- **주요 기능**: 모바일/웹에서 Claude Code 세션 원격 관리
- **비고**: 원격 접속 중심, 로컬 설정 관리와는 다른 방향.

---

## 사용량 분석 도구

### ccusage
- **GitHub**: https://github.com/ryoppippi/ccusage
- **웹사이트**: https://ccusage.com
- **기술**: CLI (npx ccusage)
- **주요 기능**: 토큰 사용량/비용 분석, 일별/월별/세션별 리포트
- **비고**: npx 배포 모델의 좋은 레퍼런스. 깔끔한 CLI UX.

### better-ccusage
- **GitHub**: https://github.com/cobra91/better-ccusage
- **주요 기능**: ccusage 확장, 멀티 프로바이더 지원

### Claude Code Usage Monitor
- **GitHub**: https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor
- **주요 기능**: 실시간 터미널 모니터링, ML 기반 예측, Rich UI

---

## 우리의 차별점 (claude-code-studio)

| 항목 | LovCode / Opcode | claude-code-studio |
|------|-------------------|---------------------|
| **배포** | 네이티브 설치 필요 | `npx claude-code-studio` (즉시 실행) |
| **초점** | 채팅/세션 관리 | **설정 파일 관리** (CLAUDE.md, agents, commands, skills, plugins, MCP) |
| **기술** | Tauri 2 / Electron | TanStack Start + Chrome --app |
| **진입 장벽** | 다운로드 → 설치 → 실행 | 터미널에서 한 줄 실행 |
| **의존성** | 독립 실행 | Node.js + Chrome |
