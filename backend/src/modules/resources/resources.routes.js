const express = require('express');
const {
  getResources, getResourceById, createResource, updateResource,
  deactivateResource, getPublicImpact, analyzeResourcePhoto
} = require('./resources.controller');
const { requireAuth } = require('../../middleware/auth.middleware');
const { aiRateLimiter } = require('../../middleware/rateLimit.middleware');

const router = express.Router();

router.get('/', getResources);
router.get('/public/impact', getPublicImpact);
router.get('/:id', getResourceById);

// Protected routes
router.use(requireAuth);
router.post('/analyze-photo', aiRateLimiter, analyzeResourcePhoto);
router.post('/', createResource);
router.patch('/:id', updateResource);
router.patch('/:id/deactivate', deactivateResource);

module.exports = router;
