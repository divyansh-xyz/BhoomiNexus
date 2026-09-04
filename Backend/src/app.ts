import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorMiddleware } from "./middlewares/error.middleware";
import { logger } from "./utils/logger";

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

import healthRoutes from "./modules/health/health.route";
import authRoutes from "./modules/auth/auth.route";

// Mount Routers here
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, error: { message: "Route not found" } });
});

// Global Error Handler
app.use(errorMiddleware);

export default app;
