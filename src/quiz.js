// Lernaufgaben für die Schule – Klasse 5, Gymnasium Baden-Württemberg.
// Mathe wird zufällig erzeugt, Deutsch/Englisch/Geographie kommen aus Fragenpools
// (teils ebenfalls automatisch kombiniert, z. B. Vokabeln und Hauptstädte).
//
// Neue Fragen ergänzen: einfach eine Zeile { q, a, w: [3 falsche Antworten] } in den Pool schreiben.

import { englishRiddle, division, binaryRead, binaryWrite, BOOK_VOCAB, HALLOWEEN_VOCAB } from './halloween.js';

export const SUBJECTS = [
  { id: 'de', name: 'Deutsch' },
  { id: 'en', name: 'Englisch' },
  { id: 'geo', name: 'Geographie' },
  { id: 'ma', name: 'Mathe' },
];

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // 12345 -> 12.345

// --- Deutsch --------------------------------------------------------------------

const DE = [
  { q: 'Welches Wort ist ein Nomen?', a: 'Freude', w: ['freuen', 'fröhlich', 'schnell'] },
  { q: 'Welches Wort ist ein Verb?', a: 'springen', w: ['Sprung', 'sprunghaft', 'Springbrunnen'] },
  { q: 'Welches Wort ist ein Adjektiv?', a: 'mutig', w: ['Mut', 'ermutigen', 'Mutprobe'] },
  { q: 'Welche Wortart ist "unter"?', a: 'Präposition', w: ['Verb', 'Nomen', 'Adjektiv'] },
  { q: 'Welche Wortart ist "sie" in "Sie lacht."?', a: 'Pronomen', w: ['Artikel', 'Nomen', 'Verb'] },
  { q: 'Welcher Satz ist richtig?', a: 'Ich weiß, dass du kommst.', w: ['Ich weiß, das du kommst.', 'Ich weis, dass du kommst.', 'Ich weiß das du kommst.'] },
  { q: 'Welcher Satz ist richtig?', a: 'Das Auto, das dort steht, ist rot.', w: ['Das Auto, dass dort steht, ist rot.', 'Das Auto das dort steht ist rot.', 'Dass Auto, das dort steht, ist rot.'] },
  { q: 'Welcher Satz ist richtig geschrieben?', a: 'Beim Laufen bin ich schnell.', w: ['Beim laufen bin ich schnell.', 'beim Laufen bin ich Schnell.', 'Beim Laufen bin ich Schnell.'] },
  { q: 'Welcher Satz ist richtig geschrieben?', a: 'Die Straße ist nass.', w: ['Die Strasse ist naß.', 'Die Straße ist naß.', 'Die Strase ist nass.'] },
  { q: 'Welches Wort ist richtig geschrieben?', a: 'Fuß', w: ['Fuss', 'Fus', 'Fuhs'] },
  { q: 'Welches Wort ist richtig geschrieben?', a: 'Schloss', w: ['Schloß', 'Schlos', 'Schlohs'] },
  { q: 'Präteritum von "gehen": er ...', a: 'ging', w: ['gang', 'gehte', 'ist gegangen'] },
  { q: 'Präteritum von "laufen": sie ...', a: 'lief', w: ['laufte', 'lauf', 'ist gelaufen'] },
  { q: 'Präteritum von "denken": ich ...', a: 'dachte', w: ['denkte', 'dank', 'dunk'] },
  { q: 'Perfekt von "Ich schwimme."', a: 'Ich bin geschwommen.', w: ['Ich habe geschwommen.', 'Ich schwamm.', 'Ich werde schwimmen.'] },
  { q: 'Welche Zeitform: "Wir spielten Fußball."', a: 'Präteritum', w: ['Präsens', 'Perfekt', 'Futur'] },
  { q: 'Welche Zeitform: "Er hat gelacht."', a: 'Perfekt', w: ['Präteritum', 'Präsens', 'Futur'] },
  { q: 'Welche Zeitform: "Ich werde kommen."', a: 'Futur', w: ['Präsens', 'Perfekt', 'Präteritum'] },
  { q: 'Plural von "die Maus":', a: 'die Mäuse', w: ['die Mauses', 'die Mausen', 'die Mäusen'] },
  { q: 'Plural von "das Buch":', a: 'die Bücher', w: ['die Buchs', 'die Büche', 'die Buchen'] },
  { q: 'Plural von "der Baum":', a: 'die Bäume', w: ['die Baums', 'die Bäumer', 'die Baumen'] },
  { q: 'Steigere "gut": gut – ...', a: 'besser', w: ['guter', 'am besten', 'güter'] },
  { q: 'Superlativ von "hoch":', a: 'am höchsten', w: ['am hochsten', 'höher', 'am hochesten'] },
  { q: 'Welcher Artikel passt? ... Brot', a: 'das', w: ['der', 'die', 'den'] },
  { q: 'Welcher Artikel passt? ... Löffel', a: 'der', w: ['die', 'das', 'dem'] },
  { q: 'Subjekt in "Der Hund bellt laut."?', a: 'Der Hund', w: ['bellt', 'laut', 'Hund bellt'] },
  { q: 'Prädikat in "Lena liest ein Buch."?', a: 'liest', w: ['Lena', 'ein Buch', 'Buch'] },
  { q: 'Fall von "dem Hund" in "Ich gebe dem Hund einen Knochen."', a: 'Dativ', w: ['Akkusativ', 'Genitiv', 'Nominativ'] },
  { q: 'Mit "Wen oder was?" fragt man nach dem ...', a: 'Akkusativ', w: ['Dativ', 'Genitiv', 'Nominativ'] },
  { q: 'Mit "Wessen?" fragt man nach dem ...', a: 'Genitiv', w: ['Dativ', 'Akkusativ', 'Nominativ'] },
  { q: 'Welches Satzzeichen fehlt? "Kommst du morgen mit_"', a: '?', w: ['.', '!', ','] },
  { q: 'Welches Wort gehört NICHT zur Wortfamilie "fahren"?', a: 'Farbe', w: ['Fahrrad', 'Fahrer', 'Abfahrt'] },
  { q: 'Gegenteil von "laut":', a: 'leise', w: ['hell', 'schnell', 'groß'] },
  { q: 'Ein anderes Wort für "schnell":', a: 'flink', w: ['langsam', 'träge', 'müde'] },
  { q: 'Richtige Silbentrennung von "Fenster":', a: 'Fens-ter', w: ['Fe-nster', 'Fenst-er', 'Fen-ster'] },
  { q: 'Wie viele Silben hat "Schokolade"?', a: '4', w: ['3', '5', '2'] },
  { q: 'Welches Wort reimt sich auf "Haus"?', a: 'Maus', w: ['Hase', 'Hose', 'Hut'] },
  { q: 'Welches Adjektiv passt? "der ... Ball" (rot)', a: 'rote', w: ['roten', 'roter', 'rotes'] },
  { q: 'Zusammengesetztes Nomen aus "Haus" und "Tür":', a: 'die Haustür', w: ['der Haustür', 'das Haustür', 'die Türhaus'] },
  { q: 'Ein Text, der eine Lehre am Ende hat und in dem Tiere sprechen, heißt ...', a: 'Fabel', w: ['Märchen', 'Gedicht', 'Bericht'] },
  { q: '"Es war einmal ..." – so beginnt meist ein ...', a: 'Märchen', w: ['Bericht', 'Rezept', 'Brief'] },
];

