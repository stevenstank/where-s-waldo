const notFoundHandler = (req, res) => {
  res.status(404).json({
    message: "Route not found",
    requestId: req.requestId,
  });
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      message: "Invalid JSON payload",
      requestId: req.requestId,
    });
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode >= 500 ? "Internal server error" : (err.message || "Request failed");

  if (statusCode >= 500) {
    console.error("Unhandled error", {
      requestId: req.requestId,
      path: req.path,
      method: req.method,
      message: err.message,
      stack: err.stack,
    });
  }

  return res.status(statusCode).json({
    message,
    requestId: req.requestId,
  });
};

module.exports = { notFoundHandler, errorHandler };
