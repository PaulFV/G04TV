/* ============================================================
   G04TV — Teilen

   Favoriten und Playlisten lassen sich als Datei, als Link oder als
   QR-Code weitergeben - ohne Server. Der Inhalt steckt selbst im Link
   (hinter dem #), und der geht nie an einen Server.

   Der Ablauf ist der aus G04Musik (SHARING_FEATURE_PROMPT), mit drei
   Unterschieden:
     - Erst lesen und prüfen, dann nachfragen, dann importieren.
     - UTF-8 statt btoa(json): Umlaute und kyrillische Sendernamen
       würden btoa sonst abbrechen lassen.
     - Der QR-Code kommt von qrcode-generator (bis Version 40); die
       Bibliothek aus der Anleitung fasst nur etwa 270 Zeichen.

   Achtung: Adressen von Xtream-Anbietern tragen Benutzer und Kennwort.
   Wer so einen Link, QR-Code oder eine Datei bekommt, bekommt den
   Zugang mit - darauf weist das Blatt vorher hin.
   ============================================================ */
(function (G) {
  'use strict';
  var u = G.u;

  // Erst neben der App, dann aus dem Netz (mit Prüfsumme, damit niemand
  // dem Netz etwas anderes unterschieben kann).
  var QR_LOCAL = 'vendor/qrcode.js';
  var QR_CDN = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
  var QR_SRI = 'sha384-8FWZA6BGMXhsfO+BLtrJK0We6gg5o1JyO8xQm6peWDEUs17ACA5ziE/NIAkl9z2k';

  var QR_MAX = 1200;                 // Zeichen im Link, die sich noch gut scannen lassen
  var MAX_ITEMS = 1000;              // Favoriten je Link
  var MAX_LISTS = 20;                // Playlisten je Link
  var MAX_BYTES = 2 * 1024 * 1024;   // entpackt höchstens so viel (Schutz vor Zip-Bomben)
  var MAX_LINK = 400000;             // Zeichen, die ein Link höchstens haben darf

  var pending = '';                  // Link, der nach dem Start noch zu importieren ist

  function tr(text) { return G.i18n ? G.i18n.t(text) : text; }

  /* ------------------------------------------------------------
     Kodieren: JSON -> UTF-8 -> (deflate) -> base64url
     ------------------------------------------------------------ */
  function toB64Url(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function fromB64Url(text) {
    var b = String(text).replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    var s = atob(b);
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  async function pipe(bytes, stream) {
    var buf = await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer();
    return new Uint8Array(buf);
  }

  /** Entpacken mit Obergrenze - ein kleiner Link darf nicht zu Gigabytes werden. */
  async function inflate(bytes) {
    var reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    var parts = [], total = 0;
    for (;;) {
      var step = await reader.read();
      if (step.done) break;
      total += step.value.length;
      if (total > MAX_BYTES) { try { reader.cancel(); } catch (e) { /* egal */ } throw new Error('Der Link ist zu groß.'); }
      parts.push(step.value);
    }
    var out = new Uint8Array(total), at = 0;
    parts.forEach(function (p) { out.set(p, at); at += p.length; });
    return out;
  }

  /** 'z' = gepackt, 'p' = unverändert (wo der Browser nicht packen kann). */
  async function encode(obj) {
    var bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (typeof CompressionStream === 'function') {
      try { return 'z' + toB64Url(await pipe(bytes, new CompressionStream('deflate-raw'))); }
      catch (e) { /* dann ungepackt */ }
    }
    return 'p' + toB64Url(bytes);
  }

  async function decode(text) {
    var s = String(text || '').trim();
    if (!/^[pz][A-Za-z0-9_-]+$/.test(s) || s.length > MAX_LINK) throw new Error('Das ist kein gültiger G04TV-Link.');
    if (s.charAt(0) === 'z' && typeof DecompressionStream !== 'function') {
      throw new Error('Dieser Browser kann den Link nicht entpacken. Bitte die Datei nehmen.');
    }
    var bytes;
    try {
      bytes = fromB64Url(s.slice(1));
      if (s.charAt(0) === 'z') bytes = await inflate(bytes);
      else if (bytes.length > MAX_BYTES) throw new Error('Der Link ist zu groß.');
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
      if (e && e.message === 'Der Link ist zu groß.') throw e;
      throw new Error('Der Link ist beschädigt oder unvollständig.');
    }
  }

  /* ------------------------------------------------------------
     Prüfen: alles aus einem fremden Link ist erst einmal Text
     ------------------------------------------------------------ */
  function clean(value, max) {
    return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
  }
  function okUrl(text) { return text.length <= 2000 && /^https?:\/\/[^\s]+$/i.test(text); }

  /** Macht aus dem entpackten Inhalt geprüfte Favoriten und Playlisten - oder wirft. */
  function parse(obj) {
    if (!obj || obj.app !== 'G04TV') throw new Error('Das ist kein G04TV-Link.');

    var favorites = [], playlists = [], skipped = 0;

    (Array.isArray(obj.favorites) ? obj.favorites : []).slice(0, MAX_ITEMS).forEach(function (f) {
      var url = clean(f && f.url, 2000);
      if (!okUrl(url)) { skipped++; return; }
      var logo = clean(f.logo, 500);
      favorites.push({
        name: clean(f.name, 200) || G.m3u.nameFromSource(url),
        url: url,
        group: clean(f.group, 100),
        logo: okUrl(logo) ? logo : ''
      });
    });

    (Array.isArray(obj.playlists) ? obj.playlists : []).slice(0, MAX_LISTS).forEach(function (p) {
      var source = clean(p && p.source, 2000);
      // Ein Kennwort, das beim Teilen entfernt wurde, lässt sich nicht laden
      if (!okUrl(source) || source.indexOf('••••') >= 0) { skipped++; return; }
      playlists.push({
        name: clean(p.name, 120) || G.m3u.nameFromSource(source),
        source: source,
        kind: p.kind === 'xtream' ? 'xtream' : 'url'
      });
    });

    if (!favorites.length && !playlists.length) throw new Error('Im Link steckt nichts zum Importieren.');
    return { favorites: favorites, playlists: playlists, skipped: skipped };
  }

  /* ------------------------------------------------------------
     Importieren - erst fragen, dann eintragen
     ------------------------------------------------------------ */
  function hostOf(url) {
    try { return new URL(url).host; } catch (e) { return ''; }
  }

  async function importParsed(p) {
    var st = G.store;
    var newFavs = p.favorites.filter(function (f) { return !st.isFavorite(f.url); });
    var newPls = p.playlists.filter(function (x) { return !st.knownSource(x.source); });

    if (!newFavs.length && !newPls.length) {
      u.toast(tr('Nichts Neues'), tr('Das steht schon alles auf diesem Gerät.'), 'ok', 3200);
      return false;
    }

    var lines = [];
    if (newFavs.length) {
      lines.push('<b>' + u.fmtInt(newFavs.length) + ' ' + tr(newFavs.length === 1 ? 'Favorit' : 'Favoriten') + '</b>');
    }
    newPls.forEach(function (x) {
      lines.push('<b>' + tr('Playlist') + ':</b> ' + u.esc(x.name) +
        ' <span class="tiny dim">(' + u.esc(hostOf(x.source)) + ')</span>');
    });
    if (p.skipped) lines.push('<span class="tiny dim">' + u.fmtInt(p.skipped) + ' ' + tr('ungültige Einträge übersprungen') + '</span>');

    var ok = await u.confirmSheet({
      title: tr('Importieren?'),
      danger: false,
      ok: tr('Importieren'),
      body: lines.join('<br>') + '<br><br>' +
        tr('Der Inhalt kommt aus einem fremden Link oder einer fremden Datei. Importiere nur, was du erwartest.')
    });
    if (!ok) return false;

    var nf = st.addFavorites(newFavs);
    var ids = newPls.map(function (x) {
      return st.addPlaylist({ name: x.name, source: x.source, kind: x.kind, note: '' }).id;
    });

    var parts = [];
    if (nf) parts.push(u.fmtInt(nf) + ' ' + tr(nf === 1 ? 'Favorit' : 'Favoriten'));
    if (ids.length) parts.push(u.fmtInt(ids.length) + ' ' + tr(ids.length === 1 ? 'Playlist' : 'Playlisten'));
    u.toast(tr('Importiert'), parts.join(' · '), 'ok', 4200);
    if (G.app && G.app.rerender) G.app.rerender();

    // Die Sender der neuen Playlisten nacheinander im Hintergrund holen
    ids.reduce(function (chain, id) {
      return chain.then(function () { return G.library.refresh(id); }).catch(function () { /* steht dann an der Playlist */ });
    }, Promise.resolve());
    return true;
  }

  /** Link beim Start abholen und aus der Adresszeile nehmen (er soll nicht im Verlauf bleiben). */
  function take() {
    var h = location.hash || '';
    if (h.indexOf('#share/') !== 0) return;
    pending = h.slice(7);
    try { history.replaceState(null, '', '#start'); } catch (e) { /* egal */ }
  }

  async function processPending() {
    if (!pending) return;
    var text = pending;
    pending = '';
    try { await importParsed(parse(await decode(text))); }
    catch (e) { u.toast(tr('Link ungültig'), tr(String((e && e.message) || e)), 'warn', 5000); }
  }

  /** Eine geteilte Datei einlesen. true, wenn es eine war (auch wenn abgebrochen wurde). */
  async function importText(text) {
    var obj;
    try { obj = JSON.parse(text); } catch (e) { return false; }
    if (!obj || obj.app !== 'G04TV' || obj.share !== 1) return false;
    try { await importParsed(parse(obj)); }
    catch (e) { u.toast(tr('Datei ungültig'), tr(String((e && e.message) || e)), 'warn', 5000); }
    return true;
  }

  /* ------------------------------------------------------------
     Teilen
     ------------------------------------------------------------ */
  function hasSecret(url) {
    if (G.xtream.hasSecret(url)) return true;
    // host/live/benutzer/kennwort/123.ts - Benutzer und Kennwort stehen im Pfad
    return /^https?:\/\/[^/]+\/(?:(?:live|movie|series)\/)?[^/?#]+\/[^/?#]+\/\d+(?:\.\w+)?(?:[?#]|$)/i.test(url);
  }

  /** Auf dem Handy über „Teilen“ (AirDrop, WhatsApp ...), sonst als Download. */
  function saveFile(name, text) {
    var blob = new Blob([text], { type: 'application/json' });
    function download() { return Promise.resolve(u.download(name, text, 'application/json')); }
    try {
      var file = new File([blob], name, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && /iP(hone|ad|od)|Android/.test(navigator.userAgent)) {
        return navigator.share({ files: [file], title: name }).then(function () { return true; })
          .catch(function (e) { return e && e.name === 'AbortError' ? false : download(); });
      }
    } catch (e) { /* dann Download */ }
    return download();
  }

  var qrLoading = null;
  function loadScript(src, sri) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      if (sri) { s.integrity = sri; s.crossOrigin = 'anonymous'; }
      s.onload = function () { resolve(); };
      s.onerror = function () { s.remove(); reject(new Error('nicht ladbar')); };
      document.head.appendChild(s);
    });
  }
  function ensureQr() {
    if (window.qrcode) return Promise.resolve(true);
    if (!qrLoading) {
      qrLoading = loadScript(QR_LOCAL).catch(function () { })
        .then(function () { return window.qrcode ? null : loadScript(QR_CDN, QR_SRI).catch(function () { }); })
        .then(function () { var ok = !!window.qrcode; if (!ok) qrLoading = null; return ok; });
    }
    return qrLoading;
  }

  function qrSvg(text) {
    var q = window.qrcode(0, 'L');
    q.addData(text);
    q.make();
    return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }

  function fileSafe(name) {
    return String(name || 'G04TV').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'G04TV';
  }

  /**
   * Öffnet das Teilen-Blatt.
   * @param {{title:string, favorites?:Array, playlists?:Array}} spec  playlists: {id,name,source,kind}
   */
  async function open(spec) {
    var favs = (spec.favorites || []).map(function (c) {
      return { name: c.name || '', url: c.url, group: c.group || '', logo: c.logo || '' };
    });
    var pls = (spec.playlists || []).filter(function (p) { return p.source && /^https?:\/\//i.test(p.source); });

    if (!favs.length && !pls.length) {
      u.toast(tr('Nichts zu teilen'), tr('Hier gibt es noch nichts, was sich weitergeben ließe.'), 'warn', 3200);
      return;
    }

    // Was gesperrt ist, geht nicht ohne Code weiter
    var L = G.lock;
    if (L && L.hasCode() && !L.isOpen()) {
      var locked = favs.some(function (c) { return L.isLocked(c); }) ||
        pls.some(function (p) { return p.id && L.playlistLocked(p.id); });
      if (locked && !(await L.ask(tr('Gesperrte Sender teilen: Code eingeben.')))) return;
    }

    var secret = favs.some(function (c) { return hasSecret(c.url); }) ||
      pls.some(function (p) { return p.kind === 'xtream' || hasSecret(p.source); });

    var plainPls = pls.map(function (p) { return { name: p.name, source: p.source, kind: p.kind === 'xtream' ? 'xtream' : 'url' }; });
    var forFile = { app: 'G04TV', share: 1, favorites: favs, playlists: plainPls };
    // Im Link ohne Logos: die Adressen sind lang und der Link soll klein bleiben
    var forLink = { app: 'G04TV', share: 1, playlists: plainPls,
      favorites: favs.map(function (c) { return { name: c.name, url: c.url, group: c.group }; }) };

    var link = location.href.split('#')[0].split('?')[0] + '#share/' + (await encode(forLink));
    var fits = link.length <= QR_MAX;

    var sum = [];
    if (favs.length) sum.push(u.fmtInt(favs.length) + ' ' + tr(favs.length === 1 ? 'Favorit' : 'Favoriten'));
    if (pls.length) sum.push(u.fmtInt(pls.length) + ' ' + tr(pls.length === 1 ? 'Playlist' : 'Playlisten'));

    u.openSheet(tr('Teilen') + ' · ' + spec.title,
      '<div class="stack share">' +
        (secret
          ? '<div class="note note--warn">' + u.icon('warn', 18) + '<div><b>' + tr('Enthält Zugangsdaten') + '</b><br>' +
            tr('In den Adressen stehen Benutzer und Kennwort deines Anbieters. Wer den Link, den QR-Code oder die Datei hat, kann damit schauen. Nur an Menschen schicken, denen du vertraust, am besten als Datei direkt (AirDrop), nicht in eine Gruppe.') +
            '</div></div>'
          : '') +
        '<p class="share__sum">' + u.esc(sum.join(' · ')) + '</p>' +
        '<div class="btn-row">' +
          '<button class="btn btn--primary" id="shFile">' + u.icon('upload', 16) + ' ' + tr('Datei teilen') + '</button>' +
          '<button class="btn" id="shCopy">' + u.icon('link', 16) + ' ' + tr('Link kopieren') + '</button>' +
        '</div>' +
        '<input class="input share__link" id="shLink" readonly spellcheck="false" aria-label="' + u.esc(tr('Link')) + '">' +
        '<div class="share__qr" id="shQr"></div>' +
        '<p class="tiny dim" id="shHint"></p>' +
      '</div>',
      function (body) {
        var linkEl = body.querySelector('#shLink');
        linkEl.value = link;
        linkEl.onfocus = function () { linkEl.select(); };

        body.querySelector('#shFile').onclick = async function () {
          var name = fileSafe(spec.title) + '.g04tv.json';
          var ok = await saveFile(name, JSON.stringify(forFile));
          if (ok) u.toast(tr('Datei bereit'), name, 'ok', 3000);
        };
        body.querySelector('#shCopy').onclick = async function () {
          if (await u.copy(link)) u.toast(tr('Link kopiert'), tr('Zum Einfügen in WhatsApp, E-Mail oder SMS.'), 'ok', 3000);
          else { linkEl.focus(); u.toast(tr('Ging nicht'), tr('Den Link im Feld markieren und kopieren.'), 'warn', 4000); }
        };

        var hint = body.querySelector('#shHint');
        var box = body.querySelector('#shQr');
        if (!fits) {
          hint.textContent = tr('Zu viel für einen QR-Code. Nimm den Link oder die Datei.');
          return;
        }
        ensureQr().then(function (ok) {
          if (!document.body.contains(box)) return;
          if (!ok) { hint.textContent = tr('Der QR-Code braucht eine Bibliothek, die sich gerade nicht laden ließ.'); return; }
          box.innerHTML = '<div class="share__qrbox">' + qrSvg(link) + '</div>';
          hint.textContent = tr('Mit der Kamera des anderen Geräts scannen. Es öffnet G04TV und fragt, ob importiert werden soll.');
        });
      });
  }

  G.share = {
    open: open,
    take: take,
    processPending: processPending,
    importText: importText,
    // fürs Prüfen von außen
    encode: encode, decode: decode, parse: parse
  };
})(G04TV);
