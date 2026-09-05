/* ============================================================
   GoTV — Xtream-Zugaenge

   Viele Anbieter geben keine fertige M3U heraus, sondern drei
   Angaben: Adresse des Servers, Benutzer und Kennwort. Daraus
   entsteht die uebliche Abrufadresse

     http://server:port/get.php?username=U&password=P&type=m3u_plus&output=ts

   Die Zugangsdaten bleiben - wie alles andere - auf dem Geraet.
   Weitergegeben werden sie allein an den Anbieter selbst.
   ============================================================ */
(function (G) {
  'use strict';

  /** Setzt ein fehlendes Schema und nimmt den Schraegstrich am Ende weg. */
  function normalizeServer(server) {
    var text = String(server || '').trim();
    if (!text) return '';
    if (!/^https?:\/\//i.test(text)) text = 'http://' + text;
    return text.replace(/\/+$/, '');
  }

  /**
   * Baut die Abrufadresse einer Senderliste.
   * @param {{server:string,user:string,pass:string,output?:string}} access
   */
  function playlistUrl(access) {
    var server = normalizeServer(access && access.server);
    if (!server) return '';

    return server + '/get.php'
      + '?username=' + encodeURIComponent(String((access && access.user) || ''))
      + '&password=' + encodeURIComponent(String((access && access.pass) || ''))
      + '&type=m3u_plus'
      + '&output=' + encodeURIComponent(String((access && access.output) || 'ts'));
  }

  /**
   * Zerlegt eine vorhandene get.php-Adresse wieder in ihre Teile - damit
   * sich ein einmal eingetragener Zugang im Blatt aendern laesst.
   * Gibt null zurueck, wenn die Adresse nicht danach aussieht.
   */
  function fromUrl(url) {
    var text = String(url || '').trim();
    if (!/get\.php/i.test(text)) return null;

    try {
      var u = new URL(text);
      return {
        server: u.protocol + '//' + u.host,
        user: u.searchParams.get('username') || '',
        pass: u.searchParams.get('password') || '',
        output: u.searchParams.get('output') || 'ts'
      };
    } catch (e) {
      return null;
    }
  }

  /** Ist das eine Xtream-Abrufadresse? */
  function isXtream(url) {
    return /get\.php\?/i.test(String(url || ''));
  }

  /**
   * Dieselbe Adresse ohne Kennwort - so steht ein Zugang in der Oberflaeche
   * und in der Sicherung, ohne dass das Kennwort mitliest, wer daneben sitzt.
   */
  function masked(url) {
    return String(url || '').replace(/([?&]password=)[^&]*/i, '$1••••••');
  }

  G.xtream = {
    normalizeServer: normalizeServer,
    playlistUrl: playlistUrl,
    fromUrl: fromUrl,
    isXtream: isXtream,
    masked: masked
  };
})(GoTV);
