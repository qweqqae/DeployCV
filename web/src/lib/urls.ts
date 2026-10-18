export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function displayUrl(url: string): string {
  return url.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

export function sanitizeHttpUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
  try {
    const normalized = normalizeUrl(url.trim());
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password) return null;
    return normalized;
  } catch {
    return null;
  }
}

export function isValidImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(normalizeUrl(trimmed));
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
