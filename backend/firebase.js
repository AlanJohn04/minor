




const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://minor-4edc7.firebaseio.com'
});
const db = admin.firestore();

module.exports = { admin, db };