// --- Englisch -------------------------------------------------------------------

const VOCAB = [
  ['Hund', 'dog'], ['Katze', 'cat'], ['Pferd', 'horse'], ['Vogel', 'bird'], ['Maus', 'mouse'],
  ['Schule', 'school'], ['Lehrer', 'teacher'], ['Freund', 'friend'], ['Bruder', 'brother'], ['Schwester', 'sister'],
  ['Mutter', 'mother'], ['Vater', 'father'], ['Haus', 'house'], ['Tür', 'door'], ['Fenster', 'window'],
  ['Tisch', 'table'], ['Stuhl', 'chair'], ['Buch', 'book'], ['Apfel', 'apple'], ['Brot', 'bread'],
  ['Wasser', 'water'], ['Milch', 'milk'], ['rot', 'red'], ['blau', 'blue'], ['grün', 'green'],
  ['gelb', 'yellow'], ['schwarz', 'black'], ['weiß', 'white'], ['groß', 'big'], ['klein', 'small'],
  ['Montag', 'Monday'], ['Dienstag', 'Tuesday'], ['Mittwoch', 'Wednesday'], ['Donnerstag', 'Thursday'],
  ['Freitag', 'Friday'], ['Samstag', 'Saturday'], ['Sonntag', 'Sunday'],
  ['Drache', 'dragon'], ['Schlüssel', 'key'], ['Höhle', 'cave'], ['Berg', 'mountain'], ['Wald', 'forest'],
  ['Fluss', 'river'], ['Hausaufgaben', 'homework'], ['Bleistift', 'pencil'], ['Lineal', 'ruler'],
  ['Schultasche', 'schoolbag'], ['Frühstück', 'breakfast'], ['Zimmer', 'room'], ['Garten', 'garden'],
  ['Geburtstag', 'birthday'], ['Küche', 'kitchen'], ['Schlafzimmer', 'bedroom'], ['Kaninchen', 'rabbit'],
  ['zwölf', 'twelve'], ['zwanzig', 'twenty'], ['dreizehn', 'thirteen'], ['fünfzehn', 'fifteen'],
  ['heute', 'today'], ['morgen', 'tomorrow'], ['immer', 'always'], ['nie', 'never'],
];

