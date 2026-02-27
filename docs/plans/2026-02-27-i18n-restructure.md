# i18n 메시지 파일 구조 개선 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** paraglide namespace를 활용해 messages/ 파일을 feature별로 분리하고, 중복 키를 common_*으로 통합한다.

**Architecture:** 기존 단일 en.json/ko.json을 messages/en/*.json, messages/ko/*.json으로 분리. 기존 키 이름 prefix(hooks_*, plugin_* 등)는 유지하여 코드 변경 최소화. 단, cancel/docs/open_vscode 등 진짜 중복 키는 common_*으로 이름 변경.

**Tech Stack:** paraglide-js v2, @inlang/plugin-message-format, TypeScript (pnpm typecheck으로 키 누락 즉시 감지)

---

## Task 1: namespace pathPattern 호환성 검증

**Files:**
- Modify: `project.inlang/settings.json`
- Create: `messages/en/main.json` (임시)

**Step 1: en.json → en/main.json 으로 이동 (내용 그대로)**

```bash
mkdir -p messages/en messages/ko
mv messages/en.json messages/en/main.json
mv messages/ko.json messages/ko/main.json
```

**Step 2: pathPattern 변경**

`project.inlang/settings.json`의 `plugin.inlang.messageFormat` 섹션:

```json
"plugin.inlang.messageFormat": {
  "pathPattern": "./messages/{locale}/{namespace}.json"
}
```

**Step 3: typecheck 실행**

```bash
pnpm typecheck
```

Expected: 통과. `m.hooks_title()` 등 기존 호출이 그대로 동작해야 함.

> ⚠️ 만약 실패한다면: paraglide dev server 재시작 후 재시도 (`pnpm dev` 재기동으로 paraglide 코드 재생성 트리거).

**Step 4: 커밋**

```bash
git add project.inlang/settings.json messages/
git commit -m "refactor(i18n): migrate to paraglide namespace pathPattern"
```

---

## Task 2: en/ 네임스페이스 파일 분리

en/main.json을 9개 파일로 분할한다. 키 이름은 변경하지 않는다.

**Files:**
- Delete: `messages/en/main.json`
- Create: `messages/en/common.json`, `messages/en/hooks.json`, `messages/en/skills.json`, `messages/en/plugins.json`, `messages/en/mcp.json`, `messages/en/config.json`, `messages/en/files.json`, `messages/en/settings.json`, `messages/en/editor.json`

**Step 1: messages/en/common.json 생성**

아래 키들을 포함 (en/main.json에서 해당 키 삭제):

```json
{
  "app_name": "agentfiles",
  "app_subtitle": "Agent Config Manager",
  "app_coming_soon": "Coming in Phase 9",
  "app_language_en": "EN",
  "app_language_ko": "한국어",
  "nav_group_label": "Navigation",
  "nav_dashboard": "Dashboard",
  "nav_claude_md": "CLAUDE.md",
  "nav_plugins": "Plugins",
  "nav_mcp_servers": "MCP Servers",
  "nav_agents": "Agents",
  "nav_commands": "Commands",
  "nav_skills": "Skills",
  "nav_files": "Files",
  "nav_group_global": "Global",
  "nav_group_project": "Project",
  "nav_settings": "Settings",
  "scope_global": "global",
  "scope_project": "project",
  "scope_user": "user",
  "scope_local": "Local",
  "scope_managed": "Managed",
  "detail_mcp_server": "MCP Server: {name}",
  "detail_agent": "Agent: {name}",
  "detail_command": "Command: {name}",
  "detail_skill": "Skill: {name}",
  "detail_plugin": "Plugin: {name}",
  "action_edit": "Edit",
  "action_delete": "Delete"
}
```

**Step 2: messages/en/hooks.json 생성**

en/main.json에서 `hooks_*`, `claude_*` 키 전체 이동:

```json
{
  "hooks_title": "Hooks",
  "hooks_docs": "Docs",
  "hooks_search_placeholder": "Search hooks...",
  "hooks_empty_title": "No Hook Selected",
  "hooks_empty_desc": "Select a hook from the left panel to view its details.",
  "hooks_no_configured": "No hooks configured",
  "hooks_no_results": "No results",
  "hooks_open_vscode": "VS Code",
  "hooks_open_cursor": "Cursor",
  "hooks_open_error": "Failed to open in {editor}",
  "hooks_delete_title": "Delete Hook",
  "hooks_delete_confirm": "Are you sure you want to delete this hook? This action cannot be undone.",
  "hooks_delete_error": "Failed to delete hook",
  "hooks_cancel": "Cancel",
  "hooks_detail_event": "Event",
  "hooks_detail_handler": "Handler",
  "hooks_detail_matcher": "Matcher",
  "hooks_detail_timeout": "Timeout",
  "hooks_detail_async": "Async",
  "hooks_detail_once": "Once",
  "hooks_detail_yes": "Yes",
  "hooks_detail_no": "No",
  "hooks_detail_status_message": "Status Message",
  "hooks_detail_command": "Command",
  "hooks_detail_script_preview": "Script Preview",
  "hooks_detail_model": "Model",
  "hooks_detail_file_not_found": "File not found or empty",
  "hooks_dialog_title_add": "Add {scope} Hook",
  "hooks_dialog_title_edit": "Edit {scope} Hook",
  "hooks_form_event": "Event",
  "hooks_form_handler": "Hook Handler",
  "hooks_form_timeout": "Timeout (sec)",
  "hooks_form_timeout_placeholder": "Default: cmd 600, prompt 30, agent 60",
  "hooks_form_status_message": "Status Message",
  "hooks_form_status_placeholder": "Custom spinner message",
  "hooks_form_once": "Once",
  "hooks_form_once_desc": "Run only once per session",
  "hooks_form_matcher": "Matcher",
  "hooks_form_command": "Command",
  "hooks_form_command_placeholder": "e.g. npx biome check --write",
  "hooks_form_async": "Async",
  "hooks_form_async_desc": "Run hook without blocking execution",
  "hooks_form_prompt": "Prompt",
  "hooks_form_prompt_placeholder": "Enter prompt...",
  "hooks_form_model": "Model",
  "hooks_form_model_placeholder": "e.g. claude-opus-4-6",
  "hooks_form_model_desc": "Optional",
  "hooks_form_templates": "Templates",
  "hooks_form_save": "Save",
  "hooks_form_add": "Add",
  "hooks_form_saving": "Saving...",
  "hooks_form_adding": "Adding...",
  "claude_hook_docs_url": "https://code.claude.com/docs/en/hooks",
  "claude_hook_desc_SessionStart": "Session lifecycle hooks for startup, resume, and init",
  "claude_hook_desc_UserPromptSubmit": "Modify or validate user prompts before processing",
  "claude_hook_desc_PreToolUse": "Validate or gate tool calls before execution",
  "claude_hook_desc_PermissionRequest": "Custom handling for permission requests",
  "claude_hook_desc_PostToolUse": "Run actions after successful tool execution",
  "claude_hook_desc_PostToolUseFailure": "Handle failed tool executions",
  "claude_hook_desc_Notification": "Custom notification handling",
  "claude_hook_desc_SubagentStart": "Hooks for subagent initialization",
  "claude_hook_desc_SubagentStop": "Hooks for subagent completion",
  "claude_hook_desc_Stop": "Session stop hooks for cleanup and quality gates",
  "claude_hook_desc_TeammateIdle": "Handle teammate idle events",
  "claude_hook_desc_TaskCompleted": "Hooks for task completion events",
  "claude_hook_desc_ConfigChange": "React to configuration changes",
  "claude_hook_desc_WorktreeCreate": "Hooks for worktree creation",
  "claude_hook_desc_WorktreeRemove": "Hooks for worktree removal",
  "claude_hook_desc_Setup": "Repo setup hooks for init and maintenance",
  "claude_hook_desc_PreCompact": "Pre-compaction hooks for context management",
  "claude_hook_desc_SessionEnd": "Session end hooks for cleanup",
  "claude_hook_handler_command": "Run a shell command via stdin/stdout",
  "claude_hook_handler_prompt": "Send a prompt to Claude for single-turn evaluation",
  "claude_hook_handler_agent": "Spawn a subagent with tools like Read, Grep, and Glob",
  "claude_hook_scope_global": "Applies to all projects. Stored in ~/.claude/settings.json",
  "claude_hook_scope_project": "Applies to this project. Can be committed to the repo.",
  "claude_hook_scope_local": "Applies to this project. Gitignored and not shared."
}
```

**Step 3: messages/en/skills.json 생성**

```json
{
  "skills_empty_title": "No Skill Selected",
  "skills_empty_desc": "Select a skill from the left panel to view its details.",
  "skills_add_title": "Add Skill",
  "skills_add_desc": "Creates a new skill directory with SKILL.md template.",
  "skills_edit": "Edit",
  "skills_open_vscode": "VS Code",
  "skills_open_cursor": "Cursor",
  "skills_open_folder": "Open in Folder",
  "skills_delete": "Delete",
  "skills_delete_title": "Delete Skill",
  "skills_delete_confirm": "Are you sure you want to delete \"{name}\"? This action cannot be undone.",
  "skills_duplicate_tooltip": "A skill with the same name exists and takes priority.",
  "skills_scope": "Scope",
  "skills_last_updated": "Last updated",
  "skills_description": "Description",
  "skills_preview": "Preview",
  "skills_source": "Source",
  "skills_copied": "Copied to clipboard"
}
```

**Step 4: messages/en/plugins.json 생성**

```json
{
  "plugin_author": "Author",
  "plugin_source": "Source",
  "plugin_source_marketplace": "Marketplace ({name})",
  "plugin_source_local": "Local",
  "plugin_version": "Version",
  "plugin_description": "Description",
  "plugin_show_more": "{count} more",
  "plugin_cat_commands": "Commands",
  "plugin_cat_skills": "Skills",
  "plugin_cat_agents": "Agents",
  "plugin_cat_hooks": "Hooks",
  "plugin_cat_mcp_servers": "MCP Servers",
  "plugin_cat_lsp_servers": "LSP Servers",
  "plugin_cat_output_styles": "Output Styles",
  "plugin_cat_desc_commands": "Type / in the chat to use these shortcuts and run workflows as needed.",
  "plugin_cat_desc_skills": "Teach Claude team norms and domain expertise to automatically apply to related tasks.",
  "plugin_cat_desc_agents": "Specialized AI assistants that can be invoked to handle specific types of tasks.",
  "plugin_cat_desc_hooks": "Automatically run shell commands before and after specific events like tool calls or notifications.",
  "plugin_cat_desc_mcp_servers": "Connect to external tools and data sources to extend Claude's capabilities.",
  "plugin_cat_desc_lsp_servers": "Provide language server features like auto-completion and go-to-definition during code editing.",
  "plugin_cat_desc_output_styles": "Customize Claude's response format and style.",
  "plugin_update_success": "Plugin updated successfully",
  "plugin_update_error": "Failed to update plugin",
  "plugin_disabled": "Disabled",
  "plugin_title": "Plugins",
  "plugin_docs": "Docs",
  "plugin_search_placeholder": "Search plugins...",
  "plugin_no_selection": "No Plugin Selected",
  "plugin_no_selection_desc": "Select a plugin from the left panel to view its details.",
  "plugin_select_item": "Select an item to view details",
  "plugin_no_items": "No items",
  "plugin_update_btn": "Update",
  "plugin_open_vscode": "VS Code",
  "plugin_open_cursor": "Cursor",
  "plugin_uninstall": "Uninstall",
  "plugin_cancel": "Cancel",
  "plugin_uninstall_title": "Uninstall Plugin",
  "plugin_uninstall_confirm": "Are you sure you want to uninstall \"{name}\"? This action cannot be undone.",
  "plugin_render_error": "Failed to render plugins",
  "plugin_render_error_desc": "Try reloading the page.",
  "plugin_field_event": "Event",
  "plugin_field_type": "Type",
  "plugin_field_matcher": "Matcher",
  "plugin_field_name": "Name",
  "plugin_field_command": "Command",
  "plugin_field_url": "URL",
  "plugin_field_transport": "Transport"
}
```

**Step 5: messages/en/mcp.json 생성**

```json
{
  "mcp_title": "MCP Servers",
  "mcp_docs": "Docs",
  "mcp_search_placeholder": "Search servers...",
  "mcp_empty_title": "No Server Selected",
  "mcp_empty_desc": "Select a server from the left panel to view its details.",
  "mcp_field_type": "Type",
  "mcp_field_status": "Status",
  "mcp_field_args": "Arguments",
  "mcp_field_env": "Environment Variables",
  "mcp_delete_title": "Remove MCP Server",
  "mcp_delete_confirm": "Are you sure you want to remove \"{name}\"? This action cannot be undone.",
  "mcp_delete_error": "Failed to remove MCP server",
  "mcp_add_title": "Add MCP Server",
  "mcp_add_name": "Name",
  "mcp_add_name_placeholder": "my-server",
  "mcp_add_type": "Type",
  "mcp_add_command": "Command",
  "mcp_add_command_placeholder": "npx",
  "mcp_add_args": "Args (space-separated)",
  "mcp_add_args_placeholder": "-y @modelcontextprotocol/server-filesystem /path",
  "mcp_add_url": "URL",
  "mcp_add_url_placeholder": "https://example.com/mcp",
  "mcp_add_submit": "Add Server",
  "mcp_add_submitting": "Adding...",
  "mcp_add_error_name": "Name is required",
  "mcp_add_error_command": "Command is required for stdio type",
  "mcp_add_error_url": "URL is required for SSE/HTTP type",
  "mcp_open_vscode": "VS Code",
  "mcp_open_cursor": "Cursor",
  "mcp_open_error": "Failed to open in {editor}",
  "mcp_edit_title": "Edit MCP Server",
  "mcp_render_error": "Failed to load MCP Servers editor",
  "mcp_render_error_desc": "Please try refreshing the page.",
  "mcp_docs_url": "https://code.claude.com/docs/en/mcp"
}
```

**Step 6: messages/en/config.json 생성**

```json
{
  "config_title": "Configuration",
  "config_docs": "Docs",
  "config_docs_url": "https://code.claude.com/docs/en/settings",
  "config_render_error": "Failed to render configuration editor",
  "config_scope_user": "User",
  "config_scope_project": "Project",
  "config_scope_local": "Local",
  "config_no_project": "Select a project to view project/local settings",
  "config_saved": "Setting saved",
  "config_deleted": "Setting removed",
  "config_save_error": "Failed to save setting",
  "config_delete_error": "Failed to remove setting"
}
```

**Step 7: messages/en/files.json 생성**

```json
{
  "files_title": "Files",
  "files_docs": "Docs",
  "files_docs_url": "https://code.claude.com/docs/en/settings#configuration-file-locations",
  "files_select_file": "Select a file to edit",
  "files_no_selection": "Select a file to view",
  "files_no_selection_desc": "Browse the .claude/ directory tree on the left",
  "files_empty_dir": "Directory is empty or does not exist",
  "files_scope_global": "User",
  "files_scope_project": "Project",
  "files_render_error": "Failed to load Files explorer",
  "files_open_vscode": "VS Code",
  "files_open_cursor": "Cursor"
}
```

**Step 8: messages/en/settings.json 생성**

```json
{
  "settings_general": "General",
  "settings_model": "Model",
  "settings_env": "Environment Variables",
  "settings_status_line": "Status Line",
  "settings_install_info": "Install Info",
  "settings_feature_flags": "Feature Flags",
  "settings_permissions": "Permissions",
  "settings_shared": "Shared Settings",
  "settings_local": "Local Settings",
  "settings_no_project": "Select a project to view project settings",
  "settings_save_success": "Settings saved",
  "settings_save_error": "Failed to save settings",
  "settings_key": "Key",
  "settings_value": "Value",
  "settings_add": "Add",
  "settings_remove": "Remove",
  "settings_enabled": "Enabled",
  "settings_disabled": "Disabled",
  "settings_on": "On",
  "settings_off": "Off"
}
```

**Step 9: messages/en/editor.json 생성**

```json
{
  "editor_saved": "Saved",
  "editor_unsaved_changes": "Unsaved changes",
  "editor_saving": "Saving...",
  "editor_save": "Save",
  "editor_load_error": "Failed to load CLAUDE.md",
  "editor_save_error": "Failed to save. Please try again.",
  "editor_no_file": "No file found. Start typing to create one.",
  "editor_placeholder": "# CLAUDE.md\n\nAdd instructions for Claude here..."
}
```

**Step 10: en/main.json 삭제**

```bash
rm messages/en/main.json
```

**Step 11: typecheck 실행**

```bash
pnpm typecheck
```

Expected: 통과. 키 분산 후에도 `m.hooks_title()` 등 모든 호출이 동작해야 함.

**Step 12: 커밋**

```bash
git add messages/en/
git commit -m "refactor(i18n): split en.json into namespace files"
```

---

## Task 3: ko/ 네임스페이스 파일 분리

en/과 동일한 구조로 ko/를 분리한다. ko/main.json의 각 키를 en/과 같은 파일 구조로 분배한다.

**Files:**
- Delete: `messages/ko/main.json`
- Create: `messages/ko/common.json`, `messages/ko/hooks.json`, `messages/ko/skills.json`, `messages/ko/plugins.json`, `messages/ko/mcp.json`, `messages/ko/config.json`, `messages/ko/files.json`, `messages/ko/settings.json`, `messages/ko/editor.json`

**Step 1: ko/main.json을 en/과 동일한 키 분배로 9개 파일에 나눈다**

현재 ko/main.json의 내용을 en/ 파일 구조와 동일하게 분배 (각 파일에 해당 prefix의 키만 포함).

> 팁: `cat messages/ko/main.json`으로 ko 번역값을 확인 후, en/의 각 파일과 동일한 키 목록으로 ko/ 파일들 작성.

**Step 2: ko/main.json 삭제**

```bash
rm messages/ko/main.json
```

**Step 3: typecheck 실행**

```bash
pnpm typecheck
```

Expected: 통과.

**Step 4: 커밋**

```bash
git add messages/ko/
git commit -m "refactor(i18n): split ko.json into namespace files"
```

---

## Task 4: common_* 키 추출 (JSON)

중복 키들을 `common_*`으로 통합한다. 이 Task에서는 JSON만 변경하고, 코드는 아직 old 키를 참조해도 typecheck가 통과되도록 **기존 키를 바로 삭제하지 않는다**.

대신: **새 common_* 키를 common.json에 추가하고, 기존 duplicate 키는 그대로 유지**. (다음 Task에서 코드 교체 후 삭제)

**Files:**
- Modify: `messages/en/common.json`
- Modify: `messages/ko/common.json`

**Step 1: en/common.json에 common_* 키 추가**

```json
{
  ...(기존 키들),
  "common_cancel": "Cancel",
  "common_docs": "Docs",
  "common_open_vscode": "VS Code",
  "common_open_cursor": "Cursor",
  "common_open_error": "Failed to open in {editor}",
  "common_no_results": "No results"
}
```

**Step 2: ko/common.json에 동일 키 추가 (ko 번역값으로)**

ko/main.json에서 해당 번역값 확인 후 추가.

**Step 3: typecheck 실행**

```bash
pnpm typecheck
```

Expected: 통과 (새 키 추가만이므로).

**Step 4: 커밋**

```bash
git add messages/en/common.json messages/ko/common.json
git commit -m "refactor(i18n): add common_* keys for deduplication"
```

---

## Task 5: 코드 참조 교체 (common_* 사용)

코드에서 duplicate 키 참조를 common_*으로 교체한다.

**영향 파일 목록:**

| 파일 | 변경 내용 |
|------|----------|
| `src/features/hooks-editor/components/AddHookDialog.tsx` | `hooks_cancel` → `common_cancel` |
| `src/features/hooks-editor/components/HooksPageContent.tsx` | `hooks_docs` → `common_docs` |
| `src/features/hooks-editor/components/HooksScopeSection.tsx` | `hooks_no_results` → `common_no_results` |
| `src/features/plugins-editor/components/PluginsPage.tsx` | `plugin_docs` → `common_docs` |
| `src/features/plugins-editor/components/PluginActionBar.tsx` | `plugin_cancel` → `common_cancel`, `plugin_open_vscode` → `common_open_vscode`, `plugin_open_cursor` → `common_open_cursor` |
| `src/features/plugins-editor/components/PluginComponentDetail.tsx` | `plugin_open_vscode` → `common_open_vscode`, `plugin_open_cursor` → `common_open_cursor` |
| `src/features/mcp-editor/components/AddMcpDialog.tsx` | `hooks_cancel` → `common_cancel` |
| `src/features/mcp-editor/components/McpPageContent.tsx` | `mcp_docs` → `common_docs` |
| `src/features/config-editor/components/ConfigPageContent.tsx` | `config_docs` → `common_docs` |
| `src/features/files-editor/components/FilesPageContent.tsx` | `files_docs` → `common_docs` |
| `src/features/files-editor/components/FileViewerPanel.tsx` | `files_open_vscode` → `common_open_vscode`, `files_open_cursor` → `common_open_cursor` |
| `src/components/HookDetailPanel.tsx` | `hooks_cancel` → `common_cancel`, `hooks_open_vscode` → `common_open_vscode`, `hooks_open_cursor` → `common_open_cursor`, `hooks_open_error` → `common_open_error` |
| `src/components/SkillDetailPanel.tsx` | `hooks_cancel` → `common_cancel`, `skills_open_vscode` → `common_open_vscode`, `skills_open_cursor` → `common_open_cursor` |
| `src/components/McpDetailPanel.tsx` | `hooks_cancel` → `common_cancel`, `mcp_open_vscode` → `common_open_vscode`, `mcp_open_cursor` → `common_open_cursor`, `mcp_open_error` → `common_open_error` |

**Step 1: 각 파일에서 키 교체**

각 파일을 열어 위 표의 변경사항 적용. 예시 (HookDetailPanel.tsx):

```tsx
// Before
toast.error(m.hooks_open_error({ editor }))
// ...
{m.hooks_open_vscode()}
{m.hooks_open_cursor()}
// ...
<AlertDialogCancel>{m.hooks_cancel()}</AlertDialogCancel>

// After
toast.error(m.common_open_error({ editor }))
// ...
{m.common_open_vscode()}
{m.common_open_cursor()}
// ...
<AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
```

**Step 2: typecheck 실행**

```bash
pnpm typecheck
```

Expected: 통과.

**Step 3: 커밋**

```bash
git add src/
git commit -m "refactor(i18n): replace duplicate keys with common_* references"
```

---

## Task 6: 중복 키 JSON에서 삭제

코드가 모두 common_*을 사용하므로, 이제 기존 duplicate 키를 JSON에서 제거한다.

**Files:**
- Modify: `messages/en/hooks.json` — `hooks_cancel`, `hooks_open_vscode`, `hooks_open_cursor`, `hooks_open_error`, `hooks_no_results`, `hooks_docs` 삭제
- Modify: `messages/en/skills.json` — `skills_open_vscode`, `skills_open_cursor` 삭제
- Modify: `messages/en/plugins.json` — `plugin_cancel`, `plugin_open_vscode`, `plugin_open_cursor`, `plugin_docs` 삭제
- Modify: `messages/en/mcp.json` — `mcp_open_vscode`, `mcp_open_cursor`, `mcp_open_error`, `mcp_docs` 삭제
- Modify: `messages/en/config.json` — `config_docs` 삭제
- Modify: `messages/en/files.json` — `files_open_vscode`, `files_open_cursor`, `files_docs` 삭제
- Modify: `messages/ko/` — 동일하게 삭제

**Step 1: 각 en/ 파일에서 중복 키 삭제**

**Step 2: 동일하게 ko/ 파일에서도 삭제**

**Step 3: typecheck + build 실행**

```bash
pnpm typecheck && pnpm build
```

Expected: 둘 다 통과.

**Step 4: 최종 키 수 확인**

```bash
cat messages/en/**/*.json | python3 -c "
import json, sys
data = {}
import glob
for f in glob.glob('messages/en/*.json'):
    with open(f) as fp:
        data.update(json.load(fp))
print(f'총 키 수: {len(data)}')
"
```

Expected: 기존 257개에서 약 237개 (약 20개 감소).

**Step 5: 커밋**

```bash
git add messages/
git commit -m "refactor(i18n): remove duplicate keys replaced by common_*"
```

---

## Task 7: WORK.md 완료 처리

**Files:**
- Modify: `docs/WORK.md`

**Step 1: WORK.md에서 해당 항목 체크**

`- [ ] **i18n 메시지 파일 구조 개선 및 공통 텍스트 최적화**` → `- [x]` 로 변경.

**Step 2: 커밋**

```bash
git add docs/WORK.md
git commit -m "docs: mark i18n restructure as complete"
```
