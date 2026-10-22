// Bewohner von Lindental, Gefährten und alle Dialoge von Kapitel 1.
//
// game.step:
//   0 Felix finden            1 Kastanienprobe läuft     2 Felix dabei – Arne abholen
//   3 Arne dabei – Mama fragen 4 Tarnumhang suchen        5 Umhang gefunden – zu Mama
//   6 Friedrich dabei – zum Torhebel schleichen            7 Tor offen – ab nach Norden (Höhle)
//
// Alle vier Spezialfähigkeiten müssen im Laden gekauft werden (Diamanten gibt's in der Schule).

const T = 16;

export const HEROES = {
  theo:      { name: 'Theo', ability: 'Schild' },
  felix:     { name: 'Felix', ability: 'Stärke' },
  arne:      { name: 'Arne', ability: 'Graben' },
  friedrich: { name: 'Friedrich', ability: 'Unsichtbar' },
};

export function createNPCs() {
  return [
    { id: 'felix', pal: 'felix', x: 6 * T, y: 9 * T, dir: 0 },
    { id: 'mama', pal: 'mama', x: 11 * T + 2, y: 9 * T, dir: 0 },
    { id: 'friedrich', pal: 'friedrich', x: 8 * T + 6, y: 9 * T + 4, dir: 0 },
    { id: 'lotte', pal: 'merchant', x: 20 * T + 8, y: 150, dir: 0 },
    { id: 'konrad', pal: 'guard', x: 14 * T, y: 3 * T, dir: 0, spear: true },
  ].map((n) => ({ anim: 0, moving: false, ...n }));
}

const STEP_HINT = [
  'Quest: Überzeuge Felix',
  'Quest: Halte 5 Kastanien auf',
  'Quest: Hol Arne ab',
  'Quest: Frag Mama wegen Friedrich',
  'Quest: Hol den Tarnumhang',
  'Quest: Bring Mama den Umhang',
  'Quest: Unsichtbar zum Torhebel',
  'Ziel: Die Höhle im Buttenberg (Norden)',
];
// Welche gekaufte Fähigkeit braucht der aktuelle Schritt?
const STEP_NEEDS = { 0: 'shield', 1: 'shield', 2: 'strength', 4: 'dig', 6: 'invis' };
export const ABILITY_NAME = { shield: 'Theos Schutzschild', strength: 'Felix\' Superstärke', dig: 'Arnes Grabkraft', invis: 'Friedrichs Tarnzauber' };

export function questHint(game) {
  if (game.mapId === 'haunted') return hauntHint(game);
  if (game.mapId === 'cave' || game.step >= 7 && game.mapId !== 'village') return caveHint(game);
  const need = STEP_NEEDS[game.step];
  if (need && !game.owned[need]) return `Quest: Kauf ${ABILITY_NAME[need]}`;
  return STEP_HINT[game.step];
}

function hauntHint(game) {
  const h = game.haunt;
  if (!h.gate) return 'Quest: Rechenrätsel der Hexe';
  if (!h.front) return 'Quest: Gespenst Bodo an der Haustür';
  if (!h.count) return 'Quest: Zähl-Rätsel in der Halle';
  if (!h.chest) return game.owned.strength ? 'Quest: Schiebt die Truhe (Felix)' : `Quest: Kauf ${ABILITY_NAME.strength}`;
  if (!h.lib) return 'Quest: Englisch bei Prof. Plumps';
  if (!h.candles) return `Quest: Zeig die ${h.target} mit den Kerzen`;
  if (!h.king) return 'Quest: Rätsel von Graf Kürbis';
  if (!h.door6) return 'Quest: Öffnet die Turmtür';
  return 'Ziel: Treppe zur Drachenhöhle';
}

