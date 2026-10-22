// Aufgaben rund um Halloween, die Lehrbuch-Vokabeln ("Here we go", S. 174/175),
// Binärcode und schriftliche Division. Genutzt im Spukhaus (Kapitel 3) und in der Schule.
//
// Jede Funktion liefert { q, a, w: [falsche Antworten] }.
// Optional: fixed: true (Antworten nicht mischen, z. B. True/False).

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const uniq = (arr, not) => [...new Set(arr)].filter((v) => v !== not);

// --- Vokabeln -------------------------------------------------------------------

// Aus dem Lehrbuch, Unit "Here we go", Seiten 174/175
export const BOOK_VOCAB = [
  ['Mitschüler/in', 'classmate'], ['Karte', 'card'], ['Farbe', 'colour'], ['rot', 'red'], ['Tipp', 'tip'],
  ['gehen, fahren', 'to go'], ['kommen', 'to come'], ['sehen, besuchen', 'to see'], ['Heimatstadt', 'hometown'],
  ['Stadt', 'town'], ['Fluss', 'river'], ['Burg, Schloss', 'castle'], ['Schwimmbad', 'swimming pool'],
  ['Turm', 'tower'], ['Hügel', 'hill'], ['Boot', 'boat'], ['Meer', 'sea'], ['Riesenrad', 'big wheel'],
  ['groß', 'big'], ['können', 'can'], ['auf der Landkarte', 'on the map'], ['Lied', 'song'],
  ['großartig', 'great'], ['in der Nähe von', 'near'], ['Foto', 'photo'], ['hier', 'here'],
  ['Reim, Vers', 'rhyme'], ['viele', 'lots of'], ['jeden Tag', 'every day'], ['Sieh mal!', 'Look!'],
  ['Montag', 'Monday'], ['Dienstag', 'Tuesday'], ['Mittwoch', 'Wednesday'], ['Donnerstag', 'Thursday'],
  ['Freitag', 'Friday'], ['Samstag', 'Saturday'], ['Sonntag', 'Sunday'],
];

export const HALLOWEEN_VOCAB = [
  ['Kürbis', 'pumpkin'], ['Hexe', 'witch'], ['Gespenst', 'ghost'], ['Spinne', 'spider'], ['Spinnennetz', 'spiderweb'],
  ['Skelett', 'skeleton'], ['Mumie', 'mummy'], ['Fledermaus', 'bat'], ['Kessel', 'cauldron'], ['Süßigkeiten', 'candy'],
  ['Kostüm', 'costume'], ['Umhang', 'cape'], ['Perücke', 'wig'], ['Maske', 'mask'], ['falsche Zähne', 'fake teeth'],
  ['Spukhaus', 'haunted house'], ['Werwolf', 'werewolf'], ['Grabstein', 'gravestone'], ['Kerze', 'candle'],
  ['Mond', 'moon'], ['gruselig', 'scary'], ['Besen', 'broomstick'], ['Vampir', 'vampire'], ['Kuchen', 'cake'],
  ['Chips', 'crisps'], ['Limonade', 'lemonade'], ['sich verkleiden', 'dressing up'], ['Party', 'party'],
];

function vocab(list) {
  const [de, en] = pick(list);
  const others = shuffle(list.filter((v) => v[1] !== en)).slice(0, 3);
  if (Math.random() < 0.5) return { q: `Was heißt "${de}" auf Englisch?`, a: en, w: others.map((v) => v[1]) };
  return { q: `Was bedeutet "${en}"?`, a: de, w: others.map((v) => v[0]) };
}
export const bookVocab = () => vocab(BOOK_VOCAB);
export const halloweenVocab = () => vocab(HALLOWEEN_VOCAB);

// --- Lehrbuch: Sätze und Grammatik ----------------------------------------------

