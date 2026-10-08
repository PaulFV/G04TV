/* ============================================================
   G04TV — Bereich Start

   So einfach wie moeglich: oben das Live-Bild, darunter eine
   Kachel mit Favoriten, allen Sendern und dem Verlauf.
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

  function tile(c, playing, sub) {
    return '<button class="ch-tile' + (playing ? ' is-playing' : '') + '" data-play="' + u.esc(c.url) + '">' +
      u.logoHtml(c, 'ch-tile__logo') +
      '<span class="ch-tile__name">' + u.esc(c.name) + '</span>' +
      '<span class="ch-tile__grp">' + u.esc(sub || c.group || '—') + '</span>' +
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
        // Ohne Playlist bleibt der eine Knopf, der weiterhilft
        (s.playlists.length ? '' :
          '<div class="start-now__actions">' +
            '<button class="btn btn--primary start-now__main" data-go="playlists">' + u.icon('plus', 18) + ' Playlist hinzufügen</button>' +
          '</div>');
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
      '</div>';
  }

  function paintNow() {
    var host = u.$('#stNow');
    if (!host) return;
    host.innerHTML = nowHtml();

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

  /* ------------------------------------------------------------
     Sender-Kachel: Favoriten | Alle Sender | Zuletzt gesehen

     Unter dem Bild nur noch eine Kachel. Die Sender stehen in einem
     Raster, das nach unten weiterlaeuft. "Alle Sender" zeigt die
     aktive Playlist - bei zehntausenden Sendern stueckweise: weitere
     kommen nach, sobald man unten ankommt. Beim Umschalten wird nur
     die Kachel neu gezeichnet, das Bild oben laeuft weiter.
     ------------------------------------------------------------ */
  var TAB_KEY = 'g04tv.startShelf';
  var CHUNK = 60;

  var shelfTab = null;
  var allPool = null;          // Sender der aktiven Playlist (geladen)
  var allPoolId = null;        // ... fuer welche Playlist
  var allQuery = '';
  var allList = [];            // nach Suche gefiltert
  var allShown = 0;
  var observer = null;

  function tr(text) { return G.i18n ? G.i18n.t(text) : text; }

  /** Der zuletzt selbst gewaehlte Reiter - sonst Favoriten, wenn es welche gibt. */
  function currentTab() {
    var s = G.store.state;
    if (!shelfTab) {
      try { shelfTab = localStorage.getItem(TAB_KEY); } catch (e) { /* optional */ }
    }
    if (shelfTab === 'fav' || shelfTab === 'all' || shelfTab === 'recent') return shelfTab;
    shelfTab = null;
    return s.favorites.length ? 'fav' : 'all';
  }

  function shelfCard() {
    return '<section class="card start-shelf" id="stShelf">' + shelfInner() + '</section>';
  }

  // Jeder Reiter mit eigenem Zeichen und eigener Farbe (siehe start.css)
  var TAB_ICON = { fav: 'starFill', all: 'grid', recent: 'history' };

  function tabBtn(key, label, n, tab) {
    var on = tab === key;
    return '<button class="start-shelf__tab start-shelf__tab--' + key + (on ? ' is-on' : '') + '" data-shelf="' + key + '" role="tab" aria-selected="' + on + '">' +
      u.icon(TAB_ICON[key], 15) + '<span>' + label + '</span>' + (n != null ? '<i>' + u.fmtInt(n) + '</i>' : '') + '</button>';
  }

  function shelfInner() {
    var s = G.store.state;
    var tab = currentTab();
    var allCount = (G.store.activePlaylist() || {}).count;

    var head = '<div class="start-shelf__tabs" role="tablist">' +
        tabBtn('fav', 'Favoriten', s.favorites.length, tab) +
        tabBtn('all', 'Alle', allCount || null, tab) +
        tabBtn('recent', 'Verlauf', s.recent.length, tab) +
      '</div>';

    var body;
    if (tab === 'all') body = allHead() + '<div class="start-shelf__grid" id="stGrid"></div><div class="start-shelf__more" id="stMore"></div>';
    else body = listBody(tab);

    return head + body;
  }

  function listBody(tab) {
    var s = G.store.state;
    var playing = G.player.channel;
    var list = tab === 'fav' ? s.favorites : s.recent;

    if (!list.length) {
      return '<p class="start-shelf__empty">' + (tab === 'fav'
        ? 'Markiere Sender mit einem Stern — sie erscheinen dann hier.'
        : 'Noch nichts gesehen — gespielte Sender erscheinen hier.') + '</p>';
    }
    return '<div class="start-shelf__grid">' +
        list.map(function (c) {
          return tile(c, playing && G.m3u.sameSource(playing.url, c.url), tab === 'recent' ? u.relTime(c.at) : '');
        }).join('') +
      '</div>' +
      (tab === 'recent'
        ? '<div class="start-shelf__foot"><button class="btn btn--sm btn--ghost" id="stClearRecent">' + u.icon('trash', 14) + ' Verlauf leeren</button></div>'
        : '');
  }

  /** Suche und - bei mehreren Playlisten - Auswahl der Playlist */
  function allHead() {
    var s = G.store.state;
    if (!s.playlists.length) return '';
    return '<div class="start-shelf__tools">' +
        '<div class="search start-shelf__search">' + u.icon('search', 16) +
          '<input class="input" id="stSearch" type="search" inputmode="search" autocomplete="off" ' +
          'placeholder="Sender suchen …" value="' + u.esc(allQuery) + '"></div>' +
        (s.playlists.length > 1
          ? '<select class="select start-shelf__pick" id="stPick" aria-label="Playlist">' +
              s.playlists.map(function (p) {
                return '<option value="' + u.esc(p.id) + '"' + (p.id === s.activeId ? ' selected' : '') + '>' + u.esc(p.name) + '</option>';
              }).join('') +
            '</select>'
          : '') +
      '</div>';
  }

  /* Von aussen: Reiter "Alle" zeigen (statt des frueheren Bereichs Sender) */
  var pendingJump = null;      // null | 'shelf' | 'search'
  function showAll(focusSearch) {
    shelfTab = 'all';
    try { localStorage.setItem(TAB_KEY, 'all'); } catch (e) { /* optional */ }
    pendingJump = focusSearch ? 'search' : 'shelf';
  }

  /* ---------- Alle Sender: laden, filtern, stueckweise zeigen ---------- */
  async function loadAll() {
    var grid = u.$('#stGrid');
    var s = G.store.state;
    if (!grid) return;

    if (!s.playlists.length) {
      grid.outerHTML = '<div class="start-shelf__none">' +
        '<p>Noch keine Playlist — trage zuerst eine ein.</p>' +
        '<button class="btn btn--primary btn--sm" data-go="playlists">' + u.icon('plus', 15) + ' Playlist hinzufügen</button></div>';
      return;
    }

    if (!allPool || allPoolId !== s.activeId) {
      grid.innerHTML = '<p class="start-shelf__empty">' + tr('Sender werden geladen …') + '</p>';
      var id = s.activeId;
      var pool = await G.library.pool(id);
      if (id !== G.store.state.activeId) return;     // inzwischen umgeschaltet

      // Eine gemerkte Playlist, deren Sender nicht mehr in der Ablage stehen
      // (Browserdaten geloescht, Sicherung eingelesen): einmal nachholen.
      var p = G.store.activePlaylist();
      if (p && !p.count && p.kind !== 'file' && p.kind !== 'text' && !p.error) {
        var g = u.$('#stGrid');
        if (g) g.innerHTML = '<p class="start-shelf__empty">' + tr('Playlist wird geholt …') + '</p>';
        var res = await G.library.refresh(p.id);
        if (res.ok) pool = await G.library.pool(p.id);
        else u.toast(tr('Playlist nicht erreichbar'), res.error, 'warn', 6000);
        if (id !== G.store.state.activeId) return;
      }
      allPool = pool; allPoolId = id;
    }
    if (!u.$('#stGrid')) return;                      // Ansicht verlassen
    applyAll();
  }

  function applyAll() {
    allList = G.library.filter(allPool || [], allQuery, '*');
    allShown = 0;
    var grid = u.$('#stGrid');
    if (!grid) return;
    grid.innerHTML = '';
    if (!allList.length) {
      grid.innerHTML = '<p class="start-shelf__empty">' + tr('Nichts gefunden') + '</p>';
      paintMore();
      return;
    }
    moreAll();
  }

  function moreAll() {
    var grid = u.$('#stGrid');
    if (!grid) return;
    var playing = G.player.channel;
    var next = allList.slice(allShown, allShown + CHUNK);
    allShown += next.length;
    grid.insertAdjacentHTML('beforeend', next.map(function (c) {
      return tile(c, playing && G.m3u.sameSource(playing.url, c.url));
    }).join(''));
    paintMore();
  }

  /** Fusszeile: wie viele gezeigt; ein unsichtbarer Wächter laedt nach. */
  function paintMore() {
    var more = u.$('#stMore');
    if (!more) return;
    var rest = allList.length - allShown;
    more.innerHTML = allList.length
      ? '<span>' + u.fmtInt(allShown) + ' / ' + u.fmtInt(allList.length) + '</span>' +
        (rest > 0 ? '<button class="btn btn--sm" id="stMoreBtn">' + tr('Weitere laden') + '</button>' : '')
      : '';
    var btn = u.$('#stMoreBtn');
    if (btn) btn.onclick = moreAll;

    if (observer) observer.disconnect();
    if (rest > 0 && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) moreAll();
      }, { rootMargin: '600px 0px' });
      observer.observe(more);
    }
  }

  /** Alle Sender: zu einer URL das Sender-Objekt finden (fuer data-play) */
  function findChannel(url) {
    var s = G.store.state;
    var lists = [s.favorites, s.recent, s.channels, allPool || []];
    for (var i = 0; i < lists.length; i++) {
      for (var j = 0; j < lists[i].length; j++) {
        if (G.m3u.sameSource(lists[i][j].url, url)) return lists[i][j];
      }
    }
    return null;
  }

  function render() {
    return '<div class="view start-view">' +
      liveCard() +
      shelfCard() +
    '</div>';
  }

  var off = [];

  function mount(host) {
    var slot = u.$('#stageSlot');
    if (slot) G.dock.place(slot);
    paintNow();

    // --live-h: Hoehe des klebenden Bildblocks - Sprungziele darunter
    // (scroll-margin) sollen nicht hinter dem Bild verschwinden.
    var live = u.$('.start-live');
    if (live) {
      var setH = function () { document.documentElement.style.setProperty('--live-h', live.offsetHeight + 'px'); };
      setH();
      if ('ResizeObserver' in window) {
        var ro = new ResizeObserver(setH); ro.observe(live);
        off.push(function () { ro.disconnect(); });
      }
    }

    var onPlayer = function () { paintNow(); paintPlaying(); };
    document.addEventListener('g04tv:player', onPlayer);
    off.push(function () { document.removeEventListener('g04tv:player', onPlayer); });

    u.on(host, 'click', '[data-play]', function (e, t) {
      var c = findChannel(t.getAttribute('data-play'));
      if (!c) return;
      // Das Bild klebt oben - die Liste bleibt, wo sie ist.
      G.views.live.playChannel(c);
    });

    // Umschalter Favoriten | Alle Sender | Zuletzt gesehen
    u.on(host, 'click', '[data-shelf]', function (e, t) {
      var next = t.getAttribute('data-shelf');
      if (next === currentTab()) return;
      shelfTab = next;
      try { localStorage.setItem(TAB_KEY, next); } catch (err) { /* optional */ }
      paintShelf();
    });

    off.push(function () { if (observer) { observer.disconnect(); observer = null; } });
    wireShelf();

    // Kam man ueber "Alle Sender" (frueher Bereich Sender): zur Kachel
    // springen, ggf. gleich ins Suchfeld.
    if (pendingJump) {
      var jump = pendingJump; pendingJump = null;
      setTimeout(function () {
        scrollToShelf();
        if (jump === 'search') { var f = u.$('#stSearch'); if (f) f.focus({ preventScroll: true }); }
      }, 80);
    }
  }

  /** Zur Sender-Kachel scrollen - genau unter das oben klebende Bild. */
  function scrollToShelf() {
    var card = u.$('#stShelf');
    if (!card) return;
    var live = u.$('.start-live');
    var under = live ? live.getBoundingClientRect().bottom : 0;
    var y = card.getBoundingClientRect().top + window.scrollY - under - 10;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }

  /** Nur die Sender-Kachel neu zeichnen - das Bild oben bleibt unberuehrt. */
  function paintShelf() {
    var card = u.$('#stShelf');
    if (!card) return;
    if (observer) { observer.disconnect(); observer = null; }
    card.innerHTML = shelfInner();
    wireShelf();
  }

  function wireShelf() {
    if (currentTab() === 'all') {
      var search = u.$('#stSearch');
      if (search) search.addEventListener('input', u.debounce(function () {
        allQuery = search.value.trim();
        applyAll();
      }, 200));
      var pick = u.$('#stPick');
      if (pick) pick.addEventListener('change', function () {
        G.store.setActive(pick.value);
        allQuery = '';
        paintShelf();
      });
      loadAll();
    }

    var clear = u.$('#stClearRecent');
    if (clear) clear.onclick = async function () {
      var ok = await u.confirmSheet({
        title: 'Verlauf leeren',
        body: 'Die Liste „Zuletzt gesehen“ wird geleert. Favoriten und Playlisten bleiben.',
        ok: 'Leeren'
      });
      if (ok) { G.store.clearRecent(); paintShelf(); }
    };
  }

  function unmount() {
    off.forEach(function (fn) { fn(); });
    off = [];
    // Vor dem Neuzeichnen raus aus der Ansicht, sonst reisst das Bild ab.
    G.dock.place(null);
  }

  /** Schnellstart - steht jetzt in den Einstellungen */
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
        '<button class="start-step" data-go="start"><span class="start-step__num">3</span><span class="start-step__icon">' + u.icon('live', 30) + '</span><span class="start-step__label">Fernsehen</span></button>' +
      '</div>' +
    '</section>';
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
    unmount: unmount,
    quickCard: quickCard,
    showAll: showAll
  };
})(G04TV);
