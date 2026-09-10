/**
 * Generates the app icons with no image tooling.
 *
 * The mark is the timeline itself: a vertical column of nine bands running from
 * deep indigo to dusty gold, the same colours the app uses for the nine ages of
 * the history. So the icon is the product's one distinctive idea, not a symbol
 * bolted on.
 *
 * Writes raw PNG bytes directly. A PNG is a signature plus three chunks, and
 * zlib is in Node, so this needs no dependency.
 */
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const GROUND = [0x10, 0x18, 0x27];
const ERAS = ['2A3570', '2F4A8E', '35619B', '3B7896', '438C86', '549971', '7CA05F', 'A69A53', 'C2A04F'].map((h) => [
  parseInt(h.slice(0, 2), 16),
  parseInt(h.slice(2, 4), 16),
  parseInt(h.slice(4, 6), 16),
]);

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/**
 * `inset` is the fraction of the canvas left empty around the mark. Android
 * crops a maskable icon into a circle, so that version needs a wide margin or
 * the mark loses its ends.
 */
function drawIcon(size: number, inset: number): Buffer {
  const px = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    px[i * 3] = GROUND[0];
    px[i * 3 + 1] = GROUND[1];
    px[i * 3 + 2] = GROUND[2];
  }

  const margin = Math.round(size * inset);
  const top = margin;
  const height = size - margin * 2;
  const barWidth = Math.round(size * (inset < 0.2 ? 0.3 : 0.26));
  const left = Math.round((size - barWidth) / 2);
  const radius = Math.round(barWidth / 2);
  const bandHeight = height / ERAS.length;

  for (let y = top; y < top + height; y++) {
    const band = ERAS[Math.min(ERAS.length - 1, Math.floor((y - top) / bandHeight))];
    for (let x = left; x < left + barWidth; x++) {
      // Round the two ends so the mark reads as a column, not a rectangle.
      const fromTop = y - top;
      const fromBottom = top + height - 1 - y;
      const capDistance = Math.min(fromTop, fromBottom);
      if (capDistance < radius) {
        const dx = x - (left + barWidth / 2);
        const dy = radius - capDistance;
        if (dx * dx + dy * dy > radius * radius) continue;
      }
      const i = (y * size + x) * 3;
      px[i] = band[0];
      px[i + 1] = band[1];
      px[i + 2] = band[2];
    }
  }

  // One filter byte (0 = none) at the start of every scanline.
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    px.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const targets: [string, number, number][] = [
  ['public/icon-192.png', 192, 0.14],
  ['public/icon-512.png', 512, 0.14],
  // Android crops this into a circle, so the mark sits well inside the edges.
  ['public/icon-maskable-512.png', 512, 0.26],
];

for (const [path, size, inset] of targets) {
  const png = drawIcon(size, inset);
  writeFileSync(path, png);
  console.log(`${path}  ${size}x${size}  ${(png.length / 1024).toFixed(1)} KB`);
}
