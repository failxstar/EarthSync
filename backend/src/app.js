require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
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

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
