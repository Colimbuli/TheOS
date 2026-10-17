// TheOS – Demo "Das Dorf Lindental"
// Interne Auflösung 240x160 (wie der GBA), ganzzahlig hochskaliert.

import { initInput, pollInput, input, isTouch } from './input.js';
import { sfx, unlockAudio } from './audio.js';
import { createWorld, drawTiles, T, TILE, MAP_W, MAP_H, COL } from './world.js';
import { charSprite, catSprite, heartSprite } from './sprites.js';
import { createNPCs, talkTo, catDialog } from './npcs.js';
import { Dialog } from './dialog.js';

const W = 240, H = 160;
const FONT = '"Press Start 2P", monospace';
const DIRV = [[0, 1], [0, -1], [-1, 0], [1, 0]]; // runter, hoch, links, rechts
const OPPOSITE = [1, 0, 3, 2];
const SPEED = 72;          // Pixel pro Sekunde
const ATTACK_TIME = 0.28;

const view = document.getElementById('screen');
const vctx = view.getContext('2d');
const low = document.createElement('canvas');
low.width = W; low.height = H;
const g = low.getContext('2d');
let K = 1;

const dialog = new Dialog();
let game;

// --- Spielzustand ---------------------------------------------------------------

function newGame() {
  const world = createWorld();
  game = {
    state: 'title',
    time: 0,
    world,
    player: { x: 15 * TILE + 8, y: 15 * TILE, dir: 1, anim: 0, moving: false, attackT: 0,
      hearts: 3, maxHearts: 3, level: 1, xp: 0 },
    npcs: createNPCs(),
    cat: { x: 8 * TILE, y: 19 * TILE, dir: 2, follow: false, moving: false },
    quest: 0,
    trail: [],
    particles: [],
    floats: [],
    banners: [],
    bushes: 0,
    titleT: 0,
  };
}

const needXP = (lvl) => 10 + lvl * 10;

const fx = {
  sfx,
  banner(title, sub, color = '#f8d848') { game.banners.push({ title, sub, color, t: 2.6 }); },
  gainXP(n, wx, wy) {
    const p = game.player;
    p.xp += n;
    if (wx != null) game.floats.push({ text: `+${n} EP`, x: wx, y: wy, t: 1.1 });
    while (p.xp >= needXP(p.level)) {
      p.xp -= needXP(p.level);
      p.level++;
      p.maxHearts = Math.min(10, p.maxHearts + 1);
      p.hearts = p.maxHearts;
      fx.banner('LEVEL UP!', `Du bist jetzt Level ${p.level}`);
      setTimeout(sfx.levelUp, 250);
    }
  },
  openGate() { game.world.openGate(); },
  returnCat() {
    const c = game.cat;
    c.follow = false;
    c.x = 7 * TILE + 2; c.y = 9 * TILE + 2; c.dir = 2; c.moving = false;
  },
};

// --- Kollision & Bewegung ----------------------------------------------------------

const solidAt = (x, y) => game.world.isSolidTile(Math.floor(x / TILE), Math.floor(y / TILE));
const overlap = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

function blocked(e, nx, ny) {
  const bx = nx + 3, by = ny + 8, bw = 10, bh = 7;
  if (solidAt(bx, by) || solidAt(bx + bw - 1, by) || solidAt(bx, by + bh - 1) || solidAt(bx + bw - 1, by + bh - 1)) return true;
  for (const o of [game.player, ...game.npcs]) {
    if (o === e) continue;
    if (overlap(bx, by, bw, bh, o.x + 3, o.y + 8, 10, 7)) return true;
  }
  return false;
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
        'Ein sonniger Morgen in Lindental.',
        'Laufen: Pfeiltasten, WASD oder Steuerkreuz. Reden: Leertaste oder A. Schlagen: J oder B.',
        'Oma Hilde scheint dich zu suchen...',
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
  for (const n of game.npcs) updateNPC(n, dt);

  if (dialog.active) {
    dialog.update(dt, input.aPressed, sfx.blip);
    return;
  }

  updatePlayer(dt);
  updateCat();
}

