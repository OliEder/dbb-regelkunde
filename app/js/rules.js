// rules.js — Regelwerk-Modul
import { escHtml } from './utils.js';

let RULES_DATA = null;
let rulesTab = 'artikel';
let hzMode = 'galerie'; // 'galerie' | 'quiz-name' | 'quiz-bild'
let hzCategoryFilter = 'all';
let hzQuizState = null;
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
  else if (rulesTab === 'handzeichen') renderHandzeichenTab();
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

// Build set of filenames that are non-thumbnail members of an imageGroup
function _getGroupSubImages() {
  const subs = new Set();
  if (!RULES_DATA) return subs;
  RULES_DATA.articles.forEach(art => {
    if (!art.imageGroups) return;
    art.imageGroups.forEach(g => {
      g.images.forEach(f => { if (f !== g.thumbnail) subs.add(f); });
    });
  });
  return subs;
}

// ── BILDER ─────────────────────────────────────────────────
function renderBilderGrid() {
  const container = document.getElementById('rules-bilder-list');
  if (!container || !RULES_DATA) return;

  const groupSubs = _getGroupSubImages();
  let images = RULES_DATA.images.filter(img =>
    img.width >= 200 && img.height >= 150 && img.article !== null &&
    img.caption !== null && !groupSubs.has(img.filename)
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

// ── GLOSSAR INLINE ANNOTATION ──────────────────────────────
let _activePopup = null;

function closeActivePopup() {
  if (_activePopup) { _activePopup.remove(); _activePopup = null; }
}

function buildGlossPopup(term, def, artNums, anchorEl) {
  closeActivePopup();

  const popup = document.createElement('div');
  popup.className = 'gloss-popup';
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-modal', 'true');
  popup.setAttribute('aria-label', term);

  const termEl = document.createElement('div');
  termEl.className = 'gloss-popup-term';
  termEl.textContent = term;
  popup.appendChild(termEl);

  const defEl = document.createElement('div');
  defEl.className = 'gloss-popup-def';
  defEl.textContent = def;
  popup.appendChild(defEl);

  if (artNums && artNums.length) {
    const linksRow = document.createElement('div');
    linksRow.className = 'gloss-popup-links';
    artNums.forEach(num => {
      const btn = document.createElement('button');
      btn.className = 'gloss-popup-link';
      btn.textContent = `Art. ${num}`;
      btn.addEventListener('click', e => { e.stopPropagation(); closeActivePopup(); rulesOpenDetail(num); });
      linksRow.appendChild(btn);
    });
    popup.appendChild(linksRow);
  }

  const closeBtn = document.createElement('button');
  closeBtn.className = 'gloss-popup-close';
  closeBtn.setAttribute('aria-label', 'Schließen');
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', e => {
    e.stopPropagation();
    closeActivePopup();
    if (anchorEl && anchorEl.focus) anchorEl.focus();
  });
  popup.appendChild(closeBtn);

  // Escape schließt Popup, Focus-Trap innerhalb
  popup.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeActivePopup();
      if (anchorEl && anchorEl.focus) anchorEl.focus();
      return;
    }
    if (e.key === 'Tab') {
      const focusable = Array.from(popup.querySelectorAll('button')).filter(b => !b.disabled);
      if (!focusable.length) { e.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  });

  document.body.appendChild(popup);
  _activePopup = popup;

  // Position below anchor (fixed coords, no scroll offset needed)
  const rect = anchorEl.getBoundingClientRect();
  const popW = popup.offsetWidth || 300;
  let left = rect.left;
  let top = rect.bottom + 6;
  if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
  if (left < 8) left = 8;
  // If popup would go below viewport, show above anchor instead
  const popH = popup.offsetHeight || 150;
  if (top + popH > window.innerHeight - 8) top = rect.top - popH - 6;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  closeBtn.focus();
}

// Append text with glossary annotations into a DOM element
function appendAnnotatedText(rawText, container, terms, pattern) {
  const parts = rawText.split(pattern);
  parts.forEach(part => {
    if (!part) return;
    const entry = terms.find(t => t.term.toLowerCase() === part.toLowerCase());
    if (entry) {
      const btn = document.createElement('button');
      btn.className = 'gloss-term';
      btn.textContent = part;
      btn.setAttribute('aria-label', `Glossar: ${entry.term}`);
      btn.addEventListener('click', e => {
        e.stopPropagation();
        buildGlossPopup(entry.term, entry.definition, entry.articles, btn);
      });
      container.appendChild(btn);
    } else {
      container.appendChild(document.createTextNode(part));
    }
  });
}

