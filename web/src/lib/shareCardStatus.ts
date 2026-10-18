import { ACTIVITY_STATUSES } from '../types';
import type { Profile, ProfileTheme } from '../types';
import type { Locale } from './i18n';
import { getStatusLabel } from './i18n';
import { mergeTheme } from './theme';

const STATUS_LOCALES: Locale[] = ['en', 'ru'];

function isCanonicalStatusLabel(status: string, text: string): boolean {
  return STATUS_LOCALES.some((loc) => getStatusLabel(loc, status) === text);
}

const STATUS_DOT_COLORS: Record<string, string> = {
  online: '#22c55e',
  coding: '#3b82f6',
  designing: '#a855f7',
  learning: '#f59e0b',
  custom: '#6366f1',
};

export interface StatusDisplay {
  emoji: string;
  label: string;
  dotColor: string;
  useDot: boolean;
}

export function resolveStatusDisplay(
  status: string,
  message?: string | null,
  customEmoji?: string | null,
  locale?: Locale,
): StatusDisplay | null {
  const text = message?.trim() || '';

  if (status === 'custom') {
    const emoji = customEmoji?.trim() || '';
    if (!emoji && !text) return null;

    return {
      emoji,
      label: text,
      dotColor: STATUS_DOT_COLORS.custom,
      useDot: false,
    };
  }

  const info = ACTIVITY_STATUSES.find((s) => s.value === status) || ACTIVITY_STATUSES[0];

  const defaultLabel = locale ? getStatusLabel(locale, status) : info.label;
  const label = text && !isCanonicalStatusLabel(status, text) ? text : defaultLabel;

  return {
    emoji: info.emoji,
    label,
    dotColor: STATUS_DOT_COLORS[status] || STATUS_DOT_COLORS.online,
    useDot: false,
  };
}

export function resolveShareStatus(
  profile: Profile,
  themeInput?: ProfileTheme,
  locale?: Locale,
): StatusDisplay | null {
  const theme = themeInput || mergeTheme(profile.theme);
  if (theme.showStatus === false) return null;

  return resolveStatusDisplay(
    profile.activity_status || 'online',
    profile.activity_message,
    theme.customStatusEmoji,
    locale,
  );
}
