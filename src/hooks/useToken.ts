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

type ExpiresHour = "1h" | "6h" | "12h";
type ExpiresDay = "1d" | "2d" | "3d" | "4d" | "5d" | "6d" | "7d";
export type ExpiresType = ExpiresHour | ExpiresDay;

export interface GenerateTokenEntity {
  value: string | any;
  secretKey: string;
  expires: ExpiresType;
}

export interface VerifyTokenEntity {
  token: string;
  secretKey: string;
}

export interface DtoGenerateToken {
  token: string;
  expiresIn: number;
}

export type DtoVerifyToken =
  | {
      data: null;
      message: string;
    }
  | {
      data: string | JwtPayload;
      message: string;
    }
  | undefined;

const msgType = `${green("token")}`;

export class useToken {
  /**
   * Generate Token
   * @param params
   * @returns
   */
  public static generate(params: GenerateTokenEntity): DtoGenerateToken {
    const { value, secretKey, expires } = params;

    const tokenExpires = ms(expires);
    const expiresIn = Number(tokenExpires) / 1000;

    const payload = JSON.parse(JSON.stringify(value));
    const token = jwt.sign(payload, secretKey, { expiresIn });

    return { token, expiresIn };
  }

  /**
   * Extract Token
   * @param req
   * @returns
   */
  public static extract(req: Request | FastifyRequest): string | null {
    const authQuery = _.get(req, "query.token", undefined);
    const authCookie = _.get(req, "cookies.token", undefined);
    const authHeader = _.get(req, "headers.authorization", undefined);

    // extract from query
    if (authQuery) {
      const message = `${msgType} - ${"extract auth from query"}`;
      logger.info(message);

      return String(authQuery);
    }

    // extract from cookie
    if (authCookie) {
      const message = `${msgType} - ${"extract auth from cookie"}`;
      logger.info(message);

      return String(authCookie);
    }

    // extract from header authorization
    if (authHeader) {
      const splitAuthorize = authHeader.split(" ");
      const allowedAuthorize = ["Bearer", "JWT", "Token"];

      if (splitAuthorize.length === 2) {
        if (allowedAuthorize.includes(splitAuthorize[0])) {
          const message = `${msgType} - ${"extract auth from header auth"}`;
          logger.info(message);

          return splitAuthorize[1];
        }
      }
    }

    return null;
  }

  /**
   * Verify Token
   * @param params
   * @returns
   */
  public static verify(params: VerifyTokenEntity): DtoVerifyToken {
    const { token, secretKey } = params;

    try {
      if (!token) {
        return { data: null, message: "unauthorized" };
      }

      const result = jwt.verify(token, secretKey);
      return { data: result, message: "token is verify" };
    } catch (error: unknown) {
      // Error Token Expired
      if (error instanceof TokenExpiredError) {
        const errType = "jwt expired error";
        const err = error as TokenExpiredError;

        const message = `${msgType} - ${errType}, ${err.message ?? err}`;
        logger.error(message);

        return { data: null, message: `${errType} : ${err.message}` };
      }

      // Error JWT Web Token
      if (error instanceof JsonWebTokenError) {
        const errType = "jwt token error";
        const err = error as JsonWebTokenError;

        const message = `${msgType} - ${errType}, ${err.message ?? err}`;
        logger.error(message);

        return { data: null, message: `${errType} : ${err.message}` };
      }

      // Error Not Before
      if (error instanceof NotBeforeError) {
        const errType = "jwt not before error";
        const err = error as NotBeforeError;

        const message = `${msgType} - ${errType}, ${err.message ?? err}`;
        logger.error(message);

        return { data: null, message: `${errType} : ${err.message}` };
      }

      // Unknown error
      const err = error as Error;
      const message = `${msgType} - unknown error, ${err.message ?? err}`;
      logger.error(message);

      return { data: null, message: `unknown error: ${err.message}` };
    }
  }
}