function annotateTextWithGlossary(text, container, artImages, imageGroups) {
  // Glossary setup
  const terms = (RULES_DATA && RULES_DATA.glossary && RULES_DATA.glossary.length)
    ? [...RULES_DATA.glossary].sort((a, b) => b.term.length - a.term.length)
    : [];
  const escaped = terms.map(t => t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = terms.length ? new RegExp('(' + escaped.join('|') + ')', 'gi') : null;

  // Build global bild map: Bild N -> image data (GLOBAL numbering, not per-article)
  const globalBildMap = {};
  if (RULES_DATA && RULES_DATA.images) {
    RULES_DATA.images.forEach(function(img) {
      if (img.caption) {
        const m = img.caption.match(/^Bild\s+(\d+)\s*[:\-]/);
        if (m) globalBildMap[parseInt(m[1])] = img;
      }
    });
  }

  // Build map of Bild number → imageGroup for inline rendering at the right position
  const groupedBildNums = new Set();
  const bildNumToGroup = {};
  if (imageGroups && imageGroups.length) {
    imageGroups.forEach(function(g) {
      g.images.forEach(function(filename) {
        const imgMeta = RULES_DATA && RULES_DATA.images && RULES_DATA.images.find(i => i.filename === filename);
        if (imgMeta && imgMeta.caption) {
          const m = imgMeta.caption.match(/^Bild\s+(\d+)\s*[:\-]/);
          if (m) {
            const n = parseInt(m[1]);
            groupedBildNums.add(n);
            bildNumToGroup[n] = g;
          }
        }
      });
    });
  }

  // Render text with inline glossary annotations and (Bild N) inline refs
  function renderText(str, parentEl) {
    const bildInlineRe = /\(Bild\s+(\d+)\)/g;
    let lastIdx = 0;
    let mInline;
    while ((mInline = bildInlineRe.exec(str)) !== null) {
      const before = str.slice(lastIdx, mInline.index);
      if (before) {
        if (pattern) appendAnnotatedText(before, parentEl, terms, pattern);
        else parentEl.appendChild(document.createTextNode(before));
      }
      const bildNum = parseInt(mInline[1]);
      const imgData = globalBildMap[bildNum];
      const refBtn = document.createElement('button');
      refBtn.className = 'rules-inline-bild-btn';
      refBtn.textContent = mInline[0];
      refBtn.setAttribute('aria-label', 'Bild ' + bildNum + ' anzeigen');
      if (imgData) {
        (function(d, caption) {
          refBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            rulesOpenLightbox(d, caption);
          });
        }(imgData.filename, imgData.caption || 'Bild ' + bildNum));
      } else {
        refBtn.disabled = true;
      }
      parentEl.appendChild(refBtn);
      lastIdx = mInline.index + mInline[0].length;
    }
    const rest = str.slice(lastIdx);
    if (rest) {
      if (pattern) appendAnnotatedText(rest, parentEl, terms, pattern);
      else parentEl.appendChild(document.createTextNode(rest));
    }
  }

  // Make an image figure and append to container
  function makeImageFigure(bildNum, captionFallback) {
    // Render imageGroup inline at the position where the Bild reference appears in text
    const group = bildNumToGroup[bildNum];
    if (group) {
      const section = el('div', 'rules-img-group');
      section.appendChild(el('div', 'rules-img-group-label', group.label));
      const row = el('div', 'rules-img-group-row');
      group.images.forEach(function(filename) {
        const imgMeta = RULES_DATA.images.find(i => i.filename === filename);
        const caption = imgMeta && imgMeta.caption ? imgMeta.caption : filename;
        const figure = document.createElement('figure');
        figure.className = 'rules-img-group-figure';
        const imgEl = document.createElement('img');
        imgEl.className = 'rules-img-group-img';
        imgEl.src = 'data/images/' + filename;
        imgEl.alt = caption;
        imgEl.loading = 'lazy';
        imgEl.addEventListener('click', function() { rulesOpenLightbox(filename, caption); });
        const cap = document.createElement('figcaption');
        cap.className = 'rules-img-group-caption';
        cap.textContent = caption;
        figure.appendChild(imgEl);
        figure.appendChild(cap);
        row.appendChild(figure);
      });
      section.appendChild(row);
      container.appendChild(section);
      return;
    }
    const imgData = globalBildMap[bildNum];
    if (!imgData) return;
    const figure = document.createElement('figure');
    figure.className = 'rules-inline-figure';
    const img = document.createElement('img');
    img.className = 'rules-inline-img';
    img.src = 'data/images/' + imgData.filename;
    img.alt = imgData.caption || captionFallback || 'Bild ' + bildNum;
    img.loading = 'lazy';
    (function(d, cap) {
      img.addEventListener('click', function() { rulesOpenLightbox(d, cap); });
    }(imgData.filename, imgData.caption || captionFallback || 'Bild ' + bildNum));
    const cap = document.createElement('figcaption');
    cap.className = 'rules-inline-caption';
    cap.textContent = imgData.caption || captionFallback || 'Bild ' + bildNum;
    figure.appendChild(img);
    figure.appendChild(cap);
    container.appendChild(figure);
  }

  // Build nested list from bullet lines starting at startIdx with startIndent
  function buildList(linesArr, startIdx, startIndent) {
    const ul = document.createElement('ul');
    ul.className = 'rules-list';
    let k = startIdx;
    while (k < linesArr.length) {
      const rawLine = linesArr[k];
      const trimLine = rawLine.trim();
      if (trimLine === '') { k++; continue; }
      const lineIndent = rawLine.match(/^(\s*)/)[1].length;
      const isBulletLine = /^[\*\-\t]\s*/.test(trimLine) && /^[\*\-]/.test(trimLine);
      if (!isBulletLine) break;
      if (lineIndent < startIndent) break;
      if (lineIndent > startIndent) {
        // Sub-list belongs to last li
        const lastLi = ul.lastElementChild;
        if (lastLi) {
          const res = buildList(linesArr, k, lineIndent);
          lastLi.appendChild(res.ul);
          k = res.end;
        } else { k++; }
        continue;
      }
      const bulletContent = trimLine.replace(/^[\*\-]\s*/, '');
      const li = document.createElement('li');
      renderText(bulletContent, li);
      ul.appendChild(li);
      k++;
      // Consume continuation lines (deeper indent, not bullets)
      while (k < linesArr.length) {
        const nextRaw = linesArr[k];
        const nextTrimmed = nextRaw.trim();
        if (nextTrimmed === '') break;
        const nextIndent = nextRaw.match(/^(\s*)/)[1].length;
        const nextIsBullet = /^[\*\-]/.test(nextTrimmed);
        if (nextIsBullet && nextIndent > lineIndent) {
          const res = buildList(linesArr, k, nextIndent);
          li.appendChild(res.ul);
          k = res.end;
        } else if (!nextIsBullet && nextIndent > lineIndent) {
          li.appendChild(document.createTextNode(' '));
          renderText(nextTrimmed, li);
          k++;
        } else {
          break;
        }
      }
    }
    return { ul: ul, end: k };
  }

  const lines = text.split('\n');
  let paraAccum = [];

  function flushPara() {
    if (!paraAccum.length) return;
    const str = paraAccum.join(' ').trim();
    paraAccum = [];
    if (!str) return;
    const p = document.createElement('p');
    p.className = 'rules-para';
    renderText(str, p);
    container.appendChild(p);
  }

  let idx = 0;
  while (idx < lines.length) {
    const raw = lines[idx];
    const trimmed = raw.trim();

    // Skip REGEL chapter separators
    if (/^#{1,3}\s+REGEL\s+/.test(trimmed)) { idx++; continue; }
    if (/^REGEL\s+[IVX]+\s+[-\u2013]/.test(trimmed)) { idx++; continue; }

    // Empty line flushes paragraph
    if (trimmed === '') {
      flushPara();
      idx++;
      continue;
    }

    // Bold heading: **text** as the entire line
    const boldM = trimmed.match(/^\*\*(.+)\*\*$/);
    if (boldM) {
      flushPara();
      const headText = boldM[1].trim();

      // Check for standalone image caption: **Bild N [title]**
      const bildHeadM = headText.match(/^Bild\s+(\d+)(?:\s+(.*))?$/);
      if (bildHeadM) {
        makeImageFigure(parseInt(bildHeadM[1]), headText);
        idx++;
        continue;
      }

      // Section number heading: **4.1 Title** or **4.1.1 Title**
      const secM = headText.match(/^(\d+\.\d+(?:\.\d+)*)\s+(.*)/);
      if (secM) {
        const secNum = secM[1];
        const secTitle = secM[2];
        const depth = (secNum.match(/\./g) || []).length;
        const tagName = depth === 1 ? 'h3' : 'h4';
        const hEl = document.createElement(tagName);
        hEl.className = depth === 1 ? 'rules-h3' : 'rules-h4';
        const numSpan = document.createElement('span');
        numSpan.className = 'rules-sec-num';
        numSpan.textContent = secNum + ' ';
        hEl.appendChild(numSpan);
        renderText(secTitle, hEl);
        container.appendChild(hEl);
        idx++;
        continue;
      }

      // Bold text without section number — render as strong paragraph
      const p = document.createElement('p');
      p.className = 'rules-para';
      const strong = document.createElement('strong');
      renderText(headText, strong);
      p.appendChild(strong);
      container.appendChild(p);
      idx++;
      continue;
    }

    // Standalone image line (no ** wrapper): "Bild N text."
    const standBildM = trimmed.match(/^Bild\s+(\d+)(?:\s+(.*))?[.]*$/);
    if (standBildM && paraAccum.length === 0) {
      makeImageFigure(parseInt(standBildM[1]), trimmed.replace(/\.$/, ''));
      idx++;
      continue;
    }

    // Bullet list
    if (/^[\*\-]/.test(trimmed)) {
      flushPara();
      const indent = raw.match(/^(\s*)/)[1].length;
      const res = buildList(lines, idx, indent);
      if (res.ul.children.length) container.appendChild(res.ul);
      idx = res.end;
      continue;
    }

    // Inline bold within paragraph (not full-line heading) — collect into para
    paraAccum.push(trimmed);
    idx++;
  }

  flushPara();
}

