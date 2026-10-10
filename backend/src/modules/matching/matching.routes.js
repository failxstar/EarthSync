const express = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const { getMyRecommendations, updateRecommendationStatus, getNearby, getResourceRecipients } = require('./matching.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/my', getMyRecommendations);
router.get('/nearby', getNearby);
router.get('/resources/:id', getResourceRecipients);
router.patch('/:id/status', updateRecommendationStatus);

module.exports = router;
