/* ============================================================
   G04TV — Die wandernde Buehne

   Das Bild lebt nicht in der Ansicht, sondern in einem eigenen
   Behaelter (#pdock). Im Bereich Sender zieht er in die Ansicht
   ein; wechselt man in die Favoriten oder in die Playlisten,
   ruecken Bild und Ton als kleines Fenster nach unten rechts und
   laufen weiter.
   ============================================================ */
(function (G) {
  'use strict';
  var u = G.u;

  var dock, stage, video, idle, busy, err, errText, dockTitle;
  var slotNow = null;

  /** Feste Texte in Bereichen, die sonst Sendernamen tragen (dort uebersetzt i18n.js nicht). */
  function tr(text) { return G.i18n ? G.i18n.t(text) : text; }

  function init() {
    dock = u.$('#pdock');
    stage = u.$('#stage');
    video = u.$('#video');
    idle = u.$('#stageIdle');
    busy = u.$('#stageBusy');
    err = u.$('#stageErr');
    errText = u.$('#stageErrText');
    dockTitle = u.$('#pdockTitle');

    G.player.attach(video, stage);
    G.player.on(paint);

    /* --- Knoepfe im Bild --- */
    u.$('#stageFull').addEventListener('click', function () { G.player.fullscreen(); });
    u.$('#stageMute').addEventListener('click', function () { G.player.toggleMuted(); paintMute(); });

    // Lautstärke im Vollbild. Auf iPhone/iPad regeln nur die Tasten am Gerät -
    // dort bleiben die Regler weg (sie hätten keine Wirkung).
    if (!G.player.volumeSettable()) document.documentElement.classList.add('vol-fixed');
    var vol = u.$('#stageVol');
    if (vol) {
      vol.value = G.store.state.settings.volume;
      vol.addEventListener('input', function () {
        G.player.setVolume(u.num(vol.value, 80));
        paintMute();
        document.dispatchEvent(new CustomEvent('g04tv:volume'));
      });
    }
    u.$('#stageRetry').addEventListener('click', function () {
      var c = G.player.channel;
      if (c) G.player.play(c);
    });
    u.$('#stageExternal').addEventListener('click', function () { external(); });
    idle.addEventListener('click', function () {
      var c = G.player.channel || G.store.state.last;
      if (c && G.player.status === 'idle') G.player.play(c);
    });

    u.$('#pdockOpen').addEventListener('click', function () { G.app.go('live'); });
    u.$('#pdockClose').addEventListener('click', function () { G.player.stop(); });

    // Antippen und Doppeltippen ins Bild.
    // Einmal Antippen: Pause bzw. weiter - in der Mitte erscheint kurz das
    // Zeichen (❚❚ beim Anhalten, ▶ beim Weiterspielen); angehalten bleibt ▶
    // stehen. Doppeltippen schaltet das Vollbild (wie in Connect+). Der
    // einzelne Tipp wartet 0,33 s, ob ein zweiter folgt - sonst würde das
    // Doppeltippen erst anhalten und dann wieder starten.
    var ctl = u.$('#stageCtl');
    ctlIcon('pause');
    var lastTap = 0, lastX = 0, lastY = 0, tapTimer = null, dblAt = 0;
    var running = function () { var st = G.player.status; return st === 'playing' || st === 'loading'; };
    var toggleFull = function () {
      dblAt = Date.now();
      clearTimeout(tapTimer);
      G.player.fullscreen();
    };
    stage.addEventListener('click', function (e) {
      if (e.target.closest('.stage__bar, .stage__err, .stage__idle, #stageCtl')) return;
      var now = Date.now();
      var near = Math.abs(e.clientX - lastX) < 40 && Math.abs(e.clientY - lastY) < 40;
      if (now - lastTap < 320 && near) {           // zweiter Tipp: Doppeltippen
        lastTap = 0;
        clearTimeout(tapTimer);
        if (now - dblAt > 500) toggleFull();
        return;
      }
      lastTap = now; lastX = e.clientX; lastY = e.clientY;
      clearTimeout(tapTimer);
      if (!running()) return;
      tapTimer = setTimeout(function () { if (running()) togglePause(); }, 330);
    });
    // Maus: der Browser meldet den Doppelklick selbst - nur einmal schalten
    stage.addEventListener('dblclick', function (e) {
      if (e.target.closest('.stage__bar, .stage__err, #stageCtl')) return;
      clearTimeout(tapTimer);
      if (Date.now() - dblAt > 500) toggleFull();
    });
    // Das Zeichen in der Mitte ist selbst ein Knopf: ▶ spielt weiter, ❚❚ hält an
    if (ctl) ctl.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!running()) return;
      togglePause();
    });
    // Angehalten oder weiter - egal ob durch Tippen, Sperrbildschirm oder CarPlay
    video.addEventListener('pause', function () {
      if (!running() || video.ended || !video.currentSrc) return;
      paintPaused(true);
    });
    video.addEventListener('playing', function () { paintPaused(false); });
    G.player.on(function (status) { if (status !== 'playing') { userPaused = false; paintPaused(false, true); } });

    // Vollbild: Knöpfe 5 s zeigen (beim Eintritt und bei jeder Berührung), dann ausblenden
    var barTimer = null;
    var wasFull = false;
    var fullNow = function () { return stage.classList.contains('is-full') || stage.classList.contains('is-fs'); };
    var showBar = function () {
      stage.classList.add('is-hint');
      clearTimeout(barTimer);
      barTimer = setTimeout(function () { stage.classList.remove('is-hint'); }, 5000);
    };
    new MutationObserver(function () {
      // Nur beim Wechsel reagieren: is-hint ändert selbst die Klassen und löste sonst
      // diesen Beobachter endlos neu aus.
      var full = fullNow();
      if (full === wasFull) return;
      wasFull = full;
      if (full) showBar();
      else { clearTimeout(barTimer); stage.classList.remove('is-hint'); }
    }).observe(stage, { attributes: true, attributeFilter: ['class'] });
    ['pointerdown', 'pointermove'].forEach(function (ev) {
      stage.addEventListener(ev, function () { if (fullNow()) showBar(); }, { passive: true });
    });

    document.addEventListener('fullscreenchange', paintFull);
    document.addEventListener('webkitfullscreenchange', paintFull);

    // Nach dem Wechsel ins oder aus dem Vollbild: läuft das Bild weiter?
    // iPhone/iPad halten das Video beim Wechsel manchmal an oder das Bild
    // friert ein, obwohl der Ton weiterläuft. Dann sanft wieder anstoßen
    // (abspielen, bei Live-Strömen an das Ende des Puffers springen).
    var nudge = function () {
      if (!video || userPaused) return;
      var st = G.player.status;
      if (st !== 'playing' && st !== 'loading') return;
      setTimeout(function () {
        if (userPaused) return;                                         // bewusst angehalten
        if (video.paused) { var pp = video.play(); if (pp && pp.catch) pp.catch(function () { }); }
        var t0 = video.currentTime;
        setTimeout(function () {
          if (G.player.status !== 'playing' || video.paused) return;
          if (Math.abs(video.currentTime - t0) > 0.2) return;          // läuft
          try {
            var b = video.buffered;
            if (b && b.length) {
              var end = b.end(b.length - 1);
              if (end - video.currentTime > 0.5) video.currentTime = Math.max(0, end - 0.3);
            }
          } catch (e) { /* Puffer nicht lesbar */ }
          var p2 = video.play(); if (p2 && p2.catch) p2.catch(function () { });
        }, 2000);
      }, 350);
    };
    document.addEventListener('fullscreenchange', nudge);
    document.addEventListener('webkitfullscreenchange', nudge);
    if (video) {
      video.addEventListener('webkitbeginfullscreen', nudge);
      video.addEventListener('webkitendfullscreen', nudge);
      video.addEventListener('webkitpresentationmodechanged', nudge);
    }
    // Weiches Vollbild (Handy drehen, Notlösung): Klasse is-full
    var fullWas = false;
    new MutationObserver(function () {
      var f = stage.classList.contains('is-full');
      if (f !== fullWas) { fullWas = f; nudge(); }
    }).observe(stage, { attributes: true, attributeFilter: ['class'] });

    // Handy gedreht (quer, niedrig): läuft ein Sender, geht das Bild gleich in den
    // Vollbildmodus; zurück ins Hochformat beendet ihn wieder - aber nur, wenn
    // die Drehung ihn ausgelöst hat. Tablets bleiben, wie sie sind.
    if (window.matchMedia) {
      var turned = matchMedia('(orientation: landscape) and (max-height: 500px)');
      var autoFull = false;
      var onTurn = function () {
        var st = G.player.status;
        if (turned.matches) {
          if ((st === 'playing' || st === 'loading') && !G.player.isFull()) {
            autoFull = true;
            G.player.softFullscreen(true);
          }
        } else if (autoFull) {
          autoFull = false;
          G.player.softFullscreen(false);
        }
      };
      if (turned.addEventListener) turned.addEventListener('change', onTurn);
      else if (turned.addListener) turned.addListener(onTurn);
    }

    paint(G.player.status, G.player.message, G.player.channel);
    paintMute();
    paintFull();

    document.addEventListener('g04tv:language', function () {
      paint(G.player.status, G.player.message, G.player.channel);
    });
  }

  var ctlTimer = null;
  /* ---------- Pause / weiter ---------- */
  var userPaused = false, pausedAt = 0, flashTimer = null;
  var PLAY = '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M8 5.5l11 6.5-11 6.5v-13z"/></svg>';
  var PAUSE = '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5.5" width="4" height="13" rx="1.3"/><rect x="13.5" y="5.5" width="4" height="13" rx="1.3"/></svg>';

  function ctlIcon(kind) {
    var c = u.$('#stageCtl');
    if (!c) return;
    c.innerHTML = kind === 'play' ? PLAY : PAUSE;
    var t = kind === 'play' ? 'Abspielen' : 'Pause';
    c.title = t; c.setAttribute('aria-label', t);
  }

  function togglePause() {
    if (!video) return;
    if (video.paused) resume(); else pause();
  }
  function pause() {
    userPaused = true;
    pausedAt = Date.now();
    try { video.pause(); } catch (e) { }
    paintPaused(true);
  }
  function resume() {
    userPaused = false;
    var c = G.player.channel;
    // Lange angehalten: bei Live-Sendern ist der Puffer dann veraltet -
    // neu verbinden, damit es an der aktuellen Stelle weitergeht.
    if (c && pausedAt && Date.now() - pausedAt > 60000) {
      pausedAt = 0;
      flash('play');
      G.player.play(c);
      return;
    }
    pausedAt = 0;
    var p = video.play();
    if (p && p.catch) p.catch(function () { });
    flash('play');
  }
  /**
   * Wie in G04Music: angehalten steht ❚❚ groß in der Mitte; beim Weiterspielen
   * blitzt ▶ kurz auf (wächst und blendet aus).
   */
  function flash(kind) {
    if (kind !== 'play') return;
    clearTimeout(flashTimer);
    ctlIcon('play');
    stage.classList.remove('flash-play');
    void stage.offsetWidth;
    stage.classList.add('flash-play');
    flashTimer = setTimeout(function () {
      flashTimer = null;
      stage.classList.remove('flash-play');
      ctlIcon('pause');
    }, 650);
  }
  function paintPaused(on, quiet) {
    if (!stage) return;
    var was = stage.classList.contains('is-paused');
    if (on) { clearTimeout(flashTimer); flashTimer = null; stage.classList.remove('flash-play'); ctlIcon('pause'); }
    stage.classList.toggle('is-paused', !!on);
    if (was !== !!on) document.dispatchEvent(new CustomEvent('g04tv:paused', { detail: { paused: !!on } }));
  }

  var ctlShownAt = 0;
  function showCtl() {
    if (!stage.classList.contains('is-ctl')) ctlShownAt = Date.now();
    stage.classList.add('is-ctl');
    clearTimeout(ctlTimer);
    ctlTimer = setTimeout(hideCtl, 3000);
  }
  function hideCtl() {
    clearTimeout(ctlTimer);
    if (stage) stage.classList.remove('is-ctl');
  }

  /* ------------------------------------------------------------
     Wohin der Behaelter gehoert
     ------------------------------------------------------------ */

  /**
   * Haengt die Buehne in einen Platz der Ansicht (inline) oder - ohne
   * Platz - unten rechts als kleines Fenster.
   *
   * Ein laufendes Videofeld darf beim Umhaengen nicht stehenbleiben:
   * manche Browser halten es dabei an, deshalb wird danach noch einmal
   * angestossen.
   */
  function place(slot) {
    if (!dock) return;
    if (slot === slotNow && (slot ? slot.contains(dock) : dock.parentNode === document.body)) {
      refresh();
      return;
    }

    var wasPlaying = video && !video.paused && !video.ended;

    if (slot) {
      slot.appendChild(dock);
      dock.classList.add('is-inline');
    } else {
      document.body.appendChild(dock);
      dock.classList.remove('is-inline');
    }
    slotNow = slot || null;

    if (wasPlaying && video.paused) {
      var p = video.play();
      if (p && p.catch) p.catch(function () { /* der Browser will eine Beruehrung */ });
    }

    refresh();
  }

  /** Ruhebild und Marken neu zeichnen (z. B. nach dem Einhaengen). */
  function refresh() {
    paintIdle(G.player.channel);
    paintVisibility();
  }

  /** Sichtbar ist der Behaelter im Bereich Sender immer, sonst nur bei Betrieb. */
  function paintVisibility() {
    if (!dock) return;
    dock.hidden = !slotNow && G.player.status === 'idle';
  }

  /* ------------------------------------------------------------
     Anzeige
     ------------------------------------------------------------ */
  function paint(status, message, channel) {
    if (!dock) return;

    var running = status === 'loading' || status === 'playing';

    idle.hidden = running || status === 'error';
    busy.classList.toggle('is-on', status === 'loading');
    err.classList.toggle('is-on', status === 'error');
    video.classList.toggle('is-off', !running);
    stage.classList.toggle('is-running', running);
    if (!running) hideCtl();

    if (status === 'error') errText.textContent = message || '';

    paintIdle(channel);

    dockTitle.textContent = channel ? channel.name : tr('Nichts läuft');

    paintChip(status, channel);
    paintVisibility();

    // Die Ansichten haengen sich hier ebenfalls ein (Bedienleiste, Liste).
    document.dispatchEvent(new CustomEvent('g04tv:player', {
      detail: { status: status, message: message, channel: channel }
    }));
  }

  /** Ruhebild: ist schon ein Sender bekannt, genuegt ein Antippen. */
  function paintIdle(channel) {
    var last = channel || G.store.state.last;
    var ib = idle.querySelector('b'), ip = idle.querySelector('p');
    if (ib) ib.textContent = last ? last.name : tr('Kein Sender');
    if (ip) ip.textContent = last ? 'Antippen zum Abspielen'
      : 'Wähle einen Sender aus der Liste — oder trage zuerst eine Playlist ein.';
    idle.classList.toggle('is-tap', !!last);
  }

  /** Die Marke in der Kopfzeile und der Fuss der Seitenleiste. */
  function paintChip(status, channel) {
    var chip = u.$('#liveChip');
    var side = u.$('#sideNow');
    var running = status === 'loading' || status === 'playing';
    var name = channel ? channel.name : tr('Nichts läuft');

    if (chip) {
      chip.classList.toggle('is-live', status === 'playing');
      chip.innerHTML = '<i class="live-chip__dot"></i><span>' + u.esc(name) + '</span>';
      chip.title = running ? 'Läuft: ' + name : 'Kein Sender';
    }

    if (side) {
      side.classList.toggle('is-live', running);
      side.innerHTML =
        '<span class="now-chip__ic">' + u.icon(running ? 'play' : 'live', 17) + '</span>' +
        '<span class="now-chip__meta"><b>' + u.esc(name) + '</b>' +
        '<span>' + u.esc(channel && channel.group ? channel.group : tr(running ? 'läuft' : 'bereit')) + '</span></span>';
    }
  }

  function paintMute() {
    // Regler im Vollbild und unter dem Bild auf denselben Stand bringen
    [u.$('#stageVol'), u.$('#stVol')].forEach(function (r) {
      if (r && document.activeElement !== r) r.value = G.store.state.settings.volume;
    });
    var b = u.$('#stageMute');
    if (!b) return;
    var muted = G.store.state.settings.muted || G.store.state.settings.volume <= 0;
    b.innerHTML = u.icon(muted ? 'muted' : 'volume', 18);
    b.title = muted ? 'Ton an' : 'Ton aus';
    b.setAttribute('aria-label', b.title);
  }

  function paintFull() {
    var b = u.$('#stageFull');
    if (!b) return;
    var full = G.player.isFull();
    // Im Vollbild zeigt das Bild seine Knoepfe wieder (siehe start.css)
    stage.classList.toggle('is-fs', full);
    b.innerHTML = u.icon(full ? 'fullExit' : 'full', 18);
    b.title = full ? 'Vollbild verlassen' : 'Vollbild';
    b.setAttribute('aria-label', b.title);
    var fe = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fe || !stage.contains(fe)) stage.classList.remove('is-full');
  }

  /* ------------------------------------------------------------
     An einen richtigen Abspieler weitergeben

     Was der Browser nicht kann, kann VLC. Auf dem Handy oeffnet der
     Verweis die App, die sich fuer Streams zustaendig meldet; am
     Rechner uebernimmt die Zuordnung des Betriebssystems.
     ------------------------------------------------------------ */
  async function external(channel) {
    var c = channel || G.player.channel || G.store.state.last;
    if (!c || !c.url) { u.toast('Kein Sender', 'Erst einen Sender wählen.', 'warn'); return; }

    if (G.store.state.settings.confirmExternal) {
      var ok = await u.confirmSheet({
        title: 'Extern öffnen',
        danger: false,
        ok: 'Öffnen',
        body: '<b>' + u.esc(c.name) + '</b> wird an einen anderen Abspieler übergeben ' +
              '(am Rechner z. B. VLC, auf dem Handy die App, die sich für Streams meldet).<br><br>' +
              '<span class="tiny dim break">' + u.esc(u.shorten(c.url, 90)) + '</span>'
      });
      if (!ok) return;
    }

    try { window.open(c.url, '_blank', 'noopener'); }
    catch (e) { u.toast('Ging nicht', 'Der Browser hat das Öffnen verhindert.', 'err'); }
  }

  G.dock = {
    init: init,
    place: place,
    paintMute: paintMute,
    paintFull: paintFull,
    external: external,
    togglePause: function () { togglePause(); },
    isPaused: function () { return !!(video && video.paused && G.player.channel && (G.player.status === 'playing' || G.player.status === 'loading')); },
    get el() { return dock; }
  };
})(G04TV);
