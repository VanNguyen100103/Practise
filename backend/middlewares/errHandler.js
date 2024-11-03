const notFound = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found.`);
  res.status(400);
  next(error);
}

const errHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  console.error("Error:", err); // Log the full error
  return res.status(statusCode).json({
    success: false,
    mes: err.message || "An unexpected error occurred.",
  });
};


module.exports = { notFound, errHandler };
