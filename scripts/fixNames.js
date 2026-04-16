const { db } = require('../config/firebase');

async function aggressiveFixNames() {
  console.log('Starting aggressive cleanup of prefixed names...');
  
  try {
    const snap = await db.collection('bonafideForms').get();
    
    if (snap.empty) {
      console.log('No forms found.');
      return;
    }

    const batch = db.batch();
    let fixCount = 0;

    snap.docs.forEach(doc => {
      let name = doc.data().name || '';
      const originalName = name;

      // Aggressively remove combinations of ".", "Mr.", "Ms.", "Mr", "Ms", and spaces from the start
      // This regex handles dots at the start, spaces, and the titles.
      const aggressiveRegex = /^[\s\.]*(Mr|Ms|Mr\.|Ms\.)?[\s\.]*/i;
      
      let prevName;
      do {
        prevName = name;
        name = name.replace(aggressiveRegex, '');
      } while (name !== prevName && name.length > 0);

      if (name !== originalName) {
        console.log(`Fixing: "${originalName}" -> "${name}"`);
        batch.update(doc.ref, { name: name.trim() });
        fixCount++;
      }
    });

    if (fixCount === 0) {
      console.log('No prefixed names found.');
      return;
    }

    await batch.commit();
    console.log(`✅ Successfully cleaned up ${fixCount} names.`);

  } catch (err) {
    console.error('❌ Error during aggressive cleanup:', err);
  }
}

aggressiveFixNames();
