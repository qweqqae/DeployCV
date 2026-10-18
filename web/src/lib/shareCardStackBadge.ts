import { getTechBadgeUrl } from './techBadge';
import type { TechStackItem } from '../types';

const BADGE_HEIGHT = 20;
/** Match html2canvas capture scale for crisp badges in the exported PNG */
const RASTER_SCALE = 3;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function estimateShareStackBadgeWidth(
  item: Pick<TechStackItem, 'label' | 'logo' | 'badge_url'>,
): number {
  if (item.badge_url?.trim()) {
    return 56;
  }

  const hasLogo = Boolean(item.logo?.trim());
  const base = Math.min(168, Math.max(44, Math.round(24 + item.label.length * 7.2)));
  return hasLogo ? base + 16 : base;
}

export function createTechStackBadgeDataUrl(
  item: Pick<TechStackItem, 'label' | 'color' | 'logo'>,
): string {
  const label = item.label.trim() || 'Tech';
  const color = item.color?.startsWith('#') ? item.color : `#${item.color || '6366f1'}`;
  const hasLogo = Boolean(item.logo?.trim());
  const width = estimateShareStackBadgeWidth(item);
  const textX = hasLogo ? 20 : width / 2;
  const textAnchor = hasLogo ? 'start' : 'middle';

  const logoMarkup = hasLogo
    ? `<image href="https://cdn.simpleicons.org/${encodeURIComponent(item.logo!.trim())}/ffffff" x="4" y="4" width="12" height="12" preserveAspectRatio="xMidYMid meet"/>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${BADGE_HEIGHT}" viewBox="0 0 ${width} ${BADGE_HEIGHT}">
  <rect width="${width}" height="${BADGE_HEIGHT}" rx="4" fill="${escapeXml(color)}"/>
  ${logoMarkup}
  <text x="${textX}" y="14" text-anchor="${textAnchor}" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="600">${escapeXml(label)}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function rasterizeShieldBadge(
  item: Pick<TechStackItem, 'label' | 'color' | 'logo' | 'style' | 'badge_url'>,
): Promise<{ src: string; width: number }> {
  const displayHeight = BADGE_HEIGHT;
  const rasterHeight = displayHeight * RASTER_SCALE;
  const badgeUrl = getTechBadgeUrl(item);

  try {
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(badgeUrl)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Failed to fetch shield');

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Failed to load shield'));
      image.src = objectUrl;
    });

    const rasterWidth = Math.max(
      32 * RASTER_SCALE,
      Math.min(168 * RASTER_SCALE, Math.round(image.naturalWidth * (rasterHeight / image.naturalHeight))),
    );
    const displayWidth = Math.round(rasterWidth / RASTER_SCALE);

    const canvas = document.createElement('canvas');
    canvas.width = rasterWidth;
    canvas.height = rasterHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, rasterWidth, rasterHeight);
    URL.revokeObjectURL(objectUrl);

    return { src: canvas.toDataURL('image/png'), width: displayWidth };
  } catch {
    return {
      src: createTechStackBadgeDataUrl(item),
      width: estimateShareStackBadgeWidth(item),
    };
  }
}

export const SHARE_STACK_BADGE_HEIGHT = BADGE_HEIGHT;
