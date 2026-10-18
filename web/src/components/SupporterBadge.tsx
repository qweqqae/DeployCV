import { useLocale } from '../lib/locale';
import { supporterBadgeLabel } from '../lib/supporterBadge';

interface SupporterBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function SupporterBadge({ className = '', size = 'md' }: SupporterBadgeProps) {
  const { locale } = useLocale();
  return (
    <span
      className={`supporter-badge supporter-badge--${size}${className ? ` ${className}` : ''}`}
      title={supporterBadgeLabel(locale)}
    >
      {supporterBadgeLabel(locale)}
    </span>
  );
}
