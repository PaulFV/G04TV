/* ============================================================
   G04TV — Auto (CarPlay), Sperrbildschirm und AirPlay

   Eine Web-App kann kein eigenes CarPlay-Fenster mitbringen. Was
   geht: der Browser meldet den laufenden Sender ueber die Media
   Session an das System. Dann steht er in CarPlay unter „Jetzt
   läuft“, auf dem Sperrbildschirm und im Kontrollzentrum - mit Name,
   Gruppe und Logo. Lenkrad- und CarPlay-Tasten steuern Pause und
   Weiter/Zurueck (durch die Favoriten bzw. den Verlauf).

   Dazu ein AirPlay-Knopf im Bild: damit geht das Bild an einen
   Fernseher - und mit iOS 26 im Stand auch an ein Auto, das
   AirPlay-Video kann.
   ============================================================ */
(function (G) {
  'use strict';
  var u = G.u;
  var ms = 'mediaSession' in navigator ? navigator.mediaSession : null;
  var video = null;

  function tr(text) { return G.i18n ? G.i18n.t(text) : text; }

  /* ------------------------------------------------------------
     Senderliste fuer Weiter/Zurueck
     Laeuft ein Favorit, wird durch die Favoriten geschaltet,
     sonst durch "Zuletzt gesehen".
     ------------------------------------------------------------ */
  function stepList(current) {
    var s = G.store.state;
    var inFav = current && s.favorites.some(function (c) { return G.m3u.sameSource(c.url, current.url); });
    if (inFav || !s.recent.length) return s.favorites;
    return s.recent;
  }

  function step(dir) {
    var current = G.player.channel || G.store.state.last;
    var list = stepList(current);
    if (!list.length) return;
    var i = current ? list.findIndex(function (c) { return G.m3u.sameSource(c.url, current.url); }) : -1;
    var next = list[(i + dir + list.length) % list.length];
    if (!next) return;
    // Verlauf nicht umsortieren, solange durch ihn geschaltet wird -
    // sonst springt die Reihenfolge bei jedem Druck auf "Weiter".
    if (list === G.store.state.favorites) G.store.pushRecent(next);
    G.player.play(next);
  }

  /* ------------------------------------------------------------
     Media Session
     ------------------------------------------------------------ */
  function artwork(c) {
    var list = [];
    if (c && c.logo && /^https?:/i.test(c.logo)) {
      list.push({ src: c.logo, sizes: '512x512' });
    }
    // Das App-Zeichen als Rueckfall (und fuer Logos, die nicht laden)
    list.push({ src: new URL('icons/icon-512.png', location.href).href, sizes: '512x512', type: 'image/png' });
    list.push({ src: new URL('icons/icon-192.png', location.href).href, sizes: '192x192', type: 'image/png' });
    return list;
  }

  function paint(status, message, channel) {
    if (!ms) return;
    var c = channel || null;
    try {
      if (c && status !== 'idle') {
        ms.metadata = new window.MediaMetadata({
          title: c.name || 'G04TV',
          artist: c.group || tr('Live-TV'),
          album: 'G04TV',
          artwork: artwork(c)
        });
      } else if (!c) {
        ms.metadata = null;
      }
      ms.playbackState = status === 'playing' ? 'playing'
        : (status === 'loading' ? 'playing' : (c ? 'paused' : 'none'));
    } catch (e) { /* aeltere Browser */ }
  }

  function setHandler(action, fn) {
    try { ms.setActionHandler(action, fn); } catch (e) { /* nicht unterstuetzt */ }
  }

  function initMediaSession() {
    if (!ms) return;
    setHandler('play', function () {
      // Nur angehalten: dort weiter. Sonst den letzten Sender neu starten.
      if (video && G.player.channel && video.currentSrc && G.player.status !== 'error') {
        var p = video.play(); if (p && p.catch) p.catch(function () { });
        return;
      }
      var c = G.player.channel || G.store.state.last;
      if (c) G.player.play(c);
    });
    setHandler('pause', function () { if (video) video.pause(); paint('paused', '', G.player.channel); });
    setHandler('stop', function () { G.player.stop(); });
    setHandler('nexttrack', function () { step(1); });
    setHandler('previoustrack', function () { step(-1); });
    // Live-TV hat kein Vor- und Zurueckspulen: ohne diese Handler zeigen
    // CarPlay und Sperrbildschirm "Weiter/Zurueck" statt "±10 Sekunden".
    setHandler('seekbackward', null);
    setHandler('seekforward', null);
    setHandler('seekto', null);

    G.player.on(paint);
    if (video) {
      video.addEventListener('pause', function () { if (ms) ms.playbackState = G.player.channel ? 'paused' : 'none'; });
      video.addEventListener('play', function () { if (ms) ms.playbackState = 'playing'; });
    }
    paint(G.player.status, G.player.message, G.player.channel);
  }

  /* ------------------------------------------------------------
     AirPlay
     ------------------------------------------------------------ */
  var AIRPLAY = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
    '<path d="M6.5 17H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v9a2 2 0 01-2 2h-1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M12 14.5l5 6H7l5-6z" fill="currentColor"/></svg>';

  function initAirPlay() {
    var btn = u.$('#stageAirplay');
    if (!btn || !video) return;
    btn.innerHTML = AIRPLAY;

    // Nur Safari (iPhone, iPad, Mac) kennt AirPlay im Browser.
    if (!window.WebKitPlaybackTargetAvailabilityEvent) { btn.hidden = true; return; }

    video.setAttribute('x-webkit-airplay', 'allow');
    video.addEventListener('webkitplaybacktargetavailabilitychanged', function (e) {
      btn.hidden = e.availability !== 'available';
    });
    video.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', function () {
      btn.classList.toggle('is-on', !!video.webkitCurrentPlaybackTargetIsWireless);
    });

    btn.addEventListener('click', function () {
      // MPEG-TS laeuft auf dem iPhone ueber ManagedMediaSource - das gibt
      // es nur ohne AirPlay. Dann kurz erklaeren statt still zu scheitern.
      if (video.disableRemotePlayback) {
        u.toast(tr('AirPlay hier nicht möglich'),
          tr('Dieser Sender läuft als MPEG-TS. AirPlay geht mit HLS-Sendern (.m3u8).'), 'warn', 5000);
        return;
      }
      try { video.webkitShowPlaybackTargetPicker(); } catch (e) { /* abgelehnt */ }
    });
  }

  function init() {
    video = u.$('#video');
    initMediaSession();
    initAirPlay();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  G.carplay = { step: step };
})(G04TV);
