/* ============================================================
   GoTV — Vermittler (Cloudflare Worker)

   Holt Playlisten und Streams stellvertretend und gibt sie über
   HTTPS mit CORS-Kopfzeilen zurück. Damit fallen die beiden
   Grenzen weg, an denen ein Browser sonst scheitert:

     CORS             der Anbieter erlaubt das Lesen nicht
     Mixed Content    die App läuft über https, der Sender über http

   Bei einer HLS-Playlist bleibt es nicht beim Durchreichen: die
   Adressen der Segmente, Varianten und Schlüssel werden im Text
   umgeschrieben, damit auch sie über den Vermittler laufen. Sonst
   holt der Browser sie wieder direkt — und blockt.

   Aufruf:
     https://<worker>/?url=<adresse>&key=<schluessel>

   Der Schlüssel steht als Secret KEY im Worker; ohne ihn wäre der
   Vermittler für jeden offen. ALLOW schränkt zusätzlich auf
   bestimmte Anbieter ein.
   ============================================================ */

/**
 * Kennung, unter der die Anbieter Anfragen zulassen.
 *
 * Viele IPTV-Server prüfen den User-Agent und antworten sonst schlicht mit
 * "Blocked". VLC ist die Kennung, die praktisch überall durchgeht — deshalb
 * gibt sich der Vermittler hier als VLC aus. Genau das kann ein Browser
 * nicht: er darf den User-Agent nicht setzen.
 */
const USER_AGENT = 'VLC/3.0.20 LibVLC/3.0.20';

/** Kopfzeilen, die nicht weitergereicht werden dürfen. */
const HOP_BY_HOP = [
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade', 'host',
  'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'x-forwarded-for'
];

export default {
  async fetch(request, env) {
    const here = new URL(request.url);

    if (request.method === 'OPTIONS') return preflight();

    const target = here.searchParams.get('url');
    if (!target) return info(here, env);

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return fail(405, 'Nur GET und HEAD.');
    }

    /* ---- Schlüssel ---- */
    if (env.KEY && here.searchParams.get('key') !== env.KEY) {
      return fail(401, 'Falscher oder fehlender Schlüssel.');
    }

    /* ---- Adresse prüfen ---- */
    let upstream;
    try {
      upstream = new URL(target);
    } catch {
      return fail(400, 'Das ist keine gültige Adresse.');
    }
    if (upstream.protocol !== 'http:' && upstream.protocol !== 'https:') {
      return fail(400, 'Nur http und https.');
    }
    if (!allowed(upstream.hostname, env)) {
      return fail(403, 'Dieser Anbieter steht nicht in der Liste erlaubter Hosts.');
    }

    /* ---- Holen ---- */
    let res;
    try {
      res = await fetch(upstream.toString(), {
        method: request.method,
        headers: forwardHeaders(request),
        redirect: 'follow'
      });
    } catch (e) {
      return fail(502, 'Der Anbieter war nicht erreichbar: ' + (e && e.message));
    }

    /* ---- Umschreiben oder durchreichen? ---- */
    // Der Ursprung nach etwaigen Umleitungen ist die Grundlage für
    // relative Adressen im Manifest.
    const base = res.url || upstream.toString();

    if (maybeManifest(res, upstream)) return await manifestOrPass(res, base, here, env);

    // Alles Übrige — Segmente, rohe Ströme, Schlüssel, Logos — wird
    // durchgereicht, ohne den Inhalt anzufassen.
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: cors(passthroughHeaders(res))
    });
  }
};

/* ------------------------------------------------------------------
   Manifest oder Senderliste?

   *.m3u8 ist doppeldeutig: es kann die Senderliste eines Anbieters sein
   oder das Manifest eines einzelnen HLS-Streams. Umgeschrieben wird nur
   das Manifest — dort muss der Browser die Segmente über den Vermittler
   holen.

   Eine Senderliste bleibt unangetastet und wird weitergestreamt, ohne
   sie überhaupt in den Speicher zu holen: sie hat schnell zehntausende
   Zeilen (bei Xtream über 10 MB). Sie umzuschreiben würde die Rechenzeit
   eines Workers sprengen — und wäre unnötig, weil GoTV die Adresse eines
   Senders von sich aus über den Vermittler schickt.
   ------------------------------------------------------------------ */
async function manifestOrPass(res, base, here, env) {
  if (!res.body) return new Response(null, { status: res.status, headers: cors(passthroughHeaders(res)) });

  const headers = cors({
    'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
    'Cache-Control': 'no-store'
  });

  const reader = res.body.getReader();
  const head = [];
  let size = 0;
  let ended = false;

  // Der Anfang genügt für die Entscheidung. Gelesen wird aus demselben
  // Leser, aus dem danach weitergelesen wird - kein tee(), das den Strom
  // doppelt puffern müsste.
  while (size < 4096) {
    const { done, value } = await reader.read();
    if (done) { ended = true; break; }
    head.push(value);
    size += value.length;
  }

  const decoder = new TextDecoder();
  const start = head.map((c) => decoder.decode(c, { stream: true })).join('');

  // Die #EXT-X--Zeilen kommen nur im Manifest vor. #EXTINF steht in beiden
  // Formen und taugt deshalb nicht als Merkmal.
  if (!start.toUpperCase().includes('#EXT-X-')) {
    // Senderliste: das Gelesene voran, der Rest fließt weiter durch.
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of head) controller.enqueue(chunk);
        if (ended) controller.close();
      },
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) controller.close(); else controller.enqueue(value);
      },
      cancel(reason) { return reader.cancel(reason); }
    });

    return new Response(stream, { status: res.status, headers });
  }

  // Manifest: klein genug, um es ganz zu lesen und umzuschreiben.
  let text = start;
  while (!ended) {
    const { done, value } = await reader.read();
    if (done) { ended = true; break; }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();

  return new Response(rewrite(text, base, here, env), { status: res.status, headers });
}

