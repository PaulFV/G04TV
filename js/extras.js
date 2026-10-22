/* ============================================================
   G04TV — Komfort beim Fernsehen
   1. Wischen zum Umschalten: im Bild nach links/rechts wischen,
      im Vollbild auch nach oben/unten - wie mit der Fernbedienung.
   2. Einschlaf-Timer: nach 15-90 Minuten leiser werden und anhalten.
   3. Bildschirm bleibt an, solange ein Sender läuft (Wake Lock).
   ============================================================ */
(function (G) {
  'use strict';
  var u = G.u;

  function tr(t) { return G.i18n ? G.i18n.t(t) : t; }
  function same(a, b) { return !!a && !!b && G.m3u.sameSource(a.url, b.url); }
  function locked(c) { return G.lock && G.lock.isLocked(c) && !G.lock.isOpen(); }

  /* ------------------------------------------------------------
     1. Umschalten
     Läuft ein Favorit: durch die Favoriten. Sonst durch die Sender
     der aktiven Playlist, in deren Reihenfolge. Gesperrte Sender
     werden übersprungen.
     ------------------------------------------------------------ */
  async function zapList(current) {
    var s = G.store.state;
    if (s.favorites.some(function (c) { return same(c, current); })) return s.favorites;
    var list = [];
    if (s.activeId) {
      try { list = await G.library.channelsOf(s.activeId); } catch (e) { list = []; }
      // Ausgeblendete Kategorien beim Umschalten überspringen
      var hid = G.store.hiddenGroups(s.activeId);
      if (hid.length) list = list.filter(function (c) { return hid.indexOf(c.group || '') < 0 || same(c, current); });
    }
    if (!list.some(function (c) { return same(c, current); })) {
      // Sender aus einer anderen Liste (z. B. Verlauf): den Verlauf nehmen
      if (s.recent.some(function (c) { return same(c, current); })) return s.recent;
    }
    return list;
  }

  var zapping = false;
  async function zap(dir) {
    if (zapping) return;
    var current = G.player.channel || G.store.state.last;
    if (!current) return;
    zapping = true;
    try {
      var list = await zapList(current);
      if (!list || list.length < 2) return;
      var i = list.findIndex(function (c) { return same(c, current); });
      var next = null;
      for (var n = 1; n < list.length; n++) {
        var cand = list[((i < 0 ? 0 : i) + dir * n + list.length * n) % list.length];
        if (!locked(cand)) { next = cand; break; }
      }
      if (!next) return;
      flash(next, dir);
      G.store.pushRecent(next);
      G.player.play(next);
    } finally { zapping = false; }
  }

  /** Kurze Einblendung im Bild: Pfeil und Name des neuen Senders */
  var flashTimer = null;
  function flash(c, dir) {
    var stage = u.$('#stage');
    if (!stage) return;
    var box = u.$('#stageZap');
    if (!box) {
      box = document.createElement('div');
      box.className = 'stage__zap';
      box.id = 'stageZap';
      box.setAttribute('aria-live', 'polite');
      stage.appendChild(box);
    }
    box.innerHTML = '<span class="stage__zap-dir">' + (dir > 0 ? '›' : '‹') + '</span>' +
      '<b>' + u.esc(c.name || '') + '</b>' +
      (c.group ? '<span>' + u.esc(c.group) + '</span>' : '');
    box.classList.remove('is-on');
    void box.offsetWidth;
    box.classList.add('is-on');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { box.classList.remove('is-on'); }, 1600);
  }

  function initSwipe() {
    var stage = u.$('#stage');
    if (!stage) return;
    var x0 = 0, y0 = 0, t0 = 0, active = false;
    var isFull = function () { return stage.classList.contains('is-full') || stage.classList.contains('is-fs'); };

    stage.addEventListener('touchstart', function (e) {
      active = false;
      if (e.touches.length !== 1) return;
      if (e.target.closest('button, input, .stage__err, .stage__idle')) return;
      var st = G.player.status;
      if (st !== 'playing' && st !== 'loading' && st !== 'error') return;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); active = true;
    }, { passive: true });

    stage.addEventListener('touchend', function (e) {
      if (!active) return;
      active = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - x0, dy = t.clientY - y0;
      if (Date.now() - t0 > 700) return;
      var ax = Math.abs(dx), ay = Math.abs(dy);
      if (ax > 50 && ax > ay * 1.5) {
        // nach links wischen = weiter, nach rechts = zurück
        zap(dx < 0 ? 1 : -1);
      } else if (isFull() && ay > 60 && ay > ax * 1.5) {
        // im Vollbild: nach oben = weiter, nach unten = zurück
        zap(dy < 0 ? 1 : -1);
      }
    }, { passive: true });

    // Im Vollbild soll Wischen nicht die Seite bewegen
    stage.addEventListener('touchmove', function (e) {
      if (active && isFull() && e.cancelable) e.preventDefault();
    }, { passive: false });
  }

  /* ------------------------------------------------------------
     2. Einschlaf-Timer
     ------------------------------------------------------------ */
  var sleepUntil = 0, sleepTimer = null, fadeTimer = null;
  var CHOICES = [15, 30, 45, 60, 90];

  function sleepLeft() { return sleepUntil ? Math.max(0, sleepUntil - Date.now()) : 0; }

  function setSleep(min) {
    clearTimeout(sleepTimer);
    if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; if (G.player.applyVolume) G.player.applyVolume(); }
    sleepUntil = min ? Date.now() + min * 60000 : 0;
    if (min) sleepTimer = setTimeout(fallAsleep, min * 60000);
    paintSleep();
  }

  /** In 10 Sekunden leiser werden, dann anhalten. */
  function fallAsleep() {
    var video = u.$('#video');
    var steps = 20, n = 0;
    var start = video ? video.volume : 0;
    clearInterval(fadeTimer);
    fadeTimer = setInterval(function () {
      n++;
      if (video) { try { video.volume = Math.max(0, start * (1 - n / steps)); } catch (e) { /* iOS: fest */ } }
      if (n >= steps) {
        clearInterval(fadeTimer); fadeTimer = null;
        sleepUntil = 0;
        G.player.stop();
        if (G.player.applyVolume) G.player.applyVolume();
        paintSleep();
        u.toast(tr('Gute Nacht'), tr('Der Einschlaf-Timer hat die Wiedergabe beendet.'), 'ok', 6000);
      }
    }, 500);
  }

  function sleepLabel() {
    var m = Math.ceil(sleepLeft() / 60000);
    return m ? m + ' ' + tr('Min.') : '';
  }

  /** Knopf in der Infozeile (view-start ruft das beim Zeichnen ab) */
  function sleepButton() {
    var on = !!sleepUntil;
    var t = on ? tr('Einschlaf-Timer') + ': ' + sleepLabel() : tr('Einschlaf-Timer');
    return '<button class="start-now__icon start-now__icon--sm start-now__sleep' + (on ? ' is-on' : '') + '" id="stSleep" ' +
      'aria-label="' + u.esc(t) + '" title="' + u.esc(t) + '">' + u.icon('moon', 18) +
      (on ? '<i>' + Math.ceil(sleepLeft() / 60000) + '</i>' : '') + '</button>';
  }

  function paintSleep() {
    var b = u.$('#stSleep');
    if (b) b.outerHTML = sleepButton();
    document.dispatchEvent(new CustomEvent('g04tv:sleep'));
  }

  function sleepSheet() {
    var cur = sleepUntil ? Math.ceil(sleepLeft() / 60000) : 0;
    u.openSheet(tr('Einschlaf-Timer'),
      '<p class="sleep-sheet__intro">' + (cur
        ? tr('Die Wiedergabe endet in') + ' <b>' + cur + ' ' + tr('Min.') + '</b>'
        : 'Nach der gewählten Zeit wird der Ton leiser und die Wiedergabe endet.') + '</p>' +
      '<div class="sleep-sheet__grid">' +
        CHOICES.map(function (m) {
          return '<button class="btn sleep-sheet__opt" data-min="' + m + '"><b>' + m + '</b><span>Min.</span></button>';
        }).join('') +
      '</div>' +
      (cur ? '<button class="btn btn--danger sleep-sheet__off" data-min="0">' + u.icon('close', 16) + ' Timer ausschalten</button>' : ''),
      function (body) {
        body.addEventListener('click', function (e) {
          var b = e.target.closest('[data-min]');
          if (!b) return;
          var m = +b.getAttribute('data-min');
          setSleep(m);
          u.closeSheet();
          u.toast(m ? tr('Einschlaf-Timer') : tr('Timer aus'),
            m ? tr('Die Wiedergabe endet in') + ' ' + m + ' ' + tr('Min.') : '', 'ok', 2600);
        });
      });
  }

  // Anzeige jede halbe Minute nachführen
  setInterval(function () { if (sleepUntil) paintSleep(); }, 30000);
  document.addEventListener('click', function (e) {
    if (e.target.closest('#stSleep')) sleepSheet();
  });

  /* ------------------------------------------------------------
     3. Bildschirm anlassen
     ------------------------------------------------------------ */
  var wake = null;
  function wantAwake() {
    var s = G.store.state.settings;
    var st = G.player.status;
    return s.keepAwake !== false && (st === 'playing' || st === 'loading') && document.visibilityState === 'visible';
  }
  async function syncWake() {
    if (!('wakeLock' in navigator)) return;
    if (wantAwake()) {
      if (wake) return;
      try {
        wake = await navigator.wakeLock.request('screen');
        wake.addEventListener('release', function () { wake = null; });
      } catch (e) { wake = null; }
    } else if (wake) {
      try { await wake.release(); } catch (e) { /* schon frei */ }
      wake = null;
    }
  }
  document.addEventListener('visibilitychange', syncWake);

  /* ------------------------------------------------------------
     5. Zurück zum vorherigen Sender (wie die Taste auf der Fernbedienung)
     ------------------------------------------------------------ */
  var curCh = null, prevCh = null;
  function previous() {
    var cur = G.player.channel || G.store.state.last;
    if (prevCh && !same(prevCh, cur)) return prevCh;
    // Nach dem Start der App: aus dem Verlauf
    return G.store.state.recent.filter(function (c) { return !same(c, cur); })[0] || null;
  }
  function goBack() {
    var p = previous();
    if (!p) return;
    flash(p, -1);
    G.store.pushRecent(p);
    G.player.play(p);
  }

  /* ------------------------------------------------------------
     4. Bild-in-Bild
     iPhone/iPad (Safari): webkitSetPresentationMode, sonst die
     Standard-Schnittstelle (Chrome, Edge, Safari am Mac).
     ------------------------------------------------------------ */
  function vid() { return u.$('#video'); }
  function pipSupported() {
    var v = vid();
    if (!v) return false;
    if (typeof v.webkitSupportsPresentationMode === 'function' && v.webkitSupportsPresentationMode('picture-in-picture')) return true;
    return !!(document.pictureInPictureEnabled && !v.disablePictureInPicture);
  }
  function isPip() {
    var v = vid();
    return !!v && (document.pictureInPictureElement === v || v.webkitPresentationMode === 'picture-in-picture');
  }
  async function togglePip() {
    var v = vid();
    if (!v) return;
    if (isPip()) {
      try {
        if (document.pictureInPictureElement && document.exitPictureInPicture) await document.exitPictureInPicture();
        else if (v.webkitSetPresentationMode) v.webkitSetPresentationMode('inline');
      } catch (e) { /* schon zu */ }
      return;
    }
    var st = G.player.status;
    if (st !== 'playing' && st !== 'loading') {
      u.toast(tr('Erst einen Sender starten'), tr('Bild-in-Bild braucht ein laufendes Bild.'), 'warn', 3000);
      return;
    }
    try {
      if (typeof v.webkitSupportsPresentationMode === 'function' && v.webkitSupportsPresentationMode('picture-in-picture')) {
        v.webkitSetPresentationMode('picture-in-picture');
      } else {
        await v.requestPictureInPicture();
      }
    } catch (e) {
      u.toast(tr('Bild-in-Bild geht hier nicht'), tr('Dieser Sender oder Browser lässt es nicht zu.'), 'warn', 4000);
    }
  }
  function pipButton() {
    if (!pipSupported()) return '';
    var on = isPip();
    return '<button class="start-now__icon start-now__icon--sm' + (on ? ' is-acc' : '') + '" id="stPip" ' +
      'aria-label="Bild-in-Bild" title="Bild-in-Bild">' + u.icon('pip', 18) + '</button>';
  }
  function paintPip() {
    var on = isPip();
    var stage = u.$('#stage');
    if (stage) { stage.classList.toggle('is-pip', on); stage.setAttribute('data-pip', tr('Läuft im Bild-in-Bild')); }
    var a = u.$('#stPip'); if (a) a.classList.toggle('is-acc', on);
    var b = u.$('#stagePip');
    if (b) {
      b.hidden = !pipSupported();
      b.classList.toggle('is-on', on);
      if (!b.innerHTML) b.innerHTML = u.icon('pip', 18);
    }
  }
  function initPip() {
    var v = vid();
    if (!v) return;
    // Beim Wechsel in eine andere App von selbst ins kleine Fenster (wo der Browser es kann)
    v.setAttribute('autopictureinpicture', '');
    try { v.autoPictureInPicture = true; } catch (e) { /* nicht überall */ }
    ['enterpictureinpicture', 'leavepictureinpicture', 'webkitpresentationmodechanged'].forEach(function (ev) {
      v.addEventListener(ev, paintPip);
    });
    document.addEventListener('click', function (e) {
      if (e.target.closest('#stPip, #stagePip')) { e.stopPropagation(); togglePip(); }
    }, true);
    paintPip();
  }

  /* ------------------------------------------------------------
     Einhängen
     ------------------------------------------------------------ */
  // Senderwechsel im kleinen Fenster: manche Browser (iPhone) schließen es beim
  // Wechsel der Quelle - dann nach dem Start des neuen Senders wieder öffnen.
  var pipWanted = false;
  G.player.on(function (status) {
    var v = vid();
    if (!v) return;
    if (status === 'loading' && isPip()) pipWanted = true;
    if (status === 'playing' && pipWanted) {
      pipWanted = false;
      if (!isPip()) {
        try {
          if (typeof v.webkitSupportsPresentationMode === 'function' && v.webkitSupportsPresentationMode('picture-in-picture')) v.webkitSetPresentationMode('picture-in-picture');
          else if (v.requestPictureInPicture) v.requestPictureInPicture().catch(function () { });
        } catch (e) { /* ohne Berührung nicht erlaubt */ }
      }
    }
    if (status === 'idle' || status === 'error') pipWanted = false;
  });
  G.player.on(function (status, message, channel) {
    if (channel && (status === 'loading' || status === 'playing') && !same(channel, curCh)) {
      if (curCh) prevCh = curCh;
      curCh = channel;
      document.dispatchEvent(new CustomEvent('g04tv:prev'));
    }
    syncWake();
    // Von Hand angehalten: Timer ist erledigt
    if (status === 'idle' && sleepUntil) setSleep(0);
  });
  G.store.subscribe(function () { syncWake(); });

  function init() { initSwipe(); initPip(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  G.extras = {
    zap: zap,
    previous: previous, back: goBack,
    pip: togglePip, pipButton: pipButton, isPip: isPip, pipSupported: pipSupported,
    setSleep: setSleep, sleepLeft: sleepLeft, sleepButton: sleepButton, sleepSheet: sleepSheet,
    awake: function () { return !!wake; }
  };
})(G04TV);
