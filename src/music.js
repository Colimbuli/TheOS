// Hintergrundmusik im 8-Bit-Stil – eigene Kompositionen, live per WebAudio erzeugt (keine Audiodateien).
//
// Jedes Stück: Tempo, Akkorde (1 pro Takt), Melodie (8 Achtel pro Takt), dazu automatisch erzeugte
// Bass-, Arpeggio- und Schlagzeugspur. Melodie-Zeichen: Ton (z. B. "C5", "F#4", "Bb4"),
// "-" = Ton halten, "." = Pause. Schlagzeug: k = Bass-Trommel, s = Snare, h = Hi-Hat (8 pro Takt).

import { audioCtx } from './audio.js';

const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const midiOf = (tok) => { const m = /^([A-G][#b]?)(\d)$/.exec(tok); return 12 * (Number(m[2]) + 1) + PC[m[1]]; };
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

function chordOf(name) {
  const m = /^([A-G][#b]?)(m|dim)?$/.exec(name);
  const iv = m[2] === 'm' ? [0, 3, 7] : m[2] === 'dim' ? [0, 3, 6] : [0, 4, 7];
  return { root: PC[m[1]], iv };
}

const bars = (s) => s.trim().split('|').map((b) => b.trim().split(/\s+/));

// --- Die Stücke -----------------------------------------------------------------------

export const SONGS = {
  // Titelbild: heldenhaft, C-Dur
  title: {
    bpm: 120, lead: 'pulse25', bass: 'pulse', arp: 'up', drums: 'k . h . s . h . | k . h k s . h h',
    chords: 'C G Am F C G F G',
    melody: `C5 - E5 - G5 - - E5 | D5 - - B4 G4 - D5 - | E5 - C5 - A4 - E5 - | F5 - E5 - D5 - C5 - |
             E5 - G5 - C6 - - B5 | A5 - G5 - D5 - - - | A5 - G5 - F5 - E5 D5 | D5 - - - G4 - - .`,
  },
  // Dorf Lindental: fröhlich, F-Dur
  village: {
    bpm: 108, lead: 'pulse25', bass: 'bounce', arp: 'broken', drums: 'k . h h s . h . | k . h . s . h h',
    chords: 'F C Dm Bb F C Bb C',
    melody: `A4 . C5 . F5 - E5 F5 | G5 - E5 - C5 - - . | D5 F5 A5 - G5 F5 E5 D5 | D5 - - C5 Bb4 - - . |
             A4 C5 F5 - A5 - G5 F5 | E5 - G5 - C5 - - . | D5 - F5 - Bb4 - D5 - | E5 - D5 - C5 - - .`,
  },
  // Schule und Laden: ruhig und gemütlich, G-Dur
  inside: {
    bpm: 92, lead: 'triangle', bass: 'long', arp: 'broken', drums: '. . h . . . h . | . . h . . . h h',
    chords: 'G Em C D G Em C D',
    melody: `B4 - D5 - G5 - - . | E5 - D5 - B4 - - . | C5 - E5 - G5 - E5 - | F#5 - - - D5 - - . |
             G5 - F#5 - E5 - D5 - | B4 - - - E5 - D5 - | C5 - E5 - D5 - C5 - | A4 - - - - - . .`,
  },
  // Höhlen und Unterwelt: geheimnisvoll, a-Moll
  cave: {
    bpm: 80, lead: 'pulse12', bass: 'long', arp: 'slow', drums: '. . . . . . h . | . . . . . . . .', echo: true,
    chords: 'Am Am F E Am Dm E E',
    melody: `A4 - - - C5 - B4 - | A4 - - - E4 - - - | F4 - A4 - C5 - - - | B4 - - - G#4 - - - |
             E5 - - - D5 - C5 - | D5 - - - F5 - E5 - | E5 - D5 - C5 - B4 - | G#4 - - - - - - -`,
  },
  // Spukhaus: gruselig, aber kindgerecht, d-Moll
  haunted: {
    bpm: 112, lead: 'pulse12', bass: 'bounce', arp: 'up', drums: 'k . . h s . . h | k . . h s . h h',
    chords: 'Dm Dm Gm A Dm Bb A A',
    melody: `D5 . F5 . A5 - G#5 - | A5 . F5 . D5 - - . | G5 . Bb5 . D6 - C#6 - | A5 - - - E5 - C#5 - |
             D5 - F5 - E5 - D5 - | F5 - E5 - D5 - Bb4 - | A4 - C#5 - E5 - G5 - | A5 - - - . . . .`,
  },
  // Tal der Trolle: abenteuerlich, D-Dur
  valley: {
    bpm: 132, lead: 'pulse25', bass: 'pulse', arp: 'up', drums: 'k . h k s . h . | k . h k s . h h',
    chords: 'D A Bm G D A G A',
    melody: `F#5 - A5 - D6 - - A5 | C#6 - - B5 A5 - E5 - | F#5 - B5 - D6 - C#6 B5 | B5 - - - G5 - D5 - |
             A5 - F#5 - D5 - F#5 A5 | E5 - - - C#5 - A4 - | B4 - D5 - G5 - F#5 E5 | E5 - - - . . . .`,
  },
  // Bergpfad: weit und episch, e-Moll
  mountain: {
    bpm: 104, lead: 'pulse25', bass: 'walk', arp: 'broken', drums: 'k . . . s . . . | k . . k s . h h',
    chords: 'Em C G D Em C D B',
    melody: `E5 - - - B4 - E5 - | G5 - - - F#5 - E5 - | D5 - - - B4 - D5 - | F#5 - - - A5 - - - |
             B5 - - - G5 - E5 - | C6 - B5 - A5 - G5 - | F#5 - - - D5 - F#5 - | D#5 - - - F#5 - B5 -`,
  },
  // Zwergenhallen: geheimnisvoll-mechanisch, g-Moll
  dwarf: {
    bpm: 96, lead: 'pulse25', bass: 'walk', arp: 'broken', drums: 'k . h . k . h . | k . h . s . h h', echo: true,
    chords: 'Gm D Gm F Eb F D D',
    melody: `G4 - Bb4 - D5 - G5 - | F#5 - - - D5 - A4 - | Bb4 - D5 - G5 - Bb5 - | A5 - - - F5 - C5 - |
             G5 - - - Eb5 - Bb4 - | A5 - - - F5 - A5 - | F#5 - A5 - D6 - C6 - | A5 - - - F#5 - - -`,
  },
  // Lavahöhle: heiß und treibend, e-Moll
  lava: {
    bpm: 116, lead: 'pulse25', bass: 'bounce', arp: 'up', drums: 'k . h k s . h . | k k h . s . h h',
    chords: 'Em F Em D C D Em Em',
    melody: `E5 - G5 - B5 - - G5 | A5 - - - F5 - C5 - | B4 - E5 - G5 - F#5 E5 | F#5 - - - D5 - A4 - |
             G5 - E5 - C5 - E5 G5 | A5 - F#5 - D5 - F#5 A5 | B5 - - - G5 - E5 - | E5 - - - . . . .`,
  },
  // Der Drache: das große Finale, d-Moll
  dragon: {
    bpm: 160, lead: 'pulse25', bass: 'pulse', arp: 'up', drums: 'k h s h k k s h | k h s h k s s s',
    chords: 'Dm Bb C A Dm Bb Gm A',
    melody: `D5 D5 F5 D5 A5 - G5 F5 | F5 - D5 - Bb4 - D5 - | E5 E5 G5 E5 C6 - Bb5 A5 | A5 - E5 - C#5 - E5 - |
             F5 - A5 - D6 - - A5 | Bb5 - A5 - G5 - F5 - | G5 - Bb5 - D6 - Bb5 G5 | A5 - - - C#6 - E6 -`,
  },
  // Bosskampf: schnell und spannend, c-Moll
  boss: {
    bpm: 150, lead: 'pulse25', bass: 'pulse', arp: 'up', drums: 'k h s h k k s h | k h s h k k s s',
    chords: 'Cm Cm Ab Bb Cm Cm Ab G',
    melody: `C5 C5 Eb5 C5 G5 - F5 Eb5 | G4 . C5 . Eb5 . D5 . | C5 - Eb5 - Ab5 - G5 F5 | D5 - F5 - Bb5 - - . |
             G5 G5 F5 Eb5 D5 Eb5 F5 G5 | C6 - - - G5 - - - | Ab5 - G5 - F5 - Eb5 - | D5 - B4 - G4 - B4 -`,
  },
};

// Welches Stück wo läuft
export const MAP_SONG = { village: 'village', school: 'inside', shop: 'inside', cave: 'cave', under: 'cave', lair: 'cave', haunted: 'haunted', valley: 'valley', mountain: 'mountain', dwarf: 'dwarf', maze1: 'valley', maze2: 'cave', maze3: 'lava' };

// --- Stück in Noten-Ereignisse übersetzen (Raster: Sechzehntel) ---------------------------

function compile(song) {
  const chords = song.chords.split(/\s+/).map(chordOf);
  const mel = bars(song.melody);
  const drums = bars(song.drums);
  const nBars = chords.length, steps = nBars * 16;
  const ev = Array.from({ length: steps }, () => []);
  const add = (step, e) => ev[step % steps].push(e);

  // Melodie (Achtel → 2 Sechzehntel)
  const flat = mel.flat();
  flat.forEach((tok, i) => {
    if (tok === '-' || tok === '.') return;
    let len = 1;
    while (flat[i + len] === '-') len++;
    add(i * 2, { v: 'lead', f: hz(midiOf(tok)), d: len * 2 });
    if (song.echo) add(i * 2 + 3, { v: 'echo', f: hz(midiOf(tok)), d: len * 2 });
  });

  chords.forEach((c, b) => {
    const s0 = b * 16;
    const root = 36 + c.root, tones = c.iv.map((i) => 60 + c.root + i);
    // Bass
    switch (song.bass) {
      case 'long': add(s0, { v: 'bass', f: hz(root), d: 15 }); break;
      case 'walk': [0, 7, 12, 7].forEach((iv, i) => add(s0 + i * 4, { v: 'bass', f: hz(root + iv), d: 3 })); break;
      case 'bounce': [0, 12, 7, 12, 0, 12, 7, 12].forEach((iv, i) => add(s0 + i * 2, { v: 'bass', f: hz(root + iv), d: 1 })); break;
      default: for (let i = 0; i < 8; i++) add(s0 + i * 2, { v: 'bass', f: hz(root + (i % 4 === 3 ? 12 : 0)), d: 1 });
    }
    // Arpeggio
    if (song.arp === 'up') for (let i = 0; i < 16; i++) add(s0 + i, { v: 'arp', f: hz(tones[i % 3] + (i % 6 < 3 ? 0 : 12)), d: 1 });
    if (song.arp === 'broken') [0, 1, 2, 1, 0, 1, 2, 1].forEach((t, i) => add(s0 + i * 2, { v: 'arp', f: hz(tones[t]), d: 1 }));
    if (song.arp === 'slow') [0, 2, 1, 2].forEach((t, i) => add(s0 + i * 4, { v: 'arp', f: hz(tones[t] - 12), d: 3 }));
    // Schlagzeug
    const pat = drums[b % drums.length];
    pat.forEach((d, i) => { if (d !== '.') add(s0 + i * 2, { v: d }); });
  });
  return { ev, steps, stepDur: 60 / song.bpm / 4 };
}

// --- Klangerzeugung --------------------------------------------------------------------------

const waves = {};
function pulse(ctx, duty) {
  const key = `p${duty}`;
  if (waves[key]) return waves[key];
  const n = 32, real = new Float32Array(n), imag = new Float32Array(n);
  for (let k = 1; k < n; k++) real[k] = (2 * Math.sin(Math.PI * k * duty)) / (Math.PI * k);
  return (waves[key] = ctx.createPeriodicWave(real, imag));
}

let noiseBuf = null;
function noise(ctx) {
  if (noiseBuf) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

const VOICE = {
  lead: { vol: 0.05, rel: 0.06 },
  echo: { vol: 0.018, rel: 0.1 },
  bass: { vol: 0.07, rel: 0.03, wave: 'triangle' },
  arp: { vol: 0.016, rel: 0.02, wave: 'pulse12' },
};

function playTone(ctx, out, song, e, t, stepDur) {
  const vc = VOICE[e.v];
  const o = ctx.createOscillator(), g = ctx.createGain();
  const wave = vc.wave || song.lead;
  if (wave === 'triangle') o.type = 'triangle';
  else o.setPeriodicWave(pulse(ctx, wave === 'pulse12' ? 0.125 : 0.25));
  o.frequency.setValueAtTime(e.f, t);
  const len = e.d * stepDur, vol = vc.vol * (wave === 'triangle' && e.v === 'lead' ? 1.6 : 1);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.setValueAtTime(vol * 0.8, t + Math.min(len * 0.5, 0.08));
  g.gain.linearRampToValueAtTime(0, t + len + vc.rel);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + len + vc.rel + 0.02);
}

function playDrum(ctx, out, kind, t) {
  if (kind === 'k') {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + 0.17);
    return;
  }
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noise(ctx);
  f.type = 'highpass';
  f.frequency.value = kind === 's' ? 1800 : 7000;
  const len = kind === 's' ? 0.11 : 0.03;
  g.gain.setValueAtTime(kind === 's' ? 0.04 : 0.018, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 0.5); src.stop(t + len + 0.01);
}

// --- Abspielen -------------------------------------------------------------------------------

const KEY = 'theos-music';
const VOLUME = 0.55; // Musik leiser als die Soundeffekte
const compiled = {};
let enabled = true;
let current = null; // { name, gain, step, next, data }

function loadSetting() {
  try { enabled = localStorage.getItem(KEY) !== 'off'; } catch { enabled = true; }
}
loadSetting();

function stopCurrent(ctx, fade = 0.6) {
  if (!current) return;
  const g = current.gain;
  try {
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + fade);
    setTimeout(() => g.disconnect(), (fade + 0.5) * 1000);
  } catch { /* egal */ }
  current = null;
}

const Music = {
  get enabled() { return enabled; },
  get playing() { return current ? current.name : null; },
  label() { return enabled ? 'An' : 'Aus'; },
  toggle() {
    enabled = !enabled;
    try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch { /* egal */ }
    const ctx = audioCtx();
    if (!enabled && ctx) stopCurrent(ctx, 0.3);
  },

  // Jedes Frame aufrufen: name = gewünschtes Stück (oder null für Stille)
  update(name) {
    const ctx = audioCtx();
    if (!ctx || ctx.state !== 'running') return;
    if (!enabled) name = null;
    if (!current || current.name !== name) {
      stopCurrent(ctx);
      if (!name || !SONGS[name]) return;
      const data = compiled[name] || (compiled[name] = compile(SONGS[name]));
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + 0.8);
      gain.connect(ctx.destination);
      current = { name, gain, step: 0, next: ctx.currentTime + 0.1, data };
    }
    const c = current, song = SONGS[c.name];
    // Zu weit zurück (Tab war im Hintergrund)? Dann neu einsetzen statt nachzuholen.
    if (c.next < ctx.currentTime - 0.25) c.next = ctx.currentTime + 0.05;
    while (c.next < ctx.currentTime + 0.18) {
      for (const e of c.data.ev[c.step]) {
        if (e.v === 'k' || e.v === 's' || e.v === 'h') playDrum(ctx, c.gain, e.v, c.next);
        else playTone(ctx, c.gain, song, e, c.next, c.data.stepDur);
      }
      c.step = (c.step + 1) % c.data.steps;
      c.next += c.data.stepDur;
    }
  },
};

export default Music;

// Für Tests/Vorschau: ein Stück ohne Lautsprecher in einen AudioBuffer rendern
export async function renderSong(name, seconds = 20, rate = 22050) {
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * rate), rate);
  const data = compile(SONGS[name]);
  let t = 0.05, step = 0;
  while (t < seconds) {
    for (const e of data.ev[step]) {
      if (e.v === 'k' || e.v === 's' || e.v === 'h') playDrum(ctx, ctx.destination, e.v, t);
      else playTone(ctx, ctx.destination, SONGS[name], e, t, data.stepDur);
    }
    step = (step + 1) % data.steps;
    t += data.stepDur;
  }
  for (const k of Object.keys(waves)) delete waves[k]; // PeriodicWaves gehören zum jeweiligen Kontext
  noiseBuf = null;
  return ctx.startRendering();
}
