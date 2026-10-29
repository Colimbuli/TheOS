// Buttenberg Adventures (Repo: TheOS)
// Top-down-Abenteuer im GBA-Stil. Interne Auflösung 240x160, ganzzahlig hochskaliert.
//
// Kapitel 1: Dorf Lindental – Gefährten sammeln (freie Startfigur; Fähigkeiten im Laden kaufen)
// Kapitel 2: Die Höhle im Buttenberg · 3: Das Spukhaus · 4: Das Tal der Trolle · 5: Der Bergpfad

import { initInput, pollInput, input, isTouch } from './input.js';
import { sfx, unlockAudio } from './audio.js';
import { drawTiles, T, TILE, COL, drawDiamond, TALL, tileCutout } from './world.js';
import Tilt from './tilt.js';
import Music, { MAP_SONG } from './music.js';
import { createVillage, createSchool, createShop, createCave, CAVE_SPAWN, createHaunted, HAUNT_SPAWN, CANDLE_VALUES, createValley, createUnder, VALLEY_SPAWN, createMountain, createLair, MOUNTAIN_SPAWN, LAIR_SPAWN } from './maps.js';
import { charSprite, heartSprite, itemSprite, slimeSprite, koboldSprite, trollSprite, fireSprite, ghostSprite, witchSprite, grafSprite, batSprite, guardSprite, bomberSprite, bombSprite, rockSprite, mtrollSprite, rockmonSprite, rockBossSprite } from './sprites.js';
import { createNPCs, talkTo, ferdinandDoor, leverDialog, HEROES, questHint, ABILITY_NAME, STARTERS, HOME, THEO_BUSH, theoNPC, allHeroes } from './npcs.js';
import { Dialog } from './dialog.js';
import { QuizUI, ShopUI, RiddleUI, PauseUI, ChapterUI, StarterUI } from './ui.js';
import { nextQuestion } from './quiz.js';
import { mountainQuestion } from './mountain.js';
import * as HW from './halloween.js';
import { saveGame, loadGame, saveSlot, loadSlot, encodeCode, decodeCode, snapshot } from './save.js';

const W = 240, H = 160;
const FONT = '"Press Start 2P", monospace';
const DIRV = [[0, 1], [0, -1], [-1, 0], [1, 0]]; // runter, hoch, links, rechts
const OPPOSITE = [1, 0, 3, 2];
const SPEED = 72;
const FOLLOW_GAP = 9;
const INVIS_TIME = 8;
const KONRAD_ZONE = { x0: 13, x1: 19, y0: 2, y1: 5 };

const view = document.getElementById('screen');
const vctx = view.getContext('2d');
const low = document.createElement('canvas');
low.width = W; low.height = H;
const g = low.getContext('2d');
let K = 1;

const dialog = new Dialog();
let game;

// --- Spielzustand ---------------------------------------------------------------

const member = (id, x, y, dir = 0) => ({ id, pal: id, x, y, dir, anim: 0, moving: false });
const leader = () => game.party[0];
const map = () => game.maps[game.mapId];

function newGame(starter = 'theo') {
  const maps = { village: createVillage(), school: createSchool(), shop: createShop(), cave: createCave(), haunted: createHaunted(),
    valley: createValley(), under: createUnder(), mountain: createMountain(), lair: createLair() };
  maps.village.npcs = createNPCs(starter);
  if (starter === 'ferdinand') maps.village.setTile(24, 9, T.PATH); // Ferdinand ist schon draußen
  const h = HOME[starter];
  game = {
    state: 'title', time: 0, titleT: 0, endT: 0, menu: 0,
    maps, mapId: 'village',
    party: [member(starter, h.x, h.y, h.dir)],
    starter, rec: { theo: false, felix: false, ferdinand: false, friedrich: false, lino: false, [starter]: true },
    linoT: 0, linoCD: 0, quizWrong: 0, bomberT: 0,
    mama: 0, theoFound: false,
    mtn: { statue: false, wall: false, rocks: false, key: false, boss: false, jelly: false, done: false, taken: [] },
    jumpT: 0, jump: null, sprintT: 0, sprintCD: 0,
    stats: { hearts: 3, maxHearts: 3, level: 1, xp: 0 },
    step: 0, owned: {}, diamonds: 0, ammo: 0, hasCloak: false,
    cave: { dug: false, boulder: false, key: false, door: false, statue: false, troll: false, lever: false,
      secret: false, done: false, taken: [], dugCells: [] },
    quizStats: { de: { r: 0, n: 0 }, en: { r: 0, n: 0 }, geo: { r: 0, n: 0 }, ma: { r: 0, n: 0 } },
    haunt: { gate: false, front: false, count: false, chest: false, lib: false, candles: false, king: false, door6: false,
      done: false, target: 5 + Math.floor(Math.random() * 27), taken: [] },
    valley: { sword: false, key: false, lever: false, door: false, troll: false, done: false, edits: [], taken: [] },
    quizIntro: false, seenHints: {},
    challenge: { active: false, blocked: 0, timer: 0 },
    cloak: { x: 6 * TILE + 3, y: 19 * TILE + 2, taken: false },
    projectiles: [], particles: [], floats: [], banners: [], toast: null, trail: [],
    shieldT: 0, shieldCD: 0, invisT: 0, actT: 0, hurtT: 0, faintT: 0, fadeT: 0, swingT: 0,
    checkpoint: null, bushes: 0, treasures: 0, kills: 0,
    ui: null, saveT: 0, dropN: 0,
  };
  spawnEnemies(maps.cave);
  spawnEnemies(maps.haunted);
  spawnEnemies(maps.valley);
  spawnEnemies(maps.under);
  spawnEnemies(maps.mountain);
  spawnEnemies(maps.lair);
}

// Gespeicherten Stand auf frisch aufgebaute Karten anwenden
// Früher hieß Ferdinand intern "arne" – alte Spielstände umrechnen
function migrateIds(d) {
  const fix = (id) => (id === 'arne' ? 'ferdinand' : id);
  const rec = d.rec ? Object.fromEntries(Object.entries(d.rec).map(([k, v]) => [fix(k), v])) : d.rec;
  return { ...d, starter: d.starter && fix(d.starter), party: (d.party || []).map(fix), rec };
}

function applySave(d0) {
  let d = migrateIds(d0);
  newGame(d.starter || 'theo');
  Object.assign(game, {
    step: d.step, owned: d.owned || {}, diamonds: d.diamonds, ammo: d.ammo, hasCloak: d.hasCloak,
    stats: d.stats, quizStats: d.quizStats || game.quizStats, quizIntro: d.quizIntro, seenHints: d.seenHints || {},
    checkpoint: d.checkpoint, bushes: d.bushes || 0, treasures: d.treasures || 0, kills: d.kills || 0,
  });
  Object.assign(game.cave, d.cave || {});
  // Kapitel-1-Fortschritt; alte Spielstände (nur "step") werden umgerechnet
  const st = d.step || 0;
  game.rec = { ...game.rec, ...(d.rec || { felix: st >= 2, ferdinand: st >= 3, friedrich: st >= 6 }) };
  for (const id of d.party) if (game.rec[id] !== undefined) game.rec[id] = true;
  game.quizWrong = d.quizWrong || 0;
  // Spielstände von vor Lino: nach Kapitel 1 ist er automatisch dabei
  const party = [...d.party];
  if (st >= 7 && !party.includes('lino')) { game.rec.lino = true; party.splice(party.includes('jelly') ? party.indexOf('jelly') : party.length, 0, 'lino'); }
  d = { ...d, party };
  game.mama = d.mama ?? (st >= 6 ? 2 : st >= 4 ? 1 : 0);
  game.theoFound = !!d.theoFound;
  game.step = st >= 7 ? 7 : 0;
  const v = game.maps.village, c = game.maps.cave;
  if (game.rec.ferdinand) v.setTile(24, 9, T.PATH);
  if (game.hasCloak || game.mama === 2) { v.setTile(7, 16, T.TUNNEL); game.cloak.taken = true; }
  if (game.step >= 7) v.openGate();
  game.party = d.party.map((id) => member(id, d.x, d.y, d.dir));
  v.npcs = v.npcs.filter((n) => !d.party.includes(n.id));
  if (game.theoFound && !game.rec.theo) v.npcs.push(theoNPC());
  if (d.mtn) { Object.assign(game.mtn, d.mtn); applyMountain(); }
  const cv = game.cave;
  for (const k of cv.dugCells) { const [x, y] = k.split(',').map(Number); c.setTile(x, y, T.CFLOOR); }
  if (cv.boulder) { c.setTile(24, 11, T.CFLOOR); c.setTile(25, 11, T.BOULDER); }
  if (cv.door) c.setTile(15, 7, T.CFLOOR);
  if (cv.statue) c.killStatue();
  if (cv.lever) { c.setTile(2, 9, T.CFLOOR); c.lever.pulled = true; }
  for (const it of c.items) if (cv.taken.includes(it.id)) it.taken = true;
  if (d.haunt) {
    Object.assign(game.haunt, d.haunt);
    const hm = game.maps.haunted, h = game.haunt;
    for (const [id, r] of Object.entries(hm.riddles)) if (h[id]) hm.setTile(r.x, r.y, r.open);
    if (h.chest) { hm.setTile(7, 7, T.WOOD); hm.setTile(8, 7, T.BOULDER); }
    if (h.candles) setCandles(h.target);
    if (h.door6) hm.setTile(20, 3, T.WOOD);
    for (const it of hm.items) if (h.taken.includes(it.id)) it.taken = true;
  }
  if (d.valley) {
    Object.assign(game.valley, d.valley);
    applyValley();
  }
  game.mapId = d.mapId;
  game.state = 'play';
}

const HP = { slime: 2, kobold: 3, bat: 1, guard: 3, bomber: 2, trollboss: 6, mtroll: 3, rockmon: 4, rockboss: 8 };

function spawnEnemies(m) {
  m.enemies = (m.enemySpawns || []).map((s, i) => ({
    id: i, type: s.type, x: s.x * TILE, y: s.y * TILE, hp: HP[s.type], home: { x: s.x * TILE, y: s.y * TILE }, stunT: 0,
    cd: 1 + Math.random() * 1.5, hurtT: 0, alive: true, anim: Math.random() * 3, flip: false, throwT: 0,
    asleep: !!s.asleep, guard: !!s.guard, mode: 'idle', modeT: 0,
  }));
}

const needXP = (lvl) => 10 + lvl * 10;

const fx = {
  sfx,
  banner(title, sub, color = '#f8d848') { game.banners.push({ title, sub, color, t: 2.6 }); },
  toast(text, t = 4) { game.toast = { text, t }; },
  gainXP(n, wx, wy) {
    const st = game.stats;
    st.xp += n;
    if (wx != null) float(`+${n} EP`, wx, wy);
    while (st.xp >= needXP(st.level)) {
      st.xp -= needXP(st.level);
      st.level++;
      st.maxHearts = Math.min(12, st.maxHearts + 1);
      st.hearts = st.maxHearts;
      fx.banner('LEVEL UP!', `Die Gruppe ist jetzt Level ${st.level}`);
      setTimeout(sfx.levelUp, 250);
    }
  },
  startChallenge() {
    Object.assign(game.challenge, { active: true, blocked: 0, timer: 1.2 });
    game.stats.hearts = game.stats.maxHearts;
  },
  join(id) {
    const v = map().npcs.some((n) => n.id === id) ? map() : game.maps.village;
    const i = v.npcs.findIndex((n) => n.id === id);
    const from = i >= 0 && v === map() ? v.npcs.splice(i, 1)[0] : (i >= 0 && v.npcs.splice(i, 1), leader());
    const m = member(id, from.x, from.y, from.dir);
    game.party.push(m);
    poof(m.x + 8, m.y + 10);
    snapFollowers();
    save();
  },
  openQuiz() { game.ui = new QuizUI(game, fx); },
  openShop() { game.ui = new ShopUI(game, fx); },
  openRiddle(id) { openRiddle(id); },
  jellyTalk() { return jellyTalk(); },
};

function float(text, x, y, color = '#f8d848') { game.floats.push({ text, x, y, t: 1.1, color }); }

function poof(x, y) {
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    game.particles.push({ x, y, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40 - 10, t: 0.4, c: '#f0f0f8', g: 0 });
  }
}

function burst(x, y, colors, n = 10, power = 50) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = power * (0.6 + Math.random());
    game.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: 0.5 + Math.random() * 0.3,
      c: colors[i % colors.length], g: 220 });
  }
}
const CONFETTI = ['#ff4a4a', '#ffd040', '#40e060', '#40a0ff', '#e060ff', '#ffffff'];

function save() { if (game.state === 'play' || game.state === 'end') saveGame(game); }

// --- Gruppe -------------------------------------------------------------------

function pushTrail(L) {
  const tr = game.trail;
  const last = tr[tr.length - 1];
  if (!last || Math.hypot(L.x - last.x, L.y - last.y) >= 1.5) {
    tr.push({ x: L.x, y: L.y, dir: L.dir });
    if (tr.length > 120) tr.shift();
  }
}

function snapFollowers() {
  const L = leader(), tr = game.trail;
  for (let i = 1; i < game.party.length; i++) {
    const f = game.party[i];
    const p = tr[tr.length - 1 - i * FOLLOW_GAP];
    if (!p) continue;
    f.x = p.x; f.y = p.y; f.dir = p.dir;
    f.moving = L.moving; f.anim = L.anim + i * 0.1;
  }
}

function regroup() {
  const L = leader();
  game.trail = [];
  for (const f of game.party) { f.x = L.x; f.y = L.y; f.dir = L.dir; }
}

function switchLeader() {
  if (game.party.length < 2 || game.invisT > 0 || game.challenge.active) return;
  const old = game.party[0], next = game.party[1];
  game.party.push(game.party.shift());
  next.x = old.x; next.y = old.y; next.dir = old.dir;
  snapFollowers();
  poof(next.x + 8, next.y + 10);
  sfx.swap();
  float(HEROES[next.id].name, next.x + 8, next.y - 6, '#ffffff');
}

// Kartenwechsel (Türen, Treppen, Tor)
function goTo(mapId, x, y, dir) {
  endInvisibility(true);
  game.mapId = mapId;
  const L = leader();
  L.x = x; L.y = y; L.dir = dir;
  regroup();
  game.projectiles = [];
  game.challenge.active = false;
  game.fadeT = 0.35;
  game.banners = game.banners.slice(-1);
  if (mapId === 'cave') game.checkpoint = { map: 'cave', ...CAVE_SPAWN };
  if (mapId === 'haunted') game.checkpoint = { map: 'haunted', ...HAUNT_SPAWN };
  if (['valley', 'under', 'mountain', 'lair'].includes(mapId)) game.checkpoint = { map: mapId, x, y, dir };
  game.sprintT = 0; game.jumpT = 0;
  save();
}

// --- Kollision & Bewegung --------------------------------------------------------

const solidAt = (x, y) => map().isSolidTile(Math.floor(x / TILE), Math.floor(y / TILE));
const overlap = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

function wallHit(nx, ny) {
  const bx = nx + 3, by = ny + 8, bw = 10, bh = 7;
  return solidAt(bx, by) || solidAt(bx + bw - 1, by) || solidAt(bx, by + bh - 1) || solidAt(bx + bw - 1, by + bh - 1);
}

function blocked(e, nx, ny) {
  if (wallHit(nx, ny)) return true;
  for (const o of [leader(), ...map().npcs]) {
    if (o === e) continue;
    if (overlap(nx + 3, ny + 8, 10, 7, o.x + 3, o.y + 8, 10, 7)) return true;
  }
  return false;
}

function occupied(tx, ty) {
  return [leader(), ...map().npcs].some((o) => overlap(tx * TILE, ty * TILE, TILE, TILE, o.x + 3, o.y + 8, 10, 7));
}

function nudge(e, axis, d, sp) {
  for (const off of [3, 6]) {
    for (const s of [-1, 1]) {
      const tx = axis === 'x' ? e.x + d : e.x + s * off;
      const ty = axis === 'x' ? e.y + s * off : e.y + d;
      if (blocked(e, tx, ty)) continue;
      const sx = axis === 'x' ? 0 : s * sp, sy = axis === 'x' ? s * sp : 0;
      if (!blocked(e, e.x + sx, e.y + sy)) { e.x += sx; e.y += sy; return true; }
    }
  }
  return false;
}

function move(e, dx, dy, allowNudge) {
  let moved = false;
  if (dx) {
    if (!blocked(e, e.x + dx, e.y)) { e.x += dx; moved = true; }
    else if (allowNudge && !dy) moved = nudge(e, 'x', dx, Math.abs(dx)) || moved;
  }
  if (dy) {
    if (!blocked(e, e.x, e.y + dy)) { e.y += dy; moved = true; }
    else if (allowNudge && !dx) moved = nudge(e, 'y', dy, Math.abs(dy)) || moved;
  }
  return moved;
}

