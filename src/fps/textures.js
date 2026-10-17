// Prozedurale Texturen (32x32) und Sprites für die Ego-Perspektive.
// Alles als Uint32Array im ABGR-Format (direkt in ImageData schreibbar).

import { rng } from '../world.js';

export const TS = 32;

export const rgba = (r, g, b, a = 255) =>
  (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
const hex = (h) => { const n = parseInt(h.slice(1), 16); return rgba((n >> 16) & 255, (n >> 8) & 255, n & 255); };
const col = (c) => (typeof c === 'number' ? c : hex(c));
const scaled = ([r, g, b], f) => rgba(clamp(r * f), clamp(g * f), clamp(b * f));

function buffer(w = TS, h = TS) {
  const d = new Uint32Array(w * h); // 0 = transparent
  const api = {
    w, h, d,
    px(x, y, c) {
      x |= 0; y |= 0;
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      d[y * w + x] = col(c);
    },
    rect(x, y, ww, hh, c) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) api.px(x + i, y + j, c); },
    ellipse(cx, cy, rx, ry, c) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
        for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
          const dd = dx * dx + dy * dy;
          if (dd <= 1) api.px(x, y, typeof c === 'function' ? c(dx, dy, dd) : c);
        }
      }
    },
    line(x0, y0, x1, y1, c, w2 = 1) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        api.rect(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), w2, w2, c);
      }
    },
  };
  return api;
}

// --- Wände ---------------------------------------------------------------------

// Steinmauer per Voronoi: unregelmäßige Steine mit dunklen Fugen, nahtlos kachelbar
function stones(seed, base, n = 11, edgeCol = [34, 28, 24]) {
  const t = buffer();
  const r = rng(seed);
  const pts = [];
  for (let i = 0; i < n; i++) pts.push([r() * TS, r() * TS, 0.72 + r() * 0.45]);
  for (let y = 0; y < TS; y++) {
    for (let x = 0; x < TS; x++) {
      let d1 = 1e9, d2 = 1e9, k = 0;
      for (let i = 0; i < pts.length; i++) {
        for (const ox of [-TS, 0, TS]) {
          for (const oy of [-TS, 0, TS]) {
            const dx = x + 0.5 - pts[i][0] - ox, dy = y + 0.5 - pts[i][1] - oy;
            const d = dx * dx + dy * dy;
            if (d < d1) { d2 = d1; d1 = d; k = i; } else if (d < d2) d2 = d;
          }
        }
      }
      const edge = Math.sqrt(d2) - Math.sqrt(d1);
      if (edge < 1.1) t.px(x, y, rgba(...edgeCol));
      else {
        const lit = edge < 2.2 ? 1.12 : 1; // leichte Kante
        t.px(x, y, scaled(base, pts[k][2] * lit * (0.93 + r() * 0.12)));
      }
    }
  }
  return t;
}

function rock() { return stones(11, [112, 96, 82]); }

function moss() {
  const t = stones(23, [104, 98, 84]);
  const r = rng(5);
  for (let y = 0; y < TS; y++) {
    for (let x = 0; x < TS; x++) {
      const p = 0.75 - y / 26 + Math.sin(x * 0.7) * 0.15;
      if (r() < p) t.px(x, y, scaled([70, 140, 60], 0.75 + r() * 0.5));
    }
  }
  return t;
}

function wood() {
  const t = buffer();
  const r = rng(31);
  for (let x = 0; x < TS; x++) {
    const plank = (x / 8) | 0;
    const base = plank % 2 ? [126, 84, 48] : [142, 96, 56];
    for (let y = 0; y < TS; y++) {
      let f = 0.92 + r() * 0.1;
      if (x % 8 === 0) f = 0.5;
      if ((x * 7 + y * 3 + plank * 11) % 13 === 0) f *= 0.82;
      t.px(x, y, scaled(base, f));
    }
  }
  t.rect(0, 0, TS, 5, '#4a2e18'); t.rect(0, 1, TS, 1, '#6a4428');
  t.rect(0, 27, TS, 5, '#4a2e18'); t.rect(0, 28, TS, 1, '#6a4428');
  for (const x of [4, 12, 20, 28]) { t.px(x, 2, '#c8c8d0'); t.px(x, 29, '#c8c8d0'); }
  return t;
}

