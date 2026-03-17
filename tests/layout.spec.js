// @ts-check
/**
 * Layout regression tests — prüfen ob Cards/Buttons korrekte Dimensionen haben
 * und der Inhalt innerhalb der Card-Grenzen bleibt (nicht überläuft).
 * Fängt Bugs wie "fc-wrap als button ohne display:block" ab.
 */
const { test, expect } = require('@playwright/test');

// Hilfsfunktion: prüft ob Element A vollständig innerhalb Element B liegt
async function isContainedIn(page, innerSel, outerSel) {
  return page.evaluate(({ inner, outer }) => {
    const a = document.querySelector(inner).getBoundingClientRect();
    const b = document.querySelector(outer).getBoundingClientRect();
    return (
      a.top    >= b.top    - 1 &&
      a.left   >= b.left   - 1 &&
      a.bottom <= b.bottom + 1 &&
      a.right  <= b.right  + 1
    );
  }, { inner: innerSel, outer: outerSel });
}

test.describe('Layout — Flashcard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('.nav-btn[data-view="flashcards"]').click();
    await page.waitForTimeout(300);
  });

  test('fc-wrap hat display:block (nicht inline)', async ({ page }) => {
    const display = await page.locator('#fc-flip-btn').evaluate(el =>
      getComputedStyle(el).display
    );
    expect(display).toBe('block');
  });

  test('fc-wrap hat eine Höhe von mindestens 200px', async ({ page }) => {
    const box = await page.locator('#fc-flip-btn').boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(200);
  });

  test('fc-wrap hat eine Breite die den Container ausfüllt (> 200px)', async ({ page }) => {
    const box = await page.locator('#fc-flip-btn').boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(200);
  });

  test('fc-wrap hat kein sichtbares border/background (saubere Button-Basis)', async ({ page }) => {
    const styles = await page.locator('#fc-flip-btn').evaluate(el => {
      const cs = getComputedStyle(el);
      return { background: cs.backgroundColor, borderWidth: cs.borderWidth };
    });
    // rgba(0,0,0,0) = transparent
    expect(styles.background).toBe('rgba(0, 0, 0, 0)');
    expect(styles.borderWidth).toBe('0px');
  });

  test('fc-inner füllt fc-wrap vollständig aus', async ({ page }) => {
    const wrap = await page.locator('#fc-flip-btn').boundingBox();
    const inner = await page.locator('#flashcard').boundingBox();
    expect(Math.abs(inner.width  - wrap.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(inner.height - wrap.height)).toBeLessThanOrEqual(2);
  });

  test('fc-front liegt innerhalb von fc-wrap', async ({ page }) => {
    const contained = await isContainedIn(page, '#flashcard .fc-front', '#fc-flip-btn');
    expect(contained).toBe(true);
  });

  test('fc-back liegt innerhalb von fc-wrap', async ({ page }) => {
    const contained = await isContainedIn(page, '#flashcard .fc-back', '#fc-flip-btn');
    expect(contained).toBe(true);
  });

  test('Fragetext (#fc-question) liegt innerhalb von fc-wrap', async ({ page }) => {
    const contained = await isContainedIn(page, '#fc-question', '#fc-flip-btn');
    expect(contained).toBe(true);
  });

  test('Antwort-Buttons liegen unterhalb von fc-wrap (nicht darunter überlappend)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const card = document.getElementById('fc-flip-btn').getBoundingClientRect();
      const row  = document.querySelector('#fc-main .answer-row').getBoundingClientRect();
      return { cardBottom: card.bottom, rowTop: row.top };
    });
    expect(result.rowTop).toBeGreaterThan(result.cardBottom - 2);
  });

  test('Antwort-Buttons überschneiden sich nicht mit fc-wrap', async ({ page }) => {
    const overlap = await page.evaluate(() => {
      const card = document.getElementById('fc-flip-btn').getBoundingClientRect();
      const row  = document.querySelector('#fc-main .answer-row').getBoundingClientRect();
      return card.bottom - row.top;
    });
    expect(overlap).toBeLessThan(10);
  });

  test('fc-wrap hat perspective gesetzt (3D-Flip möglich)', async ({ page }) => {
    const perspective = await page.locator('#fc-flip-btn').evaluate(el =>
      getComputedStyle(el).perspective
    );
    // Muss einen px-Wert haben, nicht 'none'
    expect(perspective).not.toBe('none');
    expect(perspective).toMatch(/px$/);
  });

  test('fc-inner hat transform-style: preserve-3d', async ({ page }) => {
    const transformStyle = await page.locator('#flashcard').evaluate(el =>
      getComputedStyle(el).transformStyle
    );
    expect(transformStyle).toBe('preserve-3d');
  });

  test('fc-back hat backface-visibility: hidden', async ({ page }) => {
    const bfv = await page.locator('#flashcard .fc-back').evaluate(el =>
      getComputedStyle(el).backfaceVisibility
    );
    expect(bfv).toBe('hidden');
  });
});

