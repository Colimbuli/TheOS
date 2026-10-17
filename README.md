# TheOS

Top-down-Abenteuer im Stil der GBA-Ära: questen, leveln, erkunden.
Alle Grafiken und Sounds sind eigene Pixel-Art bzw. per Code erzeugt – keine fremden Assets.

**Demo spielen:** https://colimbuli.github.io/TheOS/

## Demo „Das Dorf Lindental“

- Dorf mit 4 Bewohnern: Oma Hilde, Händlerin Lotte, Tim, Wache Konrad
- Quest: Finde Flocke, die Katze, und bring sie zu Oma Hilde
- Büsche mit dem Stock schlagen gibt Erfahrung → Level-Up, mehr Herzen
- Nach der Quest öffnet sich das Tor zum Flüsterwald (Demo-Ende)

## Steuerung

| Aktion   | Tastatur              | Gamepad          | Touch      |
|----------|-----------------------|------------------|------------|
| Laufen   | Pfeiltasten / WASD    | Steuerkreuz / Stick | Steuerkreuz |
| Reden    | Leertaste / Enter / E | A (unten)        | A          |
| Schlagen | J / K / X             | B / X            | B          |

## In Perchance einbinden

Im HTML-Panel der Perchance-Seite:

```html
<iframe src="https://colimbuli.github.io/TheOS/"
  style="width:100%;aspect-ratio:3/2;border:0;display:block"
  allow="gamepad; fullscreen; autoplay"></iframe>
```

Hinweis: Perchance läuft selbst in einem iframe. Ob das Gamepad dort durchgereicht wird, hängt von Perchance ab –
direkt über die GitHub-Pages-URL funktioniert es sicher. Für Tastatur einmal ins Spielbild klicken.

## Lokal starten

ES-Module brauchen einen Webserver (Doppelklick auf `index.html` reicht nicht):

```bash
python -m http.server 8000
# → http://localhost:8000
```

## Aufbau

```
index.html        Seite, Touch-Steuerung, Styles
src/main.js       Spielschleife, Spieler, Kamera, Rendering, HUD
src/world.js      Karte, Kollision, Tiles und Objekte (Häuser, Brunnen, Stand)
src/npcs.js       Bewohner und Dialoge, Quest-Logik
src/sprites.js    Figuren-Sprites (lauflängenkodierte Pixel-Maps)
src/dialog.js     Dialogbox mit Schreibmaschinen-Effekt
src/input.js      Tastatur, Touch, Gamepad
src/audio.js      Chiptune-Soundeffekte (WebAudio)
```
