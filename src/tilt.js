// Perspektivische Kippansicht ("HD-2D-Diorama").
//
// Portiert von src/render/Tilt.lua aus:
//   Based on the Pokemon Gen 1 Recompilation Project by BOIS CLUB GAMES, LLC
//   (https://github.com/bryanthaboi/gen1recomp)
//   Copyright (C) 2026 BOIS CLUB GAMES, LLC – GNU GPL v3 mit Zusatzbedingungen,
//   siehe licenses/gen1recomp-LICENSE.md
//
// Original-Beschreibung: "a cycleable, purely presentational perspective tilt for the free-roam
// overworld. The flat world canvas is treated as a ground plane, rotated about the horizontal axis
// through the viewport centre and viewed through a perspective camera, so rows above centre
// recede/shrink and rows below come closer (the HD-2D 'diorama' look)."
// Wie im Original wirkt die Kippung nur auf das Zeichnen – Kollision, Bewegung und Auslöser
// bleiben unverändert.
//
// Änderungen für TheOS: JavaScript statt Lua; der Boden wird ohne Shader zeilenweise exakt
// projiziert (siehe warpGround), Standardstufe 35°, Einstellung im Browser gespeichert.

const Tilt = {
  // Kippwinkel in Grad (Index 0 = aus). Reihenfolge beim Durchschalten: aus → 15 → 35 → 50 → aus.
  ANGLES_DEG: [0, 15, 35, 50],
  ANGLE_LABELS: ['AUS', '15°', '35°', '50°'],
  level: 0,
  angle: 0,
  from: 0,
  goal: 0,
  t: 1,
  TWEEN_TIME: 0.25,
  FOCAL: 1.0,
  VIEW_MARGIN: 0.35,
};

const ease = (t) => t * t * (3 - 2 * t);
const rad = (deg) => (deg * Math.PI) / 180;
const goalFor = (level) => rad(Tilt.ANGLES_DEG[level] || 0);

Tilt.setLevel = function (level) {
  level = Math.max(0, Math.min(3, Math.floor(Number(level) || 0)));
  const goal = goalFor(level);
  if (goal !== Tilt.goal || level !== Tilt.level) {
    Tilt.from = Tilt.angle;
    Tilt.goal = goal;
    Tilt.t = 0;
  }
  Tilt.level = level;
};

// aus → 15 → 35 → 50 → aus. Liefert die neue Stufe.
Tilt.cycle = function () {
  Tilt.setLevel((Tilt.level + 1) % 4);
  return Tilt.level;
};

// Stufe sofort setzen (ohne Übergang), z. B. beim Laden der Einstellung
Tilt.applyLevel = function (level) {
  level = Math.max(0, Math.min(3, Math.floor(Number(level) || 0)));
  Tilt.level = level;
  Tilt.goal = goalFor(level);
  Tilt.from = Tilt.goal;
  Tilt.angle = Tilt.goal;
  Tilt.t = 1;
};

Tilt.levelLabel = (level = Tilt.level) => Tilt.ANGLE_LABELS[level] || 'AUS';

// Winkel weich von `from` nach `goal` überblenden
Tilt.update = function (dt) {
  if (Tilt.t < 1) {
    Tilt.t = Math.min(1, Tilt.t + dt / Tilt.TWEEN_TIME);
    Tilt.angle = Tilt.from + (Tilt.goal - Tilt.from) * ease(Tilt.t);
  } else Tilt.angle = Tilt.goal;
};

// true, solange gekippt ist oder noch überblendet wird
Tilt.active = () => Tilt.level > 0 || Tilt.angle > 0;

// Projektion eines Punkts der flachen Bodenfläche (cx, cy in einer Fläche der Größe vw × vh)
// auf den Bildschirm. Liefert [sx, sy, scale].
Tilt.groundPoint = function (cx, cy, vw, vh) {
  const a = Tilt.angle;
  if (a <= 0) return [cx, cy, 1];
  const u = cx - vw * 0.5;
  const w = cy - vh * 0.5;
  const d = Tilt.FOCAL * vh;
  const scale = d / (d - w * Math.sin(a));
  return [vw * 0.5 + u * scale, vh * 0.5 + w * Math.cos(a) * scale, scale];
};

// Um wie viel die flache Bodenfläche größer sein muss, damit die gekippte Ebene den
// ganzen Bildschirm füllt
Tilt.viewGrowth = function () {
  const a = Tilt.angle;
  if (a <= 0) return 1;
  const topScale = 1 / (1 + (0.5 * Math.sin(a)) / Tilt.FOCAL);
  const base = 1 / (Math.cos(a) * topScale);
  return base + Tilt.VIEW_MARGIN * (base - 1);
};

// --- Ergänzungen für Canvas 2D (TheOS) ----------------------------------------------

// Größe der flachen Bodenfläche (gerade Zahlen, wie im Original)
Tilt.groundSize = function (W, H) {
  const g = Tilt.viewGrowth();
  let gw = Math.ceil(W * g), gh = Math.ceil(H * g);
  if (gw % 2) gw++;
  if (gh % 2) gh++;
  return [gw, gh];
};

// Punkt im normalen Bildschirmraum (fx, fy – wie ohne Kippung) → gekippter Bildschirm.
// Liefert [x, y, scale].
Tilt.project = function (fx, fy, W, H) {
  const [gw, gh] = Tilt.groundSize(W, H);
  const ox = (gw - W) / 2, oy = (gh - H) / 2;
  const [sx, sy, s] = Tilt.groundPoint(fx + ox, fy + oy, gw, gh);
  return [sx - ox, sy - oy, s];
};

// Zeichnet die flache Bodenfläche `src` (Größe gw × gh) perspektivisch auf `g` (W × H).
// Statt eines Meshes mit Shader wird jede Bildschirmzeile exakt auf ihre Quellzeile
// zurückgerechnet (Umkehrung von groundPoint) – damit gibt es keine Verzerrungsnähte.
Tilt.warpGround = function (g, src, W, H) {
  const a = Tilt.angle;
  const gw = src.width, gh = src.height;
  const d = Tilt.FOCAL * gh;
  const sinA = Math.sin(a), cosA = Math.cos(a);
  const oy = (gh - H) / 2;
  for (let y = 0; y < H; y++) {
    const Y = y + 0.5 + oy - gh * 0.5;               // Abstand zur Mitte im gekippten Bild
    const w = (Y * d) / (d * cosA + Y * sinA);       // zugehörige Zeile der flachen Fläche
    const scale = d / (d - w * sinA);
    const srcY = Math.floor(gh * 0.5 + w);
    if (srcY < 0 || srcY >= gh) continue;
    const half = W / 2 / scale;
    g.drawImage(src, gw * 0.5 - half, srcY, half * 2, 1, 0, y, W, 1);
  }
};

// --- Einstellung merken (pro Browser) ------------------------------------------------

const KEY = 'theos-tilt';
Tilt.loadSetting = function (fallback = 2) {
  let lv = fallback;
  try { const v = localStorage.getItem(KEY); if (v !== null) lv = Number(v); } catch { /* egal */ }
  Tilt.applyLevel(lv);
};
Tilt.saveSetting = function () {
  try { localStorage.setItem(KEY, String(Tilt.level)); } catch { /* egal */ }
};

export default Tilt;
