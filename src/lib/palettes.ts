/**
 * The shades.
 *
 * Colors are stored as "r, g, b" triplets rather than hex because almost every
 * surface in this theme is drawn at partial alpha so the branches can show
 * through. Keeping the channels separate lets the CSS write
 * `rgba(var(--sakura-bg), 0.72)` and vary the alpha per surface from one value.
 *
 * Every shade defines both a light and a dark palette. RemNote puts a `dark`
 * class on the root element and the user can switch at any time, so a shade
 * that only defined one would leave half the app unstyled.
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
      bgTop: '253, 243, 246',
      bgBottom: '248, 234, 240',
      surface: '252, 240, 244',
      elevated: '255, 251, 253',
      text: '58, 42, 50',
      textMuted: '134, 108, 120',
      accent: '214, 108, 150',
      accentSoft: '246, 214, 228',
      border: '234, 208, 219',
      wood: '104, 74, 68',
      blossom: '242, 160, 191',
      petal: '243, 176, 201',
    },
    dark: {
      bgTop: '28, 22, 30',
      bgBottom: '22, 17, 25',
      surface: '35, 27, 38',
      elevated: '44, 34, 47',
      text: '240, 228, 236',
      textMuted: '166, 146, 160',
      accent: '236, 148, 184',
      accentSoft: '68, 44, 60',
      border: '58, 45, 62',
      wood: '146, 108, 100',
      blossom: '224, 138, 172',
      petal: '232, 158, 188',
    },
  },
  {
    id: 'yozakura',
    name: 'Yozakura',
    description: 'Night blossoms. Deep indigo and plum with lantern pink.',
    light: {
      bgTop: '240, 238, 250',
      bgBottom: '232, 228, 246',
      surface: '238, 234, 249',
      elevated: '250, 248, 255',
      text: '44, 38, 66',
      textMuted: '116, 106, 148',
      accent: '158, 106, 194',
      accentSoft: '228, 214, 246',
      border: '218, 210, 240',
      wood: '84, 70, 104',
      blossom: '212, 154, 208',
      petal: '218, 166, 214',
    },
    dark: {
      bgTop: '19, 18, 38',
      bgBottom: '13, 12, 28',
      surface: '26, 24, 48',
      elevated: '34, 31, 60',
      text: '232, 228, 248',
      textMuted: '152, 146, 186',
      accent: '198, 152, 240',
      accentSoft: '54, 44, 88',
      border: '48, 44, 78',
      wood: '128, 110, 152',
      blossom: '226, 150, 214',
      petal: '232, 166, 222',
    },
  },
  {
    id: 'yuzakura',
    name: 'Yuzakura',
    description: 'Evening bloom. Warm coral and peach at golden hour.',
    light: {
      bgTop: '255, 246, 240',
      bgBottom: '253, 236, 228',
      surface: '254, 242, 236',
      elevated: '255, 252, 249',
      text: '62, 44, 38',
      textMuted: '142, 112, 98',
      accent: '224, 122, 104',
      accentSoft: '252, 220, 208',
      border: '242, 216, 204',
      wood: '112, 76, 60',
      blossom: '248, 168, 150',
      petal: '250, 182, 162',
    },
    dark: {
      bgTop: '32, 22, 20',
      bgBottom: '24, 16, 15',
      surface: '40, 28, 25',
      elevated: '50, 35, 31',
      text: '246, 230, 222',
      textMuted: '176, 146, 132',
      accent: '244, 148, 122',
      accentSoft: '74, 46, 38',
      border: '64, 46, 40',
      wood: '156, 112, 90',
      blossom: '236, 150, 128',
      petal: '242, 166, 144',
    },
  },
  {
    id: 'shirayuki',
    name: 'Shirayuki',
    description: 'Almost white. Blossoms barely tinted, for reading all day.',
    light: {
      bgTop: '252, 250, 251',
      bgBottom: '246, 243, 245',
      surface: '249, 246, 248',
      elevated: '255, 255, 255',
      text: '46, 42, 45',
      textMuted: '124, 116, 122',
      accent: '196, 130, 158',
      accentSoft: '242, 230, 236',
      border: '230, 224, 228',
      wood: '118, 104, 108',
      blossom: '232, 202, 214',
      petal: '236, 212, 222',
    },
    dark: {
      bgTop: '26, 25, 27',
      bgBottom: '20, 19, 21',
      surface: '32, 31, 34',
      elevated: '40, 38, 42',
      text: '238, 235, 238',
      textMuted: '160, 154, 160',
      accent: '218, 164, 188',
      accentSoft: '58, 50, 56',
      border: '54, 51, 56',
      wood: '142, 130, 134',
      blossom: '206, 178, 192',
      petal: '214, 188, 200',
    },
  },
];

export const DEFAULT_SHADE = 'hanami';

export function findShade(id: string): Shade | undefined {
  return SHADES.find((shade) => shade.id === id);
}