// ── HANDZEICHEN ────────────────────────────────────────────

function getHandzeichen() {
  return (RULES_DATA && RULES_DATA.handzeichen) ? RULES_DATA.handzeichen : [];
}

function getHzCategories() {
  const cats = new Set();
  getHandzeichen().forEach(function(hz) { if (hz.category) cats.add(hz.category); });
  return Array.from(cats);
}

function renderHandzeichenTab() {
  const container = document.getElementById('rules-handzeichen-container');
  if (!container) return;
  container.textContent = '';

  const all = getHandzeichen();
  if (!all.length) {
    setEmpty(container, '👐', 'Keine Handzeichen gefunden');
    return;
  }

  // Mode selector bar
  const modeBar = el('div', 'hz-mode-bar');
  const modes = [
    { key: 'galerie', label: 'Galerie' },
    { key: 'quiz-name', label: 'Quiz: Name' },
    { key: 'quiz-bild', label: 'Quiz: Bild' },
  ];
  modes.forEach(function(m) {
    const btn = el('button', 'chip' + (hzMode === m.key ? ' active' : ''), m.label);
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(hzMode === m.key));
    btn.addEventListener('click', function() {
      hzMode = m.key;
      hzQuizState = null;
      renderHandzeichenTab();
    });
    modeBar.appendChild(btn);
  });
  container.appendChild(modeBar);

  if (hzMode === 'galerie') {
    renderHzGalerie(container, all);
  } else if (hzMode === 'quiz-name') {
    renderHzQuiz(container, all, 'name');
  } else if (hzMode === 'quiz-bild') {
    renderHzQuiz(container, all, 'bild');
  }
}

