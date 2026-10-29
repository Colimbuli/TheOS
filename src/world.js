// Tile-System: Kartenaufbau, Kollision, Tile-Grafik und Objekt-Grafik (Häuser, Brunnen, Höhle, Innenräume).
// Die konkreten Karten stehen in maps.js.

export const TILE = 16;

export const T = {
  GRASS: 0, FLOWER: 1, PATH: 2, WATER: 3, TREE: 4, FENCE: 5, BUSH: 6, ROCK: 7, GATE: 8,
  BOULDER: 9,   // Felix kann ihn schieben
  DIG: 10,      // lockere Erde – Ferdinand kann graben
  DIGFENCE: 11, // Zaun mit lockerer Erde darunter – Ferdinand gräbt einen Tunnel
  TUNNEL: 12,   // gegrabener Durchgang unter dem Zaun
  HOLE: 13,     // ausgegrabenes Loch (begehbar)
  // Höhle
  CFLOOR: 14, CWALL: 15,
  EWALL: 16,    // Erdwand – Ferdinand gräbt durch
  LOCKED: 17,   // Schlosstür – braucht Schlüssel
  BARS: 18,     // Gittertor – öffnet per Hebel
  UP: 19,       // Treppe hinauf (zurück ins Dorf)
  DOWN: 20,     // Treppe hinab (Ende Kapitel 2)
  MUSH: 21,     // Leuchtpilze (begehbar)
  // Innenräume
  WOOD: 22, IWALL: 23, EXIT: 24, RUG: 25,
  // Spukhaus
  RDOOR: 26,    // Rätseltür im Haus
  RGATE: 27,    // Rätsel-Gartentor
  // Tal der Trolle
  CLIFF: 28,    // Felsklippe
  CAVEIN: 29,   // Höhleneingang (führt in die Unterwelt)
  CRACK: 30,    // rissiger Fels – Bomben sprengen ihn
  // Bergpfad
  CHASM: 31,    // Schlucht – nur Jelly kann darüber springen
};
const SOLID = new Set([T.WATER, T.TREE, T.FENCE, T.BUSH, T.ROCK, T.GATE, T.BOULDER, T.DIGFENCE,
  T.CWALL, T.EWALL, T.LOCKED, T.BARS, T.IWALL, T.RDOOR, T.RGATE, T.CLIFF, T.CRACK, T.CHASM]);
const FLOORISH = new Set([T.GRASS, T.FLOWER, T.CFLOOR, T.MUSH, T.WOOD]); // hierauf darf ein Fels geschoben werden

// Generischer Kartenbaukasten. Liefert das Kartenobjekt mit Bau-Helfern (b.*).
export function makeMap({ id, w, h, fill, edge, theme }) {
  const tiles = Array.from({ length: h }, () => new Array(w).fill(fill));
  const block = Array.from({ length: h }, () => new Array(w).fill(false));
  const texts = new Map();
  const counter = new Set();
  const under = new Map();
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h;

  const map = {
    id, w, h, theme, tiles, block, texts, counter,
    objects: [], npcs: [], items: [], enemies: [], warps: [],
    northExit: false,
    tile(tx, ty) { return inside(tx, ty) ? tiles[ty][tx] : edge; },
    setTile(tx, ty, t) { if (inside(tx, ty)) tiles[ty][tx] = t; },
    isSolidTile(tx, ty) {
      if (ty < 0 && map.northExit && map.northExitCols.includes(tx)) return false;
      if (!inside(tx, ty)) return true;
      return SOLID.has(tiles[ty][tx]) || block[ty][tx];
    },
    isCounter(tx, ty) { return counter.has(`${tx},${ty}`); },
    textAt(tx, ty) { return texts.get(`${tx},${ty}`) || null; },
    warpAt(tx, ty) { return map.warps.find((wp) => wp.x === tx && wp.y === ty) || null; },
    pushBoulder(tx, ty, dx, dy, occupied) {
      const nx = tx + dx, ny = ty + dy;
      if (!inside(nx, ny) || !FLOORISH.has(tiles[ny][nx]) || block[ny][nx] || occupied(nx, ny)) return false;
      under.set(`${nx},${ny}`, tiles[ny][nx]);
      tiles[ny][nx] = T.BOULDER;
      tiles[ty][tx] = under.get(`${tx},${ty}`) ?? fill;
      return true;
    },
  };

  const b = {
    set: (x, y, t) => { if (inside(x, y)) tiles[y][x] = t; },
    rect(x, y, ww, hh, t) { for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) b.set(i, j, t); },
    solid(x, y, ww = 1, hh = 1) { for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) if (inside(i, j)) block[j][i] = true; },
    free(x, y) { if (inside(x, y)) block[y][x] = false; },
    say: (x, y, lines) => texts.set(`${x},${y}`, lines),
    counter: (x, y) => counter.add(`${x},${y}`),
    under: (x, y, t) => under.set(`${x},${y}`, t),
    obj(o) { map.objects.push(o); return o; },
  };
  return { map, b };
}

export const COL = {
  out: '#1a1020',
  grass: '#68b850', grassD: '#4a9640', grassL: '#8ad468', grassM: '#5ca848', grassS: '#3f8436',
  path: '#e4cc94', pathD: '#d2b47c', pathL: '#f2e0b0', pathE: '#a88a52',
  water: '#3a80d8', waterD: '#2a60b0', waterL: '#8cc4f8', waterM: '#4a92e4', foam: '#e8f4ff', bank: '#3a6a2c',
  leafO: '#163d1e', leafD: '#23662e', leaf: '#2f8a3c', leafM: '#42a046', leafL: '#6cc858',
  trunk: '#6e4626', trunkD: '#4a2e18',
  bush: '#3c9e3c', bushD: '#256e2a', bushL: '#78cc58', bushO: '#174a1c',
  rock: '#a4a4b4', rockD: '#6c6c80', rockL: '#d4d4e0',
  wood: '#b8803e', woodD: '#7a4e22', woodL: '#dcaa66',
  wall: '#efe0bc', wallD: '#cdb88c', beam: '#7a4e2a',
  stone: '#9a96a0', stoneD: '#6e6a78',
  door: '#8a5a2c', doorD: '#5e3a1a',
  glass: '#7ab8e8', glassD: '#3c6ca8',
};

