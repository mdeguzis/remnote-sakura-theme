/**
 * The corner scenery: a small machiya shop front with a cat sitting outside.
 *
 * Unlike the branches this is drawn by hand rather than grown from a rule.
 * Architecture has no recursive structure to exploit, and a procedural roof
 * looks like a mistake rather than a building.
 *
 * It ships as two alpha masks so it can carry two colors without spending a
 * pseudo-element it does not have:
 *
 *   structure  silhouette, painted in the branch wood color by html::before
 *   lights     lit openings, painted in the blossom color by html::after
 *
 * html::after sits above html::before, so anything in the lights layer lands on
 * top of the silhouette. Two consequences drive the whole drawing:
 *
 *   - The silhouette needs no holes cut in it. A lit doorway is simply a light
 *     shape placed over solid structure, so no even-odd fill paths are needed.
 *   - The noren curtain cannot be drawn as structure over the doorway glow,
 *     because structure is underneath. Instead the glow is drawn only where
 *     light would actually escape: below the curtain hem, and through the two
 *     slits between the curtain panels.
 *
 * The cat sits clear of the building. Drawn overlapping it, it is the same
 * color as the wall behind it and simply disappears.
 */

const VIEW_W = 460;
const VIEW_H = 340;

/** Ground line. Everything stands on this. */
const GROUND = 306;

/** Doorway extents, shared by the structure and the light that escapes it. */
const DOOR = { left: 116, right: 212, top: 186 };

/** Curtain hem. Light escapes below this and through the panel gaps. */
const NOREN_HEM = 236;

function structure() {
  const parts = [];

  // Roof. The concave sweep into flared eaves is what reads as Japanese
  // rather than as a generic gable.
  parts.push(
    '<path d="M6,150 C44,146 62,130 72,100 L112,72 L246,72 L286,100 ' +
      'C296,130 314,146 352,150 L352,160 L6,160 Z"/>'
  );

  // Thinner second eave, which gives the roof its tiled depth.
  parts.push('<path d="M30,166 L328,166 L320,180 L38,180 Z"/>');

  // Shop body and corner posts.
  parts.push(`<path d="M46,180 L312,180 L312,${GROUND} L46,${GROUND} Z"/>`);
  parts.push(`<rect x="38" y="174" width="15" height="${GROUND - 174}"/>`);
  parts.push(`<rect x="305" y="174" width="15" height="${GROUND - 174}"/>`);

  // Doorway recess, so the lit opening has a dark frame around it.
  parts.push(`<rect x="${DOOR.left - 8}" y="${DOOR.top - 8}" width="${DOOR.right - DOOR.left + 16}" height="${GROUND - DOOR.top + 8}"/>`);

  // Noren curtain across the top of the doorway.
  parts.push(`<path d="M${DOOR.left - 4},${DOOR.top} L${DOOR.right + 4},${DOOR.top} L${DOOR.right + 4},${NOREN_HEM} L${DOOR.left - 4},${NOREN_HEM} Z"/>`);

  // Window frame, left of the door.
  parts.push('<rect x="60" y="196" width="48" height="56" rx="3"/>');

  // Vertical sign board, standing just outside the left post.
  parts.push('<rect x="10" y="186" width="24" height="98" rx="4"/>');

  // Lantern hanging from the right eave.
  parts.push('<rect x="284" y="180" width="4" height="14"/>');
  parts.push('<ellipse cx="286" cy="210" rx="15" ry="19"/>');

  // A potted plant, standing OUTSIDE the right post. Drawn against the wall it
  // is the same color as the wall and disappears, exactly like the cat does.
  parts.push(`<path d="M328,${GROUND} L332,284 L354,284 L358,${GROUND} Z"/>`);
  parts.push('<circle cx="336" cy="274" r="10"/>');
  parts.push('<circle cx="351" cy="272" r="9"/>');
  parts.push('<circle cx="344" cy="264" r="11"/>');

  // Ground line, running past the frame so it does not stop in mid air.
  parts.push(`<rect x="0" y="${GROUND}" width="${VIEW_W}" height="7"/>`);

  // The cat, sitting on the ground clear of the shop and facing it.
  const catX = 388;
  parts.push(`<path d="M${catX - 27},${GROUND} C${catX - 27},274 ${catX - 15},258 ${catX},258 C${catX + 15},258 ${catX + 27},274 ${catX + 27},${GROUND} Z"/>`);
  parts.push(`<circle cx="${catX}" cy="248" r="17"/>`);
  // Ears.
  parts.push(`<path d="M${catX - 14},241 L${catX - 13},222 L${catX},235 Z"/>`);
  parts.push(`<path d="M${catX + 14},241 L${catX + 13},222 L${catX},235 Z"/>`);
  // Tail, curling away from the shop.
  parts.push(
    `<path d="M${catX + 25},300 C${catX + 50},302 ${catX + 56},276 ${catX + 40},264" ` +
      'fill="none" stroke="#000" stroke-width="9" stroke-linecap="round"/>'
  );

  return parts.join('');
}

function lights() {
  const parts = [];

  // Light escaping below the curtain hem.
  parts.push(`<rect x="${DOOR.left}" y="${NOREN_HEM}" width="${DOOR.right - DOOR.left}" height="${GROUND - NOREN_HEM}"/>`);

  // Two slits of light between the three curtain panels. These are what make
  // the curtain read as hanging cloth rather than a closed shutter.
  parts.push(`<rect x="${DOOR.left + 30}" y="${DOOR.top + 6}" width="5" height="${NOREN_HEM - DOOR.top - 6}"/>`);
  parts.push(`<rect x="${DOOR.left + 63}" y="${DOOR.top + 6}" width="5" height="${NOREN_HEM - DOOR.top - 6}"/>`);

  // Lit window panes, as four lattice squares rather than one block.
  for (const [x, y] of [
    [66, 202],
    [89, 202],
    [66, 226],
    [89, 226],
  ]) {
    parts.push(`<rect x="${x}" y="${y}" width="17" height="18" rx="2"/>`);
  }

  // Lantern glow, inset so a rim of silhouette remains around it.
  parts.push('<ellipse cx="286" cy="210" rx="10" ry="13"/>');

  // Sign face, inset from the board for the same reason.
  parts.push('<rect x="15" y="192" width="14" height="86" rx="3"/>');

  // The cat's eye. One dot, and the whole scene reads as alive.
  parts.push('<circle cx="381" cy="247" r="3.4"/>');

  return parts.join('');
}

function wrap(body) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" ` +
    `width="${VIEW_W}" height="${VIEW_H}" fill="#000">${body}</svg>`
  );
}

/** @returns {{ structure: string, lights: string }} */
export function makeShopSvgs() {
  return {
    structure: wrap(structure()),
    lights: wrap(lights()),
  };
}
