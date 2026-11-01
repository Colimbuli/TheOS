// Kletterwand nach Rührberg: Vorderansicht der Felswand, Mama sichert unten am Seil.
// Pro Stufe eine Frage oben, drei Griffe = drei Antworten, 6 Sekunden Zeit.
// Falsch oder zu langsam: eine Stufe zurück. Nach 10 Stufen ist man oben.

import { nextQuestion } from './quiz.js';
import { charSprite } from './sprites.js';

const W = 240, H = 160;
export const CLIMB_STEPS = 10;
const TIME = 6;
const HOLD_X = [52, 120, 188];
const HOLD_COL = [['#e84848', '#8a1c1c'], ['#3a8af0', '#1a4a9a'], ['#f0c838', '#9a7a10']];
const KID_Y = 112;     // Bildschirmhöhe des Kindes
const STEP_H = 34;     // Abstand zwischen zwei Stufen

function wrap(str, max) {
  const lines = [];
  let cur = '';
  for (const w of String(str).split(' ')) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= max) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Kurze Frage mit genau drei kurzen Antworten (in 6 Sekunden lesbar)
export function climbQuestion() {
  for (let i = 0; i < 40; i++) {
    const subj = ['ma', 'ma', 'en', 'de', 'geo'][Math.floor(Math.random() * 5)];
    const q = nextQuestion(subj);
    if (q.q.length > 64 || q.options.some((o) => o.length > 14)) continue;
    const right = q.options[q.correct];
    const wrong = shuffle(q.options.filter((_, k) => k !== q.correct)).slice(0, 2);
    const options = shuffle([right, ...wrong]);
    return { q: q.q, options, correct: options.indexOf(right) };
  }
  const a = 3 + Math.floor(Math.random() * 7), b = 3 + Math.floor(Math.random() * 7);
  const options = shuffle([a * b, a * b + a, a * b - b].map(String));
  return { q: `${a} · ${b} = ?`, options, correct: options.indexOf(String(a * b)) };
}

export class ClimbUI {
  // opts: { climber, onTop(), onQuit() }
  constructor(game, fx, opts) {
    Object.assign(this, opts);
    this.game = game; this.fx = fx;
    this.step = 0; this.sel = 1; this.closed = false;
    this.anim = 0; this.from = 0; this.mode = 'intro'; this.t = 1.6;
    this.kidX = HOLD_X[1]; this.fromX = HOLD_X[1]; this.toX = HOLD_X[1];
    this.msg = 'Mama: Ich halte das Seil. Los geht\'s!';
    this.msgT = 2;
    this.heldX = false;
  }

  ask() {
    this.qn = climbQuestion();
    this.qn.lines = wrap(this.qn.q, 38).slice(0, 3);
    this.qn.opt = this.qn.options.map((o) => wrap(o, 11).slice(0, 2));
    this.mode = 'q'; this.t = TIME; this.sel = 1;
  }

  grab(i) {
    const ok = i === this.qn.correct;
    this.sel = i;
    this.fromX = this.kidX; this.toX = HOLD_X[i];
    this.from = this.step;
    if (ok) {
      this.step++;
      this.mode = 'up'; this.anim = 0;
      this.fx.sfx.confirm();
    } else this.slip(i === -1 ? 'Zu langsam!' : 'Falscher Griff!');
  }

  slip(why) {
    this.mode = 'down'; this.anim = 0;
    this.from = this.step;
    this.step = Math.max(0, this.step - 1);
    this.toX = this.kidX;
    this.fx.sfx.hurt();
    this.msg = `${why} Mama: Hab dich!`;
    this.msgT = 1.8;
  }