export function rng(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

// --- Tiles zeichnen ------------------------------------------------------------

const tileCache = new Map();

function variant(world, tx, ty, t, frame) {
  const tl = (x, y) => world.tile(x, y);
  switch (t) {
    case T.GRASS: case T.FLOWER: {
      // Wiesenecken zwischen zwei Wegseiten werden rund abgeschnitten
      const isP = (x, y) => { const n = tl(x, y); return n === T.PATH || n === T.GATE; };
      const n = isP(tx, ty - 1), e = isP(tx + 1, ty), so = isP(tx, ty + 1), w = isP(tx - 1, ty);
      const cut = (n && e ? 1 : 0) | (so && e ? 2 : 0) | (so && w ? 4 : 0) | (n && w ? 8 : 0);
      return (hash(tx, ty) % 4) + cut * 4;
    }
    case T.PATH: {
      const isP = (x, y) => { const n = tl(x, y); return n === T.PATH || n === T.GATE || n === T.RGATE || y < 0; };
      return mask8(isP, tx, ty) + (hash(tx, ty) % 2) * 256;
    }
    case T.WATER: {
      const isW = (x, y) => tl(x, y) === T.WATER;
      return mask8(isW, tx, ty) + (frame % 2) * 256 + (world.theme === 'cave' ? 512 : 0);
    }
    case T.TREE: {
      const isT = (x, y) => tl(x, y) === T.TREE;
      return (isT(tx, ty - 1) ? 1 : 0) | (isT(tx + 1, ty) ? 2 : 0) | (isT(tx, ty + 1) ? 4 : 0) | (isT(tx - 1, ty) ? 8 : 0);
    }
    case T.FENCE: case T.DIGFENCE: case T.TUNNEL: {
      const f = (x, y) => { const n = tl(x, y); return n === T.FENCE || n === T.DIGFENCE || n === T.TUNNEL; };
      return (f(tx, ty - 1) ? 1 : 0) | (f(tx + 1, ty) ? 2 : 0) | (f(tx, ty + 1) ? 4 : 0) | (f(tx - 1, ty) ? 8 : 0);
    }
    case T.CFLOOR: case T.MUSH: return hash(tx, ty) % 4;
    case T.CWALL: case T.EWALL: {
      // Wandfront, wenn darunter begehbarer Boden liegt
      const below = tl(tx, ty + 1);
      const face = !SOLID.has(below) || below === T.EWALL || below === T.LOCKED || below === T.BARS ? 1 : 0;
      return face + (hash(tx, ty) % 3) * 2;
    }
    case T.IWALL: return tl(tx, ty + 1) === T.IWALL || ty + 1 >= world.h ? 0 : 1;
    case T.RUG: {
      const r = (x, y) => tl(x, y) === T.RUG;
      return (r(tx, ty - 1) ? 0 : 1) | (r(tx + 1, ty) ? 0 : 2) | (r(tx, ty + 1) ? 0 : 4) | (r(tx - 1, ty) ? 0 : 8);
    }
    case T.BOULDER: return world.theme === 'cave' ? 1 : world.theme === 'haunted' ? 2 : 0;
    case T.BARS: case T.LOCKED: case T.CRACK: return world.theme === 'valley' ? 1 : 0;
    case T.CLIFF: {
      const isC = (x, y) => { const n = tl(x, y); return n === T.CLIFF || n === T.LOCKED || n === T.BARS || n === T.CAVEIN || n === T.TREE; };
      return (isC(tx, ty - 1) ? 0 : 1) | (isC(tx, ty + 1) ? 0 : 2) | (isC(tx - 1, ty) ? 0 : 4) | (isC(tx + 1, ty) ? 0 : 8) | (hash(tx, ty) % 3) << 4;
    }
    case T.UP: case T.DOWN: return frame;
    case T.CHASM: return (tl(tx, ty - 1) === T.CHASM ? 1 : 0) | (tl(tx, ty + 1) === T.CHASM ? 2 : 0);
    default: return 0;
  }
}

function tileImage(t, v) {
  const key = t * 100000 + v;
  let c = tileCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = TILE;
  const g = c.getContext('2d');
  PAINT[t](g, v);
  tileCache.set(key, c);
  return c;
}

// Kacheln, die in der Kippansicht aufrecht stehen (statt flach auf dem Boden zu liegen)
export const TALL = new Set([T.TREE, T.BUSH, T.ROCK, T.BOULDER, T.CRACK, T.FENCE, T.DIGFENCE, T.GATE, T.RGATE, T.BARS]);

// Bodenkachel unter einer hohen Kachel
function baseTile(world, t) {
  if (world.theme === 'cave') return T.CFLOOR;
  if (world.theme === 'inside' || (world.theme === 'haunted' && t === T.BOULDER)) return T.WOOD;
  return T.GRASS;
}

// groundOnly: hohe Kacheln werden durch ihren Boden ersetzt (für die Kippansicht)
export function drawTiles(g, world, camX, camY, time, viewW = 240, viewH = 160, groundOnly = false) {
  const frame = Math.floor(time * 2.5) % 4;
  const tx0 = Math.floor(camX / TILE), ty0 = Math.floor(camY / TILE);
  for (let ty = ty0; ty <= ty0 + Math.ceil(viewH / TILE); ty++) {
    for (let tx = tx0; tx <= tx0 + Math.ceil(viewW / TILE); tx++) {
      if (tx < 0 || ty < 0 || tx >= world.w || ty >= world.h) continue;
      let t = world.tiles[ty][tx];
      if (groundOnly && TALL.has(t)) t = baseTile(world, t);
      g.drawImage(tileImage(t, variant(world, tx, ty, t, frame)), tx * TILE - camX, ty * TILE - camY);
    }
  }
}

// Freigestellte Kachel (ohne Bodenhintergrund) für aufrechte Darstellung
const cutoutCache = new Map();
let NOBG = false;
export function tileCutout(world, tx, ty, time) {
  const t = world.tiles[ty][tx];
  const v = variant(world, tx, ty, t, Math.floor(time * 2.5) % 4);
  const key = t * 100000 + v;
  let c = cutoutCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = TILE;
  NOBG = true;
  try { PAINT[t](c.getContext('2d'), v); } finally { NOBG = false; }
  cutoutCache.set(key, c);
  return c;
}

const px = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

// 8er-Nachbarschaft: Bit gesetzt = Nachbar ist ANDERS (Kante).
// 1 N, 2 O, 4 S, 8 W, 16 NO, 32 SO, 64 SW, 128 NW
function mask8(same, tx, ty) {
  const d = (x, y) => (same(tx + x, ty + y) ? 0 : 1);
  return d(0, -1) | d(1, 0) << 1 | d(0, 1) << 2 | d(-1, 0) << 3
    | d(1, -1) << 4 | d(1, 1) << 5 | d(-1, 1) << 6 | d(-1, -1) << 7;
}

// Abstand jedes Pixels zur Kante (negativ = außerhalb). Außenecken mit Radius rO, Innenecken mit rI.
const fieldCache = new Map();
function distField(m, rO = 6, rI = 3) {
  const key = m * 100 + rO * 10 + rI;
  let f = fieldCache.get(key);
  if (f) return f;
  f = new Float32Array(256);
  const N = m & 1, E = m & 2, S = m & 4, Wb = m & 8;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const cx = x + 0.5, cy = y + 0.5;
      let d = 99;
      if (N) d = Math.min(d, cy);
      if (S) d = Math.min(d, 16 - cy);
      if (Wb) d = Math.min(d, cx);
      if (E) d = Math.min(d, 16 - cx);
      const outer = (ccx, ccy, inX, inY) => { if (inX && inY) d = Math.min(d, rO - Math.hypot(cx - ccx, cy - ccy)); };
      if (N && Wb) outer(rO, rO, cx < rO, cy < rO);
      if (N && E) outer(16 - rO, rO, cx > 16 - rO, cy < rO);
      if (S && E) outer(16 - rO, 16 - rO, cx > 16 - rO, cy > 16 - rO);
      if (S && Wb) outer(rO, 16 - rO, cx < rO, cy > 16 - rO);
      if (rI <= 0) { f[y * 16 + x] = d; continue; }
      if (!N && !Wb && (m & 128)) d = Math.min(d, Math.hypot(cx, cy) - rI);
      if (!N && !E && (m & 16)) d = Math.min(d, Math.hypot(16 - cx, cy) - rI);
      if (!S && !E && (m & 32)) d = Math.min(d, Math.hypot(16 - cx, 16 - cy) - rI);
      if (!S && !Wb && (m & 64)) d = Math.min(d, Math.hypot(cx, 16 - cy) - rI);
      f[y * 16 + x] = d;
    }
  }
  fieldCache.set(key, f);
  return f;
}

// Zeichnet "innen" (mit Abstandsfeld) über einen bereits gemalten Hintergrund.
// colorAt(d, x, y) liefert die Farbe für Pixel mit Abstand d (oder null = Hintergrund lassen).
function paintField(g, m, colorAt, rO, rI) {
  const f = distField(m, rO, rI);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const c = colorAt(f[y * 16 + x], x, y);
    if (c) px(g, c, x, y);
  }
}

// Periodische Blätterbüschel (16er-Raster, nahtlos über Kacheln hinweg)
const CLUSTERS = [[4, 3], [12, 3], [0, 9], [8, 9], [16, 9], [4, 15], [12, 15], [4, -1], [12, -1]];
function leafShade(x, y, c) {
  const cx = x + 0.5, cy = y + 0.5;
  let best = 99, bx = 0, by = 0;
  for (const [px0, py0] of CLUSTERS) {
    const d = Math.hypot(cx - px0, cy - py0);
    if (d < best) { best = d; bx = cx - px0; by = cy - py0; }
  }
  if (best > 4.3) return c.d;
  const s = bx + by;
  if (s < -2.2) return c.l;
  if (s < -0.6) return c.m;
  if (s > 2.4) return c.d;
  return c.b;
}

function blob(g, cx, cy, rx, ry, colorFn) {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d <= 1) px(g, colorFn(d, dx, dy, x, y), x, y);
    }
  }
}

function paintGrass(g, v) {
  if (NOBG) return;
  px(g, COL.grass, 0, 0, 16, 16);
  const r = rng(17 + v * 31);
  // feine Struktur
  for (let i = 0; i < 22; i++) px(g, i % 4 ? COL.grassM : COL.grassL, (r() * 16) | 0, (r() * 16) | 0);
  // Grasbüschel: dunkler Ansatz, helle Spitzen
  const n = v === 3 ? 2 : 3;
  for (let i = 0; i < n; i++) {
    const x = 1 + ((r() * 12) | 0), y = 3 + ((r() * 10) | 0);
    px(g, COL.grassD, x, y + 2, 4, 1);
    px(g, COL.grassD, x, y + 1); px(g, COL.grassD, x + 3, y + 1);
    px(g, COL.grassL, x, y); px(g, COL.grassM, x + 1, y + 1); px(g, COL.grassL, x + 2, y - 1); px(g, COL.grassM, x + 3, y);
  }
}

const FLOWER_COLS = ['#f05050', '#f8e050', '#ffffff', '#e070e0'];

