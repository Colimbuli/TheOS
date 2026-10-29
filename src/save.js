// Spielstände im Browser (localStorage): ein Autosave plus drei feste Speicherplätze.
// Dazu ein kurzer Speichercode zum Abschreiben – falls der Browser-Speicher gesperrt ist
// (z. B. in manchen eingebetteten Seiten) oder um auf einem anderen Gerät weiterzuspielen.

const AUTO = 'theos-save-v1';
const SLOT = (n) => `theos-slot-${n}`;
export const SLOTS = 3;

export function snapshot(game) {
  const L = game.party[0];
  return {
    v: 1, savedAt: Date.now(),
    mapId: game.mapId, x: L.x, y: L.y, dir: L.dir,
    party: game.party.map((m) => m.id),
    stats: game.stats, step: game.step, owned: game.owned,
    quizWrong: game.quizWrong, starter: game.starter, rec: game.rec, dw: game.dw, mama: game.mama, theoFound: game.theoFound, mtn: game.mtn,
    diamonds: game.diamonds, ammo: game.ammo, hasCloak: game.hasCloak,
    cave: game.cave, haunt: game.haunt, valley: game.valley, quizStats: game.quizStats, quizIntro: game.quizIntro,
    seenHints: game.seenHints, checkpoint: game.checkpoint,
    bushes: game.bushes, treasures: game.treasures, kills: game.kills,
  };
}

function write(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); return true; } catch { return false; } }
function read(key) {
  try {
    const s = localStorage.getItem(key);
    if (!s) return null;
    const d = JSON.parse(s);
    return d && d.v === 1 ? d : null;
  } catch { return null; }
}

export const saveGame = (game) => write(AUTO, snapshot(game));
export const loadGame = () => read(AUTO);
export const hasSave = () => !!loadGame();
export const saveSlot = (game, n) => write(SLOT(n), snapshot(game));
export const loadSlot = (n) => read(SLOT(n));

// --- Speichercode -----------------------------------------------------------------
// 24 Zeichen, z. B. "K7QX-M2PA-9ZRB-4HTD-AB2C-QQ3A" (ältere Codes mit 16 oder 20 Zeichen gelten weiter).
// Enthält Fortschritt, Fähigkeiten, Diamanten, Level.
// Man startet am Anfang der jeweiligen Karte; Gegenstände in Höhle/Spukhaus liegen wieder da.

const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ohne 0/O und 1/I/L-Verwechslung
const OWN = ['shield', 'strength', 'dig', 'invis', 'sling', 'shovel', 'shield2', 'sword', 'legs'];
const VALLEY = ['sword', 'key', 'lever', 'door', 'troll', 'done'];
const CAVE = ['dug', 'boulder', 'key', 'door', 'statue', 'troll', 'lever', 'secret', 'done'];
const HAUNT = ['gate', 'front', 'count', 'chest', 'lib', 'candles', 'king', 'door6', 'done'];
const MAPS = ['village', 'cave', 'haunted', 'valley', 'under', 'mountain', 'lair', 'dwarf'];
const DW = ['theo', 'felix', 'ferd', 'fried', 'lino', 'jelly', 'plates', 'lock', 'done'];
const STARTERS = ['theo', 'felix', 'ferdinand', 'friedrich', 'lino'];
const MTN = ['statue', 'wall', 'rocks', 'key', 'boss', 'jelly', 'done'];

// Feldliste: [Bitbreite, Wert lesen]. v = 1 (16 Zeichen), 2 (20 Zeichen) oder 3 (aktuell, 24 Zeichen, mit Lino)
function fields(v = 3) {
  const flags = (names, obj) => names.reduce((v, n, i) => v | ((obj && obj[n] ? 1 : 0) << i), 0);
  // Kapitel 5 und die freie Startfigur stecken in den obersten 14 Bits – die waren in v2-Codes
  // immer 0, deshalb bleiben alte Codes gültig (Startfigur Theo, Kapitel 5 nicht begonnen).
  return [
    ...(v === 3 ? [[9, (s) => flags(DW, s.dw)]] : []),
    ...(v === 1 ? [] : [
      [v === 3 ? 3 : 2, (s) => Math.max(0, STARTERS.indexOf(s.starter || 'theo'))],
      [v === 3 ? 5 : 4, (s) => flags(STARTERS, s.rec)],
      [1, (s) => (s.mama === 2 ? 1 : 0)],
      [7, (s) => flags(MTN, s.mtn)],
    ]),
    [3, (s) => s.step],
    [1, (s) => (s.hasCloak ? 1 : 0)],
    [v === 1 ? 7 : v === 2 ? 8 : 9, (s) => flags(OWN, s.owned)],
    [2, (s) => Math.min(3, (s.owned && s.owned.heart) || 0)],
    [10, (s) => Math.min(1023, s.diamonds)],
    [8, (s) => Math.min(255, s.ammo)],
    [5, (s) => Math.min(31, s.stats.level)],
    [9, (s) => Math.min(511, s.stats.xp)],
    [9, (s) => flags(CAVE, s.cave)],
    [9, (s) => flags(HAUNT, s.haunt)],
    [5, (s) => (s.haunt && s.haunt.target) || 5],
    ...(v === 1 ? [] : [[6, (s) => flags(VALLEY, s.valley)]]),
    [v === 1 ? 2 : 3, (s) => Math.max(0, MAPS.indexOf(s.mapId === 'school' || s.mapId === 'shop' ? 'village' : s.mapId))],
  ];
}