function renderHzGalerie(container, all) {
  const cats = getHzCategories();

  // Category filter
  const filterRow = el('div', 'hz-filter-row');
  const allBtn = el('button', 'chip' + (hzCategoryFilter === 'all' ? ' active' : ''), 'Alle');
  allBtn.addEventListener('click', function() {
    hzCategoryFilter = 'all';
    renderHandzeichenTab();
  });
  filterRow.appendChild(allBtn);
  cats.forEach(function(cat) {
    const catBtn = el('button', 'chip' + (hzCategoryFilter === cat ? ' active' : ''), cat);
    catBtn.addEventListener('click', function() {
      hzCategoryFilter = cat;
      renderHandzeichenTab();
    });
    filterRow.appendChild(catBtn);
  });
  container.appendChild(filterRow);

  const filtered = hzCategoryFilter === 'all'
    ? all
    : all.filter(function(hz) { return hz.category === hzCategoryFilter; });

  if (!filtered.length) {
    setEmpty(container, '🔍', 'Keine Handzeichen gefunden');
    return;
  }

  const grid = el('div', 'hz-grid');
  filtered.forEach(function(hz) {
    const card = el('div', 'hz-card');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', hz.name);

    if (hz.image) {
      const img = document.createElement('img');
      img.className = 'hz-card-img';
      img.src = 'data/images/' + hz.image;
      img.alt = hz.name;
      img.loading = 'lazy';
      img.addEventListener('click', function(e) {
        e.stopPropagation();
        rulesOpenLightbox(hz.image, hz.name);
      });
      card.appendChild(img);
    } else {
      const placeholder = el('div', 'hz-card-no-img', '?');
      card.appendChild(placeholder);
    }

    const body = el('div', 'hz-card-body');
    const nameEl = el('div', 'hz-card-name', hz.name);
    const descEl = el('div', 'hz-card-desc', hz.description || '');
    const badge = el('span', 'hz-category-badge', hz.category || '');
    body.appendChild(nameEl);
    body.appendChild(descEl);
    body.appendChild(badge);
    card.appendChild(body);

    card.addEventListener('click', function() {
      if (hz.image) rulesOpenLightbox(hz.image, hz.name + ': ' + (hz.description || ''));
    });
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
    });

    grid.appendChild(card);
  });
  container.appendChild(grid);
}

