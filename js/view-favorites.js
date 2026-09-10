/* ============================================================
   G04TV — Bereich Favoriten

   Die mit dem Stern markierten Sender, quer über alle Playlisten.
   Sie behalten ihre Adresse: verschwindet eine Playlist, bleibt
   der Favorit spielbar.
   ============================================================ */
(function (G) {
  'use strict';
  var u = G.u;
  G.views = G.views || {};

  var mode = 'tiles';    // tiles | list

  function render() {
    var s = G.store.state;

    if (!s.favorites.length) {
      return '<div class="view"><div class="card"><div class="empty">' + u.icon('star', 42) +
        '<b>Noch keine Favoriten</b>' +
        '<p>Tippe im Bereich Sender auf den Stern neben einem Sender. Er steht dann hier ' +
        'und ganz oben in der Senderliste — unabhängig davon, aus welcher Playlist er stammt.</p>' +
        '<div class="btn-row"><button class="btn btn--primary" data-go="live">' +
        u.icon('live', 16) + ' Zu den Sendern</button></div>' +
        '</div></div></div>';
    }

    var playing = G.player.channel;

    return '<div class="view stack">' +
      '<div class="row row--wrap">' +
        '<div class="tabs" id="favMode">' +
          '<button class="tabs__b' + (mode === 'tiles' ? ' is-on' : '') + '" data-mode="tiles">' + u.icon('grid', 14) + ' Kacheln</button>' +
          '<button class="tabs__b' + (mode === 'list' ? ' is-on' : '') + '" data-mode="list">' + u.icon('playlists', 14) + ' Liste</button>' +
        '</div>' +
        '<span class="spacer"></span>' +
        '<button class="btn btn--sm" id="favExport">' + u.icon('download', 15) + ' Als M3U</button>' +
      '</div>' +

      (mode === 'tiles'
        ? '<div class="grid grid--tiles">' + s.favorites.map(function (c) {
            return '<button class="ch-tile' + (playing && G.m3u.sameSource(playing.url, c.url) ? ' is-playing' : '') +
              '" data-play="' + u.esc(c.url) + '">' +
              u.logoHtml(c, 'ch-tile__logo') +
              '<span class="ch-tile__name">' + u.esc(c.name) + '</span>' +
              '<span class="ch-tile__grp">' + u.esc(c.group || '—') + '</span>' +
            '</button>';
          }).join('') + '</div>'
        : '<div class="card"><div class="list">' + s.favorites.map(function (c, i) {
            return '<div class="list__row">' +
              u.logoHtml(c, 'ch-row__logo') +
              '<span class="list__main"><b>' + u.esc(c.name) + '</b>' +
              '<span>' + u.esc(c.group || '—') + '</span></span>' +
              '<span class="list__end">' +
                '<button class="icon-btn" data-move="' + i + '|-1" title="Nach oben" style="width:32px;height:32px;border-radius:9px"' +
                  (i === 0 ? ' disabled' : '') + '>▲</button>' +
                '<button class="icon-btn" data-move="' + i + '|1" title="Nach unten" style="width:32px;height:32px;border-radius:9px"' +
                  (i === s.favorites.length - 1 ? ' disabled' : '') + '>▼</button>' +
                '<button class="icon-btn" data-play="' + u.esc(c.url) + '" title="Abspielen" style="width:32px;height:32px;border-radius:9px">' +
                  u.icon('play', 14) + '</button>' +
                '<button class="icon-btn" data-unfav="' + u.esc(c.url) + '" title="Stern entfernen" style="width:32px;height:32px;border-radius:9px">' +
                  u.icon('trash', 14) + '</button>' +
              '</span></div>';
          }).join('') + '</div></div>') +

    '</div>';
  }

  function mount(host) {
    u.on(host, 'click', '[data-mode]', function (e, t) {
      mode = t.getAttribute('data-mode');
      G.app.rerender();
    });

    u.on(host, 'click', '[data-play]', function (e, t) {
      var url = t.getAttribute('data-play');
      var c = G.store.state.favorites.filter(function (x) { return G.m3u.sameSource(x.url, url); })[0];
      if (!c) return;
      G.views.live.playChannel(c);
      G.app.go('live');
    });

    u.on(host, 'click', '[data-move]', function (e, t) {
      var parts = t.getAttribute('data-move').split('|');
      var c = G.store.state.favorites[+parts[0]];
      if (!c) return;
      G.store.moveFavorite(c.url, +parts[1]);
      G.app.rerender();
    });

    u.on(host, 'click', '[data-unfav]', function (e, t) {
      var url = t.getAttribute('data-unfav');
      var c = G.store.state.favorites.filter(function (x) { return G.m3u.sameSource(x.url, url); })[0];
      if (!c) return;
      G.store.toggleFavorite(c);
      G.app.rerender();
      u.toast('Favorit entfernt', c.name, 'ok', 2200);
    });

    var exp = u.$('#favExport');
    if (exp) exp.onclick = function () {
      var s = G.store.state;
      var lines = ['#EXTM3U'];
      s.favorites.forEach(function (c) {
        lines.push('#EXTINF:-1 tvg-logo="' + (c.logo || '') + '" group-title="' + (c.group || 'Favoriten') + '",' + c.name);
        lines.push(c.url);
      });
      var ok = u.download('G04TV-Favoriten.m3u', lines.join('\n'), 'audio/x-mpegurl');
      u.toast(ok ? 'Datei erstellt' : 'Ging nicht',
        ok ? s.favorites.length + ' Sender als M3U gespeichert.' : 'Der Browser hat den Download verhindert.',
        ok ? 'ok' : 'warn');
    };
  }

  G.views.favorites = {
    title: 'Favoriten',
    sub: function () {
      var n = G.store.state.favorites.length;
      return n ? n + (n === 1 ? ' Sender gemerkt' : ' Sender gemerkt') : 'Noch nichts gemerkt';
    },
    render: render,
    mount: mount
  };
})(G04TV);
