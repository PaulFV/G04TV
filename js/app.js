/* ============================================================
   G04TV v1.0.54 — Anwendung, Navigation, Start
   ============================================================ */
(function (G) {
  'use strict';
  var u = G.u;

  /* Die sechs Bereiche - wie die Bereichsleiste in Connect+ */
  var NAV = [
    { k: 'start', n: 'Start', ic: 'start', tab: true },
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

    // Frischer Behaelter fuer jede Ansicht: die Ansichten haengen ihre
    // Klick-Reaktionen an ihn. Blieb er bestehen, sammelten sie sich an -
    // dann sprang z. B. ein Favorit auf der Startseite in den Bereich Sender,
    // weil die Reaktion der Favoriten-Ansicht noch mitlief.
    var old = u.$('#viewHost');
    var host = old.cloneNode(false);
    document.body.setAttribute('data-view', current);
    old.parentNode.replaceChild(host, old);
    host.innerHTML = view.render(currentParams) || '';

    if (view.mount) {
      try { view.mount(host); } catch (e) { console.error(e); }
    }
    lastView = view;

    // Bereichswechsel innerhalb einer Ansicht
    u.on(host, 'click', '[data-go]', function (e, t) { go(t.getAttribute('data-go')); });

    // Ansichten mit eigenem Platz fuers Bild (Sender, Start) haengen es
    // selbst ein - ueberall sonst laeuft es unten rechts weiter.
    if (!host.querySelector('#stageSlot')) G.dock.place(null);

    buildNav();
    if (afterFn) afterFn();
  }

  /* ------------------------------------------------------------
     Sprachumschalter in der Kopfzeile
     ------------------------------------------------------------ */
  /* ------------------------------------------------------------
     Hell / Dunkel (wie in G04Fit)
     ------------------------------------------------------------ */
  var SUN = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.8v2.3M12 18.9v2.3M21.2 12h-2.3M5.1 12H2.8M18.5 5.5l-1.6 1.6M7.1 16.9l-1.6 1.6M18.5 18.5l-1.6-1.6M7.1 7.1 5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M20.2 15.2A8 8 0 018.8 3.8 8.5 8.5 0 1020.2 15.2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';

  function applyTheme(theme) {
    theme = theme === 'light' ? 'light' : 'dark';
    var root = document.documentElement;
    if (theme === 'light') root.setAttribute('data-theme', 'light'); else root.removeAttribute('data-theme');
    root.style.colorScheme = theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#EDF2F7' : '#05070B');
    var scheme = document.querySelector('meta[name="color-scheme"]');
    if (scheme) scheme.setAttribute('content', theme);
    try { localStorage.setItem('g04tv.theme', theme); } catch (e) { /* optional */ }

    var b = u.$('#themeBtn');
    if (b) {
      var light = theme === 'light';
      var label = light ? 'Dunklen Modus aktivieren' : 'Hellen Modus aktivieren';
      // Im dunklen Modus zeigt der Knopf die Sonne (dorthin geht es), im hellen den Mond.
      b.innerHTML = light ? MOON : SUN;
      b.title = label;
      b.setAttribute('aria-label', label);
      b.setAttribute('aria-pressed', light ? 'true' : 'false');
    }
  }

  /**
   * Läuft die App im Browser (Adressleiste sichtbar), gibt es einen Knopf,
   * der die ganze Seite in den Vollbildmodus schaltet. Als installierte App
   * ist er überflüssig und bleibt verborgen; ebenso auf dem iPhone, wo
   * Safari das für Seiten nicht kennt.
   */
  function initAppFull() {
    var b = u.$('#appFull');
    if (!b) return;
    var root = document.documentElement;
    var request = root.requestFullscreen || root.webkitRequestFullscreen;
    var installed = (window.matchMedia && (matchMedia('(display-mode: standalone)').matches ||
      matchMedia('(display-mode: fullscreen)').matches)) || navigator.standalone;
    if (!request || installed) return;

    var isFull = function () { return !!(document.fullscreenElement || document.webkitFullscreenElement); };
    var paint = function () {
      var on = isFull();
      b.innerHTML = u.icon(on ? 'fullExit' : 'full', 20);
      b.title = on ? 'Vollbild verlassen' : 'App im Vollbild';
      b.setAttribute('aria-label', b.title);
      b.classList.toggle('is-on', on);
    };
    b.hidden = false;
    paint();
    b.addEventListener('click', function () {
      try {
        if (isFull()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        else request.call(root);
      } catch (e) { /* abgelehnt */ }
    });
    document.addEventListener('fullscreenchange', paint);
    document.addEventListener('webkitfullscreenchange', paint);
  }

  function initTheme() {
    var s = G.store.state.settings;
    applyTheme(s.theme);
    var b = u.$('#themeBtn');
    if (b) b.addEventListener('click', function () {
      setTheme(s.theme === 'light' ? 'dark' : 'light');
    });
  }

  function setTheme(theme) {
    var s = G.store.state.settings;
    s.theme = theme === 'light' ? 'light' : 'dark';
    G.store.commit('settings');
    applyTheme(s.theme);
    // Die Einstellungen zeigen das Farbschema als Auswahl - mitziehen.
    if (current === 'settings') rerender();
  }

  /** --topbar-h: Hoehe der festen Kopfzeile, damit das Bild darunter kleben kann. */
  function trackTopbar() {
    var bar = u.$('.topbar');
    if (!bar) return;
    var set = function () {
      document.documentElement.style.setProperty('--topbar-h', bar.getBoundingClientRect().height + 'px');
    };
    set();
    if ('ResizeObserver' in window) new ResizeObserver(set).observe(bar, { box: 'border-box' });
    else window.addEventListener('resize', set);
  }

  function initLangSwitch() {
    var box = u.$('#langSwitch');
    if (!box || !G.i18n) return;
    var paint = function () {
      u.$$('[data-lang]', box).forEach(function (b) {
        var on = b.getAttribute('data-lang') === G.i18n.language;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    };
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lang]');
      if (b) G.i18n.setLanguage(b.getAttribute('data-lang'));
    });
    document.addEventListener('g04tv:language', paint);
    paint();
  }

  function go(key, params) {
    // Den Bereich "Sender" gibt es nicht mehr - die Startseite kann alles,
    // was er konnte. Wer dorthin wollte, landet bei Start im Reiter "Alle".
    if (key === 'live') {
      key = 'start';
      if (G.views.start && G.views.start.showAll) G.views.start.showAll(params && params.search);
    }
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

  // Sperre geaendert (Code, Sperren, 15 Minuten offen): Seiten mit Sperr-Knoepfen nachziehen
  document.addEventListener('g04tv:lock', function () {
    if (current === 'settings' || current === 'playlists') rerender();
  });

  /* ------------------------------------------------------------
     Navigation auf dem Handy
     ------------------------------------------------------------ */
  // Ablauf wie in G04Fit: Seite sperren, Knopf wird zum Schliessen-Kreuz.
  function openMobileNav() {
    u.$('.sidebar').classList.add('is-open');
    var menu = u.$('#mobileMenuBtn');
    if (menu) {
      menu.innerHTML = u.icon('close', 21);
      menu.setAttribute('aria-label', 'Menü schließen');
      menu.setAttribute('aria-expanded', 'true');
    }
    document.body.style.overflow = 'hidden';
    u.$('#scrim').hidden = false;
  }
  function closeMobileNav() {
    var sb = u.$('.sidebar');
    if (sb) sb.classList.remove('is-open');
    var menu = u.$('#mobileMenuBtn');
    if (menu && menu.getAttribute('aria-expanded') === 'true') {
      menu.innerHTML = u.icon('menu', 21);
      menu.setAttribute('aria-label', 'Menü öffnen');
      menu.setAttribute('aria-expanded', 'false');
    }
    if (u.$('#sheet').hidden) document.body.style.overflow = '';
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

    if (e.key === '/') { e.preventDefault(); go('live', { search: true }); return; }
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
    // Aeltere Einstellungen kennen den Schalter noch nicht: dann sichtbar
    if (s.settings.showTabbar === false) document.body.classList.add('no-tabbar');

    G.dock.init();
    initLangSwitch();
    initTheme();
    initAppFull();
    trackTopbar();

    document.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-nav]');
      if (nav) go(nav.getAttribute('data-nav'));
    });

    u.$('#viewClose').addEventListener('click', function () { go('start'); });
    u.$('#mobileMenuBtn').addEventListener('click', function () {
      if (u.$('.sidebar').classList.contains('is-open')) closeMobileNav(); else openMobileNav();
    });
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
    // Die App beginnt immer mit der Startseite - auch wenn die Adresse
    // noch den zuletzt besuchten Bereich traegt (#live). Auf dem iPhone
    // wird die App vom Home-Bildschirm oft genau mit dieser Adresse geoeffnet.
    current = 'start';
    if (location.hash && location.hash !== '#start') history.replaceState(null, '', '#start');
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
    // (ein gesperrter Sender wird nicht ungefragt gestartet)
    if (s.settings.resume && s.last) {
      G.lock.ready.then(function () {
        if (!G.lock.isLocked(s.last) || G.lock.isOpen()) G.player.play(s.last);
      });
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
    setTheme: setTheme,
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