const EN = [
  { q: 'I ___ eleven years old.', a: 'am', w: ['is', 'are', 'be'] },
  { q: 'She ___ a cat.', a: 'has got', w: ['have got', 'has gots', 'having'] },
  { q: 'They ___ my friends.', a: 'are', w: ['is', 'am', 'be'] },
  { q: 'He ___ football every day.', a: 'plays', w: ['play', 'playing', 'plaies'] },
  { q: 'My mum ___ to work by bus.', a: 'goes', w: ['go', 'gos', 'going'] },
  { q: '___ you like pizza?', a: 'Do', w: ['Does', 'Are', 'Is'] },
  { q: '___ your brother like football?', a: 'Does', w: ['Do', 'Is', 'Are'] },
  { q: 'My sister ___ like spiders.', a: "doesn't", w: ["don't", "isn't", 'not'] },
  { q: 'Where ___ Tom from?', a: 'is', w: ['are', 'am', 'do'] },
  { q: 'There ___ two dogs in the garden.', a: 'are', w: ['is', 'am', 'be'] },
  { q: 'Plural von "child":', a: 'children', w: ['childs', 'childes', 'childen'] },
  { q: 'Plural von "box":', a: 'boxes', w: ['boxs', 'boxen', 'boxies'] },
  { q: 'Plural von "mouse":', a: 'mice', w: ['mouses', 'mices', 'meese'] },
  { q: 'Plural von "baby":', a: 'babies', w: ['babys', 'babyes', 'babis'] },
  { q: 'This is ___ book. (Es gehört mir.)', a: 'my', w: ['me', 'I', 'mine'] },
  { q: 'This is Tom. ___ is my friend.', a: 'He', w: ['She', 'It', 'His'] },
  { q: 'Wie sagt man 7:30 Uhr?', a: 'half past seven', w: ['half past six', 'seven past half', 'half to eight'] },
  { q: 'Wie sagt man 8:15 Uhr?', a: 'quarter past eight', w: ['quarter to eight', 'quarter past seven', 'fifteen to eight'] },
  { q: '"der dritte" heißt auf Englisch ...', a: 'the third', w: ['the three', 'the threeth', 'the thirdth'] },
  { q: 'Ich bin gerade beim Lesen: I ___ reading.', a: 'am', w: ['is', 'do', 'have'] },
  { q: 'Look! The dog ___ in the garden.', a: 'is running', w: ['run', 'runs', 'are running'] },
  { q: 'Wie fragt man nach dem Namen?', a: "What's your name?", w: ['How old are you?', 'Where are you from?', 'How are you?'] },
  { q: '"How are you?" – passende Antwort:', a: "I'm fine, thanks.", w: ["I'm eleven.", "I'm from Germany.", 'My name is Theo.'] },
  { q: 'Welcher Monat kommt nach "March"?', a: 'April', w: ['May', 'February', 'June'] },
];

