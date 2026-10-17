// TheOS – Kapitel 1 "Die Gefährten"
// Interne Auflösung 240x160 (wie der GBA), ganzzahlig hochskaliert.

import { initInput, pollInput, input, isTouch } from './input.js';
import { sfx, unlockAudio } from './audio.js';
import { createWorld, drawTiles, T, TILE, MAP_W, MAP_H, COL } from './world.js';
import { charSprite, heartSprite, itemSprite } from './sprites.js';
import { createNPCs, talkTo, arneDoor, LEVER_DIALOG, HEROES, STEP_HINT } from './npcs.js';
import { Dialog } from './dialog.js';

const W = 240, H = 160;
const FONT = '"Press Start 2P", monospace';
const DIRV = [[0, 1], [0, -1], [-1, 0], [1, 0]]; // runter, hoch, links, rechts
const OPPOSITE = [1, 0, 3, 2];
const SPEED = 72;           // Pixel pro Sekunde
const FOLLOW_GAP = 9;       // Trail-Punkte (je 1.5 px) zwischen zwei Gefährten
const INVIS_TIME = 8;
const KONRAD_ZONE = { x0: 13, x1: 19, y0: 2, y1: 5 }; // hier sieht die Wache alles

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

function newGame() {
  game = {
    state: 'title',
    time: 0,
    titleT: 0,
    endT: 0,
    world: createWorld(),
    party: [member('theo', 10 * TILE, 8 * TILE, 0)],
    stats: { hearts: 3, maxHearts: 3, level: 1, xp: 0 },
    npcs: createNPCs(),
    step: 0,
    challenge: { active: false, blocked: 0, timer: 0 },
    projectiles: [],
    cloak: { x: 6 * TILE + 3, y: 19 * TILE + 4, taken: false },
    hasCloak: false,
    trail: [],
    particles: [],
    floats: [],
    banners: [],
    shieldT: 0, shieldCD: 0, invisT: 0, actT: 0, hurtT: 0,
    bushes: 0, treasures: 0,
  };
}

const needXP = (lvl) => 10 + lvl * 10;

const fx = {
  sfx,
  banner(title, sub, color = '#f8d848') { game.banners.push({ title, sub, color, t: 2.2 }); },
  gainXP(n, wx, wy) {
    const st = game.stats;
    st.xp += n;
    if (wx != null) float(`+${n} EP`, wx, wy);
    while (st.xp >= needXP(st.level)) {
      st.xp -= needXP(st.level);
      st.level++;
      st.maxHearts = Math.min(10, st.maxHearts + 1);
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
    const i = game.npcs.findIndex((n) => n.id === id);
    const from = i >= 0 ? game.npcs.splice(i, 1)[0] : leader();
    const m = member(id, from.x, from.y, from.dir);
    game.party.push(m);
    poof(m.x + 8, m.y + 10);
    snapFollowers();
    poof(m.x + 8, m.y + 10);
  },
};

function float(text, x, y, color = '#f8d848') { game.floats.push({ text, x, y, t: 1.1, color }); }

function poof(x, y) {
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    game.particles.push({ x, y, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40 - 10, t: 0.4, c: '#f0f0f8', g: 0 });
  }
}

function burst(x, y, colors, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 30 + Math.random() * 50;
    game.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: 0.5 + Math.random() * 0.3,
      c: colors[i % colors.length], g: 220 });
  }
}

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
  game.party.forEach((f, i) => {
    if (i === 0) return;
    f.x = L.x; f.y = Math.min(L.y + i * 12, (MAP_H - 3) * TILE); f.dir = L.dir;
  });
}

function switchLeader() {
  if (game.party.length < 2 || game.invisT > 0 || game.challenge.active) return;
  const old = game.party[0], next = game.party[1];
  // Der Nächste übernimmt den Platz vorne, der bisherige Anführer geht ans Ende
  game.party.push(game.party.shift());
  next.x = old.x; next.y = old.y; next.dir = old.dir;
  snapFollowers();
  poof(next.x + 8, next.y + 10);
  sfx.swap();
  float(HEROES[next.id].name, next.x + 8, next.y - 6, '#ffffff');
}

// --- Kollision & Bewegung --------------------------------------------------------

