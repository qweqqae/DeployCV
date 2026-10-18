const dns = require('dns').promises;

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;

function isPrivateIp(ip) {
  if (!ip) return true;
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  const parts = normalized.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return false;
  if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  return false;
}

async function assertPublicHostname(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (
    host === 'localhost'
    || host.endsWith('.localhost')
    || host.endsWith('.local')
    || host.endsWith('.internal')
    || host === 'metadata.google.internal'
  ) {
    throw new Error('Blocked host');
  }

  const records = await dns.lookup(host, { all: true });
  if (!records.length) throw new Error('Blocked host');
  for (const { address } of records) {
    if (isPrivateIp(address)) throw new Error('Blocked host');
  }
}

async function fetchImageThroughProxy(targetUrl, headers, redirectsLeft = MAX_REDIRECTS) {
  const parsed = new URL(targetUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Invalid protocol');
  }

  await assertPublicHostname(parsed.hostname);

  const upstream = await fetch(targetUrl, {
    headers,
    redirect: 'manual',
  });

  if (upstream.status >= 300 && upstream.status < 400) {
    if (redirectsLeft <= 0) throw new Error('Too many redirects');
    const location = upstream.headers.get('location');
    if (!location) throw new Error('Invalid redirect');
    const nextUrl = new URL(location, targetUrl).href;
    return fetchImageThroughProxy(nextUrl, headers, redirectsLeft - 1);
  }

  if (!upstream.ok) {
    throw new Error('Failed to fetch image');
  }

  const contentType = upstream.headers.get('content-type') || 'image/jpeg';
  if (!contentType.startsWith('image/') && !contentType.includes('svg')) {
    throw new Error('Not an image');
  }

  const reader = upstream.body?.getReader();
  if (!reader) {
    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.length > MAX_BYTES) throw new Error('Response too large');
    return { contentType, buffer };
  }

  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) throw new Error('Response too large');
    chunks.push(value);
  }

  return { contentType, buffer: Buffer.concat(chunks) };
}

const buckets = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 120;

function clientKey(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function consumeImageProxyBudget(req) {
  const key = clientKey(req);
  const now = Date.now();
  const row = buckets.get(key);

  if (!row || now - row.start >= WINDOW_MS) {
    buckets.set(key, { start: now, count: 1 });
    return { ok: true };
  }

  if (row.count >= MAX_PER_WINDOW) {
    const retryAfterSec = Math.max(1, Math.ceil((WINDOW_MS - (now - row.start)) / 1000));
    return { ok: false, retryAfterSec };
  }

  row.count += 1;
  return { ok: true };
}

module.exports = { fetchImageThroughProxy, consumeImageProxyBudget };
