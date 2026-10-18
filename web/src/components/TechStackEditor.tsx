import { useMemo, useState } from 'react';
import { Plus, X, Search } from 'lucide-react';
import type { TechStackItem } from '../types';
import { POPULAR_TECH } from '../types';
import { TechBadgePreview } from './TechBadge';
import { BADGE_URL_EXAMPLES, getTechBadgeProvider, labelFromBadgeUrl } from '../lib/techBadge';
import { useLocale } from '../lib/locale';
import { getSizeLabel } from '../lib/i18n';
import { ColorPickerField } from './ColorPickerField';
import { CustomCheckbox } from './CustomCheckbox';
import { QUICK_COLOR_PRESETS } from '../lib/colorPresets';

interface TechStackEditorProps {
  items: TechStackItem[];
  onChange: (items: TechStackItem[]) => void;
  defaultBadgeSize?: 'sm' | 'md' | 'lg';
  onDefaultBadgeSizeChange?: (size: 'sm' | 'md' | 'lg') => void;
  showTechStackLabel?: boolean;
  onShowTechStackLabelChange?: (checked: boolean) => void;
}

export function TechStackEditor({
  items,
  onChange,
  defaultBadgeSize = 'md',
  onDefaultBadgeSizeChange,
  showTechStackLabel = true,
  onShowTechStackLabelChange,
}: TechStackEditorProps) {
  const { t, locale } = useLocale();
  const styleOptions: { value: TechStackItem['style']; label: string }[] = [
    { value: 'flat', label: t('stackStyleFlat') },
    { value: 'for-the-badge', label: t('stackStyleBadge') },
    { value: 'social', label: t('stackStyleSocial') },
  ];
  const [showLibrary, setShowLibrary] = useState(false);
  const [search, setSearch] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [customColor, setCustomColor] = useState('#ffffff');
  const [customLogo, setCustomLogo] = useState('');
  const [customBadgeUrl, setCustomBadgeUrl] = useState('');

  const filteredLibrary = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return POPULAR_TECH;
    return POPULAR_TECH.filter((t) => t.label.toLowerCase().includes(q));
  }, [search]);

  const addItem = (
    label: string,
    color: string,
    logo?: string,
    badgeUrl?: string,
  ) => {
    const newItem: TechStackItem = {
      id: crypto.randomUUID(),
      profile_id: '',
      label,
      color,
      logo: logo || null,
      badge_url: badgeUrl?.trim() || null,
      style: 'flat',
      badge_size: defaultBadgeSize,
      sort_order: items.length,
    };
    onChange([...items, newItem]);
    setShowLibrary(false);
    setSearch('');
    setCustomLabel('');
    setCustomLogo('');
    setCustomBadgeUrl('');
  };

  const removeItem = (id: string) => {
    onChange(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, patch: Partial<TechStackItem>) => {
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const normalizeColor = (color: string) => (color.startsWith('#') ? color : `#${color}`);
  const customUrlMode = customBadgeUrl.trim().length > 0;
  const canAddCustom = customUrlMode || customLabel.trim().length > 0;

  const handleAddCustom = () => {
    if (customUrlMode) {
      addItem(
        labelFromBadgeUrl(customBadgeUrl),
        '#6366f1',
        undefined,
        customBadgeUrl.trim(),
      );
      return;
    }

    if (customLabel.trim()) {
      addItem(customLabel.trim(), customColor, customLogo || undefined);
    }
  };

  return (
    <div className="tech-stack-editor">
      {onShowTechStackLabelChange && (
        <section className="tech-stack-panel">
          <div className="toggle-row">
            <span>{t('stackShowSkillsLabel')}</span>
            <CustomCheckbox
              checked={showTechStackLabel}
              onChange={onShowTechStackLabelChange}
            />
          </div>
        </section>
      )}

      {onDefaultBadgeSizeChange && (
        <section className="tech-stack-panel">
          <h3 className="tech-stack-panel__title">{t('stackDefaultBadgeSize')}</h3>
          <div className="segmented-control">
            {(['sm', 'md', 'lg'] as const).map((v) => (
              <button
                key={v}
                type="button"
                className={defaultBadgeSize === v ? 'active' : ''}
                onClick={() => onDefaultBadgeSizeChange(v)}
              >
                {getSizeLabel(locale, v)}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="tech-stack-editor__list">
        {items.length === 0 && (
          <p className="tech-stack-editor__empty">{t('stackEmpty')}</p>
        )}
        {items.map((item) => {
          const color = normalizeColor(item.color);
          const size = item.badge_size || defaultBadgeSize;
          const badgeProvider = getTechBadgeProvider(item);

          return (
            <article key={item.id} className="tech-stack-card">
              <div className="tech-stack-card__preview">
                <TechBadgePreview
                  label={item.label}
                  color={item.color}
                  logo={item.logo}
                  badge_url={item.badge_url}
                  style={item.style}
                  size={size}
                />
                <button type="button" className="tech-stack-card__remove" onClick={() => removeItem(item.id)}>
                  <X size={16} />
                </button>
              </div>

              {badgeProvider === 'shields' && (
                <div className="form-group">
                  <label>{t('stackLabel')}</label>
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateItem(item.id, { label: e.target.value })}
                  />
                </div>
              )}

              <div className="form-group">
                <label>{t('stackBadgeSource')}</label>
                <div className="segmented-control">
                  <button
                    type="button"
                    className={badgeProvider === 'shields' ? 'active' : ''}
                    onClick={() => updateItem(item.id, { badge_url: null })}
                  >
                    {t('stackShields')}
                  </button>
                  <button
                    type="button"
                    className={badgeProvider === 'custom' ? 'active' : ''}
                    onClick={() => updateItem(item.id, {
                      badge_url: item.badge_url || BADGE_URL_EXAMPLES[0].url,
                    })}
                  >
                    {t('stackCustomUrl')}
                  </button>
                </div>
              </div>

              {badgeProvider === 'custom' ? (
                <div className="form-group">
                  <label>{t('stackBadgeImageUrl')}</label>
                  <input
                    type="url"
                    value={item.badge_url || ''}
                    placeholder="https://skillicons.dev/icons?i=react"
                    onChange={(e) => updateItem(item.id, { badge_url: e.target.value || null })}
                  />
                  <p className="tech-stack-panel__desc">
                    {t('stackBadgeUrlHint')}
                  </p>
                  <div className="tech-stack-url-examples">
                    {BADGE_URL_EXAMPLES.map((example) => (
                      <button
                        key={example.label}
                        type="button"
                        className="btn-ghost tech-stack-url-examples__btn"
                        onClick={() => updateItem(item.id, { badge_url: example.url })}
                      >
                        {example.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>{t('stackStyle')}</label>
                    <div className="segmented-control">
                      {styleOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={item.style === opt.value ? 'active' : ''}
                          onClick={() => updateItem(item.id, { style: opt.value })}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>{t('stackColor')}</label>
                    <div className="color-swatch-grid">
                      {QUICK_COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className={`color-swatch${color.toLowerCase() === preset.toLowerCase() ? ' color-swatch--active' : ''}`}
                          style={{ background: preset }}
                          onClick={() => updateItem(item.id, { color: preset })}
                          aria-label={preset}
                        />
                      ))}
                    </div>
                    <ColorPickerField
                      value={color}
                      onChange={(next) => updateItem(item.id, { color: next })}
                    />
                  </div>

                  <div className="form-group">
                    <label>{t('stackIconSlug')}</label>
                    <input
                      type="text"
                      value={item.logo || ''}
                      placeholder={t('stackIconSlugPlaceholder')}
                      onChange={(e) => updateItem(item.id, { logo: e.target.value || null })}
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label>{t('stackSize')}</label>
                <div className="segmented-control">
                  {(['sm', 'md', 'lg'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={size === v ? 'active' : ''}
                      onClick={() => updateItem(item.id, { badge_size: v })}
                    >
                      {getSizeLabel(locale, v)}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {showLibrary ? (
        <section className="tech-stack-panel tech-stack-library">
          <div className="tech-stack-library__header">
            <h3 className="tech-stack-panel__title">{t('stackIconLibrary')}</h3>
            <button type="button" className="btn-ghost" onClick={() => setShowLibrary(false)}>
              {t('stackClose')}
            </button>
          </div>

          <div className="tech-stack-library__search">
            <Search size={16} />
            <input
              type="text"
              placeholder={t('stackSearchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="tech-stack-library__grid">
            {filteredLibrary.map((tech) => (
              <button
                key={tech.label}
                type="button"
                className="tech-stack-library__item"
                onClick={() => addItem(tech.label, tech.color, tech.logo)}
              >
                <TechBadgePreview label={tech.label} color={tech.color} logo={tech.logo} size={defaultBadgeSize} />
              </button>
            ))}
          </div>

          <div className="tech-stack-library__custom">
            <p className="tech-stack-panel__desc">{t('stackCustomBadge')}</p>
            <input
              type="url"
              placeholder={t('stackCustomUrlPlaceholder')}
              value={customBadgeUrl}
              onChange={(e) => setCustomBadgeUrl(e.target.value)}
            />
            {!customUrlMode && (
              <>
                <input
                  type="text"
                  placeholder={t('stackCustomLabelPlaceholder')}
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                />
                <input
                  type="text"
                  placeholder={t('stackCustomSlugPlaceholder')}
                  value={customLogo}
                  onChange={(e) => setCustomLogo(e.target.value)}
                />
                <ColorPickerField
                  value={customColor}
                  onChange={setCustomColor}
                />
              </>
            )}
            <button
              type="button"
              className="btn-primary"
              onClick={handleAddCustom}
              disabled={!canAddCustom}
            >
              {t('stackAdd')}
            </button>
          </div>
        </section>
      ) : (
        <button type="button" className="btn-secondary tech-stack-editor__add" onClick={() => setShowLibrary(true)}>
          <Plus size={16} /> {t('stackAdd')}
        </button>
      )}
    </div>
  );
}
