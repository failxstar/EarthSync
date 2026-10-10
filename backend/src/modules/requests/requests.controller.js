const prisma = require('../../db');
const { z } = require('zod');

const createRequestSchema = z.object({
  quantityRequested: z.number().positive(),
  message: z.string().optional()
});

const createRequest = async (req, res, next) => {
  try {
    const resourceId = req.params.id;
    const { quantityRequested, message } = createRequestSchema.parse(req.body);

    const resource = await prisma.resource.findUnique({ where: { id: resourceId }, include: { owner: { select: { name: true } } } });
    if (!resource || resource.status !== 'AVAILABLE') {
      return res.status(400).json({ error: 'Resource is not available' });
    }
    if (quantityRequested > resource.quantity) {
      return res.status(400).json({ error: 'Requested quantity exceeds available quantity' });
    }
    if (resource.ownerId === req.user.id) {
      return res.status(400).json({ error: 'Cannot request your own resource' });
    }

    // Check for existing pending/approved request
    const existing = await prisma.resourceRequest.findFirst({
      where: { resourceId, requesterId: req.user.id, status: { in: ['PENDING', 'APPROVED'] } }
    });
    if (existing) {
      return res.status(400).json({ error: 'You already have an active request for this resource' });
    }

    const request = await prisma.$transaction(async (tx) => {
      const req_record = await tx.resourceRequest.create({
        data: { resourceId, requesterId: req.user.id, quantityRequested, message }
      });

      // Notify resource owner
      await tx.notification.create({
        data: {
          userId: resource.ownerId,
          title: 'New Resource Request',
          message: `Someone requested ${quantityRequested} ${resource.unit} of "${resource.title}"`,
          type: 'RESOURCE_UPDATE',
          referenceId: req_record.id,
          referenceType: 'request'
        }
      });

      return req_record;
    });

    res.status(201).json({ data: request });
  } catch (error) {
    next(error);
  }
};

const getMyRequests = async (req, res, next) => {
  try {
    const { status } = req.query;
    const requests = await prisma.resourceRequest.findMany({
      where: {
        requesterId: req.user.id,
        ...(status && { status })
      },
      include: {
        resource: {
          include: { owner: { select: { id: true, name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ data: requests });
  } catch (error) {
    next(error);
  }
};

const getResourceRequests = async (req, res, next) => {
  try {
    const resource = await prisma.resource.findUnique({ where: { id: req.params.id } });
    if (!resource) return res.status(404).json({ error: 'Resource not found' });

    if (resource.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const requests = await prisma.resourceRequest.findMany({
      where: { resourceId: req.params.id },
      include: { requester: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ data: requests });
  } catch (error) {
    next(error);
  }
};

const updateRequestStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED']),
  reason: z.string().optional()
});

const updateRequestStatus = async (req, res, next) => {
  try {
    const { status, reason } = updateRequestStatusSchema.parse(req.body);
    const requestId = req.params.id;

    // Use transaction to prevent over-allocation
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.resourceRequest.findUnique({
        where: { id: requestId },
        include: { resource: true, requester: { select: { id: true, name: true } } }
      });

      if (!request) throw { status: 404, message: 'Request not found' };

      // Authorization
      if (['APPROVED', 'REJECTED'].includes(status)) {
        if (request.resource.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
          throw { status: 403, message: 'Forbidden' };
        }
      } else if (status === 'CANCELLED') {
        if (request.requesterId !== req.user.id && req.user.role !== 'ADMIN') {
          throw { status: 403, message: 'Forbidden' };
        }
        if (!['PENDING'].includes(request.status)) {
          throw { status: 400, message: 'Can only cancel pending requests' };
        }
      } else if (status === 'COMPLETED') {
        if (request.resource.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
          throw { status: 403, message: 'Forbidden' };
        }
        if (request.status !== 'APPROVED') {
          throw { status: 400, message: 'Can only complete approved requests' };
        }
      }

      if (status === 'APPROVED' && request.status !== 'APPROVED') {
        if (request.status !== 'PENDING') {
          throw { status: 400, message: 'Can only approve pending requests' };
        }
        if (request.quantityRequested > request.resource.quantity) {
          throw { status: 400, message: 'Not enough inventory to approve this request' };
        }

        // Deduct quantity
        await tx.resource.update({
          where: { id: request.resourceId },
          data: {
            quantity: { decrement: request.quantityRequested },
            status: (request.resource.quantity - request.quantityRequested) <= 0 ? 'COMPLETED' : 'AVAILABLE'
          }
        });
      }

      const updatedRequest = await tx.resourceRequest.update({
        where: { id: requestId },
        data: { status }
      });

      // Send notification to requester
      const notifMessages = {
        APPROVED: `Your request for "${request.resource.title}" has been approved!`,
        REJECTED: `Your request for "${request.resource.title}" was declined.${reason ? ` Reason: ${reason}` : ''}`,
        COMPLETED: `Your exchange for "${request.resource.title}" has been completed!`,
        CANCELLED: `Your request for "${request.resource.title}" was cancelled.`
      };

      if (notifMessages[status]) {
        await tx.notification.create({
          data: {
            userId: request.requesterId,
            title: `Request ${status.charAt(0) + status.slice(1).toLowerCase()}`,
            message: notifMessages[status],
            type: 'RESOURCE_UPDATE',
            referenceId: request.resourceId,
            referenceType: 'resource'
          }
        });
      }

      return updatedRequest;
    });

    res.json({ data: result });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
};

module.exports = { createRequest, getMyRequests, getResourceRequests, updateRequestStatus };
