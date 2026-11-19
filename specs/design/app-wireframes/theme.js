const wireframePreferences = (() => {
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  const themeKey = 'karlbruder-wireframes-theme';
  const languageKey = 'karlbruder-wireframes-language';
  const themeOptions = ['light', 'dark', 'system'];

  function read(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Keep the selection for this visit when browser storage is unavailable.
    }
  }

  const requestedTheme = params.get('theme') ?? read(themeKey);
  let theme = themeOptions.includes(requestedTheme) ? requestedTheme : 'light';
  let language = read(languageKey) === 'en' ? 'en' : 'pt-BR';

  function applyTheme() {
    root.dataset.theme = theme === 'system' ? (systemTheme.matches ? 'dark' : 'light') : theme;
  }

  applyTheme();
  systemTheme.addEventListener('change', applyTheme);

  return {
    get theme() { return theme; },
    get language() { return language; },
    setTheme(value) {
      if (!themeOptions.includes(value)) return;
      theme = value;
      applyTheme();
      save(themeKey, value);
    },
    setLanguage(value) {
      if (value !== 'pt-BR' && value !== 'en') return;
      language = value;
      save(languageKey, value);
    },
  };
})();
