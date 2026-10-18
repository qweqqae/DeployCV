const { portfolioStartAppLink } = require('./miniAppLink');
const { normalizeShareLocale, defaultSharePitch } = require('./shareLocale');

function resolveShareCardUrl(profile) {
  const theme = profile.theme && typeof profile.theme === 'object' ? profile.theme : {};
  const fromTheme = theme.shareCardUrl || theme.share_card_url;
  if (typeof fromTheme === 'string' && fromTheme.length > 0) return fromTheme;
  if (profile.share_card_url) return profile.share_card_url;
  return null;
}

const MAX_SHARE_BODY_LEN = 900;

function sanitizeShareBody(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.replace(/\r\n/g, '\n').trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_SHARE_BODY_LEN);
}

function defaultShareBody(profile, localeRaw) {
  const theme = profile.theme && typeof profile.theme === 'object' ? profile.theme : {};
  const locale = normalizeShareLocale(localeRaw, theme);
  const name = profile.display_name || profile.username;
  return `${name}\n\n${defaultSharePitch(locale)}`;
}

function resolveShareBody(profile, override, overrideProvided, localeRaw) {
  const theme = profile.theme && typeof profile.theme === 'object' ? profile.theme : {};

  if (overrideProvided) {
    return sanitizeShareBody(override) ?? '';
  }

  return sanitizeShareBody(theme.shareMessage) ?? '';
}

function resolveShareIncludeDirectLink(theme, override, overrideProvided) {
  if (overrideProvided) {
    return override !== false;
  }
  const themeVal = theme && typeof theme === 'object' ? theme.shareIncludeDirectLink : undefined;
  if (themeVal === false) return false;
  return true;
}

function portfolioShareCaption(
  profile,
  botUsername,
  bodyOverride,
  bodyOverrideProvided,
  localeRaw,
  includeDirectLinkOverride,
  includeDirectLinkOverrideProvided,
) {
  const theme = profile.theme && typeof profile.theme === 'object' ? profile.theme : {};
  const body = resolveShareBody(profile, bodyOverride, bodyOverrideProvided, localeRaw).trim();
  const includeLink = resolveShareIncludeDirectLink(
    theme,
    includeDirectLinkOverride,
    includeDirectLinkOverrideProvided,
  );
  const startLink = portfolioStartAppLink(botUsername, profile.username);
  if (!body) {
    return includeLink ? startLink : '';
  }
  if (!includeLink) return body;
  return `${body}\n\n${startLink}`;
}

function pickSharePhotoUrl(profile, webAppUrl, photoOverride) {
  const banner = `${webAppUrl.replace(/\/$/, '')}/start-banner.jpg`;
  return photoOverride || resolveShareCardUrl(profile) || profile.header_image_url || profile.avatar_url || banner;
}

function buildInlinePortfolioResult(
  profile,
  botUsername,
  webAppUrl,
  media,
  resultId,
  bodyOverride,
  bodyOverrideProvided,
  localeRaw,
  includeDirectLinkOverride,
  includeDirectLinkOverrideProvided,
) {
  const theme = profile.theme && typeof profile.theme === 'object' ? profile.theme : {};
  const locale = normalizeShareLocale(localeRaw, theme);
  const miniAppLink = portfolioStartAppLink(botUsername, profile.username);
  const caption = portfolioShareCaption(
    profile,
    botUsername,
    bodyOverride,
    bodyOverrideProvided,
    localeRaw,
    includeDirectLinkOverride,
    includeDirectLinkOverrideProvided,
  );
  const bioLine = profile.bio
    ? profile.bio.slice(0, 120)
    : (locale === 'en' ? `Portfolio @${profile.username}` : `Моё портфолио @${profile.username}`);

  return {
    type: 'photo',
    id: resultId || `portfolio-${profile.username}-${Date.now()}`,
    photo_url: media.photoUrl,
    thumb_url: media.thumbUrl,
    photo_width: media.photoWidth,
    photo_height: media.photoHeight,
    title: profile.display_name || profile.username,
    description: bioLine,
    caption,
    reply_markup: {
      inline_keyboard: [[
        {
          text: locale === 'en' ? 'Open portfolio' : 'Открыть портфолио',
          url: miniAppLink,
        },
      ]],
    },
  };
}

module.exports = {
  buildInlinePortfolioResult,
  portfolioShareCaption,
  resolveShareBody,
  pickSharePhotoUrl,
};
