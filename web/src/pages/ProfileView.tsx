import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProfileByUsername, getTechStack, getSections } from '../lib/supabase';
import { initTelegramApp } from '../lib/telegram';
import { ShareProfileButton } from '../components/ShareProfileButton';
import type { Profile, TechStackItem, PortfolioSection } from '../types';
import { ProfileCard } from '../components/ProfileCard';
import { ShareCard } from '../components/ShareCard';
import { mergeTheme } from '../lib/theme';
import { useLocale } from '../lib/locale';

export function ProfileView() {
  const { t } = useLocale();
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [techStack, setTechStack] = useState<TechStackItem[]>([]);
  const [sections, setSections] = useState<PortfolioSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    initTelegramApp();
    loadProfile();
  }, [username]);

  async function loadProfile() {
    if (!username) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      const p = await Promise.race([
        getProfileByUsername(username),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
      ]);

      if (!p) {
        setNotFound(true);
        return;
      }

      setProfile(p);
      const [stack, secs] = await Promise.all([
        getTechStack(p.id),
        getSections(p.id),
      ]);
      setTechStack(stack);
      setSections(secs);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="page page--center">
        <div className="loader" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="page page--center">
        <div className="not-found">
          <h1>{t('profileNotFound')}</h1>
          <p>@{username} {t('profileNotFoundDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page profile-view-page">
      <div className="profile-view__actions">
        <ShareProfileButton
          username={profile.username}
          displayName={profile.display_name || profile.username}
          className="btn-primary"
        />
      </div>
      <ProfileCard profile={profile} techStack={techStack} sections={sections} />

      <div className="card-capture-host" aria-hidden="true">
        <ShareCard profile={{ ...profile, theme: mergeTheme(profile.theme) }} techStack={techStack} />
      </div>
    </div>
  );
}