const solidAt = (x, y) => game.world.isSolidTile(Math.floor(x / TILE), Math.floor(y / TILE));
const overlap = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

function blocked(e, nx, ny) {
  const bx = nx + 3, by = ny + 8, bw = 10, bh = 7;
  if (solidAt(bx, by) || solidAt(bx + bw - 1, by) || solidAt(bx, by + bh - 1) || solidAt(bx + bw - 1, by + bh - 1)) return true;
  for (const o of [leader(), ...game.npcs]) {
    if (o === e) continue;
    if (overlap(bx, by, bw, bh, o.x + 3, o.y + 8, 10, 7)) return true;
  }
  return false;
}

function occupied(tx, ty) {
  return [leader(), ...game.npcs].some((o) => overlap(tx * TILE, ty * TILE, TILE, TILE, o.x + 3, o.y + 8, 10, 7));
}

// Seitliches "Rutschen" um Ecken, damit man nicht an Kanten hängen bleibt.
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

// --- Update ---------------------------------------------------------------------

let canvasTap = false; // Klick/Tipp auf das Bild startet bzw. startet neu

function update(dt) {
  game.time += dt;
  pollInput();
  const tap = canvasTap;
  canvasTap = false;

  if (game.state === 'title') {
    game.titleT += dt;
    if (input.aPressed || tap) {
      sfx.start();
      game.state = 'play';
      dialog.open([
        'Ein sonniger Morgen in Lindental. Theo hat einen großen Plan:',
        'Der böse Drache am Buttenberg muss besiegt werden!',
        'Aber allein schafft er das nicht. Zuerst muss er seinen Freund Felix überzeugen.',
        'Laufen: Pfeile, WASD oder Steuerkreuz. Reden: Leertaste oder A. Spezialkraft: J oder B.',
      ]);
    }
    return;
  }

  if (game.state === 'end') {
    game.endT += dt;
    if (game.endT > 1.5 && (input.aPressed || tap)) newGame();
    return;
  }

  updateEffects(dt);
  for (const n of game.npcs) n.moving = false;

  if (dialog.active) {
    dialog.update(dt, input.aPressed, sfx.blip);
    return;
  }

  updateTimers(dt);
  updateLeader(dt);
  if (dialog.active) return; // gerade geöffneter Dialog hat Vorrang
  updateChallenge(dt);
  checkPickups();
  checkKonrad();
}

function updateTimers(dt) {
  game.shieldT = Math.max(0, game.shieldT - dt);
  game.shieldCD = Math.max(0, game.shieldCD - dt);
  game.hurtT = Math.max(0, game.hurtT - dt);
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
    const sp = SPEED * dt;
    if (move(L, (ix / len) * sp, (iy / len) * sp, true)) {
      L.moving = true;
      L.anim += dt;
      pushTrail(L);
    }
  }
  if (game.invisT <= 0) snapFollowers(); // unsichtbar schleicht Friedrich allein

  if (game.world.gateOpen && L.y + 8 < 2) {
    game.state = 'end';
    game.endT = 0;
    sfx.levelUp();
  }
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
const npcAt = (pt) => game.npcs.find((n) => inBox(pt, n.x - 1, n.y - 2, 18, 22)) || null;

function open(d) { dialog.open(d.lines, d.after); }

function interact() {
  const L = leader();
  const w = game.world;
  const { tx, ty, f } = frontTile(L);

  let n = npcAt(f);
  if (!n && w.isCounter(tx, ty)) n = npcAt(frontPoint(L, 30)); // über die Theke reden
  if (n) {
    n.dir = OPPOSITE[L.dir];
    open(talkTo(n, game, fx));
    return;
  }

  if (w.isLever(tx, ty)) { pullLever(); return; }
  if (tx === 24 && ty === 7 && game.step === 2) { open(arneDoor(game, fx)); return; }

  const text = w.textAt(tx, ty);
  if (text) { dialog.open(text); return; }
  const t = w.tile(tx, ty);
  if (t === T.GATE) dialog.open(['Das Tor zum Buttenberg ist fest verschlossen.', 'Der Hebel dafür ist gleich daneben – direkt vor Konrads Nase.']);
  else if (t === T.BOULDER) dialog.open(['Ein riesiger Felsbrocken. Dafür braucht man richtig viel Kraft!']);
  else if (t === T.DIG) dialog.open(['Lockere Erde. Hier könnte man graben...']);
}

