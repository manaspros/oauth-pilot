import { expect, test } from "@playwright/test";

test("library lists guide cards with tier badges", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /How hard is it to get your OAuth app approved/ })).toBeVisible();
  const cards = page.getByTestId("guide-card");
  expect(await cards.count()).toBe(5);
  await expect(cards.first().getByTestId("tier-badge")).toBeVisible();
  await expect(page.getByTestId("guide-card").filter({ hasText: "Linear" })).toBeVisible();
});

test("every library card shows both clocks (first connection and production) with values", async ({ page }) => {
  await page.goto("/");
  const cards = page.getByTestId("guide-card");
  await expect(cards).toHaveCount(5);
  for (const c of await cards.all()) {
    await expect(c).toContainText("First connection");
    await expect(c).toContainText("production");
    const values = await c.locator("b").allInnerTexts();
    expect(values.length).toBeGreaterThanOrEqual(2);
    for (const v of values.slice(0, 2)) expect(v.trim().length).toBeGreaterThan(0);
  }
});

test("tier filter narrows the grid", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("guide-card")).toHaveCount(5);
  await page.getByRole("button", { name: /^Tier 2/ }).click();
  await expect(page.getByTestId("guide-card")).toHaveCount(2); // google-calendar, salesforce
  for (const c of await page.getByTestId("guide-card").all()) await expect(c).toHaveAttribute("data-tier", "2");
});

test("guide api and markdown endpoint", async ({ request }) => {
  const list = await (await request.get("/api/guides")).json();
  expect(list.map((g: { slug: string }) => g.slug)).toContain("linear");
  const md = await request.get("/api/guides/linear/markdown");
  expect(md.headers()["content-type"]).toContain("text/markdown");
  expect(await md.text()).toContain("## ");
});