// Gegner bewegen sich nur gegen Wände
function moveEnemy(e, dx, dy) {
  if (dx && !wallHit(e.x + dx, e.y)) e.x += dx;
  if (dy && !wallHit(e.x, e.y + dy)) e.y += dy;
}

// --- Update ---------------------------------------------------------------------

let canvasTap = false;
let tapPos = null;

function update(dt) {
  game.time += dt;
  Tilt.update(dt);
  pollInput();
  if (input.tiltPressed) cycleTilt();
  if (input.musicPressed) toggleMusic();
  Music.update(currentSong());
  const tap = canvasTap;
  canvasTap = false;
  const tp = tapPos;
  tapPos = null;

  if (game.state === 'title') {
    game.titleT += dt;
    if (game.ui) {
      game.ui.update(input, dt, tp);
      if (game.ui && game.ui.closed) game.ui = null;
      return;
    }
    const items = game.titleCache || (game.titleCache = titleItems());
    const my = input.dir.y || input.tapY;
    if (my && !game.menuHeld) { game.menu = (game.menu + my + items.length) % items.length; sfx.blip(); }
    game.menuHeld = !!input.dir.y;
    if (input.aPressed || tap) startFromTitle(items[game.menu].id);
    return;
  }

  if (game.state === 'end') {
    game.endT += dt;
    if (game.endT > 1.5 && (input.aPressed || tap)) {
      game.state = 'play';
      if (game.endChapter === 2) {
        goTo('haunted', HAUNT_SPAWN.x, HAUNT_SPAWN.y, HAUNT_SPAWN.dir);
        fx.banner('KAPITEL 3', 'Das Spukhaus am Buttenberg', '#ffb040');
      } else if (game.endChapter === 3) {
        goTo('valley', VALLEY_SPAWN.x, VALLEY_SPAWN.y, VALLEY_SPAWN.dir);
        fx.banner('KAPITEL 4', 'Das Tal der Trolle', '#ffb040');
      } else if (game.endChapter === 4) {
        goTo('mountain', MOUNTAIN_SPAWN.x, MOUNTAIN_SPAWN.y, MOUNTAIN_SPAWN.dir);
        fx.banner('KAPITEL 5', 'Der Bergpfad', '#ffb040');
      } else {
        const L = leader();
        L.x = 2 * TILE; L.y = 2 * TILE + 4; L.dir = 0;
        regroup();
        save();
      }
    }
    return;
  }

  updateEffects(dt);
  game.fadeT = Math.max(0, game.fadeT - dt);
  for (const n of map().npcs) n.moving = false;

  if (game.faintT > 0) {
    game.faintT -= dt;
    if (game.faintT <= 0) respawn();
    return;
  }

  if (input.menuPressed && !game.ui && !dialog.active) { sfx.confirm(); openPause(); return; }

  if (game.ui) {
    game.ui.update(input, dt, tp);
    // Nach dem Laden ist "game" ein neues Objekt – dann gibt es kein offenes Menü mehr
    if (game.ui && game.ui.closed) { game.ui = null; save(); }
    return;
  }

  if (dialog.active) {
    dialog.update(dt, input.aPressed, sfx.blip);
    return;
  }

  updateTimers(dt);
  updateLeader(dt);
  if (dialog.active || game.ui) return;
  updateChallenge(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateStatue(dt);
  updateTroll();
  updateSpitters(dt);
  updateSearchlight(dt);
  updateBomberRespawn(dt);
  checkPickups();
  checkKonrad();
  checkAreas();
  checkWarps();

  game.saveT += dt;
  if (game.saveT > 5) { game.saveT = 0; save(); }
}

function titleItems() {
  const items = [];
  if (loadGame()) items.push({ id: 'continue', label: 'Weiterspielen' });
  items.push({ id: 'chapters', label: 'Kapitel wählen' });
  items.push({ id: 'load', label: 'Laden / Code' });
  items.push({ id: 'new', label: 'Neues Spiel' });
  return items;
}

// --- Speichern & Laden (Pause-Menü) ------------------------------------------------

const PAUSE_API = {
  save: (n) => saveSlot(game, n),
  load: (n) => {
    const d = n === 0 ? loadGame() : loadSlot(n);
    if (!d) return false;
    applySave(d);
    fx.toast(`Spielstand geladen! ${game.diamonds} Diamanten.`, 2.5);
    return true;
  },
  slots: () => [loadGame(), loadSlot(1), loadSlot(2), loadSlot(3)],
  code: () => encodeCode(snapshot(game)),
  enterCode() {
    let input;
    try { input = window.prompt('Speichercode eingeben (24 Zeichen):'); } catch { input = null; }
    if (input == null) return { ok: false, text: 'Eingabe hier nicht möglich? Spiel direkt öffnen.' };
    const d = decodeCode(input);
    if (!d) { sfx.bump(); return { ok: false, text: 'Der Code stimmt nicht. Bitte genau prüfen!' }; }
    applySave(fromCode(d));
    sfx.start();
    fx.toast('Speichercode geladen!', 2.5);
    return { ok: true, text: '' };
  },
  toTitle() { save(); newGame(); dialog.active = false; },
  tiltLabel: () => Tilt.levelLabel(),
  musicLabel: () => Music.label(),
  toggleMusic: () => Music.toggle(),
  cycleTilt: () => { Tilt.cycle(); Tilt.saveSetting(); },
};

// Aus den Werten eines Speichercodes einen vollständigen Spielstand bauen
function fromCode(c) {
  const starter = c.starter || 'theo';
  const rec = { ...(c.rec || {}) };
  if (c.step >= 2) rec.felix = true;
  if (c.step >= 3) rec.ferdinand = true;
  if (c.step >= 6) { rec.friedrich = true; rec.theo = true; rec.lino = true; }
  rec[starter] = true;
  const mama = c.step >= 6 || c.mama ? 2 : 0;
  if (c.step >= 7) rec.lino = true;
  const party = [starter, ...STARTERS.filter((id) => id !== starter && rec[id])];
  if (c.mtn && c.mtn.jelly) party.push('jelly');
  const maxHearts = Math.min(12, 2 + c.level + (c.owned.heart || 0));
  const pos = {
    village: c.step >= 7 ? { x: 15 * TILE + 8, y: 3 * TILE, dir: 0 } : HOME[starter],
    cave: CAVE_SPAWN, haunted: HAUNT_SPAWN, valley: VALLEY_SPAWN, under: { x: 25 * TILE, y: 18 * TILE, dir: 2 },
    mountain: MOUNTAIN_SPAWN, lair: LAIR_SPAWN,
  }[c.mapId];
  const dugCells = [];
  if (c.cave.dug) dugCells.push('15,17');
  if (c.cave.secret) dugCells.push('11,19');
  return {
    v: 1, mapId: c.mapId, x: pos.x, y: pos.y, dir: pos.dir, party,
    stats: { level: c.level, xp: c.xp, maxHearts, hearts: maxHearts },
    step: c.step, owned: c.owned, diamonds: c.diamonds, ammo: c.ammo, hasCloak: c.hasCloak,
    cave: { ...c.cave, taken: [], dugCells }, haunt: { ...c.haunt, taken: [] },
    valley: { ...(c.valley || {}), edits: [], taken: [] },
    mtn: { ...(c.mtn || {}), taken: [] },
    starter, rec, mama, hasCloak: c.hasCloak || mama === 2,
    quizIntro: true, seenHints: { felixTalk: true },
  };
}

function toggleMusic() {
  Music.toggle();
  sfx.blip();
  if (game.state === 'play') fx.toast(`Musik: ${Music.label()}`, 1.5);
}

// Welches Musikstück gerade passt
function currentSong() {
  if (!game || game.state !== 'play') return 'title';
  const m = map(), L = leader();
  const boss = m.enemies && m.enemies.find((e) => e.alive && (e.type === 'trollboss' || e.type === 'rockboss'));
  if (boss && m.arena) {
    const a = m.arena;
    if (L.x > a.x0 - 16 && L.x < a.x1 + 16 && L.y > a.y0 - 16 && L.y < a.y1 + 16) return 'boss';
  }
  return MAP_SONG[game.mapId] || 'village';
}

function cycleTilt() {
  Tilt.cycle();
  Tilt.saveSetting();
  sfx.blip();
  if (game.state === 'play') fx.toast(`3D-Ansicht: ${Tilt.levelLabel()}`, 1.5);
}

function openPause(opts) { game.ui = new PauseUI(game, fx, PAUSE_API, opts); }

// --- Kapitelauswahl ------------------------------------------------------------------

export const CHAPTERS = [
  { n: 1, name: 'Die Gefährten' },
  { n: 2, name: 'Die Höhle im Buttenberg' },
  { n: 3, name: 'Das Spukhaus' },
  { n: 4, name: 'Das Tal der Trolle' },
  { n: 5, name: 'Der Bergpfad' },
];

// Startet ein Kapitel mit allem, was man bis dahin normalerweise hätte
function startChapter(n, starter = 'theo') {
  if (n === 1) { beginNew(starter); return; }
  const allBasic = { shield: true, strength: true, dig: true, invis: true, sling: true, shovel: true };
  const caveDone = { dug: true, boulder: true, key: true, door: true, statue: true, troll: true, lever: true, secret: false, done: true };
  const hauntDone = { gate: true, front: true, count: true, chest: true, lib: true, candles: true, king: true, door6: true, done: true, target: 19 };
  const preset = {
    2: { mapId: 'cave', level: 4, diamonds: 20, cave: {}, haunt: { target: 19 } },
    3: { mapId: 'haunted', level: 6, diamonds: 25, cave: caveDone, haunt: { target: 5 + Math.floor(Math.random() * 27) } },
    4: { mapId: 'valley', level: 7, diamonds: 30, cave: caveDone, haunt: hauntDone },
    5: { mapId: 'mountain', level: 9, diamonds: 35, cave: caveDone, haunt: hauntDone, owned: { ...allBasic, sword: true, shield2: true },
      valley: { sword: true, key: true, lever: true, door: true, troll: true, done: true } },
  }[n];
  newGame(starter);
  applySave(fromCode({ step: 7, hasCloak: true, owned: allBasic, ammo: 30, xp: 0, valley: {}, starter, ...preset }));
  game.titleCache = null;
  sfx.start();
  const c = CHAPTERS[n - 1];
  fx.banner(`KAPITEL ${n}`, c.name, '#ffb040');
  save();
}

// Erst Kapitel, dann Startfigur wählen
function pickStarter(then) {
  game.ui = new StarterUI(game, fx, then);
}

function startFromTitle(id) {
  if (id === 'load') { sfx.confirm(); openPause({ fromTitle: true }); return; }
  if (id === 'chapters') {
    sfx.confirm();
    game.ui = new ChapterUI(game, fx, CHAPTERS, (n) => pickStarter((st) => startChapter(n, st)));
    return;
  }
  if (id === 'new') { sfx.confirm(); pickStarter(beginNew); return; }
  sfx.start();
  if (id === 'continue') {
    applySave(loadGame());
    fx.toast(`Willkommen zurück! Du hast ${game.diamonds} Diamanten.`, 3);
  }
}

const OTHERS_TEXT = {
  theo: 'Theo muss Felix, Ferdinand und Lino überzeugen – und Mama, damit sein kleiner Bruder Friedrich mitdarf.',
  felix: 'Felix muss Theo, Ferdinand und Lino überzeugen – und Theos Mama, damit Friedrich mitdarf.',
  ferdinand: 'Ferdinand muss Theo, Felix und Lino überzeugen – und Theos Mama, damit Friedrich mitdarf.',
  friedrich: 'Friedrich muss Theo, Felix, Ferdinand und Lino überzeugen – und Mama, damit er überhaupt mitdarf!',
  lino: 'Lino muss Theo, Felix und Ferdinand überzeugen – und Theos Mama, damit Friedrich mitdarf.',
};

function beginNew(starter) {
  newGame(starter);
  sfx.start();
  game.state = 'play';
  game.mapId = 'village';
  const name = HEROES[starter].name;
  dialog.open([
    `Ein sonniger Morgen in Lindental. ${name} hat einen großen Plan:`,
    'Der böse Drache am Buttenberg muss besiegt werden! Aber dafür braucht es Freunde – und Fähigkeiten.',
    OTHERS_TEXT[starter],
    'Fähigkeiten gibt es in Brunos Laden. Bezahlt wird mit Diamanten – die verdienst du in der Schule!',
    'Schule und Laden sind im Süden des Dorfes. Laufen: Pfeile/WASD. Reden: Leertaste oder A. Fähigkeit: J oder B.',
  ]);
  save();
}

function updateTimers(dt) {
  game.shieldT = Math.max(0, game.shieldT - dt);
  game.shieldCD = Math.max(0, game.shieldCD - dt);
  game.hurtT = Math.max(0, game.hurtT - dt);
  game.swingT = Math.max(0, game.swingT - dt);
  game.sprintT = Math.max(0, game.sprintT - dt);
  game.sprintCD = Math.max(0, game.sprintCD - dt);
  game.linoCD = Math.max(0, game.linoCD - dt);
  if (game.linoT > 0) { game.linoT -= dt; if (game.linoT <= 0) { game.linoT = 0; sfx.invisOff(); } }
  if (game.toast && (game.toast.t -= dt) <= 0) game.toast = null;
  if (game.invisT > 0) {
    game.invisT -= dt;
    if (game.invisT <= 0) endInvisibility();
  }
}

function updateLeader(dt) {
  const L = leader();
  if (game.jumpT > 0) { updateJump(L, dt); return; }
  if (game.actT > 0) { game.actT -= dt; L.moving = false; return; }
  if (input.swapPressed) { switchLeader(); return; }
  if (input.bPressed) { useAbility(); return; }
  if (input.aPressed) { interact(); return; }

  const ix = input.dir.x, iy = input.dir.y;
  L.moving = false;
  if (ix || iy) {
    if (ix && !iy) L.dir = ix < 0 ? 2 : 3;
    else if (iy && !ix) L.dir = iy < 0 ? 1 : 0;
    else {
      const h = ix < 0 ? 2 : 3, v = iy < 0 ? 1 : 0;
      if (L.dir !== h && L.dir !== v) L.dir = v;
    }
    const len = Math.hypot(ix, iy);
    const sp = SPEED * dt * (game.shieldT > 0 ? 0.6 : game.sprintT > 0 ? 1.9 : 1);
    if (move(L, (ix / len) * sp, (iy / len) * sp, true)) {
      L.moving = true;
      L.anim += dt;
      pushTrail(L);
    }
  }
  if (game.invisT <= 0) snapFollowers(); // unsichtbar schleicht Friedrich allein
}

function frontPoint(e, dist) {
  const [dx, dy] = DIRV[e.dir];
  return { x: e.x + 8 + dx * dist, y: e.y + 11 + dy * dist };
}
const frontTile = (e, dist = 12) => {
  const f = frontPoint(e, dist);
  return { tx: Math.floor(f.x / TILE), ty: Math.floor(f.y / TILE), f };
};
const inBox = (pt, x, y, w, h) => pt.x >= x && pt.x < x + w && pt.y >= y && pt.y < y + h;
const npcAt = (pt) => map().npcs.find((n) => inBox(pt, n.x - 1, n.y - 2, 18, 22)) || null;
const open = (d) => dialog.open(d.lines, d.after);

function interact() {
  const L = leader();
  const m = map();
  const { tx, ty, f } = frontTile(L);

  let n = npcAt(f);
  if (!n && m.isCounter(tx, ty)) n = npcAt(frontPoint(L, 30));
  if (n) {
    if (n.id !== 'troll') n.dir = OPPOSITE[L.dir];
    open(talkTo(n, game, fx));
    return;
  }

  if (m.isLever && m.isLever(tx, ty)) { pullLever(); return; }
  if (m.chest && m.chest.x === tx && m.chest.y === ty) { openChest(); return; }
  if (m.id === 'haunted') {
    const c = m.candles.find((k) => k.x === tx && k.y === ty);
    if (c) { toggleCandle(c); return; }
    const rd = m.riddleAt(tx, ty);
    if (rd) {
      const [id] = rd;
      if (id === 'candles') {
        dialog.open([`Auf der Tür steht: "Zeige die ${game.haunt.target} mit den Kerzen!"`, 'Darunter: 16 – 8 – 4 – 2 – 1. Bit, das kleine Gespenst, erklärt dir, wie das geht.']);
      } else openRiddle(id);
      return;
    }
  }
  if (m.id === 'village' && tx === 24 && ty === 7 && !game.rec.ferdinand && m.tile(24, 9) !== T.BOULDER) { open(ferdinandDoor(game, fx)); return; }
  if (m.id === 'village' && m.tile(tx, ty) === T.BUSH && theoHiding()) {
    if (tx === THEO_BUSH.x && ty === THEO_BUSH.y) revealTheo();
    else { sfx.bump(); float('Raschel ...', tx * TILE + 8, ty * TILE - 4, '#ffffff'); fx.toast('Hier versteckt sich niemand.', 1.5); }
    return;
  }
  if (m.id === 'lair' && m.cage && !m.cage.open && ty === 3 && (tx === 12 || tx === 13)) { open(jellyTalk()); return; }

  const text = m.textAt(tx, ty);
  if (text) { dialog.open(text); return; }
  const t = m.tile(tx, ty);
  if (t === T.GATE) dialog.open(['Das Tor zum Buttenberg ist fest verschlossen.', 'Der Hebel dafür ist gleich daneben – direkt vor Konrads Nase.']);
  else if (t === T.BOULDER) dialog.open(['Ein riesiger Felsbrocken. Dafür braucht man Felix\' Superstärke!']);
  else if (t === T.CHASM) dialog.open(game.party.some((p) => p.id === 'jelly')
    ? ['Eine tiefe Schlucht! Jelly nach vorne holen und mit B hinüberspringen – die anderen klettern hinterher.']
    : ['Eine tiefe Schlucht! Viel zu breit für Kinder ... Nur wer richtig gut springen kann, kommt hier rüber.']);
  else if (t === T.LOCKED && m.id === 'lair') {
    if (game.mtn.key) {
      m.setTile(tx, ty, T.CFLOOR);
      sfx.door();
      fx.toast('Der Schlüssel aus der Bergkammer passt!', 3);
    } else dialog.open(['Eine verschlossene Felsentür. Den Schlüssel haben die Bergtrolle bestimmt irgendwo am Pfad versteckt.']);
  }
  else if (t === T.DIG || t === T.EWALL) dialog.open(['Lockere Erde. Hier könnte Ferdinand graben...']);
  else if (t === T.LOCKED && m.id === 'valley') {
    if (game.valley.key) {
      editTile(m, tx, ty, T.PATH);
      game.valley.door = true;
      sfx.door();
      fx.toast('Der Schlüssel passt! Die Felsentür ist offen.', 3);
      save();
    } else dialog.open(['Eine schwere Felsentür mit Schlüsselloch. Der Schlüssel liegt bestimmt irgendwo in der Unterwelt.']);
  } else if (t === T.LOCKED && m.id === 'haunted') {
    if (game.haunt.king) {
      m.setTile(tx, ty, T.WOOD);
      game.haunt.door6 = true;
      sfx.door();
      fx.toast('Der Mondschlüssel passt! Die Turmtür ist offen.', 3);
      save();
    } else dialog.open(['Eine Tür mit silbernem Mondschloss. Graf Kürbis hat bestimmt den Schlüssel.']);
  } else if (t === T.LOCKED) {
    if (game.cave.key) {
      m.setTile(tx, ty, T.CFLOOR);
      game.cave.door = true;
      sfx.door();
      fx.toast('Klick! Der Schlüssel passt.', 2.5);
    } else dialog.open(['Eine Tür mit goldenem Schloss. Ihr braucht einen Schlüssel.']);
  } else if (t === T.BARS) dialog.open(['Ein schweres Gittertor. Irgendwo muss ein Hebel sein...']);
}

function pullLever() {
  const m = map();
  if (m.lever.pulled) { dialog.open(['Der Hebel ist schon umgelegt.']); return; }
  if (m.id === 'valley') {
    m.openGate();
    game.valley.lever = true;
    sfx.door();
    fx.banner('DAS GITTER IST OFFEN', 'Jetzt nur noch am Troll vorbei ...', '#a8f070');
    fx.gainXP(10);
    save();
    return;
  }
  if (m.id === 'cave') {
    m.lever.pulled = true;
    m.setTile(2, 9, T.CFLOOR);
    game.cave.lever = true;
    sfx.door();
    fx.toast('Rumms! Das Gittertor ist offen.', 3);
    fx.gainXP(10);
    save();
    return;
  }
  if (!allHeroes(game) || game.mama < 2) {
    dialog.open([`${HEROES[leader().id].name}: Psst! Noch nicht – erst müssen alle fünf dabei sein.`, `Quest: ${questHint(game).replace(/^Quest: /, '')}`]);
    return;
  }
  open({
    lines: leverDialog(game),
    after() {
      m.openGate();
      game.step = 7;
      sfx.item();
      fx.banner('KAPITEL 1 GESCHAFFT!', 'Auf zur Höhle im Buttenberg', '#a8f070');
      fx.gainXP(20);
      endInvisibility();
      save();
    },
  });
}

// --- Spezialfähigkeiten (müssen gekauft sein) ---------------------------------------

function needBuy(id) {
  sfx.bump();
  float('Laden!', leader().x + 8, leader().y - 6, '#ffb0b0');
  fx.toast(`${ABILITY_NAME[id]} gibt es in Brunos Laden. Diamanten verdienst du in der Schule!`, 4);
}

function useAbility() {
  const L = leader();
  const o = game.owned;
  const { tx, ty } = frontTile(L);
  const m = map();
  const t = m.tile(tx, ty);
  switch (L.id) {
    case 'theo':
      if (o.sword && enemyInFront(L)) return swordSwing(L);
      if (!o.shield) return needBuy('shield');
      if (game.shieldCD > 0) return;
      game.shieldT = o.shield2 ? 1.5 : 0.8;
      game.shieldCD = game.shieldT + 0.2;
      sfx.shield();
      return;

    case 'felix':
      if (t === T.BOULDER || t === T.BUSH) {
        if (!o.strength) return needBuy('strength');
        return felixStrength(L, tx, ty, t);
      }
      if (o.sling) {
        if (game.ammo <= 0) { sfx.bump(); fx.toast('Keine Kastanien mehr! Bruno verkauft Nachschub.', 3); return; }
        game.ammo--;
        game.actT = 0.15;
        sfx.swing();
        const [dx, dy] = DIRV[L.dir];
        game.projectiles.push({ x: L.x + 8 + dx * 6, y: L.y + 9 + dy * 6, vx: dx * 170, vy: dy * 170, kind: 'nut', owner: 'player', t: 1.2 });
        return;
      }
      if (!o.strength) return needBuy('strength');
      game.actT = 0.25; sfx.swing(); float('Hau-Ruck!', L.x + 8, L.y - 6, '#ffffff');
      return;

    case 'ferdinand': {
      const lino = m.id === 'village' && npcAt(frontPoint(L, 12));
      if (lino && lino.id === 'lino' && lino.stuck) {
        if (!o.dig) return needBuy('dig');
        game.actT = 0.3;
        sfx.dig();
        burst(lino.x + 8, lino.y + 14, DIRT, 16);
        open({
          lines: ['*buddel buddel*', 'Lino: Frei! Meine Beine sind wieder da! Danke, Ferdinand!', 'Lino: Und jetzt: ab zum Drachen. Ich bin dabei!'],
          after() {
            game.rec.lino = true;
            fx.join('lino');
            sfx.item();
            fx.banner('LINO IST DABEI', 'B: Spaghetti-Beine (Laden)', '#a8f070');
            fx.gainXP(15);
          },
        });
        return;
      }
    }
    // falls through
    case 'ferdinand-dig':
      if (t === T.DIG || t === T.DIGFENCE || t === T.EWALL) {
        if (!o.dig) return needBuy('dig');
        return ferdinandDig(L, tx, ty, t);
      }
      if (o.shovel) return ferdinandSwing(L);
      if (!o.dig) return needBuy('dig');
      game.actT = 0.3; sfx.bump(); float('Zu hart!', L.x + 8, L.y - 6, '#ffb0b0');
      return;

    case 'jelly': {
      const [dx, dy] = DIRV[L.dir];
      const t1 = m.tile(tx, ty);
      const lx = L.x + dx * 32, ly = L.y + dy * 32;
      if (t1 === T.CHASM && !wallHit(lx, ly)) {
        game.jumpT = 0.45;
        game.jump = { x0: L.x, y0: L.y, x1: lx, y1: ly };
        sfx.swing();
        float('Hopp!', L.x + 8, L.y - 6, '#ffffff');
        return;
      }
      if (t1 === T.CHASM) { sfx.bump(); float('Zu weit!', L.x + 8, L.y - 6, '#ffb0b0'); return; }
      if (game.sprintCD > 0) return;
      game.sprintT = 1.4;
      game.sprintCD = 2.2;
      sfx.swap();
      float('Sprint!', L.x + 8, L.y - 6, '#88f0ff');
      return;
    }

    case 'lino':
      if (!o.legs) return needBuy('legs');
      if (game.linoT > 0) { game.linoT = 0; game.linoCD = 1.5; sfx.invisOff(); return; }
      if (game.linoCD > 0) return;
      game.linoT = 7;
      game.linoCD = 10;
      sfx.invisOn();
      float('Spaghetti-Beine!', L.x + 8, L.y - 18, '#f8d848');
      return;

    case 'friedrich':
      if (!o.invis) return needBuy('invis');
      if (game.invisT > 0) { endInvisibility(); return; }
      game.invisT = INVIS_TIME;
      sfx.invisOn();
      float('Psst...', L.x + 8, L.y - 6, '#d0c8ff');
  }
}

function endInvisibility(silent) {
  if (game.invisT <= 0 && leader().id !== 'friedrich') return;
  const was = game.invisT > 0;
  game.invisT = 0;
  if (!was) return;
  if (!silent) sfx.invisOff();
  snapFollowers();
  for (const f of game.party.slice(1)) poof(f.x + 8, f.y + 10);
}

function felixStrength(L, tx, ty, t) {
  game.actT = 0.25;
  const m = map();
  const [dx, dy] = DIRV[L.dir];
  if (t === T.BOULDER) {
    if (m.pushBoulder(tx, ty, dx, dy, occupied)) {
      sfx.push();
      burst(tx * TILE + 8 + dx * 8, ty * TILE + 14, ['#c8b49a', '#9c8670'], 8);
      float('Hau-Ruck!', L.x + 8, L.y - 6, '#ffffff');
      if (m.id === 'cave' && !game.cave.boulder) { game.cave.boulder = true; fx.gainXP(5); save(); }
      if (m.id === 'haunted' && !game.haunt.chest) { game.haunt.chest = true; fx.gainXP(5); save(); }
      if (m.id === 'mountain' && !game.mtn.rocks) { game.mtn.rocks = true; fx.gainXP(5); save(); }
      if (m.id === 'valley' || m.id === 'under') {
        game.valley.edits.push([m.id, tx, ty, m.tile(tx, ty)], [m.id, tx + dx, ty + dy, T.BOULDER]);
        fx.gainXP(3);
        save();
      }
    } else { sfx.bump(); float('Klemmt!', L.x + 8, L.y - 6, '#ffb0b0'); }
    return;
  }
  m.setTile(tx, ty, T.GRASS);
  if (m.id === 'village' && tx === THEO_BUSH.x && ty === THEO_BUSH.y && theoHiding()) revealTheo();
  game.bushes++;
  sfx.push();
  burst(tx * TILE + 8, ty * TILE + 8, [COL.bush, COL.bushL]);
  fx.gainXP(3, tx * TILE + 8, ty * TILE);
}

const TREASURES = ['Ein glänzender Kiesel!', 'Ein alter Knopf!', 'Eine Murmel!'];
const DIRT = ['#a0703e', '#7a5030', '#c89060'];

function ferdinandDig(L, tx, ty, t) {
  game.actT = 0.3;
  const m = map();
  sfx.dig();
  if (t === T.DIG && m.id === 'mountain') {
    m.setTile(tx, ty, T.HOLE);
    burst(tx * TILE + 8, ty * TILE + 8, DIRT);
    float('Eine Falle!', tx * TILE + 8, ty * TILE - 6, '#ffffff');
  } else if (t === T.DIG) {
    m.setTile(tx, ty, T.HOLE);
    burst(tx * TILE + 8, ty * TILE + 8, DIRT);
    // Manchmal steckt ein Diamant in der Erde
    if (game.treasures % 3 === 1) { game.diamonds++; float('+1 Diamant!', tx * TILE + 8, ty * TILE - 6, '#88f0ff'); }
    else float(TREASURES[game.treasures % TREASURES.length], tx * TILE + 8, ty * TILE - 6, '#ffffff');
    game.treasures++;
    fx.gainXP(5, tx * TILE + 8, ty * TILE + 4);
  } else if (t === T.DIGFENCE) {
    m.setTile(tx, ty, T.TUNNEL);
    burst(tx * TILE + 8, ty * TILE + 12, DIRT, 14);
    float('Tunnel!', tx * TILE + 8, ty * TILE - 6, '#ffffff');
    fx.gainXP(5);
  } else if (t === T.EWALL && m.id === 'mountain') {
    m.setTile(tx, ty, T.GRASS);
    game.mtn.wall = true;
    burst(tx * TILE + 8, ty * TILE + 10, DIRT, 16);
    float('Durchgebuddelt!', tx * TILE + 8, ty * TILE - 6, '#ffffff');
    fx.gainXP(5);
    save();
  } else if (t === T.EWALL && m.id !== 'cave') {
    editTile(m, tx, ty, T.CFLOOR);
    burst(tx * TILE + 8, ty * TILE + 10, DIRT, 16);
    float('Durchgebuddelt!', tx * TILE + 8, ty * TILE - 6, '#ffffff');
    fx.gainXP(4);
    save();
  } else if (t === T.EWALL) {
    m.setTile(tx, ty, T.CFLOOR);
    game.cave.dugCells.push(`${tx},${ty}`);
    burst(tx * TILE + 8, ty * TILE + 10, DIRT, 16);
    if (tx === 11 && ty === 19) {
      game.cave.secret = true;
      fx.banner('GEHEIMGANG!', 'Ferdinand findet einen Geheimraum', '#88e0ff');
      fx.gainXP(10);
    } else {
      if (!game.cave.dug) fx.gainXP(5);
      game.cave.dug = true;
      float('Durchgebuddelt!', tx * TILE + 8, ty * TILE - 6, '#ffffff');
    }
    save();
  }
}

const BIG = new Set(['trollboss', 'rockboss']);

function enemyInFront(L) {
  const f = frontPoint(L, 11);
  return map().enemies.some((e) => e.alive && Math.hypot(e.x + 8 - f.x, e.y + 10 - f.y) < (BIG.has(e.type) ? 22 : 17));
}

function swordSwing(L) {
  game.actT = 0.22;
  game.swingT = 0.25;
  game.swingKind = 'sword';
  sfx.swing();
  const f = frontPoint(L, 12);
  const [dx, dy] = DIRV[L.dir];
  for (const e of map().enemies) {
    if (e.alive && Math.hypot(e.x + 8 - f.x, e.y + 10 - f.y) < (BIG.has(e.type) ? 24 : 18)) damageEnemy(e, 2, dx * 12, dy * 12, 'sword');
  }
}

function ferdinandSwing(L) {
  game.actT = 0.25;
  game.swingT = 0.25;
  game.swingKind = 'shovel';
  sfx.swing();
  const f = frontPoint(L, 12);
  for (const e of map().enemies) {
    if (!e.alive) continue;
    if (Math.hypot(e.x + 8 - f.x, e.y + 10 - f.y) < 16) {
      const [dx, dy] = DIRV[L.dir];
      damageEnemy(e, 2, dx * 14, dy * 14, 'shovel');
    }
  }
}

// --- Gegner, Geschosse, Statue, Troll ---------------------------------------------

const linoTall = () => game.linoT > 0 && leader().id === 'lino';

function hurt(n) {
  if (game.hurtT > 0 || game.faintT > 0 || linoTall()) return;
  const st = game.stats;
  st.hearts -= n;
  game.hurtT = 1;
  sfx.hurt();
  if (st.hearts > 0 || game.challenge.active) return;
  if (['cave', 'haunted', 'valley', 'under', 'mountain', 'lair'].includes(game.mapId)) {
    st.hearts = 0;
    game.faintT = 1.6;
    game.invisT = 0;
    fx.toast('Puh! Die Gruppe ist erschöpft... zurück zum letzten Rastplatz.', 2.5);
  } else st.hearts = 1;
}

function respawn() {
  let cp = game.checkpoint;
  if (!cp || cp.map !== game.mapId) cp = { haunted: HAUNT_SPAWN, valley: VALLEY_SPAWN, mountain: MOUNTAIN_SPAWN, lair: LAIR_SPAWN }[game.mapId] || CAVE_SPAWN;
  const L = leader();
  L.x = cp.x; L.y = cp.y; L.dir = cp.dir;
  regroup();
  game.stats.hearts = game.stats.maxHearts;
  game.projectiles = [];
  game.hurtT = 1.5;
}

// Quellen: sword, shovel, nut, fire, bomb, rock
function damageEnemy(e, dmg, kx = 0, ky = 0, src = 'nut') {
  if (e.type === 'guard' && !['sword', 'fire', 'bomb', 'rock'].includes(src)) {
    sfx.clang();
    float('Kling!', e.x + 8, e.y - 4, '#c8c8d8');
    if (!game.seenHints.armor) { game.seenHints.armor = true; fx.toast('Die Rüstung ist zu hart! Nur ein Schwert hilft – im Tal liegt ein Schatz ...', 4); }
    return;
  }
  if (e.type === 'rockmon') {
    if (e.asleep) wake(e);
    if (src === 'nut') {
      sfx.clang();
      float('Kling!', e.x + 8, e.y - 4, '#c8c8d8');
      if (!game.seenHints.stone) { game.seenHints.stone = true; fx.toast('Kastanien prallen vom Stein ab! Schwert oder Schaufel helfen.', 3); }
      return;
    }
  }
  if (e.type === 'rockboss') {
    if (e.mode !== 'stuck') {
      sfx.clang();
      float('HARR!', e.x + 8, e.y - 20, '#ffb0b0');
      if (!game.seenHints.boss) { game.seenHints.boss = true; fx.toast('Zu hart! Lockt das Felsmonster in ein Loch, das Ferdinand gräbt.', 3.5); }
      return;
    }
    dmg = src === 'sword' ? 2 : 1;
  }
  if (e.type === 'trollboss') {
    if (src === 'rock' || src === 'bomb') {
      e.stunT = 3;
      dmg = 1;
      fx.toast('Der Troll ist benommen! Schnell, angreifen!', 2);
    } else if (e.stunT <= 0) {
      sfx.clang();
      float('HOHO!', e.x + 8, e.y - 12, '#ffb0b0');
      return;
    } else dmg = 1;
  }
  e.hp -= dmg;
  e.hurtT = 0.25;
  moveEnemy(e, kx, ky);
  if (e.hp > 0) { sfx.hit(); return; }
  if (e.type === 'trollboss') { trollDefeated(e); return; }
  if (e.type === 'rockboss') { rockBossDefeated(e); return; }
  e.alive = false;
  game.kills++;
  sfx.pop();
  burst(e.x + 8, e.y + 8, CONFETTI, 18, 60);
  fx.gainXP({ slime: 3, kobold: 6, bat: 2, guard: 6, bomber: 5, mtroll: 5, rockmon: 6 }[e.type] || 3, e.x + 8, e.y);
  if (e.guard && map().enemies.filter((x) => x.guard && x.alive).length === 0) {
    fx.toast('Die Wächter sind besiegt! Schnell zum Käfig!', 3);
  }
  if (e.type === 'kobold' && Math.random() < 0.6) {
    map().items.push({ id: `drop${game.dropN++}`, type: 'bag', x: e.x + 2, y: e.y + 2, taken: false, drop: true });
  }
}

function updateEnemies(dt) {
  const L = leader();
  const visible = game.invisT <= 0;
  const lx = L.x + 8, ly = L.y + 10;
  for (const e of map().enemies) {
    if (!e.alive) continue;
    e.anim += dt;
    e.hurtT = Math.max(0, e.hurtT - dt);
    e.cd -= dt;
    e.throwT = Math.max(0, e.throwT - dt);
    const dx = lx - (e.x + 8), dy = ly - (e.y + 10), d = Math.hypot(dx, dy) || 1;
    const nx = dx / d, ny = dy / d;
    const sees = visible && d < 110 && lineOfSight(e.x + 8, e.y + 10, lx, ly);

    if (e.temp) { e.life -= dt; if (e.life <= 0) { e.alive = false; poof(e.x + 8, e.y + 8); continue; } }
    if (e.type === 'guard') {
      e.flip = dx < 0;
      if (sees && (d < 56 || e.temp)) moveEnemy(e, nx * 30 * dt, ny * 30 * dt);
      else {
        // Patrouille um den Startpunkt
        const tx = e.home.x + Math.sin(e.anim * 0.6 + e.id) * 24, ty = e.home.y;
        moveEnemy(e, Math.sign(tx - e.x) * 14 * dt, Math.sign(ty - e.y) * 14 * dt);
      }
    } else if (e.type === 'bomber') {
      e.flip = dx < 0;
      if (sees) {
        if (d > 96) moveEnemy(e, nx * 20 * dt, ny * 20 * dt);
        else if (d < 56) moveEnemy(e, -nx * 24 * dt, -ny * 24 * dt);
        if (e.cd <= 0 && d < 130) {
          e.cd = 2.6;
          e.throwT = 0.3;
          sfx.swing();
          throwBomb(e.x + 8, e.y + 6, lx, ly, 'enemy', e);
        }
      }
    } else if (e.type === 'trollboss') {
      e.stunT = Math.max(0, e.stunT - dt);
      const a = map().arena;
      const inArena = L.x > a.x0 - 8 && L.x < a.x1 + 8 && L.y > a.y0 - 8 && L.y < a.y1 + 8;
      if (e.stunT <= 0 && inArena) {
        e.flip = dx < 0;
        const sp = 16 * dt;
        const nxp = Math.max(a.x0, Math.min(a.x1, e.x + nx * sp)), nyp = Math.max(a.y0, Math.min(a.y1, e.y + ny * sp));
        e.x = nxp; e.y = nyp;
        if (e.cd <= 0) {
          e.cd = 2.2;
          e.throwT = 0.4;
          sfx.push();
          game.projectiles.push({ x: e.x + 8, y: e.y + 2, vx: nx * 70, vy: ny * 70, kind: 'rock', owner: 'enemy', t: 3 });
        }
      }
      if (e.stunT > 0) continue; // benommen: keine Berührungsschäden
    } else if (e.type === 'rockboss') {
      updateRockBoss(e, dt, L, nx, ny, d);
      continue;
    } else if (e.type === 'rockmon') {
      if (e.asleep) {
        if (visible && d < (game.sprintT > 0 ? 44 : 26)) wake(e);
        continue; // schlafend: keine Berührungsschäden
      }
      e.flip = dx < 0;
      if (sees && (!e.guard || d < 90)) moveEnemy(e, nx * (e.guard ? 20 : 24) * dt, ny * (e.guard ? 20 : 24) * dt);
      else if (e.guard) moveEnemy(e, Math.sign(e.home.x - e.x) * 12 * dt, Math.sign(e.home.y - e.y) * 12 * dt);
    } else if (e.type === 'mtroll') {
      e.flip = dx < 0;
      if (sees && d < 80) moveEnemy(e, nx * 28 * dt, ny * 28 * dt);
      else moveEnemy(e, Math.cos(e.anim * 0.8 + e.id) * 12 * dt, Math.sin(e.anim * 0.6 + e.id) * 8 * dt);
    } else if (e.type === 'bat') {
      const wob = Math.sin(e.anim * 5 + e.id) * 30;
      if (sees && d < 90) moveEnemy(e, (nx * 38 - ny * wob * 0.5) * dt, (ny * 38 + nx * wob * 0.5) * dt);
      else moveEnemy(e, Math.cos(e.anim * 1.3 + e.id) * 22 * dt, Math.sin(e.anim * 2.1 + e.id) * 14 * dt);
    } else if (e.type === 'slime') {
      const hop = Math.sin(e.anim * 7) > 0;
      if (sees && hop) moveEnemy(e, nx * 34 * dt, ny * 34 * dt);
      else if (!sees && hop) moveEnemy(e, Math.cos(e.anim * 0.7 + e.id) * 10 * dt, Math.sin(e.anim * 0.9 + e.id) * 10 * dt);
    } else {
      e.flip = dx < 0;
      if (sees) {
        if (d > 72) moveEnemy(e, nx * 26 * dt, ny * 26 * dt);
        else if (d < 44) moveEnemy(e, -nx * 30 * dt, -ny * 30 * dt);
        if (e.cd <= 0) {
          e.cd = 2.2 + Math.random();
          e.throwT = 0.3;
          sfx.fire();
          game.projectiles.push({ x: e.x + 8, y: e.y + 8, vx: nx * 72, vy: ny * 72, kind: 'fire', owner: 'enemy', t: 3.5 });
        }
      }
    }
    if (visible && !linoTall() && overlap(L.x + 3, L.y + 6, 10, 9, e.x + 3, e.y + 6, 10, 9)) {
      hurt(1);
      move(L, nx * 10, ny * 10, false);
    }
  }
}

function lineOfSight(x0, y0, x1, y1) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6);
  for (let i = 1; i < n; i++) if (solidAt(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n)) return false;
  return true;
}

