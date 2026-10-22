import ErrorResponse from "../utils/errorResponse.js";

const errorHandler = (err, req, res, next) => {
  let error = { ...err };

  error.message = err.message;

  if (err.code === 11000) {
    const message = `Duplicate Field value entered`;
    error = new ErrorResponse(message, 400);
  }

  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message);
    error = new ErrorResponse(message, 400);
  }

  if (err.name === "CastError" || err.code === "LIMIT_FILE_SIZE") error = new ErrorResponse("Invalid input or upload exceeds 100 MB", 400);

  res.status(Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode <= 599 ? error.statusCode : 500).json({
    success: false,
    error: Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 500 ? error.message : "Server Error",
  });
};

export default errorHandler;