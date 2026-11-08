/**
 * Dobson Pilot - Service Worker (v2.0)
 * Network-First strategy with automatic cache invalidation
 * to ensure newly deployed code loads immediately.
 */

const CACHE_NAME = "dobson-pilot-v10.6";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/app.js",
  "./js/config.js",
  "./js/state.js",
  "./js/i18n/i18n.js",
  "./js/i18n/it.json",
  "./js/i18n/en.json",
  "./js/i18n/es.json",
  "./js/i18n/fr.json",
  "./js/i18n/pt.json",
  "./js/transport/transport.js",
  "./js/transport/ble-transport.js",
  "./js/transport/mock-transport.js",
  "./js/transport/command-queue.js",
  "./js/transport/protocol.js",
  "./js/transport/transport-manager.js",
  "./js/astro/astro-calc.js",
  "./js/data/messier-data.js",
  "./js/data/stars-data.js",
  "./js/data/galaxies-data.js",
  "./js/data/nebulae-data.js",
  "./js/data/custom-db.js",
  "./js/data/tours-db.js",
  "./js/ui/router.js",
  "./js/ui/screens.js",
  "./js/ui/starfield.js",
  "./js/ui/status-bar.js",
  "./js/ui/debug-console.js",
  "./js/ui/joystick-view.js",
  "./js/ui/hand-move-view.js",
  "./js/ui/calendar-view.js",
  "./js/ui/show-settings-view.js",
  "./js/ui/other-settings-view.js",
  "./js/ui/app-settings-view.js",
  "./js/ui/goto-modal.js",
  "./js/ui/manual-goto-view.js",
  "./js/ui/solar-system-view.js",
  "./js/ui/catalog-view.js",
  "./js/ui/random-view.js",
  "./js/ui/alignment-view.js",
  "./js/ui/hardware-calib-views.js",
  "./js/ui/tours-view.js",
  "./js/ui/game-view.js",
  "./vendor/astronomy-engine.esm.js"
];

// Force immediate activation of new SW
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn("SW pre-cache warning:", err);
      });
    })
  );
});

// Purge all old caches on activation
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("Removing outdated cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First strategy: fetch fresh content from server first
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
      })
  );
});