function throwBomb(x, y, tx, ty, owner, thrower) {
  const d = Math.hypot(tx - x, ty - y) || 1;
  const sp = 75;
  game.projectiles.push({ kind: 'bomb', owner, x, y, tx, ty, vx: ((tx - x) / d) * sp, vy: ((ty - y) / d) * sp, fly: d / sp, fuse: -1, t: 9, from: thrower });
}

function explode(p) {
  const m = map(), L = leader();
  p.t = 0;
  sfx.boom();
  burst(p.x, p.y, ['#ffd040', '#ff7a20', '#5a5a6a', '#ffffff'], 26, 80);
  if (Math.hypot(L.x + 8 - p.x, L.y + 10 - p.y) < 22) hurt(1);
  for (const e of m.enemies) if (e.alive && Math.hypot(e.x + 8 - p.x, e.y + 10 - p.y) < 24) damageEnemy(e, 2, 0, 0, 'bomb');
  const tx0 = Math.floor((p.x - 22) / TILE), tx1 = Math.floor((p.x + 22) / TILE);
  const ty0 = Math.floor((p.y - 22) / TILE), ty1 = Math.floor((p.y + 22) / TILE);
  let cracked = false;
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (m.tile(tx, ty) !== T.CRACK) continue;
    if (Math.hypot(tx * TILE + 8 - p.x, ty * TILE + 8 - p.y) > 26) continue;
    editTile(m, tx, ty, m.theme === 'valley' ? T.GRASS : T.CFLOOR);
    burst(tx * TILE + 8, ty * TILE + 8, ['#8a7866', '#b4a48e', '#5e4e40'], 12, 60);
    cracked = true;
  }
  if (cracked) { fx.toast('BUMM! Der Fels ist weg!', 2); fx.gainXP(4); save(); }
}

