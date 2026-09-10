/* ============================================================
   G04TV — Ablage der Senderlisten

   Eine Playlist hat schnell zehntausend Sender; das sprengt den
   localStorage, in dem alles Uebrige liegt. Die Senderlisten
   selbst kommen deshalb in eine IndexedDB - Kopfdaten der
   Playlists, Favoriten und Einstellungen bleiben im localStorage
   (siehe store.js).

   Verweigert der Browser die Datenbank (privates Fenster, harte
   Einstellungen), haelt dieses Modul die Listen im Arbeitsspeicher.
   Die App laeuft dann weiter, vergisst die Sender aber beim
   Schliessen - store.js meldet das.
   ============================================================ */
(function (G) {
  'use strict';

  // Der Name bleibt, obwohl die App inzwischen G04TV heisst: eine
  // IndexedDB laesst sich nicht umbenennen. Ein neuer Name waere eine neue,
  // leere Datenbank - alle abgelegten Senderlisten waeren fort und muessten
  // erst wieder geholt werden. Der Name ist nach aussen ohnehin unsichtbar.
  var DB_NAME = 'gotv';
  var DB_VERSION = 1;
  var STORE = 'channels';

  var memory = {};          // Rueckfallebene ohne IndexedDB
  var available = true;     // steht die Datenbank zur Verfuegung?
  var opening = null;

  function open() {
    if (opening) return opening;

    opening = new Promise(function (resolve, reject) {
      if (!('indexedDB' in window)) { reject(new Error('IndexedDB fehlt')); return; }

      var req;
      try { req = indexedDB.open(DB_NAME, DB_VERSION); }
      catch (e) { reject(e); return; }

      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('IndexedDB nicht verfügbar')); };
      req.onblocked = function () { reject(new Error('IndexedDB blockiert')); };
    }).catch(function (e) {
      available = false;
      opening = null;          // spaeter darf es erneut versucht werden
      throw e;
    });

    return opening;
  }

  function tx(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, mode);
        var store = t.objectStore(STORE);
        var out;
        try { out = fn(store); } catch (e) { reject(e); return; }
        // Bei einer Abfrage steht das Ergebnis erst am Ende der Transaktion fest.
        t.oncomplete = function () { resolve(out instanceof IDBRequest ? out.result : out); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error || new Error('abgebrochen')); };
      });
    });
  }

  /** Legt die Sender einer Playlist ab. */
  async function put(id, channels) {
    var record = { id: id, savedAt: new Date().toISOString(), channels: channels || [] };
    try {
      await tx('readwrite', function (store) { store.put(record); });
      delete memory[id];
      return true;
    } catch (e) {
      memory[id] = record;
      return false;
    }
  }

  /** Holt die Sender einer Playlist - oder null. */
  async function get(id) {
    if (memory[id]) return memory[id].channels;
    try {
      var rec = await tx('readonly', function (store) { return store.get(id); });
      return rec ? rec.channels : null;
    } catch (e) {
      return null;
    }
  }

  /** Nimmt eine Senderliste heraus. */
  async function del(id) {
    delete memory[id];
    try { await tx('readwrite', function (store) { store.delete(id); }); return true; }
    catch (e) { return false; }
  }

  /** Alle abgelegten Kennungen - zum Aufraeumen verwaister Listen. */
  async function keys() {
    try {
      var all = await tx('readonly', function (store) { return store.getAllKeys(); });
      return (all || []).concat(Object.keys(memory));
    } catch (e) {
      return Object.keys(memory);
    }
  }

  /** Loescht alle Senderlisten. */
  async function clear() {
    memory = {};
    try { await tx('readwrite', function (store) { store.clear(); }); return true; }
    catch (e) { return false; }
  }

  /** Wie viel Platz die App belegt - sofern der Browser es verraet. */
  async function usage() {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        var est = await navigator.storage.estimate();
        return { used: est.usage || 0, quota: est.quota || 0 };
      }
    } catch (e) { /* nicht schlimm */ }
    return null;
  }

  G.db = {
    put: put,
    get: get,
    del: del,
    keys: keys,
    clear: clear,
    usage: usage,
    get available() { return available; },
    /** Prueft einmal, ob die Datenbank ueberhaupt aufgeht. */
    probe: function () { return open().then(function () { return true; }, function () { return false; }); }
  };
})(G04TV);
