import { portfolioStartAppLink } from "./miniAppLink.ts";
import { defaultSharePitch, normalizeShareLocale } from "./shareLocale.ts";

export interface ShareProfileRow {
  username: string;
  display_name: string | null;
  bio: string | null;
  share_card_url?: string | null;
  avatar_url: string | null;
  header_image_url: string | null;
  theme?: Record<string, unknown> | null;
}

export function resolveShareCardUrl(profile: ShareProfileRow): string | null {
  const theme = profile.theme && typeof profile.theme === "object" ? profile.theme : {};
  const fromTheme = theme.shareCardUrl ?? theme.share_card_url;
  if (typeof fromTheme === "string" && fromTheme.length > 0) return fromTheme;
  if (profile.share_card_url) return profile.share_card_url;
  return null;
}

const MAX_SHARE_BODY_LEN = 900;

function sanitizeShareBody(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_SHARE_BODY_LEN);
}

function defaultShareBody(profile: ShareProfileRow, localeRaw?: unknown): string {
  const theme = profile.theme && typeof profile.theme === "object" ? profile.theme : {};
  const locale = normalizeShareLocale(localeRaw, theme);
  const name = profile.display_name || profile.username;
  return `${name}\n\n${defaultSharePitch(locale)}`;
}

export function resolveShareBody(
  profile: ShareProfileRow,
  override?: unknown,
  overrideProvided = false,
  localeRaw?: unknown,
): string {
  const theme = profile.theme && typeof profile.theme === "object" ? profile.theme : {};

  if (overrideProvided) {
    return sanitizeShareBody(override) ?? "";
  }

  return sanitizeShareBody(theme.shareMessage) ?? "";
}

export function resolveShareIncludeDirectLink(
  theme?: Record<string, unknown> | null,
  override?: unknown,
  overrideProvided = false,
): boolean {
  if (overrideProvided) {
    return override !== false;
  }
  const themeVal = theme && typeof theme === "object" ? theme.shareIncludeDirectLink : undefined;
  if (themeVal === false) return false;
  return true;
}

export function portfolioShareCaption(
  profile: ShareProfileRow,
  botUsername: string,
  bodyOverride?: unknown,
  bodyOverrideProvided = false,
  localeRaw?: unknown,
  includeDirectLinkOverride?: unknown,
  includeDirectLinkOverrideProvided = false,
): string {
  const theme = profile.theme && typeof profile.theme === "object" ? profile.theme : {};
  const body = resolveShareBody(profile, bodyOverride, bodyOverrideProvided, localeRaw).trim();
  const includeLink = resolveShareIncludeDirectLink(
    theme,
    includeDirectLinkOverride,
    includeDirectLinkOverrideProvided,
  );
  const startLink = portfolioStartAppLink(botUsername, profile.username);
  if (!body) {
    return includeLink ? startLink : "";
  }
  if (!includeLink) return body;
  return `${body}\n\n${startLink}`;
}

export function pickSharePhotoUrl(
  profile: ShareProfileRow,
  webAppUrl: string,
  photoOverride?: string,
): string {
  const banner = `${webAppUrl.replace(/\/$/, "")}/start-banner.jpg`;
  return photoOverride || resolveShareCardUrl(profile) || profile.header_image_url || profile.avatar_url || banner;
}

export interface SharePhotoPayload {
  photoUrl: string;
  thumbUrl: string;
  photoWidth: number;
  photoHeight: number;
  thumbWidth: number;
  thumbHeight: number;
}

export function buildInlinePortfolioResult(
  profile: ShareProfileRow,
  botUsername: string,
  webAppUrl: string,
  media: SharePhotoPayload,
  resultId?: string,
  bodyOverride?: unknown,
  bodyOverrideProvided = false,
  localeRaw?: unknown,
  includeDirectLinkOverride?: unknown,
  includeDirectLinkOverrideProvided = false,
) {
  const theme = profile.theme && typeof profile.theme === "object" ? profile.theme : {};
  const locale = normalizeShareLocale(localeRaw, theme);
  const photoUrl = media.photoUrl;
  const thumbUrl = media.thumbUrl;
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
    : (locale === "en" ? `Portfolio @${profile.username}` : `Моё портфолио @${profile.username}`);

  return {
    type: "photo",
    id: resultId || `portfolio-${profile.username}-${Date.now()}`,
    photo_url: photoUrl,
    thumb_url: thumbUrl,
    photo_width: media.photoWidth,
    photo_height: media.photoHeight,
    title: profile.display_name || profile.username,
    description: bioLine,
    caption,
    reply_markup: {
      inline_keyboard: [[
        {
          text: locale === "en" ? "Open portfolio" : "Открыть портфолио",
          url: miniAppLink,
        },
      ]],
    },
  };
}