function updateBomb(p, dt) {
  const L = leader();
  if (p.fly > 0) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.fly -= dt;
    if (p.owner === 'enemy' && Math.hypot(p.x - (L.x + 8), p.y - (L.y + 10)) < 9 && L.id === 'theo' && game.shieldT > 0) {
      // Zurückwerfen: fliegt zum Werfer zurück
      sfx.block();
      const t = p.from;
      const tx = t ? t.x + 8 : p.x - p.vx, ty = t ? t.y + 10 : p.y - p.vy;
      const d = Math.hypot(tx - p.x, ty - p.y) || 1;
      p.vx = ((tx - p.x) / d) * 110; p.vy = ((ty - p.y) / d) * 110; p.fly = d / 110; p.owner = 'player';
      return;
    }
    if (p.fly <= 0) p.fuse = 1.4;
    return;
  }
  p.fuse -= dt;
  if (p.fuse <= 0) explode(p);
}

function updateProjectiles(dt) {
  const L = leader();
  const m = map();
  for (const p of game.projectiles) {
    if (p.kind === 'bomb') { updateBomb(p, dt); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt;
    const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);

    if (m.statue && m.statue.alive && tx === m.statue.x && ty === m.statue.y && p.owner === 'player') {
      p.t = 0;
      if (p.kind === 'fire') {
        m.killStatue();
        if (m.id === 'mountain') game.mtn.statue = true; else game.cave.statue = true;
        sfx.pop();
        burst(p.x, p.y, ['#8a8078', '#ff9a20', '#6e665e', '#ffd060'], 26, 70);
        fx.banner('STATUE ZERSTÖRT!', 'Theo hat das Feuer zurückgeworfen', '#a8f070');
        fx.gainXP(10);
        save();
      } else fx.toast('Pling! Kastanien prallen am Stein ab.', 2);
      continue;
    }
    if (p.owner !== 'statue-start' && m.isSolidTile(tx, ty)) {
      p.t = 0;
      burst(p.x, p.y, p.kind === 'nut' ? ['#7a3a12'] : p.kind === 'rock' ? ['#9c8670', '#6e5a48'] : ['#ffb040', '#ff6020'], 4, 30);
      continue;
    }
    if (p.owner === 'enemy') {
      if (Math.hypot(p.x - (L.x + 8), p.y - (L.y + 10)) < 8 && !linoTall()) {
        const shield = L.id === 'theo' && game.shieldT > 0;
        if (p.challenge) {
          p.t = 0;
          if (shield) { sfx.block(); burst(p.x, p.y, ['#a8e8ff', '#ffffff'], 6, 40); fx.gainXP(2, L.x + 8, L.y - 4); }
          else { p.hitPlayer = true; hurt(1); }
        } else if (shield) {
          p.vx *= -1.5; p.vy *= -1.5; p.owner = 'player'; p.reflected = true; p.t = 3;
          sfx.block();
          burst(p.x, p.y, ['#a8e8ff', '#ffffff'], 6, 40);
        } else { p.t = 0; hurt(1); }
      }
      continue;
    }
    // Geschoss des Spielers
    for (const e of m.enemies) {
      if (e.alive && Math.hypot(p.x - (e.x + 8), p.y - (e.y + 10)) < 9) {
        p.t = 0;
        const vl = Math.hypot(p.vx, p.vy) || 1;
        damageEnemy(e, p.kind === 'fire' ? 3 : p.kind === 'rock' ? 2 : 1, (p.vx / vl) * 6, (p.vy / vl) * 6, p.kind);
        break;
      }
    }
    const troll = m.npcs.find((n) => n.id === 'troll');
    if (p.t > 0 && troll && Math.hypot(p.x - (troll.x + 8), p.y - (troll.y + 6)) < 12) {
      p.t = 0;
      fx.toast('Troll: HOHOHO! Das kitzelt!', 2);
    }
  }
  // Kastanienprobe: jede Kastanie, die nicht getroffen hat, zählt (abgewehrt oder ausgewichen)
  for (const p of game.projectiles) if (p.challenge && p.t <= 0 && !p.hitPlayer && game.challenge.active) game.challenge.blocked++;
  game.projectiles = game.projectiles.filter((p) => p.t > 0);
}

function updateStatue(dt) {
  const m = map();
  if (!m.statue || !m.statue.alive) return;
  m.statue.cd = (m.statue.cd ?? 1) - dt;
  const L = leader();
  const tx = Math.floor((L.x + 8) / TILE), ty = Math.floor((L.y + 12) / TILE);
  if (tx === m.statue.x && ty > m.statue.y && ty <= m.statue.y + 5 && m.statue.cd <= 0) {
    m.statue.cd = 1.7;
    sfx.fire();
    game.projectiles.push({ x: m.statue.x * TILE + 8, y: m.statue.y * TILE + 18, vx: 0, vy: 80, kind: 'fire', owner: 'enemy', t: 3 });
  }
}

function updateTroll() {
  const m = map();
  if (m.id !== 'cave' || game.cave.troll) return;
  const troll = m.npcs.find((n) => n.id === 'troll');
  const L = leader();
  if (L.x < 5 * TILE) {
    game.cave.troll = true;
    fx.toast('Geschafft! Der Troll hat nichts gemerkt.', 3);
    fx.gainXP(10);
    save();
    return;
  }
  const d = Math.hypot(L.x - troll.x, L.y - troll.y);
  if (game.invisT <= 0 && d < 60) {
    L.x = 15 * TILE; L.y = 4 * TILE; L.dir = 0;
    regroup();
    sfx.push();
    troll.anim = 0;
    game.trollAngry = 1.2;
    dialog.open(L.id === 'friedrich'
      ? ['Troll: GRRR! Dich sehe ich doch, Kleiner! Zurück mit dir!']
      : ['Troll: GRRR! Hier kommt keiner durch, den ich sehe!', 'Theo: Den sehen wir nicht so schnell wieder... Ob Friedrich sich vorbeischleichen kann?']);
  }
}

// --- Felix' Kastanienprobe (Dorf) -------------------------------------------------

