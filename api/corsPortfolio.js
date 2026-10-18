function normalizeOrigin(raw) {
  return String(raw).replace(/\/$/, '');
}

function buildAllowlist() {
  const allowlist = new Set([
    'https://web.telegram.org',
    'https://webk.telegram.org',
  ]);

  const webAppUrl = process.env.WEB_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  if (webAppUrl) {
    try {
      allowlist.add(normalizeOrigin(webAppUrl));
    } catch {
      // ignore
    }
  }

  return { allowlist, webAppUrl };
}

function originFromReferer(referer) {
  if (!referer || typeof referer !== 'string') return null;
  try {
    return normalizeOrigin(new URL(referer).origin);
  } catch {
    return null;
  }
}

function isAllowedBrowserRequest(req) {
  const { allowlist, webAppUrl } = buildAllowlist();
  const origin = req.headers?.origin || req.headers?.Origin;
  if (origin && typeof origin === 'string') {
    const normalized = normalizeOrigin(origin);
    if (allowlist.has(normalized)) return true;
    if (webAppUrl) {
      try {
        if (new URL(origin).hostname === new URL(webAppUrl).hostname) return true;
      } catch {
        // ignore
      }
    }
  }

  const refererOrigin = originFromReferer(req.headers?.referer || req.headers?.Referer);
  if (refererOrigin && allowlist.has(refererOrigin)) return true;
  if (refererOrigin && webAppUrl) {
    try {
      if (new URL(refererOrigin).hostname === new URL(webAppUrl).hostname) return true;
    } catch {
      // ignore
    }
  }

  const site = req.headers?.['sec-fetch-site'] || req.headers?.['Sec-Fetch-Site'];
  if (site === 'same-origin' || site === 'same-site') return true;

  return false;
}

function resolveAllowedOrigin(req) {
  const { allowlist, webAppUrl } = buildAllowlist();
  const origin = req.headers?.origin || req.headers?.Origin;
  if (!origin || typeof origin !== 'string') {
    return null;
  }

  const normalized = normalizeOrigin(origin);
  if (allowlist.has(normalized)) return origin;

  if (webAppUrl) {
    try {
      if (new URL(origin).hostname === new URL(webAppUrl).hostname) return origin;
    } catch {
      // ignore
    }
  }

  return null;
}

function strictCorsHeaders(req) {
  const allowOrigin = resolveAllowedOrigin(req);
  const headers = {
    'Access-Control-Allow-Headers': 'authorization, content-type, x-telegram-init-data',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    Vary: 'Origin',
  };
  if (allowOrigin) {
    headers['Access-Control-Allow-Origin'] = allowOrigin;
  }
  return headers;
}

function portfolioCorsHeaders(req) {
  return strictCorsHeaders(req);
}

module.exports = {
  portfolioCorsHeaders,
  strictCorsHeaders,
  isAllowedBrowserRequest,
};
