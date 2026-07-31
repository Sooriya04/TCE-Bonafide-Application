const express = require('express');
const router = express.Router();
const devCtrl = require('../controllers/devController');
const { checkDev } = require('../middleware/authMiddleware');

router.get('/health', devCtrl.getHealth);
router.get('/metrics', checkDev, devCtrl.getMetrics);
router.get('/logs', checkDev, devCtrl.getLogs);

module.exports = router;
