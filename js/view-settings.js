/* ============================================================
   G04TV — Bereich Einstellungen

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

  /** Der gespeicherte Puffer in Minuten, immer 1 bis 12. */
  function bufferValue(s) {
    var n = Math.round(Number(s.bufferMin));
    return n >= 1 && n <= 12 ? n : 1;
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
        '<div class="field" style="padding:0 13px 8px">' +
          '<label for="setProxy">Adresse des Vermittlers</label>' +
          '<input class="input" id="setProxy" spellcheck="false" autocomplete="off" ' +
          'placeholder="https://g04tv-proxy.dein-name.workers.dev/?url={url}&amp;key=…" value="' +
          u.esc(G.store.state.settings.proxy) + '">' +
          '<span class="field__hint">Der Platzhalter <b>{url}</b> wird durch die abzurufende Adresse ersetzt. ' +
          'Fehlt er, wird sie hinten angehängt. Im Ordner <b>proxy/</b> des Projekts liegt ein fertiger ' +
          'Cloudflare Worker dafür.</span>' +
        '</div>' +
        sw('proxyStreams', 'Auch Streams über den Vermittler',
           'Nicht nur die Playlist, sondern auch das Bild läuft über ihn. Damit spielen ' +
           '<b>http</b>-Sender trotz https und Anbieter, die CORS sperren. ' +
           'Der Preis: die <b>gesamte Bandbreite</b> geht durch den Vermittler — rund 2 GB je Stunde ' +
           'und Sender. Der mitgelieferte Worker schreibt die HLS-Segmente passend um.') +
        (G.store.state.settings.proxyStreams && !G.store.proxy()
          ? '<div class="note note--warn" style="margin:4px 13px 0">' + u.icon('warn', 16) +
            '<div>Es ist kein Vermittler eingeschaltet — der Schalter bleibt wirkungslos.</div></div>'
          : '') +
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
          'Danach startet G04TV im Vollbild wie eine normale App — und die gespeicherten ' +
          'Playlisten sind dieselben.</div></div>' +
          '<button class="btn btn--primary" id="setInstall" hidden>' + u.icon('download', 16) + ' Jetzt installieren</button>' +
        '</div>' +
      '</div>' +

      '<p class="tiny dim center">' + u.esc(G.NAME) + ' ' + u.esc(G.VERSION) + '</p>' +
    '</div>';
  }

  /** Auswahllisten werden von i18n.js nicht angefasst - hier selbst uebersetzen. */
  function tr(text) { return G.i18n ? G.i18n.t(text) : text; }

  /* ------------------------------------------------------------
     Sperre (Jugendschutz)
     ------------------------------------------------------------ */
  function lockSection() {
    var L = G.lock;
    if (!L) return '';
    var head = '<div class="settings-section__head">' + u.icon('lock', 22) + '<h3>Sperre (Jugendschutz)</h3></div>';
    if (!L.hasCode()) {
      return '<section class="card settings-section settings-lock">' + head +
        '<p class="settings-lock__intro">Mit einem 4-stelligen Code lassen sich Playlisten, Kategorien und einzelne Sender sperren. Gesperrte Sender laufen erst nach Eingabe des Codes.</p>' +
        '<div class="settings-actions"><button class="btn btn--primary" id="lockSet">' + u.icon('lock', 16) + ' Code festlegen</button></div>' +
      '</section>';
    }
    var n = L.counts();
    var open = L.isOpen();
    var left = Math.max(1, Math.ceil(L.openLeft() / 60000));
    return '<section class="card settings-section settings-lock">' + head +
      '<div class="settings-lock__state' + (open ? ' is-open' : '') + '">' +
        u.icon(open ? 'unlock' : 'lock', 20) +
        '<div><b>' + (open ? 'Entsperrt' : 'Code aktiv') + '</b>' +
        '<span>' + (open ? 'Wieder gesperrt in ' + left + ' Min.' : 'Gesperrte Inhalte brauchen den Code.') + '</span></div>' +
      '</div>' +
      '<div class="settings-lock__counts">' +
        '<div><span class="stat__v">' + n.playlists + '</span><span class="stat__d">Playlisten</span></div>' +
        '<div><span class="stat__v">' + n.groups + '</span><span class="stat__d">Kategorien</span></div>' +
        '<div><span class="stat__v">' + n.channels + '</span><span class="stat__d">Sender</span></div>' +
      '</div>' +
      '<p class="settings-lock__hint">' + u.icon('info', 15) + '<span>Sperren setzt du mit dem Schloss: an den Sendern auf der Startseite, an den Kategorien unter „Alle“ und an den Playlisten.</span></p>' +
      '<div class="settings-actions">' +
        (open ? '<button class="btn" id="lockNow">' + u.icon('lock', 16) + ' Jetzt sperren</button>' : '') +
        '<button class="btn" id="lockChange">' + u.icon('key', 16) + ' Code ändern</button>' +
        '<button class="btn btn--danger" id="lockRemove">' + u.icon('unlock', 16) + ' Sperre aufheben</button>' +
      '</div>' +
      '<p class="settings-section__foot">Der Code gilt nur auf diesem Gerät. Wer die Website-Daten im Browser löscht, löscht auch die Sperre.</p>' +
    '</section>';
  }

  function renderModern() {
    var s = G.store.state.settings;
    var lang = G.i18n ? G.i18n.language : 'de';

    return '<div class="view settings-view">' +
      '<div class="settings-intro">' +
        '<div><h2>Deine Einstellungen</h2><p>Wiedergabe, Darstellung und lokale Daten verwalten.</p></div>' +
        '<span class="settings-device">' + u.icon('shield', 18) + ' Nur auf diesem Gerät</span>' +
      '</div>' +

      // Schnellstart (frueher auf der Startseite)
      (G.views.start && G.views.start.quickCard ? G.views.start.quickCard() : '') +

      '<section class="card settings-section">' +
        '<div class="settings-section__head">' + u.icon('grid', 22) + '<h3>Sprache &amp; Darstellung</h3></div>' +
        '<div class="settings-grid settings-grid--2">' +
          '<div class="settings-panel settings-panel__language">' +
            u.icon('grid', 22) +
            '<div class="field"><label for="setLanguage">Anzeigesprache</label>' +
              '<select class="select" id="setLanguage">' +
                '<option value="de"' + (lang === 'de' ? ' selected' : '') + '>Deutsch</option>' +
                '<option value="en"' + (lang === 'en' ? ' selected' : '') + '>English</option>' +
              '</select></div>' +
          '</div>' +
          '<div class="settings-panel settings-panel__language">' +
            u.icon('settings', 22) +
            '<div class="field"><label for="setTheme">Farbschema</label>' +
              '<select class="select" id="setTheme">' +
                '<option value="dark"' + (s.theme !== 'light' ? ' selected' : '') + '>' + tr('Dunkel') + '</option>' +
                '<option value="light"' + (s.theme === 'light' ? ' selected' : '') + '>' + tr('Hell') + '</option>' +
              '</select></div>' +
          '</div>' +
          '<div class="settings-panel settings-panel--wide">' + sw('showTabbar', 'Untere Leiste anzeigen', 'Aus: mehr Platz für die Sender. Die Bereiche erreichst du dann über das Menü oben links.') + '</div>' +
          '<div class="settings-panel settings-panel--wide">' + sw('reduceMotion', 'Bewegung reduzieren', 'Animationen und Hintergrundschein abschalten.') + '</div>' +
        '</div>' +
      '</section>' +

      '<section class="card settings-section">' +
        '<div class="settings-section__head">' + u.icon('play', 22) + '<h3>Wiedergabe</h3></div>' +
        '<div class="settings-grid settings-grid--2">' +
          '<div class="settings-panel">' + sw('autoplay', 'Sofort abspielen', 'Sender beim Antippen direkt starten.') + '</div>' +
          '<div class="settings-panel">' + sw('resume', 'Letzten Sender beim Start laden', 'Zuletzt gesehenen Sender vorbereiten.') + '</div>' +
          '<div class="settings-panel settings-panel--wide">' + sw('confirmExternal', 'Vor „Extern öffnen“ fragen', 'Übergabe an einen anderen Player bestätigen.') + '</div>' +
          '<div class="settings-panel settings-range">' +
            '<div class="settings-range__head"><span>Lautstärke</span><span id="setVolV">' + s.volume + ' %</span></div>' +
            '<input type="range" id="setVol" min="0" max="100" value="' + s.volume + '">' +
            '<div class="settings-range__ends"><span>Leise</span><span>Laut</span></div>' +
          '</div>' +
          '<div class="settings-panel settings-range">' +
            '<div class="settings-range__head"><span>Puffer</span><span id="setBufV">' + bufferValue(s) + ' Min</span></div>' +
            '<input type="range" id="setBuf" min="1" max="12" step="1" value="' + bufferValue(s) + '">' +
            '<div class="settings-range__ends"><span>1 Min</span><span>12 Min</span></div>' +
            '<p class="settings-range__note">Wie viel Vorrat G04TV höchstens vorhält. Mehr Puffer braucht mehr Arbeitsspeicher. ' +
              'Gilt ab dem nächsten Sender. Ein Live-Sender füllt den Vorrat nur so schnell, wie der Anbieter liefert; ' +
              'bei HLS auf iPhone und iPad bestimmt das System den Puffer selbst.</p>' +
          '</div>' +
        '</div>' +
      '</section>' +

      lockSection() +

      '<section class="card settings-section">' +
        '<div class="settings-section__head">' + u.icon('link', 22) + '<h3>Playlisten aus dem Netz</h3></div>' +
        '<div class="settings-proxy__intro">' + u.icon('shield', 17) + '<div>Der Vermittler ist optional. Er holt eine blockierte Playlist stellvertretend — trage nur eine Adresse ein, der du selbst vertraust.</div></div>' +
        '<div class="settings-panel">' + sw('proxyOn', 'Vermittler verwenden', 'Direkt versuchen; nur bei Bedarf über den Vermittler laden.') + '</div>' +
        '<div class="field settings-proxy__field"><label for="setProxy">Adresse des Vermittlers</label>' +
          '<input class="input" id="setProxy" spellcheck="false" autocomplete="off" placeholder="https://g04tv-proxy.dein-name.workers.dev/?url={url}&amp;key=…" value="' + u.esc(s.proxy) + '">' +
          '<span class="settings-proxy__hint">Der Platzhalter <b>{url}</b> wird durch die abgerufene Adresse ersetzt.</span>' +
        '</div>' +
        '<div class="settings-panel">' + sw('proxyStreams', 'Auch Streams über den Vermittler', 'Playlist und Videostream über den Vermittler laden.') + '</div>' +
        (s.proxyStreams && !G.store.proxy()
          ? '<div class="note note--warn" style="margin-top:10px">' + u.icon('warn', 16) + '<div>Es ist kein Vermittler eingeschaltet — der Schalter bleibt wirkungslos.</div></div>'
          : '') +
      '</section>' +

      '<section class="card settings-section">' +
        '<div class="settings-section__head">' + u.icon('shield', 22) + '<h3>Daten auf diesem Gerät</h3></div>' +
        '<div class="settings-data">' +
          '<div class="settings-stat">' + u.icon('playlists', 30) + '<div class="settings-stat__main"><span class="stat__v">' + G.store.state.playlists.length + '</span><span class="stat__d">Playlisten</span></div></div>' +
          '<div class="settings-stat">' + u.icon('database', 30) + '<div class="settings-stat__main"><span class="stat__v" id="setUsage">' + (usage ? u.fmtSize(usage.used) : '…') + '</span><span class="stat__d">Playlisten, Favoriten, Einstellungen</span></div></div>' +
        '</div>' +
        '<div class="settings-actions">' +
          '<button class="btn" id="setExport">' + u.icon('download', 16) + ' Sicherung speichern</button>' +
          '<button class="btn" id="setImport">' + u.icon('upload', 16) + ' Sicherung einlesen</button>' +
          '<button class="btn btn--danger" id="setWipe">' + u.icon('trash', 16) + ' Alles löschen</button>' +
        '</div>' +
        '<p class="settings-section__foot">Die Sicherung enthält Einstellungen und Listen, nicht die Senderlisten selbst.</p>' +
      '</section>' +

      '<section class="card settings-section">' +
        '<div class="settings-section__head">' + u.icon('live', 22) + '<h3>Als App installieren</h3></div>' +
        '<div class="settings-install">' +
          '<div class="settings-install__art">' + u.icon('live', 22) + '</div>' +
          '<div class="settings-platforms">' +
            '<div class="settings-platform"><span class="settings-platform__os">●</span><b>iPhone / iPad</b><span>Safari · Teilen · Zum Home-Bildschirm</span></div>' +
            '<div class="settings-platform"><span class="settings-platform__os">◆</span><b>Android</b><span>Chrome · Menü · App installieren</span></div>' +
          '</div>' +
          '<div class="settings-install__action"><button class="btn btn--primary" id="setInstall" hidden>' + u.icon('download', 16) + ' Jetzt installieren</button></div>' +
        '</div>' +
      '</section>' +

      '<section class="card settings-section settings-feedback">' +
        '<div class="settings-section__head">' + u.icon('edit', 22) + '<h3>Feedback &amp; Ideen</h3></div>' +
        '<p class="settings-feedback__intro">Bug gefunden, eine Idee oder ein Wunsch? Schreib mir eine Nachricht — ganz ohne Konto.</p>' +
        '<form id="settingsFeedbackForm" class="settings-feedback__form" novalidate>' +
          '<div class="field">' +
            '<label for="feedbackMsg">Deine Nachricht</label>' +
            '<textarea class="textarea settings-feedback__msg" id="feedbackMsg" name="message" rows="4" maxlength="2000" required placeholder="Was möchtest du loswerden …"></textarea>' +
          '</div>' +
          '<div class="field">' +
            '<label for="feedbackEmail">Deine E-Mail <span class="dim">(optional, für eine Antwort)</span></label>' +
            '<input class="input" id="feedbackEmail" name="_replyto" type="email" inputmode="email" autocomplete="email" maxlength="120" placeholder="du@beispiel.de">' +
          '</div>' +
          '<input type="text" name="_honey" class="settings-feedback__trap" tabindex="-1" autocomplete="off" aria-hidden="true">' +
          '<div class="settings-feedback__foot">' +
            '<button type="submit" id="settingsFeedbackBtn" class="btn btn--primary">' + u.icon('upload', 16) + ' Senden</button>' +
            '<p id="settingsFeedbackStatus" class="settings-feedback__status" role="status" aria-live="polite"></p>' +
          '</div>' +
          '<p class="settings-section__foot">Die Nachricht wird über formsubmit.co an den Entwickler geschickt.</p>' +
        '</form>' +
      '</section>' +

      '<p class="tiny dim center">' + u.esc(G.NAME) + ' ' + u.esc(G.VERSION) + '</p>' +
    '</div>';
  }

  /* ------------------------------------------------------------
     Einhaengen
     ------------------------------------------------------------ */
  function mount(host) {
    /* Sprache und Farbschema - dieselben Wege wie die Knoepfe in der Kopfzeile */
    var language = u.$('#setLanguage');
    if (language) language.onchange = function () { if (G.i18n) G.i18n.setLanguage(language.value); };
    var theme = u.$('#setTheme');
    if (theme) theme.onchange = function () { G.app.setTheme(theme.value); };

    /* Schalter */
    u.on(host, 'change', '[data-set]', function (e, t) {
      var key = t.getAttribute('data-set');
      G.store.setSetting(key, t.checked);

      if (key === 'reduceMotion') document.body.classList.toggle('no-motion', t.checked);
      if (key === 'showTabbar') document.body.classList.toggle('no-tabbar', !t.checked);
      if (key === 'resume' && t.checked) {
        u.toast('Gemerkt', 'Beim nächsten Start wird der letzte Sender vorbereitet.', 'ok', 2600);
      }
      if (key === 'proxyStreams' && t.checked && !G.store.proxy()) {
        u.toast('Noch ohne Wirkung', 'Trage erst einen Vermittler ein und schalte ihn ein.', 'warn', 5000);
      }
      // Der Hinweis unter den Schaltern haengt an beiden - neu zeichnen.
      if (key === 'proxyOn' || key === 'proxyStreams') G.app.rerender();
    });

    /* Puffer (1-12 Minuten) - gilt ab dem naechsten Sender */
    var buf = u.$('#setBuf');
    if (buf) buf.oninput = function () {
      var n = G.u.clamp(Math.round(u.num(buf.value, 1)), 1, 12);
      G.store.setSetting('bufferMin', n);
      u.$('#setBufV').textContent = n + ' Min';
    };

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

    /* Sperre */
    var lockSet = u.$('#lockSet');
    if (lockSet) lockSet.onclick = async function () {
      if (await G.lock.setCode()) u.toast('Code festgelegt', 'Jetzt mit dem Schloss Sender, Kategorien oder Playlisten sperren.', 'ok', 4000);
    };
    var lockNow = u.$('#lockNow');
    if (lockNow) lockNow.onclick = function () { G.lock.relock(); u.toast('Gesperrt', 'Gesperrte Inhalte brauchen wieder den Code.', 'ok', 2600); };
    var lockChange = u.$('#lockChange');
    if (lockChange) lockChange.onclick = async function () {
      if (await G.lock.changeCode()) u.toast('Code geändert', '', 'ok', 2600);
    };
    var lockRemove = u.$('#lockRemove');
    if (lockRemove) lockRemove.onclick = async function () {
      if (await G.lock.removeCode()) u.toast('Sperre aufgehoben', 'Code und alle Sperren sind gelöscht.', 'ok', 3200);
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

    /* Feedback-Formular */
    var feedbackForm = u.$('#settingsFeedbackForm');
    if (feedbackForm) {
      feedbackForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (feedbackForm._honey.value) return;
        var msg = feedbackForm.message.value.trim();
        if (!msg) {
          var st = u.$('#settingsFeedbackStatus');
          st.textContent = tr('Bitte zuerst eine Nachricht schreiben.');
          st.className = 'settings-feedback__status is-err';
          feedbackForm.message.focus();
          return;
        }

        var btn = u.$('#settingsFeedbackBtn');
        var status = u.$('#settingsFeedbackStatus');
        btn.disabled = true;
        status.textContent = tr('Wird gesendet …');
        status.className = 'settings-feedback__status';

        fetch('https://formsubmit.co/ajax/FodorPaul@web.de', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            message: msg,
            _replyto: feedbackForm._replyto.value.trim(),
            _subject: 'G04TV — Feedback',
            _template: 'table',
            App: G.NAME + ' ' + G.VERSION
          })
        }).then(function (res) {
          if (!res.ok) throw new Error('Status ' + res.status);
          status.textContent = tr('Danke! Deine Nachricht ist unterwegs.');
          status.className = 'settings-feedback__status is-ok';
          feedbackForm.reset();
        }).catch(function (err) {
          status.textContent = tr('Senden hat nicht geklappt — bitte nochmal versuchen oder direkt an FodorPaul@web.de schreiben.');
          status.className = 'settings-feedback__status is-err';
        }).finally(function () {
          btn.disabled = false;
        });
      });
    }
  }

  /* ------------------------------------------------------------
     Sicherung
     ------------------------------------------------------------ */
  function exportSheet() {
    var hasXtream = G.store.state.playlists.some(function (p) { return G.xtream.hasSecret(p.source); });

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
          var name = 'G04TV-Sicherung-' + new Date().toISOString().slice(0, 10) + '.json';
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
    render: renderModern,
    mount: mount
  };
})(G04TV);
