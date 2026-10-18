import { useState } from 'react';
import { Loader2, Share2 } from 'lucide-react';
import { shareProfile, haptic, type ShareProgress } from '../lib/telegram';
import { useLocale } from '../lib/locale';

interface ShareProfileButtonProps {
  username: string;
  displayName: string;
  /** Full share body; empty string = default template at send time. */
  shareMessage?: string | null;
  shareIncludeDirectLink?: boolean;
  className?: string;
  variant?: 'icon' | 'primary';
  title?: string;
}

export function ShareProfileButton({
  username,
  displayName,
  shareMessage,
  shareIncludeDirectLink,
  className = '',
  variant = 'primary',
  title,
}: ShareProfileButtonProps) {
  const { t, locale } = useLocale();
  const [phase, setPhase] = useState<ShareProgress | null>(null);

  async function handleShare() {
    if (phase) return;
    setPhase('generating');
    try {
      await shareProfile(username, displayName, {
        onProgress: (next) => setPhase(next),
        shareMessage,
        locale,
        shareIncludeDirectLink,
      });
      haptic('success');
    } catch (err) {
      haptic('error');
      const tg = window.Telegram?.WebApp;
      const message = err instanceof Error ? err.message : 'Share failed';
      if (tg?.showAlert) {
        tg.showAlert(message);
      }
    } finally {
      setPhase(null);
    }
  }

  const busy = phase !== null;
  const label = busy ? t('loading') : t('shareProfile');

  if (variant === 'icon') {
    return (
      <>
        <button
          type="button"
          className={className}
          onClick={() => { void handleShare(); }}
          disabled={busy}
          title={title ?? t('share')}
          aria-busy={busy}
        >
          {busy ? <Loader2 size={20} className="spin" /> : <Share2 size={20} />}
        </button>
        {busy && (
          <div className="share-progress-toast" role="status">
            <Loader2 size={18} className="spin" />
            <span>{label}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => { void handleShare(); }}
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? <Loader2 size={18} className="spin" /> : <Share2 size={18} />}
        {label}
      </button>
    </>
  );
}
