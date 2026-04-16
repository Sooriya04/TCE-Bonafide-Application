const { db } = require('../config/firebase');

async function cleanupDuplicates() {
  console.log('Starting cleanup of duplicate bonafide forms...');
  
  try {
    const snap = await db.collection('bonafideForms').orderBy('createdAt', 'desc').get();
    
    if (snap.empty) {
      console.log('No forms found.');
      return;
    }

    const seen = new Set();
    const toDelete = [];

    snap.docs.forEach(doc => {
      const data = doc.data();
      // Define uniqueness by Roll No and Certificate For
      // We use a key to track if we've seen this exact request from this student before
      const key = `${data.rollno}_${data.certificateFor}`;

      if (seen.has(key)) {
        // This is a duplicate (since we ordered by createdAt desc, this is an older one)
        toDelete.push(doc.id);
      } else {
        seen.add(key);
      }
    });

    console.log(`Found ${toDelete.length} duplicate entries.`);

    if (toDelete.length === 0) {
      console.log('Nothing to delete.');
      return;
    }

    // Delete in batches of 500 (Firestore limit)
    const batches = [];
    while (toDelete.length > 0) {
      const batch = db.batch();
      const chunk = toDelete.splice(0, 500);
      chunk.forEach(id => {
        batch.delete(db.collection('bonafideForms').doc(id));
      });
      batches.push(batch.commit());
    }

    await Promise.all(batches);
    console.log('✅ Cleanup completed successfully.');

  } catch (err) {
    console.error('❌ Error during cleanup:', err);
  }
}

cleanupDuplicates();
