/** Everything the user can change, and what it does. */

import { SEASONS, type Season } from './season.ts';

export type TreeMode = 'off' | 'subtle' | 'normal' | 'bold';
export type PetalDensity = 'sparse' | 'gentle' | 'heavy';
export type PetalSpeed = 'slow' | 'drifting' | 'brisk';

export interface SakuraOptions {
  shade: string;
  trees: TreeMode;
  /** The corner shop with the cat. Rides on the branch layers. */
  scenery: boolean;
  /**
   * Opacity of code blocks, as a percentage.
   *
   * Drives `--current-background-color`, which RemNote paints code blocks, the
   * editor container and other inset surfaces with. Named `codeOpacity` for
   * history; it governs every panel that variable reaches.
   *
   * At 0 there is no panel at all and content sits directly on the scenery. At
   * 100 the panel is solid and hides it. In between is a frosted panel with the
   * artwork reading softly through.
   */
  codeOpacity: number;
  petals: boolean;
  petalDensity: PetalDensity;
  petalSpeed: PetalSpeed;
  /**
   * Whether the petals fall as snow: pinned to a season, or left to the
   * calendar for a region.
   *
   * Only matters when petals are on. Snow replaces them, it is not a second
   * layer, so turning petals off turns the snow off too.
   */
  season: Season;
  /**
   * How strongly the shade colours the page, as a percentage.
   *
   * 100 is the palette as authored. Lower washes it toward neutral, higher
   * deepens it. A blush palette reads as too pale to some people and that is a
   * matter of taste rather than a bug, so it is a knob instead of a redesign.
   */
  tintStrength: number;
}

/**
 * Petals default to off.
 *
 * Continuous motion behind text is the kind of thing that delights on the first
 * day and gets a plugin uninstalled on the third, so it is opt in.
 */
export const DEFAULT_OPTIONS: SakuraOptions = {
  shade: 'hanami',
  trees: 'bold',
  scenery: true,
  codeOpacity: 75,
  petals: false,
  petalDensity: 'gentle',
  petalSpeed: 'drifting',
  season: 'auto',
  tintStrength: 100,
};

/** Opacity of the branch layer for each tree setting. */
export const TREE_OPACITY: Record<TreeMode, number> = {
  off: 0,
  subtle: 0.16,
  normal: 0.3,
  bold: 0.52,
};

/**
 * Density is expressed as the mask tile size: a smaller tile repeats more often,
 * so more petals land on screen. Sizes are in vh so the count stays similar
 * whatever the window height.
 *
 * These are twice the sizes the density was first tuned at, because the tiles
 * now hold four times as many pieces at half the scale (FALL_TILE_SCALE in
 * gen-art.mjs). Same density and piece size on screen, a quarter as many
 * repeats. Change one without the other and every piece doubles or halves.
 */
export const PETAL_TILE: Record<PetalDensity, { near: string; far: string; opacity: number }> = {
  sparse: { near: '128vh', far: '96vh', opacity: 0.3 },
  gentle: { near: '84vh', far: '62vh', opacity: 0.42 },
  heavy: { near: '52vh', far: '38vh', opacity: 0.55 },
};

/**
 * Seconds for one full cycle, which drops the layer one tile. The far layer is
 * always slower.
 *
 * Doubled when the tiles doubled in size, so the apparent speed did not change.
 * (A cycle once covered two tiles, for a sideways drift that needed them; with
 * the fall now straight down it covers one, and these were halved to match.)
 */
export const PETAL_DURATION: Record<PetalSpeed, { near: number; far: number }> = {
  slow: { near: 52, far: 82 },
  drifting: { near: 32, far: 50 },
  brisk: { near: 18, far: 30 },
};

export const TREE_MODES: TreeMode[] = ['off', 'subtle', 'normal', 'bold'];
export const PETAL_DENSITIES: PetalDensity[] = ['sparse', 'gentle', 'heavy'];
export const PETAL_SPEEDS: PetalSpeed[] = ['slow', 'drifting', 'brisk'];

/**
 * The tint range.
 *
 * Capped at 200 rather than left open. Deepening a light ground costs contrast
 * against text that does not move with it, and the ceiling is set where the
 * contrast tests still hold across every shade.
 */
export const TINT_MIN = 0;
export const TINT_MAX = 200;

/** Clamp a number from a free text setting to an arbitrary range. */
export function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * Coerce stored settings into something usable.
 *
 * Settings survive plugin upgrades, so a stored value may name an option that
 * no longer exists. Fall back to the default rather than emitting CSS with
 * `undefined` in it, which would break the whole stylesheet rather than one
 * setting.
 */
/**
 * Clamp a percentage from a free text number setting.
 *
 * RemNote number settings accept anything the user types, and a value outside
 * 0 to 100 produces an invalid alpha that silently voids the whole declaration.
 */
export function clampPercent(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function normalizeOptions(raw: Partial<SakuraOptions> | null | undefined): SakuraOptions {
  const input = raw ?? {};
  const pick = <T extends string>(value: unknown, allowed: T[], fallback: T): T =>
    allowed.includes(value as T) ? (value as T) : fallback;

  return {
    shade: typeof input.shade === 'string' ? input.shade : DEFAULT_OPTIONS.shade,
    trees: pick(input.trees, TREE_MODES, DEFAULT_OPTIONS.trees),
    scenery: typeof input.scenery === 'boolean' ? input.scenery : DEFAULT_OPTIONS.scenery,
    codeOpacity: clampPercent(input.codeOpacity, DEFAULT_OPTIONS.codeOpacity),
    petals: typeof input.petals === 'boolean' ? input.petals : DEFAULT_OPTIONS.petals,
    petalDensity: pick(input.petalDensity, PETAL_DENSITIES, DEFAULT_OPTIONS.petalDensity),
    petalSpeed: pick(input.petalSpeed, PETAL_SPEEDS, DEFAULT_OPTIONS.petalSpeed),
    season: pick(input.season, SEASONS, DEFAULT_OPTIONS.season),
    tintStrength: clampNumber(input.tintStrength, DEFAULT_OPTIONS.tintStrength, TINT_MIN, TINT_MAX),
  };
}
