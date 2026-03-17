// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Stats View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('.nav-btn[data-view="stats"]').click();
    await page.waitForTimeout(200);
  });

  test('stats view becomes active', async ({ page }) => {
    await expect(page.locator('#view-stats')).toHaveClass(/active/);
  });

  test('shows topbar with Stats heading', async ({ page }) => {
    await expect(page.locator('#view-stats .topbar h1')).toContainText('Stats');
  });

  test('shows 3 KPI tiles', async ({ page }) => {
    await expect(page.locator('.kpi-tile')).toHaveCount(3);
  });

  test('KPI tiles show Beantwortet, Gemeistert, Genauigkeit labels', async ({ page }) => {
    await expect(page.locator('.kpi-tile .kpi-l').nth(0)).toContainText('Beantwortet');
    await expect(page.locator('.kpi-tile .kpi-l').nth(1)).toContainText('Gemeistert');
    await expect(page.locator('.kpi-tile .kpi-l').nth(2)).toContainText('Genauigkeit');
  });

  test('initial KPI values show 0 for fresh state', async ({ page }) => {
    await expect(page.locator('#stats-answered')).toHaveText('0');
    await expect(page.locator('#stats-mastered')).toHaveText('0');
    await expect(page.locator('#stats-accuracy')).toHaveText('0%');
  });

  test('donut chart SVG is rendered', async ({ page }) => {
    const donut = page.locator('#stats-donut svg');
    await expect(donut).toBeVisible();
  });

  test('legend shows gemeistert, im Lernen, unberührt', async ({ page }) => {
    await expect(page.locator('#stats-legend')).toContainText('gemeistert');
    await expect(page.locator('#stats-legend')).toContainText('im Lernen');
    await expect(page.locator('#stats-legend')).toContainText('unberührt');
  });

  test('article table has headers', async ({ page }) => {
    const headers = page.locator('.art-table th');
    await expect(headers).toHaveCount(4);
    await expect(headers.nth(0)).toContainText('Artikel');
    await expect(headers.nth(1)).toContainText('Fragen');
    await expect(headers.nth(2)).toContainText('Richtig');
    await expect(headers.nth(3)).toContainText('Trend');
  });

  test('article table has data rows', async ({ page }) => {
    const rows = page.locator('#stats-art-table tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('reset button is present', async ({ page }) => {
    const resetBtn = page.locator('button:has-text("zurücksetzen")');
    await expect(resetBtn).toBeVisible();
  });

  test('reset confirmation dialog appears on click', async ({ page }) => {
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('zurücksetzen');
      await dialog.dismiss();
    });
    await page.locator('button:has-text("zurücksetzen")').click();
  });

  test('stats update after answering questions', async ({ page }) => {
    // Go to quiz and answer 3 questions
    await page.locator('.nav-btn[data-view="quiz"]').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Quiz starten")').click();
    for (let i = 0; i < 3; i++) {
      await page.locator('#quiz-btns .a-btn-ja').click();
      await page.locator('#quiz-next-btn').click();
    }
    // Go back to stats
    await page.locator('.nav-btn[data-view="stats"]').click();
    await page.waitForTimeout(200);
    const answered = await page.locator('#stats-answered').textContent();
    expect(parseInt(answered || '0')).toBeGreaterThanOrEqual(3);
  });
});
