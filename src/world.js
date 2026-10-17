// Welt: Tile-Karte, Kollision, Objekte (Häuser, Brunnen, Stand, Schild) und deren Pixel-Grafik.

export const TILE = 16;
export const MAP_W = 32;
export const MAP_H = 24;

export const T = {
  GRASS: 0, FLOWER: 1, PATH: 2, WATER: 3, TREE: 4, FENCE: 5, BUSH: 6, ROCK: 7, GATE: 8,
  BOULDER: 9,   // Felix kann ihn schieben
  DIG: 10,      // lockere Erde – Arne kann graben
  DIGFENCE: 11, // Zaun mit lockerer Erde darunter – Arne gräbt einen Tunnel
  TUNNEL: 12,   // gegrabener Durchgang unter dem Zaun
  HOLE: 13,     // ausgegrabenes Loch (begehbar)
};
const SOLID = new Set([T.WATER, T.TREE, T.FENCE, T.BUSH, T.ROCK, T.GATE, T.BOULDER, T.DIGFENCE]);

export const COL = {
  out: '#1a1020',
  grass: '#68b850', grassD: '#4a9640', grassL: '#8ad468',
  path: '#e4cc94', pathD: '#c9ab70', pathL: '#f2e0b0',
  water: '#3a80d8', waterD: '#2a60b0', waterL: '#8cc4f8', foam: '#e8f4ff',
  leafO: '#163d1e', leafD: '#23662e', leaf: '#2f8a3c', leafL: '#5cb84a',
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

// --- Welt aufbauen ------------------------------------------------------------

export function createWorld() {
  const tiles = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(T.GRASS));
  const block = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(false));
  const texts = new Map();   // Interaktions-Texte pro Tile
  const counter = new Set(); // Tiles, über die man hinweg redet (Marktstand)
  const objects = [];

  const inside = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
  const set = (x, y, t) => { if (inside(x, y)) tiles[y][x] = t; };
  const rect = (x, y, w, h, t) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, t); };
  const solidRect = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (inside(i, j)) block[j][i] = true; };
  const say = (x, y, lines) => texts.set(`${x},${y}`, lines);

  // Blumen verstreut
  const r = rng(42);
  for (let i = 0; i < 70; i++) set(2 + ((r() * 28) | 0), 2 + ((r() * 20) | 0), T.FLOWER);

  // Waldrand
  rect(0, 0, MAP_W, 2, T.TREE); rect(0, MAP_H - 2, MAP_W, 2, T.TREE);
  rect(0, 0, 2, MAP_H, T.TREE); rect(MAP_W - 2, 0, 2, MAP_H, T.TREE);

  // Wege
  rect(15, 0, 2, 12, T.PATH);   // Nordstraße zum Tor
  rect(3, 12, 26, 2, T.PATH);   // Dorfstraße
  rect(13, 10, 6, 6, T.PATH);   // Dorfplatz
  rect(5, 8, 1, 4, T.PATH);     // zu Oma Hilde
  rect(10, 8, 1, 4, T.PATH);    // zu Tims Haus
  rect(24, 8, 1, 4, T.PATH);    // zu Lottes Haus
  rect(6, 14, 2, 2, T.PATH);    // zum Garten
  rect(15, 1, 2, 1, T.GATE);    // Tor zum Flüsterwald

  // Oma Hildes Garten – rundum Zaun, nur unten durch kommt man (Arne gräbt)
  rect(3, 16, 8, 1, T.FENCE); rect(3, 21, 8, 1, T.FENCE);
  rect(3, 16, 1, 6, T.FENCE); rect(10, 16, 1, 6, T.FENCE);
  rect(4, 17, 6, 4, T.GRASS);
  for (const [x, y] of [[4, 17], [5, 18], [9, 17], [4, 20], [8, 20], [8, 18]]) set(x, y, T.FLOWER);
  set(7, 16, T.DIGFENCE);
  say(7, 16, ['Der Zaun ist zu hoch zum Klettern. Aber die Erde darunter ist ganz locker...']);

  // Teich
  rect(21, 16, 6, 4, T.WATER);

  // Deko
  for (const [x, y] of [[20, 17], [27, 18], [25, 20], [2, 6]]) set(x, y, T.ROCK);
  for (const [x, y] of [[2, 2], [29, 2], [2, 10], [29, 15], [14, 20], [29, 21]]) set(x, y, T.TREE);
  for (const [x, y] of [[12, 17], [13, 18], [17, 18], [18, 20], [28, 5], [28, 6], [19, 4], [20, 4],
    [8, 10], [27, 14], [2, 15], [11, 20]]) set(x, y, T.BUSH);

  // Felsbrocken vor Arnes Tür, Steine links und rechts – nur Felix kommt da durch
  const under = new Map();
  set(23, 8, T.ROCK); set(25, 8, T.ROCK);
  under.set('24,9', T.PATH);
  set(24, 9, T.BOULDER);

  // Grabstellen mit kleinen Schätzen
  for (const [x, y] of [[19, 19], [27, 10], [12, 2]]) set(x, y, T.DIG);

  // Häuser
  const addHouse = (x, y, w, h, doorDx, roof, lines) => {
    const o = { type: 'house', x, y, w, h, roof, door: { x: x + doorDx, y: y + h - 1 }, sortY: (y + h) * TILE };
    o.draw = (g, cx, cy) => drawHouse(g, o, cx, cy);
    objects.push(o);
    solidRect(x, y, w, h);
    say(o.door.x, o.door.y, lines);
  };
  addHouse(3, 4, 5, 4, 2, ROOFS.red, ['Felix\' Haus. Felix ist draußen.']);
  addHouse(9, 5, 4, 3, 1, ROOFS.blue, ['Theos Zuhause. Hier wohnt er mit Mama und Friedrich.']);
  addHouse(22, 4, 5, 4, 2, ROOFS.green, ['Arnes Haus.']);

  // Brunnen
  {
    const o = { type: 'fountain', x: 15, y: 12, sortY: 14 * TILE };
    o.draw = (g, cx, cy, t) => drawFountain(g, o, cx, cy, t);
    objects.push(o);
    solidRect(15, 12, 2, 2);
    for (const [x, y] of [[15, 12], [16, 12], [15, 13], [16, 13]]) say(x, y, ['Ein alter Brunnen. Das Wasser glitzert in der Sonne.']);
  }

  // Marktstand
  {
    const o = { type: 'stall', x: 20, y: 10, sortY: 11 * TILE };
    o.draw = (g, cx, cy) => drawStall(g, o, cx, cy);
    objects.push(o);
    solidRect(20, 10, 2, 1);
    counter.add('20,10'); counter.add('21,10');
  }

  // Wegweiser
  {
    const o = { type: 'sign', x: 17, y: 3, sortY: 4 * TILE };
    o.draw = (g, cx, cy) => drawSign(g, o, cx, cy);
    objects.push(o);
    solidRect(17, 3, 1, 1);
    say(17, 3, ['NORDEN: Der Buttenberg', 'Achtung, Drache! Zutritt nur mit Erlaubnis der Torwache!']);
  }

  // Torhebel
  const lever = { type: 'lever', x: 18, y: 2, sortY: 3 * TILE, pulled: false };
  lever.draw = (g, cx, cy) => drawLever(g, lever, cx, cy);
  objects.push(lever);
  solidRect(18, 2, 1, 1);

  const world = {
    tiles, block, objects, texts, counter, lever,
    gateOpen: false,
    isLever(tx, ty) { return tx === 18 && ty === 2; },
    // Fels schieben: nur auf freies Gras/Blumen, nicht auf Wege (verhindert Sackgassen)
    pushBoulder(tx, ty, dx, dy, occupied) {
      const nx = tx + dx, ny = ty + dy;
      const dest = world.tile(nx, ny);
      if ((dest !== T.GRASS && dest !== T.FLOWER) || block[ny][nx] || occupied(nx, ny)) return false;
      under.set(`${nx},${ny}`, dest);
      tiles[ny][nx] = T.BOULDER;
      tiles[ty][tx] = under.get(`${tx},${ty}`) ?? T.GRASS;
      return true;
    },
    tile(tx, ty) { return inside(tx, ty) ? tiles[ty][tx] : T.TREE; },
    setTile(tx, ty, t) { if (inside(tx, ty)) tiles[ty][tx] = t; },
    isSolidTile(tx, ty) {
      if (ty < 0) return !(world.gateOpen && (tx === 15 || tx === 16)); // Ausgang nach Norden
      if (!inside(tx, ty)) return true;
      return SOLID.has(tiles[ty][tx]) || block[ty][tx];
    },
    isCounter(tx, ty) { return counter.has(`${tx},${ty}`); },
    textAt(tx, ty) { return texts.get(`${tx},${ty}`) || null; },
    openGate() { world.gateOpen = true; lever.pulled = true; rect(15, 1, 2, 1, T.PATH); },
  };
  return world;
}

