// Réglages de LA TREMPE APP. Rien de secret ici : ce fichier est public.
self.TREMPE_CONFIG = {
  // Adresse de l'application web Google (déploiement de la Vue clients), terminée par /exec.
  urlScript: 'https://script.google.com/macros/s/AKfycbwG-bbDN4ANsSza3KKMCJ02azlE1BcPkCoMR8zLMICXVRNcRnGFbuU4zqx46ZC78QA1/exec',

  // Projet Firebase (notifications). À remplir avec les valeurs données par la console Firebase.
  firebase: {
    apiKey: 'AIzaSyB6vo7iqsG-d8uClmwoYpthVDtDKErzwqg',
    authDomain: 'la-trempe-app.firebaseapp.com',
    projectId: 'la-trempe-app',
    messagingSenderId: '851600175497',
    appId: '1:851600175497:web:84d578296ad6942fbcb158'
  },
  // Clé publique « Web Push » (Firebase > Paramètres du projet > Cloud Messaging > Certificats Web Push).
  vapidKey: 'BO6az6eIQXYY2n60uSIawdEXr7hIR0OqlzQc1-eeR0soYSvvV9h_TNSkvK2ah2I4XXsm3IEbtL86_S08xSpdQ6o',

  demo: false,
  version: '1.1.0'
};
