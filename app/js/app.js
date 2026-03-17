// app.js — Hauptlogik, importiert Module
import { initState, getCard, isMastered, recordAnswer, STATE, saveState, loadDlProgress, saveDlProgress, clearDlProgress } from './state.js';
import { initTheme, toggleTheme } from './theme.js';
import { shuffle, escHtml } from './utils.js';
import {
  loadRules, initRegeln, rulesSetTab, rulesSetRegel, rulesSearch,
  rulesOpenDetail, rulesCloseDetail, rulesOpenLightbox, setQuestionsRef
} from './rules.js';

// Globale Exports für onclick-Handler im HTML
window.toggleTheme    = toggleTheme;
window.navigate       = navigate;
window.setGlobalCat   = setGlobalCat;
window.fcSetCat       = fcSetCat;
window.fcSetTopic     = fcSetTopic;
window.fcFlip         = fcFlip;
window.fcAnswer       = fcAnswer;
window.fcReset        = fcReset;
window.quizSetCat     = quizSetCat;
window.quizSetTopic   = quizSetTopic;
window.quizSetN       = quizSetN;
window.startQuiz      = startQuiz;
window.quizAnswer     = quizAnswer;
window.quizNext       = quizNext;
window.showQuizWrong  = showQuizWrong;
window.learnSetCat    = learnSetCat;
window.learnSetTopic  = learnSetTopic;
window.learnSetArt    = learnSetArt;
window.renderLearn    = renderLearn;
window.confirmReset   = confirmReset;
window.dlSetCat        = dlSetCat;
window.dlSetTopic      = dlSetTopic;
window.startDurchlauf  = startDurchlauf;
window.resumeDurchlauf = resumeDurchlauf;
window.dlNext          = dlNext;
window.rulesSetTab      = rulesSetTab;
window.rulesSetRegel    = rulesSetRegel;
window.rulesSearch      = rulesSearch;
window.rulesOpenDetail  = rulesOpenDetail;
window.rulesCloseDetail = rulesCloseDetail;
window.rulesOpenLightbox = rulesOpenLightbox;

let QUESTIONS = [];
let globalCat = 'all';
let currentView = 'home';

// ── Trainer C-Lizenz ─────────────────────────────────────
const TRAINER_TOPICS = [
  { id: 'mannschaft', label: '👥 Mannschaft & Ausrüstung', articles: ['4','5','7'] },
  { id: 'spielzeit',  label: '⏱ Spielzeit & Spielbeginn',  articles: ['8','9'] },
  { id: 'ball',       label: '🏀 Ball im/aus dem Spiel',    articles: ['10','12','13','14','15','16'] },
  { id: 'bewegung',   label: '🏃 Schrittfehler & Dribbling', articles: ['25','26','27','28'] },
  { id: 'zeitregeln', label: '⏳ Zeitregeln (24s/8s/…)',   articles: ['29','30','31','32','33','34','35'] },
  { id: 'fouls',      label: '🚨 Fouls & Freiwürfe',        articles: ['36','37','38','39','40','41','42'] },
];
const TRAINER_ARTICLES = new Set(TRAINER_TOPICS.flatMap(t => t.articles));
let trainerTopic = 'all';

function trainerQuestions(topicId) {
  const arts = topicId === 'all'
    ? TRAINER_ARTICLES
    : new Set((TRAINER_TOPICS.find(t => t.id === topicId) || { articles: [] }).articles);
  return QUESTIONS.filter(q => q.category === 'Regelfragen' && arts.has(q.article));
}
// ─────────────────────────────────────────────────────────

async function loadQuestions() {
  const res = await fetch('data/questions.json');
  QUESTIONS = await res.json();
}

function filteredQuestions(cat) {
  cat = cat || globalCat;
  if (cat === 'Trainer') return trainerQuestions(trainerTopic);
  if (cat === 'all') return QUESTIONS;
  return QUESTIONS.filter(q => q.category === cat);
}

function setGlobalCat(el, cat) {
  globalCat = cat;
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

function buildTrainerTopicChips(containerId, setFn) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.textContent = '';
  container.style.display = 'none';
  const allBtn = document.createElement('button');
  allBtn.className = 'chip active';
  allBtn.setAttribute('aria-pressed', 'true');
  allBtn.textContent = 'Alle Themen';
  allBtn.addEventListener('click', () => setFn(allBtn, 'all'));
  container.appendChild(allBtn);
  TRAINER_TOPICS.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('data-topic', t.id);
    btn.textContent = t.label;
    btn.addEventListener('click', () => setFn(btn, t.id));
    container.appendChild(btn);
  });
}

