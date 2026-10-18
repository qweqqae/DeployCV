import { useLocale } from '../lib/locale';
import { resolveStatusDisplay } from '../lib/shareCardStatus';

interface ActivityStatusProps {
  status: string;
  message?: string | null;
  customEmoji?: string | null;
  size?: 'sm' | 'md';
  capture?: boolean;
}

export function ActivityStatus({
  status,
  message,
  customEmoji,
  size = 'md',
  capture = false,
}: ActivityStatusProps) {
  const { locale } = useLocale();
  const display = resolveStatusDisplay(status, message, customEmoji, locale);
  if (!display) return null;

  if (capture) {
    return (
      <div
        className={`activity-status activity-status--${size} activity-status--capture`}
        data-status={status}
        data-capture-label={display.label}
      >
        {!display.useDot && display.emoji && (
          <span className="activity-status__emoji">{display.emoji}</span>
        )}
        {display.useDot && (
          <span
            className="activity-status__dot"
            style={{ background: display.dotColor }}
            aria-hidden="true"
          />
        )}
        {display.label && (
          <span className="activity-status__text activity-status__text--capture">
            {display.label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`activity-status activity-status--${size}`} data-status={status}>
      <span className="activity-status__text">
        {!display.useDot && display.emoji ? `${display.emoji}${display.label ? ' ' : ''}` : ''}
        {display.useDot && (
          <span
            className="activity-status__dot activity-status__dot--inline"
            style={{ background: display.dotColor }}
            aria-hidden="true"
          />
        )}
        {display.label}
      </span>
    </div>
  );
}