// --- Tiles zeichnen ------------------------------------------------------------

const tileCache = new Map();

function variant(world, tx, ty, t, frame) {
  const tl = (x, y) => world.tile(x, y);
  switch (t) {
    case T.GRASS: case T.FLOWER: return hash(tx, ty) % 4;
    case T.PATH: {
      const isP = (x, y) => { const n = tl(x, y); return n === T.PATH || n === T.GATE || y < 0; };
      return (isP(tx, ty - 1) ? 0 : 1) | (isP(tx + 1, ty) ? 0 : 2) | (isP(tx, ty + 1) ? 0 : 4) | (isP(tx - 1, ty) ? 0 : 8);
    }
    case T.WATER: {
      const land = (x, y) => tl(x, y) !== T.WATER;
      const m = (land(tx, ty - 1) ? 1 : 0) | (land(tx + 1, ty) ? 2 : 0) | (land(tx, ty + 1) ? 4 : 0) | (land(tx - 1, ty) ? 8 : 0);
      return m + frame * 16;
    }
    case T.FENCE: case T.DIGFENCE: case T.TUNNEL: {
      const f = (x, y) => { const n = tl(x, y); return n === T.FENCE || n === T.DIGFENCE || n === T.TUNNEL; };
      return (f(tx, ty - 1) ? 1 : 0) | (f(tx + 1, ty) ? 2 : 0) | (f(tx, ty + 1) ? 4 : 0) | (f(tx - 1, ty) ? 8 : 0);
    }
    default: return 0;
  }
}

