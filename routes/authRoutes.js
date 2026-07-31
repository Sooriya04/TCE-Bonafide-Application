const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');

router.post('/request-otp', authCtrl.requestOTP);
router.post('/verify-otp', authCtrl.verifyOTP);
router.post('/admin/login', authCtrl.adminLogin);
router.post('/logout', authCtrl.logout);
router.get('/me', authCtrl.getMe);

module.exports = router;