function earth() {
  const t = buffer();
  const r = rng(77);
  for (let y = 0; y < TS; y++) {
    for (let x = 0; x < TS; x++) {
      const n = Math.sin(x * 0.9 + y * 0.4) * 0.05 + Math.sin(y * 1.3) * 0.04;
      t.px(x, y, scaled([138, 94, 56], 0.85 + n + r() * 0.2));
    }
  }
  for (let i = 0; i < 14; i++) {
    const x = r() * 30 + 1, y = r() * 30 + 1, s = 1 + r() * 1.6;
    t.ellipse(x, y, s, s * 0.8, (dx, dy) => (dy < -0.2 ? '#b8b0a0' : '#8a8478'));
  }
  // Wurzeln
  let x = 4, y = 0;
  for (let i = 0; i < 40; i++) { t.px(x, y, '#5a3a20'); y += 1; x += r() < 0.3 ? 1 : r() < 0.3 ? -1 : 0; if (y >= TS) break; }
  x = 24; y = 0;
  for (let i = 0; i < 20; i++) { t.px(x, y, '#5a3a20'); y += 1; x += r() < 0.4 ? -1 : 0; }
  return t;
}

function pushBlock() {
  const t = buffer();
  const r = rng(91);
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) t.px(x, y, scaled([164, 156, 140], 0.9 + r() * 0.12));
  t.rect(0, 0, TS, 2, '#dcd4c0'); t.rect(0, 0, 2, TS, '#dcd4c0');
  t.rect(0, 30, TS, 2, '#5a544a'); t.rect(30, 0, 2, TS, '#5a544a');
  t.line(6, 8, 13, 15, '#6a6458'); t.line(13, 15, 11, 22, '#6a6458'); t.line(22, 5, 25, 12, '#6a6458');
  // eingeritzter Pfeil: "schieb mich"
  t.rect(9, 15, 12, 2, '#7a7262'); t.line(17, 11, 22, 16, '#7a7262'); t.line(17, 20, 22, 16, '#7a7262');
  return t;
}

function door(locked) {
  const t = buffer();
  const r = rng(locked ? 44 : 43);
  for (let x = 0; x < TS; x++) {
    for (let y = 0; y < TS; y++) {
      let f = 0.9 + r() * 0.12;
      if (x % 6 === 0) f = 0.55;
      t.px(x, y, scaled([150, 98, 54], f));
    }
  }
  for (const by of [5, 25]) {
    t.rect(0, by, TS, 3, '#4a4a54'); t.rect(0, by, TS, 1, '#7a7a88');
    for (let x = 3; x < TS; x += 7) t.px(x, by + 1, '#c8c8d8');
  }
  t.rect(0, 0, TS, 1, '#2a1a10'); t.rect(0, 0, 1, TS, '#2a1a10'); t.rect(31, 0, 1, TS, '#2a1a10');
  if (locked) {
    t.rect(11, 12, 10, 10, '#8a6a10'); t.rect(12, 13, 8, 8, '#f0c838'); t.rect(12, 13, 8, 1, '#fff0a0');
    t.ellipse(16, 16, 1.6, 1.6, '#2a1a08'); t.rect(15, 17, 2, 3, '#2a1a08');
  } else {
    t.ellipse(25, 16, 3, 3, '#6a6a78'); t.ellipse(25, 16, 1.8, 1.8, (dx, dy, dd) => (dd > 0.5 ? '#3a3a44' : 0));
  }
  return t;
}

function statue() {
  const t = stones(57, [96, 88, 82], 8);
  t.ellipse(16, 15, 13, 13, (dx, dy) => (dy < -0.3 ? '#8a8078' : '#6e665e'));
  // Drachengesicht
  t.rect(6, 7, 7, 2, '#3a3430'); t.rect(19, 7, 7, 2, '#3a3430');           // Brauen
  t.ellipse(10, 12, 2.6, 2, '#ff9a20'); t.ellipse(22, 12, 2.6, 2, '#ff9a20'); // glühende Augen
  t.px(10, 12, '#fff2a0'); t.px(22, 12, '#fff2a0');
  t.ellipse(13, 18, 1, 1, '#2a2420'); t.ellipse(19, 18, 1, 1, '#2a2420');   // Nasenlöcher
  t.ellipse(16, 25, 7, 4, '#1a1008');                                       // Maul
  t.ellipse(16, 25.5, 4.5, 2.4, (dx, dy, dd) => (dd < 0.4 ? '#ffe070' : '#ff7a20'));
  for (const x of [10, 13, 19, 22]) t.rect(x, 21, 1, 2, '#f0eadc');          // Zähne
  return t;
}

function lever(on) {
  const t = rock();
  t.rect(10, 6, 12, 20, '#3a3a44'); t.rect(11, 7, 10, 18, '#7a7a88'); t.rect(11, 7, 10, 1, '#a8a8b8');
  t.rect(15, 9, 2, 14, '#2a2a30');
  if (on) {
    t.line(16, 16, 16, 22, '#5a3a20', 2); t.ellipse(16.5, 23, 2.4, 2.4, '#40d060');
  } else {
    t.line(16, 16, 16, 10, '#5a3a20', 2); t.ellipse(16.5, 9, 2.4, 2.4, '#e04040');
  }
  return t;
}

