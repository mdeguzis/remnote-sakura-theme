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
 *   lights     lit openings, painted in the blossom color by html::after
 *
 * html::after sits above html::before, so lights land on top of structure. Two
 * consequences drive the drawing:
 *
 *   - The silhouette needs no holes cut in it. A lit doorway is a light shape
 *     placed over solid structure, so no even-odd fill paths are needed.
 *   - The noren cannot be structure drawn over the doorway glow, because
 *     structure is underneath. The glow is drawn only where light escapes:
 *     below the curtain hem and through the gaps between panels.
 *
 * Anything meant to be seen must sit clear of the wall behind it. Drawn over
 * the building it is the same color as the building and vanishes.
 */

const VIEW_W = 700;
const VIEW_H = 380;

/** Ground line. Everything stands on this. */
const GROUND = 340;

/**
 * The shop is a large solid mass, unlike the branches which are thin traceries.
 * At the same layer opacity it reads as a heavy block sitting on the interface,
 * which is what it looked like behind a code block.
 *
 * Because these are alpha masks, the fix belongs in the artwork rather than in
 * the CSS: drawing at reduced alpha makes the scenery recede while leaving the
 * branch layer free to stay bold. The two cannot be separated in CSS, since
 * they share one element and therefore one opacity.
 */
const STRUCTURE_ALPHA = 0.58;
const LIGHT_ALPHA = 0.5;

/** Shop front extents. */
const SHOP = { left: 50, right: 500 };
const SIGN = { top: 106, bottom: 152 };

/** Noren curtain over the counter opening. */
const NOREN = { left: 140, right: 330, top: 165, hem: 225 };

/** Glazed display counter under the curtain. */
const COUNTER = { top: 225, bottom: 282 };

/** Lattice sliding door. */
const DOOR = { left: 352, right: 470, top: 165 };

function structure() {
  const parts = [];

  // Tiled roof. The concave sweep into flared eaves is what reads as Japanese
  // rather than as a generic gable.
  parts.push(
    '<path d="M8,104 C52,100 74,84 86,52 L140,30 L410,30 L464,52 ' +
      'C476,84 498,100 542,104 L542,118 L8,118 Z"/>'
  );

  // Tile ridges along the roof face. Evenly spaced verticals are enough to
  // read as tiling at this size.
  //
  // Kept inside the flat span of the roof (x 140 to 410). Run wider and the
  // outer ridges rise past the sloping eave and stick out of the silhouette as
  // little tabs, which is what the first draft did.
  for (let x = 152; x < 404; x += 26) {
    parts.push(`<rect x="${x}" y="38" width="5" height="66" rx="2"/>`);
  }

  // Signboard frame above the shop front.
  parts.push(`<rect x="${SHOP.left + 10}" y="${SIGN.top}" width="${SHOP.right - SHOP.left - 20}" height="${SIGN.bottom - SIGN.top}" rx="5"/>`);

  // Shop body and the two corner posts.
  parts.push(`<path d="M${SHOP.left},${SIGN.bottom} L${SHOP.right},${SIGN.bottom} L${SHOP.right},${GROUND} L${SHOP.left},${GROUND} Z"/>`);
  parts.push(`<rect x="${SHOP.left}" y="${SIGN.bottom - 6}" width="18" height="${GROUND - SIGN.bottom + 6}"/>`);
  parts.push(`<rect x="${SHOP.right - 18}" y="${SIGN.bottom - 6}" width="18" height="${GROUND - SIGN.bottom + 6}"/>`);

  // Paper lantern hanging at the left of the shop front.
  parts.push(`<rect x="98" y="${SIGN.bottom}" width="4" height="14"/>`);
  parts.push('<ellipse cx="100" cy="200" rx="26" ry="32"/>');
  // Cap and base, which is what separates a lantern from an egg.
  parts.push('<rect x="86" y="166" width="28" height="7" rx="3"/>');
  parts.push('<rect x="86" y="227" width="28" height="7" rx="3"/>');

  // Noren curtain across the counter opening.
  parts.push(`<rect x="${NOREN.left - 6}" y="${NOREN.top}" width="${NOREN.right - NOREN.left + 12}" height="${NOREN.hem - NOREN.top}"/>`);

  // Counter frame, and the solid base cabinet below the glass.
  parts.push(`<rect x="${NOREN.left - 6}" y="${COUNTER.top}" width="${NOREN.right - NOREN.left + 12}" height="${COUNTER.bottom - COUNTER.top}" rx="3"/>`);
  parts.push(`<rect x="${NOREN.left - 10}" y="${COUNTER.bottom}" width="${NOREN.right - NOREN.left + 20}" height="${GROUND - COUNTER.bottom}"/>`);

  // Lattice sliding door. Frame first, then the muntins that make it lattice.
  parts.push(`<rect x="${DOOR.left}" y="${DOOR.top}" width="${DOOR.right - DOOR.left}" height="${GROUND - DOOR.top}" rx="3"/>`);

  // Left potted plant.
  parts.push(`<path d="M14,${GROUND} L18,306 L46,306 L50,${GROUND} Z"/>`);
  parts.push('<circle cx="22" cy="294" r="11"/>');
  parts.push('<circle cx="42" cy="292" r="10"/>');
  parts.push('<circle cx="32" cy="282" r="12"/>');

  // Bamboo at the right of the shop.
  for (const [x, top] of [
    [512, 214],
    [526, 236],
  ]) {
    parts.push(`<rect x="${x}" y="${top}" width="7" height="${GROUND - top}" rx="3"/>`);
    parts.push(`<ellipse cx="${x - 9}" cy="${top + 22}" rx="12" ry="5"/>`);
    parts.push(`<ellipse cx="${x + 16}" cy="${top + 44}" rx="12" ry="5"/>`);
  }

  // A-frame sign standing on the pavement.
  parts.push(`<path d="M548,${GROUND} L562,264 L596,264 L610,${GROUND} Z"/>`);
  parts.push('<rect x="556" y="258" width="46" height="8" rx="3"/>');

  // Ground line, running past the frame so it does not stop in mid air.
  parts.push(`<rect x="0" y="${GROUND}" width="${VIEW_W}" height="8"/>`);

  // The cat, sitting on the pavement clear of everything and facing the shop.
  const catX = 652;
  parts.push(
    `<path d="M${catX - 28},${GROUND} C${catX - 28},306 ${catX - 16},290 ${catX},290 ` +
      `C${catX + 16},290 ${catX + 28},306 ${catX + 28},${GROUND} Z"/>`
  );
  parts.push(`<circle cx="${catX}" cy="279" r="18"/>`);
  parts.push(`<path d="M${catX - 15},271 L${catX - 14},251 L${catX},265 Z"/>`);
  parts.push(`<path d="M${catX + 15},271 L${catX + 14},251 L${catX},265 Z"/>`);
  parts.push(
    `<path d="M${catX + 26},334 C${catX + 46},336 ${catX + 50},312 ${catX + 36},300" ` +
      'fill="none" stroke="#000" stroke-width="9" stroke-linecap="round"/>'
  );

  return `<g fill-opacity="${STRUCTURE_ALPHA}" stroke-opacity="${STRUCTURE_ALPHA}">${parts.join('')}</g>`;
}