function vocabQuestion() {
  const [de, en] = pick(VOCAB);
  const others = shuffle(VOCAB.filter((v) => v[1] !== en)).slice(0, 3);
  if (Math.random() < 0.5) return { q: `Was heißt "${de}" auf Englisch?`, a: en, w: others.map((v) => v[1]) };
  return { q: `Was bedeutet "${en}"?`, a: de, w: others.map((v) => v[0]) };
}

// --- Geographie -----------------------------------------------------------------

const LAENDER = [
  ['Baden-Württemberg', 'Stuttgart'], ['Bayern', 'München'], ['Hessen', 'Wiesbaden'], ['Rheinland-Pfalz', 'Mainz'],
  ['Saarland', 'Saarbrücken'], ['Nordrhein-Westfalen', 'Düsseldorf'], ['Niedersachsen', 'Hannover'],
  ['Schleswig-Holstein', 'Kiel'], ['Mecklenburg-Vorpommern', 'Schwerin'], ['Brandenburg', 'Potsdam'],
  ['Sachsen', 'Dresden'], ['Sachsen-Anhalt', 'Magdeburg'], ['Thüringen', 'Erfurt'],
];
const EUROPA = [
  ['Frankreich', 'Paris'], ['Italien', 'Rom'], ['Spanien', 'Madrid'], ['Österreich', 'Wien'], ['Polen', 'Warschau'],
  ['Niederlande', 'Amsterdam'], ['Dänemark', 'Kopenhagen'], ['Tschechien', 'Prag'], ['Belgien', 'Brüssel'],
  ['Griechenland', 'Athen'], ['Portugal', 'Lissabon'], ['Schweden', 'Stockholm'], ['Norwegen', 'Oslo'],
  ['Großbritannien', 'London'],
];