test.describe('Layout — Durchlauf Flashcard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('.nav-btn[data-view="durchlauf"]').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Durchlauf starten")').click();
    await page.waitForTimeout(200);
  });

  test('dl-flip-btn hat display:block', async ({ page }) => {
    const display = await page.locator('#dl-flip-btn').evaluate(el =>
      getComputedStyle(el).display
    );
    expect(display).toBe('block');
  });

  test('dl-flip-btn hat eine Höhe von mindestens 200px', async ({ page }) => {
    const box = await page.locator('#dl-flip-btn').boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(200);
  });

  test('dl-Fragetext liegt innerhalb von dl-flip-btn', async ({ page }) => {
    const contained = await isContainedIn(page, '#dl-question', '#dl-flip-btn');
    expect(contained).toBe(true);
  });

  test('dl-Antwort-Buttons liegen unterhalb von dl-flip-btn', async ({ page }) => {
    const result = await page.evaluate(() => {
      const card = document.getElementById('dl-flip-btn').getBoundingClientRect();
      const row  = document.querySelector('#dl-active .answer-row').getBoundingClientRect();
      return { cardBottom: card.bottom, rowTop: row.top };
    });
    expect(result.rowTop).toBeGreaterThan(result.cardBottom - 2);
  });
});

test.describe('Layout — Allgemein', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Bottom-Nav hat position:fixed und liegt am unteren Rand', async ({ page }) => {
    const result = await page.evaluate(() => {
      const nav = document.querySelector('.bottom-nav');
      const rect = nav.getBoundingClientRect();
      return {
        position: getComputedStyle(nav).position,
        navBottom: rect.bottom,
        viewportHeight: window.innerHeight,
      };
    });
    expect(result.position).toBe('fixed');
    // Nav-Unterkante darf max. 5px vom Viewport-Rand abweichen
    expect(Math.abs(result.navBottom - result.viewportHeight)).toBeLessThanOrEqual(5);
  });

  test('Bottom-Nav hat eine Höhe von mindestens 44px', async ({ page }) => {
    const box = await page.locator('.bottom-nav').boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test('App-Container hat max-width 640px', async ({ page }) => {
    const box = await page.locator('#app').boundingBox();
    expect(box.width).toBeLessThanOrEqual(641);
  });

  test('CSS-Variable --font-head ist in dark mode gesetzt', async ({ page }) => {
    // Sicherstellen: dark mode
    const cls = await page.locator('html').getAttribute('class');
    if (cls && cls.includes('light')) await page.locator('#theme-toggle-btn').click();

    const val = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--font-head').trim()
    );
    expect(val).toContain('Barlow');
  });

  test('CSS-Variable --font-head ist in light mode gesetzt', async ({ page }) => {
    const cls = await page.locator('html').getAttribute('class');
    if (!cls || !cls.includes('light')) await page.locator('#theme-toggle-btn').click();

    const val = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--font-head').trim()
    );
    expect(val).toContain('Barlow');
  });

  test('CSS-Variable --fc-back-from ist in dark mode gesetzt (Flashcard-Back-Gradient)', async ({ page }) => {
    const cls = await page.locator('html').getAttribute('class');
    if (cls && cls.includes('light')) await page.locator('#theme-toggle-btn').click();

    const val = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--fc-back-from').trim()
    );
    expect(val).toBeTruthy();
    expect(val).not.toBe('');
  });

  test('CSS-Variable --fc-back-from ist in light mode gesetzt', async ({ page }) => {
    const cls = await page.locator('html').getAttribute('class');
    if (!cls || !cls.includes('light')) await page.locator('#theme-toggle-btn').click();

    const val = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--fc-back-from').trim()
    );
    expect(val).toBeTruthy();
    expect(val).not.toBe('');
  });

  test('body nutzt Barlow als erste Schrift in dark mode (kein reiner Serif-Fallback)', async ({ page }) => {
    const cls = await page.locator('html').getAttribute('class');
    if (cls && cls.includes('light')) await page.locator('#theme-toggle-btn').click();

    const ff = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    // Erster Eintrag muss Barlow sein — nicht Times New Roman o.ä.
    const firstFont = ff.split(',')[0].toLowerCase().replace(/['"]/g, '').trim();
    expect(firstFont).toContain('barlow');
  });

  test('body nutzt Barlow als erste Schrift in light mode (kein reiner Serif-Fallback)', async ({ page }) => {
    const cls = await page.locator('html').getAttribute('class');
    if (!cls || !cls.includes('light')) await page.locator('#theme-toggle-btn').click();

    const ff = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    const firstFont = ff.split(',')[0].toLowerCase().replace(/['"]/g, '').trim();
    expect(firstFont).toContain('barlow');
  });
});
