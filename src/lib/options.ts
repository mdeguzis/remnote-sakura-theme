/** Everything the user can change, and what it does. */

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
 */
export const PETAL_TILE: Record<PetalDensity, { near: string; far: string; opacity: number }> = {
  sparse: { near: '64vh', far: '48vh', opacity: 0.3 },
  gentle: { near: '42vh', far: '31vh', opacity: 0.42 },
  heavy: { near: '26vh', far: '19vh', opacity: 0.55 },
};

/**
 * Seconds for one full cycle. The far layer is always slower.
 *
 * A cycle covers two tiles of fall, not one, because the loop has to land on a
 * whole number of tiles in both axes to stay seamless. These are doubled from
 * the single tile values so the apparent speed is unchanged.
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
  };
}
