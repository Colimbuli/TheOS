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
    diamonds: game.diamonds, ammo: game.ammo, hasCloak: game.hasCloak,
    cave: game.cave, haunt: game.haunt, quizStats: game.quizStats, quizIntro: game.quizIntro,
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
// 16 Zeichen, z. B. "K7QX-M2PA-9ZRB-4HTD". Enthält Fortschritt, Fähigkeiten, Diamanten, Level.
// Man startet am Anfang der jeweiligen Karte; Gegenstände in Höhle/Spukhaus liegen wieder da.

const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ohne 0/O und 1/I/L-Verwechslung
const OWN = ['shield', 'strength', 'dig', 'invis', 'sling', 'shovel', 'shield2'];
const CAVE = ['dug', 'boulder', 'key', 'door', 'statue', 'troll', 'lever', 'secret', 'done'];
const HAUNT = ['gate', 'front', 'count', 'chest', 'lib', 'candles', 'king', 'door6', 'done'];
const MAPS = ['village', 'cave', 'haunted'];

// Feldliste: [Bitbreite, Wert lesen, Wert schreiben]
function fields() {
  const flags = (names, obj) => names.reduce((v, n, i) => v | ((obj && obj[n] ? 1 : 0) << i), 0);
  return [
    [3, (s) => s.step],
    [1, (s) => (s.hasCloak ? 1 : 0)],
    [7, (s) => flags(OWN, s.owned)],
    [2, (s) => Math.min(3, (s.owned && s.owned.heart) || 0)],
    [10, (s) => Math.min(1023, s.diamonds)],
    [8, (s) => Math.min(255, s.ammo)],
    [5, (s) => Math.min(31, s.stats.level)],
    [9, (s) => Math.min(511, s.stats.xp)],
    [9, (s) => flags(CAVE, s.cave)],
    [9, (s) => flags(HAUNT, s.haunt)],
    [5, (s) => (s.haunt && s.haunt.target) || 5],
    [2, (s) => Math.max(0, MAPS.indexOf(s.mapId === 'school' || s.mapId === 'shop' ? 'village' : s.mapId))],
  ];
}

// FNV-1a über alle Bytes – erkennt Tippfehler zuverlässig
function checksum(n) {
  let h = 0x811c9dc5;
  for (let i = 0; i < 10; i++) { h ^= Number((n >> BigInt(i * 8)) & 255n); h = Math.imul(h, 0x01000193) >>> 0; }
  return (h ^ (h >>> 8) ^ (h >>> 16) ^ (h >>> 24)) & 255;
}

export function encodeCode(snap) {
  let n = 0n;
  for (const [bits, get] of fields()) n = (n << BigInt(bits)) | BigInt(get(snap) & ((1 << bits) - 1));
  n = (n << 8n) | BigInt(checksum(n));
  let s = '';
  for (let i = 0; i < 16; i++) { s = ABC[Number(n & 31n)] + s; n >>= 5n; }
  return s.match(/.{4}/g).join('-');
}

// Liefert die Rohwerte oder null, wenn der Code ungültig ist
export function decodeCode(code) {
  const clean = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/0/g, 'O').replace(/1/g, 'I');
  if (clean.length !== 16) return null;
  let n = 0n;
  for (const ch of clean) {
    const i = ABC.indexOf(ch);
    if (i < 0) return null;
    n = (n << 5n) | BigInt(i);
  }
  const sum = Number(n & 255n);
  n >>= 8n;
  if (checksum(n) !== sum) return null;
  const f = fields();
  const vals = [];
  for (let i = f.length - 1; i >= 0; i--) { const bits = f[i][0]; vals.unshift(Number(n & BigInt((1 << bits) - 1))); n >>= BigInt(bits); }
  const [step, cloak, own, hearts, diamonds, ammo, level, xp, cave, haunt, target, map] = vals;
  const unpack = (names, v) => Object.fromEntries(names.map((nm, i) => [nm, !!(v >> i & 1)]));
  const owned = Object.fromEntries(OWN.filter((_, i) => own >> i & 1).map((k) => [k, true]));
  if (hearts) owned.heart = hearts;
  return {
    step, hasCloak: !!cloak, owned, diamonds, ammo, level: Math.max(1, level), xp,
    cave: unpack(CAVE, cave), haunt: { ...unpack(HAUNT, haunt), target: Math.max(5, target) },
    mapId: MAPS[map] || 'village',
  };
}
