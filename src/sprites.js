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

// --- Gegenstände --------------------------------------------------------------

const ITEMS = {
  cloak: {
    rows: ['3.4o3.', '2.o4mo2.', '.o3mM2mo.', '.o2mM3mo.', 'o3mM4mo', 'o2mM5mo', 'o8mo', '.8o.'],
    w: 10, pal: { o: '#1a1020', m: '#7a4ac8', M: '#b090f0' },
  },
  chestnut: { rows: ['.2o.', 'obbo', 'obBo', '.2o.'], w: 4, pal: { o: '#2a1408', b: '#8a4a1a', B: '#c88040' } },
};

export function itemSprite(name) {
  const key = `item:${name}`;
  let c = cache.get(key);
  if (!c) { const it = ITEMS[name]; c = render(rows(it.rows, it.w), it.pal, false); cache.set(key, c); }
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
