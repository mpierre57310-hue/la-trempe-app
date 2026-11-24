// LA TREMPE APP – écran Progrès : objectifs, mesures, course (zones, records, tests), force (RM1), historique.
// Données : GET ?api=progres (mêmes données que l'ancienne appli). Saisies : file d'envoi (mesures, rm1, record, test).
(function () {
  var Api = window.TrempeApi;
  var CLE = 'trempe_progres';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var esc = function (v) {
    return String(v === undefined || v === null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  var isoAuj = function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var jjmm = function (iso) { var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] : ''; };
  var nombre = function (v) { var n = parseFloat(String(v === undefined || v === null ? '' : v).replace(',', '.')); return isNaN(n) ? null : n; };
  var fmt = function (n) { return n === null || n === undefined ? '' : String(Math.round(n * 10) / 10).replace('.', ','); };

  var P = { d: null, section: null, chargement: false, erreur: '', form: null, histo: 'muscu', semaine: '' };

  function lire() { try { return JSON.parse(localStorage.getItem(CLE) || 'null'); } catch (e) { return null; } }
  function garder() { try { localStorage.setItem(CLE, JSON.stringify(P.d)); } catch (e) {} }

  function charger() {
    if (P.chargement) { return; }
    P.chargement = true;
    var prom;
    if (Api.demo()) {
      prom = Promise.resolve(window.TREMPE_DEMO_PROGRES ? window.TREMPE_DEMO_PROGRES() : null);
    } else {
      var code = Api.code();
      prom = fetch(window.TREMPE_CONFIG.urlScript + '?api=progres&code=' + encodeURIComponent(code) + '&v=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (!d || d.ok !== true) { throw new Error((d && d.erreur) || 'reponse'); } return d; });
    }
    prom.then(function (d) { P.d = d; P.erreur = ''; garder(); })
      .catch(function () { if (!P.d) { P.erreur = 'Impossible de charger tes progrès. Vérifie ta connexion.'; } })
      .then(function () { P.chargement = false; dessiner(); });
  }

  function sections() {
    var d = P.d || {}, v = d.variante || 'Mixte', l = [['objectifs', 'Objectifs'], ['mesures', 'Mesures']];
    if (v !== 'Muscu') { l.push(['course', 'Course']); }
    if (v !== 'Course') { l.push(['force', 'Force']); }
    l.push(['historique', 'Historique']);
    return l;
  }

  // ---------- Dessin ----------
  function dessiner() {
    var el = $('#ecran-progres'); if (!el) { return; }
    var d = P.d;
    var h = '<header class="bandeau"><div class="ligne"><span>Ton suivi</span></div><h1>Mes<br>progrès</h1></header>';
    if (!d) {
      h += '<div class="' + (P.erreur ? 'vide' : 'chargement') + '">' + esc(P.erreur || 'Chargement…') + '</div>';
      el.innerHTML = h; return;
    }
    var secs = sections();
    if (!P.section || !secs.some(function (s) { return s[0] === P.section; })) { P.section = secs[0][0]; }
    h += '<nav class="onglets-pg" aria-label="Rubriques">' + secs.map(function (s) {
      return '<button type="button" class="press" data-pg="section" data-v="' + s[0] + '"' + (s[0] === P.section ? ' aria-current="true"' : '') + '>' + s[1] + '</button>';
    }).join('') + '</nav><main class="contenu">';
    h += ({ objectifs: objectifs, mesures: mesures, course: course, force: force, historique: historique })[P.section](d);
    h += '</main>';
    el.innerHTML = h;
  }

  function vide(t) { return '<div class="bloc"><p class="doux" style="margin:0">' + esc(t) + '</p></div>'; }

  function objectifs(d) {
    var l = d.objectifs || [];
    if (!l.length) { return vide('Ton coach n’a pas encore fixé d’objectif chiffré.'); }
    return l.map(function (o) {
      var pct = typeof o.pct === 'number' ? o.pct : null;
      return '<section class="bloc"><div class="obj-tete"><b>' + esc(o.nom) + '</b>' + (pct !== null ? '<span class="obj-pct">' + pct + ' %</span>' : '') + '</div>' +
        (pct !== null ? '<div class="jauge"><span style="width:' + pct + '%"></span></div>' : '') +
        '<div class="obj-l"><span>Départ <b>' + esc(o.depart || '–') + '</b></span><span>Dernière <b>' + esc(o.derniere || '–') + '</b></span><span>Cible <b>' + esc(o.cible) + '</b></span></div>' +
        '<div class="doux">' + esc([o.unite, o.date ? 'mesuré le ' + o.date : '', o.echeance ? 'échéance ' + o.echeance : ''].filter(Boolean).join(' · ')) + '</div></section>';
    }).join('');
  }

  function courbe(points) {
    if (points.length < 2) { return ''; }
    var w = 280, hh = 56, min = Math.min.apply(null, points), max = Math.max.apply(null, points), et = (max - min) || 1;
    var pts = points.map(function (v, i) { return (i * w / (points.length - 1)).toFixed(1) + ',' + (hh - 6 - (v - min) / et * (hh - 12)).toFixed(1); });
    return '<svg class="courbe" viewBox="0 0 ' + w + ' ' + hh + '" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + pts.join(' ') + '"/>' +
      '<circle cx="' + pts[pts.length - 1].split(',')[0] + '" cy="' + pts[pts.length - 1].split(',')[1] + '" r="3.5"/></svg>';
  }

  function mesures(d) {
    var h = '';
    var c = d.cibles || {};
    var j = d.journal || [];
    var depuis = function (jours) { var t = new Date(); t.setDate(t.getDate() - jours); return t.toISOString().slice(0, 10); };
    var compte = function (cible, motif) {
      if (!cible || !cible.n) { return ''; }
      var jours = cible.freq === 'jour' ? 1 : (cible.freq === 'mois' ? 30 : 7);
      var dates = {};
      j.forEach(function (m) { if (m.iso >= depuis(jours - 1) && motif(m)) { dates[m.iso] = 1; } });
      var n = Object.keys(dates).length;
      return '<div class="compteur' + (n >= cible.n ? ' ok' : '') + '"><b>' + Math.min(n, cible.n) + ' / ' + cible.n + '</b><span>' + esc(motif.nom) + ' · par ' + esc(cible.freq || 'semaine') + '</span></div>';
    };
    var estPoids = function (m) { return /^poids$/i.test(m.indicateur); }; estPoids.nom = 'pesées';
    var estMens = function (m) { return /tour|cm/i.test(m.indicateur + ' ' + (m.unite || '')); }; estMens.nom = 'mensurations';
    var cpt = compte(c.pesees, estPoids) + compte(c.mensurations, estMens);
    if (cpt) { h += '<section class="bloc"><h2 class="rubrique">Cette période</h2><div class="compteurs">' + cpt + '</div></section>'; }
    h += '<section class="bloc">' + (P.form === 'mesures' ? formMesures(d) : '<button type="button" class="btn press" data-pg="form" data-v="mesures">Ajouter une mesure<span aria-hidden="true">+</span></button>') + '</section>';
    var parInd = {};
    j.forEach(function (m) { (parInd[m.indicateur] = parInd[m.indicateur] || []).push(m); });
    var unites = {}; (d.indicateurs || []).forEach(function (i) { unites[i.nom] = i.unite; });
    var noms = Object.keys(parInd);
    if (!noms.length) { return h + vide('Aucune mesure pour l’instant.'); }
    noms.forEach(function (n) {
      var l = parInd[n], der = l[l.length - 1], prem = l[0];
      var ecart = l.length > 1 ? der.valeur - prem.valeur : null;
      h += '<section class="bloc"><div class="obj-tete"><b>' + esc(n) + '</b><span class="obj-pct">' + fmt(der.valeur) + ' <small>' + esc(unites[n] || '') + '</small></span></div>' +
        courbe(l.slice(-12).map(function (m) { return m.valeur; })) +
        '<div class="doux">Dernière mesure le ' + esc(der.date) + (ecart !== null ? ' · ' + (ecart > 0 ? '+' : '') + fmt(ecart) + ' depuis le ' + esc(prem.date) : '') + '</div></section>';
    });
    return h;
  }

  function formMesures(d) {
    var ind = d.indicateurs || [];
    return '<form class="form-pg" data-form="mesures"><h2 class="rubrique">Nouvelle mesure</h2>' +
      '<div class="champ"><label for="pg-date">Date</label><input type="date" id="pg-date" name="date" value="' + isoAuj() + '"></div>' +
      ind.map(function (i, k) {
        return '<div class="champ"><label for="pg-m' + k + '">' + esc(i.nom) + (i.unite ? ' (' + esc(i.unite) + ')' : '') + '</label>' +
          '<input type="text" inputmode="decimal" id="pg-m' + k + '" data-indicateur="' + esc(i.nom) + '" placeholder="–"></div>';
      }).join('') +
      '<div class="champ"><label for="pg-note">Note</label><input id="pg-note" name="note" placeholder="Facultatif"></div>' +
      boutonsForm() + '</form>';
  }
  function boutonsForm() {
    return '<div class="deux-col"><button type="button" class="btn clair centre press" data-pg="annuler">Annuler</button><button type="submit" class="btn centre press">Enregistrer</button></div>';
  }

  function course(d) {
    var h = '';
    var z = d.zones || [];
    h += '<section class="bloc"><h2 class="rubrique">Mes zones</h2>';
    if (!z.length) { h += '<p class="doux" style="margin:0">Tes zones apparaîtront après ton premier test.</p>'; }
    else {
      h += '<div class="table-zones">' + z.map(function (x) {
        return '<div class="zl"><span class="zn">Z' + esc(x.n) + '</span><span class="zt">' + esc(x.nom) + '</span><span class="zv">' + esc(x.fc || '–') + (x.allure ? '<small>' + esc(x.allure) + '</small>' : '') + '</span></div>';
      }).join('') + '</div>';
    }
    var info = [d.vma ? 'VMA ' + d.vma + ' km/h' : '', d.vo2 ? 'VO2max ' + d.vo2 : '', d.dernierTest ? 'dernier test ' + d.dernierTest : ''].filter(Boolean).join(' · ');
    if (info) { h += '<div class="doux">' + esc(info) + '</div>'; }
    h += '</section>';
    // Records
    h += '<section class="bloc"><h2 class="rubrique">Mes records</h2>';
    (d.records || []).forEach(function (r) {
      h += '<div class="ligne-pg"><b>' + esc(r.distance) + '</b><span>' + esc(r.temps || '–') + '</span><span class="doux">' + esc(r.date || (r.objectif ? 'objectif ' + r.objectif : '')) + '</span></div>';
    });
    h += P.form === 'record' ? formRecord(d) : '<button type="button" class="btn clair press" data-pg="form" data-v="record">Nouveau record<span aria-hidden="true">+</span></button>';
    h += '</section>';
    // Tests
    h += '<section class="bloc"><h2 class="rubrique">Mes tests</h2>';
    var t = d.tests || [];
    if (!t.length) { h += '<p class="doux" style="margin:0">Aucun test enregistré.</p>'; }
    t.slice(0, 8).forEach(function (x) {
      h += '<div class="ligne-pg"><b>' + esc(x.date || '') + '</b><span>' + esc(x.temps || x.resultat || '') + '</span><span class="doux">' + esc(x.resultat && x.temps ? x.resultat : (x.commentaire || '')) + '</span></div>';
    });
    if (d.fcSeuil) { h += '<div class="doux">FC seuil : ' + esc(d.fcSeuil) + '</div>'; }
    if (d.testTempsPossible || d.testFcPossible) {
      h += P.form === 'test' ? formTest(d) : '<button type="button" class="btn clair press" data-pg="form" data-v="test">Noter un test<span aria-hidden="true">+</span></button>';
    }
    return h + '</section>';
  }

  function formRecord(d) {
    return '<form class="form-pg" data-form="record">' +
      '<div class="champ"><label for="pg-dist">Distance</label><select id="pg-dist" name="distance">' + (d.records || []).map(function (r) { return '<option>' + esc(r.distance) + '</option>'; }).join('') + '</select></div>' +
      '<div class="deux-col"><div class="champ"><label for="pg-temps">Temps</label><input id="pg-temps" name="temps" placeholder="42:30 ou 1:35:00"></div>' +
      '<div class="champ"><label for="pg-dr">Date</label><input type="date" id="pg-dr" name="date" value="' + isoAuj() + '"></div></div>' +
      boutonsForm() + '</form>';
  }
  function formTest(d) {
    var deux = d.testTempsPossible && d.testFcPossible;
    return '<form class="form-pg" data-form="test">' +
      (deux ? '<div class="champ"><label for="pg-tt">Test</label><select id="pg-tt" name="type"><option value="temps">Test 2,4 km (temps)</option><option value="fc">Test FC de 20 min</option></select></div>'
            : '<input type="hidden" name="type" value="' + (d.testTempsPossible ? 'temps' : 'fc') + '">') +
      '<div class="deux-col"><div class="champ"><label for="pg-tv">Temps ou FC moyenne</label><input id="pg-tv" name="valeur" placeholder="10:45 ou 168"></div>' +
      '<div class="champ"><label for="pg-td">Date</label><input type="date" id="pg-td" name="date" value="' + isoAuj() + '"></div></div>' +
      '<div class="champ"><label for="pg-tc">Commentaire</label><input id="pg-tc" name="commentaire" placeholder="Facultatif"></div>' +
      boutonsForm() + '</form>';
  }

  function force(d) {
    var h = '<section class="bloc"><h2 class="rubrique">Mes RM1</h2>';
    var l = d.rm1 || [];
    if (!l.length) { h += '<p class="doux" style="margin:0">Aucun RM1 enregistré.</p>'; }
    l.forEach(function (r) {
      h += '<div class="ligne-pg"><b>' + esc(r.exercice) + '</b><span>' + (r.charge !== null && r.charge !== undefined ? fmt(r.charge) + ' kg' : '–') + '</span><span class="doux">' + esc(r.date) + '</span></div>';
    });
    h += P.form === 'rm1' ? formRm1(d) : '<button type="button" class="btn clair press" data-pg="form" data-v="rm1">Nouveau RM1<span aria-hidden="true">+</span></button>';
    return h + '</section>';
  }
  function formRm1(d) {
    var ex = (d.exercices || []).slice();
    (d.rm1 || []).forEach(function (r) { if (ex.indexOf(r.exercice) < 0) { ex.push(r.exercice); } });
    return '<form class="form-pg" data-form="rm1">' +
      '<div class="champ"><label for="pg-ex">Exercice</label><input id="pg-ex" name="exercice" list="pg-exl" placeholder="Développé couché"><datalist id="pg-exl">' + ex.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist></div>' +
      '<div class="deux-col"><div class="champ"><label for="pg-kg">Charge (kg)</label><input id="pg-kg" name="charge" inputmode="decimal" placeholder="80"></div>' +
      '<div class="champ"><label for="pg-rd">Date</label><input type="date" id="pg-rd" name="date" value="' + isoAuj() + '"></div></div>' +
      '<div class="champ"><label for="pg-rc">Commentaire</label><input id="pg-rc" name="commentaire" placeholder="Facultatif"></div>' +
      boutonsForm() + '</form>';
  }

  function historique(d) {
    var v = d.variante || 'Mixte';
    var types = [];
    if (v !== 'Course') { types.push(['muscu', 'Musculation']); }
    if (v !== 'Muscu') { types.push(['course', 'Course']); }
    if (!types.some(function (t) { return t[0] === P.histo; })) { P.histo = types[0][0]; }
    var h = types.length > 1 ? '<div class="puces d2" style="margin-top:16px">' + types.map(function (t) {
      return '<button type="button" class="puce press" data-pg="histo" data-v="' + t[0] + '" aria-pressed="' + (t[0] === P.histo ? 'true' : 'false') + '">' + t[1] + '</button>';
    }).join('') + '</div>' : '';
    var l = P.histo === 'muscu' ? (d.histoMuscu || []) : (d.histoCourse || []);
    if (!l.length) { return h + vide('Rien dans l’historique pour l’instant : il se remplit chaque lundi matin.'); }
    var parSem = {}, ordre = [];
    l.forEach(function (x) { if (!parSem[x.iso]) { parSem[x.iso] = []; ordre.push(x.iso); } parSem[x.iso].push(x); });
    ordre.sort().reverse();
    ordre.slice(0, 12).forEach(function (iso) {
      var g = parSem[iso];
      h += '<section class="bloc"><h2 class="rubrique">Semaine du ' + esc(g[0].semaine) + '</h2>';
      if (P.histo === 'muscu') {
        var seances = {}, so = [];
        g.forEach(function (x) { if (!seances[x.seance]) { seances[x.seance] = []; so.push(x.seance); } seances[x.seance].push(x); });
        so.forEach(function (s) {
          h += '<div class="h-seance">' + esc(s) + '</div>';
          seances[s].forEach(function (x) {
            var ok = /^atteint/i.test(x.atteint);
            h += '<div class="ligne-pg h"><span class="pt ' + (ok ? 'ok' : (/non atteint/i.test(x.atteint) ? 'ko' : '')) + '"></span><b>' + esc(x.exercice) + '</b><span class="doux">' +
              esc([x.volume, x.charge].filter(Boolean).join(' · ')) + '</span></div>' +
              (x.commentaire ? '<div class="h-com">' + esc(x.commentaire) + '</div>' : '');
          });
        });
      } else {
        g.forEach(function (x) {
          var ok = /^fait/i.test(x.statut);
          h += '<div class="ligne-pg h"><span class="pt ' + (ok ? 'ok' : (/manqu/i.test(x.statut) ? 'ko' : '')) + '"></span><b>' + esc(x.jour + ' · ' + x.seance) + '</b><span class="doux">' +
            esc([x.duree ? x.duree + ' min' : '', x.distance ? x.distance + ' km' : '', x.rpe ? 'RPE ' + x.rpe : ''].filter(Boolean).join(' · ') || x.statut) + '</span></div>' +
            (x.commentaire ? '<div class="h-com">' + esc(x.commentaire) + '</div>' : '');
        });
      }
      h += '</section>';
    });
    return h;
  }

  // ---------- Saisies ----------
  function toast(t) { if (window.TrempeApp && window.TrempeApp.toast) { window.TrempeApp.toast(t); } }
  function envoyer(action, donnees, ajouterLocal) {
    Api.envoyer(action, donnees).then(function () { if (navigator.onLine !== false && !Api.demo()) { setTimeout(charger, 4000); } });
    if (ajouterLocal) { ajouterLocal(); garder(); }
    P.form = null;
    dessiner();
    toast(navigator.onLine === false ? 'Pas de réseau : ce sera envoyé dès que possible.' : 'Enregistré.');
  }

  function soumettre(f) {
    var type = f.getAttribute('data-form'), d = P.d, v = function (n) { var e = f.elements[n]; return e ? String(e.value || '').trim() : ''; };
    if (type === 'mesures') {
      var ms = [];
      f.querySelectorAll('[data-indicateur]').forEach(function (i) { var n = nombre(i.value); if (n !== null) { ms.push({ indicateur: i.getAttribute('data-indicateur'), valeur: n }); } });
      if (!ms.length) { toast('Indique au moins une valeur.'); return; }
      var date = v('date') || isoAuj();
      envoyer('mesures', { date: date, mesures: ms, note: v('note') }, function () {
        ms.forEach(function (m) { d.journal.push({ iso: date, date: jjmm(date), indicateur: m.indicateur, valeur: m.valeur, note: v('note') }); });
        d.journal.sort(function (a, b) { return a.iso < b.iso ? -1 : (a.iso > b.iso ? 1 : 0); });
      });
    } else if (type === 'rm1') {
      var kg = nombre(v('charge'));
      if (!v('exercice') || kg === null) { toast('Indique l’exercice et la charge.'); return; }
      envoyer('rm1', { exercice: v('exercice'), charge: kg, date: v('date') || isoAuj(), commentaire: v('commentaire') }, function () {
        d.rm1 = (d.rm1 || []).filter(function (r) { return r.exercice !== v('exercice'); });
        d.rm1.push({ exercice: v('exercice'), charge: kg, date: jjmm(v('date') || isoAuj()), iso: v('date') });
      });
    } else if (type === 'record') {
      if (!/^\d{1,2}(:\d{2}){1,2}$/.test(v('temps').replace(/[hH]/, ':'))) { toast('Temps à écrire comme 42:30 ou 1:35:00.'); return; }
      envoyer('record', { distance: v('distance'), temps: v('temps'), date: v('date') || isoAuj() }, function () {
        (d.records || []).forEach(function (r) { if (r.distance === v('distance')) { r.temps = v('temps'); r.date = jjmm(v('date')); } });
      });
    } else if (type === 'test') {
      var t = v('type') || 'temps', val = v('valeur');
      if (t === 'fc' ? nombre(val) === null : !/^\d{1,2}:\d{2}$/.test(val)) { toast(t === 'fc' ? 'Indique ta FC moyenne.' : 'Temps à écrire comme 10:45.'); return; }
      var donnees = t === 'fc' ? { type: 'fc', fc: nombre(val), date: v('date') } : { type: 'temps', temps: val, date: v('date') || isoAuj(), commentaire: v('commentaire') };
      envoyer('test', donnees, function () {
        if (t !== 'fc') { (d.tests = d.tests || []).unshift({ date: jjmm(v('date')), temps: val, commentaire: v('commentaire') }); } else { d.fcSeuil = ''; }
      });
    }
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-pg]'); if (!b || !$('#ecran-progres').contains(b)) { return; }
    var a = b.getAttribute('data-pg'), v = b.getAttribute('data-v');
    if (a === 'section') { P.section = v; P.form = null; dessiner(); $('#ecran-progres').scrollTop = 0; }
    else if (a === 'form') { P.form = v; dessiner(); var f = $('#ecran-progres form'); if (f) { f.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }
    else if (a === 'annuler') { P.form = null; dessiner(); }
    else if (a === 'histo') { P.histo = v; dessiner(); }
  });
  document.addEventListener('submit', function (ev) {
    var f = ev.target; if (!f.matches || !f.matches('#ecran-progres form[data-form]')) { return; }
    ev.preventDefault(); soumettre(f);
  });

  window.TrempeProgres = {
    // Appelé par app.js quand l'onglet Progrès est dessiné.
    dessiner: function (donneesAccueil) {
      if (!P.d) { P.d = lire(); }
      if (donneesAccueil && P.d && donneesAccueil.client && P.d.variante && donneesAccueil.client.variante !== P.d.variante) { P.d = null; }
      setTimeout(dessiner, 0);
      charger();
      return '<div class="chargement">Chargement…</div>';
    },
    oublier: function () { P.d = null; P.section = null; try { localStorage.removeItem(CLE); } catch (e) {} }
  };
})();
