const DEFAULT_SHARE_PITCH_RU = 'Моё портфолио. Открой мини-апп.';
const DEFAULT_SHARE_PITCH_EN = 'My portfolio. Open the mini-app.';

function normalizeShareLocale(raw, theme) {
  if (raw === 'en' || raw === 'ru') return raw;
  const fromTheme = theme && typeof theme.uiLocale === 'string' ? theme.uiLocale : '';
  if (fromTheme === 'en' || fromTheme === 'ru') return fromTheme;
  return 'ru';
}

function defaultSharePitch(locale) {
  return locale === 'en' ? DEFAULT_SHARE_PITCH_EN : DEFAULT_SHARE_PITCH_RU;
}

module.exports = {
  DEFAULT_SHARE_PITCH_RU,
  DEFAULT_SHARE_PITCH_EN,
  normalizeShareLocale,
  defaultSharePitch,
};
