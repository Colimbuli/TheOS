// Alle Karten: Dorf Lindental, Schule, Laden, Höhle im Buttenberg.

import {
  makeMap, T, TILE, rng, ROOFS,
  drawHouse, drawFountain, drawStall, drawLever, drawSign, drawHouseSign, drawTorch, drawStatue,
  drawBlackboard, drawDesk, drawShelf, drawCounter, drawBarrel, drawPlant, drawWindow,
  drawPumpkin, drawGrave, drawCandle, drawWallBat, drawWallSpider, drawCauldron, drawDeadTree,
  drawChest, drawSearchlight, drawSpitter, drawBrazier,
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

// --- Kapitel 3: Das Spukhaus am Buttenberg ---------------------------------------
//
// Garten (unten) mit Hexe Kunigunde → Gartentor (Division) → Haustür (Gespenst Bodo, Halloween-Englisch)
// → Halle (Zähl-Rätsel von Zora) → Bibliothek (Truhe: Felix, Prof. Plumps: Lehrbuch-Englisch)
// → Kerzenraum (Binärcode mit Kerzen) → Thronsaal (Graf Kürbis: Mondschlüssel) → Turm mit Treppe.

export const HAUNT_SPAWN = { x: 15 * TILE + 8, y: 19 * TILE, dir: 1 };
export const CANDLE_VALUES = [16, 8, 4, 2, 1];

export function createHaunted() {
  const { map, b } = makeMap({ id: 'haunted', w: 32, h: 24, fill: T.GRASS, edge: T.TREE, theme: 'haunted' });
  const r = rng(7);
  for (let i = 0; i < 25; i++) b.set(2 + ((r() * 28) | 0), 15 + ((r() * 7) | 0), T.FLOWER);
  b.rect(0, 0, 32, 1, T.TREE); b.rect(0, 22, 32, 2, T.TREE);
  b.rect(0, 0, 2, 24, T.TREE); b.rect(30, 0, 2, 24, T.TREE);

  // Haus: Mauern, dann Räume ausschneiden
  b.rect(4, 1, 24, 12, T.IWALL);
  const room = (x, y, w, h) => b.rect(x, y, w, h, T.WOOD);
  room(5, 2, 6, 4);    // Kerzenraum
  room(12, 2, 8, 4);   // Thronsaal
  room(21, 2, 6, 10);  // Turm
  room(5, 7, 6, 5);    // Bibliothek
  room(12, 7, 8, 5);   // Halle
  b.rect(14, 3, 4, 3, T.RUG);

  // Garten
  b.rect(2, 14, 28, 1, T.FENCE);
  b.rect(15, 13, 1, 1, T.PATH);
  b.rect(15, 15, 2, 6, T.PATH);
  b.set(15, 21, T.UP); b.set(16, 21, T.UP);
  for (const [x, y] of [[5, 20], [26, 21]]) b.set(x, y, T.DIG);

  // Rätseltüren
  map.riddles = {
    gate: { x: 15, y: 14, open: T.PATH, need: 2, speaker: 'Hexe Kunigunde', kind: 'division' },
    front: { x: 15, y: 12, open: T.WOOD, need: 2, speaker: 'Gespenst Bodo', kind: 'halloween' },
    count: { x: 11, y: 9, open: T.WOOD, need: 2, speaker: 'Gespenst Zora', kind: 'count' },
    lib: { x: 7, y: 6, open: T.WOOD, need: 3, speaker: 'Professor Plumps', kind: 'book' },
    candles: { x: 11, y: 4, open: T.WOOD, kind: 'candles' },
  };
  b.set(15, 14, T.RGATE);
  for (const k of ['front', 'count', 'lib', 'candles']) b.set(map.riddles[k].x, map.riddles[k].y, T.RDOOR);
  b.set(20, 3, T.LOCKED);   // Turmtür – Mondschlüssel
  b.set(24, 10, T.DOWN);    // Treppe zur Drachenhöhle
  map.riddleAt = (tx, ty) => Object.entries(map.riddles).find(([, d]) => d.x === tx && d.y === ty) || null;

  // Truhe vor der Bibliothekstür (Felix)
  b.under(7, 7, T.WOOD); b.set(7, 7, T.BOULDER);

  // Gartendeko
  const solidObj = (o, draw) => { addObj(b, o, draw); b.solid(o.x, o.y); };
  for (const [x, y] of [[4, 17], [6, 19], [9, 16], [22, 17], [25, 19], [27, 16], [11, 20]]) solidObj({ type: 'grave', x, y }, drawGrave);
  for (const [x, y, lit] of [[12, 18, true], [19, 18, true], [20, 16, false], [8, 21, true], [13, 13, true], [18, 13, true], [24, 13, false], [7, 13, true]]) {
    solidObj({ type: 'pumpkin', x, y, lit, glow: lit }, drawPumpkin);
  }
  for (const [x, y] of [[3, 15], [28, 20], [21, 20]]) solidObj({ type: 'deadtree', x, y }, drawDeadTree);
  solidObj({ type: 'cauldron', x: 12, y: 16, glow: true }, drawCauldron);

  // Halle: hier wird gezählt!
  const hall = { pumpkin: 0, candle: 0, bat: 0, spider: 0 };
  for (const [x, y] of [[13, 7], [18, 7], [19, 10]]) { solidObj({ type: 'pumpkin', x, y, lit: true, glow: true }, drawPumpkin); hall.pumpkin++; }
  for (const [x, y] of [[12, 7], [19, 7], [12, 11], [14, 11]]) { solidObj({ type: 'candle', x, y, lit: true, glow: true }, drawCandle); hall.candle++; }
  // Fledermäuse und Spinne mitten in der Halle, damit man sie gut zählen kann
  for (const [x, y] of [[14, 8], [17, 9]]) { addObj(b, { type: 'wallbat', x, y }, drawWallBat, 99 * TILE); hall.bat++; }
  addObj(b, { type: 'wallspider', x: 18, y: 11 }, drawWallSpider, 99 * TILE); hall.spider++;
  map.hallCounts = hall;
  map.padTop = 48; // Kamera darf über den oberen Rand in den Nachthimmel – sonst verdeckt das HUD die oberen Räume

  // Bibliothek
  addObj(b, { type: 'shelf', x: 5, y: 6, w: 2 }, drawShelf, 0);
  addObj(b, { type: 'shelf', x: 8, y: 6, w: 3 }, drawShelf, 0);
  for (const [x, y] of [[5, 10], [10, 8]]) { addObj(b, { type: 'desk', x, y, w: 1, book: true }, drawDesk); b.solid(x, y); }

  // Kerzenraum: 5 schaltbare Kerzen (16 8 4 2 1)
  map.candles = CANDLE_VALUES.map((v, i) => addObj(b, { type: 'candle', x: 6 + i, y: 2, lit: false, glow: false, value: v }, drawCandle));
  for (const c of map.candles) b.solid(c.x, c.y);
  map.labels = CANDLE_VALUES.map((v, i) => ({ x: (6 + i) * TILE + 8, y: 1 * TILE + 5, text: String(v) }));

  // Thronsaal & Turm
  for (const [x, y] of [[12, 2], [19, 2], [21, 2], [26, 2]]) solidObj({ type: 'candle', x, y, lit: true, glow: true }, drawCandle);
  addObj(b, { type: 'wallspider', x: 25, y: 1 }, drawWallSpider, 0);
  addObj(b, { type: 'wallbat', x: 22, y: 1 }, drawWallBat, 0);

  // Figuren
  const npc = (id, custom, x, y, extra = {}) => map.npcs.push({ id, custom, x: x * TILE, y: y * TILE, dir: 0, anim: 0, moving: false, ...extra });
  npc('witch', 'witch', 13, 15.5);
  npc('bodo', 'ghost', 17, 12.6);
  npc('zora', 'ghostGreen', 13, 9.4);
  npc('plumps', 'ghostGlasses', 9, 10);
  npc('bit', 'ghostBlue', 6, 4.2);
  npc('graf', 'graf', 16, 1.8);

  // Gegenstände und Gegner
  const item = (type, x, y, id) => map.items.push({ id, type, x: x * TILE + 2, y: y * TILE + 2, taken: false });
  item('candy', 7, 18, 'h1'); item('candy', 24, 16, 'h2'); item('candy', 27, 21, 'h3');
  item('apple', 3, 21, 'h4'); item('candy', 25, 6, 'h5'); item('candy', 6, 8, 'h6');
  map.enemySpawns = [{ type: 'bat', x: 8, y: 18 }, { type: 'bat', x: 23, y: 18 }, { type: 'bat', x: 26, y: 15 }];

  map.hints = [
    [12, 15, 19, 21, 'Halloween-Nacht am Buttenberg! Das Spukhaus versperrt den Weg zur Drachenhöhle.'],
    [5, 13, 26, 13, 'Ein Gespenst wartet an der Haustür...'],
    [12, 7, 19, 11, 'Die Halle ist voller Gruselzeug. Schau genau hin, was hier alles steht!'],
    [5, 7, 10, 11, 'Eine Bibliothek – aber eine schwere Truhe versperrt die Tür. Ein Fall für Felix!'],
    [5, 2, 10, 5, 'Fünf Kerzen ... und ein kleines Gespenst mit Brille. Sprich mit ihm!'],
    [12, 2, 19, 5, 'Der Thronsaal von Graf Kürbis!'],
    [21, 2, 26, 11, 'Eine Treppe führt hinab zur Drachenhöhle ...'],
  ];
  map.checkpoints = [
    [2, 15, 29, 21, HAUNT_SPAWN.x, HAUNT_SPAWN.y, 1],
    [5, 13, 26, 13, 15 * TILE + 8, 15 * TILE, 1],
  ];
  return map;
}

// --- Kapitel 4: Das Tal der Trolle (nach Theos Karten) ------------------------------
//
// Oberwelt: Insel, durch Klippen in Zonen geteilt. Nur die Höhlen A–E verbinden sie (über die Unterwelt).
//   Süden (Eingang, Höhle A) · Mitte (Schatz/Schwert, Suchscheinwerfer, Diamant, Höhlen B + D)
//   Westen oben (Höhle E, Hebel fürs Ausgangsgitter) · Osten (Höhle C, Bombenwerfer, rissige Felsen,
//   Felsentür mit Feuerspuck – braucht den Schlüssel) · Norden (Troll vor dem Ausgangsgitter)
// Unterwelt: A → Schleime/Fledermäuse → B → Schwertwächter → Schlüsselraum · D → Fels (Felix) → E,
//   Kristallkammer hinter Erdmauer · D → Erdmauer (Arne) → C mit Fels und Diamantenkammer

export const VALLEY_SPAWN = { x: 15 * TILE + 8, y: 26 * TILE, dir: 1 };

const HOLES_VALLEY = { A: [23, 24], B: [7, 19], C: [24, 16], D: [11, 14], E: [7, 8] };
const HOLES_UNDER = { A: [26, 17], B: [6, 20], C: [24, 8], D: [12, 14], E: [19, 2] };
// Ankunftspunkte (Pixel) neben dem jeweiligen Loch
const ARRIVE_VALLEY = { A: [23, 25], B: [7, 20], C: [24, 17], D: [11, 15], E: [7, 9] };
const ARRIVE_UNDER = { A: [25, 18], B: [7, 19], C: [24, 10], D: [13, 13], E: [18, 3] };

export function createValley() {
  const { map, b } = makeMap({ id: 'valley', w: 32, h: 30, fill: T.TREE, edge: T.TREE, theme: 'valley' });
  b.rect(5, 2, 22, 27, T.GRASS);
  const r = rng(11);
  for (let i = 0; i < 60; i++) b.set(5 + ((r() * 22) | 0), 2 + ((r() * 27) | 0), T.FLOWER);
  b.rect(2, 3, 3, 25, T.WATER); b.rect(27, 3, 3, 25, T.WATER);
  b.rect(5, 2, 1, 1, T.TREE); b.rect(26, 2, 1, 1, T.TREE);

  // Klippen
  b.rect(13, 2, 14, 1, T.CLIFF);            // Nordrand der Troll-Arena
  b.rect(13, 2, 1, 11, T.CLIFF);            // Westzone | Arena
  b.rect(13, 8, 14, 1, T.CLIFF);            // Arena | Ostzone
  b.rect(13, 9, 6, 4, T.CLIFF);             // Block zwischen Arena und Mitte
  b.rect(5, 12, 8, 1, T.CLIFF);             // Westzone | Mitte
  b.rect(19, 9, 1, 13, T.CLIFF);            // Mitte | Ostzone
  b.rect(19, 18, 8, 1, T.CLIFF);            // Ostzone Süden
  b.rect(20, 19, 7, 3, T.TREE);
  b.rect(5, 22, 22, 1, T.CLIFF);            // Süden | Mitte

  // Ausgang mit Gitter
  b.rect(15, 0, 2, 2, T.PATH);
  b.set(15, 2, T.BARS); b.set(16, 2, T.BARS);
  b.rect(15, 3, 2, 5, T.PATH);
  map.northExitCols = [15, 16];

  // Felsentür (Schlüssel) mit Feuerspuck, rissige Felsen davor
  b.set(21, 8, T.LOCKED);
  b.rect(21, 9, 1, 3, T.PATH);
  b.rect(20, 12, 7, 1, T.CRACK);
  b.rect(21, 13, 1, 4, T.PATH); b.rect(22, 16, 2, 1, T.PATH);

  // Wege
  b.rect(15, 23, 2, 6, T.PATH); b.rect(17, 24, 6, 1, T.PATH);
  b.rect(8, 19, 4, 1, T.PATH); b.rect(11, 15, 1, 4, T.PATH);
  b.rect(7, 9, 1, 2, T.PATH); b.rect(8, 10, 3, 1, T.PATH); b.rect(10, 4, 1, 6, T.PATH);
  b.set(15, 28, T.UP); b.set(16, 28, T.UP);   // zurück zum Spukhaus

  // Höhleneingänge
  map.holes = {};
  for (const [k, [x, y]] of Object.entries(HOLES_VALLEY)) {
    b.set(x, y, T.CAVEIN);
    const [ax, ay] = ARRIVE_UNDER[k];
    map.warps.push({ x, y, to: 'under', tx: ax * TILE, ty: ay * TILE, dir: 0, letter: k });
  }
  map.labels = Object.entries(HOLES_VALLEY).map(([k, [x, y]]) => ({ x: x * TILE + 8, y: y * TILE - 7, text: k }));

  // Deko
  for (const [x, y] of [[6, 24], [25, 26], [9, 27], [21, 27], [6, 3], [24, 4], [14, 20], [17, 14], [25, 10], [6, 16]]) b.set(x, y, T.BUSH);
  for (const [x, y] of [[12, 25], [19, 23], [9, 6], [17, 16], [26, 14], [22, 6]]) b.set(x, y, T.ROCK);

  // Objekte
  map.chest = addObj(b, { type: 'chest', x: 6, y: 14, open: false }, drawChest); b.solid(6, 14);
  map.searchlight = addObj(b, { type: 'searchlight', x: 13, y: 17, angle: 0, alarmT: 0 }, drawSearchlight); b.solid(13, 17);
  map.lever = addObj(b, { type: 'lever', x: 11, y: 4, pulled: false }, drawLever); b.solid(11, 4);
  map.isLever = (tx, ty) => tx === 11 && ty === 4;
  map.spitters = [{ x: 21, y: 8, dir: 0, cd: 1, speed: 85, gap: 1.6, door: true }];
  map.spitterObjs = map.spitters.map((sp) => addObj(b, { type: 'spitter', ...sp }, drawSpitter, 9 * TILE));
  map.openGate = () => { b.set(15, 2, T.PATH); b.set(16, 2, T.PATH); map.northExit = true; map.lever.pulled = true; };

  // Troll-Boss in der Arena
  map.arena = { x0: 14 * TILE, y0: 3 * TILE, x1: 25 * TILE, y1: 7 * TILE };
  map.enemySpawns = [
    { type: 'guard', x: 7, y: 24 }, { type: 'guard', x: 25, y: 26 },
    { type: 'bomber', x: 23, y: 14 },
    { type: 'bat', x: 8, y: 6 }, { type: 'bat', x: 9, y: 27 },
    { type: 'trollboss', x: 16, y: 4 },
  ];

  const item = (type, x, y, id) => map.items.push({ id, type, x: x * TILE + 2, y: y * TILE + 2, taken: false });
  item('crystal', 16, 20, 'v1'); item('crystal', 6, 10, 'v2'); item('apple', 25, 9, 'v3'); item('bag', 26, 17, 'v4');
  item('crystal', 9, 2, 'v5'); item('apple', 6, 21, 'v6');

  map.hints = [
    [5, 23, 26, 28, 'Das Tal der Trolle! Klippen versperren den Weg. Vielleicht führen die Höhlen weiter...'],
    [5, 13, 18, 21, 'Ein Suchscheinwerfer! Wer im Licht entdeckt wird, löst Alarm aus. Friedrich?'],
    [5, 2, 12, 11, 'Ein Hebel auf dem Felsvorsprung – er öffnet bestimmt das Ausgangsgitter!'],
    [20, 13, 26, 17, 'Ein Bombenwerfer! Seine Bomben könnten die rissigen Felsen sprengen ... oder Theo wirft sie zurück.'],
    [20, 9, 26, 11, 'Eine Felsentür, die Feuer spuckt! Theos Schild hilft – und ein Schlüssel.'],
    [14, 3, 26, 7, 'Der Troll! Wirf seine Felsbrocken mit Theos Schild zurück, dann ist er kurz benommen!'],
  ];
  map.checkpoints = [
    [5, 23, 26, 28, VALLEY_SPAWN.x, VALLEY_SPAWN.y, 1],
    [5, 13, 18, 21, 7 * TILE, 20 * TILE, 1],
    [5, 2, 12, 11, 7 * TILE, 9 * TILE, 0],
    [20, 9, 26, 17, 24 * TILE, 17 * TILE, 1],
    [14, 3, 26, 7, 21 * TILE, 7 * TILE, 1],
  ];
  return map;
}

export function createUnder() {
  const { map, b } = makeMap({ id: 'under', w: 32, h: 24, fill: T.CWALL, edge: T.CWALL, theme: 'cave' });
  const carve = (x, y, w, h) => b.rect(x, y, w, h, T.CFLOOR);
  carve(20, 17, 8, 4);    // A
  carve(11, 18, 9, 3);    // Gang A → B
  carve(6, 16, 5, 5);     // B
  carve(7, 9, 2, 7);      // Gang nach Norden (Schwertwächter)
  carve(3, 3, 6, 6);      // Schlüsselraum
  carve(9, 12, 3, 1);     // Durchgang zu D
  carve(12, 9, 6, 6);     // D
  carve(16, 6, 1, 3);     // Gang zu E
  carve(13, 2, 7, 4);     // E
  carve(9, 1, 3, 2);      // Kristallkammer
  carve(18, 11, 3, 1);    // Gang zu C
  carve(21, 9, 6, 6);     // C
  carve(24, 8, 1, 1);     // Nische mit Aufgang C
  carve(28, 10, 3, 3);    // Diamantenkammer
  b.rect(14, 19, 2, 1, T.WATER);

  b.set(12, 2, T.EWALL); b.set(19, 11, T.EWALL); b.set(27, 11, T.EWALL);
  b.under(16, 6, T.CFLOOR); b.set(16, 6, T.BOULDER);     // Fels vor E (Felix)
  b.under(24, 9, T.CFLOOR); b.set(24, 9, T.BOULDER);     // Fels vor Aufgang C (Felix)
  for (const [x, y] of [[21, 20], [10, 16], [3, 8], [17, 14], [26, 14], [13, 5]]) b.set(x, y, T.MUSH);

  for (const [k, [x, y]] of Object.entries(HOLES_UNDER)) {
    b.set(x, y, T.UP);
    const [ax, ay] = ARRIVE_VALLEY[k];
    map.warps.push({ x, y, to: 'valley', tx: ax * TILE, ty: ay * TILE, dir: 0, letter: k });
  }
  map.labels = Object.entries(HOLES_UNDER).map(([k, [x, y]]) => ({ x: x * TILE + 8, y: y * TILE - 6, text: k }));

  for (const [x, y] of [[22, 16], [26, 16], [8, 15], [4, 2], [14, 8], [16, 1], [23, 8], [12, 17]]) addObj(b, { type: 'torch', x, y }, drawTorch, 0);
  for (const [x, y] of [[8, 3], [17, 9], [26, 9]]) { addObj(b, { type: 'brazier', x, y, glow: true }, drawBrazier); b.solid(x, y); }

  // Feuerspucker in Schlüsselraum und Raum C
  map.spitters = [
    { x: 9, y: 5, dir: 2, cd: 0.5, speed: 75, gap: 1.8 },
    { x: 20, y: 13, dir: 3, cd: 1.2, speed: 75, gap: 2 },
  ];
  map.spitterObjs = map.spitters.map((sp) => addObj(b, { type: 'spitter', ...sp }, drawSpitter, 0));

  const item = (type, x, y, id) => map.items.push({ id, type, x: x * TILE + 2, y: y * TILE + 2, taken: false });
  item('key', 4, 4, 'ukey');
  item('crystal', 9, 1, 'u1'); item('crystal', 10, 2, 'u2'); item('crystal', 11, 1, 'u3');
  item('crystal', 28, 10, 'u4'); item('crystal', 30, 12, 'u5'); item('apple', 29, 11, 'u6');
  item('bag', 14, 12, 'u7'); item('apple', 6, 17, 'u8');

  map.enemySpawns = [
    { type: 'slime', x: 13, y: 19 }, { type: 'slime', x: 17, y: 18 }, { type: 'slime', x: 22, y: 19 },
    { type: 'bat', x: 16, y: 20 }, { type: 'bat', x: 24, y: 18 },
    { type: 'guard', x: 7, y: 13 }, { type: 'guard', x: 8, y: 10 },
    { type: 'kobold', x: 25, y: 12 },
  ];

  map.hints = [
    [20, 17, 27, 20, 'Die Unterwelt! Alle Höhlen der Insel sind hier unten verbunden.'],
    [7, 9, 8, 15, 'Schwertwächter! Ihre Rüstung ist zu hart – nur ein Schwert hilft gegen sie.'],
    [3, 3, 8, 8, 'Der Schlüsselraum! Vorsicht, Feuer! Theos Schild hält es ab.'],
    [12, 9, 17, 14, 'Eine große Höhle. Ein Fels versperrt den Gang nach Norden, eine Erdmauer den nach Osten.'],
    [21, 9, 26, 14, 'Höhle C. Ein Fels versperrt den Aufgang – und hinter der Erdmauer im Osten glitzert es!'],
    [13, 2, 19, 5, 'Höhle E. Hinter der Erdmauer im Westen glitzert es ...'],
  ];
  map.checkpoints = [
    [20, 17, 27, 20, 25 * TILE, 18 * TILE, 2],
    [6, 16, 10, 20, 7 * TILE, 18 * TILE, 1],
    [12, 9, 17, 14, 13 * TILE, 13 * TILE, 1],
    [21, 9, 26, 14, 22 * TILE, 11 * TILE, 3],
    [13, 2, 19, 5, 18 * TILE, 3 * TILE, 2],
    [3, 3, 8, 8, 7 * TILE, 8 * TILE, 1],
  ];
  return map;
}
