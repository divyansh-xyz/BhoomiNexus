import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import { errorMiddleware } from "./middlewares/error.middleware";
import { logger } from "./utils/logger";

import healthRoutes from "./modules/health/health.route";
import authRoutes from "./modules/auth/auth.route";
import publicRoutes from "./modules/public/public.route";
import usersRoutes from "./modules/users/users.route";
import projectsRoutes from "./modules/projects/projects.route";
import bossRoutes from "./modules/boss/boss.route";
import { templateRouter, projectWorkflowRouter } from "./modules/workflows/workflows.route";
import tasksRoutes from "./modules/tasks/tasks.route";
import documentsRoutes from "./modules/documents/documents.route";

import { authenticate } from "./middlewares/auth.middleware";
import { authorize } from "./middlewares/rbac.middleware";
import { resubmitStage } from "./modules/tasks/tasks.controller";

const app = express();

const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/public", publicRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/projects", projectsRoutes);
app.use("/api/v1/boss", bossRoutes);
app.use("/api/v1/workflow-templates", templateRouter);
app.use("/api/v1/projects/:projectId/workflow", projectWorkflowRouter);
app.use("/api/v1/tasks", tasksRoutes);
app.post("/api/v1/projects/:projectId/workflow-stages/:stageId/resubmit", authenticate, authorize(["REQUESTING_AUTHORITY"]), resubmitStage);
app.use("/api/v1/documents", documentsRoutes);

app.use((req, res, next) => {
  res.status(404).json({ success: false, error: { message: "Route not found" } });
});

app.use(errorMiddleware);

export default app;
