// Generates PWA icons (no external deps) — a turquoise→green gradient tile
// with a white "location ring" mark, matching the app theme.
import zlib from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const CRC = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
})();

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(CRC(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lerp = (a, b, t) => Math.round(a + (b - a) * t);

function png(size, { maskable = false } = {}) {
  const bg = hex('#0B0F14');
  const c1 = hex('#2DD4BF'); // turquoise
  const c2 = hex('#34D399'); // green
  const cx = size / 2;
  const cy = size / 2;
  const tileBleed = maskable; // maskable -> full-bleed gradient, else dark bg + gradient disc

  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (2 * size);
      const gr = [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
      const d = Math.hypot(x - cx, y - cy);
      const disc = size * 0.40;
      let col;
      if (tileBleed) col = gr;
      else col = d <= disc ? gr : bg;

      // white location ring + center dot on top
      const ringOuter = size * 0.26;
      const ringInner = size * 0.20;
      const dot = size * 0.07;
      if ((d <= ringOuter && d >= ringInner) || d <= dot) col = [255, 255, 255];

      raw[p++] = col[0];
      raw[p++] = col[1];
      raw[p++] = col[2];
      raw[p++] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public', { recursive: true });
writeFileSync('public/icon-192.png', png(192));
writeFileSync('public/icon-512.png', png(512));
writeFileSync('public/icon-maskable-512.png', png(512, { maskable: true }));
writeFileSync('public/apple-touch-icon.png', png(180, { maskable: true }));
console.log('icons written to public/');
