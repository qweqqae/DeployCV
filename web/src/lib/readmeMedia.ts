import type { Profile } from '../types';
import { mergeTheme } from './theme';

export interface ReadmeMediaBase {
  owner: string;
  repo: string;
  branch?: string;
}

function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith('//');
}

export function rewriteGitHubBlobUrl(url: string): string {
  const blobMatch = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+?)(?:\?.*)?$/i,
  );
  if (blobMatch) {
    const [, owner, repo, branch, path] = blobMatch;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${decodeURIComponent(path)}`;
  }

  const rawMatch = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/raw\/([^/]+)\/(.+?)(?:\?.*)?$/i,
  );
  if (rawMatch) {
    const [, owner, repo, branch, path] = rawMatch;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${decodeURIComponent(path)}`;
  }

  const rawUserContent = url.match(
    /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+?)(?:\?.*)?$/i,
  );
  if (rawUserContent) {
    const [, owner, repo, branch, path] = rawUserContent;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${decodeURIComponent(path)}`;
  }

  return url;
}

export function resolveRelativeMediaUrl(url: string, base?: ReadmeMediaBase): string {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('/api/image-proxy')) {
    return trimmed;
  }

  let resolved = trimmed;
  if (resolved.startsWith('//')) {
    resolved = `https:${resolved}`;
  } else if (!isAbsoluteUrl(resolved) && base) {
    const branch = base.branch || 'main';
    const path = resolved.replace(/^\.?\//, '');
    resolved = `https://raw.githubusercontent.com/${base.owner}/${base.repo}/${branch}/${path}`;
  }

  return rewriteGitHubBlobUrl(resolved);
}

export function proxyReadmeImageUrl(url: string): string {
  if (!url || url.startsWith('data:') || url.startsWith('/api/image-proxy')) {
    return url;
  }
  if (!/^https?:\/\//i.test(url)) {
    return url;
  }
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

export function prepareReadmeImageSrc(
  url: string | undefined,
  base?: ReadmeMediaBase,
): string | undefined {
  if (!url) return undefined;
  const resolved = resolveRelativeMediaUrl(url, base);
  return proxyReadmeImageUrl(resolved);
}

export function getReadmeMediaBase(
  profile: Pick<Profile, 'github_username' | 'theme'>,
): ReadmeMediaBase | undefined {
  const theme = mergeTheme(profile.theme);
  const source = theme.readmeSource;
  if (source?.owner && source?.repo) {
    return { owner: source.owner, repo: source.repo, branch: source.branch || 'main' };
  }

  const owner = profile.github_username?.trim();
  if (!owner) return undefined;
  return { owner, repo: owner, branch: 'main' };
}

export function rewriteReadmeMediaUrls(content: string, base?: ReadmeMediaBase): string {
  let result = content;

  result = result.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_match, alt, url) => {
    const prepared = prepareReadmeImageSrc(url, base) || url;
    return `![${alt}](${prepared})`;
  });

  result = result.replace(
    /<img\b([^>]*?)\ssrc=["']([^"']+)["']([^>]*)>/gi,
    (_match, before, url, after) => {
      const prepared = prepareReadmeImageSrc(url, base) || url;
      return `<img${before} src="${prepared}"${after}>`;
    },
  );

  return result;
}
