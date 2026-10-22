// Spielstand im Browser speichern (localStorage). Klappt das nicht (privates Fenster,
// gesperrte Cookies), läuft das Spiel trotzdem – nur ohne Speichern.

const KEY = 'theos-save-v1';

export function saveGame(game) {
  const L = game.party[0];
  const data = {
    v: 1,
    mapId: game.mapId, x: L.x, y: L.y, dir: L.dir,
    party: game.party.map((m) => m.id),
    stats: game.stats, step: game.step, owned: game.owned,
    diamonds: game.diamonds, ammo: game.ammo, hasCloak: game.hasCloak,
    cave: game.cave, haunt: game.haunt, quizStats: game.quizStats, quizIntro: game.quizIntro,
    seenHints: game.seenHints, checkpoint: game.checkpoint,
    bushes: game.bushes, treasures: game.treasures, kills: game.kills,
  };
  try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch { return false; }
}

export function loadGame() {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return null;
    const d = JSON.parse(s);
    return d && d.v === 1 ? d : null;
  } catch { return null; }
}

export function hasSave() { return !!loadGame(); }
