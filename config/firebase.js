require('dotenv').config();
const admin = require('firebase-admin');

const path = require('path');

let serviceAccount;

try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        // 1. Explicit path (Best for VPS/bare-metal)
        serviceAccount = require(path.isAbsolute(process.env.FIREBASE_SERVICE_ACCOUNT_PATH) 
            ? process.env.FIREBASE_SERVICE_ACCOUNT_PATH 
            : path.join(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        // 2. Direct JSON string (Best for Render/PaaS)
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
        // 3. File search (Local dev / Render Secret Files)
        try {
            serviceAccount = require('./serviceAccount.json');
        } catch (e) {
            serviceAccount = require(path.join(process.cwd(), 'serviceAccount.json'));
        }
    }
} catch (error) {
    console.warn("Could not load Firebase Service Account from any source.");
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
