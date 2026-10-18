import type { Locale } from './i18n';
import type { ProfileTheme } from '../types';
import { portfolioStartAppLink } from './miniAppLink';

export const DEFAULT_SHARE_PITCH_RU = 'Моё портфолио. Открой мини-апп.';
export const DEFAULT_SHARE_PITCH_EN = 'My portfolio. Open the mini-app.';

const MAX_SHARE_BODY_LEN = 900;

export function defaultSharePitch(locale: Locale = 'ru'): string {
  return locale === 'en' ? DEFAULT_SHARE_PITCH_EN : DEFAULT_SHARE_PITCH_RU;
}

export function sanitizeShareBody(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.replace(/\r\n/g, '\n').trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_SHARE_BODY_LEN);
}

export function buildDefaultShareBody(
  displayName: string,
  username: string,
  locale: Locale = 'ru',
): string {
  const name = displayName || username;
  return `${name}\n\n${defaultSharePitch(locale)}`;
}

export function resolveShareBody(
  _displayName: string,
  _username: string,
  theme?: ProfileTheme | Record<string, unknown> | null,
  override?: unknown,
  overrideProvided?: boolean,
  _locale: Locale = 'ru',
): string {
  if (overrideProvided) {
    return sanitizeShareBody(override) ?? '';
  }

  const fromTheme = theme && typeof theme === 'object'
    ? sanitizeShareBody((theme as ProfileTheme).shareMessage)
    : null;
  return fromTheme ?? '';
}

export function formatPortfolioShareCaption(
  username: string,
  body: string,
  botUsername?: string,
  includeDirectLink = true,
): string {
  const text = body.trim();
  const startLink = portfolioStartAppLink(username, botUsername);
  if (!text) {
    return includeDirectLink ? startLink : '';
  }
  if (!includeDirectLink) return text;
  return `${text}\n\n${startLink}`;
}

/** @deprecated use sanitizeShareBody */
export const sanitizeSharePitch = sanitizeShareBody;

/** @deprecated use defaultSharePitch */
export const DEFAULT_SHARE_PITCH = DEFAULT_SHARE_PITCH_RU;