function pullLever() {
  const w = game.world;
  if (w.gateOpen) { dialog.open(['Der Hebel steht auf OFFEN.']); return; }
  open({
    lines: LEVER_DIALOG,
    after() {
      w.openGate();
      game.step = 7;
      sfx.item();
      fx.banner('DAS TOR IST OFFEN', 'Auf zum Buttenberg!', '#a8f070');
      fx.gainXP(20);
      endInvisibility();
    },
  });
}

// --- Spezialfähigkeiten -------------------------------------------------------------

function useAbility() {
  const L = leader();
  switch (L.id) {
    case 'theo':
      if (game.shieldCD > 0) return;
      game.shieldT = 0.75;
      game.shieldCD = 0.95;
      sfx.shield();
      return;
    case 'felix': return felixStrength(L);
    case 'arne': return arneDig(L);
    case 'friedrich':
      if (game.invisT > 0) { endInvisibility(); return; }
      game.invisT = INVIS_TIME;
      sfx.invisOn();
      float('Psst...', L.x + 8, L.y - 6, '#d0c8ff');
  }
}

function endInvisibility() {
  const was = game.invisT > 0 || leader().id === 'friedrich';
  game.invisT = 0;
  if (!was) return;
  sfx.invisOff();
  snapFollowers();
  for (const f of game.party.slice(1)) poof(f.x + 8, f.y + 10);
}

function felixStrength(L) {
  game.actT = 0.25;
  const { tx, ty } = frontTile(L);
  const t = game.world.tile(tx, ty);
  const [dx, dy] = DIRV[L.dir];
  if (t === T.BOULDER) {
    if (game.world.pushBoulder(tx, ty, dx, dy, occupied)) {
      sfx.push();
      burst(tx * TILE + 8 + dx * 8, ty * TILE + 14, ['#c8b49a', '#9c8670'], 8);
      float('Hau-Ruck!', L.x + 8, L.y - 6, '#ffffff');
    } else {
      sfx.bump();
      float('Klemmt!', L.x + 8, L.y - 6, '#ffb0b0');
    }
  } else if (t === T.BUSH) {
    game.world.setTile(tx, ty, T.GRASS);
    game.bushes++;
    sfx.push();
    burst(tx * TILE + 8, ty * TILE + 8, [COL.bush, COL.bushL]);
    fx.gainXP(3, tx * TILE + 8, ty * TILE);
  } else {
    sfx.swing();
    float('Hau-Ruck!', L.x + 8, L.y - 6, '#ffffff');
  }
}

const TREASURES = ['Ein glänzender Kiesel!', 'Ein alter Knopf!', 'Eine Murmel!'];

function arneDig(L) {
  game.actT = 0.3;
  const { tx, ty } = frontTile(L);
  const w = game.world;
  const t = w.tile(tx, ty);
  const dirt = ['#a0703e', '#7a5030', '#c89060'];
  if (t === T.DIG) {
    w.setTile(tx, ty, T.HOLE);
    sfx.dig();
    burst(tx * TILE + 8, ty * TILE + 8, dirt);
    float(TREASURES[game.treasures % TREASURES.length], tx * TILE + 8, ty * TILE - 6, '#ffffff');
    game.treasures++;
    fx.gainXP(5, tx * TILE + 8, ty * TILE + 4);
  } else if (t === T.DIGFENCE) {
    w.setTile(tx, ty, T.TUNNEL);
    sfx.dig();
    burst(tx * TILE + 8, ty * TILE + 12, dirt, 14);
    float('Tunnel!', tx * TILE + 8, ty * TILE - 6, '#ffffff');
    fx.gainXP(5);
  } else {
    sfx.bump();
    burst(tx * TILE + 8, ty * TILE + 12, dirt, 4);
    float('Zu hart!', L.x + 8, L.y - 6, '#ffb0b0');
  }
}

// --- Kastanienprobe ------------------------------------------------------------------

