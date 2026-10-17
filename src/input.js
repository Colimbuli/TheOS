// Eingabe: Tastatur, Touch (Steuerkreuz + A/B) und Gamepad werden zusammengeführt.
// Logische Tasten: up, down, left, right, a (reden/bestätigen), b (schlagen).

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'a', Enter: 'a', KeyE: 'a',
  KeyJ: 'b', KeyK: 'b', KeyX: 'b',
  KeyQ: 'swap', Tab: 'swap',
};

const kb = {};
const tc = {};
const latched = {}; // kurze Drücke merken, auch wenn sie zwischen zwei Frames wieder losgelassen werden
let prevA = false, prevB = false, prevS = false;
let onGesture = () => {};

// Rohdaten für die Ego-Perspektive (Kapitel 2): einzelne Tasten, Maus, Gamepad-Achsen, Touch-Wischen
export const raw = {
  keys: new Set(),        // gedrückt gehaltene Tasten (e.code)
  pressedKeys: new Set(), // in diesem Frame neu gedrückt
  mouseDX: 0, mouseL: false, mouseLPressed: false, wheel: 0,
  axes: [0, 0, 0, 0], buttons: [], prevButtons: [],
  touch: tc, touchTurn: 0,
};

export const input = {
  dir: { x: 0, y: 0 },
  a: false, b: false,
  aPressed: false, bPressed: false, swapPressed: false,
  device: 'keyboard',
};

export function isTouch() {
  return document.body.classList.contains('touch');
}

export function initInput(gestureCallback) {
  onGesture = gestureCallback || onGesture;
  addEventListener('keydown', (e) => {
    raw.keys.add(e.code);
    if (!e.repeat) raw.pressedKeys.add(e.code);
    if (/^Digit[1-4]$/.test(e.code) || e.code === 'ControlLeft') e.preventDefault();
    const k = KEYMAP[e.code];
    if (!k) return;
    e.preventDefault();
    if (!e.repeat) latched[k] = true;
    kb[k] = true;
    input.device = 'keyboard';
    onGesture();
  });
  addEventListener('keyup', (e) => {
    raw.keys.delete(e.code);
    const k = KEYMAP[e.code];
    if (k) { kb[k] = false; e.preventDefault(); }
  });
  addEventListener('blur', () => { for (const k in kb) kb[k] = false; raw.keys.clear(); raw.mouseL = false; });

  // Maus: Drehen nur mit Pointer Lock, Linksklick = Aktion
  addEventListener('mousemove', (e) => { if (document.pointerLockElement) raw.mouseDX += e.movementX; });
  addEventListener('mousedown', (e) => { if (e.button === 0) { raw.mouseL = true; raw.mouseLPressed = true; } });
  addEventListener('mouseup', (e) => { if (e.button === 0) raw.mouseL = false; });
  addEventListener('wheel', (e) => { raw.wheel += Math.sign(e.deltaY); }, { passive: true });

  // Touch: Wischen über das Bild dreht die Ansicht
  const screen = document.getElementById('screen');
  const lastX = new Map();
  screen.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') lastX.set(e.pointerId, e.clientX); });
  screen.addEventListener('pointermove', (e) => {
    if (!lastX.has(e.pointerId)) return;
    raw.touchTurn += e.clientX - lastX.get(e.pointerId);
    lastX.set(e.pointerId, e.clientX);
  });
  const endTouch = (e) => lastX.delete(e.pointerId);
  screen.addEventListener('pointerup', endTouch);
  screen.addEventListener('pointercancel', endTouch);

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

  for (const [id, k] of [['btnA', 'a'], ['btnB', 'b'], ['btnS', 'swap']]) {
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
  raw.axes = [0, 0, 0, 0];
  raw.buttons = [];
  for (const p of pads) {
    if (!p) continue;
    if (!raw.buttons.length) {
      raw.axes = [0, 1, 2, 3].map((i) => { const v = p.axes[i] || 0; return Math.abs(v) < 0.18 ? 0 : v; });
      raw.buttons = p.buttons.map((bt) => !!(bt && bt.pressed));
    }
    const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    if (ay < -0.5 || b(12)) gp.up = true;
    if (ay > 0.5 || b(13)) gp.down = true;
    if (ax < -0.5 || b(14)) gp.left = true;
    if (ax > 0.5 || b(15)) gp.right = true;
    if (b(0) || b(9)) gp.a = true;     // unten (A/Kreuz) oder Start
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
  latched.a = latched.b = latched.swap = false;
  if (input.aPressed || input.bPressed) onGesture();
  prevA = input.a;
  prevB = input.b;
}

// Am Ende jedes Frames aufrufen: setzt die Pro-Frame-Werte zurück.
export function endFrame() {
  raw.pressedKeys.clear();
  raw.mouseDX = 0;
  raw.mouseLPressed = false;
  raw.wheel = 0;
  raw.touchTurn = 0;
  raw.prevButtons = raw.buttons.slice();
}
