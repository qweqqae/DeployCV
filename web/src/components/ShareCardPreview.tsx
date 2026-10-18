import type { Profile, TechStackItem } from '../types';
import { ShareCard } from './ShareCard';

interface ShareCardPreviewProps {
  profile: Profile;
  techStack: TechStackItem[];
  hint?: string;
  className?: string;
}

export function ShareCardPreview({
  profile,
  techStack,
  hint,
  className = 'share-card-preview',
}: ShareCardPreviewProps) {
  return (
    <div className={className}>
      {hint && <p className="share-card-preview__hint">{hint}</p>}
      <div className="share-card-preview__host">
        <ShareCard profile={profile} techStack={techStack} fluid />
      </div>
    </div>
  );
}
