// state.js — LocalStorage & Lernfortschritt
const STORAGE_KEY = 'regelkunde_v2';

export let STATE = { cards: {}, totalStreak: 0, lastDate: null };

export function initState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) Object.assign(STATE, JSON.parse(raw));
  } catch (e) {}
}

export function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE)); } catch (e) {}
}

export function getCard(id) {
  if (!STATE.cards[id]) STATE.cards[id] = { correctCount: 0, wrongCount: 0, interval: 1, nextReview: 0, streak: 0 };
  return STATE.cards[id];
}

export function isMastered(id) {
  const c = getCard(id);
  return c.correctCount >= 3 && (c.correctCount - c.wrongCount) >= 3;
}

export function recordAnswer(id, correct) {
  const c = getCard(id), now = Date.now();
  if (correct) {
    c.correctCount++;
    c.streak = (c.streak || 0) + 1;
    c.interval = Math.min(c.interval * 2, 60 * 24 * 30);
    c.nextReview = now + c.interval * 60 * 1000;
  } else {
    c.wrongCount++;
    c.streak = 0;
    c.interval = 1;
    c.nextReview = now + 5 * 60 * 1000;
  }
  const today = new Date().toDateString();
  if (STATE.lastDate !== today) {
    if (correct) STATE.totalStreak = (STATE.totalStreak || 0) + 1;
    STATE.lastDate = today;
  }
  saveState();
}
