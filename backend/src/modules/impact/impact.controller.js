const prisma = require('../../db');

const getPublicImpactSummary = async (req, res, next) => {
  try {
    const [completedRequests, resolvedReports, users, impactRecords] = await Promise.all([
      prisma.resourceRequest.count({ where: { status: 'COMPLETED' } }),
      prisma.environmentalReport.count({ where: { status: 'RESOLVED' } }),
      prisma.user.count({ where: { accountStatus: 'ACTIVE' } }),
      prisma.impactRecord.aggregate({
        where: { verificationStatus: 'VERIFIED' },
        _sum: { quantity: true }
      })
    ]);

    res.json({
      data: {
        exchangesCompleted: completedRequests,
        reportsResolved: resolvedReports,
        participatingUsers: users,
        totalImpactUnits: impactRecords._sum.quantity || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

const getImpactSummary = async (req, res, next) => {
  try {
    const impactRecords = await prisma.impactRecord.findMany({
      where: { userId: req.user.id, verificationStatus: 'VERIFIED' }
    });

    const summary = impactRecords.reduce((acc, record) => {
      if (!acc[record.impactType]) {
        acc[record.impactType] = { totalQuantity: 0, unit: record.unit, isEstimated: record.isEstimated };
      }
      acc[record.impactType].totalQuantity += record.quantity;
      return acc;
    }, {});

    // Also return platform-wide aggregates
    const [completedExchanges, resolvedReports] = await Promise.all([
      prisma.resourceRequest.count({ where: { requesterId: req.user.id, status: 'COMPLETED' } }),
      prisma.environmentalReport.count({ where: { reporterId: req.user.id, status: 'RESOLVED' } })
    ]);

    res.json({
      data: {
        byType: summary,
        completedExchanges,
        resolvedReports
      }
    });
  } catch (error) {
    next(error);
  }
};

const getImpactHistory = async (req, res, next) => {
  try {
    const { from, to, type } = req.query;
    const impactRecords = await prisma.impactRecord.findMany({
      where: {
        userId: req.user.id,
        ...(type && { impactType: type }),
        ...(from && { createdAt: { gte: new Date(from) } }),
        ...(to && { createdAt: { lte: new Date(to) } })
      },
      orderBy: { createdAt: 'desc' },
      include: {
        resource: { select: { id: true, title: true, category: true } },
        report: { select: { id: true, title: true, category: true } }
      }
    });
    res.json({ data: impactRecords });
  } catch (error) {
    next(error);
  }
};

const getPlatformImpactHistory = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [
      completedRequests,
      resolvedReports,
      resourcesByCategory
    ] = await Promise.all([
      prisma.resourceRequest.findMany({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: from ? new Date(from) : sixMonthsAgo, ...(to && { lte: new Date(to) }) }
        },
        include: { resource: { select: { category: true, quantity: true, unit: true } } },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.environmentalReport.findMany({
        where: {
          status: 'RESOLVED',
          createdAt: { gte: from ? new Date(from) : sixMonthsAgo, ...(to && { lte: new Date(to) }) }
        },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.resource.groupBy({
        by: ['category'],
        where: { status: 'COMPLETED' },
        _count: { id: true }
      })
    ]);

    res.json({
      data: {
        completedRequests,
        resolvedReports,
        resourcesByCategory
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicImpactSummary,
  getImpactSummary,
  getImpactHistory,
  getPlatformImpactHistory
};
