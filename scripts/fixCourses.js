const { db } = require('../config/firebase');

async function fixCourseNames() {
  console.log('Starting cleanup of course names (removing trailing dots)...');
  
  try {
    const snap = await db.collection('bonafideForms').get();
    
    if (snap.empty) {
      console.log('No forms found.');
      return;
    }

    const batch = db.batch();
    let fixCount = 0;

    snap.docs.forEach(doc => {
      let course = doc.data().course || '';
      const originalCourse = course;

      // Remove trailing dot if it exists
      if (course.endsWith('.')) {
        course = course.slice(0, -1);
      }

      if (course !== originalCourse) {
        console.log(`Fixing: "${originalCourse}" -> "${course}"`);
        batch.update(doc.ref, { course: course });
        fixCount++;
      }
    });

    if (fixCount === 0) {
      console.log('No courses with trailing dots found.');
      return;
    }

    await batch.commit();
    console.log(`✅ Successfully cleaned up ${fixCount} course names.`);

  } catch (err) {
    console.error('❌ Error during course cleanup:', err);
  }
}

fixCourseNames();
