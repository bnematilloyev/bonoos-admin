const STORAGE_KEY = 'bonoos-ui-theme';

function readPersistedTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 'bonoos';
    const data = JSON.parse(raw);
    const t = data?.state?.theme;
    return t === 'ocean' ? 'ocean' : 'bonoos';
  } catch {
    return 'bonoos';
  }
}

/** CSS yuklanishidan oldin chaqiriladi — FOUC kamayadi */
export function applyThemeToDocument(theme) {
  const t = theme === 'ocean' ? 'ocean' : 'bonoos';
  document.documentElement.dataset.theme = t;
}

const initial = readPersistedTheme();
applyThemeToDocument(initial);

/** Mavzu bo‘yicha sidebar / login brend rasmi */
export function brandLogoSrc(theme) {
  return theme === 'ocean' ? '/Logo/Logo_bonoos_ocean.jpg' : '/Logo/Logo_bonoos.jpg';
}

export { readPersistedTheme, STORAGE_KEY };
