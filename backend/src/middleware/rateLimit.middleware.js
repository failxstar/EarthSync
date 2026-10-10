const rateLimitCache = new Map();

const aiRateLimiter = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 5;

  if (!rateLimitCache.has(ip)) {
    rateLimitCache.set(ip, { count: 1, firstRequest: now });
    return next();
  }

  const record = rateLimitCache.get(ip);
  if (now - record.firstRequest > windowMs) {
    // Reset window
    rateLimitCache.set(ip, { count: 1, firstRequest: now });
    return next();
  }

  if (record.count >= maxRequests) {
    return res.status(429).json({ error: 'Too many requests to AI endpoints, please try again later.' });
  }

  record.count += 1;
  next();
};

module.exports = { aiRateLimiter };
