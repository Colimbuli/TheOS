// Bildschirm-Menüs: Schule (Lernaufgaben) und Laden.
// Bedienung: Steuerkreuz hoch/runter, A bestätigen, B zurück – oder direkt antippen.

import { SUBJECTS, nextQuestion } from './quiz.js';
import { CATALOG, itemState, buy } from './shop.js';
import { drawDiamond } from './world.js';
import { charSprite } from './sprites.js';

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

// --- Rätsel (Spukhaus): mehrere richtige Antworten öffnen eine Tür ----------------

export class RiddleUI {
  // opts: { speaker, need, gen: () => {q, options, correct}, onSolved }
  constructor(game, fx, opts) {
    Object.assign(this, opts);
    this.game = game; this.fx = fx;
    this.got = 0; this.nav = navigator(); this.closed = false;
    this.ask();
  }

  ask() {
    this.qn = this.gen();
    this.qn.lines = wrap(this.qn.q, 36).slice(0, 5);
    this.qn.opt = this.qn.options.map((o) => wrap(o, 33).slice(0, 2));
    this.mode = 'q'; this.sel = 0; this.result = null;
  }

  answer(i) {
    const ok = i === this.qn.correct;
    this.sel = i;
    if (ok) { this.got++; this.game.diamonds++; this.fx.sfx.item(); }
    else this.fx.sfx.hurt();
    this.result = { ok };
    this.mode = 'fb';
  }

  update(input, dt, tap) {
    const n = this.qn.options.length;
    const d = this.nav(input, dt);
    if (this.mode === 'q') {
      if (d) { this.sel = (this.sel + d + n) % n; this.fx.sfx.blip(); }
      for (let i = 0; i < n; i++) if (hit(tap, 8, this.optY(i), 224, 18)) { this.answer(i); return; }
      if (input.bPressed) { this.closed = true; return; }
      if (input.aPressed) this.answer(this.sel);
      return;
    }
    if (input.aPressed || tap) {
      if (this.got >= this.need) { this.closed = true; this.onSolved(); return; }
      this.ask();
    } else if (input.bPressed) this.closed = true;
  }

  optY(i) { return 70 + i * 19 - (this.qn.options.length === 2 ? -10 : 0); }

  render(g, text) {
    panel(g);
    diamondsHeader(g, text, this.game);
    text(this.speaker, 9, 7, { size: 6, color: '#f8d848' });
    text(`${Math.min(this.got, this.need)}/${this.need} richtig`, 150, 7, { size: 5, align: 'right', color: '#a8f070' });
    const q = this.qn;
    q.lines.forEach((l, i) => text(l, 10, 22 + i * 9, { size: 6 }));
    q.opt.forEach((lines, i) => {
      const y = this.optY(i);
      let bg = i === this.sel ? '#3a58c8' : '#1c2850';
      if (this.mode === 'fb') {
        if (i === q.correct && this.result.ok) bg = '#2a8a3a';
        else if (i === this.sel && !this.result.ok) bg = '#a83030';
      }
      g.fillStyle = bg; g.fillRect(8, y, 224, 18);
      if (i === this.sel && this.mode === 'q') { g.fillStyle = '#f8d848'; g.fillRect(8, y, 2, 18); }
      const off = lines.length === 1 ? 6 : 2;
      text(String.fromCharCode(65 + i) + ')', 14, y + off, { size: 6, color: '#f8d848' });
      lines.forEach((l, j) => text(l, 32, y + off + j * 8, { size: 6 }));
    });
    if (this.mode === 'fb') {
      const ok = this.result.ok;
      const done = this.got >= this.need;
      // Bei falscher Antwort wird die Lösung NICHT verraten – sonst könnte man raten und merken
      const msg = ok ? (done ? 'Geschafft! Rätsel gelöst!' : 'Richtig! +1 Diamant') : 'Leider falsch. Neue Frage!';
      text(msg, W / 2, 147, { size: 6, align: 'center', color: ok ? '#a8f070' : '#ff9090' });
      text('A: weiter', W / 2, 155, { size: 5, align: 'center', color: '#8898c0' });
    } else {
      text('A: antworten   B: aufgeben', W / 2, 151, { size: 5, align: 'center', color: '#8898c0' });
    }
  }
}

