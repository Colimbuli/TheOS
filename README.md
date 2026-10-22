# TheOS – Theo und der Drache vom Buttenberg

Top-down-Abenteuer im Stil der GBA-Ära: questen, leveln, erkunden – und nebenbei lernen.
Alle Grafiken und Sounds sind eigene Pixel-Art bzw. per Code erzeugt – keine fremden Assets.

**Spielen:** https://colimbuli.github.io/TheOS/

## Die Idee

Theo will den bösen Drachen am Buttenberg besiegen – zusammen mit seinen besten Freunden Felix und Arne
und seinem kleinen Bruder Friedrich. Die Gruppe läuft zusammen, wer vorne läuft, setzt seine Spezialkraft ein.

**Alle Fähigkeiten müssen im Laden gekauft werden.** Bezahlt wird mit Diamanten – die gibt es in der Schule
für richtig gelöste Aufgaben in Deutsch, Englisch, Geographie und Mathe (Klasse 5, Gymnasium BW).

| Figur | Grundfähigkeit | Extra |
|---|---|---|
| Theo | Schutzschild – wehrt Kastanien ab, wirft Feuer zurück | Großer Schild (hält länger) |
| Felix | Superstärke – Felsen schieben, Büsche ausreißen | Kastanien-Schleuder |
| Arne | Graben – Tunnel, Erdwände, Schätze | Schaufelschlag |
| Friedrich | Tarnzauber – unsichtbar an Wachen vorbei | – |

## Kapitel

**1 – Die Gefährten (Dorf Lindental):** Kastanienprobe bei Felix → Fels vor Arnes Tür → Tunnel in Oma Hildes
Garten, Tarnumhang holen → Mama erlaubt Friedrich mitzukommen → unsichtbar an Wache Konrad vorbei zum Torhebel.

**2 – Die Höhle im Buttenberg:** Erdwand (Arne) → Schleimhalle → Felsblock (Felix) → Schlüssel bei den
Feuer-Kobolden → Drachenstatue (Theo wirft ihr Feuer zurück) → Höhlentroll (Friedrich schleicht vorbei)
→ Hebel → Treppe in die Tiefe. Dazu ein Geheimraum mit Kristallen. Kein Game Over – wer erschöpft ist,
startet am letzten Rastplatz.

**3 – Das Spukhaus am Buttenberg (Halloween-Nacht):** Jede Tür öffnet sich nur mit gelösten Rätseln:

| Tür | Wächter | Rätsel |
|---|---|---|
| Gartentor | Hexe Kunigunde | Schriftliche Division als Textaufgabe (2 richtig) |
| Haustür | Gespenst Bodo | Halloween-Englisch: Who am I?, Vokabeln, Lesetext, Satzbau (2 richtig) |
| Halle → Bibliothek | Gespenst Zora | Zählen in der Halle: True/False, How many …? (2 richtig) |
| Bibliothek → Kerzenraum | Prof. Plumps | Lehrbuch-Englisch „Here we go“ (3 richtig) – vorher Truhe wegschieben (Felix) |
| Kerzenraum → Thronsaal | Bit | Binärcode: fünf Kerzen (16 8 4 2 1) so anzünden, dass die Zahl an der Tür entsteht |
| Turmtür | Graf Kürbis | Gemischt: Division, Binärcode, Englisch (3 richtig) → Mondschlüssel |

Falsche Antworten kosten nichts – es kommt einfach eine neue Frage (die Lösung wird nicht verraten).

Der Spielstand wird automatisch im Browser gespeichert („Weiterspielen“ im Titelbild).

## Steuerung

| Aktion | Tastatur | Gamepad | Touch |
|---|---|---|---|
| Laufen | Pfeiltasten / WASD | Steuerkreuz / Stick | Steuerkreuz |
| Reden, Benutzen | Leertaste / Enter / E | A (unten) | A |
| Fähigkeit | J / K / X | B / X | B |
| Anführer wechseln | Q / Tab | Y / L / R | Pfeil-Knopf |

In Schule und Laden: hoch/runter wählen, A bestätigen, B zurück – oder direkt antippen.

## Lernaufgaben ergänzen

Alles in `src/quiz.js`:
- **Deutsch / Englisch / Geographie:** eine Zeile `{ q: 'Frage', a: 'richtig', w: ['falsch', 'falsch', 'falsch'] }`
  in den passenden Pool (`DE`, `EN`, `GEO`) schreiben. Vokabeln in `VOCAB`, Hauptstädte in `LAENDER` / `EUROPA`.
- **Mathe** wird zufällig erzeugt (`MATH`-Liste): Rechnen, Punkt vor Strich, Klammern, ganze Zahlen, Runden,
  Größen umrechnen, Rechteck, Teiler – dazu schriftliche Division und Binärzahlen.

In `src/halloween.js` (Spukhaus und Schule):
- `BOOK_VOCAB` – Vokabeln aus dem Lehrbuch („Here we go“, S. 174/175), `BOOK_GRAMMAR` – Sätze/Grammatik dazu
- `HALLOWEEN_VOCAB`, `WHO` („Who am I?“), `SENTENCES` (Wörter ordnen), `READING` (Lesetext)
- `division()` – teilt ohne Rest, oft mit Null im Ergebnis (typischer Fehler als falsche Antwort)
- `binaryRead()` / `binaryWrite()` – 5 Stellen (16 8 4 2 1)

Preise und Angebot des Ladens stehen in `src/shop.js`.

## In Perchance einbinden

Im HTML-Panel der Perchance-Seite:

```html
<style>
  html, body { margin: 0; padding: 0; background: #0b0f1a; height: 100%; overflow: hidden; }
  #theos { position: fixed; inset: 0; width: 100%; height: 100%; border: 0; display: block; }
</style>
<iframe id="theos" src="https://colimbuli.github.io/TheOS/"
  allow="gamepad; fullscreen; autoplay" allowfullscreen></iframe>
<script>document.getElementById('theos').addEventListener('load', e => e.target.focus());</script>
```

## Lokal starten

ES-Module brauchen einen Webserver (Doppelklick auf `index.html` reicht nicht):

```bash
python -m http.server 8000
# → http://localhost:8000
```

## Aufbau

```
index.html        Seite, Touch-Steuerung, Styles
src/main.js       Spielschleife, Gruppe, Fähigkeiten, Kampf, Kartenwechsel, HUD
src/maps.js       Karten: Dorf, Schule, Laden, Höhle, Spukhaus (Layout, Gegner, Gegenstände, Hinweise)
src/world.js      Tile-System, Kollision, Tile- und Objektgrafik
src/npcs.js       Figuren, Dialoge, Quest-Schritte und Hinweise
src/quiz.js       Lernaufgaben der Schule (Fragenpools + Mathe-Generator)
src/halloween.js  Halloween-, Lehrbuch-, Binär- und Divisionsaufgaben
src/shop.js       Ladenangebot und Kauf
src/ui.js         Menüs für Schule, Laden und Rätseltüren
src/save.js       Spielstand (localStorage)
src/sprites.js    Figuren-, Gegner- und Gegenstands-Sprites
src/dialog.js     Dialogbox mit Schreibmaschinen-Effekt
src/input.js      Tastatur, Touch, Gamepad
src/audio.js      Chiptune-Soundeffekte (WebAudio)
```

Der frühere Ego-Perspektive-Prototyp (Raycaster) liegt auf dem Branch `fps-prototyp`.
