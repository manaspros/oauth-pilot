import type { NodeFn } from "./common";
import { fakeOrThrow } from "./common";

// STUB (T11 implements).
export const probe: NodeFn = (state) => fakeOrThrow("probe", "probes", state);
