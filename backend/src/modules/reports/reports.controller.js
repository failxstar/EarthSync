const prisma = require('../../db');
const { z } = require('zod');
const { classifyReport, analyzeReportPhoto } = require('../../integrations/ai/ai.service');

const createReportSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.enum(['WASTE', 'WATER_LEAKAGE', 'POLLUTION', 'ILLEGAL_DUMPING', 'ENERGY', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  location: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  imageUrls: z.array(z.string().url()).optional()
});

const updateReportStatusSchema = z.object({
  status: z.enum(['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED']),
  notes: z.string().optional()
});

const updateReportSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  category: z.enum(['WASTE', 'WATER_LEAKAGE', 'POLLUTION', 'ILLEGAL_DUMPING', 'ENERGY', 'OTHER']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  location: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  imageUrls: z.array(z.string().url()).optional()
});

// Valid status transitions
const VALID_TRANSITIONS = {
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['ASSIGNED', 'REJECTED'],
  ASSIGNED: ['IN_PROGRESS', 'REJECTED'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: [],
  REJECTED: []
};

const getReports = async (req, res, next) => {
  try {
    const { category, status, priority, search, city, page = 1, limit = 10 } = req.query;

    const where = {
      ...(category && { category }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(city && { location: { contains: city, mode: 'insensitive' } })
    };

    const [reports, total] = await Promise.all([
      prisma.environmentalReport.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, name: true } },
          assignments: {
            where: { status: { notIn: ['CANCELLED'] } },
            include: { provider: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      }),
      prisma.environmentalReport.count({ where })
    ]);

    res.json({ data: reports, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } });
  } catch (error) {
    next(error);
  }
};

const getReportById = async (req, res, next) => {
  try {
    const report = await prisma.environmentalReport.findUnique({
      where: { id: req.params.id },
      include: {
        reporter: { select: { id: true, name: true } },
        assignments: {
          include: {
            provider: { select: { id: true, name: true, email: true } },
            assignedBy: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({ data: report });
  } catch (error) {
    next(error);
  }
};

const createReport = async (req, res, next) => {
  try {
    const data = createReportSchema.parse(req.body);
    const report = await prisma.environmentalReport.create({
      data: { ...data, reporterId: req.user.id, status: 'SUBMITTED' }
    });

    // Notify admins
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', accountStatus: 'ACTIVE' }, select: { id: true } });
    await Promise.all(admins.map(admin =>
      prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'New Environmental Report',
          message: `New report submitted: "${data.title}" in ${data.location}`,
          type: 'REPORT_UPDATE',
          referenceId: report.id,
          referenceType: 'report'
        }
      })
    ));

    res.status(201).json({ data: report });
  } catch (error) {
    next(error);
  }
};

const updateReportStatus = async (req, res, next) => {
  try {
    const { status, notes } = updateReportStatusSchema.parse(req.body);
    const reportId = req.params.id;

    const report = await prisma.environmentalReport.findUnique({
      where: { id: reportId },
      include: { assignments: { where: { status: { notIn: ['CANCELLED'] } } } }
    });

    if (!report) return res.status(404).json({ error: 'Report not found' });

    // Authorization checks
    if (req.user.role !== 'ADMIN') {
      if (req.user.role === 'PROVIDER') {
        const isAssigned = report.assignments.some(a => a.providerId === req.user.id);
        if (!isAssigned) {
          return res.status(403).json({ error: 'Forbidden: You are not assigned to this report' });
        }
      } else {
        return res.status(403).json({ error: 'Forbidden: Only Admins or Assigned Providers can change status' });
      }
    }

    // Validate transition
    const allowed = VALID_TRANSITIONS[report.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Cannot transition from ${report.status} to ${status}` });
    }

    const updated = await prisma.environmentalReport.update({
      where: { id: reportId },
      data: { status }
    });

    // Notify reporter
    const statusMessages = {
      UNDER_REVIEW: 'Your report is now under review.',
      ASSIGNED: 'A service provider has been assigned to your report.',
      IN_PROGRESS: 'Work has begun on your reported issue.',
      RESOLVED: 'Your reported issue has been resolved.',
      REJECTED: `Your report was rejected.${notes ? ' Notes: ' + notes : ''}`
    };

    if (statusMessages[status]) {
      await prisma.notification.create({
        data: {
          userId: report.reporterId,
          title: `Report ${status.replace('_', ' ')}`,
          message: statusMessages[status],
          type: 'REPORT_UPDATE',
          referenceId: reportId,
          referenceType: 'report'
        }
      });
    }

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};

const updateReport = async (req, res, next) => {
  try {
    const data = updateReportSchema.parse(req.body);
    const reportId = req.params.id;

    const existing = await prisma.environmentalReport.findUnique({ where: { id: reportId } });
    if (!existing) return res.status(404).json({ error: 'Report not found' });

    if (existing.reporterId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Reporters can only edit SUBMITTED reports
    if (req.user.role !== 'ADMIN' && !['SUBMITTED'].includes(existing.status)) {
      return res.status(400).json({ error: 'Report can no longer be edited in its current state' });
    }

    const report = await prisma.environmentalReport.update({
      where: { id: reportId },
      data
    });
    res.json({ data: report });
  } catch (error) {
    next(error);
  }
};

// Pre-save AI classification (supports text, image, or multimodal)
const classifyReportPreSave = async (req, res, next) => {
  try {
    const { title, description, imageUrl } = req.body;
    
    // If an image URL is supplied, invoke multimodal computer vision
    if (imageUrl) {
      const result = await analyzeReportPhoto(imageUrl, { title, description });
      return res.json({ data: result });
    }

    if (!description || description.trim().length < 5) {
      return res.status(400).json({ error: 'Please provide either a photo URL or at least a brief description for AI classification.' });
    }

    const classification = await classifyReport(description);
    res.json({ data: classification });
  } catch (error) {
    next(error);
  }
};

// Dedicated photo analysis endpoint
const analyzePhotoReport = async (req, res, next) => {
  try {
    const { imageUrl, title, description } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required for visual AI analysis' });
    }

    const result = await analyzeReportPhoto(imageUrl, { title, description });
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

// Post-save AI classification for existing reports
const classifyReportById = async (req, res, next) => {
  try {
    const reportId = req.params.id;
    const report = await prisma.environmentalReport.findUnique({ where: { id: reportId } });

    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (report.reporterId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const classification = await classifyReport(report.description, report.imageUrls?.[0]);

    const updated = await prisma.environmentalReport.update({
      where: { id: reportId },
      data: { aiClassificationResult: JSON.stringify(classification) }
    });

    res.json({ data: updated, classification });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReports,
  getReportById,
  createReport,
  updateReportStatus,
  updateReport,
  classifyReportPreSave,
  analyzePhotoReport,
  classifyReportById
};