function setTrainerTopic(el, topicId, topicContainerId) {
  trainerTopic = topicId;
  document.querySelectorAll('#' + topicContainerId + ' .chip').forEach(c => {
    c.classList.remove('active'); c.setAttribute('aria-pressed', 'false');
  });
  el.classList.add('active'); el.setAttribute('aria-pressed', 'true');
}

function showTrainerTopics(containerId, show) {
  const el = document.getElementById(containerId);
  if (el) el.style.display = show ? 'flex' : 'none';
}

function navigate(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    const isActive = b.dataset.view === view;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
  currentView = view;
  document.getElementById('main-content').scrollTop = 0;
  if (view === 'home')       renderHome();
  if (view === 'flashcards') initFlashcards();
  if (view === 'quiz')       initQuiz();
  if (view === 'learn')      initLearn();
  if (view === 'stats')      renderStats();
  if (view === 'durchlauf')  initDurchlauf();
  if (view === 'regeln')     initRegeln();
}

// HOME
function renderHome() {
  let answered = 0, mastered = 0, rM = 0, kM = 0, tM = 0;
  const trainerQs = trainerQuestions('all');
  const trainerIds = new Set(trainerQs.map(q => q.id));
  const trainerTotal = trainerQs.length;
  QUESTIONS.forEach(q => {
    const c = getCard(q.id);
    if (c.correctCount > 0 || c.wrongCount > 0) answered++;
    if (isMastered(q.id)) {
      mastered++;
      if (q.category === 'Regelfragen') rM++;
      else kM++;
      if (trainerIds.has(q.id)) tM++;
    }
  });
  document.getElementById('home-total').textContent    = answered;
  document.getElementById('home-mastered').textContent = mastered;
  document.getElementById('home-streak').textContent   = STATE.totalStreak || 0;
  const rP = Math.round(rM / 175 * 100), kP = Math.round(kM / 139 * 100);
  const tP = trainerTotal > 0 ? Math.round(tM / trainerTotal * 100) : 0;
  document.getElementById('home-r-text').textContent = rM + '/175';
  document.getElementById('home-r-bar').style.width  = rP + '%';
  document.getElementById('home-r-pbar').setAttribute('aria-valuenow', rP);
  document.getElementById('home-k-text').textContent = kM + '/139';
  document.getElementById('home-k-bar').style.width  = kP + '%';
  document.getElementById('home-k-pbar').setAttribute('aria-valuenow', kP);
  document.getElementById('home-t-text').textContent = tM + '/' + trainerTotal;
  document.getElementById('home-t-bar').style.width  = tP + '%';
  document.getElementById('home-t-pbar').setAttribute('aria-valuenow', tP);
}

// FLASHCARDS
let fcState = { cat: 'all', queue: [], idx: 0, flipped: false };

function initFlashcards() {
  buildTrainerTopicChips('fc-topic-filter', (el, id) => fcSetTopic(el, id));
  fcBuildQueue(); fcRenderCurrent();
}

function fcSetCat(el, cat) {
  fcState.cat = cat;
  trainerTopic = 'all';
  document.querySelectorAll('#fc-cat-filter .chip').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
  el.classList.add('active'); el.setAttribute('aria-pressed', 'true');
  showTrainerTopics('fc-topic-filter', cat === 'Trainer');
  if (cat === 'Trainer') {
    // reset topic chips to "Alle"
    document.querySelectorAll('#fc-topic-filter .chip').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
    const allChip = document.querySelector('#fc-topic-filter .chip');
    if (allChip) { allChip.classList.add('active'); allChip.setAttribute('aria-pressed', 'true'); }
  }
  fcBuildQueue(); fcRenderCurrent();
}

function fcSetTopic(el, topicId) {
  setTrainerTopic(el, topicId, 'fc-topic-filter');
  fcBuildQueue(); fcRenderCurrent();
}

function fcBuildQueue() {
  const now = Date.now(), qs = filteredQuestions(fcState.cat);
  const due      = qs.filter(q => !isMastered(q.id) && getCard(q.id).nextReview <= now);
  const upcoming = qs.filter(q => !isMastered(q.id) && getCard(q.id).nextReview > now)
                     .sort((a, b) => getCard(a.id).nextReview - getCard(b.id).nextReview);
  fcState.queue = [...shuffle(due), ...upcoming];
  fcState.idx = 0;
}

