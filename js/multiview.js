/* ============================================================
   G04TV — Mehrfachansicht
   Zwei oder vier Sender gleichzeitig (gedacht für iPad und Rechner).
   Jede Kachel hat ihr eigenes Videofeld und spielt selbst - mit den
   gleichen Wegen wie der Hauptspieler (eingebautes HLS, hls.js,
   mpegts.js). Ton hat immer nur eine Kachel; Antippen gibt ihr den Ton.
   Beim Schließen läuft der Sender mit Ton im normalen Bild weiter.
   ============================================================ */
(function (G) {
  'use strict';
  var u = G.u;
  var KEY = 'g04tv.multi';

  var box = null;          // das Overlay
  var tiles = [];          // [{el, video, channel, hls, ts, run, timer, steps, state}]
  var layout = 4;          // 2 oder 4
  var audio = 0;           // Kachel mit Ton
  var wake = null;

  function tr(t) { return G.i18n ? G.i18n.t(t) : t; }
  function en() { return !!(G.i18n && G.i18n.language === 'en'); }
  function same(a, b) { return !!a && !!b && G.m3u.sameSource(a.url, b.url); }

  function saved() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        layout: layout, audio: audio,
        channels: tiles.map(function (t) { return t.channel ? { name: t.channel.name, url: t.channel.url, group: t.channel.group || '', logo: t.channel.logo || '', tvgId: t.channel.tvgId || '' } : null; })
      }));
    } catch (e) { /* optional */ }
  }

  /* ------------------------------------------------------------
     Abspielen in einer Kachel
     ------------------------------------------------------------ */
  function nativeHls(v) { return !!v.canPlayType('application/vnd.apple.mpegurl'); }
  function preferNative(v) {
    if (!nativeHls(v)) return false;
    if (typeof window.MediaSource !== 'function' && !window.ManagedMediaSource) return true;
    return /Apple/i.test(navigator.vendor || '');
  }
  function appleWithoutMse(v) { return nativeHls(v) && typeof window.MediaSource !== 'function'; }

  function teardown(t) {
    clearTimeout(t.timer);
    if (t.hls) { try { t.hls.destroy(); } catch (e) { } t.hls = null; }
    if (t.ts) { try { t.ts.destroy(); } catch (e) { } t.ts = null; }
    try { t.video.pause(); } catch (e) { }
    t.video.removeAttribute('src');
    try { t.video.load(); } catch (e) { }
  }

  function setState(t, state, text) {
    t.state = state;
    t.el.classList.toggle('is-loading', state === 'loading');
    t.el.classList.toggle('is-error', state === 'error');
    t.el.classList.toggle('is-playing', state === 'playing');
    var m = t.el.querySelector('.mv-tile__msg');
    if (m) m.textContent = text || '';
  }

  function nextStep(t, mine) {
    if (mine !== t.run) return;
    teardown(t);
    var step = t.steps.shift();
    if (!step) { setState(t, 'error', en() ? 'Channel did not start' : 'Sender startet nicht'); return; }
    setState(t, 'loading', '');
    // Läuft nach 20 s nichts: nächster Weg
    t.timer = setTimeout(function () { if (mine === t.run && t.state !== 'playing') nextStep(t, mine); }, 20000);
    step(mine);
  }

  function playIn(t) {
    var v = t.video;
    var p = v.play();
    if (p && p.catch) p.catch(function () {
      // Mit Ton verweigert (keine Berührung): stumm starten
      if (!v.muted) { v.muted = true; v.play().catch(function () { }); }
    });
  }

  function stepNative(t, url) {
    return function () { t.video.src = url; playIn(t); };
  }
  function stepHls(t, url) {
    return async function (mine) {
      if (preferNative(t.video)) { t.video.src = url; playIn(t); return; }
      var ok = await G.player.ensureLib('hls') && G.player.hlsUsable();
      if (mine !== t.run) return;
      if (!ok) { if (nativeHls(t.video)) { t.video.src = url; playIn(t); } else nextStep(t, mine); return; }
      t.hls = new window.Hls({ lowLatencyMode: false, liveSyncDurationCount: 4, maxBufferLength: 30, maxMaxBufferLength: 40, backBufferLength: 10 });
      t.hls.on(window.Hls.Events.MANIFEST_PARSED, function () { playIn(t); });
      t.hls.on(window.Hls.Events.ERROR, function (ev, d) {
        if (!d || !d.fatal) return;
        if (d.type === 'mediaError' && !t.recovered) { t.recovered = true; t.hls.recoverMediaError(); return; }
        nextStep(t, mine);
      });
      t.hls.loadSource(url);
      t.hls.attachMedia(t.video);
    };
  }
  function stepTs(t, url) {
    return async function (mine) {
      var ok = await G.player.ensureLib('ts') && G.player.tsUsable();
      if (mine !== t.run) return;
      if (!ok) { nextStep(t, mine); return; }
      t.ts = window.mpegts.createPlayer({ type: 'mpegts', isLive: true, url: url }, {
        enableWorker: true, enableStashBuffer: true, liveBufferLatencyChasing: false,
        autoCleanupSourceBuffer: true, autoCleanupMaxBackwardDuration: 30, autoCleanupMinBackwardDuration: 15
      });
      t.ts.on(window.mpegts.Events.ERROR, function () { nextStep(t, mine); });
      if (window.ManagedMediaSource && typeof window.MediaSource !== 'function') {
        try { t.video.disableRemotePlayback = true; } catch (e) { }
      }
      t.ts.attachMediaElement(t.video);
      t.ts.load();
      try { var p = t.ts.play(); if (p && p.catch) p.catch(function () { t.video.muted = true; t.ts.play(); }); } catch (e) { }
    };
  }

  async function start(t, c) {
    t.run = (t.run || 0) + 1;
    var mine = t.run;
    teardown(t);
    t.channel = c;
    t.recovered = false;
    paintTile(t);
    if (!c) { setState(t, 'empty', ''); return; }
    setState(t, 'loading', '');

    var source = String(c.url).trim();
    var url = G.store.streamViaProxy(source);
    var viaProxy = url !== source;
    if (!viaProxy && G.player.mixedContent(source)) {
      var lifted = await G.library.httpsVariant(source, false);
      if (mine !== t.run) return;
      if (!lifted) { setState(t, 'error', en() ? 'http stream blocked' : 'http-Sender blockiert'); return; }
      url = lifted;
    }
    var kind = G.player.kindOf(source);
    if (kind === 'extern') { setState(t, 'error', en() ? 'Format not playable' : 'Format nicht abspielbar'); return; }
    var plain = viaProxy ? source : url;
    var steps = [];
    if (kind === 'hls') steps.push(stepHls(t, url));
    else if (kind === 'ts' || kind === 'flv') {
      var variant = kind === 'ts' ? G.player.hlsVariant(plain) : '';
      var h = variant && stepHls(t, G.store.streamViaProxy(variant));
      var s = stepTs(t, url);
      if (h && appleWithoutMse(t.video)) steps.push(h, s);
      else if (h) steps.push(s, h);
      else steps.push(s);
    } else {
      steps.push(stepNative(t, url), stepTs(t, url));
    }
    t.steps = steps;
    applyAudio();
    nextStep(t, mine);
  }

  /* ------------------------------------------------------------
     Ton: nur eine Kachel
     ------------------------------------------------------------ */
  function applyAudio() {
    var s = G.store.state.settings;
    tiles.forEach(function (t, i) {
      var on = i === audio;
      t.video.muted = !on || !!s.muted;
      try { t.video.volume = u.clamp(s.volume / 100, 0, 1); } catch (e) { }
      t.el.classList.toggle('has-audio', on);
      var b = t.el.querySelector('.mv-tile__snd');
      if (b) b.innerHTML = u.icon(on && !s.muted ? 'volume' : 'muted', 16);
    });
  }
  function giveAudio(i) {
    if (i === audio) return;
    audio = i;
    applyAudio();
    var t = tiles[i];
    // Berührung: jetzt darf auch der Ton starten
    if (t && t.video.paused && t.channel) playIn(t);
    save();
  }

  /* ------------------------------------------------------------
     Darstellung
     ------------------------------------------------------------ */
  function epgText(c) {
    var ep = c && G.epg && G.epg.nowNext(c);
    return ep && ep.now ? ep.now.title || '' : (c && c.group) || '';
  }

  function paintTile(t) {
    var c = t.channel;
    t.el.classList.toggle('is-empty', !c);
    t.el.querySelector('.mv-tile__name').textContent = c ? c.name : '';
    t.el.querySelector('.mv-tile__sub').textContent = c ? epgText(c) : '';
  }

  function tileHtml(i) {
    return '<div class="mv-tile is-empty" data-tile="' + i + '">' +
      '<video playsinline webkit-playsinline muted preload="none"></video>' +
      '<button class="mv-tile__add" data-mv-pick="' + i + '" aria-label="Sender wählen">' + u.icon('plus', 34) + '<span>Sender wählen</span></button>' +
      '<div class="mv-tile__busy"><div class="stage__ring"></div></div>' +
      '<p class="mv-tile__msg"></p>' +
      '<div class="mv-tile__bar">' +
        '<button class="mv-tile__snd" data-mv-audio="' + i + '" aria-label="Ton">' + u.icon('muted', 16) + '</button>' +
        '<span class="mv-tile__meta" data-no-translate><b class="mv-tile__name"></b><span class="mv-tile__sub"></span></span>' +
        '<button class="mv-tile__btn" data-mv-pick="' + i + '" aria-label="Sender wechseln" title="Sender wechseln">' + u.icon('refresh', 15) + '</button>' +
        '<button class="mv-tile__btn" data-mv-big="' + i + '" aria-label="Groß ansehen" title="Groß ansehen">' + u.icon('full', 15) + '</button>' +
        '<button class="mv-tile__btn" data-mv-clear="' + i + '" aria-label="Entfernen" title="Entfernen">' + u.icon('close', 15) + '</button>' +
      '</div>' +
    '</div>';
  }

  function build() {
    box = document.createElement('div');
    box.className = 'mv';
    box.id = 'multiView';
    box.innerHTML =
      '<div class="mv__top">' +
        '<b class="mv__title">' + u.icon('grid', 18) + '<span>Mehrfachansicht</span></b>' +
        '<div class="mv__layout" role="group">' +
          '<button data-mv-layout="2" title="2 Sender">' + u.icon('pip', 15) + '<span>2</span></button>' +
          '<button data-mv-layout="4" title="4 Sender">' + u.icon('grid', 15) + '<span>4</span></button>' +
        '</div>' +
        '<span class="mv__hint">Bild antippen = Ton</span>' +
        '<button class="icon-btn" id="mvFull" aria-label="Vollbild" title="Vollbild">' + u.icon('full', 18) + '</button>' +
        '<button class="icon-btn" id="mvClose" aria-label="Schließen" title="Schließen">' + u.icon('close', 18) + '</button>' +
      '</div>' +
      '<div class="mv__grid"></div>';
    document.body.appendChild(box);
    var grid = box.querySelector('.mv__grid');
    grid.innerHTML = [0, 1, 2, 3].map(tileHtml).join('');
    tiles = u.$$('.mv-tile', grid).map(function (el) {
      var t = { el: el, video: el.querySelector('video'), channel: null, run: 0, steps: [], state: 'empty' };
      t.video.addEventListener('playing', function () { clearTimeout(t.timer); setState(t, 'playing', ''); });
      t.video.addEventListener('waiting', function () { if (t.state === 'playing') t.el.classList.add('is-loading'); });
      t.video.addEventListener('canplay', function () { t.el.classList.remove('is-loading'); });
      t.video.addEventListener('error', function () { if (t.channel && t.state !== 'error') nextStep(t, t.run); });
      return t;
    });

    box.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-mv-layout]'))) { setLayout(+b.getAttribute('data-mv-layout')); return; }
      if ((b = e.target.closest('[data-mv-pick]'))) { pick(+b.getAttribute('data-mv-pick')); return; }
      if ((b = e.target.closest('[data-mv-clear]'))) { var ti = +b.getAttribute('data-mv-clear'); start(tiles[ti], null); save(); return; }
      if ((b = e.target.closest('[data-mv-big]'))) { audio = +b.getAttribute('data-mv-big'); close(); return; }
      if ((b = e.target.closest('[data-mv-audio]'))) { giveAudio(+b.getAttribute('data-mv-audio')); return; }
      if (e.target.closest('#mvClose')) { close(); return; }
      if (e.target.closest('#mvFull')) { fullToggle(); return; }
      var tile = e.target.closest('.mv-tile');
      if (tile && !tile.classList.contains('is-empty')) giveAudio(+tile.getAttribute('data-tile'));
    });
  }

  function setLayout(n) {
    layout = n === 2 ? 2 : 4;
    box.setAttribute('data-layout', layout);
    u.$$('[data-mv-layout]', box).forEach(function (b) { b.classList.toggle('is-on', +b.getAttribute('data-mv-layout') === layout); });
    // Ausgeblendete Kacheln anhalten (spart Leitung und Akku)
    tiles.forEach(function (t, i) {
      if (i >= layout) { if (t.channel) { t.parked = t.channel; start(t, null); } }
      else if (!t.channel && t.parked) { var c = t.parked; t.parked = null; start(t, c); }
    });
    if (audio >= layout) { audio = 0; applyAudio(); }
    save();
  }

  function fullToggle() {
    var fe = document.fullscreenElement || document.webkitFullscreenElement;
    try {
      if (fe) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      if (box.requestFullscreen) box.requestFullscreen().catch(function () { });
      else if (box.webkitRequestFullscreen) box.webkitRequestFullscreen();
    } catch (e) { /* nicht möglich */ }
  }

  /* ------------------------------------------------------------
     Sender auswählen
     ------------------------------------------------------------ */
  async function pool() {
    var s = G.store.state;
    var list = [];
    try { list = await G.library.channelsOf(s.activeId); } catch (e) { list = []; }
    var hid = G.store.hiddenGroups(s.activeId);
    if (hid.length) list = list.filter(function (c) { return hid.indexOf(c.group || '') < 0; });
    return { favs: s.favorites.slice(), all: list };
  }

  async function pick(i) {
    var p = await pool();
    var q = '';
    var row = function (c) {
      var ep = G.epg && G.epg.nowNext(c);
      return '<button class="mv-pick__row" data-pick-url="' + u.esc(c.url) + '">' + u.logoHtml(c, 'guide__logo') +
        '<span class="mv-pick__main" data-no-translate><b>' + u.esc(c.name) + '</b><span>' + u.esc(ep && ep.now ? ep.now.title : (c.group || '')) + '</span></span></button>';
    };
    var paint = function (host) {
      var favs = q ? G.library.filter(p.favs, q, '*') : p.favs;
      var all = G.library.filter(p.all, q, '*').slice(0, 150);
      host.innerHTML =
        (favs.length ? '<h4 class="mv-pick__h">' + tr('Favoriten') + '</h4>' + favs.map(row).join('') : '') +
        (all.length ? '<h4 class="mv-pick__h">' + tr('Alle Sender') + '</h4>' + all.map(row).join('') : '') +
        (!favs.length && !all.length ? '<p class="guide__empty">' + tr('Nichts gefunden') + '</p>' : '');
    };
    u.openSheet(tr('Sender wählen'),
      '<div class="search guide__search">' + u.icon('search', 16) +
        '<input class="input" id="mvQ" type="search" autocomplete="off" placeholder="' + tr('Suchen …') + '"></div>' +
      '<div class="mv-pick" id="mvPick"></div>',
      function (body) {
        var host = body.querySelector('#mvPick');
        paint(host);
        var inp = body.querySelector('#mvQ');
        inp.addEventListener('input', u.debounce(function () { q = inp.value.trim(); paint(host); }, 180));
        host.addEventListener('click', async function (e) {
          var b = e.target.closest('[data-pick-url]');
          if (!b) return;
          var url = b.getAttribute('data-pick-url');
          var c = p.favs.concat(p.all).filter(function (x) { return G.m3u.sameSource(x.url, url); })[0];
          if (!c) return;
          u.closeSheet();
          if (G.lock && !(await G.lock.guard(c))) return;
          var t = tiles[i];
          t.parked = null;
          // Erster Sender: bekommt den Ton
          if (!tiles.some(function (x) { return x.channel; })) audio = i;
          start(t, c);
          if (i === audio) giveAudioNow(i);
          save();
        });
      });
  }
  function giveAudioNow(i) { audio = i; applyAudio(); }

  /* ------------------------------------------------------------
     Öffnen / Schließen
     ------------------------------------------------------------ */
  async function open(extra) {
    if (box) return;
    build();
    document.body.classList.add('mv-open');
    var st = saved();
    layout = st.layout === 2 ? 2 : 4;
    audio = 0;
    var first = G.player.channel || null;
    var list = (st.channels || []).filter(Boolean);
    // Der laufende Sender kommt in die erste Kachel
    if (first) list = [first].concat(list.filter(function (c) { return !same(c, first); }));
    // Per langem Drücken gewählter Sender: gleich als zweites Bild
    if (extra && extra.url) {
      list = list.filter(function (c) { return !same(c, extra); });
      list.splice(first ? 1 : 0, 0, extra);
    }
    G.player.stop();
    setLayout(layout);
    var n = 0;
    for (var i = 0; i < layout && i < list.length; i++) {
      var c = list[i];
      if (G.lock && G.lock.isLocked(c) && !G.lock.isOpen()) continue;
      start(tiles[n], c); n++;
    }
    applyAudio();
    save();
    keepAwake(true);
    document.addEventListener('g04tv:epg', onEpg);
    window.addEventListener('keydown', onKey, true);
  }

  function close() {
    if (!box) return;
    var keep = tiles[audio] && tiles[audio].channel;
    save();
    tiles.forEach(function (t) { t.run++; teardown(t); });
    var fe = document.fullscreenElement || document.webkitFullscreenElement;
    if (fe && box.contains(fe) || fe === box) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { } }
    box.remove(); box = null; tiles = [];
    document.body.classList.remove('mv-open');
    keepAwake(false);
    document.removeEventListener('g04tv:epg', onEpg);
    window.removeEventListener('keydown', onKey, true);
    // Der Sender mit Ton läuft im normalen Bild weiter
    if (keep) { G.store.pushRecent(keep); G.player.play(keep); }
  }

  function onEpg() { tiles.forEach(function (t) { if (t.channel) t.el.querySelector('.mv-tile__sub').textContent = epgText(t.channel); }); }
  function onKey(e) {
    var sheet = document.getElementById('sheet');
    if (sheet && !sheet.hidden) return;                  // im Auswahlblatt gilt die normale Tastatur
    if (/input|textarea|select/i.test((e.target && e.target.tagName) || '')) return;
    e.stopPropagation();                                 // Kürzel der App wirken nicht hinter der Ansicht
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'f' || e.key === 'F') { fullToggle(); return; }
    if (e.key === 'm' || e.key === 'M') { G.player.toggleMuted(); return; }
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= layout) giveAudio(n - 1);
  }

  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator) wake = await navigator.wakeLock.request('screen');
      else if (wake) { await wake.release(); wake = null; }
    } catch (e) { wake = null; }
  }

  // Lautstärke/Ton-aus an anderer Stelle geändert
  G.store.subscribe(function (st, why) { if (box && why === 'settings') applyAudio(); });

  G.multiview = { open: open, close: close, isOpen: function () { return !!box; } };
})(G04TV);