/* ------------------------------------------------------------------
   Umschreiben
   ------------------------------------------------------------------ */

/**
 * Schreibt die Adressen einer HLS-Playlist so um, dass sie wieder über
 * den Vermittler laufen. Betroffen sind
 *
 *   - jede Zeile ohne # (Segment oder Varianten-Manifest)
 *   - URI="..." in EXT-X-KEY, EXT-X-MAP, EXT-X-MEDIA,
 *     EXT-X-I-FRAME-STREAM-INF und EXT-X-PART/PRELOAD-HINT
 *
 * Relative Adressen werden zuvor gegen die Adresse der Playlist aufgelöst.
 */
function rewrite(text, base, here, env) {
  const wrap = (raw) => {
    const value = String(raw).trim();
    if (!value) return raw;
    // Data-URIs und bereits umgeschriebene Adressen bleiben, wie sie sind.
    if (/^data:/i.test(value)) return value;

    let absolute;
    try { absolute = new URL(value, base).toString(); }
    catch { return raw; }

    return proxied(absolute, here, env);
  };

  const attr = /(URI=")([^"]*)(")/i;

  return text.split('\n').map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    if (trimmed.charAt(0) === '#') {
      // Nur Zeilen mit URI="..." tragen eine Adresse.
      return attr.test(trimmed)
        ? trimmed.replace(attr, (m, a, uri, c) => a + wrap(uri) + c)
        : line;
    }

    return wrap(trimmed);
  }).join('\n');
}

/** Baut die Adresse, unter der eine Zieladresse über den Vermittler läuft. */
function proxied(absolute, here, env) {
  const out = here.origin + here.pathname + '?url=' + encodeURIComponent(absolute);
  return env.KEY ? out + '&key=' + encodeURIComponent(env.KEY) : out;
}

/* ------------------------------------------------------------------
   Erkennung
   ------------------------------------------------------------------ */

/**
 * Kommt hier überhaupt Text im M3U-Format? Entschieden wird nach Inhaltstyp
 * und Endung — beides ist bei IPTV-Anbietern unzuverlässig, deshalb beide
 * zusammen. Was durchkommt, wird gelesen; erst der Inhalt entscheidet, ob
 * umgeschrieben wird.
 */
function maybeManifest(res, upstream) {
  const path = upstream.pathname.toLowerCase();
  const query = upstream.search.toLowerCase();
  const type = (res.headers.get('content-type') || '').toLowerCase();

  const looksTexty =
    type.includes('mpegurl') || type.includes('m3u') ||
    path.endsWith('.m3u8') || path.endsWith('.m3u') ||
    // Xtream liefert die Senderliste über get.php, oft als octet-stream.
    path.endsWith('get.php') || query.includes('type=m3u');

  return looksTexty;
}

/** Steht der Anbieter auf der Liste? Ohne ALLOW ist jeder erlaubt. */
function allowed(hostname, env) {
  const list = String(env.ALLOW || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!list.length) return true;

  const host = hostname.toLowerCase();
  return list.some((entry) => host === entry || host.endsWith('.' + entry));
}

/* ------------------------------------------------------------------
   Kopfzeilen
   ------------------------------------------------------------------ */

/** Was mit hinausgeht: Bereichsanfragen ja, Herkunft und Kekse nein. */
function forwardHeaders(request) {
  const out = new Headers();
  out.set('User-Agent', USER_AGENT);
  out.set('Accept', '*/*');

  // Bereichsanfragen sind für das Spulen nötig und müssen durch.
  const range = request.headers.get('range');
  if (range) out.set('Range', range);

  return out;
}

/** Was zurückkommt: alles Nützliche, ohne die Weiterreich-Kopfzeilen. */
function passthroughHeaders(res) {
  const out = {};
  res.headers.forEach((value, name) => {
    if (HOP_BY_HOP.includes(name.toLowerCase())) return;
    if (name.toLowerCase().startsWith('access-control-')) return;   // wir setzen eigene
    if (name.toLowerCase() === 'set-cookie') return;
    out[name] = value;
  });
  return out;
}

function cors(extra) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type, Accept-Ranges',
    'Timing-Allow-Origin': '*',
    ...(extra || {})
  };
}

function preflight() {
  return new Response(null, { status: 204, headers: cors({ 'Access-Control-Max-Age': '86400' }) });
}

function fail(status, message) {
  return new Response(message + '\n', {
    status,
    headers: cors({ 'Content-Type': 'text/plain; charset=utf-8' })
  });
}

/* ------------------------------------------------------------------
   Auskunft, wenn jemand den Worker ohne Adresse aufruft
   ------------------------------------------------------------------ */
function info(here, env) {
  const example = here.origin + here.pathname + '?url={url}' + (env.KEY ? '&key=DEIN_SCHLUESSEL' : '');

  const body = [
    'GoTV — Vermittler',
    '',
    'Aufruf:  ?url=<adresse>' + (env.KEY ? '&key=<schluessel>' : ''),
    '',
    'In GoTV unter Einstellungen > Playlisten aus dem Netz eintragen:',
    '  ' + example,
    '',
    'Schlüssel gesetzt:      ' + (env.KEY ? 'ja' : 'NEIN — der Vermittler steht jedem offen!'),
    'Erlaubte Anbieter:      ' + (env.ALLOW ? env.ALLOW : 'alle'),
    ''
  ].join('\n');

  return new Response(body, { headers: cors({ 'Content-Type': 'text/plain; charset=utf-8' }) });
}
