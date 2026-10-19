// Weiterleitung: Das Trainings-Dojo liegt jetzt unter ../dojo/. Dieser Service Worker ersetzt den alten dieser Adresse (Testfassung „neue Navigation“),
// leert dessen Zwischenspeicher, meldet sich ab und führt geöffnete Fenster zur neuen Adresse. Fortschritt und Einstellungen bleiben erhalten:
// sie liegen im Speicher der ganzen Website, nicht im Ordner der App.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) await caches.delete(k);
    await self.registration.unregister();
    for (const c of await self.clients.matchAll({ type: 'window' })) { try { c.navigate(new URL('../dojo/', self.registration.scope).href); } catch (_) { /* Fenster schon zu */ } }
  })());
});
