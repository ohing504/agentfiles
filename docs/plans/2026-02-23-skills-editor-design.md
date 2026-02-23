# Skills Editor - Design

## Summary

Skills + legacy Commands를 통합 관리하는 전용 에디터 페이지(`/skills`). Hooks 에디터와 같은 2-panel 레이아웃으로, frontmatter를 GUI 폼으로 편집하고 본문은 react-markdown으로 프리뷰한다. 본문 수정은 외부 에디터(VS Code/Cursor)로 연결.

**날짜:** 2026-02-23
**상태:** 설계 확정

---

## 배경

Claude Code에서 `.claude/commands/`는 `.claude/skills/`로 공식 병합되었다. 기존 commands 파일은 계속 동작하지만, Skills가 권장 형식이다. 현재 앱은 commands/skills를 단순 마크다운 편집기(FilesPageContent)에서 처리하는데, frontmatter GUI 편집과 마크다운 프리뷰를 제공하는 전용 에디터가 필요하다.

**참조:** https://code.claude.com/docs/en/skills

---

## 변경 사항

### 1. 새 라우트: `/skills`

Hooks와 동일하게 사이드바 공통 메뉴에 배치 (Dashboard → Hooks → Skills).

### 2. 페이지 레이아웃 (2-panel)

**좌측 트리:**

```text
▼ Global (~/.claude/)
  ▼ Skills
    explain-code/     📁 (디렉토리 skill)
    deploy/           📁
  ▼ Commands (legacy)
    commit.md         📄 [legacy 배지]
    review.md         📄 [legacy 배지]

▼ Project (.claude/)
  ▼ Skills
    pr-summary/       📁
  ▼ Commands (legacy)
    test.md           📄 [legacy 배지]

[+ Add Skill]
```

- 스코프(Global/Project)로 1차 그룹핑
- 각 스코프 내에서 Skills(디렉토리)와 Commands(legacy 단일 파일)로 2차 그룹핑
- 프로젝트 미선택 시 Project 섹션 숨김

**우측 상세 패널:**

```text
┌────────────────────────────────┐
│ ◉ review-pr    [Global] [···] │
├────────────────────────────────┤
│ Frontmatter                    │
│ Description: [Review a PR   ] │
│ Model:       [sonnet      ▾] │
│ Context:     [fork        ▾] │
│ Agent:       [Explore     ▾] │
│ Allowed-tools: [Read,Grep  ] │
│ Argument-hint: [pr-number  ] │
│ ☐ disable-model-invocation   │
│ ☑ user-invocable             │
│                    [Save]     │
├────────────────────────────────┤
│ Body Preview (rendered MD)     │
│                                │
│ Review PR #$ARGUMENTS:         │
│ 1. Check code quality...       │
│ 2. Verify tests...             │
│                                │
├────────────────────────────────┤
│ Supporting Files               │
│ 📄 template.md (1.2 KB)       │
│ 📄 scripts/validate.sh (340B) │
├────────────────────────────────┤
│ [Open in VS Code] [Folder]    │
└────────────────────────────────┘
```

### 3. Frontmatter GUI 폼

| 필드 | 컨트롤 | 비고 |
|------|--------|------|
| `description` | 텍스트 입력 | 권장 필드 |
| `model` | 드롭다운 | sonnet, haiku, opus |
| `context` | 드롭다운 | 없음, fork |
| `agent` | 드롭다운 | Explore, Plan, general-purpose + 커스텀 |
| `allowed-tools` | 태그 입력 | 쉼표 구분 (Read, Grep, Bash(git:*) 등) |
| `argument-hint` | 텍스트 입력 | 예: [issue-number] |
| `disable-model-invocation` | 토글 | 기본 false |
| `user-invocable` | 토글 | 기본 true |

- `name`은 디렉토리명/파일명에서 자동 파생, 표시만 하고 편집 불가
- `hooks` 필드는 복잡도가 높아 이번 스코프에서 제외 (Hooks 에디터에서 관리)

### 4. 마크다운 프리뷰

- react-markdown + remark-gfm으로 렌더링
- 읽기 전용 (편집은 외부 에디터)
- `$ARGUMENTS`, `$0`, `${CLAUDE_SESSION_ID}` 등 치환 변수는 원본 그대로 표시
- `` !`command` `` 동적 컨텍스트도 원본 표시

### 5. 외부 에디터 연결

- "Open in VS Code" → 서버에서 `code <filepath>` 실행
- "Open in Cursor" → 서버에서 `cursor <filepath>` 실행
- "Open Folder" → 서버에서 `open <dirpath>` (macOS) 실행
- 향후: Settings에서 기본 에디터 선택 가능

### 6. Add Skill 다이얼로그

- Name 입력 (하이픈/소문자만, max 64자)
- Scope 선택 (Global / Project)
- 디렉토리 생성 + 기본 SKILL.md 템플릿 생성

### 7. Supporting Files 표시

- Skill 디렉토리 내 SKILL.md 외의 파일 목록을 하단에 표시
- 파일명 + 크기만 표시 (읽기 전용)
- legacy commands는 단일 파일이므로 이 섹션 숨김

### 8. Frontmatter 저장 방식

GUI에서 frontmatter 변경 → gray-matter로 기존 파일의 frontmatter만 교체, body 유지 → FileWriter로 저장

### 9. 기존 Files 페이지 정리

FilesPageContent에서 commands/skills 트리 섹션 제거. CLAUDE.md 파일 관리 전용으로 단순화.

---

## 새 패키지

| 패키지 | 용도 |
|--------|------|
| `react-markdown` | 마크다운 렌더링 프리뷰 |
| `remark-gfm` | GFM 지원 (테이블, 체크리스트 등) |

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/routes/skills.tsx` | 새 라우트 |
| `src/components/pages/SkillsPageContent.tsx` | 메인 페이지 컴포넌트 |
| `src/components/ui/markdown-preview.tsx` | react-markdown 래퍼 |
| `src/services/config-service.ts` | skills 디렉토리 스캔 추가 (SKILL.md 인식) |
| `src/server/items.ts` | skill 디렉토리 지원 (supporting files 목록) |
| `src/server/editor.ts` | 외부 에디터 열기 server function |
| `src/components/Sidebar.tsx` | Skills 메뉴 추가 |
| `src/components/pages/FilesPageContent.tsx` | commands/skills 섹션 제거 |
| `messages/en.json`, `messages/ko.json` | i18n 메시지 추가 |

---

## 스코프 외 (다음에)

- `/agents` 전용 페이지
- `hooks` frontmatter 필드 편집
- 내장 마크다운 에디터 (body 직접 수정)
- Skills 마켓플레이스/커뮤니티 연동