const LEN = { 1: 16, 2: 20, 3: 24 };
const BYTES = { 1: 10, 2: 12, 3: 13 };

// FNV-1a über alle Bytes – erkennt Tippfehler zuverlässig
function checksum12(n) { return checksum(n, 2); }

function checksum(n, v = 3) {
  let h = 0x811c9dc5;
  for (let i = 0; i < BYTES[v]; i++) { h ^= Number((n >> BigInt(i * 8)) & 255n); h = Math.imul(h, 0x01000193) >>> 0; }
  return (h ^ (h >>> 8) ^ (h >>> 16) ^ (h >>> 24)) & 255;
}

export function encodeCode(snap) {
  let n = 0n;
  for (const [bits, get] of fields(3)) n = (n << BigInt(bits)) | BigInt(get(snap) & ((1 << bits) - 1));
  n = (n << 8n) | BigInt(checksum(n, 3));
  let s = '';
  for (let i = 0; i < LEN[3]; i++) { s = ABC[Number(n & 31n)] + s; n >>= 5n; }
  return s.match(/.{4}/g).join('-');
}

// Liefert die Rohwerte oder null, wenn der Code ungültig ist
export function decodeCode(code) {
  const clean = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/0/g, 'O').replace(/1/g, 'I');
  const v = clean.length === 16 ? 1 : clean.length === 20 ? 2 : clean.length === 24 ? 3 : 0;
  if (!v) return null;
  let n = 0n;
  for (const ch of clean) {
    const i = ABC.indexOf(ch);
    if (i < 0) return null;
    n = (n << 5n) | BigInt(i);
  }
  const sum = Number(n & 255n);
  n >>= 8n;
  // v3-Codes von vor Kapitel 6 hatten nur 12 Prüfbytes (oberstes Byte war 0)
  if (checksum(n, v) !== sum && !(v === 3 && (n >> 96n) === 0n && checksum12(n) === sum)) return null;
  const f = fields(v);
  const vals = [];
  for (let i = f.length - 1; i >= 0; i--) { const bits = f[i][0]; vals.unshift(Number(n & BigInt((1 << bits) - 1))); n >>= BigInt(bits); }
  if (n !== 0n) return null; // ungenutzte Bits müssen 0 sein (fängt Tippfehler am Anfang ab)
  if (v === 1) { vals.splice(11, 0, 0); vals.unshift(0, 0, 0, 0); } // alte Codes: kein Tal-Fortschritt
  if (v !== 3) vals.unshift(0);
  const [dw, starter, rec, mama, mtn, step, cloak, own, hearts, diamonds, ammo, level, xp, cave, haunt, target, valley, map] = vals;
  const unpack = (names, v) => Object.fromEntries(names.map((nm, i) => [nm, !!(v >> i & 1)]));
  const owned = Object.fromEntries(OWN.filter((_, i) => own >> i & 1).map((k) => [k, true]));
  if (hearts) owned.heart = hearts;
  return {
    step, hasCloak: !!cloak, owned, diamonds, ammo, level: Math.max(1, level), xp,
    cave: unpack(CAVE, cave), haunt: { ...unpack(HAUNT, haunt), target: Math.max(5, target) }, valley: unpack(VALLEY, valley),
    starter: STARTERS[starter], rec: unpack(STARTERS, rec), mama: mama ? 2 : 0, mtn: unpack(MTN, mtn), dw: unpack(DW, dw),
    mapId: MAPS[map] || 'village',
  };
}
