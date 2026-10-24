/* ============================================================
   G04TV — Programmführer (EPG)

   Woher das Programm kommt:
   - aus der Playlist selbst: #EXTM3U url-tvg="…" (oder x-tvg-url),
   - bei Xtream-Zugängen von selbst: …/xmltv.php?username=…&password=…,
   - aus eigenen Adressen in den Einstellungen.

   Die Dateien (XMLTV, oft .xml.gz) sind groß - bei manchen Anbietern
   über 100 MB. Sie werden deshalb als Strom gelesen, entpackt und
   gleich gefiltert: übrig bleiben nur Sender, die in den eigenen
   Playlisten stehen, und nur die Sendungen von 2 Stunden zurück bis
   30 Stunden voraus. Das Ergebnis liegt im Gerät (IndexedDB) und wird
   alle 12 Stunden erneuert.

   Zuordnung: zuerst über tvg-id, sonst über den Sendernamen
   (vereinfacht: „Das Erste HD“, „DE: Das Erste“ → „daserste“).
   ============================================================ */
(function (G) {
  'use strict';
  var u = G.u;

  var DB_ID = '__epg';
  var MAX_AGE = 12 * 3600 * 1000;
  var BACK = 2 * 3600 * 1000, AHEAD = 30 * 3600 * 1000;

  var data = null;      // { at, sig, sources:[{url, ok, error, channels, items}], progs:{id:[[start,stop,title,desc]]}, names:{norm:id} }
  var busy = null;      // laufende Aktualisierung (Promise)
  var status = '';      // Text für die Einstellungen während des Ladens

  function tr(t) { return G.i18n ? G.i18n.t(t) : t; }
  function en() { return !!(G.i18n && G.i18n.language === 'en'); }
  function emit() { document.dispatchEvent(new CustomEvent('g04tv:epg')); }

  /* ------------------------------------------------------------
     Namen vereinfachen, damit „DE | Das Erste HD“ und „Das Erste“
     zusammenfinden
     ------------------------------------------------------------ */
  function norm(name) {
    var s = String(name || '').toLowerCase().trim();
    s = s.replace(/^\s*(\[[^\]]{1,12}\]|\([^)]{1,12}\)|\|[^|]{1,12}\||[a-z]{2,3}\s*[:|]\s*|[a-z]{2,3}\s+-\s+)/, '');
    s = s.replace(/\b(fhd|uhd|hd|sd|4k|8k|hevc|h\.?265|h\.?264|raw|backup|vip|50fps|60fps|1080p?|720p?)\b/g, '');
    s = s.replace(/&/g, 'und').replace(/[^a-z0-9äöüßéèàç]/g, '');
    return s;
  }
  /** XMLTV-Kennung ohne Länderendung: „DasErste.de“ → „daserste“ */
  function normId(id) { return norm(String(id || '').replace(/\.[a-z]{2,3}$/i, '')); }

  /* ------------------------------------------------------------
     Quellen
     ------------------------------------------------------------ */
  function xtreamEpg(source) {
    var a = G.xtream && G.xtream.fromUrl(source);
    if (!a || !a.server) return '';
    return a.server + '/xmltv.php?username=' + encodeURIComponent(a.user) + '&password=' + encodeURIComponent(a.pass);
  }

  /** Alle Programm-Adressen: aus den Playlisten, Xtream und eigene. */
  function sources() {
    var out = [];
    var add = function (url, from) {
      url = String(url || '').trim();
      if (!/^https?:\/\//i.test(url)) return;
      if (out.some(function (s) { return s.url.toLowerCase() === url.toLowerCase(); })) return;
      out.push({ url: url, from: from });
    };
    G.store.state.playlists.forEach(function (p) {
      String(p.epgAuto || '').split(',').forEach(function (x) { add(x, p.name); });
      if (G.xtream && G.xtream.isXtream(p.source)) add(xtreamEpg(p.source), p.name);
    });
    String(G.store.state.settings.epgUrls || '').split(/\s*[\n,]\s*/).forEach(function (x) { add(x, tr('Eigene Adresse')); });
    return out;
  }
  function signature() { return sources().map(function (s) { return s.url; }).join('|'); }

  /* ------------------------------------------------------------
     Laden: direkt, sonst über den Vermittler
     ------------------------------------------------------------ */
  function blocked(url) { return location.protocol === 'https:' && /^http:\/\//i.test(url); }
  function viaProxyUrl(proxy, url) {
    return proxy.indexOf('{url}') >= 0 ? proxy.replace('{url}', encodeURIComponent(url)) : proxy + encodeURIComponent(url);
  }
  async function open(url) {
    var proxy = G.store.proxy();
    if (proxy && blocked(url)) return check(await fetch(viaProxyUrl(proxy, url), { cache: 'no-store' }));
    try {
      return check(await fetch(url, { cache: 'no-store', redirect: 'follow' }));
    } catch (e) {
      if (!proxy) throw e;
      return check(await fetch(viaProxyUrl(proxy, url), { cache: 'no-store' }));
    }
  }
  function check(res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res;
  }

  /* ------------------------------------------------------------
     XMLTV lesen (als Strom)
     ------------------------------------------------------------ */
  function attr(tag, name) {
    var m = new RegExp('\\s' + name + '\\s*=\\s*"([^"]*)"', 'i').exec(tag) ||
      new RegExp('\\s' + name + "\\s*=\\s*'([^']*)'", 'i').exec(tag);
    return m ? m[1] : '';
  }
  function decode(s) {
    s = String(s || '').replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1');
    return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, function (m, e) {
      var k = e.toLowerCase();
      if (k === 'amp') return '&'; if (k === 'lt') return '<'; if (k === 'gt') return '>';
      if (k === 'quot') return '"'; if (k === 'apos') return "'";
      var n = k.charAt(1) === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
      try { return String.fromCodePoint(n); } catch (x) { return ''; }
    }).trim();
  }
  function inner(block, tag) {
    var m = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + tag + '>', 'i').exec(block);
    return m ? decode(m[1]) : '';
  }
  function inners(block, tag) {
    var re = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + tag + '>', 'gi'), out = [], m;
    while ((m = re.exec(block))) out.push(decode(m[1]));
    return out;
  }
  /** „20261021183000 +0200“ → Millisekunden */
  function time(s) {
    var m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-]\d{4})?/.exec(String(s || '').trim());
    if (!m) return 0;
    var ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
    if (m[7]) {
      var sign = m[7].charAt(0) === '-' ? -1 : 1;
      ms -= sign * (+m[7].slice(1, 3) * 60 + +m[7].slice(3, 5)) * 60000;
    }
    return ms;
  }

  /**
   * Liest eine Quelle und legt passende Sendungen in progs/names ab.
   * want: {ids:{tvgid:true}, names:{norm:true}}
   */
  async function ingest(url, want, progs, names, stat) {
    var res = await open(url);
    var stream = res.body;
    var first = null, reader;

    if (stream && stream.getReader) {
      reader = stream.getReader();
      var r0 = await reader.read();
      first = r0.done ? new Uint8Array(0) : r0.value;
      var gz = first.length > 1 && first[0] === 0x1f && first[1] === 0x8b;
      var rest = reader;
      stream = new ReadableStream({
        start: function (c) { if (first.length) c.enqueue(first); },
        pull: async function (c) {
          var r = await rest.read();
          if (r.done) c.close(); else c.enqueue(r.value);
        },
        cancel: function () { try { rest.cancel(); } catch (e) { /* egal */ } }
      });
      if (gz) {
        if (!window.DecompressionStream) throw new Error(tr('Gepackte Programmdaten (.gz) kann dieser Browser nicht öffnen.'));
        stream = stream.pipeThrough(new DecompressionStream('gzip'));
      }
      reader = stream.getReader();
    } else {
      // Ohne Strom: alles auf einmal (nur kleine Dateien)
      var buf = new Uint8Array(await res.arrayBuffer());
      if (buf[0] === 0x1f && buf[1] === 0x8b) {
        if (!window.DecompressionStream) throw new Error(tr('Gepackte Programmdaten (.gz) kann dieser Browser nicht öffnen.'));
        buf = new Uint8Array(await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
      }
      var once = false;
      reader = { read: function () { if (once) return Promise.resolve({ done: true }); once = true; return Promise.resolve({ done: false, value: buf }); } };
    }

    var dec = new TextDecoder('utf-8');
    var text = '';
    var keep = {};                     // XMLTV-Kennungen, die gebraucht werden
    var now = Date.now(), from = now - BACK, to = now + AHEAD;
    var seenXml = false, bytes = 0;

    function handle(isProg, block) {
      if (isProg) {
        var ch = attr(block, 'channel').toLowerCase();
        if (!ch) return;
        if (!keep[ch]) {
          if (want.ids[ch]) keep[ch] = true;          // ohne <channel>-Teil
          else if (want.names[normId(ch)]) { keep[ch] = true; names[normId(ch)] = names[normId(ch)] || ch; }
          else return;
        }
        var start = time(attr(block, 'start')), stop = time(attr(block, 'stop'));
        if (!start) return;
        if (!stop) stop = start + 30 * 60000;
        if (stop < from || start > to) return;
        var title = inner(block, 'title');
        var desc = inner(block, 'desc');
        if (desc.length > 320) desc = desc.slice(0, 317).replace(/\s+\S*$/, '') + ' …';
        var sub = inner(block, 'sub-title');
        (progs[ch] = progs[ch] || []).push([start, stop, title, desc, sub]);
        stat.items++;
      } else {
        var id = attr(block, 'id').toLowerCase();
        if (!id) return;
        var hit = !!want.ids[id];
        var list = inners(block, 'display-name').map(norm).concat([normId(id)]);
        list.forEach(function (n) {
          if (n && want.names[n]) { hit = true; if (!names[n]) names[n] = id; }
        });
        if (hit) { keep[id] = true; stat.channels++; }
      }
    }

    function scan() {
      var pos = 0;
      for (;;) {
        var a = text.indexOf('<programme', pos), b = text.indexOf('<channel', pos);
        var i = a < 0 ? b : (b < 0 ? a : Math.min(a, b));
        if (i < 0) { text = text.slice(Math.max(pos, text.length - 16)); return; }
        var isProg = i === a;
        var gt = text.indexOf('>', i);
        if (gt < 0) { text = text.slice(i); return; }
        if (text.charAt(gt - 1) === '/') { handle(isProg, text.slice(i, gt + 1)); pos = gt + 1; continue; }
        var endTag = isProg ? '</programme>' : '</channel>';
        var e = text.indexOf(endTag, gt);
        if (e < 0) { text = text.slice(i); return; }
        handle(isProg, text.slice(i, e + endTag.length));
        pos = e + endTag.length;
      }
    }

    for (;;) {
      var r = await reader.read();
      if (r.done) break;
      bytes += r.value.length;
      text += dec.decode(r.value, { stream: true });
      if (!seenXml) {
        if (text.length > 400 && !/<tv[\s>]|<\?xml|<programme|<channel/i.test(text.slice(0, 4000))) {
          throw new Error(tr('Das ist kein Fernsehprogramm (XMLTV).'));
        }
        if (/<tv[\s>]|<programme|<channel/i.test(text)) seenXml = true;
      }
      scan();
      if (text.length > 4e6) text = text.slice(-1e6);   // Schutz vor kaputten Dateien
      status = tr('Programm wird geladen …') + ' ' + Math.round(bytes / 1048576) + ' MB';
      emit();
    }
    text += dec.decode();
    scan();
    if (!seenXml) throw new Error(tr('Das ist kein Fernsehprogramm (XMLTV).'));
  }

  /* ------------------------------------------------------------
     Aktualisieren
     ------------------------------------------------------------ */
  async function wanted() {
    var want = { ids: {}, names: {} };
    for (var i = 0; i < G.store.state.playlists.length; i++) {
      var list = await G.library.channelsOf(G.store.state.playlists[i].id);
      list.forEach(function (c) {
        if (c.tvgId) want.ids[String(c.tvgId).toLowerCase()] = true;
        var n = norm(c.name); if (n) want.names[n] = true;
      });
    }
    G.store.state.favorites.concat(G.store.state.recent).forEach(function (c) {
      if (c.tvgId) want.ids[String(c.tvgId).toLowerCase()] = true;
      var n = norm(c.name); if (n) want.names[n] = true;
    });
    return want;
  }

  function refresh(force) {
    if (busy) return busy;
    var src = sources();
    if (!G.store.state.settings.epgOn || !src.length) return Promise.resolve(false);
    if (!force && data && data.sig === signature() && Date.now() - data.at < MAX_AGE) return Promise.resolve(false);

    busy = (async function () {
      status = tr('Programm wird geladen …');
      emit();
      var want = await wanted();
      var progs = {}, names = {}, stats = [];
      for (var i = 0; i < src.length; i++) {
        var st = { url: src[i].url, from: src[i].from, ok: false, error: '', channels: 0, items: 0 };
        try {
          await ingest(src[i].url, want, progs, names, st);
          st.ok = true;
        } catch (e) {
          st.error = errorText(e, src[i].url);
        }
        stats.push(st);
      }
      Object.keys(progs).forEach(function (k) { progs[k].sort(function (a, b) { return a[0] - b[0]; }); });
      var got = Object.keys(progs).length;
      // Nichts bekommen, aber alte Daten da: die alten behalten
      if (!got && data && data.progs && Object.keys(data.progs).length) {
        data.sources = stats; data.at = Date.now() - MAX_AGE + 3600 * 1000;   // in 1 h neu versuchen
      } else {
        data = { at: Date.now(), loadedAt: Date.now(), sig: signature(), sources: stats, progs: progs, names: names };
      }
      try { await G.db.put(DB_ID, data); } catch (e) { /* bleibt im Speicher */ }
      return got > 0;
    })().finally(function () { busy = null; status = ''; emit(); });
    return busy;
  }

  function errorText(e, url) {
    var raw = String((e && e.message) || e || '');
    if (/failed to fetch|networkerror|load failed/i.test(raw)) {
      return blocked(url) && !G.store.proxy()
        ? tr('http-Adresse: der Browser blockiert sie. Ein Vermittler hilft (Playlisten aus dem Netz).')
        : tr('Abruf aus dem Browser nicht erlaubt (CORS) oder nicht erreichbar. Ein Vermittler hilft.');
    }
    return raw || tr('Unbekannter Fehler.');
  }

  /* ------------------------------------------------------------
     Abfragen
     ------------------------------------------------------------ */
  function idOf(c) {
    if (!data || !c) return '';
    var t = c.tvgId && String(c.tvgId).toLowerCase();
    if (t && data.progs[t]) return t;
    var n = norm(c.name);
    var id = n && data.names[n];
    if (id && data.progs[id]) return id;
    return '';
  }
  function item(p) { return p ? { start: p[0], stop: p[1], title: p[2], desc: p[3], sub: p[4] } : null; }

  /** Was läuft jetzt und was danach? null, wenn nichts bekannt. */
  function nowNext(c, at) {
    if (!G.store.state.settings.epgOn) return null;
    var id = idOf(c);
    if (!id) return null;
    var list = data.progs[id], t = at || Date.now();
    for (var i = 0; i < list.length; i++) {
      if (list[i][0] <= t && list[i][1] > t) return { now: item(list[i]), next: item(list[i + 1]) };
      if (list[i][0] > t) return { now: null, next: item(list[i]) };
    }
    return null;
  }

  /** Die kommenden Sendungen (ab der laufenden). */
  function upcoming(c, max) {
    var id = idOf(c);
    if (!id) return [];
    var t = Date.now();
    return data.progs[id].filter(function (p) { return p[1] > t; }).slice(0, max || 12).map(item);
  }

  function progress(p, at) {
    if (!p) return 0;
    var t = at || Date.now();
    return Math.max(0, Math.min(100, (t - p.start) / Math.max(1, p.stop - p.start) * 100));
  }

  function hm(ms) {
    var d = new Date(ms);
    return (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
  }

  function info() {
    return {
      busy: !!busy, status: status, at: data ? (data.loadedAt || data.at) : 0,
      sources: sources(), results: data ? data.sources : [],
      channels: data ? Object.keys(data.progs).length : 0
    };
  }

  /* ------------------------------------------------------------
     Programm eines Senders als Blatt
     ------------------------------------------------------------ */
  function sheet(c) {
    var list = upcoming(c, 16);
    if (!list.length) {
      u.toast(tr('Kein Programm'), c.name, 'warn', 2600);
      return;
    }
    var t = Date.now();
    var day = function (ms) {
      var d = new Date(ms), today = new Date();
      if (d.toDateString() === today.toDateString()) return '';
      return d.toLocaleDateString(G.i18n && G.i18n.language === 'en' ? 'en-GB' : 'de-DE', { weekday: 'short' }) + ' ';
    };
    u.openSheet(c.name,
      '<div class="epg-sheet">' + list.map(function (p, i) {
        var live = p.start <= t && p.stop > t;
        return '<div class="epg-sheet__row' + (live ? ' is-live' : '') + '">' +
          '<span class="epg-sheet__time">' + day(p.start) + hm(p.start) + '</span>' +
          '<div class="epg-sheet__main" data-no-translate>' +
            '<b>' + u.esc(p.title || '—') + '</b>' +
            (p.sub ? '<span class="epg-sheet__sub">' + u.esc(p.sub) + '</span>' : '') +
            (live ? '<span class="epg-bar"><i style="width:' + progress(p).toFixed(1) + '%"></i></span>' : '') +
            (p.desc && (live || i < 2) ? '<p>' + u.esc(p.desc) + '</p>' : '') +
          '</div>' +
          '<span class="epg-sheet__end">' + (live ? (en() ? 'until ' : 'bis ') + hm(p.stop) : '') + '</span>' +
        '</div>';
      }).join('') + '</div>');
  }

  /* ------------------------------------------------------------
     Start: gespeicherte Daten laden, bei Bedarf erneuern
     ------------------------------------------------------------ */
  async function boot() {
    try { data = await G.db.get(DB_ID); } catch (e) { data = null; }
    if (data && !data.progs) data = null;
    emit();
    setTimeout(function () { refresh(false); }, 2500);
  }

  // Jede Minute: Fortschritt nachführen; alle 12 h neu laden
  setInterval(function () {
    if (data) emit();
    if (data && Date.now() - data.at > MAX_AGE) refresh(false);
  }, 60000);

  // Neue Quelle (Playlist geladen oder Adresse eingetragen): nachladen
  var sigWas = '';
  G.store.subscribe(function (st, why) {
    if (why === 'wipe') { data = null; emit(); return; }
    var sig = signature();
    if (sig !== sigWas) {
      var first = !sigWas;
      sigWas = sig;
      if (!first && sig) setTimeout(function () { refresh(false); }, 800);
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 300); });
  else setTimeout(boot, 300);

  G.epg = {
    refresh: refresh, nowNext: nowNext, upcoming: upcoming, progress: progress, hm: hm,
    info: info, sources: sources, sheet: sheet, norm: norm,
    en: en,
    has: function () { return !!(data && Object.keys(data.progs).length); }
  };
})(G04TV);
