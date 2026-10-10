const app = require('./app');
const prisma = require('./db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Attempt DB connection, but don't crash if it fails during dev boot
    // Prisma connects lazily by default, but explicit connect verifies it.
    await prisma.$connect().catch(err => {
      console.warn('Database connection failed on startup, but server will continue:', err.message);
    });
    
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    const shutdown = async () => {
      console.log('Shutting down gracefully...');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Closed database connection.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
