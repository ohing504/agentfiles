#!/bin/bash
# PreToolUse: 보호 대상 파일 수정 차단
# exit 0 = 허용, exit 2 = 차단 (stderr가 Claude에게 전달)

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# 프로젝트 루트 기준 상대 경로로 변환
REL_PATH="${FILE_PATH#$CLAUDE_PROJECT_DIR/}"

# 보호 대상 경로 패턴
PROTECTED_PATTERNS=(
  "^dist/"
  "^\.output/"
  "^node_modules/"
  "^\.env"
  "^pnpm-lock\.yaml$"
)

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$REL_PATH" =~ $pattern ]]; then
    echo "BLOCKED: '$REL_PATH' is a protected path. Do not modify build artifacts, dependencies, secrets, or lock files directly." >&2
    exit 2
  fi
done

exit 0