function updateChallenge(dt) {
  const ch = game.challenge;
  if (!ch.active || game.mapId !== 'village') return;
  const L = leader();
  const felix = map().npcs.find((n) => n.id === 'felix');
  if (!felix) { ch.active = false; return; }
  const dx = L.x - felix.x, dy = L.y - felix.y;
  felix.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
  ch.timer -= dt;
  if (ch.timer <= 0 && !game.projectiles.some((p) => p.challenge)) {
    const sx = felix.x + 8, sy = felix.y + 6, tx = L.x + 8, ty = L.y + 9;
    const d = Math.hypot(tx - sx, ty - sy) || 1;
    game.projectiles.push({ x: sx, y: sy, vx: ((tx - sx) / d) * 80, vy: ((ty - sy) / d) * 80, kind: 'nut', owner: 'enemy', challenge: true, t: 3 });
    sfx.swing();
    ch.timer = 0.9 + Math.random() * 0.7;
  }
  if (ch.blocked >= 5) {
    ch.active = false;
    game.projectiles = [];
    open({
      lines: [
        'Felix: Wow! Fünf Stück – und kein einziger Treffer. Du bist echt mutig!',
        'Felix: Okay, ich bin dabei. Mit Superstärke schieb ich jeden Felsen weg! Die gibt\'s bei Bruno.',
        'Tipp: Mit Q (Tastatur), L/R (Gamepad) oder dem Pfeil-Knopf wechselst du, wer vorne läuft.',
      ],
      after() {
        game.rec.felix = true;
        fx.join('felix');
        sfx.item();
        fx.banner('FELIX IST DABEI', 'Fähigkeit: Superstärke (Laden)', '#a8f070');
        fx.gainXP(15);
      },
    });
  } else if (game.stats.hearts <= 0) {
    ch.active = false;
    game.projectiles = [];
    game.stats.hearts = game.stats.maxHearts;
    dialog.open(['Felix: Haha, getroffen! Sprich mich an, wenn du es nochmal versuchen willst.']);
  }
}

// --- Dorf: Tarnumhang, Wache --------------------------------------------------------

function checkPickups() {
  const L = leader();
  const m = map();
  if (m.id === 'village') {
    const c = game.cloak;
    if (!c.taken && overlap(L.x + 3, L.y + 8, 10, 7, c.x, c.y, 12, 10)) {
      c.taken = true;
      game.hasCloak = true;
      if (!game.mama) game.mama = 1;
      sfx.item();
      poof(c.x + 6, c.y + 4);
      fx.banner('TARNUMHANG GEFUNDEN', 'Bring ihn zu Mama', '#88e0ff');
      save();
    }
    return;
  }
  for (const it of m.items) {
    if (it.taken || !overlap(L.x + 3, L.y + 6, 10, 9, it.x, it.y, 12, 12)) continue;
    const st = game.stats;
    if (it.type === 'apple' && st.hearts >= st.maxHearts) continue;
    it.taken = true;
    if (!it.drop) ({ haunted: game.haunt.taken, valley: game.valley.taken, under: game.valley.taken, mountain: game.mtn.taken, lair: game.mtn.taken }[m.id] || game.cave.taken).push(it.id);
    sfx.item();
    switch (it.type) {
      case 'crystal': game.diamonds += 2; fx.toast('Ein Kristall! +2 Diamanten', 2.5); break;
      case 'candy': game.diamonds++; fx.toast('Ein Bonbon! Trick or treat! +1 Diamant', 2.5); break;
      case 'apple': st.hearts = Math.min(st.maxHearts, st.hearts + 1); fx.toast('Mmh, ein Apfel! +1 Herz', 2); break;
      case 'bag':
        game.ammo += 10;
        fx.toast(game.owned.sling ? '+10 Kastanien für Felix!' : '+10 Kastanien – mit einer Schleuder könnte Felix sie werfen.', 3);
        break;
      case 'key': if (m.id === 'mountain') { game.mtn.key = true; fx.banner('SCHLÜSSEL GEFUNDEN', 'Er passt in eine Tür ganz oben am Berg', '#f8d848'); break; }
        if (m.id === 'under') { game.valley.key = true; fx.banner('SCHLÜSSEL GEFUNDEN', 'Er passt in die Felsentür im Tal', '#f8d848'); break; }
        game.cave.key = true; fx.banner('SCHLÜSSEL GEFUNDEN', 'Er passt in die Schlosstür in der Halle', '#f8d848'); break;
    }
    save();
  }
}

function checkKonrad() {
  const m = map();
  if (m.id !== 'village' || m.gateOpen || game.invisT > 0) return;
  const L = leader();
  const tx = Math.floor((L.x + 8) / TILE), ty = Math.floor((L.y + 12) / TILE);
  const z = KONRAD_ZONE;
  if (tx < z.x0 || tx > z.x1 || ty < z.y0 || ty > z.y1) return;
  const konrad = m.npcs.find((n) => n.id === 'konrad');
  konrad.dir = 3;
  L.x = 15 * TILE + 8; L.y = 6 * TILE + 8; L.dir = 0;
  regroup();
  sfx.bump();
  dialog.open(L.id === 'friedrich'
    ? ['Wache Konrad: Halt, Friedrich! Ich sehe dich genau. Zurück mit dir!']
    : ['Wache Konrad: Halt! Hier kommt kein Kind zum Buttenberg durch!', 'Wache Konrad: Da oben wohnt ein Drache! Das Tor bleibt zu.']);
}

// Hinweise und Rastplätze beim Betreten von Bereichen
function checkAreas() {
  const m = map();
  if (!m.hints) return;
  const L = leader();
  const tx = Math.floor((L.x + 8) / TILE), ty = Math.floor((L.y + 12) / TILE);
  m.hints.forEach(([x0, y0, x1, y1, text], i) => {
    const key = `${m.id}:${i}`;
    if (game.seenHints[key] || tx < x0 || tx > x1 || ty < y0 || ty > y1) return;
    game.seenHints[key] = true;
    fx.toast(text, 5);
  });
  for (const [x0, y0, x1, y1, x, y, dir] of m.checkpoints) {
    if (tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1) game.checkpoint = { map: m.id, x, y, dir };
  }
}

function checkWarps() {
  const m = map();
  const L = leader();
  if (game.invisT > 0 && m.id === 'village') return;
  const tx = Math.floor((L.x + 8) / TILE), ty = Math.floor((L.y + 12) / TILE);
  if (m.id === 'mountain' && m.tile(tx, ty) === T.CAVEIN && !game.mtn.boss) {
    L.y += 10; regroup();
    sfx.bump();
    fx.toast('Das Riesen-Felsmonster versperrt den Höhleneingang!', 2);
    return;
  }
  if (m.id === 'lair' && tx === 2 && ty === 1) {
    if (!game.mtn.done) { game.mtn.done = true; endChapter(5); }
    else { L.y += 12; regroup(); fx.toast('Fortsetzung folgt: Der Drache vom Buttenberg!', 3); }
    return;
  }
  const wp = m.warpAt(tx, ty);
  if (wp) {
    goTo(wp.to, wp.tx, wp.ty, wp.dir);
    if (wp.to === 'lair' && !game.seenHints.lairBanner) { game.seenHints.lairBanner = true; fx.banner('HÖHLE DER FELSMONSTER', 'Leise – hier schlafen sie ...', '#ffb040'); }
    return;
  }
  if (m.id === 'village' && m.gateOpen && L.y + 8 < 2) {
    goTo('cave', CAVE_SPAWN.x, CAVE_SPAWN.y, CAVE_SPAWN.dir);
    if (!game.seenHints.caveBanner) { game.seenHints.caveBanner = true; fx.banner('KAPITEL 2', 'Die Höhle im Buttenberg', '#ffb040'); }
    return;
  }
  if (m.id === 'cave') {
    const t = m.tile(tx, ty);
    if (t === T.UP) goTo('village', 15 * TILE + 8, 2 * TILE, 0);
    else if (t === T.DOWN) {
      endInvisibility(true);
      if (game.cave.done) { goTo('haunted', HAUNT_SPAWN.x, HAUNT_SPAWN.y, HAUNT_SPAWN.dir); return; }
      game.cave.done = true;
      endChapter(2);
    }
  }
  if (m.id === 'haunted') {
    const t = m.tile(tx, ty);
    if (t === T.UP) goTo('cave', 3 * TILE, 10 * TILE + 8, 1);
    else if (t === T.DOWN) {
      endInvisibility(true);
      if (game.haunt.done) { goTo('valley', VALLEY_SPAWN.x, VALLEY_SPAWN.y, VALLEY_SPAWN.dir); return; }
      game.haunt.done = true;
      endChapter(3);
    }
  }
  if (m.id === 'valley') {
    if (m.tile(tx, ty) === T.UP) { goTo('haunted', 24 * TILE, 9 * TILE, 0); return; }
    if (L.y + 8 < 2) {
      if (!game.valley.troll) {
        L.y = 4 * TILE; regroup();
        fx.toast('Der Troll lässt euch nicht durch!', 2);
      } else if (game.valley.done) goTo('mountain', MOUNTAIN_SPAWN.x, MOUNTAIN_SPAWN.y, MOUNTAIN_SPAWN.dir);
      else { game.valley.done = true; endChapter(4); }
    }
  }
}

// --- Kapitel 4: Tal der Trolle -------------------------------------------------------

function editTile(m, x, y, t) {
  m.setTile(x, y, t);
  if (m.id === 'valley' || m.id === 'under') game.valley.edits.push([m.id, x, y, t]);
}

// Gespeicherten Fortschritt auf die Karten anwenden
function applyValley() {
  const v = game.valley, vm = game.maps.valley, um = game.maps.under;
  for (const [id, x, y, t] of v.edits || []) game.maps[id].setTile(x, y, t);
  if (v.sword) vm.chest.open = true;
  if (v.lever) vm.openGate();
  if (v.door) vm.setTile(21, 8, T.PATH);
  if (v.key) for (const it of um.items) if (it.type === 'key') it.taken = true;
  if (v.troll) { vm.enemies = vm.enemies.filter((e) => e.type !== 'trollboss'); addTrollFriend(); }
  for (const m of [vm, um]) for (const it of m.items) if (v.taken.includes(it.id)) it.taken = true;
}

function openChest() {
  const m = map();
  if (m.chest.open) { dialog.open(['Die Truhe ist leer.']); return; }
  m.chest.open = true;
  game.owned.sword = true;
  game.valley.sword = true;
  sfx.levelUp();
  fx.banner('DAS SCHWERT!', 'Theo greift mit B an, wenn ein Gegner vor ihm steht', '#f8d848');
  fx.gainXP(10);
  save();
}

function updateSpitters(dt) {
  const m = map();
  if (!m.spitters) return;
  const L = leader();
  m.spitters.forEach((sp, i) => {
    const obj = m.spitterObjs[i];
    if (sp.door && game.valley.door) { obj.hidden = true; return; }
    sp.cd -= dt;
    const d = Math.hypot(L.x + 8 - (sp.x * TILE + 8), L.y + 10 - (sp.y * TILE + 8));
    if (sp.cd > 0 || d > 7 * TILE) return;
    sp.cd = sp.gap;
    const [dx, dy] = DIRV[sp.dir];
    sfx.fire();
    game.projectiles.push({ x: sp.x * TILE + 8 + dx * 12, y: sp.y * TILE + 8 + dy * 12, vx: dx * sp.speed, vy: dy * sp.speed, kind: 'fire', owner: 'enemy', t: 3 });
  });
}

// Ist der Bombenwerfer besiegt, bevor die rissigen Felsen gesprengt sind, kommt ein neuer –
// sonst käme man nicht mehr weiter.
function updateBomberRespawn(dt) {
  const m = map();
  if (m.id !== 'valley' || game.valley.door) return;
  if (m.enemies.some((e) => e.alive && e.type === 'bomber')) { game.bomberT = 0; return; }
  let cracks = false;
  for (let x = 20; x <= 26; x++) if (m.tile(x, 12) === T.CRACK) cracks = true;
  if (!cracks) return;
  game.bomberT += dt;
  if (game.bomberT < 5) return;
  game.bomberT = 0;
  const e = { id: 200 + game.dropN++, type: 'bomber', x: 23 * TILE, y: 14 * TILE, hp: HP.bomber, home: { x: 23 * TILE, y: 14 * TILE },
    stunT: 0, cd: 2, hurtT: 0, alive: true, anim: 0, flip: false, throwT: 0, mode: 'idle', modeT: 0 };
  m.enemies.push(e);
  poof(e.x + 8, e.y + 8);
  fx.toast('Ein neuer Bombenwerfer ist aufgetaucht! Lockt seine Bomben zu den rissigen Felsen.', 3.5);
}

function updateSearchlight(dt) {
  const m = map();
  const sl = m.searchlight;
  if (!sl) return;
  sl.angle += dt * 0.75;
  sl.alarmT = Math.max(0, sl.alarmT - dt);
  sl.cd = Math.max(0, (sl.cd || 0) - dt);
  if (game.invisT > 0 || sl.cd > 0) return;
  const L = leader();
  const cx = sl.x * TILE + 8, cy = sl.y * TILE - 8;
  const dx = L.x + 8 - cx, dy = L.y + 10 - cy, d = Math.hypot(dx, dy);
  if (d > 88 || d < 6) return;
  let da = Math.atan2(dy, dx) - sl.angle;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  if (Math.abs(da) > 0.42) return;
  // Entdeckt!
  sl.alarmT = 3;
  sl.cd = 9;
  sfx.alarm();
  fx.toast('ALARM! Der Suchscheinwerfer hat euch entdeckt – Wächter kommen!', 3);
  let n = 0;
  for (const [ox, oy] of [[-2, 1], [2, 1], [0, 2], [-1, -1], [1, -1]]) {
    const ex = (sl.x + ox) * TILE, ey = (sl.y + oy) * TILE;
    if (wallHit(ex, ey) || n >= 3) continue;
    m.enemies.push({ id: 100 + game.dropN++, type: 'guard', x: ex, y: ey, hp: 3, cd: 1, hurtT: 0, alive: true, anim: 0, flip: false,
      throwT: 0, home: { x: ex, y: ey }, stunT: 0, temp: true, life: 18 });
    poof(ex + 8, ey + 8);
    n++;
  }
}

function addTrollFriend() {
  const vm = game.maps.valley;
  if (!vm.npcs.some((n) => n.id === 'trollfriend')) vm.npcs.push({ id: 'trollfriend', x: 19 * TILE, y: 5 * TILE, dir: 0, anim: 0, moving: false, big: true });
}

function trollDefeated(e) {
  e.alive = false;
  game.valley.troll = true;
  sfx.levelUp();
  burst(e.x + 8, e.y + 4, CONFETTI, 30, 70);
  addTrollFriend();
  fx.gainXP(30, e.x + 8, e.y - 10);
  dialog.open([
    'Troll: Uff ... Aua ... Schon gut, schon gut! Ihr seid stärker als ihr ausseht.',
    'Troll: Ich heiße Grummel. Hier im Tal hat sich noch nie jemand an mir vorbeigetraut.',
    game.valley.lever ? 'Grummel: Das Gitter ist offen. Geht nur – der Drache wartet hinter den Bergen!'
      : 'Grummel: Das Gitter öffnet nur der Hebel auf dem Felsvorsprung im Westen. Den erreicht ihr über Höhle E.',
  ]);
  save();
}

// --- Kapitel 5: Der Bergpfad -----------------------------------------------------------

function wake(e) {
  if (!e.asleep) return;
  e.asleep = false;
  e.cd = 0.6;
  sfx.bump();
  float('!', e.x + 8, e.y - 6, '#ff6060');
  if (!game.seenHints.wake) { game.seenHints.wake = true; fx.toast('Ein Felsmonster ist aufgewacht! Leise schleichen – oder Friedrich unsichtbar machen.', 3.5); }
}

