import type { NodeFn } from "./common";
import { isFake, fakeDelay, loadFixture } from "../fake";
import { fakeOrThrow } from "./common";

// STUB (T13 implements). Fake mode: patched draft = verify.json.
export const verify: NodeFn = async (state) => {
  if (!isFake()) return fakeOrThrow("verify", "verify", state);
  await fakeDelay();
  return { draft: await loadFixture(state.input.app, "verify") };
};