// --- Pause-Menü: Speichern, Laden, Speichercode ------------------------------------

const MAP_NAMES = { village: 'Lindental', school: 'Schule', shop: 'Brunos Laden', cave: 'Höhle', haunted: 'Spukhaus',
  valley: 'Tal der Trolle', under: 'Unterwelt', mountain: 'Bergpfad', lair: 'Felsmonster-Höhle' };

function slotLabel(d) {
  if (!d) return { name: '– leer –', info: '' };
  const t = new Date(d.savedAt || 0);
  const pad = (n) => String(n).padStart(2, '0');
  const when = d.savedAt ? `${pad(t.getDate())}.${pad(t.getMonth() + 1)}. ${pad(t.getHours())}:${pad(t.getMinutes())}` : '';
  return { name: MAP_NAMES[d.mapId] || d.mapId, info: `LV${d.stats.level}  ${d.diamonds} Dia.  ${when}` };
}

export class PauseUI {
  // api: { save(n), load(n) -> bool, slots() -> [auto, s1, s2, s3], code() -> string, enterCode() -> msg, toTitle() }
  constructor(game, fx, api, { fromTitle = false, mode = 'main' } = {}) {
    this.game = game; this.fx = fx; this.api = api; this.fromTitle = fromTitle;
    this.nav = navigator(); this.closed = false; this.msg = null;
    this.setMode(mode);
  }

  setMode(mode) {
    this.mode = mode; this.sel = 0; this.msg = null;
    if (mode === 'main') {
      this.items = this.fromTitle
        ? [['load', 'Spielstand laden'], ['enter', 'Speichercode eingeben'], ['back', 'Zurück']]
        : [['resume', 'Weiterspielen'], ['save', 'Speichern'], ['load', 'Laden'], ['code', 'Speichercode anzeigen'], ['enter', 'Speichercode eingeben'], ['tilt', `3D-Ansicht: ${this.api.tiltLabel()}`], ['title', 'Zum Titelbild']];
    } else if (mode === 'code') {
      this.codeText = this.api.code();
      this.items = [['back', 'Zurück']];
    } else {
      // save / load: Plätze 1–3, beim Laden zusätzlich der Autosave
      const s = this.api.slots();
      this.items = (mode === 'load' ? [['slot0', 'Automatisch', s[0]]] : []).concat(
        [1, 2, 3].map((n) => [`slot${n}`, `Platz ${n}`, s[n]]), [['back', 'Zurück']]);
    }
  }

  choose(id) {
    if (id === 'resume') { this.closed = true; return; }
    if (id === 'back') { if (this.mode === 'main') this.closed = true; else this.setMode('main'); return; }
    if (id === 'save' || id === 'load' || id === 'code') { this.setMode(id); return; }
    if (id === 'title') { this.closed = true; this.api.toTitle(); return; }
    if (id === 'tilt') { this.api.cycleTilt(); this.fx.sfx.blip(); const keep = this.sel; this.setMode('main'); this.sel = keep; return; }
    if (id === 'enter') { const r = this.api.enterCode(); if (r) this.msg = r; if (r && r.ok) this.closed = true; return; }
    if (id.startsWith('slot')) {
      const n = Number(id.slice(4));
      if (this.mode === 'save') {
        const ok = this.api.save(n);
        this.fx.sfx[ok ? 'item' : 'bump']();
        this.setMode('save');
        this.msg = ok ? { ok: true, text: `Gespeichert auf Platz ${n}!` } : { ok: false, text: 'Speichern nicht möglich – nutze den Speichercode.' };
      } else {
        if (this.api.load(n)) { this.closed = true; this.fx.sfx.start(); } else { this.fx.sfx.bump(); this.msg = { ok: false, text: 'Dieser Platz ist leer.' }; }
      }
    }
  }

