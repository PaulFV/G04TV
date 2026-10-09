/* ============================================================
   G04TV — Wiedergabe

   Uebernommen aus Connect+ (Forms/IptvPlayerPage.cs). Dort lief
   dieselbe Logik in einer WebView2-Flaeche; hier ist der Browser
   die Flaeche.

   Drei Wege, je nachdem was hinter der Adresse steckt:
     HLS (*.m3u8)   hls.js - ausser auf iPhone/iPad und Safari,
                    die HLS von Haus aus koennen
     MPEG-TS (*.ts) mpegts.js - auf dem iPhone ueber Apples
                    ManagedMediaSource (ab iOS 17.1); bei Xtream
                    zusaetzlich die HLS-Fassung desselben Senders
     alles Uebrige  das Videofeld selbst (mp4, webm, mp3 ...)

   Die beiden Bibliotheken werden erst geholt, wenn sie gebraucht
   werden - und zuerst aus dem Ordner vendor/ neben der App, damit
   sich G04TV auch ohne Weg nach draussen betreiben laesst.
   ============================================================ */
(function (G) {
  'use strict';

  var HLS_LOCAL = 'vendor/hls.min.js';
  var HLS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js';
  var TS_LOCAL = 'vendor/mpegts.js';
  var TS_CDN = 'https://cdn.jsdelivr.net/npm/mpegts.js@1.8.2/dist/mpegts.js';

  var video = null;
  var stage = null;

  var hls = null;
  var ts = null;

  var current = null;        // laufender Sender
  var playingUrl = '';       // die Adresse, die tatsaechlich abgerufen wird
                             // (bei eingeschaltetem Vermittler dessen Adresse)
  var status = 'idle';       // idle | loading | playing | error
  var message = '';
  var tries = 0;
  var queue = [];            // weitere Versuche, falls der laufende scheitert
  var run = 0;               // zaehlt hoch bei jedem Umschalten
  var listeners = [];
  var loaded = {};           // welche Bibliothek schon da ist

  // Hänger-Überwachung (siehe watchStalls)
  var activeStep = null;     // der Weg, der gerade läuft - für den Neustart
  var stalls = 0;            // Hänger seit dem letzten ruhigen Lauf
  var progressAt = 0;        // wann zuletzt Bild weiterlief
  var playingSince = 0;      // seit wann es ohne Aussetzer läuft
  var runStart = 0;          // wann dieser Sender zum ersten Mal lief (Laufzeit-Anzeige)
  var started = false;       // hat dieser Versuch schon einmal gespielt?
  var journal = [];          // die letzten Ereignisse, zum Nachsehen

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

  /**
   * Eingebautes HLS nur dort, wo es das bessere ist: auf Apple-Geräten
   * (Safari, iPhone, iPad - mit AirPlay und Ton bei gesperrtem Bildschirm)
   * oder wenn es kein MediaSource für hls.js gibt. Neuere Chrome-Versionen
   * melden HLS ebenfalls als abspielbar; ihr eingebauter Weg hat aber
   * weder den einstellbaren Puffer noch Wiederholungen bei Netzfehlern -
   * dort läuft hls.js, wie bei Firefox und Edge auch.
   */
  function preferNativeHls() {
    if (!nativeHls()) return false;
    if (typeof window.MediaSource !== 'function' && !window.ManagedMediaSource) return true;
    return /Apple/i.test(navigator.vendor || '');
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

  /** iPhone: HLS im Videofeld, aber kein klassisches MediaSource. */
  function appleWithoutMse() {
    return nativeHls() && typeof window.MediaSource !== 'function';
  }

  /**
   * Xtream-Anbieter geben jeden Live-Sender auch als HLS heraus - unter
   * derselben Adresse mit .m3u8 statt .ts. Das spielt iOS von Haus aus,
   * ohne Bibliothek und ohne CORS. Liefert '' wenn die Adresse nicht
   * nach Xtream aussieht.
   *   host/live/benutzer/kennwort/123.ts  -> host/live/benutzer/kennwort/123.m3u8
   *   host/benutzer/kennwort/123          -> host/live/benutzer/kennwort/123.m3u8
   *   ...&output=ts                       -> ...&output=m3u8
   */
  function hlsVariant(url) {
    var raw = String(url || '').trim();
    var m = /^(https?:\/\/[^/?#]+)([^?#]*)(\?[^#]*)?/i.exec(raw);
    if (!m) return '';
    var host = m[1], path = m[2], query = m[3] || '';

    if (/[?&]output=(ts|mpegts)\b/i.test(query)) {
      return host + path + query.replace(/([?&]output=)(ts|mpegts)\b/i, '$1m3u8');
    }

    var parts = path.replace(/\/+$/, '').split('/').filter(Boolean);
    if (parts[0] && parts[0].toLowerCase() === 'live') parts.shift();
    if (parts.length !== 3) return '';

    var id = /^(\d+)(\.(ts|mpegts))?$/i.exec(parts[2]);
    if (!id) return '';

    return host + '/live/' + parts[0] + '/' + parts[1] + '/' + id[1] + '.m3u8' + query;
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
      if (!started && current) note('Läuft: ' + (current.name || '') + ' · ' + describe(snapshot()));
      started = true;
      progressAt = playingSince = Date.now();
      if (!runStart) runStart = playingSince;
      set('playing');
    });
    video.addEventListener('timeupdate', function () { progressAt = Date.now(); });
    video.addEventListener('waiting', logWaiting);
    setInterval(watchStalls, 1000);
    // Kurze Aussetzer (Bruchteile einer Sekunde) nicht gleich mit der
    // Ladeanzeige quittieren - das Aufblitzen wirkte selbst wie Stottern.
    var waitTimer = null;
    video.addEventListener('waiting', function () {
      if (status !== 'playing') return;
      clearTimeout(waitTimer);
      waitTimer = setTimeout(function () {
        if (status === 'playing' && video.readyState < 3) set('loading', 'Zwischenspeicher füllt sich …');
      }, 800);
    });
    video.addEventListener('playing', function () { clearTimeout(waitTimer); });
    video.addEventListener('ended', function () { set('idle', 'Der Stream ist beendet.'); });

    video.addEventListener('error', function () {
      // Nur Fehler des Videofelds selbst - laufen hls.js oder mpegts.js,
      // melden die ihre Fehler eigens.
      if (hls || ts || !current || !video.getAttribute('src')) return;

      // Ist noch ein anderer Weg offen (MPEG-TS hinter einer Adresse ohne
      // Endung, die HLS-Fassung eines Xtream-Senders), wird der versucht,
      // bevor ein Fehler gemeldet wird.
      if (next()) return;
      var e = video.error;
      fail(e ? mediaErrorText(e.code) : 'Der Stream ließ sich nicht öffnen.');
    });
  }

  /* ------------------------------------------------------------
     Hänger erkennen und beheben

     Ein Strom, der einfach stehen bleibt, meldet keinen Fehler - weder
     mpegts.js noch hls.js geben dann auf. Ohne Überwachung stünde dort
     für immer "Zwischenspeicher füllt sich". Hier: bleibt das Bild
     länger als 7 s stehen (beim Start 20 s), wird derselbe Weg neu
     aufgebaut; hilft das nicht, der nächste (bei Xtream die HLS-Fassung
     des Senders); nach vier Hängern kommt eine Meldung.
     ------------------------------------------------------------ */
  function note(text) {
    journal.push(new Date().toTimeString().slice(0, 8) + ' ' + text);
    if (journal.length > 40) journal.shift();
    try { console.info('[G04TV] ' + text); } catch (e) { }
  }

  /** Womit gerade gespielt wird und wie voll der Puffer ist - fürs Protokoll. */
  function snapshot() {
    var engine = hls ? 'hls.js' : ts ? 'mpegts.js' : (video && video.currentSrc ? 'System (nativ)' : '-');
    var ahead = null;
    if (video && video.buffered) {
      for (var i = 0; i < video.buffered.length; i++) {
        if (video.currentTime >= video.buffered.start(i) - 0.1 && video.currentTime <= video.buffered.end(i)) {
          ahead = video.buffered.end(i) - video.currentTime;
        }
      }
    }
    var q = video && video.getVideoPlaybackQuality ? video.getVideoPlaybackQuality() : null;
    var level = hls && hls.levels && hls.levels[hls.currentLevel];
    return {
      engine: engine,
      ahead: ahead,                                   // Sekunden Vorrat, null = keiner
      ready: video ? video.readyState : -1,
      dropped: q ? q.droppedVideoFrames : null,
      frames: q ? q.totalVideoFrames : null,
      height: video ? video.videoHeight : 0,
      kbps: hls && hls.bandwidthEstimate ? Math.round(hls.bandwidthEstimate / 1000) : null,
      level: level ? Math.round(level.bitrate / 1000) : null,
      stalls: stalls,
      status: status
    };
  }

  function describe(s) {
    return s.engine + ' · Vorrat ' + (s.ahead == null ? 'keiner' : s.ahead.toFixed(1) + ' s') +
      ' · Bild ' + (s.height || '?') + 'p' +
      (s.dropped != null ? ' · verworfen ' + s.dropped + '/' + s.frames : '') +
      (s.kbps != null ? ' · Netz ' + s.kbps + ' kbit/s' : '') +
      (s.level != null ? ' · Stufe ' + s.level + ' kbit/s' : '');
  }

  var lastWait = 0;
  function logWaiting() {
    if (!current || !started || video.paused) return;
    var now = Date.now();
    if (now - lastWait < 2000) return;
    lastWait = now;
    note('Aussetzer: ' + describe(snapshot()));
  }

  function attempt(step) {
    activeStep = step;
    started = false;
    progressAt = Date.now();
  }

  function watchStalls() {
    if (!current || !video || document.hidden) return;
    if (status !== 'playing' && status !== 'loading') return;
    if (started && video.paused) return;               // vom Nutzer angehalten

    var now = Date.now();
    if (status === 'playing' && stalls && now - playingSince > 60000) stalls = 0;
    if (now - progressAt < (started ? 7000 : 20000)) return;

    stalls++;
    note('Hänger Nr. ' + stalls + (started ? '' : ' (beim Start)') + ' bei ' + (current.name || ''));
    progressAt = now;

    if (stalls > 4) {
      stop(true);
      fail('Der Sender liefert nicht gleichmäßig. Mit „Extern öffnen“ an einen Abspieler wie VLC weitergeben.');
      return;
    }
    // Erst derselbe Weg noch einmal, dann der nächste, dann wieder der letzte
    if (stalls !== 1 && next()) { note('Wechsel auf den nächsten Weg'); return; }
    restartStep();
  }

  function restartStep() {
    if (!activeStep) return;
    var mine = run;
    var step = activeStep;
    teardown();
    tries = 0;
    set('loading', 'Hängt – verbindet neu …');
    setTimeout(function () {
      if (mine !== run) return;
      attempt(step);
      step.go(mine);
    }, 300);
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
    teardown();
    if (!silent) {
      run++;
      queue = [];
      current = null;
      playingUrl = '';
      runStart = 0;
      set('idle');
    }
  }

  /** Raeumt die laufende Wiedergabe ab, ohne den Sender zu vergessen. */
  function teardown() {
    if (hls) { try { hls.destroy(); } catch (e) { } hls = null; }
    if (ts) { try { ts.destroy(); } catch (e) { } ts = null; }
    if (video) {
      try { video.pause(); } catch (e) { }
      video.removeAttribute('src');
      try { video.load(); } catch (e) { }
      // mpegts.js schaltet AirPlay fuer ManagedMediaSource ab - fuer den
      // naechsten Sender wieder freigeben.
      try { video.disableRemotePlayback = false; } catch (e) { }
    }
  }

  /**
   * Naechsten Weg aus der Warteschlange versuchen. false, wenn keiner
   * mehr offen ist - dann meldet der Aufrufer den Fehler.
   */
  function next() {
    var step = queue.shift();
    if (!step) return false;
    var mine = run;
    setTimeout(function () {
      if (mine !== run) return;          // inzwischen umgeschaltet
      teardown();
      tries = 0;
      set('loading', step.label);
      attempt(step);
      step.go(mine);
    }, 0);
    return true;
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
        // Quelle unbrauchbar: das Videofeld meldet das gleich noch einmal
        // als 'error' - dort wird der naechste Weg versucht.
        if (name === 'NotSupportedError') return;
        fail(String((e && e.message) || e));
      });
    }
  }

  /** Der eingestellte Vorrat in ganzen Minuten, 1 bis 12. */
  function bufferMinutes() {
    var n = Math.round(Number(G.store.state.settings.bufferMin));
    return n >= 1 && n <= 12 ? n : 1;
  }

  function startHls(url) {
    // Kein Low-Latency-Modus: IPTV-Sender sind kein LL-HLS, und der Modus
    // haelt den Puffer klein - das stottert. Lieber 3-4 Segmente Abstand
    // zur Live-Kante und bis zu 30 s Vorrat.
    // Der Vorrat kommt aus den Einstellungen (1-12 Min). hls.js füllt ihn,
    // soweit der Sender Segmente vorhält; bei Live-Sendern ist das oft nur
    // das Fenster der Playlist. maxBufferSize deckelt den Speicherbedarf.
    var bufMin = bufferMinutes();
    hls = new window.Hls({
      lowLatencyMode: false,
      liveSyncDurationCount: 4,
      liveMaxLatencyDurationCount: 12,
      maxBufferLength: bufMin * 60,
      maxMaxBufferLength: bufMin * 60,
      maxBufferSize: Math.max(60, bufMin * 25) * 1000 * 1000,
      backBufferLength: 30,
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

      if (next()) return;
      fail(hlsErrorText(data));
    });

    hls.loadSource(url);
    hls.attachMedia(video);
  }

  function hlsErrorText(data) {
    var d = (data && data.details) || '';
    if (d === 'manifestLoadError' || d === 'manifestLoadTimeOut') {
      return 'Die Senderliste des Streams war nicht erreichbar. Häufig blockiert der Anbieter den Abruf aus dem Browser (CORS) — ' +
        (G.store.state.settings.proxyStreams
          ? 'hier auch über den Vermittler nicht. Dann hilft „Extern öffnen“.'
          : 'dann hilft „Extern öffnen“ oder ein Vermittler für Streams (Einstellungen).');
    }
    if (d === 'manifestParsingError') return 'Der Anbieter hat kein gültiges HLS-Manifest geliefert.';
    return d || (data && data.type) || 'HLS-Fehler';
  }

  function startTs(url, kind) {
    var live = kind !== 'flv';

    // Stabile Wiedergabe statt geringster Verzoegerung: frueher jagte
    // mpegts.js der Live-Kante hinterher (liveBufferLatencyChasing) und
    // hielt dabei nur ~1,5 s Puffer - bei IPTV-Servern, die ungleichmaessig
    // liefern, stotterte das Bild staendig. Jetzt darf sich ein Polster
    // aufbauen; alter Puffer wird regelmaessig freigegeben (wichtig auf dem
    // iPhone, wo ManagedMediaSource wenig Speicher hat).
    ts = window.mpegts.createPlayer(
      { type: live ? 'mpegts' : 'flv', isLive: live, url: url },
      {
        enableWorker: true,
        enableStashBuffer: true,
        stashInitialSize: 512 * 1024,
        liveBufferLatencyChasing: false,
        liveSync: false,
        lazyLoad: false,
        autoCleanupSourceBuffer: true,
        autoCleanupMaxBackwardDuration: 60,
        autoCleanupMinBackwardDuration: 30,
        fixAudioTimestampGap: true
      });

    ts.on(window.mpegts.Events.ERROR, function (type, detail) {
      // Auch hier zweimal still nachfassen - ein Sender bricht schon einmal
      // ab, ohne dass er deshalb tot waere.
      if (tries < 2) {
        tries++;
        set('loading', 'Neuer Versuch …');
        try { ts.unload(); ts.load(); startPromise(ts.play()); return; } catch (e) { }
      }
      if (next()) return;
      fail(tsErrorText(type, detail));
    });

    // ManagedMediaSource (iPhone) oeffnet sich nur ohne AirPlay.
    if (window.ManagedMediaSource && typeof window.MediaSource !== 'function') {
      try { video.disableRemotePlayback = true; } catch (e) { }
    }
    ts.attachMediaElement(video);
    ts.load();
    startPromise(ts.play());
  }

  function tsErrorText(type, detail) {
    if (type === 'NetworkError') {
      return 'Der MPEG-TS-Strom war nicht erreichbar. Häufig blockiert der Anbieter den Abruf aus dem Browser (CORS) — ' +
        (G.store.state.settings.proxyStreams
          ? 'hier auch über den Vermittler nicht. Dann hilft „Extern öffnen“.'
          : 'dann hilft ein Vermittler für Streams (Einstellungen) oder „Extern öffnen“.');
    }
    return String(detail || type || 'MPEG-TS-Fehler');
  }

  function tsMissingText() {
    if (appleWithoutMse()) {
      return 'MPEG-TS braucht auf dem iPhone iOS 17.1 oder neuer. Mit „Extern öffnen“ an einen Abspieler wie VLC weitergeben.';
    }
    return 'MPEG-TS lässt sich hier nicht abspielen — mpegts.js konnte nicht geladen werden.';
  }

  /* Die einzelnen Wege - jeder prueft selbst, ob er moeglich ist, und
     reicht sonst an den naechsten weiter. */
  function viaTs(url, kind) {
    return async function (mine) {
      var ok = await ensure('ts') && tsUsable();
      if (mine !== run) return;
      if (ok) { startTs(url, kind); return; }
      if (!next()) fail(tsMissingText());
    };
  }

  function viaHls(url) {
    return async function (mine) {
      if (preferNativeHls()) { startNative(url); return; }
      var ok = await ensure('hls') && hlsUsable();
      if (mine !== run) return;
      if (ok) { startHls(url); return; }
      // hls.js nicht ladbar: lieber der eingebaute Weg als gar nichts
      if (nativeHls()) { startNative(url); return; }
      if (!next()) fail('HLS lässt sich hier nicht abspielen — hls.js konnte nicht geladen werden.');
    };
  }

  function viaNative(url) {
    return function () { startNative(url); };
  }

  function startNative(url) {
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
    var mine = ++run;
    queue = [];
    current = channel;
    tries = 0;
    started = false;
    runStart = 0;
    progressAt = Date.now();
    set('loading', 'Verbindung wird aufgebaut …');

    var source = String(channel.url).trim();

    // Ist der Vermittler auch für Streams eingeschaltet, läuft der Abruf
    // über ihn - damit fallen CORS und gemischter Inhalt weg. Die Art des
    // Streams wird trotzdem an der Originaladresse abgelesen: die
    // Vermittleradresse trägt keine Endung.
    var url = G.store.streamViaProxy(source);
    var viaProxy = url !== source;
    playingUrl = url;

    if (!viaProxy && mixedContent(source)) {
      // Bevor aufgegeben wird: viele Anbieter geben denselben Sender auch
      // über https heraus. Dann braucht es weder Vermittler noch einen
      // fremden Abspieler.
      set('loading', 'Wird über https versucht …');
      var lifted = await G.library.httpsVariant(source, false);

      if (mine !== run) return;             // inzwischen umgeschaltet

      if (!lifted) {
        fail('Dieser Sender läuft über http, die App über https. Der Browser blockiert das, ' +
             'und der Anbieter antwortet auch nicht über https. Mit „Extern öffnen“ an einen ' +
             'richtigen Abspieler weitergeben — oder in den Einstellungen einen Vermittler ' +
             'auch für Streams einschalten.');
        return;
      }

      url = lifted;
      playingUrl = url;
    }

    var kind = kindOf(source);

    if (kind === 'extern') {
      fail('Dieses Format kennt keine Browser-Engine (mkv, avi, wmv …). Mit „Extern öffnen“ an VLC weitergeben.');
      return;
    }

    // Die Adresse ohne Vermittler, aus der sich die HLS-Fassung ableitet.
    var plain = viaProxy ? source : url;
    var steps = [];

    if (kind === 'hls') {
      // Auf iPhone, iPad und in Safari ist der eingebaute Weg der bessere.
      steps.push({ label: 'Verbindung wird aufgebaut …', go: viaHls(url) });
      // Chrome kann HLS auch selbst - als zweiter Weg, falls hls.js scheitert
      if (nativeHls() && !preferNativeHls()) steps.push({ label: 'Neuer Versuch …', go: viaNative(url) });
    }
    else if (kind === 'ts' || kind === 'flv') {
      var tsStep = { label: 'Versuch über MPEG-TS …', go: viaTs(url, kind) };
      var variant = kind === 'ts' ? hlsVariant(plain) : '';
      var hlsStep = variant && {
        label: 'Versuch über HLS …',
        go: viaHls(G.store.streamViaProxy(variant))
      };

      // iPhone: die HLS-Fassung zuerst - sie laeuft im Videofeld, ohne
      // CORS, mit AirPlay und gesperrtem Bildschirm. mpegts.js (ab iOS
      // 17.1) bleibt als zweiter Weg. Ueberall sonst umgekehrt.
      if (hlsStep && appleWithoutMse()) steps.push(hlsStep, tsStep);
      else if (!hlsStep) steps.push(tsStep);
      else steps.push(tsStep, hlsStep);
    }
    else {
      // Unbekannt: erst das Videofeld, bei Fehlschlag mpegts.js.
      steps.push({ label: 'Verbindung wird aufgebaut …', go: viaNative(url) });
      steps.push({ label: 'Zweiter Versuch mit MPEG-TS …', go: viaTs(url, 'ts') });
    }

    queue = steps.slice(1);
    stalls = 0;
    attempt(steps[0]);
    steps[0].go(mine);
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
    // Nur das Bild zaehlt - die ganze App im Vollbild (Knopf in der Kopfzeile)
    // ist etwas anderes.
    var fe = document.fullscreenElement || document.webkitFullscreenElement;
    return !!(fe && (fe === stage || fe === video || (stage && stage.contains(fe)))) ||
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

  /**
   * Vollbild ohne Browser-Schnittstelle: das Bild füllt die Seite. Anders als
   * fullscreen() braucht das keine Berührung - nötig beim Drehen des Handys,
   * wo der Browser das echte Vollbild verweigert (auf dem iPhone bleibt der
   * Versuch über das Videofeld sonst stumm ohne Wirkung).
   */
  function softFullscreen(on) {
    if (!stage) return;
    stage.classList.toggle('is-full', !!on);
    if (!on) {
      var fe = document.fullscreenElement || document.webkitFullscreenElement;
      if (fe && stage.contains(fe)) fullscreen(false);
    }
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
    /** Wie lange der laufende Sender schon läuft (ms) - -1, solange er noch nicht lief. */
    elapsed: function () { return runStart && current ? Date.now() - runStart : -1; },
    log: function () { return journal.slice(); },
    clearLog: function () { journal = []; },
    stats: function () { var s = snapshot(); s.text = describe(s); return s; },
    setVolume: setVolume,
    toggleMuted: toggleMuted,
    applyVolume: applyVolume,
    fullscreen: fullscreen,
    softFullscreen: softFullscreen,
    isFull: isFull,
    kindOf: kindOf,
    hlsVariant: hlsVariant,
    mixedContent: mixedContent,
    get channel() { return current; },
    get status() { return status; },
    get message() { return message; }
  };
})(G04TV);
