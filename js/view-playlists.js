/* ============================================================
   GoTV — Bereich Playlisten

   Vier Wege hinein, wie im IPTV-Fenster von Connect+:
     Adresse    eine M3U/M3U8 im Netz
     Datei      eine M3U vom Gerät
     Einfügen   der Text einer Playlist
     Xtream     Server, Benutzer, Kennwort

   Gespeichert wird jede Playlist sofort: Kopfdaten im
   localStorage, die Senderliste in der IndexedDB.
   ============================================================ */
(function (G) {
  'use strict';
  var u = G.u;
  G.views = G.views || {};

  var busy = {};      // playlistId -> laeuft gerade ein Abruf

  /* ------------------------------------------------------------
     Anzeige
     ------------------------------------------------------------ */
  function kindLabel(kind) {
    return kind === 'url' ? 'Adresse'
      : kind === 'file' ? 'Datei'
      : kind === 'text' ? 'Eingefügt'
      : kind === 'xtream' ? 'Xtream'
      : kind;
  }

  function kindIcon(kind) {
    return kind === 'xtream' ? 'key' : kind === 'url' ? 'link' : 'file';
  }

  function card(p) {
    var active = p.id === G.store.state.activeId;
    // Immer maskieren: ein Kennwort steht nicht nur in Xtream-Adressen.
    var source = G.xtream.masked(p.source);

    return '<article class="pl-card' + (active ? ' is-active' : '') + '" data-pl="' + u.esc(p.id) + '">' +
      '<div class="pl-card__head">' +
        '<span class="pl-card__ic">' + u.icon(kindIcon(p.kind), 19) + '</span>' +
        '<span class="pl-card__main">' +
          '<b>' + u.esc(p.name) + '</b>' +
          '<span title="' + u.esc(source) + '">' + u.esc(u.shorten(source, 46)) + '</span>' +
        '</span>' +
      '</div>' +

      '<div class="pl-card__tags">' +
        '<span class="pill' + (active ? ' pill--acc' : '') + '">' + u.icon(kindIcon(p.kind), 12) + ' ' + kindLabel(p.kind) + '</span>' +
        '<span class="pill">' + u.fmtInt(p.count) + ' Sender</span>' +
        '<span class="pill pill--muted">' + u.icon('clock', 12) + ' ' + u.esc(u.relTime(p.updatedAt)) + '</span>' +
        (p.volatile ? '<span class="pill pill--gold">nur im Arbeitsspeicher</span>' : '') +
      '</div>' +

      (p.error
        ? '<div class="note note--warn" style="font-size:12.5px">' + u.icon('warn', 16) +
          '<div>' + u.esc(p.error) + '</div></div>'
        : '') +

      (busy[p.id] ? '<div class="bar bar--indet"><span class="bar__fill"></span></div>' : '') +

      '<div class="pl-card__foot">' +
        '<button class="btn btn--sm btn--primary" data-act="open">' + u.icon('play', 14) + ' Öffnen</button>' +
        (p.kind === 'file' || p.kind === 'text'
          ? '<button class="btn btn--sm" data-act="replace">' + u.icon('upload', 14) + ' Ersetzen</button>'
          : '<button class="btn btn--sm" data-act="refresh"' + (busy[p.id] ? ' disabled' : '') + '>' +
            u.icon('refresh', 14) + ' Aktualisieren</button>') +
        '<button class="btn btn--sm" data-act="rename">' + u.icon('edit', 14) + '</button>' +
        '<button class="btn btn--sm btn--danger" data-act="delete">' + u.icon('trash', 14) + '</button>' +
      '</div>' +
    '</article>';
  }

  function ownChannels() {
    var s = G.store.state;

    return '<div class="card">' +
      '<div class="card__head">' + u.icon('live', 18) + '<h3>Einzelne Sender</h3>' +
      '<span class="spacer"></span>' +
      '<button class="btn btn--sm" id="plAddChannel">' + u.icon('plus', 14) + ' Sender</button></div>' +
      '<p class="tiny dim" style="margin-bottom:12px">Ein einzelner Stream ohne Playlist — etwa ein Radiosender ' +
      'oder eine feste Adresse. Diese Sender stehen im Bereich Sender immer oben.</p>' +
      (s.channels.length
        ? '<div class="list">' + s.channels.map(function (c) {
            return '<div class="list__row">' +
              u.logoHtml(c, 'ch-row__logo') +
              '<span class="list__main"><b>' + u.esc(c.name) + '</b>' +
              '<span title="' + u.esc(c.url) + '">' + u.esc(u.shorten(c.url, 44)) + '</span></span>' +
              '<span class="list__end">' +
                '<button class="icon-btn" data-play-own="' + u.esc(c.url) + '" title="Abspielen" ' +
                'style="width:32px;height:32px;border-radius:9px">' + u.icon('play', 14) + '</button>' +
                '<button class="icon-btn" data-del-own="' + u.esc(c.url) + '" title="Entfernen" ' +
                'style="width:32px;height:32px;border-radius:9px">' + u.icon('trash', 14) + '</button>' +
              '</span></div>';
          }).join('') + '</div>'
        : '<div class="empty" style="padding:18px 6px"><b>Keine eigenen Sender</b></div>') +
    '</div>';
  }

  function render() {
    var s = G.store.state;

    return '<div class="view stack">' +

      '<div class="row row--wrap">' +
        '<button class="btn btn--primary" id="plAdd">' + u.icon('plus', 16) + ' Playlist hinzufügen</button>' +
        (s.playlists.length ? '<button class="btn" id="plRefreshAll">' + u.icon('refresh', 16) + ' Alle aktualisieren</button>' : '') +
        '<span class="spacer"></span>' +
      '</div>' +

      (s.playlists.length
        ? '<div class="grid grid--auto" id="plGrid">' + s.playlists.map(card).join('') + '</div>'
        : '<div class="card"><div class="empty">' + u.icon('playlists', 40) +
          '<b>Noch keine Playlist</b><p>GoTV bringt keine Sender mit — du trägst deine eigene Quelle ein. ' +
          'Sie bleibt auf dem Gerät gespeichert.</p>' +
          '<div class="btn-row"><button class="btn btn--primary" id="plAdd2">' + u.icon('plus', 16) + ' Jetzt hinzufügen</button></div>' +
          '</div></div>') +

      ownChannels() +

      '<div class="note">' + u.icon('info', 18) +
      '<div>Lässt sich eine Adresse nicht laden, liegt es fast immer am Anbieter: der Browser darf ' +
      'fremde Adressen nur lesen, wenn sie es erlauben (CORS). Dann die Playlist als Datei speichern ' +
      'und hier einlesen — oder in den Einstellungen einen Vermittler eintragen.</div></div>' +

    '</div>';
  }

  /* ------------------------------------------------------------
     Hinzufuegen
     ------------------------------------------------------------ */
  function addSheet() {
    var tab = 'url';

    u.openSheet('Playlist hinzufügen',
      '<div class="stack">' +
        '<div class="tabs" id="plTabs">' +
          '<button class="tabs__b is-on" data-tab="url">Adresse</button>' +
          '<button class="tabs__b" data-tab="file">Datei</button>' +
          '<button class="tabs__b" data-tab="text">Einfügen</button>' +
          '<button class="tabs__b" data-tab="xtream">Xtream</button>' +
        '</div>' +
        '<div id="plTabBody"></div>' +
      '</div>',
      function (body) {
        var host = body.querySelector('#plTabBody');
        paintTab();

        u.on(body.querySelector('#plTabs'), 'click', '[data-tab]', function (e, t) {
          tab = t.getAttribute('data-tab');
          u.$$('#plTabs .tabs__b').forEach(function (b) {
            b.classList.toggle('is-on', b.getAttribute('data-tab') === tab);
          });
          paintTab();
        });

        function paintTab() {
          host.innerHTML = tab === 'url' ? tabUrl()
            : tab === 'file' ? tabFile()
            : tab === 'text' ? tabText()
            : tabXtream();
          wireTab();
        }

        function wireTab() {
          var go = host.querySelector('[data-go-add]');
          if (go) go.onclick = function () { submit(tab, host); };

          var file = host.querySelector('#plFilePick');
          if (file) file.onclick = async function () {
            var picked = await u.pickFile('.m3u,.m3u8,.txt,audio/x-mpegurl,application/x-mpegurl,text/plain');
            if (!picked) return;
            host.querySelector('#plFileName').value = picked.name.replace(/\.(m3u8?|txt)$/i, '');
            host.dataset.text = picked.text;
            host.querySelector('#plFileInfo').textContent =
              picked.name + ' · ' + u.fmtSize(picked.text.length);
            host.querySelector('[data-go-add]').disabled = false;
          };
        }
      });
  }

  function tabUrl() {
    return '<div class="stack">' +
      '<div class="field"><label for="plUrl">Adresse der Playlist</label>' +
      '<input class="input" id="plUrl" type="url" inputmode="url" autocomplete="off" spellcheck="false" ' +
      'placeholder="https://beispiel.tv/playlist.m3u">' +
      '<span class="field__hint">Eine M3U- oder M3U8-Datei im Netz. Auch der get.php-Aufruf eines Anbieters passt hierher.</span></div>' +
      '<div class="field"><label for="plName">Name (frei)</label>' +
      '<input class="input" id="plName" placeholder="wird sonst aus der Adresse gebildet" autocomplete="off"></div>' +
      '<button class="btn btn--primary btn--block" data-go-add>' + u.icon('download', 16) + ' Laden und merken</button>' +
    '</div>';
  }

  function tabFile() {
    return '<div class="stack">' +
      '<div class="note">' + u.icon('info', 17) + '<div>Die Datei wird nur gelesen — sie verlässt das Gerät nicht. ' +
      'Eine so eingelesene Playlist lässt sich später nicht auffrischen, dafür braucht sie keine Verbindung.</div></div>' +
      '<button class="btn btn--block" id="plFilePick">' + u.icon('folder', 16) + ' M3U-Datei wählen</button>' +
      '<p class="tiny dim" id="plFileInfo">Keine Datei gewählt</p>' +
      '<div class="field"><label for="plFileName">Name</label>' +
      '<input class="input" id="plFileName" placeholder="Name der Playlist" autocomplete="off"></div>' +
      '<button class="btn btn--primary btn--block" data-go-add disabled>' + u.icon('check', 16) + ' Übernehmen</button>' +
    '</div>';
  }

  function tabText() {
    return '<div class="stack">' +
      '<div class="field"><label for="plTextName">Name</label>' +
      '<input class="input" id="plTextName" placeholder="Eingefügte Playlist" autocomplete="off"></div>' +
      '<div class="field"><label for="plText">Inhalt der M3U</label>' +
      '<textarea class="textarea" id="plText" spellcheck="false" placeholder="#EXTM3U&#10;#EXTINF:-1 group-title=&quot;Nachrichten&quot;,Das Erste&#10;https://…"></textarea>' +
      '<span class="field__hint">Alles ab <b>#EXTM3U</b> einfügen. Praktisch, wenn der Anbieter den Abruf aus dem Browser sperrt.</span></div>' +
      '<button class="btn btn--primary btn--block" data-go-add>' + u.icon('check', 16) + ' Übernehmen</button>' +
    '</div>';
  }

  function tabXtream() {
    return '<div class="stack">' +
      '<div class="note">' + u.icon('shield', 17) + '<div>Server, Benutzer und Kennwort bleiben auf dem Gerät. ' +
      'Sie gehen ausschließlich an den Anbieter selbst.</div></div>' +
      '<div class="field"><label for="xServer">Server</label>' +
      '<input class="input" id="xServer" inputmode="url" autocomplete="off" spellcheck="false" placeholder="http://anbieter.tv:8080"></div>' +
      '<div class="field"><label for="xUser">Benutzer</label>' +
      '<input class="input" id="xUser" autocomplete="off" spellcheck="false"></div>' +
      '<div class="field"><label for="xPass">Kennwort</label>' +
      '<input class="input" id="xPass" type="password" autocomplete="off" spellcheck="false"></div>' +
      '<div class="field"><label for="xName">Name (frei)</label>' +
      '<input class="input" id="xName" placeholder="Name des Anbieters" autocomplete="off"></div>' +
      '<button class="btn btn--primary btn--block" data-go-add>' + u.icon('download', 16) + ' Laden und merken</button>' +
    '</div>';
  }

  /* ------------------------------------------------------------
     Uebernehmen
     ------------------------------------------------------------ */
  async function submit(tab, host) {
    var go = host.querySelector('[data-go-add]');
    var before = go.innerHTML;
    go.disabled = true;
    go.innerHTML = u.icon('refresh', 16) + ' Wird geladen …';

    try {
      if (tab === 'url') {
        var url = host.querySelector('#plUrl').value.trim();
        if (!url) throw new Error('Bitte eine Adresse eintragen.');
        if (!G.m3u.isUrl(url)) throw new Error('Das sieht nicht nach einer http- oder https-Adresse aus.');
        // Wer den get.php-Aufruf seines Anbieters hier einträgt, hat einen
        // Xtream-Zugang - dann auch als solcher führen, damit das Kennwort
        // in der Anzeige unkenntlich bleibt.
        await addUrl(url, host.querySelector('#plName').value.trim(),
                     G.xtream.isXtream(url) ? 'xtream' : 'url');
        return;
      }

      if (tab === 'xtream') {
        var access = {
          server: host.querySelector('#xServer').value,
          user: host.querySelector('#xUser').value,
          pass: host.querySelector('#xPass').value
        };
        if (!access.server || !access.user || !access.pass) throw new Error('Server, Benutzer und Kennwort werden gebraucht.');
        var built = G.xtream.playlistUrl(access);
        await addUrl(built, host.querySelector('#xName').value.trim() || G.m3u.hostOf(built), 'xtream');
        return;
      }

      if (tab === 'file') {
        var text = host.dataset.text || '';
        if (!text) throw new Error('Erst eine Datei wählen.');
        var name = host.querySelector('#plFileName').value.trim() || 'Playlist';
        var res = await G.library.addFromText(name, text, 'file', name + '.m3u');
        done(res.playlist, res.count);
        return;
      }

      var raw = host.querySelector('#plText').value;
      if (!raw.trim()) throw new Error('Es wurde nichts eingefügt.');
      var nameT = host.querySelector('#plTextName').value.trim() || 'Eingefügte Playlist';
      var resT = await G.library.addFromText(nameT, raw, 'text', nameT);
      done(resT.playlist, resT.count);

    } catch (e) {
      go.disabled = false;
      go.innerHTML = before;
      u.toast('Ging nicht', String(e.message || e), 'err', 7000);
    }
  }

  async function addUrl(url, name, kind) {
    var res = await G.library.addAndLoad({
      name: name || G.m3u.nameFromSource(url),
      source: url,
      kind: kind
    });

    if (!res.ok) {
      // Der Eintrag bleibt stehen - mit seinem Fehler; so laesst er sich
      // spaeter erneut versuchen, ohne alles neu zu tippen.
      u.closeSheet();
      G.app.rerender();
      u.toast('Playlist nicht geladen', res.error, 'warn', 8000);
      return;
    }
    done(res.playlist, res.count);
  }

  function done(p, count) {
    G.store.setActive(p.id);
    u.closeSheet();
    G.app.rerender();
    u.toast('Playlist gespeichert', p.name + ' · ' + u.fmtInt(count) + ' Sender', 'ok');
  }

  /* ------------------------------------------------------------
     Einzelne Sender
     ------------------------------------------------------------ */
  function channelSheet() {
    u.openSheet('Einzelnen Sender eintragen',
      '<div class="stack">' +
        '<div class="field"><label for="cName">Name</label>' +
        '<input class="input" id="cName" placeholder="z. B. NDR 2" autocomplete="off"></div>' +
        '<div class="field"><label for="cUrl">Adresse des Streams</label>' +
        '<input class="input" id="cUrl" type="url" inputmode="url" spellcheck="false" autocomplete="off" ' +
        'placeholder="https://…/stream.m3u8"></div>' +
        '<div class="field"><label for="cGroup">Gruppe</label>' +
        '<input class="input" id="cGroup" value="Eigene Sender" autocomplete="off"></div>' +
        '<button class="btn btn--primary btn--block" id="cSave">' + u.icon('check', 16) + ' Eintragen</button>' +
      '</div>',
      function (body) {
        body.querySelector('#cSave').onclick = function () {
          var url = body.querySelector('#cUrl').value.trim();
          if (!url) { u.toast('Adresse fehlt', 'Ohne Adresse geht es nicht.', 'warn'); return; }

          var added = G.store.addChannel({
            name: body.querySelector('#cName').value.trim(),
            url: url,
            group: body.querySelector('#cGroup').value.trim() || 'Eigene Sender'
          });

          u.closeSheet();
          G.app.rerender();
          u.toast(added ? 'Sender eingetragen' : 'Schon vorhanden',
            added ? added.name : 'Dieser Stream steht bereits in der Liste.', added ? 'ok' : 'warn');
        };
      });
  }

  /* ------------------------------------------------------------
     Einhaengen
     ------------------------------------------------------------ */
  function mount(host) {
    if (u.$('#plAdd')) u.$('#plAdd').onclick = addSheet;
    if (u.$('#plAdd2')) u.$('#plAdd2').onclick = addSheet;

    var all = u.$('#plRefreshAll');
    if (all) all.onclick = refreshAll;

    var addCh = u.$('#plAddChannel');
    if (addCh) addCh.onclick = channelSheet;

    u.on(host, 'click', '[data-act]', function (e, t) {
      var card = t.closest('[data-pl]');
      if (!card) return;
      action(t.getAttribute('data-act'), card.getAttribute('data-pl'));
    });

    u.on(host, 'click', '[data-play-own]', function (e, t) {
      var url = t.getAttribute('data-play-own');
      var c = G.store.state.channels.filter(function (x) { return G.m3u.sameSource(x.url, url); })[0];
      if (!c) return;
      G.views.live.playChannel(c);
      G.app.go('live');
    });

    u.on(host, 'click', '[data-del-own]', async function (e, t) {
      var url = t.getAttribute('data-del-own');
      var ok = await u.confirmSheet({
        title: 'Sender entfernen',
        body: 'Der eingetragene Sender wird aus der Liste genommen.',
        ok: 'Entfernen'
      });
      if (!ok) return;
      G.store.removeChannel(url);
      G.app.rerender();
    });
  }

  async function action(act, id) {
    var p = G.store.playlist(id);
    if (!p) return;

    if (act === 'open') {
      G.store.setActive(id);
      G.app.go('live');
      return;
    }

    if (act === 'refresh') {
      busy[id] = true;
      G.app.rerender();
      var res = await G.library.refresh(id);
      delete busy[id];
      G.app.rerender();
      if (res.ok) u.toast('Aktualisiert', p.name + ' · ' + u.fmtInt(res.count) + ' Sender', 'ok');
      else u.toast('Nicht geladen', res.error, 'warn', 8000);
      return;
    }

    if (act === 'replace') {
      var picked = await u.pickFile('.m3u,.m3u8,.txt,audio/x-mpegurl,application/x-mpegurl,text/plain');
      if (!picked) return;
      try {
        var count = await G.library.replaceFromText(id, picked.text);
        G.app.rerender();
        u.toast('Ersetzt', p.name + ' · ' + u.fmtInt(count) + ' Sender', 'ok');
      } catch (e) {
        u.toast('Ging nicht', String(e.message || e), 'err', 7000);
      }
      return;
    }

    if (act === 'rename') {
      u.openSheet('Playlist umbenennen',
        '<div class="stack">' +
          '<div class="field"><label for="rnName">Name</label>' +
          '<input class="input" id="rnName" value="' + u.esc(p.name) + '" autocomplete="off"></div>' +
          '<div class="field"><label>Quelle</label>' +
          '<div class="code">' + u.esc(G.xtream.masked(p.source)) + '</div></div>' +
          '<div class="btn-row">' +
            '<button class="btn" id="rnCopy">' + u.icon('link', 15) + ' Adresse kopieren</button>' +
            '<button class="btn btn--primary" id="rnSave">Speichern</button>' +
          '</div>' +
        '</div>',
        function (body) {
          body.querySelector('#rnSave').onclick = function () {
            G.store.renamePlaylist(id, body.querySelector('#rnName').value);
            u.closeSheet();
            G.app.rerender();
          };
          body.querySelector('#rnCopy').onclick = async function () {
            var ok = await u.copy(p.source);
            u.toast(ok ? 'Kopiert' : 'Ging nicht',
              ok ? 'Die vollständige Adresse liegt in der Zwischenablage.' : 'Der Browser hat es verhindert.',
              ok ? 'ok' : 'warn');
          };
        });
      return;
    }

    if (act === 'delete') {
      var sure = await u.confirmSheet({
        title: 'Playlist löschen',
        body: '<b>' + u.esc(p.name) + '</b> wird mit allen ' + u.fmtInt(p.count) +
              ' Sendern entfernt. Favoriten aus dieser Liste bleiben bestehen.',
        ok: 'Löschen'
      });
      if (!sure) return;
      G.library.forget(id);
      await G.store.removePlaylist(id);
      G.app.rerender();
      u.toast('Gelöscht', p.name, 'ok');
    }
  }

  async function refreshAll() {
    var lists = G.store.state.playlists.filter(function (p) { return p.kind === 'url' || p.kind === 'xtream'; });
    if (!lists.length) { u.toast('Nichts zu tun', 'Keine Playlist stammt aus dem Netz.', 'warn'); return; }

    var ok = 0, bad = 0;
    for (var i = 0; i < lists.length; i++) {
      busy[lists[i].id] = true;
      G.app.rerender();
      var res = await G.library.refresh(lists[i].id);
      delete busy[lists[i].id];
      if (res.ok) ok++; else bad++;
    }
    G.app.rerender();
    u.toast('Fertig', ok + ' aktualisiert' + (bad ? ', ' + bad + ' mit Fehler' : ''), bad ? 'warn' : 'ok');
  }

  G.views.playlists = {
    title: 'Playlisten',
    sub: function () {
      var s = G.store.state;
      return s.playlists.length
        ? s.playlists.length + (s.playlists.length === 1 ? ' Liste' : ' Listen') + ' · gespeichert auf diesem Gerät'
        : 'Quelle eintragen — Adresse, Datei, Text oder Xtream';
    },
    render: render,
    mount: mount
  };
})(GoTV);