// Abgerundete Wiesenecke: außerhalb des Kreises liegt Weg
function cutGrassCorners(g, cut) {
  if (!cut) return;
  const r = 6;
  const corners = [[1, 16 - r, r], [2, 16 - r, 16 - r], [4, r, 16 - r], [8, r, r]];
  for (const [bit, ccx, ccy] of corners) {
    if (!(cut & bit)) continue;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const cx = x + 0.5, cy = y + 0.5;
      const inX = bit === 1 || bit === 2 ? cx > ccx : cx < ccx;
      const inY = bit === 1 || bit === 8 ? cy < ccy : cy > ccy;
      if (!inX || !inY) continue;
      const d = Math.hypot(cx - ccx, cy - ccy) - r;  // > 0: außerhalb der Wiese
      if (d < -1) continue;
      px(g, d < 0 ? COL.grassS : d < 1 ? COL.pathE : d < 2 ? COL.pathD : COL.path, x, y);
    }
  }
}

const PAINT = {
  [T.GRASS](g, v) { paintGrass(g, v & 3); cutGrassCorners(g, v >> 2); },

  [T.FLOWER](g, v) {
    paintGrass(g, v & 3);
    const r = rng(99 + (v & 3) * 7);
    for (let i = 0; i < 3; i++) {
      const x = 2 + ((r() * 11) | 0), y = 2 + ((r() * 11) | 0);
      const c = FLOWER_COLS[(r() * 4) | 0];
      px(g, c, x - 1, y); px(g, c, x + 1, y); px(g, c, x, y - 1); px(g, c, x, y + 1);
      px(g, c === '#f8e050' ? '#e07020' : '#f8d030', x, y);
    }
    cutGrassCorners(g, v >> 2);
  },

  [T.PATH](g, v) {
    const m = v & 255;
    paintGrass(g, v >> 8);
    const r = rng(5 + (v >> 8) * 13);
    const speck = new Map();
    for (let i = 0; i < 9; i++) speck.set(((r() * 16) | 0) + ((r() * 16) | 0) * 16, i % 3 ? COL.pathD : COL.pathL);
    paintField(g, m, (d, x, y) => {
      if (d < -1) return null;
      if (d < 0) return COL.grassS;          // weicher Schatten auf der Wiese
      if (d < 1) return COL.pathE;           // dunkle Randlinie
      if (d < 2) return COL.pathD;
      return speck.get(x + y * 16) || COL.path;
    }, 6, 0);
  },

  [T.WATER](g, v) {
    const m = v & 255, frame = (v >> 8) & 1, cave = v & 512;
    if (cave) PAINT[T.CFLOOR](g, 0); else paintGrass(g, 1);
    const wave = (x, y) => {
      const w = Math.sin((x + frame * 3) * 0.8 + y * 1.7) + Math.sin(y * 0.9 - frame * 2);
      return w > 1.45;
    };
    paintField(g, m, (d, x, y) => {
      if (d < -1.5) return null;
      if (d < 0) return cave ? '#3a302a' : COL.bank;   // Uferkante
      if (d < 1.2) return COL.foam;
      if (d < 2.6) return COL.waterL;
      if (d < 3.6) return COL.water;
      return wave(x, y) ? COL.waterL : (((x * 7 + y * 3) % 11) === 0 ? COL.waterM : COL.water);
    }, 7, 4);
  },

  [T.TREE](g, nb) {
    // Jede Kachel eine runde Krone; im Wald überlappen die Kronen, die Lücken sind dunkler Schatten
    paintGrass(g, 3);
    const N = nb & 1, E = nb & 2, S = nb & 4, Wb = nb & 8;
    const forestBg = (x, y) => {
      const cx = x + 0.5, cy = y + 0.5;
      return (N && cy < 8 && cx > 2 && cx < 14) || (S && cy > 8 && cx > 2 && cx < 14)
        || (E && cx > 8 && cy > 2 && cy < 14) || (Wb && cx < 8 && cy > 2 && cy < 14)
        || (N && E && cx > 8 && cy < 8) || (N && Wb && cx < 8 && cy < 8) || (S && E && cx > 8 && cy > 8) || (S && Wb && cx < 8 && cy > 8);
    };
    if (!S) {
      px(g, 'rgba(0,0,0,0.22)', 2, 13, 12, 3);
      px(g, COL.trunkD, 6, 11, 4, 5); px(g, COL.trunk, 7, 11, 2, 4); px(g, '#8a5a32', 7, 12, 1, 2);
    }
    if (!NOBG) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (forestBg(x, y)) px(g, COL.leafO, x, y);
    const cy0 = S ? 8 : 7;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = (x + 0.5 - 8) / 7.8, dy = (y + 0.5 - cy0) / 7.4;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      let c;
      if (d > 0.8) c = COL.leafO;
      else {
        const l = dx * 0.7 + dy * 0.8 + (d * 0.25);   // Licht von links oben
        c = l < -0.55 ? COL.leafL : l < -0.15 ? COL.leafM : l < 0.45 ? COL.leaf : COL.leafD;
      }
      px(g, c, x, y);
    }
    // ein paar Blätterbüschel als Struktur
    for (const [x, y] of [[4, 4], [9, 3], [3, 8], [10, 8], [6, 11]]) { px(g, COL.leafL, x, y + (S ? 1 : 0), 2, 1); px(g, COL.leafD, x + 1, y + 1 + (S ? 1 : 0), 2, 1); }
  },

  [T.BUSH](g) {
    paintGrass(g, 2);
    px(g, 'rgba(0,0,0,0.2)', 3, 13, 10, 2); px(g, 'rgba(0,0,0,0.12)', 2, 12, 12, 1);
    blob(g, 8, 8.5, 6.8, 6.2, (d, dx, dy) => {
      if (d > 0.8) return COL.bushO;
      const l = dx * 0.7 + dy * 0.8 + d * 0.25;
      return l < -0.5 ? '#a0e070' : l < -0.1 ? COL.bushL : l < 0.45 ? COL.bush : COL.bushD;
    });
    for (const [x, y] of [[5, 9], [9, 6], [10, 10]]) { px(g, COL.bushD, x, y, 2, 1); }
    px(g, '#ffffff', 5, 5); px(g, '#d8ffc0', 6, 5);
  },

  [T.ROCK](g) {
    paintGrass(g, 1);
    px(g, 'rgba(0,0,0,0.2)', 3, 13, 11, 2);
    blob(g, 8, 9, 6.5, 5.5, (d, dx, dy) => {
      if (d > 0.75) return '#3a3848';
      if (dy < -0.3 && dx < 0.3) return COL.rockL;
      if (dy > 0.35) return COL.rockD;
      return COL.rock;
    });
  },

  [T.FENCE](g, conn) {
    paintGrass(g, 1);
    const rail = (x, w) => { px(g, COL.woodD, x, 5, w, 3); px(g, COL.woodD, x, 10, w, 3); px(g, COL.wood, x, 6, w, 1); px(g, COL.wood, x, 11, w, 1); };
    if (conn & 8) rail(0, 7);
    if (conn & 2) rail(9, 7);
    if (conn & 1) { px(g, COL.woodD, 7, 0, 2, 4); px(g, COL.wood, 7, 0, 1, 4); }
    if (conn & 4) { px(g, COL.woodD, 7, 14, 2, 2); px(g, COL.wood, 7, 14, 1, 2); }
    px(g, COL.woodD, 6, 3, 4, 12); px(g, COL.wood, 7, 3, 2, 11); px(g, COL.woodL, 7, 3, 2, 1);
  },

  [T.GATE](g) {
    if (!NOBG) px(g, COL.path, 0, 0, 16, 16);
    px(g, COL.out, 0, 1, 16, 14);
    for (let x = 1; x < 16; x += 4) { px(g, COL.wood, x, 2, 3, 12); px(g, COL.woodL, x, 2, 1, 12); }
    px(g, COL.woodD, 0, 4, 16, 2); px(g, COL.woodD, 0, 10, 16, 2);
    px(g, '#5a5a6a', 2, 4, 2, 2); px(g, '#5a5a6a', 12, 10, 2, 2);
  },

  [T.BOULDER](g, v) {
    if (v === 2) { paintChest(g); return; }
    if (v) PAINT[T.CFLOOR](g, 1); else paintGrass(g, 3);
    px(g, 'rgba(0,0,0,0.25)', 1, 13, 14, 3);
    blob(g, 8, 8, 7.8, 7.4, (d, dx, dy) => {
      if (d > 0.84) return '#2e2620';
      if (dx + dy < -0.7) return '#c8b49a';
      if (dx + dy > 0.5) return '#6e5a48';
      return '#9c8670';
    });
    px(g, '#4e4034', 5, 6, 3, 1); px(g, '#4e4034', 7, 7, 1, 2); px(g, '#4e4034', 10, 10, 2, 1);
    px(g, '#e0d0b8', 4, 3, 2, 1);
  },

  [T.DIG](g) {
    paintGrass(g, 2);
    blob(g, 8, 9, 6, 4.5, (d) => (d > 0.7 ? '#7a5030' : '#a0703e'));
    px(g, '#5a3a20', 5, 8, 6, 1); px(g, '#5a3a20', 7, 7, 1, 3); px(g, '#5a3a20', 9, 10, 2, 1);
    px(g, '#c89060', 6, 7, 1, 1); px(g, '#c89060', 10, 8, 1, 1);
  },

  [T.HOLE](g) {
    paintGrass(g, 2);
    blob(g, 8, 9, 6, 4.5, (d, dx, dy) => (d > 0.72 ? '#a0703e' : dy < 0 ? '#2a1a10' : '#4a2e18'));
    px(g, '#a0703e', 12, 4, 3, 2); px(g, '#7a5030', 13, 5, 2, 1);
  },

  [T.DIGFENCE](g, conn) {
    PAINT[T.FENCE](g, conn);
    px(g, '#a0703e', 3, 13, 10, 3); px(g, '#7a5030', 4, 14, 3, 1); px(g, '#7a5030', 9, 15, 3, 1);
    px(g, '#c89060', 6, 13, 1, 1);
  },

  [T.TUNNEL](g, conn) {
    paintGrass(g, 1);
    blob(g, 8, 11, 6.5, 4.5, (d, dx, dy) => (d > 0.75 ? '#a0703e' : dy < 0.2 ? '#1a1008' : '#3a2412'));
    const rail = (x, w) => { px(g, COL.woodD, x, 3, w, 2); px(g, COL.wood, x, 3, w, 1); };
    if (conn & 8) rail(0, 5);
    if (conn & 2) rail(11, 5);
    px(g, COL.woodD, 1, 1, 3, 5); px(g, COL.woodD, 12, 1, 3, 5);
  },

  // --- Höhle ---
  [T.CFLOOR](g, v) {
    if (NOBG) return;
    px(g, CAVE.floor, 0, 0, 16, 16);
    const r = rng(300 + v * 13);
    for (let i = 0; i < 6; i++) {
      const x = (r() * 15) | 0, y = (r() * 15) | 0;
      px(g, CAVE.floorD, x, y + 1, 2, 1); px(g, CAVE.floorL, x, y, 2, 1);
    }
    if (v === 2) { px(g, CAVE.floorD, 3, 9, 5, 1); px(g, CAVE.floorD, 7, 10, 3, 1); }
  },

  [T.CWALL](g, v) { paintRockWall(g, v, CAVE.rock, CAVE.rockD, CAVE.rockL); },

  [T.EWALL](g, v) {
    paintRockWall(g, v | 1, '#9a6a3a', '#6a4424', '#c8955a');
    const r = rng(77);
    for (let i = 0; i < 5; i++) { const x = 2 + ((r() * 11) | 0), y = 3 + ((r() * 9) | 0); px(g, '#c0b4a0', x, y, 2, 2); px(g, '#7a7064', x + 1, y + 1, 1, 1); }
    px(g, '#4a2e18', 4, 0, 1, 6); px(g, '#4a2e18', 5, 6, 1, 3); px(g, '#4a2e18', 11, 0, 1, 4);
    px(g, '#5a3a20', 0, 14, 16, 2);
  },

  [T.LOCKED](g, v) {
    if (v === 1) { PAINT[T.CLIFF](g, 0); } else px(g, CAVE.rockD, 0, 0, 16, 16);
    px(g, '#2a1a10', 2, 1, 12, 15);
    px(g, '#8a5a2c', 3, 2, 10, 14);
    px(g, '#6a4220', 6, 2, 1, 14); px(g, '#6a4220', 9, 2, 1, 14);
    px(g, '#4a4a54', 3, 4, 10, 2); px(g, '#4a4a54', 3, 12, 10, 2);
    px(g, '#8a6a10', 5, 6, 6, 6); px(g, '#f0c838', 6, 7, 4, 4); px(g, '#fff0a0', 6, 7, 4, 1);
    px(g, '#2a1a08', 7, 8, 2, 1); px(g, '#2a1a08', 7, 9, 2, 2);
  },

  [T.BARS](g, v) {
    if (v) paintGrass(g, 0); else PAINT[T.CFLOOR](g, 0);
    px(g, 'rgba(10,8,12,0.75)', 0, 0, 16, 16);
    for (let x = 1; x < 16; x += 4) { px(g, '#5a5a66', x, 0, 2, 16); px(g, '#a8a8b8', x, 0, 1, 16); }
    px(g, '#4a4a56', 0, 3, 16, 2); px(g, '#8a8a98', 0, 3, 16, 1);
    px(g, '#4a4a56', 0, 11, 16, 2); px(g, '#8a8a98', 0, 11, 16, 1);
  },

  [T.UP](g, frame) {
    PAINT[T.CFLOOR](g, 0);
    for (let i = 0; i < 4; i++) {
      const y = 12 - i * 4, l = 30 + i * 18 + (frame % 2) * 6;
      px(g, `rgb(${120 + l},${110 + l},${90 + l})`, 1, y, 14, 3);
      px(g, CAVE.floorD, 1, y + 3, 14, 1);
    }
    px(g, 'rgba(255,250,210,0.35)', 3, 0, 10, 4);
  },

  [T.DOWN](g, frame) {
    PAINT[T.CFLOOR](g, 0);
    px(g, '#1a0e08', 1, 1, 14, 14);
    for (let i = 0; i < 4; i++) {
      const y = 2 + i * 3, w = 12 - i * 2;
      px(g, CAVE.floorL, 8 - w / 2, y, w, 2);
    }
    const glow = frame % 2 ? '#ff8a20' : '#ff6a10';
    px(g, glow, 6, 13, 4, 2); px(g, '#ffd060', 7, 13, 2, 1);
  },

  [T.MUSH](g, v) {
    PAINT[T.CFLOOR](g, v);
    for (const [x, h, s] of [[4, 4, 2], [10, 6, 3], [13, 3, 1]]) {
      px(g, '#d8e0f0', x, 14 - h, 1, h);
      px(g, '#3a8ac8', x - s, 13 - h, s * 2 + 1, 2);
      px(g, '#70d8ff', x - s + 1, 12 - h, s * 2 - 1, 1);
    }
  },

  // --- Innenräume ---
  [T.WOOD](g) {
    if (NOBG) return;
    px(g, '#b8834a', 0, 0, 16, 16);
    for (let y = 0; y < 16; y += 4) {
      px(g, '#8a5a30', 0, y + 3, 16, 1);
      px(g, '#c8955a', 0, y, 16, 1);
      px(g, '#8a5a30', (y * 5) % 16, y, 1, 3);
    }
  },

  [T.IWALL](g, face) {
    if (!face) {
      px(g, '#4a2e1a', 0, 0, 16, 16);
      px(g, '#5e3c22', 0, 0, 16, 2); px(g, '#3a2212', 0, 14, 16, 2);
      return;
    }
    px(g, '#e8d8b0', 0, 0, 16, 10);
    for (let x = 1; x < 16; x += 4) px(g, '#d8c498', x, 0, 1, 10);
    px(g, '#7a4e2a', 0, 10, 16, 6); px(g, '#9a6a3a', 0, 10, 16, 1); px(g, '#5a3a20', 0, 15, 16, 1);
    px(g, '#5a3a20', 0, 0, 16, 1);
  },

  [T.EXIT](g) {
    PAINT[T.WOOD](g);
    px(g, '#8a2a2a', 2, 6, 12, 9); px(g, '#c84848', 3, 7, 10, 7);
    for (let x = 4; x < 13; x += 2) px(g, '#e8a040', x, 8, 1, 5);
  },

  [T.RDOOR](g) {
    PAINT[T.IWALL](g, 1);
    px(g, '#1a0e08', 2, 1, 12, 15);
    px(g, '#5a2e5a', 3, 2, 10, 14);
    px(g, '#7a4a7a', 3, 2, 10, 2);
    px(g, '#3a1a3a', 7, 4, 1, 12);
    // Fragezeichen-Plakette
    px(g, '#f0c838', 5, 5, 6, 7); px(g, '#8a6a10', 5, 11, 6, 1);
    px(g, '#2a1408', 6, 6, 4, 1); px(g, '#2a1408', 9, 7, 1, 1); px(g, '#2a1408', 7, 8, 2, 1); px(g, '#2a1408', 7, 10, 2, 1);
  },

  [T.RGATE](g) {
    paintGrass(g, 0);
    px(g, 'rgba(0,0,0,0.25)', 0, 13, 16, 3);
    for (let x = 1; x < 16; x += 3) {
      px(g, '#2a2a34', x, 2, 2, 13);
      px(g, '#6a6a7a', x, 2, 1, 13);
      px(g, '#8a8a9a', x, 0, 1, 2);
    }
    px(g, '#2a2a34', 0, 5, 16, 2); px(g, '#2a2a34', 0, 11, 16, 2);
    px(g, '#f0c838', 6, 6, 4, 5); px(g, '#2a1408', 7, 7, 2, 1); px(g, '#2a1408', 8, 8, 1, 1); px(g, '#2a1408', 7, 9, 1, 1);
  },

  // --- Tal der Trolle ---
  [T.CLIFF](g, v) {
    // Felsklippe: oben Grasrand, unten sichtbare Felswand mit runden Ecken
    const top = v & 1, bottom = v & 2, left = v & 4, right = v & 8, seed = v >> 4;
    px(g, '#6a5644', 0, 0, 16, 16);
    const r = rng(700 + seed * 11);
    for (let i = 0; i < 6; i++) { const x = (r() * 14) | 0, y = (r() * 14) | 0; px(g, '#5a4836', x, y, 3, 1); px(g, '#8a7458', x, y - 1, 2, 1); }
    for (let y = 0; y < 16; y += 5) px(g, '#4e3e2e', 0, y + (seed % 2) * 2, 16, 1);
    if (top) {
      paintGrass(g, 1);
      px(g, '#6a5644', 0, 6, 16, 10);
      for (let x = 0; x < 16; x++) {
        const h = 6 + Math.round(Math.sin(x * 0.9 + seed) * 1.2);
        px(g, '#3a6a2c', x, h, 1, 1); px(g, '#8ac060', x, h - 1, 1, 1);
      }
      for (let i = 0; i < 4; i++) { const x = (r() * 14) | 0; px(g, '#8a7458', x, 9 + ((r() * 5) | 0), 3, 1); }
    }
    if (bottom) {
      px(g, '#3e3024', 0, 13, 16, 2);
      px(g, 'rgba(0,0,0,0.3)', 0, 15, 16, 1);
    }
    if (left) { px(g, '#4e3e2e', 0, 0, 1, 16); px(g, '#8a7458', 1, top ? 7 : 0, 1, top ? 9 : 16); }
    if (right) { px(g, '#3e3024', 15, 0, 1, 16); }
  },

  [T.CAVEIN](g) {
    paintGrass(g, 2);
    px(g, 'rgba(0,0,0,0.25)', 1, 12, 14, 3);
    blob(g, 8, 9, 7.6, 6.6, (d, dx, dy) => (d > 0.78 ? (dy < 0 ? '#9a8670' : '#6e5a48') : null) || '#1a120c');
    blob(g, 8, 10, 5.2, 4.4, (d, dx, dy) => (dy < -0.2 ? '#050302' : '#120c08'));
    px(g, '#c8b49a', 4, 3, 3, 1); px(g, '#c8b49a', 10, 3, 2, 1);
  },

  [T.CHASM](g, v) {
    PAINT[T.CFLOOR](g, 0);
    const lip = (v & 1) ? 0 : 3, low = (v & 2) ? 16 : 13;
    px(g, '#050308', 0, lip, 16, low - lip);
    px(g, '#140e1c', 0, lip, 16, 2);
    if (!(v & 1)) { px(g, CAVE.rockL, 0, lip - 1, 16, 1); px(g, CAVE.rockD, 0, lip, 16, 1); }
    if (!(v & 2)) px(g, CAVE.rockD, 0, low, 16, 1);
    px(g, '#2a2236', 3, lip + 4, 1, 1); px(g, '#2a2236', 11, lip + 6, 1, 1);
  },

  [T.CRACK](g, v) {
    if (v) paintGrass(g, 3); else PAINT[T.CFLOOR](g, 1);
    px(g, 'rgba(0,0,0,0.25)', 1, 13, 14, 3);
    blob(g, 8, 8.5, 7.6, 7, (d, dx, dy) => {
      if (d > 0.84) return '#2e2620';
      if (dx + dy < -0.7) return '#b4a48e';
      if (dx + dy > 0.5) return '#5e4e40';
      return '#8a7866';
    });
    // Risse
    px(g, '#1a120c', 7, 2, 1, 4); px(g, '#1a120c', 8, 5, 1, 3); px(g, '#1a120c', 6, 8, 2, 1); px(g, '#1a120c', 9, 8, 3, 1);
    px(g, '#1a120c', 5, 9, 1, 3); px(g, '#1a120c', 11, 9, 1, 2); px(g, '#1a120c', 3, 6, 3, 1);
  },

  [T.RUG](g, m) {
    PAINT[T.WOOD](g);
    px(g, '#a83838', 0, 0, 16, 16);
    for (let y = 2; y < 16; y += 4) for (let x = (y % 8) ? 2 : 0; x < 16; x += 4) px(g, '#d86a4a', x, y, 2, 2);
    const e = '#f0c060';
    if (m & 1) { px(g, '#b8834a', 0, 0, 16, 2); px(g, e, 0, 2, 16, 1); }
    if (m & 2) { px(g, '#b8834a', 14, 0, 2, 16); px(g, e, 13, 0, 1, 16); }
    if (m & 4) { px(g, '#b8834a', 0, 14, 16, 2); px(g, e, 0, 13, 16, 1); }
    if (m & 8) { px(g, '#b8834a', 0, 0, 2, 16); px(g, e, 2, 0, 1, 16); }
  },
};