function bars() {
  const t = buffer();
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) t.px(x, y, rgba(18, 14, 16));
  for (let x = 2; x < TS; x += 6) { t.rect(x, 0, 2, TS, '#5a5a66'); t.rect(x, 0, 1, TS, '#9a9aa8'); }
  for (const y of [6, 24]) { t.rect(0, y, TS, 2, '#4a4a56'); t.rect(0, y, TS, 1, '#8a8a98'); }
  return t;
}

function exitPortal() {
  const t = stones(63, [90, 80, 74], 9);
  t.ellipse(16, 22, 11, 18, (dx, dy, dd) => {
    const g = 1 - dd;
    return rgba(clamp(255), clamp(140 + g * 115), clamp(40 + g * 140));
  });
  for (let y = 18; y < 32; y += 4) t.rect(8, y, 16, 1, '#e0902a'); // Treppenstufen nach oben
  return t;
}

function floorTex() { return stones(101, [92, 80, 66], 14, [52, 44, 36]); }
function ceilTex() { return stones(131, [58, 50, 46], 9, [30, 26, 24]); }

// --- Sprites ---------------------------------------------------------------------

function slime(frame) {
  const t = buffer();
  const sq = frame ? 1.5 : 0;
  t.ellipse(16, 30, 12, 2, rgba(0, 0, 0, 90));
  t.ellipse(16, 22 + sq, 12 + sq, 9 - sq, (dx, dy, dd) => {
    if (dd > 0.86) return '#14501e';
    if (dx < -0.2 && dy < -0.3) return '#9af0a0';
    if (dy > 0.45) return '#2a8a3a';
    return '#46c05a';
  });
  t.ellipse(12, 20 + sq, 2.6, 3, '#ffffff'); t.ellipse(20, 20 + sq, 2.6, 3, '#ffffff');
  t.ellipse(12.5, 21 + sq, 1.3, 1.6, '#1a1a1a'); t.ellipse(20.5, 21 + sq, 1.3, 1.6, '#1a1a1a');
  t.rect(13, 26 + sq, 6, 1, '#14501e');
  return t;
}

function kobold(frame) {
  const t = buffer();
  t.ellipse(16, 31, 8, 1.5, rgba(0, 0, 0, 90));
  t.rect(12, 25, 3, 6, '#3a2a1a'); t.rect(17, 25, 3, 6, '#3a2a1a');                  // Beine
  t.ellipse(16, 21, 6, 6, (dx, dy) => (dx < -0.3 ? '#a8784a' : '#8a5a32'));          // Kittel
  if (frame) { t.line(21, 19, 26, 11, '#7a9a3a', 2); t.ellipse(27, 9, 2.5, 2.5, '#ff8a20'); } // Wurfarm
  else t.line(21, 19, 24, 24, '#7a9a3a', 2);
  t.line(11, 19, 8, 24, '#7a9a3a', 2);
  t.ellipse(16, 12, 6.5, 5.5, (dx, dy) => (dx < -0.3 && dy < 0 ? '#b0d070' : '#8ab04a')); // Kopf
  t.line(9, 11, 4, 8, '#8ab04a', 2); t.line(23, 11, 28, 8, '#8ab04a', 2);            // Ohren
  t.ellipse(13, 12, 1.6, 1.6, '#fff060'); t.ellipse(19, 12, 1.6, 1.6, '#fff060');
  t.px(13, 12, '#1a1a1a'); t.px(19, 12, '#1a1a1a');
  t.rect(14, 15, 4, 1, '#3a4a1a');
  for (let i = 0; i < 7; i++) t.rect(11 + i * 0.5, 7 - i, 10 - i, 1, '#d83838');      // Zipfelmütze
  t.px(18, 0, '#ffffff');
  return t;
}

function troll(frame) {
  const t = buffer();
  t.ellipse(16, 31, 13, 1.5, rgba(0, 0, 0, 100));
  t.rect(8, 24, 6, 7, '#5a6478'); t.rect(18, 24, 6, 7, '#5a6478');
  t.ellipse(16, 19, 13, 9, (dx, dy) => (dx < -0.4 ? '#9aaac0' : dy > 0.4 ? '#5a6a80' : '#7a8aa0'));
  t.rect(10, 22, 12, 3, '#6a4a2a');                                                    // Gürtel
  t.ellipse(16, 8, 8, 6.5, (dx, dy) => (dx < -0.3 && dy < 0 ? '#aabace' : '#8090a8'));
  t.rect(12, 2, 8, 2, '#3a3020');                                                       // Haarbüschel
  const eye = frame ? '#ff5a3a' : '#ffffff';
  t.rect(11, 7, 3, 2, eye); t.rect(18, 7, 3, 2, eye);
  t.px(12, 8, '#1a1a1a'); t.px(19, 8, '#1a1a1a');
  t.rect(12, 12, 8, 1, '#3a3a4a');
  t.rect(12, 10, 1, 2, '#f0f0e0'); t.rect(19, 10, 1, 2, '#f0f0e0');                   // Hauer
  t.line(3, 16, 1, 27, '#7a8aa0', 3); t.line(29, 16, 31, 27, '#7a8aa0', 3);            // Arme
  return t;
}