function fcRenderCurrent() {
  const q = fcState.queue[fcState.idx];
  if (!q) {
    document.getElementById('fc-main').style.display = 'none';
    document.getElementById('fc-done').style.display = 'block';
    document.getElementById('fc-header-sub').textContent = 'Alle Karten gemeistert!';
    return;
  }
  document.getElementById('fc-main').style.display = 'block';
  document.getElementById('fc-done').style.display = 'none';
  const mastered = filteredQuestions(fcState.cat).filter(q => isMastered(q.id)).length;
  document.getElementById('fc-header-sub').textContent   = (fcState.queue.length - fcState.idx) + ' fällig · ' + mastered + ' gemeistert';
  const pct = Math.round(fcState.idx / Math.max(1, fcState.queue.length) * 100);
  document.getElementById('fc-pbar-fill').style.width    = pct + '%';
  document.getElementById('fc-pbar').setAttribute('aria-valuenow', pct);
  document.getElementById('fc-queue-info').textContent   = (fcState.idx + 1) + ' / ' + fcState.queue.length;
  document.getElementById('fc-id').textContent           = q.id;
  document.getElementById('fc-art').textContent          = q.article ? 'Art. ' + q.article : '';
  document.getElementById('fc-question').textContent     = q.question;
  const ansEl = document.getElementById('fc-answer');
  ansEl.textContent = q.answer;
  ansEl.className = 'fc-answer-word ' + (q.answer === 'Ja' ? 'ja' : 'nein');
  document.getElementById('fc-explanation').textContent  = q.explanation || '';
  fcState.flipped = false;
  document.getElementById('flashcard').classList.remove('flipped');
  document.getElementById('fc-flip-btn').setAttribute('aria-pressed', 'false');
  document.querySelector('#flashcard .fc-front').setAttribute('aria-hidden', 'false');
  document.querySelector('#flashcard .fc-back').setAttribute('aria-hidden', 'true');
}

function fcFlip() {
  fcState.flipped = !fcState.flipped;
  document.getElementById('flashcard').classList.toggle('flipped', fcState.flipped);
  document.getElementById('fc-flip-btn').setAttribute('aria-pressed', String(fcState.flipped));
  document.querySelector('#flashcard .fc-front').setAttribute('aria-hidden', String(fcState.flipped));
  document.querySelector('#flashcard .fc-back').setAttribute('aria-hidden', String(!fcState.flipped));
}

function fcAnswer(correct) {
  const q = fcState.queue[fcState.idx]; if (!q) return;
  recordAnswer(q.id, correct);
  fcState.idx++;
  if (fcState.idx >= fcState.queue.length) fcBuildQueue();
  fcRenderCurrent();
}

function fcReset() {
  fcBuildQueue();
  document.getElementById('fc-main').style.display = 'block';
  document.getElementById('fc-done').style.display = 'none';
  fcRenderCurrent();
}

// QUIZ
let quizState = { cat: 'all', n: 10, questions: [], idx: 0, correct: 0, answered: false, wrong: [] };

function initQuiz() {
  buildTrainerTopicChips('quiz-topic-filter', (el, id) => quizSetTopic(el, id));
  document.getElementById('quiz-config').style.display  = 'block';
  document.getElementById('quiz-active').style.display  = 'none';
  document.getElementById('quiz-summary').style.display = 'none';
  document.getElementById('quiz-header-sub').textContent = 'Konfigurieren';
}

function quizSetCat(el, cat) {
  quizState.cat = cat;
  trainerTopic = 'all';
  document.querySelectorAll('#quiz-cat-filter .chip').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
  el.classList.add('active'); el.setAttribute('aria-pressed', 'true');
  showTrainerTopics('quiz-topic-filter', cat === 'Trainer');
  if (cat === 'Trainer') {
    document.querySelectorAll('#quiz-topic-filter .chip').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
    const allChip = document.querySelector('#quiz-topic-filter .chip');
    if (allChip) { allChip.classList.add('active'); allChip.setAttribute('aria-pressed', 'true'); }
  }
}

function quizSetTopic(el, topicId) {
  setTrainerTopic(el, topicId, 'quiz-topic-filter');
}

