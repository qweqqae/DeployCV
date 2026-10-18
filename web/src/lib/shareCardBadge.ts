import type { StatusDisplay } from './shareCardStatus';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildBadgeText(status: StatusDisplay): string {
  if (status.useDot) {
    return status.label.trim();
  }

  const emoji = status.emoji.trim();
  const label = status.label.trim();

  if (emoji && label) return `${emoji} ${label}`;
  if (emoji) return emoji;
  return label;
}

export function createStatusBadgeDataUrl(status: StatusDisplay): string {
  const text = buildBadgeText(status);
  if (!text) {
    return '';
  }

  const padX = 14;
  const width = Math.min(300, Math.max(88, Math.round(padX * 2 + text.length * 7.8)));
  const textX = status.useDot ? padX + 14 : padX;

  const dotMarkup = status.useDot
    ? `<circle cx="${padX}" cy="16" r="4" fill="${status.dotColor}"/>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="32" viewBox="0 0 ${width} 32" overflow="visible">
  <rect x="1" y="1" width="${width - 2}" height="30" rx="15" fill="#1a1a1a" stroke="#2a2a2a"/>
  ${dotMarkup}
  <text x="${textX}" y="20" fill="#d4d4d4" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="500">${escapeXml(text)}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
