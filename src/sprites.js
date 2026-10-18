// Eigene Pixel-Sprites im GBA-Stil. Zeilen sind lauflängenkodiert:
// "3.o2po" = "...o" + "pp" + "o". Zeichen werden über eine Palette eingefärbt, '.' ist transparent.

function rle(s) {
  let out = '', n = '';
  for (const ch of s) {
    if (ch >= '0' && ch <= '9') { n += ch; continue; }
    out += ch.repeat(n ? parseInt(n, 10) : 1);
    n = '';
  }
  return out;
}

function rows(list, width) {
  return list.map((r) => {
    const s = rle(r);
    if (s.length !== width) console.warn('Sprite-Zeile hat falsche Breite:', r, s.length);
    return s.padEnd(width, '.').slice(0, width);
  });
}

// --- Figuren-Bausteine (16 breit) ---------------------------------------------

const HEADS = {
  normal: {
    down: ['5.6o5.', '4.o6ho4.', '3.o8ho3.', '2.o10ho2.', '2.oh8sho2.', '2.o2se4se2so2.', '2.o10so2.', '3.2o6s2o3.'],
    up: ['5.6o5.', '4.o6ho4.', '3.o8ho3.', '2.o10ho2.', '2.o10ho2.', '2.o10ho2.', '2.o10ho2.', '3.2o6h2o3.'],
    side: ['6.5o5.', '5.o5ho4.', '4.o7ho3.', '3.o9ho2.', '3.o4h5so2.', '3.o3h4seso2.', '3.o2h7so2.', '4.2o4s2o4.'],
  },
  // Locken: buschiger Umriss, zweifarbiges Haar (h/H)
  curly: {
    down: ['2.2o.2o2.2o.2o2.', '.oHhHhHhHhHhHho.', 'ohHhHhHhHhHhHhHo', 'oHhHhHhHhHhHhHho', 'oHho8soHho', '.2o2se4se2s2o.', '2.o10so2.', '3.2o6s2o3.'],
    up: ['2.2o.2o2.2o.2o2.', '.oHhHhHhHhHhHho.', 'ohHhHhHhHhHhHhHo', 'oHhHhHhHhHhHhHho', 'ohHhHhHhHhHhHhHo', '.oHhHhHhHhHhHho.', '2.o10ho2.', '3.2o6h2o3.'],
    side: ['4.2o.2o.2o4.', '3.oHhHhHhHhHo2.', '2.oHhHhHhHhHhHo.', '2.oHhHh6so2.', '3.oHh7so2.', '3.oHho4seso2.', '3.o2h7so2.', '4.2o4s2o4.'],
  },
};

const BODIES = {
  normal: {
    front: ['2.o10co2.', '.o12co.', '.o5c2k5co.', '.os10Cso.', '2.o10Co2.'],
    back: ['2.o10co2.', '.o12co.', '.o5c2k5co.', '.os10Cso.', '2.o10Co2.'],
    side: ['3.o8co3.', '3.o8co3.', '3.o3c2k3co3.', '3.o3c2s3co3.', '3.o8Co3.'],
  },
  // Sakko: Jacke j/J, weißes Hemd c, Krawatte K
  jacket: {
    front: ['2.o4j2c4jo2.', '.o5j2c5jo.', '.o5j2K5jo.', '.os4j2c4jso.', '2.o10Jo2.'],
    back: ['2.o10jo2.', '.o12jo.', '.o12jo.', '.os10jso.', '2.o10Jo2.'],
    side: ['3.o8jo3.', '3.o5j3co3.', '3.o5j2cKo3.', '3.o3j2s3jo3.', '3.o8Jo3.'],
  },
};

