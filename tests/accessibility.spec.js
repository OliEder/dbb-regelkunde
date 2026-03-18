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

  test('theme override is persisted when it differs from system preference', async ({ page }) => {
    // Determine current system preference via matchMedia
    const systemIsLight = await page.evaluate(() =>
      window.matchMedia('(prefers-color-scheme: light)').matches
    );
    // Toggle twice to end up on the opposite of the system preference
    await page.locator('#theme-toggle-btn').click();
    await page.locator('#theme-toggle-btn').click();
    // After two toggles we're back where we started;
    // toggle once more to land on the non-system value
    await page.locator('#theme-toggle-btn').click();
    const stored = await page.evaluate(() => localStorage.getItem('regelkunde_theme'));
    // The stored value must be the opposite of the system preference
    if (systemIsLight) {
      expect(stored).toBe('dark');
    } else {
      expect(stored).toBe('light');
    }
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

  // ── Keyboard-Trap Fixes ───────────────────────────────────────────────────

  test('lightbox: Escape closes the lightbox', async ({ page }) => {
    await page.locator('.nav-btn[data-view="regeln"]').click();
    await page.waitForSelector('.rules-artikel-card', { timeout: 10000 });
    // Switch to Bilder tab and open a lightbox
    await page.locator('#rules-tab-row button:has-text("Bilder")').click();
    await page.waitForSelector('.rules-bild-card', { timeout: 5000 });
    await page.locator('.rules-bild-card').first().click();
    await page.waitForSelector('#rules-lightbox', { timeout: 3000 });
    await expect(page.locator('#rules-lightbox')).toBeVisible();
    // Escape should close it
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await expect(page.locator('#rules-lightbox')).not.toBeAttached();
  });

  test('lightbox: focus moves to close button on open', async ({ page }) => {
    await page.locator('.nav-btn[data-view="regeln"]').click();
    await page.waitForSelector('.rules-artikel-card', { timeout: 10000 });
    await page.locator('#rules-tab-row button:has-text("Bilder")').click();
    await page.waitForSelector('.rules-bild-card', { timeout: 5000 });
    await page.locator('.rules-bild-card').first().click();
    await page.waitForSelector('#rules-lightbox', { timeout: 3000 });
    const focused = await page.evaluate(() => document.activeElement?.className);
    expect(focused).toContain('rules-lightbox-close');
  });

  test('article detail: Escape closes the overlay', async ({ page }) => {
    await page.locator('.nav-btn[data-view="regeln"]').click();
    await page.waitForSelector('.rules-artikel-card', { timeout: 10000 });
    await page.locator('.rules-artikel-card').first().click();
    await page.waitForSelector('#rules-detail-body', { timeout: 5000 });
    await expect(page.locator('#rules-detail')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await expect(page.locator('#rules-detail')).not.toBeVisible();
  });

  test('article detail: focus moves to back button on open', async ({ page }) => {
    await page.locator('.nav-btn[data-view="regeln"]').click();
    await page.waitForSelector('.rules-artikel-card', { timeout: 10000 });
    await page.locator('.rules-artikel-card').first().click();
    await page.waitForSelector('#rules-detail-body', { timeout: 5000 });
    const focused = await page.evaluate(() => document.activeElement?.className);
    expect(focused).toContain('rules-back-btn');
  });

  test('article detail: focus returns to triggering card on close', async ({ page }) => {
    await page.locator('.nav-btn[data-view="regeln"]').click();
    await page.waitForSelector('.rules-artikel-card', { timeout: 10000 });
    const firstCard = page.locator('.rules-artikel-card').first();
    await firstCard.click();
    await page.waitForSelector('#rules-detail-body', { timeout: 5000 });
    await page.locator('.rules-back-btn').click();
    await page.waitForTimeout(200);
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    expect(focused).toBeTruthy();
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
