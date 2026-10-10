const express = require('express');
const { getMyAssignments, getAssignmentById, updateAssignmentStatus } = require('./assignments.controller');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(['PROVIDER', 'ADMIN']));

router.get('/', getMyAssignments);
router.get('/:id', getAssignmentById);
router.patch('/:id/status', updateAssignmentStatus);

module.exports = router;
