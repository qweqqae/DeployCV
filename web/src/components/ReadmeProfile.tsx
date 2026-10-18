import type { Profile, TechStackItem, PortfolioSection } from '../types';
import { ActivityStatus } from './ActivityStatus';
import { TechBadge } from './TechBadge';
import { ReadmeContent } from './ReadmeContent';
import { useLocale } from '../lib/locale';
import { displayUrl, normalizeUrl } from '../lib/urls';
import { mergeTheme, themeToCssVars } from '../lib/theme';
import { getReadmeMediaBase } from '../lib/readmeMedia';
import { SupporterBadge } from './SupporterBadge';
import { shouldShowSupporterBadge, supporterBadgePlacement } from '../lib/supporterBadge';

interface ReadmeProfileProps {
  profile: Profile;
  techStack: TechStackItem[];
  sections: PortfolioSection[];
}

export function ReadmeProfile({ profile, techStack, sections }: ReadmeProfileProps) {
  const { t } = useLocale();
  const theme = mergeTheme(profile.theme);
  const website = profile.social_links?.website?.trim();
  const showPatron = shouldShowSupporterBadge(profile, theme);
  const patronPlacement = supporterBadgePlacement(theme);
  const showStatus = theme.showStatus ?? true;
  const showTechStack = theme.showTechStack ?? true;
  const showBio = theme.showBio ?? true;
  const showBlockBackground = theme.blockBackground ?? true;
  const readme = profile.github_readme || sections.find((s) => s.is_visible)?.content || (showBio ? profile.bio : '') || '';
  const mediaBase = getReadmeMediaBase(profile);

  return (
    <article
      className={`readme-profile reveal${showBlockBackground ? '' : ' readme-profile--plain-blocks'}`}
      style={themeToCssVars(theme) as React.CSSProperties}
    >
      <header className="readme-profile__header reveal reveal--1">
        <div className="readme-profile__avatar-wrap">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="readme-profile__avatar" />
          ) : (
            <div className="readme-profile__avatar readme-profile__avatar--placeholder">
              {(profile.display_name || profile.username)[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="readme-profile__meta">
          <div className="readme-profile__name-row">
            <h1 className="readme-profile__name">{profile.display_name || profile.username}</h1>
            {showPatron && patronPlacement === 'username' && (
              <SupporterBadge size="sm" />
            )}
          </div>
          <p className="readme-profile__username">@{profile.username}</p>
          {showPatron && patronPlacement === 'status' && (
            <div className="readme-profile__patron-status">
              <SupporterBadge size="sm" />
            </div>
          )}
          {showStatus && (
            <ActivityStatus
              status={profile.activity_status}
              message={profile.activity_message}
              customEmoji={theme.customStatusEmoji}
            />
          )}
          {website && (
            <p className="readme-profile__website">
              {t('websiteLabel')}{' '}
              <a href={normalizeUrl(website)} target="_blank" rel="noopener noreferrer">
                {displayUrl(website)}
              </a>
            </p>
          )}
        </div>
      </header>

      {showTechStack && techStack.length > 0 && (
        <div className="readme-profile__stack reveal reveal--2">
          <div className="tech-stack-grid">
            {techStack.map((item) => (
              <TechBadge
                key={item.id}
                item={item}
                size={item.badge_size || profile.theme?.techBadgeSize || 'md'}
              />
            ))}
          </div>
        </div>
      )}

      {readme && (
        <div className="readme-profile__content reveal reveal--3">
          <ReadmeContent content={readme} className="markdown-content readme-profile__markdown" mediaBase={mediaBase} />
        </div>
      )}

      {sections.filter((s) => s.is_visible && s.content).map((section, i) => (
        <div key={section.id} className={`readme-profile__section reveal reveal--${Math.min(i + 4, 5)}`}>
          <h2 className="readme-profile__section-title">{section.title}</h2>
          <ReadmeContent content={section.content || ''} mediaBase={mediaBase} />
        </div>
      ))}
    </article>
  );
}
