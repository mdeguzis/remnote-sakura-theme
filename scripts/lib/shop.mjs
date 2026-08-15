/**
 * The corner scenery: a sushi shop front with a cat sitting outside.
 *
 * Drawn by hand rather than grown from a rule. Architecture has no recursive
 * structure to exploit, and a procedural roof looks like a mistake.
 *
 * Two alpha masks, so it carries two colors without spending a pseudo-element
 * it does not have:
 *
 *   structure  silhouette, painted in the branch wood color by html::before
 *   lights     lit surfaces, painted in the blossom color by html::after
 *
 * html::after sits above html::before, so lights land on top of structure.
 * Three consequences drive the whole drawing:
 *
 *   - The silhouette needs no holes cut in it. A lit opening is a light shape
 *     placed over solid structure, so no even-odd fill paths are needed.
 *   - The noren cannot be structure drawn over the counter glow, because
 *     structure is underneath. The glow is drawn only where light escapes.
 *   - Detail sitting ON a lit panel (sign lettering, sushi in the case, text on
 *     the A-frame) cannot be drawn in the structure layer, because that layer
 *     is beneath the panel and would be hidden by it. It is drawn in the lights
 *     layer at a higher alpha instead, so it reads as brighter marks on a lit
 *     board rather than as dark marks, which is the closest two colors get.
 *
 * Anything meant to be seen must sit clear of the wall behind it. Drawn over
 * the building it is the same color as the building and vanishes.
 *
 * Reference is a cartoon sushi storefront: heavy tiled roof, big signboard,
 * dark noren over a glazed display case, latticed sliding door, plants and
 * bamboo at the edges, A-frame sign on the pavement.
 */

const VIEW_W = 820;
const VIEW_H = 400;

/** Ground line. Everything stands on this. */
const GROUND = 356;

/**
 * The shop is a large solid mass where the branches are thin traceries. At the
 * same layer opacity it reads as a heavy block sitting on the interface.
 *
 * They share one element and therefore one opacity, so this cannot be separated
 * in CSS. Because these are alpha masks, the fix belongs in the artwork.
 */
/*
 * These are balanced against each other, not chosen independently, and numeric
 * parity is not the target.
 *
 * The blossom layer is painted at 1.25x the branch layer opacity, so a light
 * drawn at alpha a lands at 1.25a while structure lands at 1.0a. The previous
 * values left detail slightly ABOVE structure on screen (0.390 vs 0.364).
 *
 * Worse, equal alpha does not mean equal prominence. Structure is a desaturated
 * brown covering a large area; lights are small, saturated pink marks. On a pale
 * pink page the brown mass sits close to the background in both luminance and
 * chroma and recedes, while the pink marks stay distinct. Put a translucent
 * panel over the top and the mass disappears first, leaving the lattice panes
 * and the sign floating with no building around them. That effect gets stronger
 * the more transparent the panel is, which is exactly what it looks like.
 *
 * So structure is now numerically dominant, to buy back the prominence it loses
 * perceptually:
 *
 *   structure  0.85 x 1.00 = 0.85
 *   lights     0.28 x 1.25 = 0.35
 *   detail     0.40 x 1.25 = 0.50
 */
const STRUCTURE_ALPHA = 0.85;
const LIGHT_ALPHA = 0.28;
const DETAIL_ALPHA = 0.4;

const SHOP = { left: 70, right: 520 };
const ROOF = { left: 24, right: 566, top: 24, eave: 112 };
const SIGN = { top: 112, bottom: 162 };
const NOREN = { left: 100, right: 300, top: 172, hem: 242 };
const CASE = { top: 242, bottom: 304 };
const DOOR = { left: 322, right: 500, top: 172 };

