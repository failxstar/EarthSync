const bcrypt = require('bcrypt');
const prisma = require('../../db');
const { generateToken } = require('../../utils/jwt');
const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['CITIZEN', 'DONOR', 'RECIPIENT', 'PROVIDER']).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const register = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role || 'CITIZEN'
      },
    });

    const token = generateToken({ userId: user.id });
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(201).json({ token, user: userWithoutPassword });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || user.accountStatus !== 'ACTIVE') {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({ userId: user.id });
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, role: true, phone: true, profileImage: true, accountStatus: true, createdAt: true
      }
    });
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, me };
