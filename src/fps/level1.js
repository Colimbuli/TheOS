// Kapitel 2 – "Die Höhle im Buttenberg"
//
// Wände: #=Fels  M=Moos  W=Holz  E=Erde (Arne gräbt)  P=Felsblock (Felix schiebt)
//        D=Tür  L=Schlosstür (Schlüssel)  F=Feuerstatue (Theo wirft Feuer zurück)
//        H=Hebel  Z=Gittertor (öffnet per Hebel)  X=Ausgang
//
// Weg: Start → Erdwand (Arne) → Schleime → Tür → Halle → Felsblock (Felix) → Schlüssel
//      → Schlosstür → Feuerstatue (Theo) → Koboldhöhle → Troll (Friedrich unsichtbar)
//      → Hebel → Gittertor → Ausgang.  Geheimraum: Erdwand im Westen der Halle.

export const MAP = [
  '########################',
  '#....#...#......#.....##',
  '#....E...#......#.....##',
  '#....#...D......P.....##',
  '#....#...#......#.....##',
  '######...#......###L####',
  '##########......###.####',
  '######...E......###.####',
  '######...#......###.####',
  '######...##########.####',
  '###################.####',
  '##H################F####',
  '#....##########........#',
  '#....##########........#',
  '#......................#',
  '#......................#',
  '#....##########........#',
  '#....###################',
  '#....###################',
  '#....###################',
  '##Z#####################',
  '#....###################',
  '#XXXX###################',
  '########################',
];

export const START = { x: 2.5, y: 2.5, angle: 0 };

// Statue: Position und Schussrichtung (nach Norden)
export const STATUE = { x: 19, y: 11, dirX: 0, dirY: -1 };

// Troll: blockiert die nördliche Spur des Ganges, sieht nach Osten
export const TROLL = { x: 9.5, y: 14.5, pushTo: { x: 14.5, y: 15.5 } };

export const ENTITIES = [
  // Raum 2
  { type: 'slime', x: 7.5, y: 2.5 }, { type: 'slime', x: 7.5, y: 4.5 },
  // Halle
  { type: 'slime', x: 12.5, y: 5.5 }, { type: 'slime', x: 14.5, y: 7.5 }, { type: 'slime', x: 11.5, y: 3.5 },
  { type: 'bag', x: 11.5, y: 1.5 },
  { type: 'torch', x: 10.5, y: 8.5 }, { type: 'torch', x: 15.5, y: 1.5 },
  // Schlüsselraum
  { type: 'key', x: 20.5, y: 2.5 }, { type: 'apple', x: 18.5, y: 1.5 }, { type: 'mushrooms', x: 21.5, y: 4.5 },
  // Geheimraum
  { type: 'crystal', x: 6.5, y: 7.5 }, { type: 'crystal', x: 7.5, y: 8.5 }, { type: 'crystal', x: 8.5, y: 9.5 },
  { type: 'apple', x: 6.5, y: 9.5 }, { type: 'mushrooms', x: 8.5, y: 7.5 },
  // Koboldhöhle
  { type: 'kobold', x: 20.5, y: 13.5 }, { type: 'kobold', x: 17.5, y: 15.5 }, { type: 'kobold', x: 22.5, y: 16.5 },
  { type: 'crystal', x: 22.5, y: 12.5 }, { type: 'bag', x: 21.5, y: 16.5 }, { type: 'apple', x: 15.5, y: 12.5 },
  { type: 'torch', x: 15.5, y: 16.5 },
  // Westhöhle mit Hebel
  { type: 'crystal', x: 3.5, y: 18.5 }, { type: 'mushrooms', x: 1.5, y: 16.5 }, { type: 'torch', x: 4.5, y: 12.5 },
  // Schleime im Trollgang (hinter dem Troll)
  { type: 'slime', x: 3.5, y: 15.5 },
];

// Hinweise beim Betreten eines Bereichs (einmalig): [x0, y0, x1, y1, Text]
export const HINTS = [
  [1, 1, 4, 4, 'Die Höhle im Buttenberg! Eine Erdwand versperrt den Weg – Arne kann graben (Taste 3).'],
  [6, 1, 8, 5, 'Schleime! Felix trifft mit Kastanien (2), Arne haut mit der Schaufel (3).'],
  [13, 1, 15, 4, 'Ein Felsblock! Nur Felix ist stark genug, ihn zu schieben (2 + Aktion).'],
  [17, 1, 21, 4, 'Ein Schlüssel! Damit geht die Schlosstür auf.'],
  [19, 6, 19, 8, 'Eine Feuerstatue! Theos Schild (1, Aktion halten) wirft das Feuer zurück.'],
  [15, 12, 22, 16, 'Feuer-Kobolde! Theo kann auch ihre Feuerbälle zurückwerfen.'],
  [12, 14, 14, 15, 'Ein Höhlentroll! Er lässt keinen vorbei, den er sieht... Friedrich (4)?'],
  [1, 12, 4, 19, 'Ein Hebel an der Wand! (E / A zum Benutzen)'],
  [1, 21, 4, 21, 'Da vorne glüht es... der Weg zur Drachenhöhle!'],
];

// Wiedereinstiegspunkte nach dem "Erschöpft sein": [x0, y0, x1, y1, spawnX, spawnY, Winkel]
export const CHECKPOINTS = [
  [10, 1, 15, 8, 10.5, 3.5, 0],
  [17, 1, 21, 4, 17.5, 3.5, 0],
  [15, 12, 22, 16, 19.5, 12.5, Math.PI / 2],
  [1, 12, 4, 19, 3.5, 14.5, Math.PI / 2],
];

export const SECRET_CELL = { x: 9, y: 7 };