function structure() {
  const parts = [];

  // Roof. The concave sweep into flared eaves is what reads as Japanese rather
  // than as a generic gable.
  parts.push(
    `<path d="M${ROOF.left},${ROOF.eave} C68,106 92,88 106,54 L164,${ROOF.top} ` +
      `L426,${ROOF.top} L484,54 C498,88 522,106 ${ROOF.right},${ROOF.eave} ` +
      `L${ROOF.right},${ROOF.eave + 16} L${ROOF.left},${ROOF.eave + 16} Z"/>`
  );

  // Tile courses. Horizontal rows read as a tiled roof far more than vertical
  // ridges alone, which is what the previous draft had. Kept inside the flat
  // span so they do not rise past the sloping eave and stick out.
  for (const y of [56, 82]) {
    parts.push(`<rect x="118" y="${y}" width="354" height="4" rx="2"/>`);
  }
  for (let x = 172; x < 420; x += 24) {
    parts.push(`<rect x="${x}" y="30" width="4" height="78" rx="2"/>`);
  }

  // Round tile ends along the eave, the detail that most says "tiled roof".
  for (let x = ROOF.left + 12; x < ROOF.right - 6; x += 22) {
    parts.push(`<circle cx="${x}" cy="${ROOF.eave + 16}" r="9"/>`);
  }

  // Signboard frame.
  parts.push(`<rect x="86" y="${SIGN.top}" width="418" height="${SIGN.bottom - SIGN.top}" rx="6"/>`);

  // Shop body and corner posts.
  parts.push(`<rect x="${SHOP.left}" y="${SIGN.bottom}" width="${SHOP.right - SHOP.left}" height="${GROUND - SIGN.bottom}"/>`);
  parts.push(`<rect x="${SHOP.left - 4}" y="${SIGN.bottom - 6}" width="20" height="${GROUND - SIGN.bottom + 6}"/>`);
  parts.push(`<rect x="${SHOP.right - 16}" y="${SIGN.bottom - 6}" width="20" height="${GROUND - SIGN.bottom + 6}"/>`);

  // Paper lantern, hung from the roof overhang OUTSIDE the left post. Hung in
  // front of the wall it would be the same color as the wall and invisible.
  parts.push(`<rect x="42" y="${ROOF.eave + 16}" width="4" height="18"/>`);
  parts.push('<ellipse cx="44" cy="208" rx="21" ry="27"/>');
  parts.push('<rect x="34" y="176" width="21" height="7" rx="3"/>');
  parts.push('<rect x="34" y="233" width="21" height="7" rx="3"/>');

  // Noren curtain over the counter.
  parts.push(`<rect x="${NOREN.left - 8}" y="${NOREN.top}" width="${NOREN.right - NOREN.left + 16}" height="${NOREN.hem - NOREN.top}"/>`);

  // Display case frame and the solid cabinet below the glass.
  parts.push(`<rect x="${NOREN.left - 8}" y="${CASE.top}" width="${NOREN.right - NOREN.left + 16}" height="${CASE.bottom - CASE.top}" rx="4"/>`);
  parts.push(`<rect x="${NOREN.left - 12}" y="${CASE.bottom}" width="${NOREN.right - NOREN.left + 24}" height="${GROUND - CASE.bottom}"/>`);

  // Lattice sliding door.
  parts.push(`<rect x="${DOOR.left}" y="${DOOR.top}" width="${DOOR.right - DOOR.left}" height="${GROUND - DOOR.top}" rx="4"/>`);

  // Potted plant to the right of the shop, leafy rather than three blobs.
  parts.push(`<path d="M530,${GROUND} L536,314 L568,314 L574,${GROUND} Z"/>`);
  for (const [dx, dy, rx, ry, rot] of [
    [-16, -30, 15, 7, -28],
    [16, -34, 15, 7, 26],
    [-8, -52, 13, 6, -58],
    [10, -56, 13, 6, 54],
    [0, -66, 11, 6, 0],
  ]) {
    const cx = 552 + dx;
    const cy = 314 + dy;
    parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})"/>`);
  }

  // Bamboo, with segment rings and paired leaves.
  for (const [x, top] of [
    [590, 176],
    [606, 206],
  ]) {
    parts.push(`<rect x="${x}" y="${top}" width="8" height="${GROUND - top}" rx="4"/>`);
    for (let y = top + 34; y < GROUND - 20; y += 42) {
      parts.push(`<rect x="${x - 2}" y="${y}" width="12" height="4" rx="2"/>`);
    }
    parts.push(`<ellipse cx="${x - 14}" cy="${top + 20}" rx="16" ry="5" transform="rotate(-22 ${x - 14} ${top + 20})"/>`);
    parts.push(`<ellipse cx="${x + 22}" cy="${top + 46}" rx="16" ry="5" transform="rotate(20 ${x + 22} ${top + 46})"/>`);
  }

  // A-frame sign on the pavement.
  parts.push(`<path d="M626,${GROUND} L642,268 L682,268 L698,${GROUND} Z"/>`);
  parts.push('<rect x="634" y="262" width="56" height="9" rx="4"/>');

  // Ground line, running past the frame so it does not stop in mid air.
  parts.push(`<rect x="0" y="${GROUND}" width="${VIEW_W}" height="9"/>`);

  // The cat, sitting on the pavement clear of everything and facing the shop.
  const catX = 748;
  parts.push(
    `<path d="M${catX - 30},${GROUND} C${catX - 30},320 ${catX - 17},303 ${catX},303 ` +
      `C${catX + 17},303 ${catX + 30},320 ${catX + 30},${GROUND} Z"/>`
  );
  parts.push(`<circle cx="${catX}" cy="291" r="19"/>`);
  parts.push(`<path d="M${catX - 16},283 L${catX - 15},261 L${catX},276 Z"/>`);
  parts.push(`<path d="M${catX + 16},283 L${catX + 15},261 L${catX},276 Z"/>`);
  parts.push(
    `<path d="M${catX + 28},350 C${catX + 50},352 ${catX + 54},326 ${catX + 39},313" ` +
      'fill="none" stroke="#000" stroke-width="10" stroke-linecap="round"/>'
  );

  return `<g fill-opacity="${STRUCTURE_ALPHA}" stroke-opacity="${STRUCTURE_ALPHA}">${parts.join('')}</g>`;
}

