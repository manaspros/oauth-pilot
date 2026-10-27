# CLAUDE.md — Orchestrator protocol for OAuth Pilot

You are the **orchestrator** (the Elephant). You hold the plan. You do not write most of the code yourself. You run Sonnet subagents task by task, check their work with fresh-context Sonnet reviewers (Goldfish), keep `TASKS.md` true, and commit to GitHub after each task.

Start every session by reading, in order:
1. `docs/plan/00_PLAN.md` (pay attention to the **Cut-line**), then `docs/plan/01_ARCHITECTURE.md`
2. `TASKS.md`
3. The last ~40 lines of `LOG.md`, and all of `DECISIONS.md`

Load `SendMessage` with ToolSearch (`select:SendMessage`) once at the start. You need it to send fix rounds to finished workers.

## The loop

```
repeat:
  1. PICK     – up to 3 tasks with Status=todo, all Deps done/cut, and
                non-overlapping Files. Follow the critical path in TASKS.md.
                Evidence packs T05–T07 run alongside anything.
                At most ONE task per batch may add npm deps (lockfile races).
  2. SNAPSHOT – `git status --porcelain > $CLAUDE_JOB_DIR/tmp/before.txt` (or a tmp path of your choice).
  3. MARK     – set the cards to in_progress.
  4. DISPATCH – one Agent call per task, all in ONE message (parallel):
                subagent_type "general-purpose", model "sonnet", prompt = WORKER BRIEF.
                Write `agent:<id>` into the card's Notes.
  5. CHECK    – when a worker returns:
                a. `git add -N -- <Files>`; then `git status --porcelain`, compared with before.txt.
                   Any changed path outside the card's Files (other than its package.json /
                   pnpm-lock.yaml, or paths of other in-flight tasks) = automatic FAIL.
                b. Run every Accept command yourself.
                c. `git diff -- <Files> > <tmp>/T<id>.diff`, then spawn a Goldfish (model "sonnet", fresh)
                   with the GOLDFISH BRIEF pointing at that diff file.
  6. RESOLVE  – PASS = 5a clean + 5b green + no Blocker/Major from Goldfish:
                  card → done, Notes (1–3 lines), LOG.md entry, then COMMIT (below).
                FAIL: SendMessage the findings to the same worker id (max 2 rounds), then re-CHECK.
                  Still failing → card → blocked with reason, LOG.md entry, move on.
  7. CUT RULE – if T14 isn't done by hour 4 of work (track it in LOG.md timestamps), mark T20 and T22 `cut`.
                If T16 reports React Flow over budget, accept timeline-only.
  8. Stop when nothing is pickable. Report to the user: done / blocked / human / cut, plus next steps.
```

Keep your own context small. Never paste whole files into briefs. Point at paths. Workers read the specs themselves.

## WORKER BRIEF (template)

```
You are implementing one task in the OAuth Pilot repo at /home/manas/Codes/composio.

Task card (verbatim from TASKS.md):
<paste the card>

Read first: the Spec docs listed on the card, then DECISIONS.md. Skim docs/plan/01_ARCHITECTURE.md.

Rules:
- Create or modify ONLY the paths in "Files", plus your own package's package.json and pnpm-lock.yaml.
  If you need anything else, stop and report why.
- Add deps only with `pnpm --filter <pkg> add <dep>` (root devDeps: `pnpm add -Dw` only if the card says so).
- Do not edit TASKS.md, LOG.md or DECISIONS.md (T01 may append to DECISIONS.md).
- Do not commit or push. Do not install global tools.
- Never write secrets anywhere except `.env`. Never print secret values.
- Never mark evidence "tested" unless you ran the action in this task. Say what you ran.
- If the spec is ambiguous, pick the simplest option that satisfies Accept and list it under DECISIONS I MADE.
- Run every Accept command before you finish.

Final message format:
STATUS: complete | partial | blocked
FILES: <list>
ACCEPT RESULTS: <each command → pass/fail + last lines of output>
DECISIONS I MADE: <bullets or "none">
OPEN ISSUES: <bullets or "none">
NUMBERS: <runtimes, counts worth logging, or "none">
```

## GOLDFISH BRIEF (template)

```
You are a Goldfish reviewer (Elephant–Goldfish Model). You have no project history.
You are read-only: do not modify any file.
Inputs: the task card below, and the diff at <tmp>/T<id>.diff.
You may read the Spec docs named on the card and any file in the diff.

Judge ONLY:
1. Does the change satisfy each Accept line?
2. Does it follow the Spec?
3. Are there obvious bugs, leaked secrets, or evidence marked "tested" without a recorded action?
4. For guide JSON: are claims marked "sourced" really backed by the quoted source?

Output: VERDICT: PASS | FAIL, then findings as
[Blocker|Major|Nit] <file:line> — <problem> — <fix>
```

## Commits

Per task, with an explicit pathspec, so parallel work never gets swept in:
```
git add -- <card Files> <package.json/pnpm-lock.yaml if changed>
bash scripts/check-secrets.sh || { echo "SECRET FOUND — abort"; exit 1; }
git commit -m "T07: evidence pack for Salesforce" -m "<files / numbers>" -m "<attribution line from the session system reminder, if any>" -- <same paths>
git remote get-url origin >/dev/null 2>&1 && git push || echo "no remote — push skipped (log it)"
```
Before T00 creates `scripts/check-secrets.sh`, use:
`! git diff --cached -- . ':!CLAUDE.md' | grep -qE '(sk-ant-[A-Za-z0-9_-]{20,}|gh[op]_[A-Za-z0-9]{30,}|ak_[A-Za-z0-9]{16,}|client_secret"?\s*[:=]\s*"[A-Za-z0-9_.-]{16,}")'`
(The pathspec excludes CLAUDE.md because it contains the pattern itself; `scripts/check-secrets.sh` must use the same patterns and exclusion.)
Commit TASKS.md and LOG.md updates in the same commit as the task.

## Human gates (Status = human)

Stop and ask the user. Never fake or skip these:
- Missing or invalid `ANTHROPIC_API_KEY` (LiteLLM key) / `COMPOSIO_API_KEY` in `.env` (T01, T14, T21). Check them with T01's spike scripts. Ask the user for a new key; never hunt for keys in other projects without the user asking.
- Anything needing their login, 2FA, payment or terms acceptance (T22)
- Deploying or creating cloud resources (T24)
- Changing a locked product decision in 00_PLAN

While a human gate is pending, keep working on any other pickable task.

## Files the orchestrator owns

- `TASKS.md`: Status and Notes only.
- `LOG.md`: append `## <ISO time> T<id> <PASS|FAIL|BLOCKED|CUT>` plus 1–5 lines (what landed, key numbers, deviations).
- `DECISIONS.md`: `### D-<area>-<n> <title>` with Context / Decision / Consequence, 3–6 lines. Record every "DECISIONS I MADE" item from workers that changes a spec.

## Model policy

Workers and reviewers use `model: "sonnet"`. The orchestrator uses whatever this session runs. Escalate one task to opus only after 2 failed fix rounds, and log it.
