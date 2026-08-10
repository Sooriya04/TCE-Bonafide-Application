const express = require('express');
const router = express.Router();
const bonafideCtrl = require('../controllers/bonafideController');
const { checkAuth } = require('../../../shared/middleware/authMiddleware');

router.post('/submit', checkAuth, bonafideCtrl.submitForm);
router.get('/student/forms', checkAuth, bonafideCtrl.getStudentForms);

module.exports = router;
