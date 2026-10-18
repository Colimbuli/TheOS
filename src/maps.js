// Alle Karten: Dorf Lindental, Schule, Laden, Höhle im Buttenberg.

import {
  makeMap, T, TILE, rng, ROOFS,
  drawHouse, drawFountain, drawStall, drawLever, drawSign, drawHouseSign, drawTorch, drawStatue,
  drawBlackboard, drawDesk, drawShelf, drawCounter, drawBarrel, drawPlant, drawWindow,
} from './world.js';

function addObj(b, o, draw, sortY) {
  const self = { ...o, sortY: sortY ?? (o.y + (o.h || 1)) * TILE };
  self.draw = (g, cx, cy, t) => draw(g, self, cx, cy, t);
  return b.obj(self);
}

// --- Dorf ------------------------------------------------------------------------

export function createVillage() {
  const { map, b } = makeMap({ id: 'village', w: 32, h: 24, fill: T.GRASS, edge: T.TREE, theme: 'village' });
  map.northExitCols = [15, 16];

  const r = rng(42);
  for (let i = 0; i < 70; i++) b.set(2 + ((r() * 28) | 0), 2 + ((r() * 20) | 0), T.FLOWER);

  // Waldrand
  b.rect(0, 0, 32, 2, T.TREE); b.rect(0, 22, 32, 2, T.TREE);
  b.rect(0, 0, 2, 24, T.TREE); b.rect(30, 0, 2, 24, T.TREE);

  // Wege
  b.rect(15, 0, 2, 12, T.PATH);   // Nordstraße zum Tor
  b.rect(3, 12, 26, 2, T.PATH);   // Dorfstraße
  b.rect(13, 10, 6, 6, T.PATH);   // Dorfplatz
  b.rect(5, 8, 1, 4, T.PATH);     // zu Felix
  b.rect(10, 8, 1, 4, T.PATH);    // zu Theo
  b.rect(24, 8, 1, 4, T.PATH);    // zu Arne
  b.rect(6, 14, 2, 2, T.PATH);    // zum Garten
  b.rect(18, 14, 1, 7, T.PATH);   // zur Schulgasse
  b.rect(13, 20, 11, 1, T.PATH);  // Schulgasse
  b.rect(15, 1, 2, 1, T.GATE);    // Tor zum Buttenberg

  // Oma Hildes Garten – rundum Zaun, Arne gräbt unten durch
  b.rect(3, 16, 8, 1, T.FENCE); b.rect(3, 21, 8, 1, T.FENCE);
  b.rect(3, 16, 1, 6, T.FENCE); b.rect(10, 16, 1, 6, T.FENCE);
  b.rect(4, 17, 6, 4, T.GRASS);
  for (const [x, y] of [[4, 17], [5, 18], [9, 17], [4, 20], [8, 20], [8, 18]]) b.set(x, y, T.FLOWER);
  b.set(7, 16, T.DIGFENCE);
  b.say(7, 16, ['Der Zaun ist zu hoch zum Klettern. Aber die Erde darunter ist ganz locker...']);

  // Teich
  b.rect(26, 15, 3, 3, T.WATER);

  // Deko
  for (const [x, y] of [[27, 19], [25, 21], [2, 6]]) b.set(x, y, T.ROCK);
  for (const [x, y] of [[2, 2], [29, 2], [2, 10], [29, 14], [29, 21], [11, 21]]) b.set(x, y, T.TREE);
  for (const [x, y] of [[28, 5], [28, 6], [19, 4], [20, 4], [8, 10], [27, 13], [2, 15], [25, 17], [11, 17]]) b.set(x, y, T.BUSH);

  // Felsbrocken vor Arnes Tür
  b.set(23, 8, T.ROCK); b.set(25, 8, T.ROCK);
  b.under(24, 9, T.PATH);
  b.set(24, 9, T.BOULDER);

  // Grabstellen
  for (const [x, y] of [[27, 10], [12, 2], [26, 20]]) b.set(x, y, T.DIG);

  // Häuser
  const house = (x, y, w, h, doorDx, roof, lines) => {
    const o = addObj(b, { type: 'house', x, y, w, h, roof, door: { x: x + doorDx, y: y + h - 1 } }, drawHouse);
    b.solid(x, y, w, h);
    if (lines) b.say(o.door.x, o.door.y, lines);
    return o;
  };
  house(3, 4, 5, 4, 2, ROOFS.red, ['Felix\' Haus. Felix ist draußen.']);
  house(9, 5, 4, 3, 1, ROOFS.blue, ['Theos Zuhause. Hier wohnt er mit Mama und Friedrich.']);
  house(22, 4, 5, 4, 2, ROOFS.green, ['Arnes Haus.']);

  // Schule und Laden – die Tür ist ein Durchgang
  const school = house(12, 16, 5, 4, 2, ROOFS.orange);
  const shop = house(19, 16, 5, 4, 2, ROOFS.purple);
  for (const [h, to] of [[school, 'school'], [shop, 'shop']]) {
    b.free(h.door.x, h.door.y);
    map.warps.push({ x: h.door.x, y: h.door.y, to, tx: 7 * TILE, ty: 7 * TILE, dir: 1 });
  }
  addObj(b, { type: 'hsign', x: 15, y: 18, icon: 'book' }, drawHouseSign, 21 * TILE);
  addObj(b, { type: 'hsign', x: 22, y: 18, icon: 'diamond' }, drawHouseSign, 21 * TILE);

  // Brunnen
  addObj(b, { type: 'fountain', x: 15, y: 12 }, drawFountain, 14 * TILE);
  b.solid(15, 12, 2, 2);
  for (const [x, y] of [[15, 12], [16, 12], [15, 13], [16, 13]]) b.say(x, y, ['Ein alter Brunnen. Das Wasser glitzert in der Sonne.']);

  // Marktstand
  addObj(b, { type: 'stall', x: 20, y: 10 }, drawStall, 11 * TILE);
  b.solid(20, 10, 2, 1);
  b.counter(20, 10); b.counter(21, 10);

  // Wegweiser
  addObj(b, { type: 'sign', x: 17, y: 3 }, drawSign, 4 * TILE);
  b.solid(17, 3);
  b.say(17, 3, ['NORDEN: Der Buttenberg', 'Achtung, Drache! Zutritt nur mit Erlaubnis der Torwache!']);

  // Torhebel
  map.lever = addObj(b, { type: 'lever', x: 18, y: 2, pulled: false }, drawLever, 3 * TILE);
  b.solid(18, 2);

  map.gateOpen = false;
  map.openGate = () => { map.gateOpen = true; map.northExit = true; map.lever.pulled = true; b.rect(15, 1, 2, 1, T.PATH); };
  map.isLever = (tx, ty) => tx === 18 && ty === 2;
  return map;
}

