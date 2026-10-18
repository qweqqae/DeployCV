import { useEffect, useState } from 'react';
import { fetchCoverAsDataUrl } from '../lib/prepareCoverImage';
import { SHARE_CARD_WIDTH } from './ShareCard';

interface ShareCardCoverProps {
  src?: string | null;
  height: number;
  grayscale?: boolean;
}

export function ShareCardCover({ src, height, grayscale }: ShareCardCoverProps) {
  const [coverSrc, setCoverSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setCoverSrc(null);
      return;
    }

    let cancelled = false;
    setCoverSrc(null);

    fetchCoverAsDataUrl(src, SHARE_CARD_WIDTH, height).then((dataUrl) => {
      if (!cancelled) {
        setCoverSrc(dataUrl);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [src, height]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height,
        overflow: 'hidden',
        flexShrink: 0,
        background: '#111111',
        isolation: 'isolate',
      }}
    >
      {coverSrc ? (
        <img
          data-share-cover
          src={coverSrc}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: grayscale ? 'grayscale(100%)' : undefined,
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(160deg, #1a1a1a 0%, #000000 100%)',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, transparent 35%, #111111 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