function initHzQuiz(all, quizType) {
  const shuffled = all.slice().sort(function() { return Math.random() - 0.5; });
  hzQuizState = {
    type: quizType,
    items: shuffled,
    currentIdx: 0,
    score: 0,
    answered: false,
  };
}

function renderHzQuiz(container, all, quizType) {
  if (!hzQuizState || hzQuizState.type !== quizType) {
    initHzQuiz(all, quizType);
  }
  const state = hzQuizState;

  if (state.currentIdx >= state.items.length) {
    // Summary screen
    const summary = el('div', 'hz-quiz-summary');
    summary.appendChild(el('div', 'hz-quiz-score-big', state.score + '/' + state.items.length));
    const pct = Math.round((state.score / state.items.length) * 100);
    summary.appendChild(el('div', 'hz-quiz-score-pct', pct + '% richtig'));
    let msg = pct >= 80 ? 'Ausgezeichnet!' : pct >= 50 ? 'Gut gemacht!' : 'Weiter üben!';
    summary.appendChild(el('div', 'hz-quiz-msg', msg));
    const restartBtn = el('button', 'btn btn-primary btn-full', 'Nochmal');
    restartBtn.addEventListener('click', function() {
      hzQuizState = null;
      renderHandzeichenTab();
    });
    summary.appendChild(restartBtn);
    container.appendChild(summary);
    return;
  }

  const current = state.items[state.currentIdx];

  // Build 4 options (1 correct + 3 random distractors)
  function buildOptions(correctItem, allItems) {
    const others = allItems.filter(function(hz) { return hz.id !== correctItem.id; });
    const shuffledOthers = others.sort(function() { return Math.random() - 0.5; }).slice(0, 3);
    const options = [correctItem].concat(shuffledOthers).sort(function() { return Math.random() - 0.5; });
    return options;
  }
  const options = buildOptions(current, all);

  const quizWrap = el('div', 'hz-quiz-container');

  // Progress bar
  const progressWrap = el('div', 'hz-quiz-progress');
  const progressFill = el('div', 'hz-quiz-progress-fill');
  const pctDone = Math.round((state.currentIdx / state.items.length) * 100);
  progressFill.style.width = pctDone + '%';
  progressWrap.appendChild(progressFill);
  const progressLabel = el('span', 'hz-quiz-progress-label', (state.currentIdx + 1) + '/' + state.items.length + '  Punkte: ' + state.score);
  quizWrap.appendChild(progressLabel);
  quizWrap.appendChild(progressWrap);

  // Question area
  const questionEl = el('div', 'hz-quiz-question');
  if (quizType === 'name') {
    // Show image, guess name
    if (current.image) {
      const img = document.createElement('img');
      img.className = 'hz-quiz-img';
      img.src = 'data/images/' + current.image;
      img.alt = 'Handzeichen';
      img.loading = 'lazy';
      questionEl.appendChild(img);
    }
    questionEl.appendChild(el('p', 'hz-quiz-instruction', 'Wie heißt dieses Handzeichen?'));
  } else {
    // Show name, guess image
    questionEl.appendChild(el('div', 'hz-quiz-name-display', current.name));
    questionEl.appendChild(el('p', 'hz-quiz-instruction', 'Welches Bild zeigt dieses Handzeichen?'));
  }
  quizWrap.appendChild(questionEl);

  const feedbackEl = el('div', 'hz-quiz-feedback');
  feedbackEl.style.display = 'none';
  quizWrap.appendChild(feedbackEl);

  // Options grid
  const optGrid = el('div', 'hz-quiz-options');
  options.forEach(function(opt) {
    const optBtn = document.createElement('button');
    optBtn.className = 'hz-quiz-option';

    if (quizType === 'name') {
      optBtn.textContent = opt.name;
    } else {
      if (opt.image) {
        const img = document.createElement('img');
        img.src = 'data/images/' + opt.image;
        img.alt = opt.name;
        img.loading = 'lazy';
        img.className = 'hz-quiz-option-img';
        optBtn.appendChild(img);
        const nameLabel = el('span', 'hz-quiz-option-img-label', opt.name);
        optBtn.appendChild(nameLabel);
      } else {
        optBtn.textContent = opt.name;
      }
    }

    optBtn.addEventListener('click', function() {
      if (state.answered) return;
      state.answered = true;
      const isCorrect = opt.id === current.id;
      if (isCorrect) {
        state.score++;
        optBtn.classList.add('correct');
        feedbackEl.className = 'hz-quiz-feedback hz-quiz-feedback-correct';
        feedbackEl.textContent = 'Richtig! ' + current.name;
      } else {
        optBtn.classList.add('wrong');
        feedbackEl.className = 'hz-quiz-feedback hz-quiz-feedback-wrong';
        feedbackEl.textContent = 'Falsch! Die Antwort ist: ' + current.name;
        // Mark correct option
        optGrid.querySelectorAll('.hz-quiz-option').forEach(function(b) {
          if (b !== optBtn) {
            const isThisCorrect = quizType === 'name'
              ? b.textContent === current.name
              : b.querySelector('img') && b.querySelector('img').src.includes(current.image);
            if (isThisCorrect) b.classList.add('correct');
          }
        });
      }
      feedbackEl.style.display = '';

      // Disable all options
      optGrid.querySelectorAll('.hz-quiz-option').forEach(function(b) { b.disabled = true; });

      // Show next button
      nextBtn.style.display = '';
    });

    optGrid.appendChild(optBtn);
  });
  quizWrap.appendChild(optGrid);

  // Next button
  const nextBtn = el('button', 'btn btn-primary btn-full', state.currentIdx + 1 < state.items.length ? 'Weiter \u2192' : 'Ergebnis anzeigen');
  nextBtn.style.display = 'none';
  nextBtn.addEventListener('click', function() {
    state.currentIdx++;
    state.answered = false;
    renderHandzeichenTab();
  });
  quizWrap.appendChild(nextBtn);

  container.appendChild(quizWrap);
}

