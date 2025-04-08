import express from "express";
import path from "path";
import { getRoutes } from "@/core/modules/getRoutes";

const apiRoute = express.Router();

const baseRoutes = path.resolve(`${__dirname}/../controller`);

// this is used across the application
export default apiRoute;

// Mapping Route
getRoutes(baseRoutes);
