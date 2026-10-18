import type { TechStackItem } from '../types';
import { estimateShareStackBadgeWidth } from './shareCardStackBadge';

const BADGE_GAP = 8;
const MAX_ROWS = 2;
export const MAX_VISIBLE_SHARE_BADGES = 7;

export function estimateBadgeWidth(item: TechStackItem): number {
  return estimateShareStackBadgeWidth(item);
}

export function getVisibleTechStackCount(
  items: TechStackItem[],
  maxWidth: number,
  reservedFirstRow = 0,
): number {
  let rows = 1;
  let rowWidth = reservedFirstRow > 0 ? reservedFirstRow + BADGE_GAP : 0;
  let count = 0;

  for (const item of items) {
    const badgeWidth = estimateBadgeWidth(item);
    const needsGap = rowWidth > 0 ? BADGE_GAP : 0;
    const nextWidth = rowWidth + needsGap + badgeWidth;

    if (nextWidth > maxWidth && rowWidth > 0) {
      rows += 1;
      rowWidth = badgeWidth;
    } else {
      rowWidth = nextWidth;
    }

    if (rows > MAX_ROWS) break;
    count += 1;
  }

  return count;
}

export function getShareTechStackLayout(
  items: TechStackItem[],
  _maxWidth: number,
  _showLabel = true,
) {
  const visibleCount = Math.min(MAX_VISIBLE_SHARE_BADGES, items.length);

  return {
    visibleItems: items.slice(0, visibleCount),
    hiddenCount: Math.max(0, items.length - visibleCount),
  };
}