// Schwere Truhe (im Spukhaus statt Felsbrocken)
function paintChest(g) {
  PAINT[T.WOOD](g);
  px(g, 'rgba(0,0,0,0.3)', 1, 13, 14, 3);
  px(g, '#2a1408', 1, 2, 14, 13);
  px(g, '#7a4422', 2, 3, 12, 11);
  px(g, '#9a5a2e', 2, 3, 12, 4);
  px(g, '#c8803e', 2, 3, 12, 1);
  px(g, '#3a3a44', 2, 7, 12, 1); px(g, '#3a3a44', 4, 3, 1, 11); px(g, '#3a3a44', 11, 3, 1, 11);
  px(g, '#f0c838', 7, 6, 2, 3); px(g, '#2a1408', 7, 7, 2, 1);
}

const CAVE = {
  floor: '#6e6258', floorD: '#564a42', floorL: '#8a7e72',
  rock: '#9a8670', rockD: '#2e2620', rockL: '#c4b098',
};

// Felswand: oben dunkle "Decke", als Front (unten Boden) hellere Felswand mit Kante
function paintRockWall(g, v, base, dark, light) {
  const face = v & 1, seed = v >> 1;
  const r = rng(500 + seed * 17);
  if (!face) {
    px(g, dark, 0, 0, 16, 16);
    for (let i = 0; i < 5; i++) px(g, '#2a221e', (r() * 15) | 0, (r() * 15) | 0, 2, 1);
    return;
  }
  px(g, dark, 0, 0, 16, 4);
  px(g, base, 0, 4, 16, 12);
  px(g, light, 0, 4, 16, 1);
  for (let i = 0; i < 4; i++) {
    const x = (r() * 13) | 0, y = 6 + ((r() * 7) | 0);
    px(g, dark, x, y, 3, 1); px(g, light, x, y - 1, 2, 1);
  }
  px(g, dark, 0, 15, 16, 1);
}

