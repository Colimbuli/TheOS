// Lernaufgaben für Kapitel 5 (Der Bergpfad): Berge, Höhen und Wandern – Klasse 5, Gymnasium BW.
// Liefert Rohfragen { q, a, w[] } wie in quiz.js / halloween.js.

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const fmt = (n) => n.toLocaleString('de-DE');

const BERGE = [
  { q: 'Wie heißt die Spitze eines Berges?', a: 'Gipfel', w: ['Sattel', 'Hang', 'Fuß'] },
  { q: 'Eine niedrige Stelle zwischen zwei Gipfeln, über die oft ein Weg führt, heißt ...', a: 'Pass', w: ['Tal', 'Grat', 'Gletscher'] },
  { q: 'Ein langsam fließender Eisstrom im Hochgebirge heißt ...', a: 'Gletscher', w: ['Lawine', 'Geröll', 'Moräne'] },
  { q: 'Oberhalb der Baumgrenze wachsen ...', a: 'keine Bäume mehr', w: ['nur Tannen', 'nur Laubbäume', 'besonders viele Bäume'] },
  { q: 'Linien auf der Karte, die gleich hohe Punkte verbinden, heißen ...', a: 'Höhenlinien', w: ['Breitengrade', 'Längengrade', 'Grenzlinien'] },
  { q: 'Liegen Höhenlinien auf der Karte sehr eng beieinander, ist das Gelände ...', a: 'steil', w: ['flach', 'nass', 'bewaldet'] },
  { q: 'Höhenangaben beziehen sich auf die Höhe über dem ...', a: 'Meeresspiegel', w: ['Erdmittelpunkt', 'Bodensee', 'Mond'] },
  { q: 'Höchster Berg der Alpen?', a: 'Mont Blanc', w: ['Zugspitze', 'Matterhorn', 'Feldberg'] },
  { q: 'Höchster Berg Deutschlands?', a: 'Zugspitze', w: ['Feldberg', 'Watzmann', 'Brocken'] },
  { q: 'Höchster Berg Baden-Württembergs?', a: 'Feldberg', w: ['Zugspitze', 'Belchen', 'Hohenzollern'] },
  { q: 'In welchem Gebirge liegt der Feldberg?', a: 'Schwarzwald', w: ['Schwäbische Alb', 'Alpen', 'Harz'] },
  { q: 'Wie hoch ist die Zugspitze ungefähr?', a: 'knapp 3.000 m', w: ['etwa 1.500 m', 'etwa 8.800 m', 'etwa 500 m'] },
  { q: 'Höchster Berg der Erde?', a: 'Mount Everest', w: ['Mont Blanc', 'Kilimandscharo', 'Zugspitze'] },
  { q: 'In welchem Gebirge liegt der Mount Everest?', a: 'Himalaya', w: ['Alpen', 'Anden', 'Rocky Mountains'] },
  { q: 'Ein Berg, aus dem Lava kommen kann, heißt ...', a: 'Vulkan', w: ['Gletscher', 'Hügel', 'Krater-See'] },
  { q: 'Eine Schneemasse, die einen Hang hinabstürzt, heißt ...', a: 'Lawine', w: ['Gletscher', 'Geröll', 'Murmel'] },
  { q: 'Wo ist es auf einem Berg meistens am kältesten?', a: 'am Gipfel', w: ['im Tal', 'am Fuß', 'überall gleich'] },
  { q: 'Welches Tier lebt in den Alpen?', a: 'Murmeltier', w: ['Känguru', 'Kamel', 'Pinguin'] },
  { q: 'Auf physischen Karten sind Gebirge meist ...', a: 'braun', w: ['grün', 'blau', 'gelb'] },
  { q: 'Der Kompass zeigt mit der Nadel nach ...', a: 'Norden', w: ['Süden', 'Osten', 'Westen'] },
];

