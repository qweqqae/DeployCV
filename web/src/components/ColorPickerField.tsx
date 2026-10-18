import { useEffect, useRef, useState } from 'react';
import { ColorPicker } from './ColorPicker';
import { normalizeHex } from '../lib/color';

interface ColorPickerFieldProps {
  value: string;
  onChange: (hex: string) => void;
}

export function ColorPickerField({ value, onChange }: ColorPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const safeValue = normalizeHex(value) || '#ffffff';

  useEffect(() => {
    setHexInput(safeValue);
  }, [safeValue]);

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

  const commitHex = () => {
    const normalized = normalizeHex(hexInput);
    if (normalized) {
      onChange(normalized);
      setHexInput(normalized);
    } else {
      setHexInput(safeValue);
    }
  };

  return (
    <div className="color-picker-field" ref={rootRef}>
      <div className="color-picker-field__row">
        <button
          type="button"
          className="color-picker-field__preview"
          style={{ background: safeValue }}
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Open color palette"
        />
        <input
          type="text"
          className="color-picker-field__hex"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onBlur={commitHex}
          onKeyDown={(e) => e.key === 'Enter' && commitHex()}
        />
      </div>
      {open && (
        <div className="color-picker-field__popover">
          <ColorPicker value={safeValue} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
