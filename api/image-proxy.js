const { fetchImageThroughProxy, consumeImageProxyBudget } = require('./imageProxyFetch');
const { isAllowedBrowserRequest, strictCorsHeaders } = require('./corsPortfolio');

module.exports = async (req, res) => {
  const cors = strictCorsHeaders(req);
  for (const [key, value] of Object.entries(cors)) {
    res.setHeader(key, value);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!isAllowedBrowserRequest(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const budget = consumeImageProxyBudget(req);
  if (!budget.ok) {
    res.setHeader('Retry-After', String(budget.retryAfterSec));
    return res.status(429).json({ error: 'Too many requests' });
  }

  const url = req.query?.url;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url' });
  }

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Invalid url' });
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (compatible; PortfolioBot/1.0)',
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    };

    if (
      parsed.hostname.includes('github')
      || parsed.hostname.includes('githubusercontent.com')
    ) {
      headers.Referer = 'https://github.com/';
    }

    const { contentType, buffer } = await fetchImageThroughProxy(url, headers);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Proxy error';
    if (message === 'Blocked host' || message === 'Invalid protocol' || message === 'Not an image') {
      return res.status(400).json({ error: message });
    }
    if (message === 'Response too large' || message === 'Too many redirects') {
      return res.status(413).json({ error: message });
    }
    return res.status(502).json({ error: 'Failed to fetch image' });
  }
};
