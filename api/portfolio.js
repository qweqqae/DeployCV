function getConfig() {
  return {
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  };
}

function resolvePath(req) {
  const fromQuery = req.query?.path;
  if (fromQuery) {
    return Array.isArray(fromQuery) ? fromQuery.join('/') : String(fromQuery);
  }

  const raw = req.url || '';
  const pathname = raw.split('?')[0];
  return pathname.replace(/^\/api\/portfolio\/?/, '');
}

const { portfolioCorsHeaders } = require('./corsPortfolio');

module.exports = async (req, res) => {
  const { supabaseUrl, anonKey } = getConfig();

  const cors = portfolioCorsHeaders(req);
  for (const [key, value] of Object.entries(cors)) {
    res.setHeader(key, value);
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabaseUrl || !anonKey) {
    return res.status(500).json({ error: 'API proxy is not configured' });
  }

  const path = resolvePath(req);

  const allowedProxyPaths = new Set([
    'me',
    'profile',
    'tech-stack',
    'sections',
    'upload',
    'send-card',
    'prepare-share',
  ]);

  if (!allowedProxyPaths.has(path)) {
    return res.status(404).json({ error: 'Not found' });
  }

  const targetUrl = `${supabaseUrl}/functions/v1/portfolio-api/${path}`;

  try {
    const headers = {
      'Content-Type': req.headers['content-type'] || 'application/json',
      Authorization: `Bearer ${anonKey}`,
    };

    const initData = req.headers['x-telegram-init-data'];
    if (initData) headers['X-Telegram-Init-Data'] = initData;

    const init = { method: req.method, headers };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    }

    const upstream = await fetch(targetUrl, init);
    const body = await upstream.text();

    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    return res.send(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Proxy error';
    return res.status(502).json({ error: message });
  }
};