// Riesen-Felsmonster: holt aus, stürmt geradeaus los. Läuft es über ein Loch, steckt es fest.
function updateRockBoss(e, dt, L, nx, ny, d) {
  const m = map(), a = m.arena;
  const inArena = L.x > a.x0 - 8 && L.x < a.x1 + 8 && L.y > a.y0 - 8 && L.y < a.y1 + 8;
  e.modeT -= dt;
  const setMode = (mode, t) => { e.mode = mode; e.modeT = t; };
  const clampArena = () => { e.x = Math.max(a.x0, Math.min(a.x1, e.x)); e.y = Math.max(a.y0, Math.min(a.y1, e.y)); };
  switch (e.mode) {
    case 'idle':
      if (!inArena) break;
      e.flip = nx < 0;
      e.x += nx * 10 * dt; e.y += ny * 10 * dt; clampArena();
      if (e.modeT <= 0) { setMode('wind', 0.8); e.vx = nx; e.vy = ny; sfx.push(); }
      break;
    case 'wind':
      if (e.modeT <= 0) { setMode('charge', 2.5); sfx.swing(); }
      break;
    case 'charge': {
      const ox = e.x, oy = e.y;
      e.x += e.vx * 115 * dt; e.y += e.vy * 115 * dt;
      clampArena();
      const tx = Math.floor((e.x + 8) / TILE), ty = Math.floor((e.y + 12) / TILE);
      if (m.tile(tx, ty) === T.HOLE) {
        e.x = tx * TILE; e.y = ty * TILE - 4;
        e.hole = { tx, ty };
        setMode('stuck', 4.5);
        sfx.boom();
        burst(e.x + 8, e.y + 12, DIRT, 18, 60);
        fx.toast('Es steckt im Loch fest! Schnell angreifen!', 2.5);
        return;
      }
      const hitWall = (e.x === ox && e.y === oy) || e.x <= a.x0 || e.x >= a.x1 || e.y <= a.y0 || e.y >= a.y1;
      if (hitWall || e.modeT <= 0) { setMode('idle', 1.4 + Math.random()); if (hitWall) { sfx.push(); burst(e.x + 8, e.y + 8, ['#8e8696', '#5e5664'], 8, 40); } }
      break;
    }
    case 'stuck':
      if (e.modeT <= 0) {
        m.setTile(e.hole.tx, e.hole.ty, T.DIG); // Loch ist zugeschüttet
        e.y -= 8;
        setMode('idle', 1.5);
        fx.toast('Das Felsmonster hat sich befreit! Ferdinand muss ein neues Loch graben.', 3);
      }
      return; // steckt fest: keine Berührungsschäden
  }
  if (game.invisT <= 0 && !linoTall() && d < 18 && e.mode !== 'stuck') {
    hurt(1);
    move(L, nx * 12, ny * 12, false);
  }
}

function rockBossDefeated(e) {
  e.alive = false;
  game.mtn.boss = true;
  if (e.hole) m_fill(e.hole);
  sfx.levelUp();
  burst(e.x + 8, e.y, ['#8e8696', '#cac2ce', '#5e5664', '#3e8a3a'], 40, 90);
  fx.gainXP(35, e.x + 8, e.y - 10);
  fx.banner('RIESEN-FELSMONSTER BESIEGT!', 'Der Weg in die Höhle ist frei', '#a8f070');
  save();
}
function m_fill(h) { map().setTile(h.tx, h.ty, T.DIG); }

function updateJump(L, dt) {
  const j = game.jump;
  game.jumpT -= dt;
  const p = Math.min(1, 1 - game.jumpT / 0.45);
  L.x = j.x0 + (j.x1 - j.x0) * p;
  L.y = j.y0 + (j.y1 - j.y0) * p;
  L.moving = true;
  L.anim += dt;
  pushTrail(L);
  snapFollowers();
  if (game.jumpT <= 0) { game.jumpT = 0; L.x = j.x1; L.y = j.y1; sfx.bump(); }
}
const jumpLift = () => (game.jumpT > 0 ? Math.round(Math.sin((1 - game.jumpT / 0.45) * Math.PI) * 10) : 0);

const theoHiding = () => game.starter !== 'theo' && !game.rec.theo && !game.theoFound;

function revealTheo() {
  game.theoFound = true;
  const v = game.maps.village;
  v.npcs.push(theoNPC());
  sfx.item();
  burst(THEO_BUSH.x * TILE + 8, THEO_BUSH.y * TILE + 8, [COL.bush, COL.bushL, '#ffffff'], 14);
  fx.banner('THEO GEFUNDEN!', 'Er hat sich im Busch versteckt', '#88e0ff');
  save();
}

function jellyTalk() {
  const m = game.maps.lair;
  const guards = m.enemies.filter((e) => e.guard && e.alive).length;
  if (guards) return { lines: [
    'Katze: Miau! MIAU! Holt mich hier raus!',
    `Katze: Aber passt auf – ${guards === 2 ? 'die zwei Felsmonster' : 'das Felsmonster'} da ${guards === 2 ? 'lassen' : 'lässt'} niemanden an den Käfig!`,
  ] };
  if (!game.seenHints.jellyTalk) return {
    lines: [
      'Katze: Miau! Ich bin Jelly! Die Felsmonster haben mich gefangen, weil ich ihre Kiesel gejagt habe.',
      'Jelly: Der Käfig hat ein Zahlenschloss mit Rätseln. Ich kann ja nicht lesen – ich bin eine Katze!',
      'Jelly: Löst drei Rätsel, dann springt das Schloss auf.',
    ],
    after() { game.seenHints.jellyTalk = true; openRiddle('cage'); },
  };
  return { lines: ['Jelly: Miau? Probiert das Zahlenschloss nochmal!'], after() { openRiddle('cage'); } };
}

function freeJelly() {
  const m = game.maps.lair;
  m.cage.open = true;
  m.block[3][12] = false; m.block[3][13] = false;
  game.mtn.jelly = true;
  sfx.levelUp();
  burst(13 * TILE, 3 * TILE + 8, CONFETTI, 24, 60);
  fx.join('jelly');
  fx.gainXP(25);
  fx.banner('JELLY IST DABEI!', 'B: Sprinten – oder über Schluchten springen', '#a8f070');
  dialog.open([
    'Jelly: Frei! Danke! Ab jetzt komme ich mit – ich will auch zum Drachen!',
    'Jelly: Ich bin superschnell und springe weiter als jeder von euch. Holt mich nach vorne und drückt B!',
  ]);
  save();
}

// Gespeicherten Fortschritt auf die Karten anwenden
function applyMountain() {
  const t = game.mtn, mm = game.maps.mountain, lm = game.maps.lair;
  if (t.statue) mm.killStatue();
  if (t.wall) mm.setTile(18, 19, T.GRASS);
  if (t.rocks) { mm.setTile(4, 28, T.GRASS); mm.setTile(5, 28, T.BOULDER); }
  if (t.key) for (const it of mm.items) if (it.type === 'key') it.taken = true;
  if (t.boss) mm.enemies = mm.enemies.filter((e) => e.type !== 'rockboss');
  if (t.jelly) {
    lm.cage.open = true; lm.block[3][12] = false; lm.block[3][13] = false;
    lm.npcs = lm.npcs.filter((n) => n.id !== 'jelly');
    lm.enemies = lm.enemies.filter((e) => !e.guard);
  }
  if (t.done) lm.setTile(4, 4, T.CFLOOR);
  for (const m of [mm, lm]) for (const it of m.items) if ((t.taken || []).includes(it.id)) it.taken = true;
}

function endChapter(n) {
  game.endChapter = n;
  game.state = 'end';
  game.endT = 0;
  sfx.levelUp();
  save();
}

// --- Kapitel 3: Rätsel im Spukhaus ---------------------------------------------------

const pickFn = (...fns) => fns[Math.floor(Math.random() * fns.length)]();

function riddleGen(kind) {
  switch (kind) {
    case 'division': return () => HW.toQuestion(HW.division(true));
    case 'halloween': return () => HW.toQuestion(pickFn(HW.whoAmI, HW.halloweenVocab, HW.reading, HW.sentenceOrder));
    case 'count': return () => HW.toQuestion(HW.countQuestion(game.maps.haunted.hallCounts, 'in the hall'));
    case 'book': return () => HW.toQuestion(pickFn(HW.bookVocab, HW.bookGrammar, HW.sentenceOrder));
    case 'binary': return () => HW.toQuestion(pickFn(() => HW.binaryRead(true), HW.binaryRead, HW.binaryWrite));
    default: return () => HW.toQuestion(pickFn(HW.mathRiddle, HW.englishRiddle));
  }
}

function openRiddle(id) {
  if (id === 'theo') {
    game.ui = new RiddleUI(game, fx, { speaker: 'Theos Drachenprüfung', need: 3,
      gen: () => nextQuestion(['de', 'en', 'geo', 'ma'][Math.floor(Math.random() * 4)]),
      onSolved() {
        game.rec.theo = true;
        fx.join('theo');
        sfx.levelUp();
        fx.banner('THEO IST DABEI', 'B: Schutzschild (Laden)', '#a8f070');
        fx.gainXP(15);
        dialog.open(['Theo: Bestanden! Okay, ich komme mit. Und meine Karten auch!']);
      } });
    return;
  }
  if (id === 'cage') {
    game.ui = new RiddleUI(game, fx, { speaker: 'Zahlenschloss am Käfig', need: 3, gen: () => HW.toQuestion(mountainQuestion()), onSolved: freeJelly });
    return;
  }
  const m = game.maps.haunted, h = game.haunt;
  if (id === 'bit') {
    game.ui = new RiddleUI(game, fx, { speaker: 'Bit, das Computer-Gespenst', need: 3, gen: riddleGen('binary'),
      onSolved() { fx.toast('Super geübt! Jetzt die Kerzen an der Tür ...', 3); } });
    return;
  }
  if (id === 'king') {
    game.ui = new RiddleUI(game, fx, { speaker: 'Graf Kürbis', need: 3, gen: riddleGen('mixed'),
      onSolved() {
        h.king = true;
        sfx.levelUp();
        fx.banner('MONDSCHLÜSSEL!', 'Er öffnet die Turmtür', '#f8d848');
        fx.gainXP(20);
        save();
      } });
    return;
  }
  const r = m.riddles[id];
  if (!r || h[id]) return;
  if (id === 'lib' && !h.chest) { dialog.open(['Professor Plumps: Erst muss die schwere Truhe weg. Ich bin nur ein Gespenst – ich kann nichts schieben!']); return; }
  game.ui = new RiddleUI(game, fx, { speaker: r.speaker, need: r.need, gen: riddleGen(r.kind),
    onSolved() { solveDoor(id); } });
}

function solveDoor(id) {
  const m = game.maps.haunted, r = m.riddles[id];
  game.haunt[id] = true;
  m.setTile(r.x, r.y, r.open);
  sfx.door();
  burst(r.x * TILE + 8, r.y * TILE + 8, ['#c8a0ff', '#ffffff', '#f8d848'], 16, 50);
  fx.banner(id === 'gate' ? 'DAS TOR IST OFFEN' : 'DIE TÜR IST OFFEN', 'Weiter geht\'s!', '#a8f070');
  fx.gainXP(10);
  save();
}

// Kerzen auf eine Zahl setzen (z. B. nach dem Laden)
function setCandles(n) {
  const bits = HW.toBits(n);
  game.maps.haunted.candles.forEach((c, i) => { c.lit = bits[i] === '1'; c.glow = c.lit; });
}

function toggleCandle(c) {
  const h = game.haunt;
  if (h.candles) { fx.toast('Die Tür ist schon offen.', 1.5); return; }
  c.lit = !c.lit;
  c.glow = c.lit;
  sfx[c.lit ? 'confirm' : 'blip']();
  const sum = game.maps.haunted.candles.reduce((s, k) => s + (k.lit ? k.value : 0), 0);
  float(`= ${sum}`, c.x * TILE + 8, c.y * TILE - 2, sum === h.target ? '#a8f070' : '#ffffff');
  if (sum === h.target) solveDoor('candles');
}

function updateEffects(dt) {
  for (const pt of game.particles) { pt.vy += pt.g * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.t -= dt; }
  game.particles = game.particles.filter((pt) => pt.t > 0);
  for (const f of game.floats) { f.y -= 18 * dt; f.t -= dt; }
  game.floats = game.floats.filter((f) => f.t > 0);
  if (game.banners.length) {
    game.banners[0].t -= dt;
    if (game.banners[0].t <= 0) game.banners.shift();
  }
  if (game.trollAngry) game.trollAngry = Math.max(0, game.trollAngry - dt);
}

// --- Zeichnen ---------------------------------------------------------------------

function camera() {
  const m = map();
  if (game.state === 'title') {
    const t = game.titleT * 0.15;
    return { x: Math.round((m.w * TILE - W) * (0.5 + 0.5 * Math.sin(t))), y: Math.round((m.h * TILE - H) * (0.5 + 0.3 * Math.sin(t * 0.7))) };
  }
  const L = leader();
  const clamp = (v, max) => Math.max(0, Math.min(max, v));
  const pad = m.padTop || 0;
  return {
    x: Math.round(clamp(L.x + 8 - W / 2, m.w * TILE - W)),
    y: Math.round(Math.max(-pad, Math.min(m.h * TILE - H, L.y + 8 - H / 2))),
  };
}

function shadow(sx, sy) {
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(sx + 4, sy + 14, 8, 2);
  g.fillRect(sx + 3, sy + 15, 10, 1);
}

const walkFrame = (e) => (e.moving ? [0, 1, 0, 2][Math.floor(e.anim * 8) % 4] : 0);

function drawSpear(sx, sy) {
  g.fillStyle = COL.woodD; g.fillRect(sx + 14, sy - 5, 1, 20);
  g.fillStyle = '#e0e0ec'; g.fillRect(sx + 13, sy - 8, 3, 3); g.fillRect(sx + 14, sy - 10, 1, 2);
}

function drawCharacter(e, cam, alpha = 1) {
  const sx = Math.round(e.x - cam.x), sy = Math.round(e.y - cam.y);
  if (e.big) {
    g.drawImage(trollSprite(game.trollAngry > 0 ? 1 : 0), sx - 4, sy - 10);
    return;
  }
  if (e.custom) {
    const f = Math.floor(game.time * 3 + e.x) % 2;
    const bob = Math.round(Math.sin(game.time * 2.5 + e.x) * 1.5);
    let spr;
    switch (e.custom) {
      case 'witch': spr = witchSprite(f); break;
      case 'graf': spr = grafSprite(f); break;
      case 'ghostGreen': spr = ghostSprite('green', f); break;
      case 'ghostBlue': spr = ghostSprite('blue', f, true); break;
      case 'ghostGlasses': spr = ghostSprite('white', f, true); break;
      default: spr = ghostSprite('white', f);
    }
    const ghost = e.custom.startsWith('ghost');
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(sx + 4, sy + 15, 8, 2);
    g.globalAlpha = ghost ? 0.85 : 1;
    g.drawImage(spr, sx + Math.round((16 - spr.width) / 2), sy + 16 - spr.height + (ghost ? bob - 2 : 0));
    g.globalAlpha = 1;
    return;
  }
  g.globalAlpha = alpha;
  shadow(sx, sy);
  if (e.spear && e.dir === 1) drawSpear(sx, sy);
  const spr = charSprite(e.pal, e.dir, walkFrame(e));
  if (e.id === 'lino' && game.linoT > 0 && e === leader()) {
    // Spaghetti-Beine: die Beine (unterste 3 Pixelreihen) werden lang gezogen
    const grow = Math.min(1, (7 - game.linoT) * 6, game.linoT * 4);
    const legH = Math.round(3 + 15 * grow), top = spr.height - 3;
    g.drawImage(spr, 0, top, 16, 3, sx, sy + 16 - legH, 16, legH);
    g.drawImage(spr, 0, 0, 16, top, sx, sy + 16 - legH - top, 16, top);
  } else if (e.stuck) {
    g.drawImage(spr, 0, 0, 16, spr.height - 4, sx, sy + 20 - spr.height, 16, spr.height - 4);
    g.fillStyle = '#5a3a20'; g.fillRect(sx + 1, sy + 13, 14, 4);
    g.fillStyle = '#7a5030'; g.fillRect(sx + 2, sy + 13, 12, 2);
  } else g.drawImage(spr, sx, sy + 16 - spr.height);
  if (e.spear && e.dir !== 1) drawSpear(sx, sy);
  g.globalAlpha = 1;
}

let shieldImg = null;
function drawShield(sx, sy) {
  if (!shieldImg) {
    shieldImg = document.createElement('canvas');
    shieldImg.width = shieldImg.height = 26;
    const sg = shieldImg.getContext('2d');
    for (let y = 0; y < 26; y++) {
      for (let x = 0; x < 26; x++) {
        const d = Math.hypot(x + 0.5 - 13, y + 0.5 - 13);
        if (d > 12.5) continue;
        sg.fillStyle = d > 11.2 ? '#e8fcff' : d > 10 ? '#78d0f8' : 'rgba(120,208,248,0.22)';
        sg.fillRect(x, y, 1, 1);
      }
    }
  }
  g.globalAlpha = game.shieldT < 0.2 ? 0.5 : 0.85;
  g.drawImage(shieldImg, sx - 5, sy - 3);
  g.globalAlpha = 1;
}

function drawShovel(L, sx, sy) {
  const prog = 1 - game.swingT / 0.25;
  const base = [Math.PI / 2, -Math.PI / 2, Math.PI, 0][L.dir];
  const a = base + (prog - 0.5) * 2 * (L.dir === 2 || L.dir === 1 ? -1 : 1);
  const hx = sx + 8, hy = sy + 10;
  for (let i = 3; i < 15; i++) {
    const sword = game.swingKind === 'sword';
    g.fillStyle = sword ? (i < 6 ? '#6a4a2a' : i < 7 ? '#f0c838' : '#e8e8f8') : (i > 11 ? '#c8c8d8' : '#7a4a24');
    const w = sword ? (i === 6 ? 4 : 2) : (i > 11 ? 3 : 2);
    g.fillRect(Math.round(hx + Math.cos(a) * i) - 1, Math.round(hy + Math.sin(a) * i) - 1, w, w);
  }
}

