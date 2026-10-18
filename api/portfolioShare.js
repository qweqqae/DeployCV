const { buildInlinePortfolioResult } = require('./sharePreparedCommon');
const { validateTelegramInitData, getTelegramUser, getBotApiSecret } = require('./telegramAuth');

function isTrustedMediaUrl(rawUrl) {
  const url = rawUrl.trim();
  if (!url || !/^https:\/\//i.test(url)) return false;
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
      return false;
    }
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      const supabaseHost = new URL(supabaseUrl).hostname.toLowerCase();
      if (host === supabaseHost && parsed.pathname.includes('/storage/v1/object/public/portfolio-images/')) {
        return true;
      }
    }
    const webAppUrl = getWebAppUrl();
    if (webAppUrl) {
      const appHost = new URL(webAppUrl).hostname.toLowerCase();
      if (host === appHost) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function getWebAppUrl() {
  return process.env.WEB_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://your-app.example.com');
}

async function botApiPost(path, body) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const botSecret = getBotApiSecret();

  if (!supabaseUrl || !anonKey || !botSecret) return null;

  const res = await fetch(`${supabaseUrl}/functions/v1/portfolio-api${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      'X-Bot-Token': botSecret,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return null;
  return res.json();
}

async function botApi(path) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const botSecret = getBotApiSecret();

  if (!supabaseUrl || !anonKey || !botSecret) return null;

  const res = await fetch(`${supabaseUrl}/functions/v1/portfolio-api${path}`, {
    headers: {
      Authorization: `Bearer ${anonKey}`,
      'X-Bot-Token': botSecret,
    },
  });

  if (!res.ok) return null;
  return res.json();
}

async function loadProfileForShare({ telegramId, username }) {
  if (username) {
    const byName = await botApi(`/bot/share-payload?username=${encodeURIComponent(username)}`);
    if (byName?.profile) return byName.profile;
  }

  const byId = await botApi(`/bot/share-payload?telegram_id=${telegramId}`);
  if (byId?.profile) return byId.profile;

  const own = await botApi(`/bot/profile?telegram_id=${telegramId}`);
  return own?.profile ?? null;
}

async function handlePrepareShare(req, res) {
  const botToken = process.env.BOT_TOKEN;

  if (!botToken) {
    return res.status(500).json({ error: 'Share is not configured on server' });
  }

  const initData = req.headers['x-telegram-init-data'];
  if (!initData || !validateTelegramInitData(initData, botToken)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = getTelegramUser(initData);
  if (!user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const requestedUsername = typeof body.username === 'string'
    ? body.username.toLowerCase().replace(/[^a-z0-9_]/g, '')
    : '';

  const profile = await loadProfileForShare({
    telegramId: user.id,
    username: requestedUsername.length >= 3 ? requestedUsername : '',
  });

  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const webAppUrl = getWebAppUrl();
  const botUsername = process.env.BOT_USERNAME || process.env.VITE_BOT_USERNAME || 'your_bot_username';

  const rawImageUrl = typeof body.image_url === 'string' ? body.image_url.trim() : '';
  if (!rawImageUrl || !isTrustedMediaUrl(rawImageUrl)) {
    return res.status(400).json({ error: 'Missing share image. Wait for the card to upload.' });
  }

  const thumbImageUrl = typeof body.thumb_url === 'string' ? body.thumb_url.trim() : rawImageUrl;
  if (!isTrustedMediaUrl(thumbImageUrl)) {
    return res.status(400).json({ error: 'Invalid thumb image.' });
  }
  const photoWidth = Number(body.photo_width) || 420;
  const photoHeight = Number(body.photo_height) || 640;
  const thumbWidth = Number(body.thumb_width) || 320;
  const thumbHeight = Number(body.thumb_height) || Math.round(photoHeight * (320 / photoWidth));
  const resultId = `portfolio-${profile.username}-${Date.now()}`;

  await botApiPost('/bot/persist-share-image', {
    telegram_id: user.id,
    image_url: rawImageUrl,
  });

  const ownerId = profile.telegram_id;
  const bodyOverrideProvided = ownerId === user.id && body.share_message !== undefined;
  const bodyOverride = bodyOverrideProvided ? body.share_message : undefined;

  const shareLocale = body.share_locale;
  const includeDirectLinkProvided =
    ownerId === user.id && body.share_include_direct_link !== undefined;
  const includeDirectLink = includeDirectLinkProvided ? body.share_include_direct_link : undefined;

  const result = buildInlinePortfolioResult(
    profile,
    botUsername,
    webAppUrl,
    {
      photoUrl: rawImageUrl,
      thumbUrl: thumbImageUrl,
      photoWidth,
      photoHeight,
      thumbWidth,
      thumbHeight,
    },
    resultId,
    bodyOverride,
    bodyOverrideProvided,
    shareLocale,
    includeDirectLink,
    includeDirectLinkProvided,
  );

  const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/savePreparedInlineMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: user.id,
      allow_user_chats: true,
      allow_bot_chats: true,
      allow_group_chats: true,
      allow_channel_chats: true,
      result,
    }),
  });

  const tgData = await tgRes.json();
  if (!tgData.ok || !tgData.result?.id) {
    const description = typeof tgData.description === 'string' ? tgData.description : 'Telegram share failed';
    return res.status(502).json({ error: description, telegram: tgData });
  }

  return res.status(200).json({
    prepared_message_id: tgData.result.id,
    photo_url: result.photo_url,
  });
}

module.exports = {
  handlePrepareShare,
};
