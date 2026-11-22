/**
 * When the petals turn to snow.
 *
 * Winter is a matter of where the reader is, not of the calendar alone: July is
 * midwinter in Melbourne. So the automatic choices name a region rather than a
 * date range, and `auto` guesses the region from the system time zone, which is
 * the only location signal a plugin can read without asking for a permission.
 *
 * `spring` and `winter` pin the season instead. One setting carries both kinds
 * of choice because two would contradict each other: a region only means
 * something while the season is left to the calendar.
 *
 * Meteorological winter is used rather than the solstice to equinox span,
 * because it is whole months and that is what people mean by "the winter
 * months".
 */

export type Season = 'auto' | 'northern' | 'southern' | 'spring' | 'winter';
export type Hemisphere = 'northern' | 'southern';

export const SEASONS: Season[] = ['auto', 'northern', 'southern', 'spring', 'winter'];

/** Months are 0 based, as `Date.prototype.getMonth` returns them. */
export const WINTER_MONTHS: Record<Hemisphere, number[]> = {
  northern: [11, 0, 1],
  southern: [5, 6, 7],
};

/**
 * Guess the hemisphere from an IANA time zone name such as `Australia/Sydney`.
 *
 * Only `auto` uses this. An unknown or empty zone must still return something,
 * because it decides whether a stylesheet is emitted with snow in it.
 */
export function hemisphereFromTimeZone(timeZone: string): Hemisphere {
  if (SOUTHERN_ZONES.has(timeZone)) return 'southern';
  if (SOUTHERN_PREFIXES.some((prefix) => timeZone.startsWith(prefix))) return 'southern';
  // Everything else, including an unknown or empty zone, follows the northern
  // calendar. That is where most readers are, and near the equator it gives
  // a December of snow rather than none at all, which is the friendlier
  // mistake for a decoration.
  return 'northern';
}

/**
 * Zone prefixes that lie wholly south of the equator.
 *
 * IANA names a zone after a region and a city, so the region is a reliable
 * proxy for the hemisphere. These regions are entirely southern; the rest of
 * the southern world is listed zone by zone below, because it shares a region
 * prefix (America/, Africa/, Pacific/, Indian/) with northern zones.
 */
const SOUTHERN_PREFIXES = ['Australia/', 'Antarctica/', 'America/Argentina/'];

/** Southern zones whose region prefix is shared with the north. */
const SOUTHERN_ZONES = new Set([
  // South America
  'America/Sao_Paulo',
  'America/Santiago',
  'America/Montevideo',
  'America/Asuncion',
  'America/La_Paz',
  'America/Lima',
  'America/Buenos_Aires',
  'America/Punta_Arenas',
  'America/Campo_Grande',
  'America/Cuiaba',
  'America/Porto_Velho',
  'America/Recife',
  'America/Bahia',
  'America/Maceio',
  'America/Fortaleza',
  'America/Belem',
  'America/Araguaina',
  'Atlantic/Stanley',
  'Atlantic/South_Georgia',
  // Africa
  'Africa/Johannesburg',
  'Africa/Maputo',
  'Africa/Harare',
  'Africa/Lusaka',
  'Africa/Windhoek',
  'Africa/Gaborone',
  'Africa/Maseru',
  'Africa/Mbabane',
  'Africa/Blantyre',
  'Africa/Lubumbashi',
  'Africa/Luanda',
  'Africa/Dar_es_Salaam',
  'Africa/Kigali',
  'Africa/Bujumbura',
  // Indian Ocean
  'Indian/Antananarivo',
  'Indian/Mauritius',
  'Indian/Reunion',
  'Indian/Mayotte',
  'Indian/Comoro',
  'Indian/Kerguelen',
  'Indian/Cocos',
  'Indian/Christmas',
  // Pacific and Oceania
  'Pacific/Auckland',
  'Pacific/Chatham',
  'Pacific/Fiji',
  'Pacific/Tongatapu',
  'Pacific/Apia',
  'Pacific/Noumea',
  'Pacific/Efate',
  'Pacific/Port_Moresby',
  'Pacific/Guadalcanal',
  'Pacific/Norfolk',
  'Pacific/Rarotonga',
  'Pacific/Tahiti',
  'Pacific/Marquesas',
  'Pacific/Gambier',
  'Pacific/Pitcairn',
  'Pacific/Easter',
  'Pacific/Niue',
  'Pacific/Fakaofo',
  'Pacific/Funafuti',
  'Pacific/Wallis',
  'Pacific/Pago_Pago',
  // Southeast Asia, south of the equator
  'Asia/Jakarta',
  'Asia/Makassar',
  'Asia/Jayapura',
  'Asia/Dili',
  // Common aliases
  'Brazil/East',
  'Chile/Continental',
  'NZ',
]);

/** The system time zone, or an empty string where Intl cannot say. */
export function currentTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    // Intl is present in every RemNote client, but an empty zone is a defined
    // input to hemisphereFromTimeZone, so there is no reason to throw here.
    return '';
  }
}

/** Which hemisphere decides the season, or null when the season is pinned. */
export function resolveHemisphere(season: Season, timeZone: string): Hemisphere | null {
  if (season === 'spring' || season === 'winter') return null;
  if (season === 'auto') return hemisphereFromTimeZone(timeZone);
  return season;
}

/** True when the petals should fall as snow at this moment, for this setting. */
export function isSnowSeason(season: Season, now: Date, timeZone: string): boolean {
  if (season === 'winter') return true;
  const hemisphere = resolveHemisphere(season, timeZone);
  if (hemisphere === null) return false;
  return WINTER_MONTHS[hemisphere].includes(now.getMonth());
}
