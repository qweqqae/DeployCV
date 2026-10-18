const DEFAULT_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-telegram-init-data";

function normalizeOrigin(raw: string): string {
  return raw.replace(/\/$/, "");
}

export function buildCorsHeaders(req: Request): Record<string, string> {
  const webAppUrl = Deno.env.get("WEB_APP_URL");
  const allowlist = new Set<string>([
    "https://web.telegram.org",
    "https://webk.telegram.org",
  ]);
  if (webAppUrl) {
    try {
      allowlist.add(normalizeOrigin(webAppUrl));
    } catch {
      // ignore
    }
  }

  const origin = req.headers.get("Origin");
  let allowOrigin: string | null = null;
  if (origin) {
    const normalized = normalizeOrigin(origin);
    if (allowlist.has(normalized)) {
      allowOrigin = origin;
    } else if (webAppUrl) {
      try {
        const appHost = new URL(webAppUrl).hostname;
        if (new URL(origin).hostname === appHost) {
          allowOrigin = origin;
        }
      } catch {
        // ignore
      }
    }
  }

  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": DEFAULT_HEADERS,
    "Vary": "Origin",
  };
  if (allowOrigin) {
    headers["Access-Control-Allow-Origin"] = allowOrigin;
  }
  return headers;
}
