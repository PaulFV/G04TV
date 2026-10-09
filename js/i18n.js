/* ============================================================
   G04TV — Sprachumschaltung (Deutsch / Englisch)

   Die Oberflaeche wird auf Deutsch geschrieben. Ist Englisch
   gewaehlt, uebersetzt dieses Modul die Texte im DOM - auch alles,
   was spaeter durch Ansichten, Blaetter oder Meldungen hinzukommt
   (MutationObserver).

   Sicherungen gegen Fehluebersetzungen:
   - erst wird der ganze Text gesucht, dann einzelne Wendungen,
     und die nur an Wortgrenzen und mit gleicher Gross-/Kleinschreibung;
   - Sendernamen, Gruppen und Playlist-Namen bleiben unberuehrt;
   - der deutsche Ursprung jedes Textes wird gemerkt, damit der
     Wechsel zurueck ohne Neuladen geht und der Sender weiterlaeuft.
   ============================================================ */
(function (G) {
  'use strict';

  var KEY = 'g04tv.language';
  var lang = 'de';

  var MAP = {
    'Hauptnavigation': 'Main navigation',
    'Navigation': 'Navigation',
    'Menü': 'Menu',
    'Start': 'Start',
    'Sender': 'Channels',
    'Playlist': 'Playlist',
    'Playlisten': 'Playlists',
    'Favorit': 'Favorite',
    'Favoriten': 'Favorites',
    'Einstellungen': 'Settings',
    'Wiedergabe': 'Playback',
    'Darstellung': 'Appearance',
    'Info': 'Info',
    'Sprache': 'Language',
    'Deutsch': 'German',
    'Englisch': 'English',
    'Nichts läuft': 'Nothing playing',
    'Was gerade läuft': "What's playing",
    'Kein Sender': 'No channel',
    'Wähle links einen Sender — oder trage zuerst eine Playlist ein.': 'Choose a channel on the left — or add a playlist first.',
    'Der Sender ließ sich nicht abspielen': 'The channel could not be played',
    'Noch einmal': 'Try again',
    'Extern öffnen': 'Open externally',
    'Zum Bereich Sender': 'Go to Channels',
    'Anhalten': 'Stop',
    'Schließen': 'Close',
    'Ton': 'Sound',
    'Vollbild': 'Fullscreen',
    'Vollbild verlassen': 'Exit fullscreen',
    'App im Vollbild': 'App fullscreen',
    'Ton an': 'Unmute',
    'Ton aus': 'Mute',
    'Läuft: ': 'Playing: ',
    'Läuft': 'Playing',
    'bereit': 'ready',
    'Kein Sender gewählt': 'No channel selected',
    'Sender aus der Liste antippen': 'Tap a channel in the list',
    'Als Favorit gemerkt': 'Added to favorites',
    'Favorit entfernt': 'Removed from favorites',
    'Als Favorit merken': 'Add to favorites',
    'Favorit entfernen': 'Remove from favorites',
    'Merken': 'Save',
    'Nichts gefunden': 'Nothing found',
    'Weder Name noch Gruppe passen zur Suche.': 'Neither the name nor the group matches the search.',
    'Weitere ': 'More ',
    'Sender werden geladen …': 'Loading channels …',
    'Playlist wird geholt …': 'Loading playlist …',
    'Playlist nicht erreichbar': 'Playlist unavailable',
    'Playlist nicht gefunden.': 'Playlist not found.',
    'Playlist gespeichert': 'Playlist saved',
    'Playlist nicht geladen': 'Playlist not loaded',
    'Nicht geladen': 'Not loaded',
    'Aktualisiert': 'Updated',
    'Aktualisieren': 'Refresh',
    'Alle aktualisieren': 'Refresh all',
    'Fertig': 'Done',
    'Ersetzt': 'Replaced',
    'Gelöscht': 'Deleted',
    'Löschen': 'Delete',
    'Playlist löschen': 'Delete playlist',
    'Playlist umbenennen': 'Rename playlist',
    'Playlist hinzufügen': 'Add playlist',
    'Jetzt hinzufügen': 'Add now',
    'Öffnen': 'Open',
    'Ersetzen': 'Replace',
    'Adresse': 'URL',
    'Datei': 'File',
    'Einfügen': 'Paste',
    'Xtream': 'Xtream',
    'Laden und merken': 'Load and save',
    'Übernehmen': 'Use playlist',
    'Adresse der Playlist': 'Playlist URL',
    'Name (frei)': 'Name (optional)',
    'Name der Playlist': 'Playlist name',
    'Eingefügte Playlist': 'Pasted playlist',
    'wird sonst aus der Adresse gebildet': 'otherwise taken from the URL',
    'Inhalt der M3U': 'M3U content',
    'M3U-Datei wählen': 'Choose M3U file',
    'Keine Datei gewählt': 'No file chosen',
    'Name des Anbieters': 'Provider name',
    'Server': 'Server',
    'Benutzer': 'Username',
    'Kennwort': 'Password',
    'Adresse des Streams': 'Stream URL',
    'Einzelnen Sender eintragen': 'Add individual channel',
    'Einzelne Sender': 'Individual channels',
    'Sender hinzufügen': 'Add channel',
    'Sender eintragen': 'Add channel',
    'Sender eingetragen': 'Channel added',
    'Schon vorhanden': 'Already exists',
    'Sender entfernen': 'Remove channel',
    'Der eingetragene Sender wird aus der Liste genommen.': 'The channel will be removed from the list.',
    'Keine eigenen Sender': 'No individual channels',
    'Playlist nicht geladen': 'Playlist not loaded',
    'Nichts zu tun': 'Nothing to do',
    'Keine Playlist stammt aus dem Netz.': 'No playlist comes from the internet.',
    'Keine Playlist': 'No playlist',
    'Noch keine Playlist': 'No playlist yet',
    'Noch keine Favoriten': 'No favorites yet',
    'Noch nichts gemerkt': 'Nothing saved yet',
    'Zu den Sendern': 'Go to Channels',
    'Playlist hinzufügen': 'Add playlist',
    'Sofort abspielen': 'Play immediately',
    'Letzten Sender beim Start laden': 'Load last channel on startup',
    'Vor „Extern öffnen“ fragen': 'Ask before opening externally',
    'Bewegung reduzieren': 'Reduce motion',
    'Playlisten aus dem Netz': 'Playlists from the internet',
    'Vermittler verwenden': 'Use proxy',
    'Auch Streams über den Vermittler': 'Proxy streams too',
    'Adresse des Vermittlers': 'Proxy URL',
    'Daten auf diesem Gerät': 'Data on this device',
    'Playlisten, Favoriten, Einstellungen': 'Playlists, favorites, settings',
    'Playlisten': 'Playlists',
    'Sicherung speichern': 'Save backup',
    'Sicherung einlesen': 'Import backup',
    'Alles löschen': 'Delete everything',
    'Als App installieren': 'Install as an app',
    'Jetzt installieren': 'Install now',
    'Sicherung erstellt': 'Backup created',
    'Sicherung erstellt': 'Backup created',
    'Eingelesen': 'Imported',
    'Kopiert': 'Copied',
    'Ging nicht': 'Could not complete',
    'Bestätigen': 'Confirm',
    'Abbrechen': 'Cancel',
    'Speichern': 'Save',
    'Adresse kopieren': 'Copy URL',
    'Löschen': 'Delete',
    'Weiter': 'Next',
    'Zurück': 'Back',
    'Verstanden': 'Understood',
    'Kein lokaler Speicher': 'No local storage',
    'Senderlisten nicht speicherbar': 'Channel lists cannot be saved',
    'Gespeicherte Daten unlesbar': 'Saved data cannot be read',
    'Wähle einen Sender': 'Choose a channel',
    'Playlisten bleiben gespeichert': 'Playlists stay saved',
    'Favoriten quer über alle Listen': 'Favorites across all playlists',
    'Kein Konto, kein Server': 'No account, no server',
    'Was du mitbringst': 'What you provide',
    'Für die Rechtmäßigkeit deiner Quellen bist du selbst verantwortlich.': 'You are responsible for the legality of your sources.',
    'Alles bleibt auf dem Gerät.': 'Everything stays on the device.',
    'Zuletzt gesehen': 'Recently watched',
    'Verlauf löschen': 'Clear history',
    'Die Liste „Zuletzt gesehen“ wird geleert. Favoriten und Playlisten bleiben.': 'The “Recently watched” list will be cleared. Favorites and playlists remain.',
    'Geschlossen': 'Closed',
    'Keine Senderliste': 'No channel list',
    'Der Browser hat das Öffnen verhindert.': 'The browser prevented opening it.',
    'Der Download wurde verhindert.': 'The download was blocked.',
    'Nichts wird gemeldet, nichts geht an Dritte': 'Nothing is reported and nothing is sent to third parties',
    'Sender abspielen': 'Play channel',
    'Sender merken oder vergessen': 'Save or remove channel',
    'Dieser Bereich': 'This section',
    'Antippen': 'Tap',
    'Stern antippen': 'Tap the star',
    'Kein Konto, kein Server, kein Tracking.': 'No account, no server, no tracking.',
    'Senderlogos': 'Channel logos',
    'Dein Anbieter': 'Your provider',
    'Zu den Inhalten.': 'About the content.',
    'Daten': 'Data',
    'Bedienung': 'Usage',
    'Recht': 'Legal',
    'Aufbau': 'Structure',
    'Bedienung': 'How to use',
    'vor ': 'about ',
    'gerade eben': 'just now',
    'nie': 'never',
    'gestern': 'yesterday',
    'Minute': 'minute',
    'Minuten': 'minutes',
    'Stunde': 'hour',
    'Stunden': 'hours',
    'Tagen': 'days',
    'Monat': 'month',
    'Monaten': 'months',
    'Fehler': 'Error',
    'Unbekannter Fehler.': 'Unknown error.',
    'Der Anbieter hat nichts geliefert.': 'The provider returned nothing.',
    'Die Senderliste ist leer.': 'The channel list is empty.',
    'Das ist keine Senderliste.': 'This is not a channel list.',
    'Der Stream ließ sich nicht öffnen.': 'The stream could not be opened.',
    'Verbindung wird aufgebaut …': 'Connecting …',
    'Zwischenspeicher füllt sich …': 'Buffering …',
    'Zweiter Versuch mit MPEG-TS …': 'Retrying with MPEG-TS …',
    'Neuer Versuch …': 'Retrying …',
    'Hängt – verbindet neu …': 'Stalled – reconnecting …',
    'Wiedergabe-Protokoll': 'Playback log',
    'Hängt oder ruckelt ein Sender, steht hier, womit er lief und wie voll der Puffer war. Das bleibt auf diesem Gerät. Adressen und Zugangsdaten stehen nicht darin.': 'If a channel stalls or stutters, this shows what it played with and how full the buffer was. It stays on this device. Addresses and credentials are not included.',
    'Kopieren': 'Copy',
    'Das Protokoll liegt in der Zwischenablage.': 'The log is in the clipboard.',
    'Der Sender liefert nicht gleichmäßig. Mit „Extern öffnen“ an einen Abspieler wie VLC weitergeben.': 'The channel is not delivering steadily. Hand it to a player such as VLC with “Open externally”.',
    'Abruf abgebrochen.': 'Request aborted.',
    'Netzfehler beim Abruf des Streams.': 'Network error while loading the stream.',
    'Der Stream ließ sich nicht dekodieren.': 'The stream could not be decoded.',
    'Dieses Format oder diese Adresse kann der Browser nicht öffnen.': 'The browser cannot open this format or URL.',
    'Die Senderliste des Streams war nicht erreichbar.': 'The stream playlist was unavailable.',
    'HLS-Fehler': 'HLS error',
    'MPEG-TS-Fehler': 'MPEG-TS error',
    'Dieser Sender läuft über http': 'This channel uses http',
    'Der Browser blockiert das.': 'The browser blocks it.',
    'Playlisten werden übernommen.': 'Playlists are being imported.',
    'Keine Quelle': 'No source',
    'nur im Arbeitsspeicher': 'memory only',
    'Liste': 'list',
    'Listen': 'lists',
    'auf diesem Gerät': 'on this device',
    'gespeichert': 'saved',
    'wird geladen': 'loading',
    'wird sonst': 'otherwise',
    'mit Fehler': 'with errors',
    'Sender gemerkt': 'channels saved',
    'als M3U gespeichert.': 'saved as M3U.',
    'Der Browser hat den Download verhindert.': 'The browser blocked the download.',
    'Adresse fehlt': 'URL missing',
    'Ohne Adresse geht es nicht.': 'A URL is required.',
    'Dieser Stream steht bereits in der Liste.': 'This stream is already in the list.',
    'Der Browser verlangt eine Berührung': 'The browser requires a tap',
    'Hinter der Adresse steckt ein einzelner Stream, keine Senderliste.': 'This URL contains a single stream, not a channel list.',
    'Diese Playlist stammt nicht aus dem Netz. Datei erneut einlesen, um sie zu ersetzen.': 'This playlist was loaded from a file. Import the file again to replace it.',
    'Ein einzelner Stream ohne Playlist': 'A single stream without a playlist',
    'Oder eine feste Adresse.': 'Or a fixed URL.',
    'Playlist als Datei speichern': 'Save the playlist as a file',
    'Es wurde nichts eingefügt.': 'Nothing was pasted.',
    'Erst eine Datei wählen.': 'Choose a file first.',
    'Bitte eine Adresse eintragen.': 'Please enter a URL.',
    'Das sieht nicht nach einer http- oder https-Adresse aus.': 'This does not look like an http or https URL.',
    'Server, Benutzer und Kennwort werden gebraucht.': 'Server, username and password are required.',
    'Adresse kopieren': 'Copy URL'
    , 'Willkommen bei ': 'Welcome to '
    , 'Gute Nacht': 'Good night'
    , 'Guten Morgen': 'Good morning'
    , 'Guten Tag': 'Good afternoon'
    , 'Guten Abend': 'Good evening'
    , 'Noch läuft nichts. Wähle einen Sender aus deiner Playlist — ': 'Nothing is playing. Choose a channel from your playlist — '
    , 'oder trage zuerst eine Playlist ein.': 'or add a playlist first.'
    , 'Hinzufügen': 'Add'
    , 'Verwalten': 'Manage'
    , 'Läuft gerade': 'Playing now'
    , 'Zuletzt gesehen': 'Recently watched'
    , 'Zum Bild': 'Go to player'
    , 'Weitersehen': 'Continue watching'
    , 'Trage deine Quelle ein — Adresse, Datei, eingefügter Text oder Xtream-Zugang.': 'Add your source — URL, file, pasted text or Xtream login.'
    , 'Der Stern an einem Sender merkt ihn hier vor — quer über alle Playlisten hinweg.': 'The star saves a channel here — across all playlists.'
    , 'Leeren': 'Clear'
    , 'Alles bleibt auf dem Gerät.': 'Everything stays on the device.'
    , 'nur lokal gespeichert. Es gibt kein Konto und keinen Server.': 'stored locally. There is no account and no server.'
    , 'Verlauf leeren': 'Clear history'
    , 'Sender suchen …': 'Search channels …'
    , 'Suche leeren': 'Clear search'
    , 'Abspielen': 'Play'
    , 'Extern': 'External'
    , 'Lautstärke': 'Volume'
    , 'Wird geladen …': 'Loading …'
    , 'Bereit': 'Ready'
    , 'Alle': 'All'
    , 'Eigener Sender': 'Individual channel'
    , 'Weitere ': 'More '
    , ' anzeigen': ' to show'
    , ' von ': ' of '
    , ' angezeigt': ' shown'
    , ' insgesamt': ' total'
    , 'Stand ': 'Updated '
    , 'Kacheln': 'Tiles'
    , 'Als M3U': 'As M3U'
    , 'Nach oben': 'Move up'
    , 'Nach unten': 'Move down'
    , 'Stern entfernen': 'Remove favorite'
    , 'Datei erstellt': 'File created'
    , 'Sender als M3U gespeichert.': 'channels saved as M3U.'
    , 'Ein einzelner Stream ohne Playlist — etwa ein Radiosender ': 'A single stream without a playlist — for example a radio station '
    , 'oder eine feste Adresse. Diese Sender stehen im Bereich Sender immer oben.': 'or a fixed URL. These channels always appear at the top of Channels.'
    , 'Eine M3U- oder M3U8-Datei im Netz. Auch der get.php-Aufruf eines Anbieters passt hierher.': 'An M3U or M3U8 file on the internet. A provider get.php URL works here too.'
    , 'Die Datei wird nur gelesen — sie verlässt das Gerät nicht. ': 'The file is only read — it never leaves this device. '
    , 'Eine so eingelesene Playlist lässt sich später nicht auffrischen, dafür braucht sie keine Verbindung.': 'A playlist imported this way cannot be refreshed later, but it does not need a connection.'
    , 'Alles ab ': 'Paste everything from '
    , ' einfügen. Praktisch, wenn der Anbieter den Abruf aus dem Browser sperrt.': ' . Useful when the provider blocks browser requests.'
    , 'Server, Benutzer und Kennwort bleiben auf dem Gerät. ': 'The server, username and password stay on this device. '
    , 'Sie gehen ausschließlich an den Anbieter selbst.': 'They are sent only to the provider.'
    , 'Lässt sich eine Adresse nicht laden, liegt es fast immer am Anbieter: der Browser darf ': 'If a URL cannot be loaded, it is almost always the provider: the browser may only read '
    , 'fremde Adressen nur lesen, wenn sie es erlauben (CORS). Dann die Playlist als Datei speichern ': 'external URLs when they allow it (CORS). Save the playlist as a file '
    , 'und hier einlesen — oder in den Einstellungen einen Vermittler eintragen.': 'and import it here — or add a proxy in Settings.'
    , 'Ein Browser darf eine fremde Adresse nur lesen, wenn der Anbieter es erlaubt (CORS). ': 'A browser may only read an external URL when the provider allows it (CORS). '
    , 'Sperrt er das, bleibt der Weg über ': 'If it blocks this, use '
    , 'Ein <b>Vermittler</b> holt die Playlist stellvertretend — er sieht dabei die vollständige Adresse ': 'A <b>proxy</b> fetches the playlist on your behalf — it can see the full URL '
    , 'samt Zugangsdaten. Trage deshalb nur einen ein, dem du selbst vertraust.': 'including credentials. Only use one you trust.'
    , 'Erst wird direkt versucht; erst wenn das misslingt, geht die Anfrage über den Vermittler.': 'A direct request is tried first; only if it fails, the proxy is used.'
    , 'Nicht nur die Playlist, sondern auch das Bild läuft über ihn. Damit spielen ': 'Not only the playlist, but also the stream goes through it. This allows '
    , 'Der mitgelieferte Worker schreibt die HLS-Segmente passend um.': 'The included Worker rewrites HLS segments accordingly.'
    , 'Es ist kein Vermittler eingeschaltet — der Schalter bleibt wirkungslos.': 'No proxy is enabled — this switch has no effect.'
    , 'Die Sicherung enthält die Kopfdaten der Playlisten, ': 'The backup contains playlist metadata, '
    , 'die eigenen Sender, die Favoriten und die Einstellungen — nicht die Senderlisten selbst; ': 'individual channels, favorites and settings — but not the channel lists themselves; '
    , 'die werden beim nächsten Aktualisieren wieder geholt.': 'they are fetched again the next time you refresh.'
    , 'iPhone / iPad:': 'iPhone / iPad:'
    , 'in Safari öffnen, ': 'open Safari, '
    , 'Teilen': 'Share'
    , 'Zum Home-Bildschirm': 'Add to Home Screen'
    , 'Android:': 'Android:'
    , 'in Chrome öffnen, Menü ⋮, ': 'open Chrome, menu ⋮, '
    , 'App installieren': 'Install app'
    , 'Eine Datei mit deinen Playlisten, eigenen Sendern, Favoriten und ': 'A file with your playlists, individual channels, favorites and '
    , 'Einstellungen. Sie lässt sich auf einem anderen Gerät wieder einlesen.': 'settings. It can be imported on another device.'
    , 'Zugangsdaten mitnehmen': 'Include credentials'
    , 'Ein Xtream-Zugang trägt Benutzer und Kennwort in der Adresse. ': 'An Xtream login stores the username and password in the URL. '
    , 'Ohne diesen Haken werden sie unkenntlich gemacht — dann lässt sich die Playlist auf dem anderen ': 'Without this option they are masked — the playlist then cannot be loaded on the other '
    , 'Gerät aber nicht laden.': 'device.'
    , 'Endgültig löschen': 'Delete permanently'
    , 'Playlisten, Senderlisten, eigene Sender, Favoriten, Verlauf und Einstellungen ': 'Playlists, channel lists, individual channels, favorites, history and settings '
    , 'werden von diesem Gerät entfernt. Das lässt sich nicht rückgängig machen.': 'will be removed from this device. This cannot be undone.'
    , 'Beim nächsten Start wird der letzte Sender vorbereitet.': 'The last channel will be prepared on the next startup.'
    , 'Noch ohne Wirkung': 'No effect yet'
    , 'Trage erst einen Vermittler ein und schalte ihn ein.': 'Add and enable a proxy first.'
    , 'Der Vermittler wird beim nächsten Abruf verwendet.': 'The proxy will be used for the next request.'
    , 'Playlisten wurden übernommen. Zum Laden der Sender: Alle aktualisieren.': 'Playlists imported. Refresh all to load their channels.'
    , 'Die vollständige Adresse liegt in der Zwischenablage.': 'The full URL is in the clipboard.'
    , 'Der Browser hat es verhindert.': 'The browser prevented it.'
    , 'Bitte erst eine Adresse eintragen.': 'Enter a URL first.'
    , 'Datei wird gelesen …': 'Reading file …'
    , 'Erste Playlist': 'First playlist'
    , 'Ein Abspieler für deine eigenen IPTV-Playlisten — auf dem iPhone, ': 'A player for your own IPTV playlists — on iPhone, '
    , 'auf Android und am Rechner. Er läuft im Browser und lässt sich wie eine App auf den ': 'Android and desktop. It runs in the browser and can be added to your '
    , 'Startbildschirm legen.': 'home screen like an app.'
    , 'Einmal eintragen, danach immer da — auf diesem Gerät': 'Add it once and it stays here — on this device'
    , 'Der Stern merkt einen Sender vor': 'The star saves a channel'
    , 'Nichts wird gemeldet, nichts geht an Dritte': 'Nothing is reported or sent to third parties'
    , 'G04TV liefert keine Sender mit. Die App spielt allein das, was du selbst ': 'G04TV includes no channels. The app only plays what you '
    , 'einträgst — die Playlist deines Anbieters oder frei verfügbare Listen.': 'add — your provider playlist or freely available lists.'
    , 'Playlisten, Zugangsdaten und Favoriten werden nur auf diesem Gerät gespeichert. ': 'Playlists, credentials and favorites are stored only on this device. '
    , 'Unter ': 'Under '
    , ' lässt sich alles wieder restlos löschen.': ' you can delete everything permanently.'
    , 'Trage die Adresse deiner M3U ein — oder wähle eine Datei vom Gerät. ': 'Enter your M3U URL — or choose a file from this device. '
    , 'Beides lässt sich später jederzeit ändern und ergänzen.': 'You can change or add both later.'
    , 'Später eintragen': 'Add later'
    , 'Bitte erst eine Adresse eintragen.': 'Please enter a URL first.'
    , 'Die Bereiche': 'Sections'
    , 'Was zuletzt lief, Favoriten, Stand der Playlisten': 'Recently watched, favorites and playlist status'
    , 'Senderliste mit Suche und Gruppen, daneben das Bild': 'Channel list with search and groups, with the player beside it'
    , 'Quellen eintragen, aktualisieren, ersetzen, löschen': 'Add, refresh, replace and delete sources'
    , 'Die markierten Sender, in eigener Reihenfolge': 'Your saved channels in custom order'
    , 'Wiedergabe, Vermittler, Sicherung und Löschen': 'Playback, proxy, backup and deletion'
    , 'Dieser Bereich': 'This section'
    , 'Womit gespielt wird': 'How playback works'
    , 'nach der Adresse, welcher Weg passt:': 'based on the URL:'
    , 'der eingebaute Weg, sonst hls.js': 'the built-in method, otherwise hls.js'
    , 'auf iPhone und iPad nicht möglich': 'not available on iPhone or iPad'
    , 'Das Videofeld des Browsers selbst': 'The browser video element itself'
    , 'Kennt keine Browser-Engine — hier hilft „Extern öffnen“': 'Not supported by browsers — use “Open externally”'
    , 'Die beiden Bibliotheken werden erst geholt, wenn sie ': 'The two libraries are loaded only when '
    , 'gebraucht werden — zuerst aus dem Ordner ': 'needed — first from the '
    , ' neben der App, sonst aus dem Netz.': ' folder next to the app, otherwise from the internet.'
    , 'Tastatur': 'Keyboard'
    , 'Vollbild ein und aus': 'Toggle fullscreen'
    , 'In der Senderliste blättern': 'Move through the channel list'
    , 'In das Suchfeld springen': 'Jump to the search field'
    , 'Bereich wechseln': 'Switch sections'
    , 'Das Bild läuft unten rechts weiter': 'The player continues in the bottom right'
    , 'Mit dem Finger': 'Touch controls'
    , 'Was gespeichert wird': 'What is stored'
    , 'Name, Quelle und Stand — im localStorage des Browsers': 'Name, source and status — in browser localStorage'
    , 'Die Sender selbst — in der IndexedDB des Browsers': 'The channels themselves — in the browser IndexedDB'
    , 'Name und Adresse der gemerkten und zuletzt gesehenen Sender': 'Names and URLs of saved and recently watched channels'
    , 'Lautstärke, Schalter, Vermittler': 'Volume, switches and proxy'
    , 'Wohin Verbindungen gehen': 'Where connections go'
    , 'Playlist und Streams werden direkt von deiner Quelle geholt — sie sieht deine IP-Adresse, wie bei jedem Abruf': 'Playlists and streams are fetched from your source — it sees your IP address, as with any request'
    , 'Die Bilder stehen in der Playlist und werden von dort geladen': 'The images are listed in the playlist and loaded from there'
    , 'Nur wenn sie gebraucht und nicht lokal hinterlegt sind: von cdnjs bzw. jsDelivr': 'Only when needed and not stored locally: from cdnjs or jsDelivr'
    , 'Nur wenn du selbst einen einträgst und einschaltest — dann sieht er die ': 'Only if you add and enable one — it can then see the '
    , 'vollständige Adresse samt Zugangsdaten, und bei „auch Streams“ läuft das ganze Bild über ihn': 'full URL including credentials; with “proxy streams too”, all video also goes through it'
    , 'Die App spielt allein, was du selbst einträgst. Für die Rechtmäßigkeit deiner Quellen ': 'The app only plays what you add. You are responsible for the legality of your sources'
    , 'bist du verantwortlich.': '.'
    , 'Anzeigesprache': 'Display language'
    , 'Playlist wählen oder eintragen': 'Choose or add a playlist'
    , 'Eingefügt': 'Pasted'
    , 'Eigene Sender': 'Individual channels'
    , 'Eintragen': 'Add'
    , 'Entfernen': 'Remove'
    , 'Quelle': 'Source'
    , 'Gruppe': 'Group'
    , 'Belegt': 'Used'
    , 'Vermittler': 'Proxy'
    , 'Zugangsdaten': 'Credentials'
    , 'Anbieter': 'Provider'
    , 'Quellen': 'sources'
    , 'Senderliste': 'channel list'
    , 'Sendern': 'channels'
    , 'gespeicherten': 'saved'
    , 'unbekannt': 'unknown'
    , 'Gemerkt': 'Saved'
    , 'Gespeichert': 'Saved'
    , 'Auf https gehoben': 'Upgraded to https'
    , 'Der Anbieter antwortet auch über https — es wird kein Vermittler gebraucht.': 'The provider also responds over https — no proxy is needed.'
    , 'Diese Quelle steht schon in der Liste.': 'This source is already in the list.'
    , 'Der Anbieter erlaubt den Abruf aus dem Browser nicht (CORS) oder ist nicht erreichbar.': 'The provider does not allow browser requests (CORS) or is unreachable.'
    , 'Die Adresse beginnt mit http, die App läuft über https — der Browser blockiert das. ': 'The URL starts with http while the app uses https — the browser blocks it. '
    , 'Auch der Vermittler kam nicht durch: Adresse und Schlüssel prüfen.': 'The proxy failed too: check the URL and key.'
    , 'Auch über den Vermittler kam nichts an: Adresse und Schlüssel prüfen.': 'The proxy returned nothing either: check the URL and key.'
    , 'Dagegen hilft ein Vermittler (Einstellungen › Playlisten aus dem Netz; ein fertiger ': 'A proxy helps here (Settings › Playlists from the internet; a ready-made '
    , 'liegt im Ordner proxy/). Sonst: Playlist per Datei oder Einfügen übernehmen.': 'is in the proxy/ folder). Otherwise import the playlist as a file or paste it.'
    , 'Der Browser blockiert Website-Daten.': 'The browser blocks website data.'
    , 'G04TV vergisst Playlisten und Favoriten beim Schließen.': 'G04TV forgets playlists and favorites when closed.'
    , 'Ein Antippen in der Senderliste startet den Sender gleich. Aus: der Sender wird nur gewählt, das Abspielen bleibt ein zweiter Schritt.': 'Tapping a channel in the list starts it immediately. Off: the channel is only selected; playback takes a second step.'
    , 'Beim Öffnen der App wird der zuletzt gesehene Sender vorbereitet. Der Browser verlangt für den Ton meist noch eine Berührung.': 'When the app opens, the last channel is prepared. The browser usually still requires a tap for sound.'
    , 'Zeigt vorher, welche Adresse an einen anderen Abspieler übergeben wird.': 'Shows which URL will be handed to another player first.'
    , 'Schaltet Animationen und den wandernden Schein im Hintergrund ab.': 'Disables animations and the moving glow in the background.'
    , 'Der Platzhalter ': 'The placeholder '
    , 'wird durch die abzurufende Adresse ersetzt. ': 'is replaced by the requested URL. '
    , 'Fehlt er, wird sie hinten angehängt. Im Ordner ': 'If it is missing, the URL is appended. The project folder '
    , ' des Projekts liegt ein fertiger ': ' contains a ready-made '
    , 'Cloudflare Worker dafür.': 'Cloudflare Worker.'
    , '-Sender trotz https und Anbieter, die CORS sperren. ': ' channels despite https, even when providers block CORS. '
    , 'Der Preis: die ': 'The trade-off: the '
    , 'gesamte Bandbreite': 'entire bandwidth'
    , ' geht durch den Vermittler — rund 2 GB je Stunde ': ' goes through the proxy — around 2 GB per hour '
    , 'und Sender.': 'and channel.'
    , 'Daten auf diesem Gerät': 'Data on this device'
    , 'G04TV bringt keine Sender mit — du trägst deine eigene Quelle ein. ': 'G04TV includes no channels — add your own source. '
    , 'Sie bleibt auf dem Gerät gespeichert.': 'It stays stored on the device.'
    , 'Playlist wählen oder eintragen': 'Choose or add a playlist'
    , 'Quelle eintragen — Adresse, Datei, Text oder Xtream': 'Add a source — URL, file, text or Xtream'
    , 'Gilt für dieses Gerät — es gibt kein Konto': 'Applies to this device — there is no account'
    , 'Über': 'About'
    , 'Daten & Recht': 'Data & Legal'
    , 'Doppeltippen ins Bild': 'Double-tap the player'
    , 'Ton aus und an': 'Mute and unmute'
    , 'Gewählten Sender abspielen': 'Play selected channel'
    , 'Der Browser bringt keinen Abspieler für IPTV mit. G04TV entscheidet ': 'The browser has no built-in IPTV player. G04TV decides '
    , 'nach der Adresse, welcher Weg passt:': 'which playback method fits the URL:'
    , 'Auf iPhone, iPad und in Safari der eingebaute Weg, sonst hls.js': 'Built-in playback on iPhone, iPad and Safari; hls.js elsewhere'
    , 'mpegts.js — auf iPhone und iPad nicht möglich': 'mpegts.js — not available on iPhone or iPad'
    , 'Das Videofeld des Browsers selbst': 'The browser video element itself'
    , 'Kennt keine Browser-Engine — hier hilft „Extern öffnen“': 'Not supported by browsers — use “Open externally”'
    , 'Es gibt keine Anmeldung und keine Stelle, an die Daten gemeldet würden.': 'There is no sign-in and no place where data is reported.'
    , 'Alles davon liegt auf diesem Gerät und lässt sich unter ': 'Everything is stored on this device and can be '
    , ' restlos entfernen.': ' removed completely.'
    , 'vollständige Adresse samt Zugangsdaten, und bei „auch Streams“ läuft das ganze Bild über ihn': 'full URL including credentials; with “proxy streams too”, all video also goes through it'
    , 'Zu den Inhalten.': 'About the content.'
    , 'G04TV liefert keine Sender mit und vermittelt keine. ': 'G04TV includes no channels and does not provide any. '
    , 'Die App spielt allein, was du selbst einträgst. Für die Rechtmäßigkeit deiner Quellen ': 'The app only plays what you add. You are responsible for the legality of your sources'
    , 'Der Stream ist beendet.': 'The stream has ended.'
    , 'Verbindung abgerissen – neuer Versuch …': 'Connection dropped — retrying …'
    , 'Bildfehler – neuer Versuch …': 'Picture error — retrying …'
    , 'Der Anbieter hat kein gültiges HLS-Manifest geliefert.': 'The provider did not return a valid HLS manifest.'
    , 'Die Senderliste des Streams war nicht erreichbar. Häufig blockiert der Anbieter den Abruf aus dem Browser (CORS) — ': 'The stream playlist was unavailable. The provider often blocks browser requests (CORS) — '
    , 'hier auch über den Vermittler nicht. Dann hilft „Extern öffnen“.': 'the proxy could not access it either. Try “Open externally”.'
    , 'dann hilft „Extern öffnen“ oder ein Vermittler für Streams (Einstellungen).': 'then try “Open externally” or enable a proxy for streams in Settings.'
    , 'HLS lässt sich hier nicht abspielen — hls.js konnte nicht geladen werden.': 'HLS cannot be played here — hls.js could not be loaded.'
    , 'MPEG-TS lässt sich hier nicht abspielen — mpegts.js konnte nicht geladen werden. ': 'MPEG-TS cannot be played here — mpegts.js could not be loaded. '
    , 'Auf iPhone und iPad ist dieses Format nicht möglich; dort hilft „Extern öffnen“.': 'This format is not available on iPhone or iPad; use “Open externally” there.'
    , 'Dieses Format kennt keine Browser-Engine (mkv, avi, wmv …). Mit „Extern öffnen“ an VLC weitergeben.': 'Browsers do not support this format (mkv, avi, wmv …). Use “Open externally” to send it to VLC.'
    , 'Dieser Sender läuft über http, die App über https. Der Browser blockiert das, ': 'This channel uses http while the app uses https. The browser blocks it, '
    , 'und der Anbieter antwortet auch nicht über https. Mit „Extern öffnen“ an einen ': 'and the provider does not respond over https. Use “Open externally” with a '
    , 'richtigen Abspieler weitergeben — oder in den Einstellungen einen Vermittler ': 'proper player — or enable a proxy in Settings '
    , 'auch für Streams einschalten.': 'for streams too.'
    , 'Der Browser verlangt eine Berührung, bevor Ton abgespielt wird. Sender noch einmal antippen.': 'The browser requires a tap before sound can play. Tap the channel again.'
    , 'Ein Abspieler für die eigenen IPTV-Playlisten — als Web-App für ': 'A player for your own IPTV playlists — as a web app for '
    , 'Playlisten, Favoriten und Zugänge bleiben auf dem Gerät.': 'Playlists, favorites and credentials stay on the device.'
    , 'Kein lokaler Speicher.': 'No local storage.'
    , 'Die Datenbank des Browsers ist gesperrt. Playlisten werden bei jedem Start neu geholt.': 'The browser database is locked. Playlists are fetched again on every start.'
    , 'G04TV startet mit einer leeren Ablage.': 'G04TV is starting with an empty store.'
    , 'Erst einen Sender wählen.': 'Choose a channel first.'
    , 'Tippe im Bereich Sender auf den Stern neben einem Sender. Er steht dann hier ': 'Tap the star next to a channel in Channels. It will appear here '
    , 'und ganz oben in der Senderliste — unabhängig davon, aus welcher Playlist er stammt.': 'and at the top of the channel list — regardless of which playlist it came from.'
    , 'G04TV bringt keine Sender mit. Trage deine eigene Playlist ein — als Adresse, ': 'G04TV includes no channels. Add your own playlist — as a URL, '
    , 'als Datei vom Gerät, als eingefügten Text oder als Xtream-Zugang.': 'a file from the device, pasted text or an Xtream login.'
    , 'Dieser Stream steht bereits in der Liste.': 'This stream is already in the list.'
    , 'Keine G04TV-Sicherung.': 'This is not a G04TV backup.'
    , 'Danach startet G04TV im Vollbild wie eine normale App — und die gespeicherten ': 'G04TV then starts fullscreen like a normal app — and the saved '
    , 'Playlisten sind dieselben.': 'playlists are the same.'
    , 'HTTP ': 'HTTP '
    , ' (über den Vermittler)': ' (via proxy)'
    // Neu: Startseite mit Live-Bild, MPEG-TS-Weg, neu gestaltete Ansichten
    , 'IndexedDB nicht verfügbar': 'IndexedDB not available'
    , 'Antippen zum Abspielen': 'Tap to play'
    , 'Wähle einen Sender aus der Liste — oder trage zuerst eine Playlist ein.': 'Choose a channel from the list — or add a playlist first.'
    , ' wird an einen anderen Abspieler übergeben ': ' will be handed to another player '
    , '(am Rechner z. B. VLC, auf dem Handy die App, die sich für Streams meldet).': '(on a computer e.g. VLC, on a phone the app registered for streams).'
    , 'Playlist als Datei speichern und hier einlesen, den Text einfügen — oder in den ': 'Save the playlist as a file and import it here, paste the text — or add a proxy in '
    , 'Einstellungen einen Vermittler eintragen.': 'Settings.'
    , 'Das ist ein einzelner Stream, keine Senderliste.': 'This is a single stream, not a channel list.'
    , 'nicht ladbar: ': 'cannot be loaded: '
    , 'Der MPEG-TS-Strom war nicht erreichbar. Häufig blockiert der Anbieter den Abruf aus dem Browser (CORS) — ': 'The MPEG-TS stream was not reachable. The provider often blocks browser requests (CORS) — '
    , 'dann hilft ein Vermittler für Streams (Einstellungen) oder „Extern öffnen“.': 'a stream proxy (Settings) or “Open externally” helps.'
    , 'MPEG-TS braucht auf dem iPhone iOS 17.1 oder neuer. Mit „Extern öffnen“ an einen Abspieler wie VLC weitergeben.': 'MPEG-TS needs iOS 17.1 or newer on iPhone. Use “Open externally” to hand it to a player like VLC.'
    , 'MPEG-TS lässt sich hier nicht abspielen — mpegts.js konnte nicht geladen werden.': 'MPEG-TS cannot be played here — mpegts.js could not be loaded.'
    , 'Wird über https versucht …': 'Trying via https …'
    , 'Versuch über MPEG-TS …': 'Trying MPEG-TS …'
    , 'Versuch über HLS …': 'Trying HLS …'
    , 'iPhone, Android und Desktop': 'iPhone, Android and desktop'
    , 'mpegts.js, auf dem iPhone ab iOS 17.1 — bei Xtream auch als HLS': 'mpegts.js, on iPhone from iOS 17.1 — for Xtream also as HLS'
    , ' G04TV ist eine reine Web-App. ': ' G04TV is a pure web app. '
    , 'Favoriten und Verlauf': 'Favorites and history'
    , 'Die vollständigen Hinweise stehen öffentlich und auch offline als eigene Seiten zur Verfügung.': 'The full notices are available publicly and offline as separate pages.'
    , 'Datenschutzerklärung': 'Privacy policy'
    , ' — Web-App für iPhone, Android und Desktop': ' — web app for iPhone, Android and desktop'
    , 'Ein einzelner Stream ohne Playlist — etwa ein Radiosender oder eine feste Adresse.': 'A single stream without a playlist — for example a radio station or a fixed URL.'
    , 'Füge deine eigenen Quellen sicher und lokal hinzu.': 'Add your own sources, safely and locally.'
    , 'Wähle, wie du deine Sender hinzufügen möchtest.': 'Choose how you want to add your channels.'
    , 'M3U- oder M3U8-Link': 'M3U or M3U8 link'
    , 'Text einfügen': 'Paste text'
    , 'Playlist direkt einfügen': 'Paste a playlist directly'
    , 'Server und Login': 'Server and login'
    , 'G04TV bringt keine Sender mit — du trägst deine eigene Quelle ein.': 'G04TV includes no channels — you add your own source.'
    , 'Probleme beim Laden einer Adresse?': 'Problems loading a URL?'
    , 'CORS, Anbieterfreigaben und Vermittler prüfen': 'Check CORS, provider permissions and proxy'
    , 'Hilfe öffnen': 'Open help'
    , 'Hilfe zum Laden': 'Loading help'
    , 'Playlisten und Zugangsdaten bleiben auf diesem Gerät. G04TV liefert keine Sender mit.': 'Playlists and credentials stay on this device. G04TV includes no channels.'
    , 'Wenn eine Online-Adresse nicht geladen wird, blockiert der Anbieter häufig den Browserzugriff (CORS). Prüfe zuerst die Adresse und ob die Playlist außerhalb von G04TV erreichbar ist.': 'If an online URL does not load, the provider often blocks browser access (CORS). First check the URL and whether the playlist is reachable outside G04TV.'
    , 'Alternativ kannst du die M3U-Datei speichern und über ': 'Alternatively, save the M3U file and import it via '
    , ' importieren. Für Quellen ohne Browserfreigabe kann ein eigener Vermittler in den Einstellungen helfen.': '. For sources without browser access, your own proxy in Settings can help.'
    , ' wird mit allen ': ' will be removed with all '
    , ' Sendern entfernt. Favoriten aus dieser Liste bleiben bestehen.': ' channels. Favorites from this list are kept.'
    , 'oder': 'or'
    , ' holt die Playlist stellvertretend — er sieht dabei die vollständige Adresse ': ' fetches the playlist on your behalf — it can see the full URL '
    , 'Wiedergabe, Darstellung und lokale Daten verwalten.': 'Manage playback, appearance and local data.'
    , 'Animationen und Hintergrundschein abschalten.': 'Turn off animations and background glow.'
    , 'Sender beim Antippen direkt starten.': 'Start channels as soon as you tap them.'
    , 'Zuletzt gesehenen Sender vorbereiten.': 'Prepare the last watched channel.'
    , 'Übergabe an einen anderen Player bestätigen.': 'Confirm before handing off to another player.'
    , 'Der Vermittler ist optional. Er holt eine blockierte Playlist stellvertretend — trage nur eine Adresse ein, der du selbst vertraust.': 'The proxy is optional. It fetches a blocked playlist on your behalf — only enter a URL you trust.'
    , 'Direkt versuchen; nur bei Bedarf über den Vermittler laden.': 'Try directly; use the proxy only when needed.'
    , ' wird durch die abgerufene Adresse ersetzt.': ' is replaced by the requested URL.'
    , 'Playlist und Videostream über den Vermittler laden.': 'Load playlist and video stream through the proxy.'
    , 'Die Sicherung enthält Einstellungen und Listen, nicht die Senderlisten selbst.': 'The backup contains settings and lists, not the channel lists themselves.'
    , 'Noch kein Sender gewählt': 'No channel selected yet'
    , 'Wähle einen Sender aus deiner Playlist.': 'Choose a channel from your playlist.'
    , 'Trage zuerst eine Playlist ein.': 'Add a playlist first.'
    , 'Nochmal': 'Retry'
    , 'Füge eine Adresse, Datei oder einen Stream-Zugang hinzu.': 'Add a URL, file or stream login.'
    , 'Markiere Sender mit einem Stern — sie erscheinen dann hier.': 'Mark channels with a star — they will appear here.'
    , 'Sender auswählen': 'Choose channel'
    , 'Playlisten, Favoriten und Zugänge werden nur lokal gespeichert. Es gibt kein Konto und keinen Server.': 'Playlists, favorites and logins are stored locally only. There is no account and no server.'
    , 'Live': 'Live'
    , 'Fehler': 'Error'
    , 'Alle Sender': 'All channels'
    // Playlisten-Ansicht
    , 'Playlist importieren': 'Import playlist'
    , 'Lokale Playlist': 'Local playlist'
    // Ueberschriften der neu gestalteten Ansichten
    , 'Antwort des Anbieters:': 'Provider response:'
    , 'Deine Playlists': 'Your playlists'
    , 'Bleibt auf diesem Gerät': 'Stays on this device'
    , 'Deine Einstellungen': 'Your settings'
    , 'Nur auf diesem Gerät': 'Only on this device'
    , 'IN WENIGEN SCHRITTEN ZUM FERNSEHEN': 'A FEW STEPS TO WATCH TV'
    , 'Schnellstart': 'Quick start'
    , 'Fernsehen': 'Watch TV'
    // Seitenleiste
    , 'läuft': 'playing'
    // Menue-Knopf
    , 'Menü schließen': 'Close menu'
    , 'Menü öffnen': 'Open menu'
    // Hell/Dunkel
    , 'Hellen Modus aktivieren': 'Switch to light mode'
    , 'Dunklen Modus aktivieren': 'Switch to dark mode'
    // Einstellungen: Sprache und Farbschema
    , 'Farbschema': 'Color scheme'
    , 'Dunkel': 'Dark'
    , 'Hell': 'Light'
    , 'Playlisten, Favoriten, Einstellungen': 'Playlists, favorites, settings'
    // Info
    , 'Ohne Konto, ohne Server, ohne Tracking. ': 'No account, no server, no tracking. '
    // Regal
    , 'Noch nichts gesehen — gespielte Sender erscheinen hier.': 'Nothing watched yet — channels you play appear here.'
    // Feedback-Formular
    , 'Feedback & Ideen': 'Feedback & ideas'
    , 'Bug gefunden, eine Idee oder ein Wunsch? Schreib mir eine Nachricht — ganz ohne Konto.': 'Found a bug, have an idea or a wish? Send me a message — no account needed.'
    , 'Deine Nachricht': 'Your message'
    , 'Deine E-Mail ': 'Your email '
    , '(optional, für eine Antwort)': '(optional, for a reply)'
    , 'Was möchtest du loswerden …': 'What would you like to tell me …'
    , 'du@beispiel.de': 'you@example.com'
    , 'Senden': 'Send'
    , 'Die Nachricht wird über formsubmit.co an den Entwickler geschickt.': 'The message is sent to the developer via formsubmit.co.'
    , 'Wird gesendet …': 'Sending …'
    , 'Danke! Deine Nachricht ist unterwegs.': 'Thanks! Your message is on its way.'
    , 'Senden hat nicht geklappt — bitte nochmal versuchen oder direkt an FodorPaul@web.de schreiben.': 'Sending failed — please try again or write directly to FodorPaul@web.de.'
    , 'Bitte zuerst eine Nachricht schreiben.': 'Please write a message first.'
    // Datenschutz: Feedback
    , 'Nichts wird ohne dein Zutun gemeldet oder an Dritte gegeben': 'Nothing is reported or passed to third parties without your action'
    , 'Es gibt keine Anmeldung und keine Stelle, an die Daten von selbst gemeldet würden. ': 'There is no sign-in and no place where data is reported automatically. '
    , 'Nur wenn du selbst Feedback schickst, geht deine Nachricht über formsubmit.co an den Entwickler.': 'Only if you send feedback yourself does your message go to the developer via formsubmit.co.'
    , 'Feedback-Formular': 'Feedback form'
    , 'Nur wenn du selbst auf „Senden“ tippst — Nachricht, freiwillige E-Mail und ': 'Only when you tap “Send” yourself — message, optional email and '
    , 'App-Version gehen über formsubmit.co an den Entwickler': 'app version go to the developer via formsubmit.co'
    // CarPlay/AirPlay
    , 'Live-TV': 'Live TV'
    , 'AirPlay hier nicht möglich': 'AirPlay not possible here'
    , 'Dieser Sender läuft als MPEG-TS. AirPlay geht mit HLS-Sendern (.m3u8).': 'This channel plays as MPEG-TS. AirPlay works with HLS channels (.m3u8).'
    // Startseite vereinfacht
    , 'Alle Sender': 'All channels'
    , 'Weitere laden': 'Load more'
    , 'Verlauf leeren': 'Clear history'
    , 'Noch keine Playlist — trage zuerst eine ein.': 'No playlist yet — add one first.'
    , 'Sender werden geladen …': 'Loading channels …'
    // Reiter kurz
    , 'Verlauf': 'Recent'
    // Info: Bereiche
    , 'Das Bild, darunter Favoriten, alle Sender mit Suche und der Verlauf': 'The player, below it favorites, all channels with search and your history'
    // Kategorien
    , 'Ohne Kategorie': 'No category'
    , 'Eigene Sender': 'Own channels'
    // Suchfeld
    , 'Suchen …': 'Search …'
    // Ansicht
    , 'Kacheln': 'Tiles'
    , 'Liste': 'List'
    , 'Ansicht': 'View'
    // Untere Leiste
    , 'Untere Leiste anzeigen': 'Show bottom bar'
    , 'Aus: mehr Platz für die Sender. Die Bereiche erreichst du dann über das Menü oben links.': 'Off: more room for channels. Reach the sections via the menu at the top left.'
    // Favoriten leer
    , 'Tippe auf der Startseite unter „Alle“ auf den Stern einer Sender-Kachel. ': 'On the start page under “All”, tap the star on a channel tile. '
    , 'Der Sender steht dann hier — unabhängig davon, aus welcher Playlist er stammt.': 'The channel then appears here — no matter which playlist it comes from.'
    // Sperre (Jugendschutz)
    , 'Code eingeben': 'Enter code'
    , 'Zu viele Versuche. Bitte warten:': 'Too many attempts. Please wait:'
    , 'Falscher Code': 'Wrong code'
    , 'Gesperrt': 'Locked'
    , 'Code eingeben, um fortzufahren.': 'Enter the code to continue.'
    , '„%s“ ist gesperrt. Code eingeben zum Ansehen.': '“%s” is locked. Enter the code to watch.'
    , 'Neuen Code festlegen': 'Set a new code'
    , '4 Ziffern wählen.': 'Choose 4 digits.'
    , 'Code wiederholen': 'Repeat code'
    , 'Zur Sicherheit noch einmal.': 'Once more, to be sure.'
    , 'Die Codes stimmen nicht überein. Noch einmal.': 'The codes don\'t match. Try again.'
    , 'Aktuellen Code eingeben': 'Enter current code'
    , 'Danach legst du den neuen fest.': 'Then you set the new one.'
    , 'Sperre aufheben': 'Remove lock'
    , 'Code eingeben. Danach ist nichts mehr gesperrt.': 'Enter the code. Afterwards nothing is locked any more.'
    , 'Erst einen Code festlegen': 'Set a code first'
    , 'Einstellungen › Sperre': 'Settings › Lock'
    , 'Code eingeben, um Sperren zu ändern.': 'Enter the code to change locks.'
    , 'Sperre (Jugendschutz)': 'Lock (parental control)'
    , 'Mit einem 4-stelligen Code lassen sich Playlisten, Kategorien und einzelne Sender sperren. Gesperrte Sender laufen erst nach Eingabe des Codes.': 'With a 4-digit code you can lock playlists, categories and single channels. Locked channels only play after entering the code.'
    , 'Code festlegen': 'Set code'
    , 'Entsperrt': 'Unlocked'
    , 'Code aktiv': 'Code active'
    , 'Wieder gesperrt in': 'Locks again in'
    , 'Min.': 'min'
    , 'Gesperrte Inhalte brauchen den Code.': 'Locked content needs the code.'
    , 'Kategorien': 'Categories'
    , 'Sperren setzt du mit dem Schloss: an den Sendern auf der Startseite, an den Kategorien unter „Alle“ und an den Playlisten.': 'Set locks with the padlock: on channels on the start page, on categories under “All” and on playlists.'
    , 'Jetzt sperren': 'Lock now'
    , 'Code ändern': 'Change code'
    , 'Der Code gilt nur auf diesem Gerät. Wer die Website-Daten im Browser löscht, löscht auch die Sperre.': 'The code only applies on this device. Clearing the website data in the browser also removes the lock.'
    , 'Code festgelegt': 'Code set'
    , 'Jetzt mit dem Schloss Sender, Kategorien oder Playlisten sperren.': 'Now use the padlock to lock channels, categories or playlists.'
    , 'Gesperrte Inhalte brauchen wieder den Code.': 'Locked content needs the code again.'
    , 'Code geändert': 'Code changed'
    , 'Sperre aufgehoben': 'Lock removed'
    , 'Code und alle Sperren sind gelöscht.': 'The code and all locks have been deleted.'
    , 'Playlist gesperrt': 'Playlist locked'
    , 'Playlist sperren': 'Lock playlist'
    , 'Sender sperren': 'Lock channel'
    , 'Gesperrt über Kategorie oder Playlist': 'Locked via category or playlist'
    , 'Kategorie sperren': 'Lock category'
    , 'Kategorie entsperren': 'Unlock category'
    , 'Diese Playlist ist gesperrt.': 'This playlist is locked.'
    , 'Entsperren': 'Unlock'
    , 'Dort lässt sich die Sperre aufheben.': 'The lock can be removed there.'
    , 'Sender gesperrt': 'Channel locked'
    , 'Kategorie gesperrt': 'Category locked'
  };


  /* ------------------------------------------------------------
     Uebersetzen
     ------------------------------------------------------------ */
  var keys = Object.keys(MAP).sort(function (a, b) { return b.length - a.length; });
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  var WORD = /[\p{L}\p{N}]/u;
  var re = new RegExp(keys.map(function (k) {
    return (WORD.test(k.charAt(0)) ? '(?<![\\p{L}\\p{N}])' : '') + escRe(k) +
      (WORD.test(k.charAt(k.length - 1)) ? '(?![\\p{L}\\p{N}])' : '');
  }).join('|'), 'gu');

  function translate(text) {
    var value = String(text == null ? '' : text);
    if (lang === 'de' || !value.trim()) return value;
    var t = value.trim();
    if (Object.prototype.hasOwnProperty.call(MAP, t)) {
      return value.slice(0, value.indexOf(t)) + MAP[t] + value.slice(value.indexOf(t) + t.length);
    }
    return value.replace(re, function (m) { return MAP[m] || m; });
  }

  /* Was der Nutzer selbst eingetragen hat, bleibt wie es ist. */
  var SKIP = '[data-no-translate], script, style, code, textarea, option, ' +
    '.ch-row__main, .ch-tile__name, .ch-tile__grp, .transport__meta, .start-now__name, .start-now__sub, ' +
    '#pdockTitle, .live-chip span, .now-chip__meta, .stage__idle b, .toast .small';

  function skip(el) { return !!(el && el.closest && el.closest(SKIP)); }

  var srcText = new WeakMap();   // Textknoten -> {src, out}
  var srcAttr = new WeakMap();   // Element -> {attr: {src, out}}
  var ATTRS = ['title', 'aria-label', 'placeholder'];
  var busy = false;

  function doText(node) {
    if (skip(node.parentElement)) return;
    var rec = srcText.get(node);
    var src = rec && node.nodeValue === rec.out ? rec.src : node.nodeValue;
    var out = translate(src);
    srcText.set(node, { src: src, out: out });
    if (out !== node.nodeValue) node.nodeValue = out;
  }

  function doAttrs(el) {
    // Textfelder selbst bleiben unberuehrt (Eingaben!), ihr Platzhalter
    // und ihre Beschriftung fuer Vorleser aber nicht.
    if (el.tagName === 'TEXTAREA' ? skip(el.parentElement) : skip(el)) return;
    var map = srcAttr.get(el) || {};
    ATTRS.forEach(function (a) {
      if (!el.hasAttribute(a)) return;
      var cur = el.getAttribute(a), rec = map[a];
      var src = rec && cur === rec.out ? rec.src : cur;
      var out = translate(src);
      map[a] = { src: src, out: out };
      if (out !== cur) el.setAttribute(a, out);
    });
    srcAttr.set(el, map);
  }

  function apply(root) {
    root = root || document.documentElement;
    busy = true;
    try {
      if (root.nodeType === 3) { doText(root); return; }
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      var node;
      while ((node = walker.nextNode())) doText(node);
      if (root.nodeType === 1) doAttrs(root);
      if (root.querySelectorAll) root.querySelectorAll('[title], [aria-label], [placeholder]').forEach(doAttrs);
    } finally { busy = false; }
  }

  /* ------------------------------------------------------------
     Umschalten
     ------------------------------------------------------------ */
  function setLanguage(next) {
    next = next === 'en' ? 'en' : 'de';
    if (next === lang) return;
    lang = next;
    try { localStorage.setItem(KEY, lang); } catch (e) { /* optional */ }
    if (G.store && G.store.state) {
      G.store.state.settings.language = lang;
      try { G.store.commit('settings'); } catch (e) { /* optional */ }
    }
    document.documentElement.lang = lang;
    apply(document.documentElement);
    // Ansichten bauen Zahlen und Zeiten neu (1.234 / 1,234; "vor 2 Stunden").
    if (G.app && G.app.rerender) G.app.rerender();
    document.dispatchEvent(new CustomEvent('g04tv:language', { detail: { language: lang } }));
  }

  try {
    var stored = localStorage.getItem(KEY);
    if (stored === 'de' || stored === 'en') lang = stored;
  } catch (e) { /* bleibt Deutsch */ }

  G.i18n = {
    get language() { return lang; },
    t: translate,
    apply: apply,
    setLanguage: setLanguage,
    /** Aus den gespeicherten Einstellungen (auch nach dem Einlesen einer Sicherung). */
    useState: function (settings) {
      if (!settings) return;
      if (settings.language === 'de' || settings.language === 'en') {
        lang = settings.language;
        try { localStorage.setItem(KEY, lang); } catch (e) { /* optional */ }
        document.documentElement.lang = lang;
        apply(document.documentElement);
      } else {
        settings.language = lang;
      }
    }
  };

  document.documentElement.lang = lang;
  function start() {
    apply(document.documentElement);
    new MutationObserver(function (records) {
      if (busy || lang === 'de') return;
      records.forEach(function (r) {
        if (r.type === 'characterData') apply(r.target);
        else if (r.type === 'attributes') doAttrs(r.target);
        else r.addedNodes.forEach(function (n) {
          if (n.nodeType === 1 || n.nodeType === 3) apply(n);
        });
      });
    }).observe(document.documentElement, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(G04TV);
