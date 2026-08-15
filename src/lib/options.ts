/** Everything the user can change, and what it does. */

export type TreeMode = 'off' | 'subtle' | 'normal' | 'bold';
export type PetalDensity = 'sparse' | 'gentle' | 'heavy';
export type PetalSpeed = 'slow' | 'drifting' | 'brisk';

export interface SakuraOptions {
  shade: string;
  trees: TreeMode;
  /** The corner shop with the cat. Rides on the branch layers. */
  scenery: boolean;
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

/** Seconds for one full tile of fall. The far layer is always slower. */
export const PETAL_DURATION: Record<PetalSpeed, { near: number; far: number }> = {
  slow: { near: 26, far: 41 },
  drifting: { near: 16, far: 25 },
  brisk: { near: 9, far: 15 },
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
export function normalizeOptions(raw: Partial<SakuraOptions> | null | undefined): SakuraOptions {
  const input = raw ?? {};
  const pick = <T extends string>(value: unknown, allowed: T[], fallback: T): T =>
    allowed.includes(value as T) ? (value as T) : fallback;

  return {
    shade: typeof input.shade === 'string' ? input.shade : DEFAULT_OPTIONS.shade,
    trees: pick(input.trees, TREE_MODES, DEFAULT_OPTIONS.trees),
    scenery: typeof input.scenery === 'boolean' ? input.scenery : DEFAULT_OPTIONS.scenery,
    petals: typeof input.petals === 'boolean' ? input.petals : DEFAULT_OPTIONS.petals,
    petalDensity: pick(input.petalDensity, PETAL_DENSITIES, DEFAULT_OPTIONS.petalDensity),
    petalSpeed: pick(input.petalSpeed, PETAL_SPEEDS, DEFAULT_OPTIONS.petalSpeed),
  };
}
