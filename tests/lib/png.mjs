/**
 * Just enough PNG to read a screenshot back as pixels.
 *
 * The render tests compare two screenshots, so they need the actual samples,
 * and a theme with no runtime dependencies is not going to grow an image
 * library to get them. Non-interlaced 8 bit is all a headless browser writes.
 */

import zlib from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Channels per pixel for each colour type PNG defines. */
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/**
 * Decode to `{ width, height, channels, data }` with one byte per sample.
 *
 * Throws on anything it cannot read rather than returning a blank image: a
 * silently empty bitmap would make every pixel assertion pass.
 */
export function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error('not a png');
  }

  let header = null;
  const idat = [];

  for (let pos = 8; pos < buffer.length; ) {
    const length = buffer.readUInt32BE(pos);
    const type = buffer.toString('ascii', pos + 4, pos + 8);
    const body = buffer.subarray(pos + 8, pos + 8 + length);
    pos += 12 + length;

    if (type === 'IHDR') {
      header = {
        width: body.readUInt32BE(0),
        height: body.readUInt32BE(4),
        depth: body[8],
        colorType: body[9],
        interlace: body[12],
      };
    } else if (type === 'IDAT') {
      idat.push(body);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (!header) throw new Error('png has no IHDR');
  if (header.depth !== 8) throw new Error(`unsupported bit depth ${header.depth}`);
  if (header.interlace !== 0) throw new Error('interlaced png');

  const channels = CHANNELS[header.colorType];
  if (!channels || header.colorType === 3) {
    throw new Error(`unsupported colour type ${header.colorType}`);
  }

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = header.width * channels;
  const data = Buffer.alloc(stride * header.height);

  for (let y = 0; y < header.height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = data.subarray(y * stride, (y + 1) * stride);
    const prev = y === 0 ? null : data.subarray((y - 1) * stride, y * stride);

    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? out[x - channels] : 0;
      const up = prev ? prev[x] : 0;
      const upLeft = prev && x >= channels ? prev[x - channels] : 0;
      let value = line[x];

      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) value += paeth(left, up, upLeft);
      else if (filter !== 0) throw new Error(`unknown row filter ${filter}`);

      out[x] = value & 0xff;
    }
  }

  return { width: header.width, height: header.height, channels, data };
}

/** Count the pixels where two same sized images differ, inside one rectangle. */
export function differingPixels(a, b, rect) {
  if (a.width !== b.width || a.height !== b.height || a.channels !== b.channels) {
    throw new Error('images are not comparable');
  }

  let count = 0;
  for (let y = rect.top; y < rect.top + rect.height; y++) {
    for (let x = rect.left; x < rect.left + rect.width; x++) {
      const i = (y * a.width + x) * a.channels;
      for (let c = 0; c < a.channels; c++) {
        if (a.data[i + c] !== b.data[i + c]) {
          count++;
          break;
        }
      }
    }
  }
  return count;
}
