"use client";
import type { Node, NodeProps } from "@xyflow/react";

export type LaneNodeData = { label: string; emoji: string; [k: string]: unknown };
export type LaneFlowNode = Node<LaneNodeData, "lane">;

export function LaneNode({ data }: NodeProps<LaneFlowNode>) {
  return (
    <div className="h-full w-full rounded-md border border-dashed border-line" style={{ background: "color-mix(in srgb, var(--ink) 3%, transparent)" }}>
      <div className="px-2.5 py-2 text-xs font-semibold text-muted">{data.emoji} {data.label}</div>
    </div>
  );
}