  update(input, dt, tap) {
    this.msgT = Math.max(0, this.msgT - dt);
    if (input.bPressed || input.menuPressed) { this.closed = true; if (this.onQuit) this.onQuit(); return; }
    if (this.mode === 'intro') { this.t -= dt; if (this.t <= 0 || input.aPressed || tap) this.ask(); return; }
    if (this.mode === 'up' || this.mode === 'down') {
      this.anim += dt / (this.mode === 'up' ? 0.45 : 0.55);
      this.kidX = this.fromX + (this.toX - this.fromX) * Math.min(1, this.anim);
      if (this.anim >= 1) {
        this.kidX = this.toX;
        if (this.step >= CLIMB_STEPS) { this.mode = 'top'; this.t = 2.2; this.fx.sfx.levelUp(); return; }
        this.ask();
      }
      return;
    }
    if (this.mode === 'top') {
      this.t -= dt;
      if (this.t <= 0 || input.aPressed || tap) { this.closed = true; this.onTop(); }
      return;
    }
    // Frage läuft
    this.t -= dt;
    if (this.t <= 0) { this.grab(-1); return; }
    const x = input.dir.x;
    if (x && !this.heldX) { this.sel = Math.max(0, Math.min(2, this.sel + x)); this.fx.sfx.blip(); }
    this.heldX = !!x;
    if (input.dir.y < 0 && !this.heldUp) this.sel = 1;
    this.heldUp = input.dir.y < 0;
    if (tap) {
      const hy = KID_Y - STEP_H + 4;
      for (let i = 0; i < 3; i++) if (Math.abs(tap.x - HOLD_X[i]) < 36 && tap.y > hy - 32 && tap.y < hy + 10) { this.grab(i); return; }
    }
    if (input.aPressed) this.grab(this.sel);
  }

  // Kamera-Höhe in Pixeln (wächst mit den Stufen, sanft animiert)
  height() {
    const k = this.mode === 'up' || this.mode === 'down' ? Math.min(1, this.anim) : 1;
    const ease = k * k * (3 - 2 * k);
    return (this.from + (this.step - this.from) * ease) * STEP_H;
  }

  render(g, text) {
    const h = this.height();
    const time = this.game.time;
    // Felswand
    g.fillStyle = '#7a6a5a'; g.fillRect(0, 0, W, H);
    for (let i = -1; i < 15; i++) {
      const y = i * 12 + (h % 12) - 12;
      const wy = i - Math.floor(h / 12) + 1000;   // Weltzeile (bleibt beim Klettern an ihrem Platz)
      for (let col = -1; col < 13; col++) {
        const s = ((wy * 73 + col * 37) >>> 0) % 97;
        g.fillStyle = s % 3 === 0 ? '#6a5a4c' : s % 3 === 1 ? '#86766a' : '#7a6a5a';
        g.fillRect(col * 20 + (wy % 2) * 10, y, 20, 12);
        if (s % 7 === 0) { g.fillStyle = '#4e4036'; g.fillRect(col * 20 + (s % 13), y + 4, 6, 1); }
        if (s % 11 === 0) { g.fillStyle = '#9a8a7a'; g.fillRect(col * 20 + (s % 9), y + 2, 3, 1); }
      }
    }
    // Boden mit Mama (verschwindet nach oben hin)
    const groundY = KID_Y + 22 + h;
    if (groundY < H + 40) {
      g.fillStyle = '#4a9640'; g.fillRect(0, groundY, W, H);
      g.fillStyle = '#68b850'; g.fillRect(0, groundY, W, 3);
      const mama = charSprite('mama', 1, 0);
      g.drawImage(mama, 150, groundY - 12);
      g.fillStyle = '#f0e0b0';
      for (let x = Math.min(this.kidX, 156); x < Math.max(this.kidX, 156); x += 2) g.fillRect(Math.round(x), groundY - 2, 1, 1);
    }
    // Gipfel mit Gras oben
    const topY = KID_Y - (CLIMB_STEPS - 0) * STEP_H + h - 20;
    if (topY > -30) {
      g.fillStyle = '#68b850'; g.fillRect(0, 0, W, Math.max(0, topY));
      g.fillStyle = '#3f8436'; g.fillRect(0, topY - 3, W, 3);
    }
    // Seil von Mama zum Kind
    const kidX = Math.round(this.kidX), ropeTop = KID_Y + 6;
    g.fillStyle = '#f0e0b0';
    for (let y = ropeTop; y < Math.min(H, groundY); y += 2) g.fillRect(kidX + Math.round(Math.sin((y + time * 20) / 9)), y, 1, 1);
    // Griffe der aktuellen Stufe
    if (this.mode === 'q') {
      const hy = KID_Y - STEP_H + 4;
      for (let i = 0; i < 3; i++) {
        const [c, d] = HOLD_COL[i];
        const x = HOLD_X[i], sel = i === this.sel;
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x - 9, hy + 3, 18, 6);
        g.fillStyle = d; g.fillRect(x - 9, hy - 5, 18, 10);
        g.fillStyle = c; g.fillRect(x - 8, hy - 6, 16, 9);
        g.fillStyle = '#ffffff'; g.fillRect(x - 6, hy - 5, 4, 2);
        if (sel) { g.fillStyle = '#ffffff'; g.fillRect(x - 12, hy - 9, 24, 1); g.fillRect(x - 12, hy + 7, 24, 1); g.fillRect(x - 12, hy - 9, 1, 17); g.fillRect(x + 11, hy - 9, 1, 17); }
        const n = this.qn.opt[i].length;
        g.fillStyle = 'rgba(12,18,40,0.85)'; g.fillRect(x - 34, hy - 12 - n * 8, 68, n * 8 + 4);
      }
    }
    // Kind (von hinten)
    const kid = charSprite(this.climber, 1, this.mode === 'up' ? (Math.floor(this.anim * 6) % 2) + 1 : 0);
    const kidOff = this.mode === 'down' ? Math.round(Math.sin(Math.min(1, this.anim) * Math.PI) * -6) : 0;
    g.drawImage(kid, 0, 0, kid.width, kid.height, kidX - kid.width, KID_Y + 16 - kid.height * 2 + kidOff, kid.width * 2, kid.height * 2);
    // Kopfzeile: Frage und Zeit
    g.fillStyle = 'rgba(12,18,40,0.92)'; g.fillRect(0, 0, W, 38);
    if (this.mode === 'q') {
      g.fillStyle = '#2a3050'; g.fillRect(8, 33, W - 16, 3);
      g.fillStyle = this.t < 2 ? '#ff5050' : '#58d878'; g.fillRect(8, 33, Math.round(((W - 16) * Math.max(0, this.t)) / TIME), 3);
    }
    // Stufenanzeige rechts
    g.fillStyle = 'rgba(12,18,40,0.7)'; g.fillRect(W - 14, 44, 8, CLIMB_STEPS * 6 + 2);
    for (let i = 0; i < CLIMB_STEPS; i++) { g.fillStyle = i < this.step ? '#f8d848' : '#3a4060'; g.fillRect(W - 12, 44 + (CLIMB_STEPS - 1 - i) * 6 + 2, 4, 4); }