  update(input, dt, tap) {
    const n = this.items.length;
    const d = this.nav(input, dt);
    if (d) { this.sel = (this.sel + d + n) % n; this.fx.sfx.blip(); }
    for (let i = 0; i < n; i++) if (hit(tap, 30, this.rowY(i), 180, 15)) { this.sel = i; input.aPressed = true; }
    if (input.bPressed || input.menuPressed) { this.choose('back'); return; }
    if (input.aPressed) this.choose(this.items[this.sel][0]);
  }

  rowY(i) {
    if (this.mode === 'code') return 112;
    const slots = this.mode === 'save' || this.mode === 'load';
    return 26 + i * (slots ? 21 : 16);
  }

  render(g, text) {
    panel(g);
    diamondsHeader(g, text, this.game);
    const title = { main: this.fromTitle ? 'Laden' : 'Pause', save: 'Speichern – Platz wählen', load: 'Laden – Platz wählen', code: 'Speichercode' }[this.mode];
    text(title, 9, 7, { size: 6, color: '#f8d848' });
    if (this.mode === 'code') {
      text('Schreib dir diesen Code auf:', W / 2, 30, { size: 6, align: 'center' });
      g.fillStyle = '#1c2850'; g.fillRect(20, 46, 200, 24);
      text(this.codeText, W / 2, 53, { size: 10, align: 'center', color: '#88f0ff' });
      text('Mit dem Code geht es am Anfang', W / 2, 80, { size: 5, align: 'center', color: '#c8d0e8' });
      text('des aktuellen Ortes weiter.', W / 2, 89, { size: 5, align: 'center', color: '#c8d0e8' });
    }
    this.items.forEach(([id, label, data], i) => {
      const y = this.rowY(i), sel = i === this.sel;
      const slot = id.startsWith('slot');
      const h = slot ? 19 : 15;
      g.fillStyle = sel ? '#3a58c8' : '#1c2850'; g.fillRect(30, y, 180, h);
      if (sel) { g.fillStyle = '#f8d848'; g.fillRect(30, y, 2, h); }
      if (slot) {
        const l = slotLabel(data);
        text(label, 38, y + 3, { size: 5, color: '#f8d848' });
        text(l.name, 100, y + 3, { size: 5, color: data ? '#ffffff' : '#7888a8' });
        if (l.info) text(l.info, 38, y + 11, { size: 5, color: '#a8b8d8' });
      } else text(label, 40, y + 4, { size: 6, color: sel ? '#ffffff' : '#c8d0e8' });
    });
    if (this.msg) text(this.msg.text, W / 2, 138, { size: 5, align: 'center', color: this.msg.ok ? '#a8f070' : '#ff9090' });
    text('A: wählen   B/Esc: zurück', W / 2, 150, { size: 5, align: 'center', color: '#8898c0' });
  }
}

// --- Kapitelauswahl ---------------------------------------------------------------

export class ChapterUI {
  constructor(game, fx, chapters, onPick) {
    this.game = game; this.fx = fx; this.chapters = chapters; this.onPick = onPick;
    this.sel = 0; this.nav = navigator(); this.closed = false;
  }

  update(input, dt, tap) {
    const n = this.chapters.length + 1;
    const d = this.nav(input, dt);
    if (d) { this.sel = (this.sel + d + n) % n; this.fx.sfx.blip(); }
    for (let i = 0; i < n; i++) if (hit(tap, 24, 22 + i * 19, 192, 17)) { this.sel = i; input.aPressed = true; }
    if (input.bPressed || input.menuPressed) { this.closed = true; return; }
    if (input.aPressed) {
      this.closed = true;
      if (this.sel < this.chapters.length) this.onPick(this.chapters[this.sel].n);
    }
  }

