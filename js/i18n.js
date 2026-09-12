/* ============================================================
   G04TV — Sprachumschaltung

   Die deutsche Textquelle bleibt im Code erhalten. Beim ersten Start
   wird Englisch verwendet; die Auswahl liegt lokal im Browser. Ein
   MutationObserver übersetzt auch Inhalte, die später durch Ansichten,
   Blätter, Meldungen oder den Abspieler in den DOM kommen.
   ============================================================ */
(function (G) {
  'use strict';

  var KEY = 'g04tv.language';
  var lang = 'en';

  var MAP = {
    'Hauptnavigation': 'Main navigation',
    'Navigation': 'Navigation',
    'Menü': 'Menu',
    'Start': 'Home',
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
  };

  var keys = Object.keys(MAP).sort(function (a, b) { return b.length - a.length; });
  var pattern = keys.map(function (key) {
    return key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('|');
  var MAP_LOWER = {};
  keys.forEach(function (key) { MAP_LOWER[key.toLowerCase()] = MAP[key]; });
  var re = pattern ? new RegExp(pattern, 'gi') : null;

  function translate(text) {
    var value = String(text == null ? '' : text);
    if (lang === 'de' || !re || !value.trim()) return value;
    return value.replace(re, function (match) { return MAP[match] || MAP_LOWER[match.toLowerCase()] || match; });
  }

  function shouldSkip(node) {
    var parent = node.parentElement;
    return !!(parent && parent.closest && parent.closest('[data-no-translate], script, style, code, textarea'));
  }

  function apply(root) {
    root = root || document;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (!shouldSkip(node)) {
        var next = translate(node.nodeValue);
        if (next !== node.nodeValue) node.nodeValue = next;
      }
    }
    if (root.querySelectorAll) {
      root.querySelectorAll('[title], [aria-label], [placeholder]').forEach(function (el) {
        ['title', 'aria-label', 'placeholder'].forEach(function (attr) {
          if (el.hasAttribute(attr)) {
            var next = translate(el.getAttribute(attr));
            if (next !== el.getAttribute(attr)) el.setAttribute(attr, next);
          }
        });
      });
    }
  }

  function setLanguage(next) {
    var nextLang = next === 'de' ? 'de' : 'en';
    if (nextLang === lang) return;
    lang = nextLang;
    try { localStorage.setItem(KEY, lang); } catch (e) { /* optional */ }
    document.documentElement.lang = lang;
    // Die Ansichten erzeugen deutsche Quelltexte neu. Ein Reload setzt auch
    // statische Texte außerhalb des aktuellen Bereichs zuverlässig um.
    location.reload();
  }

  try {
    var stored = localStorage.getItem(KEY);
    if (stored === 'de' || stored === 'en') lang = stored;
  } catch (e) { /* first start stays English */ }

  G.i18n = {
    get language() { return lang; },
    t: translate,
    apply: apply,
    setLanguage: setLanguage,
    useState: function (settings) {
      if (settings && (settings.language === 'de' || settings.language === 'en')) {
        var changed = settings.language !== lang;
        lang = settings.language;
        try { localStorage.setItem(KEY, lang); } catch (e) { /* optional */ }
        document.documentElement.lang = lang;
        // Ein importiertes Backup kann eine andere Sprache enthalten als die
        // bisher lokal gemerkte Auswahl. Dann muss auch die statische HTML-
        // Oberfläche neu aufgebaut werden.
        if (changed && document.readyState !== 'loading') {
          location.reload();
          return;
        }
        apply(document);
      }
    }
  };

  document.documentElement.lang = lang;
  apply(document);
  new MutationObserver(function (records) {
    records.forEach(function (record) {
      if (record.type === 'characterData') apply(record.target.parentElement || document);
      if (record.type === 'childList') record.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) apply(node);
        else if (node.nodeType === 3 && node.parentElement) apply(node.parentElement);
      });
      if (record.type === 'attributes') apply(record.target.parentElement || record.target);
    });
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title', 'aria-label', 'placeholder'] });
})(G04TV);
