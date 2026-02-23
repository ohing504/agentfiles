#!/bin/bash
# PreToolUse: 위험한 bash 명령어 차단
# exit 0 = 허용, exit 2 = 차단 (stderr가 Claude에게 전달)
#
# 전체 명령어 문자열을 검사합니다 (문자열 인자 포함).
# 오탐(커밋 메시지 등)이 발생할 수 있지만, eval 등 우회를 통한
# 위험 명령 실행을 놓치는 것보다 안전합니다.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

# 위험한 패턴 목록
DANGEROUS_PATTERNS=(
  "rm -rf /"
  "git push.*--force"
  "git checkout \."
  "git reset --hard"
  "git clean -f"
  "DROP TABLE"
  "DROP DATABASE"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if [[ "$COMMAND" =~ $pattern ]]; then
    echo "BLOCKED: Dangerous command detected matching '$pattern'. Please confirm with the user before running destructive commands." >&2
    exit 2
  fi
done

exit 0
