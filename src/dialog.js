// Dialogbox mit Schreibmaschinen-Effekt. Texte werden automatisch umbrochen und in Seiten geteilt.

export const DIALOG_CHARS = 27;
export const DIALOG_LINES = 3;

function wrap(str) {
  const lines = [];
  let cur = '';
  for (const w of str.split(' ')) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= DIALOG_CHARS) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

export class Dialog {
  constructor() { this.active = false; }

  open(texts, onDone) {
    this.pages = [];
    for (const t of texts) {
      const l = wrap(t);
      for (let i = 0; i < l.length; i += DIALOG_LINES) this.pages.push(l.slice(i, i + DIALOG_LINES));
    }
    this.i = 0;
    this.shown = 0;
    this.onDone = onDone || null;
    this.active = this.pages.length > 0;
  }

  get page() { return this.pages[this.i]; }
  get total() { return this.page.reduce((s, l) => s + l.length, 0); }
  get pageDone() { return this.shown >= this.total; }

  update(dt, aPressed, blip) {
    if (!this.active) return;
    const before = Math.floor(this.shown);
    this.shown = Math.min(this.total, this.shown + dt * 50);
    const now = Math.floor(this.shown);
    if (now !== before && now % 3 === 0) blip();
    if (!aPressed) return;
    if (!this.pageDone) { this.shown = this.total; return; }
    this.i++;
    this.shown = 0;
    if (this.i >= this.pages.length) {
      this.active = false;
      const cb = this.onDone;
      this.onDone = null;
      if (cb) cb();
    }
  }

  visibleLines() {
    let n = Math.floor(this.shown);
    return this.page.map((l) => {
      const s = l.slice(0, Math.max(0, n));
      n -= l.length;
      return s;
    });
  }
}
