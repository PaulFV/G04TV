/* ============================================================
   GoTV — Bereich Info

   Was die App tut, was sie nicht tut, wie sie bedient wird und
   was rechtlich gilt.
   ============================================================ */
(function (G) {
  'use strict';
  var u = G.u;
  G.views = G.views || {};

  var tab = 'info';

  var KEYS = [
    ['Leertaste / Enter', 'Gewählten Sender abspielen'],
    ['F', 'Vollbild ein und aus'],
    ['Esc', 'Vollbild verlassen'],
    ['M', 'Ton aus und an'],
    ['↑ ↓', 'In der Senderliste blättern'],
    ['/', 'In das Suchfeld springen'],
    ['1 – 6', 'Bereich wechseln']
  ];

  function infoTab() {
    return '<div class="stack">' +
      '<div class="card card--hero">' +
        '<div class="stack stack--sm">' +
          '<span class="pill pill--acc">' + u.icon('live', 13) + ' Version ' + u.esc(G.VERSION) + '</span>' +
          '<h2 style="font-size:22px">' + u.esc(G.NAME) + '</h2>' +
          '<p class="muted small">Ein Abspieler für die eigenen IPTV-Playlisten — als Web-App für ' +
          '<b>iPhone, Android und Desktop</b>. Ohne Konto, ohne Server, ohne Tracking. ' +
          'Playlisten, Favoriten und Zugänge bleiben auf dem Gerät.</p>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card__head">' + u.icon('playlists', 18) + '<h3>Die Bereiche</h3></div>' +
        '<div class="list">' +
          [['start', 'Start', 'Was zuletzt lief, Favoriten, Stand der Playlisten'],
           ['live', 'Sender', 'Senderliste mit Suche und Gruppen, daneben das Bild'],
           ['playlists', 'Playlisten', 'Quellen eintragen, aktualisieren, ersetzen, löschen'],
           ['favorites', 'Favoriten', 'Die markierten Sender, in eigener Reihenfolge'],
           ['settings', 'Einstellungen', 'Wiedergabe, Vermittler, Sicherung und Löschen'],
           ['info', 'Info', 'Dieser Bereich']].map(function (r) {
            return '<div class="list__row"><span class="list__ic">' +
              u.icon(r[0] === 'favorites' ? 'star' : r[0], 17) + '</span>' +
              '<span class="list__main"><b>' + r[1] + '</b><span>' + r[2] + '</span></span></div>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card__head">' + u.icon('info', 18) + '<h3>Womit gespielt wird</h3></div>' +
        '<p class="small muted">Der Browser bringt keinen Abspieler für IPTV mit. GoTV entscheidet ' +
        'nach der Adresse, welcher Weg passt:</p>' +
        '<div class="list">' +
          [['HLS · *.m3u8', 'Auf iPhone, iPad und in Safari der eingebaute Weg, sonst hls.js'],
           ['MPEG-TS · *.ts', 'mpegts.js — auf iPhone und iPad nicht möglich'],
           ['MP4, WebM, MP3 …', 'Das Videofeld des Browsers selbst'],
           ['MKV, AVI, WMV …', 'Kennt keine Browser-Engine — hier hilft „Extern öffnen“']].map(function (r) {
            return '<div class="list__row"><span class="list__main"><b>' + r[0] + '</b><span>' + r[1] + '</span></span></div>';
          }).join('') +
        '</div>' +
        '<p class="tiny dim" style="margin-top:10px">Die beiden Bibliotheken werden erst geholt, wenn sie ' +
        'gebraucht werden — zuerst aus dem Ordner <b>vendor/</b> neben der App, sonst aus dem Netz.</p>' +
      '</div>' +
    '</div>';
  }

  function keysTab() {
    return '<div class="stack">' +
      '<div class="card">' +
        '<div class="card__head">' + u.icon('grid', 18) + '<h3>Tastatur</h3></div>' +
        '<div class="list">' +
          KEYS.map(function (k) {
            return '<div class="list__row"><span class="list__main"><b>' + u.esc(k[0]) + '</b>' +
              '<span>' + u.esc(k[1]) + '</span></span></div>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card__head">' + u.icon('live', 18) + '<h3>Mit dem Finger</h3></div>' +
        '<div class="list">' +
          [['Antippen', 'Sender abspielen'],
           ['Stern antippen', 'Sender merken oder vergessen'],
           ['Doppeltippen ins Bild', 'Vollbild ein und aus'],
           ['Bereich wechseln', 'Das Bild läuft unten rechts weiter']].map(function (k) {
            return '<div class="list__row"><span class="list__main"><b>' + k[0] + '</b><span>' + k[1] + '</span></span></div>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function privacyTab() {
    return '<div class="stack">' +
      '<div class="note note--acc">' + u.icon('shield', 18) +
      '<div><b>Kein Konto, kein Server, kein Tracking.</b> GoTV ist eine reine Web-App. ' +
      'Es gibt keine Anmeldung und keine Stelle, an die Daten gemeldet würden.</div></div>' +

      '<div class="card">' +
        '<div class="card__head">' + u.icon('shield', 18) + '<h3>Was gespeichert wird</h3></div>' +
        '<div class="list">' +
          [['Playlisten', 'Name, Quelle und Stand — im localStorage des Browsers'],
           ['Senderlisten', 'Die Sender selbst — in der IndexedDB des Browsers'],
           ['Favoriten und Verlauf', 'Name und Adresse der gemerkten und zuletzt gesehenen Sender'],
           ['Einstellungen', 'Lautstärke, Schalter, Vermittler']].map(function (r) {
            return '<div class="list__row"><span class="list__main"><b>' + r[0] + '</b><span>' + r[1] + '</span></span></div>';
          }).join('') +
        '</div>' +
        '<p class="tiny dim" style="margin-top:10px">Alles davon liegt auf diesem Gerät und lässt sich unter ' +
        '<b>Einstellungen · Alles löschen</b> restlos entfernen.</p>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card__head">' + u.icon('link', 18) + '<h3>Wohin Verbindungen gehen</h3></div>' +
        '<div class="list">' +
          [['Dein Anbieter', 'Playlist und Streams werden direkt von deiner Quelle geholt — sie sieht deine IP-Adresse, wie bei jedem Abruf'],
           ['Senderlogos', 'Die Bilder stehen in der Playlist und werden von dort geladen'],
           ['hls.js / mpegts.js', 'Nur wenn sie gebraucht und nicht lokal hinterlegt sind: von cdnjs bzw. jsDelivr'],
           ['Vermittler', 'Nur wenn du selbst einen einträgst und einschaltest']].map(function (r) {
            return '<div class="list__row"><span class="list__main"><b>' + r[0] + '</b><span>' + r[1] + '</span></span></div>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="note note--warn">' + u.icon('warn', 18) +
      '<div><b>Zu den Inhalten.</b> GoTV liefert keine Sender mit und vermittelt keine. ' +
      'Die App spielt allein, was du selbst einträgst. Für die Rechtmäßigkeit deiner Quellen ' +
      'bist du verantwortlich.</div></div>' +
    '</div>';
  }

  function render() {
    return '<div class="view stack">' +
      '<div class="tabs" id="infoTabs">' +
        '<button class="tabs__b' + (tab === 'info' ? ' is-on' : '') + '" data-tab="info">Über</button>' +
        '<button class="tabs__b' + (tab === 'keys' ? ' is-on' : '') + '" data-tab="keys">Bedienung</button>' +
        '<button class="tabs__b' + (tab === 'privacy' ? ' is-on' : '') + '" data-tab="privacy">Daten &amp; Recht</button>' +
      '</div>' +
      (tab === 'info' ? infoTab() : tab === 'keys' ? keysTab() : privacyTab()) +
    '</div>';
  }

  function mount(host) {
    u.on(host, 'click', '[data-tab]', function (e, t) {
      tab = t.getAttribute('data-tab');
      G.app.rerender();
    });
  }

  G.views.info = {
    title: 'Info',
    sub: function () { return G.NAME + ' ' + G.VERSION + ' — Web-App für iPhone, Android und Desktop'; },
    render: render,
    mount: mount
  };
})(GoTV);
