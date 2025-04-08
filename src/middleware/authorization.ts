import { SessionService } from "@/app/service/session.service";
import env from "@/config/env";
import { logger } from "@/config/pino";
import * as schema from "@/db/schema";
import { useToken } from "@/hooks/useToken";
import { green } from "colorette";
import { type NextFunction, type Request, type Response } from "express";

// Create singleton instance of SessionService
const sessionService = new SessionService();

// Pre-defined error responses for better performance and consistency
const AUTH_ERRORS = {
  NO_TOKEN: {
    code: 401,
    message: "Unauthorized, no token provided",
  },
  INVALID_TOKEN: {
    code: 401,
    message: "Unauthorized, invalid jwt",
  },
  NO_SESSION: {
    code: 401,
    message: "Unauthorized, no valid session",
  },
};

// Pre-compute message type to avoid recreation on each request
const MSG_TYPE = green("permission");

/**
 * Authentication and authorization middleware
 * Verifies the JWT token from request, validates session existence,
 * and sets user data in request state for downstream middleware/routes
 *
 * @param req - Express Request object
 * @param res - Express Response object
 * @param next - Express NextFunction
 * @returns Response object on error, or passes to next middleware on success
 */
async function authorization(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<any, Record<string, any>> | undefined | void> {
  // Extract token from request (header, cookie, or query)
  const token = useToken.extract(req);

  // Check if token exists
  if (!token) {
    logger.error(`${MSG_TYPE} - unauthorized no token provided`);
    return res.status(401).json(AUTH_ERRORS.NO_TOKEN);
  }

  // Verify token with our secret key
  const verifiedToken = useToken.verify({
    token: token,
    secretKey: env.JWT_SECRET_ACCESS_TOKEN,
  });

  // Check if token is valid
  if (!verifiedToken?.data) {
    logger.error(`${MSG_TYPE} - unauthorized invalid jwt`);
    return res.status(401).json(AUTH_ERRORS.INVALID_TOKEN);
  }

  // Verify session exists in database
  const session = await sessionService.getByToken(
    schema.userSessionTable,
    token
  );

  if (!session) {
    logger.error(`${MSG_TYPE} - unauthorized no valid session`);
    return res.status(401).json(AUTH_ERRORS.NO_SESSION);
  }

  // Set user data in request state for downstream handlers
  req.setState({
    tokenData: verifiedToken.data,
    userType: "user", // Set default user type
  });

  // Authentication successful, continue to next middleware/route
  next();
}

export default authorization;
