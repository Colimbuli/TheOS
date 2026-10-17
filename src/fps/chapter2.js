// Kapitel 2 – Ego-Perspektive im Stil von Doom/Wolfenstein (Raycaster), kinderfreundlich.
// Die vier Freunde sind die "Waffen-Slots" 1–4, jeder mit eigener Aktion.

import { textures, TS } from './textures.js';
import { MAP, START, STATUE, TROLL, ENTITIES, HINTS, CHECKPOINTS, SECRET_CELL } from './level1.js';
import { charSprite, heartSprite } from '../sprites.js';
import { raw } from '../input.js';

const VW = 240, VH = 136, FULL_H = 160, HALF = VH / 2;
const PLANE = VW / VH / 2; // Sichtfeld so, dass Pixel quadratisch bleiben (~82°)
const RADIUS = 0.25;

export const HEROES = [
  { id: 'theo', name: 'Theo', tool: 'Schild' },
  { id: 'felix', name: 'Felix', tool: 'Schleuder' },
  { id: 'arne', name: 'Arne', tool: 'Schaufel' },
  { id: 'friedrich', name: 'Friedrich', tool: 'Tarnumhang' },
];

const ENEMY = {
  slime: { hp: 2, speed: 1.25, xp: 3 },
  kobold: { hp: 3, speed: 1.1, xp: 5 },
};
const ITEM_TYPES = new Set(['bag', 'apple', 'crystal', 'key']);
const DECOR_TYPES = new Set(['torch', 'mushrooms']);

const shade = (c, f) => {
  const r = (c & 255) * f, g = ((c >>> 8) & 255) * f, b = ((c >>> 16) & 255) * f;
  return (0xff000000 | ((b > 255 ? 255 : b) << 16) | ((g > 255 ? 255 : g) << 8) | (r > 255 ? 255 : r)) >>> 0;
};

