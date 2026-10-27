import { expect, test } from "@playwright/test";

test("library lists guide cards with tier badges", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /How hard is it to get your OAuth app approved/ })).toBeVisible();
  const cards = page.getByTestId("guide-card");
  expect(await cards.count()).toBeGreaterThanOrEqual(1);
  await expect(cards.first().getByTestId("tier-badge")).toBeVisible();
  await expect(page.getByTestId("guide-card").filter({ hasText: "Linear" })).toBeVisible();
});

test("tier filter narrows the grid", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Tier 1/ }).click();
  for (const c of await page.getByTestId("guide-card").all()) await expect(c).toHaveAttribute("data-tier", "1");
});

test("guide api and markdown endpoint", async ({ request }) => {
  const list = await (await request.get("/api/guides")).json();
  expect(list.map((g: { slug: string }) => g.slug)).toContain("linear");
  const md = await request.get("/api/guides/linear/markdown");
  expect(md.headers()["content-type"]).toContain("text/markdown");
  expect(await md.text()).toContain("## ");
});