function quizSetN(el, n) {
  quizState.n = n;
  document.querySelectorAll('.count-tile').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
  el.classList.add('active'); el.setAttribute('aria-pressed', 'true');
}

function startQuiz() {
  const pool = shuffle([...filteredQuestions(quizState.cat)]);
  quizState.questions = quizState.n === 0 ? pool : pool.slice(0, quizState.n);
  quizState.idx = 0; quizState.correct = 0; quizState.answered = false; quizState.wrong = [];
  document.getElementById('quiz-config').style.display  = 'none';
  document.getElementById('quiz-active').style.display  = 'block';
  document.getElementById('quiz-summary').style.display = 'none';
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const q = quizState.questions[quizState.idx], total = quizState.questions.length;
  document.getElementById('quiz-num').textContent          = 'Frage ' + (quizState.idx + 1) + '/' + total;
  document.getElementById('quiz-score-live').textContent   = '✓ ' + quizState.correct;
  const pct = Math.round(quizState.idx / total * 100);
  document.getElementById('quiz-progress-bar').style.width = pct + '%';
  document.getElementById('quiz-pbar').setAttribute('aria-valuenow', pct);
  document.getElementById('quiz-question').textContent     = q.question;
  document.getElementById('quiz-feedback').style.display   = 'none';
  document.getElementById('quiz-btns').style.display       = 'grid';
  document.getElementById('quiz-next-btn').style.display   = 'none';
  quizState.answered = false;
  document.getElementById('quiz-header-sub').textContent   = (quizState.idx + 1) + '/' + total + ' · ' + q.category;
}

function quizAnswer(userJa) {
  if (quizState.answered) return; quizState.answered = true;
  const q = quizState.questions[quizState.idx];
  const correct = (userJa && q.answer === 'Ja') || (!userJa && q.answer === 'Nein');
  recordAnswer(q.id, correct);
  if (correct) quizState.correct++; else quizState.wrong.push(q);
  const fb = document.getElementById('quiz-feedback');
  fb.style.display = 'block';
  fb.className = 'quiz-feedback ' + (correct ? 'correct' : 'wrong');
  fb.textContent = (correct ? '✓ Richtig! ' : '✗ Falsch — Richtige Antwort: ' + q.answer + '. ') + (q.explanation || '');
  document.getElementById('quiz-btns').style.display     = 'none';
  document.getElementById('quiz-next-btn').style.display = 'block';
}

function quizNext() {
  quizState.idx++;
  if (quizState.idx >= quizState.questions.length) showQuizSummary(); else renderQuizQuestion();
}

function showQuizSummary() {
  document.getElementById('quiz-active').style.display  = 'none';
  document.getElementById('quiz-summary').style.display = 'block';
  const total = quizState.questions.length, pct = Math.round(quizState.correct / total * 100);
  document.getElementById('quiz-final-score').textContent = quizState.correct + '/' + total;
  document.getElementById('quiz-final-pct').textContent   = pct + '% richtig';
  const msgs = ['Weiter üben!', 'Guter Ansatz!', 'Solide!', 'Sehr gut!', 'Perfekt! 🏆'];
  document.getElementById('quiz-summary-msg').textContent = msgs[Math.min(4, Math.floor(pct / 20))];
  document.getElementById('quiz-wrong-list').style.display = 'none';
}

function showQuizWrong() {
  const el = document.getElementById('quiz-wrong-list');
  if (el.style.display === 'block') { el.style.display = 'none'; return; }
  el.style.display = 'block';
  if (quizState.wrong.length === 0) {
    el.textContent = 'Keine Fehler!';
    el.style.color = 'var(--green)';
    return;
  }
  el.textContent = '';
  quizState.wrong.forEach(q => {
    const item = document.createElement('div');
    item.className = 'learn-item';
    const qDiv = document.createElement('div');
    qDiv.className = 'q';
    qDiv.textContent = q.question;
    const aRow = document.createElement('div');
    aRow.className = 'a-row';
    const pill = document.createElement('span');
    pill.className = 'ans-pill ' + (q.answer === 'Ja' ? 'ja' : 'nein');
    pill.textContent = q.answer;
    aRow.appendChild(pill);
    item.appendChild(qDiv);
    item.appendChild(aRow);
    if (q.explanation) {
      const expl = document.createElement('div');
      expl.className = 'expl';
      expl.textContent = q.explanation;
      item.appendChild(expl);
    }
    el.appendChild(item);
  });
}

