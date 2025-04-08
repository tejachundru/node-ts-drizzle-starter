import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express, type Request } from "express";
import userAgent from "express-useragent";
import helmet from "helmet";
import hpp from "hpp";
import path from "path";
import requestIp from "request-ip";
import expressErrorResponse from "@/middleware/expressErrorResponse";
import expressErrorDrizzle from "@/middleware/expressErrorDrizzle";
import expressErrorZod from "@/middleware/expressErrorZod";
import { expressRateLimit } from "@/middleware/expressRateLimit";
import { expressUserAgent } from "@/middleware/expressUserAgent";
import { expressWithState } from "@/middleware/expressWithState";
import ErrorResponse from "@/core/modules/response/ErrorResponse";
import { corsOptions } from "./cors";
import { httpLogger } from "./pino";
import indexRoutes from "../app/routes";
import env from "./env";
// import { setupApiDocumentation } from "@/docs/openapi/redoc-config";

/**
 * Initialize Bootstrap Application
 */
export class App {
  private readonly _app: Express;
  private readonly _port: number | string;

  constructor() {
    this._app = express();
    this._port = env.APP_PORT;

    this._plugins();
    this._routes();
    // this._setupApiDocs();
  }

  /**
   * Initialize Plugins
   */
  private _plugins(): void {
    // Add logging first for complete request lifecycle tracking
    this._app.use(httpLogger());

    // Security middleware
    this._app.use(
      helmet({
        contentSecurityPolicy:
          env.NODE_ENV === "production" ? undefined : false,
      })
    );
    this._app.use(cors(corsOptions));

    // Standard middleware
    this._app.use(compression() as unknown as express.RequestHandler);
    this._app.use(cookieParser());
    this._app.use(express.json({ limit: "200mb", type: "application/json" }));
    this._app.use(express.urlencoded({ extended: true }));
    this._app.use(express.static(path.resolve(`${__dirname}/../../public`)));
    this._app.use(hpp() as unknown as express.RequestHandler);
    this._app.use(requestIp.mw());
    this._app.use(userAgent.express() as unknown as express.RequestHandler);

    // middleware
    this._app.use(expressRateLimit());
    this._app.use(expressWithState());
    this._app.use(expressUserAgent());
  }

  /**
   * Initialize Routes
   */
  private _routes(): void {
    // Enable routes
    this._app.use(indexRoutes); // Uncomment and fix the route inclusion

    // Catch error 404 endpoint not found
    this._app.use("*", function (req: Request) {
      const method = req.method;
      const url = req.originalUrl;
      const host = req.hostname;

      const endpoint = `${host}${url}`;

      throw new ErrorResponse.NotFound(
        `Sorry, the ${endpoint} HTTP method ${method} resource you are looking for was not found.`
      );
    });
  }

  // /**
  //  * Setup API Documentation with Redoc
  //  */
  // private async _setupApiDocs(): Promise<void> {
  //   // Only enable API docs in development and staging environments
  //   if (env.NODE_ENV !== "production" || env.ENABLE_API_DOCS === "true") {
  //     await setupApiDocumentation(this._app);
  //   }
  // }

  /**
   * Create Bootstrap App
   */
  public async create(): Promise<Express> {
    this._app.use(expressErrorZod);
    this._app.use(expressErrorDrizzle);
    this._app.use(expressErrorResponse);

    // set port
    this._app.set("port", this._port);

    // return this application
    return this._app;
  }
}