// Close popup when clicking outside
document.addEventListener('click', e => {
  if (_activePopup && !_activePopup.contains(e.target)) closeActivePopup();
});

// ── ARTIKEL DETAIL ─────────────────────────────────────────
let _detailTriggerEl = null;

export function rulesOpenDetail(artNum) {
  if (!RULES_DATA) return;
  const art = RULES_DATA.articles.find(a => a.number === artNum);
  if (!art) return;

  _detailTriggerEl = document.activeElement;

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

  // Article text with glossary term highlights and inline images
  const textEl = el('div', 'rules-detail-text');
  annotateTextWithGlossary(art.text, textEl, art.images, art.imageGroups);
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

  // Focus-Trap: Tab bleibt innerhalb des Overlays
  overlay.onkeydown = function(e) {
    if (e.key === 'Escape') { e.preventDefault(); rulesCloseDetail(); return; }
    if (e.key !== 'Tab') return;
    const focusable = Array.from(overlay.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.disabled);
    if (!focusable.length) { e.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  // Fokus auf Zurück-Button setzen
  const backBtn = overlay.querySelector('.rules-back-btn');
  if (backBtn) backBtn.focus();
}

export function rulesCloseDetail() {
  const overlay = document.getElementById('rules-detail');
  if (overlay) overlay.style.display = 'none';
  if (_detailTriggerEl && _detailTriggerEl.focus) {
    _detailTriggerEl.focus();
    _detailTriggerEl = null;
  }
}

// ── LIGHTBOX ───────────────────────────────────────────────
export function rulesOpenLightbox(filename, caption) {
  const existing = document.getElementById('rules-lightbox');
  if (existing) existing.remove();

  const triggerEl = document.activeElement;

  const lb = el('div', 'rules-lightbox');
  lb.id = 'rules-lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', caption || 'Bildvorschau');

  function closeLightbox() {
    lb.remove();
    if (triggerEl && triggerEl.focus) triggerEl.focus();
  }

  const closeBtn = el('button', 'rules-lightbox-close', '✕');
  closeBtn.setAttribute('aria-label', 'Schließen');
  closeBtn.addEventListener('click', closeLightbox);

  const img = document.createElement('img');
  img.className = 'rules-lightbox-img';
  img.src = `data/images/${filename}`;
  img.alt = caption || '';

  lb.appendChild(closeBtn);
  lb.appendChild(img);

  if (caption) {
    lb.appendChild(el('div', 'rules-lightbox-caption', caption));
  }

  lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });

  // Escape-Key und Focus-Trap
  lb.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); return; }
    if (e.key === 'Tab') {
      // Nur der Close-Button ist fokussierbar — Trap verhindern
      e.preventDefault();
      closeBtn.focus();
    }
  });

  document.body.appendChild(lb);
  closeBtn.focus();
}

// ── ARTIKEL-SECTION-OVERLAY ────────────────────────────────
// Öffnet einen Artikel mit Section-Navigation direkt im aktuellen View,
// ohne zu Regelwerk zu navigieren.

let _secOverlayTrigger = null;
let _secOverlayArtNum  = null;
let _secFocusedSecId   = null;

function _srAnnounce(msg) {
  const el = document.getElementById('sr-announce');
  if (!el) return;
  el.textContent = '';
  setTimeout(() => { el.textContent = msg; }, 50);
}