const GEO = [
  { q: 'Höchster Berg Deutschlands?', a: 'Zugspitze', w: ['Feldberg', 'Brocken', 'Watzmann'] },
  { q: 'Höchster Berg im Schwarzwald?', a: 'Feldberg', w: ['Zugspitze', 'Belchen', 'Hornisgrinde'] },
  { q: 'Welcher See liegt zwischen Deutschland, Österreich und der Schweiz?', a: 'Bodensee', w: ['Chiemsee', 'Müritz', 'Titisee'] },
  { q: 'Welcher Fluss fließt durch Stuttgart?', a: 'Neckar', w: ['Rhein', 'Donau', 'Main'] },
  { q: 'In welchen Fluss mündet der Neckar?', a: 'Rhein', w: ['Donau', 'Main', 'Elbe'] },
  { q: 'Die Donau mündet ins ...', a: 'Schwarze Meer', w: ['Nordsee', 'Ostsee', 'Mittelmeer'] },
  { q: 'Welches Gebirge liegt in Baden-Württemberg?', a: 'Schwäbische Alb', w: ['Harz', 'Erzgebirge', 'Thüringer Wald'] },
  { q: 'Wie viele Bundesländer hat Deutschland?', a: '16', w: ['12', '14', '18'] },
  { q: 'Hauptstadt von Deutschland?', a: 'Berlin', w: ['Bonn', 'Hamburg', 'Frankfurt'] },
  { q: 'Flächenmäßig größtes Bundesland?', a: 'Bayern', w: ['Niedersachsen', 'Baden-Württemberg', 'Nordrhein-Westfalen'] },
  { q: 'Bundesland mit den meisten Einwohnern?', a: 'Nordrhein-Westfalen', w: ['Bayern', 'Baden-Württemberg', 'Niedersachsen'] },
  { q: 'An welche Meere grenzt Deutschland?', a: 'Nordsee und Ostsee', w: ['Nordsee und Mittelmeer', 'Ostsee und Atlantik', 'Schwarzes Meer und Ostsee'] },
  { q: 'Welches Land grenzt NICHT an Deutschland?', a: 'Italien', w: ['Frankreich', 'Polen', 'Schweiz'] },
  { q: 'Wie viele Kontinente gibt es?', a: '7', w: ['5', '6', '8'] },
  { q: 'Größter Ozean der Erde?', a: 'Pazifik', w: ['Atlantik', 'Indischer Ozean', 'Arktischer Ozean'] },
  { q: 'Auf welchem Kontinent liegt Ägypten?', a: 'Afrika', w: ['Asien', 'Europa', 'Australien'] },
  { q: 'Auf welchem Kontinent liegt Brasilien?', a: 'Südamerika', w: ['Afrika', 'Nordamerika', 'Asien'] },
  { q: 'Die Sonne geht im ... auf.', a: 'Osten', w: ['Westen', 'Norden', 'Süden'] },
  { q: 'Mittags steht die Sonne bei uns im ...', a: 'Süden', w: ['Norden', 'Osten', 'Westen'] },
  { q: 'Gegenteil von Nordwesten?', a: 'Südosten', w: ['Südwesten', 'Nordosten', 'Osten'] },
  { q: 'Maßstab 1:100.000 – 1 cm auf der Karte sind in echt ...', a: '1 km', w: ['100 m', '10 km', '100 km'] },
  { q: 'Maßstab 1:25.000 – 4 cm auf der Karte sind in echt ...', a: '1 km', w: ['100 m', '4 km', '25 km'] },
  { q: 'Linie, die die Erde in Nord- und Südhalbkugel teilt?', a: 'Äquator', w: ['Nullmeridian', 'Wendekreis', 'Polarkreis'] },
  { q: 'Durch welche Stadt verläuft der Nullmeridian?', a: 'London', w: ['Paris', 'Berlin', 'Rom'] },
  { q: 'Die Zeichenerklärung einer Karte heißt ...', a: 'Legende', w: ['Maßstab', 'Gradnetz', 'Kompass'] },
  { q: 'Welche Farbe haben hohe Gebirge auf physischen Karten meist?', a: 'Braun', w: ['Blau', 'Grün', 'Rot'] },
  { q: 'Welche Farbe hat Tiefland auf physischen Karten meist?', a: 'Grün', w: ['Braun', 'Gelb', 'Weiß'] },
  { q: 'Wie heißt der Planet, auf dem wir leben?', a: 'Erde', w: ['Mars', 'Venus', 'Jupiter'] },
  { q: 'Wie lange dreht sich die Erde einmal um sich selbst?', a: 'etwa 24 Stunden', w: ['etwa 1 Jahr', 'etwa 1 Monat', 'etwa 12 Stunden'] },
  { q: 'Wie lange braucht die Erde einmal um die Sonne?', a: 'etwa 1 Jahr', w: ['etwa 1 Tag', 'etwa 1 Monat', 'etwa 10 Jahre'] },
];

function capitalQuestion() {
  if (Math.random() < 0.6) {
    const [land, stadt] = pick(LAENDER);
    const w = shuffle(LAENDER.filter((l) => l[1] !== stadt)).slice(0, 3).map((l) => l[1]);
    return { q: `Hauptstadt von ${land}?`, a: stadt, w };
  }
  const [land, stadt] = pick(EUROPA);
  const w = shuffle(EUROPA.filter((l) => l[1] !== stadt)).slice(0, 3).map((l) => l[1]);
  return { q: `Hauptstadt von ${land}?`, a: stadt, w };
}