// --- Objekte ------------------------------------------------------------------

export const ROOFS = {
  red: { c: '#c8483a', d: '#8e2e26', l: '#e8786a' },
  blue: { c: '#4a68c0', d: '#2e4488', l: '#7a98e0' },
  green: { c: '#3e9a6a', d: '#266a46', l: '#6ccc96' },
  orange: { c: '#d8883a', d: '#a05a20', l: '#f0b070' },
  purple: { c: '#8a4ab8', d: '#5a2e80', l: '#b880e0' },
};

export function drawHouse(g, o, cx, cy) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy, W = o.w * TILE, H = o.h * TILE;
  const roofH = 32, wallY = Y + roofH - 2;

  // Wand
  px(g, COL.out, X + 1, wallY, W - 2, Y + H - wallY);
  px(g, COL.wall, X + 2, wallY, W - 4, Y + H - wallY - 1);
  px(g, COL.wallD, X + 2, wallY, W - 4, 3);
  px(g, COL.beam, X + 2, wallY, 2, Y + H - wallY - 1);
  px(g, COL.beam, X + W - 4, wallY, 2, Y + H - wallY - 1);
  px(g, COL.stone, X + 2, Y + H - 4, W - 4, 3);
  px(g, COL.stoneD, X + 2, Y + H - 2, W - 4, 1);

  // Fenster
  const wy = Math.max(Y + 33, Y + H - 24);
  for (let i = 1; i < o.w - 1; i++) {
    if (o.x + i === o.door.x) continue;
    const wx = X + i * TILE + 4;
    px(g, COL.out, wx - 1, wy - 1, 10, 9);
    px(g, COL.glass, wx, wy, 8, 7);
    px(g, COL.glassD, wx, wy + 4, 8, 3);
    px(g, '#ffffff', wx + 1, wy + 1, 2, 1);
    px(g, COL.beam, wx + 3, wy, 2, 7); px(g, COL.beam, wx, wy + 3, 8, 1);
    px(g, COL.wood, wx - 1, wy + 7, 10, 2);
  }

  // Tür
  const dx = o.door.x * TILE - cx, dy = Y + H - TILE;
  px(g, COL.out, dx + 3, dy + 1, 10, 15);
  px(g, COL.door, dx + 4, dy + 2, 8, 14);
  px(g, COL.doorD, dx + 7, dy + 2, 1, 14);
  px(g, COL.doorD, dx + 4, dy + 2, 8, 1);
  px(g, '#f0d060', dx + 10, dy + 9);

  // Dach
  const R = o.roof;
  px(g, COL.out, X - 3, Y - 4, W + 6, roofH + 4);
  px(g, R.c, X - 2, Y - 3, W + 4, roofH + 2);
  let row = 0;
  for (let yy = Y + 1; yy < Y + roofH - 2; yy += 4, row++) {
    px(g, R.d, X - 2, yy, W + 4, 1);
    for (let xx = X - 2 + (row % 2) * 4; xx < X + W + 2; xx += 8) px(g, R.d, xx, yy - 3, 1, 3);
  }
  px(g, R.l, X - 2, Y - 3, W + 4, 2);
  px(g, R.d, X - 2, Y + roofH - 3, W + 4, 2);

  // Schornstein
  px(g, COL.out, X + W - 14, Y - 12, 8, 10);
  px(g, '#a05040', X + W - 13, Y - 11, 6, 8);
  px(g, '#c87060', X + W - 13, Y - 11, 6, 1);
}

