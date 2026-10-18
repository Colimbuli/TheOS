// TheOS – "Theo und der Drache vom Buttenberg"
// Top-down-Abenteuer im GBA-Stil. Interne Auflösung 240x160, ganzzahlig hochskaliert.
//
// Kapitel 1: Dorf Lindental – Gefährten sammeln (Fähigkeiten im Laden kaufen, Diamanten in der Schule)
// Kapitel 2: Die Höhle im Buttenberg – Kampf, Rätsel mit allen vier Fähigkeiten

import { initInput, pollInput, input, isTouch } from './input.js';
import { sfx, unlockAudio } from './audio.js';
import { drawTiles, T, TILE, COL, drawDiamond } from './world.js';
import { createVillage, createSchool, createShop, createCave, CAVE_SPAWN } from './maps.js';
import { charSprite, heartSprite, itemSprite, slimeSprite, koboldSprite, trollSprite, fireSprite } from './sprites.js';
import { createNPCs, talkTo, arneDoor, LEVER_DIALOG, HEROES, questHint, ABILITY_NAME } from './npcs.js';
import { Dialog } from './dialog.js';
import { QuizUI, ShopUI } from './ui.js';
import { saveGame, loadGame } from './save.js';

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

function newGame() {
  const maps = { village: createVillage(), school: createSchool(), shop: createShop(), cave: createCave() };
  maps.village.npcs = createNPCs();
  game = {
    state: 'title', time: 0, titleT: 0, endT: 0, menu: 0,
    maps, mapId: 'village',
    party: [member('theo', 10 * TILE, 8 * TILE, 0)],
    stats: { hearts: 3, maxHearts: 3, level: 1, xp: 0 },
    step: 0, owned: {}, diamonds: 0, ammo: 0, hasCloak: false,
    cave: { dug: false, boulder: false, key: false, door: false, statue: false, troll: false, lever: false,
      secret: false, done: false, taken: [], dugCells: [] },
    quizStats: { de: { r: 0, n: 0 }, en: { r: 0, n: 0 }, geo: { r: 0, n: 0 }, ma: { r: 0, n: 0 } },
    quizIntro: false, seenHints: {},
    challenge: { active: false, blocked: 0, timer: 0 },
    cloak: { x: 6 * TILE + 3, y: 19 * TILE + 2, taken: false },
    projectiles: [], particles: [], floats: [], banners: [], toast: null, trail: [],
    shieldT: 0, shieldCD: 0, invisT: 0, actT: 0, hurtT: 0, faintT: 0, fadeT: 0, swingT: 0,
    checkpoint: null, bushes: 0, treasures: 0, kills: 0,
    ui: null, saveT: 0, dropN: 0,
  };
  spawnEnemies(maps.cave);
}

// Gespeicherten Stand auf frisch aufgebaute Karten anwenden
function applySave(d) {
  newGame();
  Object.assign(game, {
    step: d.step, owned: d.owned || {}, diamonds: d.diamonds, ammo: d.ammo, hasCloak: d.hasCloak,
    stats: d.stats, quizStats: d.quizStats || game.quizStats, quizIntro: d.quizIntro, seenHints: d.seenHints || {},
    checkpoint: d.checkpoint, bushes: d.bushes || 0, treasures: d.treasures || 0, kills: d.kills || 0,
  });
  Object.assign(game.cave, d.cave || {});
  const v = game.maps.village, c = game.maps.cave;
  if (game.step >= 3) v.setTile(24, 9, T.PATH);
  if (game.hasCloak || game.step >= 5) v.setTile(7, 16, T.TUNNEL);
  if (game.hasCloak || game.step >= 6) game.cloak.taken = true;
  if (game.step >= 7) v.openGate();
  game.party = d.party.map((id) => member(id, d.x, d.y, d.dir));
  v.npcs = v.npcs.filter((n) => !d.party.includes(n.id));
  const cv = game.cave;
  for (const k of cv.dugCells) { const [x, y] = k.split(',').map(Number); c.setTile(x, y, T.CFLOOR); }
  if (cv.boulder) { c.setTile(24, 11, T.CFLOOR); c.setTile(25, 11, T.BOULDER); }
  if (cv.door) c.setTile(15, 7, T.CFLOOR);
  if (cv.statue) c.killStatue();
  if (cv.lever) { c.setTile(2, 9, T.CFLOOR); c.lever.pulled = true; }
  for (const it of c.items) if (cv.taken.includes(it.id)) it.taken = true;
  game.mapId = d.mapId;
  game.state = 'play';
}

