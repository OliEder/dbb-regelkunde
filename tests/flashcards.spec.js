// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Flashcards View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('.nav-btn[data-view="flashcards"]').click();
    await page.waitForTimeout(300);
  });

  test('flashcards view becomes active', async ({ page }) => {
    await expect(page.locator('#view-flashcards')).toHaveClass(/active/);
  });

  test('shows topbar with Karten heading', async ({ page }) => {
    await expect(page.locator('#view-flashcards .topbar h1')).toContainText('Karten');
  });

  test('shows category filter chips', async ({ page }) => {
    const chips = page.locator('#fc-cat-filter .chip');
    await expect(chips).toHaveCount(4);
    await expect(chips.nth(0)).toContainText('Alle');
    await expect(chips.nth(1)).toContainText('Regelfragen');
    await expect(chips.nth(2)).toContainText('KR-Fragen');
    await expect(chips.nth(3)).toContainText('Trainer C-Lizenz');
  });

  test('flashcard front face is visible on load', async ({ page }) => {
    await expect(page.locator('#fc-main')).toBeVisible();
    const front = page.locator('#flashcard .fc-front');
    await expect(front).toBeVisible();
    await expect(front).toHaveAttribute('aria-hidden', 'false');
  });

  test('flashcard shows a question text', async ({ page }) => {
    const questionEl = page.locator('#fc-question');
    await expect(questionEl).not.toBeEmpty();
    await expect(questionEl).not.toHaveText('Lade Fragen…');
  });

  test('flip button flips the card', async ({ page }) => {
    const flipBtn = page.locator('#fc-flip-btn');
    await expect(flipBtn).toHaveAttribute('aria-pressed', 'false');
    await flipBtn.click();
    await expect(flipBtn).toHaveAttribute('aria-pressed', 'true');
    const inner = page.locator('#flashcard');
    await expect(inner).toHaveClass(/flipped/);
  });

  test('back face shows answer word (Ja or Nein)', async ({ page }) => {
    await page.locator('#fc-flip-btn').click();
    const answerEl = page.locator('#fc-answer');
    const text = await answerEl.textContent();
    expect(['Ja', 'Nein']).toContain(text);
  });

  test('answer buttons are visible (Ja and Nein)', async ({ page }) => {
    await expect(page.locator('#fc-main .a-btn-ja')).toBeVisible();
    await expect(page.locator('#fc-main .a-btn-nein')).toBeVisible();
  });

  test('clicking Ja advances to next card', async ({ page }) => {
    const firstQuestion = await page.locator('#fc-question').textContent();
    await page.locator('#fc-main .a-btn-ja').click();
    await page.waitForTimeout(100);
    const isDone = await page.locator('#fc-done').isVisible();
    if (!isDone) {
      const secondQuestion = await page.locator('#fc-question').textContent();
      expect(secondQuestion).not.toEqual(firstQuestion);
    }
  });

  test('clicking Nein advances to next card', async ({ page }) => {
    const firstQuestion = await page.locator('#fc-question').textContent();
    await page.locator('#fc-main .a-btn-nein').click();
    await page.waitForTimeout(100);
    const isDone = await page.locator('#fc-done').isVisible();
    if (!isDone) {
      const secondQuestion = await page.locator('#fc-question').textContent();
      expect(secondQuestion).not.toEqual(firstQuestion);
    }
  });

  test('keyboard shortcut Space flips card', async ({ page }) => {
    await page.keyboard.press('Space');
    await expect(page.locator('#flashcard')).toHaveClass(/flipped/);
  });

  test('keyboard shortcut J answers Ja', async ({ page }) => {
    const firstQuestion = await page.locator('#fc-question').textContent();
    await page.keyboard.press('j');
    await page.waitForTimeout(100);
    const isDone = await page.locator('#fc-done').isVisible();
    if (!isDone) {
      const nextQuestion = await page.locator('#fc-question').textContent();
      expect(nextQuestion).not.toEqual(firstQuestion);
    }
  });

  test('keyboard shortcut N answers Nein', async ({ page }) => {
    const firstQuestion = await page.locator('#fc-question').textContent();
    await page.keyboard.press('n');
    await page.waitForTimeout(100);
    const isDone = await page.locator('#fc-done').isVisible();
    if (!isDone) {
      const nextQuestion = await page.locator('#fc-question').textContent();
      expect(nextQuestion).not.toEqual(firstQuestion);
    }
  });

  test('switching category filter works', async ({ page }) => {
    const regelChip = page.locator('#fc-cat-filter .chip').nth(1);
    await regelChip.click();
    await expect(regelChip).toHaveClass(/active/);
    await expect(regelChip).toHaveAttribute('aria-pressed', 'true');
  });

  test('progress bar and queue info are visible', async ({ page }) => {
    await expect(page.locator('#fc-pbar')).toBeVisible();
    const queueInfo = page.locator('#fc-queue-info');
    const text = await queueInfo.textContent();
    expect(text).toMatch(/\d+\s*\/\s*\d+/);
  });

  test('fc-id shows question ID', async ({ page }) => {
    const idEl = page.locator('#fc-id');
    const text = await idEl.textContent();
    expect(text).toMatch(/^[RK]-\d+$/);
  });
});
