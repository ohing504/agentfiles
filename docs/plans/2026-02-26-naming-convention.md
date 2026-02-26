# 용어 통일 문제 — 브레인스토밍 정리

> 상태: 미결 — 마켓플레이스 단계에서 확정 예정

## 배경

skill, command, agent, hook, mcp server, lsp server를 포괄하는 통칭이 필요하지만,
기존 용어들이 다른 개념과 충돌하여 적절한 단어를 찾지 못함.

## 현재 용어 충돌

| 용어 | 의미 1 | 의미 2 | 의미 3 |
|------|--------|--------|--------|
| Agent | Claude, Gemini 등 AI Agent | `.claude/agents/*.md` sub-agent 정의 | agentfiles 프로젝트명의 "agent" |
| AgentFile | skill/command/agent 마크다운 타입명 | 프로젝트명이 암시하는 "agent의 파일" | — |
| Component | React Component | PluginComponents (skill/hook/mcp 등) | — |
| Item | 너무 포괄적, 의미 전달 안 됨 | — | — |

## 통칭 후보 (미확정)

| 후보 | 장점 | 단점 |
|------|------|------|
| `Primitive` | 원자적 단위, 충돌 없음 | 학술적, UI에 딱딱 |
| `Part` | 직관적, 짧음 | 기계적 |
| `Asset` | 업계에서 익숙 (game/design assets) | 약간 모호 |
| `AgentFile` 확장 | 기존 코드와 일관 | hook/mcp는 "파일"이 아님 (JSON 속성) |

## 현재 운영 방식

- **마크다운 기반** (skill, command, agent): 기존 `AgentFile` 타입 유지
- **JSON 기반** (hook, mcp, lsp): 각자 타입 유지 (`Hook`, `McpServer` 등)
- **통칭 확정 시점**: 마켓플레이스 등 통합 UI가 필요할 때 결정