// Parst den Artikel-Text in Abschnitte: [{id, title, lines[]}]
function _parseSections(art) {
  const lines = art.text.split('\n');
  const sections = [];
  let current = null;

  lines.forEach(raw => {
    const trimmed = raw.trim();
    const m = trimmed.match(/^\*\*(\d+\.\d+(?:\.\d+)*)\s+(.*)\*\*$/);
    if (m) {
      if (current) sections.push(current);
      current = { id: m[1], title: m[2], lines: [] };
    } else if (current) {
      current.lines.push(raw);
    }
  });
  if (current) sections.push(current);

  if (!sections.length) {
    sections.push({ id: String(art.number), title: art.title, lines: lines });
  }
  return sections;
}

function _renderSecOverlay() {
  const art = RULES_DATA && RULES_DATA.articles.find(a => a.number === _secOverlayArtNum);
  if (!art) return;

  const sections = _parseSections(art);
  const focusIdx = sections.findIndex(s => s.id === _secFocusedSecId);
  const efi = focusIdx === -1 ? 0 : focusIdx;

  document.getElementById('art-sec-dialog-title').textContent = `Artikel ${art.number}`;
  document.getElementById('art-sec-art-title').textContent = art.title;
  document.getElementById('art-sec-meta').textContent = `${sections[efi].id} · ${efi + 1}/${sections.length}`;

  const body = document.getElementById('art-sec-body');
  body.textContent = '';

  sections.forEach((sec, idx) => {
    const distance  = Math.abs(idx - efi);
    const isFocused = idx === efi;

    const item = document.createElement('div');
    item.className = 'art-sec-item' + (isFocused ? ' is-focused' : ' is-nav');
    item.id = 'art-sec-' + sec.id.replace(/\./g, '-');
    item.setAttribute('data-dist', String(Math.min(distance, 3)));

    if (!isFocused) {
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      const dir = idx < efi ? 'Vorheriger Abschnitt' : 'Nächster Abschnitt';
      item.setAttribute('aria-label', `${dir}: ${sec.id} ${sec.title}. Enter zum Fokussieren.`);
      item.addEventListener('click', () => _focusSecOverlaySection(sec.id));
      item.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _focusSecOverlaySection(sec.id); }
      });
    }

    const inner = document.createElement('div');
    inner.className = 'art-sec-inner';

    const numEl = document.createElement('div');
    numEl.className = 'art-sec-num';
    numEl.setAttribute('aria-hidden', 'true');
    numEl.textContent = sec.id;

    const titleEl = document.createElement(isFocused ? 'h2' : 'div');
    titleEl.className = 'art-sec-title';
    titleEl.textContent = sec.title;
    if (isFocused) {
      titleEl.setAttribute('tabindex', '-1');
      titleEl.id = 'art-sec-heading-' + sec.id.replace(/\./g, '-');
    }

    inner.appendChild(numEl);
    inner.appendChild(titleEl);

    if (isFocused) {
      const textEl = document.createElement('div');
      textEl.className = 'art-sec-text';
      let paraLines = [];
      const flushPara = () => {
        const str = paraLines.join(' ').trim();
        paraLines = [];
        if (!str) return;
        const p = document.createElement('p');
        p.textContent = str;
        textEl.appendChild(p);
      };
      sec.lines.forEach(raw => {
        const t = raw.trim();
        if (!t) { flushPara(); return; }
        if (/^\*\*Bild\s+\d+/.test(t) || /^Bild\s+\d+/.test(t)) return;
        const boldM = t.match(/^\*\*(.+)\*\*$/);
        if (boldM) {
          flushPara();
          const p = document.createElement('p');
          const s = document.createElement('strong');
          s.textContent = boldM[1];
          p.appendChild(s);
          textEl.appendChild(p);
          return;
        }
        const bullet = t.match(/^[-*]\s+(.*)/);
        if (bullet) {
          flushPara();
          const p = document.createElement('p');
          p.textContent = '• ' + bullet[1];
          textEl.appendChild(p);
          return;
        }
        paraLines.push(t);
      });
      flushPara();
      inner.appendChild(textEl);

      // Bildgruppen: zeige Gruppen die im Text dieses Abschnitts referenziert werden
      if (art.imageGroups) {
        const allLines = art.text.split('\n');
        const secHeadIdx = allLines.findIndex(l => l.includes(`**${sec.id} `));
        const nextSec = sections[idx + 1];
        const nextHeadIdx = nextSec
          ? allLines.findIndex(l => l.includes(`**${nextSec.id} `))
          : allLines.length;
        const secSlice = allLines.slice(secHeadIdx, nextHeadIdx).join('\n');

        art.imageGroups.forEach(g => {
          const m = g.label.match(/Bild\s+(\d+)/);
          if (!m) return;
          if (secSlice.includes('Bild ' + m[1])) {
            inner.appendChild(_makeSecImgGroup(g));
          }
        });
      }
    } else {
      const hint = document.createElement('div');
      hint.className = 'art-sec-hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.textContent = (idx < efi ? '↑ ' : '↓ ') + 'Tippen zum Fokussieren';
      inner.appendChild(hint);
    }

    item.appendChild(inner);
    body.appendChild(item);
  });
}