const BOOK_GRAMMAR = [
  { q: 'Silky is ___ the boat. (in der Nähe)', a: 'near', w: ['in the near of', 'at near', 'nearly'] },
  { q: '"auf dem Foto" heißt auf Englisch:', a: 'in the photo', w: ['on the photo', 'at the photo', 'of the photo'] },
  { q: 'There ___ a girl on the tower.', a: 'is', w: ['are', 'am', 'be'] },
  { q: 'There ___ two boys and two girls in the boat.', a: 'are', w: ['is', 'am', 'be'] },
  { q: 'Look at the river. ___ big.', a: "It's", w: ["He's", "She's", "They's"] },
  { q: 'This is my sister. ___ great!', a: "She's", w: ["It's", "He's", "Her's"] },
  { q: '"Ja, das stimmt." heißt:', a: "Yes, that's right.", w: ["Yes, that's wrong.", "No, that's right.", "Yes, it's great."] },
  { q: '"Nein, das ist falsch." heißt:', a: "No, that's wrong.", w: ["No, that's right.", "Yes, that's wrong.", "No, it's great."] },
  { q: 'Welches Wort ist richtig geschrieben?', a: 'Monday', w: ['monday', 'Mondai', 'Mundey'] },
  { q: 'Welcher Buchstabe wird in "wrong" NICHT gesprochen?', a: 'w', w: ['r', 'o', 'g'] },
  { q: 'I ___ see a river on the map.', a: 'can', w: ['cans', 'am', 'is'] },
  { q: '"Lass uns nach England fahren." heißt:', a: "Let's go to England.", w: ['Let go to England.', "Let's to England go.", 'Go we to England.'] },
  { q: '"viele Bücher" heißt:', a: 'lots of books', w: ['lot books', 'lots book', 'many of book'] },
  { q: 'Welcher Tag kommt nach Tuesday?', a: 'Wednesday', w: ['Thursday', 'Monday', 'Friday'] },
  { q: 'Welcher Tag kommt vor Sunday?', a: 'Saturday', w: ['Monday', 'Friday', 'Thursday'] },
  { q: '"am Montag" heißt auf Englisch:', a: 'on Monday', w: ['in Monday', 'at Monday', 'am Monday'] },
  { q: 'Silky is ___ the sea. (im Meer)', a: 'in', w: ['on', 'at', 'of'] },
  { q: 'I like ___ colour red.', a: 'the', w: ['a', 'an', 'it'] },
];
export const bookGrammar = () => pick(BOOK_GRAMMAR);

// --- Halloween: Satzbau, Lesetext, "Who am I?" ----------------------------------

const SENTENCES = [
  { words: 'October – in – Halloween – is', a: 'Halloween is in October.', w: ['October is in Halloween.', 'In October Halloween is.', 'Halloween October is in.'] },
  { words: 'scary – on – wear – Children – costumes – Halloween', a: 'Children wear scary costumes on Halloween.', w: ['Costumes wear scary children on Halloween.', 'Children scary wear costumes on Halloween.', 'On children wear scary costumes Halloween.'] },
  { words: 'are – fifty – under – There – spiders – bed – my', a: 'There are fifty spiders under my bed.', w: ['There fifty are spiders under my bed.', 'Under there are fifty my bed spiders.', 'There are my spiders under fifty bed.'] },
  { words: 'people – films – on – Many – watch – Halloween – scary', a: 'Many people watch scary films on Halloween.', w: ['Many people scary watch films on Halloween.', 'Watch many people scary films on Halloween.', 'Many people watch on Halloween films scary.'] },
  { words: "is – A – pumpkin – with – a – Jack o'lantern – face – scary – a", a: "A Jack o'lantern is a pumpkin with a scary face.", w: ["A Jack o'lantern a pumpkin is with a scary face.", "A scary face is with a Jack o'lantern pumpkin.", "A Jack o'lantern is a scary with a pumpkin face."] },
  { words: 'Silky – near – is – the – boat', a: 'Silky is near the boat.', w: ['Silky near is the boat.', 'Is near Silky the boat.', 'The boat near is Silky.'] },
  { words: 'two – There – boys – are – in – boat – the', a: 'There are two boys in the boat.', w: ['There two are boys in the boat.', 'In the boat two there are boys.', 'There are boys two in the boat.'] },
  { words: 'I – colour – like – the – red', a: 'I like the colour red.', w: ['I the colour like red.', 'Like I the red colour.', 'I like red the colour.'] },
  { words: 'see – I – a – can – castle', a: 'I can see a castle.', w: ['I see can a castle.', 'Can I a castle see.', 'I a castle can see.'] },
];
export function sentenceOrder() {
  const s = pick(SENTENCES);
  return { q: `Bring die Wörter in die richtige Reihenfolge: ${s.words}`, a: s.a, w: s.w };
}

