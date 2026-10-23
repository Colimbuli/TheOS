// Eingabe: Tastatur, Touch (Steuerkreuz + A/B) und Gamepad werden zusammengeführt.
// Logische Tasten: up, down, left, right, a (reden/bestätigen), b (schlagen).

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'a', Enter: 'a', KeyE: 'a',
  KeyJ: 'b', KeyK: 'b', KeyX: 'b',
  KeyQ: 'swap', Tab: 'swap',
  Escape: 'menu', KeyP: 'menu',
};

const kb = {};
const tc = {};
const latched = {}; // kurze Drücke merken, auch wenn sie zwischen zwei Frames wieder losgelassen werden
let prevA = false, prevB = false, prevS = false, prevM = false;
let onGesture = () => {};

export const input = {
  dir: { x: 0, y: 0 },
  a: false, b: false,
  aPressed: false, bPressed: false, swapPressed: false, menuPressed: false,
  tapY: 0, // kurzer Tipp hoch/runter (für Menüs), auch wenn zwischen zwei Frames losgelassen
  device: 'keyboard',
};

export function isTouch() {
  return document.body.classList.contains('touch');
}

export function initInput(gestureCallback) {
  onGesture = gestureCallback || onGesture;
  addEventListener('keydown', (e) => {
    const k = KEYMAP[e.code];
    if (!k) return;
    e.preventDefault();
    if (!e.repeat) latched[k] = true;
    kb[k] = true;
    input.device = 'keyboard';
    onGesture();
  });
  addEventListener('keyup', (e) => {
    const k = KEYMAP[e.code];
    if (k) { kb[k] = false; e.preventDefault(); }
  });
  addEventListener('blur', () => { for (const k in kb) kb[k] = false; });
  setupTouch();
}

function setupTouch() {
  const enable = () => {
    if (isTouch()) return;
    document.body.classList.add('touch');
    dispatchEvent(new Event('resize'));
  };
  if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
  addEventListener('touchstart', enable, { passive: true });

  const dpad = document.getElementById('dpad');
  const clear = () => { tc.up = tc.down = tc.left = tc.right = false; };
  const setDir = (e) => {
    const r = dpad.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const dead = r.width * 0.12;
    clear();
    if (Math.hypot(dx, dy) < dead) return;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax > ay * 0.5) { tc.left = dx < 0; tc.right = dx > 0; }
    if (ay > ax * 0.5) { tc.up = dy < 0; tc.down = dy > 0; }
  };
  dpad.addEventListener('pointerdown', (e) => {
    dpad.setPointerCapture(e.pointerId);
    setDir(e); input.device = 'touch'; onGesture(); e.preventDefault();
  });
  dpad.addEventListener('pointermove', (e) => { if (dpad.hasPointerCapture(e.pointerId)) setDir(e); });
  dpad.addEventListener('pointerup', clear);
  dpad.addEventListener('pointercancel', clear);

  for (const [id, k] of [['btnA', 'a'], ['btnB', 'b'], ['btnS', 'swap'], ['btnM', 'menu']]) {
    const el = document.getElementById(id);
    const up = () => { tc[k] = false; el.classList.remove('on'); };
    el.addEventListener('pointerdown', (e) => {
      tc[k] = true; latched[k] = true; el.classList.add('on'); input.device = 'touch'; onGesture(); e.preventDefault();
    });
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  }
}

function readGamepads() {
  const gp = {};
  let pads = [];
  try { pads = navigator.getGamepads ? navigator.getGamepads() : []; } catch { return gp; } // im iframe evtl. gesperrt
  for (const p of pads) {
    if (!p) continue;
    const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    if (ay < -0.5 || b(12)) gp.up = true;
    if (ay > 0.5 || b(13)) gp.down = true;
    if (ax < -0.5 || b(14)) gp.left = true;
    if (ax > 0.5 || b(15)) gp.right = true;
    if (b(0)) gp.a = true;             // unten (A/Kreuz)
    if (b(9) || b(8)) gp.menu = true;  // Start / Select: Pause-Menü
    if (b(1) || b(2)) gp.b = true;     // rechts oder links (B/X)
    if (b(3) || b(4) || b(5)) gp.swap = true; // Y, L, R: Anführer wechseln
  }
  if (Object.keys(gp).length) input.device = 'gamepad';
  return gp;
}

export function pollInput() {
  const gp = readGamepads();
  const held = (k) => !!(kb[k] || tc[k] || gp[k]);
  input.dir.x = (held('right') ? 1 : 0) - (held('left') ? 1 : 0);
  input.dir.y = (held('down') ? 1 : 0) - (held('up') ? 1 : 0);
  input.a = held('a');
  input.b = held('b');
  input.aPressed = (input.a && !prevA) || !!latched.a;
  input.bPressed = (input.b && !prevB) || !!latched.b;
  const swap = held('swap');
  input.swapPressed = (swap && !prevS) || !!latched.swap;
  prevS = swap;
  const menu = held('menu');
  input.menuPressed = (menu && !prevM) || !!latched.menu;
  prevM = menu;
  input.tapY = latched.up ? -1 : latched.down ? 1 : 0;
  latched.a = latched.b = latched.swap = latched.up = latched.down = latched.menu = false;
  if (input.aPressed || input.bPressed) onGesture();
  prevA = input.a;
  prevB = input.b;
}
