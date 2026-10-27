import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, expect, it, vi } from "vitest";

vi.mock("../src/nodes/probe", () => ({
  probe: async () => {
    throw new Error("boom");
  },
}));

import { readEvents, runGuide } from "../src";

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "oauth-pilot-deg-"));
  process.env.DATA_DIR = dir;
  process.env.OAUTH_PILOT_FAKE = "1";
  process.env.OAUTH_PILOT_FAKE_DELAY_MS = "0";
});
afterAll(() => rm(dir, { recursive: true, force: true }));

it("a failing fan-out node degrades: started, warn log, finished(degraded); run still reaches done", async () => {
  await runGuide({ app: "Linear" }, { runId: "deg1" });
  const ev = await readEvents("deg1");
  const probeEv = ev.filter((e) => "node" in e && e.node === "probe");
  expect(probeEv.map((e) => e.t)).toEqual(["node_started", "log", "node_finished"]);
  expect(probeEv[1]).toMatchObject({ level: "warn" });
  expect(probeEv[2]).toMatchObject({ status: "degraded", summary: "degraded: boom" });
  expect(ev.some((e) => e.t === "error")).toBe(false);
  expect(ev.at(-1)!.t).toBe("done");
});