function lights() {
  const parts = [];

  // Signboard face, inset so a frame of silhouette remains.
  parts.push(`<rect x="96" y="${SIGN.top + 9}" width="398" height="${SIGN.bottom - SIGN.top - 18}" rx="4"/>`);

  // Lantern glow.
  parts.push('<ellipse cx="44" cy="208" rx="15" ry="20"/>');

  // Noren. The panel gaps make it read as hanging cloth, and the two roundels
  // are the shop crest.
  const span = NOREN.right - NOREN.left;
  for (let i = 1; i <= 3; i++) {
    parts.push(`<rect x="${NOREN.left + (span / 4) * i - 3}" y="${NOREN.top + 7}" width="6" height="${NOREN.hem - NOREN.top - 7}"/>`);
  }
  parts.push(`<circle cx="${NOREN.left + span * 0.28}" cy="${NOREN.top + 32}" r="13"/>`);
  parts.push(`<circle cx="${NOREN.left + span * 0.72}" cy="${NOREN.top + 32}" r="13"/>`);

  // The glazed case, lit from inside.
  parts.push(`<rect x="${NOREN.left}" y="${CASE.top + 7}" width="${span}" height="${CASE.bottom - CASE.top - 14}" rx="3"/>`);

  // Lattice door panes. A grid of lit squares reads as paper and glass, where
  // one lit rectangle would just look like a hole.
  const cols = 4;
  const rows = 4;
  const pad = 12;
  const paneW = (DOOR.right - DOOR.left - pad * 2 - (cols - 1) * 8) / cols;
  const paneH = (GROUND - DOOR.top - pad * 2 - (rows - 1) * 8) / rows;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      parts.push(
        `<rect x="${(DOOR.left + pad + c * (paneW + 8)).toFixed(1)}" ` +
          `y="${(DOOR.top + pad + r * (paneH + 8)).toFixed(1)}" ` +
          `width="${paneW.toFixed(1)}" height="${paneH.toFixed(1)}" rx="2"/>`
      );
    }
  }

  // A-frame board face.
  parts.push('<path d="M640,348 L652,278 L672,278 L684,348 Z"/>');

  // The cat's eye. One dot, and the scene reads as alive.
  parts.push('<circle cx="740" cy="290" r="3.8"/>');

  return `<g fill-opacity="${LIGHT_ALPHA}">${parts.join('')}</g>`;
}

/**
 * Detail that sits on top of the lit panels.
 *
 * Drawn brighter than the panel underneath rather than darker, because the only
 * other color available is the structure layer, which is painted below the
 * panel and would be covered by it.
 */
function detail() {
  const parts = [];

  // Sign lettering.
  for (let i = 0; i < 5; i++) {
    parts.push(`<rect x="${150 + i * 46}" y="128" width="30" height="18" rx="3"/>`);
  }
  // Sushi illustration at the right of the board.
  parts.push('<rect x="404" y="126" width="62" height="22" rx="11"/>');

  // Sushi pieces sitting in the display case.
  for (let i = 0; i < 6; i++) {
    parts.push(`<rect x="${112 + i * 31}" y="${CASE.top + 24}" width="22" height="14" rx="6"/>`);
  }

  // Lettering on the A-frame board.
  for (let i = 0; i < 3; i++) {
    parts.push(`<rect x="${653 - i}" y="${292 + i * 18}" width="18" height="9" rx="3"/>`);
  }

  return `<g fill-opacity="${DETAIL_ALPHA}">${parts.join('')}</g>`;
}

function wrap(body) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" ` +
    `width="${VIEW_W}" height="${VIEW_H}" fill="#000">` +
    // Mirrored: the scene is composed shop first and cat last, but it is
    // anchored to the bottom right corner, which would bury the cat in the
    // corner. Flipping moves it to the inward side, still facing the shop.
    `<g transform="translate(${VIEW_W},0) scale(-1,1)">${body}</g></svg>`
  );
}

/** @returns {{ structure: string, lights: string }} */
export function makeShopSvgs() {
  return {
    structure: wrap(structure()),
    lights: wrap(lights() + detail()),
  };
}