const LEGS = {
  front: [
    ['3.o2po2.o2po3.', '3.o2po2.o2po3.', '3.4o2.4o3.'],
    ['3.o2po2.o2po3.', '3.4o2.o2po3.', '9.4o3.'],
    ['3.o2po2.o2po3.', '3.o2po2.4o3.', '3.4o9.'],
  ],
  side: [
    ['4.o2po2po5.', '4.o2po2po5.', '4.7o5.'],
    ['3.o2po.o2po4.', '2.o2po3.o2po3.', '2.3o5.3o3.'],
    ['3.o2po.o2po4.', '2.o2po3.o2po3.', '2.3o5.3o3.'],
  ],
};

const SKIN = '#f8c8a0', OUT = '#1a1020', EYE = '#2a1a10';

export const PALETTES = {
  theo:      { o: OUT, s: SKIN, e: EYE, h: '#6b3a1e', c: '#3a7bd5', C: '#2a5aa5', k: '#8b5a2b', p: '#4a3a2a' },
  felix:     { o: OUT, s: '#f0c098', e: EYE, h: '#c08a3a', c: '#d84848', C: '#a02e2e', k: '#3a3030', p: '#3a4a7a' },
  arne:      { o: OUT, s: SKIN, e: EYE, h: '#5a3418', H: '#8a5428', j: '#3a4a6a', J: '#283450', c: '#f4f4f4', K: '#c83040', p: '#2e2e3a' },
  friedrich: { o: OUT, s: '#fcd4b0', e: EYE, h: '#f4d860', c: '#f0a030', C: '#c07818', k: '#6a4a2a', p: '#3a6ab0' },
  mama:      { o: OUT, s: SKIN, e: EYE, h: '#4a2a1a', c: '#3aa8a0', C: '#2a7a74', k: '#e8d070', p: '#2a7a74' },
  merchant:  { o: OUT, s: SKIN, e: EYE, h: '#d86a2a', c: '#e0b030', C: '#b08020', k: '#7a4a20', p: '#5a4a3a' },
  guard:     { o: OUT, s: '#e8b890', e: EYE, h: '#a0a8b8', c: '#b03a3a', C: '#802a2a', k: '#3a3a3a', p: '#4a4a5a' },
  teacher:   { o: OUT, s: SKIN, e: EYE, h: '#8a8a94', c: '#4a9a5a', C: '#2e6a3c', k: '#e8e0c0', p: '#2e6a3c' },
  bruno:     { o: OUT, s: '#e8b890', e: EYE, h: '#3a2414', c: '#e8e0d0', C: '#b8a890', k: '#6a3a1a', p: '#4a3a2a' },
};

// Körperbau je Figur: Friedrich klein, Felix groß, Arne mit Locken und Sakko
const STYLE = {
  felix: { tall: true },
  arne: { head: 'curly', body: 'jacket' },
  friedrich: { small: true },
};

const cache = new Map();

function render(map, pal, flip) {
  const h = map.length, w = map[0].length;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = map[y][flip ? w - 1 - x : x];
      if (ch === '.' || !pal[ch]) continue;
      g.fillStyle = pal[ch];
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

// dir: 0 runter, 1 hoch, 2 links, 3 rechts · frame: 0 stehen, 1/2 Schritt.
// Liefert ein Canvas, dessen Unterkante auf den Füßen liegt (Höhe 14–18 px).
export function charSprite(palName, dir, frame) {
  const key = `${palName}:${dir}:${frame}`;
  let c = cache.get(key);
  if (c) return c;
  const st = STYLE[palName] || {};
  const side = dir >= 2;
  const heads = HEADS[st.head || 'normal'];
  const bodies = BODIES[st.body || 'normal'];
  const head = [...(side ? heads.side : dir === 1 ? heads.up : heads.down)];
  const body = [...(side ? bodies.side : dir === 1 ? bodies.back : bodies.front)];
  const legs = [...(side ? LEGS.side : LEGS.front)[frame]];
  if (st.small) { head.splice(2, 1); body.splice(1, 1); }      // 14 px hoch
  if (st.tall) { body.splice(1, 0, body[1]); legs.unshift(legs[0]); } // 18 px hoch
  c = render(rows([...head, ...body, ...legs], 16), PALETTES[palName], dir === 2);
  cache.set(key, c);
  return c;
}

// --- Herzen (7x6) -------------------------------------------------------------

const HEART = ['.2o.2o.', 'owro2ro', 'o5ro', '.o3ro.', '2.oro2.', '3.o3.'];

export function heartSprite(full) {
  const key = `heart:${full}`;
  let c = cache.get(key);
  if (!c) {
    const pal = full ? { o: '#2a0a10', r: '#e83848', w: '#ffd0d8' } : { o: '#2a0a10', r: '#4a3038', w: '#5a4048' };
    c = render(rows(HEART, 7), pal, false);
    cache.set(key, c);
  }
  return c;
}

// --- Prozedurale Sprites: Gegner, Troll, Gegenstände -------------------------------

function canvasSprite(key, w, h, paint) {
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const px = (col, x, y, ww = 1, hh = 1) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
  const ell = (cx, cy, rx, ry, fn) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = dx * dx + dy * dy;
      if (d <= 1) { const col = typeof fn === 'function' ? fn(dx, dy, d) : fn; if (col) px(col, x, y); }
    }
  };
  paint(px, ell);
  cache.set(key, c);
  return c;
}

