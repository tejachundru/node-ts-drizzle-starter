import { green } from "colorette";
import { type Request } from "express";
import { FastifyRequest } from "fastify";
import jwt, {
  JsonWebTokenError,
  NotBeforeError,
  TokenExpiredError,
  type JwtPayload,
} from "jsonwebtoken";
import _ from "lodash";
import { ms } from "@/config/ms";
import { logger } from "@/config/pino";
import crypto from "crypto";

// Define types for token expiration
type ExpiresHour = "1h" | "6h" | "12h";
type ExpiresDay = "1d" | "2d" | "3d" | "4d" | "5d" | "6d" | "7d";
export type ExpiresType = ExpiresHour | ExpiresDay;

// Define algorithm types
export type JwtAlgorithm = "ES384" | "RS384" | "PS384";

// Define interfaces for token generation and verification
export interface GenerateTokenEntity {
  value: string | object;
  privateKey: string;
  expires: ExpiresType;
  algorithm?: JwtAlgorithm;
  audience?: string | string[];
  issuer?: string;
  jwtid?: string;
  subject?: string;
  notBefore?: number;
}

export interface VerifyTokenEntity {
  token: string;
  publicKey: string;
  algorithm?: JwtAlgorithm;
  audience?: string | string[];
  issuer?: string;
  jwtid?: string;
  subject?: string;
  clockTolerance?: number;
}

export interface DtoGenerateToken {
  token: string;
  expiresIn: number;
}

export interface VerificationResult {
  data: string | JwtPayload | null;
  message: string;
  code: number;
}

export type DtoVerifyToken = VerificationResult | undefined;

// Define a message type for logging
const msgType = `${green("token")}`;

// Class for handling JWT operations
export class useToken {
  // Default algorithm - upgraded from ES256 to ES384
  private static readonly DEFAULT_ALGORITHM: JwtAlgorithm = "ES384";

  // Default clock tolerance in seconds (allows for small clock differences)
  private static readonly DEFAULT_CLOCK_TOLERANCE = 30;

  /**
   * Generate Token with enhanced options
   * @param params
   * @returns
   */
  public static generate(params: GenerateTokenEntity): DtoGenerateToken {
    const {
      value,
      privateKey,
      expires,
      algorithm = this.DEFAULT_ALGORITHM,
      audience,
      issuer,
      jwtid,
      subject,
      notBefore,
    } = params;

    const tokenExpires = ms(expires);
    const expiresIn = Number(tokenExpires) / 1000;

    // Generate a unique id if not provided
    const uniqueJwtId = jwtid || crypto.randomUUID();

    // Create a secure payload with claims
    const payload = JSON.parse(JSON.stringify(value));

    // Sign options with enhanced security parameters
    const signOptions = {
      expiresIn,
      algorithm,
      ...(audience && { audience }),
      ...(issuer && { issuer }),
      ...(uniqueJwtId && { jwtid: uniqueJwtId }),
      ...(subject && { subject }),
      ...(notBefore && { notBefore }),
    };

    // Sign the token with specified algorithm
    const token = jwt.sign(payload, privateKey, signOptions);

    return { token, expiresIn };
  }

  /**
   * Extract Token with improved security checks
   * @param req
   * @returns
   */
  public static extract(req: Request | FastifyRequest): string | null {
    // Check for token in secure cookie first
    const authCookie = _.get(req, "cookies.token", undefined);
    if (authCookie) {
      const message = `${msgType} - ${"extract auth from secure cookie"}`;
      logger.info(message);
      return String(authCookie);
    }

    // Check authorization header next (preferred method)
    const authHeader = _.get(req, "headers.authorization", undefined);
    if (authHeader) {
      const splitAuthorize = authHeader.split(" ");
      const allowedAuthorize = ["Bearer", "JWT"];

      if (
        splitAuthorize.length === 2 &&
        allowedAuthorize.includes(splitAuthorize[0])
      ) {
        const message = `${msgType} - ${"extract auth from header auth"}`;
        logger.info(message);
        return splitAuthorize[1];
      }
    }

    // As a last resort, check for token in query (least secure)
    // Consider removing this in production for better security
    const authQuery = _.get(req, "query.token", undefined);
    if (authQuery) {
      const message = `${msgType} - ${"extract auth from query (insecure)"}`;
      logger.warn(message);
      return String(authQuery);
    }

    return null;
  }

