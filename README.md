# TheOS – Theo und der Drache vom Buttenberg

> **Based on the Pokemon Gen 1 Recompilation Project by BOIS CLUB GAMES, LLC
> (https://github.com/bryanthaboi/gen1recomp)** – die 3D-Kippansicht ist eine Portierung von dessen
> `Tilt.lua`. TheOS steht unter der GPLv3 mit den Zusatzbedingungen von gen1recomp, siehe `LICENSE.md`.

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

**4 – Das Tal der Trolle** (nach Theos Karten): Eine Insel, durch Klippen in Zonen geteilt – nur die Höhlen
A–E verbinden sie über die Unterwelt.

| Ort | Was passiert |
|---|---|
| Süden, Höhle A | Eingang; Schwertwächter (Rüstung – nur das Schwert hilft) |
| Unterwelt A → B | Schleime und Fledermäuse |
| Talmitte (Höhlen B, D) | Suchscheinwerfer dreht sich – wer ins Licht gerät, löst Alarm aus und Wächter kommen. Friedrich schleicht unsichtbar zur Schatztruhe: **das Schwert** |
| Unterwelt D | Schwertwächter, Schlüsselraum mit Feuerspuckern; Fels (Felix) zu E, Erdmauer (Arne) zu C, zwei Kristallkammern |
| Westen, Höhle E | Hebel öffnet das Ausgangsgitter |
| Osten, Höhle C | Bombenwerfer – seine Bomben sprengen die rissigen Felsen (oder Theo wirft sie zurück); Felsentür mit Feuerspuck braucht den Schlüssel |
| Norden | Troll Grummel: Felsbrocken mit dem Schild zurückwerfen → benommen → mit dem Schwert angreifen |

Theo greift mit **B** an, wenn ein Gegner direkt vor ihm steht – sonst hebt er den Schild.

Der Spielstand wird automatisch im Browser gespeichert („Weiterspielen“ im Titelbild).
Im Spiel öffnet **Esc / P** (Gamepad: Start, Touch: ☰) das Menü: 3 Speicherplätze und ein **Speichercode**
zum Abschreiben (auch als Link: `?code=XXXX-XXXX-XXXX-XXXX-XXXX`). Über **Kapitel wählen** im Titelbild
startet man jedes Kapitel direkt – mit allen Fähigkeiten, die man bis dahin hätte.

## 3D-Ansicht

Die Welt wird wie ein Diorama nach hinten gekippt (HD-2D-Look): Der Boden liegt perspektivisch,
Häuser, Bäume, Zäune und Figuren stehen aufrecht und werden zum Horizont hin kleiner. Stufen
**Aus / 15° / 35° / 50°** (Standard 35°) – umschalten mit **T** oder im Pause-Menü; die Einstellung
merkt sich der Browser. Die Kippung wirkt nur auf die Darstellung, nicht auf Bewegung und Kollision.

Die Projektion ist eine Portierung von `src/render/Tilt.lua` aus dem gen1recomp-Projekt (siehe oben
und `LICENSE.md`). Weil der Browser hier ohne Shader arbeitet, wird der Boden zeilenweise exakt
projiziert (`Tilt.warpGround` in `src/tilt.js`).

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
  #theos { position: fixed; inset: 0 0 18px 0; width: 100%; height: calc(100% - 18px); border: 0; display: block; }
  #credit { position: fixed; left: 0; right: 0; bottom: 0; height: 18px; font: 11px sans-serif; color: #b8c8e8;
    text-align: center; line-height: 18px; background: #0b0f1a; }
  #credit a { color: #88c8ff; }
</style>
<iframe id="theos" src="https://colimbuli.github.io/TheOS/"
  allow="gamepad; fullscreen; autoplay" allowfullscreen></iframe>
<div id="credit">Based on the Pokemon Gen 1 Recompilation Project by BOIS CLUB GAMES, LLC
  (<a href="https://github.com/bryanthaboi/gen1recomp" target="_blank">github.com/bryanthaboi/gen1recomp</a>)</div>
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
src/maps.js       Karten: Dorf, Schule, Laden, Höhle, Spukhaus, Tal der Trolle + Unterwelt
src/world.js      Tile-System, Kollision, Tile- und Objektgrafik
src/npcs.js       Figuren, Dialoge, Quest-Schritte und Hinweise
src/quiz.js       Lernaufgaben der Schule (Fragenpools + Mathe-Generator)
src/halloween.js  Halloween-, Lehrbuch-, Binär- und Divisionsaufgaben
src/shop.js       Ladenangebot und Kauf
src/ui.js         Menüs: Schule, Laden, Rätseltüren, Pause/Speichern, Kapitelauswahl
src/save.js       Spielstände (localStorage, 3 Plätze) und Speichercode
src/sprites.js    Figuren-, Gegner- und Gegenstands-Sprites
src/dialog.js     Dialogbox mit Schreibmaschinen-Effekt
src/input.js      Tastatur, Touch, Gamepad
src/audio.js      Chiptune-Soundeffekte (WebAudio)
src/tilt.js       3D-Kippansicht (portiert aus gen1recomp, GPLv3)
```

Der frühere Ego-Perspektive-Prototyp (Raycaster) liegt auf dem Branch `fps-prototyp`.
