# G04TV v1.0.119

Abspieler für **eigene IPTV-Playlisten** — als installierbare Web-App für **iPhone, iPad, Android und
Desktop**. Ohne Backend, ohne Konto, ohne Tracking. Playlisten, Favoriten, Programm und Zugangsdaten
bleiben auf dem Gerät.

**Live:** https://paulfv.github.io/G04TV/

---

## Was G04TV kann

| Bereich | Beschreibung |
|:--|:--|
| **Start** | Oben das Bild, darunter die Reiter **Favoriten**, **Alle**, **Verlauf** und **Programm** — schlichte Kacheln (kleiner Stern = Favorit, kleines Schloss = gesperrt), alles Weitere per langem Drücken |
| **Playlisten** | Quellen eintragen (Adresse, Datei, Einfügen, Xtream), aktualisieren, ersetzen, umbenennen, sperren, löschen |
| **Einstellungen** | Vier Gruppen: Allgemein, Programm & Sperre, Erweitert, Über — jede Zeile zeigt ihren Stand |

Auf dem **Tablet quer** teilt sich die Startseite: links das Bild, rechts die Senderliste, jede Seite
für sich scrollbar. Auf dem **Handy** klebt das Bild oben; die untere Leiste lässt sich ausblenden.

### Fernsehen

* **Wischen zum Umschalten:** im Bild nach links = nächster Sender, nach rechts = vorheriger; im
  Vollbild auch hoch und runter. Läuft ein Favorit, geht es durch die Favoriten, sonst durch die
  Playlist.
* **Zurück zum vorherigen Sender:** kleiner Knopf neben „Live“ mit dem Namen des zuletzt gesehenen
  Senders — wie die Zurück-Taste der Fernbedienung.
* **Mehrfachansicht** (iPad, Rechner): zwei oder vier Sender gleichzeitig, einer mit Ton. Bild
  antippen gibt ihm den Ton; „Groß ansehen“ macht ihn zum Hauptbild.
* **Bild-in-Bild:** das Video läuft in einem kleinen Fenster weiter, auch in anderen Apps.
* **Einschlaf-Timer:** 15–90 Minuten, danach wird der Ton leiser und die Wiedergabe endet.
* **Bildschirm bleibt an,** solange ein Sender läuft (abschaltbar).
* **Vollbild** mit Ton- und Lautstärkeregler; die Knöpfe blenden sich nach 5 s aus. Handy drehen
  schaltet das Bild ins Vollbild.
* **AirPlay** an Fernseher und Auto; Sperrbildschirm, Kontrollzentrum und **CarPlay** („Jetzt läuft“)
  zeigen den Sender, Weiter/Zurück schaltet um.
* **Der Ton läuft weiter,** während man in Playlisten oder Einstellungen blättert — das Bild wandert
  als kleines Fenster nach unten rechts.

### Programmführer (EPG)

* Auf jeder Kachel steht, **was gerade läuft**, mit Fortschrittsbalken; unter dem Bild dazu
  Uhrzeit und **was danach kommt**. Antippen zeigt das Programm der nächsten Stunden.
* **Reiter Programm:** alle Sender mit ihrer laufenden Sendung — oder um **20:15** und **22:00** — und
  eine **Suche im ganzen Programm** (z. B. „Tatort“). Antippen schaltet um.
* Quellen kommen von selbst: `url-tvg` / `x-tvg-url` aus der Playlist und bei Xtream-Zugängen
  `xmltv.php`. Eigene XMLTV-Adressen (`.xml` oder `.xml.gz`) lassen sich in den Einstellungen
  eintragen.
* Auch Dateien mit über 100 MB gehen: sie werden als Strom gelesen, entpackt und gefiltert — übrig
  bleiben nur die eigenen Sender, von 2 Stunden zurück bis 30 Stunden voraus. Erneuert wird alle
  12 Stunden.
* Zuordnung über `tvg-id`, sonst über den Namen („DE: Das Erste HD“ findet „Das Erste“).

### Sperre (Jugendschutz)

