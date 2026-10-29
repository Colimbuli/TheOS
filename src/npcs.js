// Bewohner von Lindental, Gefährten und alle Dialoge von Kapitel 1.
//
// Die Startfigur ist frei wählbar (game.starter). Die anderen drei müssen überzeugt werden:
//   Felix     – Kastanienprobe (5 Kastanien überstehen: ausweichen oder Schild)
//   Ferdinand      – Felsbrocken vor seiner Tür wegschieben (Felix' Superstärke)
//   Friedrich – Mama erlaubt es nur mit Tarnumhang (liegt in Oma Hildes Garten, Ferdinand gräbt)
//   Theo      – spielt Verstecken (Busch im Nordosten), dann seine Drachenprüfung (3 Schulfragen)
//   Lino      – steckt mit seinen Spaghetti-Beinen im Matsch am Brunnen fest, Ferdinand gräbt ihn frei
// Ist Friedrich die Startfigur, braucht er trotzdem Mamas Erlaubnis.
// game.rec: wer dabei ist · game.mama: 0 nicht gefragt, 1 Umhang gesucht, 2 erlaubt
// game.step: 0 Kapitel 1 läuft, 7 Tor offen
//
// Alle vier Spezialfähigkeiten müssen im Laden gekauft werden (Diamanten gibt's in der Schule).

const T = 16;

export const HEROES = {
  theo:      { name: 'Theo', ability: 'Schild' },
  felix:     { name: 'Felix', ability: 'Stärke' },
  ferdinand:      { name: 'Ferdinand', ability: 'Graben' },
  friedrich: { name: 'Friedrich', ability: 'Unsichtbar' },
  lino:      { name: 'Lino', ability: 'Spaghetti-Beine' },
  jelly:     { name: 'Jelly', ability: 'Sprinten & Springen' },
};
export const STARTERS = ['theo', 'felix', 'ferdinand', 'friedrich', 'lino'];

// Wo die Figuren im Dorf stehen (die Startfigur beginnt dort)
export const HOME = {
  theo: { x: 10 * T, y: 8 * T, dir: 0 },
  felix: { x: 6 * T, y: 9 * T, dir: 0 },
  ferdinand: { x: 24 * T, y: 10 * T, dir: 0 },
  friedrich: { x: 8 * T + 6, y: 9 * T + 4, dir: 0 },
  lino: { x: 17 * T, y: 12 * T, dir: 0 },
};
export const THEO_BUSH = { x: 28, y: 6 };

export function createNPCs(starter = 'theo') {
  return [
    { id: 'felix', pal: 'felix', ...HOME.felix },
    { id: 'mama', pal: 'mama', x: 11 * T + 2, y: 9 * T, dir: 0 },
    { id: 'friedrich', pal: 'friedrich', ...HOME.friedrich },
    { id: 'lino', pal: 'lino', ...HOME.lino, stuck: true },
    { id: 'lotte', pal: 'merchant', x: 20 * T + 8, y: 150, dir: 0 },
    { id: 'konrad', pal: 'guard', x: 14 * T, y: 3 * T, dir: 0, spear: true },
  ].filter((n) => n.id !== starter).map((n) => ({ anim: 0, moving: false, ...n }));
}

// Theo springt aus seinem Versteck
export function theoNPC() {
  return { id: 'theo', pal: 'theo', x: (THEO_BUSH.x - 1) * T, y: THEO_BUSH.y * T, dir: 3, anim: 0, moving: false };
}

export const ABILITY_NAME = { shield: 'Theos Schutzschild', strength: 'Felix\' Superstärke', dig: 'Ferdinands Grabkraft', invis: 'Friedrichs Tarnzauber', legs: 'Linos Spaghetti-Beine' };

const lead = (game) => HEROES[game.party[0].id].name;
const starterName = (game) => HEROES[game.starter || 'theo'].name;
const momName = (game) => (['theo', 'friedrich'].includes(game.starter || 'theo') ? 'Mama' : 'Theos Mama');
export const allHeroes = (game) => STARTERS.every((id) => game.party.some((m) => m.id === id));

