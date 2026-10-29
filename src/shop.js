// Laden von Händler Bruno: Fähigkeiten und Vorräte gegen Diamanten.
// Preise und Angebot hier anpassen.

export const CATALOG = [
  { id: 'shield', name: 'Theos Schutzschild', price: 5, desc: 'Theo hält einen Schild hoch und wehrt Kastanien und Feuer ab.' },
  { id: 'strength', name: 'Felix\' Superstärke', price: 8, desc: 'Felix schiebt Felsen und reißt Büsche aus.' },
  { id: 'dig', name: 'Ferdinands Grabkraft', price: 8, desc: 'Ferdinand buddelt Tunnel, Erdwände und Schätze aus.' },
  { id: 'invis', name: 'Friedrichs Tarnzauber', price: 10, desc: 'Friedrich wird für ein paar Sekunden unsichtbar.' },
  { id: 'legs', name: 'Linos Spaghetti-Beine', price: 10, desc: 'Lino wird lang – 7 Sekunden lang gehen Angriffe unter ihm durch.' },
  { id: 'sling', name: 'Kastanien-Schleuder', price: 12, desc: 'Felix schießt Kastanien auf Gegner (B, wenn nichts im Weg ist).' },
  { id: 'shovel', name: 'Schaufelschlag', price: 12, desc: 'Ferdinand haut Gegner mit der Schaufel weg (B).' },
  { id: 'shield2', name: 'Großer Schild', price: 15, needs: 'shield', desc: 'Theos Schild hält doppelt so lange.' },
  { id: 'heart', name: 'Herzcontainer', price: 20, max: 3, desc: '+1 Herz für die ganze Gruppe (höchstens 3 Stück).' },
  { id: 'nuts', name: '10 Kastanien', price: 2, repeat: true, desc: 'Munition für Felix\' Schleuder.' },
  { id: 'potion', name: 'Heiltrank', price: 3, repeat: true, desc: 'Füllt sofort alle Herzen auf.' },
];

// Status eines Angebots für die Anzeige
export function itemState(game, item) {
  if (item.repeat) return { owned: false, label: '' };
  if (item.max) {
    const n = game.owned.heart || 0;
    return { owned: n >= item.max, label: `${n}/${item.max}` };
  }
  return { owned: !!game.owned[item.id], label: game.owned[item.id] ? 'gekauft' : '' };
}

// Kauf ausführen. Liefert eine Meldung für die Anzeige.
export function buy(game, item) {
  const st = itemState(game, item);
  if (st.owned) return { ok: false, msg: 'Das habt ihr schon!' };
  if (item.needs && !game.owned[item.needs]) return { ok: false, msg: 'Dafür braucht Theo zuerst den Schutzschild.' };
  if (game.diamonds < item.price) return { ok: false, msg: `Zu wenig Diamanten! Lerne in der Schule, dann bekommst du mehr.` };
  game.diamonds -= item.price;
  const s = game.stats;
  switch (item.id) {
    case 'heart':
      game.owned.heart = (game.owned.heart || 0) + 1;
      s.maxHearts = Math.min(12, s.maxHearts + 1);
      s.hearts = s.maxHearts;
      break;
    case 'nuts': game.ammo += 10; break;
    case 'potion': s.hearts = s.maxHearts; break;
    case 'sling': game.owned.sling = true; game.ammo = Math.max(game.ammo, 20); break;
    default: game.owned[item.id] = true;
  }
  return { ok: true, msg: `${item.name} gekauft!` };
}
