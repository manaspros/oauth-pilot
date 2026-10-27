"use client";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import type { Guide } from "@oauth-pilot/core";
import { useMemo, useState } from "react";
import { ACTORS, ACTOR_META, weakestEvidence } from "@/app/guides/[slug]/ui";
import { LaneNode, type LaneFlowNode } from "./LaneNode";
import { StepNode, type StepFlowNode } from "./StepNode";
import { StepPanel } from "./StepPanel";

const NW = 150, NH = 54, LANE_H = 92, LABEL_W = 0, PAD_X = 24;
const nodeTypes = { step: StepNode, lane: LaneNode };

export function CriticalPathFlow({ guide, pathIds }: { guide: Guide; pathIds: string[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { nodes, edges, height } = useMemo(() => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "LR", nodesep: 20, ranksep: 28 });
    g.setDefaultEdgeLabel(() => ({}));
    guide.steps.forEach((s) => g.setNode(s.id, { width: NW, height: NH }));
    guide.steps.forEach((s) => s.dependsOn.forEach((d) => g.hasNode(d) && g.setEdge(d, s.id)));
    dagre.layout(g);
    const used = ACTORS.filter((a) => guide.steps.some((s) => s.actor === a));
    const laneIdx = new Map(used.map((a, i) => [a, i]));
    let maxX = 0;
    const steps: StepFlowNode[] = guide.steps.map((s) => {
      const x = g.node(s.id).x - NW / 2 + PAD_X + LABEL_W;
      maxX = Math.max(maxX, x + NW);
      return {
        id: s.id,
        type: "step",
        position: { x, y: laneIdx.get(s.actor)! * LANE_H + 30 },
        width: NW,
        height: NH,
        draggable: false,
        data: { step: s, evidence: weakestEvidence(s, guide.claims), critical: pathIds.includes(s.id) },
      };
    });
    const lanes: LaneFlowNode[] = used.map((a, i) => ({
      id: `lane-${a}`,
      type: "lane",
      position: { x: 0, y: i * LANE_H },
      width: maxX + PAD_X,
      height: LANE_H - 6,
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: -1,
      data: { label: ACTOR_META[a].label, emoji: ACTOR_META[a].emoji },
    }));
    const crit = new Set(pathIds.slice(1).map((id, i) => `${pathIds[i]}>${id}`));
    const es: Edge[] = guide.steps.flatMap((s) =>
      s.dependsOn
        .filter((d) => guide.steps.some((x) => x.id === d))
        .map((d) => {
          const c = crit.has(`${d}>${s.id}`);
          return {
            id: `${d}-${s.id}`,
            source: d,
            target: s.id,
            animated: c,
            style: { strokeWidth: c ? 3 : 1.25, stroke: c ? "var(--accent)" : "var(--muted)" },
          };
        }),
    );
    return { nodes: [...lanes, ...steps] as Node[], edges: es, height: used.length * LANE_H + 8 };
  }, [guide, pathIds]);

  const open = guide.steps.find((s) => s.id === openId);
  return (
    <section aria-label="Critical-path diagram" className="mt-10 hidden md:block">
      <h2 className="mb-3 text-xl font-semibold tracking-tight">Who does what, and when</h2>
      <div className="grid gap-3">
        <div data-testid="flow" className="overflow-hidden rounded-lg border border-line bg-surface" style={{ height: Math.max(height, 240) }}>
          <ReactFlow
            minZoom={0.3}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.1, minZoom: 0.4, maxZoom: 1 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            colorMode="system"
            proOptions={{ hideAttribution: true }}
            onNodeClick={(_, n) => n.type === "step" && setOpenId(n.id)}
            onPaneClick={() => setOpenId(null)}
          >
            <Background gap={20} />
            <Controls showInteractive={false} position="bottom-right" />
          </ReactFlow>
        </div>
        {open ? (
          <StepPanel step={open} claims={guide.claims} onClose={() => setOpenId(null)} />
        ) : (
          <div className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">
            Click a step to see its detail, links and claims. Border colour is the weakest evidence behind the step:
            <span style={{ color: "var(--tier-0)" }}> tested</span>,
            <span style={{ color: "var(--accent)" }}> sourced</span>,
            <span style={{ color: "var(--tier-2)" }}> inferred</span>. Dashed means waiting on the provider.
          </div>
        )}
      </div>
    </section>
  );
}