// LEARN
let learnState = { cat: 'all', art: 'all' };

function initLearn() {
  buildTrainerTopicChips('learn-topic-filter', (el, id) => learnSetTopic(el, id));
  buildArtFilter(); renderLearn();
}

function learnSetCat(el, cat) {
  learnState.cat = cat; learnState.art = 'all';
  trainerTopic = 'all';
  document.querySelectorAll('#learn-cat-filter .chip').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
  el.classList.add('active'); el.setAttribute('aria-pressed', 'true');
  showTrainerTopics('learn-topic-filter', cat === 'Trainer');
  if (cat === 'Trainer') {
    document.querySelectorAll('#learn-topic-filter .chip').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
    const allChip = document.querySelector('#learn-topic-filter .chip');
    if (allChip) { allChip.classList.add('active'); allChip.setAttribute('aria-pressed', 'true'); }
  }
  buildArtFilter(); renderLearn();
}

function learnSetTopic(el, topicId) {
  learnState.art = 'all';
  setTrainerTopic(el, topicId, 'learn-topic-filter');
  buildArtFilter(); renderLearn();
}

function learnSetArt(el, art) {
  learnState.art = art;
  document.querySelectorAll('#learn-art-filter .chip').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
  el.classList.add('active'); el.setAttribute('aria-pressed', 'true');
  renderLearn();
}

function buildArtFilter() {
  const qs = filteredQuestions(learnState.cat);
  const arts = [...new Set(qs.map(q => q.article).filter(Boolean))].sort((a, b) => {
    const na = parseInt(a), nb = parseInt(b);
    return (!isNaN(na) && !isNaN(nb)) ? na - nb : a.localeCompare(b);
  });
  const container = document.getElementById('learn-art-filter');
  container.textContent = '';
  ['all', ...arts].forEach(art => {
    const btn = document.createElement('button');
    btn.className = 'chip' + (art === 'all' ? ' active' : '');
    btn.setAttribute('aria-pressed', art === 'all' ? 'true' : 'false');
    btn.textContent = art === 'all' ? 'Alle Artikel' : 'Art. ' + art;
    btn.addEventListener('click', () => learnSetArt(btn, art));
    container.appendChild(btn);
  });
}

function renderLearn() {
  const search = (document.getElementById('learn-search').value || '').toLowerCase();
  let qs = filteredQuestions(learnState.cat);
  if (learnState.art !== 'all') qs = qs.filter(q => q.article === learnState.art);
  if (search) qs = qs.filter(q => q.question.toLowerCase().includes(search) || (q.explanation || '').toLowerCase().includes(search));
  document.getElementById('learn-count').textContent      = qs.length + ' Fragen';
  document.getElementById('learn-header-sub').textContent = qs.length + ' Fragen';
  const list = document.getElementById('learn-list');
  list.textContent = '';
  if (qs.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<div class="empty-icon">🔍</div>';
    const p = document.createElement('p');
    p.textContent = 'Keine Fragen gefunden';
    empty.appendChild(p);
    list.appendChild(empty);
    return;
  }
  qs.forEach(q => {
    const c = getCard(q.id);
    const item = document.createElement('div');
    item.className = 'learn-item';
    item.setAttribute('role', 'listitem');

    const qDiv = document.createElement('div');
    qDiv.className = 'q';
    if (isMastered(q.id)) {
      const star = document.createElement('span');
      star.setAttribute('aria-label', 'Gemeistert');
      star.style.marginRight = '4px';
      star.textContent = '⭐';
      qDiv.appendChild(star);
    }
    qDiv.appendChild(document.createTextNode(q.question));

    const aRow = document.createElement('div');
    aRow.className = 'a-row';

    const pill = document.createElement('span');
    pill.className = 'ans-pill ' + (q.answer === 'Ja' ? 'ja' : 'nein');
    pill.setAttribute('aria-label', 'Antwort: ' + q.answer);
    pill.textContent = q.answer;
    aRow.appendChild(pill);

    if (q.article) {
      const badge = document.createElement('span');
      badge.className = 'badge badge-blue';
      badge.textContent = 'Art. ' + q.article;
      aRow.appendChild(badge);
    }

    const idSpan = document.createElement('span');
    idSpan.style.cssText = 'font-family:var(--font-mono);font-size:10px;color:var(--text3)';
    idSpan.textContent = q.id;
    aRow.appendChild(idSpan);

    item.appendChild(qDiv);
    item.appendChild(aRow);

    if (q.explanation) {
      const expl = document.createElement('div');
      expl.className = 'expl';
      expl.textContent = q.explanation;
      item.appendChild(expl);
    }

    const stat = document.createElement('div');
    stat.className = 'learn-stat';
    stat.setAttribute('aria-label', c.correctCount + ' richtig, ' + c.wrongCount + ' falsch');
    stat.textContent = '✓ ' + c.correctCount + ' · ✗ ' + c.wrongCount;
    item.appendChild(stat);

    list.appendChild(item);
  });
}

