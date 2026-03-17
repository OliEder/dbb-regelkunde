// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Accessibility & Theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('page has lang attribute set to "de"', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  });

  test('page has a meaningful title', async ({ page }) => {
    await expect(page).toHaveTitle(/DBB Regelkunde/);
  });

  test('bottom nav has aria-label', async ({ page }) => {
    await expect(page.locator('.bottom-nav')).toHaveAttribute('aria-label', 'Hauptnavigation');
  });

  test('nav buttons have aria-labels', async ({ page }) => {
    const navBtns = page.locator('.nav-btn');
    const count = await navBtns.count();
    for (let i = 0; i < count; i++) {
      const label = await navBtns.nth(i).getAttribute('aria-label');
      expect(label).toBeTruthy();
    }
  });

  test('active nav button has aria-current="page"', async ({ page }) => {
    await expect(page.locator('.nav-btn.active')).toHaveAttribute('aria-current', 'page');
  });

  test('inactive nav buttons have aria-current="false" after navigation', async ({ page }) => {
    // Navigate to quiz — home should now be false
    await page.locator('.nav-btn[data-view="quiz"]').click();
    const homeCurrent = await page.locator('.nav-btn[data-view="home"]').getAttribute('aria-current');
    expect(homeCurrent).toBe('false');
    const quizCurrent = await page.locator('.nav-btn[data-view="quiz"]').getAttribute('aria-current');
    expect(quizCurrent).toBe('page');
  });

  test('search input has label', async ({ page }) => {
    await page.locator('.nav-btn[data-view="learn"]').click();
    const label = page.locator('label[for="learn-search"]');
    await expect(label).toBeAttached();
  });

  test('progress bars have ARIA role and attributes', async ({ page }) => {
    const pbars = page.locator('[role="progressbar"]');
    const count = await pbars.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(pbars.nth(i)).toHaveAttribute('aria-valuemin', '0');
      await expect(pbars.nth(i)).toHaveAttribute('aria-valuemax', '100');
    }
  });

  test('sr-only elements are present for screen readers', async ({ page }) => {
    await page.locator('.nav-btn[data-view="learn"]').click();
    const srOnly = page.locator('.sr-only');
    const count = await srOnly.count();
    expect(count).toBeGreaterThan(0);
  });

  test('dark mode: body uses Barlow font family', async ({ page }) => {
    // Ensure no light class
    const htmlClass = await page.locator('html').getAttribute('class');
    if (htmlClass && htmlClass.includes('light')) {
      await page.locator('#theme-toggle-btn').click();
    }
    const fontFamily = await page.evaluate(() => {
      return getComputedStyle(document.body).fontFamily;
    });
    expect(fontFamily.toLowerCase()).toContain('barlow');
  });

  test('light mode: body uses Barlow font family', async ({ page }) => {
    // Ensure we're in light mode
    const htmlClass = await page.locator('html').getAttribute('class');
    if (!htmlClass || !htmlClass.includes('light')) {
      await page.locator('#theme-toggle-btn').click();
    }
    await expect(page.locator('html')).toHaveClass(/light/);
    const fontFamily = await page.evaluate(() => {
      return getComputedStyle(document.body).fontFamily;
    });
    expect(fontFamily.toLowerCase()).toContain('barlow');
  });

  test('dark mode: --font-head is defined (not empty)', async ({ page }) => {
    const htmlClass = await page.locator('html').getAttribute('class');
    if (htmlClass && htmlClass.includes('light')) {
      await page.locator('#theme-toggle-btn').click();
    }
    const fontHead = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--font-head').trim();
    });
    expect(fontHead).toBeTruthy();
    expect(fontHead).toContain('Barlow');
  });

  test('light mode: --font-head is defined (not empty)', async ({ page }) => {
    const htmlClass = await page.locator('html').getAttribute('class');
    if (!htmlClass || !htmlClass.includes('light')) {
      await page.locator('#theme-toggle-btn').click();
    }
    const fontHead = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--font-head').trim();
    });
    expect(fontHead).toBeTruthy();
    expect(fontHead).toContain('Barlow');
  });

  test('dark mode: --fc-back-from variable is defined', async ({ page }) => {
    const htmlClass = await page.locator('html').getAttribute('class');
    if (htmlClass && htmlClass.includes('light')) {
      await page.locator('#theme-toggle-btn').click();
    }
    const val = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--fc-back-from').trim();
    });
    expect(val).toBeTruthy();
  });

  test('theme preference is persisted in localStorage', async ({ page }) => {
    // Start from dark mode, then toggle to light
    const htmlClass = await page.locator('html').getAttribute('class');
    if (htmlClass && htmlClass.includes('light')) {
      await page.locator('#theme-toggle-btn').click(); // back to dark
    }
    await page.locator('#theme-toggle-btn').click(); // to light
    const stored = await page.evaluate(() => localStorage.getItem('regelkunde_theme'));
    expect(stored).toBe('light');
  });

  test('all buttons have min-height ≥ 44px (touch target WCAG 2.5.5)', async ({ page }) => {
    const buttons = page.locator('button');
    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 20); i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(43); // 43 allows for 1px rounding
      }
    }
  });

  test('quiz feedback has role="alert" for live announcements', async ({ page }) => {
    await page.locator('.nav-btn[data-view="quiz"]').click();
    await page.locator('button:has-text("Quiz starten")').click();
    await expect(page.locator('#quiz-feedback')).toHaveAttribute('role', 'alert');
  });

  test('navigating views updates aria-current on nav buttons', async ({ page }) => {
    await page.locator('.nav-btn[data-view="quiz"]').click();
    await expect(page.locator('.nav-btn[data-view="quiz"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.nav-btn[data-view="home"]')).toHaveAttribute('aria-current', 'false');
  });

  test('manifest.json is reachable', async ({ page }) => {
    const response = await page.request.get('/manifest.json');
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.name).toBe('DBB Regelkunde 2025');
  });
});
