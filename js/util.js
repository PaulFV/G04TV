/* ============================================================
   G04TV v1.0.0 — Hilfsfunktionen

   Klassisches Script (kein Modul), damit die App auch per
   Doppelklick ueber file:// laeuft.
   ============================================================ */
var G04TV = window.G04TV || {};
window.G04TV = G04TV;
G04TV.VERSION = '1.0.0';
G04TV.NAME = 'G04TV';

(function (G) {
  'use strict';

  /* ---------- DOM ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /** HTML-Text -> Element */
  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = String(html).trim();
    return t.content.firstElementChild;
  }

  /** Text fuer das sichere Einsetzen in HTML maskieren */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** Delegierter Ereignisbehandler */
  function on(root, evt, sel, fn) {
    root.addEventListener(evt, function (e) {
      var t = e.target.closest(sel);
      if (t && root.contains(t)) fn.call(t, e, t);
    });
  }

  /* ---------- Zahlen und Text ---------- */
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function num(v, fallback) { var n = parseFloat(v); return isFinite(n) ? n : (fallback || 0); }

  /** 12345 -> "12.345" */
  function fmtInt(v) {
    if (v == null || !isFinite(v)) return '–';
    return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  /** Byte-Zahl in eine lesbare Groesse */
  function fmtSize(bytes) {
    if (!isFinite(bytes) || bytes <= 0) return '0 KB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1048576).toFixed(1).replace('.', ',') + ' MB';
  }

  /** Kuerzt einen langen Text in der Mitte - fuer Adressen */
  function shorten(text, max) {
    text = String(text || '');
    max = max || 54;
    if (text.length <= max) return text;
    var head = Math.ceil((max - 1) / 2);
    return text.slice(0, head) + '…' + text.slice(text.length - (max - head - 1));
  }

  /** Anfangsbuchstaben eines Namens - als Platzhalter, wo ein Logo fehlt */
  function initials(name) {
    var parts = String(name || '?').replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/);
    if (!parts[0]) return '?';
    var s = parts[0][0] + (parts[1] ? parts[1][0] : '');
    return s.toUpperCase();
  }

  /* ---------- Datum ---------- */
  var MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  function fmtDateTime(iso) {
    if (!iso) return '–';
    var d = new Date(iso);
    if (isNaN(d)) return '–';
    return d.getDate() + '. ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() + ', ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  /** "gerade eben" / "vor 12 Minuten" / "vor 3 Tagen" */
  function relTime(iso) {
    if (!iso) return 'nie';
    var ms = Date.now() - new Date(iso).getTime();
    if (!isFinite(ms)) return 'nie';
    var min = Math.floor(ms / 60000);
    if (min < 1) return 'gerade eben';
    if (min < 60) return 'vor ' + min + (min === 1 ? ' Minute' : ' Minuten');
    var h = Math.floor(min / 60);
    if (h < 24) return 'vor ' + h + (h === 1 ? ' Stunde' : ' Stunden');
    var d = Math.floor(h / 24);
    if (d === 1) return 'gestern';
    if (d < 30) return 'vor ' + d + ' Tagen';
    var mo = Math.floor(d / 30);
    return 'vor ' + mo + (mo === 1 ? ' Monat' : ' Monaten');
  }

  /* ---------- Diverses ---------- */
  function uid(prefix) {
    return (prefix || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var a = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, a); }, ms || 200);
    };
  }

  function groupBy(arr, fn) {
    var out = {};
    arr.forEach(function (x) {
      var k = fn(x);
      (out[k] = out[k] || []).push(x);
    });
    return out;
  }

  /** Datei-Download anstossen (Blob) */
  function download(filename, text, mime) {
    try {
      var blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 400);
      return true;
    } catch (e) { return false; }
  }

  /** Eine Datei vom Geraet einlesen - liefert {name, text} */
  function pickFile(accept) {
    return new Promise(function (resolve) {
      var input = document.createElement('input');
      input.type = 'file';
      if (accept) input.accept = accept;
      input.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(input);
      input.onchange = function () {
        var f = input.files && input.files[0];
        if (!f) { input.remove(); resolve(null); return; }
        var r = new FileReader();
        r.onload = function () { input.remove(); resolve({ name: f.name, text: String(r.result || '') }); };
        r.onerror = function () { input.remove(); resolve(null); };
        r.readAsText(f, 'utf-8');
      };
      // Bricht die Person ab, kommt kein Ereignis - das Feld bliebe sonst stehen.
      window.addEventListener('focus', function once() {
        window.removeEventListener('focus', once);
        setTimeout(function () { if (document.body.contains(input) && !input.files.length) { input.remove(); resolve(null); } }, 800);
      });
      input.click();
    });
  }

  async function copy(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* Rueckfall unten */ }
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;top:0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }

  /* ---------- Zeichen ---------- */
  var ICONS = {
    start: '<path d="M4 11.4 12 4l8 7.4M6.5 10v9.5h11V10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    live: '<rect x="2.6" y="7" width="18.8" height="13" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 3.4 12 7l4-3.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.4 11.2 15.2 13.6 10.4 16z"/>',
    playlists: '<path d="M4 6.5h11M4 12h11M4 17.5h7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M18 10.5 21.4 12.6 18 14.7z"/>',
    star: '<path d="M12 3.6l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9L12 3.6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    starFill: '<path d="M12 3.6l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9L12 3.6z"/>',
    settings: '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    info: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 11v5.5M12 7.8v.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    play: '<path d="M8 5.5l11 6.5-11 6.5v-13z"/>',
    stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/>',
    pause: '<rect x="7" y="5.5" width="3.6" height="13" rx="1.2"/><rect x="13.4" y="5.5" width="3.6" height="13" rx="1.2"/>',
    full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
    fullExit: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
    external: '<path d="M14 4h6v6M20 4l-8.5 8.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 14.5V19a1.5 1.5 0 01-1.5 1.5H5A1.5 1.5 0 013.5 19V7.5A1.5 1.5 0 015 6h4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    search: '<circle cx="11" cy="11" r="6.4" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M15.8 15.8 20 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
    plus: '<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    close: '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    warn: '<path d="M12 4l9 16H3l9-16z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 10v4M12 17v.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    trash: '<path d="M4 7h16M9 7V5h6v2m-8 0l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    refresh: '<path d="M20 12a8 8 0 11-2.6-5.9M20 4v4h-4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
    download: '<path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
    upload: '<path d="M12 19V8m0 0l-4 4m4-4l4 4M5 4h14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
    link: '<path d="M10.5 13.5a3.6 3.6 0 005.1 0l3-3a3.6 3.6 0 10-5.1-5.1l-1.4 1.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M13.5 10.5a3.6 3.6 0 00-5.1 0l-3 3a3.6 3.6 0 105.1 5.1l1.4-1.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    file: '<path d="M13.5 3.5H7A1.5 1.5 0 005.5 5v14A1.5 1.5 0 007 20.5h10a1.5 1.5 0 001.5-1.5V8.5l-5-5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M13.5 3.5v5h5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    key: '<circle cx="8.4" cy="12" r="3.9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12.3 12H21M18 12v3.2M15.4 12v2.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    volume: '<path d="M5 9.5h3L12 6v12l-4-3.5H5v-5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M15.5 9.2a4 4 0 010 5.6M18 6.8a7.4 7.4 0 010 10.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    muted: '<path d="M5 9.5h3L12 6v12l-4-3.5H5v-5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M16 9.6l4.4 4.8M20.4 9.6L16 14.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    shield: '<path d="M12 3l7 3v6c0 4.2-2.8 7.7-7 9-4.2-1.3-7-4.8-7-9V6l7-3z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    clock: '<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 7v5.3l3.3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    folder: '<path d="M3.5 7.5A1.5 1.5 0 015 6h4l2 2.4h8a1.5 1.5 0 011.5 1.5V18A1.5 1.5 0 0119 19.5H5A1.5 1.5 0 013.5 18v-10.5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    chevron: '<path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    edit: '<path d="M5 19h3.4L19 8.4a2.4 2.4 0 10-3.4-3.4L5 15.6V19z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    grid: '<rect x="4" y="4" width="6.4" height="6.4" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="13.6" y="4" width="6.4" height="6.4" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="4" y="13.6" width="6.4" height="6.4" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="13.6" y="13.6" width="6.4" height="6.4" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    history: '<path d="M4 12a8 8 0 108-8 8 8 0 00-6.4 3.2M4 4v3.6h3.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 7.6V12l3 1.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    database: '<ellipse cx="12" cy="5.8" rx="7.5" ry="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M4.5 5.8v6.2c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V5.8M4.5 12v6.2c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V12" fill="none" stroke="currentColor" stroke-width="1.7"/>'
  };

  function icon(name, size) {
    size = size || 20;
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="currentColor" aria-hidden="true">' +
      (ICONS[name] || '') + '</svg>';
  }

  /* ---------- Meldung ---------- */
  function toast(title, msg, kind, ms) {
    var host = $('#toasts');
    if (!host) return;
    kind = kind || 'ok';
    var ic = kind === 'ok' ? 'check' : 'warn';
    var node = el(
      '<div class="toast toast--' + kind + '">' +
      '<span class="toast__ic">' + icon(ic, 18) + '</span>' +
      '<div><b>' + esc(title) + '</b>' + (msg ? '<span class="small muted">' + esc(msg) + '</span>' : '') + '</div>' +
      '</div>'
    );
    host.appendChild(node);
    setTimeout(function () {
      node.classList.add('is-out');
      setTimeout(function () { node.remove(); }, 320);
    }, ms || 3600);
  }

  /* ---------- Blatt ---------- */
  function openSheet(title, bodyHtml, onMount) {
    var sheet = $('#sheet'), scrim = $('#scrim');
    $('#sheetTitle').textContent = title;
    $('#sheetBody').innerHTML = bodyHtml;
    sheet.hidden = false; scrim.hidden = false;
    document.body.style.overflow = 'hidden';
    if (onMount) onMount($('#sheetBody'));
  }

  function closeSheet() {
    $('#sheet').hidden = true;
    $('#scrim').hidden = true;
    document.body.style.overflow = '';
  }

  /** Einfache Rueckfrage im Blatt */
  function confirmSheet(opts) {
    return new Promise(function (resolve) {
      var danger = opts.danger !== false;
      openSheet(opts.title, [
        '<div class="stack">',
        '<div class="note note--' + (danger ? 'danger' : 'acc') + '">' + icon(danger ? 'warn' : 'info', 18) +
        '<div>' + opts.body + '</div></div>',
        '<div class="btn-row" style="justify-content:flex-end">',
        '<button class="btn" data-act="no">' + esc(opts.cancel || 'Abbrechen') + '</button>',
        '<button class="btn ' + (danger ? 'btn--danger' : 'btn--primary') + '" data-act="yes">' + esc(opts.ok || 'Bestätigen') + '</button>',
        '</div></div>'
      ].join(''), function (body) {
        body.querySelector('[data-act="no"]').onclick = function () { closeSheet(); resolve(false); };
        body.querySelector('[data-act="yes"]').onclick = function () { closeSheet(); resolve(true); };
      });
    });
  }

  /**
   * Das Senderlogo, wo eines in der Playlist steht.
   * <p>Die Anfangsbuchstaben stehen immer darunter: laesst sich das Bild
   * nicht laden - bei fremden Logos der Normalfall -, nimmt sich das Bild
   * selbst heraus und die Buchstaben kommen zum Vorschein.</p>
   */
  function logoHtml(channel, cls) {
    var name = (channel && channel.name) || '';
    var src = channel && channel.logo;
    return '<span class="' + (cls || 'ch-row__logo') + '">' +
      '<b>' + esc(initials(name)) + '</b>' +
      (src
        ? '<img src="' + esc(src) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">'
        : '') +
      '</span>';
  }

  G.u = {
    $: $, $$: $$, el: el, esc: esc, on: on,
    clamp: clamp, num: num, fmtInt: fmtInt, fmtSize: fmtSize, shorten: shorten, initials: initials,
    fmtDateTime: fmtDateTime, relTime: relTime,
    uid: uid, debounce: debounce, groupBy: groupBy,
    download: download, pickFile: pickFile, copy: copy,
    icon: icon, ICONS: ICONS, logoHtml: logoHtml,
    toast: toast, openSheet: openSheet, closeSheet: closeSheet, confirmSheet: confirmSheet
  };
})(G04TV);
