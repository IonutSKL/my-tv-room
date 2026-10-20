// Private mode: do not retain authenticated app pages on shared devices.
self.addEventListener('install', event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('tv-room-shell-')).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
// Requests go directly to Vercel so access protection is checked by the server.