const READING = [
  { q: 'Halloween is on the 31st of ...', a: 'October', w: ['May', 'December', 'March'] },
  { q: 'Halloween is a time for costumes, games and ...', a: 'candy', w: ['homework', 'snow', 'school'] },
  { q: "What is a Jack o'lantern?", a: 'a pumpkin with a scary face', w: ['a scary film', "a witch's hat", 'a black cat'] },
  { q: 'On Halloween, children go ...', a: 'trick-or-treating', w: ['swimming', 'to school', 'skiing'] },
  { q: 'People like to carve ...', a: 'pumpkins', w: ['apples', 'books', 'boats'] },
  { q: '"Süßes oder Saures!" heißt auf Englisch:', a: 'Trick or treat!', w: ['Sweet or sour!', 'Candy or cake!', 'Happy Halloween!'] },
  { q: 'On Halloween, I often wear ...', a: 'a costume', w: ['a homework', 'a pumpkin', 'a candy'] },
  { q: 'My favourite Halloween activity is ...', a: 'dressing up', w: ['dressing on', 'dress upping', 'up dressing'] },
];
export const reading = () => pick(READING);

const MONSTERS = ['witch', 'mummy', 'vampire', 'ghost', 'werewolf', 'zombie', 'skeleton', 'spider', 'pumpkin', 'bat', 'cauldron'];
const WHO = [
  ['I have got a big hat and a broomstick.', 'witch'],
  ['I am wrapped in linen.', 'mummy'],
  ['I have got two sharp teeth. My favourite food is blood.', 'vampire'],
  ['I like to scare people. I often shout "Boooohh!"', 'ghost'],
  ['I have got sharp teeth and hairy ears. I love the moon.', 'werewolf'],
  ['I am dead and alive at the same time.', 'zombie'],
  ['I am only bones. Click, clack!', 'skeleton'],
  ['I have got eight legs. I make webs.', 'spider'],
  ['I am orange. People carve a scary face into me.', 'pumpkin'],
  ['I fly at night and sleep upside down.', 'bat'],
  ['I am a big pot. Witches cook in me.', 'cauldron'],
];
export function whoAmI() {
  const [desc, a] = pick(WHO);
  return { q: `Who am I? ${desc}`, a, w: shuffle(MONSTERS.filter((m) => m !== a)).slice(0, 3) };
}

// --- Zählen im Raum (True / False) ----------------------------------------------

const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const NOUN = { pumpkin: ['pumpkin', 'pumpkins'], candle: ['candle', 'candles'], bat: ['bat', 'bats'], spider: ['spider', 'spiders'], gravestone: ['gravestone', 'gravestones'] };

// counts: { pumpkin: 3, candle: 4, ... } – was wirklich im Raum steht
export function countQuestion(counts, place = 'in this hall') {
  const kind = pick(Object.keys(counts));
  const real = counts[kind];
  const [one, many] = NOUN[kind];
  if (Math.random() < 0.5) {
    const truth = Math.random() < 0.5;
    let n = real;
    if (!truth) n = Math.max(1, real + pick([-2, -1, 1, 2]));
    if (n === real && !truth) n = real + 1;
    const stmt = n === 1 ? `There is one ${one} ${place}.` : `There are ${NUM[n]} ${many} ${place}.`;
    return { q: `Zähle genau! True or false? "${stmt}"`, a: n === real ? 'True' : 'False', w: [n === real ? 'False' : 'True'], fixed: true, tf: true };
  }
  const w = uniq([real - 1, real + 1, real + 2, real - 2, real + 3].filter((v) => v >= 1 && v <= 10), real).slice(0, 3);
  return { q: `Zähle genau! How many ${many} are there ${place}?`, a: NUM[real], w: w.map((v) => NUM[v]) };
}

