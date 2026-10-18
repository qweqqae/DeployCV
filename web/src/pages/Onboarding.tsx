import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { getTelegramUser, haptic, type TelegramUser } from '../lib/telegram';
import { createProfile, getMyProfile, withTimeout } from '../lib/api';
import { useLocale } from '../lib/locale';
import { LangSwitcher } from '../components/LangSwitcher';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || 'your_bot_username';

function getDisplayName(user: TelegramUser): string {
  return `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`;
}

function cleanUsername(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, '');
}

type FieldErrors = {
  username?: string;
  displayName?: string;
  general?: string;
};

export function Onboarding() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const user = getTelegramUser();

  const hasTgUsername = Boolean(user?.username);

  const [useTgUsername, setUseTgUsername] = useState(hasTgUsername);
  const [useTgDisplayName, setUseTgDisplayName] = useState(true);
  const [username, setUsername] = useState(
    hasTgUsername ? cleanUsername(user!.username!) : ''
  );
  const [displayName, setDisplayName] = useState(user ? getDisplayName(user) : '');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    withTimeout(getMyProfile(), 8000, { profile: null, techStack: [], sections: [] })
      .then((result) => {
        if (result.profile) {
          navigate('/', { replace: true });
        }
      })
      .catch(() => {});
  }, [user, navigate]);

  useEffect(() => {
    if (useTgUsername && user?.username) {
      setUsername(cleanUsername(user.username));
    }
  }, [useTgUsername, user?.username]);

  useEffect(() => {
    if (useTgDisplayName && user) {
      setDisplayName(getDisplayName(user));
    }
  }, [useTgDisplayName, user]);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    const clean = cleanUsername(username);
    const trimmedName = displayName.trim();

    if (!clean) {
      errors.username = t('usernameRequired');
    } else if (clean.length < 3) {
      errors.username = t('usernameMinLength');
    }

    if (!trimmedName) {
      errors.displayName = t('displayNameRequired');
    }

    if (!user) {
      errors.general = t('openFromTelegram');
    }

    return errors;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validate();
    if (errors.username || errors.displayName || errors.general) {
      setFieldErrors(errors);
      haptic('error');
      return;
    }

    const clean = cleanUsername(username);
    setLoading(true);
    setFieldErrors({});

    try {
      await createProfile({
        username: clean,
        display_name: displayName.trim(),
        avatar_url: user!.photo_url || null,
      });
      haptic('success');
      navigate('/editor');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('createFailed');
      if (message.toLowerCase().includes('already exists')) {
        haptic('success');
        navigate('/', { replace: true });
        return;
      }
      setFieldErrors({ general: message });
      haptic('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page onboarding-page">
      <LangSwitcher />

      <header className="onboarding-header reveal reveal--1">
        <h1 className="onboarding-header__title">
          {t('onboardingTitle1')}<br />
          <span className="hero__accent">{t('onboardingTitle2')}</span>
        </h1>
        <p className="onboarding-header__subtitle">{t('onboardingSubtitle')}</p>
      </header>

      <div className="onboarding-card reveal reveal--2">
        <form onSubmit={handleSubmit} className="onboarding-form" noValidate>
          <div className="form-group reveal reveal--3">
            <label>{t('labelUsername')}</label>

            <label className="profile-checkbox">
              <input
                type="checkbox"
                checked={useTgUsername}
                disabled={!hasTgUsername}
                onChange={(e) => setUseTgUsername(e.target.checked)}
              />
              <span className="profile-checkbox__box">
                <Check size={12} strokeWidth={3} />
              </span>
              <span className="profile-checkbox__label">{t('useProfileUsername')}</span>
            </label>

            {!hasTgUsername && (
              <p className="form-hint">{t('noTelegramUsername')}</p>
            )}

            <div
              className={`username-input${useTgUsername && hasTgUsername ? ' username-input--locked' : ''}${fieldErrors.username ? ' username-input--error' : ''}`}
            >
              <span className="username-prefix">t.me/{BOT_USERNAME}/</span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(cleanUsername(e.target.value));
                  if (fieldErrors.username) {
                    setFieldErrors((prev) => ({ ...prev, username: undefined }));
                  }
                }}
                placeholder={t('placeholderUsername')}
                maxLength={30}
                disabled={useTgUsername && hasTgUsername}
                aria-invalid={Boolean(fieldErrors.username)}
              />
            </div>
            {fieldErrors.username && (
              <p className="form-field-error">{fieldErrors.username}</p>
            )}
          </div>

          <div className="form-group reveal reveal--4">
            <label>{t('labelDisplayName')}</label>

            <label className="profile-checkbox">
              <input
                type="checkbox"
                checked={useTgDisplayName}
                disabled={!user}
                onChange={(e) => setUseTgDisplayName(e.target.checked)}
              />
              <span className="profile-checkbox__box">
                <Check size={12} strokeWidth={3} />
              </span>
              <span className="profile-checkbox__label">{t('useProfileDisplayName')}</span>
            </label>

            <input
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (fieldErrors.displayName) {
                  setFieldErrors((prev) => ({ ...prev, displayName: undefined }));
                }
              }}
              placeholder={t('placeholderDisplayName')}
              disabled={useTgDisplayName && Boolean(user)}
              className={`${useTgDisplayName && user ? 'input--locked' : ''}${fieldErrors.displayName ? ' input--error' : ''}`}
              aria-invalid={Boolean(fieldErrors.displayName)}
            />
            {fieldErrors.displayName && (
              <p className="form-field-error">{fieldErrors.displayName}</p>
            )}
          </div>

          {fieldErrors.general && (
            <p className="form-error reveal reveal--5">{fieldErrors.general}</p>
          )}

          <button
            type="submit"
            className="btn-primary btn-large reveal reveal--5"
            disabled={loading}
          >
            {loading ? t('creating') : t('getStarted')}
          </button>
        </form>
      </div>
    </div>
  );
}
