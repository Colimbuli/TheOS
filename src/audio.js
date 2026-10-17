// Kleine Chiptune-Soundeffekte per WebAudio – keine Audiodateien nötig.

let ctx = null;

export function unlockAudio() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function tone(freq, dur, { type = 'square', vol = 0.06, when = 0, slide = null } = {}) {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  blip: () => tone(920, 0.025, { vol: 0.025 }),
  confirm: () => { tone(660, 0.06); tone(990, 0.09, { when: 0.06 }); },
  swing: () => tone(520, 0.09, { type: 'sawtooth', vol: 0.035, slide: 180 }),
  cut: () => { tone(320, 0.06, { vol: 0.05, slide: 110 }); tone(180, 0.08, { type: 'triangle', when: 0.03, slide: 80 }); },
  bump: () => tone(110, 0.05, { vol: 0.03 }),
  item: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, { when: i * 0.08 })),
  levelUp: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { vol: 0.07, when: i * 0.1 }));
    tone(1047, 0.4, { type: 'triangle', vol: 0.07, when: 0.4 });
  },
  start: () => [392, 523, 659, 784].forEach((f, i) => tone(f, 0.09, { when: i * 0.07 })),
};
