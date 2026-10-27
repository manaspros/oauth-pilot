import { expect, test } from "@playwright/test";

test("submitting Calendly shows the agent graph progressing, then lands on the generated guide", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("App name or website").fill("Calendly");
  await page.getByRole("button", { name: "Generate guide" }).click();
  await expect(page).toHaveURL(/\/runs\/[a-z0-9-]+$/i);
  await expect(page.getByTestId("run-node")).toHaveCount(7);

  // Mid-run: something is running or already done, and the log is streaming.
  await expect(page.locator('[data-testid="run-node"][data-status="running"], [data-testid="run-node"][data-status="done"]').first()).toBeVisible();
  await expect(page.getByTestId("log-line").first()).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/run.png" });

  await expect(page.getByTestId("run-banner")).toBeVisible({ timeout: 45_000 });
  for (const n of ["intake", "composio_lookup", "docs_research", "probe", "draft", "verify", "finalize"]) {
    await expect(page.locator(`[data-node="${n}"]`)).toHaveAttribute("data-status", /done|degraded/);
  }
  await expect(page).toHaveURL(/\/guides\/calendly\?generated=1/, { timeout: 10_000 });
  await expect(page.getByTestId("tier-badge")).toBeVisible();
});

test("unknown run id shows an honest error", async ({ page }) => {
  await page.goto("/runs/does-not-exist-123");
  await expect(page.getByTestId("run-error")).toContainText("Run not found", { timeout: 15_000 });
});
