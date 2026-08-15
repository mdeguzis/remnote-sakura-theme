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