// --- Innenräume (15x10 = genau ein Bildschirm) ------------------------------------

function interior(id, doorX) {
  const { map, b } = makeMap({ id, w: 15, h: 10, fill: T.WOOD, edge: T.IWALL, theme: 'inside' });
  b.rect(0, 0, 15, 2, T.IWALL);
  b.rect(0, 0, 1, 10, T.IWALL); b.rect(14, 0, 1, 10, T.IWALL);
  b.rect(0, 9, 15, 1, T.IWALL);
  b.set(7, 9, T.EXIT);
  map.warps.push({ x: 7, y: 9, to: 'village', tx: doorX * TILE, ty: 20 * TILE, dir: 0 });
  return { map, b };
}

export function createSchool() {
  const { map, b } = interior('school', 14);
  addObj(b, { type: 'board', x: 4, y: 0, w: 4 }, drawBlackboard, 0);
  addObj(b, { type: 'shelf', x: 1, y: 1, w: 2 }, drawShelf, 0);
  addObj(b, { type: 'window', x: 10, y: 0 }, drawWindow, 0);
  addObj(b, { type: 'window', x: 12, y: 0 }, drawWindow, 0);
  // Lehrerpult (man redet darüber hinweg)
  addObj(b, { type: 'desk', x: 5, y: 3, w: 3, book: true }, drawDesk);
  b.solid(5, 3, 3, 1);
  for (let x = 5; x < 8; x++) b.counter(x, 3);
  // Schülertische
  for (const [x, y] of [[2, 5], [4, 5], [10, 5], [12, 5], [2, 7], [4, 7], [10, 7], [12, 7]]) {
    addObj(b, { type: 'desk', x, y, w: 1, book: (x + y) % 3 === 0 }, drawDesk);
    b.solid(x, y);
  }
  addObj(b, { type: 'plant', x: 13, y: 2 }, drawPlant); b.solid(13, 2);
  b.rect(6, 5, 3, 3, T.RUG);
  map.npcs.push({ id: 'teacher', pal: 'teacher', x: 6 * TILE, y: 2 * TILE - 4, dir: 0, anim: 0, moving: false });
  return map;
}

