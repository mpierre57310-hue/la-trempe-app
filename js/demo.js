// Données fictives pour essayer l'appli sans compte (adresse terminée par ?demo=1).
// Trois profils : Course (exemple Sam), Mixte (exemple Val), Muscu (exemple Coltin).
// Profil choisi : ?profil=course|mixte|muscu, ou le sélecteur affiché sur l'accueil en mode démo.
window.TREMPE_DEMO_PROFILS = [['course', 'Course'], ['mixte', 'Mixte'], ['muscu', 'Muscu']];
window.TREMPE_DEMO_PROFIL = function () {
  var m = location.search.match(/[?&]profil=(course|mixte|muscu)/);
  if (m) { return m[1]; }
  try { return localStorage.getItem('trempe_demo_profil') || 'course'; } catch (e) { return 'course'; }
};
window.TREMPE_DEMO = function () {
  var profil = window.TREMPE_DEMO_PROFIL();
  var auj = new Date();
  var iso = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var lundi = new Date(auj); lundi.setDate(auj.getDate() - ((auj.getDay() + 6) % 7));
  var jourN = function (n) { var d = new Date(lundi); d.setDate(lundi.getDate() + n); return d; };
  var jj = function (d) { return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); };
  // Démo : on se place toujours un mercredi, pour voir des séances faites, celle du jour et celles à venir.
  var aujIdx = 2;
  var statut = function (n) { return n < aujIdx ? 'Fait' : (n === aujIdx ? "Aujourd'hui" : 'À faire'); };
  var course = function (n, nom, duree, ech, contenu, zone, allure, consignes, repere, fc) {
    var d = jourN(n);
    var s = {
      id: 'c' + n, type: 'course', date: iso(d), nom: nom, duree: duree, statut: statut(n), libelleListe: jj(d) + ' – ' + nom,
      parties: [
        { titre: 'Échauffement', texte: ech },
        { titre: 'Corps de séance', texte: contenu, zone: zone, allure: allure, fc: fc || '' },
        { titre: 'Consignes', texte: consignes }
      ]
    };
    if (repere) { s.repere = repere; }
    return s;
  };
  // ex : [exercice, volume, charge, repos, consignes, résultat sem. préc., commentaire sem. préc.]
  var muscu = function (n, nom, duree, ech, liste) {
    var d = jourN(n);
    var passe = n < aujIdx;
    return {
      id: 'm' + n, type: 'muscu', date: iso(d), nom: nom, duree: duree, statut: statut(n), libelleListe: jj(d) + ' – ' + nom,
      echauffement: ech,
      exercices: liste.map(function (e, i) {
        return {
          ligne: 120 + n * 10 + i, exercice: e[0], volume: e[1], charge: e[2], repos: e[3], consignes: e[4] || '', video: '',
          fait: passe, commentaire: '', precResultat: e[5] || '', precCommentaire: e[6] || ''
        };
      })
    };
  };

  var saison = function (types) { return types.map(function (t, k) { return { numero: k + 1, type: t }; }); };
  var P = {
    course: function () {
      var seances = [
        course(1, 'Endurance fondamentale', 30, '10 min très facile, respiration nasale.', '20 min en endurance fondamentale.', 'Z2', '7:10 à 7:40 /km', 'Reste en aisance respiratoire, tu dois pouvoir parler.', '', '135 à 150 bpm'),
        course(2, 'VMA courte', 45, '20 min progressif + 4 lignes droites.', '10 × 400 m, récupération 1 min 30 trot.', 'Z5', '4:50 à 5:00 /km', 'Pars à l’allure cible, pas plus vite : les dernières doivent être aussi rapides que les premières.', 'allure', 'plus de 180 bpm'),
        course(3, 'EM1 Fractionnés à allure de croisière', 38, '15 min progressif + 3 lignes droites.', '4 × 4 min allure de croisière, récupération 2 min trot.', 'Z3', '6:05 à 6:15 /km', 'Régularité avant tout : la dernière répétition au même rythme que la première.', '', '158 à 168 bpm'),
        course(5, 'Endurance fondamentale', 60, '10 min très facile.', '50 min en endurance fondamentale, terrain plat.', 'Z2', '7:10 à 7:40 /km', 'Sortie vraiment facile avant la semaine de test.', '', '135 à 150 bpm')
      ];
      return {
        client: { prenom: 'Léa', variante: 'Course', femme: true },
        cycle: { phase: 'Phase lutéale', conseil: 'Récupération parfois moins bonne : hydrate-toi bien et module l’intensité selon le ressenti.' },
        message: 'Semaine de test la semaine prochaine. Garde la sortie de dimanche vraiment facile et dors bien jeudi soir.',
        plan: { numero: 8, total: 13, type: 'Repos', periode: 'Générale', note: '', prochaine: 'Test (Test VMA 2,4 km)',
          frise: saison(['Travail', 'Travail', 'Repos', 'Test', 'Travail', 'Travail', 'Travail', 'Repos', 'Test', 'Travail', 'Travail', 'Repos', 'Test']) },
        seances: seances, types: ['Course', 'Vélo', 'Renforcement', 'Autre'], typeParDefaut: 'Course',
        pesee: { faites: 1, objectif: 2 }
      };
    },
    mixte: function () {
      var seances = [
        course(0, 'Endurance fondamentale', 45, '10 min très facile.', '35 min en endurance fondamentale.', 'Z2', '5:30 à 5:50 /km', 'Aisance respiratoire du début à la fin.', '', '132 à 148 bpm'),
        muscu(1, 'Force – haut du corps', 60, '10 min : rameur léger, rotations d’épaules, 2 séries légères du premier exercice.', [
          ['Développé couché', '4 × 6', '72,5 kg', '2 min 30', 'Omoplates serrées, pieds ancrés.', '4 × 6 à 70 kg', 'Dernière série dure.'],
          ['Traction pronation', '4 × 6', 'Poids du corps', '2 min', 'Descente contrôlée en 3 secondes.', '4 × 5'],
          ['Développé militaire haltères', '3 × 8', '20 kg', '1 min 30', '', '3 × 8 à 18 kg'],
          ['Rowing barre', '3 × 8', '60 kg', '1 min 30', 'Dos plat, barre vers le nombril.', '3 × 8 à 57,5 kg'],
          ['Gainage planche', '3 × 45 s', '', '45 s', '', '3 × 40 s']
        ]),
        course(3, 'Seuil', 55, '20 min progressif + 3 lignes droites.', '3 × 8 min au seuil, récupération 2 min trot.', 'Z4', '4:20 à 4:30 /km', 'Allure régulière : tu dois finir en ayant pu en faire une de plus.', 'allure', '168 à 176 bpm'),
        muscu(4, 'Force – bas du corps', 60, '10 min : vélo léger, mobilité hanches et chevilles.', [
          ['Squat', '4 × 5', '95 kg', '3 min', 'Descends sous le parallèle, genoux dans l’axe.', '4 × 5 à 92,5 kg'],
          ['Soulevé de terre roumain', '3 × 8', '80 kg', '2 min', 'Dos plat, sens l’étirement des ischios.', '3 × 8 à 77,5 kg'],
          ['Fentes bulgares', '3 × 8 / jambe', '2 × 16 kg', '1 min 30', '', '3 × 8 à 2 × 14 kg'],
          ['Mollets debout', '3 × 12', '40 kg', '1 min', 'Pause 1 seconde en haut.', '3 × 12']
        ]),
        course(6, 'Sortie longue trail', 90, '15 min très facile.', '1 h 15 vallonnée, côtes en marche active si besoin.', 'Z2', '', 'Bois toutes les 20 min, prends une barre à mi-parcours.', '', '132 à 148 bpm')
      ];
      return {
        client: { prenom: 'Valentin', variante: 'Mixte', femme: false },
        cycle: null,
        message: 'Belle semaine. Sur le seuil de jeudi, ne pars pas trop vite : l’allure, pas la montre au cardio.',
        plan: { numero: 7, total: 12, type: 'Travail', periode: 'Spécifique', note: 'Trail des Vosges dans 5 semaines', prochaine: 'Travail',
          frise: saison(['Travail', 'Travail', 'Test', 'Travail', 'Repos', 'Travail', 'Travail', 'Travail', 'Repos', 'Test', 'Travail', 'Coupure']) },
        seances: seances, types: ['Course à pied', 'Musculation', 'Autre'], typeParDefaut: 'Course à pied',
        pesee: { faites: 1, objectif: 2 }
      };
    },
    muscu: function () {
      var seances = [
        muscu(0, 'Push – pectoraux, épaules, triceps', 70, '10 min : rameur, élastique épaules, 2 séries d’approche au développé couché.', [
          ['Développé couché', '4 × 8', '80 kg', '2 min 30', 'Omoplates serrées, barre sur le bas des pectoraux.', '4 × 8 à 77,5 kg', 'Facile sur les 3 premières.'],
          ['Développé incliné haltères', '3 × 10', '2 × 28 kg', '2 min', '', '3 × 10 à 2 × 26 kg'],
          ['Développé militaire', '3 × 8', '45 kg', '2 min', 'Fessiers serrés, pas de cambrure.', '3 × 7 à 45 kg'],
          ['Élévations latérales', '3 × 15', '2 × 10 kg', '1 min', 'Monte jusqu’aux épaules, pas plus haut.', '3 × 15 à 2 × 8 kg'],
          ['Dips', '3 × max', 'Poids du corps', '1 min 30', '', '3 × 12, 10, 9']
        ]),
        muscu(2, 'Pull – dos, biceps', 70, '10 min : rameur, suspension barre, tirages élastiques.', [
          ['Traction pronation', '4 × 6', '+ 10 kg', '2 min 30', 'Menton au-dessus de la barre, descente complète.', '4 × 6 à + 7,5 kg'],
          ['Rowing barre', '4 × 8', '75 kg', '2 min', 'Dos plat, barre vers le nombril.', '4 × 8 à 72,5 kg'],
          ['Tirage horizontal poulie', '3 × 12', '60 kg', '1 min 30', '', '3 × 12 à 55 kg'],
          ['Face pull', '3 × 15', '20 kg', '1 min', 'Coudes hauts, pause 1 seconde.', '3 × 15'],
          ['Curl barre EZ', '3 × 10', '35 kg', '1 min', '', '3 × 10 à 32,5 kg']
        ]),
        muscu(4, 'Legs – jambes', 75, '10 min : vélo, mobilité hanches et chevilles, 2 séries d’approche au squat.', [
          ['Squat', '5 × 5', '120 kg', '3 min', 'Descends sous le parallèle, gaine avant chaque répétition.', '5 × 5 à 117,5 kg', 'Genou gauche un peu raide au début.'],
          ['Soulevé de terre roumain', '3 × 8', '100 kg', '2 min', '', '3 × 8 à 95 kg'],
          ['Presse à cuisses', '3 × 12', '200 kg', '2 min', '', '3 × 12 à 190 kg'],
          ['Leg curl assis', '3 × 12', '50 kg', '1 min', '', '3 × 12 à 45 kg'],
          ['Mollets presse', '4 × 15', '120 kg', '1 min', 'Amplitude complète.', '4 × 15']
        ]),
        muscu(5, 'Full body – rappel', 50, '8 min : rameur et mobilité générale.', [
          ['Soulevé de terre', '3 × 3', '150 kg', '3 min', 'Technique avant la charge.', '3 × 3 à 145 kg'],
          ['Développé couché prise serrée', '3 × 8', '65 kg', '2 min', '', '3 × 8 à 62,5 kg'],
          ['Farmer walk', '3 × 30 m', '2 × 32 kg', '1 min 30', 'Épaules basses, pas rapides.', '3 × 30 m à 2 × 30 kg']
        ])
      ];
      return {
        client: { prenom: 'Alexandre', variante: 'Muscu', femme: false },
        cycle: null,
        message: 'Dernière semaine du bloc force. On garde les charges, on soigne la technique, test des maxis lundi prochain.',
        plan: { numero: 12, total: 19, type: 'Travail', periode: 'Spécifique', note: 'Bloc force, dernière semaine', prochaine: 'Test (maxis)',
          frise: saison(['Travail', 'Travail', 'Travail', 'Repos', 'Test', 'Travail', 'Travail', 'Repos', 'Test', 'Travail', 'Travail', 'Travail', 'Test', 'Travail', 'Travail', 'Repos', 'Travail', 'Travail', 'Test']) },
        seances: seances, types: ['Musculation', 'Course à pied', 'Autre'], typeParDefaut: 'Musculation',
        pesee: { faites: 2, objectif: 3 }
      };
    }
  };

  var p = (P[profil] || P.course)();
  return {
    ok: true,
    demo: true,
    profilDemo: profil,
    client: p.client,
    semaine: { libelle: 'Semaine du ' + jj(lundi), lundi: iso(lundi) },
    aujourdhui: iso(jourN(aujIdx)),
    cycle: p.cycle,
    message: p.message,
    plan: p.plan,
    alertes: [],
    seances: p.seances,
    retour: {
      seancesPrevues: p.seances.map(function (s) { return s.libelleListe; }),
      types: p.types,
      typeParDefaut: p.typeParDefaut
    },
    mesures: { pesee: p.pesee }
  };
};
