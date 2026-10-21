# Lieddating – Anleitung

## Die drei Seiten

| Datei | Wer | Wofür |
|---|---|---|
| `index.html` | Singles am Handy (per QR-Code) | Einchecken (Vorname + Anfangsbuchstabe Nachname, „als Frau/Mann anmelden“), 50 Songs swipen, danach „Handy weg!“ |
| `leinwand.html` | Laptop am Beamer | Einlass mit großem QR-Code, danach die Duett-Enthüllungen |
| `moderation.html` | du (Handy oder Laptop) | Duette ziehen, zurücknehmen, Leute auf „abwesend“ setzen, Setlist, Herzen pro Song |

Die Handys der Singles werden nach dem Swipen nicht mehr gebraucht. Alles Weitere passiert auf der Leinwand.

**Tasten auf der Leinwand:** Leertaste = nächstes Duett · Q = Einlass-Ansicht an/aus · F = Vollbild.
Du kannst Duette also direkt am Beamer-Laptop ziehen oder über die Moderationsseite am Handy.

## 1. Erst mal lokal ausprobieren (Demo-Modus)

Ohne Firebase läuft alles im Demo-Modus: Die Daten bleiben in einem Browser, und die Tabs synchronisieren sich über den Browserspeicher.
Wichtig: Per Doppelklick (`file://…`) klappt das in **Firefox nicht**, weil Firefox jede lokale Datei isoliert. Stattdessen:

- **Einfachster Weg:** Im Ordner `lieddating` ein Terminal öffnen, `python3 -m http.server 8000` eingeben und dann im Browser
  `http://localhost:8000/moderation.html`, `…/leinwand.html` und `…/index.html` öffnen.
- Oder den Ordner gleich bei Netlify hochladen (Schritt 3). Der Demo-Modus funktioniert dort genauso, solange alles im selben Browser läuft.
- In Chrome funktioniert auch der Doppelklick.

In der Moderation mit „+ 20 Test-Singles“ ein paar Leute erzeugen und Duette ziehen.

## 2. Firebase einrichten (einmalig, ca. 10 Minuten, kostenlos)

1. Auf <https://console.firebase.google.com> ein neues Projekt anlegen, z. B. „lieddating“. Google Analytics kannst du ausschalten.
2. Links unter **Build → Realtime Database** auf „Datenbank erstellen“ klicken. Als Standort **Belgien (europe-west1)** wählen und im **gesperrten Modus** starten.
3. Im Reiter **Regeln** diesen Text einfügen und veröffentlichen:
   ```json
   {
     "rules": {
       "events": { "$ev": { ".read": true, ".write": true } },
       ".read": false,
       ".write": false
     }
   }
   ```
4. Unter **Projekteinstellungen (Zahnrad) → Allgemein → Meine Apps** eine **Web-App** (Symbol `</>`) registrieren. Hosting musst du dabei nicht anhaken.
5. Den angezeigten `firebaseConfig`-Block in `config.js` bei `window.FIREBASE_CONFIG = …` einfügen.
   Wichtig: `databaseURL` muss drinstehen. Falls sie fehlt, steht sie oben auf der Realtime-Database-Seite (endet auf `firebasedatabase.app`).

Der kostenlose Tarif erlaubt 100 gleichzeitige Verbindungen, das reicht locker für 40 Handys, Leinwand und Moderation.

## 3. Online stellen

Am einfachsten geht das mit **Netlify Drop**:

1. Kostenlosen Account auf <https://app.netlify.com> anlegen. Ohne Account verschwindet die Seite nach kurzer Zeit wieder.
2. Auf <https://app.netlify.com/drop> den ganzen Ordner `lieddating` ins Browserfenster ziehen.
3. Unter „Site configuration“ kannst du den Namen ändern, z. B. `lieddating.netlify.app`.
4. Nach Änderungen (z. B. an `songs.js` oder `config.js`) den Ordner unter „Deploys“ erneut hineinziehen.

Alternativ gehen GitHub Pages oder Firebase Hosting genauso, weil es nur statische Dateien sind.

## 4. Vor dem Abend

- **Probe:** Mit echtem Handy den QR-Code auf der Leinwand scannen, swipen und in der Moderation Test-Singles dazunehmen.
  Danach **„Alles zurücksetzen“**, oder in `config.js` die `eventId` ändern (z. B. `"abend-2"`), dann startet alles leer.
- **Empfang prüfen:** Die Handys laufen über mobile Daten. Die App braucht kaum Daten, aber ohne Netz geht es nicht.
- **Songs:** Die Liste steht in `songs.js`: aktuell 52 aktive Songs und 12 Reserve-Songs. Zum Tauschen eine Zeile verschieben.
  Nach dem Einlass nicht mehr ändern, sonst passen die Herzen nicht mehr zur Liste.
- **Karaoke-Versionen:** Für jeden Song vorab eine Instrumental- oder Karaoke-Version bereitlegen.

## 5. Am Abend

