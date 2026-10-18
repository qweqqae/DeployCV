import type { Profile, TechStackItem, PortfolioSection } from '../types';
import { ActivityStatus } from './ActivityStatus';
import { TechBadge } from './TechBadge';
import { ReadmeProfile } from './ReadmeProfile';
import { useLocale } from '../lib/locale';
import { ReadmeContent } from './ReadmeContent';
import { mergeTheme, themeToCssVars } from '../lib/theme';
import { getReadmeMediaBase } from '../lib/readmeMedia';
import { displayUrl, normalizeUrl, sanitizeHttpUrl } from '../lib/urls';
import { Globe, Send } from 'lucide-react';
import { GitHubIcon, LinkedInIcon } from './BrandIcon';
import { SupporterBadge } from './SupporterBadge';
import { shouldShowSupporterBadge, supporterBadgePlacement } from '../lib/supporterBadge';

interface ProfileCardProps {
  profile: Profile;
  techStack: TechStackItem[];
  sections: PortfolioSection[];
  variant?: 'horizontal' | 'vertical';
  capture?: boolean;
}

function partClass(capture: boolean, revealStep?: number) {
  if (capture) return '';
  return revealStep ? `reveal reveal--${revealStep}` : 'reveal';
}

export function ProfileCard({ profile, techStack, sections, variant, capture = false }: ProfileCardProps) {
  const { t } = useLocale();
  const theme = mergeTheme(profile.theme);
  const displayMode = theme.displayMode || 'card';

  if (displayMode === 'readme') {
    return <ReadmeProfile profile={{ ...profile, theme }} techStack={techStack} sections={sections} />;
  }
  const cardStyle = variant || theme.cardStyle || 'horizontal';
  const website = profile.social_links?.website?.trim();
  const defaultBadgeSize = theme.techBadgeSize || 'md';

  const showPatron = shouldShowSupporterBadge(profile, theme);
  const patronPlacement = supporterBadgePlacement(theme);
  const showStatus = theme.showStatus ?? true;
  const showBio = theme.showBio ?? true;
  const showTechStack = theme.showTechStack ?? true;
  const showGithub = theme.showGithub ?? true;
  const showBlockBackground = theme.blockBackground ?? true;
  const blockSurfaceClass = showBlockBackground ? 'glass-inner' : 'profile-card__block--plain';
  const mediaBase = getReadmeMediaBase(profile);

  return (
    <div
      className={`profile-card glass-card-glow profile-card--${cardStyle}${capture ? ' profile-card--capture' : ''} ${partClass(capture)}`}
      style={themeToCssVars(theme) as React.CSSProperties}
    >
      <div className={`profile-card__header ${partClass(capture, 1)}`} data-capture-part="header">
        {profile.header_image_url ? (
          <img
            src={profile.header_image_url}
            alt=""
            className={`profile-card__cover${theme.headerGrayscale ? ' profile-card__cover--bw' : ''}`}
          />
        ) : (
          <div className="profile-card__cover profile-card__cover--gradient">
            <div className="profile-card__cover-mesh" />
          </div>
        )}
        <div className="profile-card__header-overlay" />
        <div className="profile-card__avatar-wrap">
          <div className="profile-card__avatar-ring">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name || ''} className="profile-card__avatar" />
            ) : (
              <div className="profile-card__avatar profile-card__avatar--placeholder">
                {(profile.display_name || profile.username)[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="profile-card__body">
        <div className={`profile-card__info ${partClass(capture, 2)}`} data-capture-part="meta">
          <div className="profile-card__meta">
            <div className="profile-card__name-row">
              <h1 className="profile-card__name">{profile.display_name || profile.username}</h1>
              {showPatron && patronPlacement === 'username' && (
                <SupporterBadge size="sm" />
              )}
            </div>
            <p className="profile-card__username">@{profile.username}</p>
            {showPatron && patronPlacement === 'status' && (
              <div className="profile-card__patron-status">
                <SupporterBadge size="sm" />
              </div>
            )}
            {showStatus && (
              <ActivityStatus
                status={profile.activity_status}
                message={profile.activity_message}
                customEmoji={theme.customStatusEmoji}
                capture={capture}
              />
            )}
          </div>
          {showBio && profile.bio && (
            <div className="profile-card__bio" data-capture-part="bio">
              <ReadmeContent content={profile.bio} mediaBase={mediaBase} />
            </div>
          )}
          {website && (
            <p className="profile-card__website" data-capture-part="website">
              <Globe size={14} />
              <span className="profile-card__website-label">{t('websiteLabel')}</span>
              <a
                href={normalizeUrl(website)}
                target="_blank"
                rel="noopener noreferrer"
                className="profile-card__website-link"
              >
                {displayUrl(website)}
              </a>
            </p>
          )}
        </div>

        {showTechStack && techStack.length > 0 && (
          <div className={`profile-card__block ${blockSurfaceClass} ${partClass(capture, 3)}`} data-capture-part="stack">
            <h3 className="section-title">{t('skillsLabel')}</h3>
            <div className="tech-stack-grid">
              {techStack.map((item) => (
                <TechBadge
                  key={item.id}
                  item={item}
                  size={item.badge_size || defaultBadgeSize}
                />
              ))}
            </div>
          </div>
        )}

        {showGithub && profile.github_readme && (
          <div className={`profile-card__block profile-card__github-block ${blockSurfaceClass} ${partClass(capture, 4)}`} data-capture-part="github">
            <h3 className="section-title">
              <GitHubIcon size={15} /> GitHub
            </h3>
            <ReadmeContent content={profile.github_readme} mediaBase={mediaBase} />
          </div>
        )}

        {sections.filter((s) => s.is_visible).map((section, i) => (
          <div
            key={section.id}
            className={`profile-card__block ${blockSurfaceClass} ${partClass(capture, Math.min(i + 5, 5))}`}
            data-capture-part="sections"
          >
            <h3 className="section-title">{section.title}</h3>
            {section.content && <ReadmeContent content={section.content} mediaBase={mediaBase} />}
          </div>
        ))}

        {profile.social_links && (profile.social_links.github || profile.social_links.telegram || profile.social_links.linkedin) && (
          <div className={`profile-card__social ${partClass(capture, 5)}`} data-capture-part="social">
            {sanitizeHttpUrl(profile.social_links.github) && (
              <a href={sanitizeHttpUrl(profile.social_links.github)!} target="_blank" rel="noopener noreferrer" className="social-link" aria-label="GitHub">
                <GitHubIcon size={18} />
              </a>
            )}
            {sanitizeHttpUrl(profile.social_links.telegram) && (
              <a href={sanitizeHttpUrl(profile.social_links.telegram)!} target="_blank" rel="noopener noreferrer" className="social-link">
                <Send size={18} />
              </a>
            )}
            {sanitizeHttpUrl(profile.social_links.linkedin) && (
              <a href={sanitizeHttpUrl(profile.social_links.linkedin)!} target="_blank" rel="noopener noreferrer" className="social-link" aria-label="LinkedIn">
                <LinkedInIcon size={18} />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
