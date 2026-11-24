// LA TREMPE APP – écrans, gestes et retour de séance.
(function () {
  var Api = window.TrempeApi;
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var esc = function (v) {
    return String(v === undefined || v === null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  var ICONE = {
    fleche: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    haut: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    gauche: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    droite: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
    coche: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
    cloche: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    nuage: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>',
    accueil: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    seance: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/></svg>',
    progres: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19l5-6 4 3 7-9"/><path d="M15 7h5v5"/></svg>'
  };
  var JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var JOURS_LONGS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  var dateIso = function (s) { var p = String(s || '').split('-'); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; };
  var isoDe = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var jjmm = function (d) { return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); };

  var etat = {
    d: null,            // données du script
    onglet: 'accueil',  // accueil | progres
    seanceId: null,     // séance ouverte par-dessus
    ex: 0,
    retour: null,       // brouillon du retour en cours
    installer: null     // invitation d'installation (Android)
  };

  // ---------- Démarrage ----------
  function demarrer() {
    construireSquelette();
    if (!Api.code() && !Api.demo()) { afficherConnexion(); return; }
    var memo = Api.donneesEnMemoire();
    if (memo) { etat.d = memo; tout(); } else { $('#ecran-accueil').innerHTML = '<div class="chargement">Chargement…</div>'; }
    actualiser();
    Api.viderFile().then(apresEnvoi);
    window.addEventListener('online', function () { Api.viderFile().then(apresEnvoi); actualiser(); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') { Api.viderFile().then(apresEnvoi); actualiser(); }
    });
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); etat.installer = e; dessinerAccueil(); });
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  function actualiser() {
    return Api.charger().then(function (d) { etat.d = d; tout(); }).catch(function (err) {
      if (err && /code|inconnu/i.test(err.message)) { Api.oublierCode(); afficherConnexion('Ce code ne correspond à aucun client. Vérifie le lien reçu de ton coach.'); return; }
      if (!etat.d) { $('#ecran-accueil').innerHTML = '<div class="vide">Impossible de charger tes données. Vérifie ta connexion puis rouvre l’appli.</div>'; }
    });
  }

  function apresEnvoi(res) {
    if (res && res.envoyes) { dessinerAccueil(); if (res.restants === 0 && etat._attenteAnnoncee) { toast('Ton retour en attente est parti.'); etat._attenteAnnoncee = false; } }
    if (Api._erreurs.length) { toast(Api._erreurs.shift()); }
  }

  function construireSquelette() {
    $('#app').innerHTML =
      '<div class="ecran" id="ecran-accueil"></div>' +
      '<div class="ecran onglet-cache" id="ecran-progres"></div>' +
      '<div class="ecran cache" id="ecran-seance" aria-hidden="true"></div>' +
      '<nav class="nav" aria-label="Navigation">' +
        '<button type="button" class="press" data-nav="accueil" aria-current="page">' + ICONE.accueil + 'Accueil</button>' +
        '<button type="button" class="press" data-nav="seance">' + ICONE.seance + 'Séance</button>' +
        '<button type="button" class="press" data-nav="progres">' + ICONE.progres + 'Progrès</button>' +
      '</nav>' +
      '<div class="voile" id="voile" aria-hidden="true"></div>' +
      '<section class="panneau" id="panneau" role="dialog" aria-modal="true" aria-label="Mon retour de séance">' +
        '<div class="poignee" id="poignee"><span></span></div><div class="corps" id="panneau-corps"></div>' +
      '</section>' +
      '<div class="toast" id="toast" role="status" aria-live="polite"></div>' +
      '<div class="repos" id="repos" aria-live="polite" hidden></div>';
    $('#app').addEventListener('click', surClic);
    $('#app').addEventListener('input', surSaisie);
    $('#app').addEventListener('change', surSaisie);
    $('#voile').addEventListener('click', function () { fermerRetour(true); });
    brancherTirage();
    brancherBordGauche();
  }

  function tout() {
    dessinerAccueil();
    dessinerProgres();
    if (etat.seanceId) { dessinerSeance(); }
  }

  // ---------- Connexion par code ----------
  function afficherConnexion(msg) {
    var div = document.createElement('div');
    div.className = 'connexion';
    div.innerHTML =
      '<h1>La Trempe<br>App</h1>' +
      '<p>Colle le lien personnel reçu de ton coach (ou seulement le code). Tu ne le feras qu’une fois sur ce téléphone.</p>' +
      (msg ? '<p class="erreur-champ" style="color:#fff">' + esc(msg) + '</p>' : '') +
      '<label class="sr" for="code">Code personnel</label>' +
      '<input id="code" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Ton lien ou ton code">' +
      '<button type="button" class="btn centre press" id="valider-code">Entrer</button>';
    document.body.appendChild(div);
    $('#valider-code', div).addEventListener('click', function () {
      var c = $('#code', div).value.trim();
      var m = c.match(/[?&]code=([A-Za-z0-9_-]+)/);
      if (m) { c = m[1]; }
      if (!c) { return; }
      Api.enregistrerCode(c);
      div.remove();
      $('#ecran-accueil').innerHTML = '<div class="chargement">Chargement…</div>';
      actualiser();
    });
  }

  // ---------- Accueil ----------
  function seances() { return (etat.d && etat.d.seances) || []; }
  function seanceDuJour() {
    var l = seances();
    var auj = l.filter(function (s) { return s.statut === "Aujourd'hui"; })[0];
    if (auj) { return auj; }
    return l.filter(function (s) { return s.statut === 'À faire'; })[0] || null;
  }

  function dessinerAccueil() {
    var d = etat.d;
    var el = $('#ecran-accueil');
    if (!d) { return; }
    var auj = dateIso(d.aujourdhui) || new Date();
    var h = '';
    h += '<header class="bandeau"><div class="ligne"><span>' + esc(d.semaine && d.semaine.libelle) + '</span><span>' + esc(JOURS_LONGS[auj.getDay()] + ' ' + auj.getDate() + ' ' + MOIS[auj.getMonth()]) + '</span></div>' +
      '<h1>Bonjour<br>' + esc(d.client && d.client.prenom) + '.</h1>' +
      (d.cycle && d.cycle.phase ? '<div class="cycle">' + esc(d.cycle.phase) + '</div>' : '') + '</header>';
    h += '<main class="contenu">';
    if (d.demo && window.TREMPE_DEMO_PROFILS) {
      h += '<div class="bloc"><span class="rubrique">Démo · profil</span><div class="puces d3" style="margin-top:8px">' +
        window.TREMPE_DEMO_PROFILS.map(function (x) {
          return '<button type="button" class="puce press" data-action="profil-demo" data-profil="' + x[0] + '" aria-pressed="' + (d.profilDemo === x[0] ? 'true' : 'false') + '">' + x[1] + '</button>';
        }).join('') + '</div></div>';
    }

    h += blocSemainePlan(d.plan);

    var attente = Api.enAttente().filter(function (x) { return x.action === 'retour'; }).length;
    if (attente) {
      h += '<div class="bloc"><div class="attente">' + ICONE.nuage + '<span>' + (attente > 1 ? attente + ' retours attendent' : '1 retour attend') + ' le réseau pour partir.</span></div></div>';
    }
    var brs = brouillonsListe();
    if (brs.length) {
      h += '<section class="bloc"><h2 class="rubrique">Retour à faire</h2>';
      brs.forEach(function (r) {
        var sx = seanceDeLibelle(r.prevue), dx = sx ? dateIso(sx.date) : null;
        h += '<button type="button" class="lien-ligne press" data-action="ouvrir-brouillon" data-cle="' + esc(r.prevue) + '"><span class="t"><b>' + esc(sx ? sx.nom : r.prevue) + '</b><span class="doux">' +
          esc(dx ? JOURS_LONGS[dx.getDay()] + ' ' + jjmm(dx) : 'Séance non prévue') + ' · à terminer</span></span>' + ICONE.droite + '</button>';
      });
      h += '</section>';
    }
    (d.alertes || []).forEach(function (a) { h += '<div class="bloc"><div class="alerte">' + esc(a) + '</div></div>'; });

    var s = seanceDuJour();
    h += '<section class="bloc fort">';
    if (s) {
      var auj2 = s.statut === "Aujourd'hui";
      var dj = dateIso(s.date);
      h += '<div class="etiquette ' + (s.type === 'muscu' ? 'muscu' : 'course') + '">' + (auj2 ? "Aujourd'hui" : 'Prochaine · ' + (dj ? JOURS_LONGS[dj.getDay()].toLowerCase() : '')) + ' · ' + (s.type === 'muscu' ? 'Musculation' : 'Course') + '</div>';
      h += '<h2 class="nom-seance">' + esc(s.nom) + '</h2>';
      if (s.type === 'muscu') {
        var n = (s.exercices || []).length, f = (s.exercices || []).filter(function (e) { return e.fait; }).length;
        h += '<div class="doux">' + n + ' exercice' + (n > 1 ? 's' : '') + (f ? ' · ' + f + ' / ' + n + ' fait' + (f > 1 ? 's' : '') : '') + '</div>';
      } else if (s.duree) {
        h += '<div><span class="chiffre">' + esc(s.duree) + '<small> min</small></span></div>';
      }
      h += '<button type="button" class="btn press" data-action="ouvrir-seance" data-id="' + esc(s.id) + '">' + (s.type === 'muscu' ? 'Faire ma séance' : 'Voir ma séance') + ICONE.fleche + '</button>';
    } else {
      h += '<div class="etiquette course">Cette semaine</div><h2 class="nom-seance">Pas d’autre séance prévue</h2>';
    }
    h += '<button type="button" class="btn clair press" data-action="ouvrir-retour">Faire mon retour de séance' + ICONE.haut + '</button>';
    h += '</section>';

    if (d.message) {
      h += '<section class="bloc"><h2 class="rubrique">Le mot du coach</h2><p class="citation">« ' + esc(d.message) + ' »</p></section>';
    }
    if (d.cycle && d.cycle.conseil) {
      h += '<section class="bloc"><h2 class="rubrique">Repère du cycle</h2><p style="margin:0;font-size:16px;line-height:1.5">' + esc(d.cycle.conseil) + '</p></section>';
    }

    var l = seances();
    if (l.length) {
      h += '<section class="bloc"><h2 class="rubrique" style="margin-bottom:6px">Cette semaine</h2>';
      l.forEach(function (x) {
        var dj = dateIso(x.date);
        var cl = x.statut === 'Fait' ? 'fait' : (x.statut === "Aujourd'hui" ? 'auj' : (/^Manqu/.test(x.statut) ? 'manquee' : ''));
        h += '<button type="button" class="jour press" data-action="ouvrir-seance" data-id="' + esc(x.id) + '">' +
          '<span class="j">' + esc(dj ? JOURS[dj.getDay()] : '') + '</span>' +
          '<span class="trait" style="background:' + (x.type === 'muscu' ? 'var(--muscu)' : 'var(--course)') + '"></span>' +
          '<span class="n">' + esc(x.nom) + '</span><span class="s ' + cl + '">' + esc(x.statut) + '</span></button>';
      });
      h += '</section>';
    }

    if (d.mesures && d.mesures.pesee && d.mesures.pesee.objectif) {
      var p = d.mesures.pesee;
      if (p.faites < p.objectif) {
        h += '<button type="button" class="lien-ligne press" data-action="mesures"><span class="t"><b>Pesée à faire</b><span class="doux">' + p.faites + ' / ' + p.objectif + ' cette semaine</span></span>' + ICONE.droite + '</button>';
      }
    }

    h += blocNotifications();
    h += blocInstallation();
    h += '</main>';
    el.innerHTML = h;
  }

  // ---------- Encart « Ma semaine » (Plan annuel : type de semaine, période, semaine x / nb) ----------
  var TYPES_SEMAINE = {
    travail: ['Semaine de travail', 'Semaine chargée : volume et intensité au programme.'],
    repos: ['Semaine de repos', 'Charge allégée pour assimiler le travail des semaines précédentes.'],
    test: ['Semaine de test', 'On mesure tes progrès : arrive reposé et bien dormi.'],
    coupure: ['Semaine de coupure', 'Pas d’entraînement structuré : tu récupères.'],
    competition: ['Semaine de compétition', 'Objectif du bloc : on garde de la fraîcheur.']
  };
  function cleType(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '').replace(/^test.*/, 'test'); }
  // Du début du bloc (semaine qui suit le dernier test) jusqu'au prochain test inclus.
  function semainesDuBloc(p) {
    var l = p.frise || [];
    var cur = -1;
    l.forEach(function (f, k) { if (String(f.numero) === String(p.numero)) { cur = k; } });
    if (cur < 0) { return l; }
    var debut = 0, fin = l.length - 1;
    for (var k = cur - 1; k >= 0; k--) { if (cleType(l[k].type) === 'test') { debut = k + 1; break; } }
    // Sans test avant : début de la période en cours (ou première semaine renseignée).
    var per = l[cur].periode;
    for (var q = cur; q > debut; q--) { if (!l[q - 1].type || (per && l[q - 1].periode && l[q - 1].periode !== per)) { debut = q; break; } }
    for (var j = cur; j < l.length; j++) { if (cleType(l[j].type) === 'test') { fin = j; break; } }
    return l.slice(debut, fin + 1);
  }
  function blocSemainePlan(p) {
    if (!p || !p.type) { return ''; }
    var k = cleType(p.type), info = TYPES_SEMAINE[k] || ['Semaine : ' + p.type, ''];
    var h = '<section class="bloc"><h2 class="rubrique">Ma semaine</h2>' +
      '<div class="semaine-type t-' + k + '"><span class="nom-type">' + esc(info[0]) + '</span>' +
      (p.numero ? '<span class="num-sem">' + esc(p.numero) + (p.total ? '<small> / ' + esc(p.total) + '</small>' : '') + '</span>' : '') + '</div>';
    if (info[1]) { h += '<p class="semaine-texte">' + esc(info[1]) + '</p>'; }
    var l = [];
    if (p.periode) { l.push('Période ' + String(p.periode).toLowerCase()); }
    if (p.note) { l.push(p.note); }
    if (l.length) { h += '<div class="doux">' + esc(l.join(' · ')) + '</div>'; }
    var bloc = semainesDuBloc(p);
    if (bloc.length) {
      h += '<div class="doux">Bloc : semaines ' + esc(bloc[0].numero) + ' à ' + esc(bloc[bloc.length - 1].numero) + (cleType(bloc[bloc.length - 1].type) === 'test' ? ' (test)' : '') + '</div>';
      h += '<div class="frise" aria-label="Semaines du bloc">' + bloc.map(function (f) {
        var kk = cleType(f.type);
        return '<span class="sem t-' + kk + (String(f.numero) === String(p.numero) ? ' actuelle' : '') + '"><b>' + esc(f.numero) + '</b>' + esc((TYPES_SEMAINE[kk] ? f.type : f.type || '').slice(0, 1).toUpperCase() + String(f.type || '').slice(1, 3).toLowerCase()) + '</span>';
      }).join('') + '</div>';
    }
    if (p.prochaine) { h += '<div class="doux">Semaine prochaine : <b style="color:var(--noir)">' + esc(p.prochaine) + '</b></div>'; }
    return h + '</section>';
  }

  function estInstallee() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
  function estIphone() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }

  function blocInstallation() {
    if (estInstallee()) { return ''; }
    if (etat.installer) {
      return '<section class="bloc"><h2 class="rubrique">Installer l’appli</h2><button type="button" class="btn clair press" data-action="installer">Ajouter à l’écran d’accueil' + ICONE.droite + '</button></section>';
    }
    if (estIphone()) {
      return '<section class="bloc"><h2 class="rubrique">Installer l’appli</h2><p style="margin:0;line-height:1.5">Dans Safari, touche le bouton Partager, puis « Sur l’écran d’accueil ». L’appli s’ouvrira ensuite comme les autres, et pourra t’envoyer le mot du coach.</p></section>';
    }
    return '';
  }

  function blocNotifications() {
    var N = window.TrempeNotif;
    if (!N || !N.disponible() || N.etat() !== 'a-demander') { return ''; }
    return '<section class="bloc"><h2 class="rubrique">Le mot du coach chaque lundi</h2>' +
      '<button type="button" class="btn clair press" data-action="notifications">Recevoir une notification' + ICONE.cloche + '</button></section>';
  }

  // ---------- Progrès (repris de l'appli actuelle) ----------
  function dessinerProgres() {
    var el = $('#ecran-progres');
    if (!etat.d) { return; }
    if (window.TrempeProgres) { el.innerHTML = window.TrempeProgres.dessiner(etat.d); return; }
    el.innerHTML = '<header class="bandeau"><div class="ligne"><span>' + esc(etat.d.semaine && etat.d.semaine.libelle) + '</span></div><h1>Mes<br>progrès</h1></header>' +
      '<div class="vide">Tes objectifs, courbes et records arrivent ici dans la prochaine version.</div>';
  }

  // ---------- Séance (écran par-dessus) ----------
  function trouverSeance(id) { return seances().filter(function (s) { return String(s.id) === String(id); })[0] || null; }

  function ouvrirSeance(id) {
    var s = id ? trouverSeance(id) : seanceDuJour();
    if (!s) { toast('Aucune séance à afficher.'); return; }
    etat.seanceId = s.id;
    etat.ex = 0;
    demarrerChrono(s);
    dessinerSeance();
    var e = $('#ecran-seance');
    e.scrollTop = 0;
    e.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () {
      e.classList.remove('cache'); e.classList.add('dessus');
      $('#' + (etat.onglet === 'progres' ? 'ecran-progres' : 'ecran-accueil')).classList.add('fond');
    });
    navActive('seance');
  }

  function fermerSeance() {
    var e = $('#ecran-seance');
    e.style.transform = '';
    e.classList.add('cache');
    e.setAttribute('aria-hidden', 'true');
    $('#ecran-accueil').classList.remove('fond');
    $('#ecran-progres').classList.remove('fond');
    etat.seanceId = null;
    navActive(etat.onglet);
  }

  function dessinerSeance() {
    var s = trouverSeance(etat.seanceId);
    var el = $('#ecran-seance');
    if (!s) { fermerSeance(); return; }
    var muscu = s.type === 'muscu';
    var cartes = muscu ? (s.exercices || []) : (s.parties || []).filter(function (p) { return p.texte || p.zone || p.allure || p.fc; });
    var faits = muscu ? cartes.filter(function (e) { return e.fait; }).length : 0;
    var dj = dateIso(s.date);
    var h = '<header class="entete"><button type="button" class="retour press" data-action="fermer-seance" aria-label="Retour">' + ICONE.gauche + '</button>' +
      '<div class="t"><span class="type" style="color:' + (muscu ? 'var(--muscu)' : 'var(--course)') + '">' + (muscu ? 'Musculation' : 'Course') + (dj ? ' · ' + JOURS[dj.getDay()] + ' ' + jjmm(dj) : '') + '</span>' +
      '<span class="nom">' + esc(s.nom) + '</span></div>' +
      (muscu ? '<span class="compte"><span id="compte-faits">' + faits + ' / ' + cartes.length + '</span><span class="chrono" id="chrono">' + texteChrono(s) + '</span></span>' : (s.duree ? '<span class="compte">' + esc(s.duree) + ' min</span>' : '')) + '</header>';
    h += '<nav class="jours-seance" aria-label="Séances de la semaine">' + seances().map(function (x) {
      var dx = dateIso(x.date);
      return '<button type="button" class="press' + (x.type === 'muscu' ? ' m' : ' c') + '" data-action="changer-seance" data-id="' + esc(x.id) + '"' + (String(x.id) === String(s.id) ? ' aria-current="true"' : '') + '>' +
        '<span class="j">' + esc(dx ? JOURS[dx.getDay()] + ' ' + dx.getDate() : '') + '</span><span class="n">' + esc(x.nom) + '</span></button>';
    }).join('') + '</nav>';
    if (muscu && s.echauffement) { h += '<div class="echauffement"><b>Échauffement :</b> ' + esc(s.echauffement) + '</div>'; }
    if (!cartes.length) {
      h += '<div class="vide">Le contenu de cette séance n’est pas encore renseigné.</div>';
    } else {
      h += '<div class="rail-tete"><span class="rubrique" id="rail-compteur">' + (muscu ? 'Exercice' : 'Partie') + ' ' + (etat.ex + 1) + ' / ' + cartes.length + '</span>' +
        (cartes.length > 1 ? '<span class="doux" style="font-size:12px">Glisse pour changer</span>' : '') + '</div>';
      if (muscu) {
        etat.ex = Math.min(etat.ex, cartes.length - 1);
        h += '<div class="pile" id="pile">' + carteExercice(cartes[etat.ex], etat.ex) + '</div>';
      } else {
        h += '<div class="rail" id="rail">';
        cartes.forEach(function (c, i) { h += carteCourse(c, i, s); });
        h += '</div>';
      }
      if (cartes.length > 1) {
        h += '<div class="points" id="points">';
        cartes.forEach(function (c, i) {
          h += '<span' + (i === etat.ex ? ' class="actif"' : '') + (muscu ? ' data-action="aller-exo" data-i="' + i + '" role="button" aria-label="Exercice ' + (i + 1) + '"' + (c.fait ? ' data-fait="1"' : '') : '') + '></span>';
        });
        h += '</div>';
      }
    }
    h += '<div class="actions">' +
      (cartes.length > 1 ? '<button type="button" class="carre press" data-action="precedent" aria-label="Précédent">' + ICONE.gauche + '</button>' : '') +
      '<button type="button" class="btn centre press" id="bouton-suivant" data-action="suivant">' + texteSuivant(etat.ex, cartes.length, muscu) + '</button></div>';
    el.innerHTML = h;
    var rail = $('#rail');
    if (rail) { rail.addEventListener('scroll', function () { surDefilement(rail, cartes.length, muscu); }, { passive: true }); }
    var pile = $('#pile');
    if (pile) { brancherGlissePile(pile); }
  }

  function carteExercice(e, i) {
    var prec = e.precResultat ? 'Sem. préc. : ' + e.precResultat : '';
    var cases = [];
    if (e.volume) { cases.push(['Volume', e.volume]); }
    if (e.charge) { cases.push(['Charge', e.charge]); }
    if (e.repos) { cases.push(['Repos', e.repos]); }
    var h = '<article class="carte" aria-label="Exercice ' + (i + 1) + '">' +
      '<div class="haut"><span class="num">' + String(i + 1).padStart(2, '0') + '</span><span class="prec">' + esc(prec) + '</span></div>' +
      '<h3>' + esc(e.exercice) + '</h3>';
    if (cases.length) {
      h += '<div class="cases' + (cases.length === 2 ? ' deux' : '') + '">' + cases.map(function (c) { return '<div class="case"><span>' + c[0] + '</span><b>' + esc(c[1]) + '</b></div>'; }).join('') + '</div>';
    }
    var nS = nbSeries(e.volume);
    if (nS) {
      var faitesS = Math.min(e._series || 0, nS);
      h += '<div class="series"><div class="pts">' + Array.from({ length: nS }, function (x, k) { return '<span' + (k < faitesS ? ' class="ok"' : '') + '></span>'; }).join('') + '</div>' +
        '<button type="button" class="btn ' + (faitesS >= nS ? 'clair ' : '') + 'centre press" data-action="serie" data-i="' + i + '"' + (faitesS >= nS ? ' disabled' : '') + '>' +
        (faitesS >= nS ? 'Toutes les séries faites' : 'Série ' + (faitesS + 1) + ' / ' + nS + ' terminée') + '</button></div>';
    }
    if (e.consignes) { h += '<p>' + esc(e.consignes) + '</p>'; }
    if (e.precCommentaire) { h += '<p class="doux">Semaine précédente : ' + esc(e.precCommentaire) + '</p>'; }
    if (e.video) { h += '<a class="btn clair press" href="' + esc(e.video) + '" target="_blank" rel="noopener">Voir la vidéo' + ICONE.droite + '</a>'; }
    h += '<button type="button" class="coche press' + (e.fait ? ' oui' : '') + '" data-action="cocher" data-i="' + i + '" aria-pressed="' + (e.fait ? 'true' : 'false') + '">' +
      '<span class="boite">' + ICONE.coche + '</span>' + (e.fait ? 'Objectif atteint' : 'Marquer l’objectif atteint') + '</button>';
    h += '<label class="sr" for="com-' + i + '">Commentaire</label><textarea class="commentaire-exo" id="com-' + i + '" rows="2" data-commentaire="' + i + '" placeholder="' + (e.fait ? 'Un commentaire ?' : 'Si l’objectif n’est pas atteint : pourquoi ?') + '">' + esc(e.commentaire) + '</textarea>';
    return h + '</article>';
  }

  function carteCourse(p, i, s) {
    var h = '<article class="carte" aria-label="' + esc(p.titre) + '">' +
      '<div class="haut"><span class="num">' + String(i + 1).padStart(2, '0') + '</span></div>' +
      '<h3>' + esc(p.titre) + '</h3>';
    var cases = [];
    if (p.zone) { cases.push(['Zone', p.zone]); }
    var cible = cibleCourse(s, p);
    if (cible) { cases.push(cible); }
    if (cases.length) { h += '<div class="cases' + (cases.length === 2 ? ' deux' : '') + '">' + cases.map(function (c) { return '<div class="case"><span>' + c[0] + '</span><b>' + esc(c[1]) + '</b></div>'; }).join('') + '</div>'; }
    if (p.texte) { h += '<p>' + esc(p.texte) + '</p>'; }
    return h + '</article>';
  }

  // ---------- Minuteur muscu : chrono de séance, séries, repos (vibration, sans son) ----------
  function nbSeries(v) { var m = String(v || '').match(/^\s*(\d{1,2})\s*[×x*]/i); return m ? +m[1] : 0; }
  // « 2 min 30 », « 1 min », « 45 s », « 1'30 », « 1:30 », « 90 » -> secondes
  function secondesRepos(v) {
    var t = String(v || '').toLowerCase().replace(',', '.').trim(); if (!t) { return 0; }
    var m = t.match(/^(\d+)\s*(?:min|mn|'|:|m)\s*(\d+)?\s*(?:s|sec|")?$/);
    if (m) { return +m[1] * 60 + (m[2] ? +m[2] : 0); }
    m = t.match(/^(\d+)\s*(?:s|sec|secondes?|")?$/);
    if (m) { var n = +m[1]; return n <= 10 ? n * 60 : n; }
    return 0;
  }
  function mmss(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
  function lireChrono() { try { return JSON.parse(localStorage.getItem('trempe_chrono') || 'null'); } catch (x) { return null; } }
  // Démarre à l'ouverture de la séance du jour, sinon à la première série terminée.
  function demarrerChrono(s, force) {
    if (!s || s.type !== 'muscu' || (!force && s.statut !== "Aujourd'hui")) { return; }
    var c = lireChrono();
    if (c && String(c.id) === String(s.id) && Date.now() - c.debut < 6 * 3600 * 1000) { return; }
    try { localStorage.setItem('trempe_chrono', JSON.stringify({ id: s.id, debut: Date.now() })); } catch (x) {}
  }
  function minutesChrono(s) { var c = lireChrono(); return c && s && String(c.id) === String(s.id) ? Math.max(1, Math.round((Date.now() - c.debut) / 60000)) : 0; }
  function texteChrono(s) { var c = lireChrono(); return c && s && String(c.id) === String(s.id) ? mmss((Date.now() - c.debut) / 1000) : ''; }
  function arreterChrono() { try { localStorage.removeItem('trempe_chrono'); } catch (x) {} }

  var repos = null; // { fin, total, titre }
  function serieTerminee(i) {
    var s = trouverSeance(etat.seanceId); if (!s || !s.exercices || !s.exercices[i]) { return; }
    var e = s.exercices[i], n = nbSeries(e.volume);
    demarrerChrono(s, true);
    e._series = Math.min(n, (e._series || 0) + 1);
    if (navigator.vibrate) { try { navigator.vibrate(15); } catch (x) {} }
    var sec = secondesRepos(e.repos);
    if (e._series < n) {
      if (sec) { lancerRepos(sec, 'Série ' + (e._series + 1) + ' / ' + n + ' · ' + e.exercice); }
    } else {
      var suivant = s.exercices[i + 1];
      if (suivant && sec) { lancerRepos(sec, 'Ensuite : ' + suivant.exercice); }
      toast('Dernière série faite. Coche l’objectif s’il est atteint.');
    }
    var pile = $('#pile');
    if (pile && etat.ex === i) { pile.innerHTML = carteExercice(e, i); }
  }
  function lancerRepos(sec, titre) { repos = { fin: Date.now() + sec * 1000, total: sec, titre: titre, fini: false }; dessinerRepos(); }
  function dessinerRepos() {
    var el = $('#repos'); if (!el) { return; }
    if (!repos) { el.hidden = true; el.innerHTML = ''; return; }
    var reste = (repos.fin - Date.now()) / 1000;
    if (reste <= 0 && !repos.fini) {
      repos.fini = true;
      if (navigator.vibrate) { try { navigator.vibrate([300, 150, 300]); } catch (x) {} }
      setTimeout(function () { if (repos && repos.fini) { repos = null; dessinerRepos(); } }, 4000);
    }
    el.hidden = false;
    el.classList.toggle('fini', !!repos.fini);
    el.innerHTML = '<div class="barre"><span style="width:' + (repos.fini ? 100 : Math.min(100, 100 - reste / repos.total * 100)) + '%"></span></div>' +
      '<div class="ligne"><div class="t"><span class="lib">' + (repos.fini ? 'C’est reparti' : 'Repos') + '</span><span class="titre">' + esc(repos.titre) + '</span></div>' +
      '<span class="temps">' + (repos.fini ? '0:00' : mmss(Math.ceil(reste))) + '</span></div>' +
      (repos.fini ? '' : '<div class="boutons"><button type="button" class="press" data-action="repos-plus">+ 15 s</button><button type="button" class="press" data-action="repos-passer">Passer le repos</button></div>');
  }
  setInterval(function () {
    if (repos) { dessinerRepos(); }
    var c = $('#chrono'); if (c && etat.seanceId) { c.textContent = texteChrono(trouverSeance(etat.seanceId)); }
  }, 500);

  function largeurCarte(rail) { var c = rail.querySelector('.carte'); return c ? c.getBoundingClientRect().width + 12 : rail.clientWidth; }

  function texteSuivant(i, n, muscu) { return i >= n - 1 ? 'Terminer et faire mon retour' : (muscu ? 'Exercice suivant' : 'Partie suivante'); }
  function nbCartes() {
    var s = trouverSeance(etat.seanceId); if (!s) { return 0; }
    return s.type === 'muscu' ? (s.exercices || []).length : document.querySelectorAll('#rail .carte').length;
  }
  // Muscu : un exercice à la fois ; le suivant arrive par la droite, le précédent par la gauche.
  function montrerExercice(i, sens) {
    var s = trouverSeance(etat.seanceId), pile = $('#pile'); if (!s || !pile) { return; }
    var n = (s.exercices || []).length, j = Math.max(0, Math.min(n - 1, i));
    if (j === etat.ex && sens) { return; }
    etat.ex = j;
    pile.innerHTML = carteExercice(s.exercices[j], j);
    var c = pile.firstChild;
    if (sens) { c.classList.add(sens > 0 ? 'entre-d' : 'entre-g'); }
    document.querySelectorAll('#points span').forEach(function (p, k) { p.classList.toggle('actif', k === j); });
    var t = $('#rail-compteur'); if (t) { t.textContent = 'Exercice ' + (j + 1) + ' / ' + n; }
    var b = $('#bouton-suivant'); if (b) { b.textContent = texteSuivant(j, n, true); }
    var top = pile.getBoundingClientRect().top, e = $('#ecran-seance');
    if (sens && top < 120) { e.scrollTo({ top: e.scrollTop + top - 130, behavior: 'smooth' }); }
  }
  function brancherGlissePile(pile) {
    var d = null;
    pile.addEventListener('touchstart', function (ev) { var t = ev.touches[0]; d = t.clientX < 28 ? null : { x: t.clientX, y: t.clientY }; }, { passive: true });
    pile.addEventListener('touchend', function (ev) {
      if (!d) { return; }
      var t = ev.changedTouches[0], dx = t.clientX - d.x, dy = t.clientY - d.y; d = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { allerA(etat.ex + (dx < 0 ? 1 : -1)); }
    });
  }

  function surDefilement(rail, n, muscu) {
    var i = Math.max(0, Math.min(n - 1, Math.round(rail.scrollLeft / largeurCarte(rail))));
    if (i === etat.ex) { return; }
    etat.ex = i;
    var pts = document.querySelectorAll('#points span');
    pts.forEach(function (p, k) { p.classList.toggle('actif', k === i); });
    var c = $('#rail-compteur'); if (c) { c.textContent = (muscu ? 'Exercice ' : 'Partie ') + (i + 1) + ' / ' + n; }
    var b = $('#bouton-suivant');
    if (b) { b.textContent = i >= n - 1 ? 'Terminer et faire mon retour' : (muscu ? 'Exercice suivant' : 'Partie suivante'); }
  }

  function allerA(i) {
    if ($('#pile')) { montrerExercice(i, i > etat.ex ? 1 : -1); return; }
    var rail = $('#rail'); if (!rail) { return; }
    var n = rail.querySelectorAll('.carte').length;
    var j = Math.max(0, Math.min(n - 1, i));
    rail.scrollTo({ left: j * largeurCarte(rail), behavior: 'smooth' });
  }

  function cocher(i) {
    var s = trouverSeance(etat.seanceId); if (!s || !s.exercices) { return; }
    var e = s.exercices[i]; if (!e) { return; }
    e.fait = !e.fait;
    if (e.fait && navigator.vibrate) { try { navigator.vibrate(15); } catch (x) {} }
    Api.envoyer('cocher', { seance: s.nom, ligne: e.ligne, exercice: e.exercice, fait: e.fait });
    garderEnMemoire();
    var btn = document.querySelector('[data-action="cocher"][data-i="' + i + '"]');
    if (btn) {
      btn.classList.toggle('oui', e.fait);
      btn.setAttribute('aria-pressed', e.fait ? 'true' : 'false');
      btn.lastChild.textContent = e.fait ? 'Objectif atteint' : 'Marquer l’objectif atteint';
    }
    var pt = document.querySelector('#points [data-i="' + i + '"]'); if (pt) { if (e.fait) { pt.setAttribute('data-fait', '1'); } else { pt.removeAttribute('data-fait'); } }
    var c = $('#compte-faits'); if (c) { c.textContent = s.exercices.filter(function (x) { return x.fait; }).length + ' / ' + s.exercices.length; }
    if (e.fait && i < s.exercices.length - 1) { setTimeout(function () { allerA(i + 1); }, 450); }
  }

  var minuteursCommentaire = {};
  function commenter(i, texte) {
    var s = trouverSeance(etat.seanceId); if (!s || !s.exercices || !s.exercices[i]) { return; }
    s.exercices[i].commentaire = texte;
    garderEnMemoire();
    clearTimeout(minuteursCommentaire[i]);
    minuteursCommentaire[i] = setTimeout(function () {
      Api.envoyer('commenter', { seance: s.nom, ligne: s.exercices[i].ligne, exercice: s.exercices[i].exercice, commentaire: texte });
    }, 900);
  }

  function garderEnMemoire() { try { localStorage.setItem('trempe_donnees', JSON.stringify(etat.d)); } catch (x) {} }

  // ---------- Glisser depuis le bord gauche pour revenir ----------
  function brancherBordGauche() {
    var e = $('#ecran-seance');
    var depart = null;
    e.addEventListener('touchstart', function (ev) {
      var t = ev.touches[0];
      depart = t.clientX < 28 ? { x: t.clientX, y: t.clientY, dx: 0, suivi: false } : null;
    }, { passive: true });
    e.addEventListener('touchmove', function (ev) {
      if (!depart) { return; }
      var t = ev.touches[0];
      var dx = t.clientX - depart.x, dy = t.clientY - depart.y;
      if (!depart.suivi && Math.abs(dy) > Math.abs(dx)) { depart = null; return; }
      depart.suivi = true;
      depart.dx = Math.max(0, dx);
      e.style.transition = 'none';
      e.style.transform = 'translateX(' + depart.dx + 'px)';
    }, { passive: true });
    e.addEventListener('touchend', function () {
      if (!depart) { return; }
      e.style.transition = '';
      if (depart.dx > window.innerWidth * 0.3) { fermerSeance(); } else { e.style.transform = ''; }
      depart = null;
    });
  }

  // ---------- Zones 4-5 : repère allure ou FC (coche par séance dans l'onglet Coach, allure par défaut) ----------
  function zoneHaute(z) { return /(^|[^0-9])[45]([^0-9]|$)/.test(String(z || '')); }
  function seanceZoneHaute(s) { return !!(s && s.type !== 'muscu' && (s.parties || []).some(function (p) { return zoneHaute(p.zone); })); }
  function repereAllure(s) { return seanceZoneHaute(s) && s.repere !== 'fc'; }
  function ressembleBpm(v) { return /bpm|fc|^\s*[<>≤≥]?\s*\d{2,3}\s*([-–àa]\s*\d{2,3})?\s*$/i.test(String(v || '')); }
  // Zones 1 à 3 : FC (bpm). Zones 4 et 5 : allure, sauf si le coach a coché les bpm pour la séance.
  // La colonne « Allure / FC » de l'onglet Coach peut contenir « 4:59 – 4:36 /km  ·  159 – 167 bpm » : on sépare les deux.
  function decouperCible(v) {
    var r = { allure: '', fc: '' };
    String(v || '').split(/\s+·\s+/).forEach(function (m) {
      if (/\/\s*km|min\s*\/|\d+[:']\d\d/i.test(m) && !/bpm/i.test(m)) { r.allure = r.allure || m.trim(); }
      else if (ressembleBpm(m)) { r.fc = r.fc || m.trim(); }
    });
    return r;
  }
  function cibleCourse(s, p) {
    var g = decouperCible(p.allure);
    var allure = p.allureCible || g.allure, fc = p.fc || g.fc;
    if (zoneHaute(p.zone) && !(s && s.repere === 'fc') && allure) { return ['Allure cible', allure]; }
    return fc ? ['FC cible', fc] : null; // allure inconnue (pas de VMA) : on montre la FC
  }
  // Contenu prévu proposé dans le retour (le client le corrige s'il a fait autrement)
  function contenuPrevu(s) {
    if (!s) { return ''; }
    if (s.contenu) { return s.contenu; }
    if (s.type === 'muscu') {
      return (s.exercices || []).map(function (e) { return e.exercice + (e.volume ? ' · ' + e.volume : '') + (e.charge ? ' · ' + e.charge : ''); }).join('\n');
    }
    var corps = (s.parties || []).filter(function (p) { return /corps/i.test(p.titre || ''); })[0] || (s.parties || [])[1] || null;
    if (!corps) { return s.nom || ''; }
    var c = cibleCourse(s, corps);
    return [corps.texte, corps.zone, c && c[1]].filter(function (x) { return x; }).join(' · ');
  }
  function seanceDeLibelle(lib) { return seances().filter(function (x) { return x.libelleListe === lib; })[0] || null; }
  function typeDeSeance(s, d) { return s.type === 'muscu' ? 'Musculation' : ((d.retour && d.retour.typeParDefaut) || 'Course'); }
  // « 4:35 », « 4.35 », « 4'35 », « 4 35 » -> « 4:35 »
  function allureLue(v) {
    var m = String(v || '').trim().match(/^(\d{1,2})\s*[:.,'’h ]\s*(\d{1,2})\s*("|”|'')?\s*(\/?\s*km)?$/i);
    if (!m) { return null; }
    var sec = +m[2]; if (m[2].length === 1) { sec = sec * 10; }
    if (sec > 59 || +m[1] < 2 || +m[1] > 15) { return null; }
    return m[1] + ':' + String(sec).padStart(2, '0');
  }

  // ---------- Panneau de retour ----------
  // ---------- Retours gardés pour plus tard (brouillons sur le téléphone) ----------
  function lireBrouillons() { try { return JSON.parse(localStorage.getItem('trempe_brouillons') || '{}') || {}; } catch (x) { return {}; } }
  function ecrireBrouillons(b) { try { localStorage.setItem('trempe_brouillons', JSON.stringify(b)); } catch (x) {} }
  function garderBrouillon(r) {
    if (!r) { return; }
    var b = lireBrouillons();
    if (r.cle && r.cle !== r.prevue) { delete b[r.cle]; }
    r.cle = r.prevue; r.gardeLe = Date.now();
    b[r.prevue] = r; ecrireBrouillons(b);
  }
  function oublierBrouillon(r) { var b = lireBrouillons(); delete b[r.prevue]; if (r.cle) { delete b[r.cle]; } ecrireBrouillons(b); }
  function brouillonsListe() {
    var b = lireBrouillons();
    return Object.keys(b).map(function (k) { return b[k]; }).sort(function (x, y) { return (y.gardeLe || 0) - (x.gardeLe || 0); });
  }
  function retourSaisi(r) {
    return !!(r && (r.duree && !r.dureeAuto || r.rpe || r.sommeil || r.objectif || String(r.commentaire || '').trim() || r.distance || r.fcMoy || r.fcMax || r.allure || r.realise !== r.prevuTexte || r.douleur === 'Oui'));
  }

  function ouvrirRetour(seance, cleBrouillon) {
    var d = etat.d || {};
    var s = seance || seanceDuJour();
    var prev = (d.retour && d.retour.seancesPrevues) || [];
    var br = lireBrouillons();
    if (cleBrouillon && br[cleBrouillon]) { etat.retour = br[cleBrouillon]; }
    else if (seance && br[seance.libelleListe]) { etat.retour = br[seance.libelleListe]; }
    else if (!seance && !etat.retour && s && br[s.libelleListe]) { etat.retour = br[s.libelleListe]; }
    else if (!(etat.retour && !seance)) {
      var lib = s && prev.indexOf(s.libelleListe) >= 0 ? s.libelleListe : (prev[0] || '');
      var sp = seanceDeLibelle(lib);
      etat.retour = {
        date: isoDe(new Date()),
        prevue: lib,
        realise: contenuPrevu(sp), prevuTexte: contenuPrevu(sp),
        type: sp ? typeDeSeance(sp, d) : ((d.retour && d.retour.typeParDefaut) || ''),
        duree: minutesChrono(sp) || '', dureeAuto: !!minutesChrono(sp), rpe: null, sommeil: null, douleur: 'Non', ou: '', intensite: null,
        distance: '', denivele: '', fcMoy: '', fcMax: '', allure: '', objectif: null, commentaire: ''
      };
    }
    dessinerRetour();
    $('#panneau').classList.add('ouvert');
    $('#voile').classList.add('ouvert');
  }

  // Fermer le panneau sans envoyer : ce qui a été saisi est gardé pour plus tard.
  function fermerRetour(garder) {
    if (garder && etat.retour && (garder === 'toujours' || retourSaisi(etat.retour))) {
      var s0 = seanceDeLibelle(etat.retour.prevue), c0 = lireChrono();
      if (c0 && s0 && String(c0.id) === String(s0.id)) { arreterChrono(); }
      garderBrouillon(etat.retour);
      etat.retour = null;
      dessinerAccueil();
      if (garder === 'toujours') { toast('Ton retour t’attend sur l’accueil.'); }
    }
    $('#panneau').classList.remove('ouvert');
    $('#voile').classList.remove('ouvert');
    $('#panneau').style.transform = '';
  }

  function estCourse(r) { return !/muscu|renfo/i.test(r.type || ''); }

  function puces(nom, valeurs, choisie, classe) {
    return '<div class="puces ' + (classe || '') + '">' + valeurs.map(function (v) {
      return '<button type="button" class="puce press" data-puce="' + nom + '" data-valeur="' + esc(v) + '" aria-pressed="' + (String(choisie) === String(v) ? 'true' : 'false') + '">' + esc(v) + '</button>';
    }).join('') + '</div>';
  }

  function dessinerRetour(erreur) {
    var r = etat.retour, d = etat.d || {};
    var prev = (d.retour && d.retour.seancesPrevues) || [];
    var types = (d.retour && d.retour.types) || ['Course', 'Musculation', 'Autre'];
    var dj = dateIso(r.date);
    var h = '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><h2>Mon retour</h2><span class="doux">' + (dj ? jjmm(dj) : '') + '</span></div>';
    if (erreur) { h += '<div class="erreur-champ" role="alert">' + esc(erreur) + '</div>'; }
    var sp = seanceDeLibelle(r.prevue);
    var autre = r.prevue === 'Autre séance (non prévue)';
    // 1. Date
    h += '<div class="champ"><label for="r-date">Date</label><input type="date" id="r-date" data-champ="date" value="' + esc(r.date) + '"></div>';
    // 2. Séance : choix dans la liste + contenu modifiable
    h += '<div class="champ"><label for="r-prevue">Séance</label><select id="r-prevue" data-champ="prevue">' +
      prev.map(function (p) { return '<option' + (p === r.prevue ? ' selected' : '') + '>' + esc(p) + '</option>'; }).join('') +
      '<option' + (autre ? ' selected' : '') + '>Autre séance (non prévue)</option></select>' +
      '<label class="sr" for="r-realise">Ce que tu as fait</label>' +
      '<textarea id="r-realise" class="realise" data-champ="realise" rows="3" placeholder="' + (autre ? 'Décris la séance que tu as faite' : 'Ce que tu as fait') + '">' + esc(r.realise) + '</textarea>' +
      '<span class="aide">' + (autre ? 'Décris la séance que tu as faite.' : (r.realise !== r.prevuTexte ? 'Séance modifiée : ton coach verra ce que tu as changé.' : 'Tu as fait autrement ? Corrige le texte.')) + '</span></div>';
    if (autre) { h += '<div class="champ"><span class="lib">Type de séance</span>' + puces('type', types, r.type, types.length === 2 ? 'd2' : 'd3') + '</div>'; }
    // 3. Commentaire
    h += '<div class="champ"><label for="r-com">Commentaire</label><textarea id="r-com" data-champ="commentaire" placeholder="Ce que tu veux dire à ton coach">' + esc(r.commentaire) + '</textarea></div>';
    // 4. Le reste
    h += '<div class="champ"><label for="r-duree">Durée (min)</label><input type="number" inputmode="numeric" id="r-duree" data-champ="duree" value="' + esc(r.duree) + '" placeholder="45"></div>';
    h += '<div class="champ"><span class="lib">Difficulté de toute la séance (1 à 10)</span>' + puces('rpe', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], r.rpe) +
      '<span class="repere">Note environ 30 minutes après. 1 très très facile · 3 modéré · 5 dur · 7 très dur · 9 presque maximal · 10 maximal. Repères : endurance fondamentale 2-3, tempo 4-5, seuil 6-8, VMA 8-9.</span></div>';
    if (estCourse(r)) {
      h += '<div class="deux-col"><div class="champ"><label for="r-dist">Distance (km)</label><input type="text" inputmode="decimal" id="r-dist" data-champ="distance" value="' + esc(r.distance) + '" placeholder="8,5"></div>' +
        '<div class="champ"><label for="r-dp">Dénivelé + (m)</label><input type="number" inputmode="numeric" id="r-dp" data-champ="denivele" value="' + esc(r.denivele) + '" placeholder="120"></div></div>';
      if (!autre && repereAllure(sp)) {
        var cible = ((sp.parties || []).map(function (p) { var c = zoneHaute(p.zone) ? cibleCourse(sp, p) : null; return c && c[0] === 'Allure cible' ? c[1] : ''; }).filter(function (x) { return x; })[0]) || '';
        h += '<div class="champ"><label for="r-allure">Allure tenue sur les efforts (min/km)</label><input type="text" inputmode="decimal" id="r-allure" data-champ="allure" value="' + esc(r.allure) + '" placeholder="4:35">' +
          '<span class="aide">Moyenne des fractions, sans les récupérations.' + (cible ? ' Allure cible : ' + esc(cible) + '.' : '') + '</span></div>';
      }
      h += '<div class="deux-col"><div class="champ"><label for="r-fcm">FC moyenne</label><input type="number" inputmode="numeric" id="r-fcm" data-champ="fcMoy" value="' + esc(r.fcMoy) + '" placeholder="145"></div>' +
        '<div class="champ"><label for="r-fcx">FC max</label><input type="number" inputmode="numeric" id="r-fcx" data-champ="fcMax" value="' + esc(r.fcMax) + '" placeholder="170"></div></div>';
    }
    h += '<div class="champ"><span class="lib">Objectif de la séance atteint ?</span>' + puces('objectif', ['Oui', 'Non'], r.objectif, 'd2') + '</div>';
    h += '<div class="champ"><span class="lib">Qualité du sommeil la nuit dernière (1 à 10)</span>' + puces('sommeil', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], r.sommeil) + '</div>';
    h += '<div class="champ"><span class="lib">As-tu ressenti une douleur ?</span>' + puces('douleur', ['Non', 'Oui'], r.douleur, 'd2') + '</div>';
    if (r.douleur === 'Oui') {
      h += '<div class="champ"><label for="r-ou">Où ?</label><input id="r-ou" data-champ="ou" value="' + esc(r.ou) + '" placeholder="Genou gauche"></div>';
      h += '<div class="champ"><span class="lib">Intensité de la douleur (1 à 10)</span>' + puces('intensite', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], r.intensite) + '</div>';
    }
    // Type : automatique d'après la séance choisie ; demandé seulement pour une séance non prévue
    h += '<button type="button" class="btn centre press" data-action="envoyer-retour">Envoyer mon retour</button>';
    h += '<button type="button" class="btn clair centre press" data-action="retour-plus-tard">Faire mon retour plus tard</button>';
    $('#panneau-corps').innerHTML = h;
    ajusterHauteur($('#r-realise'));
  }
  function ajusterHauteur(t) { if (!t) { return; } t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 4, 320) + 'px'; }

  function nombre(v) { var n = parseFloat(String(v || '').replace(',', '.')); return isNaN(n) ? '' : n; }

  function envoyerRetour() {
    var r = etat.retour;
    if (!r.date) { dessinerRetour('Indique la date de la séance.'); return; }
    if (!nombre(r.duree)) { dessinerRetour('Indique la durée de la séance.'); $('#panneau-corps').scrollTop = 0; return; }
    if (!r.rpe) { dessinerRetour('Indique la difficulté de la séance (1 à 10).'); $('#panneau-corps').scrollTop = 0; return; }
    var autre = r.prevue === 'Autre séance (non prévue)';
    if (autre && !String(r.realise || '').trim()) { dessinerRetour('Décris la séance que tu as faite.'); $('#panneau-corps').scrollTop = 0; return; }
    var course = estCourse(r);
    var sp = seanceDeLibelle(r.prevue);
    var avecAllure = course && !autre && repereAllure(sp);
    var allure = '';
    if (avecAllure && String(r.allure || '').trim()) {
      allure = allureLue(r.allure);
      if (!allure) { dessinerRetour('Allure à écrire en minutes:secondes, par exemple 4:35.'); $('#panneau-corps').scrollTop = 0; return; }
    }
    var nom = autre ? 'Autre séance' : (sp ? sp.nom : r.prevue.replace(/^\d\d\/\d\d\s*–\s*/, ''));
    var envoi = {
      date: r.date, nom: nom, prevue: r.prevue, type: r.type, duree: nombre(r.duree), rpe: r.rpe,
      contenuPrevu: autre ? '' : r.prevuTexte, contenuRealise: String(r.realise || '').trim(),
      modifiee: autre || String(r.realise || '').trim() !== String(r.prevuTexte || '').trim(),
      repere: avecAllure ? 'allure' : (seanceZoneHaute(sp) ? 'fc' : ''), allureEfforts: allure,
      sommeil: r.sommeil || '', douleur: r.douleur, ou: r.douleur === 'Oui' ? r.ou : '', intensite: r.douleur === 'Oui' ? (r.intensite || '') : '',
      commentaire: r.commentaire, objectif: r.objectif || '',
      distance: course ? nombre(r.distance) : '', denivele: course ? nombre(r.denivele) : '',
      fcMoy: course ? nombre(r.fcMoy) : '', fcMax: course ? nombre(r.fcMax) : ''
    };
    var enLigne = navigator.onLine !== false;
    Api.envoyer('retour', envoi).then(function (res) {
      if (res && res.restants) { etat._attenteAnnoncee = true; dessinerAccueil(); }
      else if (!enLigne) { dessinerAccueil(); }
    });
    // Mise à jour immédiate de la semaine
    seances().forEach(function (s) { if (s.libelleListe === r.prevue) { s.statut = 'Fait'; } });
    garderEnMemoire();
    var spc = seanceDeLibelle(r.prevue); var c0 = lireChrono();
    if (c0 && spc && String(c0.id) === String(spc.id)) { arreterChrono(); }
    oublierBrouillon(r);
    etat.retour = null;
    fermerRetour();
    dessinerAccueil();
    toast(enLigne ? 'Retour envoyé à ton coach.' : 'Pas de réseau : ton retour partira dès que le réseau revient.');
  }

  // Tirer le panneau vers le bas pour le fermer
  function brancherTirage() {
    var p = $('#panneau'), poignee = $('#poignee');
    var t = null;
    poignee.addEventListener('pointerdown', function (e) {
      t = { y: e.clientY, dy: 0 };
      try { poignee.setPointerCapture(e.pointerId); } catch (x) {}
      p.classList.add('tire');
    });
    poignee.addEventListener('pointermove', function (e) {
      if (!t) { return; }
      t.dy = Math.max(0, e.clientY - t.y);
      p.style.transform = 'translateY(' + t.dy + 'px)';
    });
    var fin = function () {
      if (!t) { return; }
      p.classList.remove('tire');
      p.style.transform = '';
      if (t.dy > 110) { fermerRetour(true); }
      t = null;
    };
    poignee.addEventListener('pointerup', fin);
    poignee.addEventListener('pointercancel', fin);
  }

  // ---------- Événements ----------
  function navActive(nom) {
    document.querySelectorAll('.nav button').forEach(function (b) {
      if (b.getAttribute('data-nav') === nom) { b.setAttribute('aria-current', 'page'); } else { b.removeAttribute('aria-current'); }
    });
  }

  function changerOnglet(nom) {
    if (etat.seanceId) { fermerSeance(); }
    etat.onglet = nom;
    $('#ecran-accueil').classList.toggle('onglet-cache', nom !== 'accueil');
    $('#ecran-progres').classList.toggle('onglet-cache', nom !== 'progres');
    navActive(nom);
  }

  function surClic(ev) {
    var b = ev.target.closest('[data-action],[data-nav],[data-puce]');
    if (!b) { return; }
    var nav = b.getAttribute('data-nav');
    if (nav) {
      if (nav === 'seance') { ouvrirSeance(null); } else { changerOnglet(nav); }
      return;
    }
    var puce = b.getAttribute('data-puce');
    if (puce) {
      var v = b.getAttribute('data-valeur');
      etat.retour[puce] = /^\d+$/.test(v) ? Number(v) : v;
      var haut = $('#panneau-corps').scrollTop;
      dessinerRetour();
      $('#panneau-corps').scrollTop = haut;
      return;
    }
    var a = b.getAttribute('data-action');
    if (a === 'ouvrir-seance') { ouvrirSeance(b.getAttribute('data-id')); }
    else if (a === 'fermer-seance') { fermerSeance(); }
    else if (a === 'ouvrir-retour') { ouvrirRetour(null); }
    else if (a === 'precedent') { allerA(etat.ex - 1); }
    else if (a === 'suivant') {
      var n = nbCartes();
      if (etat.ex >= n - 1) { ouvrirRetour(trouverSeance(etat.seanceId)); } else { allerA(etat.ex + 1); }
    }
    else if (a === 'retour-plus-tard') { fermerRetour('toujours'); }
    else if (a === 'ouvrir-brouillon') { etat.retour = null; ouvrirRetour(null, b.getAttribute('data-cle')); }
    else if (a === 'aller-exo') { allerA(Number(b.getAttribute('data-i'))); }
    else if (a === 'serie') { serieTerminee(Number(b.getAttribute('data-i'))); }
    else if (a === 'repos-plus' && repos) { repos.fin += 15000; repos.total += 15; dessinerRepos(); }
    else if (a === 'repos-passer') { repos = null; dessinerRepos(); }
    else if (a === 'changer-seance') {
      var ns = trouverSeance(b.getAttribute('data-id'));
      if (ns) { etat.seanceId = ns.id; etat.ex = 0; demarrerChrono(ns); dessinerSeance(); $('#ecran-seance').scrollTop = 0; }
    }
    else if (a === 'cocher') { cocher(Number(b.getAttribute('data-i'))); }
    else if (a === 'envoyer-retour') { envoyerRetour(); }
    else if (a === 'installer' && etat.installer) { etat.installer.prompt(); etat.installer = null; dessinerAccueil(); }
    else if (a === 'notifications' && window.TrempeNotif) {
      window.TrempeNotif.activer().then(function (ok) {
        toast(ok ? 'C’est noté : le mot du coach arrivera le lundi matin.' : 'Notifications refusées. Tu peux les autoriser plus tard dans les réglages du téléphone.');
        dessinerAccueil();
      });
    }
    else if (a === 'mesures') { changerOnglet('progres'); }
    else if (a === 'profil-demo') {
      try { localStorage.setItem('trempe_demo_profil', b.getAttribute('data-profil')); localStorage.removeItem('trempe_donnees'); } catch (x) {}
      etat.retour = null;
      if (etat.seanceId) { fermerSeance(); }
      actualiser().then(function () { window.scrollTo(0, 0); $('#ecran-accueil').scrollTop = 0; });
    }
  }

  function surSaisie(ev) {
    var t = ev.target;
    var champ = t.getAttribute('data-champ');
    if (champ && etat.retour) {
      etat.retour[champ] = t.value;
      if (champ === 'duree') { etat.retour.dureeAuto = false; }
      if (champ === 'prevue') {
        var s = seanceDeLibelle(t.value);
        etat.retour.prevuTexte = contenuPrevu(s);
        etat.retour.realise = etat.retour.prevuTexte;
        etat.retour.allure = '';
        if (s) { etat.retour.type = typeDeSeance(s, etat.d); }
        dessinerRetour();
      } else if (champ === 'realise') {
        ajusterHauteur(t);
        var aide = t.parentNode.querySelector('.aide');
        if (aide && etat.retour.prevue !== 'Autre séance (non prévue)') {
          aide.textContent = t.value !== etat.retour.prevuTexte ? 'Séance modifiée : ton coach verra ce que tu as changé.' : 'Tu as fait autrement ? Corrige le texte.';
        }
      }
      return;
    }
    var com = t.getAttribute('data-commentaire');
    if (com !== null && ev.type === 'input') { commenter(Number(com), t.value); }
  }

  var minuteurToast;
  function toast(txt) {
    var t = $('#toast'); if (!t) { return; }
    t.textContent = txt;
    t.classList.add('visible');
    clearTimeout(minuteurToast);
    minuteurToast = setTimeout(function () { t.classList.remove('visible'); }, 2600);
  }

  window.TrempeApp = { toast: toast, actualiser: actualiser };
  document.addEventListener('DOMContentLoaded', demarrer);
})();
