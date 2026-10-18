import { useCallback, useEffect, useRef, useState } from 'react';
import { hexToHsl, hslToHex, normalizeHex } from '../lib/color';
import { QUICK_COLOR_PRESETS } from '../lib/colorPresets';

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  presets?: string[];
}

export function ColorPicker({ value, onChange, presets = QUICK_COLOR_PRESETS }: ColorPickerProps) {
  const safeValue = normalizeHex(value) || '#ffffff';
  const hsl = hexToHsl(safeValue);
  const slRef = useRef<HTMLDivElement>(null);
  const [hexInput, setHexInput] = useState(safeValue);

  useEffect(() => {
    setHexInput(safeValue);
  }, [safeValue]);

  const applyHsl = useCallback((h: number, s: number, l: number) => {
    const hex = hslToHex(h, s, l);
    setHexInput(hex);
    onChange(hex);
  }, [onChange]);

  const pickSl = (clientX: number, clientY: number) => {
    const rect = slRef.current?.getBoundingClientRect();
    if (!rect) return;
    const s = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const l = Math.max(0, Math.min(100, (1 - (clientY - rect.top) / rect.height) * 100));
    applyHsl(hsl.h, s, l);
  };

  const onSlPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    pickSl(event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onSlMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    pickSl(event.clientX, event.clientY);
  };

  const onHexBlur = () => {
    const normalized = normalizeHex(hexInput);
    if (normalized) {
      onChange(normalized);
      setHexInput(normalized);
    } else {
      setHexInput(safeValue);
    }
  };

  return (
    <div className="color-picker">
      <div
        ref={slRef}
        className="color-picker__sl"
        style={{ '--picker-hue': hsl.h } as React.CSSProperties}
        onPointerDown={onSlPointer}
        onPointerMove={onSlMove}
      >
        <span
          className="color-picker__cursor"
          style={{ left: `${hsl.s}%`, top: `${100 - hsl.l}%` }}
        />
      </div>

      <input
        type="range"
        min={0}
        max={360}
        value={Math.round(hsl.h)}
        className="color-picker__hue"
        onChange={(e) => applyHsl(Number(e.target.value), hsl.s, hsl.l)}
      />

      <div className="color-picker__presets">
        {presets.map((color) => (
          <button
            key={color}
            type="button"
            className={`color-picker__preset${safeValue.toLowerCase() === color.toLowerCase() ? ' color-picker__preset--active' : ''}`}
            style={{ background: color }}
            onClick={() => {
              setHexInput(color);
              onChange(color);
            }}
            aria-label={color}
          />
        ))}
      </div>

      <div className="color-picker__footer">
        <span className="color-picker__preview" style={{ background: safeValue }} />
        <input
          type="text"
          className="color-picker__hex"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onBlur={onHexBlur}
          onKeyDown={(e) => e.key === 'Enter' && onHexBlur()}
        />
      </div>
    </div>
  );
}
