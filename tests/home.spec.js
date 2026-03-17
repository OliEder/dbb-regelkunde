// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Home View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('renders hero title and navigation', async ({ page }) => {
    await expect(page.locator('.hero-title')).toContainText('DBB Regelkunde');
    await expect(page.locator('.bottom-nav')).toBeVisible();
  });

  test('shows 6 navigation buttons', async ({ page }) => {
    const navBtns = page.locator('.nav-btn');
    await expect(navBtns).toHaveCount(6);
  });

  test('home nav button is active on load', async ({ page }) => {
    const homeBtn = page.locator('.nav-btn[data-view="home"]');
    await expect(homeBtn).toHaveClass(/active/);
    await expect(homeBtn).toHaveAttribute('aria-current', 'page');
  });

  test('shows stat tiles: Beantwortet, Gemeistert, Streak', async ({ page }) => {
    await expect(page.locator('.stat-tile .l').nth(0)).toContainText('Beantwortet');
    await expect(page.locator('.stat-tile .l').nth(1)).toContainText('Gemeistert');
    await expect(page.locator('.stat-tile .l').nth(2)).toContainText('Streak');
  });

  test('shows 4 mode buttons', async ({ page }) => {
    await expect(page.locator('.mode-btn')).toHaveCount(4);
  });

  test('shows progress bars for Regelfragen, KR-Fragen and Trainer C-Lizenz', async ({ page }) => {
    await expect(page.locator('#home-r-pbar')).toBeVisible();
    await expect(page.locator('#home-k-pbar')).toBeVisible();
    await expect(page.locator('#home-t-pbar')).toBeVisible();
  });

  test('theme toggle button is present and functional', async ({ page }) => {
    const toggle = page.locator('#theme-toggle-btn');
    await expect(toggle).toBeVisible();
    // Get initial state
    const initialClass = await page.locator('html').getAttribute('class');
    const wasLight = (initialClass || '').includes('light');
    // Toggle
    await toggle.click();
    const afterClass = await page.locator('html').getAttribute('class');
    if (wasLight) {
      expect(afterClass || '').not.toContain('light');
    } else {
      expect(afterClass).toContain('light');
    }
    // Toggle back
    await toggle.click();
    const finalClass = await page.locator('html').getAttribute('class');
    if (wasLight) {
      expect(finalClass).toContain('light');
    } else {
      expect(finalClass || '').not.toContain('light');
    }
  });

  test('Karten mode button navigates to flashcards', async ({ page }) => {
    await page.locator('.mode-btn').first().click();
    await expect(page.locator('#view-flashcards')).toHaveClass(/active/);
  });

  test('numbers in stat tiles load from state (default 0)', async ({ page }) => {
    await expect(page.locator('#home-total')).toHaveText('0');
    await expect(page.locator('#home-mastered')).toHaveText('0');
    await expect(page.locator('#home-streak')).toHaveText('0');
  });
});