function ball(inner, mid, outer) {
  const t = buffer();
  t.ellipse(16, 16, 9, 9, (dx, dy, dd) => (dd < 0.25 ? inner : dd < 0.6 ? mid : outer));
  return t;
}

function chestnut() {
  const t = buffer();
  t.ellipse(16, 16, 6, 6, (dx, dy) => (dx < -0.2 && dy < -0.2 ? '#d89050' : '#7a3a12'));
  t.rect(13, 10, 6, 2, '#e8d0a0');
  return t;
}

function key() {
  const t = buffer();
  t.ellipse(10, 18, 5, 5, '#f0c838'); t.ellipse(10, 18, 2.4, 2.4, (dx, dy, dd) => 0);
  t.rect(14, 17, 13, 3, '#f0c838'); t.rect(14, 17, 13, 1, '#fff0a0');
  t.rect(22, 20, 2, 4, '#f0c838'); t.rect(26, 20, 2, 3, '#f0c838');
  return t;
}

function apple() {
  const t = buffer();
  t.ellipse(16, 22, 7, 6.5, (dx, dy) => (dx < -0.3 && dy < -0.2 ? '#ff9a9a' : dy > 0.5 ? '#9a1818' : '#d82a2a'));
  t.rect(16, 13, 1, 4, '#5a3a1a');
  t.ellipse(19.5, 14, 3, 1.5, '#3aa040');
  return t;
}

function crystal() {
  const t = buffer();
  for (let y = 0; y < 18; y++) {
    const w = y < 6 ? y + 1 : 18 - y > 0 ? Math.max(1, Math.round((18 - y) * 0.55)) : 1;
    for (let x = -w; x <= w; x++) {
      const c = x < 0 ? (y < 6 ? '#c8ffff' : '#58d8f0') : (y < 6 ? '#88f0ff' : '#2a9ac8');
      t.px(16 + x, 12 + y, c);
    }
  }
  t.px(14, 14, '#ffffff'); t.px(13, 15, '#ffffff');
  return t;
}

function bag() {
  const t = buffer();
  t.ellipse(16, 24, 8, 7, (dx, dy) => (dx < -0.3 ? '#c8a070' : '#9a7448'));
  t.rect(13, 15, 6, 3, '#9a7448'); t.rect(12, 17, 8, 1, '#5a3a1a');
  for (const [x, y] of [[12, 14], [16, 13], [20, 14]]) t.ellipse(x, y, 2.2, 2.2, '#7a3a12');
  return t;
}

function torch(frame) {
  const t = buffer();
  t.rect(15, 14, 3, 18, '#5a3a20'); t.rect(15, 14, 1, 18, '#7a5430');
  t.rect(13, 13, 7, 2, '#3a3a44');
  const o = frame ? 1 : 0;
  t.ellipse(16.5 + o * 0.5, 9 - o, 4, 6, (dx, dy, dd) => (dd < 0.3 ? '#fff6b0' : dd < 0.65 ? '#ffc040' : '#ff6a20'));
  return t;
}

function mushrooms() {
  const t = buffer();
  for (const [x, h, s] of [[10, 9, 5], [19, 13, 6.5], [25, 6, 3.5]]) {
    t.rect(x - 1, 31 - h, 2, h, '#d8e0f0');
    t.ellipse(x, 31 - h, s, s * 0.6, (dx, dy) => (dy < 0 ? '#70d8ff' : '#3a8ac8'));
    t.px(x - 1, 30 - h, '#e8ffff');
  }
  return t;
}

// --- Export ---------------------------------------------------------------------

let cache = null;

export function textures() {
  if (cache) return cache;
  const walls = {
    '#': rock(), M: moss(), W: wood(), E: earth(), P: pushBlock(),
    D: door(false), L: door(true), Z: bars(), F: statue(), H: lever(false), h: lever(true), X: exitPortal(),
  };
  const sprites = {
    slime: [slime(0), slime(1)],
    kobold: [kobold(0), kobold(1)],
    troll: [troll(0), troll(1)],
    fireball: [ball(rgba(255, 250, 200), rgba(255, 190, 60), rgba(240, 90, 30))],
    iceball: [ball(rgba(255, 255, 255), rgba(170, 230, 255), rgba(70, 150, 255))],
    chestnut: [chestnut()],
    key: [key()], apple: [apple()], crystal: [crystal()], bag: [bag()],
    torch: [torch(0), torch(1)], mushrooms: [mushrooms()],
  };
  cache = { walls, sprites, floor: floorTex(), ceil: ceilTex() };
  return cache;
}
