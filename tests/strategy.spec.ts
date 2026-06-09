import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { join } from "path";

const PINE_CONTENT = readFileSync(join(__dirname, "..", "sample_strategy.pine"), "utf-8");

// Helper: select a preset from the dropdown (it's the second <select> on page)
async function selectPreset(page: import("@playwright/test").Page, name: string) {
  await page.locator("select").nth(1).selectOption(name);
}

// Helper: run backtest and wait for results
async function runAndWait(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Run Backtest" }).click();
  await expect(page.getByText("Strategy Tester")).toBeVisible({ timeout: 15_000 });
}

// Helper: clear backtest via data-testid
async function clearBacktest(page: import("@playwright/test").Page) {
  await page.getByTestId("clear-backtest").click();
}

test.describe("Strategy Section", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for candles to load
    await expect(page.locator("text=/\\d+ candles/")).toBeVisible({ timeout: 30_000 });
  });

  // ─── Pine Script Detection ───
  test("detects Pine Script when pasted in code editor", async ({ page }) => {
    await page.getByRole("button", { name: "Code" }).click();
    await page.locator("textarea").fill(PINE_CONTENT);

    await expect(page.getByText("Pine Script", { exact: true })).toBeVisible();
    await expect(page.getByText("auto-detected")).toBeVisible();
  });

  // ─── Pine Script Parsing ───
  test("Pine Script parses into entry and exit conditions", async ({ page }) => {
    await page.getByRole("button", { name: "Code" }).click();
    await page.locator("textarea").fill(PINE_CONTENT);

    // Switch to Visual tab
    await page.getByRole("button", { name: "Visual" }).click();

    // Should have conditions — Run Backtest should be enabled
    await expect(page.getByRole("button", { name: "Run Backtest" })).toBeEnabled();
  });

  // ─── Backtest Execution ───
  test("runs backtest and shows Strategy Tester with results", async ({ page }) => {
    await selectPreset(page, "RSI Oversold Bounce");
    await runAndWait(page);

    // Overview tab metrics
    await expect(page.getByText("Net Profit")).toBeVisible();
    await expect(page.getByText("Equity Curve")).toBeVisible();
    await expect(page.getByText("Gross Profit")).toBeVisible();
    await expect(page.getByText("Max Drawdown")).toBeVisible();
    await expect(page.getByText("Sharpe Ratio")).toBeVisible();
    await expect(page.locator("text=/\\d+W \\/ \\d+L/")).toBeVisible();
  });

  // ─── Tab Navigation ───
  test("Strategy Tester tabs work correctly", async ({ page }) => {
    await selectPreset(page, "RSI Oversold Bounce");
    await runAndWait(page);

    // List of Trades tab
    await page.getByRole("button", { name: "List of Trades" }).click();
    await expect(page.getByRole("columnheader", { name: "Entry", exact: true })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Return" })).toBeVisible();

    // Performance Summary tab
    await page.getByRole("button", { name: "Performance Summary" }).click();
    await expect(page.getByText("Calmar Ratio")).toBeVisible();
    await expect(page.getByText("Max Consec. Wins")).toBeVisible();
    await expect(page.getByText("Break-Even Win Rate")).toBeVisible();

    // Back to Overview
    await page.getByRole("button", { name: "Overview" }).click();
    await expect(page.getByText("Equity Curve")).toBeVisible();
  });

  // ─── THE BIG BUG: Clear + Re-run shows fresh results ───
  test("clearing backtest fully resets, re-run shows fresh results", async ({ page }) => {
    await selectPreset(page, "RSI Oversold Bounce");
    await runAndWait(page);

    // Clear via testid
    await clearBacktest(page);

    // Strategy Tester should disappear
    await expect(page.getByText("Strategy Tester")).not.toBeVisible({ timeout: 3_000 });

    // Academic Report button should also be gone
    await expect(page.getByText("Show Academic Report")).not.toBeVisible();

    // Re-run same backtest
    await page.getByRole("button", { name: "Run Backtest" }).click();
    await expect(page.getByText("Strategy Tester")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Net Profit")).toBeVisible();
    await expect(page.getByText("Equity Curve")).toBeVisible();
  });

  // ─── Clear resets report visibility ───
  test("clearing backtest also hides academic report", async ({ page }) => {
    await selectPreset(page, "Golden Cross");
    await runAndWait(page);

    // Try to open Academic Report if button exists
    const reportBtn = page.getByRole("button", { name: "Show Academic Report" });
    if (await reportBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await reportBtn.click();
      await expect(page.getByText("Performance Report")).toBeVisible();
    }

    // Clear
    await clearBacktest(page);

    // Both should be gone
    await expect(page.getByText("Strategy Tester")).not.toBeVisible({ timeout: 3_000 });
    await expect(page.getByText("Performance Report")).not.toBeVisible();
  });

  // ─── Preset loads correctly ───
  test("presets load and populate visual builder", async ({ page }) => {
    for (const preset of ["Golden Cross", "BB Mean Reversion", "MACD Cross"]) {
      await selectPreset(page, preset);
      await expect(page.getByRole("button", { name: "Run Backtest" })).toBeEnabled();
    }
  });

  // ─── Switch strategy between backtests ───
  test("switching strategy and re-running gives different results", async ({ page }) => {
    await selectPreset(page, "RSI Oversold Bounce");
    await runAndWait(page);

    // Clear
    await clearBacktest(page);
    await expect(page.getByText("Strategy Tester")).not.toBeVisible({ timeout: 3_000 });

    // Switch to MACD Cross
    await selectPreset(page, "MACD Cross");
    await runAndWait(page);

    await expect(page.getByText("Net Profit")).toBeVisible();
  });

  // ─── Pine file upload ───
  test("uploading .pine file parses correctly and backtests", async ({ page }) => {
    await page.getByRole("button", { name: "Code" }).click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "sample_strategy.pine",
      mimeType: "text/plain",
      buffer: Buffer.from(PINE_CONTENT),
    });

    await expect(page.getByText("Pine Script", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Run Backtest" })).toBeEnabled();

    await runAndWait(page);
    await expect(page.getByText("Net Profit")).toBeVisible();
  });

  // ─── DSL typed directly ───
  test("typing DSL directly in code editor works", async ({ page }) => {
    await page.getByRole("button", { name: "Code" }).click();
    await page.locator("textarea").fill("buy when rsi(14) crosses_above 30\nsell when rsi(14) crosses_above 70");

    // DSL badge (use exact match to avoid matching "DSL:" label)
    await expect(page.getByText("DSL", { exact: true })).toBeVisible();

    await runAndWait(page);
  });
});