// STATISTIK
function renderStats() {
  let answered = 0, mastered = 0, tC = 0, tA = 0;
  QUESTIONS.forEach(q => {
    const c = getCard(q.id);
    if (c.correctCount > 0 || c.wrongCount > 0) answered++;
    if (isMastered(q.id)) mastered++;
    tC += c.correctCount; tA += c.correctCount + c.wrongCount;
  });
  const acc = tA > 0 ? Math.round(tC / tA * 100) : 0;
  document.getElementById('stats-answered').textContent = answered;
  document.getElementById('stats-mastered').textContent = mastered;
  document.getElementById('stats-accuracy').textContent = acc + '%';
  renderDonut(QUESTIONS.length - answered, answered - mastered, mastered);
  const artMap = {};
  QUESTIONS.forEach(q => {
    const art = q.article || 'Sonst.';
    if (!artMap[art]) artMap[art] = { total: 0, correct: 0 };
    artMap[art].total++;
    artMap[art].correct += getCard(q.id).correctCount;
  });
  const entries = Object.entries(artMap).sort((a, b) => {
    const na = parseInt(a[0]), nb = parseInt(b[0]);
    return (!isNaN(na) && !isNaN(nb)) ? na - nb : a[0].localeCompare(b[0]);
  });
  const tbody = document.getElementById('stats-art-table');
  tbody.textContent = '';
  entries.forEach(([art, d]) => {
    const pct = Math.min(100, d.total > 0 ? Math.round(d.correct / (d.total * 3) * 100) : 0);
    const tr = document.createElement('tr');
    tr.innerHTML = '<td>Art. ' + escHtml(art) + '</td><td>' + d.total + '</td><td>' + d.correct + '</td>';
    const tdBar = document.createElement('td');
    const bar = document.createElement('div');
    bar.className = 'pbar';
    bar.style.width = '70px';
    const fill = document.createElement('div');
    fill.className = 'pbar-fill blue';
    fill.style.width = pct + '%';
    bar.appendChild(fill);
    tdBar.appendChild(bar);
    tr.appendChild(tdBar);
    tbody.appendChild(tr);
  });
}

function renderDonut(notStarted, learning, mastered) {
  const total = notStarted + learning + mastered; if (total === 0) return;
  const r = 56, cx = 70, cy = 70, sw = 18, circ = 2 * Math.PI * r;
  const pM = mastered / total, pL = learning / total;
  const arc = (pct, off) => 'stroke-dasharray="' + (pct * circ) + ' ' + circ + '" stroke-dashoffset="' + (-off * circ) + '"';
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '140'); svg.setAttribute('height', '140');
  svg.setAttribute('viewBox', '0 0 140 140'); svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--bg3)" stroke-width="' + sw + '"/>' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--green)" stroke-width="' + sw + '" stroke-linecap="round" transform="rotate(-90 ' + cx + ' ' + cy + ')" ' + arc(pM, 0) + '/>' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--accent)" stroke-width="' + sw + '" stroke-linecap="round" transform="rotate(-90 ' + cx + ' ' + cy + ')" ' + arc(pL, pM) + '/>' +
    '<text x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle" font-size="20" font-weight="900" fill="var(--text)">' + mastered + '</text>' +
    '<text x="' + cx + '" y="' + (cy + 12) + '" text-anchor="middle" font-size="10" fill="var(--text3)">gemeistert</text>';
  const donutEl = document.getElementById('stats-donut');
  donutEl.textContent = '';
  donutEl.appendChild(svg);

  const legend = document.getElementById('stats-legend');
  legend.textContent = '';
  [
    [mastered, 'var(--green)', 'gemeistert'],
    [learning, 'var(--accent)', 'im Lernen'],
    [notStarted, 'var(--bg3)', 'unberührt'],
  ].forEach(([n, color, label]) => {
    const li = document.createElement('div');
    li.className = 'legend-item';
    const dot = document.createElement('div');
    dot.className = 'legend-dot';
    dot.style.background = color;
    li.appendChild(dot);
    li.appendChild(document.createTextNode(n + ' ' + label));
    legend.appendChild(li);
  });
}

