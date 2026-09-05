/* ============================================================
   GoTV — Ersteinrichtung

   Drei Schritte, einmalig. Keine Anmeldung, keine Einwilligung -
   nur die Frage, woher die Sender kommen sollen. Wer will,
   überspringt den letzten Schritt und trägt später etwas ein.
   ============================================================ */
(function (G) {
  'use strict';
  var u = G.u;

  var step = 0;
  var TOTAL = 3;

  function progress() {
    var out = '';
    for (var i = 0; i < TOTAL; i++) out += '<i class="' + (i <= step ? 'on' : '') + '"></i>';
    return '<div class="ob-progress">' + out + '</div>';
  }

  function stepWelcome() {
    return '<div class="ob-step">' +
      progress() +
      '<h2 style="font-size:24px">Willkommen bei ' + u.esc(G.NAME) + '</h2>' +
      '<p class="muted">Ein Abspieler für deine eigenen IPTV-Playlisten — auf dem iPhone, ' +
      'auf Android und am Rechner. Er läuft im Browser und lässt sich wie eine App auf den ' +
      'Startbildschirm legen.</p>' +
      '<div class="list">' +
        [['playlists', 'Playlisten bleiben gespeichert', 'Einmal eintragen, danach immer da — auf diesem Gerät'],
         ['star', 'Favoriten quer über alle Listen', 'Der Stern merkt einen Sender vor'],
         ['shield', 'Kein Konto, kein Server', 'Nichts wird gemeldet, nichts geht an Dritte']].map(function (r) {
          return '<div class="list__row"><span class="list__ic">' + u.icon(r[0], 17) + '</span>' +
            '<span class="list__main"><b>' + r[1] + '</b><span>' + r[2] + '</span></span></div>';
        }).join('') +
      '</div>' +
      '<div class="btn-row"><button class="btn btn--primary btn--block" data-ob="next">Weiter</button></div>' +
    '</div>';
  }

  function stepRules() {
    return '<div class="ob-step">' +
      progress() +
      '<h2 style="font-size:24px">Was du mitbringst</h2>' +
      '<p class="muted">GoTV liefert keine Sender mit. Die App spielt allein das, was du selbst ' +
      'einträgst — die Playlist deines Anbieters oder frei verfügbare Listen.</p>' +
      '<div class="note note--warn">' + u.icon('warn', 18) +
      '<div>Für die Rechtmäßigkeit deiner Quellen bist du selbst verantwortlich.</div></div>' +
      '<div class="note note--acc">' + u.icon('shield', 18) +
      '<div>Playlisten, Zugangsdaten und Favoriten werden nur auf diesem Gerät gespeichert. ' +
      'Unter <b>Einstellungen</b> lässt sich alles wieder restlos löschen.</div></div>' +
      '<div class="btn-row">' +
        '<button class="btn" data-ob="back">Zurück</button>' +
        '<button class="btn btn--primary" data-ob="next" style="flex:1">Verstanden</button>' +
      '</div>' +
    '</div>';
  }

  function stepFirst() {
    return '<div class="ob-step">' +
      progress() +
      '<h2 style="font-size:24px">Erste Playlist</h2>' +
      '<p class="muted">Trage die Adresse deiner M3U ein — oder wähle eine Datei vom Gerät. ' +
      'Beides lässt sich später jederzeit ändern und ergänzen.</p>' +

      '<div class="field"><label for="obUrl">Adresse der Playlist</label>' +
      '<input class="input" id="obUrl" type="url" inputmode="url" spellcheck="false" autocomplete="off" ' +
      'placeholder="https://beispiel.tv/playlist.m3u"></div>' +

      '<div class="btn-row">' +
        '<button class="btn btn--primary" id="obLoad" style="flex:1">' + u.icon('download', 16) + ' Laden</button>' +
        '<button class="btn" id="obFile">' + u.icon('folder', 16) + ' Datei</button>' +
      '</div>' +

      '<p class="tiny dim" id="obState"></p>' +

      '<div class="btn-row">' +
        '<button class="btn btn--ghost" data-ob="back">Zurück</button>' +
        '<button class="btn btn--ghost" data-ob="skip" style="flex:1">Später eintragen</button>' +
      '</div>' +
    '</div>';
  }

  function paint() {
    var host = u.$('#onboardingSteps');
    host.innerHTML = step === 0 ? stepWelcome() : step === 1 ? stepRules() : stepFirst();

    u.$$('[data-ob]', host).forEach(function (b) {
      b.onclick = function () {
        var act = b.getAttribute('data-ob');
        if (act === 'next') { step = Math.min(TOTAL - 1, step + 1); paint(); }
        else if (act === 'back') { step = Math.max(0, step - 1); paint(); }
        else if (act === 'skip') finish();
      };
    });

    if (step === 2) wireFirst(host);
  }

  function wireFirst(host) {
    var state = host.querySelector('#obState');

    host.querySelector('#obLoad').onclick = async function () {
      var url = host.querySelector('#obUrl').value.trim();
      if (!url) { state.textContent = 'Bitte erst eine Adresse eintragen.'; return; }
      if (!G.m3u.isUrl(url)) { state.textContent = 'Das sieht nicht nach einer http- oder https-Adresse aus.'; return; }

      state.textContent = 'Playlist wird geholt …';
      var res = await G.library.addAndLoad({
        name: G.m3u.nameFromSource(url),
        source: url,
        kind: G.xtream.isXtream(url) ? 'xtream' : 'url'
      });

      if (res.ok) { finish(); u.toast('Playlist gespeichert', u.fmtInt(res.count) + ' Sender', 'ok'); return; }
      state.textContent = res.error;
    };

    host.querySelector('#obFile').onclick = async function () {
      var picked = await u.pickFile('.m3u,.m3u8,.txt,audio/x-mpegurl,application/x-mpegurl,text/plain');
      if (!picked) return;

      state.textContent = 'Datei wird gelesen …';
      try {
        var name = picked.name.replace(/\.(m3u8?|txt)$/i, '');
        var res = await G.library.addFromText(name, picked.text, 'file', picked.name);
        finish();
        u.toast('Playlist gespeichert', res.playlist.name + ' · ' + u.fmtInt(res.count) + ' Sender', 'ok');
      } catch (e) {
        state.textContent = String(e.message || e);
      }
    };
  }

  function start() {
    step = 0;
    u.$('#onboarding').hidden = false;
    paint();
  }

  function finish() {
    G.store.state.onboarded = true;
    G.store.commit('onboarded');
    u.$('#onboarding').hidden = true;
    u.$('#app').hidden = false;
    G.app.go(G.store.state.playlists.length ? 'live' : 'start');
  }

  G.onboarding = { start: start, finish: finish };
})(GoTV);
