import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { logger } from "../utils/logger";
import { env } from "../config/env";

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let details = null;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON Payload";
  } else {
    logger.error(err);
  }

  const errorResponse: any = {
    success: false,
    error: {
      message,
      ...(details && { details }),
    },
  };

  if (env.NODE_ENV === "development" && statusCode === 500) {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};
