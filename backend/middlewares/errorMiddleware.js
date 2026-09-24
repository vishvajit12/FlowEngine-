const ApiError = require('../utils/ApiError');

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
}

// Express recognizes this as error-handling middleware ONLY because it
// takes 4 arguments -- do not remove `next` even though it's unused.
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Something went wrong';

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(statusCode).json({ success: false, message });
}

module.exports = { notFound, errorHandler };
