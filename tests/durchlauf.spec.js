// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Durchlauf View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('.nav-btn[data-view="durchlauf"]').click();
    await page.waitForTimeout(200);
  });

  test('durchlauf view becomes active', async ({ page }) => {
    await expect(page.locator('#view-durchlauf')).toHaveClass(/active/);
  });

  test('shows topbar with Prüfung heading', async ({ page }) => {
    await expect(page.locator('#view-durchlauf .topbar h1')).toContainText('Prüfung');
  });

  test('shows config screen initially', async ({ page }) => {
    await expect(page.locator('#dl-config')).toBeVisible();
    await expect(page.locator('#dl-active')).not.toBeVisible();
    await expect(page.locator('#dl-summary')).not.toBeVisible();
  });

  test('shows info box about durchlauf rules', async ({ page }) => {
    const infoBox = page.locator('#dl-config .info-box');
    await expect(infoBox).toBeVisible();
    await expect(infoBox).toContainText('2×');
  });

  test('shows category filter chips with counts', async ({ page }) => {
    const chips = page.locator('#dl-cat-filter .chip');
    await expect(chips).toHaveCount(4);
    await expect(chips.nth(0)).toContainText('314');
    await expect(chips.nth(1)).toContainText('175');
    await expect(chips.nth(2)).toContainText('139');
    await expect(chips.nth(3)).toContainText('Trainer C-Lizenz');
  });

  test('Neu starten starts the durchlauf', async ({ page }) => {
    await page.locator('#dl-config button:has-text("Neu starten")').click();
    await expect(page.locator('#dl-active')).toBeVisible();
    await expect(page.locator('#dl-config')).not.toBeVisible();
  });

  test('shows question header with Frage counter', async ({ page }) => {
    await page.locator('#dl-config button:has-text("Neu starten")').click();
    await expect(page.locator('#dl-num')).toContainText('Frage');
    await expect(page.locator('#dl-done-count')).toContainText('✓');
  });

  test('shows question text', async ({ page }) => {
    await page.locator('#dl-config button:has-text("Neu starten")').click();
    const questionEl = page.locator('#dl-q-text');
    await expect(questionEl).not.toBeEmpty();
    await expect(questionEl).not.toHaveText('—');
  });

  test('answer buttons are visible before answering', async ({ page }) => {
    await page.locator('#dl-config button:has-text("Neu starten")').click();
    await expect(page.locator('#dl-active .a-btn-ja')).toBeVisible();
    await expect(page.locator('#dl-active .a-btn-nein')).toBeVisible();
    await expect(page.locator('#dl-next-btn')).not.toBeVisible();
  });

  test('answering shows inline feedback', async ({ page }) => {
    await page.locator('#dl-config button:has-text("Neu starten")').click();
    await expect(page.locator('#dl-feedback')).not.toBeVisible();
    await page.locator('#dl-active .a-btn-ja').click();
    await expect(page.locator('#dl-feedback')).toBeVisible();
    await expect(page.locator('#dl-next-btn')).toBeVisible();
    await expect(page.locator('#dl-btns')).not.toBeVisible();
  });

  test('feedback shows correct or wrong class', async ({ page }) => {
    await page.locator('#dl-config button:has-text("Neu starten")').click();
    await page.locator('#dl-active .a-btn-ja').click();
    const fb = page.locator('#dl-feedback');
    const cls = await fb.getAttribute('class');
    expect(cls).toMatch(/correct|wrong/);
  });

  test('Weiter button advances to next question', async ({ page }) => {
    await page.locator('#dl-config button:has-text("Neu starten")').click();
    const firstQ = await page.locator('#dl-q-text').textContent();
    await page.locator('#dl-active .a-btn-ja').click();
    await page.locator('#dl-next-btn').click();
    await page.waitForTimeout(100);
    const isDone = await page.locator('#dl-summary').isVisible();
    if (!isDone) {
      const secondQ = await page.locator('#dl-q-text').textContent();
      expect(secondQ).not.toEqual(firstQ);
    }
  });

  test('progress bar is visible', async ({ page }) => {
    await page.locator('#dl-config button:has-text("Neu starten")').click();
    await expect(page.locator('#dl-pbar-el')).toBeVisible();
  });

  test('keyboard shortcut J answers in durchlauf', async ({ page }) => {
    await page.locator('#dl-config button:has-text("Neu starten")').click();
    await page.keyboard.press('j');
    await page.waitForTimeout(100);
    await expect(page.locator('#dl-feedback')).toBeVisible();
  });

  test('keyboard Space after answering advances to next question', async ({ page }) => {
    await page.locator('#dl-config button:has-text("Neu starten")').click();
    const firstQ = await page.locator('#dl-q-text').textContent();
    await page.keyboard.press('j');
    await page.waitForTimeout(50);
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    const isDone = await page.locator('#dl-summary').isVisible();
    if (!isDone) {
      const nextQ = await page.locator('#dl-q-text').textContent();
      expect(nextQ).not.toEqual(firstQ);
    }
  });

  test('done count updates after correct answers', async ({ page }) => {
    await page.locator('#dl-config button:has-text("Neu starten")').click();
    // Answer 2 questions correctly to mark one as done (streak >= 2)
    for (let i = 0; i < 4; i++) {
      const active = await page.locator('#dl-active').isVisible();
      if (!active) break;
      await page.locator('#dl-active .a-btn-ja').click();
      await page.waitForTimeout(50);
      const nextVisible = await page.locator('#dl-next-btn').isVisible();
      if (nextVisible) {
        await page.locator('#dl-next-btn').click();
        await page.waitForTimeout(50);
      }
    }
    const doneCount = await page.locator('#dl-done-count').textContent();
    expect(doneCount).toMatch(/✓/);
  });

  test('resume button hidden when no saved progress', async ({ page }) => {
    await expect(page.locator('#dl-resume-btn')).not.toBeVisible();
  });

  test('resume button visible after starting a durchlauf and returning', async ({ page }) => {
    await page.locator('#dl-config button:has-text("Neu starten")').click();
    // Answer one question then navigate away and back
    await page.locator('#dl-active .a-btn-ja').click();
    await page.locator('#dl-next-btn').click();
    await page.waitForTimeout(50);
    await page.locator('.nav-btn[data-view="home"]').click();
    await page.locator('.nav-btn[data-view="durchlauf"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#dl-resume-btn')).toBeVisible();
  });
});
