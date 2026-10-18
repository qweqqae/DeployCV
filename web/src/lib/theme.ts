import type { Locale } from './i18n';
import type { Profile, ProfileFonts, ProfileTheme } from '../types';
import { DEFAULT_THEME } from '../types';
import { resolveFontFamily } from './fonts';
import { sanitizeShareBody } from './shareCaption';

export function mergeTheme(theme?: ProfileTheme | string | null): ProfileTheme {
  let parsed: ProfileTheme | null = null;

  if (typeof theme === 'string') {
    try {
      parsed = JSON.parse(theme) as ProfileTheme;
    } catch {
      parsed = null;
    }
  } else if (theme && typeof theme === 'object') {
    parsed = theme;
  }

  const merged = { ...DEFAULT_THEME, ...(parsed || {}) };
  merged.fonts = { ...DEFAULT_THEME.fonts, ...(parsed?.fonts || {}) };
  return merged;
}

export function withThemeUpdate(profile: Profile, patch: Partial<ProfileTheme>): Profile {
  const current = mergeTheme(profile.theme);
  const next: ProfileTheme = { ...current, ...patch };

  if (patch.fonts) {
    next.fonts = { ...current.fonts, ...patch.fonts };
  }

  return { ...profile, theme: next };
}

export function buildProfileUpdate(profile: Profile, uiLocale?: Locale) {
  const theme = mergeTheme(profile.theme);
  const shareMessage = sanitizeShareBody(theme.shareMessage);
  if (shareMessage) {
    theme.shareMessage = shareMessage;
  } else {
    delete theme.shareMessage;
  }
  if (uiLocale === 'en' || uiLocale === 'ru') {
    theme.uiLocale = uiLocale;
  }

  return {
    display_name: profile.display_name,
    bio: profile.bio,
    avatar_url: profile.avatar_url,
    header_image_url: profile.header_image_url,
    activity_status: profile.activity_status,
    activity_message: profile.activity_message,
    github_username: profile.github_username,
    github_readme: profile.github_readme,
    theme,
    social_links: profile.social_links || {},
    is_public: profile.is_public,
  };
}

function resolveElementFont(theme: ProfileTheme, key: keyof ProfileFonts): string {
  const fontId = theme.fonts?.[key] || theme.fontFamily;
  return resolveFontFamily(fontId).family;
}

export function themeToCssVars(theme: ProfileTheme): Record<string, string> {
  const radiusMap = { sm: '10px', md: '14px', lg: '20px' };
  const avatarMap = { sm: '64px', md: '76px', lg: '92px' };
  const coverMap = { sm: '120px', md: '160px', lg: '200px' };
  const githubSpacingMap = { none: '0px', sm: '8px', md: '16px', lg: '24px', xl: '32px' };
  const defaultFont = resolveFontFamily(theme.fontFamily);

  return {
    '--profile-primary': theme.primaryColor,
    '--profile-radius': radiusMap[theme.borderRadius || 'md'],
    '--profile-avatar-size': avatarMap[theme.avatarSize || 'md'],
    '--profile-cover-height': coverMap[theme.coverHeight || 'md'],
    '--profile-github-padding': githubSpacingMap[theme.githubBlockPadding || 'md'],
    '--profile-font-family': defaultFont.family,
    '--profile-font-heading': defaultFont.headingFamily || defaultFont.family,
    '--profile-font-display': resolveElementFont(theme, 'displayName'),
    '--profile-font-username': resolveElementFont(theme, 'username'),
    '--profile-font-status': resolveElementFont(theme, 'status'),
    '--profile-font-bio': resolveElementFont(theme, 'bio'),
    '--profile-font-section': resolveElementFont(theme, 'heading'),
  };
}
