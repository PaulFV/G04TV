/* ============================================================
   G04TV — Sport-Hinweise

   Sucht im Programm des Anbieters (siehe epg.js) nach Fußball, Boxen
   und Formel 1 und sagt vorab, was kommt und auf welchem Sender der
   eigenen Playlisten. Es läuft alles auf dem Gerät; nichts wird
   gesendet, und es gibt keinen Server.

   Wo der Treffer herkommt: die Stichworte (Champions League, Formel 1 ...)
   werden im Titel der Sendung gesucht. Wiederholungen, Zusammenfassungen
   und Magazine fallen heraus, ebenso zu kurze Sendungen (ein Spiel dauert
   über 75 Minuten). Bundesliga und LaLiga zählen nur als Topspiel: wenn zwei
   große Vereine gegeneinander spielen, "Topspiel", "Derby" oder "Klassiker"
   dabeisteht oder ein eigenes Stichwort vorkommt.

   Grenze: ohne Server kann sich eine Web-App nicht von selbst wecken.
   Mitteilungen kommen deshalb, solange G04TV geöffnet ist. Die Karte auf
   der Startseite zeigt immer, was gefunden wurde.
   ============================================================ */
(function (G) {
  'use strict';
  var u = G.u;

  var SENT_KEY = 'g04tv.sportSent';
  var CHECK_MS = 30 * 1000;

  var cache = { sig: '', ready: false, day: '', events: [] };
  var working = null;
  var pending = '';           // Sendung, die nach dem Start (Mitteilung angetippt) zu öffnen ist

  function tr(t) { return G.i18n ? G.i18n.t(t) : t; }
  function S() { return G.store.state.settings; }
  function emit() { document.dispatchEvent(new CustomEvent('g04tv:sport')); }

  /* ------------------------------------------------------------
     Was gesucht wird
     ------------------------------------------------------------ */
  var BIG_BL = [/bayern/, /dortmund|\bbvb\b/, /leverkusen|bayer 04/, /leipzig/, /frankfurt|eintracht/,
    /stuttgart|\bvfb\b/, /schalke/, /gladbach|m(?:ö|oe)nchengladbach/, /werder|bremen/, /hamburger sv|\bhsv\b/];
  var BIG_LL = [/real madrid/, /barcelona|bar(?:ç|c)a/, /atl(?:é|e)tico/, /sevilla/, /valencia/, /athletic/,
    /real sociedad/, /villarreal/, /betis/];
  var BIG_PL = [/manchester city|man city/, /manchester united|man utd/, /liverpool/, /arsenal/, /chelsea/,
    /tottenham|spurs/, /newcastle/];
  var BIG_SA = [/juventus/, /\binter\b|internazionale/, /\bac (?:milan|mailand)\b|\bmilan\b/, /napoli|neapel/,
    /\bas rom\b|\broma\b/, /lazio/];
  var TOP = /topspiel|top-spiel|spitzenspiel|klassiker|derby|gipfeltreffen|cl(?:á|a)sico/i;
  var TITLE_FIGHT = /\bwbc\b|\bwba\b|\bibf\b|\bwbo\b|wm-?kampf|weltmeisterschaftskampf|titelkampf|title[\s-]*fight|weltmeister|championship/i;

  /** Qualifying, Sprint oder Rennen - was nicht erkennbar ist, gilt als Rennen. */
  function f1Session(text) {
    if (/sprint/i.test(text)) return 'S';
    if (/qualifying|\bquali\b|qualifikation/i.test(text)) return 'Q';
    return 'R';
  }

  // Reihenfolge zählt: das Genauere zuerst
  var COMPS = [
    { key: 'ucl', sport: 'football', setting: 'sportUcl', label: 'Champions League',
      re: /champions[\s-]*league|\buefa[\s-]*cl\b|\bucl\b/i },
    { key: 'uel', sport: 'football', setting: 'sportUel', label: 'Europa League',
      re: /europa[\s-]*league|\buel\b/i },
    { key: 'uecl', sport: 'football', setting: 'sportUecl', label: 'Conference League',
      re: /conference[\s-]*league|\buecl\b/i },
    { key: 'dfb', sport: 'football', setting: 'sportDfb', label: 'DFB-Pokal',
      re: /dfb[\s-]*pokal/i },
    { key: 'nat', sport: 'football', setting: 'sportNat', label: 'Länderspiel',
      re: /l(?:ä|ae)nderspiel|nations[\s-]*league|(?:em|wm)[\s-]*quali(?:fikation)?/i },
    { key: 'tour', sport: 'football', setting: 'sportTour', label: 'EM / WM',
      re: /uefa[\s-]*euro|fifa[\s-]*world[\s-]*cup|\b(?:em|wm)[\s-]*20\d\d|fu(?:ß|ss)ball[\s-]*(?:em|wm)|klub-?wm|club world cup|copa am(?:é|e)rica|afrika[\s-]*cup|europameisterschaft|weltmeisterschaft/i,
      need: /fu(?:ß|ss)ball|fifa|uefa|soccer|football|nationalmannschaft/i },
    { key: 'bl', sport: 'football', setting: 'sportBl', label: 'Bundesliga', league: true, big: BIG_BL,
      re: /bundesliga/i,
      excl: /2\.\s*bundesliga|3\.\s*liga|handball|basketball|eishockey|volleyball|frauen|women|\bu\d\d\b|e-?sport|futsal/i },
    { key: 'll', sport: 'football', setting: 'sportLl', label: 'LaLiga', league: true, big: BIG_LL,
      re: /la\s?liga|primera divisi(?:ó|o)n|cl(?:á|a)sico/i,
      excl: /segunda|frauen|women|femenin/i },
    { key: 'pl', sport: 'football', setting: 'sportPl', label: 'Premier League', league: true, big: BIG_PL,
      re: /premier[\s-]*league/i,
      excl: /darts|snooker|\bu\d\d\b|frauen|women|handball|basketball/i },
    { key: 'sa', sport: 'football', setting: 'sportSa', label: 'Serie A', league: true, big: BIG_SA,
      re: /serie[\s-]*a\b/i,
      excl: /serie b|frauen|femminile|women|volleyball|basketball/i },
    { key: 'box', sport: 'boxing', setting: 'sportBoxing', label: 'Boxen',
      re: /\bboxen\b|\bboxing\b|boxkampf|box-?gala|box-?abend|\bwbc\b|\bwba\b|\bibf\b|\bwbo\b|fight[\s-]*night/i,
      excl: /ufc|mma|kickbox|k-1|wrestling|wwe|training/i, minDur: 45,
      filter: function (text, s) { return TITLE_FIGHT.test(text) ? !!(s.sportBoxTitle || s.sportBoxAll) : !!s.sportBoxAll; } },
    { key: 'f1', sport: 'f1', setting: 'sportF1', label: 'Formel 1',
      re: /formel[\s-]*1\b|formula[\s-]*(?:1|one)\b|\bf1\b/i,
      excl: /training|\bfp[123]\b|vorbericht|nachbericht|analyse|academy|drive to survive|formel[\s-]*[23e]\b/i, minDur: 45,
      filter: function (text, s) {
        var k = f1Session(text);
        return !!(k === 'Q' ? s.sportF1Q : k === 'S' ? s.sportF1S : s.sportF1R);
      } }
  ];
  var MIN_FOOTBALL = 75;      // Minuten - ein Spiel dauert länger als eine Zusammenfassung
  var GENERIC_EXCL = /highlights?|zusammenfassung|magazin|wiederholung|\bwdh\b|r(?:ü|ue)ckblick|best of|re-?live|doku|reportage|classics?\b|history|talk|vorschau|vorbericht/i;
  var QUICK = /champions|europa|conference|dfb|l(?:ä|ae)nderspiel|nations|quali|\beuro\b|uefa|world cup|fu(?:ß|ss)ball|bundesliga|la\s?liga|primera|premier|serie|cl(?:á|a)sico|box|formel|formula|\bf1\b|\bwb[acos]\b|\bibf\b|fight/i;

  function enabled(comp) {
    var s = S();
    if (comp.sport === 'football' && !s.sportFootball) return false;
    return !!s[comp.setting];
  }

  function ownRegex() {
    var words = String(S().sportOwn || '').split(/[,;\n]+/).map(function (w) { return w.trim(); })
      .filter(function (w) { return w.length >= 3; });
    if (!words.length) return null;
    return new RegExp(words.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|'), 'i');
  }

  function important(comp, text, own) {
    if (own && own.test(text)) return true;
    if (TOP.test(text)) return true;
    var n = 0;
    comp.big.forEach(function (re) { if (re.test(text.toLowerCase())) n++; });
    return n >= 2;
  }

  /** p = [start, stop, titel, beschreibung, untertitel] - gibt den Wettbewerb zurück oder null */
  function classify(p, own) {
    var title = String(p[2] || ''), sub = String(p[4] || ''), desc = String(p[3] || '').slice(0, 200);
    var head = title + ' ' + sub;
    if (!QUICK.test(head + ' ' + desc)) return null;
    if (GENERIC_EXCL.test(head)) return null;
    var minutes = (p[1] - p[0]) / 60000;

    for (var i = 0; i < COMPS.length; i++) {
      var c = COMPS[i];
      if (!enabled(c)) continue;
      // zuerst im Titel, sonst am Anfang der Beschreibung
      if (!c.re.test(head) && !c.re.test(desc.slice(0, 80))) continue;
      if (c.excl && c.excl.test(head)) continue;
      if (c.need && !c.need.test(head + ' ' + desc)) continue;
      if (minutes < (c.minDur || MIN_FOOTBALL)) continue;
      if (c.filter && !c.filter(head + ' ' + desc, S())) continue;
      if (c.league && !important(c, head + ' ' + desc, own)) continue;
      return c;
    }
    return null;
  }

  /* ------------------------------------------------------------
     Suchen
     ------------------------------------------------------------ */
  function ymd(ms) {
    var d = new Date(ms);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function endOfDay(ms, plusDays) {
    var d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1 + (plusDays || 0)).getTime();
  }

  function signature() {
    var s = S(), st = G.store.state;
    var keys = Object.keys(s).filter(function (k) { return k.indexOf('sport') === 0 && k !== 'sportMorning' && k !== 'sportLead' && k !== 'sportMorningOn'; });
    var lock = G.lock && G.lock.hasCode() ? G.lock.counts() : null;
    return [G.epg ? G.epg.info().at : 0, ymd(Date.now()),
      keys.map(function (k) { return k + '=' + s[k]; }).join(','),
      st.playlists.map(function (p) { return p.id + ':' + p.count; }).join(','),
      lock ? lock.channels + '/' + lock.groups + '/' + lock.playlists + (G.lock.isOpen() ? 'o' : '') : ''].join('|');
  }

  // EPG-Kennung -> Sender der Playlisten (einmal je Programmstand aufgebaut)
  var idx = { key: '', map: null };
  async function channelIndex() {
    var st = G.store.state;
    var key = G.epg.info().at + '|' + st.playlists.map(function (p) { return p.id + ':' + p.count; }).join(',');
    if (idx.map && idx.key === key) return idx.map;
    var map = {};
    for (var i = 0; i < st.playlists.length; i++) {
      var list = await G.library.channelsOf(st.playlists[i].id);
      for (var j = 0; j < list.length; j++) {
        var id = G.epg.idFor(list[j]);
        if (id) (map[id] = map[id] || []).push(list[j]);
        if (j % 4000 === 3999) await new Promise(function (r) { setTimeout(r, 0); });
      }
    }
    idx = { key: key, map: map };
    return map;
  }

  function cleanName(name) { return String(name || '').replace(/^[A-Za-z]{2,3}\s*[:|]\s*/, '').trim() || String(name || ''); }

  async function build() {
    var now = Date.now();
    var out = { ready: !!(G.epg && G.epg.has()), events: [] };
    var s = S();
    if (!s.sportOn || !out.ready) return out;

    var own = ownRegex();
    var hits = G.epg.find(function (p) { return classify(p, own); }, now, endOfDay(now, 1));
    if (!hits.length) return out;

    var map = await channelIndex();
    var L = G.lock, locked = L && L.hasCode() && !L.isOpen();
    var favs = {};
    G.store.state.favorites.forEach(function (f) { favs[String(f.url).trim().toLowerCase()] = true; });

    var byKey = {};
    hits.forEach(function (h) {
      var key = h.start + '|' + String(h.title || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, '');
      var ev = byKey[key];
      if (!ev) {
        ev = byKey[key] = { key: key, comp: classify([h.start, h.stop, h.title, h.desc, h.sub], own),
          start: h.start, stop: h.stop, title: h.title, channels: [], seen: {} };
      }
      (map[h.id] || []).forEach(function (c) {
        if (locked && L.isLocked(c)) return;
        if (ev.seen[c.url]) return;
        ev.seen[c.url] = true;
        ev.channels.push({ name: c.name, label: cleanName(c.name), url: c.url, group: c.group || '', logo: c.logo || '',
          fav: !!favs[String(c.url).trim().toLowerCase()] });
      });
    });

    out.events = Object.keys(byKey).map(function (k) { return byKey[k]; })
      .filter(function (ev) { return ev.comp && ev.channels.length; })
      .map(function (ev) {
        delete ev.seen;
        // Favoriten zuerst, Namen nicht doppelt zeigen (HD, FHD ... bleiben getrennte Sender)
        ev.channels.sort(function (a, b) { return (b.fav ? 1 : 0) - (a.fav ? 1 : 0); });
        return ev;
      })
      .sort(function (a, b) { return a.start - b.start || a.comp.label.localeCompare(b.comp.label); });
    return out;
  }

  /** Neu suchen - nur wenn sich etwas geändert hat (oder erzwungen). */
  function refresh(force) {
    if (working) return working;
    var sig = signature();
    if (!force && cache.sig === sig && cache.ready) return Promise.resolve(cache.events);
    working = build().then(function (r) {
      cache = { sig: sig, ready: r.ready, day: ymd(Date.now()), events: r.events };
      emit();
      check(Date.now());
      return cache.events;
    }).catch(function (e) {
      console.error(e);
      return cache.events;
    }).finally(function () { working = null; });
    return working;
  }

  /* ------------------------------------------------------------
     Lesen
     ------------------------------------------------------------ */
  /** Was noch nicht vorbei ist, bis Ende morgen. */
  function list(now) {
    var t = now || Date.now();
    var limit = endOfDay(t, 1);
    return cache.events.filter(function (ev) { return ev.stop > t && ev.start < limit; });
  }

  function dayLabel(ms, now) {
    var t = now || Date.now();
    if (ymd(ms) === ymd(t)) return tr('Heute');
    if (ymd(ms) === ymd(endOfDay(t) + 3600000)) return tr('Morgen');
    return ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(ms).getDay()];
  }

  function channelText(ev, max) {
    var names = ev.channels.map(function (c) { return c.label; });
    var shown = names.slice(0, max || 3).join(', ');
    return names.length > (max || 3) ? shown + ' +' + (names.length - (max || 3)) : shown;
  }

  /** Eine Zeile für die Startseite - null, wenn nichts ansteht. */
  function summary(now) {
    var t = now || Date.now();
    var l = list(t);
    if (!l.length) return null;
    var ev = l[0];
    var when = ev.start <= t ? tr('Läuft') : dayLabel(ev.start, t) + ' ' + G.epg.hm(ev.start);
    return { label: when + ' · ' + ev.comp.label, title: ev.title, sub: channelText(ev, 3), more: l.length - 1, ev: ev,
      sport: ev.comp.sport, live: ev.start <= t };
  }

  /* ------------------------------------------------------------
     Mitteilungen
     ------------------------------------------------------------ */
  function permission() {
    return ('Notification' in window) ? Notification.permission : 'unsupported';
  }

  function ask() {
    if (!('Notification' in window)) return Promise.resolve('unsupported');
    if (Notification.permission !== 'default') return Promise.resolve(Notification.permission);
    return new Promise(function (resolve) {
      var r;
      try { r = Notification.requestPermission(function (p) { resolve(p); }); } catch (e) { resolve('default'); return; }
      if (r && r.then) r.then(resolve, function () { resolve('default'); });
    });
  }

  /** Zeigt eine Mitteilung; ohne Erlaubnis (App offen) wenigstens einen Hinweis in der App. */
  function show(title, body, tag, key) {
    var opts = { body: body, tag: tag, icon: 'icons/icon-192.png', badge: 'icons/favicon-32.png', data: { key: key || '' } };
    if (permission() !== 'granted') {
      u.toast(title, body.split('\n')[0], 'ok', 9000);
      return Promise.resolve(false);
    }
    var viaPage = function () {
      try { new Notification(title, opts); return true; } catch (e) { u.toast(title, body.split('\n')[0], 'ok', 9000); return false; }
    };
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
      return navigator.serviceWorker.getRegistration().then(function (reg) {
        if (reg && reg.showNotification) return reg.showNotification(title, opts).then(function () { return true; });
        return viaPage();
      }).catch(viaPage);
    }
    return Promise.resolve(viaPage());
  }

  function loadSent() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(SENT_KEY) || 'null'); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = {};
    d.ev = d.ev || {};
    return d;
  }
  function saveSent(d) {
    var cut = Date.now() - 3 * 86400000;
    Object.keys(d.ev).forEach(function (k) { if (d.ev[k] < cut) delete d.ev[k]; });
    try { localStorage.setItem(SENT_KEY, JSON.stringify(d)); } catch (e) { /* optional */ }
  }

  function minutesOfDay(text) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(text || ''));
    return m ? Math.min(23, +m[1]) * 60 + Math.min(59, +m[2]) : 8 * 60;
  }

  function overview(evs) {
    var labels = [];
    evs.forEach(function (e) { if (labels.indexOf(e.comp.label) < 0) labels.push(e.comp.label); });
    var lines = evs.slice(0, 4).map(function (e) {
      return G.epg.hm(e.start) + ' ' + e.title + ' · ' + channelText(e, 2);
    });
    if (evs.length > 4) lines.push('+ ' + (evs.length - 4) + ' ' + tr('weitere'));
    var head = labels.slice(0, 3).join(', ') + (labels.length > 3 ? ' +' + (labels.length - 3) : '');
    return show(tr('Heute im TV') + ': ' + head, lines.join('\n'), 'g04tv-sport-day', evs[0].key);
  }

  function reminder(ev, minutes) {
    var lead = minutes <= 1 ? tr('Gleich') : tr('In') + ' ' + minutes + ' Min';
    return show(lead + ': ' + ev.comp.label, G.epg.hm(ev.start) + ' ' + ev.title + ' · ' + channelText(ev, 3),
      'g04tv-sport-' + ev.key, ev.key);
  }

  /** Fällige Mitteilungen verschicken. now nur zum Prüfen von außen. */
  function check(now) {
    var s = S();
    if (!s.sportOn || !cache.ready) return;
    var t = now || Date.now();
    var sent = loadSent(), changed = false;

    if (s.sportMorningOn && sent.morning !== ymd(t)) {
      var d = new Date(t);
      if (d.getHours() * 60 + d.getMinutes() >= minutesOfDay(s.sportMorning)) {
        var today = list(t).filter(function (e) { return e.start < endOfDay(t); });
        sent.morning = ymd(t); changed = true;
        if (today.length) overview(today);
      }
    }

    var lead = +s.sportLead || 0;
    if (lead > 0) {
      list(t).forEach(function (ev) {
        var wait = ev.start - t;
        if (wait > 0 && wait <= lead * 60000 && !sent.ev[ev.key]) {
          sent.ev[ev.key] = t; changed = true;
          reminder(ev, Math.round(wait / 60000));
        }
      });
    }
    if (changed) saveSent(sent);
  }

  /* ------------------------------------------------------------
     Antippen: Sendung öffnen
     ------------------------------------------------------------ */
  function play(c) {
    if (G.views && G.views.live && G.views.live.playChannel) G.views.live.playChannel(c);
  }

  function open(key) {
    var ev = cache.events.filter(function (e) { return e.key === key; })[0];
    if (!ev) { sheet(); return; }
    if (ev.channels.length === 1) { play(ev.channels[0]); return; }
    sheet(ev);
  }

  /** Beim Start: kam die App über eine angetippte Mitteilung (#sport=...)? */
  function take() {
    var m = /^#sport=(.+)$/.exec(location.hash || '');
    if (!m) return;
    try { pending = decodeURIComponent(m[1]); } catch (e) { pending = ''; }
    try { history.replaceState(null, '', '#start'); } catch (e) { /* egal */ }
  }
  // Beim Start ist das Programm noch nicht aus dem Speicher geladen: darauf warten (höchstens 12 s)
  function whenReady(fn, tries) {
    if ((G.epg && G.epg.has()) || (tries || 0) > 30) { fn(); return; }
    setTimeout(function () { whenReady(fn, (tries || 0) + 1); }, 400);
  }
  function processPending() {
    if (!pending) return;
    var key = pending;
    pending = '';
    whenReady(function () { refresh(true).then(function () { open(key); }); });
  }
  if (navigator.serviceWorker && navigator.serviceWorker.addEventListener) {
    navigator.serviceWorker.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'g04tv-sport' && e.data.key) { pending = e.data.key; processPending(); }
    });
  }

  /* ------------------------------------------------------------
     Blatt mit allem, was ansteht
     ------------------------------------------------------------ */
  function eventHtml(ev, now) {
    var live = ev.start <= now;
    return '<div class="sport-ev is-' + ev.comp.sport + '">' +
      '<div class="sport-ev__head"><b>' + u.esc(ev.comp.label) + '</b>' +
        '<span>' + (live ? tr('Läuft') + ' · ' : '') + G.epg.hm(ev.start) + '</span></div>' +
      '<p>' + u.esc(ev.title) + '</p>' +
      '<div class="sport-ev__ch">' + ev.channels.slice(0, 12).map(function (c, i) {
        return '<button class="btn btn--sm" type="button" data-sport-play="' + u.esc(ev.key) + '" data-i="' + i + '">' +
          u.icon('play', 13) + ' ' + u.esc(c.label) + '</button>';
      }).join('') + '</div>' +
    '</div>';
  }

  function sheet(only) {
    var now = Date.now();
    var l = only ? [only] : list(now);
    var html;
    if (!l.length) {
      html = '<p class="dim">' + u.esc(tr('Gerade nichts Passendes im Programm.')) + '</p>';
    } else {
      var days = [];
      l.forEach(function (ev) {
        var d = dayLabel(ev.start <= now ? now : ev.start, now);
        var g = days.filter(function (x) { return x.d === d; })[0];
        if (!g) days.push(g = { d: d, evs: [] });
        g.evs.push(ev);
      });
      html = days.map(function (g) {
        return '<h4 class="sport-day">' + u.esc(g.d) + '</h4>' + g.evs.map(function (e) { return eventHtml(e, now); }).join('');
      }).join('');
    }
    html += '<div class="btn-row" style="margin-top:14px"><button class="btn btn--sm" type="button" id="sportSet">' +
      u.icon('settings', 14) + ' ' + u.esc(tr('Einstellungen')) + '</button></div>';

    u.openSheet(only ? only.comp.label : tr('Sport im TV'), '<div class="sport-list">' + html + '</div>', function (body) {
      u.on(body, 'click', '[data-sport-play]', function (e, t) {
        var ev = cache.events.filter(function (x) { return x.key === t.getAttribute('data-sport-play'); })[0];
        var c = ev && ev.channels[+t.getAttribute('data-i')];
        if (!c) return;
        u.closeSheet();
        play(c);
      });
      var set = body.querySelector('#sportSet');
      if (set) set.onclick = function () { u.closeSheet(); G.app.go('settings'); };
    });
  }

  /* ------------------------------------------------------------
     Für die Einstellungen
     ------------------------------------------------------------ */
  function info() {
    return {
      on: !!S().sportOn, permission: permission(), found: list().length,
      epg: !!(G.epg && G.epg.has()), epgOn: !!S().epgOn, ready: cache.ready, busy: !!working
    };
  }

  /** Schalter in den Einstellungen geändert */
  function changed(key, on) {
    if (key === 'sportOn' && on) {
      ask().then(function () { refresh(true); emit(); });
      return;
    }
    refresh(false);
  }

  function test() {
    return ask().then(function () {
      var e = list()[0];
      var title = e ? e.comp.label : 'Champions League';
      var body = e ? G.epg.hm(e.start) + ' ' + e.title + ' · ' + channelText(e, 3)
        : tr('So sieht eine Sport-Mitteilung aus.');
      return show(tr('Test') + ': ' + title, body, 'g04tv-sport-test', e ? e.key : '');
    });
  }

  /* ------------------------------------------------------------
     Takt
     ------------------------------------------------------------ */
  var soon = null;
  function later() { clearTimeout(soon); soon = setTimeout(function () { refresh(false); }, 1200); }

  document.addEventListener('g04tv:epg', later);
  document.addEventListener('g04tv:lock', later);
  G.store.subscribe(function (st, why) {
    if (why === 'wipe') {
      cache = { sig: '', ready: false, day: '', events: [] };
      idx = { key: '', map: null };
      try { localStorage.removeItem(SENT_KEY); } catch (e) { /* optional */ }
      emit();
      return;
    }
    if (why === 'settings' || why === 'playlists' || why === 'favorites' || why === 'import') later();
  });

  setInterval(function () {
    if (!S().sportOn) return;
    if (cache.day && cache.day !== ymd(Date.now())) { refresh(true); return; }
    check(Date.now());
  }, CHECK_MS);

  G.sport = {
    refresh: refresh, list: list, summary: summary, sheet: sheet, open: open, info: info,
    changed: changed, ask: ask, test: test, take: take, processPending: processPending,
    permission: permission,
    // zum Prüfen
    check: check, classify: classify
  };
})(G04TV);
