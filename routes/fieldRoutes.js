const express = require('express');
const router = express.Router();
const fieldCtrl = require('../controllers/fieldController');
const { checkAuth, checkAdmin } = require('../middleware/authMiddleware');

router.get('/active', fieldCtrl.getFields);
router.get('/all', checkAdmin, fieldCtrl.getAdminFields);
router.post('/save', checkAdmin, fieldCtrl.createOrUpdateField);
router.delete('/:key', checkAdmin, fieldCtrl.deleteField);

module.exports = router;