function drawLeader(cam) {
  const L = leader();
  if (game.hurtT > 0 && Math.floor(game.time * 20) % 2) return;
  const sx = Math.round(L.x - cam.x), sy = Math.round(L.y - cam.y) - jumpLift();
  const alpha = game.invisT > 0 ? 0.28 + 0.08 * Math.sin(game.time * 8) : 1;
  if (game.swingT > 0 && L.dir === 1) drawShovel(L, sx, sy);
  drawCharacter(L, { x: cam.x, y: cam.y + jumpLift() }, alpha);
  if (game.sprintT > 0) { g.fillStyle = 'rgba(200,240,255,0.5)'; for (let i = 1; i <= 3; i++) g.fillRect(sx + 8 - DIRV[L.dir][0] * (6 + i * 4), sy + 10 - DIRV[L.dir][1] * (4 + i * 4), 2, 1); }
  if (game.swingT > 0 && L.dir !== 1) drawShovel(L, sx, sy);
  if (game.shieldT > 0) drawShield(sx, sy);
}

function bubble(e, cam) {
  const sx = Math.round(e.x - cam.x) + 4, sy = Math.round(e.y - cam.y) - 13 + Math.round(Math.sin(game.time * 5));
  g.fillStyle = COL.out; g.fillRect(sx, sy, 8, 10);
  g.fillStyle = '#fff'; g.fillRect(sx + 1, sy + 1, 6, 8);
  g.fillStyle = '#e83848'; g.fillRect(sx + 3, sy + 2, 2, 4); g.fillRect(sx + 3, sy + 7, 2, 1);
}

// Projektion eines Punkts im normalen Bildschirmraum (ohne Kippung) → Bildschirm.
// Liefert [x, y, scale]; ohne Kippansicht unverändert.
function P(fx, fy) { return Tilt.active() ? Tilt.project(fx, fy, W, H) : [fx, fy, 1]; }

let groundCanvas = null;
function groundCtx(gw, gh) {
  if (!groundCanvas || groundCanvas.width !== gw || groundCanvas.height !== gh) {
    groundCanvas = document.createElement('canvas');
    groundCanvas.width = gw; groundCanvas.height = gh;
  }
  const c = groundCanvas.getContext('2d');
  c.imageSmoothingEnabled = false;
  return c;
}