  /**
   * Verify Token with enhanced security options
   * @param params
   * @returns
   */
  public static verify(params: VerifyTokenEntity): DtoVerifyToken {
    const {
      token,
      publicKey,
      algorithm = this.DEFAULT_ALGORITHM,
      audience,
      issuer,
      jwtid,
      subject,
      clockTolerance = this.DEFAULT_CLOCK_TOLERANCE,
    } = params;

    try {
      if (!token) {
        return { data: null, message: "Token is missing", code: 401 };
      }

      // Validate token structure before verification
      if (!this.validateTokenFormat(token)) {
        return { data: null, message: "Malformed token", code: 401 };
      }

      // Enhanced verify options with claims validation
      const verifyOptions = {
        algorithms: [algorithm],
        clockTolerance,
        ...(audience && { audience }),
        ...(issuer && { issuer }),
        ...(jwtid && { jwtid }),
        ...(subject && { subject }),
      };

      const result = jwt.verify(token, publicKey, verifyOptions);

      // Additional validation of token payload
      if (!this.validateTokenPayload(result)) {
        return { data: null, message: "Invalid token payload", code: 401 };
      }

      return { data: result, message: "Token is valid", code: 200 };
    } catch (error: unknown) {
      return this.handleVerificationError(error);
    }
  }

  /**
   * Validate token format
   * @param token
   * @returns boolean
   */
  private static validateTokenFormat(token: string): boolean {
    // Basic JWT format validation (header.payload.signature)
    const parts = token.split(".");
    if (parts.length !== 3) {
      logger.error(`${msgType} - Invalid token format`);
      return false;
    }

    // Check if each part is properly base64url encoded
    try {
      for (const part of parts.slice(0, 2)) {
        // Check header and payload
        const decoded = Buffer.from(part, "base64url").toString();
        JSON.parse(decoded); // Should be valid JSON
      }
      return true;
    } catch (err) {
      logger.error(`${msgType} - Token parts not valid base64url JSON: ${err}`);
      return false;
    }
  }

  /**
   * Validate token payload contents
   * @param payload
   * @returns boolean
   */
  private static validateTokenPayload(payload: string | JwtPayload): boolean {
    if (typeof payload === "string") {
      return false;
    }

    // Check for minimum required claims
    const requiredClaims = ["iat", "exp"];
    for (const claim of requiredClaims) {
      if (!(claim in payload)) {
        logger.error(`${msgType} - Missing required claim: ${claim}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Handle verification errors with detailed messages
   * @param error
   * @returns VerificationResult
   */
  private static handleVerificationError(error: unknown): VerificationResult {
    // Error Token Expired
    if (error instanceof TokenExpiredError) {
      const err = error as TokenExpiredError;
      const expiredAt = new Date(err.expiredAt).toISOString();

      const message = `${msgType} - Token expired at ${expiredAt}`;
      logger.error(message);

      return {
        data: null,
        message: `Token expired on ${expiredAt}`,
        code: 401,
      };
    }

    // Error JWT Web Token
    if (error instanceof JsonWebTokenError) {
      const err = error as JsonWebTokenError;

      const message = `${msgType} - Invalid token: ${err.message}`;
      logger.error(message);

      return {
        data: null,
        message: `Invalid token: ${err.message}`,
        code: 401,
      };
    }

    // Error Not Before
    if (error instanceof NotBeforeError) {
      const err = error as NotBeforeError;
      const notBefore = _.get(err, "date", "unknown date");

      const message = `${msgType} - Token not valid until ${notBefore}`;
      logger.error(message);

      return {
        data: null,
        message: `Token not valid until ${notBefore}`,
        code: 401,
      };
    }

    // Handle other unexpected errors
    const message = `${msgType} - Unexpected token error: ${error}`;
    logger.error(message);

    return {
      data: null,
      message: "Authentication failed",
      code: 401,
    };
  }

  /**
   * Decode token without verification (for debugging)
   * @param token
   * @returns DecodedToken | null
   */
  public static decode(token: string): JwtPayload | string | null {
    try {
      return jwt.decode(token);
    } catch (error) {
      logger.error(`${msgType} - Failed to decode token: ${error}`);
      return null;
    }
  }
}
