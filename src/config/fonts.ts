export const FONT_IDS = [
  'system', 'mono', 'display', 'retro',
  'inter', 'inter-tight', 'roboto', 'open-sans', 'lato', 'montserrat-alternates', 'rubik', 'nunito', 'nunito-sans',
  'work-sans', 'manrope', 'dm-sans', 'barlow', 'mulish', 'karla', 'figtree', 'outfit', 'plus-jakarta-sans',
  'space-grotesk', 'archivo', 'cabin',
  'oswald', 'bebas-neue', 'anton', 'archivo-black', 'poppins', 'sora', 'lexend', 'chivo', 'bricolage-grotesque',
  'jetbrains-mono', 'fira-code', 'ibm-plex-mono', 'source-code-pro', 'space-mono', 'ubuntu-mono',
  'caveat', 'patrick-hand', 'permanent-marker',
  'playfair-display', 'merriweather',
] as const;

export type FontId = (typeof FONT_IDS)[number];
export type FontCategory = 'Classic' | 'Sans' | 'Display' | 'Mono' | 'Handwritten' | 'Serif';
export type FontWeight = 400 | 500 | 600 | 700;
export type FontDef = { id: FontId; label: string; category: FontCategory; family: string; weights: readonly FontWeight[] };

const sans = (family: string) => `"${family}", ui-sans-serif, system-ui, sans-serif`;
const mono = (family: string) => `"${family}", ui-monospace, monospace`;
const FULL: readonly FontWeight[] = [400, 500, 600, 700];