let fountainBase = null;

function makeFountain() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const nx = (x + 0.5 - 16) / 15.5, ny = (y + 0.5 - 19) / 12.5;
      const d = nx * nx + ny * ny;
      if (d > 1) continue;
      const ix = (x + 0.5 - 16) / 11.5, iy = (y + 0.5 - 18.5) / 8.5;
      const di = ix * ix + iy * iy;
      let col;
      if (d > 0.88) col = '#3a3848';
      else if (di <= 1) col = di > 0.78 ? COL.waterD : COL.water;
      else col = ny < 0 ? COL.rockL : COL.stone;
      px(g, col, x, y);
    }
  }
  px(g, '#3a3848', 13, 4, 6, 16);
  px(g, COL.stone, 14, 5, 4, 15);
  px(g, COL.rockL, 14, 5, 1, 15);
  px(g, '#3a3848', 10, 3, 12, 4);
  px(g, COL.stone, 11, 4, 10, 2);
  px(g, COL.rockL, 11, 4, 10, 1);
  px(g, COL.waterL, 13, 2, 6, 1);
  return c;
}

export function drawFountain(g, o, cx, cy, t) {
  if (!fountainBase) fountainBase = makeFountain();
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  g.drawImage(fountainBase, X, Y);
  for (let i = 0; i < 8; i++) {
    const ph = (t * 1.2 + i / 8) % 1;
    const side = i % 2 ? 1 : -1;
    px(g, ph > 0.85 ? COL.foam : COL.waterL, Math.round(X + 16 + side * (3 + ph * 8)) - (side < 0 ? 1 : 0), Math.round(Y + 2 + ph * ph * 16));
  }
  const rip = Math.floor(t * 3) % 2;
  px(g, COL.waterL, X + 6 + rip * 2, Y + 21, 3, 1);
  px(g, COL.waterL, X + 22 - rip * 2, Y + 24, 3, 1);
}

export function drawStall(g, o, cx, cy) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  px(g, COL.woodD, X + 2, Y - 16, 2, 24);
  px(g, COL.woodD, X + 28, Y - 16, 2, 24);
  px(g, COL.out, X, Y + 2, 32, 14);
  px(g, COL.wood, X + 1, Y + 3, 30, 12);
  px(g, COL.woodL, X + 1, Y + 3, 30, 2);
  for (let xx = X + 8; xx < X + 31; xx += 8) px(g, COL.woodD, xx, Y + 5, 1, 10);
  // Waren
  for (const [ax, ay] of [[5, 0], [9, 0], [7, -2]]) { px(g, '#a82828', X + ax, Y + ay, 3, 3); px(g, '#e84848', X + ax, Y + ay, 2, 2); px(g, '#ffd0d0', X + ax, Y + ay, 1, 1); }
  px(g, '#8a5a20', X + 18, Y - 1, 9, 4); px(g, '#e0a858', X + 19, Y - 1, 7, 2);
  // Markise
  px(g, COL.out, X - 3, Y - 21, 38, 9);
  for (let i = 0; i < 9; i++) {
    px(g, i % 2 ? '#f4f0e8' : '#d84848', X - 2 + i * 4, Y - 20, 4, 7);
    px(g, i % 2 ? '#f4f0e8' : '#d84848', X - 1 + i * 4, Y - 13, 2, 1);
  }
}

export function drawLever(g, o, cx, cy) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  px(g, 'rgba(0,0,0,0.2)', X + 3, Y + 13, 10, 3);
  px(g, COL.out, X + 2, Y + 9, 12, 6);
  px(g, COL.stone, X + 3, Y + 10, 10, 4);
  px(g, COL.rockL, X + 3, Y + 10, 10, 1);
  // Hebelarm: links = zu, rechts = offen
  const tip = o.pulled ? [X + 12, Y + 1] : [X + 3, Y + 1];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    px(g, COL.woodD, Math.round(X + 7 + (tip[0] - X - 7) * t), Math.round(Y + 10 + (tip[1] - Y - 10) * t), 2, 1);
  }
  px(g, '#d83838', tip[0] - 1, tip[1] - 1, 3, 3);
  px(g, '#ff9090', tip[0] - 1, tip[1] - 1, 1, 1);
}

export function drawSign(g, o, cx, cy) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  px(g, 'rgba(0,0,0,0.2)', X + 4, Y + 14, 8, 2);
  px(g, COL.woodD, X + 7, Y + 8, 2, 8);
  px(g, COL.out, X + 1, Y + 1, 14, 9);
  px(g, COL.wood, X + 2, Y + 2, 12, 7);
  px(g, COL.woodL, X + 2, Y + 2, 12, 1);
  px(g, COL.woodD, X + 4, Y + 4, 8, 1);
  px(g, COL.woodD, X + 4, Y + 6, 6, 1);
}

// --- Weitere Objekte: Schilder, Höhle, Innenräume -----------------------------------

// Hängeschild neben einer Tür: icon 'book' (Schule) oder 'diamond' (Laden)
export function drawHouseSign(g, o, cx, cy) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  px(g, COL.woodD, X + 1, Y + 1, 14, 1);
  px(g, COL.woodD, X + 3, Y + 2, 1, 2); px(g, COL.woodD, X + 12, Y + 2, 1, 2);
  px(g, COL.out, X + 1, Y + 4, 14, 11);
  px(g, '#f4ead0', X + 2, Y + 5, 12, 9);
  if (o.icon === 'book') {
    px(g, '#3a58c8', X + 4, Y + 7, 4, 6); px(g, '#c83a3a', X + 8, Y + 7, 4, 6);
    px(g, '#ffffff', X + 5, Y + 8, 2, 1); px(g, '#ffffff', X + 9, Y + 8, 2, 1);
    px(g, '#2a1a10', X + 8, Y + 7, 1, 6);
  } else {
    drawDiamond(g, X + 5, Y + 6);
  }
}

export function drawDiamond(g, x, y) {
  px(g, '#0a3a5a', x + 1, y, 5, 1);
  px(g, '#0a3a5a', x, y + 1, 7, 1);
  px(g, '#58d8f0', x + 1, y + 1, 5, 1); px(g, '#c8ffff', x + 2, y + 1, 1, 1);
  px(g, '#0a3a5a', x, y + 2, 7, 1); px(g, '#2a9ac8', x + 1, y + 2, 5, 1); px(g, '#88f0ff', x + 1, y + 2, 2, 1);
  px(g, '#0a3a5a', x + 1, y + 3, 5, 1); px(g, '#2a9ac8', x + 2, y + 3, 3, 1);
  px(g, '#0a3a5a', x + 2, y + 4, 3, 1); px(g, '#2a9ac8', x + 3, y + 4, 1, 1);
  px(g, '#0a3a5a', x + 3, y + 5, 1, 1);
}

// Fackel an der Höhlenwand
export function drawTorch(g, o, cx, cy, t) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  const f = Math.floor(t * 8 + o.x) % 2;
  g.fillStyle = 'rgba(255,170,60,0.13)';
  g.beginPath(); g.arc(X + 8, Y + 8, 18 + f * 2, 0, Math.PI * 2); g.fill();
  px(g, '#3a3a44', X + 6, Y + 11, 4, 2);
  px(g, '#6a4a2a', X + 7, Y + 8, 2, 5);
  px(g, '#ff6a20', X + 5, Y + 3 - f, 6, 6);
  px(g, '#ffc040', X + 6, Y + 4 - f, 4, 4);
  px(g, '#fff6b0', X + 7, Y + 5 - f, 2, 2);
}

