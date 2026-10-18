import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, Code2 } from 'lucide-react';
import { getTelegramUser, haptic, getTelegramWebApp } from '../lib/telegram';
import { ShareProfileButton } from '../components/ShareProfileButton';
import {
  getMyProfile,
  updateProfile,
  saveTechStack,
  saveSections,
  withTimeout,
} from '../lib/api';
import { fetchReadmeFromUrl, normalizeReadmeContent, parseReadmeUrl } from '../lib/github';
import { useLocale } from '../lib/locale';
import { mergeTheme, buildProfileUpdate, withThemeUpdate } from '../lib/theme';
import { buildDefaultShareBody } from '../lib/shareCaption';
import type { Profile, TechStackItem, PortfolioSection } from '../types';
import { ImageUrlField } from '../components/ImageUrlField';
import { BioEditor } from '../components/BioEditor';
import { TechStackEditor } from '../components/TechStackEditor';
import { ProfileCard } from '../components/ProfileCard';
import { ShareCard } from '../components/ShareCard';
import { ShareCardPreview } from '../components/ShareCardPreview';
import { ProfileDesigner } from '../components/ProfileDesigner';
import { LangSwitcher } from '../components/LangSwitcher';
import { CustomCheckbox } from '../components/CustomCheckbox';

type EditorTab = 'profile' | 'design' | 'stack';

const TAB_INDEX: Record<EditorTab, number> = {
  profile: 0,
  design: 1,
  stack: 2,
};

const tabMotion = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
  transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const },
};

