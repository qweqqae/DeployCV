import { useEffect, useState } from 'react';
import { Link2, X } from 'lucide-react';
import { isValidImageUrl, normalizeUrl } from '../lib/urls';

interface ImageUrlFieldProps {
  label: string;
  placeholder: string;
  value: string | null;
  onChange: (url: string | null) => void;
  variant: 'header' | 'avatar';
  invalidMessage?: string;
}

export function ImageUrlField({
  label,
  placeholder,
  value,
  onChange,
  variant,
  invalidMessage,
}: ImageUrlFieldProps) {
  const [input, setInput] = useState(value || '');
  const [error, setError] = useState('');

  useEffect(() => {
    setInput(value || '');
  }, [value]);

  const applyUrl = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      onChange(null);
      setError('');
      return;
    }
    if (!isValidImageUrl(trimmed)) {
      setError(invalidMessage || 'Enter a valid image URL');
      return;
    }
    const normalized = normalizeUrl(trimmed);
    onChange(normalized);
    setInput(normalized);
    setError('');
  };

  const clear = () => {
    setInput('');
    setError('');
    onChange(null);
  };

  const previewUrl = value && isValidImageUrl(value) ? normalizeUrl(value) : null;

  return (
    <div className={`image-url-field image-url-field--${variant}`}>
      <label className="image-url-field__label">{label}</label>

      {previewUrl && (
        <div className={`image-url-field__preview image-url-field__preview--${variant}`}>
          <img src={previewUrl} alt="" />
          <button type="button" className="image-url-field__remove" onClick={clear} aria-label="Remove">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="image-url-field__row">
        <span className="image-url-field__icon" aria-hidden="true">
          <Link2 size={16} />
        </span>
        <input
          type="url"
          className={`image-url-field__input${error ? ' input--error' : ''}`}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (error) setError('');
          }}
          onBlur={applyUrl}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              applyUrl();
            }
          }}
          placeholder={placeholder}
        />
      </div>

      {error && <p className="form-field-error">{error}</p>}
    </div>
  );
}
