import { sql } from "drizzle-orm";
import express, { type Request, type Response } from "express";
import ErrorResponse from "@/core/modules/response/ErrorResponse";
import HttpResponse from "@/core/modules/response/HttpResponse";
import apiRoutes from "@/app/routes/api-route";
import db from "@/db";

const route = express.Router();

route.get("/", function index(req: Request, res: Response) {
  const responseData: any = {
    message: "API Server is running",
  };

  const httpResponse = HttpResponse.get(responseData);
  res.status(200).json(httpResponse);
});

route.get("/health", async (_req: Request, res: Response) => {
  const startUsage = process.cpuUsage();

  try {
    const isConnectedDB = await db.execute(sql`select 1`);

    const status = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      database: isConnectedDB ? "Ok" : "Failed",
      date: new Date().toISOString(),
      // node: process.version,
      // platform: process.platform,
      uptime: process.uptime(),
      cpu_usage: process.cpuUsage(startUsage),
      memory: process.memoryUsage(),
    };

    const httpResponse = HttpResponse.get({
      message: "Server Uptime",
      data: status,
    });

    res.set("X-Health-Check", isConnectedDB ? "Healthy" : "Unhealthy");

    res.status(200).json(httpResponse);
  } catch (error: any) {
    const errorResponse = new ErrorResponse.InternalServer(error.message);
    res.status(500).json(errorResponse);
  }
});

route.get("/api", function (req: Request) {
  const method = req.method;
  const url = req.originalUrl;
  const host = req.hostname;

  const endpoint = `${host}${url}`;

  throw new ErrorResponse.Forbidden(
    `Sorry, the ${endpoint} HTTP method ${method} resource you are looking for was not found.`
  );
});

route.use("/api", apiRoutes);

export default route;
