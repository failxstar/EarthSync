const express = require('express');
const {
  getUsers, updateUserStatus, updateUserRole, assignProvider,
  getAdminReports, getAdminResources, moderateResource,
  getAdminAssignments, getStats, getAuditLogs, getAnalytics, getProviders
} = require('./admin.controller');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(['ADMIN']));

router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);
router.patch('/users/:id/role', updateUserRole);
router.get('/resources', getAdminResources);
router.patch('/resources/:id/status', moderateResource);
router.get('/reports', getAdminReports);
router.post('/reports/assign', assignProvider);
router.get('/assignments', getAdminAssignments);
router.get('/stats', getStats);
router.get('/audit-logs', getAuditLogs);
router.get('/analytics', getAnalytics);
router.get('/providers', getProviders);

module.exports = router;
