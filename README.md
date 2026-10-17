# TheOS

Abenteuer in zwei Perspektiven: Kapitel 1 top-down im Stil der GBA-Ära (questen, leveln, erkunden),
Kapitel 2 in Ego-Perspektive im Stil von Doom – kinderfreundlich, ohne Blut, Gegner zerplatzen zu Konfetti.
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

## Kapitel 2 „Die Höhle im Buttenberg“ (Ego-Perspektive)

Raycaster im Wolfenstein/Doom-Stil. Die vier Freunde sind die Slots 1–4 – wer gewählt ist, „hält“ sein Werkzeug:

| Slot | Figur | Aktion | Gebraucht für |
|---|---|---|---|
| 1 | Theo | Schild (halten) | Feuerbälle zurückwerfen – zerstört die Feuerstatue |
| 2 | Felix | Kastanien-Schleuder | Schleime/Kobolde, Felsblock schieben |
| 3 | Arne | Schaufel | Nahkampf, Erdwände durchgraben, Geheimgang |
| 4 | Friedrich | Tarnumhang | unsichtbar am Höhlentroll vorbei |

| Aktion | Tastatur/Maus | Gamepad | Touch |
|---|---|---|---|
| Laufen | W/S, A/D seitwärts | linker Stick | Steuerkreuz hoch/runter |
| Drehen | Maus (ins Bild klicken), ←/→ | rechter Stick | Wischen übers Bild, Steuerkreuz links/rechts |
| Aktion | Linksklick / Leertaste | RT / X | B |
| Benutzen (Tür, Hebel) | E | A | A |
| Figur wählen | 1–4, Q, Mausrad | LB / RB | Pfeil-Knopf |

Im Titelbild lässt sich Kapitel 2 direkt wählen.

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
src/fps/chapter2.js  Ego-Perspektive: Raycaster, Helden, Gegner, HUD
src/fps/level1.js    Höhlenlevel Kapitel 2 (Karte, Gegner, Hinweise)
src/fps/textures.js  prozedurale Wand-Texturen und Sprites
```
