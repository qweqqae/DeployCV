import { getShareTechStackLayout } from '../lib/shareCardTechStack';
import type { TechStackItem } from '../types';
import { ShareCardStackBadge } from './ShareCardStackBadge';
import { useLocale } from '../lib/locale';

interface ShareCardTechStackProps {
  items: TechStackItem[];
  maxWidth: number;
  showLabel?: boolean;
}

export function ShareCardTechStack({ items, maxWidth, showLabel = true }: ShareCardTechStackProps) {
  const { t } = useLocale();
  const { visibleItems, hiddenCount } = getShareTechStackLayout(items, maxWidth, showLabel);

  return (
    <div style={{ marginTop: 16, width: '100%', boxSizing: 'border-box' }}>
      {showLabel && (
        <div
          style={{
            fontSize: 13,
            color: '#a3a3a3',
            lineHeight: 1.2,
            marginBottom: 8,
          }}
        >
          {t('skillsLabel')}:
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          maxWidth,
          boxSizing: 'border-box',
        }}
      >
        {visibleItems.map((item) => (
          <ShareCardStackBadge key={item.id} item={item} />
        ))}
        {hiddenCount > 0 && (
          <span
            style={{
              fontSize: 12,
              color: '#a3a3a3',
              lineHeight: 1.2,
              flexShrink: 0,
            }}
          >
            +{hiddenCount} {t('stackMore')}
          </span>
        )}
      </div>
    </div>
  );
}
