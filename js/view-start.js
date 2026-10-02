/* ============================================================
   G04TV — Bereich Start

   Die Startseite ist der schnelle Einstieg: oben das Live-Bild,
   darunter Favoriten, zuletzt gesehen, Playlisten und die drei
   Schritte bis zum Fernsehen.
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

  /* ------------------------------------------------------------
     Live-Fenster

     Oben auf der Startseite sitzt dasselbe Bild wie im Bereich
     Sender (die wandernde Buehne aus dock.js), darunter eine
     schlanke Bedienleiste. So sieht man sofort, was laeuft.
     ------------------------------------------------------------ */
  function liveCard() {
    return '<section class="card start-live">' +
      '<div class="stage-slot start-live__stage" id="stageSlot"></div>' +
      '<div class="start-now" id="stNow">' + nowHtml() + '</div>' +
    '</section>';
  }

  function nowHtml() {
    var s = G.store.state;
    var c = G.player.channel || s.last;
    var status = G.player.status;
    var running = status === 'playing' || status === 'loading';

    if (!c) {
      return '<div class="start-now__head">' +
          '<span class="start-now__logo start-now__logo--empty">' + u.icon('live', 20) + '</span>' +
          '<span class="start-now__meta">' +
            '<span class="start-now__state">' + greeting() + '</span>' +
            '<b class="start-now__name">Noch kein Sender gewählt</b>' +
            '<span class="start-now__sub">' + (s.playlists.length
              ? 'Wähle einen Sender aus deiner Playlist.'
              : 'Trage zuerst eine Playlist ein.') + '</span>' +
          '</span>' +
        '</div>' +
        '<div class="start-now__actions">' +
          (s.playlists.length
            ? '<button class="btn btn--primary start-now__main" data-go="live">' + u.icon('grid', 18) + ' Zu den Sendern</button>'
            : '<button class="btn btn--primary start-now__main" data-go="playlists">' + u.icon('plus', 18) + ' Playlist hinzufügen</button>') +
        '</div>';
    }

    var fav = G.store.isFavorite(c.url);
    var state;
    if (status === 'playing') state = '<span class="start-now__state is-live"><i></i>Live</span>';
    else if (status === 'loading') state = '<span class="start-now__state is-busy"><i></i>Wird geladen …</span>';
    else if (status === 'error') state = '<span class="start-now__state is-err"><i></i>Fehler</span>';
    else state = '<span class="start-now__state"><i></i>Zuletzt gesehen' +
      (s.last && s.last.at ? ' · ' + u.esc(u.relTime(s.last.at)) : '') + '</span>';

    return '<div class="start-now__head">' +
        u.logoHtml(c, 'start-now__logo') +
        '<span class="start-now__meta">' +
          state +
          '<b class="start-now__name" title="' + u.esc(c.name) + '">' + u.esc(c.name) + '</b>' +
          '<span class="start-now__sub">' + u.esc(c.group || G.player.kindOf(c.url).toUpperCase()) + '</span>' +
        '</span>' +
        '<button class="start-now__icon' + (fav ? ' is-on' : '') + '" id="stStar" ' +
          'aria-label="' + (fav ? 'Favorit entfernen' : 'Als Favorit merken') + '" title="Favorit">' +
          u.icon(fav ? 'starFill' : 'star', 20) + '</button>' +
      '</div>' +
      '<div class="start-now__actions">' +
        (running
          ? '<button class="btn start-now__main" id="stStop">' + u.icon('stop', 18) + ' Anhalten</button>'
          : '<button class="btn btn--primary start-now__main" id="stPlay">' + u.icon('play', 18) +
            (status === 'error' ? ' Nochmal' : ' Abspielen') + '</button>') +
        '<button class="start-now__icon" id="stExt" aria-label="Extern öffnen" title="Extern öffnen">' + u.icon('external', 20) + '</button>' +
        '<button class="start-now__icon" data-go="live" aria-label="Alle Sender" title="Alle Sender">' + u.icon('grid', 20) + '</button>' +
      '</div>';
  }

  function paintNow() {
    var host = u.$('#stNow');
    if (!host) return;
    host.innerHTML = nowHtml();

    var play = u.$('#stPlay');
    if (play) play.onclick = function () {
      var c = G.player.channel || G.store.state.last;
      if (c) G.player.play(c);
    };
    var stop = u.$('#stStop');
    if (stop) stop.onclick = function () { G.player.stop(); };

    var ext = u.$('#stExt');
    if (ext) ext.onclick = function () { G.dock.external(); };

    var star = u.$('#stStar');
    if (star) star.onclick = function () {
      var c = G.player.channel || G.store.state.last;
      if (!c) return;
      var on = G.store.toggleFavorite(c);
      u.toast(on ? 'Als Favorit gemerkt' : 'Favorit entfernt', c.name, 'ok', 2200);
      G.app.rerender();
    };
  }

  /** Markiert in Favoriten und Verlauf, was gerade laeuft. */
  function paintPlaying() {
    var playing = G.player.channel;
    u.$$('.start-view [data-play]').forEach(function (el) {
      var on = !!playing && G.m3u.sameSource(playing.url, el.getAttribute('data-play'));
      el.classList.toggle('is-playing', on);
    });
  }

  function playlistCard() {
    var s = G.store.state;

    if (!s.playlists.length) {
      return '<section class="card start-card start-card--empty start-card--playlists">' +
        '<div class="card__head">' + u.icon('playlists', 22) + '<h3>Playlisten</h3></div>' +
        '<div class="start-card__visual"><img src="art/start-playlists.png" alt=""></div>' +
        '<div class="start-card__copy">' +
          '<b>Keine Playlist</b>' +
          '<p>Füge eine Adresse, Datei oder einen Stream-Zugang hinzu.</p>' +
          '<div class="btn-row"><button class="btn btn--primary" data-go="playlists">Hinzufügen</button></div>' +
        '</div>' +
      '</section>';
    }

    var total = s.playlists.reduce(function (n, p) { return n + (p.count || 0); }, 0);
    var broken = s.playlists.filter(function (p) { return !!p.error; }).length;

    return '<section class="card start-card start-card--data">' +
      '<div class="card__head">' + u.icon('playlists', 22) + '<h3>Playlisten</h3><span class="spacer"></span>' +
        '<button class="btn btn--sm" data-go="playlists">Verwalten</button></div>' +
      '<div class="grid grid--2" style="gap:12px;margin:18px 0 14px">' +
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
      '</div>' +
    '</section>';
  }

  function favCard() {
    var s = G.store.state;
    var playing = G.player.channel;

    if (!s.favorites.length) {
      return '<section class="card start-card start-card--empty start-card--favorites">' +
        '<div class="card__head">' + u.icon('star', 22) + '<h3>Favoriten</h3></div>' +
        '<div class="start-card__visual"><img src="art/start-favorites.png" alt=""></div>' +
        '<div class="start-card__copy">' +
          '<b>Noch keine Favoriten</b>' +
          '<p>Markiere Sender mit einem Stern — sie erscheinen dann hier.</p>' +
        '</div>' +
      '</section>';
    }

    // Alle Favoriten in einer Reihe zum Wischen; am Rechner mit Pfeilen.
    return '<section class="card start-card start-card--data start-favs">' +
      '<div class="card__head">' + u.icon('star', 22) + '<h3>Favoriten</h3>' +
      '<span class="start-favs__count">' + s.favorites.length + '</span><span class="spacer"></span>' +
      '<button class="start-favs__arrow" data-scroll="-1" aria-label="Zurück" title="Zurück">' + u.icon('chevron', 16) + '</button>' +
      '<button class="start-favs__arrow" data-scroll="1" aria-label="Weiter" title="Weiter">' + u.icon('chevron', 16) + '</button>' +
      '<button class="btn btn--sm" data-go="favorites">Alle</button></div>' +
      '<div class="start-favs__row" id="stFavRow">' +
        s.favorites.map(function (c) {
          return tile(c, playing && G.m3u.sameSource(playing.url, c.url));
        }).join('') +
      '</div>' +
    '</section>';
  }

  function quickCard() {
    return '<section class="card start-quick">' +
      '<div class="start-quick__head">' +
        '<div class="start-quick__title"><span class="start-quick__bolt">ϟ</span><h3>Schnellstart</h3></div>' +
        '<span class="start-quick__hint">IN WENIGEN SCHRITTEN ZUM FERNSEHEN</span>' +
      '</div>' +
      '<div class="start-steps">' +
        '<button class="start-step" data-go="playlists"><span class="start-step__num">1</span><span class="start-step__icon">' + u.icon('link', 30) + '</span><span class="start-step__label">Playlist hinzufügen</span></button>' +
        '<span class="start-step__line" aria-hidden="true"></span>' +
        '<button class="start-step" data-go="live"><span class="start-step__num">2</span><span class="start-step__icon">' + u.icon('grid', 30) + '</span><span class="start-step__label">Sender auswählen</span></button>' +
        '<span class="start-step__line" aria-hidden="true"></span>' +
        '<button class="start-step" data-go="live"><span class="start-step__num">3</span><span class="start-step__icon">' + u.icon('live', 30) + '</span><span class="start-step__label">Fernsehen</span></button>' +
      '</div>' +
    '</section>';
  }

  function recentCard() {
    var s = G.store.state;
    if (!s.recent.length) return '';

    return '<section class="card">' +
      '<div class="card__head">' + u.icon('history', 18) + '<h3>Zuletzt gesehen</h3><span class="spacer"></span><button class="btn btn--sm btn--ghost" id="stClearRecent">Leeren</button></div>' +
      '<div class="list">' +
        s.recent.slice(0, 8).map(function (c) {
          return '<div class="list__row list__row--click" data-play="' + u.esc(c.url) + '">' +
            u.logoHtml(c, 'ch-row__logo') +
            '<span class="list__main"><b>' + u.esc(c.name) + '</b>' +
            '<span>' + u.esc(c.group || '—') + ' · ' + u.esc(u.relTime(c.at)) + '</span></span>' +
            '<span class="list__end dim">' + u.icon('play', 15) + '</span>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</section>';
  }

  function hintCard() {
    var s = G.store.state;
    if (!s.playlists.length) return '';
    if (!G.store.storageOk) {
      return '<div class="note note--warn">' + u.icon('warn', 18) +
        '<div><b>Kein lokaler Speicher.</b> Der Browser blockiert Website-Daten. G04TV vergisst Playlisten und Favoriten beim Schließen.</div></div>';
    }
    return '<div class="note note--acc">' + u.icon('shield', 18) +
      '<div><b>Alles bleibt auf dem Gerät.</b> Playlisten, Favoriten und Zugänge werden nur lokal gespeichert. Es gibt kein Konto und keinen Server.</div></div>';
  }

  function render() {
    var hasFavs = G.store.state.favorites.length > 0;
    var left = (hasFavs ? '' : favCard()) + recentCard();
    var right = playlistCard() + hintCard();
    return '<div class="view start-view">' +
      liveCard() +
      // Mit Favoriten: eigene Reihe ueber die volle Breite. Ohne: die
      // leere Karte mit Bild wie bisher im Raster.
      (hasFavs ? favCard() : '') +
      // Bleibt eine Spalte leer (noch kein Verlauf), nimmt die andere die volle Breite.
      '<div class="start-grid' + (left && right ? '' : ' start-grid--single') + '">' +
        (left ? '<div class="stack">' + left + '</div>' : '') +
        (right ? '<div class="stack">' + right + '</div>' : '') +
      '</div>' +
      quickCard() +
    '</div>';
  }

  var off = [];

  function mount(host) {
    var slot = u.$('#stageSlot');
    if (slot) G.dock.place(slot);
    paintNow();

    var onPlayer = function () { paintNow(); paintPlaying(); };
    document.addEventListener('g04tv:player', onPlayer);
    off.push(function () { document.removeEventListener('g04tv:player', onPlayer); });

    u.on(host, 'click', '[data-play]', function (e, t) {
      var url = t.getAttribute('data-play');
      var s = G.store.state;
      var c = s.favorites.concat(s.recent, s.channels)
        .filter(function (x) { return G.m3u.sameSource(x.url, url); })[0];
      if (!c) return;
      G.views.live.playChannel(c);
      // Das Bild sitzt oben auf der Startseite - dorthin zurueck.
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Pfeile: um eine knappe Reihenbreite weiter
    u.on(host, 'click', '[data-scroll]', function (e, t) {
      var row = u.$('#stFavRow');
      if (!row) return;
      row.scrollBy({ left: +t.getAttribute('data-scroll') * row.clientWidth * 0.85, behavior: 'smooth' });
    });
    var row = u.$('#stFavRow');
    if (row) {
      var paintArrows = function () {
        var max = row.scrollWidth - row.clientWidth;
        var prev = u.$('[data-scroll="-1"]'), next = u.$('[data-scroll="1"]');
        if (prev) prev.disabled = row.scrollLeft <= 2;
        if (next) next.disabled = row.scrollLeft >= max - 2;
        var card = row.closest('.start-favs');
        if (card) card.classList.toggle('is-scrollable', max > 2);
      };
      row.addEventListener('scroll', paintArrows, { passive: true });
      window.addEventListener('resize', paintArrows);
      off.push(function () { window.removeEventListener('resize', paintArrows); });
      // Der laufende Sender soll sichtbar sein
      var on = row.querySelector('.ch-tile.is-playing');
      if (on) row.scrollLeft = Math.max(0, on.offsetLeft - row.offsetLeft - 12);
      paintArrows();
    }

    u.on(host, 'click', '[data-open]', function (e, t) {
      G.store.setActive(t.getAttribute('data-open'));
      G.app.go('live');
    });

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

  function unmount() {
    off.forEach(function (fn) { fn(); });
    off = [];
    // Vor dem Neuzeichnen raus aus der Ansicht, sonst reisst das Bild ab.
    G.dock.place(null);
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
    mount: mount,
    unmount: unmount
  };
})(G04TV);