export function slimeSprite(frame) {
  return canvasSprite(`slime${frame}`, 16, 16, (px, ell) => {
    const sq = frame ? 1 : 0;
    ell(8, 11 + sq * 0.5, 7 + sq, 5 - sq, (dx, dy, d) => d > 0.8 ? '#14501e' : (dx < -0.2 && dy < -0.3) ? '#9af0a0' : dy > 0.4 ? '#2a8a3a' : '#46c05a');
    px('#ffffff', 5, 9 + sq, 2, 2); px('#ffffff', 9, 9 + sq, 2, 2);
    px('#1a1a1a', 6, 10 + sq); px('#1a1a1a', 10, 10 + sq);
    px('#14501e', 7, 13, 2, 1);
  });
}

export function koboldSprite(flip, frame) {
  return canvasSprite(`kobold${flip}${frame}`, 16, 16, (px, ell) => {
    const f = (x) => (flip ? 15 - x : x);
    const P = (c, x, y, w = 1, h = 1) => { for (let i = 0; i < w; i++) px(c, f(x + i), y, 1, h); };
    P('#3a2a1a', 5, 13, 2, 3); P('#3a2a1a', 9, 13, 2, 3);
    if (frame) { P('#3a2a1a', 5, 14, 2, 2); P('#3a2a1a', 10, 12, 2, 3); }
    P('#1a1020', 4, 8, 8, 6); P('#8a5a32', 5, 9, 6, 4); P('#a8784a', 5, 9, 2, 4);
    P('#1a1020', 3, 2, 10, 7); P('#8ab04a', 4, 3, 8, 5); P('#b0d070', 4, 3, 3, 2);
    P('#8ab04a', 1, 4, 2, 2); P('#8ab04a', 13, 4, 2, 2);
    P('#fff060', 5, 5, 2, 1); P('#fff060', 9, 5, 2, 1); P('#1a1a1a', 6, 5); P('#1a1a1a', 10, 5);
    P('#3a4a1a', 6, 7, 4, 1);
    P('#d83838', 4, 1, 8, 2); P('#d83838', 6, 0, 4, 1); P('#ffffff', 10, 0, 1, 1);
    P('#7a9a3a', 12, 9, 2, 2);
  });
}

