import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { prepareReadmeImageSrc, type ReadmeMediaBase } from '../lib/readmeMedia';
import { sanitizeHttpUrl } from '../lib/urls';

const sanitizeSchema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    src: ['http', 'https'],
    href: ['http', 'https', 'mailto'],
  },
  attributes: {
    ...defaultSchema.attributes,
    img: [...(defaultSchema.attributes?.img || []), 'src', 'alt', 'width', 'height', 'loading', 'referrerpolicy'],
    h2: [...(defaultSchema.attributes?.h2 || []), 'align'],
    p: [...(defaultSchema.attributes?.p || []), 'align'],
    div: [...(defaultSchema.attributes?.div || []), 'align'],
    samp: [],
    a: [...(defaultSchema.attributes?.a || []), 'href', 'title', 'rel'],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'samp', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'p', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'code', 'pre', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
};

interface ReadmeContentProps {
  content: string;
  className?: string;
  mediaBase?: ReadmeMediaBase;
}

function safeImageSrc(src: string | undefined, mediaBase?: ReadmeMediaBase): string | undefined {
  if (!src || typeof src !== 'string') return undefined;
  const trimmed = src.trim();
  if (!trimmed || trimmed.toLowerCase().startsWith('data:')) return undefined;
  const prepared = prepareReadmeImageSrc(trimmed, mediaBase);
  if (!prepared) return undefined;
  if (prepared.startsWith('/api/image-proxy')) return prepared;
  return sanitizeHttpUrl(prepared) ?? undefined;
}

function safeLinkHref(href: string | undefined): string | undefined {
  if (!href || typeof href !== 'string') return undefined;
  const trimmed = href.trim();
  if (trimmed.toLowerCase().startsWith('mailto:')) {
    const email = trimmed.slice('mailto:'.length).trim();
    if (!email || email.length > 254 || /[\s<>]/.test(email)) return undefined;
    return `mailto:${email}`;
  }
  return sanitizeHttpUrl(trimmed) ?? undefined;
}

export function ReadmeContent({ content, className = 'markdown-content', mediaBase }: ReadmeContentProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        components={{
          img: ({ src, alt }) => {
            const safeSrc = safeImageSrc(src, mediaBase);
            if (!safeSrc) return null;
            return (
              <img
                src={safeSrc}
                alt={alt || ''}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            );
          },
          a: ({ href, children }) => {
            const safeHref = safeLinkHref(href);
            if (!safeHref) return <span>{children}</span>;
            return (
              <a href={safeHref} target="_blank" rel="noopener noreferrer nofollow">
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
