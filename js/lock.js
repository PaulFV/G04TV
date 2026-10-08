/* ============================================================
   G04TV — Sperre (Jugendschutz)

   Ein 4-stelliger Code schuetzt einzelne Sender, ganze Kategorien
   und ganze Playlisten. Gespeichert wird nicht der Code, nur ein
   Pruefwert (SHA-256 mit Salz). Nach richtiger Eingabe bleibt fuer
   15 Minuten alles offen; beim Schliessen der App ist es wieder zu.

   Greift an der einen Stelle, an der jeder Sender vorbeikommt:
   G.player.play. Damit sind Kacheln, Favoriten, Verlauf, das Bild,
   CarPlay und das Weitersehen beim Start gleichermassen abgedeckt.

   Grenze: alles liegt im Browser. Wer die Website-Daten loescht,
   loescht die Sperre (und mit ihr alle Playlisten) - gegen Kinder
   und Mitbenutzer reicht das, gegen Fachleute nicht.
   ============================================================ */
(function (G) {
  'use strict';
  var u = G.u;

  var KEY = 'g04tv.lock';
  var TRIES_KEY = 'g04tv.lockTries';
  var OPEN_MS = 15 * 60 * 1000;
  var MAX_TRIES = 5;

  var data = null;            // {algo, salt, hash, channels:[], groups:[], playlists:[]}
  var openUntil = 0;          // nur im Speicher: Schliessen der App sperrt wieder
  var members = {};           // urlKey -> true fuer Sender gesperrter Playlisten
  var readyResolve;
  var ready = new Promise(function (r) { readyResolve = r; });

  function tr(t) { return G.i18n ? G.i18n.t(t) : t; }
  function keyOf(url) { return String(url || '').trim().toLowerCase(); }

  /* ---------- Speicher ---------- */
  function load() {
    try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { data = null; }
    if (data) {
      data.channels = data.channels || [];
      data.groups = data.groups || [];
      data.playlists = data.playlists || [];
    }
  }
  function save() {
    try {
      if (data) localStorage.setItem(KEY, JSON.stringify(data));
      else localStorage.removeItem(KEY);
    } catch (e) { /* optional */ }
    document.dispatchEvent(new CustomEvent('g04tv:lock'));
  }

  function tries() {
    try { return JSON.parse(localStorage.getItem(TRIES_KEY) || '{"n":0,"until":0,"round":0}'); }
    catch (e) { return { n: 0, until: 0, round: 0 }; }
  }
  function setTries(t) { try { localStorage.setItem(TRIES_KEY, JSON.stringify(t)); } catch (e) { /* optional */ } }

  /* ---------- Pruefwert ---------- */
  async function digest(pin, salt, algo) {
    var text = salt + ':' + pin;
    if (algo === 'sha256' && window.crypto && crypto.subtle) {
      var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    }
    // Rueckfall ohne sicheren Kontext (z. B. file://): FNV-1a, 2000 Runden
    var h = 0x811c9dc5;
    for (var r = 0; r < 2000; r++) {
      for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
      text = h.toString(16) + text;
      text = text.slice(0, 64);
    }
    return 'f' + h.toString(16);
  }
  function newSalt() {
    var a = new Uint8Array(12);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256 | 0; });
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  async function check(pin) {
    if (!data) return false;
    return (await digest(pin, data.salt, data.algo)) === data.hash;
  }

  /* ---------- Sender gesperrter Playlisten ---------- */
  async function rebuildMembers() {
    members = {};
    if (!data || !data.playlists.length) return;
    for (var i = 0; i < data.playlists.length; i++) {
      var list = await G.library.channelsOf(data.playlists[i]);
      list.forEach(function (c) { members[keyOf(c.url)] = true; });
    }
  }

  /* ---------- Abfragen ---------- */
  function hasCode() { return !!(data && data.hash); }
  function isOpen() { return Date.now() < openUntil; }
  function channelLocked(url) { return !!data && data.channels.indexOf(keyOf(url)) >= 0; }
  function groupLocked(name) { return !!data && !!name && data.groups.indexOf(name) >= 0; }
  function playlistLocked(id) { return !!data && data.playlists.indexOf(id) >= 0; }

  /** Ist der Sender gesperrt - direkt, ueber seine Kategorie oder seine Playlist? */
  function isLocked(c) {
    if (!hasCode() || !c) return false;
    return channelLocked(c.url) || groupLocked(c.group) || !!members[keyOf(c.url)];
  }
  /** Warum gesperrt? 'channel' | 'group' | 'playlist' | '' */
  function reason(c) {
    if (!hasCode() || !c) return '';
    if (channelLocked(c.url)) return 'channel';
    if (groupLocked(c.group)) return 'group';
    if (members[keyOf(c.url)]) return 'playlist';
    return '';
  }

  /* ------------------------------------------------------------
     Zahlenfeld
     ------------------------------------------------------------ */
  var active = null;

  /**
   * Zeigt das Zahlenfeld. opts.title / opts.text; opts.verify(pin) ->
   * Promise<true|false|'retry'>. Liefert den eingegebenen Code oder null.
   */
  function pad(opts) {
    if (active) active.close(null);
    return new Promise(function (resolve) {
      var pin = '';
      var el = u.el(
        '<div class="pin" role="dialog" aria-modal="true">' +
          '<div class="pin__box">' +
            '<div class="pin__ic">' + u.icon('lock', 26) + '</div>' +
            '<b class="pin__title">' + u.esc(tr(opts.title || 'Code eingeben')) + '</b>' +
            '<p class="pin__text">' + u.esc(tr(opts.text || '')) + '</p>' +
            '<div class="pin__dots"><i></i><i></i><i></i><i></i></div>' +
            '<p class="pin__msg" aria-live="polite"></p>' +
            '<div class="pin__keys">' +
              [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<button type="button" data-k="' + n + '">' + n + '</button>'; }).join('') +
              '<button type="button" class="pin__aux" data-k="x">' + u.esc(tr('Abbrechen')) + '</button>' +
              '<button type="button" data-k="0">0</button>' +
              '<button type="button" class="pin__aux" data-k="b" aria-label="' + u.esc(tr('Löschen')) + '">⌫</button>' +
            '</div>' +
          '</div>' +
        '</div>');
      document.body.appendChild(el);
      var dots = el.querySelectorAll('.pin__dots i');
      var msg = el.querySelector('.pin__msg');
      var busy = false;

      function paint() { dots.forEach(function (d, i) { d.classList.toggle('is-on', i < pin.length); }); }
      function say(t, bad) { msg.textContent = t ? tr(t) : ''; msg.classList.toggle('is-err', !!bad); }

      function lockoutLeft() {
        var t = tries();
        return Math.max(0, Math.ceil((t.until - Date.now()) / 1000));
      }
      function showLockout() {
        var s = lockoutLeft();
        if (!s) { say(''); return false; }
        say(tr('Zu viele Versuche. Bitte warten:') + ' ' + s + ' s', true);
        setTimeout(function () { if (active === api) showLockout(); }, 1000);
        return true;
      }

      async function submit() {
        if (!opts.verify) { close(pin); return; }
        busy = true;
        var ok = await opts.verify(pin);
        busy = false;
        if (ok === true) { close(pin); return; }
        if (ok === 'retry') { pin = ''; paint(); return; }   // z. B. zweite Eingabe beim Festlegen
        el.querySelector('.pin__box').classList.remove('is-shake');
        void el.offsetWidth;
        el.querySelector('.pin__box').classList.add('is-shake');
        pin = ''; paint();
        if (opts.countTries !== false) {
          var t = tries(); t.n++;
          if (t.n >= MAX_TRIES) { t.round = (t.round || 0) + 1; t.until = Date.now() + 60000 * Math.pow(2, t.round - 1); t.n = 0; }
          setTries(t);
          if (!showLockout()) say(typeof ok === 'string' ? ok : 'Falscher Code', true);
        } else {
          say(typeof ok === 'string' ? ok : 'Falscher Code', true);
        }
      }

      function key(k) {
        if (busy) return;
        if (k === 'x') { close(null); return; }
        if (opts.countTries !== false && lockoutLeft()) { showLockout(); return; }
        if (k === 'b') { pin = pin.slice(0, -1); paint(); return; }
        if (pin.length >= 4) return;
        pin += k; paint(); say('');
        if (pin.length === 4) setTimeout(submit, 120);
      }

      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-k]');
        if (b) key(b.getAttribute('data-k'));
        else if (e.target === el) close(null);
      });
      function onKey(e) {
        if (/^[0-9]$/.test(e.key)) { e.preventDefault(); key(e.key); }
        else if (e.key === 'Backspace') { e.preventDefault(); key('b'); }
        else if (e.key === 'Escape') { e.preventDefault(); close(null); }
      }
      document.addEventListener('keydown', onKey, true);

      function close(v) {
        document.removeEventListener('keydown', onKey, true);
        el.classList.add('is-out');
        setTimeout(function () { el.remove(); }, 180);
        if (active === api) active = null;
        resolve(v);
      }
      var api = { close: close, set: function (o) { opts = Object.assign(opts, o); el.querySelector('.pin__title').textContent = tr(opts.title); el.querySelector('.pin__text').textContent = tr(opts.text || ''); } };
      active = api;
      paint();
      if (opts.countTries !== false) showLockout();
      if (opts.message) say(opts.message);
    });
  }

  /* ------------------------------------------------------------
     Ablaeufe
     ------------------------------------------------------------ */

  /** Code abfragen (falls noetig) und die 15 Minuten oeffnen. */
  async function ask(text) {
    if (!hasCode() || isOpen()) return true;
    var pin = await pad({
      title: 'Gesperrt',
      text: text || 'Code eingeben, um fortzufahren.',
      verify: async function (p) { return (await check(p)) || false; }
    });
    if (pin == null) return false;
    setTries({ n: 0, until: 0, round: 0 });
    openUntil = Date.now() + OPEN_MS;
    document.dispatchEvent(new CustomEvent('g04tv:lock'));
    return true;
  }

  /** Vor dem Abspielen: frei, offen oder Code richtig? */
  async function guard(c) {
    await ready;
    if (!isLocked(c) || isOpen()) return true;
    return ask(tr('„%s“ ist gesperrt. Code eingeben zum Ansehen.').replace('%s', c.name || ''));
  }

  /** Neuen Code festlegen (zweimal eingeben). */
  async function setCode() {
    var first = null;
    var pin = await pad({
      title: 'Neuen Code festlegen', text: '4 Ziffern wählen.', countTries: false,
      verify: function (p) {
        if (first == null) {
          first = p;
          if (active) active.set({ title: 'Code wiederholen', text: 'Zur Sicherheit noch einmal.' });
          return Promise.resolve('retry');
        }
        if (p === first) return Promise.resolve(true);
        first = null;
        if (active) active.set({ title: 'Neuen Code festlegen', text: '4 Ziffern wählen.' });
        return Promise.resolve('Die Codes stimmen nicht überein. Noch einmal.');
      }
    });
    if (pin == null) return false;
    var algo = (window.crypto && crypto.subtle) ? 'sha256' : 'fnv';
    var salt = newSalt();
    var keep = data || { channels: [], groups: [], playlists: [] };
    data = { algo: algo, salt: salt, hash: await digest(pin, salt, algo),
      channels: keep.channels, groups: keep.groups, playlists: keep.playlists };
    setTries({ n: 0, until: 0, round: 0 });
    openUntil = Date.now() + OPEN_MS;
    save();
    return true;
  }

  /** Code aendern: alten pruefen (auch wenn gerade offen), dann neu festlegen. */
  async function changeCode() {
    var ok = await pad({ title: 'Aktuellen Code eingeben', text: 'Danach legst du den neuen fest.',
      verify: async function (p) { return (await check(p)) || false; } });
    if (ok == null) return false;
    return setCode();
  }

  /** Sperre ganz aufheben: Code und alle Sperren loeschen. */
  async function removeCode() {
    var ok = await pad({ title: 'Sperre aufheben', text: 'Code eingeben. Danach ist nichts mehr gesperrt.',
      verify: async function (p) { return (await check(p)) || false; } });
    if (ok == null) return false;
    data = null; openUntil = 0; members = {};
    save();
    return true;
  }

  function relock() { openUntil = 0; document.dispatchEvent(new CustomEvent('g04tv:lock')); }

  /* ---------- Sperren an/aus (braucht den Code) ---------- */
  async function needCode() {
    if (!hasCode()) {
      u.toast(tr('Erst einen Code festlegen'), tr('Einstellungen › Sperre'), 'warn', 3500);
      return false;
    }
    return ask('Code eingeben, um Sperren zu ändern.');
  }
  function flip(arr, v) { var i = arr.indexOf(v); if (i >= 0) { arr.splice(i, 1); return false; } arr.push(v); return true; }

  async function toggleChannel(c) {
    if (!(await needCode())) return null;
    var on = flip(data.channels, keyOf(c.url)); save(); return on;
  }
  async function toggleGroup(name) {
    if (!(await needCode())) return null;
    var on = flip(data.groups, name); save(); return on;
  }
  async function togglePlaylist(id) {
    if (!(await needCode())) return null;
    var on = flip(data.playlists, id);
    await rebuildMembers();
    save(); return on;
  }

  function counts() {
    return data ? { channels: data.channels.length, groups: data.groups.length, playlists: data.playlists.length }
      : { channels: 0, groups: 0, playlists: 0 };
  }

  /* ------------------------------------------------------------
     Einhaengen: Abspielen absichern
     ------------------------------------------------------------ */
  function wrapPlayer() {
    var original = G.player.play;
    G.player.play = async function (c) {
      if (!(await guard(c))) return;
      return original.apply(this, arguments);
    };
  }

  load();
  wrapPlayer();
  // Sender gesperrter Playlisten ermitteln, sobald die Bibliothek bereit ist
  setTimeout(function () { rebuildMembers().then(readyResolve, readyResolve); }, 0);
  // Playlist aktualisiert/ersetzt: Mitglieder neu bestimmen
  G.store.subscribe(function (st, why) {
    if (why === 'wipe') { G.lock.forget(); return; }
    if (data && data.playlists.length) rebuildMembers();
  });

  G.lock = {
    ready: ready,
    hasCode: hasCode, isOpen: isOpen, isLocked: isLocked, reason: reason,
    channelLocked: channelLocked, groupLocked: groupLocked, playlistLocked: playlistLocked,
    ask: ask, guard: guard, setCode: setCode, changeCode: changeCode, removeCode: removeCode, relock: relock,
    toggleChannel: toggleChannel, toggleGroup: toggleGroup, togglePlaylist: togglePlaylist,
    counts: counts, openMinutes: OPEN_MS / 60000,
    openLeft: function () { return Math.max(0, openUntil - Date.now()); },
    forget: function () { data = null; openUntil = 0; members = {}; try { localStorage.removeItem(KEY); localStorage.removeItem(TRIES_KEY); } catch (e) { /* optional */ } }
  };
})(G04TV);
