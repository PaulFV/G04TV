# GoTV v1.0.0

Abspieler für **eigene IPTV-Playlisten** — als eigenständige Web-App für **iPhone, Android und
Desktop**. Ohne Backend, ohne Konto, ohne Tracking. Playlisten, Favoriten und Zugangsdaten bleiben
auf dem Gerät.

Der Aufbau ist der des IPTV-Fensters von **Connect+** — Senderliste an der einen Seite, Bild an der
anderen, Stern für Favoriten — nur ohne Benutzerverwaltung: es gibt keine Anmeldung und keine
gesperrten Einträge. Die Umsetzung als installierbare Web-App folgt **GoFit**.

---

## Was GoTV kann

| Bereich | Beschreibung |
|:--|:--|
| **Start** | Was zuletzt lief, Favoriten als Kacheln, Stand der Playlisten |
| **Sender** | Senderliste mit Suche und Gruppen, daneben das Bild; Stern, Vollbild, extern öffnen |
| **Playlisten** | Quellen eintragen (Adresse, Datei, Einfügen, Xtream), aktualisieren, ersetzen, umbenennen, löschen |
| **Favoriten** | Die markierten Sender quer über alle Listen, in eigener Reihenfolge, als M3U exportierbar |
| **Einstellungen** | Wiedergabe, Vermittler, Sicherung, alles löschen |
| **Info** | Aufbau, Bedienung, Daten und Recht |

* **Playlisten werden gespeichert.** Kopfdaten im `localStorage`, die Senderlisten in der
  `IndexedDB` — auch zehntausende Sender.
* **Vier Wege hinein:** Adresse einer M3U/M3U8, Datei vom Gerät, eingefügter Text, Xtream-Zugang
  (Server, Benutzer, Kennwort → `get.php?...&type=m3u_plus`).
* **Favoriten** hängen an der Adresse des Senders: verschwindet eine Playlist, bleibt der Favorit
  spielbar.
* **Der Ton läuft weiter,** während man in den Favoriten oder in den Playlisten blättert — das Bild
  wandert dabei als kleines Fenster nach unten rechts.
* **Offline lauffähig:** ein Service Worker legt die Programmdateien ab. Die Streams selbst kommen
  natürlich weiter aus dem Netz.

---

## Womit gespielt wird

Ein Browser bringt keinen IPTV-Abspieler mit. GoTV entscheidet nach der Adresse — dieselbe Logik
wie in Connect+ (`IptvPlayerPage`):

| Format | Weg |
|:--|:--|
| **HLS** (`*.m3u8`) | Auf iPhone, iPad und in Safari der eingebaute Weg, sonst `hls.js` |
| **MPEG-TS** (`*.ts`, `output=ts`, Xtream ohne Endung) | `mpegts.js` — auf iPhone und iPad nicht möglich |
| **MP4, WebM, MP3 …** | Das Videofeld des Browsers selbst |
| **MKV, AVI, WMV …** | Kennt keine Browser-Engine — hier hilft **Extern öffnen** |

Die beiden Bibliotheken werden **erst geholt, wenn sie gebraucht werden** — zuerst aus dem Ordner
`vendor/` neben der App, sonst von cdnjs bzw. jsDelivr. Für einen Betrieb ohne Weg nach draußen
genügt es, die beiden Dateien dort abzulegen:

```
vendor/hls.min.js
vendor/mpegts.js
```

---

## Starten

### 1. Ohne alles

`index.html` im Browser öffnen. Funktioniert sofort.

**Einschränkung:** über `file://` gibt es keine Installation als App und keinen Service Worker.

### 2. Lokaler Webserver (für den Test auf dem Handy)

```bash
npx serve .
```

oder

```bash
python -m http.server 8080
```

Danach am Handy `http://<IP-des-Rechners>:8080` aufrufen — Rechner und Handy im selben WLAN.

### 3. GitHub Pages

Läuft bereits: **https://paulfv.github.io/GoTV/**

Eingeschaltet unter **Settings › Pages › Source: Deploy from a branch › `main` / (root)**. Jeder
Push auf `main` wird von GitHub selbst veröffentlicht — es braucht keinen eigenen Actions-Ablauf.

---

## Auf dem iPhone oder Android installieren

* **iPhone / iPad:** in **Safari** öffnen → **Teilen** → **Zum Home-Bildschirm**.
* **Android:** in **Chrome** öffnen → Menü ⋮ → **App installieren**.

Danach startet GoTV im Vollbild wie eine normale App; die gespeicherten Playlisten sind dieselben.

---

## Wenn eine Playlist nicht lädt

Der häufigste Fall — und kein Fehler der App:

1. **CORS.** Ein Browser darf eine fremde Adresse nur lesen, wenn der Anbieter es erlaubt. Die
   meisten IPTV-Anbieter erlauben es nicht.
   → Playlist beim Anbieter als Datei speichern und unter **Playlisten › Datei** einlesen, oder den
   Inhalt unter **Einfügen** hineinkopieren.
