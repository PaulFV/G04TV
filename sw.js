/* ============================================================
   G04TV — Service Worker

   Sorgt dafür, dass die App nach dem ersten Aufruf auch ohne
   Internetverbindung startet. Zwischengespeichert werden
   ausschließlich die eigenen Programmdateien — keine Playlisten,
   keine Streams, keine Anfragen an fremde Server.
   ============================================================ */
var CACHE = 'g04tv-v1.0.87';

var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/theme.css',
  './css/layout.css',
  './css/components.css',
  './css/player.css',
  './css/start.css',
  './css/playlists.css',
  './css/settings.css',
  './css/theme-light.css',
  './css/tablet.css',
  './css/legal.css',
  './js/util.js',
  './js/i18n.js',
  './js/m3u.js',
  './js/xtream.js',
  './js/db.js',
  './js/store.js',
  './js/player.js',
  './js/library.js',
  './js/lock.js',
  './js/dock.js',
  './js/carplay.js',
  './js/view-start.js',
  './js/view-live.js',
  './js/view-playlists.js',
  './js/view-settings.js',
  './js/info.js',
  './js/onboarding.js',
  './js/app.js',
  './art/start-hero.png',
  './art/start-favorites.png',
  './art/start-playlists.png',
  './art/playlist-link.png',
  './art/playlist-file.png',
  './art/playlist-text.png',
  './art/playlist-xtream.png',
  './art/playlist-empty.png',
  './art/playlist-channel.png',
  './privacy.html',
  './copyright.html',
  './icons/favicon-32.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', function (e) {
  // Jede Datei einzeln ablegen: eine fehlende Datei darf nicht dazu
  // führen, dass gar nichts zwischengespeichert wird.
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(ASSETS.map(function (url) {
        return c.add(url).catch(function () { /* diese eine Datei überspringen */ });
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // Fremde Adressen gehen den Service Worker nichts an: Playlisten und
  // Streams laufen unverändert am Zwischenspeicher vorbei.
  if (url.origin !== location.origin) return;

  // Navigationsanfragen: erst Netz, sonst die zwischengespeicherte Startseite
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).catch(function () { return caches.match('./index.html'); })
    );
    return;
  }

  // Programmdateien: erst das Netz, damit Änderungen sofort ankommen.
  // Der Zwischenspeicher ist die Rückfallebene ohne Verbindung.
  // cache: 'no-cache' fragt immer beim Server nach - GitHub Pages laesst
  // Dateien sonst bis zu 10 Minuten im Browser-Zwischenspeicher liegen.
  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) { return hit || Response.error(); });
    })
  );
});
