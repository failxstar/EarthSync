require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const prisma = require('./db');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

const authRoutes = require('./modules/auth/auth.routes');
const resourceRoutes = require('./modules/resources/resources.routes');
const reportRoutes = require('./modules/reports/reports.routes');
const requestRoutes = require('./modules/requests/requests.routes');
const userRoutes = require('./modules/users/users.routes');
const notificationRoutes = require('./modules/notifications/notifications.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const assignmentRoutes = require('./modules/assignments/assignments.routes');
const impactRoutes = require('./modules/impact/impact.routes');
const matchingRoutes = require('./modules/matching/matching.routes');
const uploadRoutes = require('./modules/uploads/uploads.routes');

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// CORS Configuration
const allowedOrigins = [
  'https://main.d2wx8nlqy99bxh.amplifyapp.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(s => s.trim()) : [])
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile, curl, health probes, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    
    // In non-production, allow all localhost origins dynamically
    if (process.env.NODE_ENV !== 'production' && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

app.use(express.json({ limit: '5mb' }));

// Request logging (exclude noisy health probes in production)
app.use((req, res, next) => {
  if (req.path !== '/health' && req.path !== '/api/v1/health') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Root route (Elastic Beanstalk default health-check target)
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'EarthSync API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    health: '/health',
    endpoints: '/api/v1',
  });
});

// Lightweight Health Check (AWS ALB & container monitors)
app.get(['/health', '/api/v1/health'], async (req, res) => {
  let dbStatus = 'disconnected';
  let latencyMs = null;
  let isHealthy = true;

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    latencyMs = Date.now() - start;
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'error';
    isHealthy = false;
  }

  const statusCode = isHealthy ? 200 : 503;
  res.status(statusCode).json({
    status: isHealthy ? 'ok' : 'degraded',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus,
      ...(latencyMs !== null && { latencyMs }),
    },
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/resources', resourceRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/impact', impactRoutes);
app.use('/api/v1/matching', matchingRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1', requestRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