2. **Gemischter Inhalt.** Läuft GoTV über `https` (GitHub Pages) und die Playlist über `http`,
   blockiert der Browser das.
   → **GoTV versucht das von selbst zu lösen:** viele Anbieter geben dieselbe Liste auch über
   `https` heraus, nur auf dem Standardanschluss statt auf `:8080`. Gelingt das, wird die Quelle
   dauerhaft darauf umgestellt (Meldung *„Auf https gehoben"*) — und es braucht **keinen
   Vermittler**. Panels, die den Aufruf über `https` beantworten, schreiben meist auch die Sender
   als `https` in die Liste, dann läuft alles direkt. Beim Abspielen wird dasselbe für einen
   einzelnen Sender versucht; das Ergebnis wird je Anbieter gemerkt.
   → Klappt es nicht: Datei/Einfügen verwenden, die App lokal über `http` betreiben, oder den
   Vermittler.
3. **Vermittler.** Unter **Einstellungen › Playlisten aus dem Netz** lässt sich ein eigener Proxy
   eintragen (`https://…/?url={url}`). Er sieht dabei die vollständige Adresse **samt
   Zugangsdaten** — deshalb nur einen eintragen, dem man selbst vertraut. Voreingestellt ist keiner.
   Einen fertigen gibt es im Ordner [`proxy/`](proxy/) — siehe unten.

Streams verhalten sich genauso: `hls.js` braucht CORS, der eingebaute Weg von Safari nicht. Was der
Browser nicht öffnet, geht über **Extern öffnen** an VLC.

---

## Der eigene Vermittler (optional)

Im Ordner [`proxy/`](proxy/) liegt ein **Cloudflare Worker**, der Playlisten *und* Streams
stellvertretend holt und über HTTPS mit CORS-Kopfzeilen ausliefert. Damit fallen CORS, gemischter
Inhalt und User-Agent-Sperren weg — er gibt sich, wie Connect+, als VLC aus.

Bei HLS reicht Durchreichen nicht: der Worker **schreibt die Manifeste um**, damit auch Segmente,
Varianten, Schlüssel (`#EXT-X-KEY`) und Tonspuren (`#EXT-X-MEDIA`) über ihn laufen.

```bash
cd proxy
npx wrangler login
npx wrangler secret put KEY
npx wrangler deploy
```

Die ausgegebene Adresse in GoTV unter **Einstellungen › Playlisten aus dem Netz** eintragen:

```
https://gotv-proxy.dein-name.workers.dev/?url={url}&key=DEIN_SCHLUESSEL
```

**Vermittler verwenden** einschalten — und für das Bild zusätzlich **Auch Streams über den
Vermittler**. Letzteres schickt die **gesamte Bandbreite** über den Worker (rund 2 GB je Stunde und
Sender), deshalb ist es getrennt schaltbar. Einzelheiten in [`proxy/README.md`](proxy/README.md).

---

## Aufbau

```
GoTV/
  index.html                Rahmen: Seitenleiste, Kopfzeile, Ansichten, Bühne
  manifest.webmanifest      Installation als App
  sw.js                     Service Worker (nur eigene Programmdateien)
  css/
    theme.css               Farben, Schriften, Grundlagen
    layout.css              Rahmen, Navigation, Blatt, Meldungen
    components.css          Karten, Knöpfe, Listen, Senderzeilen
    player.css              Bühne, Bedienleiste, Senderliste, wanderndes Fenster
  js/
    util.js                 Hilfsfunktionen, Zeichen, Meldungen, Blatt
    m3u.js                  M3U/M3U8 lesen (aus Connect+ M3uPlaylist.cs)
    xtream.js               Xtream-Zugänge → get.php-Adresse
    db.js                   Senderlisten in der IndexedDB
    store.js                Zustand: Playlisten, Favoriten, Verlauf, Einstellungen
    player.js               Wiedergabe: HLS, MPEG-TS, nativ, Vollbild, Ton
    library.js              Senderbestand: holen, zwischenspeichern, filtern
    dock.js                 Die wandernde Bühne und ihre Anzeige
    view-start.js           Bereich Start
    view-live.js            Bereich Sender
    view-playlists.js       Bereich Playlisten
    view-favorites.js       Bereich Favoriten
    view-settings.js        Bereich Einstellungen
    view-info.js            Bereich Info
    onboarding.js           Ersteinrichtung (drei Schritte, einmalig)
    app.js                  Navigation, Tastatur, Start
  proxy/
    worker.js               Vermittler: holt Playlisten und Streams, schreibt HLS um
    wrangler.toml           Einstellungen für Cloudflare
  icons/                    Sinnbilder für die Installation
  docs/                     Datenschutzerklärung
```

---

## Daten

Es gibt **kein Konto und keinen Server**. Gespeichert wird ausschließlich lokal:

| Was | Wo |
|:--|:--|
| Playlisten (Name, Quelle, Stand) | `localStorage` |
| Senderlisten | `IndexedDB` |
| Favoriten, Verlauf, eigene Sender | `localStorage` |
| Einstellungen | `localStorage` |

Verbindungen gehen an **deinen Anbieter** (Playlist und Streams), an die Adressen der **Senderlogos**
aus der Playlist, bei Bedarf an **cdnjs/jsDelivr** (die beiden Abspiel-Bibliotheken) und an einen
**Vermittler**, falls du selbst einen einträgst.

Unter **Einstellungen › Alles löschen** verschwindet alles davon restlos. Siehe auch
[docs/Datenschutzerklaerung.md](docs/Datenschutzerklaerung.md).

---

## Zu den Inhalten

GoTV liefert **keine Sender mit** und vermittelt keine. Die App spielt allein das, was man selbst
einträgt. Für die Rechtmäßigkeit der eigenen Quellen ist man selbst verantwortlich.

---

## Lizenz

[MIT](LICENSE)
