import type { NodeFn } from "./common";
import { fakeOrThrow } from "./common";
import { isFake, fakeDelay, loadFixture } from "../fake";

// STUB (T13 implements). Fake mode: draft = draft.json (the guide itself).
export const draft: NodeFn = async (state) => {
  if (!isFake()) return fakeOrThrow("draft", "draft", state);
  await fakeDelay();
  return { draft: await loadFixture(state.input.app, "draft") };
};
