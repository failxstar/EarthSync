/**
 * Environment configuration and validation module for EarthSync Backend.
 * Validates critical environment variables without exposing sensitive secrets in logs.
 */

const getEnv = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = parseInt(process.env.PORT, 10) || 5000;
  const host = process.env.HOST || '0.0.0.0';
  const databaseUrl = process.env.DATABASE_URL;
  const jwtSecret = process.env.JWT_SECRET;
  const frontendUrl = process.env.FRONTEND_URL || '';
  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  const aiApiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;

  return {
    nodeEnv,
    port,
    host,
    databaseUrl,
    jwtSecret,
    frontendUrl,
    cloudinaryUrl,
    aiApiKey,
    isProduction: nodeEnv === 'production',
  };
};

const validateEnv = () => {
  const env = getEnv();
  const errors = [];
  const warnings = [];

  // Critical: DATABASE_URL
  if (!env.databaseUrl) {
    errors.push('DATABASE_URL is required but not configured.');
  } else if (!env.databaseUrl.startsWith('postgresql://') && !env.databaseUrl.startsWith('postgres://')) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection URI.');
  }

  // Critical: JWT_SECRET
  if (env.isProduction) {
    if (!env.jwtSecret) {
      errors.push('JWT_SECRET is required in production.');
    } else if (env.jwtSecret === 'fallback_secret') {
      errors.push('JWT_SECRET cannot use fallback_secret in production.');
    } else if (env.jwtSecret.length < 8) {
      errors.push('JWT_SECRET must be at least 8 characters in production.');
    } else if (env.jwtSecret === 'supersecretkey123') {
      warnings.push('JWT_SECRET is using "supersecretkey123". For higher security, consider replacing it with a random 32+ character string in your environment settings.');
    }
  } else {
    if (!env.jwtSecret) {
      warnings.push('JWT_SECRET not set; falling back to development secret.');
    }
  }

  // Optional / Functional: Cloudinary
  if (!env.cloudinaryUrl) {
    warnings.push('CLOUDINARY_URL is not set. Media uploads to Cloudinary will fail.');
  }

  // Optional / Functional: Gemini AI
  if (!env.aiApiKey) {
    warnings.push('AI_API_KEY / GEMINI_API_KEY is not set. AI classification will use rule-based fallback.');
  }

  // Print warnings securely (never print values)
  warnings.forEach(warn => console.warn(`[Config Warning] ${warn}`));

  if (errors.length > 0) {
    console.error('==================================================');
    console.error('FATAL: Environment configuration validation failed:');
    errors.forEach(err => console.error(`  - ${err}`));
    console.error('==================================================');
    throw new Error(`Environment validation failed with ${errors.length} error(s).`);
  }

  return env;
};

module.exports = {
  getEnv,
  validateEnv,
};
