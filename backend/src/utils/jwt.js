const jwt = require('jsonwebtoken');

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '7d',
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
};

module.exports = {
  generateToken,
  verifyToken,
};
