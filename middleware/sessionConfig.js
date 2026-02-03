const session = require('express-session');
const { FirestoreStore } = require('@google-cloud/connect-firestore');
const { db } = require('../config/firebase');

const sessionMiddleware = session({
  store: new FirestoreStore({
    dataset: db,
    kind: 'sessions',
    ttl: 60 * 60 * 12, // 12 hours (in seconds)
  }),
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 12, // 12 hours (in milliseconds)
  },
});

module.exports = sessionMiddleware;
