/* ============================================================
   G04TV v1.0.0 — Anwendung, Navigation, Start
   ============================================================ */
(function (G) {
  'use strict';
  var u = G.u;

  /* Die sechs Bereiche - wie die Bereichsleiste in Connect+ */
  var NAV = [
    { k: 'start', n: 'Start', ic: 'start', tab: true },
    { k: 'live', n: 'Sender', ic: 'live', tab: true },
    { k: 'playlists', n: 'Playlisten', ic: 'playlists', tab: true },
    { k: 'favorites', n: 'Favoriten', ic: 'star', tab: true },
    { k: 'settings', n: 'Einstellungen', ic: 'settings', tab: true },
    { k: 'info', n: 'Info', ic: 'info' }
  ];

  var current = 'start';
  var currentParams = null;
  var lastView = null;
  var installEvent = null;

  /* ------------------------------------------------------------
     Navigation aufbauen
     ------------------------------------------------------------ */
  function buildNav() {
    var s = G.store.state;

    u.$('#nav').innerHTML = NAV.map(function (v) {
      var badge = '';
      if (v.k === 'favorites' && s.favorites.length) badge = '<span class="nav__badge">' + s.favorites.length + '</span>';
      if (v.k === 'playlists') {
        var bad = s.playlists.filter(function (p) { return !!p.error; }).length;
        if (bad) badge = '<span class="nav__badge">' + bad + '</span>';
      }
      return '<button class="nav__item" data-nav="' + v.k + '">' +
        u.icon(v.ic, 19) + '<span>' + u.esc(v.n) + '</span>' + badge + '</button>';
    }).join('');

    u.$('#tabbar').innerHTML = NAV.filter(function (v) { return v.tab; }).map(function (v) {
      return '<button class="tabbar__item" data-nav="' + v.k + '">' +
        u.icon(v.ic, 21) + '<span>' + u.esc(v.n) + '</span></button>';
    }).join('');

    markActive();
  }

  function markActive() {
    u.$$('[data-nav]').forEach(function (b) {
      var on = b.getAttribute('data-nav') === current;
      b.classList.toggle('is-active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }

  /* ------------------------------------------------------------
     Ansicht wechseln
     ------------------------------------------------------------ */
  function render(afterFn) {
    var view = G.views[current];
    if (!view) { current = 'start'; view = G.views.start; }

    if (lastView && lastView.unmount) {
      try { lastView.unmount(); } catch (e) { console.error(e); }
    }

    var title = typeof view.title === 'function' ? view.title() : view.title;
    u.$('#viewTitle').textContent = title;
    u.$('#viewSub').textContent = typeof view.sub === 'function' ? view.sub() : (view.sub || '');
    document.title = G.NAME + ' — ' + (G.i18n ? G.i18n.t(title) : title);

    var host = u.$('#viewHost');
    host.innerHTML = view.render(currentParams) || '';

    if (view.mount) {
      try { view.mount(host); } catch (e) { console.error(e); }
    }
    lastView = view;

    // Bereichswechsel innerhalb einer Ansicht
    u.on(host, 'click', '[data-go]', function (e, t) { go(t.getAttribute('data-go')); });

    // Ausserhalb des Bereichs Sender laeuft das Bild unten rechts weiter.
    if (current !== 'live') G.dock.place(null);

    buildNav();
    if (afterFn) afterFn();
  }

  function go(key, params) {
    if (!G.views[key]) return;
    current = key;
    currentParams = params || null;
    closeMobileNav();
    if (location.hash !== '#' + key) history.replaceState(null, '', '#' + key);
    render();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function rerender(afterFn) {
    currentParams = null;
    render(afterFn);
  }

  /* ------------------------------------------------------------
     Navigation auf dem Handy
     ------------------------------------------------------------ */
  function openMobileNav() {
    u.$('.sidebar').classList.add('is-open');
    u.$('#scrim').hidden = false;
  }
  function closeMobileNav() {
    var sb = u.$('.sidebar');
    if (sb) sb.classList.remove('is-open');
    if (u.$('#sheet').hidden) u.$('#scrim').hidden = true;
  }

  /* ------------------------------------------------------------
     Tastatur
     ------------------------------------------------------------ */
  function keys(e) {
    var tag = (e.target && e.target.tagName) || '';
    var typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    if (e.key === 'Escape') {
      if (G.player.isFull()) { G.player.fullscreen(false); return; }
      if (!u.$('#sheet').hidden) u.closeSheet();
      closeMobileNav();
      return;
    }

    if (typing) return;

    if (e.key === '/') { e.preventDefault(); var s = u.$('#chSearch'); if (s) { go('live'); setTimeout(function () { var f = u.$('#chSearch'); if (f) f.focus(); }, 60); } else go('live'); return; }
    if (e.key === 'f' || e.key === 'F') { G.player.fullscreen(); return; }
    if (e.key === 'm' || e.key === 'M') { G.player.toggleMuted(); G.dock.paintMute(); rerender(); return; }

    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= NAV.length) go(NAV[n - 1].k);
  }

  /* ------------------------------------------------------------
     Start
     ------------------------------------------------------------ */
  function boot() {
    G.store.load();
    var s = G.store.state;

    if (G.i18n) G.i18n.useState(s.settings);

    if (s.settings.reduceMotion) document.body.classList.add('no-motion');

    G.dock.init();

    document.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-nav]');
      if (nav) go(nav.getAttribute('data-nav'));
    });

    u.$('#mobileMenuBtn').addEventListener('click', openMobileNav);
    u.$('#infoBtn').addEventListener('click', function () { go('info'); });
    u.$('#liveChip').addEventListener('click', function () { go('live'); });
    u.$('#sheetClose').addEventListener('click', u.closeSheet);
    u.$('#scrim').addEventListener('click', function () {
      if (!u.$('#sheet').hidden) u.closeSheet();
      closeMobileNav();
    });
    document.addEventListener('keydown', keys);

    window.addEventListener('hashchange', function () {
      var k = location.hash.replace('#', '');
      if (k && G.views[k] && k !== current) go(k);
    });

    // Die Kopfzeile und die Seitenleiste haengen am Abspieler.
    document.addEventListener('g04tv:player', function () { markActive(); });

    if (!s.onboarded) { G.onboarding.start(); return; }

    u.$('#app').hidden = false;
    var start = location.hash.replace('#', '');
    current = G.views[start] ? start : (s.playlists.length ? 'live' : 'start');
    render();

    // Verwaiste Senderlisten aufraeumen (geloeschte Playlisten)
    G.store.tidy();

    if (!G.store.storageOk) {
      u.toast('Kein lokaler Speicher',
        'Der Browser blockiert Website-Daten. G04TV vergisst Playlisten und Favoriten beim Schließen.', 'warn', 7000);
    }

    G.db.probe().then(function (ok) {
      if (!ok) {
        u.toast('Senderlisten nicht speicherbar',
          'Die Datenbank des Browsers ist gesperrt. Playlisten werden bei jedem Start neu geholt.', 'warn', 7000);
      }
    });

    // Weitersehen, wenn es gewuenscht ist
    if (s.settings.resume && s.last) {
      G.player.play(s.last);
    }
  }

  /* ------------------------------------------------------------
     Service Worker und Installation
     ------------------------------------------------------------ */
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol === 'file:') return;
    navigator.serviceWorker.register('sw.js').catch(function () { /* Offlinebetrieb bleibt optional */ });
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installEvent = e;
  });

  function install() {
    if (!installEvent) return;
    installEvent.prompt();
    installEvent.userChoice.then(function () { installEvent = null; });
  }

  G.app = {
    NAV: NAV,
    go: go,
    rerender: rerender,
    install: install,
    canInstall: function () { return !!installEvent; },
    get current() { return current; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { boot(); registerSW(); });
  } else {
    boot(); registerSW();
  }
})(G04TV);
