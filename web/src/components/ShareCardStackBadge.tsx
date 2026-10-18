import { useEffect, useState } from 'react';
import {
  createTechStackBadgeDataUrl,
  estimateShareStackBadgeWidth,
  rasterizeShieldBadge,
  SHARE_STACK_BADGE_HEIGHT,
} from '../lib/shareCardStackBadge';
import type { TechStackItem } from '../types';

interface ShareCardStackBadgeProps {
  item: TechStackItem;
}

export function ShareCardStackBadge({ item }: ShareCardStackBadgeProps) {
  const fallbackWidth = estimateShareStackBadgeWidth(item);
  const [badge, setBadge] = useState({
    src: createTechStackBadgeDataUrl(item),
    width: fallbackWidth,
    ready: false,
  });

  useEffect(() => {
    let cancelled = false;

    rasterizeShieldBadge(item).then((result) => {
      if (!cancelled) {
        setBadge({ src: result.src, width: result.width, ready: true });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [item.id, item.label, item.color, item.logo, item.style, item.badge_url]);

  return (
    <img
      data-share-stack-badge
      data-badge-ready={badge.ready ? 'true' : 'false'}
      src={badge.src}
      alt={item.label}
      width={badge.width}
      height={SHARE_STACK_BADGE_HEIGHT}
      style={{
        display: 'block',
        width: badge.width,
        height: SHARE_STACK_BADGE_HEIGHT,
        flexShrink: 0,
        imageRendering: 'auto',
      }}
    />
  );
}
