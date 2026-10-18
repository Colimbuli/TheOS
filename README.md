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
  Größen umrechnen, Rechteck, Teiler.

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
src/maps.js       Karten: Dorf, Schule, Laden, Höhle (Layout, Gegner, Gegenstände, Hinweise)
src/world.js      Tile-System, Kollision, Tile- und Objektgrafik
src/npcs.js       Figuren, Dialoge, Quest-Schritte und Hinweise
src/quiz.js       Lernaufgaben (Fragenpools + Mathe-Generator)
src/shop.js       Ladenangebot und Kauf
src/ui.js         Menüs für Schule und Laden
src/save.js       Spielstand (localStorage)
src/sprites.js    Figuren-, Gegner- und Gegenstands-Sprites
src/dialog.js     Dialogbox mit Schreibmaschinen-Effekt
src/input.js      Tastatur, Touch, Gamepad
src/audio.js      Chiptune-Soundeffekte (WebAudio)
```

Der frühere Ego-Perspektive-Prototyp (Raycaster) liegt auf dem Branch `fps-prototyp`.
