/* ============================================================
   G04TV — Info (ausklappbar in den Einstellungen)

   Was die App tut, was sie nicht tut, wie sie bedient wird und
   was rechtlich gilt.
   ============================================================ */
(function (G) {
  'use strict';
  var u = G.u;

  var tab = 'info';
  var isOpen = false;       // bleibt aufgeklappt, wenn die Einstellungen neu gezeichnet werden

  var KEYS = [
    ['Leertaste / Enter', 'Gewählten Sender abspielen'],
    ['F', 'Vollbild ein und aus'],
    ['Esc', 'Vollbild verlassen'],
    ['M', 'Ton aus und an'],
    ['↑ ↓', 'In der Senderliste blättern'],
    ['/', 'In das Suchfeld springen'],
    ['1 – 3', 'Bereich wechseln']
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
          [['start', 'Start', 'Das Bild, darunter Favoriten, alle Sender mit Suche und der Verlauf'],
           ['playlists', 'Playlisten', 'Quellen eintragen, aktualisieren, ersetzen, löschen'],
           ['settings', 'Einstellungen', 'Wiedergabe, Vermittler, Sicherung und Löschen — und diese Info']].map(function (r) {
            return '<div class="list__row"><span class="list__ic">' +
              u.icon(r[0] === 'favorites' ? 'star' : r[0], 17) + '</span>' +
              '<span class="list__main"><b>' + r[1] + '</b><span>' + r[2] + '</span></span></div>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card__head">' + u.icon('info', 18) + '<h3>Womit gespielt wird</h3></div>' +
        '<p class="small muted">Der Browser bringt keinen Abspieler für IPTV mit. G04TV entscheidet ' +
        'nach der Adresse, welcher Weg passt:</p>' +
        '<div class="list">' +
          [['HLS · *.m3u8', 'Auf iPhone, iPad und in Safari der eingebaute Weg, sonst hls.js'],
           ['MPEG-TS · *.ts', 'mpegts.js, auf dem iPhone ab iOS 17.1 — bei Xtream auch als HLS'],
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
      '<div><b>Kein Konto, kein Server, kein Tracking.</b> G04TV ist eine reine Web-App. ' +
      'Es gibt keine Anmeldung und keine Stelle, an die Daten von selbst gemeldet würden. ' +
      'Nur wenn du selbst Feedback schickst, geht deine Nachricht über formsubmit.co an den Entwickler.</div></div>' +

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
           ['Vermittler', 'Nur wenn du selbst einen einträgst und einschaltest — dann sieht er die ' +
            'vollständige Adresse samt Zugangsdaten, und bei „auch Streams“ läuft das ganze Bild über ihn'],
           ['Feedback-Formular', 'Nur wenn du selbst auf „Senden“ tippst — Nachricht, freiwillige E-Mail und ' +
            'App-Version gehen über formsubmit.co an den Entwickler']].map(function (r) {
            return '<div class="list__row"><span class="list__main"><b>' + r[0] + '</b><span>' + r[1] + '</span></span></div>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card__head">' + u.icon('shield', 18) + '<h3>Datenschutz &amp; Urheberrecht</h3></div>' +
        '<p class="small muted">Die vollständigen Hinweise stehen öffentlich und auch offline als eigene Seiten zur Verfügung.</p>' +
        '<div class="btn-row">' +
          '<a class="btn" href="privacy.html">Datenschutzerklärung</a>' +
          '<a class="btn" href="copyright.html">Urheberrecht &amp; Inhalte</a>' +
        '</div>' +
      '</div>' +

      '<div class="note note--warn">' + u.icon('warn', 18) +
      '<div><b>Zu den Inhalten.</b> G04TV liefert keine Sender mit und vermittelt keine. ' +
      'Die App spielt allein, was du selbst einträgst. Für die Rechtmäßigkeit deiner Quellen ' +
      'bist du verantwortlich.</div></div>' +
    '</div>';
  }

  /* Wiedergabe-Protokoll: wie oft und warum es hängt. Bleibt auf dem Gerät;
     nur wer „Kopieren“ tippt, nimmt den Text mit. Adressen stehen nicht darin. */
  function diagText() {
    var P = G.player, s = P.stats();
    var net = navigator.connection || {};
    return [
      G.NAME + ' ' + G.VERSION + ' · ' + (navigator.userAgent.match(/\(([^)]+)\)/) || ['', '?'])[1],
      'Netz: ' + (net.effectiveType || '?') + (net.downlink ? ' · ' + net.downlink + ' Mbit/s' : '') +
        ' · Vermittler für Streams: ' + (G.store.state.settings.proxyStreams ? 'an' : 'aus'),
      'Jetzt: ' + (P.channel ? (P.channel.name || '') + ' · Art ' + P.kindOf(P.channel.url) : 'nichts') +
        ' · ' + s.status,
      s.text,
      '',
    ].concat(P.log().length ? P.log() : ['(noch keine Ereignisse)']).join('\n');
  }

  function diagTab() {
    return '<div class="stack">' +
      '<div class="card">' +
        '<div class="card__head">' + u.icon('live', 18) + '<h3>Wiedergabe-Protokoll</h3></div>' +
        '<p class="small muted">Hängt oder ruckelt ein Sender, steht hier, womit er lief und wie voll der Puffer war. ' +
        'Das bleibt auf diesem Gerät. Adressen und Zugangsdaten stehen nicht darin.</p>' +
        '<pre class="diag" id="diagText" style="white-space:pre-wrap;word-break:break-word;font:12px/1.5 var(--mono);margin:12px 0;padding:12px;border-radius:12px;background:rgba(0,0,0,.28);border:1px solid var(--glass-br);max-height:46vh;overflow:auto">' +
          u.esc(diagText()) + '</pre>' +
        '<div class="btn-row">' +
          '<button class="btn btn--primary" id="diagCopy">' + u.icon('file', 16) + ' Kopieren</button>' +
          '<button class="btn" id="diagRefresh">Aktualisieren</button>' +
          '<button class="btn btn--ghost" id="diagClear">Leeren</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function tabsHtml() {
    return [['info', 'Über'], ['keys', 'Bedienung'], ['diag', 'Wiedergabe'], ['privacy', 'Daten & Recht']].map(function (t) {
      return '<button class="tabs__b' + (tab === t[0] ? ' is-on' : '') + '" data-tab="' + t[0] + '">' + u.esc(t[1]) + '</button>';
    }).join('');
  }

  function bodyHtml() {
    return tab === 'info' ? infoTab() : tab === 'keys' ? keysTab() : tab === 'diag' ? diagTab() : privacyTab();
  }

  /** Der Abschnitt für die Einstellungen: zugeklappt zeigt er nur die Überschrift. */
  function html() {
    return '<details class="card settings-section settings-info" id="infoBox"' + (isOpen ? ' open' : '') + '>' +
      '<summary class="settings-section__head">' + u.icon('info', 22) + '<h3>Info</h3>' +
        '<span class="settings-info__ver">' + u.esc(G.NAME + ' ' + G.VERSION) + '</span></summary>' +
      '<div class="settings-info__body">' +
        '<div class="tabs" id="infoTabs">' + tabsHtml() + '</div>' +
        '<div id="infoBody">' + bodyHtml() + '</div>' +
      '</div>' +
    '</details>';
  }

  function mount() {
    var box = u.$('#infoBox');
    if (!box) return;

    box.addEventListener('toggle', function () { isOpen = box.open; });

    var paintDiag = function () { var el = u.$('#diagText'); if (el) el.textContent = diagText(); };
    u.on(box, 'click', '#diagRefresh', paintDiag);
    u.on(box, 'click', '#diagClear', function () { G.player.clearLog(); paintDiag(); });
    u.on(box, 'click', '#diagCopy', function () {
      var text = diagText();
      var done = function () { u.toast('Kopiert', 'Das Protokoll liegt in der Zwischenablage.', 'ok'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { });
      else { var el = u.$('#diagText'); if (el) { var r = document.createRange(); r.selectNodeContents(el); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); } }
    });
    // Nur der Inhalt wird getauscht - die Einstellungen bleiben, wie sie sind
    u.on(box, 'click', '[data-tab]', function (e, t) {
      tab = t.getAttribute('data-tab');
      u.$('#infoTabs').innerHTML = tabsHtml();
      u.$('#infoBody').innerHTML = bodyHtml();
    });
  }

  G.info = { html: html, mount: mount };
})(G04TV);
