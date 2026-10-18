function resolveApiUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  if (import.meta.env.PROD) {
    return '/api/portfolio';
  }
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portfolio-api`;
}

const API_URL = resolveApiUrl();
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const USE_PROXY = API_URL.startsWith('/');

export async function preparePortfolioShare(
  username: string,
  capture: {
    url: string;
    thumbUrl: string;
    width: number;
    height: number;
    thumbWidth: number;
    thumbHeight: number;
  },
  options?: {
    shareMessage?: string | null;
    locale?: 'en' | 'ru';
    shareIncludeDirectLink?: boolean;
  },
): Promise<string> {
  const initData = window.Telegram?.WebApp?.initData || '';
  if (!initData) {
    throw new Error('Open the app from Telegram to share');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': initData,
  };

  if (!USE_PROXY && ANON_KEY) {
    headers.Authorization = `Bearer ${ANON_KEY}`;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 45000);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/prepare-share`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        username,
        image_url: capture.url,
        thumb_url: capture.thumbUrl,
        photo_width: capture.width,
        photo_height: capture.height,
        thumb_width: capture.thumbWidth,
        thumb_height: capture.thumbHeight,
        ...(options?.shareMessage !== undefined
          ? { share_message: options.shareMessage }
          : {}),
        ...(options?.locale ? { share_locale: options.locale } : {}),
        ...(options?.shareIncludeDirectLink !== undefined
          ? { share_include_direct_link: options.shareIncludeDirectLink }
          : {}),
      }),
    });
  } finally {
    window.clearTimeout(timeoutId);
  }

  const text = await res.text();
  let data: { prepared_message_id?: string; error?: string } = {};
  if (text) {
    try {
      data = JSON.parse(text) as { prepared_message_id?: string; error?: string };
    } catch {
      // ignore
    }
  }

  if (!res.ok) {
    throw new Error(data.error || `Share failed (${res.status})`);
  }

  if (!data.prepared_message_id) {
    throw new Error('Share is not available');
  }

  return data.prepared_message_id;
}
