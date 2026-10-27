import { expect, test } from "@playwright/test";

test("guide page renders verdict, start today, timeline, flow and ledger", async ({ page }) => {
  await page.goto("/guides/linear");
  await expect(page.getByTestId("tier-badge")).toBeVisible();
  await expect(page.getByTestId("start-today")).toContainText("Create the Linear OAuth2 application");
  expect(await page.getByTestId("timeline-item").count()).toBeGreaterThanOrEqual(3);
  expect(await page.getByTestId("claim-row").count()).toBeGreaterThanOrEqual(3);
  await expect(page.getByTestId("ledger-counts")).toContainText("sourced");
  await expect(page.locator(".react-flow__node").nth(2)).toBeVisible();
  expect(await page.locator(".react-flow__node").count()).toBeGreaterThanOrEqual(3);
  for (const h of await page.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""))) expect(h).not.toMatch(/^\s*(javascript|data):/i);
  await page.screenshot({ path: "docs/screenshots/guide.png", fullPage: true });
});

test("clicking a step node opens a detail panel", async ({ page }) => {
  await page.goto("/guides/linear");
  await page.locator(".react-flow__node-step").first().click();
  const panel = page.getByTestId("step-panel");
  await expect(panel).toBeVisible();
  expect((await panel.innerText()).length).toBeGreaterThan(40);
});

test("copy as markdown endpoint returns headings; unknown slug is 404", async ({ page, request }) => {
  const md = await request.get("/api/guides/linear/markdown");
  expect(await md.text()).toContain("## ");
  const res = await page.goto("/guides/does-not-exist");
  expect(res?.status()).toBe(404);
});
