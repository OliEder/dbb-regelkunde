// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Trainer C-Lizenz Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // ── HOME ───────────────────────────────────────────────

  test('home shows Trainer C-Lizenz progress bar', async ({ page }) => {
    await expect(page.locator('#home-t-pbar')).toBeVisible();
    const text = await page.locator('#home-t-text').textContent();
    expect(text).toMatch(/\d+\/\d+/);
    // total should be > 0 (trainer questions exist)
    const total = parseInt((text || '').split('/')[1]);
    expect(total).toBeGreaterThan(0);
  });

  // ── FLASHCARDS ────────────────────────────────────────

  test.describe('Flashcards', () => {
    test.beforeEach(async ({ page }) => {
      await page.locator('.nav-btn[data-view="flashcards"]').click();
      await page.waitForTimeout(300);
    });

    test('Trainer C-Lizenz chip is visible in flashcards', async ({ page }) => {
      const chip = page.locator('#fc-cat-filter .chip[data-cat="Trainer"]');
      await expect(chip).toBeVisible();
      await expect(chip).toContainText('Trainer C-Lizenz');
    });

    test('topic filter is hidden by default', async ({ page }) => {
      await expect(page.locator('#fc-topic-filter')).not.toBeVisible();
    });

    test('selecting Trainer chip shows topic filter row', async ({ page }) => {
      await page.locator('#fc-cat-filter .chip[data-cat="Trainer"]').click();
      await expect(page.locator('#fc-topic-filter')).toBeVisible();
    });

    test('topic filter has 7 chips (Alle Themen + 6 topics)', async ({ page }) => {
      await page.locator('#fc-cat-filter .chip[data-cat="Trainer"]').click();
      await page.waitForTimeout(200);
      const chips = page.locator('#fc-topic-filter .chip');
      await expect(chips).toHaveCount(7);
      await expect(chips.nth(0)).toContainText('Alle Themen');
    });

    test('Trainer filter shows only Regelfragen questions', async ({ page }) => {
      await page.locator('#fc-cat-filter .chip[data-cat="Trainer"]').click();
      await page.waitForTimeout(200);
      const idEl = page.locator('#fc-id');
      const idText = await idEl.textContent();
      // Trainer questions come from Regelfragen (prefix R-)
      expect(idText).toMatch(/^R-\d+$/);
    });

    test('switching to a topic chip filters correctly', async ({ page }) => {
      await page.locator('#fc-cat-filter .chip[data-cat="Trainer"]').click();
      await page.waitForTimeout(200);
      // click "Fouls & Freiwürfe"
      const foulsChip = page.locator('#fc-topic-filter .chip').filter({ hasText: 'Fouls' });
      await foulsChip.click();
      await page.waitForTimeout(200);
      await expect(foulsChip).toHaveClass(/active/);
      // card should still be a Regelfragen question
      const id = await page.locator('#fc-id').textContent();
      expect(id).toMatch(/^R-\d+$/);
    });

    test('switching back to Alle hides topic filter', async ({ page }) => {
      await page.locator('#fc-cat-filter .chip[data-cat="Trainer"]').click();
      await page.waitForTimeout(200);
      await page.locator('#fc-cat-filter .chip[data-cat="all"]').click();
      await expect(page.locator('#fc-topic-filter')).not.toBeVisible();
    });
  });

  // ── QUIZ ─────────────────────────────────────────────

  test.describe('Quiz', () => {
    test.beforeEach(async ({ page }) => {
      await page.locator('.nav-btn[data-view="quiz"]').click();
      await page.waitForTimeout(200);
    });

    test('Trainer C-Lizenz chip is visible in quiz', async ({ page }) => {
      const chip = page.locator('#quiz-cat-filter .chip[data-cat="Trainer"]');
      await expect(chip).toBeVisible();
    });

    test('topic filter is hidden by default in quiz', async ({ page }) => {
      await expect(page.locator('#quiz-topic-filter')).not.toBeVisible();
    });

    test('selecting Trainer chip shows topic filter in quiz', async ({ page }) => {
      await page.locator('#quiz-cat-filter .chip[data-cat="Trainer"]').click();
      await expect(page.locator('#quiz-topic-filter')).toBeVisible();
    });

    test('Trainer quiz starts and shows Regelfragen question', async ({ page }) => {
      await page.locator('#quiz-cat-filter .chip[data-cat="Trainer"]').click();
      await page.locator('button:has-text("Quiz starten")').click();
      await expect(page.locator('#quiz-active')).toBeVisible();
      // category shown in header contains "Regelfragen"
      const sub = await page.locator('#quiz-header-sub').textContent();
      expect(sub).toContain('Regelfragen');
    });

    test('Trainer quiz with topic filter works', async ({ page }) => {
      await page.locator('#quiz-cat-filter .chip[data-cat="Trainer"]').click();
      await page.waitForTimeout(200);
      const mannschaftChip = page.locator('#quiz-topic-filter .chip').filter({ hasText: 'Mannschaft' });
      await mannschaftChip.click();
      await page.locator('button:has-text("Quiz starten")').click();
      await expect(page.locator('#quiz-active')).toBeVisible();
      await expect(page.locator('#quiz-question')).not.toBeEmpty();
    });
  });

  // ── LEARN ─────────────────────────────────────────────

  test.describe('Learn', () => {
    test.beforeEach(async ({ page }) => {
      await page.locator('.nav-btn[data-view="learn"]').click();
      await page.waitForTimeout(300);
    });

    test('Trainer C-Lizenz chip is visible in learn', async ({ page }) => {
      const chip = page.locator('#learn-cat-filter .chip[data-cat="Trainer"]');
      await expect(chip).toBeVisible();
    });

    test('topic filter is hidden by default in learn', async ({ page }) => {
      await expect(page.locator('#learn-topic-filter')).not.toBeVisible();
    });

    test('selecting Trainer shows topic filter and filters questions', async ({ page }) => {
      await page.locator('#learn-cat-filter .chip[data-cat="Trainer"]').click();
      await page.waitForTimeout(200);
      await expect(page.locator('#learn-topic-filter')).toBeVisible();
      const countText = await page.locator('#learn-count').textContent();
      const num = parseInt(countText || '0');
      expect(num).toBeGreaterThan(0);
      expect(num).toBeLessThan(314);
    });

    test('selecting a topic further filters questions', async ({ page }) => {
      await page.locator('#learn-cat-filter .chip[data-cat="Trainer"]').click();
      await page.waitForTimeout(200);
      const allCount = parseInt((await page.locator('#learn-count').textContent()) || '0');
      const foulsChip = page.locator('#learn-topic-filter .chip').filter({ hasText: 'Fouls' });
      await foulsChip.click();
      await page.waitForTimeout(200);
      const topicCount = parseInt((await page.locator('#learn-count').textContent()) || '0');
      expect(topicCount).toBeGreaterThan(0);
      expect(topicCount).toBeLessThanOrEqual(allCount);
    });

    test('Trainer questions only show Regelfragen items', async ({ page }) => {
      await page.locator('#learn-cat-filter .chip[data-cat="Trainer"]').click();
      await page.waitForTimeout(200);
      // All IDs shown should be R-* prefix
      const idSpans = page.locator('#learn-list .learn-item span[style*="font-mono"]');
      const count = await idSpans.count();
      for (let i = 0; i < Math.min(count, 5); i++) {
        const txt = await idSpans.nth(i).textContent();
        expect(txt).toMatch(/^R-\d+$/);
      }
    });
  });

  // ── DURCHLAUF ─────────────────────────────────────────

  test.describe('Durchlauf', () => {
    test.beforeEach(async ({ page }) => {
      await page.locator('.nav-btn[data-view="durchlauf"]').click();
      await page.waitForTimeout(200);
    });

    test('Trainer C-Lizenz chip is visible in Durchlauf', async ({ page }) => {
      const chip = page.locator('#dl-cat-filter .chip[data-cat="Trainer"]');
      await expect(chip).toBeVisible();
    });

    test('topic filter is hidden by default in Durchlauf', async ({ page }) => {
      await expect(page.locator('#dl-topic-filter')).not.toBeVisible();
    });

    test('selecting Trainer shows topic filter in Durchlauf', async ({ page }) => {
      await page.locator('#dl-cat-filter .chip[data-cat="Trainer"]').click();
      await expect(page.locator('#dl-topic-filter')).toBeVisible();
    });

    test('Trainer Durchlauf starts with a question', async ({ page }) => {
      await page.locator('#dl-cat-filter .chip[data-cat="Trainer"]').click();
      await page.locator('#dl-config button:has-text("Neu starten")').click();
      await expect(page.locator('#dl-active')).toBeVisible();
      await expect(page.locator('#dl-q-text')).not.toBeEmpty();
    });

    test('Trainer Durchlauf with topic starts correctly', async ({ page }) => {
      await page.locator('#dl-cat-filter .chip[data-cat="Trainer"]').click();
      await page.waitForTimeout(200);
      const zeitChip = page.locator('#dl-topic-filter .chip').filter({ hasText: 'Zeitregeln' });
      await zeitChip.click();
      await page.locator('#dl-config button:has-text("Neu starten")').click();
      await expect(page.locator('#dl-active')).toBeVisible();
      await expect(page.locator('#dl-q-text')).not.toBeEmpty();
    });
  });
});
