const express = require('express');
const router = express.Router();
const bonafideCtrl = require('../controllers/bonafideController');
const { checkAuth, checkAdmin } = require('../../../shared/middleware/authMiddleware');

router.get('/admin/forms', checkAdmin, bonafideCtrl.getAdminForms);
router.patch('/admin/forms/:id/downloaded', checkAdmin, bonafideCtrl.toggleDownloaded);
router.get('/admin/student/:rollno/history', checkAdmin, bonafideCtrl.getStudentHistoryForAdmin);
router.get('/download/:id', checkAuth, bonafideCtrl.downloadDocx);

module.exports = router;