function confirmReset() {
  if (confirm('Gesamten Fortschritt zurücksetzen?')) {
    STATE.cards = {}; STATE.totalStreak = 0; STATE.lastDate = null;
    saveState(); renderStats(); renderHome();
  }
}

// DURCHLAUF
let dlState = { cat: 'all', queue: [], streaks: {}, total: 0, answered: false, correctCount: 0, wrongCount: 0 };

function initDurchlauf() {
  buildTrainerTopicChips('dl-topic-filter', (el, id) => dlSetTopic(el, id));
  const saved = loadDlProgress();
  const resumeBtn = document.getElementById('dl-resume-btn');
  if (resumeBtn) resumeBtn.style.display = saved ? 'block' : 'none';
  document.getElementById('dl-config').style.display  = 'block';
  document.getElementById('dl-active').style.display  = 'none';
  document.getElementById('dl-summary').style.display = 'none';
}

function dlSetCat(el, cat) {
  dlState.cat = cat;
  trainerTopic = 'all';
  document.querySelectorAll('#dl-cat-filter .chip').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
  el.classList.add('active'); el.setAttribute('aria-pressed', 'true');
  showTrainerTopics('dl-topic-filter', cat === 'Trainer');
  if (cat === 'Trainer') {
    document.querySelectorAll('#dl-topic-filter .chip').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
    const allChip = document.querySelector('#dl-topic-filter .chip');
    if (allChip) { allChip.classList.add('active'); allChip.setAttribute('aria-pressed', 'true'); }
  }
}

function dlSetTopic(el, topicId) {
  setTrainerTopic(el, topicId, 'dl-topic-filter');
}

function startDurchlauf() {
  clearDlProgress();
  const qs = shuffle([...filteredQuestions(dlState.cat)]);
  dlState.queue = qs.map(q => q.id);
  dlState.streaks = {}; dlState.total = qs.length;
  dlState.answered = false; dlState.correctCount = 0; dlState.wrongCount = 0;
  const progress = { cat: dlState.cat, queue: dlState.queue, streaks: dlState.streaks, total: dlState.total, correctCount: 0, wrongCount: 0, initialized: true };
  saveDlProgress(progress);
  document.getElementById('dl-config').style.display  = 'none';
  document.getElementById('dl-active').style.display  = 'block';
  document.getElementById('dl-summary').style.display = 'none';
  dlRenderCurrent();
}

function resumeDurchlauf() {
  const saved = loadDlProgress();
  if (!saved) { startDurchlauf(); return; }
  dlState.cat = saved.cat;
  dlState.queue = saved.queue;
  dlState.streaks = saved.streaks;
  dlState.total = saved.total;
  dlState.correctCount = saved.correctCount || 0;
  dlState.wrongCount = saved.wrongCount || 0;
  dlState.answered = false;
  document.getElementById('dl-config').style.display  = 'none';
  document.getElementById('dl-active').style.display  = 'block';
  document.getElementById('dl-summary').style.display = 'none';
  dlRenderCurrent();
}

function dlRenderCurrent() {
  if (!dlState.queue.length) { showDlSummary(); return; }
  const qId = dlState.queue[0];
  const q = QUESTIONS.find(q => q.id === qId); if (!q) return;
  const doneCount = Object.values(dlState.streaks).filter(s => s >= 2).length;
  const pct = Math.round(doneCount / dlState.total * 100);
  document.getElementById('dl-num').textContent       = 'Frage ' + (doneCount + 1) + '/' + dlState.total;
  document.getElementById('dl-done-count').textContent = '✓ ' + doneCount;
  document.getElementById('dl-pbar').style.width       = pct + '%';
  document.getElementById('dl-pbar-el').setAttribute('aria-valuenow', pct);
  document.getElementById('dl-q-text').textContent    = q.question;
  document.getElementById('dl-feedback').style.display = 'none';
  document.getElementById('dl-btns').style.display    = 'grid';
  document.getElementById('dl-next-btn').style.display = 'none';
  dlState.answered = false;
}

