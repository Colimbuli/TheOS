// Bewohner von Lindental, Gefährten und alle Dialoge von Kapitel 1.
//
// game.step:
//   0 Felix finden            1 Kastanienprobe läuft     2 Felix dabei – Arne abholen
//   3 Arne dabei – Mama fragen 4 Tarnumhang suchen        5 Umhang gefunden – zu Mama
//   6 Friedrich dabei – zum Torhebel schleichen            7 Tor offen – ab nach Norden

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

export const STEP_HINT = [
  'Quest: Überzeuge Felix',
  'Quest: Halte 5 Kastanien auf',
  'Quest: Hol Arne ab',
  'Quest: Frag Mama wegen Friedrich',
  'Quest: Hol den Tarnumhang',
  'Quest: Bring Mama den Umhang',
  'Quest: Unsichtbar zum Torhebel',
  'Ziel: Zum Buttenberg (Norden)',
];

// Liefert { lines, after } – after() läuft, wenn der Dialog geschlossen wird.
export function talkTo(n, game, fx) {
  const s = game.step;
  switch (n.id) {
    case 'felix':
      if (s === 0) return {
        lines: [
          'Theo: Felix! Kommst du mit zum Buttenberg? Wir besiegen den bösen Drachen!',
          'Felix: Den Drachen?! Hm... nur wenn du wirklich mutig bist.',
          'Felix: Ich werfe Kastanien nach dir. Halte 5 Stück mit deinem Schutzschild auf!',
          'Drück B, um den Schild zu bauen – genau dann, wenn eine Kastanie kommt!',
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
        'Mama: Na dann. Zum Abendessen bist du zurück!',
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
      const tips = [
        'Lotte: Felix? Der übt gerade Kastanien-Weitwurf vor seinem Haus.',
        'Lotte: Felix? Der übt gerade Kastanien-Weitwurf vor seinem Haus.',
        'Lotte: Arne sitzt fest – seit dem Sturm liegt ein Felsbrocken vor seiner Tür! Wer stark ist, schiebt ihn zur Seite.',
        'Lotte: Deine Mama hat vorhin nach Friedrich gerufen.',
        'Lotte: Oma Hildes Garten? Die Erde unter dem Zaun ist ganz locker...',
        'Lotte: Ein Tarnumhang? Na, dann schnell zu deiner Mama!',
        'Lotte: Konrad lässt niemanden durch. Aber wen er nicht sieht, den hält er auch nicht auf...',
        'Lotte: Viel Glück gegen den Drachen! Ich halte euch frische Äpfel bereit.',
      ];
      return { lines: [tips[s]] };
    }

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
