/**
 * The shades.
 *
 * Colors are stored as "r, g, b" triplets rather than hex because almost every
 * surface in this theme is drawn at partial alpha so the branches can show
 * through. Keeping the channels separate lets the CSS write
 * `rgba(var(--sakura-bg), 0.72)` and vary the alpha per surface from one value.
 *
 * Every shade defines both a light and a dark palette. RemNote applies a `dark`
 * class when dark mode is on, not necessarily to the root element, and the user
 * can switch at any time, so a shade that only defined one palette would leave
 * half the app unstyled. See compose.ts for how that selector is handled.
 *
 * The dark palettes are deliberately not near black. A cherry theme that drops
 * to charcoal at night keeps the branches but loses the reason for them: the
 * colour goes grey and what is left is a dark theme with a tree in it. These
 * grounds hold their plum, indigo and ember instead, which costs some contrast
 * against pure black but keeps the blossom colour reading after dark. The
 * contrast that remains is checked by tests rather than by eye.
 */

export interface Palette {
  /** Page background, top and bottom of the vertical wash. */
  bgTop: string;
  bgBottom: string;
  /** Panels and sidebars. */
  surface: string;
  /** Cards, dialogs and menus, which sit above the page. */
  elevated: string;
  text: string;
  textMuted: string;
  accent: string;
  /** Tinted fill behind accented content, used at low alpha. */
  accentSoft: string;
  border: string;
  /** Artwork. */
  wood: string;
  blossom: string;
  petal: string;
}

export interface Shade {
  id: string;
  name: string;
  description: string;
  light: Palette;
  dark: Palette;
}

export const SHADES: Shade[] = [
  {
    id: 'hanami',
    name: 'Hanami',
    description: 'Pale blush under an overcast spring sky. The default.',
    light: {
      bgTop: '248, 228, 236',
      bgBottom: '240, 212, 224',
      surface: '245, 222, 232',
      elevated: '254, 246, 249',
      text: '48, 32, 40',
      textMuted: '118, 90, 104',
      accent: '196, 78, 126',
      accentSoft: '240, 200, 218',
      border: '224, 190, 206',
      wood: '104, 74, 68',
      blossom: '242, 160, 191',
      petal: '243, 176, 201',
    },
    dark: {
      bgTop: '48, 29, 42',
      bgBottom: '36, 21, 31',
      surface: '58, 36, 50',
      elevated: '71, 46, 61',
      text: '250, 235, 243',
      textMuted: '203, 172, 188',
      accent: '248, 154, 194',
      accentSoft: '99, 56, 80',
      border: '92, 60, 79',
      wood: '182, 132, 128',
      blossom: '246, 160, 196',
      petal: '248, 176, 206',
    },
  },
  {
    id: 'yozakura',
    name: 'Yozakura',
    description: 'Night blossoms. Deep indigo and plum with lantern pink.',
    light: {
      bgTop: '232, 227, 246',
      bgBottom: '221, 214, 240',
      surface: '229, 222, 244',
      elevated: '248, 245, 254',
      text: '36, 30, 58',
      textMuted: '100, 90, 134',
      accent: '138, 82, 180',
      accentSoft: '219, 202, 242',
      border: '206, 196, 232',
      wood: '84, 70, 104',
      blossom: '212, 154, 208',
      petal: '218, 166, 214',
    },
    dark: {
      bgTop: '42, 34, 72',
      bgBottom: '31, 25, 56',
      surface: '52, 42, 88',
      elevated: '64, 52, 106',
      text: '240, 235, 254',
      textMuted: '186, 178, 220',
      accent: '216, 168, 252',
      accentSoft: '84, 66, 130',
      border: '82, 70, 124',
      wood: '160, 138, 190',
      blossom: '242, 168, 230',
      petal: '244, 180, 236',
    },
  },
  {
    id: 'yuzakura',
    name: 'Yuzakura',
    description: 'Evening bloom. Warm coral and peach at golden hour.',
    light: {
      bgTop: '253, 236, 226',
      bgBottom: '249, 222, 208',
      surface: '252, 232, 221',
      elevated: '255, 249, 244',
      text: '52, 35, 29',
      textMuted: '128, 96, 82',
      accent: '206, 96, 76',
      accentSoft: '248, 208, 190',
      border: '236, 204, 188',
      wood: '112, 76, 60',
      blossom: '248, 168, 150',
      petal: '250, 182, 162',
    },
    dark: {
      bgTop: '58, 33, 28',
      bgBottom: '44, 24, 21',
      surface: '70, 41, 34',
      elevated: '85, 51, 43',
      text: '252, 236, 228',
      textMuted: '212, 176, 160',
      accent: '252, 162, 134',
      accentSoft: '110, 62, 50',
      border: '104, 64, 54',
      wood: '196, 142, 114',
      blossom: '248, 166, 142',
      petal: '250, 180, 158',
    },
  },
  {
    id: 'shirayuki',
    name: 'Shirayuki',
    description: 'Almost white. Blossoms barely tinted, for reading all day.',
    light: {
      bgTop: '247, 242, 245',
      bgBottom: '239, 232, 236',
      surface: '244, 238, 241',
      elevated: '253, 251, 252',
      text: '38, 34, 37',
      textMuted: '110, 101, 107',
      accent: '178, 104, 136',
      accentSoft: '236, 220, 229',
      border: '222, 213, 218',
      wood: '118, 104, 108',
      blossom: '232, 202, 214',
      petal: '236, 212, 222',
    },
    dark: {
      bgTop: '51, 40, 46',
      bgBottom: '40, 30, 36',
      surface: '56, 49, 54',
      elevated: '68, 60, 66',
      text: '246, 242, 245',
      textMuted: '194, 184, 190',
      accent: '236, 184, 206',
      accentSoft: '84, 72, 80',
      border: '86, 76, 84',
      wood: '176, 160, 166',
      blossom: '230, 198, 212',
      petal: '234, 208, 220',
    },
  },
];

