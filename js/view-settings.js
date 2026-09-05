/* ============================================================
   GoTV — Bereich Einstellungen

   Wiedergabe, Darstellung, der Weg ins Netz und die Verwaltung
   der eigenen Daten. Es gibt kein Konto: alles hier gilt für
   dieses Gerät und diesen Browser.
   ============================================================ */
(function (G) {
  'use strict';
  var u = G.u;
  G.views = G.views || {};

  var usage = null;   // was der Browser über den belegten Platz verrät

  function sw(key, title, text) {
    var on = !!G.store.state.settings[key];
    return '<label class="switch">' +
      '<input type="checkbox" data-set="' + key + '"' + (on ? ' checked' : '') + '>' +
      '<span class="switch__track"></span>' +
      '<span class="switch__label"><b>' + u.esc(title) + '</b><span>' + text + '</span></span>' +
    '</label>';
  }

  function render() {
    var s = G.store.state.settings;

    return '<div class="view stack">' +

      /* ---- Wiedergabe ---- */
      '<div class="card">' +
        '<div class="card__head">' + u.icon('play', 18) + '<h3>Wiedergabe</h3></div>' +
        '<div class="stack stack--sm">' +
          sw('autoplay', 'Sofort abspielen',
             'Ein Antippen in der Senderliste startet den Sender gleich. Aus: der Sender wird nur gewählt, das Abspielen bleibt ein zweiter Schritt.') +
          sw('resume', 'Letzten Sender beim Start laden',
             'Beim Öffnen der App wird der zuletzt gesehene Sender vorbereitet. Der Browser verlangt für den Ton meist noch eine Berührung.') +
          sw('confirmExternal', 'Vor „Extern öffnen“ fragen',
             'Zeigt vorher, welche Adresse an einen anderen Abspieler übergeben wird.') +
          '<div class="field" style="padding:0 13px 8px">' +
            '<label for="setVol">Lautstärke · <span id="setVolV">' + s.volume + ' %</span></label>' +
            '<input type="range" id="setVol" min="0" max="100" value="' + s.volume + '" ' +
            'style="width:100%;accent-color:var(--acc)">' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* ---- Darstellung ---- */
      '<div class="card">' +
        '<div class="card__head">' + u.icon('grid', 18) + '<h3>Darstellung</h3></div>' +
        sw('reduceMotion', 'Bewegung reduzieren',
           'Schaltet Animationen und den wandernden Schein im Hintergrund ab.') +
      '</div>' +

      /* ---- Netz ---- */
      '<div class="card">' +
        '<div class="card__head">' + u.icon('link', 18) + '<h3>Playlisten aus dem Netz</h3></div>' +
        '<div class="note" style="margin-bottom:12px">' + u.icon('info', 17) +
        '<div>Ein Browser darf eine fremde Adresse nur lesen, wenn der Anbieter es erlaubt (CORS). ' +
        'Sperrt er das, bleibt der Weg über <b>Datei</b> oder <b>Einfügen</b>. ' +
        'Ein <b>Vermittler</b> holt die Playlist stellvertretend — er sieht dabei die vollständige Adresse ' +
        'samt Zugangsdaten. Trage deshalb nur einen ein, dem du selbst vertraust.</div></div>' +
        sw('proxyOn', 'Vermittler verwenden',
           'Erst wird direkt versucht; erst wenn das misslingt, geht die Anfrage über den Vermittler.') +
        '<div class="field" style="padding:0 13px">' +
          '<label for="setProxy">Adresse des Vermittlers</label>' +
          '<input class="input" id="setProxy" spellcheck="false" autocomplete="off" ' +
          'placeholder="https://mein-proxy.example/?url={url}" value="' + u.esc(G.store.state.settings.proxy) + '">' +
          '<span class="field__hint">Der Platzhalter <b>{url}</b> wird durch die Adresse der Playlist ersetzt. ' +
          'Fehlt er, wird sie hinten angehängt.</span>' +
        '</div>' +
      '</div>' +

      /* ---- Daten ---- */
      '<div class="card">' +
        '<div class="card__head">' + u.icon('shield', 18) + '<h3>Daten auf diesem Gerät</h3></div>' +
        '<div class="grid grid--2" style="gap:12px;margin-bottom:14px">' +
          '<div class="stat"><span class="stat__k">Playlisten</span><span class="stat__v">' +
            G.store.state.playlists.length + '</span></div>' +
          '<div class="stat"><span class="stat__k">Belegt</span><span class="stat__v" id="setUsage">' +
            (usage ? u.fmtSize(usage.used) : '…') + '</span>' +
            '<span class="stat__d">Playlisten, Favoriten, Einstellungen</span></div>' +
        '</div>' +
        '<div class="btn-row">' +
          '<button class="btn" id="setExport">' + u.icon('download', 15) + ' Sicherung speichern</button>' +
          '<button class="btn" id="setImport">' + u.icon('upload', 15) + ' Sicherung einlesen</button>' +
          '<button class="btn btn--danger" id="setWipe">' + u.icon('trash', 15) + ' Alles löschen</button>' +
        '</div>' +
        '<p class="tiny dim" style="margin-top:10px">Die Sicherung enthält die Kopfdaten der Playlisten, ' +
        'die eigenen Sender, die Favoriten und die Einstellungen — nicht die Senderlisten selbst; ' +
        'die werden beim nächsten Aktualisieren wieder geholt.</p>' +
      '</div>' +

      /* ---- Installation ---- */
      '<div class="card">' +
        '<div class="card__head">' + u.icon('live', 18) + '<h3>Als App installieren</h3></div>' +
        '<div class="stack stack--sm">' +
          '<div class="note note--acc">' + u.icon('info', 17) +
          '<div><b>iPhone / iPad:</b> in Safari öffnen, <b>Teilen</b> antippen, ' +
          '<b>Zum Home-Bildschirm</b>. <br>' +
          '<b>Android:</b> in Chrome öffnen, Menü ⋮, <b>App installieren</b>.<br>' +
          'Danach startet GoTV im Vollbild wie eine normale App — und die gespeicherten ' +
          'Playlisten sind dieselben.</div></div>' +
          '<button class="btn btn--primary" id="setInstall" hidden>' + u.icon('download', 16) + ' Jetzt installieren</button>' +
        '</div>' +
      '</div>' +

      '<p class="tiny dim center">' + u.esc(G.NAME) + ' ' + u.esc(G.VERSION) + '</p>' +
    '</div>';
  }

  /* ------------------------------------------------------------
     Einhaengen
     ------------------------------------------------------------ */
  function mount(host) {
    /* Schalter */
    u.on(host, 'change', '[data-set]', function (e, t) {
      var key = t.getAttribute('data-set');
      G.store.setSetting(key, t.checked);

      if (key === 'reduceMotion') document.body.classList.toggle('no-motion', t.checked);
      if (key === 'resume' && t.checked) {
        u.toast('Gemerkt', 'Beim nächsten Start wird der letzte Sender vorbereitet.', 'ok', 2600);
      }
    });

    /* Lautstaerke */
    var vol = u.$('#setVol');
    if (vol) vol.oninput = function () {
      G.player.setVolume(u.num(vol.value, 80));
      u.$('#setVolV').textContent = vol.value + ' %';
      G.dock.paintMute();
    };

    /* Vermittler */
    var proxy = u.$('#setProxy');
    if (proxy) proxy.onchange = function () {
      G.store.setSetting('proxy', proxy.value.trim());
      u.toast('Gespeichert', 'Der Vermittler wird beim nächsten Abruf verwendet.', 'ok', 2600);
    };

    /* Sicherung */
    u.$('#setExport').onclick = exportSheet;
    u.$('#setImport').onclick = importSheet;
    u.$('#setWipe').onclick = wipe;

    /* Installation - der Browser meldet, wenn es geht (siehe app.js) */
    var install = u.$('#setInstall');
    if (install && G.app.canInstall()) {
      install.hidden = false;
      install.onclick = function () { G.app.install(); };
    }

    /* Belegter Platz */
    G.db.usage().then(function (u2) {
      usage = u2;
      var out = u.$('#setUsage');
      if (out) out.textContent = u2 ? u.fmtSize(u2.used) : 'unbekannt';
    });
  }

  /* ------------------------------------------------------------
     Sicherung
     ------------------------------------------------------------ */
  function exportSheet() {
    var hasXtream = G.store.state.playlists.some(function (p) { return G.xtream.isXtream(p.source); });

    u.openSheet('Sicherung speichern',
      '<div class="stack">' +
        '<p class="small muted">Eine Datei mit deinen Playlisten, eigenen Sendern, Favoriten und ' +
        'Einstellungen. Sie lässt sich auf einem anderen Gerät wieder einlesen.</p>' +
        (hasXtream
          ? '<label class="switch"><input type="checkbox" id="expSecrets">' +
            '<span class="switch__track"></span><span class="switch__label">' +
            '<b>Zugangsdaten mitnehmen</b><span>Ein Xtream-Zugang trägt Benutzer und Kennwort in der Adresse. ' +
            'Ohne diesen Haken werden sie unkenntlich gemacht — dann lässt sich die Playlist auf dem anderen ' +
            'Gerät aber nicht laden.</span></span></label>'
          : '') +
        '<button class="btn btn--primary btn--block" id="expGo">' + u.icon('download', 16) + ' Datei erstellen</button>' +
      '</div>',
      function (body) {
        body.querySelector('#expGo').onclick = function () {
          var secrets = body.querySelector('#expSecrets');
          var json = G.store.exportAll(secrets ? secrets.checked : false);
          var name = 'GoTV-Sicherung-' + new Date().toISOString().slice(0, 10) + '.json';
          var ok = u.download(name, json, 'application/json');
          u.closeSheet();
          u.toast(ok ? 'Sicherung erstellt' : 'Ging nicht', ok ? name : 'Der Browser hat den Download verhindert.',
            ok ? 'ok' : 'warn');
        };
      });
  }

  async function importSheet() {
    var picked = await u.pickFile('.json,application/json');
    if (!picked) return;

    try {
      G.store.importAll(picked.text);
      G.app.rerender();
      u.toast('Eingelesen', 'Playlisten wurden übernommen. Zum Laden der Sender: Alle aktualisieren.', 'ok', 6000);
    } catch (e) {
      u.toast('Ging nicht', String(e.message || e), 'err', 6000);
    }
  }

  async function wipe() {
    var ok = await u.confirmSheet({
      title: 'Alles löschen',
      body: 'Playlisten, Senderlisten, eigene Sender, Favoriten, Verlauf und Einstellungen ' +
            'werden von diesem Gerät entfernt. Das lässt sich nicht rückgängig machen.',
      ok: 'Endgültig löschen'
    });
    if (!ok) return;

    G.player.stop();
    await G.store.wipe();
    location.reload();
  }

  G.views.settings = {
    title: 'Einstellungen',
    sub: 'Gilt für dieses Gerät — es gibt kein Konto',
    render: render,
    mount: mount
  };
})(GoTV);
