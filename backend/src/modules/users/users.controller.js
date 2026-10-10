const prisma = require('../../db');
const bcrypt = require('bcrypt');
const { z } = require('zod');

const getMyResources = async (req, res, next) => {
  try {
    const { status } = req.query;
    const resources = await prisma.resource.findMany({
      where: { ownerId: req.user.id, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
      include: {
        requests: { where: { status: { in: ['PENDING', 'APPROVED'] } }, select: { id: true, status: true } }
      }
    });
    res.json({ data: resources });
  } catch (error) {
    next(error);
  }
};

const getMyReports = async (req, res, next) => {
  try {
    const reports = await prisma.environmentalReport.findMany({
      where: { reporterId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        assignments: {
          include: { provider: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    res.json({ data: reports });
  } catch (error) {
    next(error);
  }
};

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  profileImage: z.string().url().optional().nullable()
});

const updateProfile = async (req, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, name: true, email: true, role: true, phone: true, profileImage: true, accountStatus: true, createdAt: true }
    });
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6)
});

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, phone: true, profileImage: true, accountStatus: true, createdAt: true }
    });
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyResources, getMyReports, updateProfile, changePassword, getProfile };
