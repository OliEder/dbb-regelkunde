// rules.js — Regelwerk-Modul
import { escHtml } from './utils.js';

let RULES_DATA = null;
let rulesTab = 'artikel';
let rulesRegelFilter = 'all';
let rulesSearchQuery = '';
let QUESTIONS_REF = null;

// Regel → Roman numeral
const REGEL_NUM_MAP = {
  'REGEL I – DAS SPIEL': '1',
  'REGEL II – SPIELFELD UND AUSRÜSTUNG': '2',
  'REGEL III – MANNSCHAFTEN': '3',
  'REGEL IV – SPIELVORSCHRIFTEN': '4',
  'REGEL V – REGELÜBERTRETUNGEN': '5',
  'REGEL VI – FOULS': '6',
  'REGEL VII – ALLGEMEINE VORSCHRIFTEN': '7',
};

export function setQuestionsRef(qs) { QUESTIONS_REF = qs; }

export async function loadRules() {
  if (RULES_DATA) return;
  try {
    const res = await fetch('data/rules.json');
    RULES_DATA = await res.json();
  } catch (e) {
    console.error('Regelwerk laden fehlgeschlagen:', e);
    RULES_DATA = { articles: [], glossary: [], images: [], meta: {} };
  }
}

export async function initRegeln() {
  await loadRules();
  rulesCloseDetail();
  renderRulesTab();
}

export function rulesSetTab(tab, el) {
  rulesTab = tab;
  document.querySelectorAll('#rules-tab-row .chip').forEach(c => {
    c.classList.remove('active');
    c.setAttribute('aria-selected', 'false');
  });
  el.classList.add('active');
  el.setAttribute('aria-selected', 'true');
  document.querySelectorAll('.rules-tab-content').forEach(c => { c.style.display = 'none'; });
  document.getElementById('rules-tab-' + tab).style.display = '';
  renderRulesTab();
}