function spawnEnemies(m) {
  m.enemies = (m.enemySpawns || []).map((s, i) => ({
    id: i, type: s.type, x: s.x * TILE, y: s.y * TILE, hp: s.type === 'slime' ? 2 : 3,
    cd: 1 + Math.random() * 1.5, hurtT: 0, alive: true, anim: Math.random() * 3, flip: false, throwT: 0,
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
    const v = game.maps.village;
    const i = v.npcs.findIndex((n) => n.id === id);
    const from = i >= 0 ? v.npcs.splice(i, 1)[0] : leader();
    const m = member(id, from.x, from.y, from.dir);
    game.party.push(m);
    poof(m.x + 8, m.y + 10);
    snapFollowers();
    save();
  },
  openQuiz() { game.ui = new QuizUI(game, fx); },
  openShop() { game.ui = new ShopUI(game, fx); },
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
  if (mapId === 'cave' && !game.checkpoint) game.checkpoint = { ...CAVE_SPAWN };
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
  pollInput();
  const tap = canvasTap;
  canvasTap = false;
  const tp = tapPos;
  tapPos = null;

  if (game.state === 'title') {
    game.titleT += dt;
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
      const L = leader();
      L.x = 3 * TILE; L.y = 10 * TILE + 8; L.dir = 1;
      regroup();
      save();
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

  if (game.ui) {
    game.ui.update(input, dt, tp);
    if (game.ui.closed) { game.ui = null; save(); }
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
  checkPickups();
  checkKonrad();
  checkAreas();
  checkWarps();

  game.saveT += dt;
  if (game.saveT > 5) { game.saveT = 0; save(); }
}

function titleItems() {
  const s = loadGame();
  const items = [];
  if (s) items.push({ id: 'continue', label: 'Weiterspielen' });
  items.push({ id: 'new', label: 'Neues Spiel' });
  return items;
}

function startFromTitle(id) {
  sfx.start();
  if (id === 'continue') {
    applySave(loadGame());
    fx.toast(`Willkommen zurück! Du hast ${game.diamonds} Diamanten.`, 3);
    return;
  }
  game.state = 'play';
  game.mapId = 'village';
  dialog.open([
    'Ein sonniger Morgen in Lindental. Theo hat einen großen Plan:',
    'Der böse Drache am Buttenberg muss besiegt werden! Aber dafür braucht er Freunde – und Fähigkeiten.',
    'Fähigkeiten gibt es in Brunos Laden. Bezahlt wird mit Diamanten – die verdienst du in der Schule!',
    'Schule und Laden sind im Süden des Dorfes. Laufen: Pfeile/WASD. Reden: Leertaste oder A. Fähigkeit: J oder B.',
  ]);
}

function updateTimers(dt) {
  game.shieldT = Math.max(0, game.shieldT - dt);
  game.shieldCD = Math.max(0, game.shieldCD - dt);
  game.hurtT = Math.max(0, game.hurtT - dt);
  game.swingT = Math.max(0, game.swingT - dt);
  if (game.toast && (game.toast.t -= dt) <= 0) game.toast = null;
  if (game.invisT > 0) {
    game.invisT -= dt;
    if (game.invisT <= 0) endInvisibility();
  }
}

function updateLeader(dt) {
  const L = leader();
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
    const sp = SPEED * dt * (game.shieldT > 0 ? 0.6 : 1);
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
  if (m.id === 'village' && tx === 24 && ty === 7 && game.step === 2) { open(arneDoor(game, fx)); return; }

  const text = m.textAt(tx, ty);
  if (text) { dialog.open(text); return; }
  const t = m.tile(tx, ty);
  if (t === T.GATE) dialog.open(['Das Tor zum Buttenberg ist fest verschlossen.', 'Der Hebel dafür ist gleich daneben – direkt vor Konrads Nase.']);
  else if (t === T.BOULDER) dialog.open(['Ein riesiger Felsbrocken. Dafür braucht man Felix\' Superstärke!']);
  else if (t === T.DIG || t === T.EWALL) dialog.open(['Lockere Erde. Hier könnte Arne graben...']);
  else if (t === T.LOCKED) {
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
  open({
    lines: LEVER_DIALOG,
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

    case 'arne':
      if (t === T.DIG || t === T.DIGFENCE || t === T.EWALL) {
        if (!o.dig) return needBuy('dig');
        return arneDig(L, tx, ty, t);
      }
      if (o.shovel) return arneSwing(L);
      if (!o.dig) return needBuy('dig');
      game.actT = 0.3; sfx.bump(); float('Zu hart!', L.x + 8, L.y - 6, '#ffb0b0');
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
    } else { sfx.bump(); float('Klemmt!', L.x + 8, L.y - 6, '#ffb0b0'); }
    return;
  }
  m.setTile(tx, ty, T.GRASS);
  game.bushes++;
  sfx.push();
  burst(tx * TILE + 8, ty * TILE + 8, [COL.bush, COL.bushL]);
  fx.gainXP(3, tx * TILE + 8, ty * TILE);
}

const TREASURES = ['Ein glänzender Kiesel!', 'Ein alter Knopf!', 'Eine Murmel!'];
const DIRT = ['#a0703e', '#7a5030', '#c89060'];

function arneDig(L, tx, ty, t) {
  game.actT = 0.3;
  const m = map();
  sfx.dig();
  if (t === T.DIG) {
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
  } else if (t === T.EWALL) {
    m.setTile(tx, ty, T.CFLOOR);
    game.cave.dugCells.push(`${tx},${ty}`);
    burst(tx * TILE + 8, ty * TILE + 10, DIRT, 16);
    if (tx === 11 && ty === 19) {
      game.cave.secret = true;
      fx.banner('GEHEIMGANG!', 'Arne hat einen versteckten Raum gefunden', '#88e0ff');
      fx.gainXP(10);
    } else {
      if (!game.cave.dug) fx.gainXP(5);
      game.cave.dug = true;
      float('Durchgebuddelt!', tx * TILE + 8, ty * TILE - 6, '#ffffff');
    }
    save();
  }
}

function arneSwing(L) {
  game.actT = 0.25;
  game.swingT = 0.25;
  sfx.swing();
  const f = frontPoint(L, 12);
  for (const e of map().enemies) {
    if (!e.alive) continue;
    if (Math.hypot(e.x + 8 - f.x, e.y + 10 - f.y) < 16) {
      const [dx, dy] = DIRV[L.dir];
      damageEnemy(e, 2, dx * 14, dy * 14);
    }
  }
}

// --- Gegner, Geschosse, Statue, Troll ---------------------------------------------

function hurt(n) {
  if (game.hurtT > 0 || game.faintT > 0) return;
  const st = game.stats;
  st.hearts -= n;
  game.hurtT = 1;
  sfx.hurt();
  if (st.hearts > 0 || game.challenge.active) return;
  if (game.mapId === 'cave') {
    st.hearts = 0;
    game.faintT = 1.6;
    game.invisT = 0;
    fx.toast('Puh! Die Gruppe ist erschöpft... zurück zum letzten Rastplatz.', 2.5);
  } else st.hearts = 1;
}

function respawn() {
  const cp = game.checkpoint || CAVE_SPAWN;
  const L = leader();
  L.x = cp.x; L.y = cp.y; L.dir = cp.dir;
  regroup();
  game.stats.hearts = game.stats.maxHearts;
  game.projectiles = [];
  game.hurtT = 1.5;
}

function damageEnemy(e, dmg, kx = 0, ky = 0) {
  e.hp -= dmg;
  e.hurtT = 0.25;
  moveEnemy(e, kx, ky);
  if (e.hp > 0) { sfx.hit(); return; }
  e.alive = false;
  game.kills++;
  sfx.pop();
  burst(e.x + 8, e.y + 8, CONFETTI, 18, 60);
  fx.gainXP(e.type === 'slime' ? 3 : 6, e.x + 8, e.y);
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

    if (e.type === 'slime') {
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
    if (visible && overlap(L.x + 3, L.y + 6, 10, 9, e.x + 3, e.y + 6, 10, 9)) {
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

function updateProjectiles(dt) {
  const L = leader();
  const m = map();
  for (const p of game.projectiles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt;
    const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);

    if (m.statue && m.statue.alive && tx === m.statue.x && ty === m.statue.y && p.owner === 'player') {
      p.t = 0;
      if (p.kind === 'fire') {
        m.killStatue();
        game.cave.statue = true;
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
      burst(p.x, p.y, p.kind === 'nut' ? ['#7a3a12'] : ['#ffb040', '#ff6020'], 4, 30);
      continue;
    }
    if (p.owner === 'enemy') {
      if (Math.hypot(p.x - (L.x + 8), p.y - (L.y + 10)) < 8) {
        const shield = L.id === 'theo' && game.shieldT > 0;
        if (p.challenge) {
          p.t = 0;
          if (shield) { game.challenge.blocked++; sfx.block(); burst(p.x, p.y, ['#a8e8ff', '#ffffff'], 6, 40); fx.gainXP(2, L.x + 8, L.y - 4); }
          else hurt(1);
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
        damageEnemy(e, p.kind === 'fire' ? 3 : 1, (p.vx / vl) * 6, (p.vy / vl) * 6);
        break;
      }
    }
    const troll = m.npcs.find((n) => n.id === 'troll');
    if (p.t > 0 && troll && Math.hypot(p.x - (troll.x + 8), p.y - (troll.y + 6)) < 12) {
      p.t = 0;
      fx.toast('Troll: HOHOHO! Das kitzelt!', 2);
    }
  }
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
        'Felix: Wow! Fünf Stück – du bist echt mutig!',
        'Felix: Okay, ich bin dabei. Mit Superstärke schieb ich jeden Felsen weg! Die gibt\'s bei Bruno.',
        'Tipp: Mit Q (Tastatur), L/R (Gamepad) oder dem Pfeil-Knopf wechselst du, wer vorne läuft.',
      ],
      after() {
        fx.join('felix');
        game.step = 2;
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
      if (game.step === 4) game.step = 5;
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
    if (!it.drop) game.cave.taken.push(it.id);
    sfx.item();
    switch (it.type) {
      case 'crystal': game.diamonds += 2; fx.toast('Ein Kristall! +2 Diamanten', 2.5); break;
      case 'apple': st.hearts = Math.min(st.maxHearts, st.hearts + 1); fx.toast('Mmh, ein Apfel! +1 Herz', 2); break;
      case 'bag':
        game.ammo += 10;
        fx.toast(game.owned.sling ? '+10 Kastanien für Felix!' : '+10 Kastanien – mit einer Schleuder könnte Felix sie werfen.', 3);
        break;
      case 'key': game.cave.key = true; fx.banner('SCHLÜSSEL GEFUNDEN', 'Er passt in die Schlosstür in der Halle', '#f8d848'); break;
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
    if (tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1) game.checkpoint = { x, y, dir };
  }
}

function checkWarps() {
  const m = map();
  const L = leader();
  if (game.invisT > 0 && m.id !== 'cave') return;
  const tx = Math.floor((L.x + 8) / TILE), ty = Math.floor((L.y + 12) / TILE);
  const wp = m.warpAt(tx, ty);
  if (wp) { goTo(wp.to, wp.tx, wp.ty, wp.dir); return; }
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
      game.cave.done = true;
      game.state = 'end';
      game.endT = 0;
      sfx.levelUp();
      save();
    }
  }
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
  return {
    x: Math.round(clamp(L.x + 8 - W / 2, m.w * TILE - W)),
    y: Math.round(clamp(L.y + 8 - H / 2, m.h * TILE - H)),
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
  g.globalAlpha = alpha;
  shadow(sx, sy);
  if (e.spear && e.dir === 1) drawSpear(sx, sy);
  const spr = charSprite(e.pal, e.dir, walkFrame(e));
  g.drawImage(spr, sx, sy + 16 - spr.height);
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
    g.fillStyle = i > 11 ? '#c8c8d8' : '#7a4a24';
    const w = i > 11 ? 3 : 2;
    g.fillRect(Math.round(hx + Math.cos(a) * i) - 1, Math.round(hy + Math.sin(a) * i) - 1, w, w);
  }
}

function drawLeader(cam) {
  const L = leader();
  if (game.hurtT > 0 && Math.floor(game.time * 20) % 2) return;
  const sx = Math.round(L.x - cam.x), sy = Math.round(L.y - cam.y);
  const alpha = game.invisT > 0 ? 0.28 + 0.08 * Math.sin(game.time * 8) : 1;
  if (game.swingT > 0 && L.dir === 1) drawShovel(L, sx, sy);
  drawCharacter(L, cam, alpha);
  if (game.swingT > 0 && L.dir !== 1) drawShovel(L, sx, sy);
  if (game.shieldT > 0) drawShield(sx, sy);
}

function bubble(e, cam) {
  const sx = Math.round(e.x - cam.x) + 4, sy = Math.round(e.y - cam.y) - 13 + Math.round(Math.sin(game.time * 5));
  g.fillStyle = COL.out; g.fillRect(sx, sy, 8, 10);
  g.fillStyle = '#fff'; g.fillRect(sx + 1, sy + 1, 6, 8);
  g.fillStyle = '#e83848'; g.fillRect(sx + 3, sy + 2, 2, 4); g.fillRect(sx + 3, sy + 7, 2, 1);
}

function renderWorld(cam) {
  const m = map();
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  drawTiles(g, m, cam.x, cam.y, game.time);

  const list = [];
  for (const o of m.objects) list.push({ y: o.sortY, draw: () => o.draw(g, cam.x, cam.y, game.time) });
  for (const n of m.npcs) list.push({ y: n.y + 16, draw: () => drawCharacter(n, cam) });
  for (const it of m.items) {
    if (it.taken) continue;
    list.push({ y: it.y + 12, draw: () => {
      const bob = it.type === 'crystal' || it.type === 'key' ? Math.round(Math.sin(game.time * 3 + it.x) * 1.5) : 0;
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(Math.round(it.x - cam.x) + 2, Math.round(it.y - cam.y) + 11, 8, 2);
      g.drawImage(itemSprite(it.type), Math.round(it.x - cam.x), Math.round(it.y - cam.y) + bob);
    } });
  }
  if (m.id === 'village' && !game.cloak.taken) {
    const c = game.cloak;
    list.push({ y: c.y + 10, draw: () => g.drawImage(itemSprite('cloak'), Math.round(c.x - cam.x), Math.round(c.y - cam.y + Math.sin(game.time * 3))) });
  }
  for (const e of m.enemies) {
    if (!e.alive) continue;
    list.push({ y: e.y + 16, draw: () => {
      if (e.hurtT > 0 && Math.floor(game.time * 30) % 2) return;
      const spr = e.type === 'slime' ? slimeSprite(Math.sin(e.anim * 7) > 0 ? 1 : 0) : koboldSprite(e.flip, e.throwT > 0 ? 1 : 0);
      const sx = Math.round(e.x - cam.x), sy = Math.round(e.y - cam.y);
      shadow(sx, sy);
      g.drawImage(spr, sx, sy);
    } });
  }
  if (game.state !== 'title') {
    game.party.forEach((p, i) => list.push({ y: p.y + 16 - (i ? 0.1 : 0), draw: () => (i === 0 ? drawLeader(cam) : drawCharacter(p, cam)) }));
  }
  list.sort((a, b) => a.y - b.y).forEach((e) => e.draw());

  for (const p of game.projectiles) {
    const px = Math.round(p.x - cam.x), py = Math.round(p.y - cam.y);
    if (p.kind === 'nut') g.drawImage(itemSprite('chestnut'), px - 2, py - 2);
    else g.drawImage(fireSprite(Math.floor(game.time * 10) % 2, !!p.reflected), px - 4, py - 4);
  }
  for (const pt of game.particles) { g.fillStyle = pt.c; g.fillRect(Math.round(pt.x - cam.x), Math.round(pt.y - cam.y), 2, 2); }

  // Höhle: Dunkelheit mit Lichtkreis um die Gruppe
  if (m.theme === 'cave' && game.state !== 'title') {
    const L = leader();
    const lx = L.x - cam.x + 8, ly = L.y - cam.y + 8;
    const grad = g.createRadialGradient(lx, ly, 40, lx, ly, 170);
    grad.addColorStop(0, 'rgba(6,4,10,0)');
    grad.addColorStop(1, 'rgba(6,4,10,0.55)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  }

  if (game.state === 'play' && m.id === 'village') {
    const s = game.step;
    const npc = (id) => m.npcs.find((n) => n.id === id);
    if (s === 0 && npc('felix')) bubble(npc('felix'), cam);
    if ((s === 3 || s === 5) && npc('mama')) bubble(npc('mama'), cam);
  }
}

function abilityLabel(id) {
  const o = game.owned;
  const parts = {
    theo: [o.shield && 'Schild'],
    felix: [o.strength && 'Stärke', o.sling && `Schleuder (${game.ammo})`],
    arne: [o.dig && 'Graben', o.shovel && 'Schaufel'],
    friedrich: [o.invis && 'Unsichtbar'],
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
    const x = 176 + i * 15, y = 13;
    g.fillStyle = i === 0 ? '#f8d848' : 'rgba(10,14,32,0.6)';
    g.fillRect(x - 1, y - 1, 14, 11);
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
  }
  if (game.fadeT > 0) { g.fillStyle = `rgba(0,0,0,${game.fadeT / 0.35})`; g.fillRect(0, 0, W, H); }
  if (game.faintT > 0) { g.fillStyle = `rgba(0,0,0,${Math.min(0.85, 1.6 - game.faintT)})`; g.fillRect(0, 0, W, H); }

  vctx.imageSmoothingEnabled = false;
  vctx.drawImage(low, 0, 0, W * K, H * K);

  if (game.state === 'title') return renderTitle();
  if (game.state === 'end') return renderEnd();

  if (game.ui) {
    // Zweiter Durchgang: Flächen sind schon gezeichnet, jetzt nur noch die Texte in voller Auflösung
    game.ui.render(NOOP_CTX, text);
    return;
  }

  const st = game.stats, L = leader();
  text(String(game.diamonds), 14 + st.maxHearts * 8, 4, { size: 6, color: '#88f0ff' });
  text(`LV${st.level}`, 150, 4, { size: 7, color: '#f8d848' });
  text(`${HEROES[L.id].name} – B: ${abilityLabel(L.id)}`, 4, 14, { size: 5, color: '#ffffff' });
  text(questHint(game), 4, 22, { size: 5, color: '#c8e0ff' });
  if (game.challenge.active) text(`Kastanien: ${game.challenge.blocked}/5`, W / 2, 64, { size: 7, align: 'center', color: '#f8d848' });
  if (game.invisT > 0) text(`Unsichtbar: ${Math.ceil(game.invisT)}`, W / 2, 64, { size: 7, align: 'center', color: '#d0c8ff' });
  if (game.toast && !dialog.active) {
    const lines = wrapText(game.toast.text, 36).slice(0, 3);
    lines.forEach((l, i) => text(l, W / 2, H - 6 - lines.length * 9 + i * 9, { size: 6, align: 'center' }));
  }

  for (const f of game.floats) text(f.text, f.x - cam.x, f.y - cam.y, { size: 6, align: 'center', color: f.color });

  const b = game.banners[0];
  if (b) {
    vctx.fillStyle = 'rgba(10,14,32,0.88)';
    vctx.fillRect(Math.round(24 * K), Math.round(32 * K), Math.round(192 * K), Math.round(26 * K));
    text(b.title, W / 2, 36, { size: 8, align: 'center', color: b.color });
    text(b.sub, W / 2, 48, { size: 6, align: 'center' });
  }

  if (dialog.active) dialog.visibleLines().forEach((l, i) => text(l, 12, 119 + i * 11, { size: 8, shadow: false }));
}

const NOOP_CTX = { fillStyle: '', fillRect() {} };

function renderTitle() {
  text('THEOS', W / 2, 24, { size: 24, align: 'center', color: '#f8d848' });
  text('Theo und der Drache vom Buttenberg', W / 2, 58, { size: 6, align: 'center', color: '#e8f0ff' });
  (game.titleCache || titleItems()).forEach((it, i) => {
    const sel = i === game.menu;
    text((sel ? '> ' : '  ') + it.label, 70, 88 + i * 13, { size: 7, color: sel ? '#f8d848' : '#b8c8e8' });
  });
  if (Math.floor(game.time * 2) % 2 === 0) {
    text(isTouch() ? 'Steuerkreuz wählen, A starten' : 'Hoch/Runter wählen, Leertaste/A starten', W / 2, 136, { size: 5, align: 'center', color: '#a8f070' });
  }
}

function renderEnd() {
  if (game.endT < 0.6) return;
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
  text('Fortsetzung folgt: Die Drachenhöhle', W / 2, 120, { size: 6, align: 'center' });
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
  view.focus();
  requestAnimationFrame(loop);
}

// Für Tests/Debugging von außen erreichbar
window.__theos = { get game() { return game; }, dialog, applySave, goTo: (...a) => goTo(...a) };

boot();
