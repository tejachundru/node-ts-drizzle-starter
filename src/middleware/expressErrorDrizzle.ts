import { logger } from "@/config/pino";
import { type NextFunction, type Request, type Response } from "express";
import { PostgresError } from "pg-error-enum";

// Define custom error types for better handling
interface ValidationError {
  field: string;
  message: string;
}

interface DrizzleErrorResponse {
  code: number;
  message: string;
  errors?: ValidationError[] | Record<string, unknown>;
}

// Utility function to format error messages
function formatErrorMessage(message: string): string {
  logger.error(`Drizzle ORM Error: ${message}`);
  return `Error: ${message}`;
}

// Error type guards
function isPostgresError(
  error: any
): error is { code: string; message: string } {
  return (
    error && typeof error.code === "string" && typeof error.message === "string"
  );
}

function isValidationError(
  error: any
): error is { details: ValidationError[] } {
  return error && Array.isArray(error.details);
}

async function expressErrorDrizzle(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<DrizzleErrorResponse> | undefined> {
  // Handle known error types
  if (err instanceof Error) {
    console.log("🚀 ~ err:", err);
    // Handle Postgres-specific errors
    if (isPostgresError(err)) {
      switch (err.code) {
        case PostgresError.UNIQUE_VIOLATION:
          return res.status(409).json({
            code: 409,
            message: formatErrorMessage("Duplicate entry detected"),
          });
        case PostgresError.FOREIGN_KEY_VIOLATION:
          return res.status(400).json({
            code: 400,
            message: formatErrorMessage(
              "Invalid reference to a related resource"
            ),
          });
      }
    }

    // Handle validation errors
    if (err.message.includes("validation failed") || isValidationError(err)) {
      const validationErrors = isValidationError(err) ? err.details : [];

      return res.status(400).json({
        code: 400,
        message: formatErrorMessage("Validation failed"),
        errors: validationErrors,
      });
    }

    // Handle custom Drizzle errors (can be extended based on needs)
    if (err.name === "DrizzleError") {
      return res.status(400).json({
        code: 400,
        message: formatErrorMessage(err.message),
      });
    }
  }

  next(err);
}

export default expressErrorDrizzle;
