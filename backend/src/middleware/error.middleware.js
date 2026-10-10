const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Conflict Error',
      message: 'A record with this value already exists.'
    });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
};

const notFoundHandler = (req, res, next) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.originalUrl} not found` });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
