"use client";
import "@xyflow/react/dist/style.css";
import { Background, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import { useMemo } from "react";

export const RUN_NODES = ["intake", "composio_lookup", "docs_research", "probe", "draft", "verify", "finalize"] as const;
export type RunNodeName = (typeof RUN_NODES)[number];
export type NodeStatus = "pending" | "running" | "done" | "degraded";
export type NodeState = { status: NodeStatus; summary?: string };

const LABEL: Record<RunNodeName, { title: string; role: string }> = {
  intake: { title: "Intake", role: "normalize the app" },
  composio_lookup: { title: "Composio lookup", role: "managed-auth facts" },
  docs_research: { title: "Docs research", role: "official docs + web" },
  probe: { title: "Probe", role: "live HTTP checks" },
  draft: { title: "Draft", role: "the Elephant" },
  verify: { title: "Verify", role: "the Goldfish" },
  finalize: { title: "Finalize", role: "validate + save" },
};

const W = 178, H = 74;
const POS: Record<RunNodeName, { x: number; y: number }> = {
  intake: { x: 0, y: 112 },
  composio_lookup: { x: 238, y: 0 },
  docs_research: { x: 238, y: 112 },
  probe: { x: 238, y: 224 },
  draft: { x: 476, y: 112 },
  verify: { x: 714, y: 112 },
  finalize: { x: 952, y: 112 },
};
const EDGES: [RunNodeName, RunNodeName][] = [
  ["intake", "composio_lookup"], ["intake", "docs_research"], ["intake", "probe"],
  ["composio_lookup", "draft"], ["docs_research", "draft"], ["probe", "draft"],
  ["draft", "verify"], ["verify", "finalize"],
];

const COLOR: Record<NodeStatus, string> = {
  pending: "var(--line)",
  running: "var(--accent)",
  done: "var(--tier-0)",
  degraded: "var(--tier-2)",
};
const WORD: Record<NodeStatus, string> = { pending: "waiting", running: "running", done: "done", degraded: "degraded" };

type RunFlowNode = Node<{ name: RunNodeName; state: NodeState; [k: string]: unknown }, "run">;

function RunNode({ data }: NodeProps<RunFlowNode>) {
  const { name, state } = data;
  const { status, summary } = state;
  return (
    <div
      data-testid="run-node"
      data-node={name}
      data-status={status}
      className={`h-full w-full rounded-md bg-surface px-2.5 py-1.5 text-left shadow-sm ${status === "running" ? "run-pulse" : ""}`}
      style={{ border: `2px ${status === "pending" ? "dashed" : "solid"} ${COLOR[status]}`, opacity: status === "pending" ? 0.7 : 1 }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">{LABEL[name].title}</span>
        <span className="font-mono text-[10px] uppercase tracking-wide" style={{ color: status === "pending" ? "var(--muted)" : COLOR[status] }}>
          {WORD[status]}
        </span>
      </div>
      <div className="mt-0.5 line-clamp-2 text-[10.5px] leading-tight text-muted">
        {summary && status !== "pending" && status !== "running" ? summary : LABEL[name].role}
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}
const nodeTypes = { run: RunNode };

export function AgentRunFlow({ states }: { states: Record<RunNodeName, NodeState> }) {
  const nodes = useMemo<RunFlowNode[]>(
    () =>
      RUN_NODES.map((n) => ({
        id: n, type: "run", position: POS[n], width: W, height: H, draggable: false,
        data: { name: n, state: states[n] },
      })),
    [states],
  );
  const edges = useMemo<Edge[]>(
    () =>
      EDGES.map(([s, t]) => {
        const active = states[s].status !== "pending" && states[t].status !== "done" && states[t].status !== "degraded";
        const lit = states[s].status === "done" || states[s].status === "degraded";
        return {
          id: `${s}-${t}`, source: s, target: t, animated: active && lit,
          style: { strokeWidth: lit ? 2.5 : 1.25, stroke: lit ? "var(--accent)" : "var(--muted)" },
        };
      }),
    [states],
  );
  return (
    <div data-testid="run-flow" className="overflow-hidden rounded-lg border border-line bg-surface" style={{ height: 360 }}>
      <style>{`@keyframes run-pulse{0%,100%{box-shadow:0 0 0 0 color-mix(in srgb,var(--accent) 45%,transparent)}50%{box-shadow:0 0 0 7px transparent}}.run-pulse{animation:run-pulse 1.4s ease-in-out infinite}`}</style>
      <ReactFlow
        nodes={nodes as Node[]} edges={edges} nodeTypes={nodeTypes}
        fitView fitViewOptions={{ padding: 0.08 }} minZoom={0.3}
        nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
        zoomOnScroll={false} panOnDrag={false} preventScrolling={false}
        colorMode="system" proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} />
      </ReactFlow>
    </div>
  );
}