// Drachenstatue: speit Feuer nach unten, zerbricht durch zurückgeworfenes Feuer
export function drawStatue(g, o, cx, cy, t) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  if (!o.alive) {
    px(g, '#4a4440', X + 2, Y + 9, 12, 6);
    px(g, '#6e665e', X + 3, Y + 10, 4, 3); px(g, '#8a8078', X + 9, Y + 11, 4, 3);
    px(g, '#5a524c', X + 6, Y + 8, 3, 2);
    return;
  }
  const glow = Math.floor(t * 4) % 2 ? '#ffb030' : '#ff8a20';
  px(g, 'rgba(0,0,0,0.3)', X + 1, Y + 13, 14, 3);
  px(g, '#2e2824', X + 1, Y - 8, 14, 22);
  px(g, '#8a8078', X + 2, Y - 7, 12, 20);
  px(g, '#a8a098', X + 2, Y - 7, 12, 2);
  px(g, '#6e665e', X + 2, Y + 8, 12, 5);
  // Hörner
  px(g, '#2e2824', X, Y - 10, 3, 4); px(g, '#d8d0c0', X + 1, Y - 10, 1, 3);
  px(g, '#2e2824', X + 13, Y - 10, 3, 4); px(g, '#d8d0c0', X + 14, Y - 10, 1, 3);
  // Augen
  px(g, '#2e2824', X + 3, Y - 3, 4, 3); px(g, glow, X + 4, Y - 2, 2, 1);
  px(g, '#2e2824', X + 9, Y - 3, 4, 3); px(g, glow, X + 10, Y - 2, 2, 1);
  // Maul
  px(g, '#1a1008', X + 4, Y + 5, 8, 5);
  px(g, glow, X + 5, Y + 7, 6, 2);
  px(g, '#f0eadc', X + 5, Y + 5, 1, 2); px(g, '#f0eadc', X + 10, Y + 5, 1, 2);
}

export function drawBlackboard(g, o, cx, cy) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy, W = o.w * TILE;
  px(g, '#5a3a20', X, Y + 1, W, 12);
  px(g, '#2a4a3a', X + 2, Y + 2, W - 4, 9);
  px(g, '#e8f0e8', X + 6, Y + 4, 10, 1); px(g, '#e8f0e8', X + 6, Y + 7, 16, 1);
  px(g, '#e8f0e8', X + 30, Y + 4, 3, 1); px(g, '#e8f0e8', X + 31, Y + 3, 1, 3); // +
  px(g, '#e8f0e8', X + 36, Y + 4, 6, 1); px(g, '#e8f0e8', X + 46, Y + 4, 8, 1);
  px(g, '#e8f0e8', X + 46, Y + 7, 12, 1);
  px(g, '#c8a070', X + 8, Y + 11, W - 16, 2);
}

export function drawDesk(g, o, cx, cy) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy, W = (o.w || 1) * TILE;
  px(g, 'rgba(0,0,0,0.2)', X + 1, Y + 13, W - 2, 3);
  px(g, '#5a3a20', X + 1, Y + 2, W - 2, 10);
  px(g, '#c8955a', X + 1, Y + 2, W - 2, 7);
  px(g, '#e0b070', X + 1, Y + 2, W - 2, 1);
  px(g, '#5a3a20', X + 2, Y + 9, 2, 5); px(g, '#5a3a20', X + W - 4, Y + 9, 2, 5);
  if (o.book) { px(g, '#3a58c8', X + 4, Y + 4, 5, 3); px(g, '#ffffff', X + 5, Y + 4, 3, 1); }
}

export function drawShelf(g, o, cx, cy) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy, W = o.w * TILE;
  px(g, '#4a2e1a', X, Y - 2, W, 16);
  px(g, '#7a4e2a', X + 1, Y - 1, W - 2, 14);
  for (const sy of [4, 10]) {
    px(g, '#4a2e1a', X + 1, Y + sy, W - 2, 1);
    for (let x = X + 3; x < X + W - 4; x += 5) {
      const k = ((x * 7 + sy) >> 2) % 4;
      const c = o.goods ? ['#58d8f0', '#e84848', '#f0c838', '#88e070'][k] : ['#3a58c8', '#c83a3a', '#3a9a5a', '#d8a040'][k];
      if (o.goods) { px(g, c, x, Y + sy - 3, 3, 3); px(g, '#ffffff', x, Y + sy - 3, 1, 1); }
      else px(g, c, x, Y + sy - 5, 3, 5);
    }
  }
}

export function drawCounter(g, o, cx, cy) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy, W = o.w * TILE;
  px(g, 'rgba(0,0,0,0.25)', X, Y + 14, W, 2);
  px(g, '#3a2212', X, Y + 1, W, 14);
  px(g, '#9a6a3a', X + 1, Y + 2, W - 2, 12);
  px(g, '#c8955a', X + 1, Y + 2, W - 2, 3);
  for (let x = X + 12; x < X + W - 4; x += 16) px(g, '#7a4e2a', x, Y + 6, 1, 8);
  if (o.wares) {
    drawDiamond(g, X + 6, Y - 3);
    px(g, '#7a3a12', X + W - 20, Y - 1, 3, 3); px(g, '#7a3a12', X + W - 16, Y - 1, 3, 3); // Kastanien
    px(g, '#c83a5a', X + W - 10, Y - 4, 4, 6); px(g, '#ffffff', X + W - 9, Y - 3, 1, 2);   // Trank
  }
}

export function drawBarrel(g, o, cx, cy) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  px(g, 'rgba(0,0,0,0.25)', X + 2, Y + 13, 12, 3);
  px(g, '#3a2212', X + 2, Y + 1, 12, 14);
  px(g, '#9a6a3a', X + 3, Y + 2, 10, 12);
  px(g, '#c8955a', X + 4, Y + 2, 2, 12);
  px(g, '#5a5a66', X + 3, Y + 4, 10, 1); px(g, '#5a5a66', X + 3, Y + 11, 10, 1);
}

export function drawPlant(g, o, cx, cy) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  px(g, '#8a4a2a', X + 4, Y + 9, 8, 6); px(g, '#b06a3a', X + 4, Y + 9, 8, 1);
  for (const [x, y] of [[4, 2], [9, 1], [6, 4], [2, 6], [11, 5], [7, 0]]) { px(g, '#2f8a3c', X + x, Y + y, 3, 4); px(g, '#5cb84a', X + x, Y + y, 1, 2); }
}

export function drawWindow(g, o, cx, cy) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  px(g, '#5a3a20', X + 2, Y + 1, 12, 9);
  px(g, '#9ad0f8', X + 3, Y + 2, 10, 7);
  px(g, '#d8f0ff', X + 4, Y + 3, 3, 2);
  px(g, '#5a3a20', X + 7, Y + 2, 1, 7); px(g, '#5a3a20', X + 3, Y + 5, 10, 1);
}

// --- Spukhaus-Objekte --------------------------------------------------------------

export function drawPumpkin(g, o, cx, cy, t) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  px(g, 'rgba(0,0,0,0.3)', X + 2, Y + 13, 12, 3);
  px(g, '#3a1a08', X + 1, Y + 4, 14, 11);
  px(g, '#e07a20', X + 2, Y + 5, 12, 9);
  px(g, '#f8a040', X + 3, Y + 5, 3, 7); px(g, '#c05a10', X + 7, Y + 5, 1, 9); px(g, '#c05a10', X + 10, Y + 5, 1, 9);
  px(g, '#3a6a20', X + 7, Y + 1, 2, 4); px(g, '#5a9a30', X + 9, Y + 2, 3, 2);
  if (o.lit) {
    const f = Math.floor(t * 6 + o.x) % 2 ? '#fff060' : '#ffc030';
    px(g, '#2a1008', X + 4, Y + 7, 3, 2); px(g, f, X + 5, Y + 7, 1, 1);
    px(g, '#2a1008', X + 9, Y + 7, 3, 2); px(g, f, X + 10, Y + 7, 1, 1);
    px(g, '#2a1008', X + 4, Y + 10, 8, 2); px(g, f, X + 5, Y + 10, 1, 1); px(g, f, X + 8, Y + 10, 1, 1); px(g, f, X + 10, Y + 11, 1, 1);
  }
}

export function drawGrave(g, o, cx, cy) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  px(g, 'rgba(0,0,0,0.3)', X + 2, Y + 13, 12, 3);
  px(g, '#2e2a34', X + 3, Y + 1, 10, 14);
  px(g, '#8a8698', X + 4, Y + 2, 8, 12);
  px(g, '#a8a4b8', X + 4, Y + 2, 8, 2);
  px(g, '#2e2a34', X + 3, Y + 1, 1, 1); px(g, '#2e2a34', X + 12, Y + 1, 1, 1);
  // "RIP"
  px(g, '#4a4658', X + 5, Y + 6, 1, 4); px(g, '#4a4658', X + 6, Y + 6, 1, 1); px(g, '#4a4658', X + 6, Y + 8, 1, 1);
  px(g, '#4a4658', X + 8, Y + 6, 1, 4);
  px(g, '#4a4658', X + 10, Y + 6, 1, 4); px(g, '#4a4658', X + 11, Y + 6, 1, 2);
  px(g, '#3a6a30', X + 3, Y + 14, 3, 1); px(g, '#3a6a30', X + 11, Y + 14, 2, 1);
}

