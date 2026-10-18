export interface FontOption {
  id: string;
  label: string;
  family: string;
  headingFamily?: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'space-grotesk',
    label: 'Space Grotesk',
    family: "'Space Grotesk', 'Inter', sans-serif",
  },
  {
    id: 'inter',
    label: 'Inter',
    family: "'Inter', -apple-system, sans-serif",
  },
  {
    id: 'dm-sans',
    label: 'DM Sans',
    family: "'DM Sans', 'Inter', sans-serif",
  },
  {
    id: 'playfair',
    label: 'Playfair',
    family: "'Playfair Display', Georgia, serif",
    headingFamily: "'Playfair Display', Georgia, serif",
  },
  {
    id: 'jetbrains',
    label: 'JetBrains Mono',
    family: "'JetBrains Mono', 'SF Mono', monospace",
    headingFamily: "'Space Grotesk', sans-serif",
  },
];

export function resolveFontFamily(fontId?: string): FontOption {
  return FONT_OPTIONS.find((f) => f.id === fontId) || FONT_OPTIONS[0];
}
