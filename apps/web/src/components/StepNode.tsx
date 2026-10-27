"use client";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { ACTOR_META, EVIDENCE_COLOR, type Evidence, type GStep } from "@/app/guides/[slug]/ui";

export type StepNodeData = { step: GStep; evidence: Evidence; critical: boolean; [k: string]: unknown };
export type StepFlowNode = Node<StepNodeData, "step">;

export function StepNode({ data, selected }: NodeProps<StepFlowNode>) {
  const { step, evidence, critical } = data;
  const wait = step.actor === "provider";
  return (
    <div
      data-testid="flow-step"
      className="h-full w-full rounded-md bg-surface px-2.5 py-1.5 text-left shadow-sm"
      style={{
        border: `2px ${wait ? "dashed" : "solid"} ${EVIDENCE_COLOR[evidence]}`,
        outline: selected ? "2px solid var(--ink)" : undefined,
        opacity: step.optional ? 0.7 : 1,
        cursor: "pointer",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div className="line-clamp-2 text-[11px] font-medium leading-tight">{step.title}</div>
      <div className="mt-0.5 flex items-center justify-between font-mono text-[10px] text-muted">
        <span>{ACTOR_META[step.actor].emoji} {step.duration.label}</span>
        {critical && <span style={{ color: "var(--accent)" }}>critical</span>}
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}
