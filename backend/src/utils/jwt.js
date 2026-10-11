const jwt = require('jsonwebtoken');

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment.');
    }
    return 'supersecretkey123';
  }
  return secret;
};

const generateToken = (payload) => {
  return jwt.sign(payload, getSecret(), {
    expiresIn: '7d',
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, getSecret());
};

module.exports = {
  generateToken,
  verifyToken,
};
