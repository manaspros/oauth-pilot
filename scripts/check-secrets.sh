#!/usr/bin/env bash
# Exit 1 if staged changes contain secret-looking strings. CLAUDE.md is excluded (it holds the pattern).
if git diff --cached -- . ':!CLAUDE.md' | grep -qE '(sk-ant-[A-Za-z0-9_-]{20,}|lin_api_[A-Za-z0-9]{20,}|gh[op]_[A-Za-z0-9]{30,}|ak_[A-Za-z0-9]{16,}|client_secret"?\s*[:=]\s*"[A-Za-z0-9_.-]{16,}")'; then
  echo "SECRET FOUND"
  exit 1
fi
exit 0
