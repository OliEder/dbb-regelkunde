// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Quiz View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('.nav-btn[data-view="quiz"]').click();
    await page.waitForTimeout(200);
  });

  test('quiz view becomes active', async ({ page }) => {
    await expect(page.locator('#view-quiz')).toHaveClass(/active/);
  });

  test('shows quiz configuration screen initially', async ({ page }) => {
    await expect(page.locator('#quiz-config')).toBeVisible();
    await expect(page.locator('#quiz-active')).not.toBeVisible();
    await expect(page.locator('#quiz-summary')).not.toBeVisible();
  });

  test('shows category filter chips', async ({ page }) => {
    const chips = page.locator('#quiz-cat-filter .chip');
    await expect(chips).toHaveCount(4);
    await expect(chips.nth(3)).toContainText('Trainer C-Lizenz');
  });

  test('shows question count tiles (10, 20, 50, Alle)', async ({ page }) => {
    const tiles = page.locator('.count-tile');
    await expect(tiles).toHaveCount(4);
    await expect(tiles.nth(0)).toHaveText('10');
    await expect(tiles.nth(1)).toHaveText('20');
    await expect(tiles.nth(2)).toHaveText('50');
    await expect(tiles.nth(3)).toHaveText('Alle');
  });

  test('default count selection is 10', async ({ page }) => {
    const tile10 = page.locator('.count-tile').first();
    await expect(tile10).toHaveClass(/active/);
  });

  test('can select different question count', async ({ page }) => {
    const tile20 = page.locator('.count-tile').nth(1);
    await tile20.click();
    await expect(tile20).toHaveClass(/active/);
    await expect(tile20).toHaveAttribute('aria-pressed', 'true');
    const tile10 = page.locator('.count-tile').first();
    await expect(tile10).not.toHaveClass(/active/);
  });

  test('start quiz button starts the quiz', async ({ page }) => {
    await page.locator('button:has-text("Quiz starten")').click();
    await expect(page.locator('#quiz-active')).toBeVisible();
    await expect(page.locator('#quiz-config')).not.toBeVisible();
  });

  test('quiz shows question text and answer buttons', async ({ page }) => {
    await page.locator('button:has-text("Quiz starten")').click();
    await expect(page.locator('#quiz-question')).not.toBeEmpty();
    await expect(page.locator('#quiz-btns .a-btn-ja')).toBeVisible();
    await expect(page.locator('#quiz-btns .a-btn-nein')).toBeVisible();
  });

  test('quiz shows question counter', async ({ page }) => {
    await page.locator('button:has-text("Quiz starten")').click();
    const numEl = page.locator('#quiz-num');
    await expect(numEl).toContainText('Frage 1/10');
  });

  test('answering a question shows feedback', async ({ page }) => {
    await page.locator('button:has-text("Quiz starten")').click();
    await page.locator('#quiz-btns .a-btn-ja').click();
    const feedback = page.locator('#quiz-feedback');
    await expect(feedback).toBeVisible();
    const text = await feedback.textContent();
    expect(text).toMatch(/Richtig|Falsch/);
  });

  test('feedback has correct ARIA role alert', async ({ page }) => {
    await page.locator('button:has-text("Quiz starten")').click();
    await page.locator('#quiz-btns .a-btn-nein').click();
    await expect(page.locator('#quiz-feedback')).toHaveAttribute('role', 'alert');
  });

  test('Weiter button appears after answering', async ({ page }) => {
    await page.locator('button:has-text("Quiz starten")').click();
    await page.locator('#quiz-btns .a-btn-ja').click();
    await expect(page.locator('#quiz-next-btn')).toBeVisible();
    await expect(page.locator('#quiz-btns')).not.toBeVisible();
  });

  test('Weiter advances to next question', async ({ page }) => {
    await page.locator('button:has-text("Quiz starten")').click();
    await page.locator('#quiz-btns .a-btn-ja').click();
    await page.locator('#quiz-next-btn').click();
    await expect(page.locator('#quiz-num')).toContainText('Frage 2/10');
  });

  test('completing quiz shows summary', async ({ page }) => {
    await page.locator('button:has-text("Quiz starten")').click();
    for (let i = 0; i < 10; i++) {
      await page.locator('#quiz-btns .a-btn-ja').click();
      await page.locator('#quiz-next-btn').click();
    }
    await expect(page.locator('#quiz-summary')).toBeVisible();
    await expect(page.locator('#quiz-final-score')).not.toBeEmpty();
  });

  test('score displays correctly after quiz', async ({ page }) => {
    await page.locator('button:has-text("Quiz starten")').click();
    for (let i = 0; i < 10; i++) {
      await page.locator('#quiz-btns .a-btn-ja').click();
      await page.locator('#quiz-next-btn').click();
    }
    const score = await page.locator('#quiz-final-score').textContent();
    expect(score).toMatch(/\d+\/10/);
  });

  test('"Falsche Fragen anzeigen" button is in summary', async ({ page }) => {
    await page.locator('button:has-text("Quiz starten")').click();
    for (let i = 0; i < 10; i++) {
      await page.locator('#quiz-btns .a-btn-ja').click();
      await page.locator('#quiz-next-btn').click();
    }
    await expect(page.locator('button:has-text("Falsche Fragen")')).toBeVisible();
  });

  test('keyboard shortcut J answers in quiz', async ({ page }) => {
    await page.locator('button:has-text("Quiz starten")').click();
    await page.keyboard.press('j');
    await expect(page.locator('#quiz-feedback')).toBeVisible();
  });

  test('keyboard Space advances after answering in quiz', async ({ page }) => {
    await page.locator('button:has-text("Quiz starten")').click();
    await page.keyboard.press('n');
    await page.keyboard.press('Space');
    await expect(page.locator('#quiz-num')).toContainText('Frage 2/10');
  });
});
