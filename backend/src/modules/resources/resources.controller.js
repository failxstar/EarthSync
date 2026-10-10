const prisma = require('../../db');
const { z } = require('zod');
const { analyzeResourcePhoto } = require('../../integrations/ai/ai.service');

const createResourceSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  category: z.enum(['FOOD', 'CLOTHING', 'ELECTRONICS', 'FURNITURE', 'RECYCLABLES', 'WATER', 'OTHER']),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  condition: z.string().optional(),
  location: z.string().min(3),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  imageUrls: z.array(z.string().url()).optional().default([]),
  expiryDate: z.string().datetime().optional().nullable()
});

const updateResourceSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(2000).optional(),
  category: z.enum(['FOOD', 'CLOTHING', 'ELECTRONICS', 'FURNITURE', 'RECYCLABLES', 'WATER', 'OTHER']).optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().min(1).optional(),
  condition: z.string().optional(),
  location: z.string().min(3).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  imageUrls: z.array(z.string().url()).optional(),
  expiryDate: z.string().datetime().optional().nullable(),
  status: z.enum(['AVAILABLE', 'RESERVED', 'COMPLETED', 'EXPIRED']).optional()
});

const getResources = async (req, res, next) => {
  try {
    const { category, status = 'AVAILABLE', search, condition, page = 1, limit = 12, sort = 'newest' } = req.query;

    const where = {
      ...(category && { category }),
      ...(status && { status }),
      ...(condition && { condition: { contains: condition, mode: 'insensitive' } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    let orderBy = { createdAt: 'desc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };
    else if (sort === 'expiring') orderBy = { expiryDate: 'asc' };

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy,
        include: { owner: { select: { id: true, name: true } } }
      }),
      prisma.resource.count({ where })
    ]);

    res.json({
      data: resources,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    next(error);
  }
};

const getResourceById = async (req, res, next) => {
  try {
    const resource = await prisma.resource.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, name: true } }
      }
    });

    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    res.json({ data: resource });
  } catch (error) {
    next(error);
  }
};

const createResource = async (req, res, next) => {
  try {
    const data = createResourceSchema.parse(req.body);

    // Validate expiry for food
    if (data.category === 'FOOD' && !data.expiryDate) {
      return res.status(400).json({ error: 'Food resources must have an expiry date' });
    }
    if (data.expiryDate && new Date(data.expiryDate) <= new Date()) {
      return res.status(400).json({ error: 'Expiry date must be in the future' });
    }

    const resource = await prisma.resource.create({
      data: { ...data, ownerId: req.user.id },
      include: { owner: { select: { id: true, name: true } } }
    });

    res.status(201).json({ data: resource });
  } catch (error) {
    next(error);
  }
};

const updateResource = async (req, res, next) => {
  try {
    const data = updateResourceSchema.parse(req.body);
    const existing = await prisma.resource.findUnique({ where: { id: req.params.id } });

    if (!existing) return res.status(404).json({ error: 'Resource not found' });
    if (existing.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Validate expiry date
    if (data.expiryDate && new Date(data.expiryDate) <= new Date()) {
      return res.status(400).json({ error: 'Expiry date must be in the future' });
    }

    const resource = await prisma.resource.update({
      where: { id: req.params.id },
      data,
      include: { owner: { select: { id: true, name: true } } }
    });
    res.json({ data: resource });
  } catch (error) {
    next(error);
  }
};

const deactivateResource = async (req, res, next) => {
  try {
    const existing = await prisma.resource.findUnique({
      where: { id: req.params.id },
      include: { requests: { where: { status: { in: ['PENDING', 'APPROVED'] } } } }
    });

    if (!existing) return res.status(404).json({ error: 'Resource not found' });
    if (existing.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (existing.requests.length > 0) {
      return res.status(400).json({ error: 'Cannot deactivate a resource with active requests. Please resolve pending requests first.' });
    }

    const resource = await prisma.resource.update({
      where: { id: req.params.id },
      data: { status: 'EXPIRED' }
    });

    res.json({ data: resource });
  } catch (error) {
    next(error);
  }
};

// Public impact summary
const getPublicImpact = async (req, res, next) => {
  try {
    const [completedRequests, resolvedReports, users] = await Promise.all([
      prisma.resourceRequest.count({ where: { status: 'COMPLETED' } }),
      prisma.environmentalReport.count({ where: { status: 'RESOLVED' } }),
      prisma.user.count({ where: { accountStatus: 'ACTIVE' } })
    ]);

    res.json({
      data: {
        exchangesCompleted: completedRequests,
        reportsResolved: resolvedReports,
        participatingUsers: users
      }
    });
  } catch (error) {
    next(error);
  }
};

// AI Resource Photo Visual Analysis
const analyzeResourcePhotoController = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required for resource photo analysis' });
    }

    const analysis = await analyzeResourcePhoto(imageUrl);
    res.json({ data: analysis });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deactivateResource,
  getPublicImpact,
  analyzeResourcePhoto: analyzeResourcePhotoController
};