function updatePlayer(dt) {
  const p = game.player;
  if (p.attackT > 0) {
    p.attackT -= dt;
    p.moving = false;
    return;
  }
  if (input.bPressed) { attack(); return; }
  if (input.aPressed) { interact(); return; }

  const ix = input.dir.x, iy = input.dir.y;
  p.moving = false;
  if (!ix && !iy) return;

  // Blickrichtung: bei Diagonale die aktuelle Achse behalten
  if (ix && !iy) p.dir = ix < 0 ? 2 : 3;
  else if (iy && !ix) p.dir = iy < 0 ? 1 : 0;
  else {
    const h = ix < 0 ? 2 : 3, v = iy < 0 ? 1 : 0;
    if (p.dir !== h && p.dir !== v) p.dir = v;
  }

  const len = Math.hypot(ix, iy);
  const sp = SPEED * dt;
  if (move(p, (ix / len) * sp, (iy / len) * sp, true)) {
    p.moving = true;
    p.anim += dt;
    game.trail.push({ x: p.x, y: p.y, dir: p.dir });
    if (game.trail.length > 60) game.trail.shift();
  }

  if (game.world.gateOpen && p.y + 8 < 2) {
    game.state = 'end';
    game.endT = 0;
    sfx.levelUp();
  }
}

function frontPoint(e, dist) {
  const [dx, dy] = DIRV[e.dir];
  return { x: e.x + 8 + dx * dist, y: e.y + 11 + dy * dist };
}

const inBox = (pt, x, y, w, h) => pt.x >= x && pt.x < x + w && pt.y >= y && pt.y < y + h;

function npcAt(pt) {
  return game.npcs.find((n) => inBox(pt, n.x - 1, n.y - 2, 18, 22)) || null;
}

function talk(n) {
  n.dir = OPPOSITE[game.player.dir];
  n.moving = false;
  if (n.wander) n.t = 2.5;
  const d = talkTo(n, game, fx);
  dialog.open(d.lines, d.after);
}

function interact() {
  const p = game.player;
  const w = game.world;
  const f = frontPoint(p, 12);
  const tx = Math.floor(f.x / TILE), ty = Math.floor(f.y / TILE);

  let n = npcAt(f);
  if (!n && w.isCounter(tx, ty)) n = npcAt(frontPoint(p, 30)); // über die Theke reden
  if (n) { talk(n); return; }

  const c = game.cat;
  if (!c.follow && inBox(f, c.x, c.y + 4, 16, 12)) {
    const d = game.quest === 3 ? { lines: ['Flocke schnurrt zufrieden.'] } : catDialog(game, fx);
    dialog.open(d.lines, d.after);
    return;
  }

  const text = w.textAt(tx, ty);
  if (text) { dialog.open(text); return; }
  if (w.tile(tx, ty) === T.GATE) dialog.open(['Das Tor ist fest verschlossen.', 'Vielleicht weiß die Wache mehr.']);
}

function attack() {
  const p = game.player;
  p.attackT = ATTACK_TIME;
  p.moving = false;
  sfx.swing();
  for (const dist of [10, 15]) {
    const f = frontPoint(p, dist);
    const tx = Math.floor(f.x / TILE), ty = Math.floor(f.y / TILE);
    if (game.world.tile(tx, ty) === T.BUSH) { cutBush(tx, ty); break; }
  }
}

function cutBush(tx, ty) {
  game.world.setTile(tx, ty, T.GRASS);
  game.bushes++;
  sfx.cut();
  const cx = tx * TILE + 8, cy = ty * TILE + 8;
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2, s = 30 + Math.random() * 50;
    game.particles.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: 0.5 + Math.random() * 0.3,
      c: Math.random() < 0.5 ? COL.bush : COL.bushL });
  }
  fx.gainXP(3, cx, cy - 8);
}

function updateNPC(n, dt) {
  if (!n.wander || dialog.active) { n.moving = false; return; }
  n.t -= dt;
  if (n.t <= 0) {
    n.moving = Math.random() > 0.35;
    if (n.moving) n.dir = (Math.random() * 4) | 0;
    n.t = 0.6 + Math.random() * 1.4;
  }
  if (!n.moving) return;
  const [dx, dy] = DIRV[n.dir];
  const ox = n.x, oy = n.y;
  const sp = 36 * dt;
  const ok = move(n, dx * sp, dy * sp, false);
  const b = n.wander;
  if (!ok || n.x < b.x0 || n.x > b.x1 || n.y < b.y0 || n.y > b.y1) {
    n.x = ox; n.y = oy; n.t = 0;
    return;
  }
  n.anim += dt;
}

