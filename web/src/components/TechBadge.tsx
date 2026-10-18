import { getTechBadgeUrl } from '../lib/techBadge';
import type { TechStackItem } from '../types';

interface TechBadgeProps {
  item: TechStackItem;
  size?: 'sm' | 'md' | 'lg';
}

export function TechBadge({ item, size = 'md' }: TechBadgeProps) {
  const badgeUrl = getTechBadgeUrl(item);
  const heights = { sm: 20, md: 28, lg: 36 };

  return (
    <img
      src={badgeUrl}
      alt={item.label}
      style={{ height: heights[size] }}
      className="tech-badge"
      loading="lazy"
    />
  );
}

interface TechBadgePreviewProps {
  label: string;
  color: string;
  logo?: string | null;
  badge_url?: string | null;
  style?: TechStackItem['style'];
}

export function TechBadgePreview({
  label,
  color,
  logo,
  badge_url,
  style = 'flat',
  size = 'md',
}: TechBadgePreviewProps & { size?: 'sm' | 'md' | 'lg' }) {
  const badgeUrl = getTechBadgeUrl({
    label,
    color,
    logo: logo ?? null,
    style,
    badge_url: badge_url ?? null,
  });
  const heights = { sm: 20, md: 28, lg: 36 };

  return (
    <img src={badgeUrl} alt={label} style={{ height: heights[size] }} className="tech-badge" loading="lazy" />
  );
}
