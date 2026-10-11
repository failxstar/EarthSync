const app = require('./app');
const prisma = require('./db');
const { validateEnv } = require('./config/env');

const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

let serverInstance = null;

const startServer = async () => {
  if (serverInstance) {
    return serverInstance;
  }

  // Validate environment variables early
  validateEnv();

  try {
    // Explicitly test database connection
    await prisma.$connect()
      .then(() => {
        console.log('Database connected successfully via Prisma Client.');
      })
      .catch((err) => {
        console.warn('Initial database connection warning:', err.message);
      });

    serverInstance = app.listen(PORT, HOST, () => {
      console.log(`EarthSync API server running on http://${HOST}:${PORT} [NODE_ENV=${process.env.NODE_ENV || 'development'}]`);
    });

    const shutdown = async (signal) => {
      console.log(`Received ${signal}. Shutting down gracefully...`);
      if (serverInstance) {
        serverInstance.close(async () => {
          console.log('HTTP server closed.');
          try {
            await prisma.$disconnect();
            console.log('Database connection disconnected.');
          } catch (dbErr) {
            console.error('Error during database disconnect:', dbErr.message);
          }
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    return serverInstance;
  } catch (error) {
    console.error('Fatal error starting EarthSync server:', error.message);
    process.exit(1);
  }
};

// Start automatically if run directly
if (require.main === module) {
  startServer();
}

module.exports = {
  startServer,
  app,
};
