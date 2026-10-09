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

    // Doppelklick ins Bild schaltet das Vollbild - wie in Connect+.
    stage.addEventListener('dblclick', function () { G.player.fullscreen(); });

    // Laufendes Bild antippen: Stopp-Knopf fuer ein paar Sekunden zeigen.
    // Erst ein zweites Antippen haelt an - eine versehentliche Beruehrung nicht.
    var ctl = u.$('#stageCtl');
    stage.addEventListener('click', function (e) {
      if (e.target.closest('.stage__bar, .stage__err, .stage__idle, #stageCtl')) return;
      var st = G.player.status;
      if (st !== 'playing' && st !== 'loading') return;
      showCtl();
    });
    if (ctl) ctl.addEventListener('click', function (e) {
      e.stopPropagation();
      hideCtl();
      G.player.stop();
    });

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
  function showCtl() {
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
    get el() { return dock; }
  };
})(G04TV);