* Ein **4-stelliger Code** (in den Einstellungen festlegen) sperrt **ganze Playlisten, Kategorien
  oder einzelne Sender** — per langem Drücken auf Sender oder Kategorie, Playlisten über das Schloss auf ihrer Karte.
* Gesperrte Sender bleiben mit Namen sichtbar, laufen aber erst nach dem Code. Danach ist alles
  **15 Minuten** frei; eine neue Sperre gilt sofort.
* Nach 5 falschen Eingaben eine Wartezeit, die sich jedes Mal verdoppelt. Im Auto werden gesperrte
  Sender übersprungen.
* Der Code liegt nur als Hash auf dem Gerät. Wer die Website-Daten löscht, löscht auch die Sperre.

### Ordnung

* **Favoriten** in eigener Reihenfolge, nach Playlist filterbar, als M3U exportierbar. Sie hängen an
  der Adresse des Senders: verschwindet eine Playlist, bleibt der Favorit spielbar.
* **Kategorien** in der Reihenfolge der Playlist, mit Überschriften und Leiste; die gewählte wird je
  Playlist gemerkt. **Unerwünschte Kategorien lassen sich ausblenden** — sie verschwinden aus Liste,
  Suche und Umschalten.
* **Playlisten werden gespeichert:** Kopfdaten im `localStorage`, die Senderlisten in der
  `IndexedDB` — auch zehntausende Sender. Vier Wege hinein: Adresse einer M3U/M3U8, Datei vom
  Gerät, eingefügter Text, Xtream-Zugang (Server, Benutzer, Kennwort → `get.php?...&type=m3u_plus`).
* **Deutsch und Englisch,** **hell und dunkel** — ohne Neuladen, ein laufender Sender spielt weiter.
* **Offline lauffähig:** ein Service Worker legt die Programmdateien ab. Die Streams selbst kommen
  natürlich weiter aus dem Netz.

---

## Bedienung

| Geste / Taste | Wirkung |
|:--|:--|
| Kachel antippen | Sender abspielen |
| Lang drücken auf Sender | Favorit, Sperre, Programm, Mehrfachansicht |
| Lang drücken auf Kategorie | Nur diese zeigen, ausblenden, sperren |
| Im Bild wischen | Links: nächster Sender, rechts: vorheriger (im Vollbild auch hoch/runter) |
| Doppeltippen ins Bild | Vollbild ein und aus |
| Sendung unter dem Namen antippen | Programm der nächsten Stunden |
| „⋯ Mehr“ unter dem Bild | Programm, Einschlaf-Timer, Bild-in-Bild, Mehrfachansicht, AirPlay, andere App |
| `F` · `Esc` · `M` | Vollbild · Vollbild verlassen · Ton aus/an |
| `Bild ↓` / `Bild ↑` · `B` | Nächster / vorheriger Sender · zurück zum letzten Sender |
| `/` · `1 – 3` | Suche · Bereich wechseln |
| `1 – 4` in der Mehrfachansicht | Ton auf diese Kachel |

---

## Womit gespielt wird

Ein Browser bringt keinen IPTV-Abspieler mit. G04TV entscheidet nach der Adresse — dieselbe Logik
wie in Connect+ (`IptvPlayerPage`):

| Format | Weg |
|:--|:--|
| **HLS** (`*.m3u8`) | Auf iPhone, iPad und in Safari der eingebaute Weg, sonst `hls.js` |
| **MPEG-TS** (`*.ts`, `output=ts`, Xtream ohne Endung) | `mpegts.js` — auf dem iPhone ab iOS 17.1 (ManagedMediaSource). Bei Xtream-Sendern wird zusätzlich die HLS-Fassung (`.m3u8`) versucht — auf dem iPhone zuerst |
| **MP4, WebM, MP3 …** | Das Videofeld des Browsers selbst |
| **MKV, AVI, WMV …** | Kennt keine Browser-Engine — hier hilft **Extern öffnen** |

Die beiden Bibliotheken werden **erst geholt, wenn sie gebraucht werden** — zuerst aus dem Ordner
`vendor/` neben der App, sonst von cdnjs bzw. jsDelivr. Für einen Betrieb ohne Weg nach draußen
genügt es, die beiden Dateien dort abzulegen:

