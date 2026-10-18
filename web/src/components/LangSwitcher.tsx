import { useLocale } from '../lib/locale';
import type { Locale } from '../lib/i18n';

const langs: { id: Locale; label: string }[] = [
  { id: 'en', label: 'En' },
  { id: 'ru', label: 'Ru' },
];

type LangSwitcherProps = {
  className?: string;
};

export function LangSwitcher({ className }: LangSwitcherProps = {}) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className={['lang-switcher', `lang-switcher--${locale}`, className].filter(Boolean).join(' ')}
      role="group"
      aria-label="Language"
    >
      <span className="lang-switcher__pill" aria-hidden="true" />
      {langs.map((lang) => (
        <button
          key={lang.id}
          type="button"
          className={`lang-switcher__btn${locale === lang.id ? ' lang-switcher__btn--active' : ''}`}
          onClick={() => setLocale(lang.id)}
          aria-pressed={locale === lang.id}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
