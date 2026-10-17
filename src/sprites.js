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

// --- Figuren (16x16) --------------------------------------------------------

const BODY_FRONT = ['2.o10co2.', '.o12co.', '.o5c2k5co.', '.os10Cso.', '2.o10Co2.'];
const BODY_SIDE = ['3.o8co3.', '3.o8co3.', '3.o3c2k3co3.', '3.o3c2s3co3.', '3.o8Co3.'];

const HEAD = {
  down: ['5.6o5.', '4.o6ho4.', '3.o8ho3.', '2.o10ho2.', '2.oh8sho2.', '2.o2se4se2so2.', '2.o10so2.', '3.2o6s2o3.'],
  up: ['5.6o5.', '4.o6ho4.', '3.o8ho3.', '2.o10ho2.', '2.o10ho2.', '2.o10ho2.', '2.o10ho2.', '3.2o6h2o3.'],
  side: ['6.5o5.', '5.o5ho4.', '4.o7ho3.', '3.o9ho2.', '3.o4h5so2.', '3.o3h4seso2.', '3.o2h7so2.', '4.2o4s2o4.'],
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

export const PALETTES = {
  hero:     { o: '#1a1020', h: '#6b3a1e', s: '#f8c8a0', e: '#2a1a10', c: '#3a7bd5', C: '#2a5aa5', k: '#8b5a2b', p: '#4a3a2a' },
  elder:    { o: '#1a1020', h: '#e8e8f0', s: '#f0c098', e: '#2a1a10', c: '#9a5ab8', C: '#6a3a88', k: '#e0c060', p: '#6a3a88' },
  merchant: { o: '#1a1020', h: '#d86a2a', s: '#f8c8a0', e: '#2a1a10', c: '#e0b030', C: '#b08020', k: '#7a4a20', p: '#5a4a3a' },
  kid:      { o: '#1a1020', h: '#f0d060', s: '#f8d0a8', e: '#2a1a10', c: '#e05050', C: '#a83030', k: '#4a3a2a', p: '#3050a0' },
  guard:    { o: '#1a1020', h: '#a0a8b8', s: '#e8b890', e: '#2a1a10', c: '#b03a3a', C: '#802a2a', k: '#3a3a3a', p: '#4a4a5a' },
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

// dir: 0 runter, 1 hoch, 2 links, 3 rechts · frame: 0 stehen, 1/2 Schritt
export function charSprite(palName, dir, frame) {
  const key = `${palName}:${dir}:${frame}`;
  let c = cache.get(key);
  if (c) return c;
  const side = dir >= 2;
  const head = side ? HEAD.side : dir === 1 ? HEAD.up : HEAD.down;
  const body = side ? BODY_SIDE : BODY_FRONT;
  const legs = (side ? LEGS.side : LEGS.front)[frame];
  c = render(rows([...head, ...body, ...legs], 16), PALETTES[palName], dir === 2);
  cache.set(key, c);
  return c;
}

// --- Katze Flocke (16x10, schaut nach links) --------------------------------

const CAT = ['2.o3.o9.', '.owo.owo8.', '.o6wo6.o', '.owe2wewo5.ow', '.o2wp3wo4.ow.',
  '2.o4w7ow.', '2.o2w2g3wg3wo.', '2.o11wo.', '2.owo.owo2.owo2.', '2.2o2.2o3.2o3.'];
const CAT_PAL = { o: '#3a2a2a', w: '#f4f0e8', g: '#c8b8a8', e: '#202020', p: '#f090a0' };

export function catSprite(facingRight) {
  const key = `cat:${facingRight}`;
  let c = cache.get(key);
  if (!c) { c = render(rows(CAT, 16), CAT_PAL, facingRight); cache.set(key, c); }
  return c;
}

// --- Herzen (7x6) -----------------------------------------------------------

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
