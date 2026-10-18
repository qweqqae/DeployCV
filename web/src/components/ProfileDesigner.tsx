import type { Profile, TechStackItem, PortfolioSection } from '../types';
import { ACTIVITY_STATUSES } from '../types';
import { useState } from 'react';
import { ProfileCard } from './ProfileCard';
import { ShareCardPreview } from './ShareCardPreview';
import { CustomCheckbox } from './CustomCheckbox';
import { mergeTheme, withThemeUpdate } from '../lib/theme';
import type { ProfileFonts } from '../types';
import { FontPickerRow } from './FontPickerRow';
import { ColorPickerField } from './ColorPickerField';
import { useLocale } from '../lib/locale';
import { getGithubPaddingLabel, getSizeLabel, getStatusLabel } from '../lib/i18n';
import { QUICK_COLOR_PRESETS } from '../lib/colorPresets';

interface ProfileDesignerProps {
  profile: Profile;
  techStack: TechStackItem[];
  sections: PortfolioSection[];
  onChange: (profile: Profile) => void;
}

export function ProfileDesigner({ profile, techStack, sections, onChange }: ProfileDesignerProps) {
  const { t, locale } = useLocale();
  const [previewMode, setPreviewMode] = useState<'profile' | 'share'>('profile');
  const theme = mergeTheme(profile.theme);

  const setTheme = (patch: Partial<typeof theme>) => {
    onChange(withThemeUpdate(profile, patch));
  };

  const selectStatus = (value: string) => {
    onChange({
      ...profile,
      activity_status: value,
      activity_message: value === 'custom' ? (profile.activity_message || '') : null,
    });
  };

  return (
    <div className="profile-designer">
      <div className="profile-designer__preview">
        <div className="profile-designer__preview-head">
          <p className="profile-designer__preview-label">{t('designerPreview')}</p>
          <div className="segmented-control profile-designer__preview-toggle">
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
        <div className={`profile-designer__preview-frame${previewMode === 'share' ? ' profile-designer__preview-frame--share' : ''}`}>
          {previewMode === 'profile' ? (
            <ProfileCard profile={{ ...profile, theme }} techStack={techStack} sections={sections} />
          ) : (
            <ShareCardPreview profile={{ ...profile, theme }} techStack={techStack} />
          )}
        </div>
      </div>

      <div className="profile-designer__panels">
        <section className="designer-panel">
          <h3 className="designer-panel__title">{t('designerStatus')}</h3>
          <div className="status-chip-grid">
            {ACTIVITY_STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`status-chip${profile.activity_status === s.value ? ' status-chip--active' : ''}`}
                onClick={() => selectStatus(s.value)}
              >
                {s.emoji ? <span className="status-chip__emoji">{s.emoji}</span> : null}
                <span className="status-chip__label">{getStatusLabel(locale, s.value)}</span>
              </button>
            ))}
          </div>

          {profile.activity_status === 'custom' && (
            <div className="designer-custom-status">
              <div className="form-group">
                <label>{t('designerEmojiOptional')}</label>
                <div className="emoji-input-row">
                  <input
                    type="text"
                    value={theme.customStatusEmoji ?? ''}
                    onChange={(e) => setTheme({ customStatusEmoji: e.target.value })}
                    placeholder=""
                    maxLength={8}
                  />
                  {(theme.customStatusEmoji ?? '').length > 0 && (
                    <button
                      type="button"
                      className="emoji-input-row__clear"
                      onClick={() => setTheme({ customStatusEmoji: '' })}
                      aria-label="Clear emoji"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>{t('designerStatusText')}</label>
                <input
                  type="text"
                  value={profile.activity_message || ''}
                  onChange={(e) => onChange({ ...profile, activity_message: e.target.value })}
                  placeholder={t('designerStatusPlaceholder')}
                />
              </div>
            </div>
          )}
        </section>

        <section className="designer-panel">
          <h3 className="designer-panel__title">{t('designerTypography')}</h3>
          <FontPickerRow
            label={t('designerDefault')}
            value={theme.fontFamily}
            onChange={(fontId) => setTheme({ fontFamily: fontId || 'space-grotesk' })}
          />
          {([
            ['displayName', t('designerFontDisplayName')],
            ['username', t('designerFontUsername')],
            ['status', t('designerFontStatus')],
            ['bio', t('designerFontBio')],
            ['heading', t('designerFontHeading')],
          ] as [keyof ProfileFonts, string][]).map(([key, label]) => (
            <FontPickerRow
              key={key}
              label={label}
              value={theme.fonts?.[key]}
              allowInherit
              onChange={(fontId) => {
                const fonts = { ...theme.fonts };
                if (fontId) fonts[key] = fontId;
                else delete fonts[key];
                setTheme({ fonts });
              }}
            />
          ))}
        </section>

        <section className="designer-panel">
          <h3 className="designer-panel__title">{t('designerColors')}</h3>
          <div className="color-swatch-grid">
            {QUICK_COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                className={`color-swatch${theme.primaryColor === color ? ' color-swatch--active' : ''}`}
                style={{ background: color }}
                onClick={() => setTheme({ primaryColor: color })}
                aria-label={color}
              />
            ))}
          </div>
          <ColorPickerField
            value={theme.primaryColor}
            onChange={(color) => setTheme({ primaryColor: color })}
          />
        </section>

        <section className="designer-panel">
          <h3 className="designer-panel__title">{t('designerShapeSize')}</h3>

          <div className="form-group">
            <label>{t('designerCornerRadius')}</label>
            <div className="segmented-control">
              {(['sm', 'md', 'lg'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={(theme.borderRadius || 'md') === v ? 'active' : ''}
                  onClick={() => setTheme({ borderRadius: v })}
                >
                  {getSizeLabel(locale, v)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>{t('designerAvatarSize')}</label>
            <div className="segmented-control">
              {(['sm', 'md', 'lg'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={(theme.avatarSize || 'md') === v ? 'active' : ''}
                  onClick={() => setTheme({ avatarSize: v })}
                >
                  {getSizeLabel(locale, v)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>{t('designerCoverHeight')}</label>
            <div className="segmented-control">
              {(['sm', 'md', 'lg'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={(theme.coverHeight || 'md') === v ? 'active' : ''}
                  onClick={() => setTheme({ coverHeight: v })}
                >
                  {getSizeLabel(locale, v)}
                </button>
              ))}
            </div>
          </div>

          <div className="toggle-row">
            <span>{t('designerBwBanner')}</span>
            <CustomCheckbox
              checked={theme.headerGrayscale ?? false}
              onChange={(checked) => setTheme({ headerGrayscale: checked })}
            />
          </div>
        </section>

        <section className="designer-panel">
          <h3 className="designer-panel__title">{t('designerVisibility')}</h3>
          <div className="toggle-row">
            <span>{t('designerShowStatus')}</span>
            <CustomCheckbox
              checked={theme.showStatus ?? true}
              onChange={(checked) => setTheme({ showStatus: checked })}
            />
          </div>
          <div className="toggle-row">
            <span>{t('designerShowBio')}</span>
            <CustomCheckbox
              checked={theme.showBio ?? true}
              onChange={(checked) => setTheme({ showBio: checked })}
            />
          </div>
          <div className="toggle-row">
            <span>{t('designerShowSkills')}</span>
            <CustomCheckbox
              checked={theme.showTechStack ?? true}
              onChange={(checked) => setTheme({ showTechStack: checked })}
            />
          </div>
          <div className="toggle-row">
            <span>{t('designerShowGithub')}</span>
            <CustomCheckbox
              checked={theme.showGithub ?? true}
              onChange={(checked) => setTheme({ showGithub: checked })}
            />
          </div>
          <div className="toggle-row">
            <span>{t('designerBlockBackground')}</span>
            <CustomCheckbox
              checked={theme.blockBackground ?? true}
              onChange={(checked) => setTheme({ blockBackground: checked })}
            />
          </div>
          {profile.is_supporter && (
            <>
              <div className="toggle-row">
                <span>{t('designerShowPatronBadge')}</span>
                <CustomCheckbox
                  checked={theme.showSupporterBadge ?? true}
                  onChange={(checked) => setTheme({ showSupporterBadge: checked })}
                />
              </div>
              {(theme.showSupporterBadge ?? true) && (
                <div className="form-group">
                  <label>{t('designerPatronBadgePlacement')}</label>
                  <div className="segmented-control">
                    {(['username', 'status'] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={
                          (theme.supporterBadgePlacement || 'username') === v
                            ? 'segmented-control__btn segmented-control__btn--active'
                            : 'segmented-control__btn'
                        }
                        onClick={() => setTheme({ supporterBadgePlacement: v })}
                      >
                        {v === 'username' ? t('designerPatronNearName') : t('designerPatronNearStatus')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {(theme.showGithub ?? true) && (
            <div className="form-group">
              <label>{t('designerGithubPadding')}</label>
              <div className="segmented-control">
                {(['none', 'sm', 'md', 'lg', 'xl'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={(theme.githubBlockPadding || 'md') === v ? 'active' : ''}
                    onClick={() => setTheme({ githubBlockPadding: v })}
                  >
                    {getGithubPaddingLabel(locale, v)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