export function trollSprite(frame) {
  return canvasSprite(`troll${frame}`, 24, 26, (px, ell) => {
    px('rgba(0,0,0,0.3)', 3, 23, 18, 3);
    px('#3a4250', 5, 18, 5, 7); px('#3a4250', 14, 18, 5, 7);
    ell(12, 15, 11, 8, (dx, dy, d) => d > 0.85 ? '#2a3240' : dx < -0.4 ? '#9aaac0' : dy > 0.4 ? '#5a6a80' : '#7a8aa0');
    px('#6a4a2a', 4, 18, 16, 3); px('#e0c060', 11, 18, 2, 3);
    ell(12, 7, 7, 6, (dx, dy, d) => d > 0.82 ? '#2a3240' : (dx < -0.3 && dy < 0) ? '#aabace' : '#8090a8');
    px('#3a3020', 9, 1, 6, 2);
    const eye = frame ? '#ff5a3a' : '#ffffff';
    px(eye, 8, 6, 3, 2); px(eye, 13, 6, 3, 2); px('#1a1a1a', 9, 7); px('#1a1a1a', 14, 7);
    px('#3a3a4a', 9, 10, 6, 1); px('#f0f0e0', 9, 9, 1, 2); px('#f0f0e0', 14, 9, 1, 2);
    px('#7a8aa0', 0, 12, 3, 9); px('#7a8aa0', 21, 12, 3, 9);
  });
}

const ITEM_PAINT = {
  crystal: (px) => {
    px('rgba(0,0,0,0.25)', 2, 11, 8, 2);
    for (let y = 0; y < 11; y++) {
      const w = y < 4 ? y + 1 : Math.max(1, Math.round((11 - y) * 0.6));
      for (let x = -w; x <= w; x++) px(x < 0 ? (y < 4 ? '#c8ffff' : '#58d8f0') : (y < 4 ? '#88f0ff' : '#2a9ac8'), 6 + x, y);
    }
    px('#ffffff', 5, 2); px('#ffffff', 4, 3);
  },
  apple: (px, ell) => {
    ell(6, 7, 5, 4.5, (dx, dy) => (dx < -0.3 && dy < -0.2 ? '#ff9a9a' : dy > 0.5 ? '#9a1818' : '#d82a2a'));
    px('#5a3a1a', 6, 1, 1, 3); px('#3aa040', 7, 1, 3, 2);
  },
  bag: (px, ell) => {
    ell(6, 8, 5, 4, (dx) => (dx < -0.3 ? '#c8a070' : '#9a7448'));
    px('#5a3a1a', 3, 4, 6, 1);
    for (const x of [3, 6, 9]) { px('#7a3a12', x - 1, 1, 2, 2); }
  },
  key: (px, ell) => {
    ell(3.5, 6, 3, 3, '#f0c838'); px('#3a2a10', 3, 5, 1, 2);
    px('#f0c838', 6, 5, 6, 2); px('#fff0a0', 6, 5, 6, 1);
    px('#f0c838', 9, 7, 1, 2); px('#f0c838', 11, 7, 1, 2);
  },
  cloak: (px) => {
    const rows = ['...oooo...', '..ommmmo..', '.ommmMmmo.', '.ommMmmmo.', 'ommmMmmmmo', 'ommMmmmmmo', 'ommmmmmmmo', '.oooooooo.'];
    const pal = { o: '#1a1020', m: '#7a4ac8', M: '#b090f0' };
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) px(pal[ch], x + 1, y + 2); }));
  },
  chestnut: (px) => { px('#2a1408', 0, 0, 4, 4); px('#8a4a1a', 1, 0, 2, 4); px('#8a4a1a', 0, 1, 4, 2); px('#c88040', 1, 1, 1, 1); },
};

export function itemSprite(type) {
  const size = type === 'chestnut' ? 4 : 12;
  return canvasSprite(`it:${type}`, size, size, ITEM_PAINT[type]);
}

export function fireSprite(frame, reflected) {
  return canvasSprite(`fire${frame}${reflected}`, 8, 8, (px, ell) => {
    const [a, b, c] = reflected ? ['#ffffff', '#a8e8ff', '#3a8af0'] : ['#fff6b0', '#ffb040', '#e85020'];
    ell(4, 4, 4 - frame * 0.5, 4 - frame * 0.5, (dx, dy, d) => (d < 0.25 ? a : d < 0.6 ? b : c));
  });
}
