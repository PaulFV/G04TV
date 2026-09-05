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

    if (/failed to fetch|networkerror|load failed/i.test(raw)) {
      if (G.player.mixedContent(source)) {
        return 'Die Adresse beginnt mit http, die App läuft über https — der Browser blockiert das. ' +
               'Playlist per Datei oder Einfügen übernehmen, oder die App über http aufrufen.';
      }
      return 'Der Anbieter erlaubt den Abruf aus dem Browser nicht (CORS) oder ist nicht erreichbar. ' +
             'Playlist als Datei speichern und hier einlesen, den Text einfügen — oder in den Einstellungen einen Vermittler eintragen.';
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
