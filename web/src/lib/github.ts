import { rewriteReadmeMediaUrls, type ReadmeMediaBase } from './readmeMedia';

export interface GitHubReadmeResult {
  content: string;
  owner: string;
  repo: string;
  branch: string;
}

async function fetchRepoReadme(owner: string, repo: string): Promise<GitHubReadmeResult | null> {
  const [readmeRes, repoRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: { Accept: 'application/vnd.github.raw' },
    }),
    fetch(`https://api.github.com/repos/${owner}/${repo}`),
  ]);

  if (!readmeRes.ok) return null;

  let branch = 'main';
  if (repoRes.ok) {
    const repoData = await repoRes.json();
    branch = repoData.default_branch || 'main';
  }

  return {
    content: await readmeRes.text(),
    owner,
    repo,
    branch,
  };
}

export type ParsedReadmeUrl =
  | { kind: 'github-api'; owner: string; repo: string }
  | { kind: 'github-raw'; url: string; owner: string; repo: string; branch: string }
  | { kind: 'direct'; url: string };

export function parseReadmeUrl(input: string): ParsedReadmeUrl | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const repoMatch = trimmed.match(/^(?:https?:\/\/)?github\.com\/([^/]+)\/([^/#?]+)\/?$/i);
  if (repoMatch) {
    return { kind: 'github-api', owner: repoMatch[1], repo: repoMatch[2].replace(/\.git$/, '') };
  }

  const blobMatch = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+?)(?:\?.*)?$/i,
  );
  if (blobMatch) {
    const [, owner, repo, branch, path] = blobMatch;
    return {
      kind: 'github-raw',
      url: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${decodeURIComponent(path)}`,
      owner,
      repo,
      branch,
    };
  }

  const rawPathMatch = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/raw\/([^/]+)\/(.+?)(?:\?.*)?$/i,
  );
  if (rawPathMatch) {
    const [, owner, repo, branch, path] = rawPathMatch;
    return {
      kind: 'github-raw',
      url: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${decodeURIComponent(path)}`,
      owner,
      repo,
      branch,
    };
  }

  const rawUserMatch = trimmed.match(
    /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+?)(?:\?.*)?$/i,
  );
  if (rawUserMatch) {
    const [, owner, repo, branch] = rawUserMatch;
    return {
      kind: 'github-raw',
      url: trimmed.split('?')[0],
      owner,
      repo,
      branch,
    };
  }

  const shortMatch = trimmed.match(/^([^/\s.]+)\/([^/\s]+)$/);
  if (shortMatch) {
    return { kind: 'github-api', owner: shortMatch[1], repo: shortMatch[2].replace(/\.git$/, '') };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return { kind: 'direct', url: trimmed };
  }

  return null;
}

export async function fetchReadmeFromUrl(input: string): Promise<GitHubReadmeResult | null> {
  const parsed = parseReadmeUrl(input);
  if (!parsed) return null;

  try {
    if (parsed.kind === 'github-api') {
      return fetchRepoReadme(parsed.owner, parsed.repo);
    }

    if (parsed.kind === 'github-raw') {
      const response = await fetch(parsed.url);
      if (!response.ok) return null;
      return {
        content: await response.text(),
        owner: parsed.owner,
        repo: parsed.repo,
        branch: parsed.branch,
      };
    }

    const response = await fetch(parsed.url);
    if (!response.ok) return null;
    return { content: await response.text(), owner: '', repo: '', branch: 'main' };
  } catch {
    return null;
  }
}

export async function fetchGitHubReadme(username: string): Promise<GitHubReadmeResult | null> {
  try {
    const primary = await fetchRepoReadme(username, username);
    if (primary) return primary;

    const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=10`);
    if (!reposResponse.ok) return null;

    const repos = await reposResponse.json();
    for (const repo of repos) {
      const result = await fetchRepoReadme(username, repo.name);
      if (result) return result;
    }

    return null;
  } catch {
    return null;
  }
}

export async function fetchGitHubProfile(username: string) {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export function getShieldUrl(label: string, color: string, logo?: string | null, style = 'flat'): string {
  const hex = color.replace('#', '');
  const params = new URLSearchParams();
  params.set('style', style);
  if (logo) params.set('logo', logo);
  params.set('logoColor', 'white');
  return `https://img.shields.io/badge/${encodeURIComponent(label)}-${hex}?${params.toString()}`;
}

export function normalizeReadmeContent(content: string, base?: ReadmeMediaBase): string {
  const normalized = content
    .replace(/\r\n/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

  return rewriteReadmeMediaUrls(normalized, base);
}