export function drawCandle(g, o, cx, cy, t) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  px(g, '#2a2a34', X + 4, Y + 13, 8, 2);
  px(g, '#6a6a7a', X + 5, Y + 12, 6, 1);
  px(g, '#e8e0c8', X + 6, Y + 6, 4, 7); px(g, '#ffffff', X + 6, Y + 6, 1, 7); px(g, '#b8b098', X + 9, Y + 6, 1, 7);
  px(g, '#2a2a2a', X + 7, Y + 4, 1, 2);
  if (o.lit) {
    const f = Math.floor(t * 8 + o.x) % 2;
    px(g, '#ff7a20', X + 6, Y + 0 + f, 3, 4); px(g, '#ffd040', X + 7, Y + 1 + f, 1, 3); px(g, '#ffffc0', X + 7, Y + 2 + f, 1, 1);
  }
}

export function drawWallBat(g, o, cx, cy, t) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  const flap = Math.floor(t * 2 + o.x) % 4 === 0 ? 1 : 0;
  px(g, '#1a1020', X + 7, Y + 2, 2, 1);
  px(g, '#2a1a34', X + 5, Y + 3, 6, 6);
  px(g, '#2a1a34', X + 1, Y + 4 - flap, 4, 4); px(g, '#2a1a34', X + 11, Y + 4 - flap, 4, 4);
  px(g, '#4a3a5a', X + 6, Y + 4, 4, 3);
  px(g, '#ff4040', X + 6, Y + 6, 1, 1); px(g, '#ff4040', X + 9, Y + 6, 1, 1);
}

export function drawWallSpider(g, o, cx, cy, t) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  g.fillStyle = 'rgba(230,230,240,0.7)';
  for (let i = 0; i < 16; i += 4) { g.fillRect(X + i, Y + i / 2, 1, 1); g.fillRect(X + 15 - i, Y + i / 2, 1, 1); }
  px(g, 'rgba(230,230,240,0.6)', X + 8, Y, 1, 6 + Math.round(Math.sin(t * 2) * 1.5));
  const sy = Y + 7 + Math.round(Math.sin(t * 2) * 1.5);
  px(g, '#1a1020', X + 6, sy, 5, 4);
  px(g, '#1a1020', X + 4, sy, 1, 3); px(g, '#1a1020', X + 11, sy, 1, 3); px(g, '#1a1020', X + 5, sy + 4, 1, 2); px(g, '#1a1020', X + 10, sy + 4, 1, 2);
  px(g, '#ff4040', X + 7, sy + 1, 1, 1); px(g, '#ff4040', X + 9, sy + 1, 1, 1);
}

export function drawCauldron(g, o, cx, cy, t) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  px(g, '#ff7a20', X + 4, Y + 13, 8, 2); px(g, '#ffd040', X + 6, Y + 13, 4, 1);
  px(g, '#1a1a22', X + 1, Y + 4, 14, 10);
  px(g, '#3a3a48', X + 2, Y + 5, 12, 8); px(g, '#5a5a6a', X + 3, Y + 5, 2, 7);
  px(g, '#1a1a22', X, Y + 3, 16, 2);
  px(g, '#58c040', X + 2, Y + 3, 12, 1);
  for (let i = 0; i < 3; i++) {
    const ph = (t * 1.5 + i / 3) % 1;
    px(g, '#88f070', X + 4 + i * 4, Y + 2 - Math.round(ph * 6), 2, 2);
  }
}

export function drawDeadTree(g, o, cx, cy) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  px(g, 'rgba(0,0,0,0.3)', X + 3, Y + 14, 10, 2);
  px(g, '#2a1a12', X + 6, Y - 6, 4, 21);
  px(g, '#4a3020', X + 7, Y - 6, 1, 21);
  px(g, '#2a1a12', X + 2, Y - 4, 5, 2); px(g, '#2a1a12', X + 1, Y - 8, 2, 5);
  px(g, '#2a1a12', X + 10, Y - 2, 4, 2); px(g, '#2a1a12', X + 13, Y - 6, 2, 5);
  px(g, '#2a1a12', X + 8, Y - 12, 2, 7); px(g, '#2a1a12', X + 5, Y - 14, 3, 2);
}

// --- Tal der Trolle: Objekte -----------------------------------------------------------

export function drawChest(g, o, cx, cy) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  px(g, 'rgba(0,0,0,0.3)', X + 1, Y + 13, 14, 3);
  if (o.open) {
    px(g, '#2a1408', X + 1, Y + 1, 14, 5); px(g, '#7a4422', X + 2, Y + 2, 12, 3);
    px(g, '#2a1408', X + 1, Y + 6, 14, 9); px(g, '#1a0c06', X + 2, Y + 7, 12, 3); px(g, '#7a4422', X + 2, Y + 10, 12, 4);
    px(g, '#f0c838', X + 2, Y + 6, 12, 1);
    return;
  }
  px(g, '#2a1408', X + 1, Y + 3, 14, 12);
  px(g, '#9a5a2e', X + 2, Y + 4, 12, 10); px(g, '#c8803e', X + 2, Y + 4, 12, 2);
  px(g, '#f0c838', X + 2, Y + 8, 12, 1); px(g, '#f0c838', X + 4, Y + 4, 1, 10); px(g, '#f0c838', X + 11, Y + 4, 1, 10);
  px(g, '#f0c838', X + 7, Y + 7, 2, 3); px(g, '#2a1408', X + 7, Y + 8, 2, 1);
}

// Suchscheinwerfer-Turm (der Lichtkegel wird in main.js gezeichnet)
export function drawSearchlight(g, o, cx, cy, t) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  px(g, 'rgba(0,0,0,0.3)', X, Y + 13, 16, 3);
  px(g, '#2a2420', X + 2, Y - 6, 12, 20);
  px(g, '#8a8078', X + 3, Y - 5, 10, 18); px(g, '#a8a098', X + 3, Y - 5, 3, 18);
  for (let y = Y - 3; y < Y + 12; y += 4) px(g, '#6e665e', X + 3, y, 10, 1);
  const alarm = o.alarmT > 0 && Math.floor(t * 8) % 2;
  px(g, '#2a2420', X + 1, Y - 11, 14, 6);
  px(g, alarm ? '#ff4040' : '#fff6b0', X + 3, Y - 10, 10, 4);
  px(g, '#ffffff', X + 5, Y - 9, 3, 1);
}

// Feuerspucker: Drachenkopf an der Wand
export function drawSpitter(g, o, cx, cy, t) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  const glow = Math.floor(t * 4 + o.x) % 2 ? '#ffb030' : '#ff7a20';
  px(g, '#2e2824', X + 3, Y + 3, 10, 10);
  px(g, '#8a8078', X + 4, Y + 4, 8, 8); px(g, '#a8a098', X + 4, Y + 4, 8, 2);
  px(g, '#2e2824', X + 5, Y + 6, 2, 2); px(g, glow, X + 5, Y + 6, 1, 1);
  px(g, '#2e2824', X + 9, Y + 6, 2, 2); px(g, glow, X + 10, Y + 6, 1, 1);
  const [dx, dy] = [[0, 1], [0, -1], [-1, 0], [1, 0]][o.dir];
  px(g, '#1a1008', X + 6 + dx * 4, Y + 9 + dy * 4, 4, 3); px(g, glow, X + 7 + dx * 4, Y + 10 + dy * 4, 2, 1);
}

// Feuerschale (Licht in der Unterwelt)
export function drawBrazier(g, o, cx, cy, t) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  const f = Math.floor(t * 8 + o.x) % 2;
  px(g, 'rgba(0,0,0,0.3)', X + 3, Y + 13, 10, 3);
  px(g, '#2a2a34', X + 4, Y + 10, 8, 4); px(g, '#5a5a6a', X + 3, Y + 8, 10, 3); px(g, '#8a8a9a', X + 3, Y + 8, 10, 1);
  px(g, '#ff6a20', X + 4, Y + 3 - f, 8, 6); px(g, '#ffc040', X + 6, Y + 4 - f, 4, 4); px(g, '#fff6b0', X + 7, Y + 5 - f, 2, 2);
}

// Käfig (2 Kacheln breit) – hier halten die Felsmonster Jelly gefangen
export function drawCage(g, o, cx, cy) {
  if (o.open) return;
  const x = o.x * TILE - cx, y = o.y * TILE - cy;
  px(g, '#3a3040', x + 1, y - 6, 30, 3);
  px(g, '#8a8098', x + 1, y - 6, 30, 1);
  for (let i = 0; i < 8; i++) { px(g, '#1a1020', x + 2 + i * 4, y - 3, 2, 19); px(g, '#a8a0b8', x + 2 + i * 4, y - 3, 1, 19); }
  px(g, '#3a3040', x + 1, y + 15, 30, 2);
  px(g, '#f0c838', x + 14, y + 6, 4, 4); px(g, '#1a1020', x + 15, y + 7, 2, 2);
}