// --- Mathe (Generator) ----------------------------------------------------------

// Falsche Antworten nahe an der richtigen, alle verschieden
function near(correct, spread = [1, 2, 10], allowNeg = false) {
  const set = new Set();
  let guard = 0;
  while (set.size < 3 && guard++ < 50) {
    const d = pick(spread) * (Math.random() < 0.5 ? -1 : 1);
    const v = correct + d;
    if (v !== correct && (allowNeg || v >= 0)) set.add(v);
  }
  return [...set];
}

const MATH = [
  () => { const a = rnd(1200, 8900), b = rnd(150, 990); return { q: `${fmt(a)} + ${b} = ?`, n: a + b, s: [10, 100, 1] }; },
  () => { const a = rnd(2000, 9000), b = rnd(150, 1900); return { q: `${fmt(a)} − ${fmt(b)} = ?`, n: a - b, s: [10, 100, 1] }; },
  () => { const a = rnd(12, 25), b = rnd(3, 9); return { q: `${a} · ${b} = ?`, n: a * b, s: [a, b, 10] }; },
  () => { const a = rnd(11, 19), b = rnd(11, 15); return { q: `${a} · ${b} = ?`, n: a * b, s: [a, b, 10] }; },
  () => { const b = rnd(3, 12), n = rnd(6, 25); return { q: `${b * n} : ${b} = ?`, n, s: [1, 2, 10] }; },
  () => { const a = rnd(2, 20), b = rnd(2, 9), c = rnd(2, 9); return { q: `${a} + ${b} · ${c} = ?`, n: a + b * c, w: [(a + b) * c] }; },
  () => { const a = rnd(2, 9), b = rnd(2, 9), c = rnd(2, 6); return { q: `(${a} + ${b}) · ${c} = ?`, n: (a + b) * c, w: [a + b * c] }; },
  () => { const a = rnd(30, 90), b = rnd(2, 6), c = rnd(2, 6); return { q: `${a} − ${b} · ${c} = ?`, n: a - b * c, w: [(a - b) * c] }; },
  () => { const n = rnd(11, 20); return { q: `${n}² = ?`, n: n * n, w: [n * 2], s: [n, 1, 10] }; },
  () => { const a = rnd(-9, -1), b = rnd(2, 12); return { q: `(${a}) + ${b} = ?`, n: a + b, s: [2, 1, -2 * a], neg: true }; },
  () => { const a = rnd(2, 9), b = rnd(a + 2, 15); return { q: `${a} − ${b} = ?`, n: a - b, w: [b - a], neg: true }; },
  () => { const n = rnd(1203, 9876); const r = Math.round(n / 100) * 100; return { q: `${fmt(n)} gerundet auf Hunderter?`, n: r, w: [Math.floor(n / 100) * 100 === r ? r + 100 : r - 100, Math.round(n / 10) * 10, Math.round(n / 1000) * 1000], s: [100, 200] }; },
  () => { const m = rnd(2, 9), cm = rnd(1, 9) * 10; return { q: `${m} m ${cm} cm = ? cm`, n: m * 100 + cm, w: [m * 10 + cm, m * 1000 + cm], s: [10, 100], unit: ' cm' }; },
  () => { const km = rnd(2, 9), m = rnd(1, 9) * 100; return { q: `${km} km ${m} m = ? m`, n: km * 1000 + m, w: [km * 100 + m, km * 10000 + m], s: [100, 1000], unit: ' m' }; },
  () => { const kg = rnd(2, 9), g = rnd(1, 9) * 50; return { q: `${kg} kg ${g} g = ? g`, n: kg * 1000 + g, w: [kg * 100 + g], s: [100, 1000], unit: ' g' }; },
  () => { const h = rnd(1, 4), min = rnd(1, 5) * 10; return { q: `${h} h ${min} min = ? min`, n: h * 60 + min, w: [h * 100 + min, h * 10 + min], s: [10, 60], unit: ' min' }; },
  () => { const e = rnd(2, 19), ct = rnd(1, 9) * 5; return { q: `${e},${String(ct).padStart(2, '0')} € = ? ct`, n: e * 100 + ct, w: [e * 10 + ct, e + ct], s: [10, 100], unit: ' ct' }; },
  () => { const a = rnd(3, 12), b = rnd(2, 9); return { q: `Rechteck ${a} cm × ${b} cm. Umfang?`, n: 2 * (a + b), w: [a * b, a + b], s: [2], unit: ' cm' }; },
  () => { const a = rnd(3, 12), b = rnd(2, 9); return { q: `Rechteck ${a} cm × ${b} cm. Flächeninhalt?`, n: a * b, w: [2 * (a + b), a + b], s: [a, b], unit: ' cm²' }; },
  () => {
    const n = pick([12, 18, 20, 24, 28, 30, 36, 40, 42, 45, 48]);
    const divs = []; for (let i = 2; i < n; i++) if (n % i === 0) divs.push(i);
    const non = []; for (let i = 2; i < n; i++) if (n % i !== 0) non.push(i);
    return { q: `Welche Zahl ist ein Teiler von ${n}?`, n: pick(divs), w: shuffle(non).slice(0, 3) };
  },
  () => { const s = rnd(2, 9) * 10; return { q: `Was ist das Doppelte von ${s} plus die Hälfte von ${s}?`, n: 2 * s + s / 2, s: [5, 10, s / 2] }; },
];