```
vendor/hls.min.js
vendor/mpegts.js
vendor/qrcode.js        (nur für den QR-Code beim Teilen)
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

Läuft bereits: **https://paulfv.github.io/G04TV/**

Eingeschaltet unter **Settings › Pages › Source: Deploy from a branch › `main` / (root)**. Jeder
Push auf `main` wird von GitHub selbst veröffentlicht — es braucht keinen eigenen Actions-Ablauf.

---

## Auf dem iPhone oder Android installieren

* **iPhone / iPad:** in **Safari** öffnen → **Teilen** → **Zum Home-Bildschirm**.
* **Android:** in **Chrome** öffnen → Menü ⋮ → **App installieren**.

Danach startet G04TV im Vollbild wie eine normale App; die gespeicherten Playlisten sind dieselben.

---

## Wenn eine Playlist nicht lädt

Der häufigste Fall — und kein Fehler der App:

1. **CORS.** Ein Browser darf eine fremde Adresse nur lesen, wenn der Anbieter es erlaubt. Die
   meisten IPTV-Anbieter erlauben es nicht.
   → Playlist beim Anbieter als Datei speichern und unter **Playlisten › Datei** einlesen, oder den
   Inhalt unter **Einfügen** hineinkopieren.
2. **Gemischter Inhalt.** Läuft G04TV über `https` (GitHub Pages) und die Playlist über `http`,
   blockiert der Browser das.
   → **G04TV versucht das von selbst zu lösen:** viele Anbieter geben dieselbe Liste auch über
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

Programmdaten (EPG) und Streams verhalten sich genauso: `hls.js` braucht CORS, der eingebaute Weg von Safari nicht. Was der
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

Die ausgegebene Adresse in G04TV unter **Einstellungen › Playlisten aus dem Netz** eintragen:

```
https://g04tv-proxy.dein-name.workers.dev/?url={url}&key=DEIN_SCHLUESSEL
```

**Vermittler verwenden** einschalten — und für das Bild zusätzlich **Auch Streams über den
Vermittler**. Letzteres schickt die **gesamte Bandbreite** über den Worker (rund 2 GB je Stunde und
Sender), deshalb ist es getrennt schaltbar. Einzelheiten in [`proxy/README.md`](proxy/README.md).

---

## Aufbau

```
G04TV/
  index.html                Rahmen: Seitenleiste, Kopfzeile, Ansichten, Bühne
  manifest.webmanifest      Installation als App
  sw.js                     Service Worker (nur eigene Programmdateien)
  privacy.html              Öffentliche Datenschutzerklärung für Web und Play Store
  copyright.html            Copyright- und Inhaltshinweise
  css/
    theme.css               Farben, Schriften, Grundlagen (dunkel)
    theme-light.css         Heller Modus
    layout.css              Rahmen, Navigation, Blatt, Meldungen
    components.css          Karten, Knöpfe, Listen, Zahlenfeld der Sperre
    player.css              Bühne, Vollbild, Bild-in-Bild, Mehrfachansicht
    start.css               Startseite: Bild, Reiter, Kacheln, Programm, „Jetzt im TV“
    playlists.css           Bereich Playlisten
    settings.css            Bereich Einstellungen
    tablet.css              iPad und Tablet (hochkant, quer, Berührung) – wird zuletzt geladen
    legal.css               Datenschutz- und Copyright-Seiten
  js/
    util.js                 Hilfsfunktionen, Zeichen, Meldungen, Blatt
    i18n.js                 Deutsch/Englisch
    m3u.js                  M3U/M3U8 lesen (aus Connect+ M3uPlaylist.cs), url-tvg
    xtream.js               Xtream-Zugänge → get.php-Adresse
    db.js                   Senderlisten und Programm in der IndexedDB
    store.js                Zustand: Playlisten, Favoriten, Verlauf, Einstellungen
    player.js               Wiedergabe: HLS, MPEG-TS, nativ, Vollbild, Ton
    library.js              Senderbestand: holen, zwischenspeichern, filtern
    lock.js                 Sperre mit Code (Jugendschutz)
    dock.js                 Die wandernde Bühne und ihre Anzeige
    carplay.js              Media Session (Sperrbildschirm, CarPlay), AirPlay
    extras.js               Wischen, Zurück, Einschlaf-Timer, Bildschirm an, Bild-in-Bild
    epg.js                  Programmführer: XMLTV als Strom lesen, filtern, abfragen
    multiview.js            Mehrfachansicht (2 oder 4 Sender)
    view-start.js           Bereich Start
    view-live.js            Senderliste (frühere Ansicht „Sender“)
    view-playlists.js       Bereich Playlisten
    view-settings.js        Bereich Einstellungen
    info.js                 Info (ausklappbar in den Einstellungen)
    onboarding.js           Ersteinrichtung (drei Schritte, einmalig)
    app.js                  Navigation, Tastatur, Start
  vendor/                   Platz für hls.min.js und mpegts.js (optional, sonst CDN)
  proxy/
    worker.js               Vermittler: holt Playlisten und Streams, schreibt HLS um
    wrangler.toml           Einstellungen für Cloudflare
  icons/                    Sinnbilder für die Installation
  art/                      Bilder für Onboarding und Leerzustände
  docs/                     Markdown-Dokumentation zur Datenschutzerklärung
  play-store/               TWA- und Google-Play-Vorbereitung