function tileImage(t, v) {
  const key = t * 1000 + v;
  let c = tileCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = TILE;
  const g = c.getContext('2d');
  PAINT[t](g, v);
  tileCache.set(key, c);
  return c;
}

export function drawTiles(g, world, camX, camY, time) {
  const frame = Math.floor(time * 2.5) % 4;
  const tx0 = Math.floor(camX / TILE), ty0 = Math.floor(camY / TILE);
  for (let ty = ty0; ty <= ty0 + 10; ty++) {
    for (let tx = tx0; tx <= tx0 + 15; tx++) {
      if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) continue;
      const t = world.tiles[ty][tx];
      g.drawImage(tileImage(t, variant(world, tx, ty, t, frame)), tx * TILE - camX, ty * TILE - camY);
    }
  }
}

const px = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

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
  px(g, COL.grass, 0, 0, 16, 16);
  const r = rng(17 + v * 31);
  const n = v === 3 ? 2 : 4;
  for (let i = 0; i < n; i++) {
    const x = 1 + ((r() * 12) | 0), y = 2 + ((r() * 11) | 0);
    px(g, COL.grassD, x, y + 1); px(g, COL.grassD, x + 2, y + 1); px(g, COL.grassD, x + 1, y + 2);
    px(g, COL.grassL, x + 1, y);
  }
}

const FLOWER_COLS = ['#f05050', '#f8e050', '#ffffff', '#e070e0'];