// --- Binärcode (Stellenwerte 16 8 4 2 1) ----------------------------------------

export const toBits = (n) => n.toString(2).padStart(5, '0');
const fromBits = (s) => parseInt(s, 2);

export function binaryRead(candles = false) {
  const n = rnd(3, 31);
  const bits = toBits(n);
  const rev = fromBits(bits.split('').reverse().join(''));
  const w = uniq([rev, n + 1, n - 1, n + 2, n - 2, n ^ 16, n ^ 8].filter((v) => v > 0 && v < 64), n).slice(0, 3);
  const shown = candles ? bits.split('').map((b) => (b === '1' ? 'an' : 'aus')).join(' ') : bits;
  const q = candles
    ? `Die Kerzen zeigen: ${shown} (an = 1, aus = 0). Welche Zahl ist das?`
    : `Binärcode: ${bits} – welche Zahl ist das? (Stellen: 16 8 4 2 1)`;
  return { q, a: String(n), w: w.map(String) };
}

export function binaryWrite() {
  const n = rnd(3, 30);
  const bits = toBits(n);
  const w = uniq([bits.split('').reverse().join(''), toBits(n + 1), toBits(n - 1), toBits(n ^ 2), toBits(n ^ 16)], bits).slice(0, 3);
  return { q: `Wie schreibt man ${n} im Binärcode? (Stellen: 16 8 4 2 1)`, a: bits, w };
}

// --- Schriftliche Division (nur Ergebnis) ----------------------------------------

function divisionNumbers() {
  const d = Math.random() < 0.75 ? rnd(2, 9) : pick([11, 12, 15, 25]);
  let q;
  if (Math.random() < 0.4) q = rnd(1, 9) * 100 + rnd(1, 9);            // Null in der Mitte, z. B. 305
  else if (Math.random() < 0.2) q = rnd(1, 9) * 100 + rnd(1, 9) * 10;  // Null am Ende, z. B. 340
  else q = rnd(102, 999);
  if (q * d > 9999) q = Math.floor(9999 / d) - rnd(0, 30);
  return { d, q, n: q * d };
}

function divisionWrong(q) {
  const s = String(q);
  const w = [];
  if (s.includes('0')) w.push(Number(s.replace(/0/g, '')) || q + 100); // vergessene Null – typischer Fehler
  w.push(q + 1, q - 1, q + 10, q - 10, q * 10, Number(s.split('').reverse().join('')));
  return uniq(w.filter((v) => v > 0), q).slice(0, 3);
}

export function division(story = false) {
  const { d, q, n } = divisionNumbers();
  const STORIES = [
    `Hexe Kunigunde verteilt ${fmt(n)} Bonbons gerecht an ${d} Kinder. Wie viele bekommt jedes Kind?`,
    `${fmt(n)} Spinnen krabbeln in ${d} gleich großen Gruppen. Wie viele sind in jeder Gruppe?`,
    `Im Kessel sind ${fmt(n)} Gramm Kürbissuppe. Sie wird auf ${d} Teller verteilt. Wie viel Gramm pro Teller?`,
    `${fmt(n)} Fledermäuse hängen in ${d} gleich langen Reihen. Wie viele hängen in jeder Reihe?`,
  ];
  return { q: story ? pick(STORIES) : `Rechne schriftlich: ${fmt(n)} : ${d} = ?`, a: String(q), w: divisionWrong(q).map(String) };
}

// --- Mischungen ----------------------------------------------------------------

export const ENGLISH_MIX = [bookVocab, bookVocab, bookGrammar, halloweenVocab, whoAmI, sentenceOrder, reading];
export const englishRiddle = () => pick(ENGLISH_MIX)();
export const mathRiddle = () => pick([() => division(true), () => binaryRead(true), binaryWrite])();

// In Antwortoptionen umwandeln: { q, options, correct }
export function toQuestion(item) {
  const options = item.fixed ? [item.a, ...item.w] : shuffle([item.a, ...item.w.slice(0, 3)]);
  if (item.tf) options.sort((x) => (x === 'True' ? -1 : 1)); // True immer zuerst
  return { q: item.q, options, correct: options.indexOf(item.a) };
}
