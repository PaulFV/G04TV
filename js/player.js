/* ============================================================
   GoTV — Wiedergabe

   Uebernommen aus Connect+ (Forms/IptvPlayerPage.cs). Dort lief
   dieselbe Logik in einer WebView2-Flaeche; hier ist der Browser
   die Flaeche.

   Drei Wege, je nachdem was hinter der Adresse steckt:
     HLS (*.m3u8)   hls.js - ausser auf iPhone/iPad und Safari,
                    die HLS von Haus aus koennen
     MPEG-TS (*.ts) mpegts.js
     alles Uebrige  das Videofeld selbst (mp4, webm, mp3 ...)

   Die beiden Bibliotheken werden erst geholt, wenn sie gebraucht
   werden - und zuerst aus dem Ordner vendor/ neben der App, damit
   sich GoTV auch ohne Weg nach draussen betreiben laesst.
   ============================================================ */
(function (G) {
  'use strict';

  var HLS_LOCAL = 'vendor/hls.min.js';
  var HLS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js';
  var TS_LOCAL = 'vendor/mpegts.js';
  var TS_CDN = 'https://cdn.jsdelivr.net/npm/mpegts.js@1.7.3/dist/mpegts.js';

  var video = null;
  var stage = null;

  var hls = null;
  var ts = null;

  var current = null;        // laufender Sender
  var status = 'idle';       // idle | loading | playing | error
  var message = '';
  var tries = 0;
  var nativeTried = false;
  var listeners = [];
  var loaded = {};           // welche Bibliothek schon da ist

  /* ------------------------------------------------------------
     Bibliotheken nachladen
     ------------------------------------------------------------ */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(true); };
      s.onerror = function () { s.remove(); reject(new Error('nicht ladbar: ' + src)); };
      document.head.appendChild(s);
    });
  }

  /** Erst neben der App, dann aus dem Netz. */
  async function ensure(name) {
    if (loaded[name]) return true;

    var local = name === 'hls' ? HLS_LOCAL : TS_LOCAL;
    var remote = name === 'hls' ? HLS_CDN : TS_CDN;
    var has = function () { return name === 'hls' ? !!window.Hls : !!window.mpegts; };

    if (has()) { loaded[name] = true; return true; }

    try { await loadScript(local); } catch (e) { /* dann eben aus dem Netz */ }
    if (has()) { loaded[name] = true; return true; }

    try { await loadScript(remote); } catch (e) { return false; }

    loaded[name] = has();
    return loaded[name];
  }

  /* ------------------------------------------------------------
     Was kann der Browser selbst?
     ------------------------------------------------------------ */

  /** Safari, iPhone und iPad spielen HLS ohne Bibliothek. */
  function nativeHls() {
    if (!video) return false;
    return !!video.canPlayType('application/vnd.apple.mpegurl');
  }

  function hlsUsable() { return !!(window.Hls && window.Hls.isSupported()); }

  function tsUsable() {
    return !!(window.mpegts && window.mpegts.isSupported && window.mpegts.isSupported() &&
      window.mpegts.getFeatureList().mseLivePlayback);
  }

  /* ------------------------------------------------------------
     Art des Streams
     ------------------------------------------------------------ */

  /**
   * Womit der Stream abzuspielen ist. Die Endung entscheidet, und wo sie
   * fehlt, der Parameter "output" - so schreiben es die Xtream-Anbieter
   * (…&type=m3u_plus&output=ts).
   */
  function kindOf(url) {
    var u = String(url || '').split('#')[0];

    if (/\.m3u8(\?|$)/i.test(u) || /[?&]output=hls\b/i.test(u)) return 'hls';
    if (/\.(ts|mpegts|mts|m2ts)(\?|$)/i.test(u) || /[?&]output=(ts|mpegts)\b/i.test(u)) return 'ts';
    if (/\.(mp4|m4v|webm|ogv|ogg|mp3|aac|m4a|mov)(\?|$)/i.test(u)) return 'nativ';
    if (/\.flv(\?|$)/i.test(u)) return 'flv';

    // Container, die keine Browser-Engine oeffnet - die Filme der
    // VOD-Listen liegen oft so vor. Statt zweier Fehlversuche gleich der
    // Hinweis auf einen richtigen Abspieler.
    if (/\.(mkv|avi|wmv|mpg|mpeg|m2v|vob|3gp|rmvb)(\?|$)/i.test(u)) return 'extern';

    // Die Xtream-Form host:port/benutzer/kennwort/12345 traegt keine
    // Endung, ist aber immer MPEG-TS. Erkennbar an den Pfadteilen, von
    // denen der letzte nur aus Ziffern besteht.
    var path = u.replace(/^https?:\/\/[^/]+/i, '').split('?')[0];
    if (/^(\/[^/]+){2,4}\/\d+\/?$/.test(path)) return 'ts';

    return 'unbekannt';
  }

  /**
   * Die App laeuft ueber https, der Stream kommt ueber http: der Browser
   * laesst das nicht zu ("gemischter Inhalt") und meldet es nicht einmal
   * deutlich. Deshalb hier der Hinweis, bevor es still fehlschlaegt.
   */
  function mixedContent(url) {
    return location.protocol === 'https:' && /^http:\/\//i.test(String(url || ''));
  }

  /* ------------------------------------------------------------
     Zustand melden
     ------------------------------------------------------------ */
  function set(next, text) {
    status = next;
    message = text || '';
    listeners.forEach(function (fn) {
      try { fn(status, message, current); } catch (e) { console.error(e); }
    });
  }

  function on(fn) {
    listeners.push(fn);
    return function () {
      var i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  /* ------------------------------------------------------------
     Abspielen
     ------------------------------------------------------------ */
  function attach(videoEl, stageEl) {
    video = videoEl;
    stage = stageEl;

    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    applyVolume();

    video.addEventListener('playing', function () {
      set('playing');
    });
    video.addEventListener('waiting', function () {
      if (status === 'playing') set('loading', 'Zwischenspeicher füllt sich …');
    });
    video.addEventListener('ended', function () { set('idle', 'Der Stream ist beendet.'); });

    video.addEventListener('error', function () {
      // Adresse ohne Endung, die das Videofeld nicht mochte: fast immer ein
      // MPEG-TS-Strom. Einmal mit mpegts.js nachfassen, bevor ein Fehler
      // gemeldet wird.
      if (nativeTried && !ts && current) {
        nativeTried = false;
        set('loading', 'Zweiter Versuch mit MPEG-TS …');
        video.removeAttribute('src');
        video.load();
        startTs(current.url, 'ts');
        return;
      }
      var e = video.error;
      fail(e ? mediaErrorText(e.code) : 'Der Stream ließ sich nicht öffnen.');
    });
  }

  function mediaErrorText(code) {
    switch (code) {
      case 1: return 'Abruf abgebrochen.';
      case 2: return 'Netzfehler beim Abruf des Streams.';
      case 3: return 'Der Stream ließ sich nicht dekodieren.';
      case 4: return 'Dieses Format oder diese Adresse kann der Browser nicht öffnen.';
      default: return 'Der Stream ließ sich nicht öffnen.';
    }
  }

  function fail(text) {
    set('error', text || 'Unbekannter Fehler.');
  }

  /**
   * 'silent' raeumt nur auf, ohne es zu melden - so laesst sich vor dem
   * naechsten Sender abraeumen, ohne dass die Oberflaeche den eben
   * gewaehlten Sender gleich wieder vergisst.
   */
  function stop(silent) {
    if (hls) { try { hls.destroy(); } catch (e) { } hls = null; }
    if (ts) { try { ts.destroy(); } catch (e) { } ts = null; }
    if (video) {
      try { video.pause(); } catch (e) { }
      video.removeAttribute('src');
      try { video.load(); } catch (e) { }
    }
    if (!silent) {
      current = null;
      set('idle');
    }
  }

  function startPromise(p) {
    // play() gibt je nach Browser ein Versprechen zurueck - oder nichts.
    if (p && p.catch) {
      p.catch(function (e) {
        var name = (e && e.name) || '';
        if (name === 'NotAllowedError') {
          fail('Der Browser verlangt eine Berührung, bevor Ton abgespielt wird. Sender noch einmal antippen.');
          return;
        }
        if (name === 'AbortError') return;   // schon wieder umgeschaltet
        fail(String((e && e.message) || e));
      });
    }
  }

  function startHls(url) {
    hls = new window.Hls({
      lowLatencyMode: true,
      backBufferLength: 60,
      manifestLoadingTimeOut: 20000,
      fragLoadingTimeOut: 20000
    });

    hls.on(window.Hls.Events.MANIFEST_PARSED, function () {
      startPromise(video.play());
    });

    hls.on(window.Hls.Events.ERROR, function (event, data) {
      if (!data || !data.fatal) return;

      // Netz- und Medienfehler sind bei IPTV Alltag - zweimal still
      // nachfassen, danach erst melden.
      if (tries < 2 && data.type === 'networkError') {
        tries++; set('loading', 'Verbindung abgerissen – neuer Versuch …'); hls.startLoad(); return;
      }
      if (tries < 2 && data.type === 'mediaError') {
        tries++; set('loading', 'Bildfehler – neuer Versuch …'); hls.recoverMediaError(); return;
      }

      fail(hlsErrorText(data));
    });

    hls.loadSource(url);
    hls.attachMedia(video);
  }

  function hlsErrorText(data) {
    var d = (data && data.details) || '';
    if (d === 'manifestLoadError' || d === 'manifestLoadTimeOut') {
      return 'Die Senderliste des Streams war nicht erreichbar. Häufig blockiert der Anbieter den Abruf aus dem Browser (CORS) — dann hilft „Extern öffnen“.';
    }
    if (d === 'manifestParsingError') return 'Der Anbieter hat kein gültiges HLS-Manifest geliefert.';
    return d || (data && data.type) || 'HLS-Fehler';
  }

  function startTs(url, kind) {
    var live = kind !== 'flv';

    ts = window.mpegts.createPlayer(
      { type: live ? 'mpegts' : 'flv', isLive: live, url: url },
      { enableWorker: true, liveBufferLatencyChasing: live, lazyLoad: false });

    ts.on(window.mpegts.Events.ERROR, function (type, detail) {
      // Auch hier zweimal still nachfassen - ein Sender bricht schon einmal
      // ab, ohne dass er deshalb tot waere.
      if (tries < 2) {
        tries++;
        set('loading', 'Neuer Versuch …');
        try { ts.unload(); ts.load(); startPromise(ts.play()); return; } catch (e) { }
      }
      fail(String(detail || type || 'MPEG-TS-Fehler'));
    });

    ts.attachMediaElement(video);
    ts.load();
    startPromise(ts.play());
  }

  function startNative(url) {
    nativeTried = true;
    video.src = url;
    startPromise(video.play());
  }

  /**
   * Spielt einen Sender. Der Sender ist ein Objekt
   * {name, url, group, logo} - wie es aus der Playlist kommt.
   */
  async function play(channel) {
    if (!video || !channel || !channel.url) return;

    stop(true);
    current = channel;
    tries = 0;
    nativeTried = false;
    set('loading', 'Verbindung wird aufgebaut …');

    var url = String(channel.url).trim();

    if (mixedContent(url)) {
      fail('Dieser Sender läuft über http, die App über https. Der Browser blockiert das. ' +
           'Mit „Extern öffnen“ an einen richtigen Abspieler weitergeben.');
      return;
    }

    var kind = kindOf(url);

    if (kind === 'extern') {
      fail('Dieses Format kennt keine Browser-Engine (mkv, avi, wmv …). Mit „Extern öffnen“ an VLC weitergeben.');
      return;
    }

    if (kind === 'hls') {
      // Auf iPhone, iPad und in Safari ist der eingebaute Weg der bessere.
      if (nativeHls()) { startNative(url); return; }
      if (await ensure('hls') && hlsUsable()) { startHls(url); return; }
      fail('HLS lässt sich hier nicht abspielen — hls.js konnte nicht geladen werden.');
      return;
    }

    if (kind === 'ts' || kind === 'flv') {
      if (await ensure('ts') && tsUsable()) { startTs(url, kind); return; }
      fail('MPEG-TS lässt sich hier nicht abspielen — mpegts.js konnte nicht geladen werden. ' +
           'Auf iPhone und iPad ist dieses Format nicht möglich; dort hilft „Extern öffnen“.');
      return;
    }

    // Unbekannt: erst das Videofeld, bei Fehlschlag mpegts.js (siehe oben
    // im Fehlerbehandler des Videofelds).
    if (kind === 'unbekannt') await ensure('ts');
    startNative(url);
  }

  /* ------------------------------------------------------------
     Ton
     ------------------------------------------------------------ */
  function applyVolume() {
    if (!video) return;
    var s = G.store.state.settings;
    video.volume = G.u.clamp(s.volume / 100, 0, 1);
    video.muted = !!s.muted || s.volume <= 0;
  }

  function setVolume(percent) {
    G.store.state.settings.volume = G.u.clamp(Math.round(percent), 0, 100);
    if (G.store.state.settings.volume > 0) G.store.state.settings.muted = false;
    applyVolume();
    G.store.commit('settings');
  }

  function toggleMuted() {
    G.store.state.settings.muted = !G.store.state.settings.muted;
    applyVolume();
    G.store.commit('settings');
    return G.store.state.settings.muted;
  }

  /* ------------------------------------------------------------
     Vollbild

     Auf dem iPhone kennt Safari kein Vollbild fuer beliebige
     Bereiche - dort geht nur das Videofeld selbst.
     ------------------------------------------------------------ */
  function isFull() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement) ||
      (stage && stage.classList.contains('is-full'));
  }

  function fullscreen(want) {
    var target = stage || video;
    if (!target) return;

    var on = want === undefined ? !isFull() : !!want;

    if (on) {
      if (target.requestFullscreen) { target.requestFullscreen().catch(fallbackFull); return; }
      if (target.webkitRequestFullscreen) { target.webkitRequestFullscreen(); return; }
      fallbackFull();
      return;
    }

    if (document.exitFullscreen) { document.exitFullscreen().catch(function () { }); }
    else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); }
    if (stage) stage.classList.remove('is-full');
  }

  /** Ohne Vollbild-Schnittstelle: das Videofeld selbst, sonst die Notloesung. */
  function fallbackFull() {
    if (video && video.webkitEnterFullscreen) { try { video.webkitEnterFullscreen(); return; } catch (e) { } }
    if (stage) stage.classList.add('is-full');
  }

  G.player = {
    attach: attach,
    play: play,
    stop: stop,
    on: on,
    setVolume: setVolume,
    toggleMuted: toggleMuted,
    applyVolume: applyVolume,
    fullscreen: fullscreen,
    isFull: isFull,
    kindOf: kindOf,
    mixedContent: mixedContent,
    get channel() { return current; },
    get status() { return status; },
    get message() { return message; }
  };
})(GoTV);