function _makeSecImgGroup(group) {
  const wrap = document.createElement('div');
  wrap.className = 'art-sec-img-group';
  const labelEl = document.createElement('div');
  labelEl.className = 'art-sec-img-label';
  labelEl.id = 'art-sec-imglbl-' + group.label.replace(/\s+/g, '-');
  labelEl.textContent = group.label;
  wrap.appendChild(labelEl);
  const row = document.createElement('div');
  row.className = 'art-sec-img-row';
  row.setAttribute('role', 'list');
  row.setAttribute('aria-labelledby', labelEl.id);
  group.images.forEach(filename => {
    const imgMeta = RULES_DATA.images.find(i => i.filename === filename);
    const caption = imgMeta && imgMeta.caption ? imgMeta.caption : filename;
    const li = document.createElement('div');
    li.setAttribute('role', 'listitem');
    const fig = document.createElement('figure');
    const img = document.createElement('img');
    img.src = 'data/images/' + filename;
    img.alt = caption;
    img.loading = 'lazy';
    img.addEventListener('click', () => rulesOpenLightbox(filename, caption));
    const cap = document.createElement('figcaption');
    cap.textContent = caption;
    fig.appendChild(img);
    fig.appendChild(cap);
    li.appendChild(fig);
    row.appendChild(li);
  });
  wrap.appendChild(row);
  return wrap;
}

function _focusSecOverlaySection(sectionId) {
  _secFocusedSecId = sectionId;
  _renderSecOverlay();
  const art = RULES_DATA && RULES_DATA.articles.find(a => a.number === _secOverlayArtNum);
  const sec = art ? _parseSections(art).find(s => s.id === sectionId) : null;
  _srAnnounce(`Abschnitt ${sectionId}: ${sec ? sec.title : ''}`);
  setTimeout(() => {
    const el = document.getElementById('art-sec-' + sectionId.replace(/\./g, '-'));
    if (!el) return;
    const heading = el.querySelector('.art-sec-title');
    if (heading) heading.focus();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 30);
}

function _handleSecOverlayKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); rulesCloseSecOverlay(); return; }

  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const art = RULES_DATA && RULES_DATA.articles.find(a => a.number === _secOverlayArtNum);
    if (!art) return;
    const sections = _parseSections(art);
    const idx = sections.findIndex(s => s.id === _secFocusedSecId);
    if (idx === -1) return;
    const next = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
    if (next >= 0 && next < sections.length) _focusSecOverlaySection(sections[next].id);
    return;
  }

  if (e.key === 'Tab') {
    const overlay = document.getElementById('art-sec-overlay');
    const tabStops = Array.from(overlay.querySelectorAll('#art-sec-back-btn, .art-sec-item.is-nav'));
    if (!tabStops.length) { e.preventDefault(); return; }
    const first = tabStops[0], last = tabStops[tabStops.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
}

export async function rulesOpenSecOverlay(artNum, trigger) {
  await loadRules();
  const art = RULES_DATA && RULES_DATA.articles.find(a => a.number === artNum);
  if (!art) return;

  _secOverlayTrigger = trigger || document.activeElement;
  _secOverlayArtNum  = artNum;
  const sections = _parseSections(art);
  _secFocusedSecId = sections.length ? sections[0].id : String(artNum);

  _renderSecOverlay();

  const overlay = document.getElementById('art-sec-overlay');
  overlay.style.display = '';
  overlay.classList.add('open');
  overlay.addEventListener('keydown', _handleSecOverlayKey);
  document.getElementById('art-sec-back-btn').onclick = rulesCloseSecOverlay;

  _srAnnounce(`Artikel ${artNum}: ${art.title}. Abschnitt ${_secFocusedSecId}. Pfeiltasten zum Navigieren, Escape zum Schließen.`);

  setTimeout(() => {
    const heading = document.getElementById('art-sec-heading-' + _secFocusedSecId.replace(/\./g, '-'));
    if (heading) heading.focus();
  }, 50);
}

export function rulesCloseSecOverlay() {
  const overlay = document.getElementById('art-sec-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.style.display = 'none';
  overlay.removeEventListener('keydown', _handleSecOverlayKey);
  _srAnnounce('Artikel-Overlay geschlossen.');
  if (_secOverlayTrigger && _secOverlayTrigger.focus) {
    _secOverlayTrigger.focus();
    _secOverlayTrigger = null;
  }
}
