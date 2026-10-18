import type { Profile, TechStackItem } from '../types';
import { useLocale } from '../lib/locale';
import { mergeTheme } from '../lib/theme';
import { resolveShareStatus } from '../lib/shareCardStatus';
import { stripMarkdown } from '../lib/stripMarkdown';
import { ActivityStatus } from './ActivityStatus';
import { ShareCardCover } from './ShareCardCover';
import { ShareCardTechStack } from './ShareCardTechStack';
import { SupporterBadge } from './SupporterBadge';
import { shouldShowSupporterBadge, supporterBadgePlacement, supporterBadgeLabel } from '../lib/supporterBadge';

interface ShareCardProps {
  profile: Profile;
  techStack: TechStackItem[];
  fluid?: boolean;
}

export const SHARE_CARD_WIDTH = 420;
export const SHARE_BIO_MAX_LENGTH = 300;

const COVER_HEIGHT = { sm: 120, md: 160, lg: 200 } as const;
const AVATAR_SIZE = { sm: 64, md: 76, lg: 92 } as const;
const RADIUS = { sm: 10, md: 14, lg: 20 } as const;
const BODY_PADDING = 24;

export function ShareCard({ profile, techStack, fluid = false }: ShareCardProps) {
  const { locale } = useLocale();
  const theme = mergeTheme(profile.theme);
  const coverHeight = COVER_HEIGHT[theme.coverHeight || 'md'];
  const avatarSize = AVATAR_SIZE[theme.avatarSize || 'md'];
  const radius = RADIUS[theme.borderRadius || 'md'];
  const primary = theme.primaryColor || '#6366f1';

  const showPatron = shouldShowSupporterBadge(profile, theme);
  const patronPlacement = supporterBadgePlacement(theme);
  const patronLabel = supporterBadgeLabel(locale);
  const showStatus = theme.showStatus ?? true;
  const showBio = theme.showBio ?? true;
  const showStack = theme.showTechStack ?? true;
  const showStackLabel = theme.showTechStackLabel ?? true;

  const status = resolveShareStatus(profile, theme, locale);
  const bio = showBio && profile.bio
    ? stripMarkdown(profile.bio).slice(0, SHARE_BIO_MAX_LENGTH)
    : '';
  const displayName = profile.display_name || profile.username;
  const avatarOverlap = Math.round(avatarSize / 2) + 8;
  const contentWidth = SHARE_CARD_WIDTH - BODY_PADDING * 2;

  return (
    <div
      className={`share-card-export${fluid ? ' share-card-export--fluid' : ''}`}
      style={{
        width: fluid ? '100%' : SHARE_CARD_WIDTH,
        maxWidth: SHARE_CARD_WIDTH,
        background: '#111111',
        borderRadius: radius,
        overflow: 'hidden',
        border: '1px solid #333333',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        boxSizing: 'border-box',
      }}
    >
      <ShareCardCover
        src={profile.header_image_url}
        height={coverHeight}
        grayscale={theme.headerGrayscale}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          marginTop: -avatarOverlap,
          padding: `0 ${BODY_PADDING}px 28px`,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div
            style={{
              flexShrink: 0,
              padding: 2,
              borderRadius: '50%',
              background: primary,
              lineHeight: 0,
            }}
          >
            {profile.avatar_url ? (
              <img
                data-share-avatar
                src={profile.avatar_url}
                alt={displayName}
                style={{
                  display: 'block',
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: '50%',
                  border: '3px solid #111111',
                  objectFit: 'cover',
                  background: '#1a1a1a',
                }}
              />
            ) : (
              <div
                style={{
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: '50%',
                  border: '3px solid #111111',
                  background: '#1a1a1a',
                  color: '#ffffff',
                  fontSize: 26,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {displayName[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 8,
                fontSize: 22,
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.25,
                marginBottom: 4,
                wordBreak: 'break-word',
              }}
            >
              <span>{displayName}</span>
              {showPatron && patronPlacement === 'username' && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    color: '#f5f5f5',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {patronLabel}
                </span>
              )}
            </div>

            <div
              style={{
                fontSize: 14,
                color: '#a3a3a3',
                lineHeight: 1.4,
                marginBottom: showStatus && status ? 10 : 0,
              }}
            >
              @{profile.username}
            </div>

            {showPatron && patronPlacement === 'status' && (
              <div style={{ marginBottom: showStatus && status ? 8 : 0 }}>
                <SupporterBadge size="sm" />
              </div>
            )}
            {showStatus && status && (
              <div data-share-status style={{ alignSelf: 'flex-start', maxWidth: '100%' }}>
                <ActivityStatus
                  status={profile.activity_status || 'online'}
                  message={profile.activity_message}
                  customEmoji={theme.customStatusEmoji}
                  size="sm"
                  capture
                />
              </div>
            )}
          </div>
        </div>

        {bio && (
          <div
            style={{
              marginTop: 14,
              fontSize: 15,
              color: '#a3a3a3',
              lineHeight: 1.65,
              wordBreak: 'break-word',
            }}
          >
            {bio}
          </div>
        )}

        {showStack && techStack.length > 0 && (
          <ShareCardTechStack
            items={techStack}
            maxWidth={contentWidth}
            showLabel={showStackLabel}
          />
        )}
      </div>
    </div>
  );
}