// Nächstes Ziel in Kapitel 1 (für Hinweiszeile und Lotte)
export function villageGoal(game) {
  const r = game.rec, o = game.owned, has = (id) => game.party.some((m) => m.id === id);
  const buy = (id) => `Quest: Kauf ${ABILITY_NAME[id]}`;
  if (!r.felix) return game.challenge.active ? 'Quest: Überstehe 5 Kastanien' : 'Quest: Überzeuge Felix';
  if (!r.theo) return game.theoFound ? 'Quest: Theos Drachenprüfung' : 'Quest: Finde Theo – er spielt Verstecken';
  if (!r.ferdinand) return !has('felix') ? 'Quest: Überzeuge Felix' : o.strength ? 'Quest: Befreit Ferdinand (Fels vor der Tür)' : buy('strength');
  if (!r.lino) return o.dig ? 'Quest: Grabt Lino am Brunnen frei (Ferdinand)' : buy('dig');
  if (game.mama < 2) {
    if (game.mama === 0 && !game.hasCloak) return game.starter === 'friedrich' ? 'Quest: Frag Mama, ob du mitdarfst' : 'Quest: Frag Mama wegen Friedrich';
    if (!game.hasCloak) return o.dig ? 'Quest: Hol den Tarnumhang (Garten)' : buy('dig');
    return 'Quest: Bring Mama den Umhang';
  }
  if (!o.invis) return buy('invis');
  return 'Quest: Unsichtbar zum Torhebel';
}

const LOTTE_TIPS = {
  felix: 'Lotte: Felix? Der übt gerade Kastanien-Weitwurf vor seinem Haus.',
  theo: 'Lotte: Theo? Der spielt Verstecken. Vorhin hat im Nordosten ein Busch ganz komisch geraschelt ...',
  ferdinand: 'Lotte: Ferdinand sitzt fest – seit dem Sturm liegt ein Felsbrocken vor seiner Tür! Wer stark ist, schiebt ihn zur Seite.',
  lino: 'Lotte: Der arme Lino steckt am Brunnen im Matsch fest. Mit einer Schaufel wäre er schnell frei ...',
  mama: 'Lotte: Oma Hildes Garten? Die Erde unter dem Zaun ist ganz locker...',
  gate: 'Lotte: Konrad lässt niemanden durch. Aber wen er nicht sieht, den hält er auch nicht auf...',
  done: 'Lotte: Viel Glück im Buttenberg! Brunos Schleuder soll gegen Schleime super helfen.',
};

export function questHint(game) {
  if (game.mapId === 'mountain' || game.mapId === 'lair') return mountainHint(game);
  if (game.mapId === 'valley' || game.mapId === 'under') return valleyHint(game);
  if (game.mapId === 'haunted') return hauntHint(game);
  if (game.mapId === 'cave' || game.step >= 7 && game.mapId !== 'village') return caveHint(game);
  if (game.step >= 7) return 'Ziel: Die Höhle im Buttenberg (Norden)';
  return villageGoal(game);
}

function mountainHint(game) {
  const t = game.mtn, o = game.owned;
  const need = (id, text) => (o[id] ? text : `Quest: Kauf ${ABILITY_NAME[id]}`);
  if (!t.statue) return 'Quest: Besiegt die Feuerstatue (Theo)';
  if (!t.wall) return need('dig', 'Quest: Grabt durch die Erdmauer (Ferdinand)');
  if (!t.key) return 'Quest: Holt den Schlüssel';
  if (!t.rocks) return need('strength', 'Quest: Schiebt den Felsbrocken (Felix)');
  if (!t.boss) return 'Quest: Besiegt das Riesen-Felsmonster';
  if (!t.jelly) return 'Quest: Befreit die Katze aus dem Käfig';
  if (!t.done) return 'Quest: Durch die Tür und über die Schlucht';
  return 'Ziel: Weiter zum Drachen';
}

