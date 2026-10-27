import type { NodeFn } from "./common";
import { fakeOrThrow } from "./common";

// STUB (T11 implements). Fake mode returns fixtures/runs/<slug>/intake.json.
export const intake: NodeFn = (state) => fakeOrThrow("intake", "intake", state);
