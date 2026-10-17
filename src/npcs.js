// Dorfbewohner von Lindental und ihre Dialoge.
// quest: 0 = noch nicht angenommen, 1 = Flocke suchen, 2 = Flocke folgt dir, 3 = erledigt

const T = 16;

export function createNPCs() {
  return [
    { id: 'hilde', pal: 'elder', x: 6 * T, y: 9 * T, dir: 0 },
    { id: 'lotte', pal: 'merchant', x: 20 * T + 8, y: 150, dir: 0 },
    { id: 'tim', pal: 'kid', x: 18 * T, y: 14 * T, dir: 0, wander: { x0: 12 * T, y0: 9 * T, x1: 19 * T, y1: 15 * T }, t: 1 },
    { id: 'konrad', pal: 'guard', x: 14 * T, y: 3 * T, dir: 0, spear: true },
  ].map((n) => ({ anim: 0, moving: false, ...n }));
}

// Liefert { lines, after } – after() läuft, wenn der Dialog geschlossen wird.
export function talkTo(n, game, fx) {
  const q = game.quest;
  switch (n.id) {
    case 'hilde':
      if (q === 0) return {
        lines: [
          'Oma Hilde: Ach, wie gut, dass du kommst!',
          'Meine Katze Flocke ist schon wieder ausgebüxt.',
          'Sie versteckt sich gern im Garten im Südwesten, hinter den Büschen.',
          'Bringst du sie mir zurück? Dann rede ich mit Konrad am Tor.',
        ],
        after() {
          game.quest = 1;
          fx.sfx.confirm();
          fx.banner('NEUE QUEST', 'Finde Flocke, die Katze', '#88e0ff');
        },
      };
      if (q === 1) return { lines: [
        'Oma Hilde: Schau mal im Garten im Südwesten nach.',
        'Die Büsche davor kannst du mit deinem Stock wegschlagen.',
      ] };
      if (q === 2) return {
        lines: [
          'Oma Hilde: Flocke! Da bist du ja, du kleine Ausreißerin!',
          'Danke dir! Ich sage Konrad sofort Bescheid.',
          'Das Tor zum Flüsterwald steht dir jetzt offen.',
        ],
        after() {
          game.quest = 3;
          fx.returnCat();
          fx.openGate();
          fx.sfx.item();
          fx.banner('QUEST ERFÜLLT', 'Das Tor im Norden ist offen', '#a8f070');
          fx.gainXP(25, n.x + 8, n.y);
        },
      };
      return { lines: ['Oma Hilde: Pass gut auf dich auf da draußen im Flüsterwald!'] };

    case 'lotte':
      if (q === 1) return { lines: [
        'Lotte: Eine weiße Katze? Die ist vorhin Richtung Garten geflitzt.',
        'Ganz im Südwesten, hinter dem Zaun.',
      ] };
      return { lines: [
        'Lotte: Frische Äpfel! Süßes Brot!',
        'Leider hat der Händlerkarren aus der Stadt noch nicht geliefert. Komm später wieder!',
      ] };

    case 'tim':
      if (q === 3) return { lines: ['Tim: Du darfst in den Flüsterwald?! Wow... nimm mich nächstes Mal mit!'] };
      return { lines: [
        'Tim: Hey! Wusstest du, dass man Büsche mit dem Stock umhauen kann?',
        'Drück B (oder J / X). Das gibt sogar Erfahrung!',
      ] };

    case 'konrad':
      if (game.world.gateOpen) return { lines: [
        'Wache Konrad: Oma Hilde hat sich für dich verbürgt. Das Tor ist offen.',
        'Viel Glück, Abenteurer!',
      ] };
      return { lines: [
        'Wache Konrad: Halt! Hinter dem Tor liegt der Flüsterwald.',
        'Dort ist es zu gefährlich für Anfänger. Hilf erst den Leuten im Dorf!',
      ] };
  }
  return { lines: ['...'] };
}

export function catDialog(game, fx) {
  if (game.quest === 1) return {
    lines: ['Miau! Das muss Flocke sein!', 'Flocke folgt dir jetzt.'],
    after() {
      game.quest = 2;
      game.cat.follow = true;
      fx.sfx.item();
      fx.banner('FLOCKE GEFUNDEN', 'Bring sie zu Oma Hilde', '#88e0ff');
    },
  };
  return { lines: ['Miau! Eine weiße Katze. Am Halsband steht "Flocke".'] };
}
