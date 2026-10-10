const express = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const { getPublicImpactSummary, getImpactSummary, getImpactHistory, getPlatformImpactHistory } = require('./impact.controller');

const router = express.Router();

// Public endpoint
router.get('/public', getPublicImpactSummary);

// Protected endpoints
router.use(requireAuth);
router.get('/summary', getImpactSummary);
router.get('/history', getImpactHistory);
router.get('/platform', getPlatformImpactHistory);

module.exports = router;
