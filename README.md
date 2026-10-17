# TheOS

Top-down-Abenteuer im Stil der GBA-Ära: questen, leveln, erkunden.
Alle Grafiken und Sounds sind eigene Pixel-Art bzw. per Code erzeugt – keine fremden Assets.

**Demo spielen:** https://colimbuli.github.io/TheOS/

## Kapitel 1 „Die Gefährten“

Theo will den bösen Drachen am Buttenberg besiegen – aber nicht allein.
Er muss seine besten Freunde Felix und Arne und seinen kleinen Bruder Friedrich überzeugen.

Die Gruppe läuft zusammen, wer vorne läuft, setzt seine Spezialkraft ein:

| Figur | Spezialkraft (B) | Wofür |
|---|---|---|
| Theo | Schutzschild | Kastanien (später Drachenfeuer) abwehren |
| Felix | Superstärke | Felsbrocken schieben, Büsche ausreißen |
| Arne | Löcher buddeln | Schätze ausgraben, Tunnel unter Zäunen |
| Friedrich | Unsichtbar | an der Torwache vorbeischleichen |

Quest-Kette: Kastanienprobe (Felix) → Fels vor Arnes Tür → Tunnel in Oma Hildes Garten, Tarnumhang holen
→ Mama erlaubt Friedrich mitzukommen → unsichtbar zum Torhebel → Tor zum Buttenberg.

## Steuerung

| Aktion   | Tastatur              | Gamepad             | Touch        |
|----------|-----------------------|---------------------|--------------|
| Laufen   | Pfeiltasten / WASD    | Steuerkreuz / Stick | Steuerkreuz  |
| Reden    | Leertaste / Enter / E | A (unten)           | A            |
| Spezialkraft | J / K / X         | B / X               | B            |
| Anführer wechseln | Q / Tab      | Y / L / R           | Pfeil-Knopf  |

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
src/npcs.js       Bewohner, Gefährten, Dialoge und Quest-Schritte
src/sprites.js    Figuren-Sprites (lauflängenkodierte Pixel-Maps)
src/dialog.js     Dialogbox mit Schreibmaschinen-Effekt
src/input.js      Tastatur, Touch, Gamepad
src/audio.js      Chiptune-Soundeffekte (WebAudio)
```