export const DEFAULT_SHADE = 'hanami';

export function findShade(id: string): Shade | undefined {
  return SHADES.find((shade) => shade.id === id);
}

/* ------------------------------------------------------------ tint strength */

/**
 * "248, 228, 236" -> [248, 228, 236].
 *
 * This palette stores channels, not hex, because nearly every surface is drawn
 * at partial alpha. The tint maths needs real numbers, so it parses on the way
 * in and formats on the way back out; the stored form never changes.
 */
function parseTriplet(triplet: string): [number, number, number] {
  const parts = triplet.split(',').map((part) => Number.parseFloat(part.trim()));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error(`palette colour is not an "r, g, b" triplet: ${JSON.stringify(triplet)}`);
  }
  return [parts[0], parts[1], parts[2]];
}

function formatTriplet([r, g, b]: [number, number, number]): string {
  return [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c)))).join(', ');
}

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return [0, 0, l];

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;

  return [h, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255];

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };

  return [channel(h + 1 / 3) * 255, channel(h) * 255, channel(h - 1 / 3) * 255];
}

/**
 * Deepen or wash out one colour.
 *
 * `k` is the strength as a fraction, so 1 is the palette exactly as authored,
 * 0 removes the tint entirely and 2 is roughly twice as present.
 *
 * Saturation scales directly, which is most of the effect. Lightness moves as
 * well, because "too pale" is the actual complaint a blush theme gets and more
 * saturation alone does not fix a wash that is simply too light. Both modes
 * move DOWNWARD in lightness as strength rises: on a light palette that deepens
 * the ground, on a dark one it sinks it further.
 *
 * `weight` scales the lightness movement only. Surfaces that hold a lot of text
 * get less of it, because lightness is what trades away contrast.
 */
function tintColour(triplet: string, k: number, weight = 1): string {
  if (k === 1) return triplet;

  const [h, s, l] = rgbToHsl(parseTriplet(triplet));
  const saturation = Math.max(0, Math.min(1, s * k));

  const headroom = l > 0.5 ? (1 - l) * 1.8 : l * 0.35;
  const lightness = Math.max(0.04, Math.min(0.99, l - (k - 1) * headroom * weight));

  return formatTriplet(hslToRgb([h, saturation, lightness]));
}

/**
 * Apply the tint strength setting to a palette.
 *
 * Only the grounds and surfaces move. Text, accent, border and the artwork
 * colours are left exactly as authored: text has to stay put for the contrast
 * floor to mean anything, and shifting wood, blossom or petal would change what
 * the tree is made of rather than what it stands on.
 */
export function withTintStrength(palette: Palette, strength: number): Palette {
  const k = strength / 100;
  if (k === 1) return palette;

  return {
    ...palette,
    bgTop: tintColour(palette.bgTop, k),
    bgBottom: tintColour(palette.bgBottom, k),
    surface: tintColour(palette.surface, k),
    // Elevated carries menus, dialogs and code blocks, so it takes the colour
    // shift but only a third of the lightness shift.
    elevated: tintColour(palette.elevated, k, 0.34),
  };
}
