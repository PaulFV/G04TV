# G04TV — Google Play Vorbereitung

G04TV ist eine PWA. Für Google Play wird sie als **Trusted Web Activity (TWA)** in ein Android App
Bundle verpackt. Das Bundle wird erst erstellt, wenn die öffentliche Website, die Betreiberangaben,
die Datenschutzseite und die Android-Signatur feststehen.

Offizielle Grundlagen: [Google Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469),
[Google Play Developer Programme Policy](https://support.google.com/googleplay/android-developer/answer/16313518)
und [Trusted Web Activity Quick Start](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start).

## Vor der Einreichung

- [ ] Eine rechtlich vollständige Betreiberangabe und ein direkter Datenschutzkontakt stehen fest.
- [ ] Die Datenschutzseite ist öffentlich erreichbar: `https://paulfv.github.io/G04TV/privacy.html`.
- [ ] Die Copyright-/Inhaltshinweise sind öffentlich erreichbar: `https://paulfv.github.io/G04TV/copyright.html`.
- [ ] Die Rechte am neuen G04TV-Icon und an allen Store-Screenshots sind geklärt.
- [ ] Der eindeutige Android-Paketname ist gewählt und dauerhaft dokumentiert.
- [ ] Die Signatur- bzw. Upload-Schlüssel liegen sicher außerhalb dieses Repositorys.
- [ ] Die Apache-2.0-Hinweise für HLS.js und mpegts.js sind für die veröffentlichte Version verfügbar.
- [ ] Die Website funktioniert im Chrome-Android-Browser und über HTTPS ohne Login.

## TWA-Projekt erzeugen

Node.js, Java/JDK und Android SDK müssen auf dem Build-Rechner vorhanden sein. Die aktuelle
Bubblewrap-Version verwenden:

```bash
npm install --global @bubblewrap/cli
bubblewrap init --manifest=https://paulfv.github.io/G04TV/manifest.webmanifest
bubblewrap build
```

Beim `init` den finalen Paketnamen, den Startpfad `/G04TV/`, die aktuelle App-Version und die
gewünschten Android-Werte prüfen. Für Google Play das erzeugte **AAB** verwenden, nicht nur eine
lokale APK. Keystore-Dateien und Passwörter niemals committen.

Die TWA benötigt die öffentliche Website als vertrauenswürdige Quelle. Ohne passende Digital Asset
Links öffnet Android die Seite als Custom Tab mit Browserleiste statt als vollwertige TWA.

## Digital Asset Links

Nach dem ersten Build und nach der Einrichtung von Play App Signing die SHA-256-Fingerprints aus der
Play Console unter **App integrity** eintragen. Die fertige Datei heißt `.well-known/assetlinks.json`.
Eine Vorlage liegt unter [`assetlinks.json.template`](assetlinks.json.template).

Bei einer GitHub-Pages-Projektseite muss geprüft werden, ob die Datei am Origin-Root erreichbar ist
(`https://paulfv.github.io/.well-known/assetlinks.json`). Falls das mit der Projektseite nicht möglich
ist, eine eigene Domain oder eine von dir kontrollierte User-Site für die TWA verwenden. Test:

```text
https://paulfv.github.io/.well-known/assetlinks.json
```

Die Datei muss das Paket und den richtigen Play-App-Signing-Fingerprint enthalten. Upload- und
App-Signing-Schlüssel können unterschiedliche Fingerprints haben; bei lokalen Tests können beide
aufgenommen werden.

## Play-Console-Angaben

### Datenschutz / Data safety

Die Angaben müssen zur tatsächlich hochgeladenen Android-Version einschließlich TWA und aller
eingesetzten Bibliotheken passen. G04TV hat kein Konto, keine Werbung, keine Analyse, kein Tracking,
keine Kontakte, keinen Standortzugriff und keine Geräte-ID-Funktion. Die App speichert Playlistdaten,
Sender, Favoriten, Verlauf, Einstellungen und Sprache lokal im Browser. Vom Nutzer eingetragene
Playlist-/Stream-Adressen können jedoch an den vom Nutzer gewählten Anbieter und — falls aktiviert —
an den eigenen Proxy übertragen werden; Xtream-Adressen können Zugangsdaten enthalten. Das darf im
Data-Safety-Formular nicht versehentlich als „keine Datenübertragung“ erklärt werden.

Die App bietet die Löschung unter **Settings → Data on this device → Delete everything** sowie über
die Browser-Website-Daten an. Die Datenschutzseite und die In-App-Hinweise müssen mit den Angaben im
Formular übereinstimmen.

### Weitere Pflichtpunkte

- Store Listing mit Name, Kurzbeschreibung, vollständiger Beschreibung, Icon und Screenshots.
- Content-Rating-Fragebogen ausfüllen; die App liefert selbst keine TV-Inhalte aus.
- App access: kein Login erforderlich. Für die Prüfung sollte eine leere Installation funktionieren.
- Permissions: keine sensiblen Berechtigungen hinzufügen; die Playlist-Datei wird über den System-Dateipicker gewählt.
- Support-/Kontaktadresse und Datenschutzkontakt im Play-Console-Konto pflegen.
- Interne oder geschlossene Teststrecke zuerst mit der echten HTTPS-Seite und dem finalen Bundle prüfen.
- Nach Veröffentlichung `assetlinks.json` zusätzlich mit dem Play-Signing-Zertifikat testen.

## Entwurf für den Store-Eintrag

**Name:** G04TV — IPTV Playlists

**Kurzbeschreibung:** Play your own IPTV playlists in a private, lightweight player.

**Datenschutz-URL:** `https://paulfv.github.io/G04TV/privacy.html`

**Support-URL:** `https://github.com/PaulFV/G04TV/issues`

Die Texte sind ein Arbeitsentwurf. Vor der Veröffentlichung müssen insbesondere Betreibername,
Kontakt, Paketname, Signatur-Fingerprints, Screenshots, Content Rating und die Data-Safety-Angaben
vom Betreiber selbst geprüft und bestätigt werden.
