const express = require('express');
const { createRequest, getMyRequests, getResourceRequests, updateRequestStatus } = require('./requests.controller');
const { requireAuth } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);
// These assume router is mounted at /api/v1
router.post('/resources/:id/requests', createRequest);
router.get('/requests/my', getMyRequests);
router.get('/resources/:id/requests', getResourceRequests);
router.patch('/requests/:id/status', updateRequestStatus);

module.exports = router;