1. Laptop am Beamer: `…/leinwand.html` öffnen und mit F auf Vollbild schalten. Der Einlass mit QR-Code erscheint.
2. Dein Handy: `…/moderation.html`. Diesen Link nicht weitergeben, er ist nicht passwortgeschützt.
3. Wenn alle geswipt haben: Leertaste (oder „Nächstes Duett ziehen“). Die Leinwand zeigt erst den Song, dann das Paar.
4. Jemand ist gerade auf Toilette? → **„Neu ziehen“**. Jemand ist gegangen? → **„abwesend“** oder ✕.
5. Mit Q kommst du zwischendurch zurück zur Einlass-Ansicht, zum Beispiel für Nachzügler. Der kleine QR-Code unten ist aber immer sichtbar.

## Wenn etwas schiefgeht

**Jemand swipt und schließt den Browser.** Beim erneuten Öffnen derselben Seite auf demselben Handy geht es genau dort weiter, wo die Person aufgehört hat (Stand liegt im Browserspeicher). An die Datenbank gehen die Herzen erst beim Abschluss des Swipens. Wer das Handy wechselt oder den Browserspeicher löscht, fängt von vorne an.

**Jemand checkt ein und verschwindet.** Der Eintrag bleibt als „swipt“ stehen und zählt oben bei „X swipen noch“ mit. Er blockiert nichts, weil nur fertige Leute in den Topf kommen. Trotzdem am besten mit ✕ entfernen, damit die Anzeige stimmt.

**Doppelter Eintrag.** Checkt jemand ein zweites Mal ein (anderes Handy, Browserspeicher gelöscht), entsteht ein zweiter Eintrag. Beim Einchecken warnt die App, wenn Vorname und Buchstabe schon vergeben sind. Den alten Eintrag mit ✕ löschen.

**Internet fällt aus.** Die geöffneten Seiten laufen weiter, weil jede ihren letzten Stand im Speicher hat. Aber: Leinwand und Moderation gleichen sich während der Störung **nicht** mehr ab. Deshalb in dieser Zeit die Duette **mit der Leertaste direkt auf der Leinwand** ziehen, dann stimmt zumindest das Bild. Sobald die Verbindung zurück ist, wird alles nachgesendet.
Wichtig: **keine Seite neu laden**, solange kein Netz da ist. Die Seiten liegen auf GitHub und lassen sich ohne Internet nicht erneut öffnen. Deshalb Leinwand und Moderation früh öffnen und offen lassen.
Oben in der Leinwand erscheint bei einer Störung ein rotes „Keine Verbindung“.

**Nachzügler.** Wer später kommt, scannt den QR-Code (klein unten auf der Leinwand, groß über die Taste Q), swipt und ist ab dann im Topf. Die Planzeile in der Moderation rechnet sofort neu.

**Jemand soll einspringen oder zwei Bestimmte sollen zusammen singen.** In der Moderation die Namen in der Liste antippen (2 oder 3 Personen) und auf „Diese singen als Nächstes“ gehen. Erlaubt sind auch Leute, die schon gesungen haben. Den Song sucht die App passend zu den Herzen aus.

## Wie das Matching funktioniert

- Jede:r gibt mindestens 10 Herzen (in `config.js` unter `minLikes` einstellbar). Wer weniger gibt, bekommt die abgelehnten Songs noch einmal gezeigt.
- Pro Duett nimmt der Algorithmus zuerst die Person, die die **wenigsten** Match-Möglichkeiten hat. Ihr Partner und der Song werden so gewählt, dass **alle anderen weiterhin ein Match haben können**. Jeder Song wird nur einmal gesungen.
- **Jede:r singt genau einmal.** Niemand wird unfreiwillig ein zweites Mal aufgerufen.
- **Ungleiche Anzahl:** Der Überhang singt gleichgeschlechtliche Duette. Bei 22 Männern und 18 Frauen gibt es 18 gemischte und 2 Männer-Duette, zusammen 20 Auftritte. Diese Duette werden über den Abend verteilt, nicht ans Ende gehängt.
- **Ungerade Gesamtzahl:** Der letzte Auftritt wird ein **Trio**. Bei 21 Männern und 18 Frauen also 18 gemischte Duette und zum Schluss ein Trio aus drei Männern.
- **Typ steuern:** In der Moderation kannst du vor jedem Zug „Gemischt“, „Frauen“, „Männer“ oder „Trio“ erzwingen. Nach dem Zug steht es wieder auf „Automatisch“. Die Zeile darunter zeigt, wie der Abend gerade geplant ist.
- Nur wenn wirklich kein gemeinsamer Song mehr frei ist, gibt es eine **Joker-Runde**: ein zufälliges Paar singt einen Song, den mindestens eine:r von beiden mochte.
- Simulation (100 Abende je Konstellation, jede:r 10 Herzen): 98–100 % der Abende ganz ohne Joker, auch bei 15 Frauen zu 25 Männern.
- Nach allen Duetten kannst du einfach weiterziehen (Zugabe-Runden). Dann kommen zuerst die dran, die am seltensten gesungen haben.

## Datenschutz

Gespeichert werden nur Vorname, Anfangsbuchstabe, Frau/Mann und die Herzen, in deiner Firebase-Datenbank in der EU.
Nach dem Abend in der Moderation **„Alles zurücksetzen“** drücken und die Regeln wieder auf `".read": false, ".write": false` stellen.
