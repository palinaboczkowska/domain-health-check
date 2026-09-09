import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import type { DomainHealthService } from "./domainHealthService.js";
import { createCheckRoute } from "./routes/checkRoute.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(currentDir, "..", "..", "public");

export function createApp(service: DomainHealthService): Express {
  const app = express();
  app.use(express.json());
  app.use(express.static(publicDir));
  app.post("/api/check", createCheckRoute(service));
  return app;
}
