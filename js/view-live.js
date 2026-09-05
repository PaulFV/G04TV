/* ============================================================
   GoTV — Bereich Sender

   Aufbau wie das IPTV-Fenster von Connect+: die Senderliste an der
   einen Seite, das Bild an der anderen. Ein Antippen spielt den
   Sender, der Stern macht ihn zum Favoriten.
   ============================================================ */
(function (G) {
  'use strict';
  var u = G.u;
  G.views = G.views || {};

  /** So viele Zeilen kommen auf einmal in die Liste. */
  var CHUNK = 150;

  var pool = [];        // alles, was zur Auswahl steht
  var shownList = [];   // was nach Filter und Suche uebrig bleibt
  var shownCount = 0;
  var query = '';
  var group = '*';
  var off = [];         // eingehaengte Ereignisse, beim Verlassen wieder los

  /* ------------------------------------------------------------
     Geruest
     ------------------------------------------------------------ */
  function render() {
    var s = G.store.state;
    var hasAnything = s.playlists.length || s.favorites.length || s.channels.length;

    if (!hasAnything) return emptyView();

    return '<div class="view live">' +
      '<div class="stage-wrap" id="stageWrap">' +
        '<div class="stage-slot" id="stageSlot"></div>' +
        '<div class="transport" id="transport"></div>' +
      '</div>' +
      '<aside class="chlist">' +
        '<div class="chlist__head">' +
          playlistPicker() +
          '<div class="search">' + u.icon('search', 17) +
            '<input class="input" id="chSearch" type="search" inputmode="search" ' +
            'placeholder="Sender suchen …" value="' + u.esc(query) + '" autocomplete="off">' +
            '<button class="search__clear" id="chClear" type="button" aria-label="Suche leeren"' +
            (query ? '' : ' hidden') + '>' + u.icon('close', 15) + '</button>' +
          '</div>' +
          '<div class="chips chips--scroll" id="chGroups"></div>' +
        '</div>' +
        '<div class="chlist__body" id="chBody"></div>' +
        '<div class="chlist__foot" id="chFoot"></div>' +
      '</aside>' +
    '</div>';
  }

  function emptyView() {
    return '<div class="view"><div class="card">' +
      '<div class="empty">' + u.icon('live', 42) +
      '<b>Noch keine Playlist</b>' +
      '<p>GoTV bringt keine Sender mit. Trage deine eigene Playlist ein — als Adresse, ' +
      'als Datei vom Gerät, als eingefügten Text oder als Xtream-Zugang.</p>' +
      '<div class="btn-row"><button class="btn btn--primary" data-go="playlists">' +
      u.icon('plus', 17) + ' Playlist hinzufügen</button></div>' +
      '</div></div></div>';
  }

  function playlistPicker() {
    var s = G.store.state;
    if (!s.playlists.length) return '';

    return '<select class="select" id="chPlaylist" aria-label="Playlist">' +
      s.playlists.map(function (p) {
        return '<option value="' + u.esc(p.id) + '"' + (p.id === s.activeId ? ' selected' : '') + '>' +
          u.esc(p.name) + ' · ' + u.fmtInt(p.count) + '</option>';
      }).join('') +
      '</select>';
  }

  /* ------------------------------------------------------------
     Bedienleiste unter dem Bild
     ------------------------------------------------------------ */
  function paintTransport() {
    var host = u.$('#transport');
    if (!host) return;

    var c = G.player.channel || G.store.state.last;
    var running = G.player.status === 'loading' || G.player.status === 'playing';
    var fav = c && G.store.isFavorite(c.url);
    var s = G.store.state.settings;

    host.innerHTML =
      '<div class="transport__now">' +
        u.logoHtml(c || {}, 'transport__logo') +
        '<span class="transport__meta">' +
          '<b>' + u.esc(c ? c.name : 'Kein Sender gewählt') + '</b>' +
          '<span>' + u.esc(c ? (c.group || G.player.kindOf(c.url).toUpperCase()) : 'Sender aus der Liste antippen') + '</span>' +
        '</span>' +
      '</div>' +

      '<div class="transport__btns">' +
        (running
          ? '<button class="btn btn--sm" id="tStop">' + u.icon('stop', 15) + ' Anhalten</button>'
          : '<button class="btn btn--sm btn--primary" id="tPlay"' + (c ? '' : ' disabled') + '>' +
            u.icon('play', 15) + ' Abspielen</button>') +
        '<button class="btn btn--sm" id="tStar"' + (c ? '' : ' disabled') + '>' +
          u.icon(fav ? 'starFill' : 'star', 15) + ' ' + (fav ? 'Favorit' : 'Merken') + '</button>' +
        '<button class="btn btn--sm" id="tExt"' + (c ? '' : ' disabled') + '>' +
          u.icon('external', 15) + ' Extern</button>' +
        '<button class="btn btn--sm" id="tFull">' + u.icon('full', 15) + ' Vollbild</button>' +
        '<span class="vol">' +
          '<button class="icon-btn" id="tMute" style="width:32px;height:32px;border-radius:9px" aria-label="Ton">' +
          u.icon(s.muted || s.volume <= 0 ? 'muted' : 'volume', 16) + '</button>' +
          '<input type="range" id="tVol" min="0" max="100" step="1" value="' + s.volume + '" aria-label="Lautstärke">' +
        '</span>' +
      '</div>' +

      '<div class="transport__state' +
        (G.player.status === 'error' ? ' is-err' : G.player.status === 'playing' ? ' is-ok' : '') + '" id="tState">' +
        u.esc(stateText()) + '</div>';

    wireTransport();
  }

  function stateText() {
    switch (G.player.status) {
      case 'playing': return 'Läuft';
      case 'loading': return G.player.message || 'Wird geladen …';
      case 'error': return G.player.message || 'Fehler';
      default: return G.player.message || 'Bereit';
    }
  }

  function wireTransport() {
    var play = u.$('#tPlay'), stop = u.$('#tStop');

    if (play) play.onclick = function () {
      var c = G.player.channel || G.store.state.last;
      if (c) G.player.play(c);
    };
    if (stop) stop.onclick = function () { G.player.stop(); };

    var star = u.$('#tStar');
    if (star) star.onclick = function () {
      var c = G.player.channel || G.store.state.last;
      if (!c) return;
      var on = G.store.toggleFavorite(c);
      u.toast(on ? 'Als Favorit gemerkt' : 'Favorit entfernt', c.name, 'ok', 2200);
      paintTransport();
      paintRows();
    };

    var ext = u.$('#tExt');
    if (ext) ext.onclick = function () { G.dock.external(); };

    var full = u.$('#tFull');
    if (full) full.onclick = function () { G.player.fullscreen(true); };

    var mute = u.$('#tMute');
    if (mute) mute.onclick = function () {
      G.player.toggleMuted();
      G.dock.paintMute();
      paintTransport();
    };

    var vol = u.$('#tVol');
    if (vol) vol.oninput = function () {
      G.player.setVolume(u.num(vol.value, 80));
      G.dock.paintMute();
    };
  }

  /* ------------------------------------------------------------
     Senderliste
     ------------------------------------------------------------ */
  function paintGroups() {
    var host = u.$('#chGroups');
    if (!host) return;

    var groups = G.library.groupsOf(pool);
    host.innerHTML =
      '<button class="chip' + (group === '*' ? ' is-on' : '') + '" data-grp="*">Alle' +
      '<span class="chip__n">' + u.fmtInt(pool.length) + '</span></button>' +
      groups.map(function (g) {
        return '<button class="chip' + (group === g.name ? ' is-on' : '') + '" data-grp="' + u.esc(g.name) + '">' +
          u.esc(g.name) + '<span class="chip__n">' + u.fmtInt(g.count) + '</span></button>';
      }).join('');
  }

  function rowHtml(c) {
    var fav = G.store.isFavorite(c.url);
    var playing = G.player.channel && G.m3u.sameSource(G.player.channel.url, c.url);

    return '<div class="ch-row' + (playing ? ' is-playing' : '') + '" data-url="' + u.esc(c.url) + '" tabindex="0" role="button">' +
      u.logoHtml(c, 'ch-row__logo') +
      '<span class="ch-row__main">' +
        '<b>' + u.esc(c.name) + '</b>' +
        '<span>' + u.esc(c.group || (c.origin === 'eigen' ? 'Eigener Sender' : '—')) + '</span>' +
      '</span>' +
      '<button class="ch-row__star' + (fav ? ' is-on' : '') + '" data-star="' + u.esc(c.url) + '" ' +
        'aria-label="' + (fav ? 'Favorit entfernen' : 'Als Favorit merken') + '" title="Favorit">' +
        u.icon(fav ? 'starFill' : 'star', 17) + '</button>' +
    '</div>';
  }

  function applyFilter() {
    shownList = G.library.filter(pool, query, group);
    shownCount = 0;
    var body = u.$('#chBody');
    if (body) body.innerHTML = '';
    more();
  }

  /** Haengt den naechsten Schwung Zeilen an. */
  function more() {
    var body = u.$('#chBody');
    if (!body) return;

    var oldMore = u.$('#chMore');
    if (oldMore) oldMore.remove();

    if (!shownList.length) {
      body.innerHTML = '<div class="empty">' + u.icon('search', 34) +
        '<b>Nichts gefunden</b><p>Weder Name noch Gruppe passen zur Suche.</p></div>';
      paintFoot();
      return;
    }

    var next = shownList.slice(shownCount, shownCount + CHUNK);
    shownCount += next.length;

    body.insertAdjacentHTML('beforeend', next.map(rowHtml).join(''));

    if (shownCount < shownList.length) {
      body.insertAdjacentHTML('beforeend',
        '<button class="btn btn--sm chlist__more" id="chMore">Weitere ' +
        u.fmtInt(Math.min(CHUNK, shownList.length - shownCount)) + ' anzeigen</button>');
      u.$('#chMore').onclick = more;
    }

    paintFoot();
  }

  function paintFoot() {
    var foot = u.$('#chFoot');
    if (!foot) return;
    var p = G.store.activePlaylist();

    foot.innerHTML = u.esc(
      u.fmtInt(shownCount) + ' von ' + u.fmtInt(shownList.length) + ' angezeigt' +
      (pool.length !== shownList.length ? ' · ' + u.fmtInt(pool.length) + ' insgesamt' : '') +
      (p && p.updatedAt ? ' · Stand ' + u.relTime(p.updatedAt) : ''));
  }

  /** Frischt nur die Hervorhebungen auf - die Stelle in der Liste bleibt. */
  function paintRows() {
    var playing = G.player.channel;
    u.$$('#chBody .ch-row').forEach(function (row) {
      var url = row.getAttribute('data-url');
      row.classList.toggle('is-playing', !!playing && G.m3u.sameSource(playing.url, url));
      var star = row.querySelector('.ch-row__star');
      if (star) {
        var fav = G.store.isFavorite(url);
        star.classList.toggle('is-on', fav);
        star.innerHTML = u.icon(fav ? 'starFill' : 'star', 17);
      }
    });
  }

  /* ------------------------------------------------------------
     Laden
     ------------------------------------------------------------ */
  async function fill() {
    var body = u.$('#chBody');
    if (body) body.innerHTML = '<div class="empty">' + u.icon('refresh', 30) + '<b>Sender werden geladen …</b></div>';

    pool = await G.library.pool(G.store.state.activeId);

    // Eine gemerkte Playlist, deren Sender nicht mehr in der Ablage stehen
    // (Browserdaten geloescht, Sicherung eingelesen): einmal nachholen.
    var p = G.store.activePlaylist();
    if (p && !p.count && p.kind !== 'file' && p.kind !== 'text' && !p.error) {
      if (body) body.innerHTML = '<div class="empty">' + u.icon('refresh', 30) +
        '<b>Playlist wird geholt …</b><p>' + u.esc(p.name) + '</p></div>';
      var res = await G.library.refresh(p.id);
      if (res.ok) pool = await G.library.pool(p.id);
      else u.toast('Playlist nicht erreichbar', res.error, 'warn', 6000);
    }

    if (!u.$('#chBody')) return;   // die Ansicht wurde inzwischen verlassen

    paintGroups();
    applyFilter();
  }

  /* ------------------------------------------------------------
     Einhaengen
     ------------------------------------------------------------ */
  function mount(host) {
    var slot = u.$('#stageSlot');
    if (!slot) return;                 // leere Ansicht ohne Playlist

    G.dock.place(slot);
    paintTransport();

    // Suche
    var search = u.$('#chSearch');
    var clear = u.$('#chClear');
    var onInput = u.debounce(function () {
      query = search.value.trim();
      if (clear) clear.hidden = !query;
      applyFilter();
    }, 180);
    search.addEventListener('input', onInput);
    if (clear) clear.onclick = function () { search.value = ''; query = ''; clear.hidden = true; applyFilter(); search.focus(); };

    // Gruppen
    u.on(u.$('#chGroups'), 'click', '[data-grp]', function (e, t) {
      group = t.getAttribute('data-grp');
      paintGroups();
      applyFilter();
      var body = u.$('#chBody');
      if (body) body.scrollTop = 0;
    });

    // Playlist wechseln
    var picker = u.$('#chPlaylist');
    if (picker) picker.addEventListener('change', function () {
      G.store.setActive(picker.value);
      group = '*';
      fill();
    });

    // Sender waehlen
    var body = u.$('#chBody');
    u.on(body, 'click', '[data-star]', function (e, t) {
      e.stopPropagation();
      var url = t.getAttribute('data-star');
      var channel = pool.filter(function (c) { return G.m3u.sameSource(c.url, url); })[0];
      if (!channel) return;
      var on = G.store.toggleFavorite(channel);
      t.classList.toggle('is-on', on);
      t.innerHTML = u.icon(on ? 'starFill' : 'star', 17);
      paintTransport();
    });

    u.on(body, 'click', '.ch-row', function (e, t) {
      if (e.target.closest('[data-star]')) return;
      choose(t.getAttribute('data-url'));
    });

    u.on(body, 'keydown', '.ch-row', function (e, t) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(t.getAttribute('data-url')); }
    });

    // Meldungen des Abspielers
    var onPlayer = function () { paintTransport(); paintRows(); };
    document.addEventListener('gotv:player', onPlayer);
    off.push(function () { document.removeEventListener('gotv:player', onPlayer); });

    fill();
  }

  function choose(url) {
    var channel = pool.filter(function (c) { return G.m3u.sameSource(c.url, url); })[0];
    if (!channel) return;

    G.store.pushRecent(channel);

    if (G.store.state.settings.autoplay) G.player.play(channel);
    else { G.player.stop(true); G.store.state.last = channel; }

    paintTransport();
    paintRows();
  }

  function unmount() {
    off.forEach(function (fn) { fn(); });
    off = [];
    // Die Buehne zieht aus der Ansicht aus und laeuft unten rechts weiter.
    G.dock.place(null);
  }

  G.views.live = {
    title: 'Sender',
    sub: function () {
      var p = G.store.activePlaylist();
      if (!p) return 'Playlist wählen oder eintragen';
      return p.name + ' · ' + u.fmtInt(p.count) + ' Sender';
    },
    render: render,
    mount: mount,
    unmount: unmount,
    /** Von aussen: einen bestimmten Sender starten (Start, Favoriten). */
    playChannel: function (channel) {
      G.store.pushRecent(channel);
      G.player.play(channel);
    }
  };
})(GoTV);
