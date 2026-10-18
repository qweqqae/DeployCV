import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { FONT_OPTIONS, resolveFontFamily } from '../lib/fonts';
import { useLocale } from '../lib/locale';

interface FontPickerRowProps {
  label: string;
  value?: string;
  onChange: (fontId: string) => void;
  allowInherit?: boolean;
}

export function FontPickerRow({ label, value, onChange, allowInherit }: FontPickerRowProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = value ? resolveFontFamily(value) : null;
  const displayLabel = selected?.label || (allowInherit ? t('fontUseDefault') : 'Space Grotesk');

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  const pick = (fontId: string) => {
    onChange(fontId);
    setOpen(false);
  };

  return (
    <div className="font-picker-row" ref={rootRef}>
      <span className="font-picker-row__label">{label}</span>
      <button
        type="button"
        className={`font-picker-row__trigger${open ? ' font-picker-row__trigger--open' : ''}`}
        style={{ fontFamily: selected?.family }}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span>{displayLabel}</span>
        <ChevronDown size={16} className="font-picker-row__chevron" />
      </button>

      {open && (
        <ul className="font-picker-row__menu" role="listbox">
          {allowInherit && (
            <li>
              <button
                type="button"
                className={`font-picker-row__option${!value ? ' font-picker-row__option--active' : ''}`}
                onClick={() => pick('')}
              >
                <span>{t('fontUseDefault')}</span>
                {!value && <Check size={14} />}
              </button>
            </li>
          )}
          {FONT_OPTIONS.map((font) => (
            <li key={font.id}>
              <button
                type="button"
                className={`font-picker-row__option${value === font.id ? ' font-picker-row__option--active' : ''}`}
                style={{ fontFamily: font.family }}
                onClick={() => pick(font.id)}
              >
                <span>{font.label}</span>
                {value === font.id && <Check size={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
