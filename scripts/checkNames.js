const { db } = require('../config/firebase');

async function checkNames() {
  try {
    const snap = await db.collection('bonafideForms').orderBy('createdAt', 'desc').get();
    console.log('--- Current Names in DB ---');
    snap.docs.forEach(doc => {
      console.log(`ID: ${doc.id} | Name: "${doc.data().name}"`);
    });
  } catch (err) {
    console.error(err);
  }
}

checkNames();
