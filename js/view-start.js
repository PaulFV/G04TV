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

  // Kachel mit Stern oben rechts: Antippen der Kachel spielt, der Stern
  // merkt den Sender als Favorit oder nimmt ihn wieder heraus.
  // ord = { i, n }: Platz in den Favoriten - dann kommen Pfeile zum Verschieben
  // dazu (sichtbar nur in der Listenansicht, siehe start.css).
  function tile(c, playing, sub, ord) {
    var fav = G.store.isFavorite(c.url);
    var L = G.lock, withLock = L && L.hasCode();
    var locked = withLock && L.isLocked(c);
    return '<div class="ch-tile ch-tile--star' + (ord ? ' ch-tile--ord' : '') + (playing ? ' is-playing' : '') + (fav ? ' is-fav' : '') + (locked ? ' is-locked' : '') + (locked && L.isOpen() ? ' is-open' : '') + '" role="button" tabindex="0" data-play="' + u.esc(c.url) + '">' +
      (ord ? '<span class="ch-tile__mv">' +
        '<button type="button" data-mv="' + u.esc(c.url) + '" data-dir="-1" aria-label="Nach oben" title="Nach oben"' + (ord.i === 0 ? ' disabled' : '') + '>▲</button>' +
        '<button type="button" data-mv="' + u.esc(c.url) + '" data-dir="1" aria-label="Nach unten" title="Nach unten"' + (ord.i === ord.n - 1 ? ' disabled' : '') + '>▼</button>' +
      '</span>' : '') +
      u.logoHtml(c, 'ch-tile__logo') +
      '<span class="ch-tile__name">' + u.esc(c.name) + '</span>' +
      epgLine(c, sub) +
    '</div>';
  }

  /** Unter dem Namen: was gerade läuft (mit Fortschritt) - sonst die Gruppe */
  function epgLine(c, sub) {
    var ep = G.epg && G.epg.nowNext(c);
    var pn = ep && ep.now;
    if (!pn) return '<span class="ch-tile__grp">' + u.esc(sub || c.group || '—') + '</span>';
    return '<span class="ch-tile__grp is-epg" title="' + u.esc(G.epg.hm(pn.start) + '–' + G.epg.hm(pn.stop) + ' ' + pn.title) + '">' + u.esc(pn.title || '—') + '</span>' +
      '<span class="ch-tile__bar"><i style="width:' + G.epg.progress(pn).toFixed(1) + '%"></i></span>';
  }

  /** Programmzeilen der sichtbaren Kacheln nachführen (jede Minute, nach dem Laden) */
  function refreshEpg() {
    u.$$('.start-view .ch-tile[data-play]').forEach(function (t) {
      var c = findChannel(t.getAttribute('data-play'));
      if (!c) return;
      var g = t.querySelector('.ch-tile__grp');
      if (!g) return;
      var bar = t.querySelector('.ch-tile__bar');
      if (bar) bar.remove();
      var sub = g.classList.contains('is-epg') ? null : g.textContent;
      var tmp = document.createElement('div');
      tmp.innerHTML = epgLine(c, sub === '—' ? '' : sub);
      g.replaceWith.apply(g, Array.prototype.slice.call(tmp.childNodes));
    });
  }

  /** Schloss oben links auf der Kachel (nur wenn ein Code festgelegt ist) */
  function lockBtn(c) {
    return '';
  }
  function lockBtnOld(c) {
    var why = G.lock.reason(c);
    var own = why === 'channel';
    var title = own ? 'Sperre aufheben' : why ? 'Gesperrt über Kategorie oder Playlist' : 'Sender sperren';
    return '<button class="ch-tile__lock' + (own ? ' is-on' : why ? ' is-inherit' : '') + '" type="button" data-lock="' + u.esc(c.url) + '" ' +
      'aria-label="' + title + '" title="' + title + '">' + u.icon(why ? 'lock' : 'unlock', 14) + '</button>';
  }

  /** Schloesser und Sperr-Zustand der sichtbaren Kacheln auffrischen (ohne neu zu zeichnen) */
  function refreshLocks() {
    var host = u.$('#stShelf');
    if (!host) return;
    var L = G.lock, withLock = L && L.hasCode();
    host.classList.toggle('has-lock', !!withLock);
    u.$$('.ch-tile[data-play]', host).forEach(function (t) {
      var c = findChannel(t.getAttribute('data-play'));
      if (!c) return;
      var locked = withLock && L.isLocked(c);
      t.classList.toggle('is-locked', !!locked);
      t.classList.toggle('is-fav', G.store.isFavorite(c.url));
      t.classList.toggle('is-open', !!locked && L.isOpen());
      var b = t.querySelector('.ch-tile__lock');
      if (withLock) {
        var html = lockBtn(c);
        if (b) b.outerHTML = html; else t.insertAdjacentHTML('afterbegin', html);
      } else if (b) b.remove();
    });
    u.$$('.start-shelf__cat', host).forEach(function (h) {
      var name = h.getAttribute('data-cat');
      var b = h.querySelector('[data-lockcat]');
      if (withLock) {
        var html = catLockBtn(name);
        if (b) b.outerHTML = html; else h.insertAdjacentHTML('beforeend', html);
      } else if (b) b.remove();
    });
  }

  function catLockBtn(name) {
    return '';
  }
  function catLockBtnOld(name) {
    var on = G.lock.groupLocked(name);
    var title = on ? 'Kategorie entsperren' : 'Kategorie sperren';
    return '<button class="start-shelf__catlock' + (on ? ' is-on' : '') + '" type="button" data-lockcat="' + u.esc(name) + '" aria-label="' + title + '" title="' + title + '">' +
      u.icon(on ? 'lock' : 'unlock', 14) + '</button>';
  }

  /* ------------------------------------------------------------
     Live-Fenster

     Oben auf der Startseite sitzt dasselbe Bild wie im Bereich
     Sender (die wandernde Buehne aus dock.js), darunter eine
     schlanke Bedienleiste. So sieht man sofort, was laeuft.
     ------------------------------------------------------------ */
  function liveCard() {
    return '<section class="card start-live">' +
      // Der Vollbild-Knopf über dem Bild gilt nur auf dem Tablet (siehe tablet.css)
      '<div class="stage-slot start-live__stage" id="stageSlot">' +
        '<button class="icon-btn start-live__full" id="stFullTop" type="button" aria-label="Vollbild" title="Vollbild">' + u.icon('full', 22) + '</button>' +
      '</div>' +
      '<div class="start-now" id="stNow">' +
        '<div class="start-now__body" id="stNowBody">' + nowHtml() + '</div>' +
      '</div>' +
    '</section>';
  }

  /**
   * Lautstärke-Regler in der Knopfreihe, neben dem Ton-Knopf - nur ab Tablet-Breite
   * (auf dem Handy gibt es die Tasten). Er bleibt beim Neuzeichnen der Infos
   * erhalten und wird nur umgesetzt, sonst risse das Ziehen mittendrin ab.
   */
  var volBox = null;
  function placeVol() {
    var slot = u.$('#stVolSlot');
    if (!slot) return;
    if (!volBox) {
      volBox = u.el('<span class="start-now__vol"><input type="range" id="stVol" min="0" max="100" step="1" aria-label="Lautstärke"></span>');
      var r = volBox.querySelector('input');
      r.addEventListener('input', function () {
        G.player.setVolume(u.num(r.value, 80));
        G.dock.paintMute();
        var m = u.$('#stMute');
        if (m) {
          var silent = G.store.state.settings.muted || G.store.state.settings.volume <= 0;
          m.innerHTML = u.icon(silent ? 'muted' : 'volume', 18);
          m.title = silent ? 'Ton an' : 'Ton aus';
          m.setAttribute('aria-label', m.title);
        }
      });
    }
    slot.replaceWith(volBox);
    var inp = volBox.querySelector('input');
    if (document.activeElement !== inp) inp.value = G.store.state.settings.volume;
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
    // Laufzeit: auch beim kurzen Nachladen stehen lassen, sonst flackert sie
    // Laufzeit entfällt (Vereinfachung); läuft der Einschlaf-Timer, steht er hier
    var left = G.extras ? Math.ceil(G.extras.sleepLeft() / 60000) : 0;
    var clock = left ? '<button class="start-now__sleepchip" id="stSleepChip" title="Einschlaf-Timer">' + u.icon('moon', 12) + '<span>' + left + ' Min.</span></button>' : '';
    var back = G.extras && G.extras.previous();
    var backBtn = back ? '<button class="start-now__back" id="stBack" title="' + tr('Zurück zu') + ' ' + u.esc(back.name) + '">' + u.icon('back', 12) + '<span data-no-translate>' + u.esc(back.name) + '</span></button>' : '';
    if (status === 'playing' && G.dock.isPaused && G.dock.isPaused()) state = '<span class="start-now__state is-paused"><i></i>Pausiert' + clock + backBtn + '</span>';
    else if (status === 'playing') state = '<span class="start-now__state is-live"><i></i>Live' + clock + backBtn + '</span>';
    else if (status === 'loading') state = '<span class="start-now__state is-busy"><i></i>Wird geladen …' + clock + backBtn + '</span>';
    else if (status === 'error') state = '<span class="start-now__state is-err"><i></i>Fehler' + backBtn + '</span>';
    else state = '<span class="start-now__state"><i></i>Zuletzt gesehen' +
      (s.last && s.last.at ? ' · ' + u.esc(u.relTime(s.last.at)) : '') + '</span>';

    return '<div class="start-now__head">' +
        u.logoHtml(c, 'start-now__logo') +
        '<span class="start-now__meta">' +
          state +
          '<b class="start-now__name" title="' + u.esc(c.name) + '">' + u.esc(c.name) + '</b>' +
          nowSub(c) +
        '</span>' +
        // Stern gleich hinter dem Namen, dann Ton und Regler (und AirPlay)
        '<button class="start-now__icon' + (fav ? ' is-on' : '') + '" id="stStar" ' +
          'aria-label="' + (fav ? 'Favorit entfernen' : 'Als Favorit merken') + '" title="Favorit">' +
          u.icon(fav ? 'starFill' : 'star', 20) + '</button>' +
        '<span class="start-now__break"></span>' +
        stageButtons() +
      '</div>';
  }

  /** Unter dem Sendernamen: laufende Sendung mit Fortschritt - sonst die Gruppe */
  function nowSub(c) {
    var ep = G.epg && G.epg.nowNext(c);
    if (!ep || !ep.now) return '<span class="start-now__sub">' + u.esc(c.group || G.player.kindOf(c.url).toUpperCase()) + '</span>';
    var pn = ep.now;
    return '<span class="start-now__sub start-now__epg" id="stEpg" role="button" tabindex="0" data-no-translate>' +
        '<span class="start-now__epgt">' + u.esc(pn.title || '—') + '</span>' +
        '<span class="start-now__epgm">' + G.epg.hm(pn.start) + '–' + G.epg.hm(pn.stop) +
          (ep.next ? ' · ' + (G.epg.en() ? 'then ' : 'danach ') + u.esc(ep.next.title || '') : '') + '</span>' +
        '<span class="epg-bar"><i style="width:' + G.epg.progress(pn).toFixed(1) + '%"></i></span>' +
      '</span>';
  }

  /** „⋯ Mehr“ unter dem Bild */
  function moreMenu() {
    var c = G.player.channel || G.store.state.last;
    if (!c) return;
    var en = G.i18n && G.i18n.language === 'en';
    var ep = G.epg && G.epg.nowNext(c);
    var left = G.extras ? Math.ceil(G.extras.sleepLeft() / 60000) : 0;
    var air = u.$('#stageAirplay');
    var s = G.store.state.settings;
    var volOk = G.player.volumeSettable ? G.player.volumeSettable() : true;
    var running = G.player.status === 'playing' || G.player.status === 'loading';
    u.menu({
      title: c.name,
      items: [
        ep && { icon: 'clock', label: tr('Programm'), sub: ep.now ? (en ? 'Now: ' : 'Jetzt: ') + ep.now.title : '', act: function () { G.epg.sheet(c); } },
        G.extras && { icon: 'moon', label: tr('Einschlaf-Timer'), sub: left ? left + ' Min.' : (en ? 'off' : 'aus'), on: !!left, act: function () { G.extras.sleepSheet(); } },
        G.extras && running && G.extras.pipSupported() && { icon: 'pip', label: tr('Bild-in-Bild'), on: G.extras.isPip(), act: function () { G.extras.pip(); } },
        G.multiview && window.innerWidth >= 700 && { icon: 'multi', label: tr('Mehrfachansicht'), act: function () { G.multiview.open(); } },
        air && !air.hidden && { icon: 'airplay', label: 'AirPlay', act: function () { air.click(); } },
        !volOk && { icon: s.muted ? 'volume' : 'muted', label: s.muted ? tr('Ton an') : tr('Ton aus'), act: function () { G.player.toggleMuted(); G.dock.paintMute(); paintNow(); } },
        G.dock.external && { icon: 'external', label: tr('In anderer App öffnen'), act: function () { G.dock.external(c); } }
      ]
    });
  }

  /** Langes Drücken auf einen Sender */
  function channelMenu(c) {
    if (!c) return;
    var fav = G.store.isFavorite(c.url);
    var L = G.lock;
    var why = L && L.hasCode() ? L.reason(c) : '';
    var ep = G.epg && G.epg.nowNext(c);
    u.menu({
      title: c.name,
      items: [
        { icon: fav ? 'starFill' : 'star', label: fav ? tr('Favorit entfernen') : tr('Als Favorit merken'), on: fav, act: function () {
          var on = G.store.toggleFavorite(c);
          u.toast(on ? 'Als Favorit gemerkt' : 'Favorit entfernt', c.name, 'ok', 2200);
          paintShelf(); paintNow();
        } },
        L && { icon: why ? 'unlock' : 'lock', label: why === 'channel' ? tr('Sperre aufheben') : why ? tr('Gesperrt über Kategorie oder Playlist') : tr('Sender sperren'), act: async function () {
          if (!L.hasCode()) { u.toast(tr('Erst einen Code festlegen'), tr('Einstellungen › Sperre'), 'warn', 3500); return; }
          if (why && why !== 'channel') { u.toast(tr('Gesperrt über Kategorie oder Playlist'), tr('Dort lässt sich die Sperre aufheben.'), 'warn', 3500); return; }
          var on = await L.toggleChannel(c);
          if (on != null) u.toast(on ? tr('Sender gesperrt') : tr('Sperre aufgehoben'), c.name, 'ok', 2000);
        } },
        ep && { icon: 'clock', label: tr('Programm ansehen'), sub: ep.now ? ep.now.title : '', act: function () { G.epg.sheet(c); } },
        G.multiview && window.innerWidth >= 700 && { icon: 'multi', label: tr('In die Mehrfachansicht'), act: function () { G.multiview.open(c); } }
      ]
    });
  }

  /** Langes Drücken auf eine Kategorie-Überschrift */
  function categoryMenu(name) {
    var L = G.lock;
    var plId = allPoolId || G.store.state.activeId;
    var locked = L && L.groupLocked(name);
    u.menu({
      title: groupLabel(name),
      items: [
        { icon: 'grid', label: tr('Nur diese Kategorie zeigen'), act: function () {
          allGroup = name; saveGroup(plId, allGroup); paintCats(); applyAll(); scrollToShelf();
        } },
        { icon: 'eyeOff', label: tr('Kategorie ausblenden'), act: function () {
          G.store.setGroupHidden(plId, name, true); paintCats(); applyAll();
          u.toast(tr('Kategorie ausgeblendet'), groupLabel(name), 'ok', 2400);
        } },
        L && { icon: locked ? 'unlock' : 'lock', label: locked ? tr('Kategorie entsperren') : tr('Kategorie sperren'), act: async function () {
          if (!L.hasCode()) { u.toast(tr('Erst einen Code festlegen'), tr('Einstellungen › Sperre'), 'warn', 3500); return; }
          var on = await L.toggleGroup(name);
          if (on != null) u.toast(on ? tr('Kategorie gesperrt') : tr('Sperre aufgehoben'), groupLabel(name), 'ok', 2000);
        } }
      ]
    });
  }


  /** Laufzeit als m:ss, ab einer Stunde h:mm:ss. */
  function clockText() {
    var s = Math.max(0, Math.floor(G.player.elapsed() / 1000));
    var h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = s % 60;
    var two = function (n) { return (n < 10 ? '0' : '') + n; };
    return '· ' + (h ? h + ':' + two(m) : m) + ':' + two(sec);
  }

  function stageButtons() {
    var st = G.store.state.settings;
    var muted = st.muted || st.volume <= 0;
    var air = u.$('#stageAirplay');
    var airOn = air && !air.hidden;
    // Ton und Regler nur, wo die Lautstärke einstellbar ist (nicht auf iPhone/iPad);
    // alles Weitere steckt in „⋯ Mehr“.
    var volOk = G.player.volumeSettable ? G.player.volumeSettable() : true;
    return (volOk
        ? '<button class="start-now__icon start-now__icon--sm" id="stMute" aria-label="' + (muted ? 'Ton an' : 'Ton aus') + '" title="' + (muted ? 'Ton an' : 'Ton aus') + '">' +
            u.icon(muted ? 'muted' : 'volume', 18) + '</button>' +
          '<span id="stVolSlot"></span>'
        : '') +
      '<button class="start-now__icon start-now__icon--sm" id="stMenu" aria-label="Mehr" title="Mehr">' + u.icon('dots', 20) + '</button>' +
      '<button class="start-now__icon start-now__icon--sm" id="stFull" aria-label="Vollbild" title="Vollbild">' + u.icon('full', 18) + '</button>';
  }

  function paintNow() {
    var host = u.$('#stNowBody');
    if (!host) return;
    host.innerHTML = nowHtml();
    placeVol();

    var mute = u.$('#stMute');
    if (mute) mute.onclick = function () { G.player.toggleMuted(); G.dock.paintMute(); paintNow(); };
    var full = u.$('#stFull');
    if (full) full.onclick = function () { G.player.fullscreen(true); };
    var fullTop = u.$('#stFullTop');
    if (fullTop) fullTop.onclick = function () { G.player.fullscreen(true); };
    var air = u.$('#stAir');
    if (air) air.onclick = function () { var b = u.$('#stageAirplay'); if (b) b.click(); };

    var moreB = u.$('#stMenu');
    if (moreB) moreB.onclick = moreMenu;
    var chip = u.$('#stSleepChip');
    if (chip) chip.onclick = function () { if (G.extras) G.extras.sleepSheet(); };

    var backB = u.$('#stBack');
    if (backB) backB.onclick = function (e) { e.stopPropagation(); G.extras.back(); };

    var epgBox = u.$('#stEpg');
    if (epgBox) epgBox.onclick = function () {
      var c = G.player.channel || G.store.state.last;
      if (c && G.epg) G.epg.sheet(c);
    };

    var star = u.$('#stStar');
    if (star) star.onclick = function () {
      var c = G.player.channel || G.store.state.last;
      if (!c) return;
      var on = G.store.toggleFavorite(c);
      u.toast(on ? 'Als Favorit gemerkt' : 'Favorit entfernt', c.name, 'ok', 2200);
      paintNow();
      paintShelf();
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
  var listQuery = { fav: '', recent: '' };   // Suche in Favoriten und Verlauf
  var FAVPL_KEY = 'g04tv.favPlaylist';
  var favPl = '*';                           // Favoriten: '*' = alle Playlisten, sonst Kennung
  try { favPl = localStorage.getItem(FAVPL_KEY) || '*'; } catch (e) { /* optional */ }
  var allGroup = '*';          // gewaehlte Kategorie ('*' = alle)
  var allGroups = [];          // Kategorien in der Reihenfolge der Playlist
  var allList = [];            // nach Suche gefiltert
  var allShown = 0;
  var observer = null;
  var lastGroup = null;        // Kategorie der zuletzt gezeigten Kachel

  function tr(text) { return G.i18n ? G.i18n.t(text) : text; }

  /** Der zuletzt selbst gewaehlte Reiter - sonst Favoriten, wenn es welche gibt. */
  function currentTab() {
    var s = G.store.state;
    if (!shelfTab) {
      try { shelfTab = localStorage.getItem(TAB_KEY); } catch (e) { /* optional */ }
    }
    if (shelfTab === 'fav' || shelfTab === 'all' || shelfTab === 'recent') return shelfTab;
    if (shelfTab === 'guide' && guideOn()) return shelfTab;
    shelfTab = null;
    return s.favorites.length ? 'fav' : 'all';
  }

  var VIEW_KEY = 'g04tv.startView';
  function viewMode() {
    var m = null;
    try { m = localStorage.getItem(VIEW_KEY); } catch (e) { /* optional */ }
    return m === 'list' ? 'list' : 'tiles';
  }

  function shelfCard() {
    return '<section class="card start-shelf' + (viewMode() === 'list' ? ' is-list' : '') + (G.lock && G.lock.hasCode() ? ' has-lock' : '') + '" id="stShelf">' + shelfInner() + '</section>';
  }

  // Jeder Reiter mit eigenem Zeichen und eigener Farbe (siehe start.css)
  var TAB_ICON = { fav: 'starFill', all: 'grid', recent: 'history', guide: 'clock' };
  function guideOn() { return !!(G.epg && G.epg.has() && G.store.state.settings.epgOn); }

  function tabBtn(key, label, n, tab) {
    var on = tab === key;
    return '<button class="start-shelf__tab start-shelf__tab--' + key + (on ? ' is-on' : '') + '" data-shelf="' + key + '" role="tab" aria-selected="' + on + '">' +
      u.icon(TAB_ICON[key], 15) + '<span>' + label + '</span>' + (n != null ? '<i>' + u.fmtInt(n) + '</i>' : '') + '</button>';
  }

  function shelfInner() {
    var s = G.store.state;
    var tab = currentTab();
    var allCount = (G.store.activePlaylist() || {}).count;

    var mode = viewMode();
    var head = '<div class="start-shelf__top">' +
      '<div class="start-shelf__tabs" role="tablist">' +
        tabBtn('fav', 'Favoriten', s.favorites.length, tab) +
        tabBtn('all', 'Alle', allCount || null, tab) +
        tabBtn('recent', 'Verlauf', s.recent.length, tab) +
        (guideOn() ? tabBtn('guide', 'Programm', null, tab) : '') +
      '</div>' +
    '</div>';

    var body;
    if (tab === 'all') body = allHead() + '<div class="start-shelf__grid" id="stGrid"></div><div class="start-shelf__more" id="stMore"></div>';
    else if (tab === 'guide') body = guideBody();
    else body = listBody(tab);

    return head + body;
  }

  /** Die Playlisten, aus denen Favoriten stammen - mit Anzahl, in der Reihenfolge der Playlisten. */
  function favPlaylists() {
    var s = G.store.state;
    var counts = {};
    s.favorites.forEach(function (f) { if (f.pl) counts[f.pl] = (counts[f.pl] || 0) + 1; });
    return s.playlists.filter(function (p) { return counts[p.id]; })
      .map(function (p) { return { id: p.id, name: p.name, count: counts[p.id] }; });
  }

  /** Die gewählte Playlist - '*' (alle), wenn es nichts zum Umschalten gibt oder sie fehlt. */
  function activeFavPl() {
    var pls = favPlaylists();
    if (pls.length < 2) return '*';
    return pls.some(function (p) { return p.id === favPl; }) ? favPl : '*';
  }

  function favChips() {
    var pls = favPlaylists();
    if (pls.length < 2) return '';
    var cur = activeFavPl();
    var total = G.store.state.favorites.length;
    return '<div class="chips chips--scroll start-shelf__cats" id="stFavPl">' +
      '<button class="chip' + (cur === '*' ? ' is-on' : '') + '" data-favpl="*">' + tr('Alle') +
        '<span class="chip__n">' + u.fmtInt(total) + '</span></button>' +
      pls.map(function (p) {
        return '<button class="chip' + (cur === p.id ? ' is-on' : '') + '" data-favpl="' + u.esc(p.id) + '">' +
          u.esc(p.name) + '<span class="chip__n">' + u.fmtInt(p.count) + '</span></button>';
      }).join('') +
    '</div>';
  }

  /**
   * Favoriten aus der Zeit, bevor die Playlist mitgemerkt wurde (oder aus einer
   * eingelesenen Sicherung), kennen ihre Playlist nicht: einmal in den Senderlisten
   * nachsehen. Gibt true zurück, wenn sich etwas geändert hat.
   */
  var favScanKey = '';
  async function resolveFavPlaylists() {
    var s = G.store.state;
    var ids = s.playlists.map(function (p) { return p.id; });
    var missing = s.favorites.filter(function (f) { return !f.pl || ids.indexOf(f.pl) < 0; });
    var key = ids.join(',') + '|' + missing.length;
    if (!missing.length || key === favScanKey) return false;
    favScanKey = key;

    var map = {};
    for (var i = 0; i < ids.length; i++) {
      var list = await G.library.channelsOf(ids[i]);
      for (var j = 0; j < list.length; j++) {
        var k = String(list[j].url || '').trim().toLowerCase();
        if (k && !(k in map)) map[k] = ids[i];
      }
    }
    var changed = false;
    missing.forEach(function (f) {
      var hit = map[String(f.url || '').trim().toLowerCase()];
      if (hit) { f.pl = hit; changed = true; }
    });
    if (changed) {
      favScanKey = ids.join(',') + '|' + s.favorites.filter(function (f) { return !f.pl || ids.indexOf(f.pl) < 0; }).length;
      G.store.commit('favorites');
    }
    return changed;
  }

  /** Die Kacheln von Favoriten oder Verlauf, nach Playlist und Suche des Reiters gefiltert. */
  function listItems(tab) {
    var s = G.store.state;
    var playing = G.player.channel;
    var all = tab === 'fav' ? s.favorites : s.recent;
    var pl = tab === 'fav' ? activeFavPl() : '*';
    var q = listQuery[tab];
    var list = all;
    if (pl !== '*') list = list.filter(function (c) { return c.pl === pl; });
    if (q) list = G.library.filter(list, q, '*');

    if (!list.length) return '<p class="start-shelf__empty">' + tr('Nichts gefunden') + '</p>';

    // Die Pfeile gelten für die ganze Liste - in einer Suche oder Auswahl wären sie irreführend.
    var ordered = tab === 'fav' && !q && pl === '*';
    return '<div class="start-shelf__grid">' +
      list.map(function (c, i) {
        return tile(c, playing && G.m3u.sameSource(playing.url, c.url), tab === 'recent' ? u.relTime(c.at) : '',
          ordered ? { i: i, n: list.length } : null);
      }).join('') +
    '</div>';
  }

  function listBody(tab) {
    var s = G.store.state;
    var list = tab === 'fav' ? s.favorites : s.recent;

    if (!list.length) {
      return '<p class="start-shelf__empty">' + (tab === 'fav'
        ? 'Markiere Sender mit einem Stern — sie erscheinen dann hier.'
        : 'Noch nichts gesehen — gespielte Sender erscheinen hier.') + '</p>';
    }
    return '<div class="start-shelf__tools">' +
        '<div class="search start-shelf__search">' + u.icon('search', 16) +
          '<input class="input" id="stListSearch" type="search" inputmode="search" autocomplete="off" ' +
          'placeholder="Suchen …" value="' + u.esc(listQuery[tab]) + '"></div>' +
      '</div>' +
      (tab === 'fav' ? favChips() : '') +
      '<div id="stListBody">' + listItems(tab) + '</div>' +
      (tab === 'recent'
        ? '<div class="start-shelf__foot"><button class="btn btn--sm btn--ghost" id="stClearRecent">' + u.icon('trash', 14) + ' Verlauf leeren</button></div>'
        : '<div class="start-shelf__foot">' +
            '<button class="btn btn--sm btn--ghost" data-fav-share type="button">' + u.icon('share', 14) + ' Teilen</button>' +
            '<button class="btn btn--sm btn--ghost" data-fav-export type="button">' + u.icon('download', 14) + ' Als M3U</button>' +
          '</div>');
  }

  /** Suche und - bei mehreren Playlisten - Auswahl der Playlist */
  function allHead() {
    var s = G.store.state;
    if (!s.playlists.length) return '';
    return plLine() + '<div class="start-shelf__tools">' +
        '<div class="search start-shelf__search">' + u.icon('search', 16) +
          '<input class="input" id="stSearch" type="search" inputmode="search" autocomplete="off" ' +
          'placeholder="Suchen …" value="' + u.esc(allQuery) + '"></div>' +

      '</div>' +
      '<div class="chips chips--scroll start-shelf__cats" id="stCats"></div>';
  }

  /** Schmale Zeile „Playlist: Name ▾“ (nur bei mehreren Playlisten) */
  function plLine() {
    var s = G.store.state;
    if (s.playlists.length < 2) return '';
    return '<label class="start-shelf__pl"><span>Playlist:</span>' +
      '<select id="stPick" aria-label="Playlist">' +
        s.playlists.map(function (p) {
          return '<option value="' + u.esc(p.id) + '"' + (p.id === s.activeId ? ' selected' : '') + '>' + u.esc(p.name) + '</option>';
        }).join('') +
      '</select></label>';
  }

  /** Reiter „Programm“: Jetzt / 20:15 / 22:00 und Suche im Programm */
  function guideBody() {
    var en = G.epg && G.epg.en();
    var chips = [['now', en ? 'Now' : 'Jetzt'], ['20:15', '20:15'], ['22:00', '22:00']];
    return plLine() +
      '<div class="start-shelf__tools"><div class="search start-shelf__search">' + u.icon('search', 16) +
        '<input class="input" id="stGuideQ" type="search" autocomplete="off" placeholder="' + tr('Sendung oder Sender suchen …') + '" value="' + u.esc(guideQuery) + '"></div></div>' +
      '<div class="chips guide__when start-shelf__when" id="stGuideWhen">' + chips.map(function (c) {
        return '<button class="chip' + (guideAt === c[0] ? ' is-on' : '') + '" data-at="' + c[0] + '">' + c[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="guide__list" id="stGuideList"><p class="start-shelf__empty">' + tr('Sender werden geladen …') + '</p></div>';
  }
  async function loadGuide() {
    var s = G.store.state;
    if (!u.$('#stGuideList')) return;
    if (!allPool || allPoolId !== s.activeId) {
      var id = s.activeId;
      var pool = await playlistChannels(id);
      if (id !== G.store.state.activeId) return;
      allPool = pool; allPoolId = id; allGroups = groupsInOrder(pool);
    }
    paintGuide();
  }
  function paintGuide() {
    var list = u.$('#stGuideList');
    if (list && allPool) list.innerHTML = guideRows();
    var when = u.$('#stGuideWhen');
    if (when) when.style.opacity = guideQuery ? '.4' : '';
  }


  /** Kategorien wie in der Playlist: Reihenfolge des ersten Auftretens */
  function groupsInOrder(list) {
    var seen = {}, out = [];
    list.forEach(function (c) {
      var g = c.group || '';
      if (!(g in seen)) { seen[g] = out.length; out.push({ name: g, count: 0 }); }
      out[seen[g]].count++;
    });
    return out;
  }

  function groupLabel(g) { return g || tr('Ohne Kategorie'); }

  /**
   * Eine seitwärts scrollende Leiste mit der Maus bedienbar machen. Auf dem
   * Handy wischt man; am Rechner gibt es dafür weder Geste noch Leiste. Das
   * Mausrad scrollt hier deshalb seitwärts, und Ziehen mit gedrückter Taste
   * geht auch.
   */
  function mouseScroll(el) {
    el.addEventListener('wheel', function (e) {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;   // Touchpad scrollt schon seitwärts
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }, { passive: false });

    var start = null, dragged = false;
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      start = { x: e.clientX, left: el.scrollLeft, id: e.pointerId };
      dragged = false;
    });
    el.addEventListener('pointermove', function (e) {
      if (!start) return;
      var dx = e.clientX - start.x;
      if (!dragged && Math.abs(dx) < 5) return;
      if (!dragged) { dragged = true; try { el.setPointerCapture(start.id); } catch (err) { /* egal */ } }
      el.scrollLeft = start.left - dx;
    });
    var end = function () { start = null; };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    // Nach dem Ziehen kein Klick auf die Kategorie unter dem Zeiger
    el.addEventListener('click', function (e) {
      if (!dragged) return;
      dragged = false;
      e.stopPropagation();
      e.preventDefault();
    }, true);
  }

  /* Die zuletzt gewählte Kategorie, je Playlist - beim nächsten Öffnen steht
     man wieder dort. Der Reiter (Favoriten, Alle, Verlauf) wird schon über
     TAB_KEY gemerkt. */
  var GROUP_KEY = 'g04tv.startGroup';
  function savedGroup(id) {
    try {
      var m = JSON.parse(localStorage.getItem(GROUP_KEY) || '{}');
      return typeof m[id] === 'string' ? m[id] : '*';
    } catch (e) { return '*'; }
  }
  // „Alles löschen“ nimmt auch die gemerkten Kategorien mit
  G.store.subscribe(function (st, why) {
    if (why === 'wipe') { try { localStorage.removeItem(GROUP_KEY); localStorage.removeItem(FAVPL_KEY); } catch (e) { /* optional */ } }
  });
  function saveGroup(id, group) {
    try {
      var m = JSON.parse(localStorage.getItem(GROUP_KEY) || '{}');
      if (group === '*') delete m[id]; else m[id] = group;
      localStorage.setItem(GROUP_KEY, JSON.stringify(m));
    } catch (e) { /* optional */ }
  }

  /** Blatt: Kategorien ein- und ausblenden */
  function catSheet() {
    var plId = allPoolId || G.store.state.activeId;
    var p = G.store.playlist(plId);
    var rows = function () {
      var hid = G.store.hiddenGroups(plId);
      return allGroups.map(function (g) {
        var on = hid.indexOf(g.name) < 0;
        return '<label class="switch cat-sheet__row">' +
          '<input type="checkbox" data-catshow="' + u.esc(g.name) + '"' + (on ? ' checked' : '') + '>' +
          '<span class="switch__track"></span>' +
          '<span class="switch__label" data-no-translate><b>' + u.esc(groupLabel(g.name)) + '</b><span>' + u.fmtInt(g.count) + ' ' + (G.epg && G.epg.en() ? 'channels' : 'Sender') + '</span></span>' +
        '</label>';
      }).join('');
    };
    u.openSheet(tr('Kategorien'),
      '<p class="cat-sheet__intro">' + tr('Ausgeschaltete Kategorien verschwinden unter „Alle“, aus der Suche und beim Umschalten. Favoriten bleiben.') + '</p>' +
      '<div class="cat-sheet__actions"><button class="btn btn--sm" data-catall="1">' + u.icon('eye', 15) + ' ' + tr('Alle zeigen') + '</button>' +
        '<button class="btn btn--sm" data-catall="0">' + u.icon('eyeOff', 15) + ' ' + tr('Alle ausblenden') + '</button></div>' +
      '<div class="cat-sheet__list">' + rows() + '</div>' +
      (p ? '<p class="cat-sheet__foot" data-no-translate>' + u.esc(p.name) + '</p>' : ''),
      function (body) {
        body.addEventListener('change', function (e) {
          var t = e.target.closest('[data-catshow]');
          if (!t) return;
          G.store.setGroupHidden(plId, t.getAttribute('data-catshow'), !t.checked);
          paintCats(); applyAll();
        });
        body.addEventListener('click', function (e) {
          var b = e.target.closest('[data-catall]');
          if (!b) return;
          if (b.getAttribute('data-catall') === '1') G.store.showAllGroups(plId);
          else allGroups.forEach(function (g) { G.store.setGroupHidden(plId, g.name, true); });
          body.querySelector('.cat-sheet__list').innerHTML = rows();
          paintCats(); applyAll();
        });
      });
  }

  /* ------------------------------------------------------------
     Jetzt im TV: alle Sender mit ihrer Sendung - jetzt, um 20:15,
     um 22:00 - und Suche im ganzen Programm
     ------------------------------------------------------------ */
  var guideAt = 'now';
  var guideQuery = '';
  function guideTime() {
    if (guideAt === 'now') return Date.now();
    var d = new Date(), hm = guideAt.split(':');
    d.setHours(+hm[0], +hm[1], 0, 0);
    if (d.getTime() < Date.now() - 3600000) d.setDate(d.getDate() + 1);   // schon vorbei: morgen
    return d.getTime();
  }
  function guideChannels() {
    var hid = hiddenNow();
    return (allPool || []).filter(function (c) { return hid.indexOf(c.group || '') < 0; });
  }
  function guideRows() {
    var list = guideChannels();
    var out = [];
    var q = guideQuery.toLowerCase();
    var en = G.epg.en();
    if (q) {
      // Suche: alle kommenden Sendungen
      list.forEach(function (c) {
        var cn = (c.name || '').toLowerCase();
        G.epg.upcoming(c, 60).forEach(function (pr) {
          if ((pr.title || '').toLowerCase().indexOf(q) >= 0 || cn.indexOf(q) >= 0 && pr.start <= Date.now() && pr.stop > Date.now()) out.push({ c: c, p: pr });
        });
      });
      out.sort(function (a, b) { return a.p.start - b.p.start; });
      out = out.slice(0, 120);
    } else {
      var t = guideTime();
      list.forEach(function (c) {
        var ep = G.epg.nowNext(c, t);
        if (ep && ep.now) out.push({ c: c, p: ep.now, n: ep.next });
      });
    }
    if (!out.length) return '<p class="guide__empty">' + (q ? (en ? 'Nothing found in the programme.' : 'Im Programm nichts gefunden.') : (en ? 'No programme for these channels.' : 'Für diese Sender gibt es kein Programm.')) + '</p>';
    var now = Date.now();
    return out.map(function (r) {
      var live = r.p.start <= now && r.p.stop > now;
      var left = Math.max(1, Math.round((r.p.stop - now) / 60000));
      var info = live ? (en ? left + ' min left' : 'noch ' + left + ' Min.') : G.epg.hm(r.p.start) + '–' + G.epg.hm(r.p.stop);
      if (q && !live) {
        var d = new Date(r.p.start);
        if (d.toDateString() !== new Date().toDateString()) info = d.toLocaleDateString(en ? 'en-GB' : 'de-DE', { weekday: 'short' }) + ' ' + info;
      }
      return '<button class="guide__row' + (live ? ' is-live' : '') + '" data-guide="' + u.esc(r.c.url) + '">' +
        u.logoHtml(r.c, 'guide__logo') +
        '<span class="guide__main" data-no-translate>' +
          '<span class="guide__ch">' + u.esc(r.c.name) + '</span>' +
          '<b>' + u.esc(r.p.title || '—') + '</b>' +
          (live ? '<span class="epg-bar"><i style="width:' + G.epg.progress(r.p).toFixed(1) + '%"></i></span>' : '') +
          (r.n ? '<span class="guide__next">' + G.epg.hm(r.n.start) + ' ' + u.esc(r.n.title || '') + '</span>' : '') +
        '</span>' +
        '<span class="guide__time" data-no-translate>' + info + '</span>' +
      '</button>';
    }).join('');
  }
  function guideSheet() {
    if (!G.epg || !G.epg.has()) return;
    var en = G.epg.en();
    var chips = [['now', en ? 'Now' : 'Jetzt'], ['20:15', '20:15'], ['22:00', '22:00']];
    u.openSheet(tr('Jetzt im TV'),
      '<div class="guide">' +
        '<div class="search guide__search">' + u.icon('search', 16) +
          '<input class="input" id="guideQ" type="search" autocomplete="off" placeholder="' + tr('Sendung oder Sender suchen …') + '" value="' + u.esc(guideQuery) + '"></div>' +
        '<div class="chips guide__when">' + chips.map(function (c) {
          return '<button class="chip' + (guideAt === c[0] ? ' is-on' : '') + '" data-at="' + c[0] + '">' + c[1] + '</button>';
        }).join('') + '</div>' +
        '<div class="guide__list" id="guideList">' + guideRows() + '</div>' +
      '</div>',
      function (body) {
        var list = body.querySelector('#guideList');
        var when = body.querySelector('.guide__when');
        var q = body.querySelector('#guideQ');
        var paint = function () {
          list.innerHTML = guideRows();
          when.style.opacity = guideQuery ? '.4' : '';
        };
        q.addEventListener('input', u.debounce(function () { guideQuery = q.value.trim(); paint(); }, 200));
        q.addEventListener('keydown', function (e) { if (e.key === 'Enter') q.blur(); });
        when.addEventListener('click', function (e) {
          var b = e.target.closest('[data-at]');
          if (!b) return;
          guideAt = b.getAttribute('data-at');
          u.$$('[data-at]', when).forEach(function (x) { x.classList.toggle('is-on', x === b); });
          paint();
        });
        list.addEventListener('click', function (e) {
          var b = e.target.closest('[data-guide]');
          if (!b) return;
          var c = findChannel(b.getAttribute('data-guide'));
          if (!c) return;
          u.closeSheet();
          G.views.live.playChannel(c);
        });
        paint();
      });
  }

  /** Ausgeblendete Kategorien der gezeigten Playlist */
  function hiddenNow() { return G.store.hiddenGroups(allPoolId || G.store.state.activeId); }
  function visibleGroups() {
    var hid = hiddenNow();
    return allGroups.filter(function (g) { return hid.indexOf(g.name) < 0; });
  }

  function paintCats() {
    var host = u.$('#stCats');
    if (!host) return;
    // eine einzige Kategorie (oder keine) - dann braucht es keine Leiste
    if (allGroups.length < 2) { host.innerHTML = ''; host.hidden = true; return; }
    host.hidden = false;
    var groups = visibleGroups();
    var nHidden = allGroups.length - groups.length;
    var total = groups.reduce(function (n, g) { return n + g.count; }, 0);
    host.innerHTML =
      '<button class="chip' + (allGroup === '*' ? ' is-on' : '') + '" data-cat="*">' + tr('Alle') +
        '<span class="chip__n">' + u.fmtInt(total) + '</span></button>' +
      groups.map(function (g) {
        return '<button class="chip' + (allGroup === g.name ? ' is-on' : '') + '" data-cat="' + u.esc(g.name) + '">' +
          u.esc(groupLabel(g.name)) + '<span class="chip__n">' + u.fmtInt(g.count) + '</span></button>';
      }).join('') +
      // Am Ende: Kategorien ein- und ausblenden
      '<button class="chip chip--edit' + (nHidden ? ' has-hidden' : '') + '" data-catedit title="' + tr('Kategorien ein- und ausblenden') + '">' +
        u.icon(nHidden ? 'eyeOff' : 'eye', 15) + '<span>' + (nHidden ? u.fmtInt(nHidden) + ' ' + tr('ausgeblendet') : tr('Kategorien')) + '</span></button>';
    var on = host.querySelector('.chip.is-on');
    // Die aktive Kategorie ins Bild holen. Gemessen wird vom Rand der Leiste:
    // offsetLeft zählt vom Rand der Karte und schob die Leiste um deren
    // Innenabstand zu weit - die aktive Kategorie saß dann angeschnitten am Rand.
    if (on) {
      var left = on.getBoundingClientRect().left - host.getBoundingClientRect().left + host.scrollLeft;
      host.scrollLeft = Math.max(0, left - 16);
    }
  }

  /* Von aussen: Reiter "Alle" zeigen (statt des frueheren Bereichs Sender) */
  var pendingJump = null;      // null | 'shelf' | 'search'
  function showAll(focusSearch) {
    shelfTab = 'all';
    try { localStorage.setItem(TAB_KEY, 'all'); } catch (e) { /* optional */ }
    pendingJump = focusSearch ? 'search' : 'shelf';
  }

  /** Sender der Playlist in ihrer Reihenfolge, dahinter die eigenen Sender. */
  async function playlistChannels(id) {
    var seen = {}, out = [];
    var add = function (c, fallbackGroup) {
      var key = String(c.url || '').trim().toLowerCase();
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push({ name: c.name || G.m3u.nameFromSource(c.url), url: c.url,
        group: c.group || fallbackGroup || '', logo: c.logo || '', tvgId: c.tvgId || '', pl: fallbackGroup ? '' : id });
    };
    (await G.library.channelsOf(id)).forEach(function (c) { add(c); });
    G.store.state.channels.forEach(function (c) { add(c, tr('Eigene Sender')); });
    return out;
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

    // Ganze Playlist gesperrt: erst nach dem Code
    if (G.lock && G.lock.playlistLocked(s.activeId) && !G.lock.isOpen()) {
      var cats0 = u.$('#stCats'); if (cats0) { cats0.innerHTML = ''; cats0.hidden = true; }
      grid.innerHTML = '<div class="start-shelf__none start-shelf__locked">' + u.icon('lock', 30) +
        '<p>' + tr('Diese Playlist ist gesperrt.') + '</p>' +
        '<button class="btn btn--primary btn--sm" id="stUnlockPl">' + u.icon('unlock', 15) + ' ' + tr('Entsperren') + '</button></div>';
      var more0 = u.$('#stMore'); if (more0) more0.innerHTML = '';
      var ub = u.$('#stUnlockPl');
      if (ub) ub.onclick = async function () { if (await G.lock.ask()) paintShelf(); };
      return;
    }

    if (!allPool || allPoolId !== s.activeId) {
      grid.innerHTML = '<p class="start-shelf__empty">' + tr('Sender werden geladen …') + '</p>';
      var id = s.activeId;
      var pool = await playlistChannels(id);
      if (id !== G.store.state.activeId) return;     // inzwischen umgeschaltet

      // Eine gemerkte Playlist, deren Sender nicht mehr in der Ablage stehen
      // (Browserdaten geloescht, Sicherung eingelesen): einmal nachholen.
      var p = G.store.activePlaylist();
      if (p && !p.count && p.kind !== 'file' && p.kind !== 'text' && !p.error) {
        var g = u.$('#stGrid');
        if (g) g.innerHTML = '<p class="start-shelf__empty">' + tr('Playlist wird geholt …') + '</p>';
        var res = await G.library.refresh(p.id);
        if (res.ok) pool = await playlistChannels(p.id);
        else u.toast(tr('Playlist nicht erreichbar'), res.error, 'warn', 6000);
        if (id !== G.store.state.activeId) return;
      }
      allPool = pool; allPoolId = id;
      allGroups = groupsInOrder(pool);
      allGroup = savedGroup(id);
      if (allGroup !== '*' &&!allGroups.some(function (g) { return g.name === allGroup; })) allGroup = '*';
    }
    paintCats();
    if (!u.$('#stGrid')) return;                      // Ansicht verlassen
    applyAll();
  }

  function applyAll() {
    var hid = hiddenNow();
    if (allGroup !== '*' && hid.indexOf(allGroup) >= 0) allGroup = '*';
    var base = allGroup === '*'
      ? (hid.length ? (allPool || []).filter(function (c) { return hid.indexOf(c.group || '') < 0; }) : (allPool || []))
      : (allPool || []).filter(function (c) { return (c.group || '') === allGroup; });
    allList = G.library.filter(base, allQuery, '*');
    lastGroup = null;
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
    // Ueberschrift, wo eine neue Kategorie beginnt (nur bei "Alle Kategorien")
    var showHeads = allGroup === '*' && visibleGroups().length > 1;
    grid.insertAdjacentHTML('beforeend', next.map(function (c) {
      var head = '';
      if (showHeads && (c.group || '') !== lastGroup) {
        lastGroup = c.group || '';
        var g = allGroups.filter(function (x) { return x.name === lastGroup; })[0];
        head = '<div class="start-shelf__cat" data-cat="' + u.esc(lastGroup) + '">' +
          '<span>' + u.esc(groupLabel(lastGroup)) + '</span>' +
          (g && !allQuery ? '<i>' + u.fmtInt(g.count) + '</i>' : '') +
          (G.lock && G.lock.hasCode() ? catLockBtn(lastGroup) : '') + '</div>';
      }
      return head + tile(c, playing && G.m3u.sameSource(playing.url, c.url));
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

    // Bild genau unter die Kopfzeile setzen - gemessen auf dem Geraet selbst.
    // (Auf dem iPhone ist die Kopfzeile wegen der Statusleiste hoeher, als
    // CSS allein es sicher weiss; dann rutschte das Bild darunter.)
    var live = u.$('.start-live');
    if (live) {
      var place = function () {
        // Verzögerte Aufrufe einer frueheren Startseite nicht mehr ausfuehren
        if (!live.isConnected) return;
        var bar = u.$('.topbar');
        var fixedMode = getComputedStyle(live).position === 'fixed';
        if (bar && fixedMode) {
          var top = Math.max(0, bar.getBoundingClientRect().bottom);
          live.style.top = top + 'px';
        } else {
          live.style.top = '';
        }
        // Platz fuer das feste Bild und Sprungziele (scroll-margin)
        document.documentElement.style.setProperty('--live-h', live.getBoundingClientRect().height + 'px');
        // Unterkante des Bildes, gemessen - die Reiter hängen genau dort
        document.documentElement.style.setProperty('--live-bottom', live.getBoundingClientRect().bottom + 'px');
      };
      place();
      // nach dem Laden von Schrift und Logos noch einmal nachmessen
      [60, 300, 1000, 2500].forEach(function (ms) { setTimeout(place, ms); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
      window.addEventListener('resize', place);
      window.addEventListener('orientationchange', place);
      if (window.visualViewport) window.visualViewport.addEventListener('resize', place);
      off.push(function () {
        window.removeEventListener('resize', place);
        window.removeEventListener('orientationchange', place);
        if (window.visualViewport) window.visualViewport.removeEventListener('resize', place);
        live.style.top = '';
      });
      if ('ResizeObserver' in window) {
        var ro = new ResizeObserver(place);
        ro.observe(live, { box: 'border-box' });
        var bar0 = u.$('.topbar'); if (bar0) ro.observe(bar0, { box: 'border-box' });
        off.push(function () { ro.disconnect(); });
      }
    }

    var onPlayer = function () { paintNow(); paintPlaying(); };
    document.addEventListener('g04tv:player', onPlayer);
    off.push(function () { document.removeEventListener('g04tv:player', onPlayer); });
    // Laufzeit jede Sekunde nachziehen - nur der Text, nichts wird neu gezeichnet
    var tick = setInterval(function () {
      var c = u.$('#stClock');
      if (c && G.player.elapsed() >= 0) c.textContent = clockText();
    }, 1000);
    off.push(function () { clearInterval(tick); });
    document.addEventListener('g04tv:airplay', paintNow);
    off.push(function () { document.removeEventListener('g04tv:airplay', paintNow); });

    // Schloss auf einer Kachel: Sender sperren/entsperren (braucht den Code)
    u.on(host, 'click', '[data-lock]', async function (e, t) {
      e.stopPropagation();
      var c = findChannel(t.getAttribute('data-lock'));
      if (!c) return;
      var why = G.lock.reason(c);
      if (why && why !== 'channel') {
        u.toast(tr('Gesperrt über Kategorie oder Playlist'), tr('Dort lässt sich die Sperre aufheben.'), 'warn', 3500);
        return;
      }
      var on = await G.lock.toggleChannel(c);
      if (on == null) return;
      u.toast(on ? tr('Sender gesperrt') : tr('Sperre aufgehoben'), c.name, 'ok', 2000);
    });
    // Schloss an einer Kategorie-Ueberschrift
    u.on(host, 'click', '[data-lockcat]', async function (e, t) {
      e.stopPropagation();
      var name = t.getAttribute('data-lockcat');
      var on = await G.lock.toggleGroup(name);
      if (on == null) return;
      u.toast(on ? tr('Kategorie gesperrt') : tr('Sperre aufgehoben'), groupLabel(name), 'ok', 2000);
    });
    var onLock = function () {
      paintNow();
      // gesperrte Playlist im Reiter "Alle": Platzhalter <-> Liste
      var s0 = G.store.state;
      if (currentTab() === 'all' && G.lock.playlistLocked(s0.activeId) !== !!u.$('.start-shelf__locked')
          || (currentTab() === 'all' && u.$('.start-shelf__locked') && G.lock.isOpen())) { paintShelf(); return; }
      refreshLocks();
    };
    document.addEventListener('g04tv:lock', onLock);
    off.push(function () { document.removeEventListener('g04tv:lock', onLock); });

    // Programmführer: geladen oder neue Minute - Zeilen und Fortschritt nachführen
    var onEpg = function () {
      if (G.epg && G.epg.info().busy) return;
      // Programm gerade fertig geladen: Reiter „Programm“ nachreichen
      var tabsEl = u.$('.start-shelf__tabs');
      var gt = u.$('[data-shelf="guide"]');
      if (tabsEl && guideOn() && !gt) tabsEl.insertAdjacentHTML('beforeend', tabBtn('guide', tr('Programm'), null, currentTab()));
      else if (gt && !guideOn()) gt.remove();
      if (currentTab() === 'guide') paintGuide();
      var vol = u.$('#stVol');
      if (!(vol && document.activeElement === vol)) paintNow();
      refreshEpg();
    };
    document.addEventListener('g04tv:epg', onEpg);
    document.addEventListener('g04tv:prev', paintNow);
    document.addEventListener('g04tv:sleep', paintNow);
    document.addEventListener('g04tv:paused', paintNow);
    off.push(function () { document.removeEventListener('g04tv:paused', paintNow); });
    off.push(function () { document.removeEventListener('g04tv:sleep', paintNow); });
    off.push(function () { document.removeEventListener('g04tv:prev', paintNow); });
    off.push(function () { document.removeEventListener('g04tv:epg', onEpg); });

    // Stern auf einer Kachel: Favorit an/aus - ohne abzuspielen
    u.on(host, 'click', '[data-fav]', function (e, t) {
      e.stopPropagation();
      var c = findChannel(t.getAttribute('data-fav'));
      if (!c) return;
      var on = G.store.toggleFavorite(c);
      u.toast(on ? 'Als Favorit gemerkt' : 'Favorit entfernt', c.name, 'ok', 1800);
      if (currentTab() === 'fav') { paintShelf(); }
      else {
        // nur Sterne und Zaehler auffrischen, Liste und Scrollstelle bleiben
        u.$$('[data-fav]', host).forEach(function (b) {
          if (!G.m3u.sameSource(b.getAttribute('data-fav'), c.url)) return;
          b.classList.toggle('is-on', on);
          b.innerHTML = u.icon(on ? 'starFill' : 'star', 15);
          b.setAttribute('aria-label', on ? 'Favorit entfernen' : 'Als Favorit merken');
        });
        var n = u.$('[data-shelf="fav"] i', host);
        if (n) n.textContent = u.fmtInt(G.store.state.favorites.length);
      }
      paintNow();
    });
    u.on(host, 'keydown', '[data-play]', function (e, t) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === t) { e.preventDefault(); t.click(); }
    });

    // Pfeile in der Favoritenliste: Sender nach oben oder unten schieben
    u.on(host, 'click', '[data-mv]', function (e, t) {
      e.stopPropagation();
      G.store.moveFavorite(t.getAttribute('data-mv'), +t.getAttribute('data-dir'));
      paintShelf();
    });

    // Langes Drücken: Sender- bzw. Kategorie-Menü
    u.onLongPress(host, '.ch-tile[data-play], .start-shelf__cat', function (el) {
      if (el.classList.contains('start-shelf__cat')) { categoryMenu(el.getAttribute('data-cat')); return; }
      channelMenu(findChannel(el.getAttribute('data-play')));
    });

    u.on(host, 'click', '[data-play]', function (e, t) {
      if (e.target.closest('[data-fav], [data-lock], [data-mv]')) return;
      var c = findChannel(t.getAttribute('data-play'));
      if (!c) return;
      // Das Bild klebt oben - die Liste bleibt, wo sie ist.
      G.views.live.playChannel(c);
    });

    // Kacheln | Liste - nur die Darstellung wechselt, Liste und Scrollstelle bleiben
    u.on(host, 'click', '[data-view]', function (e, t) {
      var m = t.getAttribute('data-view');
      try { localStorage.setItem(VIEW_KEY, m); } catch (err) { /* optional */ }
      var card = u.$('#stShelf');
      if (card) card.classList.toggle('is-list', m === 'list');
      u.$$('[data-view]', host).forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-view') === m); });
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
    // Klebt das Bild oben, liegt die Liste darunter; sonst zählt nur die Kopfzeile
    var pos = live ? getComputedStyle(live).position : '';
    var bar = u.$('.topbar');
    var under = (pos === 'sticky' || pos === 'fixed') ? live.getBoundingClientRect().bottom
      : (bar ? bar.getBoundingClientRect().bottom : 0);
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
      var cats = u.$('#stCats');
      if (cats) mouseScroll(cats);
      if (cats) cats.addEventListener('click', function (e) {
        if (e.target.closest('[data-catedit]')) { catSheet(); return; }
        var b = e.target.closest('[data-cat]');
        if (!b) return;
        allGroup = b.getAttribute('data-cat');
        saveGroup(allPoolId || G.store.state.activeId, allGroup);
        paintCats();
        applyAll();
        scrollToShelf();
      });
      var grid = u.$('#stGrid');
      if (grid) grid.addEventListener('click', function (e) {
        if (e.target.closest('[data-lockcat]')) return;
        var h = e.target.closest('.start-shelf__cat');
        if (!h) return;
        allGroup = h.getAttribute('data-cat');
        saveGroup(allPoolId || G.store.state.activeId, allGroup);
        paintCats();
        applyAll();
        scrollToShelf();
      });
      loadAll();
    }

    var pick = u.$('#stPick');
    if (pick) pick.addEventListener('change', function () {
      G.store.setActive(pick.value);
      allQuery = '';
      allGroup = '*';
      paintShelf();
    });

    if (currentTab() === 'guide') {
      var gq = u.$('#stGuideQ');
      if (gq) gq.addEventListener('input', u.debounce(function () { guideQuery = gq.value.trim(); paintGuide(); }, 200));
      var gw = u.$('#stGuideWhen');
      if (gw) gw.addEventListener('click', function (e) {
        var b = e.target.closest('[data-at]');
        if (!b) return;
        guideAt = b.getAttribute('data-at');
        u.$$('[data-at]', gw).forEach(function (x) { x.classList.toggle('is-on', x === b); });
        paintGuide();
      });
      var gl = u.$('#stGuideList');
      if (gl) gl.addEventListener('click', function (e) {
        var b = e.target.closest('[data-guide]');
        if (!b) return;
        var c = findChannel(b.getAttribute('data-guide'));
        if (c) G.views.live.playChannel(c);
      });
      loadGuide();
    }


    // Enter schließt die Tastatur (auf dem Tablet bleibt sie sonst stehen)
    ['#stSearch', '#stListSearch', '#stGuideQ'].forEach(function (sel) {
      var f = u.$(sel);
      if (f) f.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); f.blur(); }
      });
    });

    // Favoriten: zwischen den Playlisten umschalten
    var favChipsEl = u.$('#stFavPl');
    if (favChipsEl) {
      mouseScroll(favChipsEl);
      favChipsEl.addEventListener('click', function (e) {
        var b = e.target.closest('[data-favpl]');
        if (!b) return;
        favPl = b.getAttribute('data-favpl');
        try { localStorage.setItem(FAVPL_KEY, favPl); } catch (err) { /* optional */ }
        u.$$('[data-favpl]', favChipsEl).forEach(function (x) { x.classList.toggle('is-on', x === b); });
        var body = u.$('#stListBody');
        if (body) body.innerHTML = listItems('fav');
      });
    }
    if (currentTab() === 'fav') {
      resolveFavPlaylists().then(function (changed) { if (changed && currentTab() === 'fav') paintShelf(); });
    }

    // Favoriten weitergeben - bei gewählter Playlist nur deren Favoriten
    u.$$('[data-fav-share]').forEach(function (b) {
      b.onclick = function () {
        var pl = activeFavPl();
        var list = G.store.state.favorites.filter(function (c) { return pl === '*' || c.pl === pl; });
        var p = pl === '*' ? null : G.store.playlist(pl);
        G.share.open({ title: p ? tr('Favoriten') + ' ' + p.name : tr('Favoriten'), favorites: list });
      };
    });

    var listSearch = u.$('#stListSearch');
    if (listSearch) listSearch.addEventListener('input', u.debounce(function () {
      var tab = currentTab();
      listQuery[tab] = listSearch.value.trim();
      var body = u.$('#stListBody');
      if (body) body.innerHTML = listItems(tab);
    }, 150));

    // Oben der kleine Knopf, unten unter der Liste der beschriftete - beide sichern
    u.$$('[data-fav-export]').forEach(function (exp) { exp.onclick = function () {
      var favs = G.store.state.favorites;
      var lines = ['#EXTM3U'];
      favs.forEach(function (c) {
        lines.push('#EXTINF:-1 tvg-logo="' + (c.logo || '') + '" group-title="' + (c.group || 'Favoriten') + '",' + c.name);
        lines.push(c.url);
      });
      var ok = u.download('G04TV-Favoriten.m3u', lines.join('\n'), 'audio/x-mpegurl');
      u.toast(ok ? 'Datei erstellt' : 'Ging nicht',
        ok ? favs.length + ' Sender als M3U gespeichert.' : 'Der Browser hat den Download verhindert.',
        ok ? 'ok' : 'warn');
    }; });

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
    showAll: showAll
  };
})(G04TV);
