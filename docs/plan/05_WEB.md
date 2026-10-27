# 05 — Web app (`apps/web`)

Next.js 15 App Router, React 19, Tailwind 4, `@xyflow/react` 12, `@dagrejs/dagre`. The server runs the agent in-process (Node runtime, not edge). Light and dark mode via CSS variables.

## Pages

### `/` Library
- Hero: "How hard is it to get your OAuth app approved?" plus a **single input**: "App name or website" with an optional "what will your agent do?" field. Submit → `POST /api/runs` → `/runs/<runId>`.
- Grid of guide cards: logo initial, name, **tier badge** (0–4 colour scale), headline, "first connection: X · production: Y", Composio managed/BYO chip.
- Filter chips by tier.

### `/guides/[slug]` Guide (the shareable page)
Top to bottom:
1. **Verdict header.** Tier badge, headline, three stat tiles (first connection, production, hands-on effort), confidence pill, Composio recommendation with the callback URL and a copy button.
2. **"Start today" callout**, then the **critical path as a plain ordered timeline**: numbered steps, actor icon, duration, wait steps highlighted. This is built FIRST and always renders; it's the mobile view and the fallback.
3. **Critical-path diagram (React Flow), an upgrade below the timeline:**
   - **Swimlanes** by actor: 🤖 Agent, 🧑‍💻 You, 🏢 Admin/Legal, ⏳ Provider. These are horizontal bands built from group nodes.
   - Nodes are steps. Edges come from `dependsOn`. Layout uses dagre left-to-right, then y is snapped into the step's actor lane.
   - **Critical-path edges** are thick and animated. `provider` (waiting) nodes are dashed and show their duration.
   - Node border colour shows the weakest evidence among the step's claims (tested = solid green, sourced = blue, inferred = amber).
   - Clicking a node opens a side panel with the step detail markdown, links and its claims.
   - Read-only. Zoom and pan are on. On mobile it falls back to a vertical list.
4. **Steps by phase** as a checklist. Checkbox state lives in `localStorage` per slug and is a convenience only.
5. **Scopes table:** scope, sensitivity, needed for.
6. **Requirements** grouped by owner.
7. **Risks** table: blocker severity first, with symptom → fix.
8. **Evidence ledger:**
   - A table of claims with evidence badge, confidence, verifier verdict and sources (link plus quote on hover).
   - Counters at the top: "12 sourced · 2 tested · 4 inferred · 3 open questions".
9. Footer actions: "Copy as markdown" (`/api/guides/:slug/markdown`), "Copy link", "Regenerate" (starts a run), generated-at, model.

### `/runs/[runId]` Live generation
- **Agent graph (React Flow)** of the LangGraph nodes, laid out as in `03_AGENT_GRAPH.md`. A node is grey when pending, pulses when running and turns green when done. It shows `summary` when finished. Parallel nodes visibly run at the same time.
- A log stream panel on the right shows `log` events (search queries, fetched URLs, verifier verdicts).
- On `done`, show a "Guide ready" banner and navigate to `/guides/<slug>?generated=1` after 1.5 s.
- On `error` or timeout: show the message honestly. If a partial guide was saved (finalize ran with issues), link it with a "partial — lower confidence" label. Offer retry.

## Components (in `apps/web/src/components/`)

`TierBadge`, `ClockTiles`, `StartToday`, `Timeline`, `CriticalPathFlow`, `StepNode` (custom React Flow node), `LaneNode` (group), `StepPanel`, `EvidenceLedger`, `RiskTable`, `AgentRunFlow`, `RunLog`, `GuideCard`, `SubmitBox`.

## Data access

Server components read guides via `packages/agent` store helpers. Library guides come from `GUIDES_DIR` (default `<repo>/guides`); generated ones from `DATA_DIR/guides`. Tests may set `GUIDES_DIR=packages/core/fixtures`. No client-side fetch for guide pages, so they render fully on the server and are shareable.

## Visual direction

A clean developer-tool look: neutral background, one accent, monospace for scopes and URLs. Tier colours: 0 green, 1 teal, 2 amber, 3 orange, 4 red. Use the `frontend-design` skill guidance when building T15–T17.
