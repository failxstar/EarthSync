const express = require('express');
const { getMyResources, getMyReports, updateProfile, changePassword, getProfile } = require('./users.controller');
const { requireAuth } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);
router.get('/me', getProfile);
router.get('/me/resources', getMyResources);
router.get('/me/reports', getMyReports);
router.patch('/me', updateProfile);
router.patch('/me/password', changePassword);

module.exports = router;
