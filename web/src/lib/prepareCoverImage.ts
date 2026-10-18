function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(blob);
  });
}

export function bakeSvgPathAnimations(svg: string): string {
  return svg.replace(
    /<path\b([^>]*?)>\s*<animate\b[^>]*\battributeName=["']d["'][^>]*\bvalues=["']([^"']+)["'][^>]*>\s*<\/animate>\s*<\/path>/gis,
    (_full, attrs, values) => {
      const firstPath = values.split(';')[0]?.trim() || '';
      const cleaned = attrs.replace(/\bd=["'][^"']*["']/gi, '').trim();
      return `<path ${cleaned} d="${firstPath}"></path>`;
    },
  );
}

export function fixSvgForCapture(svg: string): string {
  const override = '.text,.desc{opacity:1!important;animation:none!important}';
  let next = svg;

  if (/<style[\s>]/i.test(next)) {
    next = next.replace(/<\/style>/i, `${override}</style>`);
  } else {
    next = next.replace(/<svg([^>]*)>/i, `<svg$1><style>${override}</style>`);
  }

  return bakeSvgPathAnimations(next);
}

function readSvgViewBox(svg: string): { width: number; height: number } {
  const viewBoxMatch = svg.match(/viewBox=["']([^"']+)["']/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }

  const widthMatch = svg.match(/\bwidth=["'](\d+(?:\.\d+)?)/i);
  const heightMatch = svg.match(/\bheight=["'](\d+(?:\.\d+)?)/i);
  return {
    width: widthMatch ? Number(widthMatch[1]) : 854,
    height: heightMatch ? Number(heightMatch[1]) : 200,
  };
}

function isSvgSource(src: string, contentType: string, body: string): boolean {
  if (contentType.includes('svg')) return true;
  if (src.includes('capsule-render.vercel.app')) return true;
  return body.trim().startsWith('<svg') || body.trim().startsWith('<?xml');
}

async function rasterizeSvgToPngDataUrl(
  svg: string,
  width: number,
  height: number,
): Promise<string> {
  const fixed = fixSvgForCapture(svg);
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fixed)}`;
  const { width: svgWidth, height: svgHeight } = readSvgViewBox(fixed);

  const image = new Image();
  image.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Failed to load SVG'));
    image.src = svgUrl;
  });

  const scale = 3;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  const targetAspect = width / height;
  const sourceAspect = svgWidth / svgHeight;

  let drawWidth = canvas.width;
  let drawHeight = canvas.height;
  let offsetX = 0;
  let offsetY = 0;

  if (sourceAspect > targetAspect) {
    drawHeight = canvas.height;
    drawWidth = canvas.height * sourceAspect;
    offsetX = (canvas.width - drawWidth) / 2;
  } else {
    drawWidth = canvas.width;
    drawHeight = canvas.width / sourceAspect;
    offsetY = (canvas.height - drawHeight) / 2;
  }

  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  return canvas.toDataURL('image/png');
}

export async function fetchCoverAsDataUrl(
  src: string,
  width: number,
  height: number,
): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith('data:image/png')) return src;

  try {
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(src)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    const body = await response.text();

    if (isSvgSource(src, contentType, body)) {
      return rasterizeSvgToPngDataUrl(body, width, height);
    }

    const blob = new Blob([body], { type: contentType || 'image/jpeg' });
    return blobToDataUrl(blob);
  } catch {
    return null;
  }
}

export async function fetchImageAsDataUrl(src: string): Promise<string | null> {
  if (!src || src.startsWith('data:')) return src;

  try {
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(src)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    return blobToDataUrl(blob);
  } catch {
    return null;
  }
}