function updateCat() {
  const c = game.cat;
  if (!c.follow) return;
  const tr = game.trail;
  const target = tr[Math.max(0, tr.length - 16)];
  if (!target) return;
  c.moving = c.x !== target.x || c.y !== target.y;
  if (target.x < c.x - 0.1) c.dir = 2; else if (target.x > c.x + 0.1) c.dir = 3;
  c.x = target.x; c.y = target.y;
}

function updateEffects(dt) {
  for (const pt of game.particles) { pt.vy += 220 * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.t -= dt; }
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
  const p = game.player;
  const clamp = (v, max) => Math.max(0, Math.min(max, v));
  return {
    x: Math.round(clamp(p.x + 8 - W / 2, MAP_W * TILE - W)),
    y: Math.round(clamp(p.y + 8 - H / 2, MAP_H * TILE - H)),
  };
}

function shadow(sx, sy) {
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(sx + 4, sy + 14, 8, 2);
  g.fillRect(sx + 3, sy + 15, 10, 1);
}

function walkFrame(e) {
  return e.moving ? [0, 1, 0, 2][Math.floor(e.anim * 8) % 4] : 0;
}

function drawCharacter(e, pal, cam) {
  const sx = Math.round(e.x - cam.x), sy = Math.round(e.y - cam.y);
  shadow(sx, sy);
  if (e.spear && e.dir === 1) drawSpear(sx, sy);
  g.drawImage(charSprite(pal, e.dir, walkFrame(e)), sx, sy);
  if (e.spear && e.dir !== 1) drawSpear(sx, sy);
}

function drawSpear(sx, sy) {
  g.fillStyle = COL.woodD; g.fillRect(sx + 14, sy - 5, 1, 20);
  g.fillStyle = '#e0e0ec'; g.fillRect(sx + 13, sy - 8, 3, 3); g.fillRect(sx + 14, sy - 10, 1, 2);
}

function drawStick(p, sx, sy) {
  const prog = 1 - Math.max(0, p.attackT) / ATTACK_TIME;
  const base = [Math.PI / 2, -Math.PI / 2, Math.PI, 0][p.dir];
  const a = base + (prog - 0.5) * 2 * (p.dir === 2 || p.dir === 1 ? -1 : 1);
  const hx = sx + 8, hy = sy + 10;
  for (let i = 3; i < 14; i++) {
    g.fillStyle = i > 11 ? COL.woodL : COL.woodD;
    g.fillRect(Math.round(hx + Math.cos(a) * i) - 1, Math.round(hy + Math.sin(a) * i) - 1, 2, 2);
  }
}

function drawPlayer(cam) {
  const p = game.player;
  const sx = Math.round(p.x - cam.x), sy = Math.round(p.y - cam.y);
  shadow(sx, sy);
  const attacking = p.attackT > 0;
  if (attacking && p.dir === 1) drawStick(p, sx, sy);
  g.drawImage(charSprite('hero', p.dir, attacking ? 0 : walkFrame(p)), sx, sy);
  if (attacking && p.dir !== 1) drawStick(p, sx, sy);
}

function drawCat(cam) {
  const c = game.cat;
  const sx = Math.round(c.x - cam.x), sy = Math.round(c.y - cam.y);
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.fillRect(sx + 3, sy + 14, 11, 2);
  const hop = c.moving && Math.floor(game.time * 10) % 2 ? -1 : 0;
  g.drawImage(catSprite(c.dir === 3), sx, sy + 6 + hop);
}

function bubble(n, cam, mark) {
  const sx = Math.round(n.x - cam.x) + 4, sy = Math.round(n.y - cam.y) - 13 + Math.round(Math.sin(game.time * 5));
  g.fillStyle = COL.out; g.fillRect(sx, sy, 8, 10);
  g.fillStyle = '#fff'; g.fillRect(sx + 1, sy + 1, 6, 8);
  g.fillStyle = '#e83848';
  if (mark === '!') { g.fillRect(sx + 3, sy + 2, 2, 4); g.fillRect(sx + 3, sy + 7, 2, 1); }
  else { g.fillRect(sx + 2, sy + 2, 4, 1); g.fillRect(sx + 5, sy + 3, 1, 2); g.fillRect(sx + 3, sy + 4, 2, 1); g.fillRect(sx + 3, sy + 5, 1, 1); g.fillRect(sx + 3, sy + 7, 1, 1); }
}