export function createShop() {
  const { map, b } = interior('shop', 21);
  addObj(b, { type: 'shelf', x: 1, y: 0, w: 5, goods: true }, drawShelf, 0);
  addObj(b, { type: 'shelf', x: 9, y: 0, w: 5, goods: true }, drawShelf, 0);
  addObj(b, { type: 'window', x: 7, y: 0 }, drawWindow, 0);
  addObj(b, { type: 'counter', x: 4, y: 4, w: 7, wares: true }, drawCounter);
  b.solid(4, 4, 7, 1);
  for (let x = 4; x < 11; x++) b.counter(x, 4);
  for (const [x, y] of [[1, 2], [13, 2], [1, 7], [13, 7]]) { addObj(b, { type: 'barrel', x, y }, drawBarrel); b.solid(x, y); }
  addObj(b, { type: 'plant', x: 2, y: 2 }, drawPlant); b.solid(2, 2);
  b.rect(6, 6, 3, 2, T.RUG);
  map.npcs.push({ id: 'bruno', pal: 'bruno', x: 7 * TILE, y: 3 * TILE - 4, dir: 0, anim: 0, moving: false });
  return map;
}

// --- Höhle im Buttenberg ------------------------------------------------------------
//
// Weg: Eingang (unten) → Erdwand (Arne) → Schleimhalle → Felsblock (Felix) → Schlüsselraum mit Kobolden
//      → Schlosstür → Drachenstatue (Theo wirft Feuer zurück) → Trollgang (Friedrich unsichtbar)
//      → Hebel → Gittertor → Treppe hinab.   Geheimraum: Erdwand westlich vom Eingang.

export const CAVE_SPAWN = { x: 15 * TILE + 8, y: 20 * TILE, dir: 1 };

