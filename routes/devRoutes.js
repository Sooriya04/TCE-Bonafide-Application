const express = require('express');
const router = express.Router();
const devCtrl = require('../controllers/devController');
const { checkDev } = require('../middleware/authMiddleware');

router.get('/health', devCtrl.getHealth);
router.get('/metrics', checkDev, devCtrl.getMetrics);

// Logs — order matters: specific before generic
router.get('/logs/count',  checkDev, devCtrl.getLogsCount);
router.get('/logs/stream', checkDev, devCtrl.streamLogs);  // SSE
router.get('/logs',        checkDev, devCtrl.getLogs);

// Dev account operations restricted to admins
router.get('/users',       checkDev, devCtrl.getDevUsers);
router.post('/users',      checkDev, devCtrl.addDevUser);
router.delete('/users/:id',checkDev, devCtrl.deleteDevUser);

module.exports = router;
