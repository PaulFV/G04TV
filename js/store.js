/* ============================================================
   G04TV — Zustand und Speicherung

   Anders als GoFit kennt G04TV keine Benutzer und keine
   Einwilligungsstufen: die Playlisten sind der Zweck der App und
   werden deshalb immer gespeichert - auf dem Geraet, nirgends
   sonst. Es gibt kein Konto, keinen Server, keine Anmeldung.

   Was wohin kommt:
     localStorage  Kopfdaten der Playlisten, Einzelsender,
                   Favoriten, Verlauf, Einstellungen
     IndexedDB     die Senderlisten selbst (siehe db.js)

   Geloescht wird alles ueber Einstellungen - Daten verwalten.
   ============================================================ */
(function (G) {
  'use strict';

  var KEY = 'g04tv.v1';

  /**
   * Unter diesem Schluessel lag alles, bevor die App umbenannt wurde. Er
   * wird beim ersten Start einmal uebernommen und dann entfernt; die
   * Stelle darf verschwinden, sobald die App auf allen Geraeten einmal
   * gelaufen ist.
   */
  var KEY_ALT = 'gotv.v1';

  var listeners = [];
  var storageOk = true;

  /** Wie viele Sender der Verlauf behaelt. */
  var MAX_RECENT = 24;

  /* ---------- Ausgangszustand ---------- */
  function blank() {
    return {
      version: G.VERSION,
      createdAt: new Date().toISOString(),
      onboarded: false,

      /**
       * Die gemerkten Playlisten. Ein Eintrag:
       *   id        eigene Kennung
       *   name      Anzeigename
       *   kind      'url' | 'file' | 'text' | 'xtream'
       *   source    Adresse (url/xtream) oder Dateiname (file/text)
       *   note      freier Hinweis
       *   count     Anzahl Sender beim letzten Laden
       *   updatedAt wann zuletzt geladen
       *   error     letzte Fehlermeldung, falls das Laden misslang
       */
      playlists: [],

      /** Kennung der gerade geoeffneten Playlist. */
      activeId: null,

      /** Einzeln eingetragene Sender - ohne Umweg ueber eine Playlist. */
      channels: [],

      /** Die mit dem Stern markierten Sender. */
      favorites: [],

      /** Zuletzt gesehen - neueste zuerst. */
      recent: [],

      /** Der zuletzt gespielte Sender, fuer "weitersehen". */
      last: null,

      settings: {
        volume: 80,
        muted: false,
        autoplay: true,          // beim Antippen sofort abspielen
        resume: false,           // beim Start den letzten Sender laden
        reduceMotion: false,
        confirmExternal: true,   // vor dem Oeffnen in einer anderen App fragen
        proxyOn: false,
        proxy: '',               // eigener Vermittler, z. B. https://…/?url={url}
        proxyStreams: false,     // auch die Streams über den Vermittler holen
        autoRefreshDays: 0       // 0 = nie von selbst neu laden
      }
    };
  }

  var state = blank();

  /* ---------- Persistenz ---------- */
  function readRaw(key) {
    try { return localStorage.getItem(key); }
    catch (e) { storageOk = false; return null; }
  }
  function writeRaw(key, val) {
    try { localStorage.setItem(key, val); return true; }
    catch (e) { storageOk = false; return false; }
  }
  function removeRaw(key) {
    try { localStorage.removeItem(key); } catch (e) { /* egal */ }
  }

  function save() {
    writeRaw(KEY, JSON.stringify({
      version: state.version,
      createdAt: state.createdAt,
      onboarded: state.onboarded,
      playlists: state.playlists,
      activeId: state.activeId,
      channels: state.channels,
      favorites: state.favorites,
      recent: state.recent,
      last: state.last,
      settings: state.settings
    }));
  }

  function load() {
    var raw = readRaw(KEY);

    // Was noch unter dem alten Namen liegt, wird einmal uebernommen - sonst
    // waeren Playlisten und Favoriten nach der Umbenennung scheinbar weg.
    // Beide Namen wohnen im selben Ursprung, deshalb genuegt das Umhaengen.
    if (!raw) {
      raw = readRaw(KEY_ALT);
      if (raw) {
        writeRaw(KEY, raw);
        removeRaw(KEY_ALT);
      }
    }

    if (!raw) return state;

    try {
      var d = JSON.parse(raw);
      state.createdAt = d.createdAt || state.createdAt;
      state.onboarded = !!d.onboarded;
      state.playlists = Array.isArray(d.playlists) ? d.playlists : [];
      state.activeId = d.activeId || null;
      state.channels = Array.isArray(d.channels) ? d.channels : [];
      state.favorites = Array.isArray(d.favorites) ? d.favorites : [];
      state.recent = Array.isArray(d.recent) ? d.recent : [];
      state.last = d.last || null;
      if (d.settings) Object.assign(state.settings, d.settings);
    } catch (e) {
      G.u.toast('Gespeicherte Daten unlesbar', 'G04TV startet mit einer leeren Ablage.', 'warn');
    }
    return state;
  }

  /* ---------- Aenderungen melden ---------- */
  function emit(reason) {
    listeners.forEach(function (fn) {
      try { fn(state, reason); } catch (e) { console.error(e); }
    });
  }

  function commit(reason) {
    save();
    emit(reason || 'change');
  }

  function subscribe(fn) {
    listeners.push(fn);
    return function () {
      var i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  /* ---------- Playlisten ---------- */
  function playlist(id) {
    return state.playlists.filter(function (p) { return p.id === id; })[0] || null;
  }

  function activePlaylist() {
    return playlist(state.activeId);
  }

  /** Steht diese Quelle schon in der Liste? */
  function knownSource(source) {
    return state.playlists.filter(function (p) { return G.m3u.sameSource(p.source, source); })[0] || null;
  }

  /**
   * Traegt eine Playlist ein. Die Sender kommen getrennt ueber
   * setChannels dazu - erst danach ist der Eintrag vollstaendig.
   */
  function addPlaylist(entry) {
    var item = {
      id: G.u.uid('pl'),
      name: entry.name || G.m3u.nameFromSource(entry.source),
      kind: entry.kind || 'url',
      source: entry.source || '',
      note: entry.note || '',
      count: 0,
      addedAt: new Date().toISOString(),
      updatedAt: null,
      error: ''
    };
    state.playlists.push(item);
    if (!state.activeId) state.activeId = item.id;
    commit('playlists');
    return item;
  }

  /** Legt die Sender einer Playlist ab und schreibt die Kopfdaten fort. */
  async function setChannels(id, channels) {
    var p = playlist(id);
    if (!p) return false;

    var stored = await G.db.put(id, channels);

    p.count = channels.length;
    p.updatedAt = new Date().toISOString();
    p.error = '';
    p.volatile = !stored;   // nur im Arbeitsspeicher gelandet
    commit('playlists');
    return stored;
  }

  function getChannels(id) {
    return G.db.get(id);
  }

  function setPlaylistError(id, message) {
    var p = playlist(id);
    if (!p) return;
    p.error = String(message || '');
    commit('playlists');
  }

  function renamePlaylist(id, name) {
    var p = playlist(id);
    if (!p) return;
    p.name = String(name || '').trim() || p.name;
    commit('playlists');
  }

  async function removePlaylist(id) {
    state.playlists = state.playlists.filter(function (p) { return p.id !== id; });
    if (state.activeId === id) state.activeId = state.playlists.length ? state.playlists[0].id : null;
    await G.db.del(id);
    commit('playlists');
  }

  function setActive(id) {
    if (state.activeId === id) return;
    state.activeId = id;
    commit('active');
  }

  /* ---------- Einzelne Sender ---------- */
  function addChannel(channel) {
    var item = {
      name: channel.name || G.m3u.nameFromSource(channel.url),
      url: String(channel.url || '').trim(),
      group: channel.group || 'Eigene Sender',
      logo: channel.logo || '',
      addedAt: new Date().toISOString()
    };
    if (!item.url) return null;

    // Was schon dasteht, kommt nicht zweimal vor.
    if (state.channels.some(function (c) { return G.m3u.sameSource(c.url, item.url); })) return null;

    state.channels.push(item);
    commit('channels');
    return item;
  }

  function removeChannel(url) {
    state.channels = state.channels.filter(function (c) { return !G.m3u.sameSource(c.url, url); });
    commit('channels');
  }

  /* ---------- Favoriten ---------- */
  function isFavorite(url) {
    return state.favorites.some(function (f) { return G.m3u.sameSource(f.url, url); });
  }

  /**
   * Setzt oder loescht den Stern. Gibt zurueck, ob der Sender danach
   * markiert ist.
   */
  function toggleFavorite(channel) {
    if (!channel || !channel.url) return false;

    if (isFavorite(channel.url)) {
      state.favorites = state.favorites.filter(function (f) { return !G.m3u.sameSource(f.url, channel.url); });
      commit('favorites');
      return false;
    }

    state.favorites.push({
      name: channel.name || G.m3u.nameFromSource(channel.url),
      url: channel.url,
      group: channel.group || '',
      logo: channel.logo || '',
      addedAt: new Date().toISOString()
    });
    commit('favorites');
    return true;
  }

  /** Verschiebt einen Favoriten in der eigenen Reihenfolge. */
  function moveFavorite(url, delta) {
    var i = state.favorites.findIndex(function (f) { return G.m3u.sameSource(f.url, url); });
    if (i < 0) return;
    var j = G.u.clamp(i + delta, 0, state.favorites.length - 1);
    if (i === j) return;
    var item = state.favorites.splice(i, 1)[0];
    state.favorites.splice(j, 0, item);
    commit('favorites');
  }

  /* ---------- Verlauf ---------- */
  function pushRecent(channel) {
    if (!channel || !channel.url) return;

    var item = {
      name: channel.name || '',
      url: channel.url,
      group: channel.group || '',
      logo: channel.logo || '',
      at: new Date().toISOString()
    };

    state.recent = [item].concat(
      state.recent.filter(function (r) { return !G.m3u.sameSource(r.url, item.url); })
    ).slice(0, MAX_RECENT);

    state.last = item;
    commit('recent');
  }

  function clearRecent() {
    state.recent = [];
    state.last = null;
    commit('recent');
  }

  /* ---------- Einstellungen ---------- */
  function setSetting(key, value) {
    if (!(key in state.settings)) return;
    state.settings[key] = value;
    commit('settings');
  }

  /** Der Vermittler, wenn einer eingeschaltet ist - sonst leer. */
  function proxy() {
    return state.settings.proxyOn ? String(state.settings.proxy || '').trim() : '';
  }

  /**
   * Baut die Adresse, unter der eine Quelle ueber den Vermittler laeuft.
   * Der Platzhalter <c>{url}</c> wird ersetzt; fehlt er, wird die Adresse
   * hinten angehaengt. Ohne Vermittler kommt die Adresse unveraendert zurueck.
   */
  function viaProxy(url) {
    var p = proxy();
    var text = String(url || '').trim();
    if (!p || !text) return text;

    return p.indexOf('{url}') >= 0
      ? p.replace('{url}', encodeURIComponent(text))
      : p + encodeURIComponent(text);
  }

  /**
   * Dasselbe fuer einen Stream - aber nur, wenn das ausdruecklich
   * eingeschaltet ist. Die Playlist einmal zu holen ist harmlos; jeden
   * Sender ueber den Vermittler zu spielen, schickt die gesamte Bandbreite
   * ueber ihn.
   */
  function streamViaProxy(url) {
    return state.settings.proxyStreams ? viaProxy(url) : String(url || '').trim();
  }

  /* ---------- Sicherung ---------- */
  function exportAll(withSecrets) {
    var lists = state.playlists.map(function (p) {
      var copy = Object.assign({}, p);
      // Ein Xtream-Zugang traegt das Kennwort in der Adresse. Wer die
      // Sicherung weitergibt, gibt sonst seinen Zugang mit.
      if (!withSecrets && G.xtream.hasSecret(copy.source)) copy.source = G.xtream.masked(copy.source);
      return copy;
    });

    return JSON.stringify({
      app: 'G04TV',
      version: state.version,
      exportedAt: new Date().toISOString(),
      containsSecrets: !!withSecrets,
      playlists: lists,
      channels: state.channels,
      favorites: state.favorites,
      recent: state.recent,
      settings: state.settings
    }, null, 2);
  }

  /**
   * Liest eine Sicherung ein. Die Senderlisten selbst stehen nicht darin -
   * sie werden beim naechsten Aktualisieren wieder geholt.
   */
  function importAll(json) {
    var d = JSON.parse(json);
    if (!d || d.app !== 'G04TV') throw new Error('Keine G04TV-Sicherung.');

    if (Array.isArray(d.playlists)) {
      d.playlists.forEach(function (p) {
        if (!p || !p.source) return;
        if (String(p.source).indexOf('••••') >= 0) return;      // Kennwort war entfernt
        if (knownSource(p.source)) return;
        state.playlists.push({
          id: G.u.uid('pl'),
          name: p.name || G.m3u.nameFromSource(p.source),
          kind: p.kind || 'url',
          source: p.source,
          note: p.note || '',
          count: 0,
          addedAt: new Date().toISOString(),
          updatedAt: null,
          error: ''
        });
      });
    }

    if (Array.isArray(d.channels)) {
      d.channels.forEach(function (c) { if (c && c.url) addChannelQuiet(c); });
    }
    if (Array.isArray(d.favorites)) {
      d.favorites.forEach(function (f) {
        if (f && f.url && !isFavorite(f.url)) state.favorites.push(f);
      });
    }
    if (d.settings) Object.assign(state.settings, d.settings);

    if (!state.activeId && state.playlists.length) state.activeId = state.playlists[0].id;
    state.onboarded = true;
    commit('import');
  }

  function addChannelQuiet(c) {
    if (state.channels.some(function (x) { return G.m3u.sameSource(x.url, c.url); })) return;
    state.channels.push({
      name: c.name || G.m3u.nameFromSource(c.url),
      url: c.url,
      group: c.group || 'Eigene Sender',
      logo: c.logo || '',
      addedAt: c.addedAt || new Date().toISOString()
    });
  }

  async function wipe() {
    removeRaw(KEY);
    await G.db.clear();
    state = blank();
    emit('wipe');
  }

  /** Nimmt Senderlisten heraus, zu denen es keine Playlist mehr gibt. */
  async function tidy() {
    var known = state.playlists.map(function (p) { return p.id; });
    var stored = await G.db.keys();
    await Promise.all(stored
      .filter(function (id) { return known.indexOf(id) < 0; })
      .map(function (id) { return G.db.del(id); }));
  }

  G.store = {
    get state() { return state; },
    blank: blank,
    load: load,
    save: save,
    commit: commit,
    subscribe: subscribe,

    playlist: playlist,
    activePlaylist: activePlaylist,
    knownSource: knownSource,
    addPlaylist: addPlaylist,
    setChannels: setChannels,
    getChannels: getChannels,
    setPlaylistError: setPlaylistError,
    renamePlaylist: renamePlaylist,
    removePlaylist: removePlaylist,
    setActive: setActive,

    addChannel: addChannel,
    removeChannel: removeChannel,

    isFavorite: isFavorite,
    toggleFavorite: toggleFavorite,
    moveFavorite: moveFavorite,

    pushRecent: pushRecent,
    clearRecent: clearRecent,

    setSetting: setSetting,
    proxy: proxy,
    viaProxy: viaProxy,
    streamViaProxy: streamViaProxy,

    exportAll: exportAll,
    importAll: importAll,
    wipe: wipe,
    tidy: tidy,

    get storageOk() { return storageOk; }
  };
})(G04TV);
