/* ============================================================
   GoTV — Senderbestand

   Setzt zusammen, was zur Auswahl steht, und holt die Playlisten
   nach. Der Aufbau ist derselbe wie in Connect+ (BuildPool):
   erst die Favoriten, dann die einzeln eingetragenen Sender,
   danach die geladene Playlist. Was schon dabei ist, kommt nicht
   zweimal vor.
   ============================================================ */
(function (G) {
  'use strict';

  var cache = {};      // playlistId -> Senderliste (im Arbeitsspeicher dieser Sitzung)

  /* ------------------------------------------------------------
     Playlisten holen
     ------------------------------------------------------------ */

  /* ------------------------------------------------------------
     Von http auf https heben

     Laeuft GoTV ueber https und die Quelle ueber http, blockiert der
     Browser - dagegen half bisher nur der Vermittler. Vorher lohnt aber
     ein Versuch: viele Anbieter antworten unter demselben Namen auch
     ueber https, nur auf dem Standardanschluss statt auf 8080. Wo das
     gelingt, wird gar kein Vermittler gebraucht.
     ------------------------------------------------------------ */

  /** Die Adressen, unter denen die https-Fassung stehen koennte. */
  function httpsCandidates(source) {
    try {
      var u = new URL(String(source || '').trim());
      if (u.protocol !== 'http:') return [];

      var out = [];

      // Zuerst ohne Anschlussnummer: 8080 ist die des Klartextanschlusses,
      // https liegt fast immer auf 443.
      var plain = new URL(u.toString());
      plain.protocol = 'https:';
      plain.port = '';
      out.push(plain.toString());

      // Dann derselbe Anschluss - manche Anbieter koennen beides.
      if (u.port) {
        var kept = new URL(u.toString());
        kept.protocol = 'https:';
        out.push(kept.toString());
      }

      return out;
    } catch (e) {
      return [];
    }
  }

  /**
   * Antwortet die Adresse brauchbar? Gelesen wird nur der Anfang, danach
   * wird abgebrochen - eine Senderliste hat schnell zehn Megabyte, und ein
   * Stream hoert nie von selbst auf.
   */
  async function responds(url, wantM3u) {
    try {
      var res = await fetch(url, { cache: 'no-store', redirect: 'follow' });
      if (!res.ok) return false;
      if (!wantM3u) { try { res.body.cancel(); } catch (e) { } return true; }
      if (!res.body) return false;

      var reader = res.body.getReader();
      var first = await reader.read();
      try { await reader.cancel(); } catch (e) { /* Rest verwerfen */ }

      var head = new TextDecoder().decode(first.value || new Uint8Array()).toUpperCase();
      return head.indexOf('#EXTM3U') >= 0 || head.indexOf('#EXTINF') >= 0;
    } catch (e) {
      return false;
    }
  }

  /**
   * Was beim Anbieter herauskam: sein https-Ursprung - oder false, wenn er
   * keinen hat. Ohne dieses Gedaechtnis wuerde jeder Sender eines Anbieters
   * denselben Versuch neu machen, und der dauert ein paar Sekunden.
   */
  var lifted = {};

  function originOf(url) {
    try { return new URL(url).origin; } catch (e) { return ''; }
  }

  /** Dieselbe Adresse unter einem anderen Ursprung. */
  function withOrigin(source, origin) {
    try {
      var from = new URL(source);
      var to = new URL(origin);
      to.pathname = from.pathname;
      to.search = from.search;
      to.hash = from.hash;
      return to.toString();
    } catch (e) {
      return '';
    }
  }

  /**
   * Sucht die https-Fassung einer http-Adresse. Gibt die gefundene Adresse
   * zurueck - oder einen leeren Text, wenn der Anbieter kein https kann.
   *
   * @param {string} source  die http-Adresse
   * @param {boolean} wantM3u  true bei einer Playlist, false bei einem Stream
   */
  async function httpsVariant(source, wantM3u) {
    var key = originOf(source);

    // Beim selben Anbieter ist die Antwort schon bekannt.
    if (key && key in lifted) {
      return lifted[key] ? withOrigin(source, lifted[key]) : '';
    }

    var candidates = httpsCandidates(source);

    for (var i = 0; i < candidates.length; i++) {
      if (await responds(candidates[i], wantM3u !== false)) {
        if (key) lifted[key] = originOf(candidates[i]);
        return candidates[i];
      }
    }

    if (key) lifted[key] = false;
    return '';
  }

  /**
   * Laedt die Sender einer Playlist neu von ihrer Quelle.
   * Playlisten aus Datei oder eingefuegtem Text haben keine Quelle im
   * Netz - die lassen sich nur ersetzen, nicht auffrischen.
   *
   * @returns {Promise<{ok:boolean, count:number, error:string}>}
   */
  async function refresh(id) {
    var p = G.store.playlist(id);
    if (!p) return { ok: false, count: 0, error: 'Playlist nicht gefunden.' };

    if (p.kind === 'file' || p.kind === 'text') {
      return { ok: false, count: p.count, error: 'Diese Playlist stammt nicht aus dem Netz. Datei erneut einlesen, um sie zu ersetzen.' };
    }

    // Bevor der Browser die http-Adresse blockiert: sieht nach, ob der
    // Anbieter dieselbe Liste auch ueber https herausgibt. Gelingt das,
    // wird die Quelle dauerhaft darauf umgestellt.
    if (G.player.mixedContent(p.source)) {
      var better = await httpsVariant(p.source, true);
      if (better) {
        p.source = better;
        G.store.commit('playlists');
        G.u.toast('Auf https gehoben',
          'Der Anbieter antwortet auch über https — es wird kein Vermittler gebraucht.', 'ok', 6000);
      }
    }

    try {
      var res = await G.m3u.load(p.source, { proxy: G.store.proxy() });

      if (res.isStream) {
        var msg = 'Hinter der Adresse steckt ein einzelner Stream, keine Senderliste.';
        G.store.setPlaylistError(id, msg);
        return { ok: false, count: 0, error: msg };
      }
      if (!res.channels.length) {
        var leer = 'Die Senderliste ist leer.';
        G.store.setPlaylistError(id, leer);
        return { ok: false, count: 0, error: leer };
      }

      cache[id] = res.channels;
      await G.store.setChannels(id, res.channels);
      return { ok: true, count: res.channels.length, error: '' };
    } catch (e) {
      var text = errorText(e, p.source);
      G.store.setPlaylistError(id, text);
      return { ok: false, count: 0, error: text };
    }
  }

  /**
   * Warum der Abruf misslang - in Worten, die weiterhelfen. Ein
   * fehlgeschlagenes fetch() sagt von sich aus nur "Failed to fetch";
   * dahinter steckt fast immer CORS oder gemischter Inhalt.
   */
  function errorText(e, source) {
    var raw = String((e && e.message) || e || '');

    var mitVermittler = !!G.store.proxy();

    if (/failed to fetch|networkerror|load failed/i.test(raw)) {
      if (G.player.mixedContent(source)) {
        return 'Die Adresse beginnt mit http, die App läuft über https — der Browser blockiert das. ' +
          (mitVermittler
            ? 'Auch der Vermittler kam nicht durch: Adresse und Schlüssel prüfen.'
            : 'Dagegen hilft ein Vermittler (Einstellungen › Playlisten aus dem Netz; ein fertiger ' +
              'liegt im Ordner proxy/). Sonst: Playlist per Datei oder Einfügen übernehmen.');
      }
      return 'Der Anbieter erlaubt den Abruf aus dem Browser nicht (CORS) oder ist nicht erreichbar. ' +
        (mitVermittler
          ? 'Auch über den Vermittler kam nichts an: Adresse und Schlüssel prüfen.'
          : 'Playlist als Datei speichern und hier einlesen, den Text einfügen — oder in den ' +
            'Einstellungen einen Vermittler eintragen.');
    }
    return raw || 'Unbekannter Fehler.';
  }

  /** Die Sender einer Playlist - aus dem Zwischenspeicher oder der Ablage. */
  async function channelsOf(id) {
    if (!id) return [];
    if (cache[id]) return cache[id];

    var list = await G.store.getChannels(id);
    if (list) cache[id] = list;
    return list || [];
  }

  function forget(id) { delete cache[id]; }

  /* ------------------------------------------------------------
     Neue Playlisten eintragen
     ------------------------------------------------------------ */

  /**
   * Traegt eine Playlist ein und laedt sie sofort.
   * @param {{name:string, source:string, kind:string, note?:string}} entry
   */
  async function addAndLoad(entry) {
    var known = G.store.knownSource(entry.source);
    if (known) return { ok: false, playlist: known, error: 'Diese Quelle steht schon in der Liste.' };

    var p = G.store.addPlaylist(entry);
    var res = await refresh(p.id);
    return { ok: res.ok, playlist: p, error: res.error, count: res.count };
  }

  /**
   * Uebernimmt eine Playlist aus vorliegendem Text - aus einer Datei oder
   * eingefuegt. Sie laesst sich spaeter nicht auffrischen, dafuer braucht
   * es keinen Weg nach draussen.
   */
  async function addFromText(name, text, kind, sourceLabel) {
    var res = G.m3u.read(text);   // wirft, wenn es keine Senderliste ist

    if (res.isStream) throw new Error('Das ist ein einzelner Stream, keine Senderliste.');
    if (!res.channels.length) throw new Error('Die Senderliste ist leer.');

    var p = G.store.addPlaylist({
      name: name,
      source: sourceLabel || name,
      kind: kind || 'text',
      note: ''
    });

    cache[p.id] = res.channels;
    await G.store.setChannels(p.id, res.channels);
    return { playlist: p, count: res.channels.length };
  }

  /** Ersetzt die Sender einer vorhandenen Playlist durch neuen Text. */
  async function replaceFromText(id, text) {
    var res = G.m3u.read(text);
    if (res.isStream) throw new Error('Das ist ein einzelner Stream, keine Senderliste.');
    if (!res.channels.length) throw new Error('Die Senderliste ist leer.');

    cache[id] = res.channels;
    await G.store.setChannels(id, res.channels);
    return res.channels.length;
  }

  /* ------------------------------------------------------------
     Vorrat und Gruppen
     ------------------------------------------------------------ */

  /**
   * Der Vorrat der Bereichs Sender: Favoriten, eigene Sender und die
   * Sender der geoeffneten Playlist - in dieser Reihenfolge, ohne
   * Doppelte.
   */
  async function pool(playlistId) {
    var s = G.store.state;
    var seen = {};
    var out = [];

    function add(channel, origin) {
      var key = String(channel.url || '').trim().toLowerCase();
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push({
        name: channel.name || G.m3u.nameFromSource(channel.url),
        url: channel.url,
        group: channel.group || '',
        logo: channel.logo || '',
        origin: origin
      });
    }

    s.favorites.forEach(function (f) { add(f, 'favorit'); });
    s.channels.forEach(function (c) { add(c, 'eigen'); });

    (await channelsOf(playlistId)).forEach(function (c) { add(c, 'playlist'); });

    return out;
  }

  /** Die Gruppen eines Vorrats mit ihrer Senderzahl, alphabetisch. */
  function groupsOf(list) {
    var map = {};
    list.forEach(function (c) {
      var g = c.group || '';
      if (!g) return;
      map[g] = (map[g] || 0) + 1;
    });
    return Object.keys(map).sort(function (a, b) {
      return a.localeCompare(b, 'de', { sensitivity: 'base' });
    }).map(function (g) { return { name: g, count: map[g] }; });
  }

  /** Sucht in Name und Gruppe - alle Woerter muessen vorkommen. */
  function filter(list, query, group) {
    var words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);

    return list.filter(function (c) {
      if (group && group !== '*' && (c.group || '') !== group) return false;
      if (!words.length) return true;
      var hay = ((c.name || '') + ' ' + (c.group || '')).toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) >= 0; });
    });
  }

  G.library = {
    httpsVariant: httpsVariant,
    refresh: refresh,
    channelsOf: channelsOf,
    forget: forget,
    addAndLoad: addAndLoad,
    addFromText: addFromText,
    replaceFromText: replaceFromText,
    errorText: errorText,
    pool: pool,
    groupsOf: groupsOf,
    filter: filter
  };
})(GoTV);