function drawSky(c, m, fc, vw) {
  if (m.theme !== 'haunted' || fc.y >= 0) return;
  // Sternenhimmel und Vollmond über dem Spukhaus
  for (let i = 0; i < 60; i++) {
    const sx = (i * 97 + 13) % vw, sy = ((i * 53) % 64) - 64 - fc.y;
    if (sy < -fc.y) { c.fillStyle = i % 5 ? '#c8c8f0' : '#ffffff'; c.fillRect(sx, sy, 1, 1); }
  }
  const mx = vw - 40 - fc.x * 0.2, my = -30 - fc.y;
  c.fillStyle = '#f8f0c8'; c.beginPath(); c.arc(mx, my, 11, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#e0d8a8'; c.fillRect(mx - 4, my - 3, 3, 3); c.fillRect(mx + 3, my + 2, 2, 2);
}

function renderWorld(cam) {
  const m = map();
  const tilted = Tilt.active();
  const bg = m.theme === 'haunted' ? '#0c0a24' : m.theme === 'valley' ? '#1c3a2a' : '#000';

  // --- 1. Boden (flach; in der Kippansicht auf eine größere Fläche, die dann projiziert wird)
  const [gw, gh] = tilted ? Tilt.groundSize(W, H) : [W, H];
  const ox = (gw - W) / 2, oy = (gh - H) / 2;
  const fc = { x: cam.x - ox, y: cam.y - oy };
  const gc = tilted ? groundCtx(gw, gh) : g;
  gc.fillStyle = bg;
  gc.fillRect(0, 0, gw, gh);
  drawSky(gc, m, fc, gw);
  drawTiles(gc, m, fc.x, fc.y, game.time, gw, gh, tilted);
  // Wand-Deko (Fackeln, Regale, Tafeln …) gehört zum Boden
  for (const o of m.objects) if (!o.hidden && o.sortY === 0) o.draw(gc, fc.x, fc.y, game.time);
  if (m.searchlight && game.state !== 'title') {
    const sl = m.searchlight;
    const cx = sl.x * TILE + 8 - fc.x, cy = sl.y * TILE - 8 - fc.y;
    gc.fillStyle = sl.alarmT > 0 ? 'rgba(255,60,60,0.28)' : 'rgba(255,245,170,0.26)';
    gc.beginPath(); gc.moveTo(cx, cy);
    gc.arc(cx, cy, 88, sl.angle - 0.42, sl.angle + 0.42);
    gc.closePath(); gc.fill();
  }
  if (tilted) {
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    Tilt.warpGround(g, groundCanvas, W, H);
  }

  // --- 2. Aufrechte Dinge: jedes hat einen Fußpunkt (fx, fy) im normalen Bildschirmraum.
  // In der Kippansicht wird um diesen Punkt skaliert und er auf die gekippte Ebene gesetzt.
  const list = [];
  const add = (sortY, fx, fy, draw) => list.push({ y: sortY, fx, fy, draw });

  if (tilted) {
    // hohe Kacheln (Bäume, Büsche, Felsen, Zäune, Tore) stehen auf
    const tx0 = Math.floor(fc.x / TILE), ty0 = Math.floor(fc.y / TILE);
    for (let ty = Math.max(0, ty0); ty <= Math.min(m.h - 1, ty0 + Math.ceil(gh / TILE)); ty++) {
      for (let tx = Math.max(0, tx0); tx <= Math.min(m.w - 1, tx0 + Math.ceil(gw / TILE)); tx++) {
        if (!TALL.has(m.tiles[ty][tx])) continue;
        const X = tx * TILE - cam.x, Y = ty * TILE - cam.y;
        add((ty + 1) * TILE - 0.5, X + 8, Y + 16, () => g.drawImage(tileCutout(m, tx, ty, game.time), X, Y));
      }
    }
  }
  for (const o of m.objects) {
    if (o.hidden || o.sortY === 0) continue;
    const footY = o.sortY > (o.y + 3) * TILE ? (o.y + 1) * TILE : o.sortY;
    add(o.sortY, (o.x + (o.w || 1) / 2) * TILE - cam.x, footY - cam.y, () => o.draw(g, cam.x, cam.y, game.time));
  }
  const bubbles = new Set();
  if (game.state === 'play' && m.id === 'haunted') {
    const h = game.haunt;
    const want = { witch: !h.gate, bodo: h.gate && !h.front, zora: h.front && !h.count, plumps: h.chest && !h.lib, bit: h.lib && !h.candles, graf: h.candles && !h.king };
    for (const [id, show] of Object.entries(want)) if (show) bubbles.add(id);
  }
  if (game.state === 'play' && m.id === 'village' && game.step < 7) {
    if (!game.rec.felix) bubbles.add('felix');
    if (game.theoFound && !game.rec.theo) bubbles.add('theo');
    if (!game.rec.lino) bubbles.add('lino');
    if (game.mama === 0 || (game.hasCloak && game.mama < 2)) bubbles.add('mama');
  }
  if (game.state === 'play' && m.id === 'lair' && !game.mtn.jelly) bubbles.add('jelly');
  for (const n of m.npcs) {
    add(n.y + 16, n.x + 8 - cam.x, n.y + 16 - cam.y, () => { drawCharacter(n, cam); if (bubbles.has(n.id)) bubble(n, cam); });
  }
  for (const it of m.items) {
    if (it.taken) continue;
    add(it.y + 12, it.x + 6 - cam.x, it.y + 12 - cam.y, () => {
      const bob = it.type === 'crystal' || it.type === 'key' ? Math.round(Math.sin(game.time * 3 + it.x) * 1.5) : 0;
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(Math.round(it.x - cam.x) + 2, Math.round(it.y - cam.y) + 11, 8, 2);
      g.drawImage(itemSprite(it.type), Math.round(it.x - cam.x), Math.round(it.y - cam.y) + bob);
    });
  }
  if (m.id === 'village' && !game.cloak.taken) {
    const c = game.cloak;
    add(c.y + 10, c.x + 6 - cam.x, c.y + 10 - cam.y, () => g.drawImage(itemSprite('cloak'), Math.round(c.x - cam.x), Math.round(c.y - cam.y + Math.sin(game.time * 3))));
  }
  for (const e of m.enemies) {
    if (!e.alive) continue;
    add(e.y + 16, e.x + 8 - cam.x, e.y + 16 - cam.y, () => drawEnemy(e, cam));
  }
  if (game.state !== 'title') {
    game.party.forEach((p, i) => add(p.y + 16 - (i ? 0.1 : 0), p.x + 8 - cam.x, p.y + 16 - cam.y, () => (i === 0 ? drawLeader(cam) : drawCharacter(p, cam))));
  }
  for (const p of game.projectiles) add(p.y + 4, p.x - cam.x, p.y + 4 - cam.y, () => drawProjectile(p, cam));

  list.sort((a, b) => a.y - b.y);
  for (const e of list) {
    if (tilted) {
      const [px, py, sc] = P(e.fx, e.fy);
      if (px < -60 || px > W + 60 || py < -20 || py > H + 120) continue;
      g.setTransform(sc, 0, 0, sc, px - sc * e.fx, py - sc * e.fy);
      e.draw();
      g.setTransform(1, 0, 0, 1, 0, 0);
    } else e.draw();
  }

  for (const pt of game.particles) {
    const [x, y, sc] = P(pt.x - cam.x, pt.y - cam.y);
    g.fillStyle = pt.c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(2 * sc)), Math.max(1, Math.round(2 * sc)));
  }

  // --- 3. Licht und Dunkelheit (im Bildschirmraum, an den projizierten Positionen)
  if (m.theme === 'cave' && game.state !== 'title') {
    const L = leader();
    const [lx, ly] = P(L.x - cam.x + 8, L.y - cam.y + 8);
    const grad = g.createRadialGradient(lx, ly, 40, lx, ly, 170);
    grad.addColorStop(0, 'rgba(6,4,10,0)');
    grad.addColorStop(1, 'rgba(6,4,10,0.55)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  }

  if (m.theme === 'haunted' && game.state !== 'title') {
    const L = leader();
    const [lx, ly] = P(L.x - cam.x + 8, L.y - cam.y + 8);
    const inside = m.tile(Math.floor((L.x + 8) / TILE), Math.floor((L.y + 12) / TILE)) === T.WOOD;
    g.fillStyle = inside ? 'rgba(20,12,56,0.28)' : 'rgba(20,12,56,0.42)';
    g.fillRect(0, 0, W, H);
    const grad = g.createRadialGradient(lx, ly, 40, lx, ly, 160);
    grad.addColorStop(0, 'rgba(10,6,30,0)');
    grad.addColorStop(1, inside ? 'rgba(10,6,30,0.35)' : 'rgba(10,6,30,0.5)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // Kürbisse, Kerzen und Kessel leuchten
    g.globalCompositeOperation = 'lighter';
    for (const o of m.objects) {
      if (!o.glow) continue;
      const [gx, gy, sc] = P(o.x * TILE - cam.x + 8, o.y * TILE - cam.y + 6);
      if (gx < -30 || gy < -30 || gx > W + 30 || gy > H + 30) continue;
      const fl = (18 + Math.sin(game.time * 7 + o.x) * 2) * sc;
      const gl = g.createRadialGradient(gx, gy, 2, gx, gy, fl);
      gl.addColorStop(0, o.type === 'cauldron' ? 'rgba(90,200,70,0.45)' : 'rgba(255,150,40,0.45)');
      gl.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gl;
      g.fillRect(gx - fl, gy - fl, fl * 2, fl * 2);
    }
    g.globalCompositeOperation = 'source-over';
  }
}

function drawEnemy(e, cam) {
  if (e.hurtT > 0 && Math.floor(game.time * 30) % 2) return;
  const sx = Math.round(e.x - cam.x), sy = Math.round(e.y - cam.y);
  if (e.type === 'rockboss') {
    const shake = e.mode === 'wind' ? Math.round(Math.sin(game.time * 60)) : 0;
    const mode = e.mode === 'charge' ? 'charge' : e.mode === 'wind' ? 'wind' : e.mode === 'stuck' ? 'stuck' : 'idle';
    if (e.mode === 'stuck') { g.fillStyle = '#2a1a10'; g.fillRect(sx - 6, sy + 10, 28, 8); }
    g.drawImage(rockBossSprite(mode, Math.floor(game.time * 3) % 2), sx - 8 + shake, sy - 16 + (e.mode === 'stuck' ? 6 : 0));
    if (e.mode === 'stuck') {
      for (let i = 0; i < 3; i++) {
        const a = game.time * 4 + (i * Math.PI * 2) / 3;
        g.fillStyle = '#f8d848'; g.fillRect(Math.round(sx + 8 + Math.cos(a) * 11), Math.round(sy - 14 + Math.sin(a) * 3), 2, 2);
      }
    }
    g.fillStyle = '#1a1020'; g.fillRect(sx - 4, sy - 22, 24, 4);
    g.fillStyle = '#e83848'; g.fillRect(sx - 3, sy - 21, Math.round((22 * e.hp) / HP.rockboss), 2);
    return;
  }
  if (e.type === 'rockmon') {
    shadow(sx, sy);
    g.drawImage(rockmonSprite(!e.asleep, Math.floor(e.anim * 4) % 2), sx, sy);
    if (e.asleep) {
      const t = (game.time * 0.8 + e.id * 0.37) % 1;
      g.fillStyle = 'rgba(220,230,255,0.85)';
      const zx = sx + 11 + Math.round(t * 4), zy = sy + 2 - Math.round(t * 8);
      g.fillRect(zx, zy, 3, 1); g.fillRect(zx + 1, zy + 1, 1, 1); g.fillRect(zx, zy + 2, 3, 1);
    }
    return;
  }
  if (e.type === 'mtroll') {
    shadow(sx, sy);
    g.drawImage(mtrollSprite(e.flip, Math.floor(e.anim * 4) % 2), sx, sy);
    return;
  }
  if (e.type === 'trollboss') {
    g.drawImage(trollSprite(e.throwT > 0 || e.hurtT > 0 ? 1 : 0), sx - 4, sy - 10);
    if (e.stunT > 0) {
      for (let i = 0; i < 3; i++) {
        const a = game.time * 4 + (i * Math.PI * 2) / 3;
        g.fillStyle = '#f8d848'; g.fillRect(Math.round(sx + 8 + Math.cos(a) * 9), Math.round(sy - 12 + Math.sin(a) * 3), 2, 2);
      }
    }
    // Lebensbalken
    g.fillStyle = '#1a1020'; g.fillRect(sx - 3, sy - 16, 22, 4);
    g.fillStyle = '#e83848'; g.fillRect(sx - 2, sy - 15, Math.round((20 * e.hp) / HP.trollboss), 2);
    return;
  }
  if (e.type === 'guard' || e.type === 'bomber') {
    const spr = e.type === 'guard' ? guardSprite(e.flip, Math.floor(e.anim * 4) % 2) : bomberSprite(e.flip, e.throwT > 0 ? 1 : 0);
    shadow(sx, sy);
    g.drawImage(spr, sx, sy + 16 - spr.height);
    return;
  }
  if (e.type === 'bat') {
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(sx + 5, sy + 15, 6, 1);
    g.drawImage(batSprite(Math.floor(e.anim * 8) % 2), sx, sy + Math.round(Math.sin(e.anim * 4) * 2));
    return;
  }
  const spr = e.type === 'slime' ? slimeSprite(Math.sin(e.anim * 7) > 0 ? 1 : 0) : koboldSprite(e.flip, e.throwT > 0 ? 1 : 0);
  shadow(sx, sy);
  g.drawImage(spr, sx, sy);
}

function drawProjectile(p, cam) {
  const px = Math.round(p.x - cam.x), py = Math.round(p.y - cam.y);
  if (p.kind === 'bomb') {
    const lift = p.fly > 0 ? Math.round(Math.sin(Math.min(1, p.fly) * Math.PI) * 6) : 0;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(px - 3, py + 3, 6, 2);
    g.drawImage(bombSprite(p.fuse > 0 && Math.floor(game.time * (p.fuse < 0.6 ? 16 : 6)) % 2 ? 1 : 0), px - 5, py - 6 - lift);
  } else if (p.kind === 'rock') g.drawImage(rockSprite(), px - 5, py - 5);
  else if (p.kind === 'nut') g.drawImage(itemSprite('chestnut'), px - 2, py - 2);
  else g.drawImage(fireSprite(Math.floor(game.time * 10) % 2, !!p.reflected), px - 4, py - 4);
}

function abilityLabel(id) {
  const o = game.owned;
  const parts = {
    theo: [o.shield && 'Schild', o.sword && 'Schwert'],
    felix: [o.strength && 'Stärke', o.sling && `Schleuder ${game.ammo}`],
    ferdinand: [o.dig && 'Graben', o.shovel && 'Schaufel'],
    friedrich: [o.invis && 'Unsichtbar'],
    jelly: ['Sprinten & Springen'],
    lino: [o.legs && 'Spaghetti-Beine'],
  }[id].filter(Boolean);
  return parts.length ? parts.join(' + ') : 'noch nichts (Laden)';
}

function renderHUDLow() {
  const st = game.stats;
  for (let i = 0; i < st.maxHearts; i++) g.drawImage(heartSprite(i < st.hearts), 4 + i * 8, 4);
  drawDiamond(g, 6 + st.maxHearts * 8, 4);
  const bx = 176, by = 6, bw = 60;
  const fill = Math.round((bw * st.xp) / needXP(st.level));
  g.fillStyle = COL.out; g.fillRect(bx - 1, by - 1, bw + 2, 6);
  g.fillStyle = '#2a3050'; g.fillRect(bx, by, bw, 4);
  g.fillStyle = '#58d878'; g.fillRect(bx, by, fill, 4);
  g.fillStyle = '#a8f8b8'; g.fillRect(bx, by, fill, 1);
  game.party.forEach((m, i) => {
    const spr = charSprite(m.pal, 0, 0);
    const x = Math.min(176, W - 4 - game.party.length * 13) + i * 13, y = 13;
    g.fillStyle = i === 0 ? '#f8d848' : 'rgba(10,14,32,0.6)';
    g.fillRect(x - 1, y - 1, 13, 11);
    g.drawImage(spr, 1, 0, 14, 9, x, y, 12, (9 * 12) / 14);
  });
}

function renderDialogLow() {
  g.fillStyle = '#f0f0f8'; g.fillRect(4, 112, 232, 44);
  g.fillStyle = '#28386a'; g.fillRect(5, 113, 230, 42);
  g.fillStyle = '#182448'; g.fillRect(6, 114, 228, 40);
  if (dialog.pageDone && Math.floor(game.time * 3) % 2 === 0) {
    g.fillStyle = '#f8d848';
    g.fillRect(224, 147, 7, 1); g.fillRect(225, 148, 5, 1); g.fillRect(226, 149, 3, 1); g.fillRect(227, 150, 1, 1);
  }
}

function text(str, x, y, o = {}) {
  const size = o.size || 8;
  vctx.font = `${Math.round(size * K)}px ${FONT}`;
  vctx.textAlign = o.align || 'left';
  vctx.textBaseline = 'top';
  const px = Math.round(x * K), py = Math.round(y * K);
  if (o.shadow !== false) {
    const d = Math.max(1, Math.round((K * size) / 8));
    vctx.fillStyle = 'rgba(10,10,20,0.85)';
    vctx.fillText(str, px + d, py + d);
  }
  vctx.fillStyle = o.color || '#fff';
  vctx.fillText(str, px, py);
}

function wrapText(str, max) {
  const lines = [''];
  for (const w of str.split(' ')) {
    const cur = lines[lines.length - 1];
    if (cur && (cur + ' ' + w).length > max) lines.push(w);
    else lines[lines.length - 1] = cur ? cur + ' ' + w : w;
  }
  return lines;
}

function render() {
  const cam = camera();
  renderWorld(cam);
  const playing = game.state === 'play';

  if (playing) {
    renderHUDLow();
    if (game.toast && !dialog.active) {
      const lines = wrapText(game.toast.text, 36).slice(0, 3);
      g.fillStyle = 'rgba(10,14,32,0.82)';
      g.fillRect(8, H - 8 - lines.length * 9, 224, lines.length * 9 + 4);
    }
    if (dialog.active) renderDialogLow();
    if (game.ui) game.ui.render(g, () => {}); // nur Flächen; Texte folgen nach dem Hochskalieren
  }
  if (game.state === 'title' || game.state === 'end') {
    g.fillStyle = game.state === 'end' ? `rgba(8,10,24,${Math.min(0.88, game.endT)})` : 'rgba(8,10,24,0.55)';
    g.fillRect(0, 0, W, H);
    if (game.state === 'title' && game.ui) game.ui.render(g, () => {});
  }
  if (game.fadeT > 0) { g.fillStyle = `rgba(0,0,0,${game.fadeT / 0.35})`; g.fillRect(0, 0, W, H); }
  if (game.faintT > 0) { g.fillStyle = `rgba(0,0,0,${Math.min(0.85, 1.6 - game.faintT)})`; g.fillRect(0, 0, W, H); }

  vctx.imageSmoothingEnabled = false;
  vctx.drawImage(low, 0, 0, W * K, H * K);

  if (game.state === 'title') {
    if (game.ui) { game.ui.render(NOOP_CTX, text); return; }
    return renderTitle();
  }
  if (game.state === 'end') return renderEnd();

  if (game.ui) {
    // Zweiter Durchgang: Flächen sind schon gezeichnet, jetzt nur noch die Texte in voller Auflösung
    game.ui.render(NOOP_CTX, text);
    return;
  }

  const st = game.stats, L = leader();
  text(String(game.diamonds), 14 + st.maxHearts * 8, 4, { size: 6, color: '#88f0ff' });
  text(`LV${st.level}`, 150, 4, { size: 7, color: '#f8d848' });
  text(`${HEROES[L.id].name}: ${abilityLabel(L.id)}`, 4, 14, { size: 5, color: '#ffffff' });
  if (linoTall()) text(`Spaghetti-Beine: ${Math.ceil(game.linoT)}`, W / 2, 64, { size: 7, align: 'center', color: '#f8d848' });
  text(questHint(game), 4, 22, { size: 5, color: '#c8e0ff' });
  if (game.challenge.active) text(`Kastanien: ${game.challenge.blocked}/5`, W / 2, 64, { size: 7, align: 'center', color: '#f8d848' });
  if (game.invisT > 0) text(`Unsichtbar: ${Math.ceil(game.invisT)}`, W / 2, 64, { size: 7, align: 'center', color: '#d0c8ff' });
  if (game.toast && !dialog.active) {
    const lines = wrapText(game.toast.text, 36).slice(0, 3);
    lines.forEach((l, i) => text(l, W / 2, H - 6 - lines.length * 9 + i * 9, { size: 6, align: 'center' }));
  }

  const m = map();
  if (m.labels) for (const lb of m.labels) { const [x, y] = P(lb.x - cam.x, lb.y - cam.y); text(lb.text, x, y, { size: 5, align: 'center', color: '#f8d848' }); }
  if (m.id === 'haunted' && !game.haunt.candles) {
    const r = m.riddles.candles;
    const [x, y] = P(r.x * TILE + 8 - cam.x, r.y * TILE - 10 - cam.y);
    text(String(game.haunt.target), x, y, { size: 7, align: 'center', color: '#f8d848' });
  }
  for (const f of game.floats) { const [x, y] = P(f.x - cam.x, f.y - cam.y); text(f.text, x, y, { size: 6, align: 'center', color: f.color }); }

  const b = game.banners[0];
  if (b) {
    vctx.fillStyle = 'rgba(10,14,32,0.88)';
    vctx.fillRect(Math.round(24 * K), Math.round(32 * K), Math.round(192 * K), Math.round(26 * K));
    text(b.title, W / 2, 36, { size: 8, align: 'center', color: b.color });
    text(b.sub, W / 2, 48, { size: 6, align: 'center' });
  }

  if (dialog.active) dialog.visibleLines().forEach((l, i) => text(l, 12, 119 + i * 11, { size: 8, shadow: false }));
}

const NOOP_CTX = { fillStyle: '', fillRect() {}, drawImage() {} };

function renderTitle() {
  text('BUTTENBERG', W / 2, 18, { size: 18, align: 'center', color: '#f8d848' });
  text('ADVENTURES', W / 2, 42, { size: 10, align: 'center', color: '#88e0ff' });
  text('Fünf Freunde gegen den Drachen', W / 2, 60, { size: 6, align: 'center', color: '#e8f0ff' });
  (game.titleCache || titleItems()).forEach((it, i) => {
    const sel = i === game.menu;
    text((sel ? '> ' : '  ') + it.label, 66, 78 + i * 12, { size: 7, color: sel ? '#f8d848' : '#b8c8e8' });
  });
  if (Math.floor(game.time * 2) % 2 === 0) {
    text(isTouch() ? 'A: Start  ·  ☰: Menü' : 'Leertaste: Start · Esc: Menü · T: 3D · M: Musik', W / 2, 127, { size: 5, align: 'center', color: '#a8f070' });
  }
  // Pflicht-Hinweis nach den Lizenzbedingungen von gen1recomp (siehe LICENSE.md)
  vctx.fillStyle = 'rgba(8,10,24,0.75)';
  vctx.fillRect(0, Math.round(135 * K), W * K, Math.round(25 * K));
  CREDIT.forEach((l, i) => text(l, W / 2, 137 + i * 7, { size: 4, align: 'center', color: '#c8d0e8', shadow: false }));
}

const CREDIT = [
  'Based on the Pokemon Gen 1 Recompilation Project',
  'by BOIS CLUB GAMES, LLC',
  '(https://github.com/bryanthaboi/gen1recomp)',
];

function renderEnd() {
  if (game.endT < 0.6) return;
  if (game.endChapter === 3) return renderEnd3();
  if (game.endChapter === 4) return renderEnd4();
  if (game.endChapter === 5) return renderEnd5();
  const st = game.stats, c = game.maps.cave, cv = game.cave;
  const crystals = c.items.filter((i) => i.type === 'crystal' && i.taken).length;
  text('ENDE KAPITEL 2', W / 2, 18, { size: 12, align: 'center', color: '#f8d848' });
  text('Die Höhle im Buttenberg ist geschafft!', W / 2, 40, { size: 6, align: 'center' });
  const rows = [
    ['Gegner besiegt', `${c.enemies.filter((e) => !e.alive).length} / ${c.enemies.length}`],
    ['Kristalle', `${crystals} / ${c.totalCrystals}`],
    ['Geheimraum', cv.secret ? 'gefunden!' : 'nicht gefunden'],
    ['Diamanten', String(game.diamonds)],
    ['Level', String(st.level)],
  ];
  rows.forEach(([a, b], i) => {
    text(a, 40, 56 + i * 11, { size: 6, color: '#b8c8e8' });
    text(b, 200, 56 + i * 11, { size: 6, align: 'right', color: '#a8f070' });
  });
  text('Als Nächstes: Das Spukhaus am Buttenberg', W / 2, 120, { size: 6, align: 'center' });
  if (game.endT > 1.5 && Math.floor(game.time * 2) % 2 === 0) text('A: Weiterspielen', W / 2, 138, { size: 6, align: 'center', color: '#a8f070' });
}

function renderEnd4() {
  const st = game.stats, v = game.maps.valley, u = game.maps.under;
  const crystals = [...v.items, ...u.items].filter((i) => i.type === 'crystal');
  text('ENDE KAPITEL 4', W / 2, 18, { size: 12, align: 'center', color: '#f8d848' });
  text('Das Tal der Trolle ist geschafft!', W / 2, 40, { size: 6, align: 'center' });
  const rows = [
    ['Kristalle', `${crystals.filter((i) => i.taken).length} / ${crystals.length}`],
    ['Gegner besiegt', String([...v.enemies, ...u.enemies].filter((e) => !e.alive && !e.temp).length)],
    ['Troll Grummel', 'besiegt!'],
    ['Diamanten', String(game.diamonds)],
    ['Level', String(st.level)],
  ];
  rows.forEach(([a, b], i) => {
    text(a, 40, 56 + i * 11, { size: 6, color: '#b8c8e8' });
    text(b, 200, 56 + i * 11, { size: 6, align: 'right', color: '#a8f070' });
  });
  text('Als Nächstes: Der Bergpfad', W / 2, 120, { size: 6, align: 'center' });
  if (game.endT > 1.5 && Math.floor(game.time * 2) % 2 === 0) text('A: Weiterspielen', W / 2, 138, { size: 6, align: 'center', color: '#a8f070' });
}

function renderEnd5() {
  const st = game.stats, mm = game.maps.mountain, lm = game.maps.lair;
  const crystals = [...mm.items, ...lm.items].filter((i) => i.type === 'crystal');
  const rocks = [...mm.enemies, ...lm.enemies].filter((e) => e.type === 'rockmon');
  text('ENDE KAPITEL 5', W / 2, 18, { size: 12, align: 'center', color: '#f8d848' });
  text('Der Bergpfad ist geschafft – Jelly ist frei!', W / 2, 40, { size: 6, align: 'center' });
  const rows = [
    ['Kristalle', `${crystals.filter((i) => i.taken).length} / ${crystals.length}`],
    ['Schläfer nicht geweckt', `${rocks.filter((e) => e.alive && e.asleep).length} / ${rocks.filter((e) => !e.guard).length}`],
    ['Riesen-Felsmonster', 'besiegt!'],
    ['Diamanten', String(game.diamonds)],
    ['Level', String(st.level)],
  ];
  rows.forEach(([a, b], i) => {
    text(a, 28, 56 + i * 11, { size: 6, color: '#b8c8e8' });
    text(b, 212, 56 + i * 11, { size: 6, align: 'right', color: '#a8f070' });
  });
  text('Fortsetzung folgt: Der Drache vom Buttenberg', W / 2, 120, { size: 6, align: 'center' });
  if (game.endT > 1.5 && Math.floor(game.time * 2) % 2 === 0) text('A: Weiterspielen', W / 2, 138, { size: 6, align: 'center', color: '#a8f070' });
}

function renderEnd3() {
  const st = game.stats, m = game.maps.haunted;
  text('ENDE KAPITEL 3', W / 2, 18, { size: 12, align: 'center', color: '#f8d848' });
  text('Das Spukhaus ist geschafft – Happy Halloween!', W / 2, 40, { size: 6, align: 'center' });
  const rows = [
    ['Bonbons', `${m.items.filter((i) => i.type === 'candy' && i.taken).length} / ${m.items.filter((i) => i.type === 'candy').length}`],
    ['Fledermäuse', `${m.enemies.filter((e) => !e.alive).length} / ${m.enemies.length}`],
    ['Kerzen-Code', `${game.haunt.target} = ${HW.toBits(game.haunt.target)}`],
    ['Diamanten', String(game.diamonds)],
    ['Level', String(st.level)],
  ];
  rows.forEach(([a, b], i) => {
    text(a, 40, 56 + i * 11, { size: 6, color: '#b8c8e8' });
    text(b, 200, 56 + i * 11, { size: 6, align: 'right', color: '#a8f070' });
  });
  text('Als Nächstes: Das Tal der Trolle', W / 2, 120, { size: 6, align: 'center' });
  if (game.endT > 1.5 && Math.floor(game.time * 2) % 2 === 0) text('A: Weiterspielen', W / 2, 138, { size: 6, align: 'center', color: '#a8f070' });
}

// --- Skalierung & Loop ---------------------------------------------------------

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const portraitTouch = isTouch() && innerHeight > innerWidth;
  const availW = innerWidth, availH = innerHeight - (portraitTouch ? 210 : 0);
  K = Math.max(1, Math.floor(Math.min(availW / W, availH / H) * dpr));
  view.width = W * K;
  view.height = H * K;
  const cssW = Math.min(availW, (availH * W) / H);
  view.style.width = `${cssW}px`;
  view.style.height = `${(cssW * H) / W}px`;
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

async function boot() {
  Tilt.loadSetting(2);
  newGame();
  initInput(unlockAudio);
  addEventListener('resize', resize);
  resize();
  view.addEventListener('pointerdown', (e) => {
    view.focus();
    unlockAudio();
    if (game.state === 'title' || game.state === 'end') canvasTap = true;
    if (game.ui) {
      const r = view.getBoundingClientRect();
      tapPos = { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
    }
  });
  try { await document.fonts.load(`16px ${FONT}`); } catch { /* Fallback-Schrift */ }
  const urlCode = new URLSearchParams(location.search).get('code');
  if (urlCode) {
    const c = decodeCode(urlCode);
    if (c) { applySave(fromCode(c)); fx.toast('Speichercode aus dem Link geladen!', 3); }
  }
  view.focus();
  requestAnimationFrame(loop);
}

// Für Tests/Debugging von außen erreichbar
window.__theos = { get game() { return game; }, dialog, applySave, goTo: (...a) => goTo(...a), tilt: Tilt, music: Music };

boot();