function mathQuestion() {
  const g = pick(MATH)();
  const wrong = [...new Set((g.w || []).filter((v) => v !== g.n))].slice(0, 3);
  for (let tries = 0; wrong.length < 3 && tries < 20; tries++) {
    for (const v of near(g.n, tries < 5 && g.s ? g.s : [1, 2, 5, 10], g.neg)) if (!wrong.includes(v) && wrong.length < 3) wrong.push(v);
  }
  const u = g.unit || '';
  const show = (v) => (Math.abs(v) >= 10000 ? fmt(v) : String(v)) + u;
  return { q: g.q, a: show(g.n), w: wrong.map(show) };
}

// --- Auswahl --------------------------------------------------------------------

const recent = { de: [], en: [], geo: [], ma: [] };

function raw(subject) {
  switch (subject) {
    case 'de': return pick(DE);
    case 'en': {
      // Hälfte: Lehrbuch "Here we go" + Halloween, Rest: Grundwortschatz und Grammatik
      const r = Math.random();
      if (r < 0.5) return englishRiddle();
      return r < 0.75 ? vocabQuestion() : pick(EN);
    }
    case 'geo': return Math.random() < 0.35 ? capitalQuestion() : pick(GEO);
    case 'ma': {
      const r = Math.random();
      if (r < 0.25) return division();
      if (r < 0.4) return Math.random() < 0.5 ? binaryRead() : binaryWrite();
      return mathQuestion();
    }
  }
  return pick(DE);
}

// Liefert { q, options[4], correct } – vermeidet Wiederholungen der letzten Fragen
export function nextQuestion(subject) {
  let item;
  for (let i = 0; i < 12; i++) {
    item = raw(subject);
    if (!recent[subject].includes(item.q + item.a)) break;
  }
  recent[subject].push(item.q + item.a);
  if (recent[subject].length > 15) recent[subject].shift();
  const options = shuffle([item.a, ...item.w.slice(0, 3)]);
  return { q: item.q, options, correct: options.indexOf(item.a) };
}

export const POOL_SIZES = { de: DE.length, en: EN.length + VOCAB.length + BOOK_VOCAB.length + HALLOWEEN_VOCAB.length, geo: GEO.length + LAENDER.length + EUROPA.length };