const PAINT = {
  [T.GRASS]: paintGrass,

  [T.FLOWER](g, v) {
    paintGrass(g, v);
    const r = rng(99 + v * 7);
    for (let i = 0; i < 3; i++) {
      const x = 2 + ((r() * 11) | 0), y = 2 + ((r() * 11) | 0);
      const c = FLOWER_COLS[(r() * 4) | 0];
      px(g, c, x - 1, y); px(g, c, x + 1, y); px(g, c, x, y - 1); px(g, c, x, y + 1);
      px(g, c === '#f8e050' ? '#e07020' : '#f8d030', x, y);
    }
  },

  [T.PATH](g, mask) {
    px(g, COL.path, 0, 0, 16, 16);
    const r = rng(5 + mask);
    for (let i = 0; i < 7; i++) px(g, i % 2 ? COL.pathD : COL.pathL, 1 + ((r() * 14) | 0), 1 + ((r() * 14) | 0));
    if (mask & 1) { px(g, COL.grass, 0, 0, 16, 1); px(g, COL.pathD, 0, 1, 16, 1); }
    if (mask & 2) { px(g, COL.grass, 15, 0, 1, 16); px(g, COL.pathD, 14, 0, 1, 16); }
    if (mask & 4) { px(g, COL.grass, 0, 15, 16, 1); px(g, COL.pathD, 0, 14, 16, 1); }
    if (mask & 8) { px(g, COL.grass, 0, 0, 1, 16); px(g, COL.pathD, 1, 0, 1, 16); }
  },

  [T.WATER](g, v) {
    const mask = v & 15, frame = v >> 4;
    px(g, COL.water, 0, 0, 16, 16);
    for (const [row, off] of [[4, 0], [10, 7]]) {
      const x0 = (frame * 2 + off) % 16;
      px(g, COL.waterL, x0, row, 4, 1);
      px(g, COL.waterL, (x0 + 8) % 16, row + 2, 3, 1);
    }
    if (mask & 1) { px(g, COL.foam, 0, 0, 16, 2); px(g, COL.waterD, 0, 2, 16, 1); }
    if (mask & 2) { px(g, COL.foam, 14, 0, 2, 16); px(g, COL.waterD, 13, 0, 1, 16); }
    if (mask & 4) { px(g, COL.foam, 0, 14, 16, 2); }
    if (mask & 8) { px(g, COL.foam, 0, 0, 2, 16); px(g, COL.waterD, 2, 0, 1, 16); }
  },

  [T.TREE](g) {
    paintGrass(g, 3);
    px(g, COL.trunk, 6, 12, 4, 4); px(g, COL.trunkD, 6, 15, 4, 1); px(g, COL.trunkD, 9, 12, 1, 3);
    blob(g, 8, 7, 8, 7.2, (d, dx, dy) => {
      if (d > 0.82) return COL.leafO;
      if (dx + dy < -0.75) return COL.leafL;
      if (dx + dy > 0.6) return COL.leafD;
      return COL.leaf;
    });
    for (const [x, y] of [[4, 4], [9, 3], [3, 8], [10, 7], [6, 10]]) { px(g, COL.leafL, x, y, 2, 1); px(g, COL.leafD, x, y + 1, 2, 1); }
  },

  [T.BUSH](g) {
    paintGrass(g, 2);
    px(g, 'rgba(0,0,0,0.18)', 3, 13, 10, 2);
    blob(g, 8, 8.5, 6.5, 6, (d, dx, dy) => {
      if (d > 0.78) return COL.bushO;
      if (dx + dy < -0.6) return COL.bushL;
      if (dx + dy > 0.6) return COL.bushD;
      return COL.bush;
    });
    for (const [x, y] of [[5, 6], [9, 5], [7, 9], [10, 9]]) px(g, COL.bushL, x, y);
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
    px(g, COL.path, 0, 0, 16, 16);
    px(g, COL.out, 0, 1, 16, 14);
    for (let x = 1; x < 16; x += 4) { px(g, COL.wood, x, 2, 3, 12); px(g, COL.woodL, x, 2, 1, 12); }
    px(g, COL.woodD, 0, 4, 16, 2); px(g, COL.woodD, 0, 10, 16, 2);
    px(g, '#5a5a6a', 2, 4, 2, 2); px(g, '#5a5a6a', 12, 10, 2, 2);
  },

  [T.BOULDER](g) {
    paintGrass(g, 3);
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
};

// --- Objekte ------------------------------------------------------------------

const ROOFS = {
  red: { c: '#c8483a', d: '#8e2e26', l: '#e8786a' },
  blue: { c: '#4a68c0', d: '#2e4488', l: '#7a98e0' },
  green: { c: '#3e9a6a', d: '#266a46', l: '#6ccc96' },
};

function drawHouse(g, o, cx, cy) {
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

function drawFountain(g, o, cx, cy, t) {
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

function drawStall(g, o, cx, cy) {
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

function drawLever(g, o, cx, cy) {
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

function drawSign(g, o, cx, cy) {
  const X = o.x * TILE - cx, Y = o.y * TILE - cy;
  px(g, 'rgba(0,0,0,0.2)', X + 4, Y + 14, 8, 2);
  px(g, COL.woodD, X + 7, Y + 8, 2, 8);
  px(g, COL.out, X + 1, Y + 1, 14, 9);
  px(g, COL.wood, X + 2, Y + 2, 12, 7);
  px(g, COL.woodL, X + 2, Y + 2, 12, 1);
  px(g, COL.woodD, X + 4, Y + 4, 8, 1);
  px(g, COL.woodD, X + 4, Y + 6, 6, 1);
}
