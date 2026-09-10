/* ============================================================
   G04TV — M3U/M3U8 lesen

   Uebernommen aus Connect+ (Services/M3uPlaylist.cs) und auf den
   Browser uebertragen.

   Aufbau einer solchen Datei: eine Zeile
     #EXTINF:-1 tvg-name="..." tvg-logo="..." group-title="...",Das Erste
   darunter die Adresse des Streams. Zusatzzeilen (#EXTVLCOPT,
   #KODIPROP) werden uebergangen, #EXTGRP gilt bis zur naechsten
   Angabe.
   ============================================================ */
(function (G) {
  'use strict';

  /** Wie viele Sender hoechstens uebernommen werden. */
  var MAX_CHANNELS = 50000;

  /** True, wenn die Quelle eine Adresse im Netz ist. */
  function isUrl(source) {
    return /^https?:\/\//i.test(String(source || '').trim());
  }

  /**
   * Sieht die Adresse nach einer Senderliste aus? Neben den Endungen
   * zaehlen die Aufrufe der Xtream-Anbieter: get.php?...&type=m3u_plus,
   * player_api.php, /playlist/.
   */
  function looksLikePlaylist(source) {
    var text = String(source || '').trim();
    if (/\.m3u8?(\?|$)/i.test(text)) return true;
    return ['get.php', 'player_api.php', 'panel_api.php', 'type=m3u', '/playlist/', '/playlist.m3u']
      .some(function (m) { return text.toLowerCase().indexOf(m) >= 0; });
  }

  /**
   * Ist der Inhalt das Manifest eines einzelnen HLS-Streams statt einer
   * Senderliste? Die #EXT-X--Zeilen kommen nur dort vor. #EXTINF steht in
   * beiden Formen und taugt deshalb nicht als Merkmal.
   */
  function isHlsManifest(text) {
    return ['#EXT-X-TARGETDURATION', '#EXT-X-STREAM-INF', '#EXT-X-MEDIA-SEQUENCE', '#EXT-X-PLAYLIST-TYPE']
      .some(function (m) { return text.toUpperCase().indexOf(m) >= 0; });
  }

  /**
   * Sieht nach, ob die Antwort ueberhaupt eine M3U ist. Ein abgewiesener
   * Zugang antwortet gern mit einer einzigen Zeile ("Blocked", "Expired"),
   * und die wuerde der Leser sonst als Sender missverstehen.
   */
  function check(text) {
    var upper = text.toUpperCase();
    if (upper.indexOf('#EXTM3U') >= 0 || upper.indexOf('#EXTINF') >= 0) return;

    var answer = text.trim();
    if (!answer.length) throw new Error('Der Anbieter hat nichts geliefert.');
    if (answer.length > 200) answer = answer.slice(0, 200) + ' …';
    throw new Error('Das ist keine Senderliste. Antwort des Anbieters: ' + answer);
  }

  /** Liest name="wert" aus einer #EXTINF-Zeile. */
  function attribute(line, name) {
    var key = name + '="';
    var start = line.toLowerCase().indexOf(key.toLowerCase());
    if (start < 0) return '';
    start += key.length;
    var end = line.indexOf('"', start);
    return end < 0 ? '' : line.slice(start, end).trim();
  }

  /**
   * Zerlegt eine #EXTINF-Zeile. Der Name steht hinter dem letzten Komma;
   * fehlt er, gilt tvg-name.
   */
  function readInfo(line) {
    var comma = line.lastIndexOf(',');
    var name = comma >= 0 ? line.slice(comma + 1).trim() : '';
    var attrs = comma >= 0 ? line.slice(0, comma) : line;

    if (!name) name = attribute(attrs, 'tvg-name');

    return {
      name: name,
      group: attribute(attrs, 'group-title'),
      logo: attribute(attrs, 'tvg-logo'),
      tvgId: attribute(attrs, 'tvg-id')
    };
  }

  /** Wertet den Inhalt einer M3U aus. */
  function parse(text) {
    var channels = [];
    var info = null;
    var lastGroup = '';
    var lines = String(text).split('\n');

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;

      if (/^#EXTINF/i.test(line)) {
        info = readInfo(line);
        // Ohne group-title gilt das zuletzt gesehene #EXTGRP.
        if (!info.group) info.group = lastGroup;
        continue;
      }

      if (/^#EXTGRP/i.test(line)) {
        var idx = line.indexOf(':');
        lastGroup = idx < 0 ? '' : line.slice(idx + 1).trim();
        if (info && !info.group) info.group = lastGroup;
        continue;
      }

      // Alles Weitere mit # ist Steuerung (#EXTM3U, #EXTVLCOPT, #KODIPROP).
      if (line.charAt(0) === '#') continue;

      channels.push({
        name: (info && info.name) || line,
        url: line,
        group: (info && info.group) || '',
        logo: (info && info.logo) || '',
        tvgId: (info && info.tvgId) || ''
      });

      info = null;
      if (channels.length >= MAX_CHANNELS) break;
    }

    return channels;
  }

  /**
   * Holt eine Playlist aus dem Netz.
   *
   * Der Browser laesst eine fremde Adresse nur lesen, wenn der Anbieter
   * das ausdruecklich erlaubt (CORS). Tut er das nicht, schlaegt der Abruf
   * fehl - dann bleiben Datei und Einfuegen. Ist in den Einstellungen ein
   * Vermittler eingetragen, wird er als zweiter Versuch genommen.
   */
  async function fetchText(url, options) {
    options = options || {};
    var direct = String(url).trim();
    var proxy = options.proxy && String(options.proxy).trim();

    // Laeuft die App ueber https und die Quelle ueber http, laesst der
    // Browser den Abruf gar nicht erst zu. Der direkte Versuch waere sicher
    // vergeblich - steht ein Vermittler bereit, geht es gleich ueber ihn.
    if (proxy && blocked(direct)) return await viaProxy(proxy, direct);

    try {
      var res = await fetch(direct, { redirect: 'follow', cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
      return await res.text();
    } catch (e) {
      if (!proxy) throw e;
      return await viaProxy(proxy, direct);
    }
  }

  /** Der Browser blockiert eine http-Quelle, sobald die App ueber https laeuft. */
  function blocked(url) {
    return location.protocol === 'https:' && /^http:\/\//i.test(String(url || ''));
  }

  /** Holt eine Adresse ueber den Vermittler. */
  async function viaProxy(proxy, url) {
    var viaUrl = proxy.indexOf('{url}') >= 0
      ? proxy.replace('{url}', encodeURIComponent(url))
      : proxy + encodeURIComponent(url);

    var via = await fetch(viaUrl, { redirect: 'follow', cache: 'no-store' });
    if (!via.ok) throw new Error('HTTP ' + via.status + ' ' + via.statusText + ' (über den Vermittler)');
    return await via.text();
  }

  /**
   * Laedt eine Playlist und wertet sie aus.
   *
   * *.m3u8 ist doppeldeutig: es kann eine Senderliste sein oder das
   * Manifest eines einzelnen HLS-Streams. Erst der Inhalt verraet, welches
   * von beiden - deshalb dieses Ergebnis statt einer blossen Liste.
   */
  async function load(source, options) {
    var text = await fetchText(source, options);
    return read(text);
  }

  /** Wertet bereits vorliegenden Text aus (Datei oder eingefuegt). */
  function read(text) {
    if (isHlsManifest(text)) return { isStream: true, channels: [] };
    check(text);
    return { isStream: false, channels: parse(text) };
  }

  /** Notname, wenn kein Name angegeben wurde. */
  function nameFromSource(source) {
    var text = String(source || '').trim();
    try {
      if (isUrl(text)) {
        var u = new URL(text);
        var last = (u.pathname.split('/').filter(Boolean).pop() || '').replace(/\.(m3u8?|php)$/i, '');

        // Die Abrufadressen der Anbieter heissen alle gleich (get.php,
        // player_api.php). "get" waere als Name der Playlist nutzlos -
        // der Rechnername sagt, um wen es geht.
        if (!last || /^(get|player_api|panel_api|playlist|index|live)$/i.test(last)) return u.hostname;

        return last;
      }
    } catch (e) { /* faellt unten durch */ }
    var file = text.split(/[\\/]/).pop() || text;
    return file.replace(/\.(m3u8?|txt)$/i, '') || text;
  }

  /**
   * Der Rechnername einer Quelle - leer, wenn sie keine Adresse ist. Daran
   * haengen die Sender eines Anbieters zusammen: sie tragen denselben
   * Zugang in der Adresse.
   */
  function hostOf(source) {
    try { return new URL(String(source || '').trim()).host; }
    catch (e) { return ''; }
  }

  /**
   * Zwei Quellen gelten als dieselbe, wenn sie sich nur in Gross- und
   * Kleinschreibung oder im Leerraum unterscheiden.
   */
  function sameSource(a, b) {
    return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  }

  G.m3u = {
    MAX_CHANNELS: MAX_CHANNELS,
    isUrl: isUrl,
    looksLikePlaylist: looksLikePlaylist,
    isHlsManifest: isHlsManifest,
    parse: parse,
    read: read,
    load: load,
    fetchText: fetchText,
    nameFromSource: nameFromSource,
    hostOf: hostOf,
    sameSource: sameSource
  };
})(G04TV);
