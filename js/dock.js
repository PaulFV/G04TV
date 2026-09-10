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

    u.$('#pdockOpen').addEventListener('click', function () { G.app.go('live'); });
    u.$('#pdockClose').addEventListener('click', function () { G.player.stop(); });

    // Doppelklick ins Bild schaltet das Vollbild - wie in Connect+.
    stage.addEventListener('dblclick', function () { G.player.fullscreen(); });

    document.addEventListener('fullscreenchange', paintFull);
    document.addEventListener('webkitfullscreenchange', paintFull);

    paint(G.player.status, G.player.message, G.player.channel);
    paintMute();
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
      paintVisibility();
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

    if (status === 'error') errText.textContent = message || '';

    dockTitle.textContent = channel ? channel.name : 'Nichts läuft';

    paintChip(status, channel);
    paintVisibility();

    // Die Ansichten haengen sich hier ebenfalls ein (Bedienleiste, Liste).
    document.dispatchEvent(new CustomEvent('g04tv:player', {
      detail: { status: status, message: message, channel: channel }
    }));
  }

  /** Die Marke in der Kopfzeile und der Fuss der Seitenleiste. */
  function paintChip(status, channel) {
    var chip = u.$('#liveChip');
    var side = u.$('#sideNow');
    var running = status === 'loading' || status === 'playing';
    var name = channel ? channel.name : 'Nichts läuft';

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
        '<span>' + u.esc(channel && channel.group ? channel.group : (running ? 'läuft' : 'bereit')) + '</span></span>';
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
    b.innerHTML = u.icon(full ? 'fullExit' : 'full', 18);
    b.title = full ? 'Vollbild verlassen' : 'Vollbild';
    b.setAttribute('aria-label', b.title);
    if (!document.fullscreenElement && !document.webkitFullscreenElement) stage.classList.remove('is-full');
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
