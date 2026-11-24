// Service worker de LA TREMPE APP : fonctionnement sans réseau et notifications.
var VERSION = 'trempe-1.1.0';
var FICHIERS = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/config.js', 'js/api.js', 'js/notif.js', 'js/app.js', 'js/demo.js',
  'icons/icone-192.png', 'icons/icone-512.png', 'icons/apple-touch-icon.png', 'icons/badge-96.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FICHIERS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (cles) {
    return Promise.all(cles.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') { return; }
  var url = new URL(req.url);
  // Jamais de mémoire pour les données du coach ni pour Firebase : toujours en direct.
  if (/script\.google(usercontent)?\.com|googleapis\.com\/(?!css)|firebase|gstatic\.com\/firebasejs/.test(url.href)) { return; }
  // Polices Google : gardées après le premier chargement.
  if (/fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    e.respondWith(caches.open(VERSION + '-polices').then(function (c) {
      return c.match(req).then(function (r) { return r || fetch(req).then(function (rep) { c.put(req, rep.clone()); return rep; }); });
    }));
    return;
  }
  if (url.origin !== self.location.origin) { return; }
  // Fichiers de l'appli : réponse immédiate depuis la mémoire, mise à jour en arrière-plan.
  e.respondWith(caches.open(VERSION).then(function (c) {
    return c.match(req, { ignoreSearch: req.mode === 'navigate' }).then(function (enMemoire) {
      var reseau = fetch(req).then(function (rep) { if (rep && rep.ok) { c.put(req, rep.clone()); } return rep; }).catch(function () { return enMemoire; });
      return enMemoire || reseau;
    });
  }));
});

// ---------- Notifications ----------
importScripts('js/config.js');
var CFG = self.TREMPE_CONFIG || {};
if (CFG.firebase && CFG.firebase.apiKey) {
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
  firebase.initializeApp(CFG.firebase);
  firebase.messaging().onBackgroundMessage(function (msg) {
    var d = (msg && msg.data) || {};
    return self.registration.showNotification(d.titre || 'Le mot du coach', {
      body: d.texte || '',
      icon: 'icons/icone-192.png',
      badge: 'icons/badge-96.png',
      tag: d.tag || 'mot-du-coach',
      data: { url: d.url || './' }
    });
  });
}

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var cible = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (liste) {
    for (var i = 0; i < liste.length; i++) { if ('focus' in liste[i]) { return liste[i].focus(); } }
    return self.clients.openWindow(cible);
  }));
});