export function createChapter2({ stats, sfx }) {
  const T = textures();
  const map = MAP.map((r) => r.split(''));
  const MW = map[0].length, MH = map.length;
  const img = new ImageData(VW, FULL_H);
  const buf = new Uint32Array(img.data.buffer);
  const zbuf = new Float32Array(VW);
  const visited = map.map((r) => r.map(() => false));
  const doors = new Map(); // "x,y" -> Öffnungsfortschritt 0..1

  const P = { x: START.x, y: START.y, a: START.angle, bob: 0, moving: false };
  const s = {
    hero: 0, ammo: 25, hasKey: false,
    shieldUp: false, invisT: 0, invisCD: 0, actCD: 0, swingT: 0, swapT: 0,
    hurtT: 0, invulnT: 0, faintT: 0,
    msg: null, banner: null, hints: new Set(), checkpoint: { x: START.x, y: START.y, a: START.angle },
    projectiles: [], particles: [],
    kills: 0, crystals: 0, secret: false, statueCD: 1, trollPassed: false, trollAngry: 0,
    time: 0, finished: false, summary: null,
    prevFire: false, prevTouch: {},
  };

  const entities = ENTITIES.map((e, i) => ({
    ...e, id: i, alive: true, anim: Math.random() * 2, cd: 1 + Math.random(), hurtT: 0,
    hp: ENEMY[e.type] ? ENEMY[e.type].hp : 0,
  }));
  const troll = { x: TROLL.x, y: TROLL.y };
  const totalEnemies = entities.filter((e) => ENEMY[e.type]).length;
  const totalCrystals = entities.filter((e) => e.type === 'crystal').length;

  // --- Hilfsfunktionen -----------------------------------------------------------

  const cell = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH ? '#' : map[y][x]);
  const isDoor = (c) => c === 'D' || c === 'L' || c === 'Z';

  function solid(x, y) {
    const cx = Math.floor(x), cy = Math.floor(y);
    const c = cell(cx, cy);
    if (c === '.') return false;
    if (isDoor(c) && (doors.get(`${cx},${cy}`) || 0) > 0.85) return false;
    return true;
  }

  function blockedAt(x, y, r = RADIUS) {
    if (solid(x - r, y - r) || solid(x + r, y - r) || solid(x - r, y + r) || solid(x + r, y + r)) return true;
    return Math.hypot(x - troll.x, y - troll.y) < r + 0.42; // der Troll ist ein Hindernis
  }

  function moveBody(o, dx, dy, r = RADIUS) {
    let moved = false;
    if (dx && !blockedAt(o.x + dx, o.y, r)) { o.x += dx; moved = true; }
    if (dy && !blockedAt(o.x, o.y + dy, r)) { o.y += dy; moved = true; }
    return moved;
  }

  function los(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.ceil(d / 0.15);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (solid(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
    }
    return true;
  }

  function frontCell(maxD = 1.3) {
    const ca = Math.cos(P.a), sa = Math.sin(P.a);
    for (let d = 0.2; d <= maxD; d += 0.08) {
      const cx = Math.floor(P.x + ca * d), cy = Math.floor(P.y + sa * d);
      const c = cell(cx, cy);
      if (c !== '.') return { cx, cy, c, d };
    }
    return null;
  }

  const say = (text, t = 3.2) => { s.msg = { text, t }; };
  const banner = (title, sub, color = '#f8d848') => { s.banner = { title, sub, color, t: 2.6 }; };

  function gainXP(n) {
    stats.xp += n;
    const need = (l) => 10 + l * 10;
    while (stats.xp >= need(stats.level)) {
      stats.xp -= need(stats.level);
      stats.level++;
      stats.maxHearts = Math.min(10, stats.maxHearts + 1);
      stats.hearts = stats.maxHearts;
      banner('LEVEL UP!', `Die Gruppe ist jetzt Level ${stats.level}`);
      setTimeout(sfx.levelUp, 200);
    }
  }

  function burst(x, y, colors, n = 14, z = 0.4, power = 2) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (0.5 + Math.random()) * power;
      s.particles.push({ x, y, z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 1.5 + Math.random() * 2,
        t: 0.6 + Math.random() * 0.5, c: colors[i % colors.length] });
    }
  }
  const CONFETTI = [0xff3a3aff, 0xff3ad0ff, 0xff40a0f8, 0xff40e060, 0xff30d8ff, 0xffffffff].map((c) => {
    // ABGR aus RGBA-Notation umdrehen
    const r = (c >>> 24) & 255, g = (c >>> 16) & 255, b = (c >>> 8) & 255;
    return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
  });
  const abgr = (h) => { const n = parseInt(h.slice(1), 16); return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0; };

  function hurt(n) {
    if (s.invulnT > 0 || s.faintT > 0) return;
    stats.hearts -= n;
    s.hurtT = 0.45;
    s.invulnT = 0.8;
    sfx.hurt();
    if (stats.hearts <= 0) {
      stats.hearts = 0;
      s.faintT = 2.2;
      s.invisT = 0;
      say('Puh! Die Gruppe ist erschöpft... Zurück zum letzten Rastplatz.', 2.2);
    }
  }

  function respawn() {
    P.x = s.checkpoint.x; P.y = s.checkpoint.y; P.a = s.checkpoint.a;
    stats.hearts = stats.maxHearts;
    s.projectiles = [];
    s.invulnT = 1.5;
  }

  function openDoor(cx, cy) {
    const key = `${cx},${cy}`;
    if (doors.has(key)) return;
    doors.set(key, 0.001);
    sfx.door();
  }

  function damageEnemy(e, dmg, kx = 0, ky = 0) {
    e.hp -= dmg;
    e.hurtT = 0.2;
    moveBody(e, kx, ky, 0.3);
    if (e.hp > 0) { sfx.hit(); return; }
    e.alive = false;
    s.kills++;
    sfx.pop();
    burst(e.x, e.y, CONFETTI, 22, 0.4, 2.5);
    gainXP(ENEMY[e.type].xp);
    if (e.type === 'kobold' && Math.random() < 0.5) entities.push({ type: 'bag', x: e.x, y: e.y, alive: true, anim: 0 });
  }

  function selectHero(i) {
    if (i === s.hero) return;
    if (s.hero === 3 && s.invisT > 0) { s.invisT = 0; sfx.invisOff(); }
    s.hero = i;
    s.shieldUp = false;
    s.swapT = 0.25;
    sfx.swap();
  }

  // --- Eingabe ----------------------------------------------------------------------

  function readControls() {
    const k = raw.keys, pk = raw.pressedKeys, tc = raw.touch, ax = raw.axes;
    const btn = (i) => !!raw.buttons[i];
    const btnP = (i) => !!raw.buttons[i] && !raw.prevButtons[i];
    const tcP = (n) => { const p = !!tc[n] && !s.prevTouch[n]; s.prevTouch[n] = !!tc[n]; return p; };
    const clamp1 = (v) => Math.max(-1, Math.min(1, v));

    const fwd = clamp1((k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0)
      + (tc.up ? 1 : 0) - (tc.down ? 1 : 0) - ax[1] + (btn(12) ? 1 : 0) - (btn(13) ? 1 : 0));
    const strafe = clamp1((k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0) + ax[0]);
    const turn = clamp1((k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0)
      + (tc.right ? 1 : 0) - (tc.left ? 1 : 0) + ax[2] + (btn(15) ? 1 : 0) - (btn(14) ? 1 : 0));

    const fireHeld = k.has('Space') || k.has('KeyJ') || k.has('KeyK') || k.has('ControlLeft') || raw.mouseL
      || !!tc.b || btn(7) || btn(2) || btn(1) || btn(6);
    const firePressed = (fireHeld && !s.prevFire) || raw.mouseLPressed || pk.has('Space') || pk.has('KeyJ');
    s.prevFire = fireHeld;

    const use = pk.has('KeyE') || pk.has('Enter') || pk.has('KeyF') || tcP('a') || btnP(0);
    let swap = 0;
    if (pk.has('KeyQ') || pk.has('Tab') || tcP('swap') || btnP(5) || btnP(3) || raw.wheel > 0) swap = 1;
    if (btnP(4) || raw.wheel < 0) swap = -1;
    let direct = -1;
    for (let i = 1; i <= 4; i++) if (pk.has(`Digit${i}`)) direct = i - 1;

    return { fwd, strafe, turn, fireHeld, firePressed, use, swap, direct,
      look: raw.mouseDX * 0.0026 + raw.touchTurn * 0.009 };
  }

  // --- Aktionen -----------------------------------------------------------------------

  function useAction() {
    const fc = frontCell(1.4);
    if (!fc) return;
    const { cx, cy, c } = fc;
    switch (c) {
      case 'D': openDoor(cx, cy); break;
      case 'L':
        if (s.hasKey) { openDoor(cx, cy); say('Klick! Der Schlüssel passt.'); }
        else { sfx.bump(); say('Abgeschlossen. Ihr braucht einen Schlüssel.'); }
        break;
      case 'H':
        map[cy][cx] = 'h';
        openDoor(2, 20);
        sfx.item();
        say('Rumms! Irgendwo hat sich ein Gittertor geöffnet!');
        break;
      case 'h': say('Der Hebel ist schon umgelegt.'); break;
      case 'Z': sfx.bump(); say('Ein Gittertor. Irgendwo muss ein Hebel sein...'); break;
      case 'E': say('Lockere Erde. Arne kann hier graben (Taste 3).'); break;
      case 'P': say('Ein schwerer Felsblock. Ein Fall für Felix (Taste 2)!'); break;
      case 'F': say('Die Statue spuckt Feuer! Theos Schild (Taste 1) wirft es zurück.'); break;
      case 'X': finish(); break;
      default: break;
    }
  }

  function heroAction(ctl) {
    const ca = Math.cos(P.a), sa = Math.sin(P.a);
    switch (HEROES[s.hero].id) {
      case 'theo':
        if (ctl.firePressed) sfx.shield();
        s.shieldUp = ctl.fireHeld;
        return;

      case 'felix': {
        if (!ctl.firePressed || s.actCD > 0) return;
        s.actCD = 0.35;
        const fc = frontCell(1.3);
        if (fc && fc.c === 'P') {
          const dx = fc.cx + 0.5 - P.x, dy = fc.cy + 0.5 - P.y;
          const [mx, my] = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
          if (cell(fc.cx + mx, fc.cy + my) === '.') {
            map[fc.cy][fc.cx] = '.';
            map[fc.cy + my][fc.cx + mx] = 'P';
            sfx.push();
            burst(fc.cx + 0.5, fc.cy + 0.5, [abgr('#c8b49a'), abgr('#8a8070')], 12, 0.1, 1.5);
            say('Hau-Ruck! Felix schiebt den Felsblock weg.');
            gainXP(5);
          } else { sfx.bump(); say('Der Block klemmt in diese Richtung.'); }
          return;
        }
        if (s.ammo <= 0) { sfx.bump(); say('Keine Kastanien mehr! Sucht nach Beuteln.'); return; }
        s.ammo--;
        s.swingT = 0.2;
        sfx.swing();
        s.projectiles.push({ x: P.x + ca * 0.3, y: P.y + sa * 0.3, vx: ca * 9, vy: sa * 9, kind: 'chestnut', owner: 'player', dmg: 1, t: 2 });
        return;
      }

      case 'arne': {
        if (!ctl.firePressed || s.actCD > 0) return;
        s.actCD = 0.45;
        s.swingT = 0.3;
        let target = null, best = 1.5;
        for (const e of entities) {
          if (!e.alive || !ENEMY[e.type]) continue;
          const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy);
          let da = Math.atan2(dy, dx) - P.a;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          if (d < best && Math.abs(da) < 0.6) { best = d; target = e; }
        }
        if (target) { damageEnemy(target, 1, ca * 0.4, sa * 0.4); return; }
        const fc = frontCell(1.4);
        if (fc && fc.c === 'E') {
          map[fc.cy][fc.cx] = '.';
          sfx.dig();
          burst(fc.cx + 0.5, fc.cy + 0.5, [abgr('#a0703e'), abgr('#7a5030'), abgr('#c89060')], 18, 0.3, 1.8);
          if (fc.cx === SECRET_CELL.x && fc.cy === SECRET_CELL.y) {
            s.secret = true;
            banner('GEHEIMGANG!', 'Arne hat einen versteckten Raum gefunden', '#88e0ff');
            gainXP(10);
          } else { say('Durchgebuddelt!'); gainXP(3); }
          return;
        }
        sfx.swing();
        return;
      }

      case 'friedrich':
        if (!ctl.firePressed) return;
        if (s.invisT > 0) { s.invisT = 0; sfx.invisOff(); return; }
        if (s.invisCD > 0) { sfx.bump(); say(`Der Tarnumhang lädt noch (${Math.ceil(s.invisCD)} s).`, 1.5); return; }
        s.invisT = 7;
        s.invisCD = 12;
        sfx.invisOn();
        say('Psst... unsichtbar! Niemand kann euch sehen.', 2);
    }
  }

  function finish() {
    if (s.finished) return;
    s.finished = true;
    sfx.levelUp();
    s.summary = { kills: s.kills, totalEnemies, crystals: s.crystals, totalCrystals, secret: s.secret };
  }

  // --- Update -----------------------------------------------------------------------

  function update(dt) {
    s.time += dt;
    if (s.msg && (s.msg.t -= dt) <= 0) s.msg = null;
    if (s.banner && (s.banner.t -= dt) <= 0) s.banner = null;
    updateParticles(dt);
    updateDoors(dt);
    if (s.finished) return;

    if (s.faintT > 0) {
      s.faintT -= dt;
      if (s.faintT <= 0) respawn();
      return;
    }

    const ctl = readControls();
    for (const k of ['actCD', 'swingT', 'swapT', 'hurtT', 'invulnT', 'invisCD', 'trollAngry']) s[k] = Math.max(0, s[k] - dt);
    if (s.invisT > 0) { s.invisT -= dt; if (s.invisT <= 0) { s.invisT = 0; sfx.invisOff(); say('Der Umhang wirkt nicht mehr.', 1.5); } }

    if (ctl.direct >= 0) selectHero(ctl.direct);
    else if (ctl.swap) selectHero((s.hero + ctl.swap + 4) % 4);

    // Bewegung
    P.a += ctl.turn * 2.6 * dt + ctl.look;
    const ca = Math.cos(P.a), sa = Math.sin(P.a);
    const speed = s.shieldUp ? 1.7 : 3.4;
    const mx = (ca * ctl.fwd - sa * ctl.strafe) * speed * dt;
    const my = (sa * ctl.fwd + ca * ctl.strafe) * speed * dt;
    P.moving = (ctl.fwd || ctl.strafe) && moveBody(P, mx, my);
    if (P.moving) P.bob += dt * 9;

    if (ctl.use) useAction();
    if (s.swapT <= 0) heroAction(ctl);
    if (HEROES[s.hero].id !== 'theo') s.shieldUp = false;

    updateEnemies(dt);
    updateTroll();
    updateStatue(dt);
    updateProjectiles(dt);
    pickups();
    areaTriggers();
  }

  function updateDoors(dt) {
    for (const [key, v] of doors) {
      const nv = v + dt * 1.8;
      if (nv >= 1) {
        const [cx, cy] = key.split(',').map(Number);
        map[cy][cx] = '.';
        doors.delete(key);
      } else doors.set(key, nv);
    }
  }

  function updateParticles(dt) {
    for (const p of s.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vz -= 9 * dt; p.z = Math.max(0, p.z + p.vz * dt);
      p.vx *= 0.96; p.vy *= 0.96; p.t -= dt;
    }
    s.particles = s.particles.filter((p) => p.t > 0);
  }

  function updateEnemies(dt) {
    const visible = s.invisT <= 0;
    for (const e of entities) {
      if (!e.alive) continue;
      e.anim += dt;
      e.hurtT = Math.max(0, e.hurtT - dt);
      if (!ENEMY[e.type]) continue;
      const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy);
      const sees = visible && d < 9 && los(e.x, e.y, P.x, P.y);
      if (sees) e.alert = true;
      if (!visible) e.alert = false;
      e.cd -= dt;
      const sp = ENEMY[e.type].speed * dt;
      const nx = dx / (d || 1), ny = dy / (d || 1);

      if (e.type === 'slime' && e.alert) {
        if (d > 0.5) moveBody(e, nx * sp, ny * sp, 0.3);
        if (d < 0.6 && e.cd <= 0) {
          e.cd = 1.1;
          hurt(1);
          moveBody(P, nx * 0.3, ny * 0.3);
        }
      }
      if (e.type === 'kobold' && e.alert) {
        const side = Math.sin(s.time * 0.8 + e.id) * 0.6;
        if (d > 5) moveBody(e, nx * sp, ny * sp, 0.3);
        else if (d < 3) moveBody(e, -nx * sp, -ny * sp, 0.3);
        else moveBody(e, -ny * sp * side, nx * sp * side, 0.3);
        if (sees && e.cd <= 0) {
          e.cd = 1.9 + Math.random() * 0.9;
          e.throwT = 0.35;
          sfx.fire();
          s.projectiles.push({ x: e.x + nx * 0.3, y: e.y + ny * 0.3, vx: nx * 4.5, vy: ny * 4.5, kind: 'fire', owner: 'enemy', dmg: 1, t: 4 });
        }
      }
      if (e.throwT) e.throwT = Math.max(0, e.throwT - dt);
    }
  }

  function updateTroll() {
    if (s.trollPassed) return;
    if (P.x < troll.x - 1 && P.y > 13) {
      s.trollPassed = true;
      say('Geschafft! Der Troll hat nichts gemerkt.');
      gainXP(10);
      return;
    }
    const d = Math.hypot(P.x - troll.x, P.y - troll.y);
    if (s.invisT <= 0 && d < 4.5 && P.x > troll.x - 0.5 && los(troll.x, troll.y, P.x, P.y)) {
      P.x = TROLL.pushTo.x; P.y = TROLL.pushTo.y; P.a = Math.PI;
      s.trollAngry = 1.2;
      sfx.push();
      say('Troll: GRRR! Hier kommt keiner durch, den ich sehe!');
    }
  }

  function updateStatue(dt) {
    if (cell(STATUE.x, STATUE.y) !== 'F') return;
    s.statueCD -= dt;
    const inCorridor = Math.abs(P.x - (STATUE.x + 0.5)) < 1.2 && P.y < STATUE.y && P.y > STATUE.y - 7;
    if (s.statueCD <= 0 && inCorridor) {
      s.statueCD = 1.5;
      sfx.fire();
      s.projectiles.push({ x: STATUE.x + 0.5, y: STATUE.y - 0.1, vx: STATUE.dirX * 4.2, vy: STATUE.dirY * 4.2,
        kind: 'fire', owner: 'statue', dmg: 1, t: 4 });
    }
  }

  function updateProjectiles(dt) {
    const ca = Math.cos(P.a), sa = Math.sin(P.a);
    for (const p of s.projectiles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt;
      const cx = Math.floor(p.x), cy = Math.floor(p.y);
      if (p.owner === 'statue' && cy >= STATUE.y) continue; // verlässt gerade die Statue
      if (solid(p.x, p.y)) {
        p.t = 0;
        const c = cell(cx, cy);
        if (c === 'F' && p.kind === 'ice') {
          map[cy][cx] = '.';
          sfx.pop();
          burst(cx + 0.5, cy + 0.5, [abgr('#8a8078'), abgr('#ff9a20'), abgr('#6e665e')], 26, 0.5, 2.5);
          banner('STATUE ZERSTÖRT!', 'Theo hat das Feuer zurückgeworfen', '#a8f070');
          gainXP(10);
        } else if (c === 'F') {
          say('Pling! Das bringt hier nichts.', 1.5);
        }
        burst(p.x - p.vx * 0.02, p.y - p.vy * 0.02, p.kind === 'chestnut' ? [abgr('#7a3a12')] : [abgr('#ffb040'), abgr('#ff6020')], 5, 0.5, 1);
        continue;
      }
      if (p.owner !== 'player') {
        const d = Math.hypot(p.x - P.x, p.y - P.y);
        if (d < 0.42) {
          p.t = 0;
          const vl = Math.hypot(p.vx, p.vy) || 1;
          const facing = -(p.vx * ca + p.vy * sa) / vl; // 1 = kommt genau von vorn
          if (HEROES[s.hero].id === 'theo' && s.shieldUp && facing > 0.35) {
            // Zurückwerfen: als Eisball in Blickrichtung
            sfx.block();
            s.projectiles.push({ x: P.x + ca * 0.45, y: P.y + sa * 0.45, vx: ca * 6.5, vy: sa * 6.5, kind: 'ice', owner: 'player', dmg: 3, t: 3 });
            burst(P.x + ca * 0.5, P.y + sa * 0.5, [abgr('#a8e8ff'), abgr('#ffffff')], 8, 0.5, 1.2);
          } else hurt(p.dmg);
        }
        continue;
      }
      if (Math.hypot(p.x - troll.x, p.y - troll.y) < 0.5) { p.t = 0; say('Der Troll lacht nur: HOHOHO!', 1.5); continue; }
      for (const e of entities) {
        if (!e.alive || !ENEMY[e.type]) continue;
        if (Math.hypot(p.x - e.x, p.y - e.y) < 0.42) {
          p.t = 0;
          const vl = Math.hypot(p.vx, p.vy);
          damageEnemy(e, p.dmg, (p.vx / vl) * 0.25, (p.vy / vl) * 0.25);
          break;
        }
      }
    }
    s.projectiles = s.projectiles.filter((p) => p.t > 0);
  }

  function pickups() {
    for (const e of entities) {
      if (!e.alive || !ITEM_TYPES.has(e.type)) continue;
      if (Math.hypot(e.x - P.x, e.y - P.y) > 0.5) continue;
      if (e.type === 'apple' && stats.hearts >= stats.maxHearts) continue;
      e.alive = false;
      sfx.item();
      if (e.type === 'bag') { s.ammo += 12; say('+12 Kastanien für Felix!', 1.8); }
      if (e.type === 'apple') { stats.hearts = Math.min(stats.maxHearts, stats.hearts + 1); say('Mmh, ein Apfel! +1 Herz', 1.8); }
      if (e.type === 'crystal') { s.crystals++; gainXP(5); say(`Kristall! (${s.crystals}/${totalCrystals})`, 1.8); }
      if (e.type === 'key') { s.hasKey = true; banner('SCHLÜSSEL GEFUNDEN', 'Damit geht die Schlosstür auf', '#f8d848'); }
    }
  }

  function areaTriggers() {
    const cx = Math.floor(P.x), cy = Math.floor(P.y);
    for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) if (y >= 0 && x >= 0 && y < MH && x < MW) visited[y][x] = true;
    HINTS.forEach(([x0, y0, x1, y1, text], i) => {
      if (s.hints.has(i) || cx < x0 || cx > x1 || cy < y0 || cy > y1) return;
      s.hints.add(i);
      say(text, 4.5);
    });
    for (const [x0, y0, x1, y1, px, py, a] of CHECKPOINTS) {
      if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) s.checkpoint = { x: px, y: py, a };
    }
  }

  // --- Rendering --------------------------------------------------------------------

  const fog = (d) => {
    const f = 1.25 - d * 0.11;
    return (f < 0.1 ? 0.1 : f > 1 ? 1 : f) * (0.96 + 0.04 * Math.sin(s.time * 9));
  };

  function render3D() {
    const ca = Math.cos(P.a), sa = Math.sin(P.a);
    const plX = -sa * PLANE, plY = ca * PLANE;
    buf.fill(0xff100c0c, 0, VW * VH);

    // Boden und Decke
    const rx0 = ca - plX, ry0 = sa - plY, rx1 = ca + plX, ry1 = sa + plY;
    const fl = T.floor.d, ce = T.ceil.d;
    for (let y = HALF + 1; y < VH; y++) {
      const rowD = (0.5 * VH) / (y - HALF);
      const stepX = (rowD * (rx1 - rx0)) / VW, stepY = (rowD * (ry1 - ry0)) / VW;
      let fx = P.x + rowD * rx0, fy = P.y + rowD * ry0;
      const f = fog(rowD), fc = f * 0.75;
      const yc = VH - 1 - y;
      for (let x = 0; x < VW; x++) {
        const tx = ((fx - Math.floor(fx)) * TS) | 0, ty = ((fy - Math.floor(fy)) * TS) | 0;
        const i = ty * TS + tx;
        buf[y * VW + x] = shade(fl[i], f);
        buf[yc * VW + x] = shade(ce[i], fc);
        fx += stepX; fy += stepY;
      }
    }

    // Wände (DDA)
    for (let x = 0; x < VW; x++) {
      const camX = (2 * x) / VW - 1;
      const rdx = ca + plX * camX, rdy = sa + plY * camX;
      let mapX = Math.floor(P.x), mapY = Math.floor(P.y);
      const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
      let stepX, stepY, sdx, sdy;
      if (rdx < 0) { stepX = -1; sdx = (P.x - mapX) * ddx; } else { stepX = 1; sdx = (mapX + 1 - P.x) * ddx; }
      if (rdy < 0) { stepY = -1; sdy = (P.y - mapY) * ddy; } else { stepY = 1; sdy = (mapY + 1 - P.y) * ddy; }
      let side = 0, c = '#';
      for (let n = 0; n < 64; n++) {
        if (sdx < sdy) { sdx += ddx; mapX += stepX; side = 0; } else { sdy += ddy; mapY += stepY; side = 1; }
        c = cell(mapX, mapY);
        if (c !== '.') break;
      }
      const perp = Math.max(0.05, side === 0 ? sdx - ddx : sdy - ddy);
      zbuf[x] = perp;
      let wx = side === 0 ? P.y + perp * rdy : P.x + perp * rdx;
      wx -= Math.floor(wx);
      let tx = (wx * TS) | 0;
      if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) tx = TS - 1 - tx;
      const lineH = VH / perp;
      const start = HALF - lineH / 2;
      let end = HALF + lineH / 2;
      let vOff = 0;
      if (isDoor(c)) {
        const o = doors.get(`${mapX},${mapY}`) || 0;
        if (o > 0) { end = start + lineH * (1 - o); vOff = o * TS; }
      }
      const tex = (T.walls[c] || T.walls['#']).d;
      const f = fog(perp) * (side ? 0.78 : 1);
      const y0 = Math.max(0, Math.ceil(start)), y1 = Math.min(VH - 1, Math.floor(end));
      for (let y = y0; y <= y1; y++) {
        const ty = (((y - start) / lineH) * TS + vOff) & (TS - 1);
        buf[y * VW + x] = shade(tex[ty * TS + tx], f);
      }
    }

    // Sprites
    const invDet = 1 / (plX * sa - ca * plY);
    const list = [];
    const add = (x, y, image, size, z = 0, flash = false) => list.push({ x, y, image, size, z, flash, d: (x - P.x) ** 2 + (y - P.y) ** 2 });
    for (const e of entities) {
      if (!e.alive) continue;
      const frames = T.sprites[e.type];
      let fr = 0;
      if (e.type === 'slime' || e.type === 'torch') fr = Math.floor(e.anim * 4) % 2;
      if (e.type === 'kobold') fr = e.throwT > 0 ? 1 : 0;
      const bobZ = ITEM_TYPES.has(e.type) ? 0.08 + Math.sin(s.time * 3 + e.x) * 0.05 : 0;
      const size = e.type === 'slime' ? 0.6 : e.type === 'kobold' ? 0.75 : e.type === 'torch' ? 0.8 : DECOR_TYPES.has(e.type) ? 0.5 : 0.35;
      add(e.x, e.y, frames[fr], size, bobZ, e.hurtT > 0);
    }
    add(troll.x, troll.y, T.sprites.troll[s.trollAngry > 0 ? 1 : 0], 1.25);
    for (const p of s.projectiles) {
      const size = p.kind === 'chestnut' ? 0.22 : 0.4;
      const im = T.sprites[p.kind === 'chestnut' ? 'chestnut' : p.kind === 'ice' ? 'iceball' : 'fireball'][0];
      add(p.x, p.y, im, size, 0.5 - size / 2);
    }
    list.sort((a, b) => b.d - a.d);

    for (const sp of list) {
      const sx = sp.x - P.x, sy = sp.y - P.y;
      const tX = invDet * (sa * sx - ca * sy);
      const tY = invDet * (-plY * sx + plX * sy);
      if (tY <= 0.1) continue;
      const screenX = (VW / 2) * (1 + tX / tY);
      const h = (sp.size * VH) / tY;
      const bottom = HALF + ((0.5 - sp.z) * VH) / tY;
      const top = bottom - h;
      const left = screenX - h / 2;
      const f = fog(tY);
      const data = sp.image.d;
      const xa = Math.max(0, Math.floor(left)), xb = Math.min(VW - 1, Math.floor(left + h));
      const ya = Math.max(0, Math.floor(top)), yb = Math.min(VH - 1, Math.floor(bottom));
      for (let x = xa; x <= xb; x++) {
        if (tY >= zbuf[x]) continue;
        const tx = Math.min(TS - 1, (((x - left) / h) * TS) | 0);
        for (let y = ya; y <= yb; y++) {
          const ty = Math.min(TS - 1, (((y - top) / h) * TS) | 0);
          const c = data[ty * TS + tx];
          if ((c >>> 24) < 128) continue;
          buf[y * VW + x] = sp.flash ? 0xffffffff : shade(c, f);
        }
      }
    }

    // Partikel
    for (const p of s.particles) {
      const sx = p.x - P.x, sy = p.y - P.y;
      const tX = invDet * (sa * sx - ca * sy);
      const tY = invDet * (-plY * sx + plX * sy);
      if (tY <= 0.15) continue;
      const x = Math.round((VW / 2) * (1 + tX / tY));
      const y = Math.round(HALF + ((0.5 - p.z) * VH) / tY);
      const sz = Math.max(1, Math.round(4 / tY));
      for (let j = 0; j < sz; j++) {
        for (let i = 0; i < sz; i++) {
          const xx = x + i, yy = y + j;
          if (xx < 0 || yy < 0 || xx >= VW || yy >= VH || tY >= zbuf[xx]) continue;
          buf[yy * VW + xx] = p.c;
        }
      }
    }
  }

  // Waffen-/Werkzeugansicht der aktiven Figur
  function drawTool(g) {
    const id = HEROES[s.hero].id;
    const bx = Math.sin(P.bob) * 3, by = Math.abs(Math.cos(P.bob)) * 3 + s.swapT * 160;
    g.save();
    g.translate(Math.round(bx), Math.round(by));
    if (id === 'theo') {
      const up = s.shieldUp;
      const cx = up ? 120 : 52, cy = up ? 120 : 146, r = up ? 44 : 30;
      g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(cx, cy, r + 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = up ? '#78d0f8' : '#5a7ab8'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#9a6a3a'; g.beginPath(); g.arc(cx, cy, r - 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#7a5028';
      for (let i = -3; i <= 3; i++) g.fillRect(cx + i * (r / 4) - 1, cy - r + 6, 2, 2 * r - 12);
      g.fillStyle = '#c8c8d8'; g.beginPath(); g.arc(cx, cy, r / 4, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.fillRect(cx - r / 8, cy - r / 8, 3, 3);
      if (up) {
        g.globalAlpha = 0.18 + 0.08 * Math.sin(s.time * 12);
        g.fillStyle = '#a8e8ff'; g.fillRect(0, 0, VW, VH);
        g.globalAlpha = 1;
      }
    } else if (id === 'felix') {
      const pull = s.swingT > 0 ? 10 : 0;
      g.strokeStyle = '#5a3a20'; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(150, 170); g.lineTo(140, 122); g.stroke();
      g.beginPath(); g.moveTo(140, 124); g.lineTo(126, 100); g.moveTo(140, 124); g.lineTo(156, 100); g.stroke();
      g.strokeStyle = '#d8a060'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(126, 100); g.lineTo(141, 110 + pull); g.lineTo(156, 100); g.stroke();
      g.fillStyle = '#f0c098'; g.beginPath(); g.ellipse(147, 150, 11, 9, -0.3, 0, Math.PI * 2); g.fill();
      if (s.ammo > 0 && s.actCD <= 0.15) { g.fillStyle = '#7a3a12'; g.beginPath(); g.arc(141, 110 + pull, 3, 0, Math.PI * 2); g.fill(); }
    } else if (id === 'arne') {
      const sw = s.swingT > 0 ? Math.sin((s.swingT / 0.3) * Math.PI) : 0;
      g.translate(185, 160); g.rotate(-0.55 - sw * 0.7);
      g.fillStyle = '#7a4a24'; g.fillRect(-3, -70, 6, 70);
      g.fillStyle = '#5a5a66'; g.fillRect(-8, -80, 16, 3);
      g.fillStyle = '#a8a8b8'; g.beginPath(); g.moveTo(-10, -96); g.lineTo(10, -96); g.lineTo(7, -78); g.lineTo(-7, -78); g.closePath(); g.fill();
      g.fillStyle = '#e0e0ec'; g.fillRect(-9, -96, 18, 2);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.translate(Math.round(bx), Math.round(by));
      g.fillStyle = '#3a4a6a'; g.fillRect(186, 140, 30, 24); // Sakkoärmel
      g.fillStyle = '#f8c8a0'; g.beginPath(); g.ellipse(182, 140, 9, 7, 0, 0, Math.PI * 2); g.fill();
    } else if (id === 'friedrich') {
      g.globalAlpha = s.invisT > 0 ? 0.3 : 1;
      g.fillStyle = '#7a4ac8'; g.fillRect(30, 128, 34, 40); g.fillRect(176, 128, 34, 40);
      g.fillStyle = '#b090f0'; g.fillRect(30, 128, 34, 3); g.fillRect(176, 128, 34, 3);
      g.fillStyle = '#fcd4b0';
      g.beginPath(); g.ellipse(58, 126, 8, 7, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(182, 126, 8, 7, 0, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
    }
    g.restore();
  }

  function renderLow(g) {
    render3D();
    g.putImageData(img, 0, 0);
    drawTool(g);

    // Fadenkreuz
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fillRect(119, HALF - 1, 2, 2);

    // Bildschirmeffekte
    if (s.invisT > 0) {
      g.strokeStyle = `rgba(150,100,255,${0.45 + 0.15 * Math.sin(s.time * 6)})`;
      g.lineWidth = 6; g.strokeRect(3, 3, VW - 6, VH - 6);
    }
    if (s.hurtT > 0) { g.fillStyle = `rgba(255,40,40,${s.hurtT})`; g.fillRect(0, 0, VW, VH); }
    if (s.faintT > 0) { g.fillStyle = `rgba(0,0,0,${Math.min(0.85, 2.2 - s.faintT)})`; g.fillRect(0, 0, VW, VH); }

    drawMinimap(g);
    drawHUD(g);
  }

  function drawMinimap(g) {
    const ox = VW - MW * 2 - 3, oy = 3;
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(ox - 1, oy - 1, MW * 2 + 2, MH * 2 + 2);
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        if (!visited[y][x]) continue;
        const c = map[y][x];
        g.fillStyle = c === '.' ? '#4a4038' : c === 'X' ? '#ffb040' : isDoor(c) ? '#c08040' : '#a89888';
        g.fillRect(ox + x * 2, oy + y * 2, 2, 2);
      }
    }
    g.fillStyle = '#f8d848';
    g.fillRect(ox + Math.floor(P.x * 2) - 1, oy + Math.floor(P.y * 2) - 1, 2, 2);
    g.fillStyle = '#ffffff';
    g.fillRect(ox + Math.floor(P.x * 2 + Math.cos(P.a) * 2.5), oy + Math.floor(P.y * 2 + Math.sin(P.a) * 2.5), 1, 1);
  }

  function drawHUD(g) {
    g.fillStyle = '#2a2220'; g.fillRect(0, VH, VW, FULL_H - VH);
    g.fillStyle = '#6a5a4a'; g.fillRect(0, VH, VW, 1);
    g.fillStyle = '#4a3e36'; g.fillRect(0, VH + 1, VW, 1);
    // Herzen (2 Reihen à 5)
    for (let i = 0; i < stats.maxHearts; i++) {
      g.drawImage(heartSprite(i < stats.hearts), 4 + (i % 5) * 8, VH + 4 + Math.floor(i / 5) * 9);
    }
    // Gesicht der aktiven Figur (wie im Doom-HUD)
    const hero = HEROES[s.hero];
    g.fillStyle = '#14100e'; g.fillRect(48, VH + 2, 26, 21);
    const face = charSprite(hero.id, 0, 0);
    g.drawImage(face, 1, 0, 14, 10, 50, VH + 3, 22, 16);
    if (s.hurtT > 0) { g.fillStyle = 'rgba(255,60,60,0.4)'; g.fillRect(48, VH + 2, 26, 21); }
    // Slots 1–4
    HEROES.forEach((h, i) => {
      const x = 160 + i * 20, y = VH + 3;
      g.fillStyle = i === s.hero ? '#f8d848' : '#4a3e36'; g.fillRect(x - 1, y - 1, 19, 20);
      g.fillStyle = '#14100e'; g.fillRect(x, y, 17, 18);
      g.drawImage(charSprite(h.id, 0, 0), 1, 0, 14, 10, x + 1, y + 1, 15, 11);
      if (h.id === 'friedrich' && s.invisCD > 0 && s.invisT <= 0) {
        g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x, y, 17, Math.round(18 * (s.invisCD / 12)));
      }
    });
  }

  function renderUI(text) {
    const hero = HEROES[s.hero];
    text(hero.name, 78, VH + 4, { size: 6, color: '#f8d848' });
    text(hero.tool, 78, VH + 13, { size: 5, color: '#c8b8a8' });
    HEROES.forEach((h, i) => text(String(i + 1), 160 + i * 20 + 12, VH + 14, { size: 5, color: i === s.hero ? '#f8d848' : '#a89888' }));

    // Vorräte oben links
    let info = `Kastanien ${s.ammo}   Kristalle ${s.crystals}/${totalCrystals}`;
    if (s.hasKey) info += '   Schlüssel';
    text(info, 4, 4, { size: 5, color: '#ffffff' });
    if (s.invisT > 0) text(`Unsichtbar ${Math.ceil(s.invisT)}`, VW / 2, 14, { size: 6, align: 'center', color: '#d0c8ff' });

    if (s.msg) {
      const words = s.msg.text.split(' ');
      const lines = [''];
      for (const w of words) {
        if ((lines[lines.length - 1] + ' ' + w).trim().length > 38) lines.push(w);
        else lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + w).trim();
      }
      lines.forEach((l, i) => text(l, VW / 2, 92 + i * 9 - (lines.length - 1) * 9, { size: 6, align: 'center', color: '#ffffff' }));
    }
    if (s.banner) {
      text(s.banner.title, VW / 2, 30, { size: 10, align: 'center', color: s.banner.color });
      text(s.banner.sub, VW / 2, 45, { size: 6, align: 'center' });
    }
  }

  return {
    update, renderLow, renderUI,
    get finished() { return s.finished; },
    get summary() { return s.summary; },
    debug: { P, s, map, entities, troll }, // für Tests
  };
}
