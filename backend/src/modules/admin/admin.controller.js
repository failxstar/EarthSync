const prisma = require('../../db');
const { z } = require('zod');

const getUsers = async (req, res, next) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;
    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(role && { role }),
      ...(status && { accountStatus: status })
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, role: true, accountStatus: true, createdAt: true, phone: true },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.user.count({ where })
    ]);

    res.json({ data: users, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } });
  } catch (error) {
    next(error);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Don't allow suspending yourself
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot modify your own account status' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { accountStatus: status },
      select: { id: true, name: true, accountStatus: true }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: status === 'SUSPENDED' ? 'SUSPEND_USER' : 'REACTIVATE_USER',
        entityType: 'User',
        entityId: req.params.id,
        metadata: JSON.stringify({ status, reason })
      }
    });

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const allowedRoles = ['CITIZEN', 'DONOR', 'RECIPIENT', 'PROVIDER', 'ADMIN'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Prevent removing the last admin
    if (role !== 'ADMIN') {
      const targetUser = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (targetUser?.role === 'ADMIN') {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN', accountStatus: 'ACTIVE' } });
        if (adminCount <= 1) {
          return res.status(400).json({ error: 'Cannot remove the last administrator' });
        }
      }
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, role: true }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'CHANGE_USER_ROLE',
        entityType: 'User',
        entityId: req.params.id,
        metadata: JSON.stringify({ role })
      }
    });

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
};

const assignProvider = async (req, res, next) => {
  try {
    const { reportId, providerId, notes } = req.body;

    // Verify provider exists and has PROVIDER role
    const provider = await prisma.user.findUnique({ where: { id: providerId } });
    if (!provider || provider.role !== 'PROVIDER') {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const report = await prisma.environmentalReport.findUnique({ where: { id: reportId } });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const assignment = await prisma.$transaction(async (tx) => {
      const a = await tx.reportAssignment.create({
        data: { reportId, providerId, assignedById: req.user.id, notes, status: 'PENDING' }
      });

      await tx.environmentalReport.update({
        where: { id: reportId },
        data: { status: 'ASSIGNED' }
      });

      // Notify provider
      await tx.notification.create({
        data: {
          userId: providerId,
          title: 'New Assignment',
          message: `You have been assigned to report: "${report.title}"`,
          type: 'REPORT_UPDATE',
          referenceId: reportId,
          referenceType: 'report'
        }
      });

      return a;
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'ASSIGN_PROVIDER',
        entityType: 'ReportAssignment',
        entityId: assignment.id,
        metadata: JSON.stringify({ reportId, providerId, notes })
      }
    });

    res.json({ data: assignment });
  } catch (error) {
    next(error);
  }
};

const getAdminReports = async (req, res, next) => {
  try {
    const { category, status, priority, search, page = 1, limit = 20 } = req.query;
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
      })
    };

    const [reports, total] = await Promise.all([
      prisma.environmentalReport.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, name: true, email: true } },
          assignments: {
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

const getAdminResources = async (req, res, next) => {
  try {
    const { category, status, search, page = 1, limit = 20 } = req.query;
    const where = {
      ...(category && { category }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { owner: { select: { id: true, name: true, email: true } } }
      }),
      prisma.resource.count({ where })
    ]);

    res.json({ data: resources, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } });
  } catch (error) {
    next(error);
  }
};

const moderateResource = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const resource = await prisma.resource.update({
      where: { id: req.params.id },
      data: { status }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'MODERATE_RESOURCE',
        entityType: 'Resource',
        entityId: req.params.id,
        metadata: JSON.stringify({ status, reason })
      }
    });

    res.json({ data: resource });
  } catch (error) {
    next(error);
  }
};

const getAdminAssignments = async (req, res, next) => {
  try {
    const { status, providerId, page = 1, limit = 20 } = req.query;
    const where = {
      ...(status && { status }),
      ...(providerId && { providerId })
    };

    const [assignments, total] = await Promise.all([
      prisma.reportAssignment.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          report: { select: { id: true, title: true, category: true, priority: true, status: true, location: true } },
          provider: { select: { id: true, name: true, email: true } },
          assignedBy: { select: { id: true, name: true } }
        }
      }),
      prisma.reportAssignment.count({ where })
    ]);

    res.json({ data: assignments, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const [
      usersCount,
      activeResourcesCount,
      availableResourcesCount,
      pendingRequestsCount,
      openReportsCount,
      unassignedReportsCount,
      resolvedReportsCount,
      completedExchanges
    ] = await Promise.all([
      prisma.user.count({ where: { accountStatus: 'ACTIVE' } }),
      prisma.resource.count({ where: { status: { in: ['AVAILABLE', 'RESERVED'] } } }),
      prisma.resource.count({ where: { status: 'AVAILABLE' } }),
      prisma.resourceRequest.count({ where: { status: 'PENDING' } }),
      prisma.environmentalReport.count({ where: { status: { notIn: ['RESOLVED', 'REJECTED'] } } }),
      prisma.environmentalReport.count({ where: { status: 'SUBMITTED' } }),
      prisma.environmentalReport.count({ where: { status: 'RESOLVED' } }),
      prisma.resourceRequest.count({ where: { status: 'COMPLETED' } })
    ]);

    res.json({
      data: {
        users: usersCount,
        activeResources: activeResourcesCount,
        availableResources: availableResourcesCount,
        pendingRequests: pendingRequestsCount,
        openReports: openReportsCount,
        unassignedReports: unassignedReportsCount,
        resolvedReports: resolvedReportsCount,
        completedExchanges
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, entityType, action } = req.query;
    const where = {
      ...(entityType && { entityType }),
      ...(action && { action })
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, name: true, email: true } } }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({ data: logs, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } });
  } catch (error) {
    next(error);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    // Resources created per month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [
      resourcesByCategory,
      reportsByCategory,
      reportsByStatus,
      recentResources,
      recentReports,
      providers
    ] = await Promise.all([
      prisma.resource.groupBy({ by: ['category'], _count: { id: true } }),
      prisma.environmentalReport.groupBy({ by: ['category'], _count: { id: true } }),
      prisma.environmentalReport.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.resource.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.environmentalReport.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.user.findMany({
        where: { role: 'PROVIDER', accountStatus: 'ACTIVE' },
        select: { id: true, name: true, email: true }
      })
    ]);

    res.json({
      data: {
        resourcesByCategory,
        reportsByCategory,
        reportsByStatus,
        recentResources,
        recentReports,
        providers
      }
    });
  } catch (error) {
    next(error);
  }
};

const getProviders = async (req, res, next) => {
  try {
    const providers = await prisma.user.findMany({
      where: { role: 'PROVIDER', accountStatus: 'ACTIVE' },
      select: { id: true, name: true, email: true, phone: true }
    });
    res.json({ data: providers });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  updateUserStatus,
  updateUserRole,
  assignProvider,
  getAdminReports,
  getAdminResources,
  moderateResource,
  getAdminAssignments,
  getStats,
  getAuditLogs,
  getAnalytics,
  getProviders
};
