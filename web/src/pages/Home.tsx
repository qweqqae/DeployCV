import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Pencil } from 'lucide-react';
import { getTelegramUser, initTelegramApp } from '../lib/telegram';
import { ShareProfileButton } from '../components/ShareProfileButton';
import { getMyProfile, withTimeout } from '../lib/api';
import { mergeTheme } from '../lib/theme';
import { useLocale } from '../lib/locale';
import { LangSwitcher } from '../components/LangSwitcher';
import { ShareCard } from '../components/ShareCard';
import type { Profile, TechStackItem } from '../types';

export function Home() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [techStack, setTechStack] = useState<TechStackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initTelegramApp();

    const user = getTelegramUser();
    if (!user) {
      setLoading(false);
      return;
    }

    withTimeout(
      getMyProfile(),
      8000,
      { profile: null, techStack: [], sections: [] }
    )
      .then((result) => {
        if (result.profile) {
          setProfile({ ...result.profile, theme: mergeTheme(result.profile.theme) });
          setTechStack(result.techStack || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page page--center home-page">
        <LangSwitcher />
        <div className="loader" />
      </div>
    );
  }

  if (profile) {
    const theme = mergeTheme(profile.theme);
    const displayName = profile.display_name || profile.username;

    return (
      <div className="page home-page home-page--dashboard">
        <LangSwitcher />

        <div className="home-dashboard">
          <article
            className="home-profile-banner glass-card-glow"
            style={{ '--profile-primary': theme.primaryColor } as React.CSSProperties}
          >
            <div className="home-profile-banner__header">
              {profile.header_image_url ? (
                <img
                  src={profile.header_image_url}
                  alt=""
                  className={`home-profile-banner__cover${theme.headerGrayscale ? ' home-profile-banner__cover--bw' : ''}`}
                />
              ) : (
                <div className="home-profile-banner__cover home-profile-banner__cover--gradient" />
              )}
              <div className="home-profile-banner__overlay" />
            </div>

            <div className="home-profile-banner__body">
              <div className="home-profile-banner__avatar-wrap">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="home-profile-banner__avatar" />
                ) : (
                  <div className="home-profile-banner__avatar home-profile-banner__avatar--placeholder">
                    {displayName[0].toUpperCase()}
                  </div>
                )}
              </div>
              <h1 className="home-profile-banner__name">{displayName}</h1>
              <p className="home-profile-banner__username">@{profile.username}</p>
            </div>
          </article>

          <div className="home-dashboard__actions">
            <ShareProfileButton
              username={profile.username}
              displayName={displayName}
              shareMessage={mergeTheme(profile.theme).shareMessage ?? ''}
              shareIncludeDirectLink={mergeTheme(profile.theme).shareIncludeDirectLink !== false}
              className="btn-primary btn-large"
            />
            <button
              type="button"
              className="btn-secondary btn-large"
              onClick={() => navigate('/editor')}
            >
              <Pencil size={18} />
              {t('editProfile')}
            </button>
          </div>
        </div>

        <div className="card-capture-host" aria-hidden="true">
          <ShareCard profile={{ ...profile, theme }} techStack={techStack} />
        </div>
      </div>
    );
  }

  return (
    <div className="page home-page">
      <LangSwitcher />

      <div className="home-page__center">
        <div className="hero">
          <h1 className="hero__title reveal reveal--1">
            {t('homeTitle1')}{' '}
            <span className="hero__accent">{t('homeTitle2')}</span>,<br />
            {t('homeTitle3')}
          </h1>

          <p className="hero__subtitle reveal reveal--2">{t('homeSubtitle')}</p>

          <button className="btn-primary btn-large reveal reveal--3" onClick={() => navigate('/onboarding')}>
            {t('createPortfolio')}
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
