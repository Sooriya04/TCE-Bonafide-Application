// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { getAdminPage, toggleDownloaded } = require('../controllers/adminController');
const {
  ensureLoggedIn,
  ensureAdmin,
} = require('../middleware/adminMiddleware');

// Admin page that lists all bonafideForms
router.get('/admin', ensureLoggedIn, ensureAdmin, getAdminPage);

// Toggle downloaded status
router.patch('/admin/toggle-downloaded/:id', ensureLoggedIn, ensureAdmin, toggleDownloaded);

module.exports = router;