export function Editor() {
  const navigate = useNavigate();
  const { t, locale } = useLocale();
  const tabs: { id: EditorTab; label: string }[] = [
    { id: 'profile', label: t('tabContent') },
    { id: 'design', label: t('tabDesign') },
    { id: 'stack', label: t('tabSkills') },
  ];
  const user = getTelegramUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [techStack, setTechStack] = useState<TechStackItem[]>([]);
  const [sections, setSections] = useState<PortfolioSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<'profile' | 'share'>('profile');
  const [activeTab, setActiveTab] = useState<EditorTab>('profile');
  const [readmeUrl, setReadmeUrl] = useState('');
  const [readmeLoading, setReadmeLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const tg = getTelegramWebApp();
    if (tg) {
      tg.BackButton.show();
      const handler = () => navigate('/');
      tg.BackButton.onClick(handler);
      return () => tg.BackButton.offClick(handler);
    }
  }, [navigate]);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    if (!user) {
      setLoading(false);
      navigate('/onboarding');
      return;
    }
    try {
      const { profile: p, techStack: stack, sections: secs } = await withTimeout(
        getMyProfile(),
        8000,
        { profile: null, techStack: [], sections: [] }
      );
      if (!p) {
        navigate('/onboarding');
        return;
      }
      setProfile({ ...p, theme: mergeTheme(p.theme) });
      setTechStack(stack);
      setSections(secs);
    } catch {
      navigate('/onboarding');
    } finally {
      setLoading(false);
    }
  }

  const handleSave = useCallback(async () => {
    if (!profile) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const updated = await updateProfile(buildProfileUpdate(profile, locale));
      setProfile({ ...updated, theme: mergeTheme(updated.theme) });

      await Promise.all([
        saveTechStack(techStack.map(({ id, profile_id, ...rest }) => rest)),
        saveSections(sections.map(({ id, profile_id, ...rest }) => rest)),
      ]);

      setSaveMessage({ type: 'success', text: t('saved') });
      haptic('success');

      void withTimeout(getMyProfile(), 8000, { profile: null, techStack: [], sections: [] }).then((fresh) => {
        if (fresh.profile) {
          setProfile({ ...fresh.profile, theme: mergeTheme(fresh.profile.theme) });
          setTechStack(fresh.techStack);
          setSections(fresh.sections);
        }
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : t('saveFailed');
      setSaveMessage({ type: 'error', text });
      haptic('error');
    } finally {
      setSaving(false);
    }
  }, [profile, techStack, sections, t, locale]);

  const importReadmeFromUrl = async () => {
    if (!profile || !parseReadmeUrl(readmeUrl)) return;
    setReadmeLoading(true);
    setSaveMessage(null);
    const readme = await fetchReadmeFromUrl(readmeUrl);
    if (readme) {
      const mediaBase = readme.owner && readme.repo
        ? { owner: readme.owner, repo: readme.repo, branch: readme.branch }
        : undefined;
      setProfile(withThemeUpdate(
        {
          ...profile,
          github_readme: normalizeReadmeContent(readme.content, mediaBase),
          github_username: readme.owner || profile.github_username,
        },
        mediaBase
          ? { readmeSource: { owner: mediaBase.owner, repo: mediaBase.repo, branch: mediaBase.branch } }
          : {},
      ));
      haptic('success');
    } else {
      setSaveMessage({ type: 'error', text: t('readmeImportFailed') });
      haptic('error');
    }
    setReadmeLoading(false);
  };

  if (loading) {
    return (
      <div className="page page--center">
        <LangSwitcher />
        <div className="loader" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const theme = mergeTheme(profile.theme);

  if (preview) {
    return (
      <div className="page editor-preview">
        <header className="editor-preview__header">
          <button
            type="button"
            className="btn-primary editor-preview__back"
            onClick={() => setPreview(false)}
          >
            {t('backToEditor')}
          </button>
          <LangSwitcher className="lang-switcher--inline" />
        </header>
        <div className="editor-preview__bar">
          <div className="segmented-control editor-preview__toggle">
            <button
              type="button"
              className={previewMode === 'profile' ? 'active' : ''}
              onClick={() => setPreviewMode('profile')}
            >
              {t('previewProfile')}
            </button>
            <button
              type="button"
              className={previewMode === 'share' ? 'active' : ''}
              onClick={() => setPreviewMode('share')}
            >
              {t('previewCard')}
            </button>
          </div>
        </div>
        {previewMode === 'profile' ? (
          <ProfileCard profile={profile} techStack={techStack} sections={sections} />
        ) : (
          <ShareCardPreview
            profile={profile}
            techStack={techStack}
            className="share-card-preview share-card-preview--page"
          />
        )}
      </div>
    );
  }

  return (
    <div className="page editor-page">
      <header className="editor-header">
        <button
          type="button"
          className="btn-primary editor-header__save"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? t('saving') : t('save')}
        </button>
        <div className="editor-header__actions">
          <button type="button" className="btn-icon" onClick={() => setPreview(true)} title={t('preview')}>
            <Eye size={20} />
          </button>
          <ShareProfileButton
            username={profile.username}
            displayName={profile.display_name || profile.username}
            shareMessage={mergeTheme(profile.theme).shareMessage ?? ''}
            shareIncludeDirectLink={mergeTheme(profile.theme).shareIncludeDirectLink !== false}
            className="btn-icon"
            variant="icon"
            title={t('share')}
          />
          <LangSwitcher className="lang-switcher--inline" />
        </div>
      </header>

      <AnimatePresence mode="wait">
        {saveMessage && (
          <motion.p
            key={saveMessage.text}
            className={`editor-save-message editor-save-message--${saveMessage.type}`}
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {saveMessage.text}
          </motion.p>
        )}
      </AnimatePresence>

      <nav
        className="editor-tabs"
        role="tablist"
        style={{ '--tab-index': TAB_INDEX[activeTab] } as React.CSSProperties}
      >
        <span className="editor-tabs__pill" aria-hidden="true" />
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`editor-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="editor-content">
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && (
            <motion.div key="profile" className="editor-section" {...tabMotion}>
              <ImageUrlField
                label={t('labelHeaderImage')}
                placeholder={t('placeholderImageUrl')}
                value={profile.header_image_url}
                invalidMessage={t('invalidImageUrl')}
                variant="header"
                onChange={(url) => setProfile({ ...profile, header_image_url: url })}
              />

              <ImageUrlField
                label={t('labelAvatarImage')}
                placeholder={t('placeholderImageUrl')}
                value={profile.avatar_url}
                invalidMessage={t('invalidImageUrl')}
                variant="avatar"
                onChange={(url) => setProfile({ ...profile, avatar_url: url })}
              />

              <div className="form-group">
                <label>{t('labelDisplayName')}</label>
                <input
                  type="text"
                  value={profile.display_name || ''}
                  onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>{t('labelBio')}</label>
                <BioEditor
                  value={profile.bio}
                  invalidMessage={t('invalidImageUrl')}
                  onChange={(bio) => setProfile({ ...profile, bio })}
                />
                <div className="toggle-row toggle-row--form">
                  <span>{t('shareIncludeDirectLink')}</span>
                  <CustomCheckbox
                    checked={mergeTheme(profile.theme).shareIncludeDirectLink !== false}
                    onChange={(checked) => setProfile(
                      withThemeUpdate(profile, { shareIncludeDirectLink: checked }),
                    )}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t('labelShareMessage')}</label>
                <textarea
                  rows={5}
                  maxLength={900}
                  placeholder={buildDefaultShareBody(
                    profile.display_name || profile.username,
                    profile.username,
                    locale,
                  )}
                  value={mergeTheme(profile.theme).shareMessage ?? ''}
                  onChange={(e) => setProfile(withThemeUpdate(profile, { shareMessage: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>{t('labelWebsite')}</label>
                <input
                  type="text"
                  placeholder={t('placeholderWebsite')}
                  value={profile.social_links?.website || ''}
                  onChange={(e) => setProfile({
                    ...profile,
                    social_links: { ...profile.social_links, website: e.target.value },
                  })}
                />
              </div>

              <div className="form-group">
                <label>{t('labelReadmeUrl')}</label>
                <div className="input-with-action">
                  <input
                    type="url"
                    value={readmeUrl}
                    onChange={(e) => setReadmeUrl(e.target.value)}
                    placeholder={t('placeholderReadmeUrl')}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={importReadmeFromUrl}
                    disabled={!parseReadmeUrl(readmeUrl) || readmeLoading}
                  >
                    <Code2 size={16} />
                    {readmeLoading ? t('loading') : t('importReadme')}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>{t('socialLinks')}</label>
                <input
                  type="url"
                  placeholder={t('placeholderGithubUrl')}
                  value={profile.social_links?.github || ''}
                  onChange={(e) => setProfile({
                    ...profile,
                    social_links: { ...profile.social_links, github: e.target.value },
                  })}
                />
                <input
                  type="url"
                  placeholder={t('placeholderLinkedinUrl')}
                  value={profile.social_links?.linkedin || ''}
                  onChange={(e) => setProfile({
                    ...profile,
                    social_links: { ...profile.social_links, linkedin: e.target.value },
                  })}
                  style={{ marginTop: 8 }}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'stack' && (
            <motion.div key="stack" className="editor-section" {...tabMotion}>
              <h2>{t('skillsTitle')}</h2>
              <TechStackEditor
                items={techStack}
                onChange={setTechStack}
                defaultBadgeSize={theme.techBadgeSize}
                onDefaultBadgeSizeChange={(size) => setProfile(withThemeUpdate(profile, { techBadgeSize: size }))}
                showTechStackLabel={theme.showTechStackLabel ?? true}
                onShowTechStackLabelChange={(checked) => setProfile(
                  withThemeUpdate(profile, { showTechStackLabel: checked }),
                )}
              />
            </motion.div>
          )}

          {activeTab === 'design' && (
            <motion.div key="design" {...tabMotion}>
              <ProfileDesigner
                profile={profile}
                techStack={techStack}
                sections={sections}
                onChange={setProfile}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="card-capture-host" aria-hidden="true">
        <ShareCard profile={profile} techStack={techStack} />
      </div>
    </div>
  );
}
