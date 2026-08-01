const express = require('express');
const router = express.Router();
const bonafideCtrl = require('../controllers/bonafideController');
const { checkAuth, checkAdmin } = require('../middleware/authMiddleware');

router.post('/submit', checkAuth, bonafideCtrl.submitForm);
router.get('/admin/forms', checkAdmin, bonafideCtrl.getAdminForms);
router.patch('/admin/forms/:id/downloaded', checkAdmin, bonafideCtrl.toggleDownloaded);
router.get('/student/forms', checkAuth, bonafideCtrl.getStudentForms);
router.get('/download/:id', checkAuth, bonafideCtrl.downloadDocx);

module.exports = router;
