function secureEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const enc = new TextEncoder();
  const left = enc.encode(a);
  const right = enc.encode(b);
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

export function verifyBotApiToken(req: Request): boolean {
  const token = req.headers.get("X-Bot-Token");
  const expected = Deno.env.get("BOT_API_SECRET");
  if (!token || !expected) return false;
  return secureEqual(token, expected);
}

export function sanitizeHttpsMediaUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function isTrustedMediaUrl(rawUrl: string): boolean {
  const url = rawUrl.trim();
  if (!url || !/^https:\/\//i.test(url)) return false;

  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
      return false;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (supabaseUrl) {
      const supabaseHost = new URL(supabaseUrl).hostname.toLowerCase();
      if (host === supabaseHost && parsed.pathname.includes("/storage/v1/object/public/portfolio-images/")) {
        return true;
      }
    }

    const webAppUrl = Deno.env.get("WEB_APP_URL");
    if (webAppUrl) {
      const appHost = new URL(webAppUrl).hostname.toLowerCase();
      if (host === appHost) return true;
    }

    return false;
  } catch {
    return false;
  }
}

const SOCIAL_KEYS = ["github", "twitter", "linkedin", "website", "telegram"] as const;

export function sanitizeSocialLinks(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const source = input as Record<string, unknown>;
  const out: Record<string, string> = {};

  for (const key of SOCIAL_KEYS) {
    const value = source[key];
    if (typeof value !== "string" || !value.trim()) continue;
    try {
      const normalized = value.trim().startsWith("http") ? value.trim() : `https://${value.trim()}`;
      const parsed = new URL(normalized);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
      if (parsed.username || parsed.password) continue;
      if (parsed.protocol === "http:") {
        parsed.protocol = "https:";
      }
      out[key] = parsed.toString();
    } catch {
      // skip invalid
    }
  }

  return out;
}
