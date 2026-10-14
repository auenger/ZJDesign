const system = matchMedia('(prefers-color-scheme: dark)');
export let themePreference = 'auto';
try {
  const stored = localStorage.getItem('zhuojiang-theme');
  if (['auto', 'light', 'dark'].includes(stored)) themePreference = stored;
} catch {}

export function currentTheme() {
  return themePreference === 'auto' ? (system.matches ? 'dark' : 'light') : themePreference;
}

function updateTheme() {
  const theme = currentTheme();
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === 'light' ? '#f4f5f0' : '#181a19';
  window.dispatchEvent(new CustomEvent('zhuojiang-theme-change', { detail: theme }));
}

export function setTheme(preference) {
  if (!['auto', 'light', 'dark'].includes(preference)) return;
  themePreference = preference;
  try { localStorage.setItem('zhuojiang-theme', preference); } catch {}
  updateTheme();
}

system.addEventListener('change', () => { if (themePreference === 'auto') updateTheme(); });
updateTheme();
