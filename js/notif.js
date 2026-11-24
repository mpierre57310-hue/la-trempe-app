// Notifications (Firebase Cloud Messaging) : seulement le mot du coach du lundi matin.
(function () {
  var CFG = window.TREMPE_CONFIG;
  var VERSION_FIREBASE = '10.12.2';
  var CLE_JETON = 'trempe_jeton';

  function configure() { return !!(CFG.firebase && CFG.firebase.apiKey && CFG.vapidKey); }

  function chargerScript(src) {
    return new Promise(function (ok, ko) {
      var s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = ko;
      document.head.appendChild(s);
    });
  }

  var pret = null;
  function firebasePret() {
    if (pret) { return pret; }
    var base = 'https://www.gstatic.com/firebasejs/' + VERSION_FIREBASE + '/';
    pret = chargerScript(base + 'firebase-app-compat.js')
      .then(function () { return chargerScript(base + 'firebase-messaging-compat.js'); })
      .then(function () {
        if (!window.firebase.apps.length) { window.firebase.initializeApp(CFG.firebase); }
        return window.firebase.messaging();
      });
    return pret;
  }

  function envoyerJeton() {
    return Promise.all([firebasePret(), navigator.serviceWorker.ready]).then(function (r) {
      return r[0].getToken({ vapidKey: CFG.vapidKey, serviceWorkerRegistration: r[1] });
    }).then(function (jeton) {
      if (!jeton) { return false; }
      var ancien = null;
      try { ancien = localStorage.getItem(CLE_JETON); } catch (e) {}
      if (ancien !== jeton) {
        window.TrempeApi.envoyer('jeton', { jeton: jeton, ancien: ancien || '', appareil: /iphone|ipad/i.test(navigator.userAgent) ? 'iPhone' : (/android/i.test(navigator.userAgent) ? 'Android' : 'Autre') });
        try { localStorage.setItem(CLE_JETON, jeton); } catch (e) {}
      }
      return true;
    });
  }

  var Notif = {
    disponible: function () {
      return configure() && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    },
    etat: function () {
      if (!Notif.disponible()) { return 'indisponible'; }
      if (Notification.permission === 'granted') { return 'actif'; }
      if (Notification.permission === 'denied') { return 'refuse'; }
      return 'a-demander';
    },
    // À appeler depuis un appui sur un bouton (obligatoire sur iPhone).
    activer: function () {
      if (!Notif.disponible()) { return Promise.resolve(false); }
      return Notification.requestPermission().then(function (p) {
        if (p !== 'granted') { return false; }
        return envoyerJeton().catch(function () { return false; });
      });
    },
    // Au démarrage : si déjà autorisé, vérifie que le jeton connu du coach est à jour.
    rafraichir: function () {
      if (Notif.etat() === 'actif') { envoyerJeton().catch(function () {}); }
    }
  };

  window.TrempeNotif = Notif;
  window.addEventListener('load', function () { setTimeout(Notif.rafraichir, 3000); });
})();