function updateChallenge(dt) {
  const ch = game.challenge;
  const L = leader();
  const felix = game.npcs.find((n) => n.id === 'felix');

  if (ch.active && felix) {
    const dx = L.x - felix.x, dy = L.y - felix.y;
    felix.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
    ch.timer -= dt;
    if (ch.timer <= 0 && !game.projectiles.length) {
      const sx = felix.x + 8, sy = felix.y + 6;
      const tx = L.x + 8, ty = L.y + 9;
      const d = Math.hypot(tx - sx, ty - sy) || 1;
      game.projectiles.push({ x: sx, y: sy, vx: ((tx - sx) / d) * 80, vy: ((ty - sy) / d) * 80, t: 3 });
      sfx.swing();
      ch.timer = 0.9 + Math.random() * 0.7;
    }
  }

  for (const p of game.projectiles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt;
    if (Math.hypot(p.x - (L.x + 8), p.y - (L.y + 9)) < 9) {
      p.t = 0;
      if (game.shieldT > 0) {
        ch.blocked++;
        sfx.block();
        burst(p.x, p.y, ['#a8e8ff', '#ffffff'], 6);
        fx.gainXP(2, L.x + 8, L.y - 4);
      } else {
        game.stats.hearts--;
        game.hurtT = 0.6;
        sfx.hurt();
        burst(p.x, p.y, ['#8a4a1a', '#c88040'], 5);
      }
    }
  }
  game.projectiles = game.projectiles.filter((p) => p.t > 0);

  if (!ch.active) return;
  if (ch.blocked >= 5) {
    ch.active = false;
    game.projectiles = [];
    open({
      lines: [
        'Felix: Wow! Fünf Stück – du bist echt mutig!',
        'Felix: Okay, ich bin dabei. Mit meinen Muckis schieb ich jeden Felsen weg!',
        'Tipp: Mit Q (Tastatur), L/R (Gamepad) oder dem Pfeil-Knopf wechselst du, wer vorne läuft.',
      ],
      after() {
        fx.join('felix');
        game.step = 2;
        sfx.item();
        fx.banner('FELIX IST DABEI', 'B: Superstärke', '#a8f070');
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

// --- Tarnumhang & Wache ----------------------------------------------------------------

function checkPickups() {
  const c = game.cloak, L = leader();
  if (c.taken || !overlap(L.x + 3, L.y + 8, 10, 7, c.x, c.y, 10, 8)) return;
  c.taken = true;
  game.hasCloak = true;
  if (game.step === 4) game.step = 5;
  sfx.item();
  poof(c.x + 5, c.y + 4);
  fx.banner('TARNUMHANG GEFUNDEN', 'Bring ihn zu Mama', '#88e0ff');
}

function checkKonrad() {
  if (game.world.gateOpen || game.invisT > 0) return;
  const L = leader();
  const tx = Math.floor((L.x + 8) / TILE), ty = Math.floor((L.y + 12) / TILE);
  const z = KONRAD_ZONE;
  if (tx < z.x0 || tx > z.x1 || ty < z.y0 || ty > z.y1) return;
  const konrad = game.npcs.find((n) => n.id === 'konrad');
  konrad.dir = 3;
  L.x = 15 * TILE + 8;
  L.y = 6 * TILE + 8;
  L.dir = 0;
  regroup();
  sfx.bump();
  dialog.open(L.id === 'friedrich'
    ? ['Wache Konrad: Halt, Friedrich! Ich sehe dich genau. Zurück mit dir!']
    : ['Wache Konrad: Halt! Hier kommt kein Kind zum Buttenberg durch!', 'Wache Konrad: Da oben wohnt ein Drache! Das Tor bleibt zu.']);
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
}

// --- Zeichnen ---------------------------------------------------------------------

function camera() {
  if (game.state === 'title') {
    const t = game.titleT * 0.15;
    return { x: Math.round((MAP_W * TILE - W) * (0.5 + 0.5 * Math.sin(t))), y: Math.round((MAP_H * TILE - H) * (0.5 + 0.3 * Math.sin(t * 0.7))) };
  }
  const L = leader();
  const clamp = (v, max) => Math.max(0, Math.min(max, v));
  return {
    x: Math.round(clamp(L.x + 8 - W / 2, MAP_W * TILE - W)),
    y: Math.round(clamp(L.y + 8 - H / 2, MAP_H * TILE - H)),
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
        if (d > 11.2) sg.fillStyle = '#e8fcff';
        else if (d > 10) sg.fillStyle = '#78d0f8';
        else sg.fillStyle = 'rgba(120,208,248,0.22)';
        sg.fillRect(x, y, 1, 1);
      }
    }
  }
  g.globalAlpha = game.shieldT < 0.2 ? 0.5 : 0.85;
  g.drawImage(shieldImg, sx - 5, sy - 3);
  g.globalAlpha = 1;
}

function drawLeader(cam) {
  const L = leader();
  if (game.hurtT > 0 && Math.floor(game.time * 20) % 2) return;
  const alpha = game.invisT > 0 ? 0.28 + 0.08 * Math.sin(game.time * 8) : 1;
  drawCharacter(L, cam, alpha);
  if (game.shieldT > 0) drawShield(Math.round(L.x - cam.x), Math.round(L.y - cam.y));
}

function bubble(e, cam) {
  const sx = Math.round(e.x - cam.x) + 4, sy = Math.round(e.y - cam.y) - 13 + Math.round(Math.sin(game.time * 5));
  g.fillStyle = COL.out; g.fillRect(sx, sy, 8, 10);
  g.fillStyle = '#fff'; g.fillRect(sx + 1, sy + 1, 6, 8);
  g.fillStyle = '#e83848'; g.fillRect(sx + 3, sy + 2, 2, 4); g.fillRect(sx + 3, sy + 7, 2, 1);
}

function renderWorld(cam) {
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  drawTiles(g, game.world, cam.x, cam.y, game.time);

  const list = [];
  for (const o of game.world.objects) list.push({ y: o.sortY, draw: () => o.draw(g, cam.x, cam.y, game.time) });
  for (const n of game.npcs) list.push({ y: n.y + 16, draw: () => drawCharacter(n, cam) });
  if (!game.cloak.taken) {
    const c = game.cloak;
    list.push({ y: c.y + 8, draw: () => g.drawImage(itemSprite('cloak'), Math.round(c.x - cam.x), Math.round(c.y - cam.y + Math.sin(game.time * 3))) });
  }
  if (game.state !== 'title') {
    game.party.forEach((m, i) => list.push({ y: m.y + 16 - (i === 0 ? 0 : 0.1), draw: () => (i === 0 ? drawLeader(cam) : drawCharacter(m, cam)) }));
  }
  list.sort((a, b) => a.y - b.y).forEach((e) => e.draw());

  for (const p of game.projectiles) g.drawImage(itemSprite('chestnut'), Math.round(p.x - cam.x) - 2, Math.round(p.y - cam.y) - 2);
  for (const pt of game.particles) { g.fillStyle = pt.c; g.fillRect(Math.round(pt.x - cam.x), Math.round(pt.y - cam.y), 2, 2); }

  if (game.state === 'play') {
    const s = game.step;
    const npc = (id) => game.npcs.find((n) => n.id === id);
    if (s === 0 && npc('felix')) bubble(npc('felix'), cam);
    if ((s === 3 || s === 5) && npc('mama')) bubble(npc('mama'), cam);
  }
}

function renderHUDLow() {
  const st = game.stats;
  for (let i = 0; i < st.maxHearts; i++) g.drawImage(heartSprite(i < st.hearts), 4 + i * 8, 4);
  const bx = 176, by = 6, bw = 60;
  const fill = Math.round((bw * st.xp) / needXP(st.level));
  g.fillStyle = COL.out; g.fillRect(bx - 1, by - 1, bw + 2, 6);
  g.fillStyle = '#2a3050'; g.fillRect(bx, by, bw, 4);
  g.fillStyle = '#58d878'; g.fillRect(bx, by, fill, 4);
  g.fillStyle = '#a8f8b8'; g.fillRect(bx, by, fill, 1);
  // Gruppe: kleine Köpfe, Anführer hervorgehoben
  game.party.forEach((m, i) => {
    const spr = charSprite(m.pal, 0, 0);
    const x = 176 + i * 15, y = 13;
    g.fillStyle = i === 0 ? '#f8d848' : 'rgba(10,14,32,0.6)';
    g.fillRect(x - 1, y - 1, 14, 11);
    g.drawImage(spr, 1, 0, 14, 9, x, y, 12, 9 * 12 / 14);
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

function render() {
  const cam = camera();
  renderWorld(cam);

  if (game.state === 'play') {
    renderHUDLow();
    if (dialog.active) renderDialogLow();
  }
  if (game.state === 'title' || game.state === 'end') {
    g.fillStyle = game.state === 'end' ? `rgba(8,10,24,${Math.min(0.85, game.endT)})` : 'rgba(8,10,24,0.55)';
    g.fillRect(0, 0, W, H);
  }

  vctx.imageSmoothingEnabled = false;
  vctx.drawImage(low, 0, 0, W * K, H * K);

  if (game.state === 'title') {
    text('THEOS', W / 2, 26, { size: 24, align: 'center', color: '#f8d848' });
    text('Kapitel 1', W / 2, 60, { size: 7, align: 'center', color: '#b8c8e8' });
    text('Die Gefährten', W / 2, 72, { align: 'center' });
    text('- Demo -', W / 2, 88, { size: 6, align: 'center', color: '#b8c8e8' });
    if (Math.floor(game.time * 2) % 2 === 0) {
      text(isTouch() ? 'Tippe A zum Starten' : 'Leertaste / A: Start', W / 2, 124, { size: 7, align: 'center', color: '#a8f070' });
    }
    return;
  }

  if (game.state === 'end') {
    if (game.endT > 0.6) {
      const st = game.stats;
      text('ENDE KAPITEL 1', W / 2, 24, { size: 12, align: 'center', color: '#f8d848' });
      text('Die Gefährten sind vereint!', W / 2, 50, { size: 7, align: 'center' });
      text(`Level ${st.level} · Büsche ${game.bushes} · Schätze ${game.treasures}`, W / 2, 68, { size: 6, align: 'center', color: '#a8f070' });
      text('Fortsetzung folgt:', W / 2, 94, { size: 7, align: 'center', color: '#b8c8e8' });
      text('Der Weg zum Buttenberg', W / 2, 106, { size: 8, align: 'center' });
      if (game.endT > 1.5 && Math.floor(game.time * 2) % 2 === 0) text('A: Nochmal spielen', W / 2, 136, { size: 6, align: 'center', color: '#a8f070' });
    }
    return;
  }

  // HUD-Texte
  const st = game.stats, L = leader();
  text(`LV${st.level}`, 150, 4, { size: 7, color: '#f8d848' });
  text(`${HEROES[L.id].name} – B: ${HEROES[L.id].ability}`, 4, 14, { size: 6, color: '#ffffff' });
  text(STEP_HINT[game.step], 4, 23, { size: 6, color: '#c8e0ff' });
  if (game.challenge.active) text(`Kastanien: ${game.challenge.blocked}/5`, W / 2, 64, { size: 7, align: 'center', color: '#f8d848' });
  if (game.invisT > 0) text(`Unsichtbar: ${Math.ceil(game.invisT)}`, W / 2, 34, { size: 7, align: 'center', color: '#d0c8ff' });

  for (const f of game.floats) {
    text(f.text, f.x - cam.x, f.y - cam.y, { size: 6, align: 'center', color: f.color });
  }

  const b = game.banners[0];
  if (b) {
    vctx.fillStyle = 'rgba(10,14,32,0.88)';
    vctx.fillRect(Math.round(30 * K), Math.round(33 * K), Math.round(180 * K), Math.round(26 * K));
    text(b.title, W / 2, 37, { size: 8, align: 'center', color: b.color });
    text(b.sub, W / 2, 49, { size: 6, align: 'center' });
  }

  if (dialog.active) {
    dialog.visibleLines().forEach((l, i) => text(l, 12, 119 + i * 11, { size: 8, shadow: false }));
  }
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
  view.addEventListener('pointerdown', () => {
    view.focus();
    unlockAudio();
    if (game.state === 'title' || game.state === 'end') canvasTap = true;
  });
  try { await document.fonts.load(`16px ${FONT}`); } catch { /* Fallback-Schrift */ }
  view.focus();
  requestAnimationFrame(loop);
}

// Für Tests/Debugging von außen erreichbar
window.__theos = { get game() { return game; }, dialog };

boot();