const DEUTSCH = [
  { q: 'Welches Wort ist ein Nomen?', a: 'Gipfel', w: ['klettern', 'steil', 'oben'] },
  { q: 'Welches Wort ist ein Verb?', a: 'klettern', w: ['Berg', 'hoch', 'Katze'] },
  { q: 'Welches Wort ist ein Adjektiv?', a: 'steil', w: ['Pfad', 'springen', 'unter'] },
  { q: 'Steigere: hoch – höher – ...', a: 'am höchsten', w: ['am hochsten', 'am höhesten', 'am meisten hoch'] },
  { q: 'Präteritum von "springen": Die Katze ...', a: 'sprang', w: ['springte', 'sprung', 'gesprungen'] },
  { q: 'Präteritum von "schleichen": Friedrich ...', a: 'schlich', w: ['schleichte', 'schlachte', 'geschlichen'] },
  { q: 'Perfekt von "klettern": Wir ...', a: 'sind geklettert', w: ['haben geklettert', 'sind gekletter', 'kletterten'] },
  { q: 'Welches Wort wird großgeschrieben?', a: 'das Klettern', w: ['wir klettern', 'kletternd', 'zu klettern'] },
  { q: 'Richtig geschrieben?', a: 'die Schlucht', w: ['die Schlugt', 'die Schluht', 'die Schluchd'] },
  { q: 'Im Satz "Die Katze springt über die Schlucht." ist das Subjekt ...', a: 'Die Katze', w: ['springt', 'über die Schlucht', 'die Schlucht'] },
  { q: 'Im Satz "Jelly fängt eine Maus." ist das Akkusativobjekt ...', a: 'eine Maus', w: ['Jelly', 'fängt', 'Jelly fängt'] },
  { q: 'Welches Satzzeichen gehört ans Ende? "Wo ist die Katze"', a: '?', w: ['.', '!', ','] },
];

// Höhen, Wege und Zeiten am Berg
const MATHE = [
  () => { const a = rnd(12, 29) * 100 + rnd(0, 9) * 10, b = rnd(3, 11) * 100 + rnd(0, 9) * 10; return { q: `Der Gipfel liegt auf ${fmt(a)} m, das Tal auf ${b} m. Wie groß ist der Höhenunterschied?`, n: a - b, u: ' m', w: [a + b, a - b + 100, a - b - 10] }; },
  () => { const s = rnd(2, 6), r = 300; return { q: `Eine Wandergruppe steigt ${r} Höhenmeter pro Stunde. Wie lange braucht sie für ${fmt(s * r)} Höhenmeter?`, n: s, u: ' h', w: [s + 1, s * 2, s - 1 || s + 2] }; },
  () => { const cm = rnd(2, 9); return { q: `Maßstab 1:50.000 – auf der Karte sind es ${cm} cm. Wie weit ist das in echt?`, n: cm * 500, u: ' m', w: [cm * 50, cm * 5000, cm * 50000] }; },
  () => { const a = rnd(3, 9), b = rnd(2, 8), c = rnd(2, 7); return { q: `Der Pfad hat drei Abschnitte: ${a} km, ${b} km und ${c} km. Wie lang ist er insgesamt?`, n: a + b + c, u: ' km', w: [a + b + c + 1, a * b, a + b] }; },
  () => { const t = rnd(2, 8), g = rnd(4, 9); return { q: `Unten im Tal sind es ${t + g} °C, oben am Gipfel ist es ${g + t * 2} Grad kälter. Wie warm ist es oben?`, n: t + g - (g + t * 2), u: ' °C', w: [t + g + (g + t * 2), -(t + g) + (g + t * 2), t + g - (g + t * 2) + 2], neg: true }; },
  () => { const n = rnd(3, 9), d = pick([2, 3, 4, 5]); return { q: `${n * d} Diamanten werden gerecht auf ${d} Kinder verteilt. Wie viele bekommt jedes?`, n, u: '', w: [n + 1, n * 2, n - 1 || n + 2] }; },
  () => { const h = rnd(1, 3), m = pick([15, 20, 30, 40, 45]); return { q: `Der Aufstieg dauert ${h} h ${m} min. Wie viele Minuten sind das?`, n: h * 60 + m, u: ' min', w: [h * 100 + m, h * 60 + m + 10, h * 10 + m] }; },
  () => { const k = rnd(3, 8), s = rnd(4, 9); return { q: `Felix trägt ${k} Steine zu je ${s} kg. Wie schwer ist das zusammen?`, n: k * s, u: ' kg', w: [k + s, k * s + s, k * s - k] }; },
];

function mathQuestion() {
  const g = pick(MATHE)();
  const wrong = [...new Set(g.w.filter((v) => v !== g.n && (g.neg || v >= 0)))];
  for (let d = 1; wrong.length < 3; d++) for (const v of [g.n + d, g.n - d]) if (wrong.length < 3 && !wrong.includes(v) && v !== g.n && (g.neg || v >= 0)) wrong.push(v);
  const show = (v) => (Math.abs(v) >= 1000 ? fmt(v) : String(v)) + g.u;
  return { q: g.q, a: show(g.n), w: wrong.slice(0, 3).map(show) };
}

// Gemischte Frage für das Zahlenschloss an Jellys Käfig
export function mountainQuestion() {
  const r = Math.random();
  if (r < 0.4) return pick(BERGE);
  if (r < 0.75) return mathQuestion();
  return pick(DEUTSCH);
}

export const POOLS = { BERGE, DEUTSCH, MATHE };