export const FONTS: readonly FontDef[] = [
  { id: 'system', label: 'System (Inter)', category: 'Classic', family: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', weights: FULL },
  { id: 'mono', label: 'Mono (Roboto Mono)', category: 'Classic', family: '"Roboto Mono", ui-monospace, SFMono-Regular, Consolas, monospace', weights: FULL },
  { id: 'display', label: 'Display (Montserrat)', category: 'Classic', family: 'Montserrat, ui-sans-serif, system-ui, sans-serif', weights: FULL },
  { id: 'retro', label: 'Retro (Roboto Mono)', category: 'Classic', family: '"Roboto Mono", ui-monospace, monospace', weights: FULL },

  { id: 'inter', label: 'Inter', category: 'Sans', family: sans('Inter'), weights: FULL },
  { id: 'inter-tight', label: 'Inter Tight', category: 'Sans', family: sans('Inter Tight'), weights: FULL },
  { id: 'roboto', label: 'Roboto', category: 'Sans', family: sans('Roboto'), weights: FULL },
  { id: 'open-sans', label: 'Open Sans', category: 'Sans', family: sans('Open Sans'), weights: FULL },
  { id: 'lato', label: 'Lato', category: 'Sans', family: sans('Lato'), weights: FULL },
  { id: 'montserrat-alternates', label: 'Montserrat Alternates', category: 'Sans', family: sans('Montserrat Alternates'), weights: FULL },
  { id: 'rubik', label: 'Rubik', category: 'Sans', family: sans('Rubik'), weights: FULL },
  { id: 'nunito', label: 'Nunito', category: 'Sans', family: sans('Nunito'), weights: FULL },
  { id: 'nunito-sans', label: 'Nunito Sans', category: 'Sans', family: sans('Nunito Sans'), weights: FULL },
  { id: 'work-sans', label: 'Work Sans', category: 'Sans', family: sans('Work Sans'), weights: FULL },
  { id: 'manrope', label: 'Manrope', category: 'Sans', family: sans('Manrope'), weights: FULL },
  { id: 'dm-sans', label: 'DM Sans', category: 'Sans', family: sans('DM Sans'), weights: FULL },
  { id: 'barlow', label: 'Barlow', category: 'Sans', family: sans('Barlow'), weights: FULL },
  { id: 'mulish', label: 'Mulish', category: 'Sans', family: sans('Mulish'), weights: FULL },
  { id: 'karla', label: 'Karla', category: 'Sans', family: sans('Karla'), weights: FULL },
  { id: 'figtree', label: 'Figtree', category: 'Sans', family: sans('Figtree'), weights: FULL },
  { id: 'outfit', label: 'Outfit', category: 'Sans', family: sans('Outfit'), weights: FULL },
  { id: 'plus-jakarta-sans', label: 'Plus Jakarta Sans', category: 'Sans', family: sans('Plus Jakarta Sans'), weights: FULL },
  { id: 'space-grotesk', label: 'Space Grotesk', category: 'Sans', family: sans('Space Grotesk'), weights: FULL },
  { id: 'archivo', label: 'Archivo', category: 'Sans', family: sans('Archivo'), weights: FULL },
  { id: 'cabin', label: 'Cabin', category: 'Sans', family: sans('Cabin'), weights: FULL },

  { id: 'oswald', label: 'Oswald', category: 'Display', family: sans('Oswald'), weights: FULL },
  { id: 'bebas-neue', label: 'Bebas Neue', category: 'Display', family: sans('Bebas Neue'), weights: [400] },
  { id: 'anton', label: 'Anton', category: 'Display', family: sans('Anton'), weights: [400] },
  { id: 'archivo-black', label: 'Archivo Black', category: 'Display', family: sans('Archivo Black'), weights: [400] },
  { id: 'poppins', label: 'Poppins', category: 'Display', family: sans('Poppins'), weights: FULL },
  { id: 'sora', label: 'Sora', category: 'Display', family: sans('Sora'), weights: FULL },
  { id: 'lexend', label: 'Lexend', category: 'Display', family: sans('Lexend'), weights: FULL },
  { id: 'chivo', label: 'Chivo', category: 'Display', family: sans('Chivo'), weights: FULL },
  { id: 'bricolage-grotesque', label: 'Bricolage Grotesque', category: 'Display', family: sans('Bricolage Grotesque'), weights: FULL },

  { id: 'jetbrains-mono', label: 'JetBrains Mono', category: 'Mono', family: mono('JetBrains Mono'), weights: FULL },
  { id: 'fira-code', label: 'Fira Code', category: 'Mono', family: mono('Fira Code'), weights: FULL },
  { id: 'ibm-plex-mono', label: 'IBM Plex Mono', category: 'Mono', family: mono('IBM Plex Mono'), weights: FULL },
  { id: 'source-code-pro', label: 'Source Code Pro', category: 'Mono', family: mono('Source Code Pro'), weights: FULL },
  { id: 'space-mono', label: 'Space Mono', category: 'Mono', family: mono('Space Mono'), weights: [400, 700] },
  { id: 'ubuntu-mono', label: 'Ubuntu Mono', category: 'Mono', family: mono('Ubuntu Mono'), weights: [400, 700] },

  { id: 'caveat', label: 'Caveat', category: 'Handwritten', family: sans('Caveat'), weights: FULL },
  { id: 'patrick-hand', label: 'Patrick Hand', category: 'Handwritten', family: sans('Patrick Hand'), weights: [400] },
  { id: 'permanent-marker', label: 'Permanent Marker', category: 'Handwritten', family: sans('Permanent Marker'), weights: [400] },

  { id: 'playfair-display', label: 'Playfair Display', category: 'Serif', family: `"Playfair Display", ui-serif, Georgia, serif`, weights: FULL },
  { id: 'merriweather', label: 'Merriweather', category: 'Serif', family: `"Merriweather", ui-serif, Georgia, serif`, weights: [400, 700] },
];

export const FONT_CATEGORIES: readonly FontCategory[] = ['Classic', 'Sans', 'Display', 'Mono', 'Handwritten', 'Serif'];

const byId = new Map<string, FontDef>(FONTS.map((font) => [font.id, font]));

export function fontById(id: string): FontDef | undefined {
  return byId.get(id);
}

export function fontFamiliesFor(id: string): string {
  return byId.get(id)?.family ?? byId.get('system')!.family;
}

export function clampWeight(id: string, weight: number): FontWeight {
  const font = byId.get(id);
  if (!font || font.weights.length === 0) return 400;
  if (font.weights.includes(weight as FontWeight)) return weight as FontWeight;
  return font.weights.reduce((best, candidate) => Math.abs(candidate - weight) < Math.abs(best - weight) ? candidate : best, font.weights[0]!);
}