function valleyHint(game) {
  const v = game.valley;
  if (!v.sword) return 'Quest: Findet den Schatz in der Talmitte';
  if (!v.key) return 'Quest: Holt den Schlüssel in der Unterwelt';
  if (!v.lever) return 'Quest: Legt den Hebel um (über Höhle E)';
  if (!v.door) return 'Quest: Öffnet die Felsentür (über Höhle C)';
  if (!v.troll) return 'Quest: Besiegt den Troll!';
  return 'Ziel: Durch das Gitter nach Norden';
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
  if (!c.dug) return need('dig', 'Quest: Grabt euch durch (Ferdinand)');
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
  const L = lead(game), S = starterName(game), M = momName(game);
  switch (n.id) {
    case 'felix':
      if (game.challenge.active) return { lines: ['Felix: Konzentrier dich! Ausweichen – oder mit Theos Schild abwehren!'] };
      if (!game.seenHints.felixTalk) return {
        lines: [
          `${L}: Felix! Kommst du mit zum Buttenberg? Wir besiegen den bösen Drachen!`,
          'Felix: Den Drachen?! Hm... nur wenn du wirklich mutig bist.',
          'Felix: Ich werfe Kastanien nach dir. Überstehe 5 Stück, ohne getroffen zu werden!',
          'Tipp: Ausweichen oder – wenn Theo dabei ist und den Schild hat – mit B abwehren.',
        ],
        after() { game.seenHints.felixTalk = true; fx.startChallenge(); },
      };
      return {
        lines: ['Felix: Nochmal? Okay – fünf Kastanien. Los geht\'s!'],
        after() { fx.startChallenge(); },
      };

    case 'theo':
      return {
        lines: game.seenHints.theoTalk ? ['Theo: Na, bereit für die Drachenprüfung?'] : [
          'Theo: HA! Gefunden. Na gut ... Zum Buttenberg? Zum DRACHEN?',
          'Theo: Da komm ich mit! Ich hab nämlich schon Karten vom ganzen Berg gezeichnet. Geheime Karten!',
          'Theo: Aber wer zum Drachen will, muss schlau sein. Drachen stellen Rätsel! Das weiß doch jeder.',
          'Theo: Also: meine Drachenprüfung. Drei richtige Antworten – dann bin ich dabei.',
        ],
        after() { game.seenHints.theoTalk = true; fx.openRiddle('theo'); },
      };

    case 'mama': {
      const asFried = game.starter === 'friedrich';
      if (game.mama === 2) return { lines: [`${M}: Und denkt an eure Jacken!`] };
      if (game.hasCloak) return {
        lines: [
          `${L}: Hier ist Friedrichs Tarnumhang!`,
          `${M}: Prima. Dann darf Friedrich mit. Passt gut auf ihn auf!`,
          'Friedrich: JAAA! Mit dem Umhang kann ich mich unsichtbar machen!',
        ],
        after() {
          game.mama = 2;
          fx.sfx.item();
          if (!asFried && !game.rec.friedrich) {
            game.rec.friedrich = true;
            fx.join('friedrich');
            fx.banner('FRIEDRICH IST DABEI', 'B: unsichtbar werden (Laden)', '#a8f070');
          } else fx.banner('MAMA ERLAUBT ES', 'Friedrich darf mit zum Buttenberg', '#a8f070');
          fx.gainXP(15, n.x + 8, n.y);
        },
      };
      if (game.mama === 1) return { lines: [`${M}: Oma Hildes Garten ist im Südwesten. Das Gartentor ist leider abgeschlossen.`] };
      const extra = !game.rec.theo && game.starter !== 'theo'
        ? [`${M}: Theo? Der spielt wieder Verstecken. Bestimmt in irgendeinem Busch!`] : [];
      return {
        lines: [
          asFried ? 'Friedrich: Mama, ich geh zum Buttenberg! Mit den Großen!' : `${L}: Darf Friedrich mitkommen? Wir gehen zum Buttenberg!`,
          `${M}: Zum Buttenberg? Nur wenn ihr zusammenbleibt – und Friedrich seinen Tarnumhang mitnimmt.`,
          `${M}: Aber der ist gestern über den Zaun in Oma Hildes Garten geweht. Und Oma Hilde ist verreist...`,
          ...extra,
        ],
        after() { game.mama = 1; fx.banner('NEUE QUEST', 'Hol den Tarnumhang aus dem Garten', '#88e0ff'); },
      };
    }

    case 'friedrich':
      if (game.mama === 2) return {
        lines: [`${L}: Kommst du?`, 'Friedrich: JAAA!'],
        after() { game.rec.friedrich = true; fx.join('friedrich'); fx.banner('FRIEDRICH IST DABEI', 'B: unsichtbar werden (Laden)', '#a8f070'); },
      };
      return { lines: [
        'Friedrich: Ich will auch mit! Bitte, bitte, bitte!',
        `Friedrich: Aber ${game.starter === 'theo' ? 'Mama' : 'meine Mama'} erlaubt es nur mit meinem Tarnumhang. Frag sie!`,
      ] };

    case 'lotte': {
      if (!game.owned.shield && !game.owned.strength && !game.owned.dig && !game.owned.invis) return { lines: [
        'Lotte: Diamanten? Die verdienst du bei Frau Klug in der Schule – im Süden, das Haus mit dem Buch.',
        'Lotte: Und gleich daneben ist Brunos Laden. Da gibt es Schilde, Zaubertränke und noch viel mehr!',
      ] };
      const r = game.rec;
      const key = game.step >= 7 ? 'done' : !r.felix ? 'felix' : !r.theo ? 'theo' : !r.ferdinand ? 'ferdinand' : !r.lino ? 'lino' : game.mama < 2 ? 'mama' : 'gate';
      return { lines: [LOTTE_TIPS[key]] };
    }

    case 'teacher':
      return { lines: game.quizIntro ? ['Frau Klug: Schön, dass du wieder da bist! Welches Fach?'] : [
        `Frau Klug: Hallo ${L}! Du willst Diamanten verdienen? Dann zeig mal, was du kannst.`,
        'Frau Klug: Für jede richtige Antwort gibt es einen Diamanten. Fünf richtige in Folge geben 2 extra!',
      ], after() { game.quizIntro = true; fx.openQuiz(); } };

    case 'jelly':
      return fx.jellyTalk();

    case 'lino':
      return { lines: [
        `Lino: ${L}! Hilfe! Ich wollte über den Brunnen steigen – mit meinen Spaghetti-Beinen geht das eigentlich super.`,
        'Lino: Aber dann bin ich im Matsch ausgerutscht. Jetzt stecken meine Beine fest. Total verknotet!',
        `${L}: Zum Buttenberg kommst du so nicht mit ...`,
        'Lino: Zum DRACHEN? Da will ich mit! Holt Ferdinand – der kann mich ausbuddeln!',
        'Tipp: Ferdinand nach vorne holen und vor Lino B drücken.',
      ] };

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

    case 'trollfriend':
      return { lines: game.valley.lever
        ? ['Grummel: Das Gitter ist offen. Viel Glück beim Drachen – und grüßt ihn nicht von mir!']
        : ['Grummel: Das Gitter öffnet nur der Hebel auf dem Felsvorsprung im Westen. Den erreicht ihr über Höhle E.'] };

    case 'troll':
      if (game.cave.troll) return { lines: ['Troll: Hä? Wo kommt ihr denn her?!'] };
      return { lines: ['Troll: GRRR! Hier kommt keiner durch, den ich sehe!'] };

    case 'konrad':
      if (game.step >= 7) return { lines: ['Wache Konrad: Fünf kleine Helden... Passt bloß auf euch auf am Buttenberg!'] };
      return { lines: [
        'Wache Konrad: Halt! Zum Buttenberg lasse ich keine Kinder durch.',
        'Wache Konrad: Da oben wohnt ein Drache! Das Tor bleibt zu.',
      ] };
  }
  return { lines: ['...'] };
}

export function ferdinandDoor(game, fx) {
  const L = lead(game);
  return {
    lines: [
      '*klopf klopf*',
      'Ferdinand: Endlich! Seit dem Sturm lag der Fels vor meiner Tür. Danke, Felix!',
      `${L}: Kommst du mit zum Buttenberg? Wir besiegen den Drachen!`,
      'Ferdinand: Klar! Und wenn wir irgendwo nicht weiterkommen – ich buddel uns einfach ein Loch.',
    ],
    after() {
      game.rec.ferdinand = true;
      fx.join('ferdinand');
      fx.sfx.item();
      fx.banner('FERDINAND IST DABEI', 'B: Löcher buddeln (Laden)', '#a8f070');
      fx.gainXP(15);
    },
  };
}

export function leverDialog(game) {
  return [
    '*Knarz!* Friedrich zieht am Hebel. Das Tor geht auf!',
    'Wache Konrad: Huch?! Wer hat denn das Tor geöffnet?!',
    `${starterName(game)}: Wir! Wir sind zu fünft und wir haben einen Plan.`,
    'Wache Konrad: ...Na gut, ihr kleinen Helden. Aber passt auf euch auf!',
  ];
}
