import type { RunnableConfig } from "@langchain/core/runnables";
import { fakeDelay, isFake, loadFixture } from "../fake";
import type { Emit, NodeName } from "../events";
import { now } from "../events";
import type { State, StateUpdate } from "../state";

export type NodeFn = (state: State, config: RunnableConfig) => Promise<StateUpdate>;

export const getEmit = (config: RunnableConfig): Emit => (config.configurable?.emit as Emit | undefined) ?? (() => {});

export const log = (config: RunnableConfig, node: NodeName, msg: string) =>
  getEmit(config)({ t: "log", node, msg, at: now() });

/** Stub body shared by T10 nodes: fake mode returns the recorded fixture; live mode is not implemented yet. */
export async function fakeOrThrow(node: NodeName, fixture: string, state: State): Promise<StateUpdate> {
  if (!isFake()) throw new Error(`node ${node} is not implemented yet (live mode)`);
  await fakeDelay();
  return (await loadFixture<StateUpdate>(state.input.app, fixture)) ?? {};
}
