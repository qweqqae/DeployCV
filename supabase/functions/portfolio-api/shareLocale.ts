export type ShareUiLocale = "en" | "ru";

export const DEFAULT_SHARE_PITCH_RU = "Моё портфолио. Открой мини-апп.";
export const DEFAULT_SHARE_PITCH_EN = "My portfolio. Open the mini-app.";

export function normalizeShareLocale(raw: unknown, theme?: Record<string, unknown> | null): ShareUiLocale {
  if (raw === "en" || raw === "ru") return raw;
  const fromTheme = theme && typeof theme.uiLocale === "string" ? theme.uiLocale : "";
  if (fromTheme === "en" || fromTheme === "ru") return fromTheme;
  return "ru";
}

export function defaultSharePitch(locale: ShareUiLocale): string {
  return locale === "en" ? DEFAULT_SHARE_PITCH_EN : DEFAULT_SHARE_PITCH_RU;
}
