// @ts-check
const { test, expect } = require('@playwright/test');

/** Helper: navigate to the Regelwerk view via the Home Nachschlagen button */
async function goToRegeln(page) {
  // Ensure we are on home first
  const homeActive = await page.locator('#view-home').evaluate(el => el.classList.contains('active'));
  if (!homeActive) {
    await page.locator('.nav-btn[data-view="home"]').click();
    await page.waitForTimeout(100);
  }
  await page.locator('.home-rules-btn').first().click();
  // Wait for the regeln view to become active and articles to load
  await page.waitForSelector('#view-regeln.active');
  await page.waitForSelector('.rules-artikel-card', { timeout: 10000 });
}

test.describe('Regelwerk View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // ── Navigation ────────────────────────────────────────────────────────────

  test('Home page shows Regelwerk button in Nachschlagen section', async ({ page }) => {
    const rulesBtn = page.locator('.home-rules-btn').first();
    await expect(rulesBtn).toBeVisible();
    await expect(rulesBtn).toContainText('Regelwerk');
  });

  test('Regelwerk button navigates to regeln view', async ({ page }) => {
    await page.locator('.home-rules-btn').first().click();
    await expect(page.locator('#view-regeln')).toHaveClass(/active/);
  });

  // ── Article list ──────────────────────────────────────────────────────────

  test('shows 49 articles in article list', async ({ page }) => {
    await goToRegeln(page);
    const cards = page.locator('.rules-artikel-card');
    await expect(cards).toHaveCount(49);
  });

  test('Regel filter chips are present (Alle + 7 Regeln)', async ({ page }) => {
    await goToRegeln(page);
    const chips = page.locator('#rules-regel-filter .chip');
    // Alle + I through VII = 8 chips
    await expect(chips).toHaveCount(8);
  });

  test('Regel filter reduces article count', async ({ page }) => {
    await goToRegeln(page);
    // Click Regel I chip
    await page.locator('#rules-regel-filter .chip[data-regel="1"]').click();
    await page.waitForTimeout(200);
    const cards = page.locator('.rules-artikel-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(49);
  });

  test('search input filters articles', async ({ page }) => {
    await goToRegeln(page);
    const allCount = await page.locator('.rules-artikel-card').count();
    // Type a search term that matches a subset of articles
    await page.locator('.rules-search-input').fill('Mannschaft');
    await page.waitForTimeout(300);
    const filteredCount = await page.locator('.rules-artikel-card').count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(allCount);
  });

  // ── Tab switching ─────────────────────────────────────────────────────────

  test('tabs switch between Artikel, Glossar, Bilder', async ({ page }) => {
    await goToRegeln(page);
    // Artikel tab should be active by default
    await expect(page.locator('#rules-tab-artikel')).toBeVisible();
    // Click Glossar tab
    await page.locator('#rules-tab-row button:has-text("Glossar")').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#rules-tab-glossar')).toBeVisible();
    await expect(page.locator('#rules-tab-artikel')).not.toBeVisible();
  });

  test('Glossar tab shows glossary entries', async ({ page }) => {
    await goToRegeln(page);
    await page.locator('#rules-tab-row button:has-text("Glossar")').click();
    await page.waitForSelector('.rules-glossar-entry', { timeout: 5000 });
    const entries = page.locator('.rules-glossar-entry');
    const count = await entries.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Bilder tab shows image grid', async ({ page }) => {
    await goToRegeln(page);
    await page.locator('#rules-tab-row button:has-text("Bilder")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#rules-tab-bilder')).toBeVisible();
    await expect(page.locator('.rules-bilder-grid, #rules-bilder-list').first()).toBeVisible();
  });

  // ── Article detail ────────────────────────────────────────────────────────

  test('clicking an article card opens detail overlay', async ({ page }) => {
    await goToRegeln(page);
    await page.locator('.rules-artikel-card').first().click();
    await page.waitForSelector('#rules-detail[style*="block"], #rules-detail:not([style*="none"])', { timeout: 5000 });
    const detail = page.locator('#rules-detail');
    await expect(detail).toBeVisible();
  });

  test('article detail shows article number and title', async ({ page }) => {
    await goToRegeln(page);
    await page.locator('.rules-artikel-card').first().click();
    await page.waitForSelector('#rules-detail-body', { timeout: 5000 });
    const detailBody = page.locator('#rules-detail-body');
    await expect(detailBody).toBeVisible();
    // The detail header meta area should contain content
    const meta = page.locator('#rules-detail-meta');
    await expect(meta).not.toBeEmpty();
  });

  test('article detail can be closed', async ({ page }) => {
    await goToRegeln(page);
    await page.locator('.rules-artikel-card').first().click();
    await page.waitForSelector('#rules-detail-body', { timeout: 5000 });
    await expect(page.locator('#rules-detail')).toBeVisible();
    // Click the back/close button
    await page.locator('.rules-back-btn').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#rules-detail')).not.toBeVisible();
  });

  // ── Glossary annotation ───────────────────────────────────────────────────

  test('article text contains gloss-term buttons when glossary terms appear', async ({ page }) => {
    await goToRegeln(page);
    // Open the first 5 articles and count .gloss-term buttons across all of them
    let totalGlossTerms = 0;
    const cards = page.locator('.rules-artikel-card');
    const cardCount = Math.min(await cards.count(), 5);

    for (let i = 0; i < cardCount; i++) {
      // Re-fetch cards each iteration since the DOM may update
      await page.locator('.rules-artikel-card').nth(i).click();
      await page.waitForSelector('#rules-detail-body', { timeout: 5000 });
      await page.waitForTimeout(300);
      const glossTerms = await page.locator('.gloss-term').count();
      totalGlossTerms += glossTerms;
      await page.locator('.rules-back-btn').click();
      await page.waitForTimeout(200);
    }

    // At least one of the first 5 articles should contain annotated glossary terms
    expect(totalGlossTerms).toBeGreaterThan(0);
  });

  test('clicking a gloss-term shows popup with definition', async ({ page }) => {
    await goToRegeln(page);
    // Find an article that has gloss-term buttons
    const cards = page.locator('.rules-artikel-card');
    const cardCount = await cards.count();
    let found = false;

    for (let i = 0; i < Math.min(cardCount, 10); i++) {
      await page.locator('.rules-artikel-card').nth(i).click();
      await page.waitForSelector('#rules-detail-body', { timeout: 5000 });
      await page.waitForTimeout(300);
      const glossTermCount = await page.locator('.gloss-term').count();
      if (glossTermCount > 0) {
        found = true;
        // Click the first gloss-term button
        await page.locator('.gloss-term').first().click();
        await page.waitForTimeout(200);
        // Popup should appear
        const popup = page.locator('.gloss-popup');
        await expect(popup).toBeVisible();
        // Popup should contain term and definition
        await expect(page.locator('.gloss-popup-term, .gloss-popup [class*="term"]')).not.toBeEmpty();
        await expect(page.locator('.gloss-popup-def, .gloss-popup [class*="def"]')).not.toBeEmpty();
        break;
      }
      await page.locator('.rules-back-btn').click();
      await page.waitForTimeout(200);
    }

    if (!found) {
      // If no article in the first 10 has gloss terms, skip gracefully with a note
      console.log('No gloss-term buttons found in first 10 articles — skipping popup assertion');
    }
  });

  test('gloss-popup closes on outside click', async ({ page }) => {
    await goToRegeln(page);
    // Find an article with gloss-term buttons
    const cards = page.locator('.rules-artikel-card');
    const cardCount = await cards.count();
    let found = false;

    for (let i = 0; i < Math.min(cardCount, 10); i++) {
      await page.locator('.rules-artikel-card').nth(i).click();
      await page.waitForSelector('#rules-detail-body', { timeout: 5000 });
      await page.waitForTimeout(300);
      const glossTermCount = await page.locator('.gloss-term').count();
      if (glossTermCount > 0) {
        found = true;
        await page.locator('.gloss-term').first().click();
        await page.waitForTimeout(200);
        await expect(page.locator('.gloss-popup')).toBeVisible();
        // Click outside the popup (on the detail header)
        await page.locator('.rules-detail-header').click({ position: { x: 10, y: 10 } });
        await page.waitForTimeout(200);
        // Popup should be gone
        await expect(page.locator('.gloss-popup')).not.toBeVisible();
        break;
      }
      await page.locator('.rules-back-btn').click();
      await page.waitForTimeout(200);
    }

    if (!found) {
      console.log('No gloss-term buttons found in first 10 articles — skipping outside-click assertion');
    }
  });

  // ── Handzeichen tab ───────────────────────────────────────────────────────

  test('Handzeichen tab is present and shows 70 cards', async ({ page }) => {
    await goToRegeln(page);
    await page.locator('#rules-tab-row button:has-text("Handzeichen")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#rules-tab-handzeichen')).toBeVisible();
    const cards = page.locator('.hz-card');
    await expect(cards).toHaveCount(70);
  });

  test('Handzeichen gallery can be filtered by category', async ({ page }) => {
    await goToRegeln(page);
    await page.locator('#rules-tab-row button:has-text("Handzeichen")').click();
    await page.waitForTimeout(300);
    const allCount = await page.locator('.hz-card').count();
    await page.locator('.hz-filter-row button:has-text("Spieluhr")').click();
    await page.waitForTimeout(200);
    const filteredCount = await page.locator('.hz-card').count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(allCount);
  });

  test('Handzeichen Quiz: Name mode shows image and 4 options', async ({ page }) => {
    await goToRegeln(page);
    await page.locator('#rules-tab-row button:has-text("Handzeichen")').click();
    await page.waitForTimeout(300);
    await page.locator('.hz-mode-bar button:has-text("Quiz: Name")').click();
    await page.waitForTimeout(200);
    await expect(page.locator('.hz-quiz-img')).toBeVisible();
    const options = page.locator('.hz-quiz-option');
    await expect(options).toHaveCount(4);
  });

  test('Handzeichen Quiz: Bild mode shows name and 4 image options', async ({ page }) => {
    await goToRegeln(page);
    await page.locator('#rules-tab-row button:has-text("Handzeichen")').click();
    await page.waitForTimeout(300);
    await page.locator('.hz-mode-bar button:has-text("Quiz: Bild")').click();
    await page.waitForTimeout(200);
    await expect(page.locator('.hz-quiz-name-display')).toBeVisible();
    const options = page.locator('.hz-quiz-option');
    await expect(options).toHaveCount(4);
  });

  // ── Learn view article badge link ─────────────────────────────────────────

  test('article badge in Learn view navigates to Regelwerk detail', async ({ page }) => {
    // Navigate to the Lernen view via the nav button
    await page.locator('.nav-btn[data-view="learn"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#view-learn')).toHaveClass(/active/);

    // Wait for questions with article badges to load
    await page.waitForSelector('.badge-link', { timeout: 10000 });
    const badgeLink = page.locator('.badge-link').first();
    await expect(badgeLink).toBeVisible();

    // Click the badge link — it should navigate to regeln and open the detail overlay
    await badgeLink.click();
    await page.waitForTimeout(500);

    // Regelwerk view should be active
    await expect(page.locator('#view-regeln')).toHaveClass(/active/);

    // The article detail overlay should be open
    await page.waitForSelector('#rules-detail-body', { timeout: 15000 });
    await expect(page.locator('#rules-detail')).toBeVisible();
  });
});