function caveHint(game) {
  const c = game.cave, o = game.owned;
  const need = (id, text) => (o[id] ? text : `Quest: Kauf ${ABILITY_NAME[id]}`);
  if (!c.dug) return need('dig', 'Quest: Grabt euch durch (Arne)');
  if (!c.boulder) return need('strength', 'Quest: Schiebt den Felsblock (Felix)');
  if (!c.key) return 'Quest: Findet den Schlüssel';
  if (!c.door) return 'Quest: Öffnet die Schlosstür';
  if (!c.statue) return 'Quest: Besiegt die Statue (Theo)';
  if (!c.troll) return need('invis', 'Quest: Vorbei am Troll (Friedrich)');
  if (!c.lever) return 'Quest: Legt den Hebel um';
  return 'Ziel: Die Treppe in die Tiefe';
}

// Liefert { lines, after } – after() läuft, wenn der Dialog geschlossen wird.
export function talkTo(n, game, fx) {
  const s = game.step;
  switch (n.id) {
    case 'felix':
      if (s === 0 && !game.owned.shield) return { lines: [
        'Theo: Felix! Kommst du mit zum Buttenberg? Wir besiegen den bösen Drachen!',
        'Felix: Den Drachen?! Da brauchst du Mut – und einen Schild! Du hast ja nicht mal einen.',
        'Felix: Bruno im Laden verkauft welche. Für Diamanten. Die gibt\'s in der Schule fürs Lernen.',
      ] };
      if (s === 0) return {
        lines: [
          'Theo: Felix! Kommst du mit zum Buttenberg? Wir besiegen den bösen Drachen!',
          'Felix: Den Drachen?! Hm... nur wenn du wirklich mutig bist.',
          'Felix: Ich werfe Kastanien nach dir. Halte 5 Stück mit deinem Schutzschild auf!',
          'Wähle Theo als Anführer und drück B, um den Schild hochzuhalten – genau dann, wenn eine Kastanie kommt!',
        ],
        after() { game.step = 1; fx.startChallenge(); },
      };
      if (game.challenge.active) return { lines: ['Felix: Konzentrier dich! Schild hoch mit B!'] };
      return {
        lines: ['Felix: Nochmal? Okay – fünf Kastanien. Los geht\'s!'],
        after() { fx.startChallenge(); },
      };

    case 'mama':
      if (s < 3) return { lines: [
        'Mama: Theo! Was hast du denn heute vor?',
        'Theo: Ein Abenteuer! Aber zuerst brauche ich meine Freunde.',
        'Mama: Na dann. Und vergiss die Schule nicht – Frau Klug hat heute Extra-Aufgaben!',
      ] };
      if (s === 3 && !game.hasCloak) return {
        lines: [
          'Theo: Mama, darf Friedrich mitkommen? Wir gehen zum Buttenberg!',
          'Mama: Zum Buttenberg? Nur wenn ihr zusammenbleibt – und Friedrich seinen Tarnumhang mitnimmt.',
          'Mama: Aber der ist gestern über den Zaun in Oma Hildes Garten geweht. Und Oma Hilde ist verreist...',
        ],
        after() { game.step = 4; fx.banner('NEUE QUEST', 'Hol den Tarnumhang aus dem Garten', '#88e0ff'); },
      };
      if (s === 4) return { lines: ['Mama: Oma Hildes Garten ist im Südwesten. Das Gartentor ist leider abgeschlossen.'] };
      if (s === 5 || (s === 3 && game.hasCloak)) return {
        lines: [
          'Theo: Hier ist Friedrichs Tarnumhang!',
          'Mama: Prima. Dann darf Friedrich mit. Passt gut auf ihn auf!',
          'Friedrich: JAAA! Mit dem Umhang kann ich mich unsichtbar machen!',
        ],
        after() {
          fx.join('friedrich');
          game.step = 6;
          fx.sfx.item();
          fx.banner('FRIEDRICH IST DABEI', 'B: unsichtbar werden', '#a8f070');
          fx.gainXP(15, n.x + 8, n.y);
        },
      };
      return { lines: ['Mama: Und denkt an eure Jacken!'] };

    case 'friedrich':
      if (s < 3) return { lines: [
        'Friedrich: Theo, ich will auch mit! Bitte, bitte, bitte!',
        'Theo: Erst brauche ich Felix und Arne. Dann sehen wir weiter.',
      ] };
      return { lines: ['Friedrich: Frag Mama! Ich hab schon meine Schuhe an!'] };

    case 'lotte': {
      if (!game.owned.shield) return { lines: [
        'Lotte: Diamanten? Die verdienst du bei Frau Klug in der Schule – im Süden, das Haus mit dem Buch.',
        'Lotte: Und gleich daneben ist Brunos Laden. Da gibt es Schilde, Zaubertränke und noch viel mehr!',
      ] };
      const tips = [
        'Lotte: Felix? Der übt gerade Kastanien-Weitwurf vor seinem Haus.',
        'Lotte: Felix? Der übt gerade Kastanien-Weitwurf vor seinem Haus.',
        'Lotte: Arne sitzt fest – seit dem Sturm liegt ein Felsbrocken vor seiner Tür! Wer stark ist, schiebt ihn zur Seite.',
        'Lotte: Deine Mama hat vorhin nach Friedrich gerufen.',
        'Lotte: Oma Hildes Garten? Die Erde unter dem Zaun ist ganz locker...',
        'Lotte: Ein Tarnumhang? Na, dann schnell zu deiner Mama!',
        'Lotte: Konrad lässt niemanden durch. Aber wen er nicht sieht, den hält er auch nicht auf...',
        'Lotte: Viel Glück im Buttenberg! Brunos Schleuder soll gegen Schleime super helfen.',
      ];
      return { lines: [tips[s]] };
    }

    case 'teacher':
      return { lines: game.quizIntro ? ['Frau Klug: Schön, dass du wieder da bist! Welches Fach?'] : [
        'Frau Klug: Hallo Theo! Du willst Diamanten verdienen? Dann zeig mal, was du kannst.',
        'Frau Klug: Für jede richtige Antwort gibt es einen Diamanten. Fünf richtige in Folge geben 2 extra!',
      ], after() { game.quizIntro = true; fx.openQuiz(); } };

    case 'bruno':
      return { lines: ['Händler Bruno: Willkommen in Brunos Wunderladen! Was darf\'s sein?'], after() { fx.openShop(); } };

    // --- Kapitel 3: Spukhaus ---
    case 'witch':
      if (game.haunt.gate) return { lines: ['Hexe Kunigunde: Hihihi! Das Tor ist offen. Und rechnen kannst du auch!'] };
      return { lines: [
        'Hexe Kunigunde: Hihihi! Wer ins Spukhaus will, muss erst an meinem Tor vorbei.',
        'Hexe Kunigunde: Ich verteile gern Süßes – aber gerecht! Löse zwei Teil-Aufgaben, dann geht das Tor auf.',
        'Tipp: Rechne schriftlich auf einem Zettel mit!',
      ], after() { fx.openRiddle('gate'); } };

    case 'bodo':
      if (game.haunt.front) return { lines: ['Gespenst Bodo: Boooohh! Ach, ihr seid es. Viel Spaß im Haus!'] };
      return { lines: [
        'Gespenst Bodo: Boooohh! Trick or treat? Hier kommt nur rein, wer Englisch kann!',
        'Gespenst Bodo: Answer two questions about Halloween!',
      ], after() { fx.openRiddle('front'); } };

    case 'zora':
      if (game.haunt.count) return { lines: ['Gespenst Zora: Gut gezählt! Ich zähle jetzt Schafe ... huaaah.'] };
      return { lines: [
        'Gespenst Zora: Ich bin Zora, das Zählgespenst. Hast du dir die Halle genau angesehen?',
        'Gespenst Zora: Kürbisse, Kerzen, Fledermäuse, Spinnen ... Zähl gut nach, bevor du antwortest!',
      ], after() { fx.openRiddle('count'); } };

    case 'plumps':
      if (game.haunt.lib) return { lines: ['Professor Plumps: Very good! Ihr kennt euer Englischbuch.'] };
      return { lines: [
        'Professor Plumps: Ah, Besuch in meiner Bibliothek! Ich bin Professor Plumps.',
        'Professor Plumps: Die Tür zum Kerzenraum öffnet sich nur für Kinder, die ihr Englischbuch kennen. Three questions!',
      ], after() { fx.openRiddle('lib'); } };

    case 'bit':
      if (game.haunt.candles) return { lines: ['Bit: Super! Ihr könnt Binärcode. Willst du nochmal üben?'], after() { fx.openRiddle('bit'); } };
      return { lines: [
        'Bit: Hallo! Ich bin Bit, das Computer-Gespenst. Computer zählen nur mit 0 und 1.',
        'Bit: Jede Kerze hat einen Wert: 16, 8, 4, 2, 1. Brennt sie, zählt der Wert (= 1). Ist sie aus, zählt er nicht (= 0).',
        'Bit: Beispiel: 13 = 8 + 4 + 1. Also Kerzen: aus, an, an, aus, an. Binär: 01101.',
        `Bit: Auf der Tür steht ${game.haunt.target}. Zünde die richtigen Kerzen an – drück A vor einer Kerze!`,
        'Bit: Willst du vorher üben? Drei Übungsfragen bringen Diamanten.',
      ], after() { fx.openRiddle('bit'); } };

    case 'graf':
      if (game.haunt.king) return { lines: ['Graf Kürbis: Der Mondschlüssel öffnet die Turmtür. Viel Glück beim Drachen!'] };
      return { lines: [
        'Graf Kürbis: Wer wagt es, meinen Thronsaal zu betreten?!',
        'Theo: Wir wollen zum Drachen. Bitte lass uns durch!',
        'Graf Kürbis: Hohoho! Nur mit meinem Mondschlüssel. Den bekommt, wer meine drei Rätsel löst!',
      ], after() { fx.openRiddle('king'); } };

    case 'troll':
      if (game.cave.troll) return { lines: ['Troll: Hä? Wo kommt ihr denn her?!'] };
      return { lines: ['Troll: GRRR! Hier kommt keiner durch, den ich sehe!'] };

    case 'konrad':
      if (game.world.gateOpen) return { lines: ['Wache Konrad: Vier kleine Helden... Passt bloß auf euch auf am Buttenberg!'] };
      return { lines: [
        'Wache Konrad: Halt! Zum Buttenberg lasse ich keine Kinder durch.',
        'Wache Konrad: Da oben wohnt ein Drache! Das Tor bleibt zu.',
      ] };
  }
  return { lines: ['...'] };
}

export function arneDoor(game, fx) {
  return {
    lines: [
      '*klopf klopf*',
      'Arne: Endlich! Seit dem Sturm lag der Fels vor meiner Tür. Danke, Felix!',
      'Theo: Kommst du mit zum Buttenberg? Wir besiegen den Drachen!',
      'Arne: Klar! Und wenn wir irgendwo nicht weiterkommen – ich buddel uns einfach ein Loch.',
    ],
    after() {
      fx.join('arne');
      game.step = 3;
      fx.sfx.item();
      fx.banner('ARNE IST DABEI', 'B: Löcher buddeln', '#a8f070');
      fx.gainXP(15);
    },
  };
}

export const LEVER_DIALOG = [
  '*Knarz!* Friedrich zieht am Hebel. Das Tor geht auf!',
  'Wache Konrad: Huch?! Wer hat denn das Tor geöffnet?!',
  'Theo: Wir! Wir sind zu viert und wir haben einen Plan.',
  'Wache Konrad: ...Na gut, ihr kleinen Helden. Aber passt auf euch auf!',
];
