require('dotenv').config();
const admin = require('firebase-admin');

const path = require('path');

let serviceAccount;

try {
    // Try the config folder (local dev)
    serviceAccount = require('./serviceAccount.json');
} catch (e) {
    try {
        // Try the root folder (Render Secret File with filename 'serviceAccount.json')
        serviceAccount = require(path.join(process.cwd(), 'serviceAccount.json'));
    } catch (e2) {
        // Try environment variable as a fallback
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        }
    }
}

if (serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
} else {
    console.error("Firebase Service Account not found. Deployment might fail.");
}

const db = admin.firestore();

module.exports = { admin, db };