export function rulesSetRegel(el, regelNum) {
  rulesRegelFilter = regelNum;
  document.querySelectorAll('#rules-regel-filter .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderArtikelList();
}

export function rulesSearch(query) {
  rulesSearchQuery = query.trim().toLowerCase();
  renderRulesTab();
}

function renderRulesTab() {
  if (!RULES_DATA) return;
  if (rulesTab === 'artikel') renderArtikelList();
  else if (rulesTab === 'glossar') renderGlossarList();
  else if (rulesTab === 'bilder') renderBilderGrid();
}

function getRegelNum(artikel) {
  return REGEL_NUM_MAP[artikel.regel] || '0';
}

// ── Safe DOM helpers ───────────────────────────────────────
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function setEmpty(container, icon, msg) {
  container.textContent = '';
  const wrap = el('div', 'rules-empty');
  wrap.appendChild(el('div', 'rules-empty-icon', icon));
  wrap.appendChild(el('div', null, msg));
  container.appendChild(wrap);
}

// ── ARTIKEL ────────────────────────────────────────────────
function renderArtikelList() {
  const container = document.getElementById('rules-artikel-list');
  if (!container || !RULES_DATA) return;

  let articles = RULES_DATA.articles;
  if (rulesRegelFilter !== 'all') {
    articles = articles.filter(a => getRegelNum(a) === rulesRegelFilter);
  }
  if (rulesSearchQuery) {
    const q = rulesSearchQuery;
    articles = articles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      String(a.number).includes(q) ||
      a.text.toLowerCase().includes(q)
    );
  }

  container.textContent = '';
  if (!articles.length) { setEmpty(container, '🔍', 'Keine Artikel gefunden'); return; }

  articles.forEach(a => {
    const card = el('div', 'rules-artikel-card');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Artikel ${a.number}: ${a.title}`);

    const inner = el('div', 'rules-artikel-card-inner');
    const numBadge = el('span', 'rules-art-num', `Art. ${a.number}`);
    const info = el('div', 'rules-art-info');
    const title = el('div', 'rules-art-title', a.title);
    const regel = el('div', 'rules-art-regel', a.regel);
    info.appendChild(title);
    info.appendChild(regel);
    inner.appendChild(numBadge);
    inner.appendChild(info);

    if (a.images.length) {
      inner.appendChild(el('span', 'rules-art-img-count', `🖼 ${a.images.length}`));
    }

    // Chevron SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('rules-art-chevron');
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('points', '9 18 15 12 9 6');
    svg.appendChild(poly);
    inner.appendChild(svg);

    card.appendChild(inner);
    card.addEventListener('click', () => rulesOpenDetail(a.number));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); rulesOpenDetail(a.number); } });
    container.appendChild(card);
  });
}

// ── GLOSSAR ────────────────────────────────────────────────
function renderGlossarList() {
  const container = document.getElementById('rules-glossar-list');
  if (!container || !RULES_DATA) return;

  let terms = RULES_DATA.glossary;
  if (rulesSearchQuery) {
    const q = rulesSearchQuery;
    terms = terms.filter(t =>
      t.term.toLowerCase().includes(q) ||
      t.definition.toLowerCase().includes(q)
    );
  }

  container.textContent = '';
  if (!terms.length) { setEmpty(container, '🔍', 'Kein Begriff gefunden'); return; }

  terms.forEach(t => {
    const entry = el('div', 'rules-glossar-entry');

    const termRow = el('div', 'rules-glossar-term');
    termRow.setAttribute('role', 'button');
    termRow.setAttribute('aria-expanded', 'false');
    termRow.appendChild(el('span', null, t.term));

    // Arrow SVG
    const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrowSvg.setAttribute('viewBox', '0 0 24 24');
    arrowSvg.setAttribute('fill', 'none');
    arrowSvg.setAttribute('stroke', 'currentColor');
    arrowSvg.setAttribute('stroke-width', '2');
    arrowSvg.setAttribute('width', '18');
    arrowSvg.setAttribute('height', '18');
    arrowSvg.setAttribute('aria-hidden', 'true');
    arrowSvg.classList.add('rules-glossar-arrow');
    const arrowPoly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    arrowPoly.setAttribute('points', '6 9 12 15 18 9');
    arrowSvg.appendChild(arrowPoly);
    termRow.appendChild(arrowSvg);

    const body = el('div', 'rules-glossar-body');
    body.appendChild(el('div', 'rules-glossar-def', t.definition));

    if (t.articles && t.articles.length) {
      const artsRow = el('div', 'rules-glossar-arts');
      t.articles.forEach(num => {
        const btn = el('button', 'rules-glossar-art-link', `Art. ${num}`);
        btn.addEventListener('click', e => { e.stopPropagation(); rulesOpenDetail(num); });
        artsRow.appendChild(btn);
      });
      body.appendChild(artsRow);
    }

    termRow.addEventListener('click', () => {
      const isOpen = body.classList.contains('open');
      body.classList.toggle('open', !isOpen);
      arrowSvg.classList.toggle('open', !isOpen);
      termRow.setAttribute('aria-expanded', String(!isOpen));
    });

    entry.appendChild(termRow);
    entry.appendChild(body);
    container.appendChild(entry);
  });
}

// ── BILDER ─────────────────────────────────────────────────
function renderBilderGrid() {
  const container = document.getElementById('rules-bilder-list');
  if (!container || !RULES_DATA) return;

  let images = RULES_DATA.images.filter(img =>
    img.width >= 200 && img.height >= 150 && img.article !== null
  );

  if (rulesSearchQuery) {
    const q = rulesSearchQuery;
    images = images.filter(img =>
      (img.caption && img.caption.toLowerCase().includes(q)) ||
      (img.article_title && img.article_title.toLowerCase().includes(q)) ||
      String(img.article || '').includes(q)
    );
  }

  container.textContent = '';
  if (!images.length) { setEmpty(container, '🖼', 'Keine Bilder gefunden'); return; }

  const grid = el('div', 'rules-bilder-grid');
  images.forEach(img => {
    const caption = img.caption ||
      (img.article ? `Art. ${img.article}: ${img.article_title || ''}` : '');

    const card = el('div', 'rules-bild-card');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', caption);

    const image = document.createElement('img');
    image.className = 'rules-bild-img';
    image.src = `data/images/${img.filename}`;
    image.alt = caption;
    image.loading = 'lazy';

    const cap = el('div', 'rules-bild-caption', caption);

    card.appendChild(image);
    card.appendChild(cap);
    card.addEventListener('click', () => rulesOpenLightbox(img.filename, caption));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); rulesOpenLightbox(img.filename, caption); } });
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

// ── ARTIKEL DETAIL ─────────────────────────────────────────
export function rulesOpenDetail(artNum) {
  if (!RULES_DATA) return;
  const art = RULES_DATA.articles.find(a => a.number === artNum);
  if (!art) return;

  const overlay = document.getElementById('rules-detail');
  const metaEl = document.getElementById('rules-detail-meta');
  const bodyEl = document.getElementById('rules-detail-body');

  metaEl.textContent = `Seite ${(art.pages || [])[0] || '?'}`;
  bodyEl.textContent = '';

  // Header
  const header = el('div');
  header.appendChild(el('span', 'rules-detail-art-num', `Artikel ${art.number}`));
  header.appendChild(el('div', 'rules-detail-title', art.title));
  header.appendChild(el('div', 'rules-detail-regel', art.regel));
  bodyEl.appendChild(header);

  // Images
  if (art.images.length) {
    const imgSection = el('div', 'rules-detail-images');
    imgSection.appendChild(el('div', 'rules-detail-images-title', 'Abbildungen'));
    const scroll = el('div', 'rules-detail-img-scroll');
    art.images.forEach(fn => {
      const imgData = RULES_DATA.images.find(i => i.filename === fn);
      const cap = (imgData && imgData.caption) ? imgData.caption : fn;
      const thumb = document.createElement('img');
      thumb.className = 'rules-detail-img-thumb';
      thumb.src = `data/images/${fn}`;
      thumb.alt = cap;
      thumb.title = cap;
      thumb.loading = 'lazy';
      thumb.addEventListener('click', () => rulesOpenLightbox(fn, cap));
      scroll.appendChild(thumb);
    });
    imgSection.appendChild(scroll);
    bodyEl.appendChild(imgSection);
  }

  // Article text
  const textEl = el('div', 'rules-detail-text', art.text);
  bodyEl.appendChild(textEl);

  // Related questions
  if (QUESTIONS_REF) {
    const related = QUESTIONS_REF.filter(q => String(q.article) === String(art.number));
    if (related.length) {
      const relSection = el('div', 'rules-detail-related');
      relSection.appendChild(el('div', 'rules-detail-related-title', `Prüfungsfragen (${related.length})`));
      related.slice(0, 10).forEach(q => {
        const qCard = el('div', 'rules-related-q');
        qCard.appendChild(el('div', 'rules-related-q-text', q.question));
        const ans = el('div', `rules-related-q-answer${q.answer === 'Nein' ? ' nein' : ''}`, `${q.answer} — ${q.explanation || ''}`);
        qCard.appendChild(ans);
        relSection.appendChild(qCard);
      });
      if (related.length > 10) {
        relSection.appendChild(el('div', null, `... und ${related.length - 10} weitere`));
      }
      bodyEl.appendChild(relSection);
    }
  }

  overlay.style.display = '';
  overlay.scrollTop = 0;
}

export function rulesCloseDetail() {
  const overlay = document.getElementById('rules-detail');
  if (overlay) overlay.style.display = 'none';
}

// ── LIGHTBOX ───────────────────────────────────────────────
export function rulesOpenLightbox(filename, caption) {
  const existing = document.getElementById('rules-lightbox');
  if (existing) existing.remove();

  const lb = el('div', 'rules-lightbox');
  lb.id = 'rules-lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', caption || 'Bildvorschau');

  const closeBtn = el('button', 'rules-lightbox-close', '✕');
  closeBtn.setAttribute('aria-label', 'Schließen');
  closeBtn.addEventListener('click', () => lb.remove());

  const img = document.createElement('img');
  img.className = 'rules-lightbox-img';
  img.src = `data/images/${filename}`;
  img.alt = caption || '';

  lb.appendChild(closeBtn);
  lb.appendChild(img);

  if (caption) {
    lb.appendChild(el('div', 'rules-lightbox-caption', caption));
  }

  lb.addEventListener('click', e => { if (e.target === lb) lb.remove(); });
  document.body.appendChild(lb);
}