function renderWorld(cam) {
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  drawTiles(g, game.world, cam.x, cam.y, game.time);

  const list = [];
  for (const o of game.world.objects) list.push({ y: o.sortY, draw: () => o.draw(g, cam.x, cam.y, game.time) });
  for (const n of game.npcs) list.push({ y: n.y + 16, draw: () => drawCharacter(n, n.pal, cam) });
  list.push({ y: game.cat.y + 16, draw: () => drawCat(cam) });
  if (game.state !== 'title') list.push({ y: game.player.y + 16, draw: () => drawPlayer(cam) });
  list.sort((a, b) => a.y - b.y).forEach((e) => e.draw());

  for (const pt of game.particles) { g.fillStyle = pt.c; g.fillRect(Math.round(pt.x - cam.x), Math.round(pt.y - cam.y), 2, 2); }

  if (game.state === 'play') {
    const hilde = game.npcs.find((n) => n.id === 'hilde');
    if (game.quest === 0) bubble(hilde, cam, '!');
    if (game.quest === 2) bubble(hilde, cam, '?');
  }
}

function renderHUDLow() {
  const p = game.player;
  for (let i = 0; i < p.maxHearts; i++) g.drawImage(heartSprite(i < p.hearts), 4 + i * 8, 4);
  // EP-Leiste
  const bx = 176, by = 6, bw = 60;
  g.fillStyle = COL.out; g.fillRect(bx - 1, by - 1, bw + 2, 6);
  g.fillStyle = '#2a3050'; g.fillRect(bx, by, bw, 4);
  g.fillStyle = '#58d878'; g.fillRect(bx, by, Math.round((bw * p.xp) / needXP(p.level)), 4);
  g.fillStyle = '#a8f8b8'; g.fillRect(bx, by, Math.round((bw * p.xp) / needXP(p.level)), 1);
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

function questHint() {
  if (game.quest === 1) return 'Quest: Finde Flocke';
  if (game.quest === 2) return 'Quest: Bring Flocke heim';
  if (game.quest === 3) return 'Ziel: Tor im Norden';
  return '';
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
    text('THEOS', W / 2, 30, { size: 24, align: 'center', color: '#f8d848' });
    text('Das Dorf Lindental', W / 2, 66, { align: 'center' });
    text('- Demo -', W / 2, 80, { size: 6, align: 'center', color: '#b8c8e8' });
    if (Math.floor(game.time * 2) % 2 === 0) {
      text(isTouch() ? 'Tippe A zum Starten' : 'Leertaste / A: Start', W / 2, 122, { size: 7, align: 'center', color: '#a8f070' });
    }
    return;
  }

  if (game.state === 'end') {
    if (game.endT > 0.6) {
      const p = game.player;
      text('ENDE DER DEMO', W / 2, 28, { size: 12, align: 'center', color: '#f8d848' });
      text('Lindental ist geschafft!', W / 2, 54, { size: 7, align: 'center' });
      text(`Level ${p.level}  ·  Büsche: ${game.bushes}`, W / 2, 72, { size: 7, align: 'center', color: '#a8f070' });
      text('Fortsetzung folgt:', W / 2, 96, { size: 7, align: 'center', color: '#b8c8e8' });
      text('Der Flüsterwald', W / 2, 108, { size: 8, align: 'center' });
      if (game.endT > 1.5 && Math.floor(game.time * 2) % 2 === 0) text('A: Nochmal spielen', W / 2, 136, { size: 6, align: 'center', color: '#a8f070' });
    }
    return;
  }

  // HUD-Texte
  const p = game.player;
  text(`LV${p.level}`, 150, 4, { size: 7, color: '#f8d848' });
  const hint = questHint();
  if (hint) text(hint, 4, 14, { size: 6, color: '#e8f0ff' });

  const cam2 = cam;
  for (const f of game.floats) {
    text(f.text, f.x - cam2.x, f.y - cam2.y, { size: 6, align: 'center', color: f.t < 0.3 ? 'rgba(248,216,72,0.5)' : '#f8d848' });
  }

  const b = game.banners[0];
  if (b) {
    vctx.fillStyle = 'rgba(10,14,32,0.85)';
    vctx.fillRect(Math.round(40 * K), Math.round(36 * K), Math.round(160 * K), Math.round(30 * K));
    text(b.title, W / 2, 41, { size: 8, align: 'center', color: b.color });
    text(b.sub, W / 2, 54, { size: 6, align: 'center' });
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
  const cssScale = Math.min(availW / W, availH / H);
  K = Math.max(1, Math.floor(cssScale * dpr));
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
