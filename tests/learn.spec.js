// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Learn View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('.nav-btn[data-view="learn"]').click();
    await page.waitForTimeout(300);
  });

  test('learn view becomes active', async ({ page }) => {
    await expect(page.locator('#view-learn')).toHaveClass(/active/);
  });

  test('shows topbar with Lernen heading', async ({ page }) => {
    await expect(page.locator('#view-learn .topbar h1')).toContainText('Lernen');
  });

  test('shows search input', async ({ page }) => {
    await expect(page.locator('#learn-search')).toBeVisible();
    await expect(page.locator('#learn-search')).toHaveAttribute('placeholder', 'Fragen durchsuchen…');
  });

  test('shows category filter chips', async ({ page }) => {
    const chips = page.locator('#learn-cat-filter .chip');
    await expect(chips).toHaveCount(4);
    await expect(chips.nth(3)).toContainText('Trainer C-Lizenz');
  });

  test('article filter chips are generated', async ({ page }) => {
    const artChips = page.locator('#learn-art-filter .chip');
    const count = await artChips.count();
    expect(count).toBeGreaterThan(1); // "Alle Artikel" + article chips
  });

  test('displays 314 questions total', async ({ page }) => {
    const countEl = page.locator('#learn-count');
    await expect(countEl).toContainText('314');
  });

  test('question list has items', async ({ page }) => {
    const items = page.locator('#learn-list .learn-item');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test('each item shows question text and answer pill', async ({ page }) => {
    const firstItem = page.locator('#learn-list .learn-item').first();
    await expect(firstItem.locator('.q')).not.toBeEmpty();
    const pill = firstItem.locator('.ans-pill');
    await expect(pill).toBeVisible();
    const pillText = await pill.textContent();
    expect(['Ja', 'Nein']).toContain(pillText);
  });

  test('search filters questions', async ({ page }) => {
    await page.locator('#learn-search').fill('Spieler');
    await page.waitForTimeout(200);
    const allItems = await page.locator('#learn-list .learn-item').count();
    expect(allItems).toBeLessThan(314);
    const countText = await page.locator('#learn-count').textContent();
    const num = parseInt(countText || '0');
    expect(num).toBeLessThan(314);
  });

  test('empty search clears back to full list', async ({ page }) => {
    await page.locator('#learn-search').fill('xyznotfound123');
    await page.waitForTimeout(200);
    await page.locator('#learn-search').clear();
    await page.waitForTimeout(200);
    const countText = await page.locator('#learn-count').textContent();
    const num = parseInt(countText || '0');
    expect(num).toBe(314);
  });

  test('empty search result shows empty state', async ({ page }) => {
    await page.locator('#learn-search').fill('xyznotfound123abc');
    await page.waitForTimeout(200);
    await expect(page.locator('#learn-count')).toContainText('0');
  });

  test('switching to Regelfragen filter reduces count to 175', async ({ page }) => {
    await page.locator('#learn-cat-filter .chip').nth(1).click();
    await page.waitForTimeout(200);
    await expect(page.locator('#learn-count')).toContainText('175');
  });

  test('switching to KR-Fragen filter reduces count to 139', async ({ page }) => {
    await page.locator('#learn-cat-filter .chip').nth(2).click();
    await page.waitForTimeout(200);
    await expect(page.locator('#learn-count')).toContainText('139');
  });

  test('answer pills have correct aria-label', async ({ page }) => {
    const firstPill = page.locator('#learn-list .ans-pill').first();
    const ariaLabel = await firstPill.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/Antwort: (Ja|Nein)/);
  });

  test('article badges are present on items with article', async ({ page }) => {
    const badges = page.locator('#learn-list .badge-blue');
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
  });
});