window.dlAnswer = function(userJa) {
  if (dlState.answered || !dlState.queue.length) return;
  dlState.answered = true;
  const qId = dlState.queue[0]; dlState.queue.shift();
  const q = QUESTIONS.find(q => q.id === qId); if (!q) return;
  const correct = (userJa && q.answer === 'Ja') || (!userJa && q.answer === 'Nein');
  recordAnswer(qId, correct);
  if (correct) {
    dlState.correctCount++;
    dlState.streaks[qId] = (dlState.streaks[qId] || 0) + 1;
    if (dlState.streaks[qId] < 2) {
      const insertAt = Math.floor(Math.random() * (dlState.queue.length + 1));
      dlState.queue.splice(insertAt, 0, qId);
    }
  } else {
    dlState.wrongCount++;
    dlState.streaks[qId] = 0;
    const insertAt = dlState.queue.length > 0 ? Math.floor(Math.random() * dlState.queue.length) + 1 : 0;
    dlState.queue.splice(insertAt, 0, qId);
  }
  const fb = document.getElementById('dl-feedback');
  fb.style.display = 'block';
  fb.className = 'quiz-feedback ' + (correct ? 'correct' : 'wrong');
  fb.textContent = (correct ? '✓ Richtig! ' : '✗ Falsch — Richtige Antwort: ' + q.answer + '. ') + (q.explanation || '');
  document.getElementById('dl-btns').style.display    = 'none';
  document.getElementById('dl-next-btn').style.display = 'block';
  saveDlProgress({ cat: dlState.cat, queue: dlState.queue, streaks: dlState.streaks, total: dlState.total, correctCount: dlState.correctCount, wrongCount: dlState.wrongCount, initialized: true });
};

function dlNext() {
  const doneCount = Object.values(dlState.streaks).filter(s => s >= 2).length;
  if (doneCount >= dlState.total) { showDlSummary(); return; }
  if (!dlState.queue.length) { showDlSummary(); return; }
  dlRenderCurrent();
}

function showDlSummary() {
  clearDlProgress();
  document.getElementById('dl-active').style.display  = 'none';
  document.getElementById('dl-summary').style.display = 'block';
  document.getElementById('dl-final-rounds').textContent  = dlState.total;
  document.getElementById('dl-summary-stats').textContent = dlState.total + ' Fragen · ✓ ' + dlState.correctCount + ' richtig · ✗ ' + dlState.wrongCount + ' falsch';
}

// KEYBOARD
document.addEventListener('keydown', function(e) {
  const k = e.key.toLowerCase();
  if (currentView === 'flashcards') {
    if (k === 'j') fcAnswer(true);
    else if (k === 'n') fcAnswer(false);
    else if (k === ' ' || k === 'arrowup') { e.preventDefault(); fcFlip(); }
    else if (k === 'arrowright') fcAnswer(true);
    else if (k === 'arrowleft')  fcAnswer(false);
  } else if (currentView === 'quiz') {
    if (document.getElementById('quiz-active').style.display !== 'none' && !quizState.answered) {
      if (k === 'j') quizAnswer(true); else if (k === 'n') quizAnswer(false);
    } else if (quizState.answered && k === ' ') { e.preventDefault(); quizNext(); }
  } else if (currentView === 'durchlauf') {
    if (document.getElementById('dl-active').style.display !== 'none') {
      if (!dlState.answered) {
        if (k === 'j') window.dlAnswer(true);
        else if (k === 'n') window.dlAnswer(false);
      } else if (k === ' ') { e.preventDefault(); dlNext(); }
    }
  }
});

// SWIPE
(function() {
  let sx = 0, sy = 0;
  document.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.8) return;
    if (currentView === 'flashcards') dx > 0 ? fcAnswer(true) : fcAnswer(false);
    else if (currentView === 'durchlauf' && document.getElementById('dl-active').style.display !== 'none' && !dlState.answered)
      dx > 0 ? window.dlAnswer(true) : window.dlAnswer(false);
  }, { passive: true });
})();

// INIT
(async function init() {
  initState();
  initTheme();
  await loadQuestions();
  setQuestionsRef(QUESTIONS);
  renderHome();
  initLearn();
})();
