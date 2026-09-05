/* ============================================================
   GoTV — Bereich Start

   Was zuletzt lief, die Favoriten und der Stand der Playlisten -
   alles, womit man ohne Umweg weitermacht.
   ============================================================ */
(function (G) {
  'use strict';
  var u = G.u;
  G.views = G.views || {};

  function greeting() {
    var h = new Date().getHours();
    if (h < 5) return 'Gute Nacht';
    if (h < 11) return 'Guten Morgen';
    if (h < 18) return 'Guten Tag';
    return 'Guten Abend';
  }

  function tile(c, playing) {
    return '<button class="ch-tile' + (playing ? ' is-playing' : '') + '" data-play="' + u.esc(c.url) + '">' +
      u.logoHtml(c, 'ch-tile__logo') +
      '<span class="ch-tile__name">' + u.esc(c.name) + '</span>' +
      '<span class="ch-tile__grp">' + u.esc(c.group || '—') + '</span>' +
    '</button>';
  }

  function hero() {
    var s = G.store.state;
    var c = G.player.channel || s.last;
    var running = G.player.status === 'playing' || G.player.status === 'loading';

    if (!c) {
      return '<div class="card card--hero">' +
        '<div class="stack stack--sm">' +
        '<span class="pill pill--acc">' + u.icon('live', 13) + ' ' + u.esc(G.NAME) + ' ' + u.esc(G.VERSION) + '</span>' +
        '<h2 style="font-size:22px">' + greeting() + '</h2>' +
        '<p class="muted small">Noch läuft nichts. Wähle einen Sender aus deiner Playlist — ' +
        'oder trage zuerst eine Playlist ein.</p>' +
        '<div class="btn-row"><button class="btn btn--primary" data-go="live">' + u.icon('play', 16) + ' Zu den Sendern</button>' +
        '<button class="btn" data-go="playlists">' + u.icon('plus', 16) + ' Playlist</button></div>' +
        '</div></div>';
    }

    return '<div class="card card--hero">' +
      '<div class="row" style="align-items:flex-start;gap:14px">' +
        u.logoHtml(c, 'transport__logo') +
        '<div class="stack stack--sm" style="flex:1;min-width:0">' +
          '<span class="pill ' + (running ? 'pill--acc' : 'pill--muted') + '">' +
            '<i class="pill__dot"></i>' + (running ? 'Läuft gerade' : 'Zuletzt gesehen') + '</span>' +
          '<h2 style="font-size:22px" class="ellips">' + u.esc(c.name) + '</h2>' +
          '<p class="muted small ellips">' + u.esc(c.group || G.player.kindOf(c.url).toUpperCase()) +
            (s.last && s.last.at ? ' · ' + u.esc(u.relTime(s.last.at)) : '') + '</p>' +
          '<div class="btn-row">' +
            (running
              ? '<button class="btn btn--primary" data-go="live">' + u.icon('live', 16) + ' Zum Bild</button>' +
                '<button class="btn" id="stHeroStop">' + u.icon('stop', 16) + ' Anhalten</button>'
              : '<button class="btn btn--primary" data-play="' + u.esc(c.url) + '">' + u.icon('play', 16) + ' Weitersehen</button>') +
            '<button class="btn" id="stHeroExt">' + u.icon('external', 16) + ' Extern</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function playlistCard() {
    var s = G.store.state;

    if (!s.playlists.length) {
      return '<div class="card">' +
        '<div class="card__head">' + u.icon('playlists', 18) + '<h3>Playlisten</h3></div>' +
        '<div class="empty" style="padding:22px 6px">' +
        '<b>Keine Playlist</b><p>Trage deine Quelle ein — Adresse, Datei, eingefügter Text oder Xtream-Zugang.</p>' +
        '<div class="btn-row"><button class="btn btn--sm btn--primary" data-go="playlists">Hinzufügen</button></div>' +
        '</div></div>';
    }

    var total = s.playlists.reduce(function (n, p) { return n + (p.count || 0); }, 0);
    var broken = s.playlists.filter(function (p) { return !!p.error; }).length;

    return '<div class="card">' +
      '<div class="card__head">' + u.icon('playlists', 18) + '<h3>Playlisten</h3><span class="spacer"></span>' +
        '<button class="btn btn--sm" data-go="playlists">Verwalten</button></div>' +
      '<div class="grid grid--2" style="gap:12px;margin-bottom:14px">' +
        '<div class="stat stat--acc"><span class="stat__k">Sender</span><span class="stat__v">' + u.fmtInt(total) + '</span></div>' +
        '<div class="stat"><span class="stat__k">Listen</span><span class="stat__v">' + s.playlists.length + '</span>' +
        (broken ? '<span class="stat__d" style="color:var(--warn)">' + broken + ' mit Fehler</span>' : '') + '</div>' +
      '</div>' +
      '<div class="list">' +
        s.playlists.slice(0, 4).map(function (p) {
          return '<div class="list__row list__row--click" data-open="' + u.esc(p.id) + '">' +
            '<span class="list__ic">' + u.icon(p.kind === 'xtream' ? 'key' : p.kind === 'url' ? 'link' : 'file', 17) + '</span>' +
            '<span class="list__main"><b>' + u.esc(p.name) + '</b>' +
            '<span>' + (p.error ? '⚠ ' + u.esc(p.error.slice(0, 60)) : u.fmtInt(p.count) + ' Sender · ' + u.esc(u.relTime(p.updatedAt))) + '</span></span>' +
            '<span class="list__end dim">' + u.icon('chevron', 16) + '</span>' +
          '</div>';
        }).join('') +
      '</div></div>';
  }

  function favCard() {
    var s = G.store.state;
    var playing = G.player.channel;

    if (!s.favorites.length) {
      return '<div class="card">' +
        '<div class="card__head">' + u.icon('star', 18) + '<h3>Favoriten</h3></div>' +
        '<div class="empty" style="padding:22px 6px"><b>Noch keine Favoriten</b>' +
        '<p>Der Stern an einem Sender merkt ihn hier vor — quer über alle Playlisten hinweg.</p></div>' +
        '</div>';
    }

    return '<div class="card">' +
      '<div class="card__head">' + u.icon('star', 18) + '<h3>Favoriten</h3><span class="spacer"></span>' +
      '<span class="tiny dim">' + s.favorites.length + '</span>' +
      '<button class="btn btn--sm" data-go="favorites">Alle</button></div>' +
      '<div class="grid grid--tiles">' +
        s.favorites.slice(0, 8).map(function (c) {
          return tile(c, playing && G.m3u.sameSource(playing.url, c.url));
        }).join('') +
      '</div></div>';
  }

  function recentCard() {
    var s = G.store.state;
    if (!s.recent.length) return '';

    return '<div class="card">' +
      '<div class="card__head">' + u.icon('history', 18) + '<h3>Zuletzt gesehen</h3><span class="spacer"></span>' +
      '<button class="btn btn--sm btn--ghost" id="stClearRecent">Leeren</button></div>' +
      '<div class="list">' +
        s.recent.slice(0, 8).map(function (c) {
          return '<div class="list__row list__row--click" data-play="' + u.esc(c.url) + '">' +
            u.logoHtml(c, 'ch-row__logo') +
            '<span class="list__main"><b>' + u.esc(c.name) + '</b>' +
            '<span>' + u.esc(c.group || '—') + ' · ' + u.esc(u.relTime(c.at)) + '</span></span>' +
            '<span class="list__end dim">' + u.icon('play', 15) + '</span>' +
          '</div>';
        }).join('') +
      '</div></div>';
  }

  function render() {
    return '<div class="view stack">' +
      hero() +
      '<div class="grid grid--start">' +
        '<div class="stack">' + favCard() + recentCard() + '</div>' +
        '<div class="stack">' + playlistCard() + hintCard() + '</div>' +
      '</div>' +
    '</div>';
  }

  function hintCard() {
    var s = G.store.state;
    if (!G.store.storageOk) {
      return '<div class="note note--warn">' + u.icon('warn', 18) +
        '<div><b>Kein lokaler Speicher.</b> Der Browser blockiert Website-Daten. ' +
        'GoTV vergisst Playlisten und Favoriten beim Schließen.</div></div>';
    }
    if (!s.playlists.length) return '';

    return '<div class="note note--acc">' + u.icon('shield', 18) +
      '<div><b>Alles bleibt auf dem Gerät.</b> Playlisten, Favoriten und Zugänge werden ' +
      'nur lokal gespeichert. Es gibt kein Konto und keinen Server.</div></div>';
  }

  /* ------------------------------------------------------------
     Einhaengen
     ------------------------------------------------------------ */
  function mount(host) {
    u.on(host, 'click', '[data-play]', function (e, t) {
      var url = t.getAttribute('data-play');
      var s = G.store.state;
      var c = s.favorites.concat(s.recent, s.channels)
        .filter(function (x) { return G.m3u.sameSource(x.url, url); })[0];
      if (!c) return;
      G.views.live.playChannel(c);
      G.app.go('live');
    });

    u.on(host, 'click', '[data-open]', function (e, t) {
      G.store.setActive(t.getAttribute('data-open'));
      G.app.go('live');
    });

    var stop = u.$('#stHeroStop');
    if (stop) stop.onclick = function () { G.player.stop(); G.app.rerender(); };

    var ext = u.$('#stHeroExt');
    if (ext) ext.onclick = function () { G.dock.external(); };

    var clear = u.$('#stClearRecent');
    if (clear) clear.onclick = async function () {
      var ok = await u.confirmSheet({
        title: 'Verlauf leeren',
        body: 'Die Liste „Zuletzt gesehen“ wird geleert. Favoriten und Playlisten bleiben.',
        ok: 'Leeren'
      });
      if (ok) { G.store.clearRecent(); G.app.rerender(); }
    };
  }

  G.views.start = {
    title: 'Start',
    sub: function () {
      var s = G.store.state;
      var total = s.playlists.reduce(function (n, p) { return n + (p.count || 0); }, 0);
      return total ? u.fmtInt(total) + ' Sender in ' + s.playlists.length +
        (s.playlists.length === 1 ? ' Playlist' : ' Playlisten') : 'Noch keine Playlist';
    },
    render: render,
    mount: mount
  };
})(GoTV);
