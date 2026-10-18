// Bildschirm-Menüs: Schule (Lernaufgaben) und Laden.
// Bedienung: Steuerkreuz hoch/runter, A bestätigen, B zurück – oder direkt antippen.

import { SUBJECTS, nextQuestion } from './quiz.js';
import { CATALOG, itemState, buy } from './shop.js';
import { drawDiamond } from './world.js';

const W = 240, H = 160;

function wrap(str, max) {
  const lines = [];
  let cur = '';
  for (const w of str.split(' ')) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= max) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Gemeinsame Navigation mit Tastenwiederholung beim Gedrückthalten
function navigator() {
  let held = 0, repeatT = 0;
  return (input, dt) => {
    const y = input.dir.y || input.tapY;
    if (!y) { held = 0; return 0; }
    if (y !== held) { held = y; repeatT = 0.35; return y; }
    repeatT -= dt;
    if (repeatT <= 0) { repeatT = 0.12; return y; }
    return 0;
  };
}

function panel(g, title) {
  g.fillStyle = 'rgba(12,18,40,0.95)';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#f0f0f8'; g.fillRect(3, 3, W - 6, 1); g.fillRect(3, H - 4, W - 6, 1);
  g.fillRect(3, 3, 1, H - 6); g.fillRect(W - 4, 3, 1, H - 6);
  g.fillStyle = '#28386a'; g.fillRect(4, 4, W - 8, 13);
  void title;
}

function diamondsHeader(g, text, game) {
  drawDiamond(g, 196, 7);
  text(String(game.diamonds), 205, 7, { size: 6, color: '#88f0ff' });
}

const hit = (tap, x, y, w, h) => tap && tap.x >= x && tap.x < x + w && tap.y >= y && tap.y < y + h;

// --- Schule ---------------------------------------------------------------------

export class QuizUI {
  constructor(game, fx) {
    this.game = game; this.fx = fx;
    this.mode = 'menu'; this.sel = 0; this.nav = navigator();
    this.subject = null; this.qn = null; this.streak = 0; this.result = null; this.closed = false;
  }

  start(subjectIdx) {
    this.subject = SUBJECTS[subjectIdx];
    this.streak = 0;
    this.ask();
  }

  ask() {
    this.qn = nextQuestion(this.subject.id);
    this.qn.lines = wrap(this.qn.q, 36).slice(0, 4);
    this.qn.opt = this.qn.options.map((o) => wrap(o, 33).slice(0, 2));
    this.mode = 'q'; this.sel = 0; this.result = null;
  }

  answer(i) {
    const g = this.game, ok = i === this.qn.correct;
    const st = g.quizStats[this.subject.id];
    st.n++;
    this.sel = i;
    if (ok) {
      st.r++;
      this.streak++;
      let gain = 1;
      if (this.streak % 5 === 0) gain += 2;
      g.diamonds += gain;
      this.result = { ok: true, gain };
      this.fx.sfx.item();
    } else {
      this.streak = 0;
      this.result = { ok: false };
      this.fx.sfx.hurt();
    }
    this.mode = 'fb';
  }

  update(input, dt, tap) {
    const d = this.nav(input, dt);
    if (this.mode === 'menu') {
      const n = SUBJECTS.length + 1;
      if (d) { this.sel = (this.sel + d + n) % n; this.fx.sfx.blip(); }
      for (let i = 0; i < n; i++) if (hit(tap, 20, 44 + i * 18, 200, 16)) { this.sel = i; input.aPressed = true; }
      if (input.bPressed || (input.aPressed && this.sel === SUBJECTS.length)) { this.closed = true; return; }
      if (input.aPressed) { this.fx.sfx.confirm(); this.start(this.sel); }
      return;
    }
    if (this.mode === 'q') {
      if (d) { this.sel = (this.sel + d + 4) % 4; this.fx.sfx.blip(); }
      for (let i = 0; i < 4; i++) if (hit(tap, 8, 64 + i * 19, 224, 18)) { this.answer(i); return; }
      if (input.bPressed) { this.mode = 'menu'; this.sel = SUBJECTS.indexOf(this.subject); return; }
      if (input.aPressed) this.answer(this.sel);
      return;
    }
    if (this.mode === 'fb') {
      if (input.aPressed || tap) this.ask();
      else if (input.bPressed) { this.mode = 'menu'; this.sel = SUBJECTS.indexOf(this.subject); }
    }
  }

