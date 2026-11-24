// Réglages de LA TREMPE APP. Rien de secret ici : ce fichier est public.
self.TREMPE_CONFIG = {
  // Adresse de l'application web Google (déploiement de la Vue clients), terminée par /exec.
  urlScript: 'https://script.google.com/macros/s/AKfycbwG-bbDN4ANsSza3KKMCJ02azlE1BcPkCoMR8zLMICXVRNcRnGFbuU4zqx46ZC78QA1/exec',

  // Projet Firebase (notifications). À remplir avec les valeurs données par la console Firebase.
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    messagingSenderId: '',
    appId: ''
  },
  // Clé publique « Web Push » (Firebase > Paramètres du projet > Cloud Messaging > Certificats Web Push).
  vapidKey: '',

  demo: false,
  version: '1.1.0'
};
