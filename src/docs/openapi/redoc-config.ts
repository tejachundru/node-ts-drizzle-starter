import { type Express, type Request, type Response } from "express";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import redocExpress from "redoc-express";
import apiSpec, { getOpenAPISpec } from "./api-docs";
import path from "path";
import { logger } from "@/config/pino";

/**
 * Configure API documentation with Swagger and Redoc
 * @param app Express application instance
 */
export const setupApiDocumentation = async (app: Express): Promise<void> => {
  const swaggerOptions: swaggerJsDoc.Options = {
    definition: apiSpec,
    apis: [
      path.join(__dirname, "../../app/routes/**/*.ts"),
      path.join(__dirname, "../../app/controller/**/*.ts"),
      path.join(__dirname, "../../app/schema/**/*.ts"),
    ],
  };

  // Generate OpenAPI specification
  const swaggerSpec = swaggerJsDoc(swaggerOptions);

  // Serve Swagger UI
  app.use(
    "/api-docs/swagger",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: "starter API Documentation",
    })
  );

  // Serve raw OpenAPI spec as JSON
  app.get("/api-docs/spec", (req: Request, res: Response) => {
    res.json(getOpenAPISpec(req));
  });

  // Set up Redoc middleware
  // Enable Redoc with handler for OpenAPI JSON
  app.get("/api-docs/openapi.json", (req, res) => {
    res.json(swaggerSpec);
  });

  // Serve Redoc UI
  app.get(
    "/api-docs",
    redocExpress({
      title: "starter API Documentation",
      specUrl: "/api-docs/openapi.json",
      redocOptions: {
        hideHostname: false,
        hideDownloadButton: false,
        disableSearch: false,
        requiredPropsFirst: true,
      },
    })
  );

  // Enable request validation (optional but recommended)
  try {
    const { middleware } = await import("express-openapi-validator");

    // Converting the spec to string to avoid type issues
    const apiSpecJson = JSON.stringify(swaggerSpec);

    app.use(
      middleware({
        apiSpec: apiSpecJson,
        validateRequests: true,
        validateResponses: true,
      })
    );
  } catch (error) {
    logger.error("Failed to initialize OpenAPI validator:", error);
  }

  logger.info("API Documentation is available at /api-docs");
  logger.info("Swagger UI is available at /api-docs/swagger");
  logger.info("Raw OpenAPI spec is available at /api-docs/spec");
};
