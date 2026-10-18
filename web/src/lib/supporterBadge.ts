import type { Locale } from './i18n';
import type { Profile, ProfileTheme } from '../types';
import { mergeTheme } from './theme';

export type SupporterBadgePlacement = 'username' | 'status';

export function supporterBadgeLabel(locale: Locale): string {
  return locale === 'ru' ? '❤️ Партнёр сообщества' : '❤️ Community Partner';
}

export function shouldShowSupporterBadge(
  profile: Pick<Profile, 'is_supporter'>,
  theme?: ProfileTheme | null,
): boolean {
  if (!profile.is_supporter) return false;
  const merged = mergeTheme(theme);
  return merged.showSupporterBadge ?? true;
}

export function supporterBadgePlacement(theme?: ProfileTheme | null): SupporterBadgePlacement {
  const merged = mergeTheme(theme);
  return merged.supporterBadgePlacement === 'status' ? 'status' : 'username';
}