    // --- Texte
    if (this.mode === 'q') {
      this.qn.lines.forEach((l, i) => text(l, W / 2, 5 + i * 9, { size: 6, align: 'center' }));
      const hy = KID_Y - STEP_H + 4;
      for (let i = 0; i < 3; i++) {
        const n = this.qn.opt[i].length;
        this.qn.opt[i].forEach((l, j) => text(l, HOLD_X[i], hy - 10 - n * 8 + j * 8, { size: 5, align: 'center', color: i === this.sel ? '#ffffff' : '#d8e0f0' }));
      }
    } else if (this.mode === 'intro') {
      text('Die Felswand nach Rührberg', W / 2, 6, { size: 7, align: 'center', color: '#f8d848' });
      text('Wähle den Griff mit der richtigen Antwort.', W / 2, 18, { size: 5, align: 'center' });
      text('Links/Rechts + A oder antippen · 6 Sekunden!', W / 2, 27, { size: 5, align: 'center', color: '#a8f070' });
    } else if (this.mode === 'top') {
      text('GESCHAFFT!', W / 2, 10, { size: 10, align: 'center', color: '#f8d848' });
      text('Das Seil bleibt hängen – Rührberg ist erreicht.', W / 2, 26, { size: 5, align: 'center' });
    }
    text(`${this.step}/${CLIMB_STEPS}`, W - 10, 46 + CLIMB_STEPS * 6, { size: 5, align: 'center', color: '#f8d848' });
    if (this.msgT > 0) text(this.msg, W / 2, H - 12, { size: 6, align: 'center', color: '#ffd0a0' });
    else if (this.mode === 'q') text(`${Math.ceil(this.t)} s`, 18, 42, { size: 6, color: this.t < 2 ? '#ff7070' : '#ffffff' });
    text('B: abseilen', 6, H - 10, { size: 4, color: '#c8d0e8' });
  }
}
