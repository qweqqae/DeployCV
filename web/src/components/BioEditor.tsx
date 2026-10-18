import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { isValidImageUrl, normalizeUrl } from '../lib/urls';
import { ReadmeContent } from './ReadmeContent';
import { useLocale } from '../lib/locale';

interface BioEditorProps {
  value: string | null;
  onChange: (value: string) => void;
  invalidMessage?: string;
}

export function BioEditor({ value, onChange, invalidMessage }: BioEditorProps) {
  const { t } = useLocale();
  const [imageUrl, setImageUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('Work example');
  const [error, setError] = useState('');

  const insertImage = () => {
    const trimmed = imageUrl.trim();
    if (!trimmed) return;
    if (!isValidImageUrl(trimmed)) {
      setError(invalidMessage || 'Enter a valid image URL');
      return;
    }
    const url = normalizeUrl(trimmed);
    const caption = imageCaption.trim() || 'Image';
    const snippet = `\n\n![${caption}](${url})\n`;
    onChange(`${value || ''}${snippet}`.trimStart());
    setImageUrl('');
    setError('');
  };

  return (
    <div className="bio-editor">
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        placeholder={t('bioPlaceholder')}
        className="bio-editor__textarea"
      />

      <div className="bio-editor__images">
        <p className="bio-editor__images-label">{t('bioImagesLabel')}</p>
        <input
          type="url"
          placeholder={t('bioImagePlaceholder')}
          value={imageUrl}
          onChange={(e) => {
            setImageUrl(e.target.value);
            if (error) setError('');
          }}
          className={error ? 'input--error' : ''}
        />
        <input
          type="text"
          placeholder={t('bioCaptionPlaceholder')}
          value={imageCaption}
          onChange={(e) => setImageCaption(e.target.value)}
        />
        {error && <p className="form-field-error">{error}</p>}
        <button type="button" className="btn-secondary bio-editor__add-btn" onClick={insertImage}>
          <ImagePlus size={16} />
          {t('insertImage')}
        </button>
      </div>

      {value?.trim() && (
        <div className="bio-editor__preview">
          <p className="bio-editor__preview-label">{t('bioPreview')}</p>
          <ReadmeContent content={value} className="markdown-content bio-editor__markdown" />
        </div>
      )}
    </div>
  );
}
