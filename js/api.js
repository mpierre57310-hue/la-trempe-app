// Échanges avec le script Google, mémoire du téléphone et file d'attente hors connexion.
(function () {
  var CFG = window.TREMPE_CONFIG;
  var CLE_CODE = 'trempe_code';
  var CLE_DONNEES = 'trempe_donnees';
  var CLE_FILE = 'trempe_file';

  function lire(cle, defaut) {
    try { var v = localStorage.getItem(cle); return v === null ? defaut : JSON.parse(v); } catch (e) { return defaut; }
  }
  function ecrire(cle, valeur) {
    try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch (e) {}
  }

  function demo() { return CFG.demo === true || /[?&]demo=1/.test(location.search); }

  var Api = {
    demo: demo,
    code: function () {
      var m = location.search.match(/[?&]code=([A-Za-z0-9_-]+)/);
      if (m) { ecrire(CLE_CODE, m[1]); }
      return lire(CLE_CODE, '');
    },
    enregistrerCode: function (code) { ecrire(CLE_CODE, String(code || '').trim()); },
    oublierCode: function () { try { localStorage.removeItem(CLE_CODE); localStorage.removeItem(CLE_DONNEES); } catch (e) {} },

    // Dernières données reçues (affichées tout de suite, même sans réseau).
    donneesEnMemoire: function () { return lire(CLE_DONNEES, null); },

    // Demande les données à jour au script.
    charger: function () {
      if (demo()) { return Promise.resolve(window.TREMPE_DEMO()); }
      var code = Api.code();
      if (!code) { return Promise.reject(new Error('code')); }
      var url = CFG.urlScript + '?api=donnees&code=' + encodeURIComponent(code) + '&v=' + Date.now();
      return fetch(url, { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d || d.ok !== true) { throw new Error((d && d.erreur) || 'reponse'); }
          ecrire(CLE_DONNEES, d);
          return d;
        });
    },

    // Envoi d'une action (coche, retour…). Sans réseau, elle attend dans la file.
    envoyer: function (action, donnees) {
      var element = { id: 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), action: action, donnees: donnees, le: new Date().toISOString() };
      var file = lire(CLE_FILE, []);
      file.push(element);
      ecrire(CLE_FILE, file);
      return Api.viderFile();
    },

    enAttente: function () { return lire(CLE_FILE, []); },

    // Envoie un par un ce qui attend. Chaque envoi porte un identifiant : le script ignore un doublon.
    viderFile: function () {
      if (Api._enCours) { return Api._enCours; }
      var file = lire(CLE_FILE, []);
      if (!file.length) { return Promise.resolve({ envoyes: 0, restants: 0 }); }
      if (demo()) {
        ecrire(CLE_FILE, []);
        return Promise.resolve({ envoyes: file.length, restants: 0 });
      }
      if (navigator.onLine === false) { return Promise.resolve({ envoyes: 0, restants: file.length }); }
      var envoyes = 0;
      var code = Api.code();
      var suivant = function () {
        var f = lire(CLE_FILE, []);
        if (!f.length) { return Promise.resolve(); }
        var el = f[0];
        return fetch(CFG.urlScript, {
          method: 'POST',
          body: JSON.stringify({ api: el.action, code: code, idLocal: el.id, saisiLe: el.le, donnees: el.donnees })
        })
          .then(function (r) { return r.json(); })
          .then(function (rep) {
            if (!rep || rep.ok !== true) {
              // Refus du script (donnée invalide) : on retire l'élément pour ne pas bloquer la file, et on le signale.
              if (rep && rep.definitif) { Api._retirer(el.id); Api._erreurs.push(rep.erreur || 'Envoi refusé'); return suivant(); }
              throw new Error((rep && rep.erreur) || 'envoi');
            }
            Api._retirer(el.id);
            envoyes++;
            return suivant();
          });
      };
      Api._enCours = suivant()
        .then(function () { return { envoyes: envoyes, restants: lire(CLE_FILE, []).length }; })
        .catch(function () { return { envoyes: envoyes, restants: lire(CLE_FILE, []).length }; })
        .then(function (res) { Api._enCours = null; return res; });
      return Api._enCours;
    },
    _retirer: function (id) {
      ecrire(CLE_FILE, lire(CLE_FILE, []).filter(function (x) { return x.id !== id; }));
    },
    _erreurs: [],
    _enCours: null
  };

  window.TrempeApi = Api;
})();
