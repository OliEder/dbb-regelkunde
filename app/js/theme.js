// theme.js — Light/Dark Mode Toggle
const THEME_KEY = 'regelkunde_theme';

function applyTheme(light) {
  document.documentElement.classList.toggle('light', light);
  const icon = document.getElementById('theme-icon');
  const btn  = document.getElementById('theme-toggle-btn');
  if (icon) icon.textContent = light ? '🌙' : '☀️';
  if (btn)  btn.setAttribute('aria-label', light ? 'Zum Dunkel-Modus wechseln' : 'Zum Hell-Modus wechseln');
  // theme-color meta für PWA
  const meta = document.getElementById('theme-color-meta');
  if (meta) meta.setAttribute('content', light ? '#f5f4f0' : '#0d0f14');
}

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)');
  if (saved === 'light') {
    applyTheme(true);
  } else if (saved === 'dark') {
    applyTheme(false);
  } else if (mq) {
    applyTheme(mq.matches);
  }
  // Auf Systemänderungen reagieren, solange kein manuelles Override gesetzt ist
  if (mq) {
    mq.addEventListener('change', e => {
      if (!localStorage.getItem(THEME_KEY)) applyTheme(e.matches);
    });
  }
}

export function toggleTheme() {
  const isLight = document.documentElement.classList.toggle('light');
  const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)');
  // Wenn der neue Wert dem Systemwert entspricht → Override löschen, System folgt wieder
  if (mq && mq.matches === isLight) {
    localStorage.removeItem(THEME_KEY);
  } else {
    localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
  }
  applyTheme(isLight);
}