function lights() {
  const parts = [];

  // Signboard face, inset so a frame of silhouette remains around it.
  parts.push(`<rect x="${SHOP.left + 18}" y="${SIGN.top + 8}" width="${SHOP.right - SHOP.left - 36}" height="${SIGN.bottom - SIGN.top - 16}" rx="3"/>`);

  // Lantern glow, inset for the same reason.
  parts.push('<ellipse cx="100" cy="200" rx="19" ry="25"/>');

  // Light escaping between the noren panels. Four panels, three gaps. The gaps
  // are what make it read as hanging cloth rather than a shutter.
  const panelSpan = NOREN.right - NOREN.left;
  for (let i = 1; i <= 3; i++) {
    parts.push(
      `<rect x="${NOREN.left + (panelSpan / 4) * i - 3}" y="${NOREN.top + 6}" width="6" height="${NOREN.hem - NOREN.top - 6}"/>`
    );
  }

  // The glazed counter, lit from inside.
  parts.push(`<rect x="${NOREN.left}" y="${COUNTER.top + 6}" width="${panelSpan}" height="${COUNTER.bottom - COUNTER.top - 12}" rx="2"/>`);

  // Lattice door panes. A grid of lit squares reads as paper and glass, where
  // one lit rectangle would just look like a hole.
  const cols = 4;
  const rows = 5;
  const padding = 10;
  const paneW = (DOOR.right - DOOR.left - padding * 2 - (cols - 1) * 6) / cols;
  const paneH = (GROUND - DOOR.top - padding * 2 - (rows - 1) * 6) / rows;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      parts.push(
        `<rect x="${(DOOR.left + padding + c * (paneW + 6)).toFixed(1)}" ` +
          `y="${(DOOR.top + padding + r * (paneH + 6)).toFixed(1)}" ` +
          `width="${paneW.toFixed(1)}" height="${paneH.toFixed(1)}" rx="2"/>`
      );
    }
  }

  // A-frame sign face.
  parts.push('<path d="M560,330 L570,274 L590,274 L600,330 Z"/>');

  // The cat's eye. One dot, and the scene reads as alive.
  parts.push('<circle cx="645" cy="278" r="3.6"/>');

  return `<g fill-opacity="${LIGHT_ALPHA}">${parts.join('')}</g>`;
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
