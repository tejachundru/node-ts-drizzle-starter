import { type Request } from "express";
import { type OpenAPIV3 } from "express-openapi-validator/dist/framework/types";

// Define OpenAPI specification
const apiSpec: OpenAPIV3.DocumentV3 = {
  openapi: "3.0.3",
  info: {
    title: "starter API",
    version: "1.0.0",
    description: "API documentation for starter System",
    contact: {
      name: "API Support",
      email: "support@example.com",
    },
    license: {
      name: "MIT",
    },
  },
  servers: [
    {
      url: "/api/v1",
      description: "Development Server",
    },
    {
      url: "/api/v1",
      description: "Production Server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          code: {
            type: "integer",
            format: "int32",
            example: 401,
          },
          message: {
            type: "string",
            example: "Unauthorized",
          },
        },
        required: ["code", "message"],
      },
    },
    responses: {
      UnauthorizedError: {
        description: "Authentication failed",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/Error",
            },
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {},
};

// Helper function to get OpenAPI spec
export const getOpenAPISpec = (req?: Request): OpenAPIV3.DocumentV3 => {
  if (req) {
    const host = req.get("host");
    const protocol = req.protocol;
    apiSpec.servers = [
      {
        url: `${protocol}://${host}/api/v1`,
        description: "Current Server",
      },
    ];
  }
  return apiSpec;
};

export default apiSpec;