  render(g, text) {
    panel(g);
    text('Kapitel wählen', 9, 7, { size: 6, color: '#f8d848' });
    [...this.chapters, { name: 'Zurück' }].forEach((c, i) => {
      const y = 22 + i * 19, sel = i === this.sel;
      g.fillStyle = sel ? '#3a58c8' : '#1c2850'; g.fillRect(24, y, 192, 17);
      if (sel) { g.fillStyle = '#f8d848'; g.fillRect(24, y, 2, 17); }
      if (c.n) {
        text(`${c.n}`, 34, y + 6, { size: 6, color: '#f8d848' });
        text(c.name, 50, y + 6, { size: 6, color: sel ? '#ffffff' : '#c8d0e8' });
      } else text(c.name, 34, y + 6, { size: 6, color: sel ? '#ffffff' : '#c8d0e8' });
    });
    text('Startet mit allen Fähigkeiten bis dahin', W / 2, 142, { size: 5, align: 'center', color: '#a8b8d8' });
    text('A: starten   B: zurück', W / 2, 151, { size: 5, align: 'center', color: '#8898c0' });
  }
}

// --- Startfigur wählen ---------------------------------------------------------------

const STARTER_INFO = [
  { id: 'theo', name: 'Theo', info: 'Schutzschild · hat den großen Plan' },
  { id: 'felix', name: 'Felix', info: 'Superstärke · der Größte' },
  { id: 'arne', name: 'Arne', info: 'Graben · Locken und Sakko' },
  { id: 'friedrich', name: 'Friedrich', info: 'Unsichtbar · der Kleinste' },
];

export class StarterUI {
  constructor(game, fx, onPick) {
    this.game = game; this.fx = fx; this.onPick = onPick;
    this.sel = 0; this.nav = navigator(); this.closed = false;
  }

  update(input, dt, tap) {
    const n = STARTER_INFO.length + 1;
    const d = this.nav(input, dt);
    if (d) { this.sel = (this.sel + d + n) % n; this.fx.sfx.blip(); }
    for (let i = 0; i < n; i++) if (hit(tap, 16, this.rowY(i), 208, i < 4 ? 24 : 14)) { this.sel = i; input.aPressed = true; }
    if (input.bPressed || input.menuPressed) { this.closed = true; return; }
    if (input.aPressed) {
      this.closed = true;
      if (this.sel < STARTER_INFO.length) this.onPick(STARTER_INFO[this.sel].id);
    }
  }

  rowY(i) { return 24 + i * 27; }

  render(g, text) {
    panel(g);
    text('Mit wem startest du?', 9, 7, { size: 6, color: '#f8d848' });
    STARTER_INFO.forEach((c, i) => {
      const y = this.rowY(i), sel = i === this.sel;
      g.fillStyle = sel ? '#3a58c8' : '#1c2850'; g.fillRect(16, y, 208, 24);
      if (sel) { g.fillStyle = '#f8d848'; g.fillRect(16, y, 2, 24); }
      const spr = charSprite(c.id, 0, sel ? Math.floor(Date.now() / 200) % 3 : 0);
      g.drawImage(spr, 24, y + 22 - spr.height);
      text(c.name, 46, y + 4, { size: 7, color: sel ? '#ffffff' : '#c8d0e8' });
      text(c.info, 46, y + 14, { size: 5, color: '#a8b8d8' });
    });
    const y = this.rowY(4), sel = this.sel === 4;
    g.fillStyle = sel ? '#3a58c8' : '#1c2850'; g.fillRect(16, y, 208, 14);
    text('Zurück', 26, y + 4, { size: 6, color: sel ? '#ffffff' : '#c8d0e8' });
    text('Die anderen musst du erst überzeugen!', W / 2, 151, { size: 5, align: 'center', color: '#a8f070' });
  }
}
