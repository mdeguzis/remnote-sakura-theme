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
