#!/usr/bin/env bash
# Headless plugin smoke: loads plugin/oauth-pilot into `claude -p` and asks for the Linear guide.
# The guide comes from the library embedded in the MCP bundle (no generation run, no external APIs).
# Needs a logged-in `claude` CLI (Tier C). Without one this prints "SKIPPED: needs Claude login" and exits 0.
# Costs a few cents of Claude usage per run (the cost is printed).
set -u
cd "$(dirname "$0")/.."

if ! command -v claude >/dev/null 2>&1; then
  echo "SKIPPED: needs Claude login (claude CLI not found)"; exit 0
fi

out="$(mktemp)"; err="$(mktemp)"; trap 'rm -f "$out" "$err"' EXIT
export OAUTH_PILOT_FAKE=1
timeout 240 claude -p --plugin-dir plugin/oauth-pilot \
  --output-format json --max-budget-usd 1 \
  --disallowedTools "Bash,Edit,Write,Read,Glob,Grep,WebFetch,WebSearch,Agent,Task,NotebookEdit" \
  --allowedTools "mcp__plugin_oauth-pilot_oauth-pilot__oauth_guide_list,mcp__plugin_oauth-pilot_oauth-pilot__oauth_guide_get" \
  -- "/oauth-pilot:oauth-guide linear. Use only the list/get MCP tools. Do NOT save any file. Reply in 3 lines: the tier number and label, and the first step." \
  >"$out" 2>"$err" </dev/null
rc=$?

# Skip only when the process failed AND the failure is auth-specific (stderr or the error result).
AUTH='Not logged in|Please run /login|Invalid API key|authentication_error'
is_err="$(node -e 'try{const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(r.is_error?"1":"0")}catch{console.log("0")}' "$out")"
if [ $rc -ne 0 ] || [ "$is_err" = "1" ]; then
  if grep -qE "$AUTH" "$err" || { [ "$is_err" = "1" ] && grep -qE "$AUTH" "$out"; }; then
    echo "SKIPPED: needs Claude login"; exit 0
  fi
  echo "FAIL: claude exited $rc (is_error=$is_err)"; head -c 600 "$err"; head -c 600 "$out"; exit 1
fi

node -e '
const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
const text = String(r.result ?? "");
console.log(text);
console.log(`plugin smoke cost: $${(r.total_cost_usd ?? 0).toFixed(4)} · turns: ${r.num_turns}`);
if (r.is_error) { console.error("FAIL: claude reported an error"); process.exit(1); }
if (!/tier/i.test(text)) { console.error("FAIL: output does not mention the tier"); process.exit(1); }
console.log("plugin e2e ok");
' "$out"
