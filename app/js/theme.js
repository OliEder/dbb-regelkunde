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
  if (saved === 'light') {
    applyTheme(true);
  } else if (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    applyTheme(true);
  }
}

export function toggleTheme() {
  const isLight = document.documentElement.classList.toggle('light');
  localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
  applyTheme(isLight);
}
