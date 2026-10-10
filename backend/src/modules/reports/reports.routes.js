const express = require('express');
const {
  getReports, getReportById, createReport, updateReportStatus, updateReport,
  classifyReportPreSave, analyzePhotoReport, classifyReportById
} = require('./reports.controller');
const { requireAuth } = require('../../middleware/auth.middleware');
const { aiRateLimiter } = require('../../middleware/rateLimit.middleware');

const router = express.Router();

router.get('/', getReports);
router.get('/:id', getReportById);

router.use(requireAuth);
router.post('/classify', aiRateLimiter, classifyReportPreSave);
router.post('/classify-pre-save', aiRateLimiter, classifyReportPreSave);
router.post('/analyze-photo', aiRateLimiter, analyzePhotoReport);
router.post('/', createReport);
router.patch('/:id', updateReport);
router.patch('/:id/status', updateReportStatus);
router.post('/:id/classify', aiRateLimiter, classifyReportById);

module.exports = router;