  render(g, text) {
    const game = this.game;
    panel(g);
    diamondsHeader(g, text, game);
    if (this.mode === 'menu') {
      text('Schule – Frau Klug', 9, 7, { size: 6, color: '#f8d848' });
      text('Welches Fach möchtest du üben?', W / 2, 26, { size: 6, align: 'center' });
      [...SUBJECTS.map((s) => s.name), 'Tschüss!'].forEach((name, i) => {
        const y = 44 + i * 18, sel = i === this.sel;
        g.fillStyle = sel ? '#3a58c8' : '#1c2850'; g.fillRect(20, y, 200, 16);
        if (sel) { g.fillStyle = '#f8d848'; g.fillRect(20, y, 2, 16); }
        text(name, 30, y + 5, { size: 6, color: sel ? '#ffffff' : '#c8d0e8' });
        const st = SUBJECTS[i] && game.quizStats[SUBJECTS[i].id];
        if (st && st.n) text(`${st.r} richtig`, 212, y + 5, { size: 5, align: 'right', color: '#a8f070' });
      });
      text('A: wählen   B: verlassen', W / 2, 148, { size: 5, align: 'center', color: '#8898c0' });
      return;
    }

    const q = this.qn;
    text(this.subject.name, 9, 7, { size: 6, color: '#f8d848' });
    if (this.streak >= 2) text(`Serie: ${this.streak}`, 150, 7, { size: 5, align: 'right', color: '#ffb040' });
    q.lines.forEach((l, i) => text(l, 10, 22 + i * 9, { size: 6 }));
    q.opt.forEach((lines, i) => {
      const y = 64 + i * 19;
      let bg = i === this.sel ? '#3a58c8' : '#1c2850';
      if (this.mode === 'fb') {
        if (i === q.correct) bg = '#2a8a3a';
        else if (i === this.sel) bg = '#a83030';
      }
      g.fillStyle = bg; g.fillRect(8, y, 224, 18);
      if (i === this.sel && this.mode === 'q') { g.fillStyle = '#f8d848'; g.fillRect(8, y, 2, 18); }
      const off = lines.length === 1 ? 6 : 2;
      text(String.fromCharCode(65 + i) + ')', 14, y + off, { size: 6, color: '#f8d848' });
      lines.forEach((l, j) => text(l, 32, y + off + j * 8, { size: 6 }));
    });
    if (this.mode === 'fb') {
      const r = this.result;
      const msg = r.ok ? (r.gain > 1 ? `Super! 5er-Serie: +${r.gain} Diamanten` : 'Richtig! +1 Diamant') : 'Leider falsch – grün ist richtig.';
      text(msg, W / 2, 142, { size: 6, align: 'center', color: r.ok ? '#a8f070' : '#ff9090' });
      text('A: nächste Frage   B: Fächer', W / 2, 151, { size: 5, align: 'center', color: '#8898c0' });
    } else {
      text('A: antworten   B: zurück', W / 2, 148, { size: 5, align: 'center', color: '#8898c0' });
    }
  }
}

// --- Laden ----------------------------------------------------------------------

const ROWS = 7, ROW_H = 13, LIST_Y = 22;

export class ShopUI {
  constructor(game, fx) {
    this.game = game; this.fx = fx;
    this.sel = 0; this.top = 0; this.msg = null; this.nav = navigator(); this.closed = false;
  }

  update(input, dt, tap) {
    const n = CATALOG.length + 1;
    const d = this.nav(input, dt);
    if (d) { this.sel = (this.sel + d + n) % n; this.fx.sfx.blip(); this.msg = null; }
    for (let i = 0; i < ROWS; i++) {
      if (hit(tap, 8, LIST_Y + i * ROW_H, 224, ROW_H - 1) && this.top + i < n) {
        if (this.sel === this.top + i) input.aPressed = true; else { this.sel = this.top + i; this.msg = null; }
      }
    }
    if (this.sel < this.top) this.top = this.sel;
    if (this.sel >= this.top + ROWS) this.top = this.sel - ROWS + 1;
    if (input.bPressed || (input.aPressed && this.sel === CATALOG.length)) { this.closed = true; return; }
    if (input.aPressed) {
      const r = buy(this.game, CATALOG[this.sel]);
      this.msg = r;
      if (r.ok) this.fx.sfx.levelUp(); else this.fx.sfx.bump();
    }
  }

  render(g, text) {
    const game = this.game;
    panel(g);
    diamondsHeader(g, text, game);
    text('Brunos Wunderladen', 9, 7, { size: 6, color: '#f8d848' });
    const rows = [...CATALOG, { name: 'Tschüss!', exit: true }];
    for (let i = 0; i < ROWS; i++) {
      const idx = this.top + i, it = rows[idx];
      if (!it) break;
      const y = LIST_Y + i * ROW_H, sel = idx === this.sel;
      g.fillStyle = sel ? '#3a58c8' : '#1c2850'; g.fillRect(8, y, 224, ROW_H - 1);
      if (sel) { g.fillStyle = '#f8d848'; g.fillRect(8, y, 2, ROW_H - 1); }
      if (it.exit) { text(it.name, 16, y + 3, { size: 6, color: sel ? '#ffffff' : '#c8d0e8' }); continue; }
      const st = itemState(game, it);
      const afford = game.diamonds >= it.price;
      text(it.name, 16, y + 3, { size: 6, color: st.owned ? '#7888a8' : '#ffffff' });
      if (st.owned) text(st.label || 'gekauft', 228, y + 3, { size: 5, align: 'right', color: '#a8f070' });
      else {
        drawDiamond(g, 206, y + 3);
        text(String(it.price), 228, y + 3, { size: 6, align: 'right', color: afford ? '#88f0ff' : '#ff9090' });
        if (st.label) text(st.label, 196, y + 4, { size: 5, align: 'right', color: '#a8b8d8' });
      }
    }
    // Pfeile zum Scrollen
    if (this.top > 0) text('▲', 236, LIST_Y, { size: 5, align: 'right', color: '#8898c0' });
    if (this.top + ROWS < rows.length) text('▼', 236, LIST_Y + ROWS * ROW_H - 8, { size: 5, align: 'right', color: '#8898c0' });

    g.fillStyle = '#1c2850'; g.fillRect(8, 116, 224, 24);
    const cur = rows[this.sel];
    if (this.msg) {
      wrap(this.msg.msg, 36).slice(0, 2).forEach((l, i) => text(l, 14, 120 + i * 9, { size: 6, color: this.msg.ok ? '#a8f070' : '#ff9090' }));
    } else if (cur && !cur.exit) {
      wrap(cur.desc, 36).slice(0, 2).forEach((l, i) => text(l, 14, 120 + i * 9, { size: 6, color: '#d8e0f0' }));
    }
    text('A: kaufen   B: verlassen', W / 2, 148, { size: 5, align: 'center', color: '#8898c0' });
  }
}
