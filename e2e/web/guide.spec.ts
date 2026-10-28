import { expect, test } from "@playwright/test";

// Screenshots go to test-results/ (gitignored); set UPDATE_SCREENSHOTS=1 to refresh docs/screenshots/.
const shot = (name: string) => (process.env.UPDATE_SCREENSHOTS === "1" ? `docs/screenshots/${name}` : `test-results/${name}`);

test("gmail guide: tier 3, CASA on the critical path, evidence ledger with sources, uncertain items marked", async ({ page }) => {
  await page.goto("/guides/gmail");
  await expect(page.getByTestId("tier-badge").first()).toHaveAttribute("data-tier", "3");
  await expect(page.getByTestId("start-today")).toBeVisible();
  for (const id of ["tile-first", "tile-prod"]) {
    await expect(page.getByTestId(id)).toBeVisible();
    expect((await page.getByTestId(id).innerText()).trim().length).toBeGreaterThan(10);
  }

  const items = page.getByTestId("timeline-item");
  expect(await items.count()).toBeGreaterThanOrEqual(3);
  await expect(page.getByTestId("timeline")).toContainText(/CASA|security assessment/i);
  await expect(items.filter({ hasText: /CASA|security assessment/i }).first()).toBeVisible();

  expect(await page.getByTestId("claim-row").count()).toBeGreaterThanOrEqual(10);
  await expect(page.getByTestId("ledger-counts")).toContainText("sourced");
  // sources are rendered as links on sourced claims
  expect(await page.locator('[data-testid="claim-row"][data-evidence="sourced"] a[href^="http"]').count()).toBeGreaterThanOrEqual(3);
  // uncertain items are marked: inferred claims and open questions
  expect(await page.locator('[data-testid="claim-row"][data-evidence="inferred"]').count()).toBeGreaterThanOrEqual(1);
  await expect(page.getByTestId("ledger-counts")).toContainText(/[1-9]\d* open question/);

  await expect(page.locator(".react-flow__node").nth(2)).toBeVisible();
  expect(await page.locator(".react-flow__node").count()).toBeGreaterThanOrEqual(3);
  for (const h of await page.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""))) expect(h).not.toMatch(/^\s*(javascript|data):/i);
  await page.screenshot({ path: shot("guide.png"), fullPage: true });
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
