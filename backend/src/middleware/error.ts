import { Request, Response, NextFunction } from "express";
import AppError from "../utils/appError";
import logger from "../utils/logger";

const handleCastErrorDB = (err: any) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err: any) => {
  if (err.keyValue) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];

    return new AppError(
      `Duplicate value "${value}" for "${field}". Please use another value.`,
      400
    );
  }

  return new AppError(
    "Duplicate field value detected. Please use another value.",
    400
  );
};

const handleValidationErrorDB = (err: any) => {
  const errors = Object.values(err.errors).map((el: any) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError("Invalid token. Please log in again!", 401);

const handleJWTExpiredError = () =>
  new AppError("Your token has expired! Please log in again.", 401);

const handleMulterError = (err: any) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return new AppError(
      "File size is too large. Maximum allowed size is 5MB.",
      400
    );
  }

  return new AppError(
    err.message || "File upload error occurred.",
    400
  );
};

const sendErrorDev = (err: any, res: Response) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err: any, res: Response) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  logger.error(`${err.name}: ${err.message}`);

  return res.status(500).json({
    status: "error",
    message: "Something went very wrong!",
  });
};

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    return sendErrorDev(err, res);
  }

  // Clone the error and preserve important properties
  let error: any = { ...err };
  error.message = err.message;
  error.name = err.name;
  error.code = err.code;
  error.keyValue = err.keyValue;
  error.errors = err.errors;
  error.path = err.path;
  error.value = err.value;

  if (error.name === "CastError")
    error = handleCastErrorDB(error);

  if (error.code === 11000)
    error = handleDuplicateFieldsDB(error);

  if (error.name === "ValidationError")
    error = handleValidationErrorDB(error);

  if (error.name === "JsonWebTokenError")
    error = handleJWTError();

  if (error.name === "TokenExpiredError")
    error = handleJWTExpiredError();

  if (error.name === "MulterError")
    error = handleMulterError(error);

  return sendErrorProd(error, res);
};

export default globalErrorHandler;