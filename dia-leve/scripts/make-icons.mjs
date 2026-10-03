// Gera os ícones PNG do app (sem dependências) a partir do mesmo desenho do icon.svg.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const TEAL = [0x0f, 0x6e, 0x6e];
const WHITE = [255, 255, 255];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const S = 4; // supersampling
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let acc = [0, 0, 0, 0];
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        const p = pixel(((x + (sx + 0.5) / S) / size) * 512, ((y + (sy + 0.5) / S) / size) * 512);
        for (let i = 0; i < 4; i++) acc[i] += p[i];
      }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      for (let i = 0; i < 4; i++) raw[o + i] = Math.round(acc[i] / (S * S));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function inRoundRect(x, y, r) {
  const cx = Math.min(Math.max(x, r), 512 - r), cy = Math.min(Math.max(y, r), 512 - r);
  return Math.hypot(x - cx, y - cy) <= r;
}
// scale < 1 encolhe o desenho (zona segura do ícone "maskable").
function design(rounded, scale) {
  return (x, y) => {
    if (rounded && !inRoundRect(x, y, 112)) return [0, 0, 0, 0];
    const u = 256 + (x - 256) / scale, v = 256 + (y - 256) / scale;
    const ring = Math.abs(Math.hypot(u - 256, v - 256) - 150) <= 18;
    const check = distSeg(u, v, 186, 262, 236, 312) <= 20 || distSeg(u, v, 236, 312, 328, 208) <= 20;
    return [...(ring || check ? WHITE : TEAL), 255];
  };
}
const out = new URL('../public/icons/', import.meta.url);
writeFileSync(new URL('icon-192.png', out), png(192, design(true, 1)));
writeFileSync(new URL('icon-512.png', out), png(512, design(true, 1)));
writeFileSync(new URL('icon-maskable-512.png', out), png(512, design(false, 0.8)));
writeFileSync(new URL('apple-touch-icon.png', out), png(180, design(false, 1)));
console.log('Ícones gerados.');
