import { getShieldUrl } from './github';
import type { TechStackItem } from '../types';

export type TechBadgeProvider = 'shields' | 'custom';

export const BADGE_URL_EXAMPLES = [
  {
    label: 'skillicons.dev',
    url: 'https://skillicons.dev/icons?i=react,typescript,nodejs',
  },
  {
    label: 'simpleicons',
    url: 'https://cdn.simpleicons.org/react/61DAFB',
  },
] as const;

export function getTechBadgeProvider(item: Pick<TechStackItem, 'badge_url'>): TechBadgeProvider {
  return item.badge_url?.trim() ? 'custom' : 'shields';
}

export function labelFromBadgeUrl(url: string): string {
  try {
    const pathname = new URL(url.trim()).pathname;
    const segment = pathname.split('/').filter(Boolean).pop() || 'custom';
    const name = segment.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
    return (name || 'Custom').slice(0, 48);
  } catch {
    return 'Custom';
  }
}

export function getTechBadgeUrl(
  item: Pick<TechStackItem, 'label' | 'color' | 'logo' | 'style' | 'badge_url'>,
): string {
  const custom = item.badge_url?.trim();
  if (custom) return custom;

  return getShieldUrl(
    item.label,
    item.color.replace('#', ''),
    item.logo,
    item.style || 'flat',
  );
}
