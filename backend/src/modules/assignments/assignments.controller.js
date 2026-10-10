const prisma = require('../../db');
const { z } = require('zod');

const getMyAssignments = async (req, res, next) => {
  try {
    const { status } = req.query;
    const assignments = await prisma.reportAssignment.findMany({
      where: {
        providerId: req.user.id,
        ...(status && { status })
      },
      include: {
        report: {
          include: { reporter: { select: { id: true, name: true } } }
        },
        assignedBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ data: assignments });
  } catch (error) {
    next(error);
  }
};

const getAssignmentById = async (req, res, next) => {
  try {
    const assignment = await prisma.reportAssignment.findUnique({
      where: { id: req.params.id },
      include: {
        report: {
          include: { reporter: { select: { id: true, name: true } } }
        },
        provider: { select: { id: true, name: true, email: true } },
        assignedBy: { select: { id: true, name: true } }
      }
    });

    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    if (assignment.providerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({ data: assignment });
  } catch (error) {
    next(error);
  }
};

const updateAssignmentStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  notes: z.string().optional()
});

// Valid assignment transitions
const ASSIGNMENT_TRANSITIONS = {
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

const updateAssignmentStatus = async (req, res, next) => {
  try {
    const { status, notes } = updateAssignmentStatusSchema.parse(req.body);
    const assignmentId = req.params.id;

    const assignment = await prisma.reportAssignment.findUnique({
      where: { id: assignmentId },
      include: { report: { include: { reporter: { select: { id: true } } } } }
    });

    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    if (assignment.providerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Validate transition
    const allowed = ASSIGNMENT_TRANSITIONS[assignment.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Cannot transition assignment from ${assignment.status} to ${status}` });
    }

    if (status === 'COMPLETED' && !notes) {
      return res.status(400).json({ error: 'Resolution notes are required when completing an assignment' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedAssignment = await tx.reportAssignment.update({
        where: { id: assignmentId },
        data: { status, ...(notes && { notes }) }
      });

      // Update report status accordingly
      const reportStatusMap = {
        ACCEPTED: 'ASSIGNED',
        IN_PROGRESS: 'IN_PROGRESS',
        COMPLETED: 'RESOLVED'
      };

      if (reportStatusMap[status]) {
        await tx.environmentalReport.update({
          where: { id: assignment.reportId },
          data: { status: reportStatusMap[status] }
        });
      }

      // Notify reporter on key events
      const reporterMessages = {
        IN_PROGRESS: 'A provider has begun working on your reported issue.',
        COMPLETED: `Your reported issue has been resolved. Notes: ${notes || 'No additional notes.'}`
      };

      if (reporterMessages[status] && assignment.report.reporter?.id) {
        await tx.notification.create({
          data: {
            userId: assignment.report.reporter.id,
            title: `Issue ${status === 'COMPLETED' ? 'Resolved' : 'In Progress'}`,
            message: reporterMessages[status],
            type: 'REPORT_UPDATE',
            referenceId: assignment.reportId,
            referenceType: 'report'
          }
        });
      }

      return updatedAssignment;
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyAssignments, getAssignmentById, updateAssignmentStatus };