export function createCave() {
  const { map, b } = makeMap({ id: 'cave', w: 32, h: 24, fill: T.CWALL, edge: T.CWALL, theme: 'cave' });
  const carve = (x, y, w, h) => b.rect(x, y, w, h, T.CFLOOR);

  carve(12, 18, 8, 4);                          // Eingangshalle
  b.set(15, 22, T.UP); b.set(16, 22, T.UP);     // Treppe hinauf ins Dorf
  carve(15, 13, 2, 4);                          // Gang nach Norden
  b.set(15, 17, T.EWALL); b.set(16, 17, T.EWALL); // Erdwand (Arne)
  carve(9, 8, 14, 6);                           // Schleimhalle
  b.rect(10, 8, 2, 2, T.WATER);                 // Höhlensee
  b.set(23, 11, T.CFLOOR);                      // Durchgang nach Osten
  carve(24, 8, 6, 7);                           // Schlüsselraum
  b.under(24, 11, T.CFLOOR); b.set(24, 11, T.BOULDER);
  b.set(15, 7, T.LOCKED);                       // Schlosstür
  carve(15, 2, 1, 5);                           // Statuengang
  carve(4, 1, 11, 2);                           // Trollgang (2 breit)
  carve(1, 1, 3, 8);                            // Hebelraum
  b.set(2, 9, T.BARS);                          // Gittertor
  carve(1, 10, 5, 4);                           // Treppenraum
  b.set(3, 12, T.DOWN);
  b.set(11, 19, T.EWALL);                       // geheime Erdwand
  carve(5, 17, 6, 4);                           // Geheimraum

  for (const [x, y] of [[22, 13], [12, 13], [29, 8], [1, 13], [5, 19], [9, 20], [3, 7]]) b.set(x, y, T.MUSH);

  // Fackeln an Wänden (nur Deko)
  for (const [x, y] of [[13, 17], [18, 17], [12, 7], [20, 7], [26, 7], [2, 0], [8, 0], [3, 9], [7, 16]]) {
    addObj(b, { type: 'torch', x, y }, drawTorch, 0);
  }

  // Drachenstatue blockiert den Statuengang oben
  map.statue = addObj(b, { type: 'statue', x: 15, y: 2, alive: true }, drawStatue);
  b.solid(15, 2);
  map.killStatue = () => { map.statue.alive = false; map.block[2][15] = false; };

  // Hebel im Hebelraum
  map.lever = addObj(b, { type: 'lever', x: 1, y: 4, pulled: false }, drawLever);
  b.solid(1, 4);
  map.isLever = (tx, ty) => tx === 1 && ty === 4;

  // Troll
  map.npcs.push({ id: 'troll', pal: 'troll', x: 9 * TILE, y: 1 * TILE - 2, dir: 3, anim: 0, moving: false, big: true });

  // Gegenstände
  const item = (type, x, y, id) => map.items.push({ id, type, x: x * TILE + 2, y: y * TILE + 2, taken: false });
  item('key', 28, 9, 'key');
  item('bag', 21, 9, 'bag1'); item('bag', 25, 13, 'bag2');
  item('apple', 13, 12, 'apple1'); item('apple', 28, 14, 'apple2'); item('apple', 2, 11, 'apple3');
  item('crystal', 29, 11, 'c1'); item('crystal', 2, 2, 'c2');
  item('crystal', 6, 18, 'c3'); item('crystal', 8, 17, 'c4'); item('crystal', 9, 19, 'c5');
  map.totalCrystals = 5;

  // Gegner
  map.enemySpawns = [
    { type: 'slime', x: 13, y: 9 }, { type: 'slime', x: 19, y: 9 }, { type: 'slime', x: 20, y: 12 }, { type: 'slime', x: 11, y: 11 },
    { type: 'kobold', x: 27, y: 13 }, { type: 'kobold', x: 28, y: 10 },
  ];

  // Hinweise beim ersten Betreten (Tile-Rechtecke)
  map.hints = [
    [12, 18, 19, 21, 'Die Höhle im Buttenberg! Eine Erdwand versperrt den Weg – ein Fall für Arne.'],
    [9, 8, 22, 13, 'Schleime! Sie hüpfen auf euch zu. Felix\' Schleuder oder Arnes Schaufel helfen.'],
    [20, 10, 22, 12, 'Ein Felsblock im Durchgang. Felix kann ihn wegschieben.'],
    [24, 8, 29, 14, 'Feuer-Kobolde! Theos Schild wirft ihre Feuerbälle zurück.'],
    [15, 3, 15, 6, 'Eine Drachenstatue spuckt Feuer! Halte Theos Schild hoch und wirf das Feuer zurück!'],
    [11, 1, 14, 2, 'Ein Höhlentroll! Wer sichtbar ist, kommt hier nicht vorbei...'],
    [1, 1, 3, 8, 'Ein Hebel! Drück A, um ihn umzulegen.'],
    [1, 10, 5, 13, 'Eine Treppe führt tiefer in den Berg hinein...'],
    [5, 17, 10, 20, 'Ein Geheimraum! Arne hat ein gutes Gespür.'],
  ];

  // Rastplätze: Wer erschöpft ist, startet hier neu
  map.checkpoints = [
    [12, 18, 19, 21, 15 * TILE + 8, 20 * TILE, 1],
    [9, 8, 22, 16, 15 * TILE + 8, 14 * TILE, 1],
    [24, 8, 29, 14, 24 * TILE, 12 * TILE, 3],
    [15, 1, 15, 6, 15 * TILE, 6 * TILE, 1],
    [1, 1, 14, 8, 13 * TILE, 2 * TILE, 2],
    [1, 10, 5, 13, 2 * TILE, 11 * TILE, 0],
  ];
  return map;
}