```

---

## Grenzen

* **Lautstärke auf iPhone und iPad:** Apple lässt Web-Apps die Lautstärke nicht setzen — dort
  regeln nur die Tasten am Gerät. G04TV erkennt das und blendet die Regler aus; Ton aus/an bleibt.
* **Bild-in-Bild und AirPlay bei MPEG-TS auf dem iPhone:** mit `ManagedMediaSource` lässt Apple das
  teils nicht zu. HLS-Sender (`.m3u8`) gehen zuverlässig — bei Xtream nimmt G04TV auf dem iPhone
  deshalb zuerst die HLS-Fassung.
* **Mehrfachansicht:** braucht die Bandbreite aller Sender zusammen; viele Anbieter erlauben nur
  1–2 gleichzeitige Verbindungen je Zugang.
* **Bildschirm anlassen** braucht iOS 16.4 (als Home-Bildschirm-App zuverlässig ab iOS 18.4).
* **Sperre:** schützt im Alltag, nicht gegen jemanden, der die Website-Daten löscht.

---

## Daten

Es gibt **kein Konto und keinen Server**. Gespeichert wird ausschließlich lokal:

| Was | Wo |
|:--|:--|
| Playlisten (Name, Quelle, Stand, Programm-Adresse) | `localStorage` |
| Senderlisten | `IndexedDB` |
| Programm (gefiltert, ~32 Stunden) | `IndexedDB` |
| Favoriten, Verlauf, eigene Sender | `localStorage` |
| Einstellungen, ausgeblendete Kategorien | `localStorage` |
| Sperre (Hash des Codes, gesperrte Einträge) | `localStorage` |
| Auswahl der Mehrfachansicht, Ansicht, Reiter | `localStorage` |

Verbindungen gehen an **deinen Anbieter** (Playlist, Streams und Programm), an die Adressen der
**Senderlogos** aus der Playlist, an **eigene Programm-Adressen**, bei Bedarf an **cdnjs/jsDelivr**
(die beiden Abspiel-Bibliotheken), an **formsubmit.co** nur beim Absenden von Feedback, und an einen
**Vermittler**, falls du selbst einen einträgst.

Unter **Einstellungen › Alles löschen** verschwindet alles davon restlos. Siehe auch die öffentlich
erreichbare [Datenschutzerklärung](privacy.html), den [Copyright- und Inhaltshinweis](copyright.html)
und die [ausführliche Markdown-Fassung](docs/Datenschutzerklaerung.md).

---

## Zu den Inhalten

G04TV liefert **keine Sender mit** und vermittelt keine. Die App spielt allein das, was man selbst
einträgt. Für die Rechtmäßigkeit der eigenen Quellen ist man selbst verantwortlich.

---

## Lizenz

[MIT](LICENSE)
